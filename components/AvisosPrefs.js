'use client';
import { useState } from 'react';
import { saveAvisosAction } from '@/app/actions';
import PushToggle from './PushToggle';

export default function AvisosPrefs({ memberId, initial, emails, emailActivo, publicKey }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleEmail = (e, on) => setP((x) => ({ ...x, emails: on ? [...new Set([...x.emails, e])] : x.emails.filter((y) => y !== e) }));

  async function save() {
    setBusy(true); setMsg('');
    try {
      await saveAvisosAction(memberId, p.email && !p.emails.length ? { ...p, emails: emails.slice(0, 1) } : p);
      if (p.email && !p.emails.length) setP((x) => ({ ...x, emails: emails.slice(0, 1) }));
      setMsg('✅ Guardado');
    } catch { setMsg('No se pudo guardar'); }
    setBusy(false);
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>Cuando no asista a una clase (se marque ❌ al pasar lista), ¿cómo quieres que te avisemos?</p>
      <label className="check"><input type="checkbox" checked={p.app} onChange={(e) => setP({ ...p, app: e.target.checked })} /> 📱 Notificación en la app</label>
      {p.app && <div style={{ marginLeft: 28 }} className="stack"><PushToggle compact publicKey={publicKey} /><a href="/notificaciones" className="small" style={{ color: 'var(--orange-d)', fontWeight: 600 }}>¿No te llegan? Probar notificaciones</a></div>}
      <label className="check"><input type="checkbox" checked={p.email} onChange={(e) => setP({ ...p, email: e.target.checked })} disabled={!emails.length} /> ✉️ Email</label>
      {p.email && (
        <div style={{ marginLeft: 28, display: 'grid', gap: 6 }}>
          {emails.map((e) => (
            <label key={e} className="check small"><input type="checkbox" checked={p.emails.includes(e)} onChange={(ev) => toggleEmail(e, ev.target.checked)} /> {e}</label>
          ))}
          {!emailActivo && <span className="small muted">(El club aún está configurando el envío de emails.)</span>}
        </div>
      )}
      {!emails.length && <span className="small muted">No hay ningún email en la ficha. Pide al club que lo añada.</span>}
      <div className="toolbar" style={{ margin: 0 }}>
        <button className="btn" disabled={busy} onClick={save}>Guardar avisos</button>
        {msg && <span className="small">{msg}</span>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Los comunicados del club (cambios de horario, festivos…) llegan siempre por la app y por email.</p>
    </div>
  );
}
