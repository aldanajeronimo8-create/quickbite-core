const ADVISORY_LOCK_KEY = 20260927023;

const CORE_BASELINE_MIGRATION = "CREATE EXTENSION IF NOT EXISTS pgcrypto;\nCREATE SCHEMA IF NOT EXISTS quickbite;\n\nCREATE TYPE quickbite.user_role AS ENUM ('student','parent','staff','admin');\nCREATE TYPE quickbite.order_status AS ENUM ('pending','preparing','ready','delivered','cancelled');\nCREATE TYPE quickbite.payment_status AS ENUM ('pending','approved','rejected');\n\nCREATE TABLE quickbite.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE CHECK (email = lower(email)), password_hash text NOT NULL, role quickbite.user_role NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.profiles (user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE, full_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid REFERENCES quickbite.categories(id) ON DELETE SET NULL, name text NOT NULL, description text, price numeric(12,2) NOT NULL CHECK (price >= 0), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.inventory (product_id uuid PRIMARY KEY REFERENCES quickbite.products(id) ON DELETE CASCADE, quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0), updated_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.inventory_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES quickbite.products(id), quantity_delta integer NOT NULL CHECK (quantity_delta <> 0), reason text NOT NULL, actor_id uuid REFERENCES quickbite.users(id), created_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.wallets (user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE, balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0), updated_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES quickbite.users(id), idempotency_key uuid NOT NULL, total numeric(12,2) NOT NULL CHECK (total >= 0), status quickbite.order_status NOT NULL DEFAULT 'pending', payment_status quickbite.payment_status NOT NULL DEFAULT 'pending', payment_method text NOT NULL CHECK (payment_method IN ('wallet','cash','nequi','daviplata','bre_b')), pickup_code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,idempotency_key));\nCREATE TABLE quickbite.order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES quickbite.orders(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES quickbite.products(id), quantity integer NOT NULL CHECK (quantity > 0), unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0));\nCREATE TABLE quickbite.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES quickbite.orders(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL CHECK (amount >= 0), status quickbite.payment_status NOT NULL, provider text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.auth_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE, refresh_token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid, actor_id uuid REFERENCES quickbite.users(id), action text NOT NULL, entity_type text, entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE quickbite.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES quickbite.users(id) ON DELETE CASCADE, title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());\nCREATE INDEX orders_user_created_idx ON quickbite.orders(user_id, created_at DESC); CREATE INDEX sessions_user_idx ON quickbite.auth_sessions(user_id) WHERE revoked_at IS NULL; CREATE INDEX inventory_movements_product_idx ON quickbite.inventory_movements(product_id, created_at DESC);\nCREATE VIEW quickbite.v_menu AS SELECT p.id, p.name, p.description, p.price, p.category_id, c.name AS category_name, i.quantity AS stock FROM quickbite.products p JOIN quickbite.inventory i ON i.product_id=p.id LEFT JOIN quickbite.categories c ON c.id=p.category_id WHERE p.active AND c.active IS NOT FALSE AND i.quantity > 0;\n\nCREATE OR REPLACE FUNCTION quickbite.create_order_tx(p_user_id uuid,p_items jsonb,p_payment_method text,p_idempotency_key uuid) RETURNS quickbite.orders LANGUAGE plpgsql AS $\nDECLARE v_order quickbite.orders; v_item jsonb; v_product record; v_total numeric(12,2):=0; v_quantity integer; v_pickup text;\nBEGIN\n SELECT * INTO v_order FROM quickbite.orders WHERE user_id=p_user_id AND idempotency_key=p_idempotency_key; IF FOUND THEN RETURN v_order; END IF;\n IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'order_items_required'; END IF;\n IF NOT EXISTS (SELECT 1 FROM quickbite.users WHERE id=p_user_id AND active) THEN RAISE EXCEPTION 'user_not_active'; END IF;\n FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP\n  v_quantity := (v_item->>'quantity')::integer; IF v_quantity IS NULL OR v_quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;\n  SELECT p.id,p.price,i.quantity INTO v_product FROM quickbite.products p JOIN quickbite.inventory i ON i.product_id=p.id WHERE p.id=(v_item->>'product_id')::uuid AND p.active FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;\n  IF v_product.quantity < v_quantity THEN RAISE EXCEPTION 'insufficient_stock'; END IF;\n  UPDATE quickbite.inventory SET quantity=quantity-v_quantity,updated_at=now() WHERE product_id=v_product.id; INSERT INTO quickbite.inventory_movements(product_id,quantity_delta,reason,actor_id) VALUES(v_product.id,-v_quantity,'order',p_user_id); v_total:=v_total+v_product.price*v_quantity;\n END LOOP;\n v_pickup := upper(substr(encode(gen_random_bytes(6),'hex'),1,8)); INSERT INTO quickbite.orders(user_id,idempotency_key,total,payment_method,pickup_code) VALUES(p_user_id,p_idempotency_key,v_total,p_payment_method,v_pickup) RETURNING * INTO v_order;\n FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP SELECT price INTO v_product FROM quickbite.products WHERE id=(v_item->>'product_id')::uuid; INSERT INTO quickbite.order_items(order_id,product_id,quantity,unit_price) VALUES(v_order.id,(v_item->>'product_id')::uuid,(v_item->>'quantity')::integer,v_product.price); END LOOP;\n INSERT INTO quickbite.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(p_user_id,'order.created','order',v_order.id,jsonb_build_object('total',v_total)); RETURN v_order;\nEND $;";

const CORE_ACADEMIC_MIGRATIONS = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS quickbite.academic_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS quickbite.academic_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES quickbite.academic_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  UNIQUE(section_id, name)
);

CREATE TABLE IF NOT EXISTS quickbite.academic_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES quickbite.academic_grades(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  UNIQUE(grade_id, name)
);

INSERT INTO quickbite.academic_sections(name,display_order)
SELECT v.name,v.display_order
FROM (VALUES ('Sección 2',2),('Sección 3',3),('Sección 4',4)) v(name,display_order)
WHERE NOT EXISTS (SELECT 1 FROM quickbite.academic_sections s WHERE s.name=v.name);

INSERT INTO quickbite.academic_grades(section_id,name,display_order)
SELECT s.id, g.name, g.display_order
FROM quickbite.academic_sections s
JOIN (VALUES
  ('Sección 2','1°',1),('Sección 2','2°',2),('Sección 2','3°',3),('Sección 2','4°',4),('Sección 2','5°',5),
  ('Sección 3','6°',6),('Sección 3','7°',7),('Sección 3','8°',8),
  ('Sección 4','9°',9),('Sección 4','10°',10),('Sección 4','11°',11)
) g(section_name,name,display_order) ON g.section_name=s.name
WHERE NOT EXISTS (SELECT 1 FROM quickbite.academic_grades x WHERE x.section_id=s.id AND x.name=g.name);

INSERT INTO quickbite.academic_courses(grade_id,name,display_order)
SELECT g.id,c.name,c.display_order
FROM quickbite.academic_grades g
CROSS JOIN (VALUES ('A',1),('B',2),('C',3),('D',4),('E',5)) c(name,display_order)
WHERE NOT EXISTS (SELECT 1 FROM quickbite.academic_courses x WHERE x.grade_id=g.id AND x.name=c.name);

ALTER TABLE quickbite.user_identity
  ADD COLUMN IF NOT EXISTS section_id uuid,
  ADD COLUMN IF NOT EXISTS grade_id uuid,
  ADD COLUMN IF NOT EXISTS course_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_identity_section_fk') THEN
    ALTER TABLE quickbite.user_identity ADD CONSTRAINT user_identity_section_fk FOREIGN KEY(section_id) REFERENCES quickbite.academic_sections(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_identity_grade_fk') THEN
    ALTER TABLE quickbite.user_identity ADD CONSTRAINT user_identity_grade_fk FOREIGN KEY(grade_id) REFERENCES quickbite.academic_grades(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_identity_course_fk') THEN
    ALTER TABLE quickbite.user_identity ADD CONSTRAINT user_identity_course_fk FOREIGN KEY(course_id) REFERENCES quickbite.academic_courses(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quickbite.student_enrollments (
  user_id uuid PRIMARY KEY REFERENCES quickbite.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES quickbite.academic_sections(id),
  grade_id uuid NOT NULL REFERENCES quickbite.academic_grades(id),
  course_id uuid NOT NULL REFERENCES quickbite.academic_courses(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION quickbite.validate_student_enrollment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  grade_section uuid;
  course_grade uuid;
BEGIN
  SELECT role INTO user_role FROM quickbite.users WHERE id=NEW.user_id;
  IF user_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'student_enrollment_requires_student';
  END IF;
  SELECT section_id INTO grade_section FROM quickbite.academic_grades WHERE id=NEW.grade_id;
  IF grade_section IS DISTINCT FROM NEW.section_id THEN
    RAISE EXCEPTION 'grade_not_in_section';
  END IF;
  SELECT grade_id INTO course_grade FROM quickbite.academic_courses WHERE id=NEW.course_id;
  IF course_grade IS DISTINCT FROM NEW.grade_id THEN
    RAISE EXCEPTION 'course_not_in_grade';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_student_enrollment ON quickbite.student_enrollments;
CREATE TRIGGER trg_validate_student_enrollment
BEFORE INSERT OR UPDATE ON quickbite.student_enrollments
FOR EACH ROW EXECUTE FUNCTION quickbite.validate_student_enrollment();

CREATE INDEX IF NOT EXISTS idx_student_enrollments_section ON quickbite.student_enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_grade ON quickbite.student_enrollments(grade_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course ON quickbite.student_enrollments(course_id);`,
  `CREATE TABLE IF NOT EXISTS quickbite.recess_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quickbite.recess_schedule_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recess_schedule_id uuid NOT NULL REFERENCES quickbite.recess_schedules(id) ON DELETE CASCADE,
  section_id uuid REFERENCES quickbite.academic_sections(id) ON DELETE CASCADE,
  grade_id uuid REFERENCES quickbite.academic_grades(id) ON DELETE CASCADE,
  course_id uuid REFERENCES quickbite.academic_courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (section_id IS NOT NULL)::int +
    (grade_id IS NOT NULL)::int +
    (course_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_recess_schedules_weekday_active
  ON quickbite.recess_schedules(weekday, active, start_time);

CREATE INDEX IF NOT EXISTS idx_recess_targets_schedule
  ON quickbite.recess_schedule_targets(recess_schedule_id);

CREATE INDEX IF NOT EXISTS idx_recess_targets_section
  ON quickbite.recess_schedule_targets(section_id);

CREATE INDEX IF NOT EXISTS idx_recess_targets_grade
  ON quickbite.recess_schedule_targets(grade_id);

CREATE INDEX IF NOT EXISTS idx_recess_targets_course
  ON quickbite.recess_schedule_targets(course_id);

CREATE OR REPLACE FUNCTION quickbite.validate_recess_target()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE grade_section uuid;
DECLARE course_grade uuid;
BEGIN
  IF NEW.grade_id IS NOT NULL THEN
    SELECT section_id INTO grade_section FROM quickbite.academic_grades WHERE id=NEW.grade_id;
    IF grade_section IS NULL THEN RAISE EXCEPTION 'grade_not_found'; END IF;
    IF NEW.section_id IS NOT NULL AND NEW.section_id IS DISTINCT FROM grade_section THEN
      RAISE EXCEPTION 'grade_not_in_section';
    END IF;
  END IF;
  IF NEW.course_id IS NOT NULL THEN
    SELECT grade_id INTO course_grade FROM quickbite.academic_courses WHERE id=NEW.course_id;
    IF course_grade IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
    IF NEW.grade_id IS NOT NULL AND NEW.grade_id IS DISTINCT FROM course_grade THEN
      RAISE EXCEPTION 'course_not_in_grade';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_recess_target ON quickbite.recess_schedule_targets;
CREATE TRIGGER trg_validate_recess_target
BEFORE INSERT OR UPDATE ON quickbite.recess_schedule_targets
FOR EACH ROW EXECUTE FUNCTION quickbite.validate_recess_target();`,
  `ALTER TABLE quickbite.academic_sections ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE quickbite.academic_grades ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE quickbite.academic_courses ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE quickbite.academic_sections SET active=true WHERE active IS NULL;
UPDATE quickbite.academic_grades SET active=true WHERE active IS NULL;
UPDATE quickbite.academic_courses SET active=true WHERE active IS NULL;

CREATE INDEX IF NOT EXISTS idx_academic_sections_active ON quickbite.academic_sections(active,display_order);
CREATE INDEX IF NOT EXISTS idx_academic_grades_active ON quickbite.academic_grades(active,display_order);
CREATE INDEX IF NOT EXISTS idx_academic_courses_active ON quickbite.academic_courses(active,display_order);`,
];

export async function ensureCoreAcademicSchema(pool) {
  const probe = await pool.query(`
    SELECT
      to_regclass('quickbite.users') AS users_table,
      to_regclass('quickbite.user_identity') AS identity_table,
      to_regclass('quickbite.academic_sections') AS academic_sections,
      to_regclass('quickbite.academic_grades') AS academic_grades,
      to_regclass('quickbite.academic_courses') AS academic_courses,
      to_regclass('quickbite.student_enrollments') AS student_enrollments,
      to_regclass('quickbite.recess_schedules') AS recess_schedules,
      to_regclass('quickbite.recess_schedule_targets') AS recess_schedule_targets
  `);
  const row = probe.rows[0];

  if (!row.users_table) {
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
      const recheck = await client.query(`SELECT to_regclass('quickbite.users') AS users_table`);
      if (!recheck.rows[0]?.users_table) {
        await client.query('BEGIN');
        try {
          await client.query(CORE_BASELINE_MIGRATION);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      try { await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]); } catch { /* ignore unlock failure */ }
      client.release();
    }
  }

  const activeColumns = await pool.query(`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'quickbite'
      AND table_name IN ('academic_sections','academic_grades','academic_courses')
      AND column_name = 'active'
  `);

  const schemaReady =
    Object.values(row).every(Boolean) &&
    activeColumns.rowCount === 3;

  if (schemaReady) return;

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    const recheck = await client.query(`
      SELECT
        to_regclass('quickbite.academic_sections') AS academic_sections,
        to_regclass('quickbite.academic_grades') AS academic_grades,
        to_regclass('quickbite.academic_courses') AS academic_courses,
        to_regclass('quickbite.student_enrollments') AS student_enrollments,
        to_regclass('quickbite.recess_schedules') AS recess_schedules,
        to_regclass('quickbite.recess_schedule_targets') AS recess_schedule_targets
    `);
    const recheckColumns = await client.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'quickbite'
        AND table_name IN ('academic_sections','academic_grades','academic_courses')
        AND column_name = 'active'
    `);
    const recheckRow = recheck.rows[0];
    const recheckReady =
      Object.values(recheckRow).every(Boolean) &&
      recheckColumns.rowCount === 3;
    if (recheckReady) return;

    await client.query('BEGIN');
    try {
      for (const sql of CORE_ACADEMIC_MIGRATIONS) await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]); } catch { /* ignore unlock failure */ }
    client.release();
  }
}
