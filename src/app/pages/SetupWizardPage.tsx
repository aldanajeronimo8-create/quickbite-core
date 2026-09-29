import { Globe2, KeyRound, Mail, ServerCog, ShieldCheck } from 'lucide-react';
import { appConfig } from '../../config/appConfig';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { QuickBiteLogo } from '../components/brand/QuickBiteLogo';

const steps = [
  { icon: ShieldCheck, title: 'Autenticación', text: 'Las cuentas se autentican mediante Firebase y los roles se validan en QuickBite Core.' },
  { icon: ServerCog, title: 'Backend', text: 'Las funciones de la aplicación se consumen mediante la API de QuickBite Core.' },
  { icon: KeyRound, title: 'Variables de entorno', text: 'Las credenciales públicas de Firebase y la URL de la API se configuran en el entorno de despliegue.' },
  { icon: Globe2, title: 'Dominio', text: 'Configura el dominio de producción y los dominios autorizados de Firebase.' },
  { icon: Mail, title: 'Correo', text: 'El backend gestiona los flujos necesarios para recuperación y comunicaciones de la cuenta.' },
];

export function SetupWizardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center gap-3">
          <QuickBiteLogo className="h-14 w-14 rounded-2xl" />
          <Badge className="bg-blue-100 text-blue-800">Configuración de Core</Badge>
        </div>
        <h1 className="text-3xl font-black sm:text-4xl">Configuración de QuickBite Core</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Esta aplicación utiliza Firebase para autenticación y QuickBite Core API para las funciones de negocio.
          La configuración de producción se administra mediante las variables del proyecto y no requiere un asistente de base de datos en el frontend.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="rounded-xl border-slate-200 bg-white shadow-sm">
              <CardHeader><Icon className="h-6 w-6 text-blue-600" aria-hidden="true" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-700">{text}</CardContent>
            </Card>
          ))}
        </div>
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black">Configuración pública esperada</h2>
          <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">
            {`VITE_API_BASE_URL=${appConfig.publicAppUrl || 'https://tu-dominio.com'}
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
          </pre>
        </section>
      </section>
    </main>
  );
}