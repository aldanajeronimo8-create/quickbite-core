CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course ON quickbite.student_enrollments(course_id);
