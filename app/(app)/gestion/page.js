import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { usingRedis } from '@/lib/kv';

const ITEMS = [
  { href: '/gestion/ficha', ico: '📄', t: 'Subir ficha PDF', d: 'Lee la ficha de inscripción y crea o actualiza el socio' },
  { href: '/gestion/excel', ico: '📊', t: 'Importar Excel de grupos', d: 'Sincroniza los listados de entrenadoras (se puede resubir)' },
  { href: '/gestion/nuevo', ico: '✍️', t: 'Nueva ficha a mano', d: 'Para fichas en papel o escaneadas' },
  { href: '/gestion/usuarios', ico: '🔑', t: 'Usuarios y permisos', d: 'Entrenadoras y otros administradores' },
];

export default async function Gestion() {
  await requireUser(['root']);
  return (
    <>
      <h1>Gestión</h1>
      {!usingRedis && <p className="note small">Modo local: los datos se guardan en este ordenador (.data/dev-db.json), no en Redis.</p>}
      <div className="list">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className="row">
            <div className="mini-av">{i.ico}</div>
            <div className="who"><b>{i.t}</b><small>{i.d}</small></div>
            <span className="chev">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}
