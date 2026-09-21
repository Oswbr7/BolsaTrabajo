import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const SEGUNDOS_COOLDOWN_REENVIO = 60

function VerificarCuenta() {
  const location = useLocation()
  const navigate = useNavigate()

  const [correoOTelefono, setCorreoOTelefono] = useState(location.state?.correoOTelefono || '')
  const [codigoDev, setCodigoDev] = useState(location.state?.codigoVerificacionDev || '')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [verificada, setVerificada] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setCooldown((actual) => Math.max(actual - 1, 0))
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [cooldown])

  useEffect(() => {
    // Si venimos de /registro, ya hay un código recién generado: arrancamos
    // el cooldown de reenvío para respetar el mismo límite de frecuencia
    // que usa el backend.
    if (location.state?.codigoVerificacionDev) {
      setCooldown(SEGUNDOS_COOLDOWN_REENVIO)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVerificar = async (e) => {
    e.preventDefault()
    setFeedback({ type: '', message: '' })

    if (!correoOTelefono || !codigo) {
      setFeedback({ type: 'error', message: 'Ingresa tu correo/teléfono y el código de 6 dígitos.' })
      return
    }

    setLoading(true)

    try {
      await axios.post('/api/cuentas/verificar', { correoOTelefono, codigo })
      setVerificada(true)
      setFeedback({ type: 'success', message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.' })
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo verificar el código.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleReenviar = async () => {
    if (!correoOTelefono || cooldown > 0) {
      return
    }

    setReenviando(true)
    setFeedback({ type: '', message: '' })

    try {
      const response = await axios.post('/api/cuentas/reenviar-codigo', { correoOTelefono })
      setCodigoDev(response.data.codigoVerificacionDev)
      setCooldown(SEGUNDOS_COOLDOWN_REENVIO)
      setFeedback({ type: 'success', message: 'Se generó un nuevo código.' })
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data?.segundosRestantes || SEGUNDOS_COOLDOWN_REENVIO)
      }
      const msg = err.response?.data?.mensaje || 'No se pudo reenviar el código.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setReenviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Verificar cuenta</h2>
        <p className="text-[var(--muted)]">Ingresa el código de 6 dígitos que enviamos a tu correo o teléfono.</p>
      </div>

      {codigoDev && !verificada && (
        <div className="mb-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-semibold">Modo de prueba — sin envío real de correo/SMS todavía</p>
          <p className="mt-1">
            Código de verificación: <span className="font-mono text-base tracking-widest">{codigoDev}</span>
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

      {!verificada && (
        <form onSubmit={handleVerificar} className="space-y-6">
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
            <label htmlFor="codigo" className="mb-1 block text-sm font-medium text-[var(--text)]">Código de verificación</label>
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

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verificando...' : 'Verificar cuenta'}
            </button>

            <button
              type="button"
              onClick={handleReenviar}
              disabled={reenviando || cooldown > 0}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-base font-semibold text-[var(--text)] shadow-sm transition hover:border-siatec-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cooldown > 0 ? `Reenviar código (${cooldown}s)` : reenviando ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿Ya verificaste tu cuenta? <Link to="/login" className="font-semibold text-siatec-600 hover:underline">Inicia sesión</Link>
      </p>
    </section>
  )
}

export default VerificarCuenta
