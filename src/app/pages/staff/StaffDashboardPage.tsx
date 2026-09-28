import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

export function StaffDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold text-blue-700">QuickBite Staff</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Operaciones de cafetería</h1>
          <p className="mt-2 text-sm text-slate-600">Sesión operativa de {user?.full_name ?? 'personal autorizado'}.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2" aria-label="Operaciones disponibles">
          <Link to="/staff/orders" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <ClipboardList className="h-7 w-7 text-blue-700" />
            <h2 className="mt-4 text-lg font-black">Pedidos</h2>
            <p className="mt-1 text-sm text-slate-600">Consulta los pedidos que requieren atención operativa.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
