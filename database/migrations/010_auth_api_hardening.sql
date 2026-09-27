-- QuickBite Core — API authentication hardening
-- Tarea 14/17

BEGIN;

ALTER TABLE quickbite.auth_sessions
  ADD COLUMN IF NOT EXISTS rotated_from_session_id UUID
    REFERENCES quickbite.auth_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_rotated_from
  ON quickbite.auth_sessions(rotated_from_session_id)
  WHERE rotated_from_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION quickbite.consume_password_reset(
  p_token_hash TEXT,
  p_new_password_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_token_hash IS NULL OR btrim(p_token_hash) = ''
     OR p_new_password_hash IS NULL OR btrim(p_new_password_hash) = '' THEN
    RAISE EXCEPTION 'reset_fields_required' USING ERRCODE = '22023';
  END IF;

  SELECT user_id INTO v_user_id
  FROM quickbite.auth_password_resets
  WHERE token_hash = p_token_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_reset_token' USING ERRCODE = '22023';
  END IF;

  UPDATE quickbite.users
  SET password_hash = p_new_password_hash,
      updated_at = now()
  WHERE id = v_user_id
    AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_active' USING ERRCODE = '22023';
  END IF;

  UPDATE quickbite.auth_password_resets
  SET used_at = now()
  WHERE token_hash = p_token_hash;

  PERFORM quickbite.revoke_all_auth_sessions(v_user_id);

  INSERT INTO quickbite.audit_logs (
    actor_user_id, action, entity_type, entity_id, metadata
  )
  VALUES (
    v_user_id,
    'auth.password_reset',
    'user',
    v_user_id,
    jsonb_build_object('sessions_revoked', true)
  );

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION quickbite.consume_password_reset(TEXT, TEXT)
IS 'Consumes a single-use reset token, changes the password hash atomically, and revokes existing sessions.';

COMMIT;
