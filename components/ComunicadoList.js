import { SECTIONS } from '@/lib/catalog';

// Etiquetas de destinatarios: una sección entera se muestra como "Escuelas (todas)".
function destinatarios(c) {
  if (c.todos) return ['Todo el club'];
  return SECTIONS.flatMap((s) => {
    const on = s.groups.filter((g) => c.groups.includes(g.id));
    if (!on.length) return [];
    return on.length === s.groups.length ? [`${s.name} (todas)`] : on.map((g) => `${s.name} · ${g.name}`);
  });
}
import { prettyDate } from '@/lib/dates';

const when = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date(iso));

export default function ComunicadoList({ items, empty }) {
  if (!items.length) return <div className="card muted small">{empty}</div>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((c) => (
        <div key={c.id} className="card" style={{ borderLeft: '5px solid var(--orange)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <b style={{ flex: 1 }}>{c.titulo}</b>
            <span className="small muted">{when(c.at)}</span>
          </div>
          {c.fecha && <div className="small" style={{ color: 'var(--orange-d)', fontWeight: 600, marginTop: 4 }}>📅 {prettyDate(c.fecha)}</div>}
          <p style={{ whiteSpace: 'pre-line', margin: '6px 0' }}>{c.mensaje}</p>
          <div>{destinatarios(c).map((t) => <span key={t} className="tag">{t}</span>)}</div>
        </div>
      ))}
    </div>
  );
}
