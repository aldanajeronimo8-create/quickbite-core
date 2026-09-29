import { useCallback,useEffect,useState } from 'react';
import { AlertCircle,CheckCircle2,Clock3,RefreshCw } from 'lucide-react';
import { quickbiteApi } from '../../../services/api/quickbiteApi';

export function StudentRecessStatus(){
 const [data,setData]=useState<{allowed:boolean;reason:string;schedule:{id:string;name:string;start_time:string;end_time:string}|null}|null>(null);
 const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);
 const load=useCallback(async(manual=false)=>{if(manual)setRefreshing(true);try{setData(await quickbiteApi().recessStatus())}catch{setData(null)}finally{setLoading(false);setRefreshing(false)}},[]);
 useEffect(()=>{void load();const t=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(t)},[load]);
 if(loading)return <div className="qb-surface rounded-2xl border qb-border p-4 text-sm qb-text-secondary">Comprobando horario...</div>;
 if(!data)return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">No se pudo consultar el estado del recreo.</div>;
 const scheduleText=data.schedule?' · '+data.schedule.name+' '+data.schedule.start_time.slice(0,5)+'–'+data.schedule.end_time.slice(0,5):'';
 return <div className="qb-surface rounded-2xl border qb-border p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3">{data.allowed?<CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500"/>:<AlertCircle className="mt-0.5 h-5 w-5 text-amber-500"/>}<div><p className="qb-text font-black">{data.allowed?'Horario habilitado':'Horario no habilitado'}</p><p className="qb-text-secondary mt-1 text-sm">{data.reason}{scheduleText}</p></div></div><button type="button" aria-label="Actualizar horario" onClick={()=>void load(true)} disabled={refreshing} className="rounded-xl border qb-border px-3 py-2 text-xs font-black"><RefreshCw className={refreshing?'h-4 w-4 animate-spin':'h-4 w-4'}/></button></div><Clock3 className="sr-only"/></div>;
}
