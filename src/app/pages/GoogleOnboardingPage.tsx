import { useEffect, useState } from 'react';
import { GraduationCap, Loader2, Users, FileText, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { quickbiteApi } from '../../services/api/quickbiteApi';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

type Role = 'student' | 'parent';

function destination(role: Role) {
  return role === 'student' ? '/menu' : '/parent/family';
}

export function GoogleOnboardingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [documentNumber, setDocumentNumber] = useState('');
  const [course, setCourse] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void quickbiteApi().googleOnboarding().then((data) => {
      setEmail(data.email);
      setFullName(data.fullName);
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'La autorización de Google expiró.');
      navigate('/login', { replace: true });
    }).finally(() => setLoading(false));
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (documentNumber.trim().length < 5) { toast.error('Ingresa el documento de identidad.'); return; }
    if (role === 'student' && course.trim().length < 2) { toast.error('Ingresa tu curso.'); return; }
    if (!privacyConsent) { toast.error('Debes leer y aceptar el tratamiento informado para continuar.'); return; }
    setSaving(true);
    try {
      const session = await quickbiteApi().completeGoogleOnboarding({
        role,
        documentNumber: documentNumber.trim(),
        course: role === 'student' ? course.trim() : undefined,
        privacyConsent: true,
      });
      const state = useAuthStore.getState();
      state.setUser({
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.fullName,
        role: session.user.role,
        roles: session.user.roles,
        protected: session.user.protected,
        created_at: new Date().toISOString(),
      });
      toast.success('Cuenta QuickBite configurada.');
      navigate(destination(role), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin" /></main>;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white p-7 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><School className="h-5 w-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">QuickBite</p><h1 className="text-2xl font-black">Completa tus datos escolares</h1></div>
        </div>
        <p className="mt-4 text-sm text-slate-600">Google ya verificó la cuenta y nos proporcionó tu nombre y correo. Solo pedimos los datos adicionales necesarios para identificar la cuenta dentro del colegio.</p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
          <p><strong>Cuenta Google:</strong> {email}</p>
          <p className="mt-1"><strong>Nombre:</strong> {fullName || 'No disponible'}</p>
        </div>

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
          <div>
            <p className="text-sm font-bold">Tipo de cuenta</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('student')} className={'rounded-2xl border p-4 text-left ' + (role === 'student' ? 'border-blue-600 bg-blue-50' : 'bg-white')}><GraduationCap className="h-5 w-5" /><span className="mt-2 block text-sm font-bold">Estudiante</span></button>
              <button type="button" onClick={() => setRole('parent')} className={'rounded-2xl border p-4 text-left ' + (role === 'parent' ? 'border-blue-600 bg-blue-50' : 'bg-white')}><Users className="h-5 w-5" /><span className="mt-2 block text-sm font-bold">Padre de familia</span></button>
            </div>
          </div>

          <label className="block text-sm font-bold">Documento de identidad<input required value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" inputMode="numeric" autoComplete="off" /><span className="mt-1 block text-xs font-normal text-slate-500">Se utiliza para identificar la cuenta dentro del entorno escolar y no se muestra públicamente.</span></label>

          {role === 'student' && <label className="block text-sm font-bold">Curso / grupo<input required value={course} onChange={(event) => setCourse(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" placeholder="Ej. 11°B" /></label>}

          <label className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm">
            <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1" />
            <span>He leído la <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Política de tratamiento de datos</a> y entiendo para qué se utilizarán los datos de QuickBite.</span>
          </label>

          {role === 'student' && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Cuando la cuenta corresponda a un menor de edad, el colegio debe gestionar las autorizaciones que correspondan conforme a su política institucional y a la normativa aplicable. Este formulario no reemplaza ese procedimiento.</div>}

          <Button type="submit" disabled={saving} className="w-full rounded-xl py-6 font-bold">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Configurando...</> : <><FileText className="mr-2 h-4 w-4" />Completar cuenta</>}</Button>
        </form>
      </div>
    </main>
  );
}
