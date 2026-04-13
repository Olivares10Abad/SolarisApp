import { Navigate, useNavigate } from 'react-router-dom';
import { Home, ShieldAlert } from 'lucide-react';
import degradadoBg from '../assets/degradado.png';

export default function RutaProtegida({ children, permisoRequerido }: { children: JSX.Element, permisoRequerido?: string }) {
    const navigate = useNavigate();
    const sessionData = localStorage.getItem('session_gea_solar');
    
    // Si no hay sesión, regresarlo de inmediato a Login
    if (!sessionData) {
        return <Navigate to="/login" replace />;
    }

    const usuario = JSON.parse(sessionData);

    // Si la ruta requiere un permiso específico y el usuario lo tiene apagado
    if (permisoRequerido && usuario[permisoRequerido] === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-cover bg-fixed relative" style={{ backgroundImage: `url(${degradadoBg})` }}>
                <div className="max-w-md w-full bg-white/95 backdrop-blur-xl border border-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden text-center z-10 flex flex-col items-center">
                   
                   {/* Icono de Alerta */}
                   <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner border border-red-100">
                      <ShieldAlert size={40} />
                   </div>

                   <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4 leading-none">Acceso Restringido</h1>
                   
                   <p className="text-slate-500 font-bold text-xs mb-8 uppercase tracking-widest leading-relaxed">
                      No cuentas con los permisos estructurales asignados para visualizar este módulo.
                   </p>
                   
                   <button onClick={() => navigate('/home')} className="w-full bg-slate-900 hover:bg-orange-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl py-4 flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-orange-500/30 group">
                       <Home size={16} /> Regresar al Inicio
                   </button>
                   
                   <p className="text-center text-slate-400 font-bold text-[9px] mt-8 tracking-widest uppercase relative z-10">
                      GEA Solaris © ERP Security
                   </p>
                </div>
            </div>
        );
    }

    // Si tiene acceso, devolvemos el componente hijo intacto
    return children;
}
