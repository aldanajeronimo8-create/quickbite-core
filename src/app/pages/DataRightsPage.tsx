import { Link } from 'react-router-dom';

export function DataRightsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-sm font-bold text-blue-700 underline">Volver a QuickBite</Link>
        <div className="mt-6 rounded-3xl border bg-white p-7 shadow-sm">
          <h1 className="text-3xl font-black">Ejercicio de derechos sobre datos personales</h1>
          <p className="mt-3 text-slate-600">Puedes solicitar consulta, actualización, rectificación, supresión o revocatoria cuando legalmente proceda.</p>
          <div className="mt-7 space-y-4 text-sm">
            <div><strong>Canal institucional:</strong> <a className="text-blue-700 underline" href="mailto:quickbitejgf@gmail.com?subject=Solicitud%20de%20proteccion%20de%20datos">quickbitejgf@gmail.com</a></div>
            <div><strong>Responsable:</strong> QuickBite.</div>
            <div><strong>Dirección:</strong> ----</div>
            <div><strong>Qué incluir:</strong> nombre del titular o representante, solicitud concreta, medio de respuesta y la información necesaria para acreditar la identidad o representación, cuando corresponda.</div>
            <div><strong>Menores de edad:</strong> las solicitudes relacionadas con datos de estudiantes menores deben presentarse por quien esté legitimado para representar sus derechos, respetando también el derecho del menor a ser escuchado.</div>
          </div>
          <div className="mt-7 border-t pt-5 text-sm text-slate-600">
            <Link to="/privacy" className="underline">Consultar la política de tratamiento</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
