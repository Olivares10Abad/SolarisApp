import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Trash } from 'lucide-react';

export default function NotificacionesGlobales({ usuarioLogueado, onClickNotificacion }: any) {
    const [notificaciones, setNotificaciones] = useState<any[]>([]);
    const [mostrarMenu, setMostrarMenu] = useState(false);

    useEffect(() => {
        if (!usuarioLogueado) return;

        const cargarNotificaciones = async () => {
            const { data } = await supabase
                .from('notificaciones')
                .select(`*, autor:perfiles!autor_id(id, nombre, apellidos, avatar_url)`)
                .eq('usuario_id', usuarioLogueado.id)
                .order('creado_at', { ascending: false });
            if (data) setNotificaciones(data);
        };

        cargarNotificaciones();

        const channel = supabase.channel('global_notifs')
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
        setMostrarMenu(false);
    };

    const handleNotifClick = async (notif: any) => {
        if (onClickNotificacion) onClickNotificacion(notif);
        setMostrarMenu(false);
        await supabase.from('notificaciones').delete().eq('id', notif.id);
        setNotificaciones(prev => prev.filter(n => n.id !== notif.id));
    };

    return (
        <div className="relative">
            <button onClick={() => setMostrarMenu(!mostrarMenu)} className="p-2 text-slate-500 hover:text-orange-500 rounded-full transition-all relative">
                <Bell size={24} />
                {notificaciones.length > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-black text-white">{notificaciones.length}</span>}
            </button>
            <AnimatePresence>
                {mostrarMenu && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed top-16 right-4 left-4 md:absolute md:top-full md:right-0 md:left-auto mt-2 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[9999] flex flex-col max-h-[80vh]">
                        <div className="bg-slate-900 p-4 text-white font-black text-xs uppercase flex justify-between items-center shrink-0">Notificaciones <button onClick={() => setMostrarMenu(false)}><X size={16}/></button></div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {notificaciones.length === 0 ? <div className="p-6 text-center text-slate-400 text-xs font-bold">Sin alertas.</div> : notificaciones.map(notif => (
                                <div key={notif.id} onClick={() => handleNotifClick(notif)} className="p-4 border-b border-slate-50 relative group hover:bg-orange-50 cursor-pointer transition-colors pr-12">
                                    <p className="text-xs text-slate-800 leading-tight font-bold"><span className="text-orange-600">{notif.autor?.nombre}</span> {notif.mensaje.split('|||')[0]}</p>
                                    <button onClick={(e) => eliminarNotificacion(notif.id, e)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-1.5 rounded-lg transition-all shadow-sm"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                        {notificaciones.length > 0 && <div className="p-3 bg-white border-t border-slate-200 shrink-0"><button onClick={limpiarNotificaciones} className="w-full py-2.5 rounded-xl bg-slate-900 border-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-600 hover:border-red-600 flex items-center justify-center gap-2 transition-all shadow-md"><Trash size={14}/> Limpiar Todas</button></div>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}