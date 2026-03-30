import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Search, X, Save, 
  MapPin, FileText, CheckCircle2, AlertCircle, Clock, ChevronRight, History,
  FileCheck, FileX, UploadCloud, Timer, Calendar as CalendarIcon, Phone, Mail, File,
  ChevronLeft
} from 'lucide-react'

import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'
import defaultProjectImg from '../assets/default.jpg'

// --- HELPERS DE COLORES Y TIEMPOS ---
const ESTADOS_SOLARIS: any = {
  'Cotización': { label: 'Cotización', bg: 'bg-orange-100', text: 'text-orange-700' },
  'Cotización – Revisión': { label: 'Revisión', bg: 'bg-blue-100', text: 'text-blue-700' },
  'Cotizado': { label: 'Cotizado ✨', bg: 'bg-green-100', text: 'text-green-700' },
  'Cotización – Corrección': { label: 'Corrección 🛑', bg: 'bg-red-100', text: 'text-red-700' },
};

const getEstiloEstatus = (estatus: string) => {
  const e = estatus?.toLowerCase() || ''
  if (e.includes('revisión')) return ESTADOS_SOLARIS['Cotización – Revisión'];
  if (e.includes('cotizado')) return ESTADOS_SOLARIS['Cotizado'];
  if (e.includes('corrección')) return ESTADOS_SOLARIS['Cotización – Corrección'];
  return ESTADOS_SOLARIS['Cotización']; 
}

const calcularHorasHabiles = (fechaCreacion: string) => {
  let start = new Date(fechaCreacion);
  let end = new Date();
  if (start > end) return { hours: 0, mins: 0, text: '0h 0m' };

  let mins = 0;
  start.setSeconds(0, 0);
  end.setSeconds(0, 0);

  while (start < end) {
    const day = start.getDay();
    const hour = start.getHours();
    if (day >= 1 && day <= 5 && hour >= 9 && hour < 18) {
      mins++;
    }
    start.setMinutes(start.getMinutes() + 1);
  }

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { hours: h, mins: m, text: `${h}h ${m}m` };
}

export default function Cotizaciones() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('Cotización')
  
  const [modalDetalle, setModalDetalle] = useState(false)
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
  
  // VISOR MULTI-ARCHIVO HOMOLOGADO
  const [docPreview, setDocPreview] = useState<{ urls: string[], currentIndex: number, nombre: string } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [modalListaArchivos, setModalListaArchivos] = useState<{ titulo: string, urls: string[] } | null>(null)
  const [modalLog, setModalLog] = useState(false)
  const [logsProyecto, setLogsProyecto] = useState<any[]>([])

  const [modalRechazo, setModalRechazo] = useState(false)
  const [modalAprobar, setModalAprobar] = useState(false)
  
  const [mensajeRechazo, setMensajeRechazo] = useState('')
  const [filesCotizacion, setFilesCotizacion] = useState<File[]>([])
  const [mensajeAprobacion, setMensajeAprobacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  const fetchProyectos = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('proyectos')
      .select(`
        *,
        vendedor:vendedor_id (nombre, apellidos, avatar_url, departamento, telefono_movil, email_corporativo),
        interacciones:proyectos_interacciones (mensaje, accion, created_at)
      `)
      .order('created_at', { ascending: false })
    
    if (data) setProyectos(data)
    setCargando(false)
  }

  useEffect(() => { fetchProyectos() }, [])

  const handleRechazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeRechazo.trim()) return alert("Debes ingresar un motivo.");
    setProcesando(true);

    try {
      await supabase.from('proyectos')
        .update({ estatus: 'Cotización – Corrección' })
        .eq('id', proyectoSeleccionado.id);

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: proyectoSeleccionado.id,
        usuario_id: usuarioLogueado?.id,
        estado_anterior: proyectoSeleccionado.estatus,
        estado_nuevo: 'Cotización – Corrección',
        accion: 'Corrección Solicitada',
        mensaje: mensajeRechazo
      }]);

      setModalRechazo(false); setModalDetalle(false); setMensajeRechazo(''); fetchProyectos();
    } catch (err: any) { alert("Error: " + err.message); } finally { setProcesando(false); }
  }

  // --- APROBAR, GUARDAR KPI Y MANDAR A REVISIÓN ---
  const handleAprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filesCotizacion.length === 0) return alert("Por favor carga al menos una opción de cotización.");
    setProcesando(true);

    try {
      let urlsAdjuntas: string[] = [];

      for (const file of filesCotizacion) {
        const fileExt = file.name.split('.').pop();
        const fileName = `propuesta_${Date.now()}_${Math.random()}.${fileExt}`;
        const filePath = `cotizaciones_finales/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('cotizaciones').upload(filePath, file);
        if (uploadError) throw new Error(`Error al subir ${file.name}: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath);
        urlsAdjuntas.push(urlData.publicUrl);
      }

      const { error: updateError } = await supabase.from('proyectos')
        .update({ 
            estatus: 'Cotización – Revisión', 
            archivos_cotizacion: urlsAdjuntas,
            fecha_cotizado: new Date().toISOString() // <-- KPI Guardado
        })
        .eq('id', proyectoSeleccionado.id);

      if (updateError) throw updateError;

      let textoLinks = '\n\n🔗 Opciones cargadas listas para revisión.';

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: proyectoSeleccionado.id,
        usuario_id: usuarioLogueado?.id,
        estado_anterior: proyectoSeleccionado.estatus,
        estado_nuevo: 'Cotización – Revisión',
        accion: 'Carga Finalizada - Enviado a Revisión',
        mensaje: (mensajeAprobacion || 'Se han cargado las propuestas técnicas.') + textoLinks
      }]);

      setModalAprobar(false); setModalDetalle(false); setFilesCotizacion([]); setMensajeAprobacion(''); fetchProyectos();
      alert("✅ Cotización enviada a Revisión correctamente.");
    } catch (err: any) { alert("Error: " + err.message); } finally { setProcesando(false); }
  }

  const removerArchivo = (index: number) => {
    setFilesCotizacion(prev => prev.filter((_, i) => i !== index));
  }

  // --- FUNCIONES DEL VISOR HOMOLOGADO ---
  const abrirVisorArchivos = (titulo: string, urls: string[]) => {
    if (!urls || urls.length === 0) return;
    setZoom(1); 
    if (urls.length === 1) {
       setDocPreview({ urls, currentIndex: 0, nombre: titulo });
    } else {
       setModalListaArchivos({ titulo, urls });
    }
  };

  const verLogs = async (proyectoId: string) => {
    setModalLog(false);
    const { data, error } = await supabase
        .from('proyectos_interacciones')
        .select(`*, perfiles:usuario_id (nombre, apellidos, avatar_url)`)
        .eq('proyecto_id', proyectoId)
        .order('created_at', { ascending: false });
    
    if (data) setLogsProyecto(data);
    if (error) console.error("Error logs:", error);
    setModalLog(true);
  };

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      const matchBusqueda = p.nombre_proyecto.toLowerCase().includes(busqueda.toLowerCase()) || 
                            p.giro_proyecto?.toLowerCase().includes(busqueda.toLowerCase())
      const matchEstatus = filtroEstatus === 'Todos' || p.estatus === filtroEstatus
      return matchBusqueda && matchEstatus
    })
  }, [proyectos, busqueda, filtroEstatus])

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none" />

      {/* HEADER HOMOLOGADO */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm h-16 flex items-center relative">
        <div className="max-w-[1700px] mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/home')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-500"><ArrowLeft className="w-5 h-5"/></button>
            <img src={solarisLogo} alt="GEA" className="h-7 w-auto" />
            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
            <h1 className="font-black text-sm md:text-base uppercase italic tracking-tighter text-slate-900 hidden sm:block">Bandeja de Cotizaciones</h1>
          </div>
          <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="text-right flex flex-col hidden sm:flex">
              <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{usuarioLogueado?.nombre}</span>
              <span className="text-[9px] font-bold text-orange-500 uppercase mt-1 truncate max-w-[120px]">{usuarioLogueado?.puesto_actual}</span>
            </div>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-[10px] overflow-hidden">
                {usuarioLogueado?.avatar_url ? <img src={usuarioLogueado.avatar_url} className="w-full h-full object-cover" /> : usuarioLogueado?.nombre?.charAt(0)}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1700px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10">
        
        <div className="flex justify-end mb-8 md:mb-10">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 w-full md:w-72 shadow-sm">
              <Search className="text-slate-400 w-4 h-4 shrink-0" />
              <input type="text" placeholder="Buscar solicitud..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" />
            </div>
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold text-xs outline-none text-slate-600 shadow-sm w-full md:w-auto">
              <option value="Todos">Todos los estatus</option>
              {Object.keys(ESTADOS_SOLARIS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {cargando ? (
            <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs">Cargando solicitudes...</p>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay solicitudes en esta categoría.</p>
            </div>
          ) : (
            proyectosFiltrados.map((p) => {
              const tiempo = calcularHorasHabiles(p.created_at);
              const slaColor = tiempo.hours >= 24 ? 'text-red-500 font-black' : (tiempo.hours >= 8 ? 'text-orange-500 font-black' : 'text-slate-500 font-bold');
              return (
                <div key={p.id} onClick={() => { setProyectoSeleccionado(p); setModalDetalle(true); }} className="bg-white border border-slate-100 rounded-[20px] md:rounded-[25px] p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 group hover:border-orange-400 transition-all hover:shadow-xl cursor-pointer relative overflow-hidden">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-lg md:text-xl flex-shrink-0 shadow-md"> 
                        {p.nombre_proyecto.charAt(0)} 
                      </div>
                      <div className="flex-1 overflow-hidden md:hidden">
                        <h4 className="font-black text-slate-950 text-[12px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                        <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none"> <MapPin size={10} className="text-slate-400"/> {p.giro_proyecto} </p>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden hidden md:grid grid-cols-2 gap-2">
                      <div>
                        <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                        <div className="flex items-center gap-4 mt-2">
                            <p className="text-[9px] font-semibold text-slate-600 uppercase truncate flex items-center gap-1.5 leading-none"> <MapPin size={11} className="text-slate-400"/> {p.giro_proyecto} </p>
                            {(p.estatus === 'Cotización') && (
                              <p className={`text-[9px] uppercase tracking-widest flex items-center gap-1 leading-none ${slaColor}`}> <Timer size={11} /> SLA: {tiempo.text} hrs </p>
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
                        {p.estatus.includes('Corrección') ? <AlertCircle size={10}/> : p.estatus.includes('Revisión') ? <Clock size={10}/> : p.estatus.includes('Cotizado') ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                        {p.estatus}
                      </span>
                      <div className="text-slate-300 group-hover:text-orange-500 transition-colors px-2 md:block"> <ChevronRight className="w-5 h-5 md:w-6 md:h-6" /> </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL DETALLE (FICHA TÉCNICA Y BOTONES) */}
        <AnimatePresence>
          {modalDetalle && proyectoSeleccionado && (
            <ModalDetalleProyecto 
                proyecto={proyectoSeleccionado}
                onClose={() => setModalDetalle(false)}
                onAbrirArchivos={abrirVisorArchivos}
                onVerLogs={verLogs}
                onRechazar={() => setModalRechazo(true)}
                onAprobar={() => setModalAprobar(true)}
            />
          )}
        </AnimatePresence>

        {/* MODAL LOG / BITÁCORA */}
        <AnimatePresence>
            {modalLog && proyectoSeleccionado && (
                <ModalLogProyecto 
                    logs={logsProyecto}
                    nombreProyecto={proyectoSeleccionado.nombre_proyecto}
                    onClose={() => setModalLog(false)}
                />
            )}
        </AnimatePresence>

        {/* SUB-MODAL DE RECHAZO */}
        <AnimatePresence>
          {modalRechazo && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col border border-white mt-12 md:mt-0">
                 <div className="bg-red-50 p-6 flex justify-between items-center text-red-600 border-b border-red-100">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={24} className="text-red-500 shrink-0"/>
                        <h3 className="text-base md:text-lg font-black uppercase italic tracking-tighter">Pedir Corrección</h3>
                    </div>
                    <button onClick={() => setModalRechazo(false)} className="p-2 bg-white hover:bg-red-100 rounded-full transition-colors shrink-0"><X className="w-5 h-5"/></button>
                 </div>
                 <form onSubmit={handleRechazar} className="p-6 bg-slate-50 flex flex-col gap-4">
                    <p className="text-[11px] md:text-xs text-slate-500 font-medium">Escribe el motivo por el cual el vendedor debe corregir o enviar más información sobre este proyecto.</p>
                    <textarea 
                      required rows={4} placeholder="Ej: Faltan las medidas del techo..." 
                      value={mensajeRechazo} onChange={e => setMensajeRechazo(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-red-400 shadow-inner resize-none" 
                    />
                    <button type="submit" disabled={procesando} className="mt-2 bg-red-500 text-white w-full py-3.5 md:py-4 rounded-xl font-black shadow-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2 uppercase text-[10px] md:text-[11px] tracking-widest disabled:opacity-50">
                      {procesando ? 'Enviando...' : 'Devolver a Ventas'}
                    </button>
                 </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SUB-MODAL DE APROBACIÓN */}
        <AnimatePresence>
          {modalAprobar && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col border border-white mt-12 md:mt-0">
                 <div className="bg-emerald-50 p-6 flex justify-between items-center text-emerald-700 border-b border-emerald-100">
                    <div className="flex items-center gap-3"> <FileCheck size={24} className="text-emerald-500 shrink-0"/> <h3 className="text-base md:text-lg font-black uppercase italic tracking-tighter">Cargar Cotización</h3> </div>
                    <button onClick={() => setModalAprobar(false)} className="p-2 bg-white hover:bg-emerald-100 rounded-full transition-colors shrink-0"><X className="w-5 h-5"/></button>
                 </div>
                 <form onSubmit={handleAprobar} className="p-6 bg-slate-50 flex flex-col gap-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div>
                      <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase text-slate-500 mb-2"> <UploadCloud className="w-4 h-4 text-emerald-500"/> Subir Propuesta(s) </span>
                      <input type="file" multiple accept=".pdf,.jpg,.png,.xlsx,.csv" onChange={e => setFilesCotizacion(Array.from(e.target.files || []))} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-xs md:text-sm font-bold outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[9px] md:file:text-[10px] file:font-black file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" />
                      {filesCotizacion.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                           {filesCotizacion.map((file, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                               <div className="flex items-center gap-2 overflow-hidden"> <File size={12} className="text-emerald-500 flex-shrink-0" /> <span className="text-[9px] md:text-[10px] font-bold text-emerald-800 truncate">{file.name}</span> </div>
                               <button type="button" onClick={() => removerArchivo(idx)} className="text-red-400 hover:text-red-600 shrink-0"><X size={14}/></button>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase text-slate-500 mb-2"> <FileText className="w-4 h-4 text-emerald-500"/> Notas Técnicas </span>
                      <textarea rows={3} placeholder="Detalles sobre las opciones generadas..." value={mensajeAprobacion} onChange={e => setMensajeAprobacion(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs md:text-sm font-bold outline-none resize-none shadow-inner" />
                    </div>
                    <button type="submit" disabled={procesando} className="mt-2 bg-emerald-500 text-white w-full py-3.5 md:py-4 rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all uppercase text-[10px] md:text-[11px] disabled:opacity-50 tracking-widest"> {procesando ? 'Procesando...' : 'Mandar a Revisión'} </button>
                 </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SUB-MODAL LISTA DE ARCHIVOS (VISOR PREVIO) */}
        <AnimatePresence>
            {modalListaArchivos && (
               <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col border border-white mt-12 md:mt-0 max-h-[70vh]">
                    <div className="bg-slate-50 p-5 md:p-6 flex justify-between items-center border-b border-slate-200 shrink-0">
                        <h3 className="font-black uppercase tracking-widest text-slate-900 text-xs md:text-sm flex items-center gap-2"><FileText className="text-orange-500 w-4 h-4 md:w-5 md:h-5"/> {modalListaArchivos.titulo}</h3>
                        <button onClick={() => setModalListaArchivos(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X size={16}/></button>
                    </div>
                    <div className="p-5 md:p-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                        {modalListaArchivos.urls.map((url, idx) => (
                           <button key={idx} onClick={() => { setDocPreview({urls: modalListaArchivos.urls, currentIndex: idx, nombre: modalListaArchivos.titulo}); setModalListaArchivos(null); }} className="w-full text-left py-3 md:py-4 px-4 md:px-5 bg-white border border-slate-200 rounded-xl hover:border-orange-400 hover:shadow-md transition-all font-black text-[9px] md:text-[11px] text-slate-700 uppercase tracking-widest flex items-center gap-3">
                             <File className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-400 shrink-0"/> Opción {idx + 1}
                           </button>
                        ))}
                    </div>
                 </motion.div>
               </div>
            )}
        </AnimatePresence>

        {/* VISOR MULTI-ARCHIVO FINAL CON ZOOM */}
        <AnimatePresence>
            {docPreview && (
                <div className="fixed inset-0 z-[1005] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={() => setDocPreview(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white mt-12 md:mt-0 relative" onClick={e => e.stopPropagation()}>
                        
                        <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100 z-10 shrink-0">
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px] md:text-sm flex items-center gap-2 md:gap-3">
                              <FileText className="w-4 h-4 md:w-5 md:h-5 text-orange-500 hidden sm:block shrink-0"/> 
                              <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">{docPreview.nombre}</span>
                              {docPreview.urls.length > 1 && <span className="text-orange-500 bg-orange-50 px-1.5 md:px-2 py-1 rounded-md shrink-0">({docPreview.currentIndex + 1}/{docPreview.urls.length})</span>}
                            </h3>
                            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                <div className="flex items-center bg-slate-100 rounded-lg md:rounded-xl overflow-hidden shadow-inner">
                                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">-</button>
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-600 px-1 w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">+</button>
                                </div>
                                <button onClick={() => setDocPreview(null)} className="p-1.5 md:p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5"/></button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-800 relative flex items-center justify-center overflow-auto custom-scrollbar p-2 md:p-4">
                            {docPreview.urls.length > 1 && (
                                <>
                                    <button onClick={() => { setDocPreview(prev => prev ? {...prev, currentIndex: Math.max(0, prev.currentIndex - 1)} : null); setZoom(1); }} disabled={docPreview.currentIndex === 0} className="fixed left-2 sm:left-4 md:absolute md:left-6 top-1/2 -translate-y-1/2 z-[1000] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6"/></button>
                                    <button onClick={() => { setDocPreview(prev => prev ? {...prev, currentIndex: Math.min(prev.urls.length - 1, prev.currentIndex + 1)} : null); setZoom(1); }} disabled={docPreview.currentIndex === docPreview.urls.length - 1} className="fixed right-2 sm:right-4 md:absolute md:right-6 top-1/2 -translate-y-1/2 z-[1000] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronRight className="w-5 h-5 md:w-6 md:h-6"/></button>
                                </>
                            )}
                            <div className="transition-transform duration-300 origin-center flex items-center justify-center w-full h-full" style={{ transform: `scale(${zoom})` }}>
                                {docPreview.urls[docPreview.currentIndex].toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                                    <img src={docPreview.urls[docPreview.currentIndex]} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Visor" />
                                ) : (
                                    <iframe src={docPreview.urls[docPreview.currentIndex]} className="w-full h-full border-none bg-white rounded-xl shadow-2xl min-h-[60vh] md:min-h-full" title={docPreview.nombre} />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </main>
    </div>
  )
}

// --- MODAL DETALLE PROYECTO (Ficha Técnica y Botonera) ---
const ModalDetalleProyecto = ({ proyecto, onClose, onAbrirArchivos, onVerLogs, onRechazar, onAprobar }: any) => {
  const statusInfo = getEstiloEstatus(proyecto.estatus);
  const partesNombre = proyecto.nombre_proyecto.split('-');
  const idNum = partesNombre[0]?.trim() || '';
  const nombreReal = partesNombre[1]?.trim() || proyecto.nombre_proyecto;

  const recibosUrls = proyecto.archivos_adjuntos && proyecto.archivos_adjuntos.length > 0 ? proyecto.archivos_adjuntos : (proyecto.archivo_url ? [proyecto.archivo_url] : []);
  const cotizacionesUrls = proyecto.archivos_cotizacion || [];

  const botonesAccion = [
    { label: 'Recibos/Adjuntos', hasData: recibosUrls.length > 0, action: () => onAbrirArchivos('Archivos del Vendedor', recibosUrls) },
    { label: 'Cotización', hasData: cotizacionesUrls.length > 0, action: () => onAbrirArchivos('Opciones de Cotización', cotizacionesUrls) },
    { label: 'Recotización', hasData: false, action: () => console.log('Acción Recotización') },
    { label: 'Viabilidad', hasData: false, action: () => console.log('Acción Viabilidad') },
    { label: 'Reporte', hasData: false, action: () => console.log('Acción Reporte') },
    { label: 'Cambios Ing.', hasData: false, action: () => console.log('Acción Cambios') },
    { label: 'Instalación', hasData: false, action: () => console.log('Acción Instalación') },
    { label: 'Postventa', hasData: false, action: () => console.log('Acción Postventa') },
    { label: '+ Fachada', hasData: false, action: () => console.log('Subir Fachada') },
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh] mt-12 md:mt-0 overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center pt-6 pb-4 px-6 md:px-8 border-b border-slate-100 shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileText className="w-4 h-4 md:w-5 md:h-5"/></div>
            <p className="font-black text-[12px] md:text-[14px] uppercase italic text-slate-950 leading-none tracking-tighter truncate">
              Solicitud: {idNum}
            </p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => onVerLogs(proyecto.id)} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-orange-500 rounded-full transition-colors"><History className="w-4 h-4 md:w-5 md:h-5"/></button>
             <button onClick={onClose} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors leading-none"><X className="w-4 h-4 md:w-5 md:h-5"/></button>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-white flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
            <div className="flex-1 w-full overflow-hidden">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nombre del Proyecto</p>
              <h2 className="font-black text-xl md:text-2xl text-slate-950 uppercase italic tracking-tighter leading-tight truncate">
                {nombreReal}
              </h2>
            </div>
            <span className={`text-[9px] md:text-[11px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl uppercase border shadow-sm flex-shrink-0 leading-none ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-slate-50 rounded-[15px] md:rounded-[20px] p-4 md:p-5 border border-slate-100 shadow-inner">
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><MapPin size={10}/> Giro</p> <p className="text-xs md:text-sm font-bold text-slate-800 uppercase">{proyecto.giro_proyecto || '-'}</p> </div>
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><CalendarIcon size={10}/> Enviado El</p> <p className="text-[10px] md:text-xs font-bold text-slate-800 uppercase"> {new Date(proyecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} </p> </div>
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Clock size={10}/> Hora</p> <p className="text-[10px] md:text-xs font-bold text-slate-800 uppercase"> {new Date(proyecto.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} </p> </div>
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Timer size={10}/> SLA Activo</p> <p className={`text-xs md:text-sm font-black uppercase ${calcularHorasHabiles(proyecto.created_at).hours >= 24 ? 'text-red-500' : 'text-slate-800'}`}> {calcularHorasHabiles(proyecto.created_at).text} hrs </p> </div>
          </div>

          {proyecto.vendedor && (
            <div className="bg-white border border-slate-200 rounded-[15px] p-3 md:p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex flex-col">
                    <p className="font-black text-[8px] md:text-[9px] text-slate-400 uppercase tracking-widest mb-1">Solicitado por</p>
                    <p className="font-black text-slate-900 text-[10px] md:text-xs uppercase italic tracking-tighter truncate"> 👤 {proyecto.vendedor.nombre} {proyecto.vendedor.apellidos} </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                    {proyecto.vendedor.telefono_movil && ( <a href={`tel:${proyecto.vendedor.telefono_movil}`} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-600 px-3 md:px-4 py-2 rounded-xl hover:text-orange-500 hover:border-orange-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest transition-colors"><Phone size={10} /> Llamar</a> )}
                    {proyecto.vendedor.email_corporativo && ( <a href={`mailto:${proyecto.vendedor.email_corporativo}`} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-600 px-3 md:px-4 py-2 rounded-xl hover:text-orange-500 hover:border-orange-300 font-bold text-[8px] md:text-[9px] uppercase tracking-widest transition-colors"><Mail size={10} /> Correo</a> )}
                </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 md:p-5 rounded-[15px] md:rounded-[20px] border border-slate-200 shadow-inner flex flex-col gap-2 md:gap-3">
            <p className="font-black text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest">📝 Comentarios de Contexto</p>
            <p className="text-xs md:text-sm text-slate-800 font-medium italic border-l-2 border-orange-300 pl-3 py-1">
              {proyecto.comentarios_iniciales ? `"${proyecto.comentarios_iniciales}"` : 'Sin comentarios adicionales.'}
            </p>
          </div>

          {/* BOTONERA ARCHIVOS HOMOLOGADA */}
          <div className="grid grid-cols-3 gap-2 px-1 pb-2 border-t border-slate-100 pt-4 mt-1">
            {botonesAccion.map((btn) => (
              <button key={btn.label} onClick={btn.action} disabled={!btn.hasData} className={`py-2.5 md:py-3 px-1.5 rounded-xl md:rounded-2xl border-2 font-black text-[7px] md:text-[9px] uppercase tracking-widest transition-all shadow-sm tracking-tighter h-10 md:h-12 flex items-center justify-center text-center leading-tight ${btn.hasData ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 opacity-90'}`}>
                {btn.label}
              </button>
            ))}
          </div>

          {(proyecto.estatus === 'Cotización' || proyecto.estatus === 'Cotización – Revisión') && (
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 mt-1">
              <button onClick={onRechazar} className="py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-red-200 bg-white text-red-500 font-black text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"> <FileX className="w-4 h-4 md:w-5 md:h-5"/> Pedir Corrección </button>
              <button onClick={onAprobar} className="py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-emerald-500 bg-emerald-500 text-white font-black text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors"> <FileCheck className="w-4 h-4 md:w-5 md:h-5"/> Subir Cotización </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- MODAL LOG / BITÁCORA DEL PROYECTO ---
const ModalLogProyecto = ({ logs, onClose, nombreProyecto }: any) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh] mt-12 md:mt-0">
         <div className="bg-slate-900 p-5 md:p-6 flex justify-between items-center text-white shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
                <div className="p-2 md:p-2.5 bg-white/10 rounded-xl text-orange-400"><History className="w-4 h-4 md:w-5 md:h-5"/></div>
                <div>
                    <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter leading-none">Bitácora Solaris</h3>
                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[150px] md:max-w-full">{nombreProyecto}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5"/></button>
         </div>
         <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
            {logs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border border-slate-100 rounded-2xl bg-white shadow-inner">
                    <AlertCircle className='w-8 h-8 mx-auto mb-3 opacity-50'/>
                    <p className="font-bold uppercase tracking-widest text-[10px]">No hay registros en la bitácora.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log: any) => {
                         const styleEstatusNuevo = getEstiloEstatus(log.estado_nuevo);
                         const perfiles = log.perfiles;
                         return (
                            <div key={log.id} className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 flex gap-3 md:gap-4 relative overflow-hidden shadow-sm">
                                 <div className="absolute top-0 left-0 h-full w-1.5 bg-orange-500/10" />
                                 <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm md:text-xl flex-shrink-0 shadow-md overflow-hidden border border-slate-200">
                                     {perfiles?.avatar_url ? <img src={perfiles.avatar_url} className="w-full h-full object-cover" /> : <span>{perfiles?.nombre?.charAt(0)}{perfiles?.apellidos?.charAt(0)}</span>}
                                 </div>
                                 <div className="flex-1 text-[11px]">
                                     <div className='flex flex-col md:flex-row md:justify-between gap-1 md:gap-2 items-start'>
                                         <div>
                                             <p className="font-black uppercase italic text-slate-950 tracking-tighter leading-none">{perfiles?.nombre} {perfiles?.apellidos}</p>
                                             <p className="text-[8px] md:text-[9px] font-bold text-slate-600 uppercase mt-1">Acción: <span className='text-slate-900 font-black'>{log.accion}</span></p>
                                         </div>
                                         <p className="text-[8px] md:text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full w-fit">{new Date(log.created_at).toLocaleString('es-MX', { timeStyle: 'short', dateStyle: 'short' })}</p>
                                     </div>
                                     {log.estado_nuevo && (
                                        <div className="text-[8px] md:text-[9px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                            Estatus: <span className={`text-[7px] md:text-[8px] font-black px-2 py-1 rounded-md uppercase border ${styleEstatusNuevo.bg} ${styleEstatusNuevo.text}`}>{log.estado_nuevo}</span>
                                        </div>
                                     )}
                                     {log.mensaje && <div className="p-2.5 md:p-3 bg-white text-slate-700 rounded-xl mt-2 md:mt-3 italic border-l-4 border-orange-400 font-medium text-[9px] md:text-[11px] shadow-inner whitespace-pre-line">{log.mensaje}</div>}
                                 </div>
                            </div>
                         )
                    })}
                </div>
            )}
         </div>
      </motion.div>
    </div>
)