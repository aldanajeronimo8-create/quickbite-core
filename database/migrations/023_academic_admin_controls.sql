ALTER TABLE quickbite.academic_sections ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE quickbite.academic_grades ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE quickbite.academic_courses ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE quickbite.academic_sections SET active=true WHERE active IS NULL;
UPDATE quickbite.academic_grades SET active=true WHERE active IS NULL;
UPDATE quickbite.academic_courses SET active=true WHERE active IS NULL;

CREATE INDEX IF NOT EXISTS idx_academic_sections_active ON quickbite.academic_sections(active,display_order);
CREATE INDEX IF NOT EXISTS idx_academic_grades_active ON quickbite.academic_grades(active,display_order);
CREATE INDEX IF NOT EXISTS idx_academic_courses_active ON quickbite.academic_courses(active,display_order);
