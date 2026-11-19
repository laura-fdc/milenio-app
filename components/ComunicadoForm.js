'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { comunicadoAction } from '@/app/actions';

const PLANTILLAS = [
  { t: 'Cambio de horario', m: 'Os informamos de que el entrenamiento cambia de horario. El nuevo horario será: ' },
  { t: 'No hay entrenamiento por festivo', m: 'Con motivo del festivo, ese día no habrá entrenamiento. Retomamos la actividad con normalidad en la siguiente sesión.' },
  { t: 'Pista cerrada', m: 'La pista de hielo estará cerrada y se suspende el entrenamiento. Disculpad las molestias.' },
];

export default function ComunicadoForm({ sections }) {
  const router = useRouter();
  const [todos, setTodos] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('todos', todos ? '1' : '0');
    if (!confirm(todos ? '¿Enviar este comunicado a TODO el club?' : '¿Enviar este comunicado a los grupos marcados?')) return;
    setBusy(true); setRes(null);
    const r = await comunicadoAction(fd).catch((er) => ({ error: er.message }));
    setBusy(false); setRes(r);
    if (r?.ok) { form.reset(); setTitulo(''); setMensaje(''); setTodos(true); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="card stack">
      <div className="toolbar" style={{ margin: 0 }}>
        {PLANTILLAS.map((p) => (
          <button key={p.t} type="button" className="btn ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { setTitulo(p.t); setMensaje(p.m); }}>{p.t}</button>
        ))}
      </div>
      <div className="form-grid">
        <label className="full">Título
          <input type="text" name="titulo" required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label>Día afectado (opcional)
          <input type="date" name="fecha" />
        </label>
        <label className="full">Mensaje
          <textarea name="mensaje" rows={4} required maxLength={3000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </label>
      </div>
      <div>
        <div className="lbl" style={{ marginBottom: 6 }}>¿A quién?</div>
        <label className="check"><input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} /> Todo el club</label>
        {!todos && sections.map((s) => (
          <div key={s.id} style={{ margin: '8px 0 0 4px' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.ico} {s.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
              {s.groups.map((g) => <label key={g.id} className="check small"><input type="checkbox" name="groups" value={g.id} /> {g.name}</label>)}
            </div>
          </div>
        ))}
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Enviando…' : '📢 Enviar por la app y por email'}</button>
      {res?.error && <p className="note err" style={{ margin: 0 }}>{res.error}</p>}
      {res?.ok && (
        <p className="note okn" style={{ margin: 0 }}>
          ✅ Enviado a {res.socios} socios ({res.cuentas} correos/cuentas). Notificaciones push: {res.push}. Emails: {res.emailConfigurado ? res.email : 'email sin configurar'}.
        </p>
      )}
    </form>
  );
}
