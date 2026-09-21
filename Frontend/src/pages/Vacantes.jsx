import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../context/SesionContext.jsx'
import { FORMACION_OPTIONS } from '../constants/catalogos.js'

/**
 * Catálogo de perfiles de puesto (parte 1 — ver
 * Documentacion/SE-137-Reclutamiento/conexionPerfilPuesto.md). Se listan
 * TODOS los perfiles de puesto que existen en la base compartida con
 * SIATEC, sin importar su estado (borrador/publicado/inactivo).
 *
 * Filtro por especialidad: mismo patrón de tres niveles (Nivel → Área de
 * estudio → Profesión) que ya usa Postulacion.jsx y AsistentePerfil.jsx
 * para encontrar una profesión entre el catálogo grande — aquí, en vez de
 * elegir la profesión propia del aspirante, se usa para acotar la lista de
 * puestos a los que piden esa profesión como escolaridad. Es un filtro,
 * no el cruce real por ProfesionId contra la formación académica del
 * usuario en sesión — ese cruce automático sigue siendo la parte 2,
 * todavía no implementada a propósito.
 */
function Vacantes() {
  const { usuario, cargando } = useSesion()
  const navigate = useNavigate()

  const [perfilesPuesto, setPerfilesPuesto] = useState([])
  const [cargandoPerfiles, setCargandoPerfiles] = useState(true)
  const [error, setError] = useState('')

  const [profesiones, setProfesiones] = useState([])
  const [nivelFiltro, setNivelFiltro] = useState('')
  const [areaEstudioFiltro, setAreaEstudioFiltro] = useState('')
  const [profesionIdFiltro, setProfesionIdFiltro] = useState('')

  useEffect(() => {
    if (!usuario) return

    let cancelado = false

    axios
      .get('/api/perfilespuesto')
      .then((response) => {
        if (!cancelado) setPerfilesPuesto(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {
        if (!cancelado) setError('No se pudieron cargar los perfiles de puesto. Intenta de nuevo más tarde.')
      })
      .finally(() => {
        if (!cancelado) setCargandoPerfiles(false)
      })

    return () => {
      cancelado = true
    }
  }, [usuario])

  // Catálogo de profesiones para el filtro: igual que Postulacion.jsx, se
  // pide una sola vez al montar. Si falla, el filtro simplemente queda sin
  // opciones — no bloquea ver la lista de puestos sin filtrar.
  useEffect(() => {
    let cancelado = false

    axios
      .get('/api/profesiones')
      .then((response) => {
        if (!cancelado) setProfesiones(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {})

    return () => {
      cancelado = true
    }
  }, [])

  // Al cambiar el Nivel, se limpian Área de estudio y Profesión (sus
  // opciones dependen del nivel elegido) — mismo criterio que
  // Postulacion.jsx.
  const handleNivelChange = (e) => {
    setNivelFiltro(e.target.value)
    setAreaEstudioFiltro('')
    setProfesionIdFiltro('')
  }

  const handleAreaEstudioChange = (e) => {
    setAreaEstudioFiltro(e.target.value)
    setProfesionIdFiltro('')
  }

  const limpiarFiltros = () => {
    setNivelFiltro('')
    setAreaEstudioFiltro('')
    setProfesionIdFiltro('')
  }

  const profesionesPorId = {}
  for (const p of profesiones) {
    profesionesPorId[p.id] = p
  }

  const profesionesPorNivel = {}
  for (const p of profesiones) {
    if (!profesionesPorNivel[p.nivel]) profesionesPorNivel[p.nivel] = []
    profesionesPorNivel[p.nivel].push(p)
  }

  const areasDelNivel = [
    ...new Set(
      (profesionesPorNivel[nivelFiltro] || [])
        .map((p) => p.areaEstudio)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  const profesionesAMostrar = areaEstudioFiltro
    ? (profesionesPorNivel[nivelFiltro] || []).filter((p) => p.areaEstudio === areaEstudioFiltro)
    : (profesionesPorNivel[nivelFiltro] || [])

  // El filtro se va afinando: sin Nivel elegido se muestran todos los
  // puestos; con Nivel (y opcionalmente Área de estudio y/o Profesión) solo
  // se muestran los que piden, entre sus escolaridades mínimas, alguna
  // profesión que coincida con lo elegido — terminando en la especialidad
  // concreta cuando ya se eligió una.
  const perfilesFiltrados = perfilesPuesto.filter((perfil) => {
    if (!nivelFiltro) return true

    const escolaridades = perfil.escolaridades || []

    if (profesionIdFiltro) {
      return escolaridades.some((e) => String(e.profesionId) === String(profesionIdFiltro))
    }

    if (areaEstudioFiltro) {
      return escolaridades.some((e) => profesionesPorId[e.profesionId]?.areaEstudio === areaEstudioFiltro)
    }

    return escolaridades.some((e) => profesionesPorId[e.profesionId]?.nivel === nivelFiltro)
  })

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

  if (cargandoPerfiles) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-[var(--muted)]">Cargando…</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Puestos para ti</h2>
        <p className="text-[var(--muted)]">Consulta puestos relacionados con tu perfil.</p>
      </div>

      {!error && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--text)]">Filtrar por especialidad</p>
            {(nivelFiltro || areaEstudioFiltro || profesionIdFiltro) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-sm font-semibold text-siatec-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="nivelFiltro" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Nivel
              </label>
              <select
                id="nivelFiltro"
                name="nivelFiltro"
                value={nivelFiltro}
                onChange={handleNivelChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              >
                <option value="">Todos los niveles</option>
                {FORMACION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="areaEstudioFiltro" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Área de estudio
              </label>
              <select
                id="areaEstudioFiltro"
                name="areaEstudioFiltro"
                value={areaEstudioFiltro}
                onChange={handleAreaEstudioChange}
                disabled={!nivelFiltro || areasDelNivel.length === 0}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20 disabled:opacity-50"
              >
                <option value="">Todas</option>
                {areasDelNivel.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="profesionIdFiltro" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Especialidad / profesión
              </label>
              <select
                id="profesionIdFiltro"
                name="profesionIdFiltro"
                value={profesionIdFiltro}
                onChange={(e) => setProfesionIdFiltro(e.target.value)}
                disabled={!nivelFiltro}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20 disabled:opacity-50"
              >
                <option value="">Todas</option>
                {profesionesAMostrar.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-dashed border-red-500/60 bg-red-500/10 p-6 text-center">
          <p className="font-semibold text-[var(--text)]">{error}</p>
        </div>
      ) : perfilesPuesto.length === 0 ? (
        <div className="rounded-xl border border-dashed border-siatec-500/60 bg-siatec-500/10 p-6 text-center">
          <p className="font-semibold text-[var(--text)]">No hay perfiles de puesto registrados todavía.</p>
        </div>
      ) : perfilesFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-siatec-500/60 bg-siatec-500/10 p-6 text-center">
          <p className="font-semibold text-[var(--text)]">Ningún puesto pide la especialidad que elegiste.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--surface)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Puesto</th>
                <th className="px-4 py-3 font-semibold">Área</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Escolaridad(es) mínima(s)</th>
                <th className="px-4 py-3 font-semibold text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {perfilesFiltrados.map((perfil) => (
                <tr
                  key={perfil.id}
                  onClick={() => navigate(`/puestos/${perfil.id}`)}
                  className="cursor-pointer transition hover:bg-[var(--surface)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{perfil.codigoPerfil}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{perfil.version?.nombrePuesto ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{perfil.areaNombre ?? 'Sin área asignada'}</td>
                  <td className="px-4 py-3 text-[var(--muted)] capitalize">{perfil.estadoActual ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {/* Solo el nombre: en el catálogo de profesiones el
                        Nombre ya trae el nivel incluido cuando aplica (p. ej.
                        "Técnico en Enfermería"), así que anteponer e.nivel
                        aparte duplicaba el nivel en el texto. */}
                    {perfil.escolaridades && perfil.escolaridades.length > 0
                      ? perfil.escolaridades
                          .map((e) => e.profesionNombre)
                          .filter(Boolean)
                          .join(', ')
                      : 'Sin escolaridad especificada'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* Manda al detalle del puesto, igual que el clic en el
                        renglón — el formulario de postulación se abre desde
                        ahí, no directo desde esta tabla. */}
                    <button
                      type="button"
                      onClick={(evento) => {
                        evento.stopPropagation()
                        navigate(`/puestos/${perfil.id}`)
                      }}
                      className="rounded-lg bg-siatec-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-siatec-700"
                    >
                      Postularme
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default Vacantes
