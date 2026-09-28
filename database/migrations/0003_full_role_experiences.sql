-- QuickBite full four-role experience layer.
-- Safe to re-run and compatible with the Core API role model.

ALTER TABLE quickbite.orders
  ADD COLUMN IF NOT EXISTS beneficiary_user_id uuid REFERENCES quickbite.users(id);

CREATE INDEX IF NOT EXISTS orders_beneficiary_created_idx
  ON quickbite.orders(beneficiary_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.family_links (
  parent_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id),
  CHECK (parent_id <> student_id)
);

CREATE INDEX IF NOT EXISTS family_links_student_idx
  ON quickbite.family_links(student_id, status);

CREATE TABLE IF NOT EXISTS quickbite.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  dashboard_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.favorites (
  user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES quickbite.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE OR REPLACE FUNCTION quickbite.create_order_for_actor_tx(
  p_actor_id uuid,
  p_beneficiary_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_idempotency_key uuid
) RETURNS quickbite.orders
LANGUAGE plpgsql AS $$
DECLARE
  v_order quickbite.orders;
  v_item jsonb;
  v_product record;
  v_total numeric(12,2) := 0;
  v_quantity integer;
  v_pickup text;
  v_actor_role quickbite.user_role;
BEGIN
  SELECT role INTO v_actor_role FROM quickbite.users WHERE id = p_actor_id AND active;
  IF v_actor_role IS NULL THEN RAISE EXCEPTION 'user_not_active'; END IF;

  IF v_actor_role = 'student' THEN
    IF p_beneficiary_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'student_can_only_order_for_self'; END IF;
  ELSIF v_actor_role = 'parent' THEN
    IF p_beneficiary_id = p_actor_id THEN
      NULL;
    ELSIF NOT EXISTS (
      SELECT 1 FROM quickbite.family_links
      WHERE parent_id = p_actor_id AND student_id = p_beneficiary_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'student_not_linked_to_parent';
    END IF;
  ELSE
    RAISE EXCEPTION 'role_cannot_create_orders';
  END IF;

  SELECT * INTO v_order
  FROM quickbite.orders
  WHERE user_id = p_actor_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_order; END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order_items_required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    SELECT p.id, p.price, i.quantity INTO v_product
    FROM quickbite.products p
    JOIN quickbite.inventory i ON i.product_id = p.id
    WHERE p.id = (v_item->>'product_id')::uuid AND p.active
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    IF v_product.quantity < v_quantity THEN RAISE EXCEPTION 'insufficient_stock'; END IF;
    UPDATE quickbite.inventory SET quantity = quantity - v_quantity, updated_at = now()
      WHERE product_id = v_product.id;
    INSERT INTO quickbite.inventory_movements(product_id, quantity_delta, reason, actor_id)
      VALUES(v_product.id, -v_quantity, 'order', p_actor_id);
    v_total := v_total + v_product.price * v_quantity;
  END LOOP;

  v_pickup := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  INSERT INTO quickbite.orders(user_id, beneficiary_user_id, idempotency_key, total, payment_method, pickup_code)
    VALUES(p_actor_id, p_beneficiary_id, p_idempotency_key, v_total, p_payment_method, v_pickup)
    RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT price INTO v_product FROM quickbite.products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO quickbite.order_items(order_id, product_id, quantity, unit_price)
      VALUES(v_order.id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::integer, v_product.price);
  END LOOP;

  INSERT INTO quickbite.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    VALUES(p_actor_id, 'order.created', 'order', v_order.id,
      jsonb_build_object('total', v_total, 'beneficiary_user_id', p_beneficiary_id));

  INSERT INTO quickbite.notifications(user_id, title, body)
    VALUES(p_beneficiary_id, 'Pedido creado', 'Tu pedido fue recibido por QuickBite.');

  IF p_beneficiary_id <> p_actor_id THEN
    INSERT INTO quickbite.notifications(user_id, title, body)
      VALUES(p_actor_id, 'Pedido familiar creado', 'El pedido fue creado para un miembro de tu familia.');
  END IF;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION quickbite.is_family_member(p_parent_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM quickbite.family_links
    WHERE parent_id = p_parent_id AND student_id = p_student_id AND status = 'active'
  );
$$;
