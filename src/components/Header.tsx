import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Bell, MessageSquare, LogOut, X, Trash } from 'lucide-react'
import solarisLogo from '../assets/solarislogo.png'

interface HeaderProps {
  titulo: string;
  onAbrirChat: () => void;
}

export default function Header({ titulo, onAbrirChat }: HeaderProps) {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [mostrarMenuNotificaciones, setMostrarMenuNotificaciones] = useState(false);

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar');
    return data ? JSON.parse(data) : null;
  }, []);

  useEffect(() => {
    if (!usuarioLogueado) return;

    const cargarNotificaciones = async () => {
      const { data } = await supabase
        .from('notificaciones')
        .select(`*, autor:perfiles!autor_id(nombre, apellidos, avatar_url)`)
        .eq('usuario_id', usuarioLogueado.id)
        .order('creado_at', { ascending: false });
      if (data) setNotificaciones(data);
    };

    cargarNotificaciones();

    const channel = supabase.channel('header_notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usuarioLogueado.id}` }, () => {
        cargarNotificaciones();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [usuarioLogueado]);

  const eliminarNotificacion = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await supabase.from('notificaciones').delete().eq('id', id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const limpiarNotificaciones = async () => {
      await supabase.from('notificaciones').delete().eq('usuario_id', usuarioLogueado.id);
      setNotificaciones([]);
      setMostrarMenuNotificaciones(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('session_gea_solar');
    navigate('/login');
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
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
          <h1 className="font-black text-sm md:text-base uppercase italic tracking-tighter text-slate-900 hidden sm:block">{titulo}</h1>
        </div>
        
        {/* DERECHA: Controles */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Botón Chat Global */}
          <button onClick={onAbrirChat} className="p-2 bg-white shadow-sm hover:bg-orange-100 text-slate-500 hover:text-orange-500 rounded-full transition-all relative border border-slate-200">
              <MessageSquare className="w-5 h-5" />
          </button>

          {/* Campanita Notificaciones */}
          <div className="relative">
              <button onClick={() => setMostrarMenuNotificaciones(!mostrarMenuNotificaciones)} className="p-2 bg-white shadow-sm hover:bg-orange-100 text-slate-500 hover:text-orange-500 rounded-full transition-all relative border border-slate-200">
                  <Bell className="w-5 h-5" />
                  {notificaciones.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">{notificaciones.length}</span>}
              </button>
              <AnimatePresence>
                  {mostrarMenuNotificaciones && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed top-16 right-4 left-4 md:absolute md:top-full md:right-0 md:left-auto mt-2 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 flex flex-col max-h-[80vh]">
                          <div className="bg-slate-900 p-4 text-white font-black text-xs uppercase flex justify-between items-center shrink-0">Notificaciones <button onClick={() => setMostrarMenuNotificaciones(false)}><X size={16}/></button></div>
                          <div className="overflow-y-auto flex-1 custom-scrollbar">
                              {notificaciones.length === 0 ? <div className="p-6 text-center text-slate-400 text-xs font-bold">Sin alertas.</div> : notificaciones.map(notif => (
                                  <div key={notif.id} className="p-4 border-b border-slate-50 relative group hover:bg-slate-50">
                                      <p className="text-xs text-slate-800 leading-tight font-bold pr-6"><span className="text-orange-600">{notif.autor?.nombre}</span> {notif.mensaje}</p>
                                      <button onClick={(e) => eliminarNotificacion(notif.id, e)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                  </div>
                              ))}
                          </div>
                          {notificaciones.length > 0 && <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0"><button onClick={limpiarNotificaciones} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 flex items-center justify-center gap-2 transition-colors"><Trash size={14}/> Limpiar Todas</button></div>}
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          {/* Perfil Usuario */}
          <div className="bg-white px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 md:gap-3 shadow-sm">
            <div className="text-right flex flex-col hidden sm:flex">
              <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{usuarioLogueado?.nombre}</span>
              <span className="text-[9px] font-bold text-orange-500 uppercase mt-1 truncate max-w-[120px]">{usuarioLogueado?.puesto_actual}</span>
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