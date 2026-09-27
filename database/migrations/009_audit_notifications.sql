-- QuickBite Core — audit and notifications foundation
-- Tarea 11/17

BEGIN;

ALTER TABLE quickbite.audit_logs
  ADD COLUMN IF NOT EXISTS request_id UUID,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE quickbite.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_severity_check;

ALTER TABLE quickbite.audit_logs
  ADD CONSTRAINT audit_logs_severity_check
  CHECK (severity IN ('info','warning','error','critical'));

ALTER TABLE quickbite.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_source_check;

ALTER TABLE quickbite.audit_logs
  ADD CONSTRAINT audit_logs_source_check
  CHECK (source IN ('api','system','admin','staff','student','parent','sync'));

CREATE INDEX IF NOT EXISTS idx_audit_actor_created
  ON quickbite.audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_request
  ON quickbite.audit_logs(request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_action_created
  ON quickbite.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON quickbite.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE quickbite.notifications
  ADD COLUMN IF NOT EXISTS type_code TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

UPDATE quickbite.notifications
SET type_code = type
WHERE type_code IS NULL;

ALTER TABLE quickbite.notifications
  ALTER COLUMN type_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON quickbite.notifications(type_code, created_at DESC);

CREATE OR REPLACE FUNCTION quickbite.create_notification(
  p_user_id UUID,
  p_type_code TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS quickbite.notifications
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification quickbite.notifications%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_type_code IS NULL OR btrim(p_type_code) = '' THEN
    RAISE EXCEPTION 'notification_fields_required' USING ERRCODE = '22023';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' OR p_message IS NULL OR btrim(p_message) = '' THEN
    RAISE EXCEPTION 'notification_content_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO quickbite.notifications (
    user_id, type, type_code, title, message, data
  )
  VALUES (
    p_user_id, p_type_code, p_type_code, p_title, p_message, COALESCE(p_data, '{}'::jsonb)
  )
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$;

CREATE OR REPLACE FUNCTION quickbite.mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS quickbite.notifications
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification quickbite.notifications%ROWTYPE;
BEGIN
  UPDATE quickbite.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id
    AND user_id = p_user_id
  RETURNING * INTO v_notification;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'notification_not_found' USING ERRCODE = '23503';
  END IF;

  RETURN v_notification;
END;
$$;

COMMENT ON TABLE quickbite.audit_logs
IS 'Append-oriented security and business audit trail. API/system actors should write through controlled server-side paths.';

COMMENT ON COLUMN quickbite.audit_logs.request_id
IS 'Correlation identifier used to trace one API request across database operations and future sync jobs.';

COMMENT ON TABLE quickbite.notifications
IS 'In-app notification queue. Delivery to push/email/SMS belongs to the API/application layer.';

COMMIT;
