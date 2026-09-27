-- QuickBite Core — inventory controls
-- Tarea 09/17
-- All stock changes are server-side and recorded in the inventory ledger.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_inventory_order_created
  ON quickbite.inventory_movements(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_type_created
  ON quickbite.inventory_movements(movement_type, created_at DESC);

CREATE OR REPLACE FUNCTION quickbite.adjust_product_stock(
  p_product_id UUID,
  p_quantity_delta INTEGER,
  p_actor_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  stock_before INTEGER,
  stock_after INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_product quickbite.products%ROWTYPE;
  v_role TEXT;
  v_after INTEGER;
  v_type TEXT;
BEGIN
  IF p_product_id IS NULL OR p_actor_user_id IS NULL OR p_quantity_delta = 0 THEN
    RAISE EXCEPTION 'product_actor_and_nonzero_delta_required' USING ERRCODE = '22023';
  END IF;

  SELECT role INTO v_role
  FROM quickbite.user_profiles
  WHERE user_id = p_actor_user_id;

  IF v_role NOT IN ('admin','staff') THEN
    RAISE EXCEPTION 'inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_product
  FROM quickbite.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found' USING ERRCODE = '23503';
  END IF;

  v_after := v_product.stock + p_quantity_delta;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = 'P0001';
  END IF;

  v_type := CASE WHEN p_quantity_delta > 0 THEN 'entry' ELSE 'adjustment' END;

  UPDATE quickbite.products
  SET stock = v_after, updated_at = now()
  WHERE id = p_product_id;

  INSERT INTO quickbite.inventory_movements (
    product_id, movement_type, quantity, stock_before, stock_after,
    reason, created_by
  )
  VALUES (
    p_product_id,
    v_type,
    abs(p_quantity_delta),
    v_product.stock,
    v_after,
    NULLIF(trim(p_reason), ''),
    p_actor_user_id
  );

  RETURN QUERY SELECT p_product_id, v_product.stock, v_after;
END;
$$;

COMMENT ON FUNCTION quickbite.adjust_product_stock(UUID, INTEGER, UUID, TEXT)
IS 'Admin/staff stock adjustment. Locks the product, prevents negative stock, updates stock and writes an inventory ledger entry.';

CREATE OR REPLACE VIEW quickbite.v_inventory_current AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.stock,
  p.active,
  p.category_id,
  COALESCE(SUM(
    CASE
      WHEN m.movement_type IN ('entry','return','release') THEN m.quantity
      WHEN m.movement_type IN ('sale','reservation') THEN -m.quantity
      ELSE 0
    END
  ), 0)::BIGINT AS ledger_net_quantity,
  MAX(m.created_at) AS last_movement_at
FROM quickbite.products p
LEFT JOIN quickbite.inventory_movements m ON m.product_id = p.id
GROUP BY p.id, p.name, p.stock, p.active, p.category_id;

COMMENT ON VIEW quickbite.v_inventory_current
IS 'Inventory read model exposing current product stock and the movement ledger summary.';

COMMIT;
