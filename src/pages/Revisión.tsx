import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, enviarNotificacionRoles, enviarNotificacionVendedor } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, MapPin, FileText, CheckCircle2, AlertCircle, Clock,
  ChevronRight, History, FileCheck, FileX, Timer, Calendar as CalendarIcon,
  Phone, Mail, File as FileIcon, ChevronLeft, ShieldCheck, MessageSquare, Info
} from 'lucide-react'

// IMPORTAMOS NUESTROS COMPONENTES GLOBALES
import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import ModalLineaTiempo from '../components/ModalLineaTiempo'
import ModalViabilidadDetalle from '../components/ModalViabilidadDetalle'

import degradadoBg from '../assets/degradado.png'

// --- HELPERS DE COLORES Y TIEMPOS ---
const ESTADOS_SOLARIS: any = {
  'Cotización': { label: 'Cotización', bg: 'bg-orange-100', text: 'text-orange-700' },
  'Cotización – Revisión': { label: 'Revisión', bg: 'bg-blue-100', text: 'text-blue-700' },
  'Cotizado': { label: 'Cotizado ✨', bg: 'bg-green-100', text: 'text-green-700' },
  'Cotización – Corrección': { label: 'Corrección 🛑', bg: 'bg-red-100', text: 'text-red-700' },
  'Recotización': { label: 'Recotización', bg: 'bg-amber-100', text: 'text-amber-700' },
  'Recotización – Revisión': { label: 'Recot. Revisión', bg: 'bg-blue-100', text: 'text-blue-700' },
};

const getEstiloEstatus = (estatus: string) => {
  const e = estatus?.toLowerCase() || ''
  if (e.includes('recotización')) {
    if (e.includes('revisión')) return ESTADOS_SOLARIS['Recotización – Revisión'];
    return ESTADOS_SOLARIS['Recotización'];
  }
  if (e.includes('revisión')) return ESTADOS_SOLARIS['Cotización – Revisión'];
  if (e.includes('cotizado')) return ESTADOS_SOLARIS['Cotizado'];
  if (e.includes('corrección')) return ESTADOS_SOLARIS['Cotización – Corrección'];
  return ESTADOS_SOLARIS['Cotización'];
}

const calcularHorasHabiles = (fechaCreacion: string) => {
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

export default function Revision() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [usuariosDb, setUsuariosDb] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tabActiva, setTabActiva] = useState('Aprobación Cotización')

  const [modalDetalle, setModalDetalle] = useState(false)
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
  const [showModalSecundario, setShowModalSecundario] = useState<'Agendar' | 'Visor' | 'Info' | null>(null)

  const [docPreview, setDocPreview] = useState<{ urls: string[], currentIndex: number, nombre: string } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [modalListaArchivos, setModalListaArchivos] = useState<{ titulo: string, urls: string[] } | null>(null)

  const [modalLog, setModalLog] = useState(false)
  const [logsProyecto, setLogsProyecto] = useState<any[]>([])

  const [modalRechazo, setModalRechazo] = useState(false)
  const [modalAprobar, setModalAprobar] = useState(false)
  const [destinoRechazo, setDestinoRechazo] = useState<'Cotizador' | 'Vendedor'>('Cotizador')
  const [mensajeRechazo, setMensajeRechazo] = useState('')
  const [mensajeAprobacion, setMensajeAprobacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  // --- ESTADOS DEL CHAT GLOBAL ---
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInicial, setChatInicial] = useState<any>(null)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  const fetchInicial = async () => {
    setCargando(true)
    const [resProyectos, resUsuarios] = await Promise.all([
      supabase.from('proyectos').select(`*, vendedor:vendedor_id (nombre, apellidos, avatar_url, departamento, telefono_movil, email_corporativo)`).order('created_at', { ascending: false }),
      supabase.from('perfiles').select(`id, nombre, apellidos, avatar_url, rol_sistema`).order('nombre', { ascending: true })
    ])
    if (resProyectos.data) setProyectos(resProyectos.data)
    if (resUsuarios.data) setUsuariosDb(resUsuarios.data)
    setCargando(false)
  }

  useEffect(() => { fetchInicial() }, [])

  // --- AUTO-OPEN DEEP LINK ---
  useEffect(() => {
    const pId = searchParams.get('proyecto_id')
    if (pId && proyectos.length > 0) {
      const p = proyectos.find(x => x.id === pId)
      if (p) {
        setProyectoSeleccionado(p)
        setModalDetalle(true)
        searchParams.delete('proyecto_id')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [proyectos, searchParams, setSearchParams])

  const handleRechazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeRechazo.trim()) return alert("Debes ingresar un motivo.");
    setProcesando(true);
    try {
      const isViabilidad = proyectoSeleccionado.estatus === 'Viabilidad' && proyectoSeleccionado.sub_estatus === 'Pendiente Aprobacion Ventas';
      const nuevoEstatus = isViabilidad ? 'Evaluación' : (destinoRechazo === 'Vendedor' ? 'Cotización – Corrección' : 'Cotización');

      const payload: any = { estatus: nuevoEstatus };
      if (isViabilidad) payload.sub_estatus = null;

      await supabase.from('proyectos').update(payload).eq('id', proyectoSeleccionado.id);

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: proyectoSeleccionado.id,
        usuario_id: usuarioLogueado?.id,
        estado_anterior: proyectoSeleccionado.estatus,
        estado_nuevo: nuevoEstatus,
        accion: isViabilidad ? 'Viabilidad Rechazada' : (destinoRechazo === 'Vendedor' ? 'Regresado a Vendedor' : 'Revisión Rechazada'),
        mensaje: mensajeRechazo
      }]);

      if (isViabilidad) {
        // Also reset viabilidad_control
        await supabase.from('viabilidad_control').update({
          status: 0,
          fecha_agendada: null, fecha_verificada: null, fecha_terminada: null,
          hora_agendada_inicio: null, hora_agendada_fin: null
        }).eq('proyecto_id', proyectoSeleccionado.id)
        await enviarNotificacionVendedor(proyectoSeleccionado.vendedor_id, `🚨 Análisis de Viabilidad Rechazado por Ventas/Gerencia: ${proyectoSeleccionado.nombre_proyecto}. Ha regresado a Evaluación.`, usuarioLogueado?.id);
      } else if (destinoRechazo === 'Vendedor') {
        await enviarNotificacionVendedor(proyectoSeleccionado.vendedor_id, `🚨 Corrección solicitada: Tu solicitud ha regresado a tu bandeja: ${proyectoSeleccionado.nombre_proyecto}`, usuarioLogueado?.id);
      } else {
        await enviarNotificacionRoles('notif_cotizaciones', `Revisión rechazada: ${proyectoSeleccionado.nombre_proyecto}|||/cotizaciones?proyecto_id=${proyectoSeleccionado.id}`, usuarioLogueado?.id);
      }

      setModalRechazo(false); setModalDetalle(false); setMensajeRechazo(''); fetchInicial();
    } catch (err: any) { alert("Error: " + err.message); } finally { setProcesando(false); }
  }

  const handleAprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const isRecot = proyectoSeleccionado.estatus.includes('Recotización');
      const isViabilidad = proyectoSeleccionado.estatus === 'Viabilidad' && proyectoSeleccionado.sub_estatus === 'Pendiente Aprobacion Ventas';

      let nuevoEstado = 'Cotizado';
      if (isViabilidad) nuevoEstado = 'Viabilidad';
      else if (isRecot) nuevoEstado = 'Recotizado';

      const payload: any = { estatus: nuevoEstado, fecha_revision: new Date().toISOString() };

      if (isViabilidad) {
        payload.sub_estatus = 'Solicitada';
        // Also advance the viabilidad_control step to 2
        const { data: vControl } = await supabase.from('viabilidad_control').select('id').eq('proyecto_id', proyectoSeleccionado.id).eq('status', 1).single();
        if (vControl) {
          await supabase.from('viabilidad_control').update({ status: 2, fecha_revisada_ventas: new Date().toISOString() }).eq('id', vControl.id);
        }
      } else if (isRecot) {
        payload.fecha_aprobacion_recotizacion = new Date().toISOString();
      } else {
        payload.fecha_aprobacion_cotizacion = new Date().toISOString();
      }

      await supabase.from('proyectos').update(payload).eq('id', proyectoSeleccionado.id);
      await supabase.from('proyectos_interacciones').insert([{ proyecto_id: proyectoSeleccionado.id, usuario_id: usuarioLogueado?.id, estado_anterior: proyectoSeleccionado.estatus, estado_nuevo: nuevoEstado, accion: isViabilidad ? 'Aprobación de Viabilidad' : 'Revisión Aprobada', mensaje: mensajeAprobacion || (isViabilidad ? 'Ventas aprobó continuar con la Viabilidad técnica.' : 'Validado y liberado.') }]);

      if (isViabilidad) {
        await enviarNotificacionVendedor(proyectoSeleccionado.vendedor_id, `✅ Ventas ha aprobado el presupuesto de tu solicitud de viabilidad: ${proyectoSeleccionado.nombre_proyecto}. Continúa en proceso.`, usuarioLogueado?.id);
        await enviarNotificacionRoles('notif_viabilidad_tecnica', `Se ha validado la revisión por ventas, la Viabilidad pasa a estar lista para agendar: ${proyectoSeleccionado.nombre_proyecto}|||/viabilidad?proyecto_id=${proyectoSeleccionado.id}`, usuarioLogueado?.id);
      } else {
        await enviarNotificacionRoles('notif_cotizaciones', `Revisión validada y aprobada: ${proyectoSeleccionado.nombre_proyecto}|||/cotizaciones?proyecto_id=${proyectoSeleccionado.id}`, usuarioLogueado?.id);
        await enviarNotificacionVendedor(proyectoSeleccionado.vendedor_id, `✨ ¡Tu proyecto ha sido Cotizado exitosamente! Míralo y descárgalo aquí.`, usuarioLogueado?.id);
      }

      setModalAprobar(false); setModalDetalle(false); setMensajeAprobacion(''); fetchInicial();
    } catch (err: any) { alert("Error: " + err.message); } finally { setProcesando(false); }
  }

  const abrirVisorArchivos = (titulo: string, urls: string[]) => {
    if (!urls || urls.length === 0) return;
    setZoom(1);
    if (urls.length === 1) { setDocPreview({ urls, currentIndex: 0, nombre: titulo }); }
    else { setModalListaArchivos({ titulo, urls }); }
  };

  const verLogs = async (proyectoId: string) => {
    setModalLog(false);
    const { data } = await supabase.from('proyectos_interacciones').select(`*, perfiles:usuario_id (nombre, apellidos, avatar_url)`).eq('proyecto_id', proyectoId).order('created_at', { ascending: false });
    if (data) setLogsProyecto(data);
    setModalLog(true);
  };

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      // Filtrar por texto
      const matchBusqueda = p.nombre_proyecto.toLowerCase().includes(busqueda.toLowerCase()) || p.giro_proyecto?.toLowerCase().includes(busqueda.toLowerCase());

      // Filtrar por TAB
      let matchTab = false;
      if (tabActiva === 'Aprobación Cotización') {
        matchTab = p.estatus === 'Cotización – Revisión' || p.estatus === 'Recotización – Revisión';
      } else if (tabActiva === 'Aprobación Viabilidad') {
        matchTab = p.estatus === 'Viabilidad' && p.sub_estatus === 'Pendiente Aprobacion Ventas';
      }

      return matchBusqueda && matchTab;
    })
  }, [proyectos, busqueda, tabActiva])

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover flex flex-col" style={{ backgroundImage: `url(${degradadoBg})` }}>

      {/* --- COMPONENTE GLOBAL DE CHAT (POR ENCIMA DEL HEADER) --- */}
      <ChatGlobal
        isOpen={chatAbierto}
        onClose={() => setChatAbierto(false)}
        usuarioLogueado={usuarioLogueado}
        chatInicial={chatInicial}
      />

      {/* HEADER GLOBAL HOMOLOGADO */}
      <Header
        titulo="Aprobaciones"
        onAbrirChat={(chatInit) => {
          setChatInicial(chatInit || null);
          setChatAbierto(true);
        }}
      />

      <main className="max-w-[1700px] mx-auto w-full px-4 md:px-8 py-6 md:py-8 relative z-10 flex-1">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">

          {/* TABS DE NAVEGACION */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 self-start md:self-auto w-full md:w-auto">
            <button onClick={() => setTabActiva('Aprobación Cotización')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${tabActiva === 'Aprobación Cotización' ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
              Aprobación Cotización
            </button>
            <button onClick={() => setTabActiva('Aprobación Viabilidad')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${tabActiva === 'Aprobación Viabilidad' ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
              Aprobación Viabilidad
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 w-full md:w-72 shadow-sm">
            <Search className="text-slate-400 w-4 h-4 shrink-0" />
            <input type="text" placeholder="Buscar solicitud..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {cargando ? (
            <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs">Cargando revisiones...</p>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay proyectos pendientes.</p>
            </div>
          ) : (
            proyectosFiltrados.map((p) => {
              const tiempo = calcularHorasHabiles(p.created_at);
              const slaColor = tiempo.hours >= 24 ? 'text-red-500 font-black' : (tiempo.hours >= 8 ? 'text-orange-500 font-black' : 'text-slate-500 font-bold');
              return (
                <div key={p.id} onClick={() => { setProyectoSeleccionado(p); setModalDetalle(true); }} className="bg-white border border-slate-100 rounded-[20px] md:rounded-[25px] p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 group hover:border-blue-400 transition-all hover:shadow-xl cursor-pointer relative overflow-hidden">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-lg md:text-xl flex-shrink-0 shadow-md"> {p.nombre_proyecto.charAt(0)} </div>
                    <div className="flex-1 overflow-hidden md:hidden">
                      <h4 className="font-black text-slate-950 text-[12px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                      <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none"> <MapPin size={10} className="text-slate-400" /> {p.giro_proyecto} </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden hidden md:grid grid-cols-2 gap-2">
                    <div>
                      <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-[9px] font-semibold text-slate-600 uppercase truncate flex items-center gap-1.5 leading-none"> <MapPin size={11} className="text-slate-400" /> {p.giro_proyecto} </p>
                        {(p.estatus === 'Cotización – Revisión') && (
                          <p className={`text-[9px] uppercase tracking-widest flex items-center gap-1 leading-none ${slaColor}`}> <Timer size={11} /> SLA Total: {tiempo.text} hrs </p>
                        )}
                      </div>
                    </div>
                    {p.vendedor && (
                      <div className="flex flex-col justify-center items-end">
                        <p className="text-[10px] font-bold text-slate-500 uppercase truncate leading-tight"> 👤 {p.vendedor.nombre} {p.vendedor.apellidos} </p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase truncate leading-tight mt-0.5"> 📞 {p.vendedor.telefono_movil || 'Sin teléfono'} </p>
                      </div>
                    )}
                  </div>

                  <div className="flex w-full md:w-auto justify-between md:justify-end items-center mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-50">
                    <span className={`text-[8px] md:text-[9px] font-black px-2.5 md:px-3 py-1.5 rounded-lg md:rounded-xl uppercase border shadow-sm flex items-center gap-1.5 ${getEstiloEstatus(p.estatus).bg} ${getEstiloEstatus(p.estatus).text}`}>
                      {p.estatus.includes('Corrección') ? <AlertCircle size={10} /> : p.estatus.includes('Revisión') ? <ShieldCheck size={10} /> : p.estatus.includes('Cotizado') ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {p.estatus}
                    </span>
                    <div className="text-slate-300 group-hover:text-blue-500 transition-colors px-2 md:block"> <ChevronRight className="w-5 h-5 md:w-6 md:h-6" /> </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL DETALLE (FICHA TÉCNICA) */}
        <AnimatePresence>
          {modalDetalle && proyectoSeleccionado && proyectoSeleccionado.estatus === 'Viabilidad' && proyectoSeleccionado.sub_estatus === 'Pendiente Aprobacion Ventas' && (
            <ModalViabilidadDetalle
              isRevisionMode={true}
              proyectoSeleccionado={proyectoSeleccionado}
              setProyectoSeleccionado={() => setModalDetalle(false)}
              showModalSecundario={showModalSecundario}
              setShowModalSecundario={setShowModalSecundario}
              procesando={procesando}
              onChatClick={() => {
                setChatInicial({ tipo: 'proyecto', id: proyectoSeleccionado.id, nombre: proyectoSeleccionado.nombre_proyecto, estatusProyecto: proyectoSeleccionado.estatus, vendedor_id: proyectoSeleccionado.vendedor_id });
                setChatAbierto(true);
              }}
              onBitacoraClick={() => verLogs(proyectoSeleccionado.id)}
              onAprobarRevision={() => setModalAprobar(true)}
              onRechazarRevision={() => setModalRechazo(true)}
            />
          )}

          {modalDetalle && proyectoSeleccionado && !(proyectoSeleccionado.estatus === 'Viabilidad' && proyectoSeleccionado.sub_estatus === 'Pendiente Aprobacion Ventas') && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh] mt-12 md:mt-0 overflow-y-auto custom-scrollbar">

                <div className="flex justify-between items-center pt-6 pb-4 px-6 md:px-8 border-b border-slate-100 shrink-0 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShieldCheck className="w-4 h-4 md:w-5 md:h-5" /></div>
                    <p className="font-black text-[12px] md:text-[14px] uppercase italic text-slate-950 leading-none tracking-tighter truncate">
                      Revisión: {proyectoSeleccionado.nombre_proyecto.split('-')[0]?.trim()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      setChatInicial({ tipo: 'proyecto', id: proyectoSeleccionado.id, nombre: proyectoSeleccionado.nombre_proyecto, estatusProyecto: proyectoSeleccionado.estatus, vendedor_id: proyectoSeleccionado.vendedor_id });
                      setChatAbierto(true);
                    }} className="p-2 bg-white shadow-sm border border-slate-100 text-orange-500 hover:text-white hover:bg-orange-500 rounded-full transition-colors"><MessageSquare className="w-4 h-4 md:w-5 md:h-5" /></button>
                    <button onClick={() => verLogs(proyectoSeleccionado.id)} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-blue-500 rounded-full transition-colors"><History className="w-4 h-4 md:w-5 md:h-5" /></button>
                    <button onClick={() => setModalDetalle(false)} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors leading-none"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-white flex flex-col gap-5 md:gap-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                    <div className="flex-1 w-full overflow-hidden">
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nombre del Proyecto</p>
                      <h2 className="font-black text-xl md:text-2xl text-slate-950 uppercase italic tracking-tighter leading-tight truncate">
                        {proyectoSeleccionado.nombre_proyecto.split('-')[1]?.trim() || proyectoSeleccionado.nombre_proyecto}
                      </h2>
                    </div>
                    <span className={`text-[9px] md:text-[11px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl uppercase border shadow-sm flex-shrink-0 leading-none ${getEstiloEstatus(proyectoSeleccionado.estatus).bg} ${getEstiloEstatus(proyectoSeleccionado.estatus).text}`}>
                      {getEstiloEstatus(proyectoSeleccionado.estatus).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-slate-50 rounded-[15px] md:rounded-[20px] p-4 md:p-5 border border-slate-100 shadow-inner">
                    <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><MapPin size={10} /> Giro</p> <p className="text-xs md:text-sm font-bold text-slate-800 uppercase">{proyectoSeleccionado.giro_proyecto || '-'}</p> </div>
                    <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><CalendarIcon size={10} /> Creado El</p> <p className="text-[10px] md:text-xs font-bold text-slate-800 uppercase"> {new Date(proyectoSeleccionado.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} </p> </div>
                    <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Clock size={10} /> H. Creado</p> <p className="text-[10px] md:text-xs font-bold text-slate-800 uppercase"> {new Date(proyectoSeleccionado.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} </p> </div>
                    <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Timer size={10} /> SLA Global</p> <p className={`text-xs md:text-sm font-black uppercase ${calcularHorasHabiles(proyectoSeleccionado.created_at).hours >= 24 ? 'text-red-500' : 'text-slate-800'}`}> {calcularHorasHabiles(proyectoSeleccionado.created_at).text} hrs </p> </div>
                  </div>

                  {proyectoSeleccionado.vendedor && (
                    <div className="bg-white border border-slate-200 rounded-[15px] p-3 md:p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex flex-col">
                        <p className="font-black text-[8px] md:text-[9px] text-slate-400 uppercase tracking-widest mb-1">Vendedor / Solicitante</p>
                        <p className="font-black text-slate-900 text-[10px] md:text-xs uppercase italic tracking-tighter truncate"> 👤 {proyectoSeleccionado.vendedor.nombre} {proyectoSeleccionado.vendedor.apellidos} </p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                        {proyectoSeleccionado.vendedor.telefono_movil && (<a href={`tel:${proyectoSeleccionado.vendedor.telefono_movil}`} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-600 px-3 md:px-4 py-2 rounded-xl hover:text-orange-500 hover:border-orange-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest transition-colors"><Phone size={10} /> Llamar</a>)}
                        {proyectoSeleccionado.vendedor.email_corporativo && (<a href={`mailto:${proyectoSeleccionado.vendedor.email_corporativo}`} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-600 px-3 md:px-4 py-2 rounded-xl hover:text-orange-500 hover:border-orange-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest transition-colors"><Mail size={10} /> Correo</a>)}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-4 md:p-5 rounded-[15px] md:rounded-[20px] border border-slate-200 shadow-inner flex flex-col gap-2 md:gap-3">
                    <p className="font-black text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest">📝 Contexto de la Solicitud</p>
                    <p className="text-xs md:text-sm text-slate-800 font-medium italic border-l-2 border-blue-300 pl-3 py-1">
                      {proyectoSeleccionado.comentarios_iniciales ? `"${proyectoSeleccionado.comentarios_iniciales}"` : 'Sin comentarios adicionales.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 px-1 pb-2 border-t border-slate-100 pt-4 mt-1">
                    <button onClick={() => abrirVisorArchivos('Archivos del Vendedor', proyectoSeleccionado.archivos_adjuntos || (proyectoSeleccionado.archivo_url ? [proyectoSeleccionado.archivo_url] : []))} disabled={!(proyectoSeleccionado.archivos_adjuntos?.length > 0 || proyectoSeleccionado.archivo_url)} className={`py-3 md:py-4 px-1.5 rounded-xl md:rounded-2xl border-2 font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all shadow-sm tracking-tighter flex items-center justify-center gap-2 leading-tight ${proyectoSeleccionado.archivos_adjuntos?.length > 0 || proyectoSeleccionado.archivo_url ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 opacity-90'}`}>
                      <FileText size={14} /> Ver Recibos/Planos
                    </button>
                    <button onClick={() => abrirVisorArchivos('Propuestas de Cotización', proyectoSeleccionado.archivos_cotizacion || [])} disabled={!(proyectoSeleccionado.archivos_cotizacion?.length > 0)} className={`py-3 md:py-4 px-1.5 rounded-xl md:rounded-2xl border-2 font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all shadow-sm tracking-tighter flex items-center justify-center gap-2 leading-tight ${proyectoSeleccionado.archivos_cotizacion?.length > 0 ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 opacity-90'}`}>
                      <FileCheck size={14} /> Ver Cotización
                    </button>
                  </div>

                  {['Cotización - Revisión', 'Cotización – Revisión', 'Recotización - Revisión', 'Recotización – Revisión', 'Viabilidad - Revisión'].includes(proyectoSeleccionado.estatus) && (
                    <div className={`grid ${proyectoSeleccionado.estatus.includes('Recotización') ? 'grid-cols-1' : 'grid-cols-2'} gap-3 pt-4 border-t border-slate-100 mt-1`}>
                      {!proyectoSeleccionado.estatus.includes('Recotización') && (
                        <button onClick={() => setModalRechazo(true)} className="py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-red-200 bg-white text-red-500 font-black text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"> <FileX className="w-4 h-4 md:w-5 md:h-5" /> Rechazar </button>
                      )}
                      <button onClick={() => setModalAprobar(true)} className="py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-emerald-500 bg-emerald-500 text-white font-black text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors"> <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> Aprobar </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODALES SECUNDARIOS DEL COMPONENTE DE VIABILIDAD */}
        <AnimatePresence>
          {showModalSecundario === 'Visor' && proyectoSeleccionado && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowModalSecundario(null)}>
              <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                src={proyectoSeleccionado.fachada_url} className="max-w-full max-h-screen object-contain rounded-[30px] border-4 border-white/10"
                onClick={(e: any) => e.stopPropagation()}
              />
              <button onClick={() => setShowModalSecundario(null)} className="absolute top-6 right-6 text-white p-3 bg-white/20 hover:bg-red-500 rounded-full transition-colors backdrop-blur-md border border-white/20"><X size={32} /></button>
            </div>
          )}
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
                      <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.calle || 'N/D'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Colonia</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.colonia || 'N/D'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Ciudad</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.ciudad || 'N/D'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Estado / CP</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{proyectoSeleccionado.estado_dir} / {proyectoSeleccionado.codigo_postal}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Link Maps Original</p>
                    <a href={proyectoSeleccionado.link_maps} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 block hover:underline break-all leading-tight" title={proyectoSeleccionado.link_maps}>{proyectoSeleccionado.link_maps || 'Sin enviar'}</a>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Escalera Especial</p>
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-[6px] ${proyectoSeleccionado.requiere_escalera ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-slate-200 text-slate-500'}`}>
                      {proyectoSeleccionado.requiere_escalera ? 'SÍ REQUIERE' : 'NO'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">Comentarios Solicitud</p>
                    <p className="text-xs font-bold text-slate-700 italic border-l-2 border-[#ffb000] pl-3 py-1">{proyectoSeleccionado.comentarios_solicitud || 'Ningún comentario.'}</p>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ... MODALES RESTANTES (RECHAZO/APROBACIÓN) ... */}
        <AnimatePresence>
          {modalRechazo && (
            <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col border border-white mt-12 md:mt-0">
                <div className="bg-red-50 p-6 flex justify-between items-center text-red-600 border-b border-red-100">
                  <div className="flex items-center gap-3"> <AlertCircle size={24} className="shrink-0" /> <h3 className="text-base md:text-lg font-black uppercase italic tracking-tighter">Rechazar Revisión</h3> </div>
                  <button onClick={() => setModalRechazo(false)} className="p-2 bg-white hover:bg-red-100 rounded-full transition-colors shrink-0"><X size={20} /></button>
                </div>
                <form onSubmit={handleRechazar} className="p-6 bg-slate-50 flex flex-col gap-4">
                  <p className="text-[11px] md:text-xs text-slate-500 font-medium">Explica por qué la cotización no puede ser aprobada. El proyecto regresará al equipo de Cotizaciones para corrección.</p>
                  <textarea required rows={4} placeholder="Ej: Faltan equipos en la lista..." value={mensajeRechazo} onChange={e => setMensajeRechazo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-red-400 shadow-inner resize-none" />
                  <button type="submit" disabled={procesando} className="mt-2 bg-red-500 text-white w-full py-4 rounded-xl font-black shadow-lg hover:bg-red-600 uppercase text-[10px] md:text-[11px] tracking-widest disabled:opacity-50"> {procesando ? 'Enviando...' : 'Devolver a Cotizaciones'} </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalAprobar && (
            <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col border border-white mt-12 md:mt-0">
                <div className="bg-emerald-50 p-6 flex justify-between items-center text-emerald-700 border-b border-emerald-100">
                  <div className="flex items-center gap-3"> <CheckCircle2 size={24} className="shrink-0" /> <h3 className="text-base md:text-lg font-black uppercase italic tracking-tighter">Aprobar Revisión</h3> </div>
                  <button onClick={() => setModalAprobar(false)} className="p-2 bg-white hover:bg-emerald-100 rounded-full transition-colors shrink-0"><X size={20} /></button>
                </div>
                <form onSubmit={handleAprobar} className="p-6 bg-slate-50 flex flex-col gap-5">
                  <div>
                    <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase text-slate-500 mb-2"> <FileText className="w-4 h-4 text-emerald-500" /> Comentario de Cierre (Opcional) </span>
                    <textarea rows={3} placeholder="Dejar un mensaje final..." value={mensajeAprobacion} onChange={e => setMensajeAprobacion(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none resize-none shadow-inner" />
                  </div>
                  <button type="submit" disabled={procesando} className="mt-2 bg-emerald-500 text-white w-full py-4 rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 uppercase text-[10px] md:text-[11px] tracking-widest disabled:opacity-50"> {procesando ? 'Procesando...' : 'Aprobar y Liberar Proyecto'} </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* VISORES Y LOGS COMPACTOS */}
        <AnimatePresence>
          {modalListaArchivos && (
            <div className="fixed inset-0 z-[1051] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col border border-white mt-12 md:mt-0 max-h-[70vh]">
                <div className="bg-slate-50 p-5 md:p-6 flex justify-between items-center border-b border-slate-200 shrink-0">
                  <h3 className="font-black uppercase tracking-widest text-slate-900 text-xs md:text-sm flex items-center gap-2"><FileText className="text-blue-500 w-4 h-4 md:w-5 md:h-5" /> {modalListaArchivos.titulo}</h3>
                  <button onClick={() => setModalListaArchivos(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X size={16} /></button>
                </div>
                <div className="p-5 md:p-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                  {modalListaArchivos.urls.map((url, idx) => (
                    <button key={idx} onClick={() => { setDocPreview({ urls: modalListaArchivos.urls, currentIndex: idx, nombre: modalListaArchivos.titulo }); setModalListaArchivos(null); }} className="w-full text-left py-3 md:py-4 px-4 md:px-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all font-black text-[9px] md:text-[11px] text-slate-700 uppercase tracking-widest flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3 truncate">
                        <FileIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400 shrink-0" /> Opción {idx + 1}
                      </span>
                      <span className="text-[8px] bg-slate-50 border border-slate-100 px-2 py-1 rounded-md text-slate-400 shrink-0">V{idx + 1}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {docPreview && (
            <div className="fixed inset-0 z-[1055] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={() => setDocPreview(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white mt-12 md:mt-0 relative" onClick={e => e.stopPropagation()}>

                <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100 z-10 shrink-0">
                  <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px] md:text-sm flex items-center gap-2 md:gap-3">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-500 hidden sm:block shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">{docPreview.nombre}</span>
                    {docPreview.urls.length > 1 && <span className="text-blue-500 bg-blue-50 px-1.5 md:px-2 py-1 rounded-md shrink-0">({docPreview.currentIndex + 1}/{docPreview.urls.length})</span>}
                  </h3>
                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <a href={docPreview.urls[docPreview.currentIndex]} download target="_blank" rel="noreferrer" className="flex items-center bg-orange-500 hover:bg-slate-900 text-white rounded-lg md:rounded-xl shadow-sm px-4 md:px-5 py-2 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest relative z-[2000]">
                      Descargar
                    </a>
                    <div className="flex items-center bg-slate-100 rounded-lg md:rounded-xl overflow-hidden shadow-inner hidden md:flex">
                      <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">-</button>
                      <span className="text-[9px] md:text-[10px] font-black text-slate-600 px-1 w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">+</button>
                    </div>
                    <button onClick={() => setDocPreview(null)} className="p-1.5 md:p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-800 relative flex items-center justify-center overflow-auto custom-scrollbar p-2 md:p-4">
                  {docPreview.urls.length > 1 && (
                    <>
                      <button onClick={() => { setDocPreview(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null); setZoom(1); }} disabled={docPreview.currentIndex === 0} className="fixed left-2 sm:left-4 md:absolute md:left-6 top-1/2 -translate-y-1/2 z-[1000] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
                      <button onClick={() => { setDocPreview(prev => prev ? { ...prev, currentIndex: Math.min(prev.urls.length - 1, prev.currentIndex + 1) } : null); setZoom(1); }} disabled={docPreview.currentIndex === docPreview.urls.length - 1} className="fixed right-2 sm:right-4 md:absolute md:right-6 top-1/2 -translate-y-1/2 z-[1000] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronRight className="w-5 h-5 md:w-6 md:h-6" /></button>
                    </>
                  )}
                  <div className="transition-transform duration-300 origin-center flex items-center justify-center w-full h-full" style={{ transform: `scale(${zoom})` }}>
                    {docPreview.urls[docPreview.currentIndex].toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                      <img src={docPreview.urls[docPreview.currentIndex]} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Visor" />
                    ) : (<iframe src={docPreview.urls[docPreview.currentIndex]} className="w-full h-full border-none bg-white rounded-xl shadow-2xl min-h-[60vh] md:min-h-full" title={docPreview.nombre} />)}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalLog && proyectoSeleccionado && (
            <ModalLineaTiempo
              logs={logsProyecto}
              proyecto={proyectoSeleccionado}
              onClose={() => setModalLog(false)}
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}