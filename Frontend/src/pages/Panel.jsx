import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../context/SesionContext.jsx'
import AsistentePerfil from '../components/AsistentePerfil.jsx'

const formatoFecha = (valor) => {
  if (!valor) return 'Sin especificar'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Sin especificar'
  return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })
}

/**
 * Panel del aspirante (CU-03). Al entrar consulta si ya existe un perfil:
 * - Si no existe, abre el asistente directamente (CU-01 lo llama "abre el
 *   asistente de perfil" tras el primer inicio de sesión).
 * - Si ya existe, muestra un resumen de solo lectura con un botón
 *   "Editar perfil" que reabre el mismo asistente, ahora precargado.
 */
function Panel() {
  const { usuario, cargando } = useSesion()

  const [perfil, setPerfil] = useState(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const [mostrarAsistente, setMostrarAsistente] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')

  const cargarPerfil = useCallback(async () => {
    setCargandoPerfil(true)
    setErrorCarga('')
    try {
      const response = await axios.get('/api/perfil')
      setPerfil(response.data)
    } catch (err) {
      setErrorCarga('No se pudo cargar tu perfil. Intenta recargar la página.')
    } finally {
      setCargandoPerfil(false)
    }
  }, [])

  useEffect(() => {
    if (usuario) {
      cargarPerfil()
    }
  }, [usuario, cargarPerfil])

  const handleGuardado = async () => {
    await cargarPerfil()
    setMostrarAsistente(false)
  }

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
        <p className="text-[var(--muted)]">Cargando tu perfil…</p>
      </section>
    )
  }

  if (errorCarga) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-red-500">{errorCarga}</p>
      </section>
    )
  }

  // Sin perfil todavía, o el aspirante pidió editarlo: se muestra el asistente.
  if (!perfil?.existe || mostrarAsistente) {
    return <AsistentePerfil datosIniciales={perfil} onGuardado={handleGuardado} />
  }

  const nombreCompleto = [perfil.nombre, perfil.apellidoPaterno, perfil.apellidoMaterno].filter(Boolean).join(' ')

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)]">Bienvenido, {usuario.nombre}</h2>
          <p className="text-[var(--muted)]">Este es el perfil que verán los reclutadores.</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarAsistente(true)}
          className="rounded-lg bg-siatec-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-siatec-700"
        >
          Editar perfil
        </button>
      </div>

      <div className="space-y-6 text-sm">
        <div>
          <h3 className="font-semibold text-[var(--text)]">Datos personales</h3>
          <p className="text-[var(--muted)]">{nombreCompleto}</p>
          <p className="text-[var(--muted)]">Fecha de nacimiento: {formatoFecha(perfil.fechaNacimiento)}</p>
          <p className="text-[var(--muted)]">RFC: {perfil.rfc || 'Sin especificar'} · CURP: {perfil.curp || 'Sin especificar'}</p>
        </div>

        <div>
          <h3 className="font-semibold text-[var(--text)]">Contacto y residencia</h3>
          <p className="text-[var(--muted)]">{perfil.telefono} · {perfil.correo}</p>
          <p className="text-[var(--muted)]">{perfil.municipio}, {perfil.estado}</p>
        </div>

        <div>
          <h3 className="font-semibold text-[var(--text)]">Experiencia laboral</h3>
          {perfil.experienciaLaboral?.length ? (
            <ul className="list-inside list-disc space-y-1 text-[var(--muted)]">
              {perfil.experienciaLaboral.map((exp) => (
                <li key={exp.id}>
                  {exp.puesto} en {exp.empresa} ({formatoFecha(exp.fechaInicio)} – {exp.fechaFin ? formatoFecha(exp.fechaFin) : 'actualidad'})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--muted)]">Sin experiencia registrada.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-[var(--text)]">Formación académica</h3>
          {perfil.formacionAcademica?.length ? (
            <ul className="list-inside list-disc space-y-1 text-[var(--muted)]">
              {perfil.formacionAcademica.map((f) => (
                <li key={f.id}>
                  {f.nivelEstudios} — {f.profesionNombre || 'profesión sin especificar'} — {f.institucion} ({formatoFecha(f.fechaInicio)} – {f.fechaFin ? formatoFecha(f.fechaFin) : 'en curso'})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--muted)]">Sin formación registrada.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-[var(--text)]">Certificaciones</h3>
          {perfil.certificaciones?.length ? (
            <ul className="list-inside list-disc space-y-1 text-[var(--muted)]">
              {perfil.certificaciones.map((c) => (
                <li key={c.id}>
                  {c.nombre} — {c.institucion} (obtenida: {formatoFecha(c.fechaObtencion)}
                  {c.fechaVencimiento ? `, vence: ${formatoFecha(c.fechaVencimiento)}` : ', no vence'})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--muted)]">Sin certificaciones registradas.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-[var(--text)]">Habilidades</h3>
          {perfil.habilidades?.length ? (
            <div className="flex flex-wrap gap-2">
              {perfil.habilidades.map((habilidad) => (
                <span
                  key={habilidad}
                  className="rounded-full bg-siatec-600/10 px-3 py-1.5 text-sm font-medium text-siatec-700 dark:text-siatec-300"
                >
                  {habilidad}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted)]">Sin habilidades registradas.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default Panel
