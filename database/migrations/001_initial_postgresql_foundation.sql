-- QuickBite Core — PostgreSQL foundation
-- Tarea 04/17
-- Standalone PostgreSQL schema. No Supabase dependencies.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS quickbite;

CREATE TABLE IF NOT EXISTS quickbite.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.academic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.academic_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.academic_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section_id UUID REFERENCES quickbite.academic_sections(id),
  grade_id UUID REFERENCES quickbite.academic_grades(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, section_id, grade_id)
);

CREATE TABLE IF NOT EXISTS quickbite.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  student_code TEXT UNIQUE,
  identification_number TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin','parent','staff')),
  section_id UUID REFERENCES quickbite.academic_sections(id),
  grade_id UUID REFERENCES quickbite.academic_grades(id),
  course_id UUID REFERENCES quickbite.academic_courses(id),
  theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light','dark','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES quickbite.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  calories INTEGER CHECK (calories IS NULL OR calories >= 0),
  protein_g NUMERIC(8,2) CHECK (protein_g IS NULL OR protein_g >= 0),
  carbohydrates_g NUMERIC(8,2) CHECK (carbohydrates_g IS NULL OR carbohydrates_g >= 0),
  fats_g NUMERIC(8,2) CHECK (fats_g IS NULL OR fats_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES quickbite.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','delivered','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','confirmed','rejected','refunded')),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  notes TEXT,
  pickup_code TEXT NOT NULL UNIQUE,
  pickup_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  admin_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  recess_id UUID,
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS quickbite.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES quickbite.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES quickbite.products(id),
  product_name_snapshot TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS quickbite.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES quickbite.products(id),
  order_id UUID REFERENCES quickbite.orders(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry','sale','reservation','release','return','adjustment')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
  reason TEXT,
  created_by UUID REFERENCES quickbite.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.wallets (
  user_id UUID PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES quickbite.users(id),
  order_id UUID REFERENCES quickbite.orders(id),
  type TEXT NOT NULL CHECK (type IN ('credit','debit','refund','adjustment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(12,2) NOT NULL CHECK (balance_before >= 0),
  balance_after NUMERIC(12,2) NOT NULL CHECK (balance_after >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES quickbite.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_active ON quickbite.products(category_id, active);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON quickbite.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON quickbite.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_admin_visibility ON quickbite.orders(admin_hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON quickbite.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_created ON quickbite.inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_created ON quickbite.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON quickbite.notifications(user_id, read_at, created_at DESC);

COMMIT;
