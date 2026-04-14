import { motion } from 'framer-motion'
import { X, History, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { calcularHorasHabilesSLA, getEstiloSLA } from '../utils/sla'

export default function ModalLineaTiempo({ logs, proyecto, onClose, onAbrirChatFase }: any) {
    if (!logs) logs = [];

    // Calcular SLA dinámico basado en las transiciones
    // El timer se "reinicia" después de una "Corrección"
    const logsUnicosEstatus = logs.filter((l:any, i:number, arr:any[]) => arr.findIndex(x => x.estado_nuevo === l.estado_nuevo) === i && l.estado_nuevo);

    return (
        <div className="fixed inset-0 z-[1055] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl text-emerald-400"><History size={20}/></div>
                        <div>
                            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter">Línea de Vida SLA</h3>
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1 truncate max-w-[150px] md:max-w-full">
                                {proyecto?.nombre_proyecto}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-50 flex-1 relative">
                    
                    <div className="absolute top-0 bottom-0 left-10 md:left-14 w-1 bg-slate-200" />
                    
                    {logs.map((log: any, i: number) => {
                        // Calcular SLA: Diferencia entre el log actual y el log anterior inmediato (i+1 porque está invertido descending)
                        let horasSla = 0;
                        if (i < logs.length - 1) {
                            const evtPrevio = logs[i + 1];
                            horasSla = calcularHorasHabilesSLA(evtPrevio.created_at, log.created_at);
                        }
                        const esNuevoInicio = log.accion.includes('Corrección') || log.accion.includes('Creado');
                        const styleSla = getEstiloSLA(horasSla);

                        return (
                            <div key={log.id} className="relative flex items-start gap-4 md:gap-6 mb-8 group">
                                <div className="mt-1 flex flex-col items-center z-10 w-12 md:w-16">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm ${esNuevoInicio ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white'}`}>
                                        {esNuevoInicio ? <Clock size={16}/> : <CheckCircle2 size={16}/>}
                                    </div>
                                    {!esNuevoInicio && i < logs.length - 1 ? (
                                        <div className={`mt-2 text-[9px] font-black uppercase px-2 py-1 rounded-full border shadow-sm flex items-center gap-1 ${styleSla.bg} ${styleSla.color} ${styleSla.border}`}>
                                            <TimerIcon /> {horasSla}h
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[8px] font-bold text-slate-400 uppercase">Inicio Timer</div>
                                    )}
                                </div>
                                
                                <div className="flex-1 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 group-hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-3">
                                        <div>
                                            <p className="font-black text-xs md:text-sm uppercase text-slate-800">{log.accion}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{log.perfiles?.nombre} {log.perfiles?.apellidos}</p>
                                        </div>
                                        <div className="text-[9px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-500 font-black shrink-0 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString([], { dateStyle:'short', timeStyle:'short' })}
                                        </div>
                                    </div>
                                    <div className="text-[10px] md:text-xs text-slate-600 italic break-words break-all">
                                        {log.mensaje || <span className="opacity-50">Transición de sistema...</span>}
                                    </div>
                                    
                                    {log.estado_nuevo === 'Cotizado' && (
                                        <div className="mt-3 pt-3 border-t border-slate-50 flex gap-2">
                                            <div className="text-[9px] bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-lg uppercase tracking-widest font-black inline-flex items-center gap-1">
                                                <CheckCircle2 size={10}/> Documento Emitido
                                            </div>
                                        </div>
                                    )}

                                    {/* BOTÓN DE CHAT INLINE CON LA FASE (Solo si cambia estatus) */}
                                    {log.estado_nuevo && onAbrirChatFase && (
                                        <div className="mt-3 flex">
                                            <button 
                                                onClick={() => onAbrirChatFase(log.estado_nuevo)} 
                                                className="bg-orange-500 hover:bg-slate-900 border border-transparent hover:border-orange-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all shadow-md mt-1"
                                            >
                                                Chat: {log.estado_nuevo}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </motion.div>
        </div>
    )
}

const TimerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
