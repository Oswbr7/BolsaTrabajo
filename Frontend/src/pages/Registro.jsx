import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = '/api/cuentas/registro'

const PAISES = [
  'México',
  'Estados Unidos',
  'Guatemala',
  'Colombia',
  'Argentina',
  'España',
  'Otro',
]

const REGEX_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const REGEX_TELEFONO = /^\d{10,12}$/
const REGEX_PASSWORD_VALIDA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function Registro() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '',
    correoOTelefono: '',
    password: '',
    confirmarPassword: '',
    paisResidencia: 'México',
  })
  const [aceptoTerminos, setAceptoTerminos] = useState(false)
  const [leyoAvisoPrivacidad, setLeyoAvisoPrivacidad] = useState(false)
  const [cuentaDesarrollo, setCuentaDesarrollo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [conflicto, setConflicto] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const tipoContactoDetectado = REGEX_CORREO.test(form.correoOTelefono.trim())
    ? 'correo'
    : REGEX_TELEFONO.test(form.correoOTelefono.trim())
      ? 'telefono'
      : null

  const passwordValida = REGEX_PASSWORD_VALIDA.test(form.password)
  const passwordsCoinciden = form.confirmarPassword.length === 0 || form.confirmarPassword === form.password

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback({ type: '', message: '' })
    setConflicto(false)

    if (!form.nombre || !form.correoOTelefono || !form.password || !form.confirmarPassword || !form.paisResidencia) {
      setFeedback({ type: 'error', message: 'Completa todos los campos obligatorios.' })
      return
    }

    if (!tipoContactoDetectado) {
      setFeedback({ type: 'error', message: 'Ingresa un correo electrónico válido o un teléfono a 10 dígitos.' })
      return
    }

    if (!passwordValida) {
      setFeedback({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.' })
      return
    }

    if (form.password !== form.confirmarPassword) {
      setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' })
      return
    }

    if (!aceptoTerminos || !leyoAvisoPrivacidad) {
      setFeedback({ type: 'error', message: 'Debes aceptar los términos de uso y confirmar que leíste el aviso de privacidad.' })
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(API_URL, {
        nombre: form.nombre,
        correoOTelefono: form.correoOTelefono.trim(),
        password: form.password,
        paisResidencia: form.paisResidencia,
        aceptoTerminos: true,
        esCuentaDesarrollo: import.meta.env.DEV && cuentaDesarrollo,
      })

      navigate('/verificar', {
        state: {
          correoOTelefono: response.data.correoOTelefono,
          codigoVerificacionDev: response.data.codigoVerificacionDev,
        },
      })
    } catch (err) {
      if (err.response?.status === 409) {
        setConflicto(true)
        setFeedback({ type: 'error', message: err.response.data?.mensaje || 'Ya existe una cuenta con ese correo o teléfono.' })
      } else {
        const msg = err.response?.data?.mensaje || 'Ocurrió un error al crear la cuenta.'
        setFeedback({ type: 'error', message: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Registrar cuenta de aspirante</h2>
        <p className="text-[var(--muted)]">Crea tu cuenta para postularte a nuestras vacantes.</p>
      </div>

      {feedback.message && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {feedback.message}
          {conflicto && (
            <>
              {' '}
              <Link to="/login" className="font-semibold underline">Iniciar sesión</Link>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-5">
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-[var(--text)]">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div>
            <label htmlFor="correoOTelefono" className="mb-1 block text-sm font-medium text-[var(--text)]">Correo electrónico o teléfono</label>
            <input
              id="correoOTelefono"
              name="correoOTelefono"
              type="text"
              autoComplete="off"
              value={form.correoOTelefono}
              onChange={handleChange}
              placeholder="correo@ejemplo.com o 3331234567"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
            {form.correoOTelefono && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {tipoContactoDetectado === 'correo' && 'Se usará como correo electrónico.'}
                {tipoContactoDetectado === 'telefono' && 'Se usará como número de teléfono.'}
                {!tipoContactoDetectado && 'Formato no reconocido como correo o teléfono.'}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text)]">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              className={`w-full rounded-lg border bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:ring-2 ${
                form.password && !passwordValida
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-[var(--border)] focus:border-siatec-500 focus:ring-siatec-500/20'
              }`}
            />
            {form.password && !passwordValida && (
              <p className="mt-1 text-xs text-red-500">Debe tener al menos 8 caracteres, una letra y un número.</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmarPassword" className="mb-1 block text-sm font-medium text-[var(--text)]">Confirmar contraseña</label>
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmarPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              className={`w-full rounded-lg border bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:ring-2 ${
                !passwordsCoinciden
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-[var(--border)] focus:border-siatec-500 focus:ring-siatec-500/20'
              }`}
            />
            {!passwordsCoinciden && (
              <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden.</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--border)] pt-6">
          <div>
            <label htmlFor="paisResidencia" className="mb-1 block text-sm font-medium text-[var(--text)]">País de residencia</label>
            <select
              id="paisResidencia"
              name="paisResidencia"
              value={form.paisResidencia}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            >
              {PAISES.map((pais) => (
                <option key={pais} value={pais}>{pais}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 border-t border-[var(--border)] pt-6">
          <label className="flex items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={aceptoTerminos}
              onChange={(e) => setAceptoTerminos(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-siatec-600 focus:ring-siatec-500/40"
            />
            Acepto los términos de uso.
          </label>
          <label className="flex items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={leyoAvisoPrivacidad}
              onChange={(e) => setLeyoAvisoPrivacidad(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-siatec-600 focus:ring-siatec-500/40"
            />
            He leído el aviso de privacidad.
          </label>
        </div>

        {import.meta.env.DEV && (
          <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
            <label className="flex items-start gap-2 font-semibold">
              <input
                type="checkbox"
                checked={cuentaDesarrollo}
                onChange={(e) => setCuentaDesarrollo(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500/40"
              />
              Crear cuenta de desarrollo (solo pruebas)
            </label>
            <p className="mt-1">
              Esta opción es únicamente para pruebas internas. La cuenta no recibirá un correo o SMS
              real: el código de verificación aparecerá directamente en la siguiente pantalla, igual
              que antes de conectar un proveedor real. No la actives para cuentas reales de aspirantes.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-siatec-600 hover:underline">Inicia sesión</Link>
      </p>
    </section>
  )
}

export default Registro
