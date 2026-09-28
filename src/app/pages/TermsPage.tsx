import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-sm font-bold text-blue-700 underline">Volver a QuickBite</Link>
        <h1 className="mt-6 text-4xl font-black">Términos de uso de QuickBite</h1>
        <div className="prose prose-slate mt-8 max-w-none">
          <h2>1. Uso autorizado</h2>
          <p>QuickBite es una herramienta institucional para gestionar procesos de cafetería. Cada persona debe utilizar únicamente las funciones correspondientes a sus permisos.</p>
          <h2>2. Cuentas</h2>
          <p>Las cuentas de estudiante y familia se administran bajo los procedimientos definidos por la institución. Las cuentas internas de Staff y Administración son privadas y solo pueden ser creadas o habilitadas por una persona con permisos administrativos.</p>
          <h2>3. Seguridad</h2>
          <p>No se deben compartir contraseñas ni utilizar una cuenta de otra persona. La institución podrá suspender cuentas cuando exista un riesgo de seguridad o una razón institucional válida.</p>
          <h2>4. Pedidos</h2>
          <p>Los pedidos están sujetos a la disponibilidad de productos, horarios y procedimientos operativos de la cafetería.</p>
          <h2>5. Privacidad</h2>
          <p>El tratamiento de datos personales se rige por la <Link to="/privacy">Política de tratamiento de datos</Link>.</p>
        </div>
      </div>
    </main>
  );
}
