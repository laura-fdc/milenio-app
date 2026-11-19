'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportarAusenciaAction, cancelarAusenciaAction } from '@/app/actions';

// options: [{ value: 'gid|fecha', label }], existing: [{ gid, date, label, motivo }]
export default function AusenciaForm({ memberId, options, existing }) {
  const router = useRouter();
  const [sel, setSel] = useState(options[0]?.value || '');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const taken = new Set(existing.map((e) => `${e.gid}|${e.date}`));
  const avail = options.filter((o) => !taken.has(o.value));
  const current = avail.some((o) => o.value === sel) ? sel : avail[0]?.value;

  async function send(e) {
    e.preventDefault();
    if (!current) return;
    setBusy(true); setMsg(null);
    const [gid, date] = current.split('|');
    const r = await reportarAusenciaAction(memberId, gid, date, motivo).catch((er) => ({ error: er.message }));
    setBusy(false);
    if (r?.error) return setMsg({ err: true, t: r.error });
    setMsg({ t: '✅ Aviso enviado. Al pasar lista aparecerá que no podrá ir.' });
    setMotivo('');
    router.refresh();
  }

  async function cancel(gid, date) {
    if (!confirm('¿Quitar este aviso de ausencia?')) return;
    await cancelarAusenciaAction(memberId, gid, date);
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      {avail.length ? (
        <form onSubmit={send} className="stack" style={{ gap: 8 }}>
          <label className="lbl">¿Qué clase no podrá hacer?
            <select value={current} onChange={(e) => setSel(e.target.value)}>
              {avail.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="lbl">Motivo (opcional)
            <input type="text" value={motivo} maxLength={200} placeholder="Enfermedad, viaje, examen…" onChange={(e) => setMotivo(e.target.value)} />
          </label>
          <button className="btn" disabled={busy}>{busy ? 'Enviando…' : '🙋 Avisar de que no irá'}</button>
        </form>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>No hay clases próximas para avisar.</p>
      )}
      {msg && <p className={`note small ${msg.err ? 'err' : 'okn'}`} style={{ margin: 0 }}>{msg.t}</p>}
      {existing.length > 0 && (
        <div className="list">
          {existing.map((e) => (
            <div key={e.gid + e.date} className="row">
              <div className="who"><b>{e.label}</b><small>{e.motivo || 'Sin motivo'}</small></div>
              {e.cancelable && <button className="btn ghost" style={{ padding: '6px 10px' }} onClick={() => cancel(e.gid, e.date)}>Quitar</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
