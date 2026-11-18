import { auth, signOut } from '@/auth';
import Logo from '@/components/Logo';

export default async function SinAcceso() {
  const s = await auth();
  return (
    <section className="login">
      <div className="login-card">
        <div className="logo"><Logo size={44} /></div>
        <h1>Sin acceso todavía</h1>
        <p className="muted">
          La cuenta <b>{s?.user?.email}</b> no está vinculada a ninguna ficha ni tiene permisos.
        </p>
        <p className="small muted">
          Si eres familia, entra con el mismo correo que pusiste en la ficha de inscripción. Si eres entrenadora,
          pide al club que te dé acceso.
        </p>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
          <button className="btn block">Probar con otra cuenta</button>
        </form>
      </div>
    </section>
  );
}
