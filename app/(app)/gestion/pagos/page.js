import Link from 'next/link';
import { requireUser } from '@/lib/session';
import PagosImport from '@/components/PagosImport';

export default async function Pagos() {
  await requireUser(['root']);
  return (
    <>
      <div className="crumbs"><Link href="/gestion">Gestión</Link> › Pagos</div>
      <h1>Importar Excel de pagos</h1>
      <p className="muted small" style={{ marginTop: -6 }}>
        Columnas: <b>ID SOCIO</b>, <b>CONCEPTO</b>, <b>PERIODO</b>, <b>IMPORTE</b>, <b>FECHA</b> (de pago) y, si quieres, <b>METODO</b> (domiciliación, efectivo…).
        Puedes volver a subir el mismo Excel ampliado: los pagos que ya estaban no se duplican.
      </p>
      <div className="tablewrap" style={{ marginBottom: 14 }}>
        <table>
          <thead><tr><th>ID SOCIO</th><th>CONCEPTO</th><th>PERIODO</th><th>IMPORTE</th><th>FECHA</th><th>METODO</th></tr></thead>
          <tbody><tr><td>MCP 0036</td><td>Cuota Escuela Artístico</td><td>Octubre 2026</td><td>55</td><td>05/10/2026</td><td>Domiciliación</td></tr></tbody>
        </table>
      </div>
      <PagosImport />
      <p className="small muted">Para hacer un justificante o una factura, entra en la ficha del socio → <b>Gestionar pagos y documentos</b>.</p>
    </>
  );
}
