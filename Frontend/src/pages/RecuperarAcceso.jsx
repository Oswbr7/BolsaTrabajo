import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

function RecuperarAcceso() {
  const navigate = useNavigate()

  const [correoOTelefono, setCorreoOTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [codigoDev, setCodigoDev] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback({ type: '', message: '' })

    if (!correoOTelefono) {
      setFeedback({ type: 'error', message: 'Ingresa tu correo electrónico o teléfono.' })
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/cuentas/recuperar-acceso', { correoOTelefono })
      setEnviado(true)
      setFeedback({ type: 'success', message: response.data.mensaje })
      if (response.data.codigoVerificacionDev) {
        setCodigoDev(response.data.codigoVerificacionDev)
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al solicitar la recuperación.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleContinuar = () => {
    navigate('/restablecer-contrasena', { state: { correoOTelefono, codigoVerificacionDev: codigoDev } })
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Recuperar acceso</h2>
        <p className="text-[var(--muted)]">Ingresa tu correo o teléfono y te generamos un código para restablecer tu contraseña.</p>
      </div>

      {codigoDev && (
        <div className="mb-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-semibold">Modo de prueba — sin envío real de correo/SMS todavía</p>
          <p className="mt-1">
            Código de recuperación: <span className="font-mono text-base tracking-widest">{codigoDev}</span>
          </p>
        </div>
      )}

      {feedback.message && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!enviado && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="correoOTelefono" className="mb-1 block text-sm font-medium text-[var(--text)]">Correo electrónico o teléfono</label>
            <input
              id="correoOTelefono"
              name="correoOTelefono"
              type="text"
              autoComplete="off"
              value={correoOTelefono}
              onChange={(e) => setCorreoOTelefono(e.target.value)}
              placeholder="correo@ejemplo.com o 3331234567"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {loading ? 'Enviando...' : 'Enviar código de recuperación'}
          </button>
        </form>
      )}

      {enviado && (
        <button
          type="button"
          onClick={handleContinuar}
          className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 md:w-auto"
        >
          Ya tengo mi código, continuar
        </button>
      )}

      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿Ya la recordaste? <Link to="/login" className="font-semibold text-siatec-600 hover:underline">Inicia sesión</Link>
      </p>
    </section>
  )
}

export default RecuperarAcceso
