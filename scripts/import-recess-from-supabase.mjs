import { Client } from 'pg';

const required = ['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(key + ' is required');

const core = new Client({ connectionString: process.env.DATABASE_URL });
const base = process.env.SUPABASE_URL.replace(/\/$/,'');
const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY };

async function readTable(name) {
  const response = await fetch(base + '/rest/v1/' + name + '?select=*', { headers });
  if (!response.ok) throw new Error(name + ': Supabase returned ' + response.status + ' ' + await response.text());
  return response.json();
}

await core.connect();
try {
  const [sections,grades,courses,schedules,targets] = await Promise.all([
    readTable('academic_sections'),
    readTable('academic_grades'),
    readTable('academic_courses'),
    readTable('recess_schedules'),
    readTable('recess_schedule_targets')
  ]);

  await core.query('BEGIN');
  const sectionMap = new Map();
  const gradeMap = new Map();
  const courseMap = new Map();

  for (const section of sections) {
    const result = await core.query('SELECT id FROM quickbite.academic_sections WHERE name=$1',[section.name]);
    if (!result.rows[0]) throw new Error('Core section not found: ' + section.name);
    sectionMap.set(String(section.id),result.rows[0].id);
  }

  for (const grade of grades) {
    const sectionCore = sectionMap.get(String(grade.section_id));
    const result = await core.query('SELECT id FROM quickbite.academic_grades WHERE section_id=$1 AND name=$2',[sectionCore,grade.name]);
    if (!result.rows[0]) throw new Error('Core grade not found: ' + grade.name);
    gradeMap.set(String(grade.id),result.rows[0].id);
  }

  for (const course of courses) {
    const gradeCore = gradeMap.get(String(course.grade_id));
    const result = await core.query('SELECT id FROM quickbite.academic_courses WHERE grade_id=$1 AND name=$2',[gradeCore,course.name]);
    if (!result.rows[0]) throw new Error('Core course not found: ' + course.name);
    courseMap.set(String(course.id),result.rows[0].id);
  }

  const coreScheduleIds = new Map();
  for (const schedule of schedules) {
    const existing = await core.query('SELECT id FROM quickbite.recess_schedules WHERE name=$1 AND weekday=$2 AND start_time=$3 AND end_time=$4 LIMIT 1',[schedule.name,schedule.weekday,schedule.start_time,schedule.end_time]);
    const result = existing.rows[0] ? existing : await core.query(
      'INSERT INTO quickbite.recess_schedules(name,weekday,start_time,end_time,active,priority,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [schedule.name,schedule.weekday,schedule.start_time,schedule.end_time,schedule.active,schedule.priority ?? 0,schedule.notes ?? null]
    );
    coreScheduleIds.set(String(schedule.id),result.rows[0].id);
  }

  for (const target of targets) {
    const scheduleId = coreScheduleIds.get(String(target.recess_schedule_id));
    if (!scheduleId) continue;
    const sectionId = target.section_id ? sectionMap.get(String(target.section_id)) : null;
    const gradeId = target.grade_id ? gradeMap.get(String(target.grade_id)) : null;
    const courseId = target.course_id ? courseMap.get(String(target.course_id)) : null;
    if (!sectionId && !gradeId && !courseId) continue;
    const exists = await core.query('SELECT id FROM quickbite.recess_schedule_targets WHERE recess_schedule_id=$1 AND section_id IS NOT DISTINCT FROM $2 AND grade_id IS NOT DISTINCT FROM $3 AND course_id IS NOT DISTINCT FROM $4 LIMIT 1',[scheduleId,sectionId,gradeId,courseId]);
    if (!exists.rows[0]) await core.query(
      'INSERT INTO quickbite.recess_schedule_targets(recess_schedule_id,section_id,grade_id,course_id) VALUES($1,$2,$3,$4)',
      [scheduleId,sectionId,gradeId,courseId]
    );
  }

  await core.query('COMMIT');
  console.log('Recess schedules imported into QuickBite Core. Source remains untouched.');
} catch (error) {
  await core.query('ROLLBACK');
  throw error;
} finally {
  await core.end();
}
