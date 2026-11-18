import Link from 'next/link';

export default function GroupHeader({ g, tab }) {
  const s = g.section;
  return (
    <>
      <div className="crumbs">
        <Link href="/secciones">Secciones</Link> › <Link href={`/secciones/${s.id}`}>{s.name}</Link> › {g.name}
      </div>
      <h1>{g.name}</h1>
      {g.attendance && (
        <div className="subtabs">
          <Link href={`/grupo/${g.id}`} className={tab === 'miembros' ? 'active' : ''}>👥 Miembros</Link>
          <Link href={`/grupo/${g.id}/lista`} className={tab === 'lista' ? 'active' : ''}>📋 Pasar lista</Link>
          <Link href={`/grupo/${g.id}/historial`} className={tab === 'historial' ? 'active' : ''}>📊 Historial</Link>
        </div>
      )}
    </>
  );
}
