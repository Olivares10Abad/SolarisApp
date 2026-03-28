import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { 
  BarChart3, Users, LayoutGrid, Package, LayoutDashboard, Wrench, Zap, PencilRuler, CalendarCheck, 
  Banknote, FileText, LogOut, Bell, Image as ImageIcon, Send, MessageSquare, Heart, Cake, 
  Calendar as CalendarIcon, X, Loader2, MoreVertical, Trash2, Edit2, ChevronLeft, ChevronRight, BarChart2,
  CheckCircle2, XCircle, Clock, PlaneTakeoff, Menu, MapPin, UserCircle
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

const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [mostrarPanelDerecho, setMostrarPanelDerecho] = useState(false)
  
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
  const [mostrarMenciones, setMostrarMenciones] = useState(false)
  const [busquedaMencion, setBusquedaMencion] = useState('')
  const [posicionCursor, setPosicionCursor] = useState(0)
  const [idsMencionados, setIdsMencionados] = useState<string[]>([])
  
  // Interacciones & Edición
  const [likesUsuarios, setLikesUsuarios] = useState<Record<string, string[]>>({})
  const [votosEncuestas, setVotosEncuestas] = useState<Record<string, any[]>>({})
  const [postEditandoId, setPostEditandoId] = useState<string | null>(null)
  const [textoEditado, setTextoEditado] = useState('')
  const [comentariosVisibles, setComentariosVisibles] = useState<Record<string, boolean>>({})
  const [comentariosData, setComentariosData] = useState<Record<string, any[]>>({})
  const [comentariosCounts, setComentariosCounts] = useState<Record<string, number>>({})
  const [nuevoComentario, setNuevoComentario] = useState<Record<string, string>>({})
  const [verLikesModal, setVerLikesModal] = useState<string[] | null>(null)
  const [mostrarMenuNotificaciones, setMostrarMenuNotificaciones] = useState(false)
  
  // Calendario
  const [fechaCalendario, setFechaCalendario] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  // --- LÓGICA DE TIEMPO ---
  const formatearFechaPost = (fechaStr: string) => {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // --- SCROLL LOCK ---
  useEffect(() => {
    document.body.style.overflow = (menuMovilAbierto || mostrarPanelDerecho || verLikesModal) ? 'hidden' : 'unset';
  }, [menuMovilAbierto, mostrarPanelDerecho, verLikesModal]);

  // --- PWA: SOLICITAR PERMISOS PUSH ---
  const solicitarPermisoPush = async () => {
    if ('Notification' in window) {
      const permiso = await Notification.requestPermission();
      if (permiso === 'granted') console.log('Push habilitado');
    }
  }

  useEffect(() => {
    const sessionData = localStorage.getItem('session_gea_solar')
    if (!sessionData) navigate('/login')
    else {
      const user = JSON.parse(sessionData);
      setUsuario(user);
      cargarDatosIniciales(user.id);
      solicitarPermisoPush();
    }
  }, [navigate])

  const cargarDatosIniciales = async (userId: string) => {
    setCargandoFeed(true);
    const { data: users } = await supabase.from('perfiles').select('id, nombre, apellidos, rol_sistema, avatar_url');
    if (users) {
        setUsuariosDb(users);
        const me = users.find(u => u.id === userId);
        if (me) setUsuario(me);
    }
    const { data: feed } = await supabase.from('muro_social').select(`*, autor:perfiles!user_id(id, nombre, apellidos, rol_sistema, avatar_url)`).order('creado_at', { ascending: false });
    if (feed) setPosts(feed);

    const { data: comms } = await supabase.from('comentarios_muro').select('post_id');
    if (comms) {
        const counts: Record<string, number> = {};
        comms.forEach(c => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
        setComentariosCounts(counts);
    }

    const { data: solicitudes } = await supabase.from('solicitudes_ausencia').select(`*, empleado:perfiles!user_id(id, nombre, apellidos, avatar_url, jefe_id)`).order('creado_at', { ascending: false }).limit(10);
    if (solicitudes) setSolicitudesVacaciones(solicitudes);
    
    const { data: likes } = await supabase.from('likes_muro').select('*');
    if (likes) {
        const map: Record<string, string[]> = {};
        likes.forEach(l => { if(!map[l.post_id]) map[l.post_id] = []; map[l.post_id].push(l.user_id); });
        setLikesUsuarios(map);
    }
    
    const { data: votos } = await supabase.from('votos_encuesta').select('*');
    if (votos) {
        const map: Record<string, any[]> = {};
        votos.forEach(v => { if(!map[v.post_id]) map[v.post_id] = []; map[v.post_id].push(v); });
        setVotosEncuestas(map);
    }
    await cargarNotificaciones(userId);
    setCargandoFeed(false);
  }

  const cargarNotificaciones = async (userId: string) => {
    const { data } = await supabase.from('notificaciones').select(`*, autor:perfiles!autor_id(nombre, apellidos, avatar_url)`).eq('usuario_id', userId).order('creado_at', { ascending: false });
    if (data) setNotificaciones(data);
  }

  const renderAvatar = (userObj: any, size: string = "w-10 h-10 md:w-12 md:h-12 rounded-2xl") => {
      if (userObj?.avatar_url) return <img src={userObj.avatar_url} alt="Avatar" className={`${size} object-cover shadow-sm shrink-0`} />;
      return <div className={`${size} bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black shadow-sm shrink-0 uppercase text-xs`}>{userObj?.nombre?.charAt(0)}</div>;
  }

  const responderSolicitud = async (id: string, estado: 'Aprobada' | 'Rechazada') => {
      await supabase.from('solicitudes_ausencia').update({ estado, revisado_por: usuario.id }).eq('id', id);
      setSolicitudesVacaciones(solicitudesVacaciones.map(s => s.id === id ? { ...s, estado } : s));
  }

  // --- LÓGICA CALENDARIO ---
  const diaInicioMes = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth(), 1).getDay();
  const diasEnMes = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 0).getDate();

  const eventosCombinados = useMemo(() => {
    const añoActual = new Date().getFullYear();
    const arr: any[] = [];
    festivosMexico.forEach(f => {
        const date = new Date(añoActual, f.mes, f.dia);
        arr.push({ id: `F${f.mes}${f.dia}`, tipo: 'festivo', titulo: f.titulo, date, mes: f.mes, dia: f.dia });
    });
    usuariosDb.forEach(u => {
        if (u.fecha_nacimiento) {
            const [, m, d] = u.fecha_nacimiento.split('-');
            const date = new Date(añoActual, parseInt(m)-1, parseInt(d));
            arr.push({ id: `C${u.id}`, tipo: 'cumple', titulo: `Cumpleaños de ${u.nombre}`, date, mes: parseInt(m)-1, dia: parseInt(d), iniciales: `${u.nombre.charAt(0)}` });
        }
    });
    return arr.sort((a,b) => a.date.getTime() - b.date.getTime());
  }, [usuariosDb]);

  const eventosFuturos = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return eventosCombinados.filter(e => e.date >= hoy).slice(0, 10);
  }, [eventosCombinados]);

  // --- GESTIÓN PUBLICACIÓN ---
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
    setImagenSeleccionada(null); setPreviewImagen(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value; setNuevoPost(texto);
    const cursor = e.target.selectionStart;
    const match = texto.substring(0, cursor).match(/@([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*)$/);
    if (match && !texto.toLowerCase().includes('@todos')) {
        setBusquedaMencion(match[1]); setPosicionCursor(cursor || 0); setMostrarMenciones(true);
    } else { setMostrarMenciones(false); }
  }

  const insertarMencion = (u: any) => {
    const textoAntes = nuevoPost.substring(0, posicionCursor).replace(/@[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, '');
    const textoDespues = nuevoPost.substring(posicionCursor);
    setNuevoPost(`${textoAntes}@${u.nombre} ${u.apellidos} ${textoDespues}`);
    setMostrarMenciones(false);
    if (!idsMencionados.includes(u.id)) setIdsMencionados([...idsMencionados, u.id]);
  }

  const handlePublicarPost = async (e: React.FormEvent) => {
    e.preventDefault(); if (!nuevoPost.trim() || publicando || !usuario?.id) return;
    if (modoEncuesta && opcionesEncuesta.some(op => !op.trim())) return alert('Llena las opciones.');
    setPublicando(true);
    try {
        let url = null;
        if (imagenSeleccionada) {
            const path = `${usuario.id}_${Date.now()}`;
            await supabase.storage.from('post_images').upload(path, imagenSeleccionada);
            url = supabase.storage.from('post_images').getPublicUrl(path).data.publicUrl;
        }
        const payload = { user_id: usuario.id, contenido: nuevoPost, imagen_url: url, tipo: modoEncuesta ? 'encuesta' : 'texto', opciones: modoEncuesta ? opcionesEncuesta.filter(o => o.trim() !== '') : [] };
        const { data, error } = await supabase.from('muro_social').insert([payload]).select(`*, autor:perfiles!user_id(id, nombre, apellidos, rol_sistema, avatar_url)`).single();
        if (!error && data) setPosts([data, ...posts]);
        setNuevoPost(''); setImagenSeleccionada(null); setPreviewImagen(null); setModoEncuesta(false); setOpcionesEncuesta(['','']); setIdsMencionados([]);
    } catch (err) { console.error(err); } finally { setPublicando(false); }
  }

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

  const guardarEdicion = async (id: string) => {
    if (!textoEditado.trim()) return;
    await supabase.from('muro_social').update({ contenido: textoEditado }).eq('id', id);
    setPosts(posts.map(p => p.id === id ? { ...p, contenido: textoEditado } : p));
    setPostEditandoId(null);
  }

  const borrarPost = async (id: string) => {
    if(!confirm('¿Eliminar publicación?')) return;
    await supabase.from('muro_social').delete().eq('id', id);
    setPosts(posts.filter(p => p.id !== id));
  }

  const toggleComentarios = async (postId: string) => {
      const visible = !comentariosVisibles[postId];
      setComentariosVisibles({ ...comentariosVisibles, [postId]: visible });
      if (visible && !comentariosData[postId]) {
          const { data } = await supabase.from('comentarios_muro').select('*, autor:perfiles!user_id(nombre, apellidos, avatar_url)').eq('post_id', postId).order('creado_at', { ascending: true });
          if(data) setComentariosData({ ...comentariosData, [postId]: data });
      }
  }

  const publicarComentario = async (postId: string) => {
      const text = nuevoComentario[postId]; if(!text?.trim()) return;
      const { data } = await supabase.from('comentarios_muro').insert([{ post_id: postId, user_id: usuario.id, contenido: text }]).select('*, autor:perfiles!user_id(nombre, apellidos, avatar_url)').single();
      if (data) {
          setComentariosData({ ...comentariosData, [postId]: [...(comentariosData[postId] || []), data] });
          setComentariosCounts({ ...comentariosCounts, [postId]: (comentariosCounts[postId] || 0) + 1 });
          setNuevoComentario({ ...nuevoComentario, [postId]: '' });
      }
  }

  const votarEncuesta = async (postId: string, opcionIndex: number) => {
      const misVotos = votosEncuestas[postId] || [];
      if (misVotos.some(v => v.user_id === usuario.id)) return; 
      await supabase.from('votos_encuesta').insert([{ post_id: postId, user_id: usuario.id, opcion_index: opcionIndex }]);
      setVotosEncuestas({...votosEncuestas, [postId]: [...misVotos, { post_id: postId, user_id: usuario.id, opcion_index: opcionIndex }]});
  }

  // --- WIDGET CALENDARIO HOMOLOGADO ---
  const WidgetCalendario = () => (
      <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white">
          <div className="flex items-center justify-between mb-4 px-2">
              <button onClick={() => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() - 1, 1))}><ChevronLeft size={16}/></button>
              <h3 className="text-[11px] font-black uppercase tracking-widest">{mesesNombres[fechaCalendario.getMonth()]} {fechaCalendario.getFullYear()}</h3>
              <button onClick={() => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 1))}><ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
              {['D','L','M','M','J','V','S'].map((d, i) => <div key={`dn-${i}`} className="text-[8px] font-black text-slate-400">{d}</div>)}
              {Array.from({ length: diaInicioMes }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                  const dia = i + 1;
                  const tieneEv = eventosCombinados.some(e => e.mes === fechaCalendario.getMonth() && e.dia === dia);
                  const esHoy = new Date().getDate() === dia && new Date().getMonth() === fechaCalendario.getMonth();
                  return (
                    <div key={`d-${i}`} onMouseEnter={() => setHoveredDay(dia)} onMouseLeave={() => setHoveredDay(null)} className={`h-7 flex items-center justify-center rounded-lg text-[10px] font-bold relative transition-all ${esHoy ? 'bg-slate-900 text-white shadow-md' : tieneEv ? 'bg-orange-100 text-orange-600 border border-orange-200 cursor-pointer' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {dia}
                        <AnimatePresence>
                          {hoveredDay === dia && tieneEv && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-2 bg-slate-900 text-white p-2 rounded-xl z-50 w-32 pointer-events-none text-[8px] font-bold">
                              {eventosCombinados.filter(e => e.mes === fechaCalendario.getMonth() && e.dia === dia).map((ev, idx) => (<div key={idx} className="flex items-center gap-1 mb-1 last:mb-0"><div className={`w-1 h-1 rounded-full ${ev.tipo === 'cumple' ? 'bg-pink-400' : 'bg-orange-400'}`} /> {ev.titulo}</div>))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                  )
              })}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover overflow-x-hidden" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />

      {/* NAV BAR */}
      <nav className="bg-white/95 backdrop-blur-2xl border-b border-white/20 sticky top-0 z-[60] shadow-lg h-16 flex items-center relative">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setMenuMovilAbierto(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"><Menu size={24} /></button>
            <img src={solarisLogo} alt="GEA" className="h-6 md:h-8 w-auto drop-shadow-sm" />
            <h1 className="font-black text-sm md:text-lg tracking-tight text-slate-900 uppercase italic hidden sm:block tracking-tighter">Intranet GEA</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-5">
            <button onClick={() => setMostrarPanelDerecho(!mostrarPanelDerecho)} className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all relative">
                <LayoutGrid size={24} /><span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </button>
            <div className="relative">
                <button onClick={() => setMostrarMenuNotificaciones(!mostrarMenuNotificaciones)} className="p-2 text-slate-500 hover:text-orange-500 rounded-full transition-all relative"><Bell size={24} />{notificaciones.filter(n=>!n.leida).length > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-black text-white">{notificaciones.filter(n=>!n.leida).length}</span>}</button>
                <AnimatePresence>{mostrarMenuNotificaciones && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"><div className="bg-slate-900 p-4 text-white font-black text-xs uppercase flex justify-between items-center">Alertas <button onClick={() => setMostrarMenuNotificaciones(false)}><X size={16}/></button></div><div className="max-h-80 overflow-y-auto">{notificaciones.length === 0 ? <div className="p-6 text-center text-slate-400 text-xs font-bold">Sin alertas.</div> : notificaciones.map(notif => (<div key={notif.id} className={`p-4 border-b border-slate-50 ${!notif.leida ? 'bg-orange-50/50' : ''}`}><p className="text-xs text-slate-800 leading-tight font-bold"><span className="text-orange-600">{notif.autor?.nombre}</span> {notif.mensaje}</p></div>))}</div></motion.div>)}</AnimatePresence>
            </div>
            <div onClick={() => navigate('/perfil')} className="bg-white px-2 md:px-4 py-1.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors">{renderAvatar(usuario, "w-8 h-8 rounded-lg")}<div className="text-right flex flex-col hidden sm:flex"><span className="text-[10px] font-black text-slate-900 uppercase leading-none">{usuario?.nombre}</span><span className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{usuario?.rol_sistema || 'GEA'}</span></div></div>
          </div>
        </div>
      </nav>

      {/* MENU MOVIL IZQUIERDO */}
      <AnimatePresence>
        {menuMovilAbierto && (
            <div className="fixed inset-0 z-[100] lg:hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMenuMovilAbierto(false)} />
                <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col">
                    <div className="p-6 flex justify-between items-center border-b border-slate-50"><img src={solarisLogo} alt="GEA" className="h-6" /><button onClick={() => setMenuMovilAbierto(false)} className="p-2 bg-slate-100 rounded-lg"><X size={20}/></button></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
                        {modulosMenu.map((mod) => (<button key={mod.nombre} onClick={() => {navigate(mod.ruta); setMenuMovilAbierto(false)}} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${mod.bg}`}><div className={`p-2 rounded-lg bg-white shadow-sm border border-slate-100 ${mod.color}`}><mod.icono size={18} /></div><span className="font-black text-[10px] uppercase tracking-widest text-slate-600">{mod.nombre}</span></button>))}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* PANEL DERECHO (WIDGETS) MOVIL */}
      <AnimatePresence>
        {mostrarPanelDerecho && (
            <div className="fixed inset-0 z-[100] lg:hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMostrarPanelDerecho(false)} />
                <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute inset-y-0 right-0 w-80 bg-white shadow-2xl flex flex-col">
                    <div className="p-6 flex justify-between items-center border-b border-slate-50"><h3 className="font-black text-xs uppercase text-slate-900 italic">Utilidades</h3><button onClick={() => setMostrarPanelDerecho(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-20">
                        <WidgetCalendario />
                        <div className="bg-slate-50 rounded-[30px] p-6 border border-slate-100"><h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-3"><PlaneTakeoff size={18} className="text-blue-500"/> Solicitudes</h3><div className="space-y-3">{solicitudesVacaciones.map((sol) => (<div key={sol.id} className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm"><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-slate-800 uppercase leading-none">{sol.empleado?.nombre}</span><span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${sol.estado === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{sol.estado}</span></div><p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{sol.fecha_inicio} / {sol.fecha_fin}</p></div>))}</div></div>
                    </div>
                </motion.aside>
            </div>
        )}
      </AnimatePresence>

      <main className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10 flex gap-8">
        
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white sticky top-24 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-3">Estructura ERP</h3>
                <div className="space-y-1">
                    {modulosMenu.map((mod) => (<button key={mod.nombre} onClick={() => navigate(mod.ruta)} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${mod.bg}`}><div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform ${mod.color}`}><mod.icono size={16} /></div><span className="font-black text-[10px] uppercase tracking-widest text-slate-600 group-hover:text-slate-900">{mod.nombre}</span></button>))}
                </div>
            </div>
        </aside>

        {/* FEED CENTRAL */}
        <section className="flex-1 space-y-6 min-w-0">
            {/* PUBLICAR */}
            <div className="bg-white/95 backdrop-blur-xl rounded-[30px] p-5 md:p-8 shadow-2xl border border-white relative z-20">
                <form onSubmit={handlePublicarPost}>
                    <div className="flex gap-3 md:gap-5">
                        {renderAvatar(usuario)}
                        <div className="flex-1 relative">
                            <textarea value={nuevoPost} onChange={handleTextareaChange} placeholder="Escribe un comunicado..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all resize-none h-24 shadow-inner" />
                            <AnimatePresence>
                                {mostrarMenciones && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-48 overflow-y-auto">
                                        {usuariosDb.filter(u=>`${u.nombre} ${u.apellidos}`.toLowerCase().includes(busquedaMencion.toLowerCase())).map(u=>(<div key={u.id} onClick={()=>insertarMencion(u)} className="p-3 border-b hover:bg-orange-50 cursor-pointer flex items-center gap-3">{renderAvatar(u, "w-8 h-8 text-[10px] rounded-lg")}<p className="text-slate-900 font-black text-[10px] uppercase">{u.nombre} {u.apellidos}</p></div>))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    {modoEncuesta && (
                        <div className="mt-4 ml-[52px] md:ml-[76px] space-y-2 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            {opcionesEncuesta.map((op, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input type="text" placeholder={`Opción ${idx + 1}`} value={op} onChange={(e) => { const newOps = [...opcionesEncuesta]; newOps[idx] = e.target.value; setOpcionesEncuesta(newOps); }} className="flex-1 bg-white border border-blue-100 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                                    {opcionesEncuesta.length > 2 && <button type="button" onClick={() => setOpcionesEncuesta(opcionesEncuesta.filter((_, i) => i !== idx))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><X size={14}/></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => setOpcionesEncuesta([...opcionesEncuesta, ''])} className="text-[10px] font-black text-blue-600 uppercase">+ Añadir opción</button>
                        </div>
                    )}
                    {previewImagen && !modoEncuesta && (<div className="relative mt-4 ml-[52px] md:ml-[76px] w-fit"><img src={previewImagen} alt="Preview" className="max-h-40 rounded-xl shadow-md border-2 border-white" /><button type="button" onClick={cancelarImagen} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={12}/></button></div>)}
                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100 ml-[52px] md:ml-[76px]">
                        <div className="flex gap-2">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleSelectImagen} className="hidden" />
                            <button type="button" onClick={() => {fileInputRef.current?.click(); setModoEncuesta(false)}} className={`p-2.5 rounded-xl transition-colors ${previewImagen ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-100'}`}><ImageIcon size={20} /></button>
                            <button type="button" onClick={() => {setModoEncuesta(!modoEncuesta); setPreviewImagen(null);}} className={`p-2.5 rounded-xl transition-colors ${modoEncuesta ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}><BarChart2 size={20} /></button>
                        </div>
                        <button type="submit" disabled={publicando || !nuevoPost.trim()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-orange-500 transition-all active:scale-95">{publicando ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Send size={16}/> Publicar</>}</button>
                    </div>
                </form>
            </div>

            {/* LISTA POSTS */}
            <div className="space-y-6 pb-20">
                {posts.map((post) => {
                    const hasLiked = likesUsuarios[post.id]?.includes(usuario?.id);
                    const misVotos = votosEncuestas[post.id] || [];
                    const cCount = comentariosCounts[post.id] || 0;
                    return (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={post.id} className="bg-white/95 backdrop-blur-xl rounded-[30px] p-5 md:p-8 shadow-2xl border border-white relative">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">{renderAvatar(post.autor)}<div><h4 className="font-black text-slate-950 text-sm md:text-base uppercase leading-none italic">{post.autor?.nombre} {post.autor?.apellidos}</h4><p className="text-[10px] font-bold text-slate-400 mt-2 uppercase flex items-center gap-1.5"><Clock size={10} className="text-orange-500"/> {formatearFechaPost(post.creado_at)}</p></div></div>
                                {usuario?.id === post.autor?.id && (<div className="flex gap-2"><button onClick={() => { setPostEditandoId(post.id); setTextoEditado(post.contenido); }} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button><button onClick={() => borrarPost(post.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>)}
                            </div>
                            {postEditandoId === post.id ? (
                                <div className="mb-6 space-y-3"><textarea value={textoEditado} onChange={e => setTextoEditado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 h-24 shadow-inner" /><div className="flex gap-2"><button onClick={() => setPostEditandoId(null)} className="px-4 py-2 text-xs font-black uppercase text-slate-400">Cancelar</button><button onClick={() => guardarEdicion(post.id)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-lg">Guardar</button></div></div>
                            ) : (<p className="text-slate-800 text-sm md:text-[15px] font-bold leading-relaxed mb-6 whitespace-pre-line italic">{(post.contenido || '').split(/(@[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/).map((part, i) => part.startsWith('@') ? <span key={i} className="text-blue-600 bg-blue-50 px-1 rounded font-black">{part}</span> : part)}</p>)}
                            
                            {post.tipo === 'encuesta' && post.opciones && (<div className="mb-6 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">{post.opciones.map((op: string, idx: number) => { const total = misVotos.length; const vOp = misVotos.filter(v => v.opcion_index === idx).length; const pct = total > 0 ? Math.round((vOp / total) * 100) : 0; return (<div key={idx} onClick={() => votarEncuesta(post.id, idx)} className="relative h-10 border-2 border-slate-200 rounded-xl flex items-center px-4 cursor-pointer overflow-hidden bg-white"><div className="absolute left-0 top-0 bottom-0 bg-blue-100 transition-all duration-1000" style={{ width: `${pct}%` }} /><span className="relative z-10 text-[10px] font-black uppercase text-slate-700">{op}</span><span className="relative z-10 ml-auto text-[10px] font-black text-blue-600">{pct}%</span></div>)})}</div>)}
                            {post.imagen_url && <img src={post.imagen_url} alt="Post" className="rounded-3xl w-full h-auto mb-6 shadow-sm border border-slate-100" />}

                            <div className="flex gap-6 pt-6 border-t border-slate-100">
                                <button type="button" className={`flex items-center gap-2 font-black text-[10px] transition-colors ${hasLiked ? 'text-red-500' : 'text-slate-400'}`}>
                                    <Heart size={20} className={hasLiked ? 'fill-red-500' : ''} onClick={() => toggleLike(post.id)} /> 
                                    <span onClick={() => setVerLikesModal(likesUsuarios[post.id] || [])} className="hover:underline cursor-pointer">{(likesUsuarios[post.id] || []).length}</span>
                                </button>
                                <button onClick={() => toggleComentarios(post.id)} className="flex items-center gap-2 font-black text-[10px] text-slate-400 hover:text-blue-500"><MessageSquare size={20} /> {cCount}</button>
                            </div>
                            <AnimatePresence>{comentariosVisibles[post.id] && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0 }} className="mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-100"><div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">{(comentariosData[post.id] || []).map(com => (<div key={com.id} className="flex gap-3">{renderAvatar(com.autor, "w-8 h-8 rounded-lg")}<div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex-1"><p className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1">{com.autor?.nombre}</p><p className="text-xs font-bold text-slate-600 leading-tight">{com.contenido}</p></div></div>))}</div><div className="flex gap-2"><input type="text" value={nuevoComentario[post.id] || ''} onChange={e => setNuevoComentario({...nuevoComentario, [post.id]: e.target.value})} placeholder="Comentar..." onKeyDown={e => e.key === 'Enter' && publicarComentario(post.id)} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-orange-500 shadow-inner" /><button onClick={() => publicarComentario(post.id)} className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md"><Send size={16}/></button></div></motion.div>)}</AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>
        </section>

        {/* SIDEBAR DERECHA */}
        <aside className="hidden xl:block w-80 shrink-0">
            <div className="space-y-8 sticky top-24">
                <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-3"><PlaneTakeoff size={18} className="text-blue-500"/> Solicitudes</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {solicitudesVacaciones.map((sol) => (<div key={sol.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm"><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-slate-800 uppercase leading-none">{sol.empleado?.nombre}</span><span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${sol.estado === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{sol.estado}</span></div><p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{sol.fecha_inicio} / {sol.fecha_fin}</p></div>))}
                    </div>
                </div>
                <WidgetCalendario />
                <div className="bg-white/95 backdrop-blur-xl rounded-[35px] p-6 shadow-2xl border border-white max-h-[300px] overflow-hidden flex flex-col"><h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-3 shrink-0"><CalendarIcon size={18} className="text-emerald-500"/> Próximos</h3><div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">{eventosFuturos.map((ev) => (<div key={ev.id} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-orange-200 transition-colors"><div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shadow-sm ${ev.tipo === 'cumple' ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-600'}`}>{ev.dia}</div><p className="text-[9px] font-black text-slate-800 uppercase truncate flex-1">{ev.titulo}</p></div>))}</div></div>
            </div>
        </aside>
      </main>

      {/* MODAL LIKES */}
      <AnimatePresence>{verLikesModal && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" onClick={() => setVerLikesModal(null)}><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[35px] w-full max-w-xs overflow-hidden shadow-2xl border border-white" onClick={e => e.stopPropagation()}><div className="p-6 bg-slate-900 text-white flex justify-between items-center font-black uppercase text-[10px] tracking-widest">Reacciones <button onClick={() => setVerLikesModal(null)}><X size={16}/></button></div><div className="p-4 max-h-60 overflow-y-auto space-y-3">{verLikesModal.map(uid => { const u = usuariosDb.find(x => x.id === uid); return (<div key={uid} className="flex items-center gap-3">{renderAvatar(u, "w-8 h-8 rounded-lg")}<p className="text-xs font-black text-slate-900 uppercase">{u?.nombre} {u?.apellidos}</p></div>)})}</div></motion.div></div>)}</AnimatePresence>
    </div>
  )
}