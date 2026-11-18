'use client';
import { useState } from 'react';
import Link from 'next/link';
import { excelAction } from '@/app/actions';

export default function ExcelImport() {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(f, apply) {
    setBusy(true);
    const fd = new FormData();
    fd.set('file', f);
    if (apply) fd.set('apply', '1');
    try { setRes(await excelAction(fd)); } catch (e) { setRes({ error: e.message }); }
    setBusy(false);
  }

  return (
    <div className="stack">
      {!res?.applied && (
        <label className="drop">
          <div className="ico">{busy ? '⏳' : '📊'}</div>
          <b>{file ? file.name : 'Pulsa para elegir el Excel (.xlsx)'}</b>
          <div className="muted small">Primero verás los cambios; no se guarda nada hasta que confirmes</div>
          <input type="file" className="hidden" disabled={busy}
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setRes(null); run(f, false); } }} />
        </label>
      )}

      {res?.error && <p className="note err">{res.error}</p>}

      {res?.summary && (
        <>
          {res.applied
            ? <p className="note okn">✅ Importación hecha: {res.changed} socios actualizados{res.created.length ? `, ${res.created.length} nuevos` : ''}.</p>
            : <p className="note">Revisa los cambios. <b>{res.changed}</b> socios cambiarán{res.created.length ? <>, de ellos <b>{res.created.length}</b> son nuevos</> : ''}.</p>}

          <div className="list">
            {res.summary.map((s, i) => (
              <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="who">
                  <b>{s.group}</b>
                  <small>{s.day} · {s.total} en el Excel</small>
                  {s.added.length > 0 && <div className="small" style={{ color: 'var(--ok)', marginTop: 4, whiteSpace: 'normal' }}>＋ {s.added.join(', ')}</div>}
                  {s.removed.length > 0 && <div className="small" style={{ color: 'var(--danger)', marginTop: 4, whiteSpace: 'normal' }}>− {s.removed.join(', ')}</div>}
                  {!s.added.length && !s.removed.length && <div className="small muted" style={{ marginTop: 4 }}>Sin cambios</div>}
                </div>
              </div>
            ))}
          </div>

          {res.created.length > 0 && !res.applied && (
            <p className="small muted">Se crearán fichas básicas (ID, nombre y edad) para: {res.created.map((c) => `${c.nombre} (${c.id})`).join(', ')}. Luego puedes completarlas subiendo su PDF.</p>
          )}
          {res.ignored?.length > 0 && <p className="small muted">Ignorado: {res.ignored.join(' · ')}</p>}

          <div className="toolbar">
            {res.applied ? (
              <>
                <Link className="btn" href="/secciones">Ver secciones</Link>
                <button className="btn ghost" onClick={() => { setRes(null); setFile(null); }}>Importar otro</button>
              </>
            ) : (
              <>
                <button className="btn" disabled={busy || !res.changed} onClick={() => run(file, true)}>{busy ? 'Guardando…' : 'Confirmar importación'}</button>
                <button className="btn ghost" onClick={() => { setRes(null); setFile(null); }}>Cancelar</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
