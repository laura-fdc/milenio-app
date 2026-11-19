import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { getPushSubs, getFeed } from '@/lib/db';
import { pushConfigured, checkVapid, vapidPublicKey } from '@/lib/notify';
import PushToggle from '@/components/PushToggle';
import TestPushButton from '@/components/TestPushButton';

const when = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date(iso));
const servicio = (h) => (h.includes('apple') ? 'iPhone / Safari' : h.includes('googleapis') ? 'Android / Chrome' : h.includes('mozilla') ? 'Firefox' : h.includes('windows') ? 'Edge' : h);

export default async function Notificaciones() {
  const user = await requireUser();
  const subs = await getPushSubs(user.email);
  const feed = (await getFeed(user.email)).slice(0, 8);
  const vapid = user.role === 'root' ? checkVapid() : null;

  return (
    <>
      {user.role === 'root' && <div className="crumbs"><Link href="/gestion">Gestión</Link> › Notificaciones</div>}
      <h1>🔔 Probar notificaciones</h1>

      {vapid && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4>Configuración del servidor</h4>
          <div className="toolbar" style={{ margin: 0 }}>
            <span className={`tag ${pushConfigured() ? 'ok' : 'warn'}`}>Claves {pushConfigured() ? 'puestas' : 'NO puestas'}</span>
            <span className={`tag ${vapid.formatoOk ? 'ok' : 'warn'}`}>Formato {vapid.formatoOk ? 'correcto' : `incorrecto (pública ${vapid.pubLen}/87, privada ${vapid.privLen}/43 caracteres)`}</span>
            <span className={`tag ${vapid.parejaOk ? 'ok' : 'warn'}`}>{vapid.parejaOk ? 'Pública y privada coinciden' : 'La pública y la privada NO son pareja'}</span>
          </div>
          {!vapid.parejaOk && <p className="note err small" style={{ margin: '10px 0 0' }}>Revisa en Vercel que VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY son las del archivo, sin comillas ni espacios y sin intercambiar. Después haz Redeploy y vuelve a activar las notificaciones en el móvil.</p>}
        </div>
      )}

      <div className="card stack" style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>1 · Este móvil</h4>
        <PushToggle publicKey={vapidPublicKey()} />
        <p className="small muted" style={{ margin: 0 }}>
          Móviles suscritos con <b>{user.email}</b>: <b>{subs.length}</b>
          {subs.length > 0 && <> ({subs.map((s) => { try { return servicio(new URL(s.endpoint).host); } catch { return '?'; } }).join(', ')})</>}
        </p>
      </div>

      <div className="card stack" style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>2 · Enviar una prueba</h4>
        <TestPushButton />
      </div>

      <div className="card">
        <h4>3 · Avisos registrados para tu cuenta</h4>
        <p className="small muted" style={{ marginTop: 0 }}>Aquí aparece todo aviso que la app ha generado para {user.email} (faltas, comunicados), haya llegado o no al móvil.</p>
        {!feed.length ? <p className="small muted">Ninguno todavía. Si pasaste lista o enviaste un comunicado, comprueba que el correo de la ficha es exactamente {user.email}.</p> : (
          <div className="list">
            {feed.map((f) => (
              <div key={f.id} className="row">
                <div className="who"><b>{f.title}</b><small>{f.body.split('\n')[0]}</small></div>
                <span className="small muted">{when(f.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
