import { useState } from 'react';
import { GraduationCap, Loader2, LogOut, ShieldCheck, Store, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';

type Role = 'student' | 'parent' | 'staff' | 'admin';

const ROLE_OPTIONS: Array<{ role: Role; label: string; area: string; icon: typeof GraduationCap; path: string }> = [
  { role: 'student', label: 'Estudiante', area: 'Menú y pedidos', icon: GraduationCap, path: '/menu' },
  { role: 'parent', label: 'Padre de familia', area: 'Portal familiar', icon: Users, path: '/parent/family' },
  { role: 'staff', label: 'Personal de cafetería', area: 'Operación de cafetería', icon: Store, path: '/staff' },
  { role: 'admin', label: 'Administración', area: 'Panel administrativo', icon: ShieldCheck, path: '/admin' },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const switchRole = useAuthStore((state) => state.switchRole);
  const [loading, setLoading] = useState<Role | null>(null);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const roles = Array.from(new Set(user.protected
    ? ROLE_OPTIONS.map((option) => option.role)
    : (user.roles ?? [user.role])));
  const available = ROLE_OPTIONS.filter((option) => roles.includes(option.role));

  const choose = async (role: Role, path: string) => {
    if (loading) return;
    setLoading(role);
    try {
      await switchRole(role);
      navigate(path);
      toast.success(`Entorno de ${ROLE_OPTIONS.find((option) => option.role === role)?.label.toLowerCase() ?? role} activado.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar de entorno.';
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const logout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <main className="qb-auth qb-auth--private min-h-screen flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="qb-auth-brand mb-7 text-center">
          <span className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl border shadow-sm">
            <ShieldCheck className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="qb-auth-brand-title text-3xl font-bold tracking-tight">QuickBite</h1>
          <p className="qb-auth-brand-subtitle mt-1 text-sm">Selecciona tu espacio</p>
        </div>
        <section className="qb-auth-card rounded-3xl p-7 shadow-2xl">
          <h2 className="text-xl font-bold">Tus credenciales ya fueron verificadas</h2>
          <p className="mt-1 text-sm">Elige el entorno que deseas utilizar. Puedes volver a esta pantalla para cambiar de espacio sin cerrar sesión.</p>
          <div className="mt-5 grid gap-3">
            {available.map(({ role, label, area, icon: Icon, path }) => (
              <button key={role} type="button" onClick={() => void choose(role, path)} disabled={loading !== null} className="flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:shadow-md disabled:opacity-50">
                {loading === role ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Icon className="h-5 w-5 shrink-0" />}
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-slate-500">{area}</span>
                </span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void logout()} disabled={loading !== null} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </section>
      </div>
    </main>
  );
}
