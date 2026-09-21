import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const SesionContext = createContext(null)

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  const refrescarSesion = useCallback(async () => {
    try {
      const response = await axios.get('/api/cuentas/sesion')
      setUsuario({ nombre: response.data.nombre, rol: response.data.rol })
    } catch (err) {
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    refrescarSesion()
  }, [refrescarSesion])

  const cerrarSesion = useCallback(async () => {
    try {
      await axios.post('/api/cuentas/logout')
    } finally {
      setUsuario(null)
    }
  }, [])

  return (
    <SesionContext.Provider value={{ usuario, cargando, refrescarSesion, cerrarSesion }}>
      {children}
    </SesionContext.Provider>
  )
}

export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de un SesionProvider')
  }
  return contexto
}
