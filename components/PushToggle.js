'use client';
import { useEffect, useState } from 'react';
import { subscribePushAction, unsubscribePushAction } from '@/app/actions';


function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
}

// Activa o desactiva las notificaciones de la app en ESTE dispositivo.
export default function PushToggle({ compact, publicKey: KEY }) {
  const [state, setState] = useState('cargando'); // cargando | no-soportado | ios-instalar | off | on | bloqueado
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !KEY) {
        setState(ios && !standalone ? 'ios-instalar' : 'no-soportado'); return;
      }
      if (Notification.permission === 'denied') { setState('bloqueado'); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    })().catch(() => setState('no-soportado'));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'bloqueado' : 'off'); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY) });
      await subscribePushAction(JSON.parse(JSON.stringify(sub)));
      setState('on');
    } catch (e) {
      alert('No se pudieron activar las notificaciones: ' + e.message);
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await unsubscribePushAction(sub.endpoint); await sub.unsubscribe(); }
      setState('off');
    } finally { setBusy(false); }
  }

  const msg = {
    cargando: null,
    'no-soportado': 'Este navegador no admite notificaciones. Recibirás los avisos dentro de la app y por email si lo activas.',
    'ios-instalar': 'En iPhone, para recibir notificaciones primero añade la app a la pantalla de inicio (Compartir → “Añadir a pantalla de inicio”) y ábrela desde ahí.',
    bloqueado: 'Las notificaciones están bloqueadas para esta web. Actívalas en los ajustes del navegador o del móvil.',
  }[state];

  if (state === 'cargando') return null;
  if (msg) return <p className="note small" style={{ margin: 0 }}>🔕 {msg}</p>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {state === 'on'
        ? <><span className="tag ok">🔔 Notificaciones activadas en este móvil</span>{!compact && <button className="btn ghost" style={{ padding: '6px 12px' }} disabled={busy} onClick={disable}>Desactivar</button>}</>
        : <button className="btn" disabled={busy} onClick={enable}>🔔 Activar notificaciones en este móvil</button>}
    </div>
  );
}
