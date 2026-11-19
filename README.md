# Milenio Club Patín · App de gestión

App web (instalable en el móvil como app) para gestionar socios, grupos y asistencia del Milenio Club Patín.

- **Login con Google** (Auth.js)
- **Roles**
  - **Root**: todo (subir fichas PDF, importar Excel, editar, usuarios). Se define con `ROOT_EMAILS` o desde *Gestión → Usuarios*.
  - **Entrenadora**: ve los socios de sus grupos y pasa lista (sin datos bancarios).
  - **Familia**: entra sola si su Google coincide con el mail del deportista o de un tutor de la ficha; ve sus fichas, sin editar.
- **Secciones**: Escuelas (Hockey, Artístico, Iniciación niños/adultos), Hockey (Sénior, Sub-18, Sub-16, Minis, Hobby, Hobby iniciación) y Patinaje (Tecnificación, Competición, Ballet OPEN +15/-15). Todo está en `lib/catalog.js`.
- **Ficha PDF**: lee automáticamente la ficha rellenable (campos por posición, `lib/pdf.js`), propone grupos y días del anexo y guarda el PDF original.
- **Excel de grupos**: importa los listados (hojas con `ID SOCIO`, `NombreApelli`, `Edad` y columnas marcadas con X). Se puede resubir: sincroniza altas y bajas por grupo/día con vista previa (`lib/excel.js`).
- **Pasar lista** en las escuelas: por día, solo los apuntados a ese día, navegación entre sesiones y opción de pasar lista otro día. Historial mensual con %.
- **Exportar a Excel** cada grupo.
- **Avisos a familias**: cada familia elige en la ficha si quiere aviso por la app (push) y/o por email (a los correos de la ficha) cuando se marque ❌ al pasar lista. Un aviso por socio y día.
- **Avisar ausencia**: la familia elige una próxima clase y el motivo; al pasar lista aparece "Avisó que no viene" y no se le envía aviso.
- **Comunicados** (root): a todo el club o a grupos concretos, por la app y por email (BCC).
- **Pagos y documentos**: Excel de pagos o alta manual; justificantes (J-año-nº) y facturas (F-año-nº, exentas de IVA) en PDF, descargables también por la familia.
- **PWA**: manifest, iconos y service worker para "Añadir a pantalla de inicio".

## Puesta en marcha en Vercel

1. Importa este repositorio en Vercel (New Project → Import Git Repository).
2. En el proyecto: **Storage → Marketplace → Upstash (Redis)** → crear y conectar. Añade solo `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. En **Settings → Environment Variables** añade:
   - `AUTH_SECRET` (cadena aleatoria larga)
   - `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`
   - `ROOT_EMAILS` (tu correo de Google; varios separados por comas)
4. Google Cloud Console → APIs y servicios → Credenciales → **ID de cliente OAuth (Aplicación web)**:
   - Orígenes autorizados: `https://TU-DOMINIO.vercel.app`
   - URI de redirección: `https://TU-DOMINIO.vercel.app/api/auth/callback/google`
5. Redeploy.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # pon AUTH_SECRET y AUTH_DEV_LOGIN=1
npm run dev
```

Sin credenciales de Upstash, los datos se guardan en `.data/dev-db.json` y aparece un "login de prueba" (solo en local).
