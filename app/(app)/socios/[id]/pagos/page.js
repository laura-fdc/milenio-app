import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getMember, getPagos, getDocs } from '@/lib/db';
import { todayMadrid } from '@/lib/dates';
import { fmtDate } from '@/lib/view';
import PagosManager from '@/components/PagosManager';

export default async function PagosSocio({ params }) {
  const { id } = await params;
  await requireUser(['root']);
  const m = await getMember(decodeURIComponent(id));
  if (!m) notFound();
  const pagos = await getPagos(m.id);
  const docs = await getDocs(m.id);
  const pagadores = [
    m.tutor1?.nombre && { label: `Tutor 1 · ${m.tutor1.nombre}`, nombre: m.tutor1.nombre, dni: m.tutor1.dni || '' },
    m.tutor2?.nombre && { label: `Tutor 2 · ${m.tutor2.nombre}`, nombre: m.tutor2.nombre, dni: m.tutor2.dni || '' },
    { label: `Deportista · ${m.nombre}`, nombre: m.nombre, dni: m.dni || '' },
  ].filter(Boolean);
  const direccion = [m.domicilio, m.cp, m.localidad, m.provincia].filter(Boolean).join(', ');

  return (
    <>
      <div className="crumbs"><Link href="/socios">Socios</Link> › <Link href={`/socios/${encodeURIComponent(m.id)}`}>{m.id}</Link> › Pagos</div>
      <h1>Pagos · {m.nombre}</h1>
      <PagosManager
        memberId={m.id}
        pagos={pagos}
        today={todayMadrid()}
        socio={{ nombre: m.nombre, dni: m.dni || '', nacimiento: m.nacimiento || '' }}
        pagadores={pagadores}
        direccion={direccion}
      />
      <h2>Documentos emitidos</h2>
      {!docs.length ? <div className="card muted small">Todavía no se ha emitido ningún documento.</div> : (
        <div className="list">
          {docs.map((d) => (
            <a key={d.numero} className="row" target="_blank" href={`/api/doc/${encodeURIComponent(m.id)}/${encodeURIComponent(d.numero)}`}>
              <div className="mini-av">{d.tipo === 'factura' ? '🧾' : '📄'}</div>
              <div className="who"><b>{d.tipo === 'factura' ? 'Factura' : 'Justificante'} {d.numero}</b><small>{fmtDate(d.fecha)} · {d.lineas.length} conceptos · {d.total.toFixed(2).replace('.', ',')} €{d.pagador?.nombre ? ` · ${d.pagador.nombre}` : ''}</small></div>
              <span className="chev">⬇</span>
            </a>
          ))}
        </div>
      )}
      <p className="small muted">La familia puede descargar estos documentos desde la ficha en su app.</p>
    </>
  );
}
