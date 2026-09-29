let readyPromise;

const SQL = `
CREATE SCHEMA IF NOT EXISTS quickbite;
ALTER TYPE quickbite.payment_status ADD VALUE IF NOT EXISTS 'confirmed';

ALTER TABLE quickbite.products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE quickbite.products ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;
UPDATE quickbite.products SET available = active WHERE available IS DISTINCT FROM active;
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS estimated_minutes integer;
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS admin_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS student_comment text;
UPDATE quickbite.orders SET order_number = pickup_code WHERE order_number IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uq ON quickbite.orders(order_number);

CREATE TABLE IF NOT EXISTS quickbite.pickup_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  max_orders integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(starts_at < ends_at),
  CHECK(max_orders IS NULL OR max_orders > 0)
);
ALTER TABLE quickbite.orders ADD COLUMN IF NOT EXISTS pickup_slot_id uuid;
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_pickup_slot_id_fkey') THEN ALTER TABLE quickbite.orders ADD CONSTRAINT orders_pickup_slot_id_fkey FOREIGN KEY (pickup_slot_id) REFERENCES quickbite.pickup_slots(id) ON DELETE RESTRICT; END IF; END $;
CREATE INDEX IF NOT EXISTS pickup_slots_time_idx ON quickbite.pickup_slots(enabled,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS orders_pickup_slot_created_idx ON quickbite.orders(pickup_slot_id,created_at DESC);
CREATE TABLE IF NOT EXISTS quickbite.order_window_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO quickbite.order_window_settings(id,enabled) VALUES(true,true) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS quickbite.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('top_up','purchase','refund','adjustment')),
  description text NOT NULL,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx ON quickbite.wallet_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.wallet_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('manual','nequi','bre-b')),
  reference text,
  comment text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES quickbite.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_topup_requests_status_created_idx ON quickbite.wallet_topup_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.family_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_parent_user_id uuid REFERENCES quickbite.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_link_codes_student_idx ON quickbite.family_link_codes(student_user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.parent_food_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES quickbite.products(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id, product_id)
);

CREATE TABLE IF NOT EXISTS quickbite.student_spending_limits (
  student_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  daily_limit numeric(12,2),
  weekly_limit numeric(12,2),
  monthly_limit numeric(12,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.product_nutrition (
  product_id uuid PRIMARY KEY REFERENCES quickbite.products(id) ON DELETE CASCADE,
  calories numeric(7,1),
  protein_g numeric(7,1),
  carbohydrates_g numeric(7,1),
  fat_g numeric(7,1),
  fiber_g numeric(7,1),
  ingredients text,
  allergens text,
  vegetarian boolean NOT NULL DEFAULT false,
  healthy_choice boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES quickbite.products(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES quickbite.orders(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, product_id, order_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_product_status_idx ON quickbite.product_reviews(product_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.loyalty_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  points_per_currency_unit numeric(12,4) NOT NULL DEFAULT 0.01,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO quickbite.loyalty_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS quickbite.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES quickbite.products(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  points_required integer NOT NULL CHECK (points_required > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.loyalty_point_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned','spent','adjustment')),
  reference_id text,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_point_ledger_user_idx ON quickbite.loyalty_point_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES quickbite.loyalty_rewards(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES quickbite.products(id) ON DELETE RESTRICT,
  points_spent integer NOT NULL CHECK (points_spent > 0),
  redemption_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','fulfilled','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz
);
CREATE INDEX IF NOT EXISTS loyalty_redemptions_user_idx ON quickbite.loyalty_redemptions(user_id, created_at DESC);

ALTER TABLE quickbite.order_items ADD COLUMN IF NOT EXISTS price numeric(12,2);
UPDATE quickbite.order_items SET price=unit_price WHERE price IS NULL;

CREATE TABLE IF NOT EXISTS quickbite.order_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES quickbite.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES quickbite.order_items(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  requested_quantity integer,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  refund_amount numeric(12,2) NOT NULL DEFAULT 0,
  refund_method text,
  review_note text,
  reviewed_by uuid REFERENCES quickbite.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_cancel_requests_status_idx ON quickbite.order_cancellation_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.student_profile_preferences (
  user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  dietary_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  allergies text,
  guardian_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.student_registration_consents (
  student_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  guardian_name text NOT NULL,
  guardian_relationship text NOT NULL,
  guardian_email text NOT NULL,
  student_acknowledged boolean NOT NULL DEFAULT false,
  guardian_authorized boolean NOT NULL DEFAULT false,
  purpose text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_health_checks_service_idx ON quickbite.system_health_checks(service, checked_at DESC);

CREATE TABLE IF NOT EXISTS quickbite.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES quickbite.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'success',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_audit_logs_created_idx ON quickbite.system_audit_logs(created_at DESC);

DROP VIEW IF EXISTS quickbite.v_menu;
CREATE VIEW quickbite.v_menu AS
SELECT p.id,p.name,p.description,p.price,p.category_id,c.name AS category_name,p.image_url,p.available,i.quantity AS stock
FROM quickbite.products p
JOIN quickbite.inventory i ON i.product_id=p.id
LEFT JOIN quickbite.categories c ON c.id=p.category_id
WHERE p.active AND p.available AND c.active IS NOT FALSE AND i.quantity > 0;
`;

export function ensureCoreFeatureSchema(pool) {
  if (!readyPromise) readyPromise = pool.query(SQL).then(() => undefined);
  return readyPromise;
}
