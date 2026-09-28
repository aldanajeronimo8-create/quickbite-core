const ADVISORY_LOCK_KEY = 20260927023;

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

  if (!row.users_table || !row.identity_table) {
    throw new Error('core_database_schema_missing');
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
    try { await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]); } catch {}
    client.release();
  }
}
