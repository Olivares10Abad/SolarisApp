import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'
import ProyectosList from './pages/Proyectos'
import Cotizaciones from './pages/Cotizaciones'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path='/perfil' element={<Perfil />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />

        
        {/* Nueva ruta de Gestión de Proyectos */}
        <Route path="/proyectos" element={<ProyectosList />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App