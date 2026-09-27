-- QuickBite Core — atomic order creation
-- Tarea 04/17
-- Server-authoritative transaction: price, stock, idempotency and optional wallet payment.
-- Standalone PostgreSQL. No Supabase dependencies.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_items_order_product
  ON quickbite.order_items(order_id, product_id);

ALTER TABLE quickbite.order_items
  DROP CONSTRAINT IF EXISTS order_items_line_total_check;

ALTER TABLE quickbite.order_items
  ADD CONSTRAINT order_items_line_total_check
  CHECK (line_total = unit_price * quantity);

CREATE OR REPLACE FUNCTION quickbite.create_order_tx(
  p_user_id UUID,
  p_idempotency_key UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  order_id UUID,
  status TEXT,
  payment_status TEXT,
  subtotal NUMERIC(12,2),
  total NUMERIC(12,2),
  pickup_code TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_status TEXT;
  v_order quickbite.orders%ROWTYPE;
  v_subtotal NUMERIC(12,2);
  v_payment_status TEXT := 'pending';
  v_payment_balance_before NUMERIC(12,2);
  v_payment_balance_after NUMERIC(12,2);
  v_pickup_code TEXT;
  v_item RECORD;
  v_product RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required' USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key_required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order_items_required' USING ERRCODE = '22023';
  END IF;

  IF p_payment_method NOT IN ('pending', 'wallet') THEN
    RAISE EXCEPTION 'unsupported_payment_method' USING ERRCODE = '22023';
  END IF;

  -- Serialize retries of the same logical request before checking idempotency.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::TEXT || ':' || p_idempotency_key::TEXT, 0)
  );

  SELECT *
    INTO v_order
  FROM quickbite.orders
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_order.id,
      v_order.status,
      v_order.payment_status,
      v_order.subtotal,
      v_order.total,
      v_order.pickup_code;
    RETURN;
  END IF;

  SELECT status
    INTO v_user_status
  FROM quickbite.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_user_status <> 'active' THEN
    RAISE EXCEPTION 'user_not_active' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE _order_items (
    product_id UUID PRIMARY KEY,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2),
    line_total NUMERIC(12,2),
    product_name TEXT,
    stock_before INTEGER
  ) ON COMMIT DROP;

  INSERT INTO _order_items (product_id, quantity)
  SELECT
    item->>'product_id',
    SUM((item->>'quantity')::INTEGER)::INTEGER
  FROM jsonb_array_elements(p_items) AS item
  GROUP BY item->>'product_id';

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE NOT (item ? 'product_id')
       OR NOT (item ? 'quantity')
       OR NULLIF(item->>'product_id', '') IS NULL
       OR NULLIF(item->>'quantity', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_order_item' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM _order_items WHERE quantity <= 0) THEN
    RAISE EXCEPTION 'invalid_order_quantity' USING ERRCODE = '22023';
  END IF;

  -- Lock products in UUID order to make concurrent orders deterministic.
  FOR v_item IN
    SELECT product_id, quantity
    FROM _order_items
    ORDER BY product_id
  LOOP
    SELECT id, name, price, stock, active
      INTO v_product
    FROM quickbite.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_not_found: %', v_item.product_id
        USING ERRCODE = '23503';
    END IF;

    IF NOT v_product.active THEN
      RAISE EXCEPTION 'product_inactive: %', v_product.name
        USING ERRCODE = 'P0001';
    END IF;

    IF v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION 'insufficient_stock: %', v_product.name
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE _order_items
    SET
      unit_price = v_product.price,
      line_total = v_product.price * v_item.quantity,
      product_name = v_product.name,
      stock_before = v_product.stock
    WHERE product_id = v_item.product_id;
  END LOOP;

  SELECT COALESCE(SUM(line_total), 0)::NUMERIC(12,2)
    INTO v_subtotal
  FROM _order_items;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'order_total_must_be_positive' USING ERRCODE = '22023';
  END IF;

  IF p_payment_method = 'wallet' THEN
    SELECT balance
      INTO v_payment_balance_before
    FROM quickbite.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'wallet_not_found' USING ERRCODE = '23503';
    END IF;

    IF v_payment_balance_before < v_subtotal THEN
      RAISE EXCEPTION 'insufficient_wallet_balance' USING ERRCODE = 'P0001';
    END IF;

    v_payment_balance_after := v_payment_balance_before - v_subtotal;
    v_payment_status := 'confirmed';
  END IF;

  LOOP
    v_pickup_code := upper(encode(gen_random_bytes(4), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM quickbite.orders WHERE pickup_code = v_pickup_code
    );
  END LOOP;

  INSERT INTO quickbite.orders (
    user_id,
    status,
    payment_status,
    subtotal,
    total,
    notes,
    pickup_code,
    idempotency_key
  )
  VALUES (
    p_user_id,
    'pending',
    v_payment_status,
    v_subtotal,
    v_subtotal,
    NULLIF(trim(p_notes), ''),
    v_pickup_code,
    p_idempotency_key
  )
  RETURNING * INTO v_order;

  INSERT INTO quickbite.order_items (
    order_id,
    product_id,
    product_name_snapshot,
    unit_price,
    quantity,
    line_total
  )
  SELECT
    v_order.id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total
  FROM _order_items
  ORDER BY product_id;

  FOR v_item IN
    SELECT product_id, quantity, stock_before
    FROM _order_items
    ORDER BY product_id
  LOOP
    UPDATE quickbite.products
    SET
      stock = stock - v_item.quantity,
      updated_at = now()
    WHERE id = v_item.product_id;

    INSERT INTO quickbite.inventory_movements (
      product_id,
      order_id,
      movement_type,
      quantity,
      stock_before,
      stock_after,
      reason,
      created_by
    )
    SELECT
      v_item.product_id,
      v_order.id,
      'sale',
      v_item.quantity,
      v_item.stock_before,
      v_item.stock_before - v_item.quantity,
      'Order ' || v_order.id::TEXT,
      p_user_id;
  END LOOP;

  IF p_payment_method = 'wallet' THEN
    UPDATE quickbite.wallets
    SET
      balance = v_payment_balance_after,
      updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO quickbite.wallet_transactions (
      user_id,
      order_id,
      type,
      amount,
      balance_before,
      balance_after,
      description
    )
    VALUES (
      p_user_id,
      v_order.id,
      'debit',
      v_subtotal,
      v_payment_balance_before,
      v_payment_balance_after,
      'Payment for order ' || v_order.id::TEXT
    );
  END IF;

  INSERT INTO quickbite.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_user_id,
    'order.created',
    'order',
    v_order.id,
    jsonb_build_object(
      'subtotal', v_subtotal,
      'payment_method', p_payment_method,
      'payment_status', v_payment_status,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN QUERY
  SELECT
    v_order.id,
    v_order.status,
    v_payment_status,
    v_subtotal,
    v_subtotal,
    v_pickup_code;
END;
$$;

COMMENT ON FUNCTION quickbite.create_order_tx(UUID, UUID, JSONB, TEXT, TEXT)
IS 'Atomically creates an order, validates inventory, snapshots DB prices, decrements stock, records inventory/audit entries, and optionally charges the user wallet.';

COMMIT;
