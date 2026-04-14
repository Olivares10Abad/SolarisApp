import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, ArrowLeft, FileText, Users, Search, ChevronRight, 
  MessageSquare, Send, Paperclip, File as FileIcon, ChevronLeft, Heart,
  Reply, BellOff, Bell, Megaphone, Mic, Square, Edit2, Trash2, Forward, CheckCheck
} from 'lucide-react'

const VisorArchivos = ({ docPreview, setDocPreview, zoom, setZoom }: any) => (
  <div className="fixed inset-0 z-[10005] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={() => setDocPreview(null)}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white relative" onClick={e => e.stopPropagation()}>
          <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100 z-10 shrink-0">
              <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px] md:text-sm flex items-center gap-2 md:gap-3">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-orange-500 hidden sm:block shrink-0"/> 
                <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">{docPreview.nombre}</span>
                {docPreview.urls.length > 1 && <span className="text-orange-500 bg-orange-50 px-1.5 md:px-2 py-1 rounded-md shrink-0">({docPreview.currentIndex + 1}/{docPreview.urls.length})</span>}
              </h3>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <div className="flex items-center bg-slate-100 rounded-lg md:rounded-xl overflow-hidden shadow-inner">
                      <button onClick={() => setZoom((z:number) => Math.max(0.5, z - 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">-</button>
                      <span className="text-[9px] md:text-[10px] font-black text-slate-600 px-1 w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom((z:number) => Math.min(3, z + 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">+</button>
                  </div>
                  <button onClick={() => setDocPreview(null)} className="p-1.5 md:p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5"/></button>
              </div>
          </div>
          <div className="flex-1 bg-slate-800 relative flex items-center justify-center overflow-auto custom-scrollbar p-2 md:p-4">
              {docPreview.urls.length > 1 && (
                  <>
                      <button onClick={() => { setDocPreview((prev:any) => prev ? {...prev, currentIndex: Math.max(0, prev.currentIndex - 1)} : null); setZoom(1); }} disabled={docPreview.currentIndex === 0} className="fixed left-2 sm:left-4 md:absolute md:left-6 top-1/2 -translate-y-1/2 z-[10010] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6"/></button>
                      <button onClick={() => { setDocPreview((prev:any) => prev ? {...prev, currentIndex: Math.min(prev.urls.length - 1, prev.currentIndex + 1)} : null); setZoom(1); }} disabled={docPreview.currentIndex === docPreview.urls.length - 1} className="fixed right-2 sm:right-4 md:absolute md:right-6 top-1/2 -translate-y-1/2 z-[10010] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronRight className="w-5 h-5 md:w-6 md:h-6"/></button>
                  </>
              )}
              <div className="transition-transform duration-300 origin-center flex items-center justify-center w-full h-full" style={{ transform: `scale(${zoom})` }}>
                  {docPreview.urls[docPreview.currentIndex].toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                      <img src={docPreview.urls[docPreview.currentIndex]} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Visor" />
                  ) : ( <iframe src={docPreview.urls[docPreview.currentIndex]} className="w-full h-full border-none bg-white rounded-xl shadow-2xl min-h-[60vh] md:min-h-full" title={docPreview.nombre} /> )}
              </div>
          </div>
      </motion.div>
  </div>
);

export interface ChatGlobalProps {
    isOpen: boolean;
    onClose: () => void;
    usuarioLogueado: any;
    chatInicial?: {tipo: 'proyecto'|'dm'|'grupo', id: string, nombre: string, estatusProyecto?: string, estatusFiltro?: string, vendedor_id?: string} | null;
}

export default function ChatGlobal({ isOpen, onClose, usuarioLogueado, chatInicial }: ChatGlobalProps) {
  const [chatActivo, setChatActivo] = useState<ChatGlobalProps['chatInicial']>(null);
  const chatActivoRef = useRef(chatActivo);
  
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [usuariosDb, setUsuariosDb] = useState<any[]>([]);
  const [gruposDb, setGruposDb] = useState<any[]>([]);
  const [mensajesGlobales, setMensajesGlobales] = useState<any[]>([]);
  const [proyectosSilenciados, setProyectosSilenciados] = useState<string[]>([]);
  
  const [usuariosOnline, setUsuariosOnline] = useState<string[]>([]);
  const [usuariosDeVacaciones, setUsuariosDeVacaciones] = useState<string[]>([]);

  const [mensajesChat, setMensajesChat] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [archivoChat, setArchivoChat] = useState<File | null>(null);
  const [previewArchivoChat, setPreviewArchivoChat] = useState<string | null>(null);
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  
  const [mensajeCitado, setMensajeCitado] = useState<any>(null); 
  const [mensajeEditando, setMensajeEditando] = useState<any>(null); 
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null); 
  
  const [modalReenviar, setModalReenviar] = useState<any>(null);
  const [busquedaReenviar, setBusquedaReenviar] = useState('');
  
  const [grabando, setGrabando] = useState(false);
  const [tiempoAudio, setTiempoAudio] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervaloAudioRef = useRef<any>(null);

  const [chatTab, setChatTab] = useState<'personas'|'proyectos'|'grupos'>('personas'); 
  const [busquedaProyectos, setBusquedaProyectos] = useState('');
  const [busquedaPersonas, setBusquedaPersonas] = useState('');
  const [busquedaDirectorio, setBusquedaDirectorio] = useState('');

  const [buscandoPersonaDM, setBuscandoPersonaDM] = useState(false);
  const [modoDifusion, setModoDifusion] = useState(false);
  const [seleccionadosDifusion, setSeleccionadosDifusion] = useState<string[]>([]);

  const [modalCrearGrupo, setModalCrearGrupo] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [nuevoGrupoMiembros, setNuevoGrupoMiembros] = useState<string[]>([]);
  
  const [mostrarMenciones, setMostrarMenciones] = useState(false);
  const [busquedaMencion, setBusquedaMencion] = useState('');
  const [posicionCursor, setPosicionCursor] = useState(0);
  const [idsMencionados, setIdsMencionados] = useState<string[]>([]);

  const [docPreview, setDocPreview] = useState<{ urls: string[], currentIndex: number, nombre: string } | null>(null);
  const [zoom, setZoom] = useState(1);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputChatRef = useRef<HTMLInputElement>(null);

  useEffect(() => { chatActivoRef.current = chatActivo; }, [chatActivo]);

  useEffect(() => {
      if (isOpen && chatInicial) { setChatActivo(chatInicial); } 
      else if (isOpen && !chatActivo) { setChatActivo(null); setChatTab('personas'); setModoDifusion(false); }
  }, [isOpen, chatInicial]);

  // --- 1. CARGA INICIAL Y PRESENCE ---
  useEffect(() => {
    if (!isOpen || !usuarioLogueado) return;
    
    supabase.from('perfiles').update({ ultima_conexion: new Date().toISOString() }).eq('id', usuarioLogueado.id).then();

    const room = supabase.channel('chat_presence', { config: { presence: { key: usuarioLogueado.id } } });
    room.on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        setUsuariosOnline(Object.keys(state));
    }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await room.track({ online_at: new Date().toISOString() });
    });

    const fetchInicial = async () => {
        const resSilenciados = await supabase.from('chat_silenciados').select('proyecto_id').eq('usuario_id', usuarioLogueado.id);
        if (resSilenciados.data) setProyectosSilenciados(resSilenciados.data.map(s => s.proyecto_id));

        const resMensajes = await supabase.from('mensajes_chat').select('*').or(`remitente_id.eq.${usuarioLogueado.id},destinatario_id.eq.${usuarioLogueado.id}`).order('created_at', { ascending: false });
        const mensajesData = resMensajes.data || [];
        setMensajesGlobales(mensajesData);

        const proyectosParticipados = Array.from(new Set(mensajesData.filter(m => m.proyecto_id).map(m => m.proyecto_id)));
        let queryProyectos = supabase.from('proyectos').select(`id, nombre_proyecto, giro_proyecto, estatus, created_at, vendedor_id`).order('created_at', { ascending: false });
        if (!usuarioLogueado?.proyectos) {
            if (proyectosParticipados.length > 0) queryProyectos = queryProyectos.or(`vendedor_id.eq.${usuarioLogueado.id},id.in.(${proyectosParticipados.join(',')})`);
            else queryProyectos = queryProyectos.eq('vendedor_id', usuarioLogueado?.id);
        }

        const resGrupos = await supabase.from('chat_grupo_miembros').select('grupo_id, chat_grupos(id, nombre)').eq('usuario_id', usuarioLogueado.id);

        const today = new Date().toISOString().split('T')[0];
        const resVacaciones = await supabase.from('solicitudes_ausencia').select('user_id').eq('estado', 'Aprobada').lte('fecha_inicio', today).gte('fecha_fin', today);
        if (resVacaciones.data) setUsuariosDeVacaciones(resVacaciones.data.map(v => v.user_id));

        const [resProyectos, resUsuarios] = await Promise.all([
            queryProyectos,
            supabase.from('perfiles').select(`id, nombre, apellidos, avatar_url, rol_sistema, ultima_conexion`).order('nombre', { ascending: true })
        ]);
        
        if (resProyectos.data) setProyectos(resProyectos.data);
        if (resUsuarios.data) setUsuariosDb(resUsuarios.data);
        if (resGrupos.data) {
            const parsedGrupos = resGrupos.data.map((g:any) => g.chat_grupos).filter(Boolean);
            setGruposDb(parsedGrupos);
        }
    };
    
    fetchInicial();
    return () => { supabase.removeChannel(room); };
  }, [isOpen, usuarioLogueado]);

  // --- 2. WEBSOCKET MAESTRO (SOLO SE MONTA UNA VEZ) ---
  useEffect(() => {
    if (!isOpen || !usuarioLogueado) return;

    const globalChannel = supabase.channel('global_chat_listener')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_chat' }, async (payload) => {
          const msg = payload.new;
          
          setMensajesGlobales(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [msg, ...prev];
          });

          const cActivo = chatActivoRef.current;
          if (cActivo) {
              const esProyecto = cActivo.tipo === 'proyecto' && msg.proyecto_id === cActivo.id;
              const esGrupo = cActivo.tipo === 'grupo' && msg.grupo_id === cActivo.id;
              const esDM = cActivo.tipo === 'dm' && !msg.proyecto_id && !msg.grupo_id && 
                          ((msg.remitente_id === usuarioLogueado.id && msg.destinatario_id === cActivo.id) || 
                           (msg.remitente_id === cActivo.id && msg.destinatario_id === usuarioLogueado.id));

              if (esProyecto || esDM || esGrupo) {
                  // Marcar como visto automáticamente si tengo el chat abierto
                  if (msg.remitente_id !== usuarioLogueado.id) {
                      const nuevosVistos = [...(msg.visto_por || []), usuarioLogueado.id];
                      await supabase.from('mensajes_chat').update({ visto_por: nuevosVistos }).eq('id', msg.id);
                      msg.visto_por = nuevosVistos;
                  }

                  const { data: perfil } = await supabase.from('perfiles').select('id, nombre, apellidos, avatar_url').eq('id', msg.remitente_id).single();
                  msg.remitente = perfil;

                  // Resolución local del mensaje citado (Evita error PGRST200)
                  if (msg.mensaje_citado_id) {
                      const { data: citado } = await supabase.from('mensajes_chat').select('mensaje, remitente_id, archivo_nombre').eq('id', msg.mensaje_citado_id).single();
                      msg.citado = citado;
                  }

                  setMensajesChat(prev => {
                      if (prev.find(m => m.id === msg.id)) return prev; // Evita duplicados por UI Optimista
                      return [...prev, msg]; 
                  });
                  setTimeout(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, 100);
              }
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes_chat' }, (payload) => {
          const msg = payload.new;
          setMensajesGlobales(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
          setMensajesChat(prev => prev.map(m => m.id === msg.id ? { ...m, reacciones: msg.reacciones, is_edited: msg.is_edited, mensaje: msg.mensaje, visto_por: msg.visto_por } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensajes_chat' }, (payload) => {
          setMensajesGlobales(prev => prev.filter(m => m.id !== payload.old.id));
          setMensajesChat(prev => prev.filter(m => m.id !== payload.old.id));
      }).subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, [isOpen, usuarioLogueado]);

  // --- 3. CARGA DE MENSAJES DEL CHAT ACTIVO ---
  useEffect(() => {
    if (!isOpen || !chatActivo) return;

    const borrador = localStorage.getItem(`draft_${chatActivo.id}`);
    if (borrador) setNuevoMensaje(borrador);
    else setNuevoMensaje('');
    
    setMensajeEditando(null); setMensajeCitado(null);

    const cargarMensajes = async () => {
        let query = supabase.from('mensajes_chat')
            .select(`*, remitente:perfiles!mensajes_chat_remitente_id_fkey(id, nombre, apellidos, avatar_url)`)
            .order('created_at', { ascending: true });
        
        if (chatActivo.tipo === 'proyecto') {
            query = query.eq('proyecto_id', chatActivo.id);
            if (chatActivo.estatusFiltro) query = query.eq('estatus_proyecto', chatActivo.estatusFiltro);
        } else if (chatActivo.tipo === 'grupo') {
            query = query.eq('grupo_id', chatActivo.id);
        } else {
            query = query.is('proyecto_id', null).is('grupo_id', null).or(`and(remitente_id.eq.${usuarioLogueado.id},destinatario_id.eq.${chatActivo.id}),and(remitente_id.eq.${chatActivo.id},destinatario_id.eq.${usuarioLogueado.id})`);
        }
        
        const { data } = await query;
        
        if (data) {
            // Resolver citas manualmente para evadir caché estricta de PostgREST
            const dataConCitas = data.map(m => {
                if (m.mensaje_citado_id) {
                    const msgOriginal = data.find(x => x.id === m.mensaje_citado_id);
                    if (msgOriginal) m.citado = { mensaje: msgOriginal.mensaje, remitente_id: msgOriginal.remitente_id, archivo_nombre: msgOriginal.archivo_nombre };
                }
                return m;
            });

            setMensajesChat(dataConCitas);

            const noLeidos = dataConCitas.filter(m => m.remitente_id !== usuarioLogueado.id && !(m.visto_por || []).includes(usuarioLogueado.id));
            if (noLeidos.length > 0) {
                noLeidos.forEach(async (msg) => {
                    const nuevosVistos = [...(msg.visto_por || []), usuarioLogueado.id];
                    await supabase.from('mensajes_chat').update({ visto_por: nuevosVistos }).eq('id', msg.id);
                });
            }
        }
        setTimeout(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, 100);
    };

    cargarMensajes();
  }, [chatActivo, isOpen]);

  // --- 4. FUNCIONES DE CHAT ---
  const handleSeleccionarArchivoChat = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setArchivoChat(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader(); reader.onloadend = () => { setPreviewArchivoChat(reader.result as string); }; reader.readAsDataURL(file);
        } else { setPreviewArchivoChat('pdf_icon'); }
      }
  }

  const toggleSilenciar = async () => {
      if (!chatActivo || chatActivo.tipo !== 'proyecto') return;
      const isSilenciado = proyectosSilenciados.includes(chatActivo.id);
      if (isSilenciado) {
          await supabase.from('chat_silenciados').delete().match({ usuario_id: usuarioLogueado.id, proyecto_id: chatActivo.id });
          setProyectosSilenciados(prev => prev.filter(id => id !== chatActivo.id));
      } else {
          await supabase.from('chat_silenciados').insert([{ usuario_id: usuarioLogueado.id, proyecto_id: chatActivo.id }]);
          setProyectosSilenciados(prev => [...prev, chatActivo.id]);
      }
  }

  const handleCrearGrupo = async () => {
      if (!nuevoGrupoNombre.trim() || nuevoGrupoMiembros.length === 0) return alert("Ingresa un nombre y selecciona miembros.");
      const { data: g, error } = await supabase.from('chat_grupos').insert([{ nombre: nuevoGrupoNombre, creado_por: usuarioLogueado.id }]).select().single();
      if (error || !g) return alert("Error al crear grupo.");
      const miembrosIds = [...new Set([...nuevoGrupoMiembros, usuarioLogueado.id])];
      const payloads = miembrosIds.map(id => ({ grupo_id: g.id, usuario_id: id }));
      await supabase.from('chat_grupo_miembros').insert(payloads);
      
      setGruposDb(prev => [...prev, { id: g.id, nombre: g.nombre }]);
      setModalCrearGrupo(false); setNuevoGrupoNombre(''); setNuevoGrupoMiembros([]); setBusquedaDirectorio('');
      setChatActivo({tipo: 'grupo', id: g.id, nombre: g.nombre});
  }

  const handleMensajeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value; setNuevoMensaje(texto);
    if (chatActivo && !mensajeEditando && !modoDifusion) localStorage.setItem(`draft_${chatActivo.id}`, texto);
    
    // Anulamos las menciones en DMs y Difusión
    if (chatActivo?.tipo === 'dm' || modoDifusion) {
        setMostrarMenciones(false);
        return;
    }

    const cursor = e.target.selectionStart;
    const match = texto.substring(0, cursor).match(/@([a-zA-Z0-9_]*)$/);
    if (match) { setBusquedaMencion(match[1]); setPosicionCursor(cursor || 0); setMostrarMenciones(true); } 
    else { setMostrarMenciones(false); }
  }

  const insertarMencion = (u: any) => {
    const textoAntes = nuevoMensaje.substring(0, posicionCursor).replace(/@[a-zA-Z0-9_]*$/, '');
    const textoDespues = nuevoMensaje.substring(posicionCursor);
    const textFinal = `${textoAntes}@${u.nombre}${u.apellidos?.charAt(0)} ${textoDespues}`;
    setNuevoMensaje(textFinal);
    if(chatActivo && !modoDifusion) localStorage.setItem(`draft_${chatActivo.id}`, textFinal);
    setMostrarMenciones(false);
    if (!idsMencionados.includes(u.id)) setIdsMencionados([...idsMencionados, u.id]);
  }

  const toggleReaccion = async (msgId: string, emoji: string, currentReacciones: any = {}) => {
      const myId = usuarioLogueado.id;
      const reaccs = { ...currentReacciones };
      if (!reaccs[emoji]) reaccs[emoji] = [];
      if (reaccs[emoji].includes(myId)) {
          reaccs[emoji] = reaccs[emoji].filter((id:string) => id !== myId);
          if (reaccs[emoji].length === 0) delete reaccs[emoji];
      } else { reaccs[emoji].push(myId); }

      setMensajesChat(prev => prev.map(m => m.id === msgId ? { ...m, reacciones: reaccs } : m));
      await supabase.from('mensajes_chat').update({ reacciones: reaccs }).eq('id', msgId);
      setHoverMsgId(null);
  }

  const eliminarMensaje = async (msgId: string) => {
      if(!confirm("¿Eliminar este mensaje para todos?")) return;
      await supabase.from('mensajes_chat').delete().eq('id', msgId);
      setHoverMsgId(null);
  }

  const iniciarGrabacion = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
          mediaRecorder.start();
          setGrabando(true); setTiempoAudio(0);
          intervaloAudioRef.current = setInterval(() => setTiempoAudio(prev => prev + 1), 1000);
      } catch (err) { alert("No se pudo acceder al micrófono."); }
  }

  const detenerGrabacion = () => {
      if (mediaRecorderRef.current && grabando) {
          mediaRecorderRef.current.stop();
          setGrabando(false);
          clearInterval(intervaloAudioRef.current);
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          
          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const file = new File([audioBlob], "audio_nota.webm", { type: 'audio/webm' });
              setArchivoChat(file);
              setPreviewArchivoChat('audio_icon');
          };
      }
  }

  const enviarMensaje = async (e: React.FormEvent | null, fwdPayload?: any) => {
    if(e) e.preventDefault();
    if (!fwdPayload && (!nuevoMensaje.trim() && !archivoChat) || enviandoMensaje) return;
    if (!fwdPayload && !chatActivo && modoDifusion && seleccionadosDifusion.length === 0) return alert("Selecciona a una persona.");
    
    setEnviandoMensaje(true);
    let archivoUrl = null; let archivoTipo = null; let archivoNombre = null;

    try {
        if (mensajeEditando && !fwdPayload) {
            await supabase.from('mensajes_chat').update({ mensaje: nuevoMensaje.trim(), is_edited: true }).eq('id', mensajeEditando.id);
            setMensajeEditando(null); setNuevoMensaje(''); localStorage.removeItem(`draft_${chatActivo!.id}`);
            setEnviandoMensaje(false); return;
        }

        if (archivoChat && !fwdPayload) {
            const fileExt = archivoChat.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
            await supabase.storage.from('chat_media').upload(fileName, archivoChat);
            archivoUrl = supabase.storage.from('chat_media').getPublicUrl(fileName).data.publicUrl;
            archivoTipo = archivoChat.type; archivoNombre = archivoChat.name;
        }

        const basePayload: any = fwdPayload ? { ...fwdPayload, remitente_id: usuarioLogueado.id, reacciones: {}, visto_por: [] } : { 
            remitente_id: usuarioLogueado.id, mensaje: nuevoMensaje.trim(),
            archivo_url: archivoUrl, archivo_tipo: archivoTipo, archivo_nombre: archivoNombre,
            mensaje_citado_id: mensajeCitado?.id || null,
            reacciones: {}, visto_por: []
        };

        const textoTemp = basePayload.mensaje || ''; 
        if(!fwdPayload) { setNuevoMensaje(''); setArchivoChat(null); setPreviewArchivoChat(null); setMostrarMenciones(false); setMensajeCitado(null); if(chatActivo) localStorage.removeItem(`draft_${chatActivo.id}`); }

        // DIFUSIÓN MASIVA
        if (modoDifusion && !fwdPayload) {
            const promesas = seleccionadosDifusion.map(dest_id => supabase.from('mensajes_chat').insert([{ ...basePayload, destinatario_id: dest_id }]));
            await Promise.all(promesas);
            
            const notifArray = seleccionadosDifusion.map(tid => ({
                usuario_id: tid, autor_id: usuarioLogueado.id,
                mensaje: `te ha enviado un mensaje de difusión.`
            }));
            await supabase.from('notificaciones').insert(notifArray);
            
            setModoDifusion(false); setSeleccionadosDifusion([]); setBusquedaDirectorio('');
            setEnviandoMensaje(false); return;
        }

        const targetChat = fwdPayload ? modalReenviar : chatActivo;
        if (targetChat!.tipo === 'proyecto') { basePayload.proyecto_id = targetChat!.id; basePayload.estatus_proyecto = targetChat!.estatusProyecto || 'Cotización'; }
        else if (targetChat!.tipo === 'grupo') { basePayload.grupo_id = targetChat!.id; }
        else { basePayload.destinatario_id = targetChat!.id; }

        if (!fwdPayload || modalReenviar?.id === chatActivo?.id) {
            const fakeId = `temp-${Date.now()}`;
            const msgOptimista = {
                id: fakeId, ...basePayload, created_at: new Date().toISOString(),
                remitente: { nombre: usuarioLogueado.nombre, apellidos: usuarioLogueado.apellidos, avatar_url: usuarioLogueado.avatar_url },
                citado: mensajeCitado ? { mensaje: mensajeCitado.mensaje, archivo_nombre: mensajeCitado.archivo_nombre, remitente_id: mensajeCitado.remitente_id } : null
            };
            setMensajesChat(prev => [...prev, msgOptimista]);
            setTimeout(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, 50);
        }

        const { data } = await supabase.from('mensajes_chat').insert([basePayload]).select().single();
        if (data && (!fwdPayload || modalReenviar?.id === chatActivo?.id)) {
            setMensajesChat(prev => prev.map(m => m.id.toString().startsWith('temp-') ? { ...m, id: data.id } : m));
        }

        let targets = [...idsMencionados];
        if (textoTemp.toLowerCase().includes('@todos')) targets = usuariosDb.map(u => u.id);
        if (targetChat!.tipo === 'dm') targets.push(targetChat!.id);
        if (targetChat!.tipo === 'grupo') {
            const { data: m } = await supabase.from('chat_grupo_miembros').select('usuario_id').eq('grupo_id', targetChat!.id);
            if (m) targets.push(...m.map(x => x.usuario_id));
        }
        if (targetChat!.tipo === 'proyecto' && targetChat!.vendedor_id) {
            targets.push(targetChat!.vendedor_id);
        }

        targets = [...new Set(targets)]; 
        if (targets.length > 0) {
            let tipoNotif = `te envió un mensaje directo.`;
            if (targetChat!.tipo === 'proyecto') tipoNotif = targets.includes(idsMencionados[0]) ? `te mencionó en el proyecto ${targetChat!.nombre}.` : `envió un mensaje en el proyecto ${targetChat!.nombre}.`;
            if (targetChat!.tipo === 'grupo') tipoNotif = `escribió en el grupo ${targetChat!.nombre}.`;

            const notifArray = targets.filter(tid => tid !== usuarioLogueado.id && (!proyectosSilenciados.includes(targetChat!.id) || idsMencionados.includes(tid))) 
                .map(tid => ({ usuario_id: tid, autor_id: usuarioLogueado.id, mensaje: tipoNotif }));

            if(notifArray.length > 0) await supabase.from('notificaciones').insert(notifArray);
        }
        setIdsMencionados([]);
        if(fwdPayload) { setModalReenviar(null); setBusquedaReenviar(''); alert("Mensaje reenviado."); }
    } catch (err: any) { alert(err.message); } finally { setEnviandoMensaje(false); }
  };

  const formatTiempo = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  
  const getUltimoMensajeStr = (targetId: string, tipo: string) => {
      const msgs = mensajesGlobales.filter(m => tipo==='dm' ? ((m.remitente_id===targetId && m.destinatario_id===usuarioLogueado.id) || (m.remitente_id===usuarioLogueado.id && m.destinatario_id===targetId)) : m[`${tipo}_id`] === targetId);
      if (msgs.length === 0) return null;
      const m = msgs[0]; 
      const unread = msgs.filter(x => x.remitente_id !== usuarioLogueado.id && !(x.visto_por || []).includes(usuarioLogueado.id)).length;
      return { 
          texto: m.archivo_nombre ? (m.archivo_tipo?.includes('audio') ? '🎤 Audio' : '📎 Archivo') : m.mensaje, 
          hora: new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          unread
      };
  };

  const getStatusPersona = (uId: string) => {
      if (usuariosDeVacaciones.includes(uId)) return <span className="text-[8px] text-amber-500 font-black">🌴 De Vacaciones</span>;
      if (usuariosOnline.includes(uId)) return <span className="text-[8px] text-emerald-500 font-black">En línea</span>;
      const u = usuariosDb.find(x=>x.id === uId);
      if (u?.ultima_conexion) return <span className="text-[8px] text-slate-400">Últ. vez {new Date(u.ultima_conexion).toLocaleDateString([], {day:'2-digit', month:'2-digit'})} {new Date(u.ultima_conexion).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>;
      return null;
  }

  // --- ORDENAMIENTO (SOLO PERSONAS CON HISTORIAL) ---
  const proyectosOrdenados = useMemo(() => {
      return proyectos.filter(p => !p.estatus.includes('Cotizado') && p.nombre_proyecto.toLowerCase().includes(busquedaProyectos.toLowerCase())).sort((a, b) => {
          const msgA = mensajesGlobales.find(m => m.proyecto_id === a.id);
          const msgB = mensajesGlobales.find(m => m.proyecto_id === b.id);
          return (msgB ? new Date(msgB.created_at).getTime() : new Date(b.created_at).getTime()) - (msgA ? new Date(msgA.created_at).getTime() : new Date(a.created_at).getTime());
      });
  }, [proyectos, mensajesGlobales, busquedaProyectos]);

  const personasOrdenadas = useMemo(() => {
      const idsRelacionados = new Set<string>();
      mensajesGlobales.forEach(m => {
          if (m.proyecto_id === null && m.grupo_id === null) {
              if (m.remitente_id === usuarioLogueado?.id) idsRelacionados.add(m.destinatario_id);
              if (m.destinatario_id === usuarioLogueado?.id) idsRelacionados.add(m.remitente_id);
          }
      });
      const uHistorial = Array.from(idsRelacionados).map(id => usuariosDb.find(u => u.id === id)).filter(Boolean);
      return uHistorial
          .filter((u:any) => `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaPersonas.toLowerCase()))
          .sort((a,b) => {
              const msgA = mensajesGlobales.find(m => m.proyecto_id === null && m.grupo_id === null && (m.remitente_id===a.id || m.destinatario_id===a.id));
              const msgB = mensajesGlobales.find(m => m.proyecto_id === null && m.grupo_id === null && (m.remitente_id===b.id || m.destinatario_id===b.id));
              const timeA = msgA ? new Date(msgA.created_at).getTime() : 0;
              const timeB = msgB ? new Date(msgB.created_at).getTime() : 0;
              return timeB - timeA; 
          });
  }, [mensajesGlobales, usuariosDb, usuarioLogueado, busquedaPersonas]);

  const unreadDMs = mensajesGlobales.filter(m => !m.proyecto_id && !m.grupo_id && m.remitente_id !== usuarioLogueado?.id && m.destinatario_id === usuarioLogueado?.id && !(m.visto_por||[]).includes(usuarioLogueado?.id)).length;
  const unreadProjs = mensajesGlobales.filter(m => m.proyecto_id && m.remitente_id !== usuarioLogueado?.id && !(m.visto_por||[]).includes(usuarioLogueado?.id) && proyectos.find(p=>p.id===m.proyecto_id)).length;

  if (!isOpen) return null;

  // AVATAR DINAMICO PARA EL HEADER
  let avatarChatActual = null;
  if (chatActivo?.tipo === 'dm') {
      const u = usuariosDb.find(x => x.id === chatActivo.id);
      if (u && u.avatar_url) avatarChatActual = u.avatar_url;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end font-sans">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            
            {/* HEADER DEL CHAT */}
            <div className="bg-slate-900 p-4 md:p-5 flex justify-between items-center text-white shrink-0 shadow-md z-10 w-full border-b border-slate-800">
                {chatActivo ? (
                    <div className="flex items-center gap-3 w-full overflow-hidden pr-2">
                        <button onClick={() => setChatActivo(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"><ArrowLeft size={18}/></button>
                        <div className="relative">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                                {chatActivo.tipo === 'proyecto' ? <FileText className="text-orange-400" size={18}/> : 
                                 chatActivo.tipo === 'grupo' ? <Users className="text-blue-400" size={18}/> : 
                                 avatarChatActual ? <img src={avatarChatActual} className="w-full h-full object-cover" /> :
                                 <div className="font-black text-white">{chatActivo.nombre.charAt(0)}</div>}
                            </div>
                            {chatActivo.tipo === 'dm' && usuariosDeVacaciones.includes(chatActivo.id) ? (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-100 text-amber-600 text-[10px] flex items-center justify-center border-2 border-slate-900 rounded-full z-10 shadow-sm leading-none">🌴</div>
                            ) : chatActivo.tipo === 'dm' && usuariosOnline.includes(chatActivo.id) && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                            )}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <h3 className="font-black text-[13px] md:text-sm uppercase truncate">{chatActivo.nombre}</h3>
                            {chatActivo.tipo === 'dm' ? getStatusPersona(chatActivo.id) : <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest truncate">{chatActivo.estatusFiltro ? `Fase: ${chatActivo.estatusFiltro}` : chatActivo.tipo==='grupo' ? 'Grupo' : 'Proyecto'}</p>}
                        </div>
                        {chatActivo.tipo === 'proyecto' && chatActivo.vendedor_id !== usuarioLogueado.id && (
                            <button onClick={toggleSilenciar} title="Silenciar Notificaciones" className={`p-2 rounded-full transition-colors shrink-0 ${proyectosSilenciados.includes(chatActivo.id) ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                                {proyectosSilenciados.includes(chatActivo.id) ? <BellOff size={16}/> : <Bell size={16}/>}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shrink-0"><MessageSquare className="text-white" size={16}/></div>
                        <h3 className="font-black text-base uppercase italic tracking-tighter flex-1">Chat Solaris</h3>
                    </div>
                )}
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white/10 rounded-full transition-colors shrink-0 ml-2"><X size={20}/></button>
            </div>

            <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
                {!chatActivo ? (
                    <div className="overflow-y-auto p-4 space-y-6 custom-scrollbar h-full">
                        
                        {!modoDifusion && (
                          <div className="flex bg-slate-200/50 p-1 rounded-xl shrink-0">
                              <button onClick={()=>{setChatTab('personas'); setBusquedaDirectorio(''); setBuscandoPersonaDM(false);}} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex justify-center items-center gap-1.5 ${chatTab==='personas'?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                                  Personas {unreadDMs > 0 && <span className="bg-red-500 text-white px-1.5 rounded-full text-[8px]">{unreadDMs}</span>}
                              </button>
                              <button onClick={()=>{setChatTab('proyectos'); setBusquedaDirectorio('');}} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex justify-center items-center gap-1.5 ${chatTab==='proyectos'?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                                  Proyectos {unreadProjs > 0 && <span className="bg-red-500 text-white px-1.5 rounded-full text-[8px]">{unreadProjs}</span>}
                              </button>
                              <button onClick={()=>{setChatTab('grupos'); setBusquedaDirectorio('');}} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${chatTab==='grupos'?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Grupos</button>
                          </div>
                        )}

                        {/* LISTA PROYECTOS */}
                        {chatTab === 'proyectos' && !modoDifusion && (
                            <div className="space-y-3">
                                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm">
                                  <Search className="text-slate-400 w-3.5 h-3.5" />
                                  <input type="text" placeholder="Buscar proyecto..." value={busquedaProyectos} onChange={e => setBusquedaProyectos(e.target.value)} className="bg-transparent outline-none w-full font-bold text-[11px]" />
                                </div>
                                <div className="space-y-2">
                                    {proyectosOrdenados.map(p => {
                                        const ult = getUltimoMensajeStr(p.id, 'proyecto');
                                        return (
                                        <button key={p.id} onClick={() => setChatActivo({tipo: 'proyecto', id: p.id, nombre: p.nombre_proyecto, estatusProyecto: p.estatus, vendedor_id: p.vendedor_id})} className="w-full bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-orange-300 hover:shadow-md transition-all flex items-center gap-3 text-left">
                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shrink-0 relative">
                                                {p.nombre_proyecto.charAt(0)}
                                                {ult && ult.unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center border-2 border-white">{ult.unread}</span>}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <p className="font-black text-[11px] uppercase text-slate-800 truncate pr-2">{p.nombre_proyecto}</p>
                                                    {ult && <span className="text-[8px] font-bold text-slate-400">{ult.hora}</span>}
                                                </div>
                                                {ult ? <p className={`text-[10px] truncate ${ult.unread > 0 ? 'font-black text-slate-800' : 'text-slate-500 font-medium'}`}>{ult.texto}</p> : <p className="text-[9px] font-bold text-slate-400 uppercase">Sin mensajes</p>}
                                            </div>
                                        </button>
                                    )})}
                                </div>
                            </div>
                        )}

                        {/* LISTA PERSONAS / DMs */}
                        {chatTab === 'personas' && (
                            <div className="space-y-3 h-full flex flex-col">
                                {!modoDifusion && (
                                  <div className="flex gap-2 shrink-0">
                                      <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm">
                                        <Search className="text-slate-400 w-3.5 h-3.5" />
                                        <input type="text" placeholder="Buscar conversación..." value={busquedaPersonas} onChange={e => setBusquedaPersonas(e.target.value)} className="bg-transparent outline-none w-full font-bold text-[11px]" />
                                      </div>
                                      <button onClick={() => {setModoDifusion(true); setSeleccionadosDifusion([]); setBusquedaDirectorio('');}} className="p-2.5 rounded-xl border shadow-sm transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-white text-slate-500 border-slate-200 hover:text-orange-500">
                                          <Megaphone size={16}/>
                                      </button>
                                  </div>
                                )}

                                {/* MODO DIFUSIÓN */}
                                {modoDifusion ? (
                                    <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3 flex-1 h-full relative">
                                        <div className="flex justify-between items-center shrink-0">
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2"><Megaphone size={14}/> Difusión Masiva</p>
                                            <button onClick={() => {setModoDifusion(false); setSeleccionadosDifusion([]); setBusquedaDirectorio('');}} className="text-red-500 hover:bg-red-50 p-1 rounded-md"><X size={14}/></button>
                                        </div>

                                        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm shrink-0">
                                            <Search className="text-slate-400 w-3.5 h-3.5" />
                                            <input type="text" placeholder="Buscar para agregar..." value={busquedaDirectorio} onChange={e => setBusquedaDirectorio(e.target.value)} className="bg-transparent outline-none w-full font-bold text-[11px]" />
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 bg-white rounded-xl border border-slate-200 p-2">
                                            {usuariosDb.filter(u => u.id !== usuarioLogueado?.id && `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaDirectorio.toLowerCase())).map(u => (
                                                <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={seleccionadosDifusion.includes(u.id)} onChange={(e) => {
                                                        if (e.target.checked) setSeleccionadosDifusion(prev => [...prev, u.id]);
                                                        else setSeleccionadosDifusion(prev => prev.filter(id => id !== u.id));
                                                    }} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"/>
                                                    <div className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-[8px] font-black relative overflow-hidden">
                                                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.nombre.charAt(0)}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-700 uppercase flex-1 truncate">{u.nombre} {u.apellidos}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                  <>
                                    {/* BUSCADOR DE NUEVO CHAT */}
                                    {buscandoPersonaDM ? (
                                        <div className="mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                                                <Search size={14} className="text-slate-400"/>
                                                <input autoFocus type="text" placeholder="Buscar nuevo chat..." value={busquedaDirectorio} onChange={e => setBusquedaDirectorio(e.target.value)} className="flex-1 outline-none text-xs font-bold" />
                                                <button onClick={()=>{setBuscandoPersonaDM(false); setBusquedaDirectorio('');}} className="text-red-500"><X size={14}/></button>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                                {usuariosDb.filter(u => u.id !== usuarioLogueado?.id && `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaDirectorio.toLowerCase())).map(u => (
                                                    <div key={u.id} onClick={() => {setChatActivo({tipo: 'dm', id: u.id, nombre: `${u.nombre} ${u.apellidos}`}); setBuscandoPersonaDM(false); setBusquedaDirectorio('');}} className="p-2 flex items-center gap-3 hover:bg-slate-50 cursor-pointer rounded-xl">
                                                        <div className="w-6 h-6 bg-slate-900 text-white font-black text-[8px] flex justify-center items-center rounded-md overflow-hidden">
                                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.nombre.charAt(0)}
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase text-slate-700 flex-1">{u.nombre} {u.apellidos}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center ml-2 shrink-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recientes</p>
                                            <button onClick={()=>setBuscandoPersonaDM(true)} className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">+ Nuevo Chat</button>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                                        {personasOrdenadas.map(u => {
                                            const ult = getUltimoMensajeStr(u.id, 'dm');
                                            return (
                                            <button key={u.id} onClick={() => setChatActivo({tipo: 'dm', id: u.id, nombre: `${u.nombre} ${u.apellidos}`})} className="w-full bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 text-left">
                                                <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center font-black shrink-0 relative overflow-hidden shadow-inner">
                                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <span>{u.nombre.charAt(0)}</span>}
                                                    {usuariosDeVacaciones.includes(u.id) ? (
                                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-amber-100 text-amber-600 text-[10px] flex items-center justify-center border-2 border-white rounded-full z-10 leading-none shadow-sm">🌴</div>
                                                    ) : usuariosOnline.includes(u.id) && (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-10"></div>
                                                    )}
                                                    {ult && ult.unread > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 rounded-bl-lg text-[8px] flex items-center justify-center font-black z-10">{ult.unread}</span>}
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <p className="font-black text-[11px] uppercase text-slate-800 truncate pr-2">{u.nombre} {u.apellidos}</p>
                                                        {ult && <span className="text-[8px] font-bold text-slate-400">{ult.hora}</span>}
                                                    </div>
                                                    {ult ? <p className={`text-[10px] truncate ${ult.unread > 0 ? 'font-black text-slate-800' : 'text-slate-500 font-medium'}`}>{ult.texto}</p> : <p className="text-[9px] font-bold text-slate-400 uppercase">{u.rol_sistema}</p>}
                                                </div>
                                            </button>
                                        )})}
                                        {personasOrdenadas.length === 0 && !buscandoPersonaDM && <p className="text-center text-[9px] font-bold text-slate-400 italic pt-4">No tienes mensajes directos recientes.</p>}
                                    </div>
                                  </>
                                )}
                            </div>
                        )}

                        {/* LISTA GRUPOS */}
                        {chatTab === 'grupos' && (
                            <div className="space-y-3">
                                {modalCrearGrupo ? (
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-center"><p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Crear Nuevo Grupo</p><button onClick={()=>{setModalCrearGrupo(false); setBusquedaDirectorio(''); setNuevoGrupoMiembros([]);}} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button></div>
                                        <input type="text" placeholder="Nombre del grupo..." value={nuevoGrupoNombre} onChange={e=>setNuevoGrupoNombre(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-400"/>
                                        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                                            <Search className="text-slate-400 w-3.5 h-3.5" />
                                            <input type="text" placeholder="Buscar miembros..." value={busquedaDirectorio} onChange={e => setBusquedaDirectorio(e.target.value)} className="bg-transparent outline-none w-full font-bold text-[11px]" />
                                        </div>
                                        <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl p-2 bg-white">
                                            {usuariosDb.filter(u => u.id !== usuarioLogueado?.id && `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaDirectorio.toLowerCase())).map(u => (
                                                <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={nuevoGrupoMiembros.includes(u.id)} onChange={(e) => {
                                                        if (e.target.checked) setNuevoGrupoMiembros(prev => [...prev, u.id]);
                                                        else setNuevoGrupoMiembros(prev => prev.filter(id => id !== u.id));
                                                    }} className="w-4 h-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500"/>
                                                    <div className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-[8px] font-black overflow-hidden">
                                                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.nombre.charAt(0)}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-700 uppercase flex-1 truncate">{u.nombre} {u.apellidos}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <button onClick={handleCrearGrupo} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-black text-[10px] uppercase py-3 rounded-xl shadow-md mt-2">Guardar y Crear</button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center ml-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mis Grupos</p>
                                        <button onClick={()=>setModalCrearGrupo(true)} className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">+ Crear Grupo</button>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {gruposDb.map(g => {
                                        const ult = getUltimoMensajeStr(g.id, 'grupo');
                                        return (
                                        <button key={g.id} onClick={() => setChatActivo({tipo: 'grupo', id: g.id, nombre: g.nombre})} className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 text-left">
                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shrink-0 relative">
                                                <Users size={18}/>
                                                {ult && ult.unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center border-2 border-white">{ult.unread}</span>}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <p className="font-black text-[11px] uppercase text-slate-800 truncate pr-2">{g.nombre}</p>
                                                    {ult && <span className="text-[8px] font-bold text-slate-400">{ult.hora}</span>}
                                                </div>
                                                {ult ? <p className={`text-[10px] truncate ${ult.unread > 0 ? 'font-black text-slate-800' : 'text-slate-500 font-medium'}`}>{ult.texto}</p> : <p className="text-[9px] font-bold text-slate-400 uppercase">Sin mensajes</p>}
                                            </div>
                                        </button>
                                    )})}
                                    {gruposDb.length === 0 && !modalCrearGrupo && <p className="text-center text-[9px] font-bold text-slate-400 italic pt-4">No estás en ningún grupo.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* INTERIOR DE LA SALA DE CHAT */
                    <>
                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/90 bg-blend-overlay pb-10">
                            
                            {chatActivo.tipo === 'proyecto' && (chatActivo.estatusProyecto === 'Cotizado' || !!chatActivo.estatusFiltro) && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest shadow-sm mb-4">
                                    🔒 El proyecto avanzó de fase. Chat cerrado en modo lectura.
                                </div>
                            )}

                            {mensajesChat.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                    <MessageSquare size={40} className="mb-3"/>
                                    <p className="text-xs font-bold uppercase tracking-widest">Inicia la conversación</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {mensajesChat.map(msg => {
                                        const soyYo = msg.remitente_id === usuarioLogueado?.id;
                                        const citadoReal = msg.citado;
                                        
                                        // Palomitas (Si fue visto por alguien más que yo)
                                        const fueVisto = msg.visto_por && msg.visto_por.some((id:string) => id !== usuarioLogueado.id);

                                        return (
                                            <div key={msg.id} className={`flex w-full ${soyYo ? 'justify-end' : 'justify-start'}`}>
                                                {!soyYo && (
                                                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 bg-slate-200 border border-slate-300 flex items-center justify-center font-black text-[10px] text-slate-500 shadow-sm mt-4 relative">
                                                        {msg.remitente?.avatar_url ? <img src={msg.remitente.avatar_url} className="w-full h-full object-cover"/> : msg.remitente?.nombre?.charAt(0)}
                                                        {usuariosOnline.includes(msg.remitente_id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></div>}
                                                    </div>
                                                )}
                                                
                                                <div 
                                                    className={`flex flex-col ${soyYo ? 'items-end' : 'items-start'} max-w-[85%] relative group`}
                                                    onMouseEnter={() => setHoverMsgId(msg.id)}
                                                    onMouseLeave={() => setHoverMsgId(null)}
                                                >
                                                    {/* MENÚ FLOTANTE (SALE POR LA IZQUIERDA O DERECHA SEGUN EL MENSAJE) */}
                                                    <AnimatePresence>
                                                        {hoverMsgId === msg.id && (
                                                            <motion.div initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className={`absolute top-1/2 -translate-y-1/2 ${soyYo ? 'right-[102%] mr-2' : 'left-[102%] ml-2'} bg-white border border-slate-200 rounded-full shadow-xl flex items-center gap-1 p-1.5 z-50`}>
                                                                {['👍','❤️','👀','✅'].map(e => (
                                                                    <button key={e} onClick={()=>toggleReaccion(msg.id, e, msg.reacciones)} className="hover:scale-125 transition-transform px-1.5 text-base">{e}</button>
                                                                ))}
                                                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                                                <button onClick={() => setMensajeCitado(msg)} title="Responder" className="text-slate-400 hover:text-blue-500 px-1.5"><Reply size={14}/></button>
                                                                <button onClick={() => {setModalReenviar({id: msg.id, msg: msg}); setHoverMsgId(null); setBusquedaReenviar('');}} title="Reenviar" className="text-slate-400 hover:text-emerald-500 px-1.5"><Forward size={14}/></button>
                                                                {soyYo && (
                                                                    <>
                                                                       <button onClick={() => {setMensajeEditando(msg); setNuevoMensaje(msg.mensaje);}} title="Editar" className="text-slate-400 hover:text-orange-500 px-1.5"><Edit2 size={14}/></button>
                                                                       <button onClick={() => eliminarMensaje(msg.id)} title="Eliminar" className="text-slate-400 hover:text-red-500 px-1.5"><Trash2 size={14}/></button>
                                                                    </>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${soyYo ? 'text-slate-400 mr-2' : 'text-slate-400 ml-2'}`}>
                                                        {soyYo ? 'TÚ' : `${msg.remitente?.nombre}`}
                                                    </span>
                                                    
                                                    <div className={`p-3 md:p-4 rounded-2xl shadow-sm text-[11px] md:text-[13px] font-medium leading-relaxed relative ${soyYo ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                                        
                                                        {citadoReal && citadoReal.mensaje && (
                                                            <div className={`mb-2 p-2 rounded-lg text-[9px] md:text-[10px] italic border-l-4 ${soyYo ? 'bg-orange-600/30 border-white text-orange-50' : 'bg-slate-100 border-orange-500 text-slate-500'}`}>
                                                                <span className="font-black block mb-0.5">{citadoReal.remitente_id === usuarioLogueado.id ? 'Tú' : 'Compañero'}</span>
                                                                {citadoReal.archivo_nombre ? `📎 ${citadoReal.archivo_nombre}` : citadoReal.mensaje}
                                                            </div>
                                                        )}

                                                        {msg.archivo_url && (
                                                            <div className="mb-2 border-b border-white/20 pb-2">
                                                                {msg.archivo_tipo?.includes('image') ? (
                                                                    <img src={msg.archivo_url} onClick={() => {setZoom(1); setDocPreview({urls: [msg.archivo_url], currentIndex: 0, nombre: msg.archivo_nombre})}} className="rounded-lg max-h-40 w-auto object-cover cursor-zoom-in hover:opacity-90 transition-opacity shadow-sm" alt="Adjunto"/>
                                                                ) : msg.archivo_tipo?.includes('audio') ? (
                                                                    <audio controls src={msg.archivo_url} className="w-48 h-8 rounded-full bg-transparent outline-none"/>
                                                                ) : (
                                                                    <button onClick={() => {setZoom(1); setDocPreview({urls: [msg.archivo_url], currentIndex: 0, nombre: msg.archivo_nombre})}} className={`flex items-center gap-2 p-2 rounded-lg transition-colors font-bold text-[10px] uppercase w-full ${soyYo ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                                                        <FileIcon size={14}/> {msg.archivo_nombre}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {msg.mensaje && msg.mensaje.split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/g).map((part:string, i:number) => {
                                                            if (part.startsWith('@')) return <span key={i} className={`font-black ${soyYo ? 'text-orange-200' : 'text-blue-500'}`}>{part}</span>;
                                                            if (part.startsWith('http')) return <a key={i} href={part} target="_blank" rel="noreferrer" className="underline hover:opacity-80 break-all font-bold">{part}</a>;
                                                            return part;
                                                        })}
                                                    </div>
                                                    
                                                    {/* INFO DEBAJO DEL MENSAJE */}
                                                    <div className={`flex items-center gap-1 mt-1 ${soyYo ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
                                                        <span className="text-[8px] font-bold text-slate-400">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                        {msg.is_edited && <span className="text-[8px] italic text-slate-300">(editado)</span>}
                                                        
                                                        {/* PALOMITAS DE WHATSAPP (DOUBLE CHECK) */}
                                                        {soyYo && (
                                                            <CheckCheck size={14} className={fueVisto ? 'text-blue-500' : 'text-slate-300'} />
                                                        )}
                                                        
                                                        <div className="flex gap-1">
                                                            {msg.reacciones && Object.keys(msg.reacciones).map(emoji => msg.reacciones[emoji].length > 0 && (
                                                                <span key={emoji} className="bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-[8px] font-black shadow-sm flex items-center gap-0.5 text-slate-600">
                                                                    {emoji} {msg.reacciones[emoji].length > 1 && msg.reacciones[emoji].length}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* INPUT CHAT */}
                        <form onSubmit={enviarMensaje} className="p-3 md:p-4 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0 relative shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                            
                            <AnimatePresence>
                                {(mensajeCitado || mensajeEditando) && (
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, scale:0.9}} className="relative w-full bg-blue-50 p-2 md:p-3 rounded-xl border border-blue-200 shadow-sm mb-1 pr-8">
                                        <button type="button" onClick={() => {setMensajeCitado(null); setMensajeEditando(null); setNuevoMensaje('');}} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                                        <p className="text-[9px] font-black text-blue-600 uppercase mb-0.5">
                                            {mensajeEditando ? <><Edit2 size={10} className="inline mr-1"/> Editando Mensaje</> : <><Reply size={10} className="inline mr-1"/> Respondiendo a:</>}
                                        </p>
                                        <p className="text-[11px] text-slate-600 italic truncate">
                                            {mensajeEditando ? mensajeEditando.mensaje : (mensajeCitado.archivo_nombre ? `📎 ${mensajeCitado.archivo_nombre}` : mensajeCitado.mensaje)}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {archivoChat && (
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, scale:0.9}} className="relative w-fit bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm mb-1">
                                        <button type="button" onClick={() => {setArchivoChat(null); setPreviewArchivoChat(null)}} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md z-10"><X size={10}/></button>
                                        {previewArchivoChat === 'audio_icon' ? (
                                            <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center flex-col gap-1 text-slate-500"><Mic size={20}/><span className="text-[7px] font-black uppercase">Audio</span></div>
                                        ) : previewArchivoChat === 'pdf_icon' ? (
                                            <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center flex-col gap-1 text-slate-500"><FileIcon size={20}/><span className="text-[7px] font-black uppercase truncate w-full px-1 text-center">{archivoChat.name}</span></div>
                                        ) : (
                                            <img src={previewArchivoChat!} className="h-16 w-auto rounded-lg object-cover" />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            <AnimatePresence>
                                {mostrarMenciones && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-40 overflow-y-auto">
                                        {usuariosDb.filter(u=>`${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaMencion.toLowerCase())).map(u=>(
                                            <div key={u.id} onClick={()=>insertarMencion(u)} className="p-3 border-b hover:bg-orange-50 cursor-pointer flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] overflow-hidden">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <span>{u.nombre.charAt(0)}</span>}</div>
                                                <p className="text-slate-900 font-black text-[10px] uppercase">{u.nombre} {u.apellidos}</p>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {(() => {
                                const disabled = !modoDifusion && chatActivo?.tipo === 'proyecto' && (chatActivo.estatusProyecto === 'Cotizado' || !!chatActivo.estatusFiltro);
                                
                                return (
                                    <div className="flex items-end gap-2">
                                        <input type="file" ref={fileInputChatRef} onChange={handleSeleccionarArchivoChat} className="hidden" />
                                        <button type="button" onClick={() => fileInputChatRef.current?.click()} disabled={disabled || grabando} className="p-3 md:p-3.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-orange-100 hover:text-orange-500 transition-colors disabled:opacity-50 shrink-0">
                                            <Paperclip size={18}/>
                                        </button>
                                        
                                        <div className="flex-1 relative flex items-center">
                                            {grabando ? (
                                                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl py-3 px-4 flex items-center justify-between shadow-inner h-[46px]">
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div><span className="text-xs font-black text-red-600 uppercase tracking-widest">{formatTiempo(tiempoAudio)}</span></div>
                                                    <button type="button" onClick={detenerGrabacion} className="text-red-600 hover:scale-110"><Square size={16}/></button>
                                                </div>
                                            ) : (
                                                <textarea 
                                                    rows={1} placeholder={modoDifusion ? "Mensaje de Difusión Masiva..." : "Escribe un mensaje... (@ para mencionar)"} 
                                                    value={nuevoMensaje} onChange={handleMensajeChange} disabled={disabled || !!archivoChat}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(e); } }}
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-xs font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner resize-none disabled:opacity-50 disabled:bg-slate-100 h-[46px]" 
                                                />
                                            )}
                                            {!grabando && !nuevoMensaje && !archivoChat && !disabled && !modoDifusion && (
                                                <button type="button" onClick={iniciarGrabacion} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"><Mic size={18}/></button>
                                            )}
                                        </div>

                                        <button type="submit" disabled={(!nuevoMensaje.trim() && !archivoChat) || enviandoMensaje || disabled || grabando || (modoDifusion && seleccionadosDifusion.length===0)} className={`p-3 md:p-3.5 text-white rounded-xl shadow-md transition-colors disabled:opacity-50 shrink-0 ${modoDifusion ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-orange-500'}`}>
                                            <Send size={18}/>
                                        </button>
                                    </div>
                                )
                            })()}
                        </form>
                    </>
                )}
            </div>
        </motion.div>

        {/* MODAL REENVIAR MENSAJE */}
        <AnimatePresence>
            {modalReenviar && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center"><p className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Forward size={14}/> Reenviar a...</p><button onClick={()=>setModalReenviar(null)}><X size={16}/></button></div>
                        <div className="p-4 space-y-4">
                            <p className="text-[10px] italic text-slate-500 truncate bg-slate-50 p-2 rounded-lg border border-slate-100">{modalReenviar.msg.archivo_nombre ? `📎 ${modalReenviar.msg.archivo_nombre}` : modalReenviar.msg.mensaje}</p>
                            
                            {/* Buscador de Contactos en Reenviar */}
                            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                                <Search className="text-slate-400 w-3.5 h-3.5" />
                                <input type="text" placeholder="Buscar contacto..." value={busquedaReenviar} onChange={e => setBusquedaReenviar(e.target.value)} className="bg-transparent outline-none w-full font-bold text-[11px]" />
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                {usuariosDb.filter(u => u.id !== usuarioLogueado.id && `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaReenviar.toLowerCase())).map(u => (
                                    <button key={u.id} onClick={()=>enviarMensaje(null, { ...modalReenviar.msg, id: undefined, created_at: undefined, destinatario_id: u.id, proyecto_id: null, grupo_id: null })} className="w-full flex items-center gap-3 p-2 hover:bg-orange-50 rounded-xl transition-colors">
                                        <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[10px] overflow-hidden">
                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.nombre.charAt(0)}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-800 uppercase text-left flex-1">{u.nombre} {u.apellidos}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        
        <AnimatePresence>
            {docPreview && <VisorArchivos docPreview={docPreview} setDocPreview={setDocPreview} zoom={zoom} setZoom={setZoom} />}
        </AnimatePresence>
    </div>
  )
}