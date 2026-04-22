import { useDialog } from '../context/DialogContext'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Save, Clock, Trash2, CalendarDays, Edit3, CalendarRange, Users, Lock
} from 'lucide-react'

import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import degradadoBg from '../assets/degradado.png'

const festivosMexico = [
    { mes: 0, dia: 1, titulo: 'Año Nuevo' }, { mes: 1, dia: 5, titulo: 'Día de la Constitución' },
    { mes: 2, dia: 21, titulo: 'Natalicio Benito Juárez' }, { mes: 3, dia: 2, titulo: 'Jueves Santo' },
    { mes: 3, dia: 3, titulo: 'Viernes Santo' }, { mes: 4, dia: 1, titulo: 'Día del Trabajo' },
    { mes: 4, dia: 5, titulo: 'Batalla de Puebla' }, { mes: 8, dia: 16, titulo: 'Día de la Independencia' },
    { mes: 10, dia: 2, titulo: 'Día de Muertos' }, { mes: 10, dia: 20, titulo: 'Revolución Mexicana' },
    { mes: 11, dia: 25, titulo: 'Navidad' },
]

export default function Calendario() {
    const { showAlert, showConfirm } = useDialog();
    const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
    const [cargando, setCargando] = useState(true);

    // Navigation & Chat
    const [chatAbierto, setChatAbierto] = useState(false)
    const [chatInicial, setChatInicial] = useState<any>(null)

    // States for Calendar
    const [vistaActual, setVistaActual] = useState<'mes' | 'semana' | 'dia'>('mes');
    const [fechaBase, setFechaBase] = useState(new Date());

    // Data
    const [eventos, setEventos] = useState<any[]>([]);
    const [proyectos, setProyectos] = useState<any[]>([]);
    const [usuarios, setUsuarios] = useState<any[]>([]);

    // Admin Filter
    const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('');

    // Modal State
    const [modalAbierto, setModalAbierto] = useState(false);
    const [eventoEditando, setEventoEditando] = useState<any>(null);
    const [soloLectura, setSoloLectura] = useState(false);
    const [formEvento, setFormEvento] = useState({
        titulo: '', descripcion: '',
        fecha_inicio: '', hora_inicio: '12:00',
        fecha_fin: '', hora_fin: '13:00',
        todo_el_dia: false, color: '#3b82f6',
        proyecto_id: '', asignado_a: ''
    });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('session_gea_solar');
        if (data) {
            const u = JSON.parse(data);
            setUsuarioLogueado(u);
            setFiltroUsuarioId(u.id);
            cargarDatos(u.id);
        }
    }, []);

    const cargarDatos = async (uid: string) => {
        setCargando(true);

        const [resEventos, resProy, resUsr, resViabilidades, resVacaciones] = await Promise.all([
            supabase.from('calendario_eventos')
                .select('*, proyecto:proyecto_id(nombre_proyecto, vendedor_id), responsable:asignado_a(nombre, apellidos)'),
            supabase.from('proyectos').select('id, nombre_proyecto'),
            supabase.from('perfiles').select('id, nombre, apellidos, fecha_nacimiento'),
            supabase.from('viabilidad_control')
                .select('*, proyecto:proyecto_id(nombre_proyecto, vendedor_id)')
                .not('fecha_agendada', 'is', null),
            supabase.from('solicitudes_vacaciones').select('*').eq('estado', 'Aprobada')
        ]);

        let evsCombinados: any[] = [];

        if (resEventos.data) {
            resEventos.data.forEach((e: any) => {
                const esCreador = e.user_id === uid;
                const esAsignado = e.asignado_a === uid;
                const soyVendedorProy = typeof e.proyecto?.vendedor_id === 'object' ? e.proyecto?.vendedor_id?.id === uid : e.proyecto?.vendedor_id === uid;
                
                if (esAsignado) {
                    evsCombinados.push({
                        ...e,
                        id: `ev-asig-${e.id}`,
                        color: '#ef4444', // Rojo para asignado
                        solo_lectura_forzado: !esCreador,
                        titulo: `(Asignado) ${e.titulo}`
                    });
                }
                
                if (soyVendedorProy) {
                    evsCombinados.push({
                        ...e,
                        id: `ev-dueno-${e.id}`,
                        color: '#f97316', // Naranja para dueño de proyecto
                        solo_lectura_forzado: true,
                        titulo: `(Tu Proyecto) ${e.titulo}`
                    });
                }

                // If it's only created by me but I'm not assigned nor the owner
                if (esCreador && !esAsignado && !soyVendedorProy) {
                    evsCombinados.push(e);
                }
            });
        }

        if (resViabilidades.data) {
            resViabilidades.data.forEach((v: any) => {
                // Checar si el usuario filtro está involucrado
                const soyVendedor = typeof v.proyecto?.vendedor_id === 'object' ? v.proyecto?.vendedor_id?.id === uid : v.proyecto?.vendedor_id === uid;
                const soyIngeniero = v.ingeniero_id === uid;
                
                if (soyVendedor || soyIngeniero) {
                    const [y, m, dStr] = v.fecha_agendada.split('-');
                    const [hIni, minIni] = (v.hora_agendada_inicio || '09:00').split(':');
                    const [hFin, minFin] = (v.hora_agendada_fin || '10:00').split(':');
                    
                    const dInicio = new Date(parseInt(y), parseInt(m) - 1, parseInt(dStr), parseInt(hIni), parseInt(minIni), 0);
                    const dFin = new Date(parseInt(y), parseInt(m) - 1, parseInt(dStr), parseInt(hFin), parseInt(minFin), 0);
                    
                    if (soyIngeniero) {
                        evsCombinados.push({
                            id: `viab-ing-${v.id}`,
                            user_id: 'system',
                            es_viabilidad: true,
                            titulo: `Viab (Asignada): ${v.proyecto?.nombre_proyecto || 'S/N'}`,
                            descripcion: `Eres el ingeniero responsable.`,
                            fecha_inicio: dInicio.toISOString(),
                            fecha_fin: dFin.toISOString(),
                            todo_el_dia: (!v.hora_agendada_inicio),
                            color: '#ef4444', // Rojo
                            proyecto_id: v.proyecto_id,
                            proyecto: { nombre_proyecto: v.proyecto?.nombre_proyecto }
                        });
                    }

                    if (soyVendedor) {
                        evsCombinados.push({
                            id: `viab-ven-${v.id}`,
                            user_id: 'system',
                            es_viabilidad: true,
                            titulo: `Viab (Tu Proyecto): ${v.proyecto?.nombre_proyecto || 'S/N'}`,
                            descripcion: `Eres el vendedor de este proyecto.`,
                            fecha_inicio: dInicio.toISOString(),
                            fecha_fin: dFin.toISOString(),
                            todo_el_dia: (!v.hora_agendada_inicio),
                            color: '#f97316', // Naranja
                            proyecto_id: v.proyecto_id,
                            proyecto: { nombre_proyecto: v.proyecto?.nombre_proyecto }
                        });
                    }
                }
            });
        }

        const añoActual = new Date().getFullYear();

        // 1. Festivos
        festivosMexico.forEach(f => {
            const inicio = new Date(añoActual, f.mes, f.dia, 0, 0, 0);
            const fin = new Date(añoActual, f.mes, f.dia, 23, 59, 59);
            evsCombinados.push({
                id: `fest-${f.mes}-${f.dia}`,
                user_id: 'system', es_viabilidad: true, // read-only
                titulo: f.titulo, descripcion: 'Día Festivo Nacional 🇲🇽',
                fecha_inicio: inicio.toISOString(), fecha_fin: fin.toISOString(),
                todo_el_dia: true, color: '#ef4444' // red
            });
        });

        // 2. Cumpleaños
        if (resUsr.data) {
            resUsr.data.forEach((u: any) => {
                if (u.fecha_nacimiento && u.fecha_nacimiento.includes('-')) {
                    const [, m, d] = u.fecha_nacimiento.split('-');
                    const inicio = new Date(añoActual, parseInt(m) - 1, parseInt(d), 0, 0, 0);
                    const fin = new Date(añoActual, parseInt(m) - 1, parseInt(d), 23, 59, 59);
                    evsCombinados.push({
                        id: `cump-${u.id}`,
                        user_id: 'system', es_viabilidad: true, // read-only
                        titulo: `Cumpleaños: ${u.nombre}`, descripcion: 'Deseale un feliz cumpleaños! 🎂',
                        fecha_inicio: inicio.toISOString(), fecha_fin: fin.toISOString(),
                        todo_el_dia: true, color: '#f59e0b' // yellow/amber
                    });
                }
            });
        }

        // 3. Vacaciones
        if (resVacaciones.data) {
            resVacaciones.data.forEach((sol: any) => {
                if (sol.user_id === uid) {
                    const inicio = new Date(sol.fecha_inicio + 'T00:00:00');
                    const fin = new Date(sol.fecha_fin + 'T23:59:59');
                    evsCombinados.push({
                        id: `vac-${sol.id}`,
                        user_id: 'system', es_viabilidad: true, // read-only
                        titulo: 'Tus Vacaciones ✈️', descripcion: 'Días de descanso aprobados.',
                        fecha_inicio: inicio.toISOString(), fecha_fin: fin.toISOString(),
                        todo_el_dia: true, color: '#10b981' // green
                    });
                }
            });
        }

        setEventos(evsCombinados);
        if (resProy.data) setProyectos(resProy.data);
        if (resUsr.data) setUsuarios(resUsr.data);
        setCargando(false);
    };

    const handleCambiarFiltroUsuario = (nuevoId: string) => {
        setFiltroUsuarioId(nuevoId);
        cargarDatos(nuevoId);
    };

    const formatearAFormLocal = (dateString: string) => {
        if (!dateString) return { fecha: '', hora: '' };
        const d = new Date(dateString);
        return {
            fecha: d.toISOString().split('T')[0],
            hora: d.toTimeString().substring(0, 5)
        };
    };

    const handleAbrirModal = (evento?: any) => {
        if (evento) {
            const esMio = evento.user_id === usuarioLogueado?.id && !evento.es_viabilidad && !evento.solo_lectura_forzado;
            setSoloLectura(!esMio);
            setEventoEditando(evento);

            const fIni = formatearAFormLocal(evento.fecha_inicio);
            const fFin = formatearAFormLocal(evento.fecha_fin);
            setFormEvento({
                titulo: evento.titulo,
                descripcion: evento.descripcion || '',
                fecha_inicio: fIni.fecha, hora_inicio: fIni.hora,
                fecha_fin: fFin.fecha, hora_fin: fFin.hora,
                todo_el_dia: evento.todo_el_dia,
                color: evento.color || '#3b82f6',
                proyecto_id: evento.proyecto_id || '',
                asignado_a: evento.asignado_a || ''
            });
        } else {
            setSoloLectura(false);
            setEventoEditando(null);
            const now = new Date();
            const later = new Date(now.getTime() + 60 * 60 * 1000); // 1 hr later
            const fIni = formatearAFormLocal(now.toISOString());
            const fFin = formatearAFormLocal(later.toISOString());
            setFormEvento({
                titulo: '', descripcion: '',
                fecha_inicio: fIni.fecha, hora_inicio: fIni.hora,
                fecha_fin: fFin.fecha, hora_fin: fFin.hora,
                todo_el_dia: false, color: '#3b82f6',
                proyecto_id: '', asignado_a: ''
            });
        }
        setModalAbierto(true);
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (soloLectura) return;
        setGuardando(true);
        try {
            const inicio = new Date(`${formEvento.fecha_inicio}T${formEvento.todo_el_dia ? '00:00:00' : formEvento.hora_inicio + ':00'}`);
            const fin = new Date(`${formEvento.fecha_fin}T${formEvento.todo_el_dia ? '23:59:59' : formEvento.hora_fin + ':00'}`);

            const payload = {
                user_id: usuarioLogueado.id,
                titulo: formEvento.titulo,
                descripcion: formEvento.descripcion,
                fecha_inicio: inicio.toISOString(),
                fecha_fin: fin.toISOString(),
                todo_el_dia: formEvento.todo_el_dia,
                color: formEvento.color,
                proyecto_id: formEvento.proyecto_id || null,
                asignado_a: formEvento.asignado_a || null
            };

            if (eventoEditando) {
                await supabase.from('calendario_eventos').update(payload).eq('id', eventoEditando.id);
            } else {
                await supabase.from('calendario_eventos').insert([payload]);
            }
            await cargarDatos(filtroUsuarioId);
            setModalAbierto(false);
        } catch (err) {
            console.error(err);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id: string) => {
        if (soloLectura) return;
        if (!(await showConfirm('¿Seguro que deseas eliminar este evento?'))) return;
        await supabase.from('calendario_eventos').delete().eq('id', id);
        cargarDatos(filtroUsuarioId);
        setModalAbierto(false);
    };

    const generarLinkGoogle = (evento: any) => {
        const formatTime = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
        const inicio = new Date(evento.fecha_inicio);
        const fin = new Date(evento.fecha_fin);

        const dates = evento.todo_el_dia
            ? `${inicio.toISOString().split('T')[0].replace(/-/g, '')}/${new Date(fin.getTime() + 86400000).toISOString().split('T')[0].replace(/-/g, '')}`
            : `${formatTime(inicio)}/${formatTime(fin)}`;

        let detalles = evento.descripcion || '';
        if (evento.proyecto) detalles += `\nProyecto: ${evento.proyecto.nombre_proyecto}`;

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: evento.titulo,
            dates: dates,
            details: detalles
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    };

    // --- RENDERING VIEWS ---
    const getInicioSemana = (fecha: Date) => {
        const f = new Date(fecha);
        const day = f.getDay();
        const diff = f.getDate() - day;
        return new Date(f.setDate(diff));
    };

    const procesarEventosDia = (dayEvs: any[]) => {
        const evs = dayEvs.map(ev => {
            const evS = new Date(ev.fecha_inicio);
            const evE = new Date(ev.fecha_fin);
            let top = 0;
            let height = 64;
            if (!ev.todo_el_dia) {
                const hrOffsets = Math.max(0, evS.getHours() - 7);
                top = (hrOffsets * 64) + (evS.getMinutes() * (64 / 60));
                const diffMs = evE.getTime() - evS.getTime();
                height = Math.max((diffMs / 3600000) * 64, 30);
            }
            return { ...ev, top, height, bottom: top + height, evS };
        });

        evs.sort((a, b) => a.top - b.top);
        const finalEvs: any[] = [];
        let currentGroup: any[] = [];
        let maxBottom = 0;

        evs.forEach(ev => {
            if (currentGroup.length === 0) {
                currentGroup.push(ev);
                maxBottom = ev.bottom;
            } else if (ev.top < maxBottom) {
                currentGroup.push(ev);
                maxBottom = Math.max(maxBottom, ev.bottom);
            } else {
                currentGroup.forEach((gEv, i) => finalEvs.push({ ...gEv, col: i, totalCols: currentGroup.length }));
                currentGroup = [ev];
                maxBottom = ev.bottom;
            }
        });
        currentGroup.forEach((gEv, i) => finalEvs.push({ ...gEv, col: i, totalCols: currentGroup.length }));

        return finalEvs;
    };

    const renderVistaMes = () => {
        const year = fechaBase.getFullYear();
        const month = fechaBase.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                        <div key={d} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-[100px] md:auto-rows-[120px] bg-slate-100 gap-px">
                    {days.map((d, i) => {
                        if (d === null) return <div key={`empty-${i}`} className="bg-slate-50"></div>;
                        const dateObj = new Date(year, month, d);
                        const isToday = new Date().toDateString() === dateObj.toDateString();

                        const evs = eventos.filter(ev => {
                            const evStart = new Date(ev.fecha_inicio);
                            const evEnd = new Date(ev.fecha_fin);
                            // Simplificación para mes: checar si el día está en el rango
                            const checkDate = new Date(year, month, d);
                            return checkDate >= new Date(evStart.setHours(0, 0, 0, 0)) && checkDate <= new Date(evEnd.setHours(23, 59, 59, 999));
                        });

                        return (
                            <div key={d} className={`bg-white p-1 md:p-2 flex flex-col transition-colors hover:bg-slate-50 cursor-pointer ${isToday ? 'bg-orange-50/30' : ''}`} onClick={() => {
                                const f = new Date(year, month, d);
                                setFechaBase(f);
                                setVistaActual('dia');
                            }}>
                                <span className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-orange-500 text-white' : 'text-slate-600'}`}>{d}</span>
                                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-1">
                                    {evs.map(ev => (
                                        <div key={ev.id} onClick={(e) => { e.stopPropagation(); handleAbrirModal(ev); }} className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded text-white cursor-pointer hover:opacity-80 transition-opacity font-bold truncate" style={{ backgroundColor: ev.color }}>
                                            {ev.todo_el_dia ? '' : `${new Date(ev.fecha_inicio).toTimeString().substring(0, 5)} `}{ev.titulo}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderVistaSemana = () => {
        const startOfWeek = getInicioSemana(fechaBase);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            days.push(d);
        }

        const horas = Array.from({ length: 16 }).map((_, i) => i + 7); // 7 a 22

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
                <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="w-16 border-r border-slate-100 shrink-0"></div>
                    <div className="grid grid-cols-7 flex-1">
                        {days.map((d, i) => {
                            const isToday = new Date().toDateString() === d.toDateString();
                            return (
                                <div key={i} className={`py-2 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-orange-50/50' : ''}`}>
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]}</p>
                                    <p className={`text-sm md:text-lg font-bold ${isToday ? 'text-orange-500' : 'text-slate-700'}`}>{d.getDate()}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto flex relative bg-slate-50 custom-scrollbar">
                    <div className="w-16 border-r border-slate-200 bg-white shrink-0 relative z-10">
                        {horas.map(h => (
                            <div key={h} className="h-16 flex items-start justify-center pt-1">
                                <span className="text-[9px] font-bold text-slate-400">{h.toString().padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative bg-white">
                        {horas.map(h => (
                            <div key={`hr-${h}`} className="h-16 border-b border-slate-100/50 w-full absolute pointer-events-none" style={{ top: h * 64 }} />
                        ))}

                        <div className="grid grid-cols-7 absolute inset-0 h-[1024px]">
                            {days.map((d, dIdx) => {
                                const dayEvsRaw = eventos.filter(ev => {
                                    const evStart = new Date(ev.fecha_inicio);
                                    return evStart.getDate() === d.getDate() && evStart.getMonth() === d.getMonth() && evStart.getFullYear() === d.getFullYear();
                                });
                                
                                const processedDayEvs = procesarEventosDia(dayEvsRaw);

                                return (
                                    <div key={`col-${dIdx}`} className="border-r border-slate-100 last:border-r-0 relative">
                                        {processedDayEvs.map((ev, eIdx) => {
                                            const widthCalc = ev.totalCols > 1 ? `calc(${100 / ev.totalCols}% - 4px)` : 'auto';
                                            const leftCalc = ev.totalCols > 1 ? `calc(${ev.col * (100 / ev.totalCols)}% + 2px)` : '4px';
                                            const rightCalc = ev.totalCols > 1 ? 'auto' : '4px';

                                            return (
                                                <div key={eIdx} onClick={(e) => { e.stopPropagation(); handleAbrirModal(ev); }}
                                                    className="absolute rounded-md text-white overflow-hidden cursor-pointer hover:brightness-110 shadow-sm border border-white/20 transition-all z-20 flex flex-col p-1"
                                                    style={{ top: `${ev.top}px`, height: ev.todo_el_dia ? 'auto' : `${ev.height}px`, backgroundColor: ev.color, zIndex: ev.todo_el_dia ? 30 : 20, width: widthCalc, left: leftCalc, right: rightCalc }}>
                                                    <span className="text-[8px] font-black tracking-widest uppercase opacity-90 leading-none mb-0.5">
                                                        {ev.todo_el_dia ? 'TODO EL DÍA' : `${ev.evS.getHours().toString().padStart(2, '0')}:${ev.evS.getMinutes().toString().padStart(2, '0')}`}
                                                        {ev.es_viabilidad && ' (Viab)'}
                                                    </span>
                                                    <span className="text-[9px] font-bold leading-tight line-clamp-2">{ev.titulo}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderVistaDia = () => {
        const isToday = new Date().toDateString() === fechaBase.toDateString();
        const horas = Array.from({ length: 16 }).map((_, i) => i + 7); // 7 a 22

        const dayEvsRaw = eventos.filter(ev => {
            const evStart = new Date(ev.fecha_inicio);
            return evStart.getDate() === fechaBase.getDate() && evStart.getMonth() === fechaBase.getMonth() && evStart.getFullYear() === fechaBase.getFullYear();
        });
        
        const processedDayEvs = procesarEventosDia(dayEvsRaw);

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
                <div className="border-b border-slate-100 bg-slate-50 py-3 text-center shrink-0">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{fechaBase.toLocaleDateString('es-MX', { weekday: 'long' })}</p>
                    <p className={`text-2xl font-black ${isToday ? 'text-orange-500' : 'text-slate-800'}`}>{fechaBase.getDate()}</p>
                </div>
                <div className="flex-1 overflow-y-auto flex relative bg-slate-50 custom-scrollbar">
                    <div className="w-16 border-r border-slate-200 bg-white shrink-0 relative z-10">
                        {horas.map(h => (
                            <div key={h} className="h-20 flex items-start justify-center pt-1">
                                <span className="text-xs font-bold text-slate-400">{h.toString().padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative bg-white">
                        {horas.map(h => (
                            <div key={`hr-${h}`} className="h-20 border-b border-slate-100/50 w-full absolute pointer-events-none" style={{ top: (h - 7) * 80 }} />
                        ))}

                        <div className="absolute inset-0 h-[1280px] relative">
                            {processedDayEvs.map((ev, eIdx) => {
                                const widthCalc = ev.totalCols > 1 ? `calc(${100 / ev.totalCols}% - 16px)` : 'calc(100% - 16px)';
                                const leftCalc = ev.totalCols > 1 ? `calc(${ev.col * (100 / ev.totalCols)}% + 8px)` : '8px';
                                
                                const evTop = !ev.todo_el_dia ? (Math.max(0, ev.evS.getHours() - 7) * 80) + (ev.evS.getMinutes() * (80/60)) : 0;
                                const evHeight = !ev.todo_el_dia ? Math.max(((new Date(ev.fecha_fin).getTime() - ev.evS.getTime()) / 3600000) * 80, 40) : 'auto';

                                return (
                                    <div key={eIdx} onClick={(e) => { e.stopPropagation(); handleAbrirModal(ev); }}
                                        className="absolute rounded-lg text-white overflow-hidden cursor-pointer hover:brightness-110 shadow-md border border-white/20 transition-all z-20 flex flex-col p-3"
                                        style={{ top: `${evTop}px`, height: ev.todo_el_dia ? 'auto' : `${evHeight}px`, backgroundColor: ev.color, zIndex: ev.todo_el_dia ? 30 : 20, width: widthCalc, left: leftCalc }}>
                                        <span className="text-[10px] font-black tracking-widest uppercase opacity-90 mb-1">
                                            {ev.todo_el_dia ? 'TODO EL DÍA' : `${ev.evS.getHours().toString().padStart(2, '0')}:${ev.evS.getMinutes().toString().padStart(2, '0')} - ${new Date(ev.fecha_fin).getHours().toString().padStart(2, '0')}:${new Date(ev.fecha_fin).getMinutes().toString().padStart(2, '0')}`}
                                            {ev.es_viabilidad && ' (Viabilidad)'}
                                        </span>
                                        <span className="text-base font-bold leading-tight">{ev.titulo}</span>
                                        {ev.descripcion && <span className="text-xs opacity-80 mt-1 whitespace-pre-wrap">{ev.descripcion}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const cambiarRango = (offset: number) => {
        const nf = new Date(fechaBase);
        if (vistaActual === 'mes') nf.setMonth(nf.getMonth() + offset);
        else if (vistaActual === 'semana') nf.setDate(nf.getDate() + (offset * 7));
        else nf.setDate(nf.getDate() + offset);
        setFechaBase(nf);
    };

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-900 relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
            <ChatGlobal isOpen={chatAbierto} onClose={() => setChatAbierto(false)} chatInicial={chatInicial} usuarioLogueado={usuarioLogueado} />
            <Header titulo="Calendario" onAbrirChat={(c: any) => { setChatInicial(c || null); setChatAbierto(true); }} />

            <div className="flex-1 w-full max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col">

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                            <button onClick={() => setFechaBase(new Date())} className="px-4 py-2 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-lg">Hoy</button>
                        </div>
                        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-200 gap-1">
                            <button onClick={() => cambiarRango(-1)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
                            <span className="font-black text-[10px] md:text-xs uppercase tracking-widest w-32 md:w-40 text-center text-slate-700">
                                {vistaActual === 'mes' ? fechaBase.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) :
                                    vistaActual === 'semana' ? `Semana ${fechaBase.getDate()} ${fechaBase.toLocaleDateString('es-MX', { month: 'short' })}` :
                                        fechaBase.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                            </span>
                            <button onClick={() => cambiarRango(1)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
                        </div>

                        {usuarioLogueado?.admin_calendario && (
                            <div className="flex items-center bg-white rounded-xl p-1 px-3 shadow-sm border border-slate-200 gap-2">
                                <Users size={14} className="text-orange-500" />
                                <select
                                    value={filtroUsuarioId}
                                    onChange={(e) => handleCambiarFiltroUsuario(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 cursor-pointer"
                                >
                                    <option value={usuarioLogueado.id}>Mi Calendario</option>
                                    {usuarios.filter(u => u.id !== usuarioLogueado.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex-1 md:flex-none">
                            <button onClick={() => setVistaActual('mes')} className={`flex-1 md:flex-none px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors ${vistaActual === 'mes' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Mes</button>
                            <button onClick={() => setVistaActual('semana')} className={`flex-1 md:flex-none px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors ${vistaActual === 'semana' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Semana</button>
                            <button onClick={() => setVistaActual('dia')} className={`flex-1 md:flex-none px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors ${vistaActual === 'dia' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Día</button>
                        </div>
                        <button onClick={() => handleAbrirModal()} className="bg-slate-900 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl shadow-md font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shrink-0">
                            <Plus size={16} /> <span className="hidden sm:inline">Nuevo Evento</span>
                        </button>
                    </div>
                </div>

                {/* View Container */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {cargando ? (
                        <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest"><Clock className="animate-spin mr-2" size={24} /> Cargando...</div>
                    ) : (
                        <>
                            {vistaActual === 'mes' && renderVistaMes()}
                            {vistaActual === 'semana' && renderVistaSemana()}
                            {vistaActual === 'dia' && renderVistaDia()}
                        </>
                    )}
                </div>
            </div>

            {/* Modal Nuevo Evento */}
            <AnimatePresence>
                {modalAbierto && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalAbierto(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
                            <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center ${soloLectura ? 'bg-slate-200/50' : 'bg-slate-50/50'}`}>
                                <h2 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                    {soloLectura ? <Lock size={18} className="text-slate-500" /> : <CalendarIcon size={18} className="text-orange-500" />}
                                    {soloLectura ? 'Detalles del Evento' : (eventoEditando ? 'Editar Evento' : 'Nuevo Evento')}
                                </h2>
                                <div className="flex gap-2">
                                    {eventoEditando && (
                                        <a href={generarLinkGoogle(eventoEditando)} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors tooltip" title="Añadir a Google Calendar">
                                            <CalendarDays size={18} />
                                        </a>
                                    )}
                                    <button onClick={() => setModalAbierto(false)} className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"><X size={18} /></button>
                                </div>
                            </div>

                            <form onSubmit={handleGuardar} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                                {soloLectura && (
                                    <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-blue-100 flex items-center gap-2">
                                        <Lock size={14} /> Este evento es de solo lectura.
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Título del Evento *</label>
                                    <input type="text" required disabled={soloLectura} value={formEvento.titulo} onChange={e => setFormEvento({ ...formEvento, titulo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 disabled:opacity-70 disabled:cursor-not-allowed" placeholder="Ej. Revisión de Proyecto A..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Inicio *</label>
                                        <div className="flex gap-2">
                                            <input type="date" required disabled={soloLectura} value={formEvento.fecha_inicio} onChange={e => setFormEvento({ ...formEvento, fecha_inicio: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500 disabled:opacity-70 disabled:cursor-not-allowed" />
                                            {!formEvento.todo_el_dia && <input type="time" disabled={soloLectura} required value={formEvento.hora_inicio} onChange={e => setFormEvento({ ...formEvento, hora_inicio: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold outline-none focus:border-orange-500 w-24 disabled:opacity-70 disabled:cursor-not-allowed" />}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Fin *</label>
                                        <div className="flex gap-2">
                                            <input type="date" required disabled={soloLectura} value={formEvento.fecha_fin} onChange={e => setFormEvento({ ...formEvento, fecha_fin: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500 disabled:opacity-70 disabled:cursor-not-allowed" />
                                            {!formEvento.todo_el_dia && <input type="time" disabled={soloLectura} required value={formEvento.hora_fin} onChange={e => setFormEvento({ ...formEvento, hora_fin: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold outline-none focus:border-orange-500 w-24 disabled:opacity-70 disabled:cursor-not-allowed" />}
                                        </div>
                                    </div>
                                </div>

                                <label className={`flex items-center gap-3 p-3 border border-slate-100 rounded-xl transition-colors ${soloLectura ? 'cursor-not-allowed opacity-70 bg-slate-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                                    <input type="checkbox" disabled={soloLectura} checked={formEvento.todo_el_dia} onChange={e => setFormEvento({ ...formEvento, todo_el_dia: e.target.checked })} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 disabled:cursor-not-allowed" />
                                    <span className="text-xs font-bold text-slate-700">Todo el día</span>
                                </label>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Color de Etiqueta</label>
                                    <div className="flex gap-2">
                                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a'].map(col => (
                                            <div key={col} onClick={() => !soloLectura && setFormEvento({ ...formEvento, color: col })} className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${soloLectura ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'} ${formEvento.color === col ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 opacity-100' : ''}`} style={{ backgroundColor: col }} />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Proyecto Vinculado (Opcional)</label>
                                    <select disabled={soloLectura} value={formEvento.proyecto_id} onChange={e => setFormEvento({ ...formEvento, proyecto_id: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 text-slate-700 disabled:opacity-70 disabled:cursor-not-allowed">
                                        <option value="">-- Ninguno --</option>
                                        {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre_proyecto}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Asignar a Responsable (Opcional)</label>
                                    <select disabled={soloLectura} value={formEvento.asignado_a} onChange={e => setFormEvento({ ...formEvento, asignado_a: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 text-slate-700 disabled:opacity-70 disabled:cursor-not-allowed">
                                        <option value="">-- Sin Asignar --</option>
                                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Notas / Descripción</label>
                                    <textarea disabled={soloLectura} value={formEvento.descripcion} onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-orange-500 resize-none h-20 disabled:opacity-70 disabled:cursor-not-allowed" placeholder="Detalles extra..." />
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-between">
                                    {(eventoEditando && !soloLectura) ? (
                                        <button type="button" onClick={() => handleEliminar(eventoEditando.id)} className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"><Trash2 size={14} /> Eliminar</button>
                                    ) : <div />}

                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setModalAbierto(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">{soloLectura ? 'Cerrar' : 'Cancelar'}</button>
                                        {!soloLectura && (
                                            <button type="submit" disabled={guardando} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-md disabled:opacity-50">
                                                {guardando ? 'Guardando...' : <><Save size={14} /> Guardar</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
