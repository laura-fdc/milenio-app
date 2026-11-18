import Link from 'next/link';

export const metadata = { title: 'Política de privacidad · Milenio Club Patín' };

export default function Privacidad() {
  return (
    <main className="page" style={{ maxWidth: 760, paddingBottom: 40 }}>
      <p><Link href="/login" style={{ color: 'var(--orange-d)', fontWeight: 600 }}>‹ Volver</Link></p>
      <h1>Política de privacidad</h1>
      <div className="card stack" style={{ lineHeight: 1.55 }}>
        <p style={{ margin: 0 }}>
          <b>Responsable del tratamiento:</b> Milenio Club Patín (NIF G26400259). Casa de las Asociaciones, P.º Francisco
          Sáez Porres, 1, 26009 Logroño, La Rioja. Contacto: <a href="mailto:info@hockeymilenio.com">info@hockeymilenio.com</a>.
        </p>
        <p style={{ margin: 0 }}>
          <b>Finalidad:</b> gestión de la inscripción, tramitación de licencias deportivas, cobro de cuotas, control de
          accesos y asistencia, e información sobre las actividades del club. De conformidad con el art. 7.4 de la Ley
          39/2022 del Deporte, los datos de menores se recaban con el consentimiento de sus representantes legales.
        </p>
        <p style={{ margin: 0 }}>
          <b>Inicio de sesión con Google:</b> esta aplicación solo usa tu nombre, tu dirección de correo y tu foto de
          perfil de Google para identificarte y darte acceso a las fichas que te corresponden. No se accede a ningún otro
          dato de tu cuenta de Google ni se comparte con terceros.
        </p>
        <p style={{ margin: 0 }}>
          <b>Legitimación:</b> ejecución de la relación de socio/deportista y cumplimiento de obligaciones legales; el
          consentimiento del interesado (o tutores) para los tratamientos opcionales, como el uso de imágenes.
        </p>
        <p style={{ margin: 0 }}>
          <b>Destinatarios:</b> federación deportiva correspondiente, aseguradoras para la cobertura de licencias,
          entidades necesarias para la práctica deportiva y propietarios de instalaciones para el control de accesos. No
          se cederán datos a otros terceros salvo obligación legal. Los datos se alojan en servidores ubicados en la Unión
          Europea (Frankfurt, Alemania) a través de los proveedores tecnológicos Vercel y Upstash, que actúan como
          encargados del tratamiento.
        </p>
        <p style={{ margin: 0 }}>
          <b>Acceso a los datos:</b> solo el personal autorizado del club puede ver y modificar las fichas completas. Las
          entrenadoras solo ven los datos de los deportistas de sus grupos (sin datos bancarios) y las familias solo
          pueden consultar las fichas vinculadas a su correo.
        </p>
        <p style={{ margin: 0 }}>
          <b>Conservación:</b> mientras se mantenga la relación con el club y, después, durante los plazos legalmente
          exigidos.
        </p>
        <p style={{ margin: 0 }}>
          <b>Derechos:</b> puedes acceder, rectificar, suprimir, oponerte y limitar el tratamiento de tus datos escribiendo
          a <a href="mailto:info@hockeymilenio.com">info@hockeymilenio.com</a>. También puedes reclamar ante la Agencia
          Española de Protección de Datos (www.aepd.es).
        </p>
      </div>
    </main>
  );
}
