import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Search, X, Save, 
  MapPin, FileText, CheckCircle2, AlertCircle, Clock, ChevronRight, History,
  FileCheck, FileX, UploadCloud, Timer, Calendar as CalendarIcon, Phone, Mail, File
} from 'lucide-react'

import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

// --- HELPERS DE COLORES ---
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

// --- HELPER: CALCULAR HORAS HÁBILES (L-V 9:00 a 18:00) ---
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
  const [docPreview, setDocPreview] = useState<{ url: string, nombre: string } | null>(null)

  const [modalRechazo, setModalRechazo] = useState(false)
  const [modalAprobar, setModalAprobar] = useState(false)
  
  const [mensajeRechazo, setMensajeRechazo] = useState('')
  
  // AHORA ES UN ARREGLO DE ARCHIVOS
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
        vendedor:vendedor_id (nombre, apellidos, avatar_url, departamento, telefono_movil, email_corporativo)
      `)
      .order('created_at', { ascending: false })
    
    if (data) setProyectos(data)
    setCargando(false)
  }

  useEffect(() => { fetchProyectos() }, [])

  // --- RECHAZAR ---
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

      setModalRechazo(false);
      setModalDetalle(false);
      setMensajeRechazo('');
      fetchProyectos();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcesando(false);
    }
  }

  // --- APROBAR Y SUBIR MÚLTIPLES ARCHIVOS ---
  const handleAprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);

    try {
      let urlsAdjuntas: string[] = [];

      // 1. Subir cada archivo al Storage
      if (filesCotizacion.length > 0) {
        for (const file of filesCotizacion) {
          const fileExt = file.name.split('.').pop();
          // Agregamos Date.now() para evitar que archivos se sobreescriban si se suben en el mismo segundo
          const fileName = `final_${Date.now()}_${Math.random()}.${fileExt}`;
          const filePath = `cotizaciones_finales/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('cotizaciones').upload(filePath, file);
          if (uploadError) throw new Error(`Error al subir ${file.name}: ${uploadError.message}`);

          const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath);
          urlsAdjuntas.push(urlData.publicUrl);
        }
      }

      // 2. Actualizar estatus (Y guardar las URLs si tienes la columna)
      await supabase.from('proyectos')
        .update({ 
            estatus: 'Cotizado',
            // archivos_cotizacion: urlsAdjuntas // <-- Activa esto cuando crees una columna tipo JSONB o TEXT[] en Supabase
        })
        .eq('id', proyectoSeleccionado.id);

      // 3. Generar mensaje para la Bitácora
      let textoLinks = '';
      if (urlsAdjuntas.length > 0) {
          textoLinks = '\n\n🔗 Archivos enviados:\n' + urlsAdjuntas.map((url, i) => `• Opción ${i + 1}: ${url}`).join('\n');
      }

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: proyectoSeleccionado.id,
        usuario_id: usuarioLogueado?.id,
        estado_anterior: proyectoSeleccionado.estatus,
        estado_nuevo: 'Cotizado',
        accion: 'Cotización Enviada',
        mensaje: (mensajeAprobacion || 'Cotización generada exitosamente.') + textoLinks
      }]);

      setModalAprobar(false);
      setModalDetalle(false);
      setFilesCotizacion([]); // Limpiamos los archivos
      setMensajeAprobacion('');
      fetchProyectos();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcesando(false);
    }
  }

  // --- FUNCIÓN PARA ELIMINAR UN ARCHIVO DE LA LISTA ANTES DE SUBIR ---
  const removerArchivo = (index: number) => {
    setFilesCotizacion(prev => prev.filter((_, i) => i !== index));
  }

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
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <h1 className="font-black text-base uppercase italic tracking-tighter text-slate-900">Bandeja de Cotizaciones</h1>
          </div>
          <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="text-right flex flex-col">
              <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{usuarioLogueado?.nombre}</span>
              <span className="text-[9px] font-bold text-orange-500 uppercase mt-1">{usuarioLogueado?.puesto_actual}</span>
            </div>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-[10px] overflow-hidden">
                {usuarioLogueado?.avatar_url ? <img src={usuarioLogueado.avatar_url} className="w-full h-full object-cover" /> : usuarioLogueado?.nombre?.charAt(0)}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1700px] mx-auto px-8 py-8 relative z-10">
        
        {/* BARRA DE ACCIÓN */}
        <div className="flex justify-end mb-10">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 w-full md:w-72 shadow-sm">
              <Search className="text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Buscar solicitud..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" />
            </div>
            <select 
              value={filtroEstatus} 
              onChange={e => setFiltroEstatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold text-xs outline-none text-slate-600 shadow-sm w-full md:w-auto"
            >
              <option value="Todos">Todos los estatus</option>
              {Object.keys(ESTADOS_SOLARIS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        {/* VISTA DE LISTA (Con SLA de Horas Hábiles) */}
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
                <div 
                  key={p.id} 
                  onClick={() => { setProyectoSeleccionado(p); setModalDetalle(true); }} 
                  className="bg-white border border-slate-100 rounded-[25px] p-5 shadow-sm flex items-center gap-6 group hover:border-orange-400 transition-all hover:shadow-xl cursor-pointer"
                >
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-md">
                      {p.nombre_proyecto.charAt(0)}
                  </div>
                  
                  <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                        <div className="flex items-center gap-4 mt-2">
                            <p className="text-[9px] font-semibold text-slate-600 uppercase truncate flex items-center gap-1.5 leading-none">
                            <MapPin size={11} className="text-slate-400"/> {p.giro_proyecto}
                            </p>
                            {(p.estatus === 'Cotización' || p.estatus === 'Cotización – Revisión') && (
                              <p className={`text-[9px] uppercase tracking-widest flex items-center gap-1 leading-none ${slaColor}`}>
                                <Timer size={11} /> SLA: {tiempo.text} hrs
                              </p>
                            )}
                        </div>
                      </div>
                      
                      {p.vendedor && (
                        <div className="flex flex-col justify-center md:items-end">
                            <p className="text-[10px] font-bold text-slate-500 uppercase truncate leading-tight">
                              👤 {p.vendedor.nombre} {p.vendedor.apellidos}
                            </p>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase truncate leading-tight mt-0.5">
                              📞 {p.vendedor.telefono_movil || 'Sin teléfono'}
                            </p>
                        </div>
                      )}
                  </div>

                  <div className="flex-shrink-0 hidden sm:block">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase border shadow-sm flex items-center gap-1.5 ${getEstiloEstatus(p.estatus).bg} ${getEstiloEstatus(p.estatus).text}`}>
                        {p.estatus.includes('Corrección') ? <AlertCircle size={11}/> : p.estatus.includes('Cotizado') ? <CheckCircle2 size={11}/> : <Clock size={11}/>}
                        {p.estatus}
                      </span>
                  </div>

                  <div className="text-slate-300 group-hover:text-orange-500 transition-colors px-2">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================== */}
        {/* MODAL DETALLE COMPLETO (Ficha Técnica)     */}
        {/* ========================================== */}
        <AnimatePresence>
          {modalDetalle && proyectoSeleccionado && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[95vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-center pt-6 pb-4 px-8 border-b border-slate-100 shrink-0 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileText size={20}/></div>
                    <p className="font-black text-[14px] uppercase italic text-slate-950 leading-none tracking-tighter truncate">
                      Solicitud: {proyectoSeleccionado.nombre_proyecto.split('-')[0]?.trim()}
                    </p>
                  </div>
                  <button onClick={() => setModalDetalle(false)} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors leading-none"><X size={16}/></button>
                </div>

                <div className="p-8 bg-white flex flex-col gap-6">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nombre del Proyecto</p>
                      <h2 className="font-black text-2xl text-slate-950 uppercase italic tracking-tighter leading-tight">
                        {proyectoSeleccionado.nombre_proyecto.split('-')[1]?.trim() || proyectoSeleccionado.nombre_proyecto}
                      </h2>
                    </div>
                    <span className={`text-[11px] font-black px-4 py-2 rounded-xl uppercase border shadow-sm flex-shrink-0 leading-none ${getEstiloEstatus(proyectoSeleccionado.estatus).bg} ${getEstiloEstatus(proyectoSeleccionado.estatus).text}`}>
                      {getEstiloEstatus(proyectoSeleccionado.estatus).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-[20px] p-5 border border-slate-100 shadow-inner">
                    <div className="col-span-1">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><MapPin size={10}/> Giro</p>
                      <p className="text-sm font-bold text-slate-800 uppercase">{proyectoSeleccionado.giro_proyecto || '-'}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><CalendarIcon size={10}/> Enviado El</p>
                      <p className="text-xs font-bold text-slate-800 uppercase">
                        {new Date(proyectoSeleccionado.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Clock size={10}/> Hora de Envío</p>
                      <p className="text-xs font-bold text-slate-800 uppercase">
                        {new Date(proyectoSeleccionado.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Timer size={10}/> SLA Activo</p>
                      <p className={`text-sm font-black uppercase ${calcularHorasHabiles(proyectoSeleccionado.created_at).hours >= 24 ? 'text-red-500' : 'text-slate-800'}`}>
                        {calcularHorasHabiles(proyectoSeleccionado.created_at).text} hrs
                      </p>
                    </div>
                  </div>

                  {proyectoSeleccionado.vendedor && (
                    <div className="bg-white border border-slate-200 rounded-[15px] p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex flex-col">
                            <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">Solicitado por</p>
                            <p className="font-black text-slate-900 text-xs uppercase italic tracking-tighter truncate">
                                👤 {proyectoSeleccionado.vendedor.nombre} {proyectoSeleccionado.vendedor.apellidos} 
                            </p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                            {proyectoSeleccionado.vendedor.telefono_movil && (
                                <a href={`tel:${proyectoSeleccionado.vendedor.telefono_movil}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:text-orange-500 hover:border-orange-300 font-bold text-[9px] uppercase tracking-widest transition-colors">
                                    <Phone size={12} /> Llamar
                                </a>
                            )}
                            {proyectoSeleccionado.vendedor.email_corporativo && (
                                <a href={`mailto:${proyectoSeleccionado.vendedor.email_corporativo}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:text-orange-500 hover:border-orange-300 font-bold text-[9px] uppercase tracking-widest transition-colors">
                                    <Mail size={12} /> Correo
                                </a>
                            )}
                        </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-5 rounded-[20px] border border-slate-200 shadow-inner flex flex-col gap-3">
                    <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">📝 Comentarios para Cotización</p>
                    <p className="text-sm text-slate-800 font-medium italic border-l-2 border-orange-300 pl-3 py-1">
                      {proyectoSeleccionado.comentarios_iniciales ? `"${proyectoSeleccionado.comentarios_iniciales}"` : 'Sin comentarios adicionales.'}
                    </p>
                    <button 
                      onClick={() => proyectoSeleccionado.archivo_url && setDocPreview({url: proyectoSeleccionado.archivo_url, nombre: 'Recibo / Referencia'})}
                      disabled={!proyectoSeleccionado.archivo_url}
                      className="mt-3 w-full py-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm tracking-tighter flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                    >
                      <FileText size={16}/> Abrir Archivo Adjunto de Referencia
                    </button>
                  </div>

                  {(proyectoSeleccionado.estatus === 'Cotización' || proyectoSeleccionado.estatus === 'Cotización – Revisión') && (
                    <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-100 mt-2">
                      <button 
                        onClick={() => setModalRechazo(true)}
                        className="py-4 rounded-2xl border-2 border-red-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-300 font-black text-[11px] uppercase tracking-widest transition-all shadow-sm tracking-tighter flex items-center justify-center gap-2"
                      >
                        <FileX size={16}/> Pedir Corrección
                      </button>
                      <button 
                        onClick={() => setModalAprobar(true)}
                        className="py-4 rounded-2xl border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 tracking-tighter flex items-center justify-center gap-2"
                      >
                        <FileCheck size={16}/> Cotizar / Aprobar
                      </button>
                    </div>
                  )}

                  {proyectoSeleccionado.estatus === 'Cotizado' && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-2xl text-center">
                      <p className="text-green-700 font-black uppercase text-[10px] tracking-widest">Este proyecto ya fue cotizado exitosamente.</p>
                    </div>
                  )}

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* SUB-MODAL: RECHAZAR / PEDIR CAMBIOS        */}
        {/* ========================================== */}
        <AnimatePresence>
          {modalRechazo && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col border border-white">
                 <div className="bg-red-50 p-6 flex justify-between items-center text-red-600 border-b border-red-100">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={24} className="text-red-500"/>
                        <h3 className="text-lg font-black uppercase italic tracking-tighter">Pedir Corrección</h3>
                    </div>
                    <button onClick={() => setModalRechazo(false)} className="p-2 bg-white hover:bg-red-100 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                 </div>
                 
                 <form onSubmit={handleRechazar} className="p-6 bg-slate-50 flex flex-col gap-4">
                    <p className="text-xs text-slate-500 font-medium">Escribe el motivo por el cual el vendedor debe corregir o enviar más información sobre este proyecto.</p>
                    <textarea 
                      required
                      rows={4} 
                      placeholder="Ej: Faltan las medidas del techo o el recibo está borroso..." 
                      value={mensajeRechazo} 
                      onChange={e => setMensajeRechazo(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold outline-none text-slate-900 focus:border-red-400 shadow-inner resize-none" 
                    />
                    <button type="submit" disabled={procesando} className="mt-2 bg-red-500 text-white w-full py-4 rounded-xl font-black shadow-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest disabled:opacity-50">
                      {procesando ? 'Enviando...' : 'Devolver a Ventas'}
                    </button>
                 </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* SUB-MODAL: APROBAR / SUBIR COTIZACIÓN      */}
        {/* ========================================== */}
        <AnimatePresence>
          {modalAprobar && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col border border-white">
                 <div className="bg-emerald-50 p-6 flex justify-between items-center text-emerald-700 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                        <FileCheck size={24} className="text-emerald-500"/>
                        <h3 className="text-lg font-black uppercase italic tracking-tighter">Aprobar y Cotizar</h3>
                    </div>
                    <button onClick={() => setModalAprobar(false)} className="p-2 bg-white hover:bg-emerald-100 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                 </div>
                 
                 <form onSubmit={handleAprobar} className="p-6 bg-slate-50 flex flex-col gap-5">
                    
                    <div>
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <UploadCloud className="w-4 h-4 text-emerald-500"/> Archivo(s) de Cotización (Opcional)
                      </span>
                      {/* MULTIPLE UPLOAD ACTIVADO */}
                      <input 
                        type="file" 
                        multiple
                        accept=".pdf,.jpg,.png,.xlsx,.csv" 
                        onChange={e => setFilesCotizacion(Array.from(e.target.files || []))} 
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm font-bold outline-none text-slate-900 focus:border-emerald-400 shadow-inner file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" 
                      />
                      
                      {/* VISTA PREVIA DE LOS ARCHIVOS SELECCIONADOS */}
                      {filesCotizacion.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Archivos listos para subir:</p>
                           {filesCotizacion.map((file, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 shadow-sm">
                               <div className="flex items-center gap-2 overflow-hidden">
                                 <File size={12} className="text-emerald-500 flex-shrink-0" />
                                 <span className="text-[10px] font-bold text-emerald-800 truncate">{file.name}</span>
                               </div>
                               <button type="button" onClick={() => removerArchivo(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14}/></button>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <FileText className="w-4 h-4 text-emerald-500"/> Notas para el Vendedor
                      </span>
                      <textarea 
                        rows={3} 
                        placeholder="Detalles sobre costos, opciones generadas, etc." 
                        value={mensajeAprobacion} 
                        onChange={e => setMensajeAprobacion(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold outline-none text-slate-900 focus:border-emerald-400 shadow-inner resize-none" 
                      />
                    </div>

                    <button type="submit" disabled={procesando} className="mt-2 bg-emerald-500 text-white w-full py-4 rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest disabled:opacity-50">
                      {procesando ? 'Procesando...' : 'Marcar como Cotizado'} <Save size={16}/>
                    </button>
                 </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* VISOR DE PDF / IMÁGENES */}
        <AnimatePresence>
            {docPreview && (
                <div className="fixed inset-0 z-[210] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setDocPreview(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[40px] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white" onClick={e => e.stopPropagation()}>
                        <div className="bg-white p-6 flex justify-between items-center border-b border-slate-100">
                            <h3 className="font-black uppercase tracking-widest text-slate-900 flex items-center gap-3"><FileText className="w-6 h-6 text-orange-500"/> Visor: {docPreview.nombre}</h3>
                            <button onClick={() => setDocPreview(null)} className="p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 bg-slate-800"><iframe src={docPreview.url} className="w-full h-full border-none" title={docPreview.nombre} /></div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </main>
    </div>
  )
}