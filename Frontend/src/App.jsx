import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Postulacion from './pages/Postulacion.jsx'
import Registro from './pages/Registro.jsx'
import VerificarCuenta from './pages/VerificarCuenta.jsx'
import Login from './pages/Login.jsx'
import RecuperarAcceso from './pages/RecuperarAcceso.jsx'
import RestablecerContrasena from './pages/RestablecerContrasena.jsx'
import Panel from './pages/Panel.jsx'
import Documentos from './pages/Documentos.jsx'
import Vacantes from './pages/Vacantes.jsx'
import PerfilPuestoDetalle from './pages/PerfilPuestoDetalle.jsx'
import PostularsePerfilPuesto from './pages/PostularsePerfilPuesto.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Postulacion />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/verificar" element={<VerificarCuenta />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-acceso" element={<RecuperarAcceso />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/vacantes" element={<Vacantes />} />
        <Route path="/puestos/:id" element={<PerfilPuestoDetalle />} />
        <Route path="/puestos/:id/postularme" element={<PostularsePerfilPuesto />} />
      </Route>
    </Routes>
  )
}

export default App
