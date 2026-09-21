import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../context/SesionContext.jsx'

function Login() {
  const navigate = useNavigate()
  const { refrescarSesion } = useSesion()

  const [correoOTelefono, setCorreoOTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [requiereVerificacion, setRequiereVerificacion] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback({ type: '', message: '' })
    setRequiereVerificacion(false)

    if (!correoOTelefono || !password) {
      setFeedback({ type: 'error', message: 'Ingresa tu correo/teléfono y tu contraseña.' })
      return
    }

    setLoading(true)

    try {
      await axios.post('/api/cuentas/login', { correoOTelefono, password })
      await refrescarSesion()
      navigate('/panel')
    } catch (err) {
      if (err.response?.data?.requiereVerificacion) {
        setRequiereVerificacion(true)
      }
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al iniciar sesión.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Iniciar sesión</h2>
        <p className="text-[var(--muted)]">Ingresa con tu correo o teléfono y tu contraseña.</p>
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
          {requiereVerificacion && (
            <>
              {' '}
              <Link
                to="/verificar"
                state={{ correoOTelefono }}
                className="font-semibold underline"
              >
                Verificar cuenta
              </Link>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="correoOTelefono" className="mb-1 block text-sm font-medium text-[var(--text)]">Correo electrónico o teléfono</label>
          <input
            id="correoOTelefono"
            name="correoOTelefono"
            type="text"
            autoComplete="username"
            value={correoOTelefono}
            onChange={(e) => setCorreoOTelefono(e.target.value)}
            placeholder="correo@ejemplo.com o 3331234567"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">Contraseña</label>
            <Link to="/recuperar-acceso" className="text-xs font-semibold text-siatec-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿No tienes cuenta? <Link to="/registro" className="font-semibold text-siatec-600 hover:underline">Regístrate</Link>
      </p>
    </section>
  )
}

export default Login
