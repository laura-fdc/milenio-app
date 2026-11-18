import { requireUser } from '@/lib/session';
import { signOut } from '@/auth';
import Logo from '@/components/Logo';
import BottomNav from '@/components/BottomNav';

const ROLE = { root: 'Root', entrenadora: 'Entrenadora', familia: 'Familia' };

export default async function AppLayout({ children }) {
  const user = await requireUser();
  const tabs =
    user.role === 'familia'
      ? [{ href: '/', label: 'Mis fichas', i: '🪪' }]
      : [
          { href: '/', label: 'Inicio', i: '🏠' },
          { href: '/secciones', label: 'Secciones', i: '🗂️' },
          { href: '/socios', label: 'Socios', i: '👥' },
          ...(user.role === 'root' ? [{ href: '/gestion', label: 'Gestión', i: '⚙️' }] : []),
        ];

  return (
    <>
      <header className="topbar">
        <div className="brand"><Logo /> Milenio</div>
        <span className="role">{ROLE[user.role]}</span>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
          <button className="avatar" title={`${user.email} · Cerrar sesión`}>
            {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : user.name[0]?.toUpperCase()}
          </button>
        </form>
      </header>
      <BottomNav tabs={tabs} />
      <main className="page">{children}</main>
    </>
  );
}
