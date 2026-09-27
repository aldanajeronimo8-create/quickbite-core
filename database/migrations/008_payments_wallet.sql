-- QuickBite Core — payments and wallet foundation
-- Tarea 10/17
-- Provider-agnostic design prepared for future Bre-B, Nequi, DaviPlata and other gateways.
-- This task does NOT connect to or move money through any provider.

BEGIN;

ALTER TABLE quickbite.wallet_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_idempotency
  ON quickbite.wallet_transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_external_reference
  ON quickbite.wallet_transactions(external_reference)
  WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON quickbite.wallet_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES quickbite.orders(id),
  user_id UUID NOT NULL REFERENCES quickbite.users(id),
  provider TEXT NOT NULL CHECK (
    provider IN ('internal_wallet','breb','nequi','daviplata','other')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','processing','confirmed','failed','cancelled','refunded')
  ),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'COP' CHECK (currency = 'COP'),
  idempotency_key UUID NOT NULL,
  provider_reference TEXT,
  provider_payment_id TEXT,
  checkout_url TEXT,
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(order_id, idempotency_key),
  UNIQUE(provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order
  ON quickbite.payment_transactions(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user
  ON quickbite.payment_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON quickbite.payment_transactions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider
  ON quickbite.payment_transactions(provider, created_at DESC);

CREATE OR REPLACE FUNCTION quickbite.set_payment_transaction_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at
  ON quickbite.payment_transactions;

CREATE TRIGGER trg_payment_transactions_updated_at
BEFORE UPDATE ON quickbite.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION quickbite.set_payment_transaction_updated_at();

ALTER TABLE quickbite.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_confirmed_at_status_check;

ALTER TABLE quickbite.payment_transactions
  ADD CONSTRAINT payment_confirmed_at_status_check
  CHECK (
    (status = 'confirmed' AND confirmed_at IS NOT NULL)
    OR status <> 'confirmed'
  );

CREATE OR REPLACE FUNCTION quickbite.record_payment_status(
  p_payment_id UUID,
  p_status TEXT,
  p_provider_reference TEXT DEFAULT NULL,
  p_provider_payment_id TEXT DEFAULT NULL,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_message TEXT DEFAULT NULL
)
RETURNS quickbite.payment_transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment quickbite.payment_transactions%ROWTYPE;
BEGIN
  SELECT *
    INTO v_payment
  FROM quickbite.payment_transactions
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = '23503';
  END IF;

  IF p_status NOT IN ('pending','processing','confirmed','failed','cancelled','refunded') THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'confirmed' AND p_provider_reference IS NULL
     AND v_payment.provider <> 'internal_wallet' THEN
    RAISE EXCEPTION 'provider_reference_required' USING ERRCODE = '22023';
  END IF;

  UPDATE quickbite.payment_transactions
  SET
    status = p_status,
    provider_reference = COALESCE(p_provider_reference, provider_reference),
    provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
    failure_code = p_failure_code,
    failure_message = p_failure_message,
    confirmed_at = CASE
      WHEN p_status = 'confirmed' THEN COALESCE(confirmed_at, now())
      ELSE confirmed_at
    END,
    updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  UPDATE quickbite.orders
  SET
    payment_status = CASE
      WHEN p_status = 'confirmed' THEN 'confirmed'
      WHEN p_status = 'refunded' THEN 'refunded'
      WHEN p_status IN ('failed','cancelled') THEN 'rejected'
      ELSE payment_status
    END,
    updated_at = now()
  WHERE id = v_payment.order_id;

  INSERT INTO quickbite.audit_logs (
    actor_user_id, action, entity_type, entity_id, metadata
  )
  VALUES (
    v_payment.user_id,
    'payment.status_changed',
    'payment',
    v_payment.id,
    jsonb_build_object(
      'status', p_status,
      'provider', v_payment.provider,
      'provider_reference', v_payment.provider_reference
    )
  );

  RETURN v_payment;
END;
$$;

COMMENT ON TABLE quickbite.payment_transactions
IS 'Provider-agnostic payment record. Provider integrations belong in the API, never in the frontend or database.';

COMMENT ON COLUMN quickbite.payment_transactions.provider
IS 'Gateway identifier reserved for internal wallet, Bre-B, Nequi, DaviPlata or another future provider.';

COMMIT;
