// Diagnóstico de configuración: indica solo si cada variable existe (nunca su valor).
export const dynamic = 'force-dynamic';

export function GET() {
  const has = (k) => Boolean(process.env[k] && process.env[k].trim());
  const vars = {
    AUTH_SECRET: has('AUTH_SECRET'),
    AUTH_GOOGLE_ID: has('AUTH_GOOGLE_ID'),
    AUTH_GOOGLE_ID_formato_ok: (process.env.AUTH_GOOGLE_ID || '').trim().endsWith('.apps.googleusercontent.com'),
    AUTH_GOOGLE_SECRET: has('AUTH_GOOGLE_SECRET'),
    AUTH_GOOGLE_SECRET_formato_ok: /^GOCSPX-[\w-]{20,}$/.test((process.env.AUTH_GOOGLE_SECRET || '').trim()),
    AUTH_GOOGLE_SECRET_espacios: (process.env.AUTH_GOOGLE_SECRET || '') !== (process.env.AUTH_GOOGLE_SECRET || '').trim(),
    ROOT_EMAILS: has('ROOT_EMAILS'),
    KV_REST_API_URL: has('KV_REST_API_URL') || has('UPSTASH_REDIS_REST_URL'),
    KV_REST_API_TOKEN: has('KV_REST_API_TOKEN') || has('UPSTASH_REDIS_REST_TOKEN'),
  };
  const { AUTH_GOOGLE_SECRET_espacios, ...required } = vars;
  const opcionales = {
    email_GMAIL_USER: has('GMAIL_USER'),
    email_GMAIL_APP_PASSWORD: has('GMAIL_APP_PASSWORD'),
    push_VAPID_PUBLIC_KEY: has('VAPID_PUBLIC_KEY'),
    push_VAPID_PRIVATE_KEY: has('VAPID_PRIVATE_KEY'),
    lectura_mano_GOOGLE_VISION_API_KEY: has('GOOGLE_VISION_API_KEY'),
  };
  return Response.json({ ok: Object.values(required).every(Boolean), vars, opcionales, entorno: process.env.VERCEL_ENV || 'local' });
}
