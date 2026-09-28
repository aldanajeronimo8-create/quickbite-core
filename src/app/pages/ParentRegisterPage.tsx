import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, FileText, IdCard, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { QuickBiteLogo } from '../components/brand/QuickBiteLogo';
import { quickbiteApi } from '../../services/api/quickbiteApi';
import { useAuthStore } from '../../store/authStore';

const PRIVACY_VERSION='2026-09-27';

export function ParentRegisterPage() {
  const navigate=useNavigate();
  const signIn=useAuthStore((state)=>state.signIn);
  const [form,setForm]=useState({fullName:'',email:'',documentNumber:'',password:'',confirmPassword:''});
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [privacyConsent,setPrivacyConsent]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const update=(field:keyof typeof form,value:string)=>{setForm(current=>({...current,[field]:value}));setError('');};

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    const email=form.email.trim().toLowerCase();
    const documentNumber=form.documentNumber.trim();
    if(form.fullName.trim().length<3){setError('Ingresa tu nombre completo.');return;}
    if(!/^\S+@\S+\.\S+$/.test(email)){setError('Ingresa un correo válido.');return;}
    if(!/^\d{6,15}$/.test(documentNumber)){setError('Ingresa un documento válido de 6 a 15 dígitos.');return;}
    if(form.password.length<8){setError('La contraseña debe tener mínimo 8 caracteres.');return;}
    if(form.password!==form.confirmPassword){setError('Las contraseñas no coinciden.');return;}
    if(!privacyConsent){setError('Debes aceptar el aviso de privacidad para crear la cuenta.');return;}
    setSaving(true);setError('');
    try{
      await quickbiteApi().registerParent({fullName:form.fullName.trim(),email,password:form.password,documentNumber,privacyConsent});
      await signIn(email,form.password,'parent');
      toast.success('Cuenta de padre de familia creada.');
      navigate('/parent/family',{replace:true});
    }catch(cause){
      const raw=cause instanceof Error?cause.message:'No se pudo crear la cuenta.';
      const message=raw==='email_already_exists'?'Ese correo ya tiene una cuenta. Inicia sesión.':raw==='document_already_exists'?'Ese documento ya está asociado a una cuenta.':raw;
      setError(message);toast.error(message);
    }finally{setSaving(false);}
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-xl">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft className="h-4 w-4"/>Volver al acceso</Link>
      <div className="mt-6 text-center"><QuickBiteLogo className="mx-auto h-16 w-16 rounded-3xl"/><h1 className="mt-4 text-3xl font-black">Crear cuenta de padre de familia</h1><p className="mt-2 text-sm text-slate-500">Crea una cuenta para acceder al portal familiar de QuickBite.</p></div>
      <form onSubmit={(event)=>void submit(event)} className="mt-7 space-y-5 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" icon={<User className="h-4 w-4"/>} value={form.fullName} onChange={v=>update('fullName',v)} placeholder="Tu nombre completo"/>
          <Field label="Documento" icon={<IdCard className="h-4 w-4"/>} value={form.documentNumber} onChange={v=>update('documentNumber',v.replace(/\D/g,'').slice(0,15))} placeholder="Número de documento" inputMode="numeric"/>
        </div>
        <Field label="Correo electrónico" icon={<Mail className="h-4 w-4"/>} value={form.email} onChange={v=>update('email',v)} placeholder="tu@correo.com" type="email"/>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Contraseña" value={form.password} visible={showPassword} onToggle={()=>setShowPassword(value=>!value)} onChange={v=>update('password',v)}/>
          <PasswordField label="Confirmar contraseña" value={form.confirmPassword} visible={showConfirm} onToggle={()=>setShowConfirm(value=>!value)} onChange={v=>update('confirmPassword',v)}/>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
          <div className="flex gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"/><div><p className="font-black">Privacidad de QuickBite</p><p className="mt-1 text-xs leading-5">Usaremos los datos necesarios para la cuenta, portal familiar, seguridad y atención de solicitudes. Versión de aviso: {PRIVACY_VERSION}.</p></div></div>
          <label className="mt-4 flex items-start gap-3"><input type="checkbox" checked={privacyConsent} onChange={e=>setPrivacyConsent(e.target.checked)} className="mt-1 h-4 w-4"/><span className="text-xs leading-5">Acepto el aviso de privacidad de QuickBite y autorizo el tratamiento de mis datos para las finalidades informadas.</span></label>
        </div>
        {error&&<p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <Button type="submit" disabled={saving} className="w-full rounded-xl py-6 font-black">{saving?<><span className="mr-2 animate-pulse">●</span>Creando cuenta...</>:<><CheckCircle2 className="mr-2 h-4 w-4"/>Crear cuenta</>}</Button>
        <p className="text-center text-sm text-slate-500">¿Ya tienes una cuenta? <Link to="/login" className="font-bold text-blue-700 underline">Inicia sesión</Link></p>
      </form>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400"><Lock className="h-3.5 w-3.5"/>Staff y Administración se habilitan por el procedimiento interno de QuickBite.</div>
    </div>
  </main>;
}
function Field({label,icon,value,onChange,placeholder,type='text',inputMode}:{label:string;icon?:React.ReactNode;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;inputMode?:React.HTMLAttributes<HTMLInputElement>['inputMode']}){return <div><Label className="mb-1 block text-sm font-bold">{label}</Label><div className="relative">{icon&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}<Input type={type} inputMode={inputMode} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={icon?'pl-9':''}/></div></div>;}
function PasswordField({label,value,visible,onToggle,onChange}:{label:string;value:string;visible:boolean;onToggle:()=>void;onChange:(value:string)=>void}){return <div><Label className="mb-1 block text-sm font-bold">{label}</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><Input type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} className="pl-9 pr-10"/><button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'}>{visible?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div>;}
