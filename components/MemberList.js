'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { COLUMNS, initials, groupBadges } from '@/lib/view';

export default function MemberList({ members, exportHref, showDays, showGroups }) {
  const [q, setQ] = useState('');
  const [table, setTable] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return members;
    return members.filter((m) => [m.nombre, m.id, m.dni, m.tutor1?.nombre, m.mail].some((x) => x && x.toLowerCase().includes(s)));
  }, [q, members]);

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Buscar nombre, ID, DNI…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={() => setTable(!table)}>{table ? '📇 Lista' : '📑 Tabla completa'}</button>
        {exportHref && <a className="btn ghost" href={exportHref}>⬇ Excel</a>}
      </div>
      <p className="muted small">{list.length} {list.length === 1 ? 'miembro' : 'miembros'}</p>

      {!list.length ? (
        <div className="card muted">No hay miembros{q ? ' que coincidan con la búsqueda' : ' todavía'}.</div>
      ) : table ? (
        <div className="tablewrap">
          <table>
            <thead><tr>{COLUMNS.map(([h], i) => <th key={h} className={i === 1 ? 'sticky' : ''}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  {COLUMNS.map(([h, f], i) => (
                    <td key={h} className={i === 1 ? 'sticky' : ''}>
                      {i <= 1 ? <Link href={`/socios/${encodeURIComponent(m.id)}`}><b>{f(m)}</b></Link> : f(m) || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="list">
          {list.map((m) => (
            <Link key={m.id} href={`/socios/${encodeURIComponent(m.id)}`} className="row">
              <div className="mini-av">{initials(m.nombre)}</div>
              <div className="who">
                <b>{m.nombre}</b>
                <small>
                  {m.id}{m.edadCalc != null ? ` · ${m.edadCalc} años` : ''}
                  {showDays && m.diasTexto ? ` · ${m.diasTexto}` : ''}
                  {showGroups ? ` · ${groupBadges(m).map((b) => b.label).join(', ') || 'Sin grupo'}` : ''}
                </small>
              </div>
              {m.observaciones && <span className="tag warn" title={m.observaciones}>⚠️</span>}
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
