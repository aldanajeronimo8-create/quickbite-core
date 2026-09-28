import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <Link to="/" className="text-sm font-bold text-blue-700 underline">Volver a QuickBite</Link>
        <h1 className="mt-6 text-4xl font-black">Política de tratamiento de datos personales</h1>
        <p className="mt-3 text-sm text-slate-500">Versión web de la información de privacidad aplicable a QuickBite.</p>

        <section className="prose prose-slate mt-8 max-w-none">
          <h2>1. Responsable</h2>
          <p>El responsable institucional del tratamiento es el Colegio Bilingüe Maximino Poitiers. Dirección: Calle 152 A No. 102-51, Suba, Bogotá D.C. Correo para consultas sobre datos personales: <a href="mailto:maximinopoitiers@yahoo.es">maximinopoitiers@yahoo.es</a>.</p>

          <h2>2. Datos que puede tratar QuickBite</h2>
          <p>Para operar el servicio se podrán tratar datos de identificación y contacto necesarios para la cuenta, información de perfil, información de pedidos, estado de pedidos, preferencias de la aplicación y datos técnicos estrictamente necesarios para seguridad y funcionamiento. QuickBite no solicita datos sensibles para la operación normal de la cafetería.</p>

          <h2>3. Finalidades</h2>
          <p>Las finalidades son gestionar el acceso, mostrar el menú, recibir y consultar pedidos, permitir la gestión familiar autorizada, enviar avisos relacionados con el servicio, mantener la seguridad, atender solicitudes de los titulares y cumplir obligaciones legales o institucionales aplicables.</p>

          <h2>4. Principios y acceso restringido</h2>
          <p>El tratamiento se realizará con finalidad definida, transparencia, calidad, acceso restringido, seguridad y confidencialidad. La información no se publica en Internet y el acceso a funciones internas depende de autenticación y autorización.</p>

          <h2>5. Niños, niñas y adolescentes</h2>
          <p>Cuando se trate información de estudiantes menores de edad, el tratamiento debe respetar su interés superior y sus derechos fundamentales. La autorización del representante legal se gestionará cuando sea necesaria y previamente se permitirá que el menor sea escuchado, atendiendo a su madurez, autonomía y capacidad de comprensión. La institución debe mantener mecanismos para que la familia y los estudiantes conozcan el uso responsable y seguro de sus datos.</p>

          <h2>6. Derechos</h2>
          <p>Los titulares pueden conocer, actualizar y rectificar sus datos, solicitar información sobre el tratamiento y ejercer las solicitudes de supresión o revocatoria cuando legalmente proceda. Las solicitudes están disponibles sin costo mediante el canal institucional indicado en esta política.</p>

          <h2>7. Conservación y supresión</h2>
          <p>Los datos se conservarán durante el tiempo necesario para cumplir las finalidades informadas y las obligaciones legales o contractuales aplicables. Cuando ya no exista una razón legítima para conservarlos, se aplicarán los procedimientos institucionales de supresión o anonimización que correspondan.</p>

          <h2>8. Seguridad</h2>
          <p>QuickBite debe aplicar medidas técnicas y administrativas razonables para evitar acceso no autorizado, pérdida, alteración o divulgación. Las contraseñas se procesan mediante funciones de derivación criptográfica y los accesos internos se controlan por rol.</p>

          <h2>9. Servicios de Google</h2>
          <p>Cuando una función de QuickBite requiera datos de una cuenta de Google, se solicitarán únicamente los permisos necesarios para esa función, se informará su finalidad antes de la autorización y se aplicarán los requisitos de uso limitado, seguridad, transparencia y eliminación de datos exigidos por Google. No se solicitarán permisos de Google que no sean necesarios para la función.</p>

          <h2>10. Cambios y contacto</h2>
          <p>Esta política podrá actualizarse cuando cambien las funcionalidades, los proveedores o las obligaciones aplicables. Las versiones vigentes deberán mantenerse publicadas y accesibles.</p>

          <div className="not-prose mt-8 rounded-2xl bg-slate-50 p-5 text-sm"><strong>Nota:</strong> esta página es una implementación técnica de información de privacidad y no sustituye la política institucional ni la revisión jurídica que corresponda antes de poner el sistema en operación con menores de edad.</div>
        </section>
      </div>
    </main>
  );
}
