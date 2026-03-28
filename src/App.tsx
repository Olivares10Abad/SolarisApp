import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path='/perfil' element={<Perfil />} />
        
        {/* 2. Agrega esta línea */}
        <Route path="/usuarios" element={<Usuarios />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App