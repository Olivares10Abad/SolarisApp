import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldAlert, CheckCircle2, Clock, Terminal, ArrowLeft, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function SystemLogs() {
    const navigate = useNavigate();
    const [errores, setErrores] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState<'activos' | 'resueltos' | 'todos'>('activos');

    const fetchErrores = async () => {
        setCargando(true);
        let query = supabase.from('system_errors')
            .select('*, perfiles(nombre, apellidos, puesto_actual)')
            .order('creado_at', { ascending: false });

        if (filtro === 'activos') query = query.eq('resuelto', false);
        if (filtro === 'resueltos') query = query.eq('resuelto', true);

        const { data } = await query.limit(100);
        if (data) setErrores(data);
        setCargando(false);
    };

    useEffect(() => {
        fetchErrores();
    }, [filtro]);

    const marcarResuelto = async (id: string, actual: boolean) => {
        const { error } = await supabase.from('system_errors').update({ resuelto: !actual }).eq('id', id);
        if (!error) {
            setErrores(errores.map(e => e.id === id ? { ...e, resuelto: !actual } : e));
        }
    };

    const formatDate = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleString('es-MX', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-slate-900 text-white p-6 sticky top-0 z-40 shadow-xl shadow-slate-900/10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <Terminal className="w-6 h-6 text-orange-500" /> System Logs
                            </h1>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Rastreador Global de Errores
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase flex items-center gap-2">
                        <Bug className="w-4 h-4 text-orange-500" />
                        <span className="hidden md:inline">Auditoría en</span> Tiempo Real
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-6 mt-6">
                
                {/* Filtros */}
                <div className="flex bg-white p-1.5 rounded-[16px] border border-slate-200 mb-6 shadow-sm w-fit">
                    {[
                        { id: 'activos', label: 'Errores Activos' },
                        { id: 'resueltos', label: 'Resueltos' },
                        { id: 'todos', label: 'Todos los Logs' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFiltro(tab.id as any)}
                            className={`px-5 py-2.5 rounded-[12px] text-[10px] md:text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest ${filtro === tab.id ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Lista de Errores */}
                <div className="space-y-4">
                    {cargando ? (
                        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">Cargando logs del sistema...</div>
                    ) : errores.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[30px] border border-slate-200 border-dashed">
                            <ShieldAlert className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-50" />
                            <h3 className="text-slate-900 font-black text-lg uppercase tracking-tight">Sistema Limpio</h3>
                            <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">No hay errores {filtro === 'activos' ? 'activos' : ''} reportados.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {errores.map(err => (
                                <motion.div 
                                    key={err.id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                    className={`bg-white rounded-[24px] border-2 shadow-sm overflow-hidden transition-all ${err.resuelto ? 'border-slate-100 opacity-70' : 'border-red-100'}`}
                                >
                                    <div className={`p-4 md:p-6 ${err.resuelto ? 'bg-slate-50' : 'bg-red-50/30'}`}>
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md ${err.tipo_error === 'RUNTIME' ? 'bg-red-100 text-red-600' : err.tipo_error === 'CONSOLE_ERROR' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {err.tipo_error}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        <Clock className="w-3 h-3" /> {formatDate(err.creado_at)}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm md:text-base font-black text-slate-900 mb-2 leading-tight font-mono whitespace-pre-wrap break-words">{err.mensaje}</h3>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">URL / Origen</p>
                                                        <p className="text-[10px] font-bold text-slate-700 truncate bg-slate-100 px-2 py-1 rounded" title={err.url_actual || err.origen}>{err.url_actual || err.origen || 'Desconocido'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Usuario Afectado</p>
                                                        <p className="text-[10px] font-bold text-slate-700 truncate bg-slate-100 px-2 py-1 rounded">
                                                            {err.perfiles ? `${err.perfiles.nombre} ${err.perfiles.apellidos} (${err.perfiles.puesto_actual})` : 'Usuario no identificado / Sesión Anónima'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {err.stack_trace && !err.resuelto && (
                                                    <div className="mt-4 bg-slate-900 rounded-xl p-3 md:p-4 overflow-x-auto custom-scrollbar">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Stack Trace</p>
                                                        <pre className="text-[10px] text-emerald-400 font-mono">
                                                            {err.stack_trace}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex md:flex-col items-center gap-3 shrink-0">
                                                <button 
                                                    onClick={() => marcarResuelto(err.id, err.resuelto)}
                                                    className={`w-full md:w-auto px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${err.resuelto ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'}`}
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> {err.resuelto ? 'Reabrir Error' : 'Marcar Resuelto'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

            </div>
        </div>
    );
}
