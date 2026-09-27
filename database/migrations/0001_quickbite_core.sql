CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS quickbite;

CREATE TYPE quickbite.user_role AS ENUM ('student','parent','staff','admin');
CREATE TYPE quickbite.order_status AS ENUM ('pending','preparing','ready','delivered','cancelled');
CREATE TYPE quickbite.payment_status AS ENUM ('pending','approved','rejected');

CREATE TABLE quickbite.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE CHECK (email = lower(email)), password_hash text NOT NULL, role quickbite.user_role NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.profiles (user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE, full_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid REFERENCES quickbite.categories(id) ON DELETE SET NULL, name text NOT NULL, description text, price numeric(12,2) NOT NULL CHECK (price >= 0), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.inventory (product_id uuid PRIMARY KEY REFERENCES quickbite.products(id) ON DELETE CASCADE, quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.inventory_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES quickbite.products(id), quantity_delta integer NOT NULL CHECK (quantity_delta <> 0), reason text NOT NULL, actor_id uuid REFERENCES quickbite.users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.wallets (user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE, balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES quickbite.users(id), idempotency_key uuid NOT NULL, total numeric(12,2) NOT NULL CHECK (total >= 0), status quickbite.order_status NOT NULL DEFAULT 'pending', payment_status quickbite.payment_status NOT NULL DEFAULT 'pending', payment_method text NOT NULL CHECK (payment_method IN ('wallet','cash','nequi','daviplata','bre_b')), pickup_code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,idempotency_key));
CREATE TABLE quickbite.order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES quickbite.orders(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES quickbite.products(id), quantity integer NOT NULL CHECK (quantity > 0), unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0));
CREATE TABLE quickbite.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES quickbite.orders(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL CHECK (amount >= 0), status quickbite.payment_status NOT NULL, provider text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.auth_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE, refresh_token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid, actor_id uuid REFERENCES quickbite.users(id), action text NOT NULL, entity_type text, entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quickbite.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE, title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX orders_user_created_idx ON quickbite.orders(user_id, created_at DESC); CREATE INDEX sessions_user_idx ON quickbite.auth_sessions(user_id) WHERE revoked_at IS NULL; CREATE INDEX inventory_movements_product_idx ON quickbite.inventory_movements(product_id, created_at DESC);
CREATE VIEW quickbite.v_menu AS SELECT p.id, p.name, p.description, p.price, p.category_id, c.name AS category_name, i.quantity AS stock FROM quickbite.products p JOIN quickbite.inventory i ON i.product_id=p.id LEFT JOIN quickbite.categories c ON c.id=p.category_id WHERE p.active AND c.active IS NOT FALSE AND i.quantity > 0;

CREATE OR REPLACE FUNCTION quickbite.create_order_tx(p_user_id uuid,p_items jsonb,p_payment_method text,p_idempotency_key uuid) RETURNS quickbite.orders LANGUAGE plpgsql AS $$
DECLARE v_order quickbite.orders; v_item jsonb; v_product record; v_total numeric(12,2):=0; v_quantity integer; v_pickup text;
BEGIN
 SELECT * INTO v_order FROM quickbite.orders WHERE user_id=p_user_id AND idempotency_key=p_idempotency_key; IF FOUND THEN RETURN v_order; END IF;
 IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'order_items_required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM quickbite.users WHERE id=p_user_id AND active) THEN RAISE EXCEPTION 'user_not_active'; END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  v_quantity := (v_item->>'quantity')::integer; IF v_quantity IS NULL OR v_quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  SELECT p.id,p.price,i.quantity INTO v_product FROM quickbite.products p JOIN quickbite.inventory i ON i.product_id=p.id WHERE p.id=(v_item->>'product_id')::uuid AND p.active FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
  IF v_product.quantity < v_quantity THEN RAISE EXCEPTION 'insufficient_stock'; END IF;
  UPDATE quickbite.inventory SET quantity=quantity-v_quantity,updated_at=now() WHERE product_id=v_product.id; INSERT INTO quickbite.inventory_movements(product_id,quantity_delta,reason,actor_id) VALUES(v_product.id,-v_quantity,'order',p_user_id); v_total:=v_total+v_product.price*v_quantity;
 END LOOP;
 v_pickup := upper(substr(encode(gen_random_bytes(6),'hex'),1,8)); INSERT INTO quickbite.orders(user_id,idempotency_key,total,payment_method,pickup_code) VALUES(p_user_id,p_idempotency_key,v_total,p_payment_method,v_pickup) RETURNING * INTO v_order;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP SELECT price INTO v_product FROM quickbite.products WHERE id=(v_item->>'product_id')::uuid; INSERT INTO quickbite.order_items(order_id,product_id,quantity,unit_price) VALUES(v_order.id,(v_item->>'product_id')::uuid,(v_item->>'quantity')::integer,v_product.price); END LOOP;
 INSERT INTO quickbite.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(p_user_id,'order.created','order',v_order.id,jsonb_build_object('total',v_total)); RETURN v_order;
END $$;
