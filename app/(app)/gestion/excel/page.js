import Link from 'next/link';
import { requireUser } from '@/lib/session';
import ExcelImport from '@/components/ExcelImport';

export default async function Excel() {
  await requireUser(['root']);
  return (
    <>
      <div className="crumbs"><Link href="/gestion">Gestión</Link> › Importar Excel</div>
      <h1>Importar Excel de grupos</h1>
      <p className="muted small" style={{ marginTop: -6 }}>
        Formato: una hoja por grupo o día con columnas <b>ID SOCIO</b>, <b>NombreApelli</b>, <b>Edad</b> y una columna marcada con X
        (p. ej. “LUNES 18:15” o “ESCUELA PATINAJE ARTISTICO”). Cada vez que lo subas se sincronizan esos grupos: entran los nuevos y salen los que ya no aparecen.
      </p>
      <ExcelImport />
    </>
  );
}
