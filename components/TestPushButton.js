'use client';
import { useState } from 'react';
import { testPushAction } from '@/app/actions';

const explica = (r) => {
  if (r.ok) return 'Enviada al servicio de notificaciones ✅';
  if (r.status === 403) return 'Rechazada (403): las claves VAPID no coinciden con las que usó el móvil al suscribirse. Desactiva y vuelve a activar las notificaciones.';
  if (r.status === 404 || r.status === 410) return 'Suscripción caducada: se ha borrado. Vuelve a activar las notificaciones.';
  if (r.status === 400) return 'Petición no válida (400): revisa las claves VAPID.';
  return `Error ${r.status ?? ''}: ${r.error || 'desconocido'}`;
};

export default function TestPushButton() {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setRes(null);
    try { setRes(await testPushAction()); } catch (e) { setRes({ error: e.message, results: [] }); }
    setBusy(false);
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <button className="btn" disabled={busy} onClick={run}>{busy ? 'Enviando…' : '📨 Enviarme una notificación de prueba'}</button>
      {res && (
        <>
          {res.error && <p className="note err small" style={{ margin: 0 }}>{res.error}</p>}
          {!res.error && !res.results?.length && <p className="note err small" style={{ margin: 0 }}>No hay ningún móvil suscrito con {res.email}. Pulsa primero “Activar notificaciones en este móvil”.</p>}
          {res.results?.map((r, i) => (
            <p key={i} className={`note small ${r.ok ? 'okn' : 'err'}`} style={{ margin: 0 }}>{r.host}: {explica(r)}</p>
          ))}
          {res.sent > 0 && <p className="small muted" style={{ margin: 0 }}>Si el servidor dice ✅ pero no ves nada: revisa que el móvil no esté en “No molestar” y que la app tenga permiso de notificaciones en los Ajustes del móvil.</p>}
        </>
      )}
    </div>
  );
}
