'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPagoAction, deletePagoAction, generarDocAction } from '@/app/actions';

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fd8 = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export default function PagosManager({ memberId, pagos, today, socio, pagadores, direccion }) {
  const router = useRouter();
  const [sel, setSel] = useState(() => new Set());
  const [year, setYear] = useState('todos');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tipo, setTipo] = useState('justificante');
  const [pg, setPg] = useState(0);
  const [pagador, setPagador] = useState({ ...pagadores[0], direccion });
  const [datos, setDatos] = useState(socio);

  const years = [...new Set(pagos.map((p) => (p.fecha || '').slice(0, 4)))].sort().reverse();
  const shown = useMemo(() => pagos.filter((p) => year === 'todos' || p.fecha.startsWith(year)), [pagos, year]);
  const total = pagos.filter((p) => sel.has(p.id)).reduce((a, p) => a + p.importe, 0);

  async function add(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setMsg(null);
    const r = await addPagoAction(memberId, new FormData(form)).catch((er) => ({ error: er.message }));
    setBusy(false);
    if (r?.error) return setMsg({ err: true, t: r.error });
    form.reset();
    router.refresh();
  }

  async function del(id) {
    if (!confirm('¿Borrar este pago?')) return;
    await deletePagoAction(memberId, id);
    setSel((s) => { const c = new Set(s); c.delete(id); return c; });
    router.refresh();
  }

  async function generar() {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set('tipo', tipo);
    sel.forEach((id) => fd.append('pagos', id));
    fd.set('pagadorNombre', pagador.nombre || ''); fd.set('pagadorDni', pagador.dni || ''); fd.set('pagadorDireccion', pagador.direccion || '');
    fd.set('nombre', datos.nombre); fd.set('dni', datos.dni); fd.set('nacimiento', datos.nacimiento);
    const r = await generarDocAction(memberId, fd).catch((er) => ({ error: er.message }));
    setBusy(false);
    if (r?.error) return setMsg({ err: true, t: r.error });
    setMsg({ t: `✅ ${tipo === 'factura' ? 'Factura' : 'Justificante'} ${r.numero} generado.` });
    window.open(`/api/doc/${encodeURIComponent(memberId)}/${encodeURIComponent(r.numero)}`, '_blank');
    setSel(new Set());
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="card">
        <h4>Pagos registrados</h4>
        {years.length > 1 && (
          <div className="subtabs">
            {['todos', ...years].map((y) => <a key={y} href="#" onClick={(e) => { e.preventDefault(); setYear(y); }} className={y === year ? 'active' : ''}>{y === 'todos' ? 'Todos' : y}</a>)}
          </div>
        )}
        {!shown.length ? <p className="muted small">No hay pagos. Añádelos abajo o con el Excel de pagos.</p> : (
          <div className="list">
            {shown.map((p) => (
              <label key={p.id} className="row" style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 20, height: 20, accentColor: 'var(--orange)' }} checked={sel.has(p.id)}
                  onChange={(e) => setSel((s) => { const c = new Set(s); e.target.checked ? c.add(p.id) : c.delete(p.id); return c; })} />
                <div className="who"><b>{p.concepto}</b><small>{fd8(p.fecha)}{p.periodo ? ` · ${p.periodo}` : ''}{p.metodo ? ` · ${p.metodo}` : ''}</small></div>
                <b>{eur(p.importe)}</b>
                <button type="button" className="btn ghost" style={{ padding: '4px 8px' }} onClick={(e) => { e.preventDefault(); del(p.id); }} aria-label="Borrar pago">✕</button>
              </label>
            ))}
          </div>
        )}
        {shown.length > 0 && (
          <div className="toolbar" style={{ marginTop: 10 }}>
            <button type="button" className="btn ghost" onClick={() => setSel(new Set(shown.map((p) => p.id)))}>Seleccionar {year === 'todos' ? 'todos' : `todo ${year}`}</button>
            <span className="small">Seleccionado: <b>{eur(total)}</b> ({sel.size})</span>
          </div>
        )}
      </div>

      {sel.size > 0 && (
        <div className="card stack">
          <h4 style={{ margin: 0 }}>Generar documento</h4>
          <div className="subtabs" style={{ margin: 0 }}>
            <a href="#" className={tipo === 'justificante' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setTipo('justificante'); }}>📄 Justificante de pago</a>
            <a href="#" className={tipo === 'factura' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setTipo('factura'); }}>🧾 Factura</a>
          </div>
          <div className="form-grid">
            <label>Nombre del deportista<input type="text" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} /></label>
            <label>DNI del deportista<input type="text" value={datos.dni} onChange={(e) => setDatos({ ...datos, dni: e.target.value })} /></label>
            <label>Fecha de nacimiento<input type="date" value={datos.nacimiento} onChange={(e) => setDatos({ ...datos, nacimiento: e.target.value })} /></label>
            <label>{tipo === 'factura' ? 'Facturar a' : 'Pagador'}
              <select value={pg} onChange={(e) => { const i = Number(e.target.value); setPg(i); setPagador(i < pagadores.length ? { ...pagadores[i], direccion } : { nombre: '', dni: '', direccion: '' }); }}>
                {pagadores.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                <option value={pagadores.length}>Otra persona o empresa…</option>
              </select>
            </label>
            <label>Nombre / razón social<input type="text" value={pagador.nombre} onChange={(e) => setPagador({ ...pagador, nombre: e.target.value })} /></label>
            <label>DNI / NIF<input type="text" value={pagador.dni} onChange={(e) => setPagador({ ...pagador, dni: e.target.value })} /></label>
            <label className="full">Dirección<input type="text" value={pagador.direccion} onChange={(e) => setPagador({ ...pagador, direccion: e.target.value })} /></label>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {tipo === 'factura'
              ? 'La factura lleva numeración correlativa (F-año-nº), NIF del club y mención de exención de IVA. Una vez emitida no se puede borrar.'
              : 'El justificante certifica lo pagado, con nombre, DNI y fecha de nacimiento. Numeración J-año-nº.'}
          </p>
          <button className="btn" disabled={busy} onClick={generar}>{busy ? 'Generando…' : `Generar ${tipo} por ${eur(total)}`}</button>
        </div>
      )}

      {msg && <p className={`note ${msg.err ? 'err' : 'okn'}`} style={{ margin: 0 }}>{msg.t}</p>}

      <form onSubmit={add} className="card">
        <h4>Añadir pago a mano</h4>
        <div className="form-grid">
          <label>Concepto<input type="text" name="concepto" required placeholder="Cuota Escuela Hockey" /></label>
          <label>Periodo<input type="text" name="periodo" placeholder="Octubre 2026" /></label>
          <label>Importe (€)<input type="text" inputMode="decimal" name="importe" required placeholder="55" /></label>
          <label>Fecha de pago<input type="date" name="fecha" required defaultValue={today} /></label>
          <label>Método<input type="text" name="metodo" placeholder="Domiciliación, efectivo…" /></label>
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={busy}>＋ Añadir pago</button>
      </form>
    </div>
  );
}
