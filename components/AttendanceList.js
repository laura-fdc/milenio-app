'use client';
import { useState, useTransition } from 'react';
import { toggleAttendance, markAll } from '@/app/actions';
import { initials } from '@/lib/view';

export default function AttendanceList({ gid, fecha, initial, members }) {
  const [att, setAtt] = useState(() => {
    const o = {};
    for (const [k, v] of Object.entries(initial || {})) o[k] = Number(v) === 1;
    return o;
  });
  const [err, setErr] = useState('');
  const [, start] = useTransition();

  const set = (id, val) => {
    const prev = att[id];
    const next = prev === val ? null : val; // pulsar otra vez quita la marca
    setAtt((a) => { const c = { ...a }; if (next === null) delete c[id]; else c[id] = next; return c; });
    start(async () => {
      try { await toggleAttendance(gid, fecha, id, next); setErr(''); }
      catch { setErr('No se pudo guardar. Revisa la conexión.'); setAtt((a) => ({ ...a, [id]: prev })); }
    });
  };

  const allPresent = () => {
    const ids = members.filter((m) => att[m.id] === undefined).map((m) => m.id);
    if (!ids.length) return;
    setAtt((a) => ({ ...a, ...Object.fromEntries(ids.map((id) => [id, true])) }));
    start(async () => {
      try { await markAll(gid, fecha, ids, true); setErr(''); } catch { setErr('No se pudo guardar.'); }
    });
  };

  const yes = members.filter((m) => att[m.id] === true).length;
  const no = members.filter((m) => att[m.id] === false).length;

  if (!members.length) return <div className="card muted">No hay nadie apuntado a este día.</div>;

  return (
    <>
      <div className="sticky-sum">
        <div className="toolbar" style={{ margin: 0 }}>
          <span className="tag ok">✅ {yes}</span>
          <span className="tag warn">❌ {no}</span>
          <span className="tag">Sin marcar {members.length - yes - no}</span>
          <button className="btn ghost" style={{ marginLeft: 'auto', padding: '8px 12px' }} onClick={allPresent}>
            Resto presentes
          </button>
        </div>
        {err && <p className="note err" style={{ margin: '8px 0 0' }}>{err}</p>}
      </div>
      <div className="list">
        {members.map((m) => (
          <div className="row" key={m.id}>
            <div className="mini-av">{initials(m.nombre)}</div>
            <div className="who">
              <b>{m.nombre}</b>
              <small>{m.id}{m.edad != null ? ` · ${m.edad} años` : ''}{m.observaciones ? ` · ⚠️ ${m.observaciones}` : ''}</small>
            </div>
            <div className="toggle">
              <button aria-label="Presente" className={`yes ${att[m.id] === true ? 'on' : ''}`} onClick={() => set(m.id, true)}>✓</button>
              <button aria-label="Ausente" className={`no ${att[m.id] === false ? 'on' : ''}`} onClick={() => set(m.id, false)}>✗</button>
            </div>
          </div>
        ))}
      </div>
      <p className="small muted">Se guarda automáticamente al marcar.</p>
    </>
  );
}
