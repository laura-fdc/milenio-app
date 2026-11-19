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

  async function onFile(list) {
    const fs = [...(list || [])].slice(0, 2);
    if (!fs.length) return;
    setFile(fs); setBusy(true); setRes(null);
    const fd = new FormData();
    fs.forEach((f) => fd.append('file', f));
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
        {res.ocr && (
          <p className="note small">✍️ Ficha escrita a mano leída con Google Vision{res.anchors < 3 ? ' (la imagen no se ha podido alinear bien: revisa con cuidado)' : ''}. <b>Comprueba todos los datos</b>: la letra a mano puede leerse mal.</p>
        )}
        {res.filled === 0 && (
          <p className="note err">No se ha leído ningún dato{res.ocr ? '' : ': parece una ficha escaneada o rellenada a mano y la lectura a mano no está configurada'}. Completa los datos en el formulario; el archivo se guardará adjunto.</p>
        )}
        <p className="small muted">📄 {file?.map((f) => f.name).join(' + ')} · {res.filled} campos leídos</p>
        <MemberForm key={file?.[0]?.name + res.suggestedId} initial={member} auto={auto} files={file}
          originalId={res.existing?.id || null} onCancel={reset} submitLabel={res.existing ? 'Actualizar ficha' : 'Crear socio'} />
      </>
    );
  }

  return (
    <>
      <label className="drop">
        <div className="ico">{busy ? '⏳' : '📄'}</div>
        <b>{busy ? 'Leyendo ficha…' : 'Pulsa para elegir el PDF o hacer fotos'}</b>
        <div className="muted small">PDF rellenable o escaneado, o 1–2 fotos (ficha + anexo deportivo)</div>
        <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="hidden" onChange={(e) => onFile(e.target.files)} disabled={busy} />
      </label>
      {res?.error && <p className="note err" style={{ marginTop: 12 }}>{res.error}</p>}
      <p className="small muted" style={{ marginTop: 14 }}>
        Si el DNI o el nombre coinciden con un socio existente, se actualizará esa ficha. ¿Ficha en papel? <Link href="/gestion/nuevo" style={{ color: 'var(--orange-d)', fontWeight: 600 }}>Créala a mano</Link>.
      </p>
    </>
  );
}
