-- QuickBite Core — academic structure and user profile hardening
-- Tarea 07/17
-- Keeps the existing profile model while enforcing useful integrity and API lookup indexes.

BEGIN;

ALTER TABLE quickbite.academic_sections
  DROP CONSTRAINT IF EXISTS academic_sections_name_check;

ALTER TABLE quickbite.academic_sections
  ADD CONSTRAINT academic_sections_name_check
  CHECK (length(trim(name)) > 0);

ALTER TABLE quickbite.academic_grades
  DROP CONSTRAINT IF EXISTS academic_grades_name_check;

ALTER TABLE quickbite.academic_grades
  ADD CONSTRAINT academic_grades_name_check
  CHECK (length(trim(name)) > 0);

ALTER TABLE quickbite.academic_courses
  DROP CONSTRAINT IF EXISTS academic_courses_name_check;

ALTER TABLE quickbite.academic_courses
  ADD CONSTRAINT academic_courses_name_check
  CHECK (length(trim(name)) > 0);

ALTER TABLE quickbite.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_full_name_check;

ALTER TABLE quickbite.user_profiles
  ADD CONSTRAINT user_profiles_full_name_check
  CHECK (length(trim(full_name)) > 0);

ALTER TABLE quickbite.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_student_code_check;

ALTER TABLE quickbite.user_profiles
  ADD CONSTRAINT user_profiles_student_code_check
  CHECK (student_code IS NULL OR length(trim(student_code)) > 0);

ALTER TABLE quickbite.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_identification_number_check;

ALTER TABLE quickbite.user_profiles
  ADD CONSTRAINT user_profiles_identification_number_check
  CHECK (identification_number IS NULL OR length(trim(identification_number)) > 0);

ALTER TABLE quickbite.academic_courses
  ADD CONSTRAINT academic_courses_section_grade_fk
  FOREIGN KEY (section_id, grade_id)
  REFERENCES quickbite.academic_sections(id), quickbite.academic_grades(id);

CREATE INDEX IF NOT EXISTS idx_courses_section_grade_active
  ON quickbite.academic_courses(section_id, grade_id, active, name);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active
  ON quickbite.user_profiles(role, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_section_grade
  ON quickbite.user_profiles(section_id, grade_id);

CREATE INDEX IF NOT EXISTS idx_profiles_course
  ON quickbite.user_profiles(course_id);

CREATE INDEX IF NOT EXISTS idx_profiles_student_code
  ON quickbite.user_profiles(student_code)
  WHERE student_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_identification
  ON quickbite.user_profiles(identification_number)
  WHERE identification_number IS NOT NULL;

CREATE OR REPLACE FUNCTION quickbite.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON quickbite.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON quickbite.users
FOR EACH ROW
EXECUTE FUNCTION quickbite.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON quickbite.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON quickbite.user_profiles
FOR EACH ROW
EXECUTE FUNCTION quickbite.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON quickbite.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON quickbite.categories
FOR EACH ROW
EXECUTE FUNCTION quickbite.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON quickbite.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON quickbite.products
FOR EACH ROW
EXECUTE FUNCTION quickbite.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON quickbite.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON quickbite.orders
FOR EACH ROW
EXECUTE FUNCTION quickbite.set_updated_at();

COMMENT ON TABLE quickbite.user_profiles
IS 'Application profile linked 1:1 to users; stores role, academic placement and per-account theme preference.';

COMMENT ON TABLE quickbite.academic_courses
IS 'Academic course/class grouping a user can belong to through user_profiles.';

COMMIT;
