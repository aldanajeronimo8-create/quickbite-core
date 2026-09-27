-- QuickBite Core — authentication foundation
-- Tarea 05/17
-- Authentication data model for the future QuickBite API.
-- Passwords are hashed by the API; raw passwords and raw session tokens are never stored.

BEGIN;

CREATE TABLE IF NOT EXISTS quickbite.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address INET,
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON quickbite.auth_sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry
  ON quickbite.auth_sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS quickbite.auth_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_password_resets_user
  ON quickbite.auth_password_resets(user_id, expires_at DESC)
  WHERE used_at IS NULL;

CREATE OR REPLACE FUNCTION quickbite.revoke_auth_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE quickbite.auth_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE id = p_session_id
    AND user_id = p_user_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION quickbite.revoke_all_auth_sessions(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE quickbite.auth_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = p_user_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON TABLE quickbite.auth_sessions
IS 'Server-side sessions. Store only a cryptographic hash of the opaque session token.';

COMMENT ON TABLE quickbite.auth_password_resets
IS 'Single-use password reset tokens. Store only a cryptographic hash; token generation/delivery belongs to the API.';

COMMENT ON COLUMN quickbite.users.password_hash
IS 'Password hash produced by the API using a modern password hashing algorithm; never store plaintext passwords.';

COMMIT;
