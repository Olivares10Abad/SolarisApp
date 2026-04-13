import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { ArrowLeft, MessageSquare, LogOut } from 'lucide-react'
import solarisLogo from '../assets/solarislogo.png'

// IMPORTAR EL COMPONENTE GLOBAL DE NOTIFICACIONES
import NotificacionesGlobales from './NotificacionesGlobales'

interface HeaderProps {
  titulo: string;
  onAbrirChat: (chatInicial?: any) => void;
}

export default function Header({ titulo, onAbrirChat }: HeaderProps) {
  const navigate = useNavigate();

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar');
    return data ? JSON.parse(data) : null;
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('session_gea_solar');
    navigate('/login');
  };

  // MANEJADOR DE CLICS EN NOTIFICACIONES (DEEP LINKING AL CHAT)
  const handleNotifClick = (notif: any) => {
      if (notif.mensaje.includes('|||')) {
          const [textoOriginal, ruta] = notif.mensaje.split('|||');
          navigate(ruta);
      } else if (notif.mensaje.includes('mensaje directo')) {
          onAbrirChat({ tipo: 'dm', id: notif.autor_id, nombre: `${notif.autor?.nombre} ${notif.autor?.apellidos}` });
      } else if (notif.mensaje.includes('mencionó') || notif.mensaje.includes('grupo')) {
          onAbrirChat(); 
      }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-[60] shadow-sm h-16 flex items-center relative">
      <div className="max-w-[1700px] mx-auto px-4 md:px-6 w-full flex items-center justify-between">
        
        {/* IZQUIERDA: Logo y Título */}
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate('/home')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-500">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <img src={solarisLogo} alt="GEA" className="h-6 md:h-7 w-auto" />
          <div className="h-4 sm:h-6 w-px bg-slate-200 mx-1 sm:mx-2" />
          <h1 className="font-black text-[10px] sm:text-sm md:text-base uppercase italic tracking-tighter text-slate-900 truncate max-w-[110px] sm:max-w-none">{titulo}</h1>
        </div>
        
        {/* DERECHA: Controles */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Botón Chat Global */}
          <button onClick={() => onAbrirChat()} className="p-2 bg-white shadow-sm hover:bg-orange-100 text-slate-500 hover:text-orange-500 rounded-full transition-all relative border border-slate-200">
              <MessageSquare className="w-5 h-5" />
          </button>

          {/* COMPONENTE GLOBAL DE NOTIFICACIONES */}
          <NotificacionesGlobales 
              usuarioLogueado={usuarioLogueado} 
              onClickNotificacion={handleNotifClick} 
          />

          {/* Perfil Usuario */}
          <div className="bg-white px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 md:gap-3 shadow-sm">
            <div className="text-right flex flex-col hidden sm:flex justify-center">
              <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{usuarioLogueado?.nombre}</span>
            </div>
            <div className="w-6 h-6 md:w-8 md:h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-[10px] overflow-hidden shadow-inner">
                {usuarioLogueado?.avatar_url ? <img src={usuarioLogueado.avatar_url} className="w-full h-full object-cover" /> : usuarioLogueado?.nombre?.charAt(0)}
            </div>
          </div>

          {/* Botón Salir */}
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-xl border border-slate-200 shadow-sm hidden sm:block">
            <LogOut size={20}/>
          </button>

        </div>
      </div>
    </nav>
  );
}