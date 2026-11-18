'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SECTIONS } from '@/lib/catalog';
import { saveMemberAction } from '@/app/actions';

const EMPTY_T = { nombre: '', dni: '', mail: '', telefono: '' };

export default function MemberForm({ initial, auto = [], file = null, originalId = null, submitLabel = 'Guardar ficha', onCancel }) {
  const router = useRouter();
  const [m, setM] = useState(() => ({
    inscripciones: [], ...initial,
    tutor1: { ...EMPTY_T, ...(initial?.tutor1 || {}) }, tutor2: { ...EMPTY_T, ...(initial?.tutor2 || {}) },
  }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const autoSet = new Set(auto);

  const set = (path, v) => setM((p) => {
    const c = structuredClone(p);
    const ks = path.split('.');
    let o = c;
    ks.slice(0, -1).forEach((k) => (o = o[k]));
    o[ks.at(-1)] = v;
    return c;
  });
  const val = (path) => path.split('.').reduce((o, k) => o?.[k], m) ?? '';
  const cls = (path) => (autoSet.has(path) ? 'auto' : '');

  const T = ({ k, label, type = 'text', full }) => (
    <label className={full ? 'full' : ''}>{label}
      <input type={type} className={cls(k)} value={val(k)} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const YN = ({ k, label }) => (
    <label>{label}
      <select value={m[k] === true ? 'si' : m[k] === false ? 'no' : ''} className={cls(k)}
        onChange={(e) => set(k, e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}>
        <option value="">—</option><option value="si">Sí</option><option value="no">No</option>
      </select>
    </label>
  );
  const C = ({ k, label }) => (
    <label className="check"><input type="checkbox" checked={!!m[k]} onChange={(e) => set(k, e.target.checked)} /> {label}</label>
  );

  const enr = (gid) => m.inscripciones.find((i) => i.gid === gid);
  const toggleGroup = (g, on) => setM((p) => ({
    ...p,
    inscripciones: on
      ? [...p.inscripciones, { gid: g.id, dias: g.sessions.length <= 3 ? g.sessions.map((s) => s.id) : [] }]
      : p.inscripciones.filter((i) => i.gid !== g.id),
  }));
  const toggleDay = (gid, sid, on) => setM((p) => ({
    ...p,
    inscripciones: p.inscripciones.map((i) => i.gid !== gid ? i : { ...i, dias: on ? [...new Set([...i.dias, sid])] : i.dias.filter((d) => d !== sid) }),
  }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const fd = new FormData();
    const { sugerido, ...data } = m;
    data.inscripciones = data.inscripciones.map(({ gid, dias }) => ({ gid, dias }));
    fd.set('data', JSON.stringify(data));
    if (originalId) fd.set('originalId', originalId);
    if (file) fd.set('file', file);
    try {
      const r = await saveMemberAction(fd);
      if (r?.error) { setMsg({ err: true, t: r.error }); setBusy(false); return; }
      if (r?.warning) alert(r.warning);
      router.push(`/socios/${encodeURIComponent(r.id)}`);
      router.refresh();
    } catch (er) {
      setMsg({ err: true, t: 'No se pudo guardar: ' + er.message }); setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {auto.length > 0 && (
        <p className="note small" style={{ margin: 0 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, outline: '2px solid #BFE8CE', marginRight: 6 }} />
          Recuadro verde = leído del PDF. Revisa y completa el resto antes de guardar.
        </p>
      )}

      <div className="card">
        <h4>Socio</h4>
        <div className="form-grid">
          {T({ k: 'id', label: 'ID socio *' })}
          {T({ k: 'nombre', label: 'Nombre y apellidos *' })}
          {T({ k: 'dni', label: 'DNI' })}
          <label>Fecha de nacimiento
            <input type="date" className={cls('nacimiento')} value={val('nacimiento')} onChange={(e) => set('nacimiento', e.target.value)} />
          </label>
          {!m.nacimiento && T({ k: 'edad', label: 'Edad (si no hay fecha)', type: 'number' })}
          {T({ k: 'pais', label: 'País de nacimiento' })}
          {T({ k: 'nacionalidad', label: 'Nacionalidad' })}
          {T({ k: 'domicilio', label: 'Domicilio' })}
          {T({ k: 'localidad', label: 'Localidad' })}
          {T({ k: 'provincia', label: 'Provincia' })}
          {T({ k: 'cp', label: 'Código postal' })}
          {T({ k: 'telefono', label: 'Teléfono', type: 'tel' })}
          {T({ k: 'mail', label: 'Mail', type: 'email' })}
        </div>
      </div>

      <div className="card">
        <h4>Tutores (menores de edad)</h4>
        <div className="form-grid">
          {T({ k: 'tutor1.nombre', label: 'Tutor 1 · Nombre' })}
          {T({ k: 'tutor1.dni', label: 'Tutor 1 · DNI' })}
          {T({ k: 'tutor1.mail', label: 'Tutor 1 · Mail', type: 'email' })}
          {T({ k: 'tutor1.telefono', label: 'Tutor 1 · Teléfono', type: 'tel' })}
          {T({ k: 'tutor2.nombre', label: 'Tutor 2 · Nombre' })}
          {T({ k: 'tutor2.dni', label: 'Tutor 2 · DNI' })}
          {T({ k: 'tutor2.mail', label: 'Tutor 2 · Mail', type: 'email' })}
          {T({ k: 'tutor2.telefono', label: 'Tutor 2 · Teléfono', type: 'tel' })}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Los mails de deportista y tutores son los que podrán entrar con Google para ver esta ficha.</p>
      </div>

      <div className="card">
        <h4>Grupos y días (anexo deportivo)</h4>
        <div className="stack">
          {SECTIONS.map((s) => (
            <div key={s.id}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.ico} {s.name}</div>
              {s.groups.map((g) => {
                const e = enr(g.id);
                return (
                  <div key={g.id} style={{ marginBottom: 6 }}>
                    <label className="check">
                      <input type="checkbox" checked={!!e} onChange={(ev) => toggleGroup(g, ev.target.checked)} />
                      {g.name} <span className="muted small">· {g.price}</span>
                      {e && initial?.inscripciones?.find((i) => i.gid === g.id)?.sugerido && <span className="tag">sugerido</span>}
                    </label>
                    {e && g.sessions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', margin: '4px 0 6px 28px' }}>
                        {g.sessions.map((ss) => (
                          <label key={ss.id} className="check small">
                            <input type="checkbox" checked={e.dias.includes(ss.id)} onChange={(ev) => toggleDay(g.id, ss.id, ev.target.checked)} />
                            {ss.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h4>Datos bancarios</h4>
        <div className="form-grid">
          {T({ k: 'iban', label: 'Cuenta (IBAN)' })}
          {T({ k: 'titular', label: 'Titular de la cuenta' })}
        </div>
      </div>

      <div className="card">
        <h4>Otros datos</h4>
        <div className="form-grid">
          {YN({ k: 'hermanos', label: 'Hermanos en el club' })}
          {YN({ k: 'abonado', label: '¿Abonado Logroño Deporte?' })}
          {T({ k: 'numAbonado', label: 'Nº abonado' })}
          {T({ k: 'conocio', label: '¿Cómo nos conociste?' })}
          <label className="full">Observaciones (enfermedades, lesiones…)
            <textarea rows={3} className={cls('observaciones')} value={val('observaciones')} onChange={(e) => set('observaciones', e.target.value)} />
          </label>
        </div>
        <div className="stack" style={{ marginTop: 12, gap: 8 }}>
          {C({ k: 'socioNuevo', label: 'Socio nuevo (quiere inscribirse)' })}
          {C({ k: 'actualizarDatos', label: 'Ya socio: actualizar datos personales' })}
          {C({ k: 'actualizarDisciplina', label: 'Ya socio: actualizar disciplina y/o días' })}
          {C({ k: 'noDifusion', label: 'NO desea estar en grupos de comunicación y difusión' })}
          {C({ k: 'imagenTutor1', label: 'Consentimiento de imagen (interesado/tutor 1)' })}
          {C({ k: 'imagenTutor2', label: 'Consentimiento de imagen (tutor 2)' })}
        </div>
      </div>

      {msg && <p className={`note ${msg.err ? 'err' : 'okn'}`}>{msg.t}</p>}
      <div className="toolbar">
        <button className="btn" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
        {onCancel ? <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
          : <button type="button" className="btn ghost" onClick={() => router.back()}>Cancelar</button>}
      </div>
    </form>
  );
}
