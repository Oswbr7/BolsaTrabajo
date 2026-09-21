import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { SesionProvider } from './context/SesionContext.jsx'

// CU-02: el login usa una cookie de sesión (httpOnly) en vez de un token
// manejado a mano. Para que el navegador la mande y la reciba en cada
// llamada a la API, axios necesita incluir credenciales por defecto.
axios.defaults.withCredentials = true

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SesionProvider>
        <App />
      </SesionProvider>
    </BrowserRouter>
  </StrictMode>,
)
