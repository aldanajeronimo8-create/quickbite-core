import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { quickbiteApi, type ApiOrder } from '../../../services/api/quickbiteApi';

export function StaffOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await quickbiteApi().orders();
      setOrders(result.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link to="/staff" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft className="h-4 w-4" />Volver a operaciones</Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Pedidos operativos</h1>
            <p className="mt-1 text-sm text-slate-600">Esta vista usa exclusivamente QuickBite Core API.</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
          </button>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_.7fr_.8fr_1fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>Pedido</span><span>Estado</span><span>Total</span><span>Creado</span>
          </div>
          {loading ? <p className="p-6 text-sm text-slate-500">Cargando pedidos...</p> : orders.length === 0 ? <p className="p-6 text-sm text-slate-500">No hay pedidos disponibles.</p> : orders.map((order) => (
            <div key={order.id} className="grid grid-cols-[1.2fr_.7fr_.8fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0">
              <div><p className="font-black">#{order.id.slice(0, 8)}</p><p className="text-xs text-slate-500">Código {order.pickup_code}</p></div>
              <span className="font-bold capitalize">{order.status}</span>
              <span className="font-bold">${order.total.toLocaleString('es-CO')}</span>
              <span className="text-slate-600">{new Date(order.created_at).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
