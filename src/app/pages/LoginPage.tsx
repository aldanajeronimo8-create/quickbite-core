import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, Users, Store, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { QuickBiteLogo } from '../components/brand/QuickBiteLogo';
import { bindStudentUser, clearBoundStudentUser, getBoundStudentUserId } from '../../lib/studentDeviceSession';
import { toast } from 'sonner';
import { isFirebaseGoogleConfigured } from '../../services/firebaseAuth';

type Mode = 'student' | 'parent' | 'staff' | 'admin';

function goToRole(navigate: ReturnType<typeof useNavigate>, role: Mode, userId: string) {
  if (role === 'admin') navigate('/admin');
  else if (role === 'staff') navigate('/staff');
  else if (role === 'parent') navigate('/parent/family');
  else { bindStudentUser(userId); navigate('/menu'); }
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signOut, signInWithFirebaseGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleErrorCode = new URLSearchParams(window.location.search).get('google_error');
  const googleConfigured = isFirebaseGoogleConfigured();
  const googleErrorMessage = googleErrorCode === 'google_not_configured'
    ? 'El acceso con Google todavía no está configurado en este entorno.'
    : googleErrorCode === 'google_internal_account_not_allowed'
      ? 'Las cuentas de personal de cafetería y administración deben iniciar sesión con correo y contraseña.'
      : googleErrorCode
        ? 'No se pudo completar el acceso con Google. Vuelve a intentarlo.'
        : '';

  const handleGoogle = async () => {
    if (!googleConfigured) {
      const message = 'El acceso con Google todavía no está configurado en este entorno.';
      setError(message);
      toast.error(message);
      return;
    }
    setGoogleLoading(true);
    setError('');
    try {
      const result = await signInWithFirebaseGoogle();
      if (result.status === 'onboarding_required') {
        navigate('/firebase/onboarding');
        return;
      }
      goToRole(navigate, result.user.role as Mode, result.user.id);
      toast.success('Acceso con Google verificado.');
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : 'No se pudo iniciar sesión con Google.';
      const message =
        raw === 'google_internal_account_not_allowed'
          ? 'Las cuentas de personal de cafetería y administración deben iniciar sesión con correo y contraseña.'
          : raw === 'firebase_not_configured'
            ? 'El acceso con Google todavía no está configurado en este entorno.'
            : raw === 'auth/popup-closed-by-user'
              ? 'Cerraste la ventana de Google antes de completar el acceso.'
              : raw === 'auth/popup-blocked'
                ? 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para QuickBite e inténtalo de nuevo.'
                : raw === 'firebase_google_provider_not_configured'
                  ? 'Google no está habilitado como proveedor de acceso en Firebase. Activa Google en Authentication > Sign-in method del proyecto QuickBite.'
                  : raw === 'firebase_unauthorized_domain'
                    ? 'Este dominio aún no está autorizado en Firebase Authentication.'
                    : raw;
      setError(message);
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email || !password) { setError('Ingresa correo y contraseña.'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('No se pudo recuperar la sesión.');
      const validRoles: Mode[] = ['student', 'parent', 'staff', 'admin'];
      const roles = currentUser.protected
        ? validRoles
        : Array.from(new Set((currentUser.roles ?? [currentUser.role]).filter((role): role is Mode => validRoles.includes(role as Mode))));
      if (roles.length > 1) {
        navigate('/choose-role');
        toast.success('Identidad verificada. Selecciona tu espacio de trabajo.');
      } else {
        goToRole(navigate, currentUser.role as Mode, currentUser.id);
        toast.success('Bienvenido a QuickBite.');
      }
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.';
      const message = raw === 'role_not_allowed' ? 'Esta cuenta no tiene habilitado ese rol.' : raw === 'invalid_credentials' ? 'Correo o contraseña incorrectos.' : raw;
      setError(message);
      toast.error(message);
    } finally { setLoading(false); }
  };

  const changeStudentOnDevice = async () => {
    await signOut();
    clearBoundStudentUser();
    setEmail('');
    setPassword('');
    setError('');
    toast.success('Este dispositivo ya puede vincularse a otro estudiante.');
  };

  return (
    <div data-qb-auth-mode="public" className="qb-auth qb-auth--public min-h-screen flex flex-col items-center justify-center p-5 transition-colors duration-500">
      <div className="w-full max-w-sm relative z-10">
        <div className="qb-auth-brand text-center mb-7">
          <QuickBiteLogo className="mb-3 h-[4.5rem] w-[4.5rem] rounded-3xl" />
          <h1 className="qb-auth-brand-title text-3xl font-bold tracking-tight">QuickBite</h1>
          <p className="qb-auth-brand-subtitle text-sm mt-1">Portal de la comunidad educativa</p>
        </div>
        <div className="qb-auth-card rounded-3xl shadow-2xl p-7">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3"><GraduationCap className="qb-auth-role-icon w-5 h-5" /><h2 className="text-lg font-bold">Acceso a QuickBite</h2></div>
            <p className="text-sm">Usa tus credenciales de QuickBite. El sistema determina tus permisos después de autenticarte. El acceso con Google está disponible para estudiantes y padres de familia.</p>
          </div>
          <form onSubmit={(event) => void handleLogin(event)} autoComplete="on" className="space-y-4">
            <div>
              <Label htmlFor="login-email" className="text-sm mb-1 block">Correo electrónico</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><Input name="email" autoComplete="username" id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" /></div>
            </div>
            <div>
              <Label htmlFor="login-password" className="text-sm">Contraseña</Label>
              <div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><Input name="current-password" autoComplete="current-password" id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="qb-auth-icon-button absolute right-2 top-1/2 -translate-y-1/2" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              {error && <p className="qb-auth-error text-xs mt-1">{error}</p>}{googleErrorMessage && <p className="qb-auth-error text-xs mt-2">{googleErrorMessage}</p>}
            </div>
            <Button type="submit" disabled={loading} className="qb-auth-primary w-full font-semibold py-6 rounded-xl">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</> : 'Iniciar sesión'}</Button>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>o</span><span className="h-px flex-1 bg-slate-200" /></div>
            <Button type="button" variant="outline" disabled={loading || googleLoading || !googleConfigured} onClick={() => void handleGoogle()} className="w-full rounded-xl py-6 font-semibold" title={!googleConfigured ? 'Configura Firebase Authentication para habilitar Google' : undefined}>{googleLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Conectando con Google...</> : <><span aria-hidden="true" className="mr-2 grid h-5 w-5 place-items-center rounded-full text-sm font-extrabold">G</span>{googleConfigured ? 'Continuar con Google' : 'Google no configurado'}</>}</Button>
            <div className="mt-4 space-y-1 text-center text-sm text-slate-500"><p>¿Eres estudiante y aún no tienes cuenta? <Link to="/register-student" className="font-bold text-blue-700 underline">Crear cuenta de estudiante</Link></p><p>¿Eres padre de familia y aún no tienes cuenta? <Link to="/register-parent" className="font-bold text-blue-700 underline">Crear cuenta de padre</Link></p></div>
            {getBoundStudentUserId() && <Button type="button" variant="ghost" onClick={() => void changeStudentOnDevice()} disabled={loading} className="qb-auth-secondary-action w-full text-xs">Cambiar estudiante en este dispositivo</Button>}
          </form>
          <div className="mt-6 border-t pt-4 text-center text-xs text-slate-500">
            <p>El alta y la gestión de cuentas se realizan según el procedimiento institucional.</p>
            <div className="mt-2 flex justify-center gap-3">
              <Link to="/privacy" className="underline">Privacidad y datos</Link>
              <Link to="/data-rights" className="underline">Ejercer derechos</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
