import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, ChevronLeft, ChevronRight, Search, Calendar, ChevronUp, ChevronDown 
} from 'lucide-react';

interface ModalCalendarioProps {
    isOpen: boolean;
    onClose: () => void;
    postventaes: any[];
    onAbrirProyecto: (postventa: any) => void;
}

const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function ModalCalendarioPostventa({ isOpen, onClose, postventaes, onAbrirProyecto }: ModalCalendarioProps) {
    const [fechaActual, setFechaActual] = useState(new Date());
    const [busqueda, setBusqueda] = useState('');
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);

    const [matches, setMatches] = useState<any[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    // Reset calendar to today when open
    useEffect(() => {
        if (isOpen) {
            setFechaActual(new Date());
            setBusqueda('');
            setMatches([]);
            setCurrentMatchIndex(-1);
        }
    }, [isOpen]);

    // Filtrar postventaes que tengan un agendamiento
    const eventosCalendario = useMemo(() => {
        const agendados: any[] = [];
        postventaes.forEach(v => {
            if (!v.fecha_agendada) return;
            const [y, m, d] = v.fecha_agendada.split('-');
            if (!y || !m || !d) return;
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            
            agendados.push({
                ...v,
                dateObj: date,
                mesIndex: parseInt(m) - 1,
                dia: parseInt(d),
                year: parseInt(y),
                searchText: `${v.proyecto?.nombre_proyecto || ''} ${v.proyecto?.id || ''} ${v.ingeniero_id || ''}`.toLowerCase()
            });
        });
        
        // Sort por fecha
        return agendados.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());
    }, [postventaes]);

    // Lógica de búsqueda avanzada
    useEffect(() => {
        if (!busqueda.trim()) {
            setMatches([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const bLower = busqueda.toLowerCase();
        const found = eventosCalendario.filter(e => e.searchText.includes(bLower));
        setMatches(found);
        
        if (found.length > 0) {
            setCurrentMatchIndex(0);
            const firstMatch = found[0];
            saltarAMes(firstMatch.year, firstMatch.mesIndex);
        } else {
            setCurrentMatchIndex(-1);
        }
    }, [busqueda, eventosCalendario]);

    const saltarAMes = (year: number, month: number) => {
        setFechaActual(new Date(year, month, 1));
    };

    const nextMatch = () => {
        if (matches.length === 0) return;
        let nextIdx = currentMatchIndex + 1;
        if (nextIdx >= matches.length) nextIdx = 0;
        setCurrentMatchIndex(nextIdx);
        saltarAMes(matches[nextIdx].year, matches[nextIdx].mesIndex);
    };

    const prevMatch = () => {
        if (matches.length === 0) return;
        let prevIdx = currentMatchIndex - 1;
        if (prevIdx < 0) prevIdx = matches.length - 1;
        setCurrentMatchIndex(prevIdx);
        saltarAMes(matches[prevIdx].year, matches[prevIdx].mesIndex);
    };

    // Construct Grid
    const diaInicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).getDay();
    const diasEnMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl bg-white rounded-[32px] md:rounded-[40px] shadow-2xl border border-white flex flex-col overflow-hidden max-h-[90vh]"
                >
                    {/* Header Controls */}
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-all shrink-0">
                        <div className="flex items-center gap-4 text-slate-800">
                            <div className="bg-orange-100 p-2.5 rounded-2xl text-orange-600 shadow-inner">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tight">Calendario de Visitas</h2>
                                <p className="text-xs font-bold text-slate-400">Inspecciona cuando han sido agendados los proyectos</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            {/* Barra de busqueda con controles next/prev */}
                            <div className="relative flex items-center w-full sm:w-auto bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                                <span className="pl-3 text-slate-400"><Search size={16}/></span>
                                <input 
                                    type="text" placeholder="Buscar proyecto..." 
                                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                    className="w-full sm:w-48 py-2.5 px-3 text-xs font-bold text-slate-700 outline-none bg-transparent"
                                />
                                {matches.length > 0 && (
                                    <div className="flex items-center pr-2 gap-1 border-l border-slate-100 pl-2">
                                        <span className="text-[10px] font-black text-slate-400 mr-1">{currentMatchIndex + 1}/{matches.length}</span>
                                        <button onClick={prevMatch} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"><ChevronUp size={14}/></button>
                                        <button onClick={nextMatch} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"><ChevronDown size={14}/></button>
                                    </div>
                                )}
                            </div>

                            <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2.5 rounded-xl transition-colors shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Controles de Navegación de Meses */}
                    <div className="px-8 pt-6 pb-2 flex items-center justify-between shrink-0">
                        <button onClick={() => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1))} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-colors">
                            <ChevronLeft size={16}/> Anterior
                        </button>
                        
                        <h3 className="text-xl md:text-2xl font-black uppercase text-slate-800 tracking-widest">{mesesNombres[fechaActual.getMonth()]} {fechaActual.getFullYear()}</h3>
                        
                        <button onClick={() => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1))} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-colors">
                            Siguiente <ChevronRight size={16}/>
                        </button>
                    </div>

                    {/* Grilla Calendario */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white">
                        <div className="grid grid-cols-7 gap-2 md:gap-4 mb-2">
                            {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((d, i) => (
                                <div key={`dn-${i}`} className="text-[10px] md:text-xs font-black text-center text-slate-400 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-2 md:gap-4 auto-rows-fr">
                            {Array.from({ length: diaInicioMes }).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[120px] rounded-2xl bg-transparent" />)}
                            
                            {Array.from({ length: diasEnMes }).map((_, i) => {
                                const dia = i + 1;
                                const maxEventsShow = 3;
                                const evs = eventosCalendario.filter(e => e.year === fechaActual.getFullYear() && e.mesIndex === fechaActual.getMonth() && e.dia === dia);
                                const esHoy = new Date().getDate() === dia && new Date().getMonth() === fechaActual.getMonth() && new Date().getFullYear() === fechaActual.getFullYear();
                                
                                return (
                                    <div 
                                        key={`d-${i}`}
                                        className={`min-h-[80px] md:min-h-[120px] rounded-2xl border flex flex-col p-2 transition-all ${
                                            esHoy ? 'bg-orange-50/50 border-orange-200 shadow-inner' : 'bg-slate-50/50 border-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`text-xs font-black mb-2 flex items-center justify-between ${esHoy ? 'text-orange-600' : 'text-slate-400'}`}>
                                            {dia}
                                            {esHoy && <span className="bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded shadow-sm uppercase">Hoy</span>}
                                        </div>
                                        
                                        <div className="flex flex-col gap-1.5 flex-1 w-full relative z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            {evs.map((ev, idx) => {
                                                const isMatched = matches.length > 0 && matches[currentMatchIndex]?.id === ev.id;
                                                
                                                return (
                                                    <div 
                                                        key={`ev-${ev.id}-${idx}`}
                                                        onClick={() => {
                                                            onClose();
                                                            onAbrirProyecto(ev);
                                                        }}
                                                        className={`p-1.5 md:p-2 rounded-xl border text-left cursor-pointer transition-all truncate text-[9px] font-black uppercase leading-tight ${
                                                            isMatched 
                                                                ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-105 z-20 animate-pulse' 
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:shadow-md'
                                                        }`}
                                                        title={ev.proyecto?.nombre_proyecto}
                                                    >
                                                        <div className="flex items-center gap-1 opacity-80 mb-0.5">
                                                            <span className="shrink-0">📍</span>
                                                            <span className="truncate">{ev.hora_agendada_inicio?.substring(0,5) || 'Sin hora'}</span>
                                                        </div>
                                                        <div className="truncate w-full">{ev.proyecto?.nombre_proyecto || 'S/N'}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
