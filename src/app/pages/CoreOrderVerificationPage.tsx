import { useEffect,useState } from 'react';
import { CheckCircle2,Clock3,PackageCheck,XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { quickbiteApi,type ApiOrder } from '../services/api/quickbiteApi';

export default function CoreOrderVerificationPage(){
 const [params]=useSearchParams();const [order,setOrder]=useState<ApiOrder|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{const code=params.get('code')||'';if(!code){setError('Código de recogida no proporcionado.');setLoading(false);return}void quickbiteApi().verifyPublicOrder(code).then(r=>setOrder(r.order)).catch(e=>setError(e instanceof Error?e.message:'Código no encontrado.')).finally(()=>setLoading(false))},[params]);
 if(loading)return <main className="grid min-h-screen place-items-center bg-slate-50"><Clock3 className="h-8 w-8 animate-pulse text-slate-500"/></main>;
 if(error||!order)return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border bg-white p-8 text-center shadow-xl"><XCircle className="mx-auto h-12 w-12 text-rose-600"/><h1 className="mt-4 text-2xl font-black">Código no válido</h1><p className="mt-2 text-sm text-slate-600">{error}</p></section></main>;
 return <main className="min-h-screen bg-slate-50 p-6"><section className="mx-auto max-w-lg rounded-3xl border bg-white p-7 shadow-xl"><CheckCircle2 className="h-10 w-10 text-emerald-600"/><h1 className="mt-3 text-2xl font-black">Pedido #{order.order_number??order.pickup_code}</h1><div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Estado</p><p className="font-black">{order.status}</p><p className="mt-2 text-sm text-slate-500">Pago</p><p className="font-black">{order.payment_status}</p></div><div className="mt-5 space-y-2">{(order.order_items??[]).map(i=><div key={i.id} className="flex justify-between rounded-xl border px-3 py-2 text-sm"><span>{i.quantity} × Producto</span><span className="font-bold">{'$'+Number(i.price).toLocaleString('es-CO')}</span></div>)}</div><div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4"><PackageCheck className="h-5 w-5 text-emerald-600"/><span className="text-sm font-bold">Código de recogida verificado.</span></div></section></main>;
}
