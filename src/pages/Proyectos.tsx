import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, Search, X, Save, 
  Briefcase, MapPin, FileText, CheckCircle2, AlertCircle, Clock, ChevronRight, History,
  Timer, Calendar as CalendarIcon, Edit3, UploadCloud, File
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

// --- HELPER DE COMPRESIÓN DE IMÁGENES ---
const comprimirImagen = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file); // Si es PDF u otro, pasa directo
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Comprime al 75% de calidad en JPEG
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg', lastModified: Date.now() });
            resolve(newFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.75); 
      };
    };
  });
};

// ==========================================
// --- COMPONENTE PRINCIPAL ---
// ==========================================
export default function Proyectos() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('Todos')
  
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [modalLog, setModalLog] = useState(false)
  
  // Modal de selección de múltiples archivos para ver
  const [modalListaArchivos, setModalListaArchivos] = useState<{ titulo: string, urls: string[] } | null>(null)

  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
  const [proyectoEditando, setProyectoEditando] = useState<any>(null) 
  const [docPreview, setDocPreview] = useState<{ url: string, nombre: string } | null>(null)
  const [logsProyecto, setLogsProyecto] = useState<any[]>([])

  const [formNuevo, setFormNuevo] = useState({ nombre: '', giro: 'Residencial', comentarios: '' })
  
  // AHORA MANEJAMOS MÚLTIPLES ARCHIVOS
  const [filesAdjuntos, setFilesAdjuntos] = useState<File[]>([])
  const [guardando, setGuardando] = useState(false)

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

  const handleAbrirEdicion = (proyecto: any) => {
    setProyectoEditando(proyecto);
    setFormNuevo({ 
        nombre: proyecto.nombre_proyecto, 
        giro: proyecto.giro_proyecto, 
        comentarios: proyecto.comentarios_iniciales || '' 
    });
    setFilesAdjuntos([]); 
    setModalDetalle(false);
    setModalNuevo(true);
  }

  const handleGuardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proyectoEditando && filesAdjuntos.length === 0) return alert("Por favor adjunta al menos un recibo o foto.")
    setGuardando(true)

    try {
      let urlsGeneradas: string[] = proyectoEditando?.archivos_adjuntos || [];
      // Fallback para mantener compatibilidad con la columna vieja si existe
      let primeraUrl = proyectoEditando?.archivo_url || null;

      if (filesAdjuntos.length > 0) {
        if (!proyectoEditando) urlsGeneradas = []; // Reset si es nuevo

        for (const file of filesAdjuntos) {
          // 1. Comprimir imagen si es necesario
          const fileOptimizado = await comprimirImagen(file);

          const fileExt = fileOptimizado.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
          const filePath = `solicitudes/${fileName}`

          const { error: uploadError } = await supabase.storage.from('cotizaciones').upload(filePath, fileOptimizado)
          if (uploadError) throw new Error(`Error al subir ${file.name}: ${uploadError.message}`)

          const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath)
          urlsGeneradas.push(urlData.publicUrl);
        }
        if (!primeraUrl) primeraUrl = urlsGeneradas[0];
      }

      if (proyectoEditando) {
        await supabase.from('proyectos')
          .update({
            nombre_proyecto: formNuevo.nombre,
            giro_proyecto: formNuevo.giro,
            comentarios_iniciales: formNuevo.comentarios,
            archivo_url: primeraUrl, // Legado
            archivos_adjuntos: urlsGeneradas, // Nuevo array
            estatus: 'Cotización' 
          })
          .eq('id', proyectoEditando.id);

        await supabase.from('proyectos_interacciones').insert([{
          proyecto_id: proyectoEditando.id,
          usuario_id: usuarioLogueado?.id,
          estado_anterior: proyectoEditando.estatus,
          estado_nuevo: 'Cotización',
          accion: 'Corrección Enviada',
          mensaje: formNuevo.comentarios ? `Nuevos comentarios: ${formNuevo.comentarios}` : 'El vendedor actualizó la información y reenvió la solicitud.'
        }]);

      } else {
        const payload = {
          nombre_proyecto: formNuevo.nombre,
          giro_proyecto: formNuevo.giro,
          comentarios_iniciales: formNuevo.comentarios,
          archivo_url: primeraUrl, // Legado
          archivos_adjuntos: urlsGeneradas, // Nuevo array
          vendedor_id: usuarioLogueado?.id || null,
          estatus: 'Cotización'
        }
        
        const { data: nuevoProyecto, error: insertError } = await supabase.from('proyectos').insert([payload]).select().single();
        if (insertError) throw new Error(`Error BD: ${insertError.message}`)

        if (nuevoProyecto) {
          await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: nuevoProyecto.id,
            usuario_id: usuarioLogueado?.id,
            estado_anterior: 'Nuevo',
            estado_nuevo: 'Cotización',
            accion: 'Proyecto Creado',
            mensaje: formNuevo.comentarios ? `Contexto inicial: ${formNuevo.comentarios}` : 'Solicitud inicial creada sin comentarios.'
          }]);
        }
      }

      setModalNuevo(false)
      setProyectoEditando(null)
      setFormNuevo({ nombre: '', giro: 'Residencial', comentarios: '' })
      setFilesAdjuntos([])
      fetchProyectos()

    } catch (error: any) {
      alert("🚨 " + error.message)
    } finally {
      setGuardando(false)
    }
  }

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

  // Función para manejar cuando haces clic en un botón que puede tener varios archivos
  const abrirVisorArchivos = (titulo: string, urls: string[]) => {
    if (!urls || urls.length === 0) return;
    if (urls.length === 1) {
       // Si solo hay uno, lo abre directo
       setDocPreview({ url: urls[0], nombre: titulo });
    } else {
       // Si hay varios, abre un mini menú
       setModalListaArchivos({ titulo, urls });
    }
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
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <h1 className="font-black text-base uppercase italic tracking-tighter text-slate-900">Mis Proyectos</h1>
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
        
        <div className="flex justify-end mb-10">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 w-full md:w-72 shadow-sm">
              <Search className="text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Buscar proyecto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" />
            </div>
            <select 
              value={filtroEstatus} 
              onChange={e => setFiltroEstatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold text-xs outline-none text-slate-600 shadow-sm w-full md:w-auto"
            >
              <option value="Todos">Todos los estatus</option>
              {Object.keys(ESTADOS_SOLARIS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button onClick={() => { setProyectoEditando(null); setFormNuevo({nombre: '', giro: 'Residencial', comentarios: ''}); setFilesAdjuntos([]); setModalNuevo(true); }} className="bg-orange-500 text-white px-8 py-3.5 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest whitespace-nowrap w-full md:w-auto justify-center">
              <Plus className="w-5 h-5" /> Nueva Cotización
            </button>
          </div>
        </div>

        {/* VISTA DE LISTA */}
        <div className="flex flex-col gap-4">
          {cargando ? (
            <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs">Cargando...</p>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron proyectos</p>
            </div>
          ) : (
            proyectosFiltrados.map((p) => (
              <div 
                key={p.id} 
                onClick={() => { setProyectoSeleccionado(p); setModalDetalle(true); }} 
                className="bg-white border border-slate-100 rounded-[25px] p-5 shadow-sm flex items-center gap-6 group hover:border-orange-400 transition-all hover:shadow-xl cursor-pointer"
              >
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-md">
                    {p.nombre_proyecto.charAt(0)}
                </div>
                
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                    <p className="text-[9px] font-semibold text-slate-600 uppercase mt-2 truncate flex items-center gap-1.5 leading-none">
                      <MapPin size={11} className="text-slate-400"/> Giro: {p.giro_proyecto}
                    </p>
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
            ))
          )}
        </div>

        {/* MODALES */}
        <AnimatePresence>
          {modalNuevo && (
            <ModalNuevoProyecto 
              onClose={() => setModalNuevo(false)} 
              onSubmit={handleGuardarProyecto} 
              form={formNuevo} 
              setForm={setFormNuevo} 
              filesAdjuntos={filesAdjuntos}
              setFilesAdjuntos={setFilesAdjuntos} 
              guardando={guardando}
              esEdicion={!!proyectoEditando}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalDetalle && proyectoSeleccionado && (
            <ModalDetalleProyecto 
                proyecto={proyectoSeleccionado}
                onClose={() => setModalDetalle(false)}
                onAbrirArchivos={abrirVisorArchivos}
                onVerLogs={verLogs}
                onEditar={() => handleAbrirEdicion(proyectoSeleccionado)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
            {modalLog && proyectoSeleccionado && (
                <ModalLogProyecto 
                    logs={logsProyecto}
                    nombreProyecto={proyectoSeleccionado.nombre_proyecto}
                    onClose={() => setModalLog(false)}
                />
            )}
        </AnimatePresence>

        {/* SUB-MODAL DE SELECCIÓN DE MÚLTIPLES ARCHIVOS */}
        <AnimatePresence>
            {modalListaArchivos && (
               <div className="fixed inset-0 z-[205] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col border border-white">
                    <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
                        <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm flex items-center gap-2"><FileText className="text-orange-500 w-5 h-5"/> {modalListaArchivos.titulo}</h3>
                        <button onClick={() => setModalListaArchivos(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={16}/></button>
                    </div>
                    <div className="p-6 flex flex-col gap-3">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Selecciona un archivo para ver:</p>
                        {modalListaArchivos.urls.map((url, idx) => (
                           <button 
                             key={idx} 
                             onClick={() => { setDocPreview({url, nombre: `${modalListaArchivos.titulo} - Opción ${idx + 1}`}); setModalListaArchivos(null); }}
                             className="w-full text-left py-4 px-5 bg-white border border-slate-200 rounded-xl hover:border-orange-400 hover:shadow-md transition-all font-black text-[11px] text-slate-700 uppercase tracking-widest flex items-center gap-3"
                           >
                             <File className="w-4 h-4 text-orange-400"/> Opción {idx + 1}
                           </button>
                        ))}
                    </div>
                 </motion.div>
               </div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {docPreview && (
                <div className="fixed inset-0 z-[210] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setDocPreview(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[40px] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white" onClick={e => e.stopPropagation()}>
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

// ==========================================
// --- HELPER COMPONENTS (Modales) ---
// ==========================================

const ModalNuevoProyecto = ({ onClose, onSubmit, form, setForm, filesAdjuntos, setFilesAdjuntos, guardando, esEdicion }: any) => {
  const removerArchivo = (index: number) => {
    setFilesAdjuntos((prev: File[]) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-white">
        
        <div className="bg-slate-900 p-8 flex items-center justify-between text-white shrink-0 border-b border-white/10">
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  {esEdicion ? <Edit3 className="w-7 h-7 text-orange-400"/> : <Briefcase className="w-7 h-7 text-orange-400"/>}
                </div>
                <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">{esEdicion ? 'Editar Solicitud' : 'Nueva Cotización'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{esEdicion ? 'Corrige la información del proyecto' : 'Registro Inicial de Proyecto'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-6 h-6"/></button>
        </div>

        <form onSubmit={onSubmit} className="p-10 overflow-y-auto flex-1 bg-white custom-scrollbar">
            <div className="grid grid-cols-2 gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="col-span-2">
                  <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400"/> ID y Nombre del Proyecto</span>
                  <input type="text" placeholder="Ej: 379 - Hospital GOLO" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>
                
                <div className="col-span-1 flex flex-col">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400"/> Giro del Proyecto</span>
                  <select value={form.giro} onChange={e => setForm({...form, giro: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>

                <div className="col-span-1 flex flex-col">
                  <span className="flex items-center gap-1.5"><UploadCloud className="w-4 h-4 text-slate-400"/> Recibo / Cotización Adjunta</span>
                  {/* MULTIPLE UPLOAD */}
                  <input type="file" multiple accept="image/*,.pdf" onChange={e => setFilesAdjuntos(Array.from(e.target.files || []))} required={!esEdicion && filesAdjuntos.length === 0} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-6 mt-2 text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-orange-500 uppercase tracking-widest transition-colors cursor-pointer" />
                  {esEdicion && <span className="text-[9px] mt-2 text-slate-400 italic normal-case">*(Opcional) Sube nuevos archivos solo si te pidieron cambiarlos.</span>}
                  
                  {/* VISTA PREVIA ARCHIVOS SELECCIONADOS */}
                  {filesAdjuntos.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                       {filesAdjuntos.map((file: File, idx: number) => (
                         <div key={idx} className="flex justify-between items-center bg-orange-50 px-3 py-2 rounded-lg border border-orange-100 shadow-sm">
                           <div className="flex items-center gap-2 overflow-hidden">
                             <File size={12} className="text-orange-500 flex-shrink-0" />
                             <span className="text-[10px] font-bold text-orange-800 truncate">{file.name}</span>
                           </div>
                           <button type="button" onClick={() => removerArchivo(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14}/></button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400"/> Comentarios de Contexto</span>
                  <textarea rows={3} placeholder="Detalles para el área de cotización..." value={form.comentarios} onChange={e => setForm({...form, comentarios: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner resize-none" />
                </div>
            </div>

            <div className="pt-8 mt-10 flex justify-end gap-4 border-t border-slate-200 shrink-0">
              <button type="button" onClick={onClose} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" disabled={guardando} className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black shadow-xl hover:bg-orange-500 transition-all flex items-center gap-3 uppercase text-[11px] tracking-widest disabled:opacity-50">
                {guardando ? 'GUARDANDO...' : (esEdicion ? 'GUARDAR Y REENVIAR' : 'CREAR PROYECTO')} <Save className="w-4 h-4"/>
              </button>
            </div>
        </form>
      </motion.div>
    </div>
  )
}

// --- MODAL DETALLE PROYECTO (Ficha Técnica) ---
const ModalDetalleProyecto = ({ proyecto, onClose, onAbrirArchivos, onVerLogs, onEditar }: any) => {
  const statusInfo = getEstiloEstatus(proyecto.estatus);
  const partesNombre = proyecto.nombre_proyecto.split('-');
  const idNum = partesNombre[0]?.trim() || '';
  const nombreReal = partesNombre[1]?.trim() || proyecto.nombre_proyecto;
  
  const interacciones = proyecto.interacciones || [];
  const ultimoRechazo = interacciones
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((i: any) => i.accion === 'Corrección Solicitada');

  // Determinar arrays de URLs
  const recibosUrls = proyecto.archivos_adjuntos && proyecto.archivos_adjuntos.length > 0 
      ? proyecto.archivos_adjuntos 
      : (proyecto.archivo_url ? [proyecto.archivo_url] : []);
  
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[95vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center pt-6 pb-4 px-8 border-b border-slate-100 shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileText size={20}/></div>
            <p className="font-black text-[14px] uppercase italic text-slate-950 leading-none tracking-tighter truncate">
              Proyecto: {idNum}
            </p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => onVerLogs(proyecto.id)} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-orange-500 rounded-full transition-colors"><History size={16}/></button>
             <button onClick={onClose} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors leading-none"><X size={16}/></button>
          </div>
        </div>

        <div className="p-8 bg-white flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nombre del Proyecto</p>
              <h2 className="font-black text-2xl text-slate-950 uppercase italic tracking-tighter leading-tight">
                {nombreReal}
              </h2>
            </div>
            <span className={`text-[11px] font-black px-4 py-2 rounded-xl uppercase border shadow-sm flex-shrink-0 leading-none ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>

          {proyecto.estatus === 'Cotización – Corrección' && ultimoRechazo && (
            <div className="bg-red-50 border border-red-200 p-5 rounded-[20px] shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1">
                <p className="text-red-600 font-black text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle size={14}/> Motivo de Corrección</p>
                <p className="text-sm text-red-800 font-medium italic">"{ultimoRechazo.mensaje}"</p>
              </div>
              <button 
                onClick={onEditar}
                className="bg-red-500 text-white hover:bg-red-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
              >
                <Edit3 size={14}/> Editar Solicitud
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-[20px] p-5 border border-slate-100 shadow-inner">
            <div className="col-span-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><MapPin size={10}/> Giro</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{proyecto.giro_proyecto || '-'}</p>
            </div>
            <div className="col-span-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><CalendarIcon size={10}/> Enviado El</p>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {new Date(proyecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="col-span-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Clock size={10}/> Hora</p>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {new Date(proyecto.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="col-span-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Timer size={10}/> T. Espera</p>
              <p className="text-sm font-black uppercase text-slate-800">
                {calcularHorasHabiles(proyecto.created_at).text} hrs
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-[20px] border border-slate-200 shadow-inner flex flex-col gap-3">
            <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">📝 Comentarios de Contexto</p>
            <p className="text-sm text-slate-800 font-medium italic border-l-2 border-orange-300 pl-3 py-1">
              {proyecto.comentarios_iniciales ? `"${proyecto.comentarios_iniciales}"` : 'Sin comentarios adicionales.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 px-1 pb-3 border-t border-slate-100 pt-5 mt-2">
            {botonesAccion.map((btn) => (
              <button 
                key={btn.label}
                onClick={btn.action}
                disabled={!btn.hasData}
                className={`py-3 px-1.5 rounded-2xl border-2 font-black text-[9px] uppercase tracking-widest transition-all shadow-sm tracking-tighter h-12 flex items-center justify-center text-center leading-tight
                  ${btn.hasData 
                    ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer' 
                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 opacity-90'}`
                }
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>
      </motion.div>
    </div>
  );
};

// --- MODAL LOG / BITÁCORA DEL PROYECTO ---
const ModalLogProyecto = ({ logs, onClose, nombreProyecto }: any) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh]">
         <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl text-orange-400"><History size={20}/></div>
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Bitácora Solaris</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{nombreProyecto}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5"/></button>
         </div>
         
         <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
            {logs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border border-slate-100 rounded-2xl bg-white shadow-inner">
                    <AlertCircle className='w-8 h-8 mx-auto mb-3 opacity-50'/>
                    <p className="font-bold uppercase tracking-widest text-[10px]">No hay registros en la bitácora para este proyecto.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log: any) => {
                         const styleEstatusNuevo = getEstiloEstatus(log.estado_nuevo);
                         const perfiles = log.perfiles;
                         return (
                            <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 relative overflow-hidden shadow-sm">
                                 <div className="absolute top-0 left-0 h-full w-1.5 bg-orange-500/10" />
                                 <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0 shadow-md overflow-hidden border border-slate-200">
                                     {perfiles?.avatar_url ? (
                                        <img src={perfiles.avatar_url} className="w-full h-full object-cover" />
                                     ) : (
                                        <span>{perfiles?.nombre?.charAt(0)}{perfiles?.apellidos?.charAt(0)}</span>
                                     )}
                                 </div>
                                 <div className="flex-1 text-[11px]">
                                     <div className='flex justify-between gap-2 items-start'>
                                         <div>
                                             <p className="font-black uppercase italic text-slate-950 tracking-tighter leading-none">{perfiles?.nombre} {perfiles?.apellidos}</p>
                                             <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Acción: <span className='text-slate-900 font-black'>{log.accion}</span></p>
                                         </div>
                                         <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full">{new Date(log.created_at).toLocaleString('es-MX', { timeStyle: 'short', dateStyle: 'short' })}</p>
                                     </div>
                                     {log.estado_nuevo && (
                                        <div className="text-[9px] font-semibold text-slate-500 mt-2.5 flex items-center gap-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                            Estatus Nuevo:
                                            <span className={`text-[8px] font-black px-2.5 py-1 rounded-md uppercase border ${styleEstatusNuevo.bg} ${styleEstatusNuevo.text}`}>
                                                {log.estado_nuevo}
                                            </span>
                                        </div>
                                     )}
                                     {log.mensaje && (
                                        <div className="p-3 bg-white text-slate-700 rounded-xl mt-3 italic border-l-4 border-orange-400 font-medium text-[11px] shadow-inner whitespace-pre-line">
                                            {log.mensaje}
                                        </div>
                                     )}
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