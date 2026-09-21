import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSesion } from '../context/SesionContext.jsx'

function Layout() {
  const { usuario, cargando, cerrarSesion } = useSesion()
  const navigate = useNavigate()

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' ||
      (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  const handleCerrarSesion = async () => {
    await cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-siatec-400 to-slate-700 shadow">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 21 23.931 23.931 0 013 13.255M12 7a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-[var(--text)]">SIATEC</span>
          </div>

          <nav className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-sm font-medium">
            {/* Postulación ahora requiere sesión iniciada (sin sesión, la ruta
                "/" redirige sola a /login) — el enlace sigue el mismo patrón
                que Mi panel / Documentos / Vacantes: solo visible con cuenta. */}
            {!cargando && usuario && (
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-siatec-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-siatec-500'
                  }`
                }
              >
                Postulación
              </NavLink>
            )}

            {!cargando && usuario && (
              <NavLink
                to="/panel"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-siatec-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-siatec-500'
                  }`
                }
              >
                Mi panel
              </NavLink>
            )}

            {!cargando && usuario && (
              <NavLink
                to="/documentos"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-siatec-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-siatec-500'
                  }`
                }
              >
                Documentos
              </NavLink>
            )}

            {!cargando && usuario && (
              <NavLink
                to="/vacantes"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-siatec-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-siatec-500'
                  }`
                }
              >
                Vacantes
              </NavLink>
            )}

            {!cargando && !usuario && (
              <NavLink
                to="/registro"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-siatec-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-siatec-500'
                  }`
                }
              >
                Crear cuenta
              </NavLink>
            )}

            {!cargando && !usuario && (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-siatec-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-siatec-500'
                  }`
                }
              >
                Iniciar sesión
              </NavLink>
            )}
          </nav>

          {!cargando && usuario && (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-[var(--muted)] sm:inline">Hola, {usuario.nombre}</span>
              <button
                type="button"
                onClick={handleCerrarSesion}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--muted)] shadow-sm transition hover:border-red-400 hover:text-red-500"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-siatec-400 hover:text-siatec-500"
            aria-label="Cambiar modo oscuro/claro"
          >
            {darkMode ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Claro
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Oscuro
              </>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
