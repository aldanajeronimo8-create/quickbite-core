import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Edit3, GraduationCap, LogOut, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { quickbiteApi } from '../../../services/api/quickbiteApi';
import { useAuthStore } from '../../../store/authStore';

type Section={id:string;name:string;display_order:number;active:boolean};
type Grade={id:string;section_id:string;name:string;display_order:number;active:boolean};
type Course={id:string;grade_id:string;name:string;display_order:number;active:boolean};
type Level='section'|'grade'|'course';

const roleError=(message:string)=>({
  academic_entity_in_use:'Este elemento tiene información asociada. Desactívalo en lugar de eliminarlo.',
  academic_name_already_exists:'Ya existe un elemento con ese nombre en este nivel.',
}[message]??message);

export function CoreAdminAcademicPage(){
 const signOut=useAuthStore(s=>s.signOut);
 const [sections,setSections]=useState<Section[]>([]); const [grades,setGrades]=useState<Grade[]>([]); const [courses,setCourses]=useState<Course[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
 const [editing,setEditing]=useState<{id:string;level:Level;name:string;displayOrder:number;active:boolean;parentId:string}>({id:'',level:'section',name:'',displayOrder:1,active:true,parentId:''}); const [showEditor,setShowEditor]=useState(false);

 const load=async()=>{setLoading(true);try{const data=await quickbiteApi().adminAcademicStructure();setSections(data.sections);setGrades(data.grades);setCourses(data.courses);}catch(e){toast.error(e instanceof Error?e.message:'No se pudo cargar la estructura académica.');}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);


 const openNew=(target:Level,parentId='')=>{setEditing({id:'',level:target,name:'',displayOrder:1,active:true,parentId});setShowEditor(true);};
 const openEdit=(item:Section|Grade|Course,target:Level,parentId='')=>{setEditing({id:item.id,level:target,name:item.name,displayOrder:item.display_order,active:item.active,parentId});setShowEditor(true);};

 const save=async()=>{if(!editing.name.trim()||saving)return;setSaving(true);try{
   if(editing.level==='section'){
     if(editing.id) await quickbiteApi().updateAcademicSection(editing.id,{name:editing.name.trim(),displayOrder:editing.displayOrder,active:editing.active});
     else await quickbiteApi().createAcademicSection({name:editing.name.trim(),displayOrder:editing.displayOrder});
   } else if(editing.level==='grade'){
     if(!editing.parentId) throw new Error('Selecciona una sección.');
     if(editing.id) await quickbiteApi().updateAcademicGrade(editing.id,{sectionId:editing.parentId,name:editing.name.trim(),displayOrder:editing.displayOrder,active:editing.active});
     else await quickbiteApi().createAcademicGrade({sectionId:editing.parentId,name:editing.name.trim(),displayOrder:editing.displayOrder});
   } else {
     if(!editing.parentId) throw new Error('Selecciona un grado.');
     const normalized=editing.name.trim().toUpperCase();
     if(!['A','B','C','D','E'].includes(normalized)) throw new Error('Los cursos permitidos son A, B, C, D y E.');
     if(editing.id) await quickbiteApi().updateAcademicCourse(editing.id,{gradeId:editing.parentId,name:normalized,displayOrder:editing.displayOrder,active:editing.active});
     else await quickbiteApi().createAcademicCourse({gradeId:editing.parentId,name:normalized,displayOrder:editing.displayOrder});
   }
   toast.success(editing.id?'Cambios guardados.':'Elemento creado.');setShowEditor(false);await load();
 }catch(e){toast.error(roleError(e instanceof Error?e.message:'No se pudo guardar.'));}finally{setSaving(false);}};

 const toggle=async(level:Level,id:string,item:Section|Grade|Course)=>{try{
   if(level==='section') await quickbiteApi().updateAcademicSection(id,{name:item.name,displayOrder:item.display_order,active:!item.active});
   else if(level==='grade') await quickbiteApi().updateAcademicGrade(id,{sectionId:(item as Grade).section_id,name:item.name,displayOrder:item.display_order,active:!item.active});
   else await quickbiteApi().updateAcademicCourse(id,{gradeId:(item as Course).grade_id,name:item.name,displayOrder:item.display_order,active:!item.active});
   await load();
 }catch(e){toast.error(roleError(e instanceof Error?e.message:'No se pudo cambiar el estado.'));}};

 const remove=async(level:Level,id:string)=>{try{
   if(level==='section')await quickbiteApi().deleteAcademicSection(id);
   else if(level==='grade')await quickbiteApi().deleteAcademicGrade(id);
   else await quickbiteApi().deleteAcademicCourse(id);
   toast.success('Elemento eliminado.');await load();
 }catch(e){toast.error(roleError(e instanceof Error?e.message:'No se pudo eliminar.'));}};

 return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b bg-slate-950 px-5 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><div><a href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-blue-300"><ArrowLeft className="h-4 w-4"/>Volver</a><h1 className="mt-2 text-3xl font-black">Estructura académica</h1><p className="mt-1 text-sm text-blue-100/80">Administra secciones, grados y cursos directamente desde QuickBite Core.</p></div><button onClick={()=>void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold"><LogOut className="h-4 w-4"/>Salir</button></div></header>
 <div className="mx-auto max-w-6xl px-5 py-7">
  <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><GraduationCap className="h-6 w-6 text-blue-700"/><h2 className="text-xl font-black">Estructura del colegio</h2></div><p className="mt-2 text-sm text-slate-500">Puedes aumentar, editar o disminuir elementos. Para elementos usados por estudiantes o descansos, QuickBite conserva el registro y recomienda desactivarlos.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"><RefreshCw className={loading?'h-4 w-4 animate-spin':'h-4 w-4'}/>Actualizar</button></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-3">
      <section className="rounded-2xl border p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Nivel 1</p><h3 className="text-lg font-black">Secciones</h3></div><button onClick={()=>openNew('section')} className="rounded-xl bg-blue-700 p-2 text-white" title="Añadir sección"><Plus className="h-4 w-4"/></button></div><div className="mt-4 space-y-2">{sections.map(item=><div key={item.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><div><p className="font-black">{item.name}</p><p className="text-xs text-slate-500">{item.active?'Activa':'Inactiva'}</p></div><div className="flex gap-1"><button onClick={()=>openEdit(item,'section')} className="rounded-lg border p-2" title="Editar"><Edit3 className="h-3.5 w-3.5"/></button><button onClick={()=>void toggle('section',item.id,item)} className="rounded-lg border p-2" title={item.active?'Desactivar':'Activar'}><Power className="h-3.5 w-3.5"/></button><button onClick={()=>void remove('section',item.id)} className="rounded-lg border p-2 text-red-600" title="Eliminar"><Trash2 className="h-3.5 w-3.5"/></button></div></div><button onClick={()=>openNew('grade',item.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700"><Plus className="h-3.5 w-3.5"/>Añadir grado</button></div>)}</div></section>
      <section className="rounded-2xl border p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Nivel 2</p><h3 className="text-lg font-black">Grados</h3></div></div><div className="mt-4 space-y-2">{grades.map(item=><div key={item.id} className="rounded-xl border p-3"><p className="text-xs text-slate-500">{sections.find(s=>s.id===item.section_id)?.name??'Sin sección'}</p><div className="mt-1 flex items-center justify-between gap-2"><p className="font-black">{item.name}</p><div className="flex gap-1"><button onClick={()=>openEdit(item,'grade',item.section_id)} className="rounded-lg border p-2"><Edit3 className="h-3.5 w-3.5"/></button><button onClick={()=>void toggle('grade',item.id,item)} className="rounded-lg border p-2"><Power className="h-3.5 w-3.5"/></button><button onClick={()=>void remove('grade',item.id)} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-3.5 w-3.5"/></button></div></div><button onClick={()=>openNew('course',item.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700"><Plus className="h-3.5 w-3.5"/>Añadir curso</button></div>)}</div></section>
      <section className="rounded-2xl border p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Nivel 3</p><h3 className="text-lg font-black">Cursos</h3></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{courses.map(item=><div key={item.id} className="rounded-xl border p-3"><p className="text-xs text-slate-500">{grades.find(g=>g.id===item.grade_id)?.name??'—'}</p><p className="mt-1 text-lg font-black">{item.name}</p><p className="text-xs text-slate-500">{item.active?'Activo':'Inactivo'}</p><div className="mt-2 flex gap-1"><button onClick={()=>openEdit(item,'course',item.grade_id)} className="rounded-lg border p-2"><Edit3 className="h-3.5 w-3.5"/></button><button onClick={()=>void toggle('course',item.id,item)} className="rounded-lg border p-2"><Power className="h-3.5 w-3.5"/></button><button onClick={()=>void remove('course',item.id)} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-3.5 w-3.5"/></button></div></div>)}</div></section>
    </div>
  </section>
  {showEditor&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black">{editing.id?'Editar':'Añadir'} {editing.level==='section'?'sección':editing.level==='grade'?'grado':'curso'}</h2><div className="mt-5 space-y-4">
    {editing.level!=='section'&&<label className="block text-sm font-bold">{editing.level==='grade'?'Sección':'Grado'}<select value={editing.parentId} onChange={e=>setEditing(x=>({...x,parentId:e.target.value}))} className="mt-1 w-full rounded-xl border px-3 py-2.5">{editing.level==='grade'?sections.map(x=><option key={x.id} value={x.id}>{x.name}{x.active?'':' (inactiva)'}</option>):grades.filter(x=>x.active||x.id===editing.parentId).map(x=><option key={x.id} value={x.id}>{x.name}{x.active?'':' (inactivo)'}</option>)}</select></label>}
    <label className="block text-sm font-bold">{editing.level==='section'?'Nombre de sección':editing.level==='grade'?'Nombre del grado':'Curso'}<input value={editing.name} onChange={e=>setEditing(x=>({...x,name:e.target.value}))} placeholder={editing.level==='section'?'Sección 5':editing.level==='grade'?'12°':'A'} className="mt-1 w-full rounded-xl border px-3 py-2.5"/>{editing.level==='course'&&<span className="mt-1 block text-xs font-normal text-slate-500">Solo A, B, C, D o E.</span>}</label>
    <label className="block text-sm font-bold">Orden<input type="number" min="0" value={editing.displayOrder} onChange={e=>setEditing(x=>({...x,displayOrder:Number(e.target.value)}))} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
    {editing.id&&<label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={editing.active} onChange={e=>setEditing(x=>({...x,active:e.target.checked}))}/>{editing.active?'Activo':'Inactivo'}</label>}
    <div className="flex justify-end gap-2"><button onClick={()=>setShowEditor(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">Cancelar</button><button onClick={()=>void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>{saving?'Guardando...':'Guardar'}</button></div>
  </div></div></div>}
 </div></main>;
}
