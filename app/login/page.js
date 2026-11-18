import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import Logo from '@/components/Logo';
import InstallHint from '@/components/InstallHint';

export const metadata = { title: 'Entrar · Milenio Club Patín' };

const ERRORS = {
  Configuration: 'No se pudo completar el login con Google. Si eres del club, revisa en Vercel que AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET son del mismo cliente de Google.',
  AccessDenied: 'Has cancelado el acceso o Google lo ha denegado.',
  Verification: 'El enlace de acceso ha caducado. Inténtalo de nuevo.',
};

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  const s = await auth();
  if (s?.user) redirect('/');
  const err = sp?.error ? ERRORS[sp.error] || 'Ha habido un problema al entrar. Inténtalo de nuevo.' : null;
  const dev = process.env.AUTH_DEV_LOGIN === '1' && process.env.NODE_ENV !== 'production';

  return (
    <section className="login">
      <div className="login-card">
        <div className="logo"><Logo size={44} /></div>
        <h1>Milenio Club Patín</h1>
        <p className="muted" style={{ margin: '0 0 22px' }}>Socios, grupos y asistencia</p>
        {err && <p className="note err small" style={{ textAlign: 'left' }}>{err}</p>}
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/' }); }}>
          <button className="gbtn">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Entrar con Google
          </button>
        </form>
        {dev && (
          <form style={{ marginTop: 14, display: 'grid', gap: 8 }}
            action={async (fd) => { 'use server'; await signIn('dev', { email: fd.get('email'), redirectTo: '/' }); }}>
            <input type="email" name="email" placeholder="Login de prueba (solo local)" required />
            <button className="btn ghost">Entrar en modo prueba</button>
          </form>
        )}
        <InstallHint />
        <p className="small" style={{ marginTop: 14, marginBottom: 0 }}>
          <a href="/privacidad" style={{ color: 'var(--muted)' }}>Política de privacidad</a>
        </p>
      </div>
    </section>
  );
}
