import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const REGEX_PASSWORD_VALIDA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function RestablecerContrasena() {
  const location = useLocation()
  const navigate = useNavigate()

  const [correoOTelefono, setCorreoOTelefono] = useState(location.state?.correoOTelefono || '')
  const [codigo, setCodigo] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [restablecida, setRestablecida] = useState(false)

  const codigoDev = location.state?.codigoVerificacionDev || ''
  const passwordValida = nuevaPassword.length === 0 || REGEX_PASSWORD_VALIDA.test(nuevaPassword)
  const passwordsCoinciden = confirmarPassword.length === 0 || confirmarPassword === nuevaPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback({ type: '', message: '' })

    if (!correoOTelefono || !codigo || !nuevaPassword || !confirmarPassword) {
      setFeedback({ type: 'error', message: 'Completa todos los campos.' })
      return
    }

    if (!REGEX_PASSWORD_VALIDA.test(nuevaPassword)) {
      setFeedback({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.' })
      return
    }

    if (nuevaPassword !== confirmarPassword) {
      setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' })
      return
    }

    setLoading(true)

    try {
      await axios.post('/api/cuentas/restablecer-contrasena', {
        correoOTelefono,
        codigo,
        nuevaPassword,
        confirmarPassword,
      })
      setRestablecida(true)
      setFeedback({ type: 'success', message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' })
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo restablecer la contraseña.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Restablecer contraseña</h2>
        <p className="text-[var(--muted)]">Ingresa el código de recuperación y tu nueva contraseña.</p>
      </div>

      {codigoDev && !restablecida && (
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

      {!restablecida && (
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

          <div>
            <label htmlFor="codigo" className="mb-1 block text-sm font-medium text-[var(--text)]">Código de recuperación</label>
            <input
              id="codigo"
              name="codigo"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-center text-lg font-mono tracking-[0.5em] text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
            />
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <div>
              <label htmlFor="nuevaPassword" className="mb-1 block text-sm font-medium text-[var(--text)]">Nueva contraseña</label>
              <input
                id="nuevaPassword"
                name="nuevaPassword"
                type="password"
                autoComplete="new-password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={`w-full rounded-lg border bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:ring-2 ${
                  !passwordValida
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-[var(--border)] focus:border-siatec-500 focus:ring-siatec-500/20'
                }`}
              />
              {!passwordValida && (
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
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿No solicitaste esto? <Link to="/login" className="font-semibold text-siatec-600 hover:underline">Volver a iniciar sesión</Link>
      </p>
    </section>
  )
}

export default RestablecerContrasena
