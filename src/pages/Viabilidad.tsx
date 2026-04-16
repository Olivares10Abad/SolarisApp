import { useEffect, useState, useMemo } from 'react'
import { useDialog } from '../context/DialogContext'
import { useNavigate } from 'react-router-dom'
import { supabase, enviarNotificacionVendedor, enviarNotificacionRoles } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import {
   X, Search, Camera, Info, MapPin, Clock, FileText,
   MessageSquare, History, Check, Calendar, MapPin as MapIcon, ChevronRight,
   Timer, AlertCircle, CheckCircle2, Settings
} from 'lucide-react'

import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import ModalLineaTiempo from '../components/ModalLineaTiempo'
import ModalViabilidadDetalle from '../components/ModalViabilidadDetalle'
import ModalCalendarioViabilidad from '../components/ModalCalendarioViabilidad'
import degradadoBg from '../assets/degradado.png'

const STEPS = [
   { id: 1, label: 'Pendiente', filtro: 'Pendiente' },
   { id: 2, label: 'Solicitada', filtro: 'Solicitada' },
   { id: 3, label: 'Planeada', filtro: 'Planeada' },
   { id: 4, label: 'Verificada', filtro: 'Verificada' },
   { id: 5, label: 'Ingeniería', filtro: 'Ingeniería' },
   { id: 7, label: 'Terminada', filtro: 'Terminada' }
]

const calcularHorasHabiles = (fechaCreacion: string | null) => {
   if (!fechaCreacion) return { hours: 0, mins: 0, text: '0h 0m' };
   let start = new Date(fechaCreacion);
   let end = new Date();
   if (start > end) return { hours: 0, mins: 0, text: '0h 0m' };

   let mins = 0; start.setSeconds(0, 0); end.setSeconds(0, 0);
   while (start < end) {
      const day = start.getDay(); const hour = start.getHours();
      if (day >= 1 && day <= 5 && hour >= 9 && hour < 18) mins++;
      start.setMinutes(start.getMinutes() + 1);
   }
   const h = Math.floor(mins / 60); const m = mins % 60;
   return { hours: h, mins: m, text: `${h}h ${m}m` };
}

const getFechaSLA = (v: any) => {
   if (v.status >= 4 && v.fecha_verificada) return v.fecha_verificada;
   if (v.status >= 2 && v.fecha_revisada_ventas) return v.fecha_revisada_ventas;
   return v.fecha_solicitada;
}

export default function Viabilidad() {
    const { showAlert, showConfirm } = useDialog();
   const navigate = useNavigate()
   const [viabilidades, setViabilidades] = useState<any[]>([])
   const [ingenieros, setIngenieros] = useState<any[]>([])
   const [cargando, setCargando] = useState(true)
   const [procesando, setProcesando] = useState(false)
   const [motivoCancelacion, setMotivoCancelacion] = useState('')

   // MODALES
   const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
   const [modalCalendarioAbierto, setModalCalendarioAbierto] = useState(false)
   const [showModalSecundario, setShowModalSecundario] = useState<'Agendar' | 'Visor' | 'Info' | 'Cancelar' | 'Confirmar' | null>(null)
   const [showBitacora, setShowBitacora] = useState(false)

   // Formulario Agenda
   const [agendaForm, setAgendaForm] = useState({
      ingeniero_id: '',
      fecha_inicio: '',
      hora_inicio: '09:00',
      fecha_fin: '',
      hora_fin: '18:00'
   })

   // FILTROS Y BÚSQUEDA
   const [busqueda, setBusqueda] = useState('')
   const [filtroPaso, setFiltroPaso] = useState<number | 'Todos'>('Todos')

   // Archivo
   const [filesReporte, setFilesReporte] = useState<File[]>([])

   // ESTADOS CHAT GLOBAL
   const [chatAbierto, setChatAbierto] = useState(false)
   const [chatInicial, setChatInicial] = useState<any>(null)

   const usuarioLogueado = useMemo(() => {
      const data = localStorage.getItem('session_gea_solar')
      return data ? JSON.parse(data) : null
   }, [])

   const fetchViabilidades = async () => {
      setCargando(true)
      const { data } = await supabase
         .from('viabilidad_control')
         .select(`
        *,
        proyecto:proyecto_id (
          id, id_referencia, nombre_proyecto, giro_proyecto, estatus, sub_estatus, vendedor:vendedor_id (id, nombre, apellidos, avatar_url, numero_empleado),
          link_maps, calle, colonia, ciudad, estado_dir, codigo_postal, nombre_cliente, numero_cliente, requiere_escalera, comentarios_solicitud, fachada_url
        ),
        ingeniero:ingeniero_id (nombre, apellidos)
      `)
         .order('fecha_solicitada', { ascending: false })

      const { data: engs } = await supabase
         .from('perfiles')
         .select('id, nombre, apellidos')
         .ilike('departamento', '%ngenier%')
      if (engs) setIngenieros(engs)

      if (data) {
         setViabilidades(data)
         const searchParams = new URLSearchParams(window.location.search);
         const prId = searchParams.get('proyecto_id');
         if (prId) {
            const encontrado = data.find((v: any) => v.proyecto_id === prId);
            if (encontrado) setProyectoSeleccionado(encontrado);
         }
      }

      setCargando(false)
   }

   const viabilidadesFiltradas = useMemo(() => {
      return viabilidades.filter(v => {
         const p = v.proyecto || {};
         const vend = p.vendedor || {};
         const idRefStr = p.id_referencia ? String(p.id_referencia) : v.id;
         const searchStr = `${p.nombre_proyecto || ''} ${idRefStr} ${p.nombre_cliente || ''} ${vend.nombre || ''}`.toLowerCase();
         const matchTexto = searchStr.includes(busqueda.toLowerCase());
         const matchPaso = filtroPaso === 'Todos' || v.status === (filtroPaso as any);
         return matchTexto && matchPaso;
      });
   }, [viabilidades, busqueda, filtroPaso]);

   const agendarVisita = async () => {
      setProcesando(true)
      try {
         const fechaInicioStr = agendaForm.fecha_inicio;
         const fechaFinStr = agendaForm.fecha_fin || agendaForm.fecha_inicio;

         const updates: any = {
            status: 3, // Force status to Agendada
            fecha_verificada: null, // Reset verification
            ingeniero_id: agendaForm.ingeniero_id,
            fecha_agendada: fechaInicioStr,
            hora_agendada_inicio: agendaForm.hora_inicio,
            fecha_agendada_fin: fechaFinStr,
            hora_agendada_fin: agendaForm.hora_fin
         }
         await supabase.from('viabilidad_control').update(updates).eq('id', proyectoSeleccionado.id)
         await supabase.from('proyectos').update({ sub_estatus: 'Agendada' }).eq('id', proyectoSeleccionado.proyecto_id);

         await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: proyectoSeleccionado.proyecto_id,
            usuario_id: usuarioLogueado?.id,
            estado_anterior: 'Viabilidad',
            estado_nuevo: 'Viabilidad',
            accion: 'Agenda Viabilidad',
            mensaje: `Visita Agendada para ${agendaForm.fecha_inicio} a las ${agendaForm.hora_inicio}`
         }]);

         await enviarNotificacionVendedor(
            proyectoSeleccionado.proyecto?.vendedor?.id || proyectoSeleccionado.proyecto?.vendedor_id,
            `📅 Tu visita de Viabilidad ha sido agendada para el ${agendaForm.fecha_inicio} a las ${agendaForm.hora_inicio}.|||/proyectos?proyecto_id=${proyectoSeleccionado.proyecto_id}`,
            usuarioLogueado?.id
         );

         if (agendaForm.ingeniero_id) {
            await enviarNotificacionVendedor(
               agendaForm.ingeniero_id,
               `🛠️ Se te ha asignado una viabilidad técnica para el ${agendaForm.fecha_inicio} a las ${agendaForm.hora_inicio}: ${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/viabilidad?proyecto_id=${proyectoSeleccionado.proyecto_id}`,
               usuarioLogueado?.id
            );
         }

         setShowModalSecundario(null);
         await fetchViabilidades();
         setProyectoSeleccionado(null)
      } catch (e) {
         await showAlert('Aviso', 'Error al agendar.')
      } finally {
         setProcesando(false)
      }
   }

   const cancelarViabilidad = () => {
      setMotivoCancelacion('');
      setShowModalSecundario('Cancelar');
   }

   const confirmarCancelacion = async () => {
      if (!motivoCancelacion.trim()) {
         await showAlert('Aviso', "Debe ingresar un motivo para el rechazo.");
         return;
      }
      setProcesando(true);
      try {
         await supabase.from('viabilidad_control').update({
            status: 0,
            fecha_agendada: null, fecha_agendada_fin: null, fecha_verificada: null, fecha_terminada: null,
            hora_agendada_inicio: null, hora_agendada_fin: null
         }).eq('id', proyectoSeleccionado.id)
         await supabase.from('proyectos').update({ estatus: 'Evaluación', sub_estatus: null }).eq('id', proyectoSeleccionado.proyecto_id);

         await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: proyectoSeleccionado.proyecto_id,
            usuario_id: usuarioLogueado?.id,
            estado_anterior: 'Viabilidad',
            estado_nuevo: 'Evaluación',
            accion: 'Rechazo',
            mensaje: `Se rechazó la solicitud de viabilidad técnica y se retornó a evaluación. Motivo: ${motivoCancelacion}`
         }]);

         await enviarNotificacionVendedor(
            proyectoSeleccionado.proyecto?.vendedor_id, 
            `❌ Tu solicitud de Viabilidad Técnica ha sido rechazada. Motivo: ${motivoCancelacion}|||/evaluacion?proyecto_id=${proyectoSeleccionado.proyecto_id}`, 
            usuarioLogueado?.id
         );

         setProyectoSeleccionado(null);
         setShowModalSecundario(null);
         await fetchViabilidades();
      } catch (e) {
         console.error(e)
      } finally {
         setProcesando(false)
      }
   }

   const avanzarA = async (targetStatus: number, uploadPdf: boolean = false) => {
      setProcesando(true)
      try {
         const updates: any = { status: targetStatus }
         if (targetStatus === 4) updates.fecha_verificada = new Date().toISOString()
         if (targetStatus === 5 && uploadPdf && filesReporte.length > 0) {
            const uploadedUrls = [];
            for (const file of filesReporte) {
                const fileExt = file.name.split('.').pop()
                const fileName = `viab_${proyectoSeleccionado.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                const { error } = await supabase.storage.from('proyectos_media').upload(fileName, file)
                if (!error) {
                   uploadedUrls.push(supabase.storage.from('proyectos_media').getPublicUrl(fileName).data.publicUrl)
                }
            }
            if (uploadedUrls.length > 0) {
                updates.reportes_ingenieria = uploadedUrls;
                updates.reporte_ingenieria = uploadedUrls[0]; // Compatibility
            }
         }
         if (targetStatus === 7) updates.fecha_terminada = new Date().toISOString();

         await supabase.from('viabilidad_control').update(updates).eq('id', proyectoSeleccionado.id)

         if (targetStatus === 2) {
            updates.status = 1; // Se mantiene en 1 hasta que Ventas apruebe
            await supabase.from('proyectos').update({ estatus: 'Viabilidad', sub_estatus: 'Pendiente Aprobacion Ventas' }).eq('id', proyectoSeleccionado.proyecto_id);

            await supabase.from('proyectos_interacciones').insert([{
               proyecto_id: proyectoSeleccionado.proyecto_id,
               usuario_id: usuarioLogueado?.id,
               estado_anterior: 'Evaluación',
               estado_nuevo: 'Viabilidad',
               accion: 'Evaluación Aceptada',
               mensaje: 'Ingeniería aceptó la solicitud de viabilidad. Esperando aprobación de presupuesto de Ventas.'
            }]);

            await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor_id, `⚙️ Ingeniería aceptó tu Solicitud de Viabilidad. Requiere que apruebes el proyecto en la bandeja de Aprobaciones.`, usuarioLogueado?.id);
         } else if (targetStatus === 7) {
            await supabase.from('proyectos').update({ estatus: 'Viabilidad - Revisión', sub_estatus: null }).eq('id', proyectoSeleccionado.proyecto_id);
            await enviarNotificacionRoles('notif_viabilidad_revision', `Viabilidad Técnica finalizada, requiere revisión gerencial: ${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/revision`, usuarioLogueado?.id);
         } else {
            const map: any = { 4: 'Verificada', 5: 'Ingeniería' }
            if (map[targetStatus]) await supabase.from('proyectos').update({ sub_estatus: map[targetStatus] }).eq('id', proyectoSeleccionado.proyecto_id);
            
            if (targetStatus === 4) {
               await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor_id, `✅ Tu solicitud de Viabilidad Técnica ha sido verificada y confirmada en agenda: ${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/proyectos?proyecto_id=${proyectoSeleccionado.proyecto_id}`, usuarioLogueado?.id);
            }
         }

         await fetchViabilidades();
         setProyectoSeleccionado(null);
      } catch (e) {
         await showAlert('Aviso', 'Error al avanzar viabilidad.')
      } finally {
         setProcesando(false)
      }
   }

   useEffect(() => {
      fetchViabilidades()
   }, [])

   return (
      <div className="min-h-screen relative flex flex-col font-sans">
         <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ backgroundImage: `url(${degradadoBg})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', opacity: 1 }}
         />
         <div className="relative z-10 flex flex-col flex-1 bg-transparent">
            <Header
               titulo="Viabilidad"
               onAbrirChat={(chatInicial) => {
                  setChatInicial(chatInicial);
                  setChatAbierto(true);
               }}
            />

            <main className="flex-1 max-w-[1700px] mx-auto w-full p-4 md:p-8 flex flex-col gap-6">

               {/* --- TABS REDISEÑADAS RESPONSIVAS --- */}
               <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-[20px] shadow-sm border border-slate-200 w-full xl:w-max overflow-x-auto custom-scrollbar shrink-0 mb-4">
                  <button
                     onClick={() => setFiltroPaso('Todos')}
                     className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${filtroPaso === 'Todos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                     TODAS
                  </button>
                  {STEPS.map((s) => (
                     <button
                        key={s.id}
                        onClick={() => setFiltroPaso(s.id)}
                        className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${filtroPaso === s.id ? 'bg-[#ffb000] text-slate-900 shadow-md' : 'text-slate-500 hover:text-[#ffb000] hover:bg-orange-50'}`}
                     >
                        {s.label}
                     </button>
                  ))}
               </div>

               {/* --- BARRA DE FILTROS --- */}
               <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
                     <div className="relative w-full sm:w-80 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Buscar por nombre, ID o vendedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 w-full font-bold text-xs outline-none focus:border-slate-400 shadow-inner" />
                     </div>
                  </div>
                  <button 
                     onClick={() => setModalCalendarioAbierto(true)}
                     className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl px-4 py-2.5 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 uppercase tracking-widest min-w-max"
                  >
                     <Calendar size={16} /> Calendario
                  </button>
               </div>

               {cargando ? (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                     <div className="w-16 h-16 border-4 border-slate-200 border-t-[#ffb000] rounded-full animate-spin shadow-lg" />
                  </div>
               ) : viabilidadesFiltradas.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center opacity-70">
                     <div className="bg-white/60 backdrop-blur-md p-10 rounded-3xl border border-white/40 shadow-xl text-center">
                        <h3 className="font-black text-2xl uppercase tracking-widest text-slate-800">Sin Resultados</h3>
                        <p className="text-sm font-bold text-slate-500 mt-2">No se encontraron viabilidades.</p>
                     </div>
                  </div>
               ) : (
                  <div className="flex flex-col gap-4">
                     {viabilidadesFiltradas.map((v) => {
                        const tagId = v.proyecto?.id_referencia ? `${v.proyecto.id_referencia}` : `${v.proyecto_id.split('-')[0].toUpperCase()}`;
                        const slaStart = getFechaSLA(v);
                        const slaText = calcularHorasHabiles(slaStart).text;
                        const esPendienteVentas = v.proyecto?.sub_estatus === 'Pendiente Aprobacion Ventas';
                        const badgeColor = esPendienteVentas ? 'bg-orange-50 border-orange-200 text-orange-600' : (v.status === 1 ? 'bg-orange-500 text-white' : 'bg-green-50 border-green-200 text-green-600');
                        const labelEstatus = esPendienteVentas ? 'En Revisión (Ventas)' : (v.status === 1 ? (v.proyecto?.sub_estatus || 'Pendiente Ingeniería') : (STEPS.find(s => s.id === v.status)?.label || 'Avanzado'));

                        return (
                           <div key={v.id} onClick={() => setProyectoSeleccionado(v)} className="bg-white border border-slate-100 rounded-[25px] p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group hover:border-[#ffb000] transition-all hover:shadow-xl cursor-pointer relative overflow-hidden">

                              <div className="flex items-center gap-4">
                                 {v.proyecto?.fachada_url ? (
                                    <img src={v.proyecto.fachada_url} alt="fachada" className="w-14 h-14 object-cover rounded-2xl shadow-md border-2 border-slate-100" />
                                 ) : (
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl shadow-md border-2 border-slate-100 flex items-center justify-center text-slate-400">
                                       <MapIcon size={20} />
                                    </div>
                                 )}

                                 <div className="flex-1 overflow-hidden sm:hidden">
                                    <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate pr-16">{v.proyecto?.nombre_proyecto || 'Sin Titulo'}</h4>
                                    <span className={`text-[8px] font-black mt-2 px-2 py-1 rounded-md uppercase border shadow-sm flex items-center gap-1 w-fit ${badgeColor}`}>
                                       {v.status === 1 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />} {labelEstatus}
                                    </span>
                                    <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none"><MapPin size={11} className="text-slate-400" /> ID: {tagId}</p>
                                 </div>
                              </div>

                              <div className="flex-1 overflow-hidden hidden sm:block">
                                 <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate">{v.proyecto?.nombre_proyecto || 'Sin Titulo'}</h4>
                                 <span className={`text-[8px] font-black mt-2 px-2 py-1 rounded-md uppercase border shadow-sm flex items-center gap-1 w-fit ${badgeColor}`}>
                                    {v.status === 1 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />} {labelEstatus}
                                 </span>
                                 <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none">
                                    <MapPin size={11} className="text-slate-400" /> ID: {tagId}
                                 </p>
                              </div>

                              {/* SLA METRICS */}
                              <div className="hidden md:flex flex-col items-end px-4 border-r border-slate-100">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Timer size={10} /> SLA Actual</p>
                                 <p className="text-sm font-black text-slate-800 uppercase">{slaText}</p>
                              </div>

                              <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end items-center w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-50 gap-2">
                                 <div className="md:hidden flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <Timer size={10} className="text-[#ffb000]" /> {slaText}
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); setProyectoSeleccionado(v); }} className="bg-[#ffb000] border border-[#ffb000] text-slate-900 hover:bg-orange-500 hover:border-orange-500 hover:text-white px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-md">
                                    <Settings size={14} /> Gestionar
                                 </button>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </main>
         </div>

         {showModalSecundario === null && proyectoSeleccionado && (
            <ModalViabilidadDetalle
               proyectoSeleccionado={proyectoSeleccionado}
               setProyectoSeleccionado={setProyectoSeleccionado}
               showModalSecundario={showModalSecundario}
               setShowModalSecundario={setShowModalSecundario}
               cancelarViabilidad={cancelarViabilidad}
               avanzarA={avanzarA}
               procesando={procesando}
               setAgendaForm={setAgendaForm}
               fileReporte={filesReporte.length > 0 ? filesReporte[0] : null} // compatibility prop
               filesReporte={filesReporte}
               setFilesReporte={setFilesReporte}
               onChatClick={() => {
                  setChatInicial({
                     tipo: 'proyecto',
                     id: proyectoSeleccionado.proyecto_id,
                     nombre: proyectoSeleccionado.proyecto?.nombre_proyecto || 'Viabilidad',
                     estatusFiltro: 'Viabilidad',
                     estatusProyecto: 'Viabilidad',
                     vendedor_id: proyectoSeleccionado.proyecto?.vendedor?.id
                  });
                  setChatAbierto(true);
               }}
               onBitacoraClick={() => setShowBitacora(true)}
            />
         )}

         <ModalCalendarioViabilidad
            isOpen={modalCalendarioAbierto}
            onClose={() => setModalCalendarioAbierto(false)}
            viabilidades={viabilidades}
            onAbrirProyecto={setProyectoSeleccionado}
         />

         {/* MODAL INFO DETALLADA (MODO VISTA DE LO CAPTURADO EN PROYECTO) */}
         <AnimatePresence>
            {showModalSecundario === 'Info' && proyectoSeleccionado && (
               <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border-[3px] border-slate-100 w-full max-w-[420px] rounded-[32px] overflow-hidden shadow-2xl relative">
                     <div className="bg-slate-50 px-5 py-4 flex justify-between items-center border-b border-slate-100">
                        <h3 className="font-black tracking-widest uppercase text-slate-800 text-[11px] flex items-center gap-2"><Info size={16} /> Info Solicitud de Viabilidad</h3>
                        <button onClick={() => setShowModalSecundario(null)} className="p-1 text-slate-400 hover:text-red-500"><X size={26} strokeWidth={2.5} /></button>
                     </div>
                     <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto w-[420px] max-w-full custom-scrollbar">

                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Calle</p>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.proyecto?.calle || 'N/D'}</p>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Colonia</p>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.proyecto?.colonia || 'N/D'}</p>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Ciudad</p>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.proyecto?.ciudad || 'N/D'}</p>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Estado / CP</p>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.proyecto?.estado_dir} / {proyectoSeleccionado.proyecto?.codigo_postal}</p>
                           </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Link Maps Original</p>
                           <a href={proyectoSeleccionado.proyecto?.link_maps} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 block hover:underline break-all leading-tight" title={proyectoSeleccionado.proyecto?.link_maps}>{proyectoSeleccionado.proyecto?.link_maps || 'Sin enviar'}</a>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Escalera Especial</p>
                           <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-[6px] ${proyectoSeleccionado.proyecto?.requiere_escalera ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-slate-200 text-slate-500'}`}>
                              {proyectoSeleccionado.proyecto?.requiere_escalera ? 'SÍ REQUIERE' : 'NO'}
                           </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">Comentarios Solicitud</p>
                           <p className="text-xs font-bold text-slate-700 italic border-l-2 border-[#ffb000] pl-3 py-1">{proyectoSeleccionado.proyecto?.comentarios_solicitud || 'Ningún comentario.'}</p>
                        </div>

                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         {/* MODAL AGENDAR (Mini) */}
         <AnimatePresence>
            {showModalSecundario === 'Cancelar' && (
               <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#f0f2f5] border-[3px] border-white w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl relative">
                     <div className="bg-white px-5 py-4 flex justify-between items-center border-b-[4px] border-red-500">
                        <h3 className="font-black tracking-widest uppercase text-slate-800 text-[11px]">Rechazar Viabilidad</h3>
                        <button onClick={() => setShowModalSecundario(null)} className="p-1 text-slate-400 hover:text-red-500"><X size={26} strokeWidth={2.5} /></button>
                     </div>
                     <div className="p-6 text-center flex flex-col gap-4 bg-white">
                        <div className="mx-auto bg-red-50 text-red-500 w-12 h-12 rounded-full flex items-center justify-center mb-1">
                           <X size={24} strokeWidth={3} />
                        </div>
                        <p className="text-xs font-bold text-slate-600">Al rechazar, el proyecto regresará al área de Evaluación para su revisión y corrección.</p>
                        
                        <div className="text-left w-full mt-2">
                           <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1 block">Motivo de Cancelación</label>
                           <textarea 
                              value={motivoCancelacion}
                              onChange={(e) => setMotivoCancelacion(e.target.value)}
                              placeholder="Ej. La ubicación es incorrecta, falta un documento..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none focus:border-red-400 resize-none h-20"
                           />
                        </div>

                        <div className="flex gap-2 w-full mt-2">
                           <button onClick={() => setShowModalSecundario(null)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">Abortar</button>
                           <button onClick={confirmarCancelacion} disabled={!motivoCancelacion.trim() || procesando} className="flex-1 bg-red-500 text-white shadow-md hover:bg-red-600 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50">Confirmar Rechazo</button>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
            
            {showModalSecundario === 'Confirmar' && (
               <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#f0f2f5] border-[3px] border-white w-full max-w-[320px] rounded-[32px] overflow-hidden shadow-2xl relative">
                     <div className="bg-white px-5 py-4 flex justify-between items-center border-b-[4px] border-green-500">
                        <h3 className="font-black tracking-widest uppercase text-slate-800 text-[11px]">Confirmar Agenda</h3>
                        <button onClick={() => setShowModalSecundario(null)} className="p-1 text-slate-400 hover:text-red-500"><X size={26} strokeWidth={2.5} /></button>
                     </div>
                     <div className="p-6 text-center flex flex-col gap-5 bg-white">
                        <div className="mx-auto bg-green-50 text-green-500 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                           <Check size={24} strokeWidth={3} />
                        </div>
                        <p className="text-xs font-bold text-slate-600">¿Estás seguro de confirmar la cita de viabilidad técnica agendada?</p>
                        <p className="text-[10px] uppercase font-black text-slate-400">Se notificará automáticamente al dueño del proyecto.</p>
                        <div className="flex gap-2 w-full mt-2">
                           <button onClick={() => setShowModalSecundario(null)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">Cancelar</button>
                           <button onClick={() => { setShowModalSecundario(null); avanzarA(4); }} className="flex-1 bg-green-500 text-white shadow-md hover:bg-green-600 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">Confirmar</button>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
            
            {showModalSecundario === 'Agendar' && (
               <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#f0f2f5] border-[3px] border-white w-full max-w-[420px] rounded-[32px] overflow-hidden shadow-2xl relative">
                     <div className="bg-white px-5 py-4 flex justify-between items-center border-b-[4px] border-[#ffb000]">
                        <h3 className="font-black tracking-widest uppercase text-slate-800 text-[11px]">Horario Para Visita</h3>
                        <button onClick={() => setShowModalSecundario(null)} className="p-1 text-slate-400 hover:text-red-500"><X size={26} strokeWidth={2.5} /></button>
                     </div>
                     <div className="p-6">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 mb-6 space-y-6 shadow-sm">

                           {/* Inicio */}
                           <div>
                              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Fecha Viabilidad Inicio</label>
                              <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden w-full bg-white relative hover:border-[#ffb000] focus-within:border-[#ffb000] transition-colors">
                                 <input type="datetime-local" 
                                    value={agendaForm.fecha_inicio && agendaForm.hora_inicio ? `${agendaForm.fecha_inicio}T${agendaForm.hora_inicio.substring(0, 5)}` : ''} 
                                    onChange={e => {
                                       if(e.target.value) {
                                          const [d, t] = e.target.value.split('T');
                                          setAgendaForm({ ...agendaForm, fecha_inicio: d, hora_inicio: t });
                                       } else {
                                          setAgendaForm({ ...agendaForm, fecha_inicio: '', hora_inicio: '' });
                                       }
                                    }} 
                                    className="w-full p-3.5 outline-none text-[12px] uppercase font-black bg-transparent z-10 cursor-pointer" />
                                 <div className="bg-slate-900 text-white w-12 absolute right-0 inset-y-0 flex items-center justify-center pointer-events-none"><Calendar size={18} strokeWidth={2.5} /></div>
                              </div>
                           </div>

                           {/* Fin */}
                           <div>
                              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Fecha Viabilidad Fin</label>
                              <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden w-full bg-white relative hover:border-[#ffb000] focus-within:border-[#ffb000] transition-colors">
                                 <input type="datetime-local" 
                                    value={agendaForm.fecha_fin && agendaForm.hora_fin ? `${agendaForm.fecha_fin}T${agendaForm.hora_fin.substring(0, 5)}` : ''} 
                                    onChange={e => {
                                       if(e.target.value) {
                                          const [d, t] = e.target.value.split('T');
                                          setAgendaForm({ ...agendaForm, fecha_fin: d, hora_fin: t });
                                       } else {
                                          setAgendaForm({ ...agendaForm, fecha_fin: '', hora_fin: '' });
                                       }
                                    }} 
                                    className="w-full p-3.5 outline-none text-[12px] uppercase font-black bg-transparent z-10 cursor-pointer" />
                                 <div className="bg-slate-900 text-white w-12 absolute right-0 inset-y-0 flex items-center justify-center pointer-events-none"><Calendar size={18} strokeWidth={2.5} /></div>
                              </div>
                           </div>

                           {/* Ingeniero Dropdown */}
                           <div>
                              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Ingenieria Asignada</label>
                              <div className="border-[2px] border-slate-900 rounded-xl overflow-hidden relative group transition-colors">
                                 <select value={agendaForm.ingeniero_id} onChange={e => setAgendaForm({ ...agendaForm, ingeniero_id: e.target.value })} className="w-full p-3.5 outline-none text-[12px] uppercase bg-transparent appearance-none relative z-10 font-black ml-1 cursor-pointer">
                                    <option value="" disabled className="text-slate-400">Seleccionar...</option>
                                    {ingenieros.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellidos}</option>)}
                                 </select>
                                 <div className="bg-slate-900 text-[#ffb000] w-10 absolute right-0 inset-y-0 flex items-center justify-center pointer-events-none font-black text-sm px-2 group-hover:bg-slate-800 transition-colors">▼</div>
                              </div>
                           </div>

                        </div>

                        <div className="flex justify-center">
                           <button onClick={agendarVisita} disabled={procesando || !agendaForm.fecha_inicio} className="bg-[#ffb000] text-slate-900 w-full py-4 rounded-[20px] font-black text-[12px] uppercase tracking-widest shadow-xl hover:shadow-[#ffb000]/20 hover:scale-[1.02] transition-all disabled:opacity-50 border border-transparent">
                              {procesando ? 'CARGANDO...' : 'Programar Visita'}
                           </button>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         {/* Visor Fachada */}
         <AnimatePresence>
            {showModalSecundario === 'Visor' && proyectoSeleccionado && (
               <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowModalSecundario(null)}>
                  <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                     src={proyectoSeleccionado.proyecto.fachada_url} className="max-w-full max-h-screen object-contain rounded-[30px] border-4 border-white/10"
                     onClick={(e: any) => e.stopPropagation()}
                  />
                  <button onClick={() => setShowModalSecundario(null)} className="absolute top-6 right-6 text-white p-3 bg-white/20 hover:bg-red-500 rounded-full transition-colors backdrop-blur-md border border-white/20"><X size={32} /></button>
               </div>
            )}
         </AnimatePresence>

         <ChatGlobal
            isOpen={chatAbierto}
            onClose={() => { setChatAbierto(false); setChatInicial(null); }}
            usuarioLogueado={usuarioLogueado}
            chatInicial={chatInicial}
         />

         {showBitacora && proyectoSeleccionado && (
            <ModalLineaTiempo
               proyecto={proyectoSeleccionado.proyecto}
               onClose={() => setShowBitacora(false)}
               usuarioLogueado={usuarioLogueado}
            />
         )}
      </div>
   )
}
