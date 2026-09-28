import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { QuickBiteLogo } from '../components/brand/QuickBiteLogo';

export function PublicHomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <QuickBiteLogo className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-black">QuickBite</span>
          </div>
          <Link to="/login" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">Iniciar sesión</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">QuickBite</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Compra en la cafetería con menos filas y más organización.</h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">QuickBite permite consultar el menú, realizar pedidos y consultar su estado desde un entorno diseñado para la comunidad educativa.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">Entrar a QuickBite <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/privacy" className="rounded-xl border bg-white px-5 py-3 font-bold">Privacidad y datos</Link>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border bg-white p-6 shadow-sm"><ShoppingBag className="h-6 w-6 text-blue-700" /><h2 className="mt-4 font-black">Pedidos digitales</h2><p className="mt-2 text-sm text-slate-600">Consulta productos y gestiona tus pedidos desde un solo lugar.</p></article>
          <article className="rounded-2xl border bg-white p-6 shadow-sm"><Users className="h-6 w-6 text-blue-700" /><h2 className="mt-4 font-black">Familia</h2><p className="mt-2 text-sm text-slate-600">Las cuentas autorizadas pueden gestionar la información de estudiantes vinculados.</p></article>
          <article className="rounded-2xl border bg-white p-6 shadow-sm"><LockKeyhole className="h-6 w-6 text-blue-700" /><h2 className="mt-4 font-black">Acceso controlado</h2><p className="mt-2 text-sm text-slate-600">Las funciones internas de cafetería y administración están protegidas por permisos.</p></article>
        </div>
        <div className="mt-8 rounded-2xl border bg-blue-50 p-5 text-sm text-slate-700">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><p>La gestión de datos personales se realiza bajo la política de privacidad de QuickBite y la normativa colombiana aplicable.</p></div>
        </div>
      </section>
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-sm text-slate-600">
          <Link to="/privacy" className="underline">Política de privacidad</Link>
          <Link to="/terms" className="underline">Términos de uso</Link>
          <Link to="/data-rights" className="underline">Ejercer derechos</Link>
        </div>
      </footer>
    </main>
  );
}
