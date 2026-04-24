import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, ArrowRight, LoaderCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabaseClient' // Importamos la conexión a Supabase
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

// Importamos tus activos de marca
import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

export default function Login() {
  const [puestoActual, setPuestoActual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const session = localStorage.getItem('session_gea_solar');
    if (session) {
      navigate('/home');
    }
  }, []);

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

        // Solicitar permisos de notificaciones push si estamos en iOS/Android
        if (Capacitor.isNativePlatform()) {
          try {
            // TODO: Para que esto funcione en Android, DEBES descargar 'google-services.json'
            // desde la consola de Firebase y ponerlo en la carpeta 'android/app/'.
            // Mientras no esté, llamar a PushNotifications.register() crasheará la app.
            let permStatus = await PushNotifications.checkPermissions()
            if (permStatus.receive === 'prompt' || permStatus.receive !== 'granted') {
              permStatus = await PushNotifications.requestPermissions()
            }
            if (permStatus.receive === 'granted') {
              await PushNotifications.register()
            }
          } catch (pushErr) {
            console.log('Push notifications not available in this environment:', pushErr)
          }
        }

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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Tarjeta con Identidad Visual de la App */}
        <div className="bg-white/95 backdrop-blur-xl border border-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden">

          {/* Elemento de diseño decorativo */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500 rounded-full blur-3xl opacity-10 pointer-events-none"></div>

          {/* Cabecera con tu logo centrado */}
          <div className="flex flex-col items-center mb-10 relative z-10">
            <img
              src={solarisLogo}
              alt="GEA Solaris Logo"
              className="h-16 w-auto mb-6 drop-shadow-sm"
            />
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter text-center leading-none">
              Portal Empresarial
            </h1>
            <p className="text-orange-600 mt-3 text-[9px] font-black uppercase tracking-widest text-center bg-orange-50 px-3 py-1 rounded-md w-fit mx-auto border border-orange-100">
              GEA Solaris - Soluciones Energéticas
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">

            {/* Mensaje de Error (si existe) */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700 text-xs font-bold shadow-sm"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            {/* Campo Único: Puesto Actual */}
            <div>
              <label htmlFor="puesto" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">
                Usuario
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <input
                  id="puesto"
                  type={mostrarPassword ? "text" : "password"}
                  placeholder="Escribe tu usuario..."
                  value={puestoActual}
                  onChange={(e) => setPuestoActual(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e as any); }}
                  disabled={cargando}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 font-bold rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-sm shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors focus:outline-none"
                >
                  {mostrarPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botón de Entrada */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-slate-900 hover:bg-orange-500 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl py-4 flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-orange-500/30 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Entrar al Sistema
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Pie de página sutil */}
          <p className="text-center text-slate-400 font-bold text-[10px] mt-10 tracking-widest uppercase relative z-10">
            GEA Solaris © 2026 | ERP
          </p>
        </div>
      </motion.div>
    </div>
  )
}