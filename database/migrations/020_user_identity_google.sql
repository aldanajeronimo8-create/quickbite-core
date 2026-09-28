-- QuickBite identity and Google federation
-- Stores only school-specific identity data not supplied by Google.
CREATE TABLE IF NOT EXISTS quickbite.user_identity (
  user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'national_id',
  document_number text NOT NULL,
  course text,
  google_subject text UNIQUE,
  google_email text,
  google_linked_at timestamptz,
  privacy_consent_at timestamptz,
  privacy_policy_version text,
  representative_authorization_at timestamptz,
  minor_heard_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quickbite_user_identity_document
  ON quickbite.user_identity (document_type, document_number);

CREATE INDEX IF NOT EXISTS idx_quickbite_user_identity_course
  ON quickbite.user_identity (course);

CREATE INDEX IF NOT EXISTS idx_quickbite_user_identity_google_subject
  ON quickbite.user_identity (google_subject);

COMMENT ON TABLE quickbite.user_identity IS 'Restricted school identity and Google federation metadata for QuickBite accounts.';
COMMENT ON COLUMN quickbite.user_identity.document_number IS 'School identity lookup field; must never be displayed publicly.';
COMMENT ON COLUMN quickbite.user_identity.google_subject IS 'Stable Google OIDC subject (sub); never use email as the Google account identifier.';
