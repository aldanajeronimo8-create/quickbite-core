import { ArrowLeft, ClipboardList, QrCode, RefreshCw, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';

export function StaffFeatureCenter() {
  const user = useAuthStore((state) => state.user);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link to="/staff" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Volver a Staff
          </Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-blue-700">QuickBite Staff</p>
          <h1 className="mt-1 text-3xl font-black">Centro de funciones</h1>
          <p className="mt-2 text-sm text-slate-600">
            Herramientas de operación diaria para {user?.full_name ?? 'personal autorizado'}.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Funciones de Staff">
          <Link to="/staff/orders" className={card}>
            <ClipboardList className="h-6 w-6 text-blue-700" />
            <h2 className="mt-4 font-black">Pedidos</h2>
            <p className="mt-1 text-sm text-slate-600">Consultar la cola de pedidos y atender la operación de cafetería.</p>
          </Link>
          <Link to="/staff/orders" className={card}>
            <QrCode className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 font-black">Verificación de recogidas</h2>
            <p className="mt-1 text-sm text-slate-600">Acceder a los pedidos y comprobar el código de recogida.</p>
          </Link>
          <button type="button" onClick={() => window.location.reload()} className={card + ' text-left'}>
            <RefreshCw className="h-6 w-6 text-violet-700" />
            <h2 className="mt-4 font-black">Actualizar operación</h2>
            <p className="mt-1 text-sm text-slate-600">Recargar la información operativa actual desde QuickBite Core.</p>
          </button>
          <Link to="/staff" className={card}>
            <UserCircle className="h-6 w-6 text-slate-700" />
            <h2 className="mt-4 font-black">Mi espacio Staff</h2>
            <p className="mt-1 text-sm text-slate-600">Volver al panel operativo de tu cuenta.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
