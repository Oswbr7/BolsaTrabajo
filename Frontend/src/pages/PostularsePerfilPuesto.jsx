import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../context/SesionContext.jsx'
import { ESTADOS_MEXICO } from '../constants/catalogos.js'

// RFC (persona física) y CURP: mismo criterio de longitud fija que
// Postulacion.jsx y AsistentePerfil.jsx.
const RFC_LONGITUD = 13
const CURP_LONGITUD = 18

const soloAlfanumerico = (valor, limite) => valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, limite)

const formularioVacio = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  rfc: '',
  curp: '',
  estado: '',
  municipio: '',
  telefono: '',
  correo: '',
  expectativasSalariales: '',
  habilidadesClave: '',
}

/**
 * Formulario de postulación a un perfil de puesto específico (llegando
 * aquí desde el botón "Postularme" en Vacantes.jsx o PerfilPuestoDetalle.jsx).
 * Versión compacta del registro de Postulacion.jsx: mismos criterios de
 * captura (nombre/apellidos solo letras, RFC/CURP alfanumérico de longitud
 * fija, teléfono solo dígitos), pero sin los campos de formación académica
 * ni área de interés — aquí la "escolaridad" ya la define el propio perfil
 * de puesto, no algo que el aspirante elija.
 *
 * Envía de verdad a POST /api/postulacionespuesto (requiere sesión, igual
 * que ya exige esta página) — el backend valida y guarda en
 * dbo.RRHH_Reclutamiento_PostulacionesPuesto y su tabla hija de documentos.
 * Solo se permite una postulación por usuario por vacante: al montar se
 * consulta GET /api/postulacionespuesto/mia/:id para deshabilitar el
 * formulario si ya se postuló antes a este mismo puesto.
 */
function PostularsePerfilPuesto() {
  const { usuario, cargando } = useSesion()
  const { id } = useParams()
  const navigate = useNavigate()

  const [perfilPuesto, setPerfilPuesto] = useState(null)
  const [cargandoPerfilPuesto, setCargandoPerfilPuesto] = useState(true)
  const [errorPerfilPuesto, setErrorPerfilPuesto] = useState('')

  const [form, setForm] = useState(formularioVacio)
  const [comprobanteEstudios, setComprobanteEstudios] = useState(null)
  const [archivosPorDocumento, setArchivosPorDocumento] = useState({})
  const [archivosPorCertificacion, setArchivosPorCertificacion] = useState({})
  const [perfilPrecargado, setPerfilPrecargado] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [enviando, setEnviando] = useState(false)
  const [yaSePostulo, setYaSePostulo] = useState(false)

  // Perfil de puesto al que se está postulando: header (puesto/código) y
  // los documentos requeridos vigentes (Activo) para armar la zona de
  // "Documentación requerida" dinámicamente.
  useEffect(() => {
    if (!usuario) return

    let cancelado = false

    axios
      .get(`/api/perfilespuesto/${id}`)
      .then((response) => {
        if (!cancelado) setPerfilPuesto(response.data)
      })
      .catch((err) => {
        if (cancelado) return
        setErrorPerfilPuesto(
          err.response?.status === 404
            ? 'No se encontró el perfil de puesto solicitado.'
            : 'No se pudo cargar el perfil de puesto. Intenta de nuevo más tarde.'
        )
      })
      .finally(() => {
        if (!cancelado) setCargandoPerfilPuesto(false)
      })

    return () => {
      cancelado = true
    }
  }, [usuario, id])

  // Una sola postulación por usuario por vacante: si ya existe una para
  // este perfil de puesto, se deshabilita el formulario en vez de dejar
  // que el envío truene con el 409 del backend.
  useEffect(() => {
    if (!usuario) return

    let cancelado = false

    axios
      .get(`/api/postulacionespuesto/mia/${id}`)
      .then((response) => {
        if (!cancelado) setYaSePostulo(Boolean(response.data?.existe))
      })
      .catch(() => {
        // Si falla la consulta, se deja el formulario habilitado — el
        // backend igual rechaza con 409 si de verdad ya existía.
      })

    return () => {
      cancelado = true
    }
  }, [usuario, id])

  // Precarga desde el perfil del aspirante (CU-03), igual que
  // Postulacion.jsx: los campos quedan editables y no se guarda nada de
  // vuelta en el perfil, es solo una copia inicial.
  useEffect(() => {
    if (cargando || !usuario) return

    let cancelado = false

    axios
      .get('/api/perfil')
      .then((response) => {
        if (cancelado || !response.data.existe) return
        const perfil = response.data
        setForm((formActual) => ({
          ...formActual,
          nombre: formActual.nombre || perfil.nombre || '',
          apellidoPaterno: formActual.apellidoPaterno || perfil.apellidoPaterno || '',
          apellidoMaterno: formActual.apellidoMaterno || perfil.apellidoMaterno || '',
          rfc: formActual.rfc || perfil.rfc || '',
          curp: formActual.curp || perfil.curp || '',
          estado: formActual.estado || perfil.estado || '',
          municipio: formActual.municipio || perfil.municipio || '',
          telefono: formActual.telefono || perfil.telefono || '',
          correo: formActual.correo || perfil.correo || '',
          habilidadesClave: formActual.habilidadesClave || (perfil.habilidades || []).join(', '),
        }))
        setPerfilPrecargado(true)
      })
      .catch(() => {
        // Sin perfil precargable, el formulario se llena a mano — igual
        // que si el aspirante no tuviera sesión.
      })

    return () => {
      cancelado = true
    }
  }, [usuario, cargando])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleLettersOnlyChange = (e) => {
    const onlyLetters = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
    setForm({ ...form, [e.target.name]: onlyLetters })
  }

  const handlePhoneChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 12)
    setForm({ ...form, [e.target.name]: onlyDigits })
  }

  const handleSalaryChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '')
    setForm({ ...form, [e.target.name]: onlyDigits })
  }

  const handleRfcChange = (e) => {
    setForm({ ...form, rfc: soloAlfanumerico(e.target.value, RFC_LONGITUD) })
  }

  const handleCurpChange = (e) => {
    setForm({ ...form, curp: soloAlfanumerico(e.target.value, CURP_LONGITUD) })
  }

  const handleDocumentoFileChange = (documentoId) => (e) => {
    const file = e.target.files[0] || null
    setArchivosPorDocumento((actual) => ({ ...actual, [documentoId]: file }))
  }

  const handleCertificacionFileChange = (certificacionId) => (e) => {
    const file = e.target.files[0] || null
    setArchivosPorCertificacion((actual) => ({ ...actual, [certificacionId]: file }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (yaSePostulo) {
      setFeedback({ type: 'error', message: 'Ya tienes una postulación registrada para esta vacante.' })
      return
    }

    if (
      !form.nombre ||
      !form.apellidoPaterno ||
      !form.rfc ||
      !form.curp ||
      !form.estado ||
      !form.telefono ||
      !form.correo ||
      !form.expectativasSalariales ||
      !comprobanteEstudios
    ) {
      setFeedback({ type: 'error', message: 'Completa todos los campos obligatorios y adjunta el comprobante de estudios.' })
      return
    }

    if (form.rfc.length !== RFC_LONGITUD) {
      setFeedback({ type: 'error', message: `El RFC debe tener ${RFC_LONGITUD} caracteres.` })
      return
    }

    if (form.curp.length !== CURP_LONGITUD) {
      setFeedback({ type: 'error', message: `El CURP debe tener ${CURP_LONGITUD} caracteres.` })
      return
    }

    // Cada documento obligatorio (de los vigentes) debe tener su archivo
    // antes de mandar — mismo criterio que valida el backend.
    const documentoObligatorioFaltante = documentosRequeridos.find(
      (documento) => documento.obligatorio && !archivosPorDocumento[documento.id]
    )
    if (documentoObligatorioFaltante) {
      setFeedback({ type: 'error', message: `Falta el archivo del documento obligatorio "${documentoObligatorioFaltante.nombre}".` })
      return
    }

    // Certificaciones: a diferencia de los documentos, aquí TODAS las que
    // pida el puesto son obligatorias — mismo criterio que valida el
    // backend (esa tabla no tiene columna Obligatorio).
    const certificacionFaltante = certificacionesRequeridas.find(
      (certificacion) => !archivosPorCertificacion[certificacion.id]
    )
    if (certificacionFaltante) {
      setFeedback({ type: 'error', message: `Falta el archivo de la certificación "${certificacionFaltante.nombre}".` })
      return
    }

    const data = new FormData()
    data.append('perfilPuestoId', id)
    data.append('nombre', form.nombre)
    data.append('apellidoPaterno', form.apellidoPaterno)
    if (form.apellidoMaterno) {
      data.append('apellidoMaterno', form.apellidoMaterno)
    }
    // Nombres distintos a "rfc"/"curp" a propósito, mismo criterio que
    // Postulacion.jsx: el backend los recibe como rfcTexto/curpTexto.
    data.append('rfcTexto', form.rfc)
    data.append('curpTexto', form.curp)
    data.append('estado', form.estado)
    if (form.municipio) {
      data.append('municipio', form.municipio)
    }
    data.append('telefono', form.telefono)
    data.append('correo', form.correo)
    data.append('expectativasSalariales', form.expectativasSalariales)
    if (form.habilidadesClave) {
      data.append('habilidadesClave', form.habilidadesClave)
    }
    data.append('comprobanteEstudios', comprobanteEstudios)

    // Listas paralelas (mismo índice = mismo documento), igual que
    // certificacionesNombres/certificacionesArchivos en Postulacion.jsx.
    documentosRequeridos.forEach((documento) => {
      const archivo = archivosPorDocumento[documento.id]
      if (archivo) {
        data.append('documentosIds', documento.id)
        data.append('documentosArchivos', archivo)
      }
    })

    certificacionesRequeridas.forEach((certificacion) => {
      const archivo = archivosPorCertificacion[certificacion.id]
      if (archivo) {
        data.append('certificacionesIds', certificacion.id)
        data.append('certificacionesArchivos', archivo)
      }
    })

    setEnviando(true)
    setFeedback({ type: '', message: '' })

    try {
      await axios.post('/api/postulacionespuesto', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFeedback({ type: 'success', message: '¡Postulación enviada correctamente!' })
      setYaSePostulo(true)
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al enviar la postulación.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setEnviando(false)
    }
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

  if (cargandoPerfilPuesto) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-[var(--muted)]">Cargando…</p>
      </section>
    )
  }

  if (errorPerfilPuesto) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-red-500">{errorPerfilPuesto}</p>
        <Link to="/vacantes" className="mt-4 inline-block text-sm font-semibold text-siatec-600 hover:underline">
          ← Volver a Puestos para ti
        </Link>
      </section>
    )
  }

  // Documentos vigentes del perfil (Activo): los inactivos ya no se piden,
  // así que no se les da un espacio de carga en el formulario.
  const documentosRequeridos = (perfilPuesto?.documentos || []).filter((d) => d.activo)

  // Mismo texto que ya se ve en la tabla de Vacantes.jsx y en el detalle del
  // puesto: los nombres de las profesiones ya traen el nivel incluido
  // cuando aplica, así que no hay que anteponerlo aparte.
  const carrerasRequeridas = (perfilPuesto?.escolaridades || [])
    .map((e) => e.profesionNombre)
    .filter(Boolean)

  // Certificaciones que pide el perfil académico de este puesto (tabla de
  // SIATEC, sin columna Obligatorio): todas son obligatorias de adjuntar.
  const certificacionesRequeridas = perfilPuesto?.certificaciones || []

  const FileField = ({ id, label, required, file, onChange, helpText }) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--text)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {helpText && <div className="mb-2 text-xs text-[var(--muted)]">{helpText}</div>}
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-sm transition hover:border-siatec-500 hover:bg-siatec-50 dark:hover:bg-transparent">
        <input
          id={id}
          name={id}
          type="file"
          onChange={onChange}
          className="text-sm text-[var(--text)] file:mr-4 file:rounded-md file:border-0 file:bg-siatec-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-siatec-700"
        />
      </div>
      {file && <p className="mt-1 text-xs text-[var(--muted)]">Archivo seleccionado: {file.name}</p>}
    </div>
  )

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <Link to={`/puestos/${id}`} className="mb-4 inline-block text-sm font-semibold text-siatec-600 hover:underline">
        ← Volver al detalle del puesto
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">
          Postularme{perfilPuesto?.version?.nombrePuesto ? ` — ${perfilPuesto.version.nombrePuesto}` : ''}
        </h2>
        <p className="text-[var(--muted)]">
          Código: {perfilPuesto?.codigoPerfil}. Completa tus datos y adjunta la documentación que pide este puesto.
        </p>
      </div>

      {perfilPrecargado && (
        <div className="mb-6 rounded-lg border border-siatec-200 bg-siatec-50 px-4 py-3 text-sm text-siatec-700 dark:border-siatec-800 dark:bg-siatec-900/30 dark:text-siatec-300">
          Precargamos algunos campos con la información de tu perfil. Puedes editarlos libremente antes de enviar; los cambios que hagas aquí no modifican tu perfil.
        </div>
      )}

      {yaSePostulo && (
        <div className="mb-6 rounded-lg border border-siatec-200 bg-siatec-50 px-4 py-3 text-sm text-siatec-700 dark:border-siatec-800 dark:bg-siatec-900/30 dark:text-siatec-300">
          Ya tienes una postulación registrada para esta vacante.
        </div>
      )}

      {feedback.message && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
              : feedback.type === 'info'
                ? 'border-siatec-200 bg-siatec-50 text-siatec-700 dark:border-siatec-800 dark:bg-siatec-900/30 dark:text-siatec-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleLettersOnlyChange}
              placeholder="Ej. Juan"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div>
            <label htmlFor="apellidoPaterno" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Apellido paterno <span className="text-red-500">*</span>
            </label>
            <input
              id="apellidoPaterno"
              name="apellidoPaterno"
              type="text"
              value={form.apellidoPaterno}
              onChange={handleLettersOnlyChange}
              placeholder="Ej. Pérez"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div>
            <label htmlFor="apellidoMaterno" className="mb-1 block text-sm font-medium text-[var(--text)]">Apellido materno</label>
            <input
              id="apellidoMaterno"
              name="apellidoMaterno"
              type="text"
              value={form.apellidoMaterno}
              onChange={handleLettersOnlyChange}
              placeholder="Ej. García"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
          <div>
            <label htmlFor="rfc" className="mb-1 block text-sm font-medium text-[var(--text)]">
              RFC <span className="text-red-500">*</span>
            </label>
            <input
              id="rfc"
              name="rfc"
              type="text"
              maxLength={RFC_LONGITUD}
              autoComplete="off"
              value={form.rfc}
              onChange={handleRfcChange}
              placeholder={`${RFC_LONGITUD} caracteres`}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div>
            <label htmlFor="curp" className="mb-1 block text-sm font-medium text-[var(--text)]">
              CURP <span className="text-red-500">*</span>
            </label>
            <input
              id="curp"
              name="curp"
              type="text"
              maxLength={CURP_LONGITUD}
              autoComplete="off"
              value={form.curp}
              onChange={handleCurpChange}
              placeholder={`${CURP_LONGITUD} caracteres`}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
          <div>
            <label htmlFor="estado" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              id="estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            >
              <option value="">Selecciona un estado</option>
              {ESTADOS_MEXICO.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="municipio" className="mb-1 block text-sm font-medium text-[var(--text)]">Municipio</label>
            <input
              id="municipio"
              name="municipio"
              type="text"
              autoComplete="off"
              value={form.municipio}
              onChange={handleLettersOnlyChange}
              placeholder="Ej. Zapopan"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
          <div>
            <label htmlFor="telefono" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Número de teléfono <span className="text-red-500">*</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              inputMode="numeric"
              maxLength={12}
              autoComplete="off"
              value={form.telefono}
              onChange={handlePhoneChange}
              placeholder="Ej. 3331234567"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div>
            <label htmlFor="correo" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="off"
              value={form.correo}
              onChange={handleChange}
              placeholder="Ej. correo@ejemplo.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
          <div>
            <label htmlFor="expectativasSalariales" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Expectativa salarial <span className="text-red-500">*</span>
            </label>
            <input
              id="expectativasSalariales"
              name="expectativasSalariales"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={form.expectativasSalariales}
              onChange={handleSalaryChange}
              placeholder="Ej. 15000"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div>
            <label htmlFor="habilidadesClave" className="mb-1 block text-sm font-medium text-[var(--text)]">Habilidades</label>
            <input
              id="habilidadesClave"
              name="habilidadesClave"
              type="text"
              value={form.habilidadesClave}
              onChange={handleChange}
              placeholder="Ej. Trabajo en equipo, atención al detalle"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-6">
          <FileField
            id="comprobanteEstudios"
            label="Comprobante de estudios"
            required
            file={comprobanteEstudios}
            onChange={(e) => setComprobanteEstudios(e.target.files[0] || null)}
            helpText={
              carrerasRequeridas.length > 0 ? (
                <>
                  <p className="mb-1">Carreras que acepta este puesto:</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {carrerasRequeridas.map((carrera) => (
                      <li key={carrera}>{carrera}</li>
                    ))}
                  </ul>
                </>
              ) : (
                'Este puesto no especifica una carrera mínima.'
              )
            }
          />
        </div>

        {certificacionesRequeridas.length > 0 && (
          <div className="border-t border-[var(--border)] pt-6">
            <h3 className="mb-1 text-lg font-semibold text-[var(--text)]">Certificaciones requeridas</h3>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Este puesto pide las siguientes certificaciones. Adjunta el archivo de cada una.
            </p>

            <div className="space-y-4">
              {certificacionesRequeridas.map((certificacion) => (
                <div
                  key={certificacion.id}
                  className="flex flex-col gap-4 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="sm:max-w-xs">
                    <p className="font-medium text-[var(--text)]">
                      {certificacion.nombre} <span className="text-red-500">*</span>
                    </p>
                    {(certificacion.institucion || certificacion.vigencia) && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {[certificacion.institucion, certificacion.vigencia].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="sm:w-64">
                    <input
                      id={`certificacion-${certificacion.id}`}
                      name={`certificacion-${certificacion.id}`}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleCertificacionFileChange(certificacion.id)}
                      className="w-full text-sm text-[var(--text)] file:mr-3 file:rounded-md file:border-0 file:bg-siatec-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-siatec-700"
                    />
                    {archivosPorCertificacion[certificacion.id] && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Archivo seleccionado: {archivosPorCertificacion[certificacion.id].name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="mb-1 text-lg font-semibold text-[var(--text)]">Documentación requerida</h3>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Estos documentos los pide específicamente este perfil de puesto.
          </p>

          {documentosRequeridos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Este perfil no pide documentación adicional.</p>
          ) : (
            <div className="space-y-4">
              {documentosRequeridos.map((documento) => (
                <div
                  key={documento.id}
                  className="flex flex-col gap-4 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="sm:max-w-xs">
                    <p className="font-medium text-[var(--text)]">
                      {documento.nombre} {documento.obligatorio && <span className="text-red-500">*</span>}
                    </p>
                    {documento.observaciones && (
                      <p className="mt-1 text-xs text-[var(--muted)]">{documento.observaciones}</p>
                    )}
                  </div>

                  <div className="sm:w-64">
                    <input
                      id={`documento-${documento.id}`}
                      name={`documento-${documento.id}`}
                      type="file"
                      onChange={handleDocumentoFileChange(documento.id)}
                      className="w-full text-sm text-[var(--text)] file:mr-3 file:rounded-md file:border-0 file:bg-siatec-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-siatec-700"
                    />
                    {archivosPorDocumento[documento.id] && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Archivo seleccionado: {archivosPorDocumento[documento.id].name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={enviando || yaSePostulo}
          className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {enviando ? 'Enviando...' : 'Enviar postulación'}
        </button>
      </form>
    </section>
  )
}

export default PostularsePerfilPuesto
