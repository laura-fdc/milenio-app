import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { listComunicados } from '@/lib/db';
import { SECTIONS } from '@/lib/catalog';
import { deleteComunicadoAction } from '@/app/actions';
import { emailConfigured } from '@/lib/notify';
import ComunicadoForm from '@/components/ComunicadoForm';
import ComunicadoList from '@/components/ComunicadoList';
import ConfirmButton from '@/components/ConfirmButton';

export default async function Comunicados() {
  await requireUser(['root']);
  const list = await listComunicados();
  return (
    <>
      <div className="crumbs"><Link href="/gestion">Gestión</Link> › Comunicados</div>
      <h1>Enviar comunicado</h1>
      {!emailConfigured() && <p className="note small">El email aún no está configurado: por ahora el comunicado llegará solo por la app.</p>}
      <ComunicadoForm sections={SECTIONS.map((s) => ({ id: s.id, name: s.name, ico: s.ico, groups: s.groups.map((g) => ({ id: g.id, name: g.name })) }))} />

      <h2>Enviados</h2>
      <ComunicadoList items={list.slice(0, 20)} empty="Todavía no se ha enviado ningún comunicado." />
      {list.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="small muted">Borrar comunicados de la lista</summary>
          <div className="list" style={{ marginTop: 8 }}>
            {list.slice(0, 20).map((c) => (
              <form key={c.id} action={deleteComunicadoAction} className="row">
                <input type="hidden" name="id" value={c.id} />
                <div className="who"><b>{c.titulo}</b></div>
                <ConfirmButton className="btn danger" style={{ padding: '6px 10px' }} message="¿Quitar este comunicado de la app? (Los emails ya enviados no se pueden retirar)">✕</ConfirmButton>
              </form>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
