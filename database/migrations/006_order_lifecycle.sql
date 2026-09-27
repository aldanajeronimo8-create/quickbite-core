-- QuickBite Core — order lifecycle and pickup hardening
-- Tarea 08/17
-- Centralizes valid order-state transitions and preserves the admin closing-period fields.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_orders_pickup_code
  ON quickbite.orders(pickup_code);

CREATE INDEX IF NOT EXISTS idx_orders_pickup_status
  ON quickbite.orders(status, pickup_at);

CREATE INDEX IF NOT EXISTS idx_orders_export_period
  ON quickbite.orders(exported_at, admin_hidden, created_at DESC);

ALTER TABLE quickbite.orders
  DROP CONSTRAINT IF EXISTS orders_total_consistency_check;

ALTER TABLE quickbite.orders
  ADD CONSTRAINT orders_total_consistency_check
  CHECK (total = subtotal);

ALTER TABLE quickbite.orders
  DROP CONSTRAINT IF EXISTS orders_pickup_at_status_check;

ALTER TABLE quickbite.orders
  ADD CONSTRAINT orders_pickup_at_status_check
  CHECK (
    pickup_at IS NULL
    OR status = 'delivered'
  );

CREATE OR REPLACE FUNCTION quickbite.transition_order_status(
  p_order_id UUID,
  p_actor_user_id UUID,
  p_next_status TEXT
)
RETURNS quickbite.orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_order quickbite.orders%ROWTYPE;
  v_previous_status TEXT;
  v_actor_role TEXT;
BEGIN
  IF p_order_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'order_and_actor_required' USING ERRCODE = '22023';
  END IF;

  IF p_next_status NOT IN ('pending','preparing','ready','delivered','cancelled') THEN
    RAISE EXCEPTION 'invalid_order_status' USING ERRCODE = '22023';
  END IF;

  SELECT role
    INTO v_actor_role
  FROM quickbite.user_profiles
  WHERE user_id = p_actor_user_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'actor_profile_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT *
    INTO v_order
  FROM quickbite.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = '23503';
  END IF;

  IF p_next_status = v_order.status THEN
    RETURN v_order;
  END IF;

  IF v_actor_role = 'student' AND p_actor_user_id <> v_order.user_id THEN
    RAISE EXCEPTION 'order_access_denied' USING ERRCODE = '42501';
  END IF;

  IF v_actor_role = 'student' AND p_next_status <> 'cancelled' THEN
    RAISE EXCEPTION 'student_cannot_set_status' USING ERRCODE = '42501';
  END IF;

  IF v_actor_role IN ('admin','staff') THEN
    IF NOT (
      (v_order.status = 'pending' AND p_next_status = 'preparing')
      OR (v_order.status = 'preparing' AND p_next_status = 'ready')
      OR (v_order.status = 'ready' AND p_next_status = 'delivered')
      OR (v_order.status IN ('pending','preparing') AND p_next_status = 'cancelled')
    ) THEN
      RAISE EXCEPTION 'invalid_order_transition' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_actor_role = 'parent' THEN
    RAISE EXCEPTION 'role_cannot_change_order_status' USING ERRCODE = '42501';
  ELSE
    RAISE EXCEPTION 'role_cannot_change_order_status' USING ERRCODE = '42501';
  END IF;

  v_previous_status := v_order.status;

  UPDATE quickbite.orders
  SET
    status = p_next_status,
    pickup_at = CASE
      WHEN p_next_status = 'delivered' THEN COALESCE(pickup_at, now())
      WHEN p_next_status = 'cancelled' THEN NULL
      ELSE pickup_at
    END,
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO quickbite.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_actor_user_id,
    'order.status_changed',
    'order',
    v_order.id,
    jsonb_build_object(
      'from', v_previous_status,
      'to', p_next_status
    )
  );

  RETURN v_order;
END;
$$;

COMMENT ON FUNCTION quickbite.transition_order_status(UUID, UUID, TEXT)
IS 'Server-side order lifecycle transition for API use; validates actor role and allowed state changes, and timestamps pickup on delivery.';

COMMIT;
