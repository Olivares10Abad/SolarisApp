import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'
import ProyectosList from './pages/Proyectos'
import Cotizaciones from './pages/Cotizaciones'
import Revision from './pages/Revisión'
import Inventario from './pages/Inventario'
import RutaProtegida from './components/RutaProtegida'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Privadas / RBAC */}
        <Route path="/home" element={<RutaProtegida><Home /></RutaProtegida>} />
        <Route path='/perfil' element={<RutaProtegida><Perfil /></RutaProtegida>} />
        <Route path="/usuarios" element={<RutaProtegida permisoRequerido="usuarios"><Usuarios /></RutaProtegida>} />
        <Route path="/cotizaciones" element={<RutaProtegida permisoRequerido="cotizaciones"><Cotizaciones /></RutaProtegida>} />
        <Route path="/revision" element={<RutaProtegida permisoRequerido="revision_cotizaciones"><Revision /></RutaProtegida>} />
        <Route path="/inventario" element={<RutaProtegida permisoRequerido="inventario"><Inventario /></RutaProtegida>} />
        <Route path="/proyectos" element={<RutaProtegida permisoRequerido="proyectos"><ProyectosList /></RutaProtegida>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App