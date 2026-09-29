import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { quickbiteApi, type ApiOrder } from '../../../services/api/quickbiteApi';

const statusLabel: Record<ApiOrder['status'], string> = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const nextStatus: Partial<Record<ApiOrder['status'], ApiOrder['status']>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

export function StaffOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
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

  const advance = async (order: ApiOrder) => {
    const status: ApiOrder['status'] | undefined = nextStatus[order.status];
    if (!status || busy) return;
    setBusy(order.id);
    try {
      const result = await quickbiteApi().updateOrderStatus(order.id, status);
      setOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
      toast.success(`Pedido #${order.order_number ?? order.pickup_code}: ${statusLabel[status]}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo actualizar el pedido.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/staff/features" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
              <ArrowLeft className="h-4 w-4" />Volver a funciones
            </Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Pedidos operativos</h1>
            <p className="mt-1 text-sm text-slate-600">Consulta la cola y actualiza cada pedido según avanza la operación.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/staff/verification" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm">
              Verificar recogida
            </Link>
            <button type="button" onClick={() => void loadOrders()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
            </button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_.8fr_1fr_1fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>Pedido</span><span>Estado</span><span>Total</span><span>Acción</span>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Cargando pedidos...</p>
          ) : orders.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No hay pedidos disponibles.</p>
          ) : (
            orders.map((order) => {
              const next = nextStatus[order.status];
              const actionLabel = order.status === 'pending' ? 'Empezar' : order.status === 'preparing' ? 'Marcar listo' : order.status === 'ready' ? 'Entregar' : null;
              return (
                <div key={order.id} className="grid grid-cols-[1.2fr_.8fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0">
                  <div>
                    <p className="font-black">#{order.order_number ?? order.id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-500">Código {order.pickup_code}</p>
                    <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('es-CO')}</p>
                  </div>
                  <span className="font-bold">{statusLabel[order.status]}</span>
                  <span className="font-bold">{order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {next && actionLabel && (
                      <button type="button" onClick={() => void advance(order)} disabled={busy === order.id} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                        <CheckCircle2 className="h-4 w-4" />{busy === order.id ? 'Actualizando…' : actionLabel}
                      </button>
                    )}
                    {order.status === 'delivered' && <span className="text-xs font-bold text-emerald-700">Entrega completada</span>}
                    {order.status === 'cancelled' && <span className="text-xs font-bold text-slate-500">Cancelado</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
