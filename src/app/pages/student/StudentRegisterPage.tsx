import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Eye, EyeOff, FileText, GraduationCap, Lock, ShieldCheck, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { QuickBiteLogo } from '../../components/brand/QuickBiteLogo';
import { quickbiteApi } from '../../../services/api/quickbiteApi';
import { useAuthStore } from '../../../store/authStore';
import { bindStudentUser } from '../../../lib/studentDeviceSession';

type Section={id:string;name:string;grades:Array<{id:string;name:string;courses:Array<{id:string;name:string}>}>};
const PRIVACY_VERSION='2026-09-27';

export function StudentRegisterPage(){
 const navigate=useNavigate();
 const signIn=useAuthStore(state=>state.signIn);
 const [sections,setSections]=useState<Section[]>([]);
 const [form,setForm]=useState({name:'',email:'',password:'',confirmPassword:'',documentNumber:'',sectionId:'',gradeId:'',courseId:'',guardianName:'',guardianRelationship:'',guardianEmail:''});
 const [studentAcknowledged,setStudentAcknowledged]=useState(false);
 const [guardianAuthorized,setGuardianAuthorized]=useState(false);
 const [showPassword,setShowPassword]=useState(false);
 const [showConfirm,setShowConfirm]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{let cancelled=false;(async()=>{try{const data=await quickbiteApi().academicStructure();if(!cancelled)setSections(data.sections);}catch(cause){if(!cancelled)toast.error(cause instanceof Error?cause.message:'No se pudo cargar la estructura académica.');}finally{if(!cancelled)setLoading(false);}})();return()=>{cancelled=true;};},[]);

 const section=sections.find(item=>item.id===form.sectionId);
 const grades=section?.grades??[];
 const grade=grades.find(item=>item.id===form.gradeId);
 const courses=grade?.courses??[];
 const academicLabel=grade&&form.courseId?`${grade.name}${courses.find(item=>item.id===form.courseId)?.name??''}`:'';

 useEffect(()=>{if(!grades.some(item=>item.id===form.gradeId))setForm(current=>({...current,gradeId:grades[0]?.id??'',courseId:''}));},[form.gradeId,grades]);
 useEffect(()=>{if(!courses.some(item=>item.id===form.courseId))setForm(current=>({...current,courseId:courses[0]?.id??''}));},[form.courseId,courses]);

 const update=(field:keyof typeof form,value:string)=>{setForm(current=>({...current,[field]:value}));setError('');};

 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();
  const email=form.email.trim().toLowerCase(),documentNumber=form.documentNumber.trim(),guardianEmail=form.guardianEmail.trim().toLowerCase();
  if(form.name.trim().length<3)return setError('Ingresa tu nombre completo.');
  if(!/^\S+@\S+\.\S+$/.test(email))return setError('Ingresa un correo válido.');
  if(!/^\d{6,15}$/.test(documentNumber))return setError('Ingresa un documento válido.');
  if(form.password.length<8)return setError('La contraseña debe tener mínimo 8 caracteres.');
  if(form.password!==form.confirmPassword)return setError('Las contraseñas no coinciden.');
  if(!form.sectionId||!form.gradeId||!form.courseId)return setError('Selecciona sección, grado y curso.');
  if(form.guardianName.trim().length<3||form.guardianRelationship.trim().length<2||!/^\S+@\S+\.\S+$/.test(guardianEmail))return setError('Completa correctamente los datos del representante.');
  if(!studentAcknowledged||!guardianAuthorized)return setError('Debes aceptar los avisos de privacidad y autorización.');
  setSaving(true);setError('');
  try{
   const session=await quickbiteApi().registerStudent({fullName:form.name.trim(),email,password:form.password,documentNumber,sectionId:form.sectionId,gradeId:form.gradeId,courseId:form.courseId,guardianName:form.guardianName.trim(),guardianRelationship:form.guardianRelationship.trim(),guardianEmail,studentAcknowledged,guardianAuthorized});
   await signIn(email,form.password);
   bindStudentUser(session.user.id);
   toast.success(`Cuenta creada: ${form.name.trim()} · ${academicLabel}`);
   navigate('/menu',{replace:true});
  }catch(cause){
   const raw=cause instanceof Error?cause.message:'No se pudo crear la cuenta.';
   const message=raw==='email_already_exists'?'Ese correo ya tiene una cuenta.':raw==='document_already_exists'?'Ese documento ya está asociado a una cuenta.':raw;
   setError(message);toast.error(message);
  }finally{setSaving(false);}
 };

 return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
  <div className="mx-auto max-w-2xl">
   <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft className="h-4 w-4"/>Volver al acceso</Link>
   <div className="mt-6 text-center"><QuickBiteLogo className="mx-auto h-16 w-16 rounded-3xl"/><h1 className="mt-4 text-3xl font-black">Crear cuenta de estudiante</h1><p className="mt-2 text-sm text-slate-500">Registra tu cuenta directamente en QuickBite y selecciona tu curso.</p></div>
   <form onSubmit={(event)=>void submit(event)} className="mt-7 space-y-5 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
    <section className="space-y-4 rounded-2xl border p-4"><h2 className="flex items-center gap-2 font-black"><User className="h-5 w-5 text-blue-700"/>Datos del estudiante</h2>
      <Field label="Nombre completo" value={form.name} onChange={v=>update('name',v)} placeholder="Tu nombre completo"/>
      <Field label="Correo electrónico" value={form.email} onChange={v=>update('email',v)} placeholder="tu@correo.com" type="email"/>
      <Field label="Documento" icon={<CreditCard className="h-4 w-4"/>} value={form.documentNumber} onChange={v=>update('documentNumber',v.replace(/\D/g,'').slice(0,15))} placeholder="Número de documento" inputMode="numeric"/>
      <div className="grid gap-4 sm:grid-cols-2"><PasswordField label="Contraseña" value={form.password} visible={showPassword} onToggle={()=>setShowPassword(value=>!value)} onChange={v=>update('password',v)}/><PasswordField label="Confirmar contraseña" value={form.confirmPassword} visible={showConfirm} onToggle={()=>setShowConfirm(value=>!value)} onChange={v=>update('confirmPassword',v)}/></div>
    </section>
    <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><h2 className="flex items-center gap-2 font-black"><GraduationCap className="h-5 w-5 text-blue-700"/>Estructura académica</h2>
      {loading?<p className="rounded-xl bg-white p-4 text-sm text-slate-500">Cargando opciones académicas...</p>:<>
        <SelectField label="Sección" value={form.sectionId} options={sections.map(item=>({value:item.id,label:item.name}))} onChange={v=>update('sectionId',v)}/>
        <SelectField label="Grado" value={form.gradeId} options={grades.map(item=>({value:item.id,label:item.name}))} onChange={v=>update('gradeId',v)} disabled={!form.sectionId}/>
        <SelectField label="Curso" value={form.courseId} options={courses.map(item=>({value:item.id,label:item.name}))} onChange={v=>update('courseId',v)} disabled={!form.gradeId}/>
        {academicLabel&&<p className="rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-700">Así aparecerás en QuickBite: <b>{form.name.trim()||'Tu nombre'} · {academicLabel}</b></p>}
      </>}
    </section>
    <section className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><h2 className="font-black">Representante legal o tutor</h2>
      <Field label="Nombre completo" value={form.guardianName} onChange={v=>update('guardianName',v)} placeholder="Padre, madre o tutor"/>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Relación" value={form.guardianRelationship} onChange={v=>update('guardianRelationship',v)} placeholder="Padre, madre, tutor..."/><Field label="Correo del representante" value={form.guardianEmail} onChange={v=>update('guardianEmail',v)} placeholder="correo@ejemplo.com" type="email"/></div>
    </section>
    <section className="rounded-2xl border bg-slate-50 p-4 text-sm"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"/><div><p className="font-black">Privacidad de QuickBite</p><p className="mt-1 text-xs leading-5">La cuenta usa los datos necesarios para operar QuickBite. Versión de aviso: {PRIVACY_VERSION}. <Link to="/privacy" className="font-bold text-blue-700 underline">Consultar política</Link></p></div></div><div className="mt-4 space-y-3"><label className="flex items-start gap-3"><input type="checkbox" checked={studentAcknowledged} onChange={e=>setStudentAcknowledged(e.target.checked)} className="mt-1 h-4 w-4"/><span>He leído el aviso de privacidad y comprendo el uso de mis datos.</span></label><label className="flex items-start gap-3"><input type="checkbox" checked={guardianAuthorized} onChange={e=>setGuardianAuthorized(e.target.checked)} className="mt-1 h-4 w-4"/><span>Declaro que el representante indicado autoriza el tratamiento de los datos necesarios.</span></label></div></section>
    {error&&<p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    <Button type="submit" disabled={saving||loading} className="w-full rounded-xl py-6 font-black">{saving?'Creando cuenta...':'Crear cuenta de estudiante'}</Button>
    <p className="text-center text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-blue-700 underline">Inicia sesión</Link></p>
   </form>
  </div>
 </main>;
}

function Field({label,icon,value,onChange,placeholder,type='text',inputMode}:{label:string;icon?:React.ReactNode;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;inputMode?:React.HTMLAttributes<HTMLInputElement>['inputMode']}){return <div><Label className="mb-1 block text-sm font-bold">{label}</Label><div className="relative">{icon&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}<Input type={type} inputMode={inputMode} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={icon?'pl-9':''}/></div></div>;}
function PasswordField({label,value,visible,onToggle,onChange}:{label:string;value:string;visible:boolean;onToggle:()=>void;onChange:(value:string)=>void}){return <div><Label className="mb-1 block text-sm font-bold">{label}</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><Input type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} className="pl-9 pr-10"/><button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'}>{visible?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div>;}
function SelectField({label,value,options,onChange,disabled=false}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void;disabled?:boolean}){return <div><Label className="mb-1 block text-sm font-bold">{label}</Label><select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"><option value="">Selecciona...</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;}
