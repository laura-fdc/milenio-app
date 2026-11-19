'use client';
import { useState } from 'react';
import { importPagosAction } from '@/app/actions';

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function PagosImport() {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(f, apply) {
    setBusy(true);
    const fd = new FormData();
    fd.set('file', f);
    if (apply) fd.set('apply', '1');
    setRes(await importPagosAction(fd).catch((e) => ({ error: e.message })));
    setBusy(false);
  }

  return (
    <div className="stack">
      {!res?.applied && (
        <label className="drop">
          <div className="ico">{busy ? '⏳' : '💶'}</div>
          <b>{file ? file.name : 'Pulsa para elegir el Excel de pagos (.xlsx)'}</b>
          <div className="muted small">Primero verás el resumen; no se guarda nada hasta que confirmes</div>
          <input type="file" className="hidden" disabled={busy} accept=".xlsx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setRes(null); run(f, false); } }} />
        </label>
      )}
      {res?.error && <p className="note err">{res.error}</p>}
      {res?.ok && (
        <>
          <p className={`note ${res.applied ? 'okn' : ''}`}>
            {res.applied ? '✅ Importado: ' : 'Se van a añadir '}
            <b>{res.nuevos}</b> pagos nuevos de <b>{res.socios}</b> socios (total {eur(res.total)}).
            {res.repetidos > 0 && <> {res.repetidos} ya estaban y se ignoran.</>}
          </p>
          {res.unknown.length > 0 && <p className="note err small">IDs que no existen en la app (no se importan): {res.unknown.join(', ')}</p>}
          {res.ignored.length > 0 && <p className="small muted">Ignorado: {res.ignored.join(' · ')}</p>}
          {!res.applied ? (
            <div className="toolbar">
              <button className="btn" disabled={busy || !res.nuevos} onClick={() => run(file, true)}>{busy ? 'Guardando…' : 'Confirmar importación'}</button>
              <button className="btn ghost" onClick={() => { setRes(null); setFile(null); }}>Cancelar</button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => { setRes(null); setFile(null); }}>Importar otro</button>
          )}
        </>
      )}
    </div>
  );
}
