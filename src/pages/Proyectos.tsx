import { useDialog } from '../context/DialogContext'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, enviarNotificacionRoles } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, X, Save,
  Briefcase, MapPin, FileText, CheckCircle2, AlertCircle, Clock, ChevronRight, History,
  Timer, Calendar as CalendarIcon, Edit3, UploadCloud, File as FileIcon, MessageCircle, MessageSquare,
  Image as ImageIcon, Info, Settings, Trash2, RefreshCcw
} from 'lucide-react'

// IMPORTAMOS NUESTROS NUEVOS COMPONENTES GLOBALES
import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import ModalLineaTiempo from '../components/ModalLineaTiempo'

import degradadoBg from '../assets/degradado.png'

// --- HELPERS DE COLORES Y TIEMPOS ---
const ESTADOS_SOLARIS: any = {
  'Cotización': { label: 'Cotización', bg: 'bg-orange-100', text: 'text-orange-700' },
  'Cotización – Revisión': { label: 'Revisión', bg: 'bg-blue-100', text: 'text-blue-700' },
  'Cotizado': { label: 'Cotizado ✨', bg: 'bg-green-100', text: 'text-green-700' },
  'Cotización – Corrección': { label: 'Corrección 🛑', bg: 'bg-red-100', text: 'text-red-700' },
  'Recotización': { label: 'Recotización', bg: 'bg-amber-100', text: 'text-amber-700' },
  'Recotización – Corrección': { label: 'Recot. Corregir 🛑', bg: 'bg-red-100', text: 'text-red-700' },
  'Recotización – Revisión': { label: 'Recot. Revisión', bg: 'bg-blue-100', text: 'text-blue-700' },
};

const getEstiloEstatus = (estatus: string) => {
  const e = estatus?.toLowerCase() || ''
  if (e.includes('recotización')) {
    if (e.includes('revisión')) return ESTADOS_SOLARIS['Recotización – Revisión'];
    if (e.includes('corrección')) return ESTADOS_SOLARIS['Recotización – Corrección'];
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

const comprimirImagen = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280; const MAX_HEIGHT = 1280;
        let width = img.width; let height = img.height;
        if (width > height && width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        else if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg', lastModified: Date.now() }));
          else resolve(file);
        }, 'image/jpeg', 0.75);
      };
    };
  });
};

export default function ProyectosList() {
    const { showAlert, showConfirm } = useDialog();
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('Todos')

  // ESTADOS NUEVOS: Filtro de Chat Activo
  const [filtroChatActivo, setFiltroChatActivo] = useState(false)
  const [chatsActivosDb, setChatsActivosDb] = useState<string[]>([])
  const [chatsLeidos, setChatsLeidos] = useState<string[]>([])

  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [modalLog, setModalLog] = useState(false)
  const [modalAcciones, setModalAcciones] = useState(false)

  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
  const [proyectoEditando, setProyectoEditando] = useState<any>(null)

  const [modalRecotizacion, setModalRecotizacion] = useState(false)
  const [formRecotizacion, setFormRecotizacion] = useState({ comentarios: '' })

  const [modalViabilidad, setModalViabilidad] = useState(false)
  const [formViabilidad, setFormViabilidad] = useState({
    link_maps: '', calle: '', colonia: '', ciudad: '', estado_dir: '',
    codigo_postal: '', nombre_cliente: '', numero_cliente: '',
    requiere_escalera: false, comentarios_solicitud: ''
  })


  const [docPreview, setDocPreview] = useState<{ urls: string[], currentIndex: number, nombre: string } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [modalListaArchivos, setModalListaArchivos] = useState<{ titulo: string, urls: string[] } | null>(null)

  const [logsProyecto, setLogsProyecto] = useState<any[]>([])
  const [formNuevo, setFormNuevo] = useState({ nombre: '', giro: 'Residencial', comentarios: '' })
  const [filesAdjuntos, setFilesAdjuntos] = useState<File[]>([])
  const [guardando, setGuardando] = useState(false)

  // ESTADOS DEL COMPONENTE CHAT GLOBAL
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInicial, setChatInicial] = useState<any>(null)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  const fetchInicial = async () => {
    setCargando(true)
    let queryProyectos = supabase.from('proyectos').select(`*, vendedor:vendedor_id (nombre, apellidos, avatar_url, departamento, telefono_movil, email_corporativo), interacciones:proyectos_interacciones (mensaje, accion, created_at)`).order('created_at', { ascending: false });

    if (!usuarioLogueado?.proyectos) {
      queryProyectos = queryProyectos.eq('vendedor_id', usuarioLogueado?.id);
    }

    const [resProyectos, resMensajes] = await Promise.all([
      queryProyectos,
      supabase.from('mensajes_chat').select('proyecto_id').neq('remitente_id', usuarioLogueado?.id).not('proyecto_id', 'is', null)
    ])

    if (resProyectos.data) setProyectos(resProyectos.data)
    if (resMensajes.data) {
      const uniqueIds = Array.from(new Set(resMensajes.data.map(m => m.proyecto_id)));
      setChatsActivosDb(uniqueIds);
    }
    setCargando(false)
  }

  useEffect(() => { fetchInicial() }, [])

  // --- AUTO-OPEN DEEP LINK ---
  useEffect(() => {
    const pId = searchParams.get('proyecto_id')
    if (pId && proyectos.length > 0) {
      const p = proyectos.find(x => x.id === pId)
      if (p) {
        handleAbrirEdicion(p)
        searchParams.delete('proyecto_id')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [proyectos, searchParams, setSearchParams])

  const handleAbrirEdicion = (proyecto: any) => {
    setProyectoEditando(proyecto);
    setFormNuevo({ nombre: proyecto.nombre_proyecto, giro: proyecto.giro_proyecto, comentarios: '' });
    setFilesAdjuntos([]); setModalDetalle(false); setModalNuevo(true);
  }

  const handleAbrirRecotizacion = (proyecto: any) => {
    setProyectoEditando(proyecto);
    setFormRecotizacion({ comentarios: '' });
    setFilesAdjuntos([]); setModalDetalle(false); setModalRecotizacion(true);
  }

  const handleAbrirViabilidad = (proyecto: any) => {
    setProyectoSeleccionado(proyecto);
    setFormViabilidad({
      link_maps: proyecto.link_maps || '', 
      calle: proyecto.calle || '', 
      colonia: proyecto.colonia || '', 
      ciudad: proyecto.ciudad || '', 
      estado_dir: proyecto.estado_dir || '',
      codigo_postal: proyecto.codigo_postal || '', 
      nombre_cliente: proyecto.nombre_cliente || '', 
      numero_cliente: proyecto.numero_cliente || '',
      requiere_escalera: proyecto.requiere_escalera || false, 
      comentarios_solicitud: proyecto.comentarios_solicitud || ''
    });
    setFilesAdjuntos([]);
    setModalAcciones(false);
    setModalViabilidad(true);
  }

  const handleGuardarViabilidad = async (e: React.FormEvent, fotosActualizadas: any[]) => {
    e.preventDefault();
    if (!proyectoSeleccionado) return;
    setGuardando(true);

    try {
      let urlsGeneradas: string[] = proyectoSeleccionado.archivos_adjuntos || [];
      let fachadaUrl: string | null = proyectoSeleccionado.fachada_url || null;

      // Handle file uploads (new receipts or new fachada)
      // Note: We expect 'fotosActualizadas' to contain new file objects if any. 
      // The modal will provide them. We'll simply append them or replace the fachada.
      for (const item of fotosActualizadas) {
        if (item.file) {
          const fileOptimizado = await comprimirImagen(item.file);
          const fileExt = fileOptimizado.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
          const filePath = `viabilidades/${fileName}`;
          await supabase.storage.from('cotizaciones').upload(filePath, fileOptimizado);
          const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath);

          if (item.tipo === 'fachada') {
            fachadaUrl = urlData.publicUrl;
          } else {
            urlsGeneradas.push(urlData.publicUrl);
          }
        }
      }

      const { error: errorVC } = await supabase.from('viabilidad_control').insert([{
        proyecto_id: proyectoSeleccionado.id,
        status: 1,
        fecha_solicitada: new Date().toISOString()
      }]);
      if (errorVC) throw errorVC;

      const { error: errorUpd } = await supabase.from('proyectos')
        .update({
          estatus: 'Viabilidad',
          sub_estatus: 'Pendiente Ingeniería',
          fachada_url: fachadaUrl,
          archivos_adjuntos: urlsGeneradas,
          link_maps: formViabilidad.link_maps,
          calle: formViabilidad.calle,
          colonia: formViabilidad.colonia,
          ciudad: formViabilidad.ciudad,
          estado_dir: formViabilidad.estado_dir,
          codigo_postal: formViabilidad.codigo_postal,
          nombre_cliente: formViabilidad.nombre_cliente,
          numero_cliente: formViabilidad.numero_cliente,
          requiere_escalera: formViabilidad.requiere_escalera,
          comentarios_solicitud: formViabilidad.comentarios_solicitud
        })
        .eq('id', proyectoSeleccionado.id);
      if (errorUpd) throw errorUpd;

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: proyectoSeleccionado.id,
        usuario_id: usuarioLogueado.id,
        accion: 'Solicitud Viabilidad',
        mensaje: `Se inició el proceso de viabilidad técnica.`
      }]);

      await enviarNotificacionRoles('notif_viabilidad_tecnica', `Nueva Solicitud de Viabilidad: ${proyectoSeleccionado.nombre_proyecto}|||/viabilidad?proyecto_id=${proyectoSeleccionado.id}`, usuarioLogueado?.id);

      setModalViabilidad(false);
      setProyectoSeleccionado(null);
      fetchInicial();
    } catch (error: any) {
      console.error(error);
      await showAlert('Aviso', "🚨 " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  const handleGuardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proyectoEditando && filesAdjuntos.length === 0) { await showAlert('Aviso', "Por favor adjunta al menos un recibo o foto."); return; }
    setGuardando(true)

    try {
      let urlsGeneradas: string[] = proyectoEditando?.archivos_adjuntos || [];
      let primeraUrl = proyectoEditando?.archivo_url || null;

      if (filesAdjuntos.length > 0) {
        if (!proyectoEditando) urlsGeneradas = [];
        for (const file of filesAdjuntos) {
          const fileOptimizado = await comprimirImagen(file);
          const fileExt = fileOptimizado.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
          const filePath = `solicitudes/${fileName}`
          await supabase.storage.from('cotizaciones').upload(filePath, fileOptimizado)
          const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath)
          urlsGeneradas.push(urlData.publicUrl);
        }
        if (!primeraUrl) primeraUrl = urlsGeneradas[0];
      }

      if (proyectoEditando) {
        await supabase.from('proyectos')
          .update({ nombre_proyecto: formNuevo.nombre, giro_proyecto: formNuevo.giro, comentarios_iniciales: formNuevo.comentarios, archivo_url: primeraUrl, archivos_adjuntos: urlsGeneradas, estatus: 'Cotización' })
          .eq('id', proyectoEditando.id);

        await supabase.from('proyectos_interacciones').insert([{
          proyecto_id: proyectoEditando.id, usuario_id: usuarioLogueado?.id, estado_anterior: proyectoEditando.estatus, estado_nuevo: 'Cotización', accion: 'Corrección Enviada',
          mensaje: formNuevo.comentarios ? `Nuevos comentarios: ${formNuevo.comentarios}` : 'Se actualizó la información de la solicitud.'
        }]);
        await enviarNotificacionRoles('notif_cotizaciones', `Se envió corrección del proyecto: ${formNuevo.nombre}|||/cotizaciones?proyecto_id=${proyectoEditando.id}`, usuarioLogueado?.id);
      } else {
        const payload = {
          nombre_proyecto: formNuevo.nombre,
          giro_proyecto: formNuevo.giro,
          comentarios_iniciales: formNuevo.comentarios,
          archivo_url: primeraUrl,
          archivos_adjuntos: urlsGeneradas,
          vendedor_id: usuarioLogueado?.id || null,
          estatus: 'Cotización',
          fecha_creacion_solicitud: new Date().toISOString(),
          fecha_inicio_cotizacion: new Date().toISOString()
        }
        const { data: nuevoProyecto } = await supabase.from('proyectos').insert([payload]).select().single();
        if (nuevoProyecto) {
          await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: nuevoProyecto.id, usuario_id: usuarioLogueado?.id, estado_anterior: 'Nuevo', estado_nuevo: 'Cotización', accion: 'Proyecto Creado',
            mensaje: formNuevo.comentarios ? `Contexto inicial: ${formNuevo.comentarios}` : 'Solicitud creada.'
          }]);
          await enviarNotificacionRoles('notif_cotizaciones', `Nueva solicitud de cotización recibida: ${formNuevo.nombre}|||/cotizaciones?proyecto_id=${nuevoProyecto.id}`, usuarioLogueado?.id);
        }
      }
      setModalNuevo(false); setProyectoEditando(null); setFormNuevo({ nombre: '', giro: 'Residencial', comentarios: '' }); setFilesAdjuntos([]); fetchInicial();
    } catch (error: any) { await showAlert('Aviso', "🚨 " + error.message) } finally { setGuardando(false) }
  }

  const handleGuardarRecotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proyectoEditando) return;
    if (!formRecotizacion.comentarios) { await showAlert('Aviso', "Por favor, ingresa un motivo para la recotización."); return; }
    setGuardando(true);

    try {
      let urlsGeneradas: string[] = proyectoEditando.archivos_adjuntos || [];

      if (filesAdjuntos.length > 0) {
        for (const file of filesAdjuntos) {
          const fileOptimizado = await comprimirImagen(file);
          const fileExt = fileOptimizado.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
          const filePath = `solicitudes/${fileName}`
          await supabase.storage.from('cotizaciones').upload(filePath, fileOptimizado)
          const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath)
          urlsGeneradas.push(urlData.publicUrl);
        }
      }

      await supabase.from('proyectos')
        .update({
          estatus: 'Recotización',
          archivos_adjuntos: urlsGeneradas,
          fecha_recotizacion: new Date().toISOString()
        })
        .eq('id', proyectoEditando.id);

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: proyectoEditando.id,
        usuario_id: usuarioLogueado?.id,
        estado_anterior: proyectoEditando.estatus,
        estado_nuevo: 'Recotización',
        accion: 'Recotización Solicitada',
        mensaje: `Motivo de Recotización: ${formRecotizacion.comentarios}`
      }]);
      await enviarNotificacionRoles('notif_cotizaciones', `Petición de Recotización: ${proyectoEditando.nombre_proyecto}|||/cotizaciones?proyecto_id=${proyectoEditando.id}`, usuarioLogueado?.id);

      setModalRecotizacion(false);
      setProyectoEditando(null);
      setFormRecotizacion({ comentarios: '' });
      setFilesAdjuntos([]);
      fetchInicial();
    } catch (error: any) {
      await showAlert('Aviso', "🚨 " + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const verLogs = async (proyectoId: string) => {
    setModalLog(false);
    const { data } = await supabase.from('proyectos_interacciones').select(`*, perfiles:usuario_id (nombre, apellidos, avatar_url)`).eq('proyecto_id', proyectoId).order('created_at', { ascending: false });
    if (data) setLogsProyecto(data);
    setModalLog(true);
  };

  const abrirVisorArchivos = (titulo: string, urls: string[], forzarLista = false) => {
    if (!urls || urls.length === 0) return;
    if (urls.length === 1 && !forzarLista) { setDocPreview({ urls, currentIndex: 0, nombre: titulo }); }
    else { setModalListaArchivos({ titulo, urls }); }
  };

  const handleAbrirChatProyecto = (p: any, estatusFiltro?: string) => {
    setChatsLeidos(prev => [...prev, p.id]);
    setChatInicial({ tipo: 'proyecto', id: p.id, nombre: p.nombre_proyecto, estatusProyecto: p.estatus, estatusFiltro: estatusFiltro, vendedor_id: p.vendedor_id });
    setChatAbierto(true);
    setModalDetalle(false);
    setModalLog(false);
  };

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      const matchBusqueda = p.nombre_proyecto.toLowerCase().includes(busqueda.toLowerCase()) || p.giro_proyecto?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstatus = filtroEstatus === 'Todos' || p.estatus === filtroEstatus;
      const tieneChatActivo = chatsActivosDb.includes(p.id) && !chatsLeidos.includes(p.id);
      const matchChat = filtroChatActivo ? tieneChatActivo : true;

      return matchBusqueda && matchEstatus && matchChat;
    })
  }, [proyectos, busqueda, filtroEstatus, filtroChatActivo, chatsActivosDb, chatsLeidos])

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover flex flex-col" style={{ backgroundImage: `url(${degradadoBg})` }}>

      {/* COMPONENTE HEADER GLOBAL (z-[60] por defecto) */}
      <Header
        titulo="Mis Proyectos"
        onAbrirChat={() => { setChatInicial(null); setChatAbierto(true); }}
      />

      {/* CONTENIDO PRINCIPAL (z-10 para no solapar modales globales) */}
      <main className="max-w-[1700px] mx-auto w-full px-4 sm:px-8 py-8 relative z-10 flex-1">

        <div className="flex justify-end mb-10">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">

            <button
              onClick={() => setFiltroChatActivo(!filtroChatActivo)}
              className={`px-4 py-3 rounded-xl border shadow-sm font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 w-full md:w-auto justify-center ${filtroChatActivo ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-500 border-slate-200 hover:text-orange-500'}`}
            >
              <MessageSquare className="w-4 h-4" /> {filtroChatActivo ? 'Viendo Activos' : 'Chats Activos'}
            </button>

            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 w-full md:w-72 shadow-sm">
              <Search className="text-slate-400 w-4 h-4 shrink-0" />
              <input type="text" placeholder="Buscar proyecto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" />
            </div>

            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold text-xs outline-none text-slate-600 shadow-sm w-full md:w-auto">
              <option value="Todos">Todos los estatus</option>
              {Object.keys(ESTADOS_SOLARIS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            <button onClick={() => { setProyectoEditando(null); setFormNuevo({ nombre: '', giro: 'Residencial', comentarios: '' }); setFilesAdjuntos([]); setModalNuevo(true); }} className="bg-orange-500 text-white px-8 py-3.5 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-orange-600 transition-all shadow-md uppercase tracking-widest whitespace-nowrap w-full md:w-auto justify-center">
              <Plus className="w-5 h-5" /> Nueva Cotización
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {cargando ? (
            <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs">Cargando...</p>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron proyectos</p>
            </div>
          ) : (
            proyectosFiltrados.map((p) => {
              const tieneChatActivo = chatsActivosDb.includes(p.id) && !chatsLeidos.includes(p.id);

              return (
                <div key={p.id} onClick={() => { setProyectoSeleccionado(p); setModalDetalle(true); }} className="bg-white border border-slate-100 rounded-[25px] p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group hover:border-orange-400 transition-all hover:shadow-xl cursor-pointer relative overflow-hidden">

                  {tieneChatActivo && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black px-3 py-1.5 rounded-bl-xl shadow-sm flex items-center gap-1.5 uppercase tracking-widest z-10 animate-pulse">
                      <MessageSquare size={10} /> Nuevo Mensaje
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <img src="/src/assets/default.jpg" alt="proyecto" className="w-14 h-14 object-cover rounded-2xl shadow-md border-2 border-slate-100" />
                    <div className="flex-1 overflow-hidden sm:hidden">
                      <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate pr-16">{p.nombre_proyecto}</h4>
                      <span className={`text-[8px] font-black mt-2 px-2 py-1 rounded-md uppercase border shadow-sm flex items-center gap-1 w-fit ${getEstiloEstatus(p.estatus).bg} ${getEstiloEstatus(p.estatus).text}`}>
                        {p.estatus.includes('Corrección') ? <AlertCircle size={10} /> : p.estatus.includes('Cotizado') ? <CheckCircle2 size={10} /> : <Clock size={10} />} {p.estatus}
                      </span>
                      <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none"><MapPin size={11} className="text-slate-400" /> Giro: {p.giro_proyecto}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden hidden sm:block">
                    <h4 className="font-black text-slate-950 text-[13px] uppercase italic tracking-tighter leading-none truncate">{p.nombre_proyecto}</h4>
                    <span className={`text-[8px] font-black mt-2 px-2 py-1 rounded-md uppercase border shadow-sm flex items-center gap-1 w-fit ${getEstiloEstatus(p.estatus).bg} ${getEstiloEstatus(p.estatus).text}`}>
                      {p.estatus.includes('Corrección') ? <AlertCircle size={10} /> : p.estatus.includes('Cotizado') ? <CheckCircle2 size={10} /> : <Clock size={10} />} {p.estatus}
                    </span>
                    <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none">
                      <MapPin size={11} className="text-slate-400" /> Giro: {p.giro_proyecto}
                    </p>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end items-center w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-50 gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setProyectoSeleccionado(p); setModalAcciones(true); }} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 md:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-colors shadow-sm">
                      <Settings size={12} /> Acciones
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setProyectoSeleccionado(p); verLogs(p.id); }} className="bg-white border border-slate-200 text-orange-500 hover:bg-orange-50 px-2.5 md:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-colors shadow-sm">
                      <Info size={12} /> Info
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setProyectoSeleccionado(p); setModalDetalle(true); }} className="bg-orange-500 border border-orange-500 text-white hover:bg-orange-600 hover:border-orange-600 px-2.5 md:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all shadow-md">
                      <FileText size={12} /> Detalles
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* ZONA DE MODALES Y COMPONENTES FLOTANTES (FUERA DEL MAIN PARA ROMPER EL Z-10) */}
      {/* ========================================================================= */}

      {/* Modal Acciones Proyecto */}
      <AnimatePresence>
        {modalAcciones && proyectoSeleccionado && (
          <ModalAccionesProyecto
            proyecto={proyectoSeleccionado}
            onClose={() => setModalAcciones(false)}
            onRequestRecotizacion={() => { setModalAcciones(false); handleAbrirRecotizacion(proyectoSeleccionado); }}
            onRequestViabilidad={() => handleAbrirViabilidad(proyectoSeleccionado)}
          />
        )}
      </AnimatePresence>

      <ChatGlobal
        isOpen={chatAbierto}
        onClose={() => setChatAbierto(false)}
        usuarioLogueado={usuarioLogueado}
        chatInicial={chatInicial}
      />

      <AnimatePresence>
        {modalNuevo && (
          <ModalNuevoProyecto onClose={() => { setModalNuevo(false); setProyectoEditando(null); }} onSubmit={handleGuardarProyecto} form={formNuevo} setForm={setFormNuevo} filesAdjuntos={filesAdjuntos} setFilesAdjuntos={setFilesAdjuntos} guardando={guardando} esEdicion={!!proyectoEditando} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalRecotizacion && proyectoEditando && (
          <ModalPuraRecotizacion
            onClose={() => setModalRecotizacion(false)}
            onSubmit={handleGuardarRecotizacion}
            form={formRecotizacion}
            setForm={setFormRecotizacion}
            filesAdjuntos={filesAdjuntos}
            setFilesAdjuntos={setFilesAdjuntos}
            guardando={guardando}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalViabilidad && proyectoSeleccionado && (
          <ModalViabilidad
            proyecto={proyectoSeleccionado}
            onClose={() => setModalViabilidad(false)}
            onSubmit={handleGuardarViabilidad}
            form={formViabilidad}
            setForm={setFormViabilidad}
            guardando={guardando}
            abrirVisorArchivos={abrirVisorArchivos}
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
            onEditar={(accion: string) => handleAbrirEdicion(proyectoSeleccionado, accion)}
            onChat={() => handleAbrirChatProyecto(proyectoSeleccionado)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalLog && proyectoSeleccionado && (
          <ModalLineaTiempo
            logs={logsProyecto}
            proyecto={proyectoSeleccionado}
            onClose={() => setModalLog(false)}
            onAbrirChatFase={(estatusFiltro: string) => handleAbrirChatProyecto(proyectoSeleccionado, estatusFiltro)}
          />
        )}
      </AnimatePresence>

      {/* VISORES MULTIMEDIA */}
      <AnimatePresence>
        {modalListaArchivos && (
          <div className="fixed inset-0 z-[1051] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[80vh]">
              <div className="bg-slate-50 p-5 md:p-6 flex justify-between items-center border-b border-slate-200 shrink-0">
                <h3 className="font-black uppercase tracking-widest text-slate-900 text-xs md:text-sm flex items-center gap-2"><FileText className="text-orange-500 w-4 h-4 md:w-5 md:h-5" /> {modalListaArchivos.titulo}</h3>
                <button onClick={() => setModalListaArchivos(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X size={16} /></button>
              </div>
              <div className="p-5 md:p-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                {modalListaArchivos.urls.map((url, idx) => (
                  <button key={idx} onClick={() => { setDocPreview({ urls: modalListaArchivos.urls, currentIndex: idx, nombre: modalListaArchivos.titulo }); setModalListaArchivos(null); }} className="w-full text-left py-3 md:py-4 px-4 md:px-5 bg-white border border-slate-200 rounded-xl hover:border-orange-400 hover:shadow-md transition-all font-black text-[9px] md:text-[11px] text-slate-700 uppercase tracking-widest flex items-center gap-3">
                    <FileIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-400 shrink-0" /> Opción {idx + 1}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white relative" onClick={e => e.stopPropagation()}>
              <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100 z-10 shrink-0">
                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px] md:text-sm flex items-center gap-2 md:gap-3">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-orange-500 hidden sm:block shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">{docPreview.nombre}</span>
                  {docPreview.urls.length > 1 && <span className="text-orange-500 bg-orange-50 px-1.5 md:px-2 py-1 rounded-md shrink-0">({docPreview.currentIndex + 1}/{docPreview.urls.length})</span>}
                </h3>
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <a href={docPreview.urls[docPreview.currentIndex]} download target="_blank" rel="noreferrer" className="flex items-center bg-orange-500 hover:bg-slate-900 text-white rounded-lg md:rounded-xl shadow-sm px-4 md:px-5 py-2 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest">
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
    </div>
  )
}

// ==========================================
// --- HELPER COMPONENTS (Modales Nuevos) ---
// ==========================================

const ModalAccionesProyecto = ({ proyecto, onClose, onRequestRecotizacion, onRequestViabilidad }: any) => {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-50 rounded-[30px] md:rounded-[40px] w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh]">
        <div className="bg-slate-900 p-5 md:p-6 flex justify-between items-center text-white shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl text-orange-400"><Settings size={20} /></div>
            <div>
              <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter">Acciones</h3>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[200px] md:max-w-full">{proyecto.nombre_proyecto}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 md:p-6 custom-scrollbar bg-slate-50">
          <div className="flex flex-col gap-3">
            <button
              onClick={onRequestRecotizacion}
              disabled={!['Cotizado', 'Cotización', 'Recotizado', 'Evaluación'].includes(proyecto.estatus) && !proyecto.estatus.includes('Correc')}
              className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl flex items-center justify-between group hover:border-orange-400 hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-500 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors"><RefreshCcw className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase">Solicitar Recotización</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Solicita un nuevo cálculo para esta oportunidad.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500" />
            </button>

            <button
              onClick={onRequestViabilidad}
              className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl flex items-center justify-between group hover:border-orange-400 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-500 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors"><Timer className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase">Solicitar Viabilidad</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Inicia el flujo de revisión técnica en sitio.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const ModalNuevoProyecto = ({ onClose, onSubmit, form, setForm, filesAdjuntos, setFilesAdjuntos, guardando, esEdicion }: any) => {
  const removerArchivo = (index: number) => { setFilesAdjuntos((prev: File[]) => prev.filter((_, i) => i !== index)); }
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] border border-white">
        <div className="bg-slate-900 p-6 md:p-8 flex items-center justify-between text-white shrink-0 border-b border-white/10">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">{esEdicion ? <Edit3 className="w-6 h-6 md:w-7 md:h-7 text-orange-400" /> : <Briefcase className="w-6 h-6 md:w-7 md:h-7 text-orange-400" />}</div>
            <div><h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">{esEdicion ? 'Editar Solicitud' : 'Nueva Cotización'}</h2><p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{esEdicion ? 'Corrige la información' : 'Registro Inicial'}</p></div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 md:p-10 overflow-y-auto flex-1 bg-white custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="col-span-1 md:col-span-2"><span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> ID y Nombre del Proyecto</span><input type="text" placeholder="Ej: 379 - Hospital GOLO" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 md:py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required /></div>
            <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> Giro del Proyecto</span><select value={form.giro} onChange={e => setForm({ ...form, giro: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 md:py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required><option value="Residencial">Residencial</option><option value="Comercial">Comercial</option><option value="Industrial">Industrial</option></select></div>
            <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><UploadCloud className="w-4 h-4 text-slate-400" /> Recibo / Adjuntos Nuevos</span><input type="file" multiple accept="image/*,.pdf" onChange={e => setFilesAdjuntos(Array.from(e.target.files || []))} required={!esEdicion && filesAdjuntos.length === 0} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-orange-500 uppercase tracking-widest transition-colors cursor-pointer" />{esEdicion && <span className="text-[9px] mt-2 text-slate-400 italic normal-case">*(Opcional) Sube nuevos archivos solo si te pidieron cambiarlos.</span>}{filesAdjuntos.length > 0 && (<div className="mt-3 flex flex-col gap-2">{filesAdjuntos.map((file: File, idx: number) => (<div key={idx} className="flex justify-between items-center bg-orange-50 px-3 py-2 rounded-lg border border-orange-100 shadow-sm"><div className="flex items-center gap-2 overflow-hidden"><FileIcon size={12} className="text-orange-500 flex-shrink-0" /><span className="text-[10px] font-bold text-orange-800 truncate">{file.name}</span></div><button type="button" onClick={() => removerArchivo(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button></div>))}</div>)}</div>
            <div className="col-span-1 md:col-span-2"><span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> Comentarios de Contexto</span><textarea rows={3} placeholder="Detalles para el área de cotización..." value={form.comentarios} onChange={e => setForm({ ...form, comentarios: e.target.value })} className="w-full bg-slate-50 focus:border-orange-400 border-slate-200 rounded-xl py-3.5 md:py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 shadow-inner resize-none" /></div>
          </div>
          <div className="pt-6 md:pt-8 mt-6 md:mt-10 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 border-t border-slate-200 shrink-0"><button type="button" onClick={onClose} className="w-full md:w-auto text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button><button type="submit" disabled={guardando} className="w-full md:w-auto text-white px-10 py-4 rounded-xl font-black shadow-xl transition-all flex justify-center items-center gap-3 uppercase text-[11px] tracking-widest disabled:opacity-50 bg-orange-500 hover:bg-orange-600">{guardando ? 'GUARDANDO...' : (esEdicion ? 'GUARDAR Y REENVIAR' : 'CREAR PROYECTO')} <Save className="w-4 h-4" /></button></div>
        </form>
      </motion.div>
    </div>
  )
}

const ModalPuraRecotizacion = ({ onClose, onSubmit, form, setForm, filesAdjuntos, setFilesAdjuntos, guardando }: any) => {
  const removerArchivo = (index: number) => { setFilesAdjuntos((prev: File[]) => prev.filter((_, i) => i !== index)); }
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-amber-50 rounded-[30px] md:rounded-[40px] w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col border-4 border-amber-400">
        <div className="bg-amber-400 p-6 md:p-8 flex items-center justify-between text-white shrink-0 border-b border-amber-500">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20"><History className="w-6 h-6 text-white" /></div>
            <div><h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter shadow-sm">Recotización</h2><p className="text-[9px] md:text-[10px] text-amber-100 font-bold uppercase tracking-widest mt-1">Nuevas condiciones requeridas</p></div>
          </div>
          <button onClick={onClose} className="p-3 bg-black/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 md:p-8 flex-1 flex flex-col gap-6 text-[10px] font-black uppercase tracking-widest text-amber-700">

          <div className="flex flex-col"><span className="flex items-center gap-1.5 text-amber-800"><FileText className="w-4 h-4 " /> Detalles / Motivo Exacto de Recotización</span><textarea rows={4} placeholder="Escribe al área de diseño qué necesitan cambiar..." value={form.comentarios} onChange={e => setForm({ ...form, comentarios: e.target.value })} className="w-full bg-white focus:border-amber-500 border-amber-200 rounded-xl py-3.5 md:py-4 px-6 mt-2 text-sm font-bold outline-none text-slate-900 shadow-inner resize-none" required /></div>

          <div className="flex flex-col"><span className="flex items-center gap-1.5 text-amber-800"><UploadCloud className="w-4 h-4" /> ¿Hay archivos nuevos a subir?</span><input type="file" multiple accept="image/*,.pdf" onChange={e => setFilesAdjuntos(Array.from(e.target.files || []))} className="w-full bg-white border border-amber-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-amber-400 shadow-inner file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-amber-500 file:text-white hover:file:bg-amber-600 uppercase tracking-widest transition-colors cursor-pointer" /><span className="text-[9px] mt-2 text-amber-600 italic normal-case">*(Opcional) Sube nuevos recibos o planos si el cliente los entregó. Los originales se mantendrán.</span>{filesAdjuntos.length > 0 && (<div className="mt-3 flex flex-col gap-2">{filesAdjuntos.map((file: File, idx: number) => (<div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-amber-200 shadow-sm"><div className="flex items-center gap-2 overflow-hidden"><FileIcon size={12} className="text-amber-500 flex-shrink-0" /><span className="text-[10px] font-bold text-amber-800 truncate">{file.name}</span></div><button type="button" onClick={() => removerArchivo(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button></div>))}</div>)}</div>

          <div className="pt-6 border-t border-amber-200 shrink-0 flex flex-col-reverse md:flex-row justify-end gap-3"><button type="button" onClick={onClose} className="w-full md:w-auto text-amber-600 font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 hover:bg-amber-100 rounded-xl transition-colors">Cancelar</button><button type="submit" disabled={guardando} className="w-full md:w-auto text-white px-10 py-4 rounded-xl font-black shadow-xl transition-all flex justify-center items-center gap-3 uppercase text-[11px] tracking-widest disabled:opacity-50 bg-amber-500 hover:bg-amber-600">{guardando ? 'ENVIANDO...' : 'ENVIAR RECOTIZACIÓN'} <Save className="w-4 h-4" /></button></div>
        </form>
      </motion.div>
    </div>
  )
}

const ModalDetalleProyecto = ({ proyecto, onClose, onAbrirArchivos, onVerLogs, onEditar, onChat }: any) => {
  const statusInfo = getEstiloEstatus(proyecto.estatus);
  const partesNombre = proyecto.nombre_proyecto.split('-');
  const idNum = partesNombre[0]?.trim() || '';
  const nombreReal = partesNombre[1]?.trim() || proyecto.nombre_proyecto;

  const interacciones = proyecto.interacciones || [];
  const ultimoRechazo = interacciones.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).find((i: any) => i.accion === 'Corrección Solicitada');

  const recibosUrls = proyecto.archivos_adjuntos && proyecto.archivos_adjuntos.length > 0 ? proyecto.archivos_adjuntos : (proyecto.archivo_url ? [proyecto.archivo_url] : []);
  const cotizacionesUrls = proyecto.archivos_cotizacion || [];

  const botonesAccion = [
    { label: 'Recibos/Adjuntos', hasData: recibosUrls.length > 0, action: () => onAbrirArchivos('Archivos del Vendedor', recibosUrls) },
    { label: 'Cotización', hasData: cotizacionesUrls.length > 0, action: () => onAbrirArchivos('Opciones de Cotización', cotizacionesUrls, true) },
    { label: 'Viabilidad', hasData: false, action: () => console.log('Acción Viabilidad') },
    { label: 'Reporte', hasData: false, action: () => console.log('Acción Reporte') },
    { label: 'Cambios Ing.', hasData: false, action: () => console.log('Acción Cambios') },
    { label: 'Instalación', hasData: false, action: () => console.log('Acción Instalación') },
    { label: 'Postventa', hasData: false, action: () => console.log('Acción Postventa') },
    { label: '+ Fachada', hasData: false, action: () => console.log('Subir Fachada') },
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[85vh] overflow-y-auto hide-scroll">

        <div className="flex justify-between items-center pt-6 pb-4 px-6 md:px-8 border-b border-slate-100 shrink-0 bg-slate-50">
          <div className="flex items-center gap-3"><div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileText size={20} /></div><p className="font-black text-[12px] md:text-[14px] uppercase italic text-slate-950 leading-none tracking-tighter truncate">Proyecto: {idNum}</p></div>
          <div className="flex items-center gap-2"><button onClick={onChat} className="p-2 bg-white shadow-sm border border-slate-100 text-orange-500 hover:text-white hover:bg-orange-500 rounded-full transition-colors"><MessageCircle size={16} /></button><button onClick={() => onVerLogs(proyecto.id)} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-orange-500 rounded-full transition-colors"><History size={16} /></button><button onClick={onClose} className="p-2 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors leading-none"><X size={16} /></button></div>
        </div>

        <div className="p-6 md:p-8 bg-white flex flex-col gap-6 hide-scroll">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div className="flex-1 w-full overflow-hidden"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nombre del Proyecto</p><h2 className="font-black text-xl md:text-2xl text-slate-950 uppercase italic tracking-tighter leading-tight truncate">{nombreReal}</h2></div><span className={`text-[10px] md:text-[11px] font-black px-4 py-2 rounded-xl uppercase border shadow-sm flex-shrink-0 leading-none ${statusInfo.bg} ${statusInfo.text}`}>{statusInfo.label}</span></div>
          {proyecto.estatus === 'Cotización – Corrección' && ultimoRechazo && (<div className="bg-red-50 border border-red-200 p-4 md:p-5 rounded-[20px] shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"><div className="flex-1"><p className="text-red-600 font-black text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle size={14} /> Motivo de Corrección</p><p className="text-xs md:text-sm text-red-800 font-medium italic">"{ultimoRechazo.mensaje}"</p></div><button onClick={onEditar} className="w-full md:w-auto bg-red-500 text-white hover:bg-red-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"><Edit3 size={14} /> Editar Solicitud</button></div>)}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-slate-50 rounded-[20px] p-4 md:p-5 border border-slate-100 shadow-inner">
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><MapPin size={10} /> Giro</p> <p className="text-xs md:text-sm font-bold text-slate-800 uppercase">{proyecto.giro_proyecto || '-'}</p> </div>
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><CalendarIcon size={10} /> Enviado El</p> <p className="text-[10px] md:text-xs font-bold text-slate-800 uppercase"> {new Date(proyecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} </p> </div>
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Clock size={10} /> Hora</p> <p className="text-[10px] md:text-xs font-bold text-slate-800 uppercase"> {new Date(proyecto.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} </p> </div>
            <div className="col-span-1"> <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1"><Timer size={10} /> T. Espera</p> <p className="text-xs md:text-sm font-black uppercase text-slate-800"> {calcularHorasHabiles(proyecto.created_at).text} hrs </p> </div>
          </div>
          <div className="bg-slate-50 p-4 md:p-5 rounded-[20px] border border-slate-200 shadow-inner flex flex-col gap-3"><p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">📝 Comentarios de Contexto</p><p className="text-xs md:text-sm text-slate-800 font-medium italic border-l-2 border-orange-300 pl-3 py-1">{proyecto.comentarios_iniciales ? `"${proyecto.comentarios_iniciales}"` : 'Sin comentarios adicionales.'}</p></div>
          <div className="grid grid-cols-3 gap-2 px-1 pb-3 border-t border-slate-100 pt-5 mt-2">
            {botonesAccion.map((btn) => (
              <button key={btn.label} onClick={btn.action} disabled={!btn.hasData} className={`py-3 px-1.5 rounded-2xl border-2 font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-all shadow-sm tracking-tighter h-12 flex items-center justify-center text-center leading-tight ${btn.hasData ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 opacity-90'}`}>{btn.label}</button>
            ))}
          </div>

        </div>
      </motion.div>
    </div>
  );
};

const ModalLogProyecto = null; // Removed to use ModalLineaTiempo instead

const ModalViabilidad = ({ proyecto, onClose, onSubmit, form, setForm, guardando, abrirVisorArchivos }: any) => {
  const [tab, setTab] = useState('solicitar')
  const [fileFachada, setFileFachada] = useState<File | null>(null)
  const [filesReciboNuevos, setFilesReciboNuevos] = useState<File[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fotosActualizadas = [];
    if (fileFachada) fotosActualizadas.push({ file: fileFachada, tipo: 'fachada' });
    for (const f of filesReciboNuevos) fotosActualizadas.push({ file: f, tipo: 'recibo' });
    onSubmit(e, fotosActualizadas);
  }

  const existingRecibos = proyecto.archivos_adjuntos || [];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-50 rounded-[30px] md:rounded-[40px] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-white">

        <div className="bg-slate-900 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-white shrink-0 border-b border-white/10 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
              <Timer className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter">Proceso de Viabilidad</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Proyecto: {proyecto.nombre_proyecto}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute md:static top-6 right-6 p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex bg-white px-6 md:px-10 pt-4 border-b border-slate-200">
          <button
            onClick={() => setTab('realizar')}
            className={`flex-1 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${tab === 'realizar' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Realizar Viabilidad
          </button>
          <button
            onClick={() => setTab('solicitar')}
            className={`flex-1 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${tab === 'solicitar' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Solicitar Viabilidad
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-white">
          {tab === 'realizar' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
              <Timer size={48} className="text-orange-200 mb-4" />
              <h3 className="text-orange-800 font-black uppercase text-sm tracking-widest">Opción en Desarrollo</h3>
              <p className="text-slate-400 text-xs mt-2 uppercase font-bold max-w-sm">Próximamente podrás realizar la viabilidad directamente desde aquí.</p>
            </div>
          ) : (
            <form id="form-viabilidad" onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">

                <div className="md:col-span-2 flex flex-col">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-orange-500" /> Link Maps</span>
                  <input type="url" placeholder="https://maps.app.goo.gl/..." value={form.link_maps} onChange={e => setForm({ ...form, link_maps: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>

                <div className="flex flex-col">
                  <span>Calle y Número</span>
                  <input type="text" value={form.calle} onChange={e => setForm({ ...form, calle: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>

                <div className="flex flex-col">
                  <span>Colonia</span>
                  <input type="text" value={form.colonia} onChange={e => setForm({ ...form, colonia: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>

                <div className="flex flex-col">
                  <span>Ciudad</span>
                  <input type="text" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span>Estado</span>
                    <input type="text" value={form.estado_dir} onChange={e => setForm({ ...form, estado_dir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                  </div>
                  <div className="flex flex-col">
                    <span>Código Postal</span>
                    <input type="text" value={form.codigo_postal} onChange={e => setForm({ ...form, codigo_postal: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                  </div>
                </div>

                <div className="flex flex-col">
                  <span>Nombre del Cliente</span>
                  <input type="text" value={form.nombre_cliente} onChange={e => setForm({ ...form, nombre_cliente: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>

                <div className="flex flex-col">
                  <span>Número del Cliente</span>
                  <input type="tel" value={form.numero_cliente} onChange={e => setForm({ ...form, numero_cliente: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required />
                </div>

                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-orange-500" /> Imagen de Fachada</span>
                  <input type="file" accept="image/*" onChange={e => setFileFachada(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 mt-2 text-[10px] font-bold outline-none focus:border-orange-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 transition-colors" />
                  {proyecto.fachada_url && !fileFachada && <p className="text-[9px] text-orange-600 mt-1 lowercase italic">*Ya existe imagen de fachada guardada.</p>}
                </div>

                <div className="flex flex-col">
                  <span>¿Requiere Escalera para revisión?</span>
                  <select value={form.requiere_escalera ? "true" : "false"} onChange={e => setForm({ ...form, requiere_escalera: e.target.value === "true" })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner">
                    <option value="false">NO - Acceso libre</option>
                    <option value="true">SÍ - Requiere Escalera</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex flex-col">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-orange-500" /> Comentarios para Ingeniería</span>
                  <textarea rows={3} value={form.comentarios_solicitud} onChange={e => setForm({ ...form, comentarios_solicitud: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-2 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner resize-none" placeholder="Accesos, consideraciones sobre la estructura, horarios preferidos..." />
                </div>

                <div className="md:col-span-2 bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-orange-700"><FileIcon className="w-4 h-4" /> Recibos CFE Actuales</span>
                    {existingRecibos.length > 0 && (
                      <button type="button" onClick={() => abrirVisorArchivos('Recibos CFE del Proyecto', existingRecibos, true)} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] hover:bg-orange-600 transition-all shadow-sm">VER RECIBOS ({existingRecibos.length})</button>
                    )}
                  </div>
                  {existingRecibos.length === 0 && <p className="text-[9px] lowercase italic text-orange-600">No hay recibos adjuntos en el proyecto.</p>}

                  <div className="border-t border-orange-200 pt-3 mt-1">
                    <span className="flex items-center gap-1.5 text-orange-700 text-[9px]">¿Añadir Recibos Adicionales? (Opcional)</span>
                    <input type="file" multiple accept=".pdf,image/*" onChange={e => setFilesReciboNuevos(Array.from(e.target.files || []))} className="w-full bg-white border border-orange-200 rounded-xl py-2 px-3 mt-2 text-[10px] font-bold outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 transition-colors" />
                  </div>
                </div>

              </div>
            </form>
          )}
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col-reverse md:flex-row justify-end gap-3">
          <button type="button" onClick={onClose} className="w-full md:w-auto text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] px-8 py-3.5 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200 shadow-sm">
            Cancelar
          </button>
          {tab === 'solicitar' && (
            <button form="form-viabilidad" type="submit" disabled={guardando} className="w-full md:w-auto text-white px-10 py-3.5 rounded-xl font-black shadow-xl shadow-orange-500/20 transition-all flex justify-center items-center gap-3 uppercase text-[10px] md:text-[11px] tracking-widest disabled:opacity-50 bg-orange-500 hover:bg-orange-600">
              {guardando ? 'ENVIANDO...' : 'SOLICITAR VIABILIDAD'} <Save className="w-4 h-4" />
            </button>
          )}
        </div>

      </motion.div>
    </div>
  )
}