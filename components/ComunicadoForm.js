'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { comunicadoAction } from '@/app/actions';

const PLANTILLAS = [
  { t: 'Cambio de horario', m: 'Os informamos de que el entrenamiento cambia de horario. El nuevo horario será: ' },
  { t: 'No hay entrenamiento por festivo', m: 'Con motivo del festivo, ese día no habrá entrenamiento. Retomamos la actividad con normalidad en la siguiente sesión.' },
  { t: 'Pista cerrada', m: 'La pista de hielo estará cerrada y se suspende el entrenamiento. Disculpad las molestias.' },
];

// Casilla que puede mostrarse "a medias" cuando solo hay algunos subgrupos marcados.
function TriCheck({ checked, partial, onChange, children, big }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = partial && !checked; }, [partial, checked]);
  return (
    <label className="check" style={big ? { fontWeight: 700 } : undefined}>
      <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {children}
    </label>
  );
}

export default function ComunicadoForm({ sections }) {
  const router = useRouter();
  const allIds = sections.flatMap((s) => s.groups.map((g) => g.id));
  const [sel, setSel] = useState(() => new Set(allIds));
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const todos = sel.size === allIds.length;
  const setMany = (ids, on) => setSel((s) => { const c = new Set(s); ids.forEach((id) => (on ? c.add(id) : c.delete(id))); return c; });

  const resumen = todos
    ? 'Todo el club'
    : sections.map((s) => {
        const on = s.groups.filter((g) => sel.has(g.id));
        if (!on.length) return null;
        return on.length === s.groups.length ? `${s.name} (todas)` : `${s.name}: ${on.map((g) => g.name).join(', ')}`;
      }).filter(Boolean).join(' · ') || 'Nadie';

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!sel.size) { setRes({ error: 'Elige a quién va dirigido' }); return; }
    const fd = new FormData(form);
    fd.set('todos', todos ? '1' : '0');
    fd.delete('groups');
    if (!todos) sel.forEach((id) => fd.append('groups', id));
    if (!confirm(`¿Enviar este comunicado a: ${resumen}?`)) return;
    setBusy(true); setRes(null);
    const r = await comunicadoAction(fd).catch((er) => ({ error: er.message }));
    setBusy(false); setRes(r);
    if (r?.ok) { form.reset(); setTitulo(''); setMensaje(''); setSel(new Set(allIds)); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="card stack">
      <div className="toolbar" style={{ margin: 0 }}>
        {PLANTILLAS.map((p) => (
          <button key={p.t} type="button" className="btn ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { setTitulo(p.t); setMensaje(p.m); }}>{p.t}</button>
        ))}
      </div>
      <div className="form-grid">
        <label className="full">Título
          <input type="text" name="titulo" required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label>Día afectado (opcional)
          <input type="date" name="fecha" />
        </label>
        <label className="full">Mensaje
          <textarea name="mensaje" rows={4} required maxLength={3000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </label>
      </div>

      <div>
        <div className="lbl" style={{ marginBottom: 8 }}>¿A quién?</div>
        <TriCheck big checked={todos} partial={sel.size > 0} onChange={(on) => setSel(new Set(on ? allIds : []))}>🏟️ Todo el club</TriCheck>
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {sections.map((s) => {
            const ids = s.groups.map((g) => g.id);
            const n = ids.filter((id) => sel.has(id)).length;
            return (
              <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
                <TriCheck big checked={n === ids.length} partial={n > 0} onChange={(on) => setMany(ids, on)}>
                  {s.ico} {s.name} <span className="small muted" style={{ fontWeight: 500 }}>· todas</span>
                </TriCheck>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', margin: '6px 0 0 28px' }}>
                  {s.groups.map((g) => (
                    <label key={g.id} className="check small">
                      <input type="checkbox" checked={sel.has(g.id)} onChange={(e) => setMany([g.id], e.target.checked)} /> {g.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="small" style={{ margin: '8px 0 0' }}>Se enviará a: <b>{resumen}</b></p>
      </div>

      <button className="btn" disabled={busy || !sel.size}>{busy ? 'Enviando…' : '📢 Enviar por la app y por email'}</button>
      {res?.error && <p className="note err" style={{ margin: 0 }}>{res.error}</p>}
      {res?.ok && (
        <p className="note okn" style={{ margin: 0 }}>
          ✅ Enviado a {res.socios} socios ({res.cuentas} correos/cuentas). Notificaciones push: {res.push}. Emails: {res.emailConfigurado ? res.email : 'email sin configurar'}.
        </p>
      )}
    </form>
  );
}
