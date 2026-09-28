import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { quickbiteApi } from '../../services/api/quickbiteApi';
import { useAuthStore } from '../../store/authStore';
import { bindStudentUser } from '../../lib/studentDeviceSession';
import { toast } from 'sonner';

export function GoogleCompletePage() {
  const navigate = useNavigate();
  useEffect(() => {
    void quickbiteApi().consumeGoogleSession().then((session) => {
      useAuthStore.getState().setUser({
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.fullName,
        role: session.user.role,
        roles: session.user.roles,
        protected: session.user.protected,
        created_at: new Date().toISOString(),
      });
      if (session.user.role === 'student') { bindStudentUser(session.user.id); navigate('/menu', { replace: true }); }
      else navigate('/parent/family', { replace: true });
    }).catch(() => {
      toast.error('No se pudo completar el acceso con Google.');
      navigate('/login', { replace: true });
    });
  }, [navigate]);
  return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-700"><div className="flex items-center gap-3 text-sm font-semibold"><Loader2 className="h-5 w-5 animate-spin" />Verificando tu cuenta…</div></main>;
}
