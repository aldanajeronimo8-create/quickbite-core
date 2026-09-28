import { useEffect, useMemo, useState } from 'react';
import { FileText, GraduationCap, Loader2, School, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { quickbiteApi } from '../../services/api/quickbiteApi';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

type Role = 'student' | 'parent';
type AcademicSection = {
  id: string;
  name: string;
  grades: Array<{ id: string; name: string; courses: Array<{ id: string; name: string }> }>;
};

export function FirebaseOnboardingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [documentNumber, setDocumentNumber] = useState('');
  const [sections, setSections] = useState<AcademicSection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [studentAcknowledged, setStudentAcknowledged] = useState(false);
  const [guardianAuthorized, setGuardianAuthorized] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedSection = useMemo(() => sections.find((section) => section.id === sectionId) ?? null, [sections, sectionId]);
  const grades = selectedSection?.grades ?? [];
  const selectedGrade = useMemo(() => grades.find((grade) => grade.id === gradeId) ?? null, [grades, gradeId]);
  const courses = selectedGrade?.courses ?? [];

  useEffect(() => {
    void Promise.all([quickbiteApi().firebaseOnboarding(), quickbiteApi().academicStructure()])
      .then(([profile, academic]) => {
        setEmail(profile.email);
        setFullName(profile.fullName);
        setSections(academic.sections);
        setSectionId(academic.sections[0]?.id ?? '');
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la información requerida.');
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    setGradeId(sections.find((section) => section.id === sectionId)?.grades[0]?.id ?? '');
  }, [sectionId, sections]);

  useEffect(() => {
    setCourseId(grades.find((grade) => grade.id === gradeId)?.courses[0]?.id ?? '');
  }, [gradeId, grades]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6,15}$/.test(documentNumber.trim())) return void toast.error('Ingresa un documento de identidad válido.');
    if (role === 'student' && (!sectionId || !gradeId || !courseId)) return void toast.error('Debes seleccionar sección, grado y curso.');
    if (role === 'student' && (guardianName.trim().length < 3 || guardianRelationship.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail.trim()))) return void toast.error('Completa correctamente los datos del representante.');
    if (role === 'student' && (!studentAcknowledged || !guardianAuthorized)) return void toast.error('Completa las autorizaciones requeridas para estudiantes.');
    if (!privacyConsent) return void toast.error('Debes aceptar el tratamiento informado de datos.');

    setSaving(true);
    try {
      const session = await quickbiteApi().completeFirebaseOnboarding({
        role,
        documentNumber: documentNumber.trim(),
        sectionId: role === 'student' ? sectionId : undefined,
        gradeId: role === 'student' ? gradeId : undefined,
        courseId: role === 'student' ? courseId : undefined,
        guardianName: role === 'student' ? guardianName.trim() : undefined,
        guardianRelationship: role === 'student' ? guardianRelationship.trim() : undefined,
        guardianEmail: role === 'student' ? guardianEmail.trim().toLowerCase() : undefined,
        studentAcknowledged: role === 'student' ? studentAcknowledged : undefined,
        guardianAuthorized: role === 'student' ? guardianAuthorized : undefined,
        privacyConsent: true,
      });

      useAuthStore.getState().setUser({
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.fullName,
        role: session.user.role,
        roles: session.user.roles,
        protected: session.user.protected,
        section: session.user.section ?? null,
        grade: session.user.grade ?? null,
        course: session.user.course ?? null,
        section_id: session.user.sectionId ?? null,
        grade_id: session.user.gradeId ?? null,
        course_id: session.user.courseId ?? null,
        created_at: new Date().toISOString(),
      });

      toast.success('Cuenta QuickBite configurada con Google.');
      navigate(role === 'student' ? '/menu' : '/parent/family', { replace: true });
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
          <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">QuickBite</p><h1 className="text-2xl font-black">Configura tu cuenta con Google</h1></div>
        </div>
        <p className="mt-4 text-sm text-slate-600">Google ya verificó tu identidad. QuickBite solicita los datos adicionales necesarios para crear tu cuenta.</p>
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

          <label className="block text-sm font-bold">Documento de identidad
            <input required value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" inputMode="numeric" autoComplete="off" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Se almacena únicamente para identificar la cuenta dentro de QuickBite.</span>
          </label>

          {role === 'student' && <>
            <div className="space-y-4 rounded-2xl border bg-slate-50 p-4">
              <p className="text-sm font-black">Ubicación académica</p>
              <label className="block text-sm font-bold">Sección<select required value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
              <label className="block text-sm font-bold">Grado<select required value={gradeId} onChange={(event) => setGradeId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
              <label className="block text-sm font-bold">Curso<select required value={courseId} onChange={(event) => setCourseId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
            </div>

            <div className="space-y-3 rounded-2xl border bg-white p-4">
              <p className="text-sm font-black">Representante</p>
              <input required value={guardianName} onChange={(event) => setGuardianName(event.target.value)} placeholder="Nombre completo" className="w-full rounded-xl border px-3 py-2.5" />
              <input required value={guardianRelationship} onChange={(event) => setGuardianRelationship(event.target.value)} placeholder="Parentesco o relación" className="w-full rounded-xl border px-3 py-2.5" />
              <input required value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} placeholder="Correo del representante" type="email" className="w-full rounded-xl border px-3 py-2.5" />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm"><input type="checkbox" checked={studentAcknowledged} onChange={(event) => setStudentAcknowledged(event.target.checked)} className="mt-1" /><span>Confirmo que los datos suministrados corresponden a mi información y entiendo el uso informado dentro de QuickBite.</span></label>
            <label className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm"><input type="checkbox" checked={guardianAuthorized} onChange={(event) => setGuardianAuthorized(event.target.checked)} className="mt-1" /><span>Declaro que la autorización del representante se gestionará conforme al procedimiento correspondiente.</span></label>
          </>}

          <label className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1" /><span>He leído la <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Política de tratamiento de datos</a> y entiendo para qué se utilizarán los datos de QuickBite.</span></label>
          <Button type="submit" disabled={saving} className="w-full rounded-xl py-6 font-bold">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Configurando...</> : <><FileText className="mr-2 h-4 w-4" />Completar cuenta</>}</Button>
        </form>
      </div>
    </main>
  );
}
