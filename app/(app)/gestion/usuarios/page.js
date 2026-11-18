import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { listUsers } from '@/lib/db';
import { SECTIONS, getGroup } from '@/lib/catalog';
import { saveUserAction, deleteUserAction } from '@/app/actions';
import ConfirmButton from '@/components/ConfirmButton';

export default async function Usuarios({ searchParams }) {
  const me = await requireUser(['root']);
  const sp = await searchParams;
  const users = (await listUsers()).sort((a, b) => a.email.localeCompare(b.email));
  const editing = users.find((u) => u.email === sp.editar) || null;
  const roots = (process.env.ROOT_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

  return (
    <>
      <div className="crumbs"><Link href="/gestion">Gestión</Link> › Usuarios</div>
      <h1>Usuarios y permisos</h1>

      <div className="list">
        {roots.map((e) => (
          <div key={e} className="row">
            <div className="mini-av">🔑</div>
            <div className="who"><b>{e}</b><small>Root (configurado en Vercel)</small></div>
          </div>
        ))}
        {users.map((u) => (
          <div key={u.email} className="row">
            <div className="mini-av">{u.role === 'root' ? '🔑' : '🧑‍🏫'}</div>
            <div className="who">
              <b>{u.name || u.email}</b>
              <small>{u.name ? u.email + ' · ' : ''}{u.role === 'root' ? 'Root' : (u.groups || []).map((g) => getGroup(g)?.name).filter(Boolean).join(', ') || 'Sin grupos'}</small>
            </div>
            <Link className="btn ghost" style={{ padding: '8px 12px' }} href={`/gestion/usuarios?editar=${encodeURIComponent(u.email)}`}>Editar</Link>
            {u.email !== me.email && (
              <form action={deleteUserAction}>
                <input type="hidden" name="email" value={u.email} />
                <ConfirmButton className="btn danger" style={{ padding: '8px 12px' }} message={`¿Quitar el acceso a ${u.email}?`}>✕</ConfirmButton>
              </form>
            )}
          </div>
        ))}
      </div>
      <p className="small muted">Las familias no hace falta darlas de alta: entran solas si su cuenta de Google coincide con el mail del deportista o de un tutor en la ficha.</p>

      <h2>{editing ? `Editar ${editing.email}` : 'Añadir entrenadora o administrador'}</h2>
      <form action={saveUserAction} className="card stack" key={editing?.email || 'new'}>
        <div className="form-grid">
          <label>Cuenta de Google (email)
            <input type="email" name="email" required defaultValue={editing?.email} readOnly={!!editing} />
          </label>
          <label>Nombre
            <input type="text" name="name" defaultValue={editing?.name} />
          </label>
          <label>Rol
            <select name="role" defaultValue={editing?.role || 'entrenadora'}>
              <option value="entrenadora">Entrenadora (ve sus grupos y pasa lista)</option>
              <option value="root">Root (todo)</option>
            </select>
          </label>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 6 }}>Grupos que puede ver (entrenadoras)</div>
          {SECTIONS.map((s) => (
            <div key={s.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.ico} {s.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                {s.groups.map((g) => (
                  <label key={g.id} className="check small">
                    <input type="checkbox" name="groups" value={g.id} defaultChecked={editing?.groups?.includes(g.id)} /> {g.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <button className="btn">{editing ? 'Guardar cambios' : 'Añadir'}</button>
          {editing && <Link className="btn ghost" href="/gestion/usuarios">Cancelar</Link>}
        </div>
      </form>
    </>
  );
}
