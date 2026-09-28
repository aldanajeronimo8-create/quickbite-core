import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, LogOut, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { quickbiteApi } from '../../../services/api/quickbiteApi';
import { useAuthStore } from '../../../store/authStore';

type Scope='section'|'grade'|'course';
type Section={id:string;name:string;display_order:number};
type Grade={id:string;section_id:string;name:string;display_order:number};
type Course={id:string;grade_id:string;name:string;display_order:number};
type Schedule={id:string;name:string;weekday:number;start_time:string;end_time:string;active:boolean;notes:string|null};
type Target={id:string;recess_schedule_id:string;section_id:string|null;grade_id:string|null;course_id:string|null};
const weekdays=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export function CoreAdminRecessSchedulesPage(){
 const signOut=useAuthStore(s=>s.signOut);
 const [sections,setSections]=useState<Section[]>([]); const [grades,setGrades]=useState<Grade[]>([]); const [courses,setCourses]=useState<Course[]>([]); const [schedules,setSchedules]=useState<Schedule[]>([]); const [targets,setTargets]=useState<Target[]>([]);
 const [scope,setScope]=useState<Scope>('section'); const [sectionId,setSectionId]=useState(''); const [gradeId,setGradeId]=useState(''); const [courseId,setCourseId]=useState('');
 const [name,setName]=useState(''); const [weekday,setWeekday]=useState(1); const [startTime,setStartTime]=useState('09:30'); const [endTime,setEndTime]=useState('09:50'); const [notes,setNotes]=useState(''); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);

 const load=async()=>{setLoading(true);try{const data=await quickbiteApi().adminRecessSchedules();setSections(data.sections);setGrades(data.grades);setCourses(data.courses);setSchedules(data.schedules);setTargets(data.targets);if(!sectionId&&data.sections[0])setSectionId(data.sections[0].id);}catch(e){toast.error(e instanceof Error?e.message:'No se pudieron cargar los horarios.');}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
 const availableGrades=useMemo(()=>grades.filter(g=>g.section_id===sectionId),[grades,sectionId]);
 const availableCourses=useMemo(()=>courses.filter(c=>c.grade_id===gradeId),[courses,gradeId]);
 useEffect(()=>{if(!availableGrades.some(g=>g.id===gradeId))setGradeId(availableGrades[0]?.id??'');},[availableGrades,gradeId]);
 useEffect(()=>{if(!availableCourses.some(c=>c.id===courseId))setCourseId(availableCourses[0]?.id??'');},[availableCourses,courseId]);

 const labelTarget=(target:Target)=>{if(target.course_id){const c=courses.find(x=>x.id===target.course_id);const g=c&&grades.find(x=>x.id===c.grade_id);const s=g&&sections.find(x=>x.id===g.section_id);return `${s?.name??''} · ${g?.name??''}${c?.name??''}`;}if(target.grade_id){const g=grades.find(x=>x.id===target.grade_id);const s=g&&sections.find(x=>x.id===g.section_id);return `${s?.name??''} · ${g?.name??''}`;}return sections.find(x=>x.id===target.section_id)?.name??'Sección';};

 const create=async()=>{if(!name.trim()||!sectionId){toast.error('Completa el nombre y selecciona una sección.');return;}if(scope==='grade'&&!gradeId){toast.error('Selecciona un grado.');return;}if(scope==='course'&&!courseId){toast.error('Selecciona un curso.');return;}setSaving(true);try{await quickbiteApi().createRecessSchedule({name:name.trim(),weekday,startTime,endTime,scope,sectionId:scope==='section'?sectionId:undefined,gradeId:scope==='grade'?gradeId:undefined,courseId:scope==='course'?courseId:undefined,notes:notes.trim()||null});toast.success('Receso creado en QuickBite Core.');setName('');setNotes('');await load();}catch(e){toast.error(e instanceof Error?e.message:'No se pudo crear el receso.');}finally{setSaving(false);}};
 const toggle=async(id:string)=>{try{await quickbiteApi().toggleRecessSchedule(id);await load();}catch(e){toast.error(e instanceof Error?e.message:'No se pudo actualizar el receso.');}};
 const remove=async(id:string)=>{try{await quickbiteApi().deleteRecessSchedule(id);toast.success('Receso eliminado.');await load();}catch(e){toast.error(e instanceof Error?e.message:'No se pudo eliminar el receso.');}};

 return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b bg-slate-950 px-5 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><div><a href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-blue-300"><ArrowLeft className="h-4 w-4"/>Volver</a><h1 className="mt-2 text-3xl font-black">Horarios de descanso</h1><p className="mt-1 text-sm text-blue-100/80">Configuración por sección, grado o curso. Gestionado por QuickBite Core.</p></div><button onClick={()=>void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold"><LogOut className="h-4 w-4"/>Salir</button></div></header>
 <div className="mx-auto max-w-6xl px-5 py-7">
  <section className="rounded-3xl border bg-white p-6 shadow-sm">
   <div className="flex items-center gap-3"><Clock3 className="h-6 w-6 text-blue-700"/><h2 className="text-xl font-black">Nuevo horario</h2></div>
   <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
    <label className="lg:col-span-2 text-sm font-bold">Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Receso 1" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-bold">Día<select value={weekday} onChange={e=>setWeekday(Number(e.target.value))} className="mt-1 w-full rounded-xl border px-3 py-2.5">{weekdays.map((day,index)=><option key={day} value={index}>{day}</option>)}</select></label>
    <label className="text-sm font-bold">Inicio<input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-bold">Fin<input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="text-sm font-bold">Aplicar a<select value={scope} onChange={e=>setScope(e.target.value as Scope)} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="section">Sección</option><option value="grade">Grado</option><option value="course">Curso</option></select></label>
   </div>
   <div className="mt-4 grid gap-4 md:grid-cols-3">
    <label className="text-sm font-bold">Sección<select value={sectionId} onChange={e=>setSectionId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="text-sm font-bold">Grado<select disabled={scope==='section'} value={gradeId} onChange={e=>setGradeId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-100">{availableGrades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <label className="text-sm font-bold">Curso<select disabled={scope!=='course'} value={courseId} onChange={e=>setCourseId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-100">{availableCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   </div>
   <label className="mt-4 block text-sm font-bold">Notas<span className="font-normal text-slate-400"> (opcional)</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2.5"/></label>
   <button onClick={()=>void create()} disabled={saving||loading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4"/>{saving?'Guardando...':'Agregar receso'}</button>
  </section>
  <section className="mt-6 space-y-3">{schedules.map(schedule=>{const scheduleTargets=targets.filter(t=>t.recess_schedule_id===schedule.id);return <article key={schedule.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{weekdays[schedule.weekday]}</span><h3 className="font-black">{schedule.name}</h3><span className="text-sm text-slate-500">{schedule.start_time.slice(0,5)} – {schedule.end_time.slice(0,5)}</span>{!schedule.active&&<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Inactivo</span>}</div><div className="mt-3 flex flex-wrap gap-2">{scheduleTargets.map(target=><span key={target.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{labelTarget(target)}</span>)}</div>{schedule.notes&&<p className="mt-2 text-xs text-slate-500">{schedule.notes}</p>}</div><div className="flex items-center gap-2"><button onClick={()=>void toggle(schedule.id)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black"><Power className="h-4 w-4"/>{schedule.active?'Desactivar':'Activar'}</button><button onClick={()=>void remove(schedule.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600"><Trash2 className="h-4 w-4"/>Eliminar</button></div></div></article>})}{!loading&&!schedules.length&&<div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">Todavía no hay horarios configurados.</div>}</section>
  <div className="mt-6 flex justify-end"><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"><RefreshCw className={loading?'h-4 w-4 animate-spin':'h-4 w-4'}/>Actualizar</button></div>
 </div></main>;
}
