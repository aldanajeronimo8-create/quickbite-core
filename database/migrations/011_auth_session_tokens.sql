-- QuickBite Core — authentication session model
-- Tarea 14/17: access token + rotating refresh token

BEGIN;

ALTER TABLE quickbite.auth_sessions
  ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotated_from_session_id UUID
    REFERENCES quickbite.auth_sessions(id) ON DELETE SET NULL;

UPDATE quickbite.auth_sessions
SET access_expires_at = COALESCE(access_expires_at, LEAST(expires_at, now() + interval '30 minutes')),
    refresh_expires_at = COALESCE(refresh_expires_at, expires_at)
WHERE access_expires_at IS NULL OR refresh_expires_at IS NULL;

ALTER TABLE quickbite.auth_sessions
  ALTER COLUMN access_expires_at SET NOT NULL,
  ALTER COLUMN refresh_expires_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_refresh_token_hash
  ON quickbite.auth_sessions(refresh_token_hash)
  WHERE refresh_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_access_expiry
  ON quickbite.auth_sessions(access_expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh_expiry
  ON quickbite.auth_sessions(refresh_expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_rotated_from
  ON quickbite.auth_sessions(rotated_from_session_id)
  WHERE rotated_from_session_id IS NOT NULL;

ALTER TABLE quickbite.auth_sessions
  DROP CONSTRAINT IF EXISTS auth_sessions_expires_at_check;

ALTER TABLE quickbite.auth_sessions
  ADD CONSTRAINT auth_sessions_expiry_order_check
  CHECK (
    access_expires_at > created_at
    AND refresh_expires_at >= access_expires_at
    AND expires_at >= refresh_expires_at
  );

COMMENT ON COLUMN quickbite.auth_sessions.token_hash
IS 'Hash of the short-lived access token. Raw tokens are never stored.';

COMMENT ON COLUMN quickbite.auth_sessions.refresh_token_hash
IS 'Hash of the rotating long-lived refresh token. Raw refresh tokens are never stored.';

COMMENT ON COLUMN quickbite.auth_sessions.access_expires_at
IS 'Short-lived access-token expiry; API clients refresh automatically before/after expiry.';

COMMENT ON COLUMN quickbite.auth_sessions.refresh_expires_at
IS 'Refresh-session expiry. Default API policy is 30 days from login.';

COMMIT;
