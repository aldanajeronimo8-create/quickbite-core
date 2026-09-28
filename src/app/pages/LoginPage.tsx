import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, ShieldCheck, Users, Store } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { QuickBiteLogo } from '../components/brand/QuickBiteLogo';
import { bindStudentUser, clearBoundStudentUser, getBoundStudentUserId } from '../../lib/studentDeviceSession';
import { toast } from 'sonner';

type Mode = 'student' | 'parent' | 'staff' | 'admin';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signOut } = useAuthStore();
  const previewRole = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('preview_role') : null;
  const initialMode: Mode = previewRole === 'admin' || previewRole === 'parent' || previewRole === 'staff' || previewRole === 'student' ? previewRole : 'student';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (next: Mode) => { setMode(next); setError(''); };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email || !password) { setError('Ingresa correo y contraseña.'); return; }
    setLoading(true);
    try {
      await signIn(email, password, mode);
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('No se pudo recuperar la sesión.');
      if (mode === 'admin') { navigate('/admin'); toast.success('Bienvenido a Administración.'); }
      else if (mode === 'staff') { navigate('/staff'); toast.success('Bienvenido a Operaciones de cafetería.'); }
      else if (mode === 'parent') { navigate('/parent/family'); toast.success('Bienvenido a QuickBite Family.'); }
      else { bindStudentUser(currentUser.id); navigate('/menu'); toast.success('Bienvenido.'); }
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

  const isStudent = mode === 'student';
  const isParent = mode === 'parent';
  const isStaff = mode === 'staff';
  const roleTitle = isStudent ? 'Estudiante' : isParent ? 'Padre de familia' : isStaff ? 'Personal de cafetería' : 'Administración';
  const roleIcon = isStudent ? GraduationCap : isParent ? Users : isStaff ? Store : ShieldCheck;

  return (
    <div data-qb-auth-mode={mode} className={`qb-auth qb-auth--${mode} min-h-screen flex flex-col items-center justify-center p-5 transition-colors duration-500`}>
      <div className="w-full max-w-sm relative z-10">
        <div className="qb-auth-brand text-center mb-7">
          <QuickBiteLogo className="mb-3 h-[4.5rem] w-[4.5rem] rounded-3xl" />
          <h1 className="qb-auth-brand-title text-3xl font-bold tracking-tight">QuickBite</h1>
          <p className="qb-auth-brand-subtitle text-sm mt-1">Portal {roleTitle.toLowerCase()}</p>
        </div>
        <div className="qb-auth-card rounded-3xl shadow-2xl p-7">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">{(() => { const Icon = roleIcon; return <Icon className="qb-auth-role-icon w-5 h-5" />; })()}<h2 className="text-lg font-bold">{roleTitle}</h2></div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl p-1 qb-auth-switch">
              <button type="button" onClick={() => switchMode('student')} className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold"><GraduationCap className="h-4 w-4" />Estudiante</button>
              <button type="button" onClick={() => switchMode('parent')} className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold"><Users className="h-4 w-4" />Padre</button>
              <button type="button" onClick={() => switchMode('staff')} className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold"><Store className="h-4 w-4" />Staff</button>
              <button type="button" onClick={() => switchMode('admin')} className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4" />Admin</button>
            </div>
          </div>
          <form onSubmit={(event) => void handleLogin(event)} autoComplete="on" className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Iniciar sesión como {roleTitle.toLowerCase()}</h3>
              <p className="text-sm mb-5">{isStudent ? 'Accede al menú y a tu cuenta de estudiante.' : isParent ? 'Accede a los estudiantes vinculados.' : isStaff ? 'Accede a las operaciones de cafetería y gestión de pedidos.' : 'Acceso al panel administrativo de QuickBite.'}</p>
              <Label htmlFor="login-email" className="text-sm mb-1 block">Correo electrónico</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><Input name="email" autoComplete="username" id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1"><Label htmlFor="login-password" className="text-sm">Contraseña</Label>{mode !== 'admin' && <Link to="/forgot-password" className="qb-auth-link text-xs underline underline-offset-2">Recuperar</Link>}</div>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><Input name="current-password" autoComplete="current-password" id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="qb-auth-icon-button absolute right-2 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              {error && <p className="qb-auth-error text-xs mt-1">{error}</p>}
            </div>
            <Button type="submit" disabled={loading} className="qb-auth-primary w-full font-semibold py-6 rounded-xl">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</> : 'Iniciar sesión'}</Button>
            {isStudent && getBoundStudentUserId() && <Button type="button" variant="ghost" onClick={() => void changeStudentOnDevice()} disabled={loading} className="qb-auth-secondary-action w-full text-xs">Cambiar estudiante en este dispositivo</Button>}
            {isStudent && <Link to="/register-student"><Button type="button" variant="outline" className="qb-auth-secondary w-full py-5 rounded-xl text-sm">Crear cuenta de estudiante</Button></Link>}
            {isParent && <Link to="/register-parent"><Button type="button" variant="outline" className="qb-auth-secondary w-full py-5 rounded-xl text-sm">Crear cuenta de Padre de Familia</Button></Link>}
          </form>
        </div>
      </div>
    </div>
  );
}
