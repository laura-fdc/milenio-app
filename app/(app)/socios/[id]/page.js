import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, canSeeMember, redact } from '@/lib/session';
import { getMember, ageOf, attendanceDates, getAttendance, memberEmails, ausenciasDeSocio, getDocs } from '@/lib/db';
import { getGroup } from '@/lib/catalog';
import { initials, groupBadges, yesNo, fmtDate } from '@/lib/view';
import { deleteMemberAction } from '@/app/actions';
import ConfirmButton from '@/components/ConfirmButton';
import AvisosPrefs from '@/components/AvisosPrefs';
import AusenciaForm from '@/components/AusenciaForm';
import { avisosDe, emailConfigured, vapidPublicKey } from '@/lib/notify';
import { todayMadrid, upcomingClasses, prettyDate } from '@/lib/dates';

const F = ({ l, v }) => (
  <div className="f"><label>{l}</label><div>{v || v === 0 ? v : '—'}</div></div>
);

export default async function Perfil({ params }) {
  const { id } = await params;
  const user = await requireUser();
  const raw = await getMember(decodeURIComponent(id));
  if (!raw || !canSeeMember(user, raw)) notFound();
  const m = redact(user, raw);
  const age = ageOf(m);
  const isRoot = user.role === 'root';

  // Asistencia en escuelas
  const att = [];
  for (const i of m.inscripciones || []) {
    const g = getGroup(i.gid);
    if (!g?.attendance) continue;
    const dates = await attendanceDates(g.id);
    let yes = 0, total = 0;
    for (const d of dates.slice(-40)) {
      const v = (await getAttendance(g.id, d))[m.id];
      if (v === undefined || v === null) continue;
      total++; if (Number(v) === 1) yes++;
    }
    att.push({ g, yes, total });
  }

  // Avisos y ausencias (familia y root)
  const showFamily = ['familia', 'root'].includes(user.role);
  const today = todayMadrid();
  const ausencias = showFamily ? await ausenciasDeSocio(m.id) : [];
  const proximas = showFamily ? upcomingClasses(m, getGroup, today, 28) : [];
  const docs = showFamily ? await getDocs(m.id) : [];
  const ausList = ausencias.filter((a) => a.date >= today).map((a) => ({
    ...a, cancelable: true, label: `${prettyDate(a.date)} · ${getGroup(a.gid)?.name || a.gid}`,
  }));

  return (
    <>
      <div className="crumbs">
        <Link href={user.role === 'familia' ? '/' : '/socios'}>{user.role === 'familia' ? 'Mis fichas' : 'Socios'}</Link> › {m.id}
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '8px 0 14px', flexWrap: 'wrap' }}>
        <div className="mini-av" style={{ width: 60, height: 60, borderRadius: 18, fontSize: 22 }}>{initials(m.nombre)}</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ margin: 0 }}>{m.nombre}</h1>
          <div className="muted small">{m.id}{age != null ? ` · ${age} años` : ''} · {m.socioNuevo ? 'Socio nuevo' : 'Socio'}</div>
          <div style={{ marginTop: 6 }}>
            {groupBadges(m).map((b) => (
              user.role === 'familia'
                ? <span key={b.gid} className="tag">{b.label}</span>
                : <Link key={b.gid} className="tag" href={`/grupo/${b.gid}`}>{b.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {isRoot ? (
        <div className="toolbar">
          <Link className="btn" href={`/socios/${encodeURIComponent(m.id)}/editar`}>✏️ Editar</Link>
          {m.pdf && <a className="btn ghost" href={`/api/pdf/${encodeURIComponent(m.id)}`} target="_blank">📄 Ver PDF</a>}
          <Link className="btn ghost" href={`/gestion/ficha?actualizar=${encodeURIComponent(m.id)}`}>⬆ Subir ficha nueva</Link>
        </div>
      ) : (
        <p className="note small">🔒 Solo el club (root) puede modificar esta ficha. Si hay algún dato mal, avisa en gestion@hockeymilenio.com.</p>
      )}

      <div className="stack">
        {m.observaciones && <div className="note err">⚠️ <b>Observaciones:</b> {m.observaciones}</div>}

        {showFamily && (
          <>
            <div className="card">
              <h4>🙋 Avisar de una ausencia</h4>
              <AusenciaForm
                memberId={m.id}
                options={proximas.map((p) => ({ value: `${p.gid}|${p.date}`, label: p.label }))}
                existing={ausList}
              />
            </div>
            <div className="card">
              <h4>🔔 Avisos</h4>
              <AvisosPrefs memberId={m.id} initial={avisosDe(m)} emails={memberEmails(m)} emailActivo={emailConfigured()} publicKey={vapidPublicKey()} />
            </div>
            {(isRoot || docs.length > 0) && (
              <div className="card">
                <h4>🧾 Pagos y justificantes</h4>
                {docs.length > 0 && (
                  <div className="list" style={{ marginBottom: isRoot ? 10 : 0 }}>
                    {docs.slice(0, 5).map((d) => (
                      <a key={d.numero} className="row" target="_blank" href={`/api/doc/${encodeURIComponent(m.id)}/${encodeURIComponent(d.numero)}`}>
                        <div className="mini-av">📄</div>
                        <div className="who"><b>{d.tipo === 'factura' ? 'Factura' : 'Justificante'} {d.numero}</b><small>{fmtDate(d.fecha)} · {d.total.toFixed(2).replace('.', ',')} €</small></div>
                        <span className="chev">⬇</span>
                      </a>
                    ))}
                  </div>
                )}
                {isRoot && <Link className="btn ghost" href={`/socios/${encodeURIComponent(m.id)}/pagos`}>Gestionar pagos y documentos</Link>}
              </div>
            )}
          </>
        )}

        {att.length > 0 && (
          <div className="card">
            <h4>Asistencia</h4>
            {att.map(({ g, yes, total }) => (
              <div key={g.id} className="f" style={{ marginBottom: 6 }}>
                <label>{g.name}</label>
                <div>{total ? `${yes} de ${total} sesiones (${Math.round((yes / total) * 100)}%)` : 'Sin registros todavía'}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h4>Datos del deportista</h4>
          <div className="fields">
            <F l="DNI" v={m.dni} />
            <F l="Fecha de nacimiento" v={fmtDate(m.nacimiento) || m.nacimientoTexto} />
            <F l="País de nacimiento" v={m.pais} />
            <F l="Nacionalidad" v={m.nacionalidad} />
            <F l="Domicilio" v={m.domicilio} />
            <F l="Localidad" v={m.localidad} />
            <F l="Provincia" v={m.provincia} />
            <F l="Código postal" v={m.cp} />
            <F l="Teléfono" v={m.telefono && <a href={`tel:${m.telefono}`}>{m.telefono}</a>} />
            <F l="Mail" v={m.mail && <a href={`mailto:${m.mail}`}>{m.mail}</a>} />
          </div>
        </div>

        {(m.tutor1?.nombre || m.tutor2?.nombre) && (
          <div className="card">
            <h4>Tutores</h4>
            <div className="fields">
              {[m.tutor1, m.tutor2].filter((t) => t?.nombre).map((t, i) => (
                <div key={i} className="f">
                  <label>Tutor {i + 1}</label>
                  <div>
                    <b>{t.nombre}</b><br />
                    {t.dni && <>DNI {t.dni}<br /></>}
                    {t.telefono && <><a href={`tel:${t.telefono}`}>📞 {t.telefono}</a><br /></>}
                    {t.mail && <a href={`mailto:${t.mail}`}>✉️ {t.mail}</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h4>Inscripción</h4>
          <div className="fields">
            {(m.inscripciones || []).map((i) => {
              const g = getGroup(i.gid);
              if (!g) return null;
              return <F key={i.gid} l={`${g.section.name} · ${g.name}`} v={i.dias.length ? i.dias.map((d) => g.sessions.find((s) => s.id === d)?.label).join(', ') : g.sessions.length ? 'Sin días marcados' : 'Según calendario'} />;
            })}
            {!m.inscripciones?.length && <div className="muted">Sin grupos asignados</div>}
          </div>
        </div>

        {isRoot && (
          <div className="card">
            <h4>Datos bancarios</h4>
            <div className="fields">
              <F l="IBAN" v={m.iban} />
              <F l="Titular" v={m.titular} />
            </div>
          </div>
        )}

        <div className="card">
          <h4>Otros</h4>
          <div className="fields">
            <F l="Hermanos en el club" v={yesNo(m.hermanos)} />
            <F l="Abonado Logroño Deporte" v={m.abonado ? `Sí${m.numAbonado ? ' · ' + m.numAbonado : ''}` : yesNo(m.abonado)} />
            <F l="Grupos de difusión" v={m.noDifusion ? 'No desea' : 'Sí'} />
            <F l="Consentimiento imagen" v={`Tutor 1: ${yesNo(m.imagenTutor1 ?? null)} · Tutor 2: ${yesNo(m.imagenTutor2 ?? null)}`} />
            <F l="¿Cómo nos conoció?" v={m.conocio} />
            {m.fechaFirma && <F l="Fecha de firma" v={m.fechaFirma} />}
            {isRoot && <F l="Última actualización" v={m.updatedAt && new Date(m.updatedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} />}
          </div>
        </div>

        {isRoot && (
          <form action={deleteMemberAction.bind(null, m.id)}>
            <ConfirmButton className="btn danger" message={`¿Borrar la ficha de ${m.nombre}? No se puede deshacer.`}>🗑 Borrar ficha</ConfirmButton>
          </form>
        )}
      </div>
    </>
  );
}
