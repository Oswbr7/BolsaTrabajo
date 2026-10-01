import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../context/SesionContext.jsx'
import { TIPOS_DOCUMENTO, TAMANIO_MAXIMO_BYTES, EXTENSIONES_PERMITIDAS, ESTADO_DOCUMENTO_INFO } from '../constants/documentos.js'

const formatoFecha = (valor) => {
  if (!valor) return null
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatoTamanio = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const archivoEsValido = (archivo) => {
  if (!archivo) return false
  const nombre = archivo.name.toLowerCase()
  const extensionValida = EXTENSIONES_PERMITIDAS.some((ext) => nombre.endsWith(ext))
  const tipoValido = ['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type)
  return extensionValida && tipoValido && archivo.size <= TAMANIO_MAXIMO_BYTES
}

/**
 * CU-04: carga y mantenimiento de documentación. Muestra una tarjeta por
 * cada uno de los diez tipos documentales (todos de "slot único": subir
 * uno nuevo reemplaza al vigente, sin perder la versión anterior del lado
 * del servidor).
 */
function Documentos() {
  const { usuario, cargando } = useSesion()

  const [documentos, setDocumentos] = useState(null)
  const [cargandoDocumentos, setCargandoDocumentos] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [tipoAbierto, setTipoAbierto] = useState(null)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [fechaVigencia, setFechaVigencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [feedbackPorTipo, setFeedbackPorTipo] = useState({})

  const cargarDocumentos = useCallback(async () => {
    setCargandoDocumentos(true)
    setErrorCarga('')
    try {
      const response = await axios.get('/api/documentos')
      setDocumentos(response.data)
    } catch (err) {
      setErrorCarga('No se pudieron cargar tus documentos. Intenta recargar la página.')
    } finally {
      setCargandoDocumentos(false)
    }
  }, [])

  useEffect(() => {
    if (usuario) {
      cargarDocumentos()
    }
  }, [usuario, cargarDocumentos])

  const abrirFormulario = (tipo) => {
    setTipoAbierto(tipo)
    setArchivoSeleccionado(null)
    setFechaVigencia('')
    setFeedbackPorTipo((actual) => ({ ...actual, [tipo]: null }))
  }

  const cerrarFormulario = () => {
    setTipoAbierto(null)
    setArchivoSeleccionado(null)
    setFechaVigencia('')
  }

  const handleArchivoChange = (tipo) => (e) => {
    const archivo = e.target.files[0]
    if (!archivo) {
      setArchivoSeleccionado(null)
      return
    }
    if (!archivoEsValido(archivo)) {
      setFeedbackPorTipo((actual) => ({
        ...actual,
        [tipo]: { type: 'error', message: 'Solo se permiten archivos PDF, JPG o PNG de hasta 5 MB.' },
      }))
      setArchivoSeleccionado(null)
      e.target.value = ''
      return
    }
    setFeedbackPorTipo((actual) => ({ ...actual, [tipo]: null }))
    setArchivoSeleccionado(archivo)
  }

  const handleSubir = async (tipo) => {
    if (!archivoSeleccionado) {
      setFeedbackPorTipo((actual) => ({ ...actual, [tipo]: { type: 'error', message: 'Selecciona un archivo.' } }))
      return
    }

    const formData = new FormData()
    formData.append('TipoDocumento', tipo)
    formData.append('Archivo', archivoSeleccionado)
    if (fechaVigencia) {
      formData.append('FechaVigencia', fechaVigencia)
    }

    setGuardando(true)
    try {
      await axios.post('/api/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      cerrarFormulario()
      await cargarDocumentos()
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al cargar el documento.'
      setFeedbackPorTipo((actual) => ({ ...actual, [tipo]: { type: 'error', message: msg } }))
    } finally {
      setGuardando(false)
    }
  }

  const handleVer = (id) => {
    window.open(`/api/documentos/${id}/archivo`, '_blank')
  }

  const handleEliminar = async (tipo, id) => {
    setFeedbackPorTipo((actual) => ({ ...actual, [tipo]: null }))
    try {
      await axios.delete(`/api/documentos/${id}`)
      await cargarDocumentos()
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al eliminar el documento.'
      setFeedbackPorTipo((actual) => ({ ...actual, [tipo]: { type: 'error', message: msg } }))
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

  if (cargandoDocumentos) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-[var(--muted)]">Cargando tus documentos…</p>
      </section>
    )
  }

  if (errorCarga) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-red-500">{errorCarga}</p>
      </section>
    )
  }

  const documentosPorTipo = Object.fromEntries((documentos || []).map((d) => [d.tipoDocumento, d]))

  const inputClase =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20'

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
        <h2 className="text-2xl font-bold text-[var(--text)]">Documentos</h2>
        <p className="text-[var(--muted)]">
          Carga y mantén actualizados los documentos de tu expediente. Puedes reemplazar cualquiera de ellos cuando lo necesites.
        </p>
      </div>

      <div className="space-y-4">
        {TIPOS_DOCUMENTO.map(({ tipo, etiqueta }) => {
          const documento = documentosPorTipo[tipo]
          const estado = documento?.estado || 'sinCargar'
          const estadoInfo = ESTADO_DOCUMENTO_INFO[estado] || ESTADO_DOCUMENTO_INFO.sinCargar
          const feedback = feedbackPorTipo[tipo]
          const formularioAbierto = tipoAbierto === tipo

          return (
            <div key={tipo} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--text)]">{etiqueta}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoInfo.clase}`}>
                      {estadoInfo.etiqueta}
                    </span>
                  </div>
                  {documento?.id ? (
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      <p>{documento.nombreArchivo} · {formatoTamanio(documento.tamanioBytes)}</p>
                      <p>
                        Cargado el {formatoFecha(documento.fechaCarga)}
                        {documento.fechaVigencia ? ` · Vigencia: ${formatoFecha(documento.fechaVigencia)}` : ''}
                        {documento.numeroVersion > 1 ? ` · Versión ${documento.numeroVersion}` : ''}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--muted)]">Todavía no has cargado este documento.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {documento?.id && (
                    <button
                      type="button"
                      onClick={() => handleVer(documento.id)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-siatec-400"
                    >
                      Ver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (formularioAbierto ? cerrarFormulario() : abrirFormulario(tipo))}
                    className="rounded-lg bg-siatec-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-siatec-700"
                  >
                    {documento?.id ? 'Reemplazar' : 'Subir'}
                  </button>
                  {documento?.id && (
                    <button
                      type="button"
                      onClick={() => handleEliminar(tipo, documento.id)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-red-500 shadow-sm transition hover:border-red-400"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>

              {feedback && !formularioAbierto && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                  {feedback.message}
                </div>
              )}

              {formularioAbierto && (
                <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                  {feedback && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                      {feedback.message}
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">Archivo (PDF, JPG o PNG, máx. 5 MB)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleArchivoChange(tipo)}
                      className={inputClase}
                    />
                    {archivoSeleccionado && (
                      <p className="mt-1 text-xs text-[var(--muted)]">Archivo seleccionado: {archivoSeleccionado.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">Fecha de vigencia (opcional)</label>
                    <input
                      type="date"
                      value={fechaVigencia}
                      onChange={(e) => setFechaVigencia(e.target.value)}
                      className={inputClase}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSubir(tipo)}
                      disabled={guardando}
                      className="rounded-lg bg-siatec-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {guardando ? 'Cargando...' : 'Cargar documento'}
                    </button>
                    <button
                      type="button"
                      onClick={cerrarFormulario}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-siatec-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Documentos
