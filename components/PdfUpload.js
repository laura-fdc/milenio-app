'use client';
import { useState } from 'react';
import Link from 'next/link';
import { parsePdfAction } from '@/app/actions';
import MemberForm from './MemberForm';

// Junta los datos actuales del socio con los no vacíos del PDF y devuelve qué campos vienen del PDF.
function merge(existing, parsed) {
  const out = structuredClone(existing || {});
  const auto = [];
  const walk = (src, dst, prefix) => {
    for (const [k, v] of Object.entries(src)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (k === 'inscripciones') continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        dst[k] = dst[k] && typeof dst[k] === 'object' ? dst[k] : {};
        walk(v, dst[k], path);
      } else if (v !== '' && v !== null && v !== undefined && v !== false) {
        dst[k] = v; auto.push(path);
      } else if (dst[k] === undefined) dst[k] = v;
    }
  };
  walk(parsed, out, '');
  if (parsed.inscripciones?.length) { out.inscripciones = parsed.inscripciones; }
  return { member: out, auto };
}

export default function PdfUpload({ forceId }) {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onFile(f) {
    if (!f) return;
    setFile(f); setBusy(true); setRes(null);
    const fd = new FormData();
    fd.set('file', f);
    try { setRes(await parsePdfAction(fd)); } catch (e) { setRes({ error: e.message }); }
    setBusy(false);
  }

  const reset = () => { setFile(null); setRes(null); };

  if (res && !res.error) {
    const { member, auto } = merge(res.existing, res.member);
    member.id = forceId || res.existing?.id || res.suggestedId;
    return (
      <>
        {res.existing ? (
          <p className="note">🔄 Esta ficha coincide con <b>{res.existing.nombre} ({res.existing.id})</b>: al guardar se <b>actualizarán</b> sus datos.</p>
        ) : (
          <p className="note okn">🆕 Socio nuevo. Se le asignará el ID <b>{member.id}</b> (puedes cambiarlo).</p>
        )}
        {res.filled === 0 && (
          <p className="note err">No se ha leído ningún dato: parece una ficha escaneada o rellenada a mano. Completa los datos en el formulario; el PDF se guardará adjunto.</p>
        )}
        <p className="small muted">📄 {file?.name} · {res.filled} campos leídos</p>
        <MemberForm key={file?.name + res.suggestedId} initial={member} auto={auto} file={file}
          originalId={res.existing?.id || null} onCancel={reset} submitLabel={res.existing ? 'Actualizar ficha' : 'Crear socio'} />
      </>
    );
  }

  return (
    <>
      <label className="drop">
        <div className="ico">{busy ? '⏳' : '📄'}</div>
        <b>{busy ? 'Leyendo ficha…' : 'Pulsa para elegir el PDF'}</b>
        <div className="muted small">Ficha + anexo deportivo · rellenable (se lee sola) o escaneada (se completa a mano)</div>
        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
      </label>
      {res?.error && <p className="note err" style={{ marginTop: 12 }}>{res.error}</p>}
      <p className="small muted" style={{ marginTop: 14 }}>
        Si el DNI o el nombre coinciden con un socio existente, se actualizará esa ficha. ¿Ficha en papel? <Link href="/gestion/nuevo" style={{ color: 'var(--orange-d)', fontWeight: 600 }}>Créala a mano</Link>.
      </p>
    </>
  );
}
