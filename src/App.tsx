import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'
import ProyectosList from './pages/Proyectos'
import Cotizaciones from './pages/Cotizaciones'
import Revision from './pages/Revisión'
import Inventario from './pages/Inventario'
import Viabilidad from './pages/Viabilidad'
import MetricasSLA from './pages/MetricasSLA'
import RutaProtegida from './components/RutaProtegida'
import { DialogProvider } from './context/DialogContext'

function App() {
  return (
    <DialogProvider>
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
        <Route path="/viabilidad" element={<RutaProtegida permisoRequerido="agendar_viabilidad"><Viabilidad /></RutaProtegida>} />
        <Route path="/inventario" element={<RutaProtegida permisoRequerido="inventario"><Inventario /></RutaProtegida>} />
        <Route path="/proyectos" element={<RutaProtegida permisoRequerido="proyectos"><ProyectosList /></RutaProtegida>} />
        <Route path="/metricas" element={<RutaProtegida><MetricasSLA /></RutaProtegida>} />
      </Routes>
      </BrowserRouter>
    </DialogProvider>
  )
}

export default App