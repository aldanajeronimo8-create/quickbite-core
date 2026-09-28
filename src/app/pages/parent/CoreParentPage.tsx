import { useEffect, useState } from 'react';
import { LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';
import { quickbiteApi } from '../../../services/api/quickbiteApi';
import { useAuthStore } from '../../../store/authStore';

export function CoreParentPage() {
  const user=useAuthStore((state)=>state.user);
  const signOut=useAuthStore((state)=>state.signOut);
  const [children,setChildren]=useState<Array<{id:string;email:string;full_name:string;status:string;created_at:string;section:string|null;grade:string|null;course:string|null}>>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void quickbiteApi().familyChildren().then((result)=>setChildren(result.items)).catch((error)=>toast.error(error instanceof Error?error.message:'No se pudieron cargar los estudiantes.')).finally(()=>setLoading(false));},[]);
  return <main className="min-h-screen bg-[var(--qb-bg,#f6f8fc)] p-5 text-[var(--qb-text,#172033)] sm:p-8"><div className="mx-auto max-w-5xl"><header className="mb-8 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">QuickBite Family</p><h1 className="mt-1 text-3xl font-black">Cuenta de padre de familia</h1><p className="mt-2 text-sm text-slate-500">{user?.full_name}</p></div><button onClick={()=>void signOut()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"><LogOut className="h-4 w-4"/>Salir</button></header><section className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Users className="h-6 w-6 text-blue-600"/><div><h2 className="text-xl font-black">Estudiantes vinculados</h2><p className="text-sm text-slate-500">Información obtenida desde QuickBite Core API.</p></div></div>{loading?<p className="mt-6 text-sm text-slate-500">Cargando...</p>:children.length===0?<p className="mt-6 rounded-xl border border-dashed p-5 text-sm text-slate-500">No hay estudiantes vinculados todavía.</p>:<div className="mt-6 grid gap-3 md:grid-cols-2">{children.map((child)=><article key={child.id} className="rounded-xl border p-4"><p className="font-black">{child.full_name}{child.course ? ` · ${child.course}` : ''}</p><p className="mt-1 text-sm text-slate-500">{child.email}{child.section ? ` · ${child.section}` : ''}</p><span className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{child.status}</span></article>)}</div>}</section></div></main>;
}
