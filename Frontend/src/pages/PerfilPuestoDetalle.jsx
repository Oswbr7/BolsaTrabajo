import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../context/SesionContext.jsx'

/**
 * Detalle de un perfil de puesto (parte 1 — ver
 * Documentacion/SE-137-Reclutamiento/conexionPerfilPuesto.md), llegando
 * aquí desde el renglón de la tabla en Vacantes.jsx. Muestra toda la
 * información de la versión vigente del perfil y las profesiones que
 * acepta como escolaridad, sin ningún cruce contra la formación académica
 * del usuario (esa comparación es la parte 2, todavía no implementada).
 */
function PerfilPuestoDetalle() {
  const { usuario, cargando } = useSesion()
  const { id } = useParams()
  const navigate = useNavigate()

  const [perfil, setPerfil] = useState(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!usuario) return

    let cancelado = false
    setCargandoPerfil(true)
    setError('')

    axios
      .get(`/api/perfilespuesto/${id}`)
      .then((response) => {
        if (!cancelado) setPerfil(response.data)
      })
      .catch((err) => {
        if (cancelado) return
        if (err.response?.status === 404) {
          setError('No se encontró el perfil de puesto solicitado.')
        } else {
          setError('No se pudo cargar el perfil de puesto. Intenta de nuevo más tarde.')
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoPerfil(false)
      })

    return () => {
      cancelado = true
    }
  }, [usuario, id])

  if (cargando) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-[var(--muted)]">Cargando…</p>
      </section>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (cargandoPerfil) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-[var(--muted)]">Cargando…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-red-500">{error}</p>
        <Link to="/vacantes" className="mt-4 inline-block text-sm font-semibold text-siatec-600 hover:underline">
          ← Volver a Puestos para ti
        </Link>
      </section>
    )
  }

  const version = perfil?.version

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <Link to="/vacantes" className="mb-4 inline-block text-sm font-semibold text-siatec-600 hover:underline">
        ← Volver a Puestos para ti
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)]">{version?.nombrePuesto ?? 'Puesto sin nombre'}</h2>
          <p className="text-[var(--muted)]">
            Código: {perfil.codigoPerfil} · Estado: <span className="capitalize">{perfil.estadoActual}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/puestos/${id}/postularme`)}
          className="rounded-lg bg-siatec-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-siatec-700"
        >
          Postularme
        </button>
      </div>

      {!version ? (
        <p className="text-[var(--muted)]">Este perfil no tiene una versión vigente registrada.</p>
      ) : (
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-[var(--text)]">Información general</h3>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">Área</dt>
                <dd className="text-[var(--text)]">{perfil.areaNombre ?? 'Sin área asignada'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Área funcional</dt>
                <dd className="text-[var(--text)]">{version.areaFuncional || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Rama</dt>
                <dd className="text-[var(--text)]">{version.rama || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Familia</dt>
                <dd className="text-[var(--text)]">{version.familia || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Grupo o categoría</dt>
                <dd className="text-[var(--text)]">{version.grupoCategoria || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Nivel organizacional</dt>
                <dd className="text-[var(--text)]">{version.nivelOrganizacional || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Tipo de personal</dt>
                <dd className="text-[var(--text)]">{version.tipoPersonal || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Puesto superior</dt>
                <dd className="text-[var(--text)]">{version.puestoSuperior || 'Sin especificar'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Vigencia</dt>
                <dd className="text-[var(--text)]">
                  {version.vigenciaInicio || '—'} – {version.vigenciaFin || 'sin fecha de fin'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text)]">Objetivo general</h3>
            <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{version.objetivoGeneral || 'Sin especificar.'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text)]">Funciones del puesto</h3>
            {perfil.funciones?.length ? (
              <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[var(--surface)] text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Descripción</th>
                      <th className="px-3 py-2 font-semibold">Obligatoria</th>
                      <th className="px-3 py-2 font-semibold">Crítica</th>
                      <th className="px-3 py-2 font-semibold">Activa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {perfil.funciones.map((f, indice) => (
                      <tr key={indice}>
                        <td className="px-3 py-2 font-medium text-[var(--text)]">{f.descripcion}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{f.obligatoria ? 'Sí' : 'No'}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{f.critica ? 'Sí' : 'No'}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{f.activa ? 'Sí' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 text-[var(--muted)]">Sin funciones especificadas.</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text)]">Observaciones</h3>
            <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{version.observaciones || 'Sin observaciones.'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text)]">Escolaridad(es) mínima(s)</h3>
            {perfil.escolaridades?.length ? (
              // Solo el nombre: en el catálogo de profesiones el Nombre ya
              // trae el nivel incluido cuando aplica (p. ej. "Técnico en
              // Enfermería"), así que anteponer e.nivel aparte duplicaba el
              // nivel en el texto.
              <ul className="mt-1 list-inside list-disc space-y-1 text-[var(--muted)]">
                {perfil.escolaridades.map((e) => (
                  <li key={e.profesionId}>{e.profesionNombre}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[var(--muted)]">Sin escolaridad especificada.</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text)]">Documentos requeridos</h3>
            {perfil.documentos?.length ? (
              <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[var(--surface)] text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Documento</th>
                      <th className="px-3 py-2 font-semibold">Tipo</th>
                      <th className="px-3 py-2 font-semibold">Obligatorio</th>
                      <th className="px-3 py-2 font-semibold">Activo</th>
                      <th className="px-3 py-2 font-semibold">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {perfil.documentos.map((d, indice) => (
                      <tr key={indice}>
                        <td className="px-3 py-2 font-medium text-[var(--text)]">{d.nombre}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{d.tipoDocumento || 'Sin especificar'}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{d.obligatorio ? 'Sí' : 'No'}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{d.activo ? 'Sí' : 'No'}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{d.observaciones || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 text-[var(--muted)]">Sin documentos requeridos especificados.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default PerfilPuestoDetalle
