import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, LogOut, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { quickbiteApi, type MenuItem, type ApiOrder } from '../../../services/api/quickbiteApi';
import { useAuthStore } from '../../../store/authStore';
import { useVisualTheme } from '../../contexts/VisualThemeProvider';

type CartLine = { item: MenuItem; quantity: number };

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export function CoreStudentMenuPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { resolvedThemeMode } = useVisualTheme();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [recess, setRecess] = useState<{ allowed: boolean; reason: string; schedule: { name: string; start_time: string; end_time: string } | null } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [menuResult, orderResult, recessResult] = await Promise.all([quickbiteApi().menu(), quickbiteApi().orders(), quickbiteApi().recessStatus()]);
      setMenu(menuResult.items);
      setOrders(orderResult.items);
      setRecess(recessResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar QuickBite.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const total = useMemo(() => cart.reduce((sum, line) => sum + Number(line.item.price) * line.quantity, 0), [cart]);

  const add = (item: MenuItem) => {
    setCart((current) => {
      const found = current.find((line) => line.item.id === item.id);
      if (found) return current.map((line) => line.item.id === item.id ? { ...line, quantity: Math.min(line.quantity + 1, Number(item.stock)) } : line);
      return [...current, { item, quantity: 1 }];
    });
  };
  const change = (id: string, delta: number) => setCart((current) => current.map((line) => line.item.id === id ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0));

  const checkout = async () => {
    if (!cart.length || ordering) return;
    setOrdering(true);
    try {
      const result = await quickbiteApi().createOrder(cart.map((line) => ({ productId: line.item.id, quantity: line.quantity })), 'cash', crypto.randomUUID());
      setOrders((current) => [result.order, ...current]);
      setCart([]);
      toast.success('Pedido creado', { description: `Código de recogida: ${result.order.pickup_code}` });
      void load();
    } catch (error) {
      const message = error instanceof Error && error.message === 'outside_recess_window' ? 'Los pedidos para estudiantes están habilitados durante el horario de descanso asignado.' : (error instanceof Error ? error.message : 'No se pudo crear el pedido.');
      toast.error(message);
    } finally { setOrdering(false); }
  };

  return (
    <main className="min-h-screen bg-[var(--qb-bg,#f6f8fc)] text-[var(--qb-text,#172033)]">
      <header className="border-b bg-[var(--qb-surface,#fff)] px-4 py-4 shadow-sm sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--qb-primary,#1747B8)]">QuickBite</p><h1 className="text-2xl font-black">Portal estudiante</h1><p className="text-sm opacity-70">{user?.full_name}{user?.course ? ` · ${user.course}` : ''}</p></div>
          <div className="flex items-center gap-2"><Link to="/choose-role" className="rounded-xl border px-4 py-2 text-sm font-bold">Cambiar espacio</Link><button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"><LogOut className="h-4 w-4" />Salir</button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px] sm:px-6 lg:px-10">
        <section>
          <div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold text-emerald-600">Conexión Core API</p><h2 className="text-3xl font-black">Menú disponible</h2></div><span className="rounded-full border px-3 py-1 text-xs font-bold">{resolvedThemeMode === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span></div>{recess && <div className={"mb-5 rounded-2xl border p-4 text-sm " + (recess.allowed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}><p className="font-black">{recess.allowed ? "Horario de descanso habilitado" : "Fuera del horario de descanso"}</p><p className="mt-1 text-slate-600">{recess.schedule ? `${recess.schedule.name} · ${recess.schedule.start_time.slice(0,5)} – ${recess.schedule.end_time.slice(0,5)}` : "El colegio aún no ha configurado un horario para hoy."}</p></div>}
          {loading ? <div className="rounded-2xl border bg-white p-8">Cargando menú...</div> : menu.length === 0 ? <div className="rounded-2xl border bg-white p-8">No hay productos disponibles.</div> : <div className="grid gap-4 sm:grid-cols-2">{menu.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.description || 'Disponible en cafetería.'}</p></div><span className="font-black text-emerald-700">{money(Number(item.price))}</span></div><div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-500">Stock: {item.stock}</span><button type="button" onClick={() => add(item)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40" disabled={item.stock <= 0}>Agregar</button></div></article>)}</div>}
        </section>
        <aside className="space-y-5">
          <section className="sticky top-5 rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /><h2 className="text-xl font-black">Tu pedido</h2></div>{cart.length===0?<p className="mt-4 text-sm text-slate-500">Agrega productos para preparar tu pedido.</p>:<><div className="mt-4 space-y-3">{cart.map((line)=><div key={line.item.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{line.item.name}</p><p className="text-xs text-slate-500">{money(Number(line.item.price))}</p></div><div className="flex items-center gap-2"><button type="button" onClick={()=>change(line.item.id,-1)} className="rounded-lg border p-1"><Minus className="h-3.5 w-3.5"/></button><span className="w-5 text-center text-sm font-black">{line.quantity}</span><button type="button" onClick={()=>change(line.item.id,1)} className="rounded-lg border p-1" disabled={line.quantity>=Number(line.item.stock)}><Plus className="h-3.5 w-3.5"/></button></div></div>)}</div><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="font-bold">Total</span><span className="text-xl font-black">{money(total)}</span></div><button type="button" onClick={()=>void checkout()} disabled={ordering} className="mt-4 w-full rounded-xl bg-[var(--qb-primary,#1747B8)] px-4 py-3 font-black text-white disabled:opacity-50">{ordering?'Creando pedido...':'Confirmar pedido'}</button></>}</section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5"/><h2 className="text-xl font-black">Historial</h2></div><div className="mt-4 space-y-3">{orders.slice(0,8).map(order=><div key={order.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><span className="font-black">#{order.pickup_code}</span><span className="text-xs font-bold capitalize">{order.status}</span></div><div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-3.5 w-3.5"/> {money(Number(order.total))}</div></div>)}{!orders.length&&<p className="text-sm text-slate-500">Todavía no tienes pedidos.</p>}</div></section>
        </aside>
      </div>
    </main>
  );
}
