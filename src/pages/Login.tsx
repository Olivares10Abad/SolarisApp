import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, ArrowRight, LoaderCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabaseClient' // Importamos la conexión a Supabase

// Importamos tus activos de marca
import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

export default function Login() {
  const [puestoActual, setPuestoActual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Limpiamos estados anteriores
    setError(null)
    
    // Validación básica de campo vacío
    if (!puestoActual.trim()) {
        setError('Por favor, escribe tu puesto actual.')
        return
    }

    setCargando(true)

    try {
        // --- LA MAGIA DE SUPABASE ---
        // Buscamos en la tabla 'perfiles' si existe alguien con ese puesto_actual exacto
        const { data, error: supabaseError } = await supabase
            .from('perfiles')
            .select('id, nombre, apellidos, puesto_actual, rol_sistema, departamento')
            .eq('puesto_actual', puestoActual.trim())
            .maybeSingle() // Esperamos un solo resultado o ninguno

        if (supabaseError) throw supabaseError;

        if (data) {
            // ¡Usuario encontrado!
            console.log("Bienvenido:", data.nombre)
            
            // Simulamos una sesión guardando los datos básicos en el navegador
            localStorage.setItem('session_gea_solar', JSON.stringify(data))
            
            // Navegamos al Home
            navigate('/home')
        } else {
            // No se encontró el puesto_actual en la DB
            setError('Nombre de usuario (Puesto Actual) no válido.')
        }

    } catch (err) {
        console.error("Error en login:", err)
        setError('Ocurrió un error al intentar iniciar sesión. Intenta de nuevo.')
    } finally {
        setCargando(false)
    }
  }

  return (
    // Contenedor principal usando tu imagen degradado.png como fondo
    <div 
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{ backgroundImage: `url(${degradadoBg})` }}
    >
      {/* Superposición oscura para mejorar el contraste del texto */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Tarjeta Glassmorphism (Cristal) */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-10 shadow-2xl shadow-black/30">
          
          {/* Cabecera con tu logo centrado */}
          <div className="flex flex-col items-center mb-10">
            <img 
                src={solarisLogo} 
                alt="GEA Solaris Logo" 
                className="h-16 w-auto mb-6 drop-shadow-lg"
            />
            <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">
              Portal Empresarial
            </h1>
            <p className="text-slate-300 mt-2 text-sm text-center">
              GEA Solaris - Soluciones Energéticas
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Mensaje de Error (si existe) */}
            {error && (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 bg-red-950/60 border border-red-700/50 p-4 rounded-xl text-red-200 text-sm"
                >
                    <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                    <p>{error}</p>
                </motion.div>
            )}

            {/* Campo Único: Puesto Actual */}
            <div>
              <label htmlFor="puesto" className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                Nombre de usuario (Puesto Actual)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  id="puesto"
                  type="text" 
                  placeholder="Ej: PacoOl" 
                  value={puestoActual}
                  onChange={(e) => setPuestoActual(e.target.value)}
                  disabled={cargando}
                  className="w-full bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-600 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                  required
                />
              </div>
            </div>

            {/* Botón de Entrada */}
            <button 
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 group disabled:opacity-70 disabled:cursor-not-allowed text-lg"
            >
              {cargando ? (
                  <>
                    <LoaderCircle className="w-6 h-6 animate-spin" />
                    Verificando...
                  </>
              ) : (
                  <>
                    Entrar al Sistema
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                  </>
              )}
            </button>
          </form>

          {/* Pie de página sutil */}
          <p className="text-center text-slate-500 text-xs mt-10">
            GEA Solaris © 2026 | Sistema ERP Integrado
          </p>
        </div>
      </motion.div>
    </div>
  )
}