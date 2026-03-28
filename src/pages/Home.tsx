import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { 
  BarChart3, Users, LayoutGrid, Package, LayoutDashboard, Wrench, Zap, PencilRuler, CalendarCheck, 
  Banknote, FileText, LogOut, Bell, Image as ImageIcon, AtSign, Send, Pin, MessageSquare, Heart, Cake, 
  Calendar as CalendarIcon, X, Loader2, MoreVertical, Trash2, Edit2, ChevronLeft, ChevronRight, BarChart2,
  CheckCircle2, XCircle, Clock, PlaneTakeoff
} from 'lucide-react'

import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

const modulosMenu = [
  { nombre: 'Panel', icono: LayoutDashboard, ruta: '/panel-control', color: 'text-orange-500', bg: 'hover:bg-orange-50' },
  { nombre: 'Proyectos', icono: LayoutGrid, ruta: '/proyectos', color: 'text-blue-500', bg: 'hover:bg-blue-50' },
  { nombre: 'Ventas', icono: BarChart3, ruta: '/ventas', color: 'text-orange-500', bg: 'hover:bg-orange-50' },
  { nombre: 'Cotizaciones', icono: FileText, ruta: '/cotizaciones', color: 'text-blue-500', bg: 'hover:bg-blue-50' },
  { nombre: 'Viabilidad', icono: CalendarCheck, ruta: '/agendar-viabilidad', color: 'text-emerald-500', bg: 'hover:bg-emerald-50' },
  { nombre: 'Ingeniería', icono: PencilRuler, ruta: '/ingenieria', color: 'text-purple-500', bg: 'hover:bg-purple-50' },
  { nombre: 'Instalación', icono: Wrench, ruta: '/instalacion', color: 'text-orange-500', bg: 'hover:bg-orange-50' },
  { nombre: 'Interconexión', icono: Zap, ruta: '/interconexion', color: 'text-blue-500', bg: 'hover:bg-blue-50' },
  { nombre: 'Inventario', icono: Package, ruta: '/inventario', color: 'text-emerald-500', bg: 'hover:bg-emerald-50' },
  { nombre: 'Finanzas', icono: Banknote, ruta: '/finanzas', color: 'text-purple-500', bg: 'hover:bg-purple-50' },
  { nombre: 'Directorio', icono: Users, ruta: '/usuarios', color: 'text-blue-500', bg: 'hover:bg-blue-50' },
]

const festivosMexico = [
    { mes: 0, dia: 1, titulo: 'Año Nuevo' }, { mes: 1, dia: 5, titulo: 'Día de la Constitución' },
    { mes: 2, dia: 21, titulo: 'Natalicio Benito Juárez' }, { mes: 3, dia: 2, titulo: 'Jueves Santo' },
    { mes: 3, dia: 3, titulo: 'Viernes Santo' }, { mes: 4, dia: 1, titulo: 'Día del Trabajo' },
    { mes: 4, dia: 5, titulo: 'Batalla de Puebla' }, { mes: 8, dia: 16, titulo: 'Día de la Independencia' },
    { mes: 10, dia: 2, titulo: 'Día de Muertos' }, { mes: 10, dia: 20, titulo: 'Revolución Mexicana' },
    { mes: 11, dia: 25, titulo: 'Navidad' },
]

export default function Home() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<any>(null)
  
  // Datos DB
  const [usuariosDb, setUsuariosDb] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [solicitudesVacaciones, setSolicitudesVacaciones] = useState<any[]>([])
  const [cargandoFeed, setCargandoFeed] = useState(true)
  
  // Muro Social & Encuestas
  const [nuevoPost, setNuevoPost] = useState('')
  const [publicando, setPublicando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagenSeleccionada, setImagenSeleccionada] = useState<File | null>(null)
  const [previewImagen, setPreviewImagen] = useState<string | null>(null)
  const [modoEncuesta, setModoEncuesta] = useState(false)
  const [opcionesEncuesta, setOpcionesEncuesta] = useState(['', ''])
  
  // Menciones
  const [idsMencionados, setIdsMencionados] = useState<string[]>([])
  const [mostrarMenciones, setMostrarMenciones] = useState(false)
  const [busquedaMencion, setBusquedaMencion] = useState('')
  const [posicionCursor, setPosicionCursor] = useState(0)
  
  // Interacciones
  const [likesUsuarios, setLikesUsuarios] = useState<Record<string, string[]>>({})
  const [votosEncuestas, setVotosEncuestas] = useState<Record<string, any[]>>({})
  const [postOpcionesId, setPostOpcionesId] = useState<string | null>(null)
  const [postEditandoId, setPostEditandoId] = useState<string | null>(null)
  const [textoEditado, setTextoEditado] = useState('')
  const [comentariosVisibles, setComentariosVisibles] = useState<Record<string, boolean>>({})
  const [comentariosData, setComentariosData] = useState<Record<string, any[]>>({})
  const [nuevoComentario, setNuevoComentario] = useState<Record<string, string>>({})
  const [mostrarMenuNotificaciones, setMostrarMenuNotificaciones] = useState(false)
  
  // Calendario
  const [fechaCalendario, setFechaCalendario] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  useEffect(() => {
    const sessionData = localStorage.getItem('session_gea_solar')
    if (!sessionData) navigate('/login')
    else {
      const user = JSON.parse(sessionData);
      setUsuario(user);
      cargarDatosIniciales(user.id);
    }
  }, [navigate])

  const cargarDatosIniciales = async (userId: string) => {
    setCargandoFeed(true);
    
    // 1. Cargar Usuarios (Traemos todos los campos necesarios)
    const { data: users } = await supabase.from('perfiles').select('id, nombre, apellidos, rol_sistema, departamento, fecha_nacimiento, avatar_url, puesto_actual');
    if (users) {
        setUsuariosDb(users);
        // Encontramos tu usuario en la BD y lo actualizamos completo
        const me = users.find(u => u.id === userId);
        if (me) setUsuario(me);
    }

    // 2. Cargar Posts
    const { data: feed } = await supabase.from('muro_social').select(`*, autor:perfiles!user_id(id, nombre, apellidos, rol_sistema, avatar_url)`).order('creado_at', { ascending: false });
    if (feed) setPosts(feed);

    // 3. Cargar Vacaciones
    const { data: solicitudes } = await supabase.from('solicitudes_ausencia').select(`*, empleado:perfiles!user_id(id, nombre, apellidos, avatar_url, jefe_id)`).order('creado_at', { ascending: false }).limit(15);
    if (solicitudes) setSolicitudesVacaciones(solicitudes);

    // 4. Cargar Likes y Votos
    const { data: likes } = await supabase.from('likes_muro').select('*');
    if (likes) {
        const likesMap: Record<string, string[]> = {};
        likes.forEach(l => { if(!likesMap[l.post_id]) likesMap[l.post_id] = []; likesMap[l.post_id].push(l.user_id); });
        setLikesUsuarios(likesMap);
    }

    const { data: votos } = await supabase.from('votos_encuesta').select('*');
    if (votos) {
        const votosMap: Record<string, any[]> = {};
        votos.forEach(v => { if(!votosMap[v.post_id]) votosMap[v.post_id] = []; votosMap[v.post_id].push(v); });
        setVotosEncuestas(votosMap);
    }

    await cargarNotificaciones(userId);
    setCargandoFeed(false);
  }

  const cargarNotificaciones = async (userId: string) => {
    const { data: notifs } = await supabase.from('notificaciones').select(`*, autor:perfiles!autor_id(nombre, apellidos, avatar_url)`).eq('usuario_id', userId).order('creado_at', { ascending: false });
    if (notifs) setNotificaciones(notifs);
  }

  // --- HELPERS AVATARES ---
  const getIniciales = (nombre?: string, apellidos?: string) => `${nombre?.charAt(0) || 'U'}${apellidos?.charAt(0) || ''}`.toUpperCase();
  
  const renderAvatar = (userObj: any, sizeClasses: string = "w-14 h-14 text-xl rounded-2xl") => {
      if (userObj?.avatar_url) return <img src={userObj.avatar_url} alt="Avatar" className={`${sizeClasses} object-cover shadow-sm shrink-0`} />;
      return (
          <div className={`${sizeClasses} bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black shadow-sm shrink-0`}>
              {getIniciales(userObj?.nombre, userObj?.apellidos)}
          </div>
      );
  }

  // --- GESTIÓN VACACIONES WIDGET ---
  const responderSolicitud = async (id: string, estado: 'Aprobada' | 'Rechazada') => {
      await supabase.from('solicitudes_ausencia').update({ estado, revisado_por: usuario.id }).eq('id', id);
      setSolicitudesVacaciones(solicitudesVacaciones.map(s => s.id === id ? { ...s, estado } : s));
      
      const sol = solicitudesVacaciones.find(s => s.id === id);
      if (sol) {
          await supabase.from('notificaciones').insert([{
              usuario_id: sol.empleado.id, autor_id: usuario.id, mensaje: `ha ${estado.toLowerCase()} tu solicitud de vacaciones.`
          }]);
      }
  }

  // --- CALENDARIO Y EVENTOS ---
  const eventosCombinados = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const añoActual = hoy.getFullYear();
    const arr: any[] = [];

    festivosMexico.forEach(f => {
        const date = new Date(añoActual, f.mes, f.dia);
        arr.push({ id: `F${f.mes}${f.dia}`, tipo: 'festivo', titulo: f.titulo, date, mes: f.mes, dia: f.dia });
    });

    usuariosDb.forEach(u => {
        if (u.fecha_nacimiento) {
            const [y, m, d] = u.fecha_nacimiento.split('-');
            const date = new Date(añoActual, parseInt(m)-1, parseInt(d));
            arr.push({ id: `C${u.id}`, tipo: 'cumple', titulo: `Cumpleaños de ${u.nombre}`, date, mes: parseInt(m)-1, dia: parseInt(d), iniciales: `${u.nombre.charAt(0)}` });
        }
    });

    return arr.sort((a,b) => a.date.getTime() - b.date.getTime());
  }, [usuariosDb, fechaCalendario]);

  const eventosFuturos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    return eventosCombinados.filter(e => e.date >= hoy);
  }, [eventosCombinados]);

  // --- IMAGENES ---
  const handleSelectImagen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagenSeleccionada(file);
      const reader = new FileReader();
      reader.onloadend = () => { setPreviewImagen(reader.result as string); };
      reader.readAsDataURL(file);
    }
  }

  const cancelarImagen = () => {
    setImagenSeleccionada(null);
    setPreviewImagen(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // --- MENCIONES ---
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value;
    setNuevoPost(texto);
    
    if (texto.toLowerCase().includes('@todos')) {
        setMostrarMenciones(false);
        return;
    }

    const cursor = e.target.selectionStart;
    const match = texto.substring(0, cursor).match(/@([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*)$/);
    if (match) {
        setBusquedaMencion(match[1]);
        setPosicionCursor(cursor);
        setMostrarMenciones(true);
    } else {
        setMostrarMenciones(false);
    }
  }

  const insertarMencion = (u: any) => {
    const textoAntes = nuevoPost.substring(0, posicionCursor).replace(/@[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, '');
    const textoDespues = nuevoPost.substring(posicionCursor);
    setNuevoPost(`${textoAntes}@${u.nombre} ${u.apellidos} ${textoDespues}`);
    setMostrarMenciones(false);
    if (!idsMencionados.includes(u.id)) setIdsMencionados([...idsMencionados, u.id]);
  }

  const usuariosFiltradosParaMencion = useMemo(() => {
    if (!busquedaMencion) return usuariosDb;
    return usuariosDb.filter(u => `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaMencion.toLowerCase()));
  }, [usuariosDb, busquedaMencion]);

  // --- PUBLICAR ---
  const handlePublicarPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPost.trim() || publicando || !usuario?.id) return;
    if (modoEncuesta && opcionesEncuesta.some(op => !op.trim())) return alert('Por favor, llena todas las opciones de la encuesta.');
    
    setPublicando(true);
    let finalImagenUrl = null;

    try {
        if (imagenSeleccionada) {
            const fileName = `${usuario.id}_${Date.now()}.${imagenSeleccionada.name.split('.').pop()}`;
            await supabase.storage.from('post_images').upload(fileName, imagenSeleccionada);
            finalImagenUrl = supabase.storage.from('post_images').getPublicUrl(fileName).data.publicUrl;
        }

        const payload = {
            user_id: usuario.id,
            contenido: nuevoPost,
            imagen_url: finalImagenUrl,
            tipo: modoEncuesta ? 'encuesta' : 'texto',
            opciones: modoEncuesta ? opcionesEncuesta.filter(o => o.trim() !== '') : []
        };

        const { data: postData, error } = await supabase.from('muro_social').insert([payload]).select(`*, autor:perfiles!user_id(id, nombre, apellidos, rol_sistema, avatar_url)`).single();
        if (error) throw error;

        let targetsToNotify = [...idsMencionados];
        if (nuevoPost.toLowerCase().includes('@todos')) {
            targetsToNotify = usuariosDb.map(u => u.id);
        }
        targetsToNotify = [...new Set(targetsToNotify)]; 

        for (const targetId of targetsToNotify) {
            await supabase.from('notificaciones').insert([{
                usuario_id: targetId, autor_id: usuario.id,
                mensaje: nuevoPost.toLowerCase().includes('@todos') ? 'envió un comunicado a @Todos.' : 'te etiquetó en una publicación.',
            }]);
        }

        if (postData) setPosts([postData, ...posts]);
        setNuevoPost(''); setImagenSeleccionada(null); setPreviewImagen(null); setModoEncuesta(false); setOpcionesEncuesta(['', '']); setIdsMencionados([]);
        await cargarNotificaciones(usuario.id);

    } catch (err: any) {
        console.error(err);
        alert("Ocurrió un problema al publicar. Revisa tu conexión.");
    } finally {
        setPublicando(false);
    }
  }

  // --- LIKES Y VOTOS ---
  const toggleLike = async (postId: string) => {
      const myLikes = likesUsuarios[postId] || [];
      const hasLiked = myLikes.includes(usuario.id);
      
      if (hasLiked) {
          await supabase.from('likes_muro').delete().match({ post_id: postId, user_id: usuario.id });
          setLikesUsuarios({...likesUsuarios, [postId]: myLikes.filter(id => id !== usuario.id)});
      } else {
          await supabase.from('likes_muro').insert([{ post_id: postId, user_id: usuario.id }]);
          setLikesUsuarios({...likesUsuarios, [postId]: [...myLikes, usuario.id]});
      }
  }

  const votarEncuesta = async (postId: string, opcionIndex: number) => {
      const misVotos = votosEncuestas[postId] || [];
      if (misVotos.some(v => v.user_id === usuario.id)) return; 
      
      await supabase.from('votos_encuesta').insert([{ post_id: postId, user_id: usuario.id, opcion_index: opcionIndex }]);
      setVotosEncuestas({...votosEncuestas, [postId]: [...misVotos, { post_id: postId, user_id: usuario.id, opcion_index: opcionIndex }]});
  }

  // --- UI HELPERS ---
  const borrarPost = async (id: string) => {
    if(!confirm('¿Seguro que deseas eliminar esta publicación?')) return;
    await supabase.from('muro_social').delete().eq('id', id);
    setPosts(posts.filter(p => p.id !== id)); setPostOpcionesId(null);
  }

  const guardarEdicion = async (id: string) => {
      await supabase.from('muro_social').update({ contenido: textoEditado }).eq('id', id);
      setPosts(posts.map(p => p.id === id ? { ...p, contenido: textoEditado } : p)); setPostEditandoId(null);
  }

  const toggleComentarios = async (postId: string) => {
      const esVisible = !comentariosVisibles[postId];
      setComentariosVisibles({ ...comentariosVisibles, [postId]: esVisible });
      if (esVisible) {
          const { data } = await supabase.from('comentarios_muro').select('*, autor:perfiles!user_id(nombre, apellidos, avatar_url)').eq('post_id', postId).order('creado_at', { ascending: true });
          if(data) setComentariosData({ ...comentariosData, [postId]: data });
      }
  }

  const publicarComentario = async (postId: string) => {
      const texto = nuevoComentario[postId];
      if(!texto?.trim()) return;
      const { data } = await supabase.from('comentarios_muro').insert([{ post_id: postId, user_id: usuario.id, contenido: texto }]).select('*, autor:perfiles!user_id(nombre, apellidos, avatar_url)').single();
      if (data) {
          setComentariosData({ ...comentariosData, [postId]: [...(comentariosData[postId] || []), data] });
          setNuevoComentario({ ...nuevoComentario, [postId]: '' });
      }
  }

  const marcarNotificacionesLeidas = async () => {
    setMostrarMenuNotificaciones(!mostrarMenuNotificaciones);
    const noLeidas = notificaciones.filter(n => !n.leida);
    if (noLeidas.length > 0 && !mostrarMenuNotificaciones) {
        await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', usuario.id);
        setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('session_gea_solar')
    navigate('/login')
  }

  const diasEnMes = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 0).getDate();
  const diaInicioMes = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth(), 1).getDay();
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />

      {/* NAV BAR */}
      <nav className="bg-white/95 backdrop-blur-2xl border-b border-white/20 sticky top-0 z-50 shadow-lg h-16 flex items-center relative">
        <div className="max-w-[1800px] mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={solarisLogo} alt="GEA" className="h-8 w-auto drop-shadow-sm" />
            <div className="h-6 w-px bg-slate-300 mx-2" />
            <h1 className="font-black text-lg tracking-tight text-slate-900 uppercase italic">Intranet GEA</h1>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="relative">
                <button onClick={marcarNotificacionesLeidas} className="p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all relative">
                    <Bell className="w-6 h-6" />
                    {notificaciones.filter(n=>!n.leida).length > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-black text-white">{notificaciones.filter(n=>!n.leida).length}</span>}
                </button>

                <AnimatePresence>
                    {mostrarMenuNotificaciones && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                            <div className="bg-slate-900 p-4 text-white font-black text-xs uppercase tracking-widest flex justify-between items-center">Notificaciones <button onClick={() => setMostrarMenuNotificaciones(false)}><X className="w-4 h-4 hover:text-orange-400"/></button></div>
                            <div className="max-h-80 overflow-y-auto">
                                {notificaciones.length === 0 ? <div className="p-6 text-center text-slate-400 text-xs font-bold">No hay alertas nuevas.</div> : notificaciones.map(notif => (
                                    <div key={notif.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.leida ? 'bg-orange-50/50' : ''}`}>
                                        <p className="text-xs text-slate-800 leading-tight">
                                            <span className="font-black text-orange-600">{notif.autor?.nombre} {notif.autor?.apellidos}</span> {notif.mensaje}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTÓN PERFIL CON FOTO REAL */}
            <div onClick={() => navigate('/perfil')} className="bg-white px-4 py-1.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors group">
                {renderAvatar(usuario, "w-8 h-8 text-[11px] rounded-lg")}
                <div className="text-right flex flex-col hidden sm:flex">
                    <span className="text-[11px] font-black text-slate-900 uppercase leading-none group-hover:text-orange-600 transition-colors">{usuario?.nombre || 'Cargando...'}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{usuario?.rol_sistema || 'GEA Solaris'}</span>
                </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 bg-white rounded-full shadow-sm border border-slate-100 transition-colors"><LogOut className="w-5 h-5"/></button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* MENÚ */}
            <aside className="hidden lg:block lg:col-span-3">
                <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white sticky top-24">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-3">Estructura ERP</h3>
                    <div className="space-y-1.5">
                        {modulosMenu.map((mod) => (
                            <button key={mod.nombre} onClick={() => navigate(mod.ruta)} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${mod.bg}`}>
                                <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform ${mod.color}`}><mod.icono className="w-4 h-4" /></div>
                                <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-slate-900">{mod.nombre}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* FEED SOCIAL */}
            <section className="col-span-1 lg:col-span-6 space-y-8">
                {/* PUBLICAR */}
                <div className="bg-white/95 backdrop-blur-xl rounded-[40px] p-8 shadow-2xl border border-white relative z-20">
                    <form onSubmit={handlePublicarPost}>
                        <div className="flex gap-5">
                            {renderAvatar(usuario, "w-14 h-14 text-xl rounded-2xl")}
                            <div className="w-full relative">
                                <textarea value={nuevoPost} onChange={handleTextareaChange} placeholder="Escribe un comunicado, usa @Todos para avisar a la empresa o @Nombre..." className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all resize-none h-24 shadow-inner" />
                                
                                <AnimatePresence>
                                    {mostrarMenciones && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-48 overflow-y-auto">
                                            <div className="bg-slate-100 px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Mencionar a:</div>
                                            {usuariosFiltradosParaMencion.map(u => (
                                                <div key={u.id} onClick={() => insertarMencion(u)} className="p-3 border-b border-slate-50 hover:bg-orange-50 cursor-pointer flex items-center gap-3 transition-colors">
                                                    {renderAvatar(u, "w-8 h-8 text-[10px] rounded-lg")}
                                                    <div><p className="text-slate-900 font-black text-xs uppercase">{u.nombre} {u.apellidos}</p></div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* ENCUESTA UI */}
                        {modoEncuesta && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-[76px] mt-4 space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Crear Encuesta</div>
                                {opcionesEncuesta.map((op, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input type="text" placeholder={`Opción ${idx + 1}...`} value={op} onChange={(e) => { const newOps = [...opcionesEncuesta]; newOps[idx] = e.target.value; setOpcionesEncuesta(newOps); }} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 outline-none focus:border-blue-500" />
                                        {idx > 1 && <button type="button" onClick={() => setOpcionesEncuesta(opcionesEncuesta.filter((_, i) => i !== idx))} className="p-2.5 text-red-500 hover:bg-red-100 rounded-xl"><Trash2 className="w-4 h-4"/></button>}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setOpcionesEncuesta([...opcionesEncuesta, ''])} className="text-blue-600 text-xs font-black hover:underline mt-2">+ Añadir opción</button>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {previewImagen && !modoEncuesta && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative mt-5 ml-[76px] border-[3px] border-slate-100 rounded-2xl overflow-hidden w-fit">
                                    <img src={previewImagen} alt="Preview" className="max-h-64 rounded-xl object-contain" />
                                    <button type="button" onClick={cancelarImagen} className="absolute top-3 right-3 p-2 bg-slate-900 text-white rounded-full hover:bg-red-500"><X className="w-4 h-4" /></button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100 ml-[76px]">
                            <div className="flex gap-2">
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleSelectImagen} className="hidden" />
                                <button type="button" onClick={() => {fileInputRef.current?.click(); setModoEncuesta(false)}} className={`p-3 rounded-xl transition-all flex items-center gap-2 border ${previewImagen ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}><ImageIcon className="w-5 h-5" /> <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Foto</span></button>
                                <button type="button" onClick={() => {setModoEncuesta(!modoEncuesta); cancelarImagen()}} className={`p-3 rounded-xl transition-all flex items-center gap-2 border ${modoEncuesta ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}><BarChart2 className="w-5 h-5" /> <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Encuesta</span></button>
                            </div>
                            
                            <button type="submit" disabled={!nuevoPost.trim() || publicando} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-10 py-4 rounded-[20px] font-black text-xs hover:shadow-orange-500/40 transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95">
                                {publicando ? <><Loader2 className="w-5 h-5 animate-spin"/> Subiendo...</> : <>Publicar <Send className="w-5 h-5"/></>}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-8 pb-10">
                    {cargandoFeed ? (
                        <div className="py-20 text-center flex flex-col items-center gap-4 text-white font-black uppercase text-sm drop-shadow-md"><Loader2 className="w-10 h-10 animate-spin text-orange-500"/> Sincronizando...</div>
                    ) : posts.length === 0 ? (
                        <div className="py-20 text-center text-white font-black text-xl drop-shadow-md">No hay publicaciones recientes.</div>
                    ) : posts.map((post) => {
                        const hasLiked = likesUsuarios[post.id]?.includes(usuario?.id);
                        const numLikes = likesUsuarios[post.id]?.length || 0;
                        const misVotos = votosEncuestas[post.id] || [];
                        const yaVote = misVotos.some(v => v.user_id === usuario?.id);
                        const totalVotos = misVotos.length;

                        return (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={post.id} className="bg-white/95 backdrop-blur-xl rounded-[40px] p-8 shadow-2xl border border-white relative">
                            
                            {/* Opciones de Edición/Borrado */}
                            {usuario?.id === post.autor?.id && (
                                <div className="absolute top-8 right-8">
                                    <button onClick={() => setPostOpcionesId(postOpcionesId === post.id ? null : post.id)} className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"><MoreVertical className="w-5 h-5" /></button>
                                    <AnimatePresence>
                                        {postOpcionesId === post.id && (
                                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20">
                                                <button onClick={() => { setPostEditandoId(post.id); setTextoEditado(post.contenido); setPostOpcionesId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5"/> Editar</button>
                                                <button onClick={() => borrarPost(post.id)} className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Borrar</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <div className="flex items-center gap-5 mb-6 pr-10">
                                {renderAvatar(post.autor, "w-14 h-14 text-xl rounded-2xl")}
                                <div>
                                    <h4 className="font-black text-slate-900 text-base uppercase leading-none">{post.autor?.nombre} {post.autor?.apellidos}</h4>
                                    <span className="inline-block mt-2 text-[9px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-md uppercase tracking-widest border border-orange-100">{post.autor?.rol_sistema || 'Equipo GEA'}</span>
                                </div>
                            </div>
                            
                            {postEditandoId === post.id ? (
                                <div className="ml-[76px] mb-6">
                                    <textarea value={textoEditado} onChange={(e) => setTextoEditado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-400 mb-3 resize-none h-24" />
                                    <div className="flex gap-2">
                                        <button onClick={() => setPostEditandoId(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                        <button onClick={() => guardarEdicion(post.id)} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md">Guardar Cambios</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-800 text-[15px] font-bold leading-relaxed mb-6 whitespace-pre-line ml-[76px]">
                                    {(post.contenido || '').split(/(@[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/).map((part: string, i: number) => 
                                        part.startsWith('@') ? <span key={i} className="text-blue-600 bg-blue-50 px-1 rounded cursor-pointer font-black">{part}</span> : part
                                    )}
                                </p>
                            )}
                            
                            {/* ENCUESTA */}
                            {post.tipo === 'encuesta' && post.opciones && (
                                <div className="ml-[76px] mb-6 space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Resultados de Encuesta ({totalVotos} votos)</div>
                                    {post.opciones.map((op: string, idx: number) => {
                                        const votosOpcion = misVotos.filter(v => v.opcion_index === idx).length;
                                        const porcentaje = totalVotos > 0 ? Math.round((votosOpcion / totalVotos) * 100) : 0;
                                        const miVoto = misVotos.some(v => v.user_id === usuario?.id && v.opcion_index === idx);
                                        return (
                                            <div key={idx} onClick={() => !yaVote && votarEncuesta(post.id, idx)} className={`relative overflow-hidden rounded-2xl border-2 p-4 cursor-pointer transition-all ${yaVote ? 'cursor-default' : 'hover:border-blue-400'} ${miVoto ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                                                <div className="absolute top-0 left-0 bottom-0 bg-blue-100/50 transition-all duration-1000" style={{ width: `${porcentaje}%` }} />
                                                <div className="relative z-10 flex justify-between items-center">
                                                    <span className="text-sm font-bold text-slate-800">{op}</span>
                                                    {yaVote && <span className="text-xs font-black text-blue-600">{porcentaje}%</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {post.imagen_url && post.tipo !== 'encuesta' && (
                                <div className="ml-[76px] border-[3px] border-slate-100 rounded-3xl overflow-hidden shadow-md bg-slate-50 mb-6 flex justify-center">
                                    <img src={post.imagen_url} alt="GEA Solaris" className="max-h-[500px] w-auto object-cover" />
                                </div>
                            )}

                            <div className="flex items-center gap-8 pt-6 border-t border-slate-100 ml-[76px]">
                                <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-3 transition-colors group ${hasLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}>
                                    <Heart className={`w-6 h-6 group-active:scale-75 transition-transform ${hasLiked ? 'fill-red-500' : ''}`} /> 
                                    <span className="text-xs font-black">{numLikes}</span>
                                </button>
                                <button onClick={() => toggleComentarios(post.id)} className="flex items-center gap-3 text-slate-400 hover:text-blue-500 transition-colors">
                                    <MessageSquare className="w-6 h-6" /> 
                                    <span className="text-xs font-black">{(comentariosData[post.id] || []).length || 0}</span>
                                </button>
                            </div>

                            <AnimatePresence>
                                {comentariosVisibles[post.id] && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ml-[76px] mt-6 bg-slate-50 rounded-3xl p-6 border border-slate-100 overflow-hidden">
                                        <div className="space-y-4 mb-6">
                                            {(comentariosData[post.id] || []).length === 0 ? <p className="text-xs text-slate-400 font-bold italic">Nadie ha comentado aún.</p> : (comentariosData[post.id] || []).map(com => (
                                                <div key={com.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3">
                                                    {renderAvatar(com.autor, "w-8 h-8 text-[10px] rounded-lg")}
                                                    <div className="flex-1">
                                                        <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{com.autor?.nombre} {com.autor?.apellidos}</span>
                                                        <p className="text-slate-700 text-sm font-bold mt-1">{com.contenido}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <input type="text" value={nuevoComentario[post.id] || ''} onChange={e => setNuevoComentario({...nuevoComentario, [post.id]: e.target.value})} placeholder="Escribe un comentario..." onKeyDown={e => e.key === 'Enter' && publicarComentario(post.id)} className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-orange-500" />
                                            <button onClick={() => publicarComentario(post.id)} className="bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-orange-500 transition-colors shadow-md"><Send className="w-5 h-5" /></button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </motion.div>
                    )})}
                </div>
            </section>

            {/* COLUMNA 3: WIDGETS (CALENDARIO Y VACACIONES) */}
            <aside className="col-span-1 lg:col-span-3 space-y-8">
                
                {/* WIDGET GESTIÓN VACACIONES */}
                <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white flex flex-col max-h-[350px]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-3 shrink-0"><PlaneTakeoff className="w-4 h-4 text-blue-500"/> Solicitudes Ausencia</h3>
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {solicitudesVacaciones.length === 0 ? <p className="text-xs text-slate-400 font-bold text-center py-4">No hay solicitudes recientes.</p> : solicitudesVacaciones.map((sol) => (
                            <div key={sol.id} className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {renderAvatar(sol.empleado, "w-6 h-6 text-[8px] rounded-md")}
                                        <p className="text-[10px] font-black uppercase leading-tight text-slate-800">{sol.empleado?.nombre}</p>
                                    </div>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border
                                        ${sol.estado === 'Aprobada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                          sol.estado === 'Rechazada' ? 'bg-red-100 text-red-700 border-red-200' : 
                                          'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                        {sol.estado === 'Aprobada' && <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5"/>}
                                        {sol.estado === 'Rechazada' && <XCircle className="w-3 h-3 inline mr-1 -mt-0.5"/>}
                                        {sol.estado === 'Pendiente' && <Clock className="w-3 h-3 inline mr-1 -mt-0.5"/>}
                                        {sol.estado}
                                    </span>
                                </div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                    Solicita {sol.dias_solicitados} días ({sol.fecha_inicio} / {sol.fecha_fin})
                                </div>
                                
                                {/* BOTONES APROBACIÓN (SOLO PARA EL JEFE) */}
                                {sol.empleado?.jefe_id === usuario?.id && sol.estado === 'Pendiente' && (
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => responderSolicitud(sol.id, 'Aprobada')} className="flex-1 bg-emerald-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">Aprobar</button>
                                        <button onClick={() => responderSolicitud(sol.id, 'Rechazada')} className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">Rechazar</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CALENDARIO TOOLTIP */}
                <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <button onClick={() => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{mesesNombres[fechaCalendario.getMonth()]} {fechaCalendario.getFullYear()}</h3>
                        <button onClick={() => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['D','L','M','M','J','V','S'].map((d, i) => <div key={i} className="text-[10px] font-black text-slate-400">{d}</div>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 relative">
                        {Array.from({ length: diaInicioMes }).map((_, i) => <div key={`empty-${i}`} className="h-8" />)}
                        
                        {Array.from({ length: diasEnMes }).map((_, i) => {
                            const diaActual = i + 1;
                            const eventosDia = eventosCombinados.filter(e => e.mes === fechaCalendario.getMonth() && e.dia === diaActual);
                            const esHoy = new Date().getDate() === diaActual && new Date().getMonth() === fechaCalendario.getMonth() && new Date().getFullYear() === fechaCalendario.getFullYear();
                            
                            return (
                                <div 
                                    key={diaActual} 
                                    onMouseEnter={() => setHoveredDay(diaActual)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all relative
                                    ${esHoy ? 'bg-slate-900 text-white shadow-md' : eventosDia.length > 0 ? 'bg-orange-100 text-orange-600 border border-orange-200 cursor-pointer hover:bg-orange-500 hover:text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {diaActual}
                                    <AnimatePresence>
                                        {hoveredDay === diaActual && eventosDia.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl z-50 pointer-events-none">
                                                {eventosDia.map((ev, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 mb-1.5 last:mb-0">
                                                        {ev.tipo === 'cumple' ? <Cake className="w-3.5 h-3.5 text-pink-400 shrink-0"/> : <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>}
                                                        <span className="text-[10px] font-black leading-tight">{ev.titulo}</span>
                                                    </div>
                                                ))}
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                {/* LISTA DE EVENTOS FUTUROS */}
                <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white flex flex-col max-h-[350px]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-3 shrink-0"><CalendarIcon className="w-4 h-4 text-emerald-500"/> Próximos Eventos</h3>
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {eventosFuturos.length === 0 ? <p className="text-xs text-slate-400 font-bold text-center py-4">No hay eventos próximos.</p> : eventosFuturos.map((ev) => (
                            <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-colors group">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${ev.tipo === 'cumple' ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {ev.tipo === 'cumple' ? ev.iniciales : ev.dia}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[11px] font-black uppercase leading-tight text-slate-800 truncate">{ev.titulo}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{ev.dia} {mesesNombres[ev.mes]}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </aside>
        </div>
      </main>
    </div>
  )
}