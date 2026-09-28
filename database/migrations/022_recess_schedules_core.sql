CREATE TABLE IF NOT EXISTS quickbite.recess_schedules (
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
FOR EACH ROW EXECUTE FUNCTION quickbite.validate_recess_target();
