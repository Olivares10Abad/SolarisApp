import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Search, X, Save,
  Building2, Briefcase, UserPlus, Mail, Phone, Users,
  Network, ShieldCheck, Check, Award,
  GitGraph, Minimize2, MapPin, Calendar, Fingerprint, Zap,
  FileText, FileBadge, Eye, UserCircle, ZoomIn, ZoomOut, Bell, BellRing, CheckCircle2,
  Wrench, Wallet, Package
} from 'lucide-react'

import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

// IMPORTAR COMPONENTES GLOBALES
import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'

// --- HELPER PARA COLORES DE ROLES ---
const getEstiloRol = (rol: string) => {
  const r = rol?.toLowerCase() || ''
  if (r.includes('director')) return 'bg-purple-50 text-purple-700 border-purple-100'
  if (r.includes('gerente')) return 'bg-blue-50 text-blue-700 border-blue-100'
  if (r.includes('coord')) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (r.includes('analista')) return 'bg-amber-50 text-amber-700 border-amber-100'
  if (r.includes('ingenier')) return 'bg-orange-50 text-orange-700 border-orange-100'
  return 'bg-slate-50 text-slate-600 border-slate-100'
}

// --- NODO DEL ORGANIGRAMA ---
const NodoOrganigrama = ({ usuario, todosLosUsuarios, busqueda }: any) => {
  const subordinados = todosLosUsuarios.filter((u: any) => u.jefe_id === usuario.id);
  const estaResaltado = busqueda && (usuario.nombre + ' ' + usuario.apellidos).toLowerCase().includes(busqueda.toLowerCase());

  return (
    <div className="flex flex-col items-center relative">
      <motion.div animate={estaResaltado ? { scale: 1.1 } : { scale: 1 }} className={`relative p-2.5 rounded-xl border-2 min-w-[180px] shadow-lg backdrop-blur-md transition-all z-10 ${usuario.rol_sistema === 'Director' ? 'bg-slate-900 border-orange-500 text-white shadow-orange-500/20' : 'bg-white border-slate-100 text-slate-900'} ${estaResaltado ? 'ring-4 ring-orange-500 ring-offset-2' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-black text-xs shadow-inner ${usuario.rol_sistema === 'Director' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
            {usuario.avatar_url ? <img src={usuario.avatar_url} className="w-full h-full object-cover" /> : <span>{usuario.nombre.charAt(0)}{usuario.apellidos.charAt(0)}</span>}
          </div>
          <div className="overflow-hidden">
            <p className="font-black text-[10px] uppercase truncate w-full leading-none">{usuario.nombre} {usuario.apellidos}</p>
            <p className={`text-[8px] font-bold uppercase tracking-tighter mt-1 truncate ${usuario.rol_sistema === 'Director' ? 'text-orange-400' : 'text-slate-400'}`}>{usuario.rol_sistema}</p>
          </div>
        </div>
      </motion.div>
      {subordinados.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-0.5 h-6 bg-orange-500/40" />
          <div className="flex justify-center relative w-full">
            {subordinados.length > 1 && <div className="absolute top-0 h-0.5 bg-orange-500/40" style={{ width: `calc(100% - ${100 / subordinados.length}%)`, left: `${50 / subordinados.length}%`, right: `${50 / subordinados.length}%` }} />}
            <div className="flex gap-4">
              {subordinados.map((sub: any) => (
                <div key={sub.id} className="relative pt-6">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-orange-500/40" />
                  <NodoOrganigrama usuario={sub} todosLosUsuarios={todosLosUsuarios} busqueda={busqueda} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Usuarios() {
  const navigate = useNavigate()
  const [tabActiva, setTabActiva] = useState<'empleados' | 'deptos' | 'roles'>('empleados')
  const [pestañaExpediente, setPestañaExpediente] = useState<'personales' | 'corporativo' | 'permisos' | 'documentos' | 'notificaciones'>('personales')
  const [tabNotificacionesForm, setTabNotificacionesForm] = useState('Todas')
  const [verOrganigrama, setVerOrganigrama] = useState(false)
  const [zoomOrg, setZoomOrg] = useState(1) // <-- ESTADO PARA ZOOM

  const [usuarios, setUsuarios] = useState<any[]>([])
  const [deptos, setDeptos] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaOrg, setBusquedaOrg] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState<string | null>(null)
  const [nuevoItemNombre, setNuevoItemNombre] = useState('')
  const [docPreview, setDocPreview] = useState<{ url: string, nombre: string } | null>(null)

  const [buscadorJefe, setBuscadorJefe] = useState('')
  const [mostrarListaJefes, setMostrarListaJefes] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ESTADOS DEL CHAT GLOBAL
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInicial, setChatInicial] = useState<any>(null)

  const initialFormState = {
    nombre: '', apellidos: '', fecha_nacimiento: '', rfc: '', curp: '', direccion: '',
    puesto_actual: '', email_corporativo: '', telefono_movil: '',
    departamento: '', rol_sistema: '', jefe_id: '', avatar_url: '',
    fecha_ingreso: '', doc_ine: '', doc_csf: '', doc_domicilio: '', doc_acta: '',
    ventas: false, usuarios: false, proyectos: false, inventario: false, comunicados: false,
    panel: false, instalacion: false, interconexion: false, ingenieria: false,
    agendar_viabilidad: false, finanzas: false, cotizaciones: false,
    revision_cotizaciones: false, administrador_pagos: false,
    notif_cotizaciones: false, notif_revision: false,
    notif_interconexion: false, notif_inventario: false, notif_finanzas: false,
    permisos_especificos: { revision_cotizacion: false, revision_viabilidad: false }
  }
  const [formData, setFormData] = useState<any>(initialFormState)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  const fetchData = async () => {
    setCargando(true)
    const [u, d, r] = await Promise.all([
      supabase.from('perfiles').select('*').order('nombre'),
      supabase.from('departamentos').select('*').order('nombre'),
      supabase.from('roles_sistema').select('*').order('nombre')
    ])
    if (u.data) setUsuarios(u.data)
    if (d.data) setDeptos(d.data)
    if (r.data) setRoles(r.data)
    setCargando(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarListaJefes(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const raicesOrganigrama = useMemo(() => {
    return usuarios.filter(u => u.rol_sistema === 'Director' && u.departamento === 'Dirección');
  }, [usuarios]);

  const handleAgregarCatalogo = async (tabla: 'departamentos' | 'roles_sistema') => {
    if (!nuevoItemNombre.trim()) return
    await supabase.from(tabla).insert([{ nombre: nuevoItemNombre.trim() }])
    setNuevoItemNombre(''); fetchData();
  }

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...formData, jefe_id: formData.jefe_id || null }
    if (modoEdicion && idEditando) {
      await supabase.from('perfiles').update(data).eq('id', idEditando)
    } else {
      await supabase.from('perfiles').insert([data])
    }
    setModalAbierto(false)
    fetchData()
  }

  const usuariosAgrupados = useMemo(() => {
    const filtered = usuarios.filter(u => `${u.nombre} ${u.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()))
    return filtered.reduce((acc: any, curr) => {
      const d = curr.departamento || 'Sin Asignar'
      if (!acc[d]) acc[d] = []
      acc[d].push(curr)
      return acc
    }, {})
  }, [usuarios, busqueda])

  const jefesFiltrados = useMemo(() => {
    return usuarios.filter(u =>
      u.id !== idEditando &&
      `${u.nombre} ${u.apellidos} ${u.puesto_actual}`.toLowerCase().includes(buscadorJefe.toLowerCase())
    );
  }, [usuarios, idEditando, buscadorJefe]);

  const jefeActual = useMemo(() => {
    if (!formData.jefe_id) return null;
    return usuarios.find(u => u.id === formData.jefe_id);
  }, [formData.jefe_id, usuarios]);

  // Arrastre Organigrama
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true); setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0)); setScrollLeft(scrollRef.current?.scrollLeft || 0);
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return; e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  }

  // --- FUNCIONES ZOOM ---
  const zoomIn = () => setZoomOrg(z => Math.min(z + 0.2, 2));
  const zoomOut = () => setZoomOrg(z => Math.max(z - 0.2, 0.4));

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>

      {/* --- COMPONENTE GLOBAL DE CHAT (POR ENCIMA DEL HEADER) --- */}
      <ChatGlobal
        isOpen={chatAbierto}
        onClose={() => setChatAbierto(false)}
        usuarioLogueado={usuarioLogueado}
        chatInicial={chatInicial}
      />

      {/* HEADER GLOBAL HOMOLOGADO */}
      <Header
        titulo="Usuarios"
        onAbrirChat={(chatInit) => {
          setChatInicial(chatInit || null);
          setChatAbierto(true);
        }}
      />

      <main className="max-w-[1700px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10">

        {/* BARRA SUPERIOR: Pestañas + Buscador/Acciones */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
          <div className="flex flex-wrap bg-white/90 backdrop-blur-md p-1 md:p-1.5 rounded-[16px] md:rounded-[18px] shadow-lg border border-white w-full xl:w-auto">
            <button onClick={() => setTabActiva('empleados')} className={`flex-1 xl:flex-none justify-center px-4 md:px-6 py-2 md:py-2.5 rounded-[12px] md:rounded-[15px] text-[9px] md:text-[11px] font-black transition-all flex items-center gap-1 md:gap-2 ${tabActiva === 'empleados' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Users className="w-3 h-3 md:w-4 md:h-4 hidden sm:block" /> EMPLEADOS</button>
            <button onClick={() => setTabActiva('deptos')} className={`flex-1 xl:flex-none justify-center px-4 md:px-6 py-2 md:py-2.5 rounded-[12px] md:rounded-[15px] text-[9px] md:text-[11px] font-black transition-all flex items-center gap-1 md:gap-2 ${tabActiva === 'deptos' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Building2 className="w-3 h-3 md:w-4 md:h-4 hidden sm:block" /> DEPTOS</button>
            <button onClick={() => setTabActiva('roles')} className={`flex-1 xl:flex-none justify-center px-4 md:px-6 py-2 md:py-2.5 rounded-[12px] md:rounded-[15px] text-[9px] md:text-[11px] font-black transition-all flex items-center gap-1 md:gap-2 ${tabActiva === 'roles' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Award className="w-3 h-3 md:w-4 md:h-4 hidden sm:block" /> ROLES</button>
          </div>

          {tabActiva === 'empleados' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 w-full sm:w-64 shadow-sm"><Search className="text-slate-400 w-4 h-4 shrink-0" /><input type="text" placeholder="Buscar empleado..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" /></div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => setVerOrganigrama(true)} className="flex-1 sm:flex-none bg-white text-slate-900 px-4 md:px-5 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-md border border-slate-200 uppercase tracking-widest whitespace-nowrap"><GitGraph className="w-4 h-4 text-orange-500" /> Org.</button>
                <button onClick={() => { setModoEdicion(false); setFormData(initialFormState); setPestañaExpediente('personales'); setModalAbierto(true); }} className="flex-1 sm:flex-none bg-orange-500 text-white px-4 md:px-8 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><Plus className="w-4 h-4 md:w-5 md:h-5" /> Agregar</button>
              </div>
            </div>
          )}
        </div>

        {/* LISTA EMPLEADOS */}
        {tabActiva === 'empleados' && (
          <div className="space-y-8 md:space-y-12">
            {cargando ? (
              <div className="py-20 text-center flex flex-col items-center gap-4 text-slate-400 font-black uppercase tracking-widest text-xs">Cargando usuarios...</div>
            ) : Object.keys(usuariosAgrupados).map(depto => (
              <div key={depto}>
                <div className="mb-4 md:mb-6 ml-1 md:ml-2">
                  <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2 md:gap-3 uppercase italic tracking-tighter"><div className="w-1.5 md:w-2 h-5 md:h-6 bg-orange-500 rounded-full shadow-sm" /> {depto}</h3>
                  <div className="w-full h-px bg-slate-200 mt-2" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {usuariosAgrupados[depto].map((u: any) => {
                    const jefe = usuarios.find(boss => boss.id === u.jefe_id);
                    return (
                      <div key={u.id} className="bg-white border border-slate-100 rounded-[16px] md:rounded-[20px] p-3 shadow-sm flex flex-col group hover:border-orange-400 transition-all hover:shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 overflow-hidden shadow-md">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span>{u.nombre.charAt(0)}{u.apellidos.charAt(0)}</span>}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="font-black text-slate-950 text-[11px] uppercase italic tracking-tighter leading-none truncate">{u.nombre} {u.apellidos}</h4>
                              <p className="text-[8px] md:text-[9px] font-semibold text-slate-600 uppercase mt-1 md:mt-1.5 truncate flex items-center gap-1"><MapPin size={10} className="text-slate-400" /> {u.departamento}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all ml-2">
                            <button onClick={() => { setModoEdicion(true); setIdEditando(u.id); setFormData({ ...initialFormState, ...u, permisos_especificos: { ...initialFormState.permisos_especificos, ...(u.permisos_especificos || {}) } }); setPestañaExpediente('personales'); setBuscadorJefe(''); setModalAbierto(true); }} className="p-1 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-100 transition-colors"><Pencil size={12} /></button>
                            <button onClick={async () => { if (confirm('¿Borrar?')) { await supabase.from('perfiles').delete().eq('id', u.id); fetchData(); } }} className="p-1 bg-slate-50 text-slate-400 hover:bg-red-600 hover:text-white rounded-lg border border-slate-100 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-50">
                          <span className={`text-[7px] font-black px-2 py-1 rounded-md uppercase border shadow-sm ${getEstiloRol(u.rol_sistema)}`}>{u.rol_sistema}</span>
                          {jefe && <span className="text-[7px] font-black px-2 py-1 rounded-md uppercase bg-slate-50 text-slate-700 border border-slate-100 shadow-sm flex items-center gap-1 truncate max-w-full"><Network size={10} className="text-orange-500 shrink-0" /> {jefe.nombre}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA DEPARTAMENTOS Y ROLES */}
        {(tabActiva === 'deptos' || tabActiva === 'roles') && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto mt-6 md:mt-10">
            <div className="bg-white rounded-[20px] md:rounded-[30px] p-6 md:p-8 shadow-xl border border-white mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4 md:mb-6 uppercase tracking-tighter italic">Nuevo {tabActiva === 'deptos' ? 'Departamento' : 'Rol'}</h3>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <input type="text" placeholder={`Escribe el nombre...`} value={nuevoItemNombre} onChange={e => setNuevoItemNombre(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 font-bold text-sm md:text-lg outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                <button onClick={() => handleAgregarCatalogo(tabActiva === 'deptos' ? 'departamentos' : 'roles_sistema')} className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-0 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs hover:bg-orange-500 transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest"><Plus className="w-4 h-4 md:w-5 md:h-5" /> AGREGAR</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {(tabActiva === 'deptos' ? deptos : roles).map(item => (
                <div key={item.id} className="bg-white/90 border border-slate-100 p-4 md:p-5 rounded-xl md:rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <span className="font-black text-slate-800 uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 md:gap-3"><div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-orange-500 shrink-0" />{item.nombre}</span>
                  <button onClick={async () => { if (confirm('¿Eliminar?')) { const t = tabActiva === 'deptos' ? 'departamentos' : 'roles_sistema'; await supabase.from(t).delete().eq('id', item.id); fetchData(); } }} className="text-slate-300 hover:text-red-500 transition-all p-1.5 md:p-2"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </main>

        {/* ORGANIGRAMA DRAGGABLE CON ZOOM */}
        <AnimatePresence>
          {verOrganigrama && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-50 overflow-hidden flex flex-col pt-16 md:pt-0">
              {/* Header Organigrama */}
              <div className="absolute md:relative top-0 left-0 right-0 md:top-auto md:left-auto md:right-auto bg-white border-b border-slate-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center shadow-md z-50 gap-4 md:gap-0 h-16 md:h-auto">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <img src={solarisLogo} alt="Logo" className="h-4 md:h-6 hidden md:block" />
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar en estructura..." value={busquedaOrg} onChange={(e) => setBusquedaOrg(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-[10px] md:text-xs font-bold outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200 mr-2">
                    <button onClick={zoomOut} className="p-1.5 md:p-2 text-slate-500 hover:text-orange-500 hover:bg-white rounded-lg transition-all"><ZoomOut size={16} /></button>
                    <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoomOrg * 100)}%</span>
                    <button onClick={zoomIn} className="p-1.5 md:p-2 text-slate-500 hover:text-orange-500 hover:bg-white rounded-lg transition-all"><ZoomIn size={16} /></button>
                  </div>
                  <button onClick={() => setVerOrganigrama(false)} className="bg-slate-900 text-white p-2 md:p-3 rounded-full hover:bg-red-500 transition-all border-2 border-white shadow-md"><Minimize2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
              </div>

              <div ref={scrollRef} onMouseDown={handleMouseDown} onMouseLeave={() => setIsDragging(false)} onMouseUp={() => setIsDragging(false)} onMouseMove={handleMouseMove} className="flex-1 overflow-auto custom-scrollbar cursor-grab active:cursor-grabbing p-10 md:p-20 relative">
                <div className="min-w-max flex justify-center pb-40 transition-transform origin-top" style={{ transform: `scale(${zoomOrg})` }}>
                  <div className="flex flex-col items-center">
                    {raicesOrganigrama.map(root => <NodoOrganigrama key={root.id} usuario={root} todosLosUsuarios={usuarios} busqueda={busquedaOrg} />)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL EXPEDIENTE */}
        <AnimatePresence>
          {modalAbierto && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col h-[85vh] md:max-h-[90vh] mt-12 md:mt-0 border border-white">

                <div className="bg-slate-900 p-5 md:p-8 flex items-center justify-between text-white shrink-0">
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10"><UserPlus className="w-6 h-6 md:w-7 md:h-7 text-orange-400" /></div>
                    <div>
                      <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">{modoEdicion ? 'Expediente' : 'Nuevo Ingreso'}</h2>
                      {modoEdicion && <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 md:mt-1.5 truncate max-w-[200px] md:max-w-full">{formData.nombre} {formData.apellidos}</p>}
                    </div>
                  </div>
                  <button onClick={() => setModalAbierto(false)} className="p-2 md:p-3 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
                </div>

                <div className="flex border-b border-slate-200 bg-slate-50 px-4 md:px-8 shrink-0 overflow-x-auto scrollbar-hide">
                  <button onClick={() => setPestañaExpediente('personales')} className={`py-3 md:py-4 px-3 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${pestañaExpediente === 'personales' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><UserCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> Personales</button>
                  <button onClick={() => setPestañaExpediente('corporativo')} className={`py-3 md:py-4 px-3 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${pestañaExpediente === 'corporativo' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4" /> Corporativo</button>
                  <button onClick={() => setPestañaExpediente('permisos')} className={`py-3 md:py-4 px-3 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${pestañaExpediente === 'permisos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> Permisos</button>
                  <button onClick={() => setPestañaExpediente('notificaciones')} className={`py-3 md:py-4 px-3 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${pestañaExpediente === 'notificaciones' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Bell className="w-3.5 h-3.5 md:w-4 md:h-4" /> Notificaciones</button>
                  <button onClick={() => setPestañaExpediente('documentos')} className={`py-3 md:py-4 px-3 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${pestañaExpediente === 'documentos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><FileBadge className="w-3.5 h-3.5 md:w-4 md:h-4" /> Expediente</button>
                </div>

                <form onSubmit={handleGuardarUsuario} className="p-5 md:p-10 overflow-y-auto flex-1 bg-white custom-scrollbar">

                  {pestañaExpediente === 'personales' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="col-span-1">Nombre(s) <input type="text" value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required /></div>
                      <div className="col-span-1">Apellidos <input type="text" value={formData.apellidos || ''} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required /></div>

                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Nacimiento</span><input type="date" value={formData.fecha_nacimiento || ''} onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" /></div>
                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Tel. Móvil</span><input type="text" value={formData.telefono_movil || ''} onChange={e => setFormData({ ...formData, telefono_movil: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" /></div>

                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> RFC</span><input type="text" value={formData.rfc || ''} onChange={e => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 uppercase focus:border-orange-400 shadow-inner" /></div>
                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> CURP</span><input type="text" value={formData.curp || ''} onChange={e => setFormData({ ...formData, curp: e.target.value.toUpperCase() })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 uppercase focus:border-orange-400 shadow-inner" /></div>

                      <div className="col-span-1 sm:col-span-2 flex flex-col"><span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Dirección Completa</span><input type="text" value={formData.direccion || ''} onChange={e => setFormData({ ...formData, direccion: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" /></div>
                    </motion.div>
                  )}

                  {pestañaExpediente === 'corporativo' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="col-span-1 sm:col-span-2 bg-orange-50/50 p-4 md:p-6 rounded-2xl border border-orange-100 relative" ref={dropdownRef}>
                        <span className="flex items-center gap-1.5 mb-2 md:mb-2.5 text-orange-600"><Network className="w-3.5 h-3.5 md:w-4 md:h-4" /> Jefe Directo</span>
                        <div className="relative">
                          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-orange-300" />
                          <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={mostrarListaJefes ? buscadorJefe : (jefeActual ? `${jefeActual.nombre} ${jefeActual.apellidos}` : '')}
                            onFocus={() => setMostrarListaJefes(true)}
                            onChange={(e) => { setBuscadorJefe(e.target.value); setMostrarListaJefes(true); }}
                            className="w-full bg-white border border-orange-200 rounded-xl py-3 md:py-4 pl-10 md:pl-12 pr-4 outline-none text-slate-900 font-bold text-xs md:text-sm focus:border-orange-500 shadow-sm"
                          />
                          <AnimatePresence>{mostrarListaJefes && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-1 md:mt-2.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto">
                              <div onClick={() => { setFormData({ ...formData, jefe_id: '' }); setMostrarListaJefes(false); setBuscadorJefe(''); }} className="p-3 md:p-4 border-b hover:bg-slate-50 cursor-pointer text-slate-400 italic font-medium text-xs md:text-sm">-- Sin Jefe --</div>
                              {jefesFiltrados.map(j => (
                                <div key={j.id} onClick={() => { setFormData({ ...formData, jefe_id: j.id }); setMostrarListaJefes(false); setBuscadorJefe(''); }} className="p-2 md:p-3 border-b hover:bg-orange-50 cursor-pointer flex items-center gap-2 md:gap-3 transition-colors">
                                  <div className="w-6 h-6 md:w-7 md:h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[9px] md:text-[10px]">{j.nombre.charAt(0)}</div>
                                  <div><p className="text-slate-900 font-bold text-[10px] md:text-xs leading-none">{j.nombre} {j.apellidos}</p><p className="text-slate-400 text-[7px] md:text-[8px] mt-0.5 md:mt-1 uppercase font-semibold">{j.rol_sistema}</p></div>
                                </div>
                              ))}
                            </motion.div>
                          )}</AnimatePresence>
                        </div>
                      </div>
                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Fecha Ingreso</span><input type="date" value={formData.fecha_ingreso || ''} onChange={e => setFormData({ ...formData, fecha_ingreso: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required /></div>
                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Departamento</span><select value={formData.departamento || ''} onChange={e => setFormData({ ...formData, departamento: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required><option value="">Seleccionar...</option>{deptos.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}</select></div>
                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Rol Admin</span><select value={formData.rol_sistema || ''} onChange={e => setFormData({ ...formData, rol_sistema: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required><option value="">Seleccionar...</option>{roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}</select></div>
                      <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" /> Email Corporativo</span><input type="email" value={formData.email_corporativo || ''} onChange={e => setFormData({ ...formData, email_corporativo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-bold outline-none text-slate-900 focus:border-orange-400 shadow-inner" required /></div>
                      <div className="col-span-1 sm:col-span-2 flex flex-col"><span className="flex items-center gap-1.5 text-blue-600"><UserCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> Username Acceso (Lectura)</span><input type="text" value={formData.puesto_actual || ''} readOnly className="w-full bg-blue-50 border border-blue-200 rounded-xl py-3 md:py-4 px-4 md:px-6 mt-1.5 md:mt-2 text-xs md:text-sm font-black outline-none text-blue-900 shadow-sm" /></div>
                    </motion.div>
                  )}

                  {pestañaExpediente === 'permisos' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        {[
                          { label: 'Usuarios', campo: 'usuarios' },
                          { label: 'Proyectos', campo: 'proyectos' }, { label: 'Inventario', campo: 'inventario' },
                          { label: 'Comunicados', campo: 'comunicados' }, { label: 'Panel', campo: 'panel' },
                          { label: 'Instalación', campo: 'instalacion' }, { label: 'Interconexión', campo: 'interconexion' },
                          { label: 'Ingeniería', campo: 'ingenieria' }, { label: 'Viabilidad', campo: 'agendar_viabilidad' },
                          { label: 'Finanzas', campo: 'finanzas' }, { label: 'Cotizaciones', campo: 'cotizaciones' },
                          { label: 'Revisión', campo: 'revision_cotizaciones' }, { label: 'Pagos', campo: 'administrador_pagos' }
                        ].map((perm) => (
                          <div key={perm.campo} onClick={() => setFormData({ ...formData, [perm.campo]: !formData[perm.campo as keyof typeof formData] })} className={`flex items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest ${formData[perm.campo as keyof typeof formData] ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                            {perm.label}
                            <div className={`w-3 h-3 md:w-4 md:h-4 rounded flex items-center justify-center border ${formData[perm.campo as keyof typeof formData] ? 'bg-white border-white text-slate-900' : 'bg-slate-100 border-slate-200'}`}>
                              {formData[perm.campo as keyof typeof formData] && <Check size={12} className="text-orange-500 w-2.5 h-2.5 md:w-3 md:h-3" />}
                            </div>
                          </div>
                        ))}
                      </div>

                      {formData.revision_cotizaciones && (
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center">
                          <div className="text-slate-800 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-orange-500" /> Vistas de Revisión Disponibles:
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm hover:border-orange-300 transition-all">
                              <input type="checkbox" checked={formData.permisos_especificos?.revision_cotizacion || false} onChange={e => setFormData((p: any) => ({ ...p, permisos_especificos: { ...(p.permisos_especificos || {}), revision_cotizacion: e.target.checked } }))} className="w-4 h-4 accent-orange-500 rounded cursor-pointer" />
                              Aprobación Cotización
                            </label>
                            <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm hover:border-orange-300 transition-all">
                              <input type="checkbox" checked={formData.permisos_especificos?.revision_viabilidad || false} onChange={e => setFormData((p: any) => ({ ...p, permisos_especificos: { ...(p.permisos_especificos || {}), revision_viabilidad: e.target.checked } }))} className="w-4 h-4 accent-orange-500 rounded cursor-pointer" />
                              Aprobación Viabilidad
                            </label>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {pestañaExpediente === 'notificaciones' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                      <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 flex flex-col md:flex-row items-center gap-6">
                        <div className="bg-orange-100 text-orange-600 p-4 rounded-full">
                          <BellRing size={32} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg md:text-xl">Alertas en Tiempo Real</h3>
                          <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 leading-relaxed">Configura qué módulos detonarán notificaciones push para este usuario estructural base.</p>
                        </div>
                      </div>

                      <div className="flex bg-slate-50 p-1.5 rounded-[12px] border border-slate-200 mt-2 overflow-x-auto custom-scrollbar gap-1">
                        {['Todas', 'Cotizaciones', 'Viabilidad', 'Operaciones', 'General'].map(tab => (
                            <button 
                                key={tab} type="button" onClick={() => setTabNotificacionesForm(tab)}
                                className={`px-4 py-2 rounded-[8px] text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${tabNotificacionesForm === tab ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                {tab}
                            </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {[
                          { k: 'notif_cotizaciones', tab: 'Cotizaciones', t: 'Nueva Cotización', d: 'Notificaciones cuando un proyecto entra a Cotización o retorna.', icon: FileText, c: 'blue' },
                          { k: 'notif_revision', tab: 'Cotizaciones', t: 'Pase a Revisión (Cot.)', d: 'Avisos cuando un proyecto está en Cotizado listo para revisar.', icon: CheckCircle2, c: 'emerald' },
                          { k: 'notif_viabilidad_tecnica', tab: 'Viabilidad', t: 'Viabilidad Técnica', d: 'Alertas sobre solicitudes y agendamientos técnicos.', icon: Zap, c: 'orange' },
                          { k: 'notif_viabilidad_revision', tab: 'Viabilidad', t: 'Revisión Viabilidad (Ventas)', d: 'Avisos cuando ingeniería termina y pasa a revisión de gerencia/ventas.', icon: CheckCircle2, c: 'indigo' },
                          { k: 'notif_instalacion', tab: 'Operaciones', t: 'Instalación', d: 'Alertas de proyectos agendados a instalación y reportes.', icon: Wrench, c: 'teal' },
                          { k: 'notif_interconexion', tab: 'Operaciones', t: 'Interconexión', d: 'Avisos de trámites CFE, medidor e inspecciones.', icon: Network, c: 'purple' },
                          { k: 'notif_inventario', tab: 'General', t: 'Bajo Inventario', d: 'Alertas cuando materiales han llegado al stock mínimo.', icon: Package, c: 'amber' },
                          { k: 'notif_finanzas', tab: 'General', t: 'Finanzas', d: 'Nuevos presupuestos, depósitos iniciales y liberación de comisiones.', icon: Wallet, c: 'rose' }
                        ].filter(n => tabNotificacionesForm === 'Todas' || n.tab === tabNotificacionesForm).map((notif) => (
                          <div key={notif.k} onClick={() => setFormData({ ...formData, [notif.k]: !formData[notif.k as keyof typeof formData] })} className={`border-2 p-5 rounded-2xl cursor-pointer transition-all group relative overflow-hidden ${formData[notif.k as keyof typeof formData] ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div className={`p-2 rounded-lg ${formData[notif.k as keyof typeof formData] ? 'bg-white/10' : 'bg-slate-100 group-hover:bg-orange-50'}`}>
                                <notif.icon className={`w-6 h-6 ${formData[notif.k as keyof typeof formData] ? 'text-white' : 'text-slate-500 group-hover:text-orange-500'}`} />
                              </div>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${formData[notif.k as keyof typeof formData] ? 'bg-white border-white' : 'bg-slate-100 border-slate-200 group-hover:border-slate-300'}`}>
                                {formData[notif.k as keyof typeof formData] && <Check className="w-3.5 h-3.5 text-slate-900" />}
                              </div>
                            </div>
                            <h4 className={`font-black uppercase tracking-tighter text-sm md:text-base leading-none mb-2 ${formData[notif.k as keyof typeof formData] ? 'text-white' : 'text-slate-800'}`}>{notif.t}</h4>
                            <p className={`text-[10px] md:text-xs font-bold leading-relaxed ${formData[notif.k as keyof typeof formData] ? 'text-slate-300' : 'text-slate-500'}`}>{notif.d}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {pestañaExpediente === 'documentos' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {[
                        { k: 'doc_ine', n: 'Identificación INE Frente/Detrás', c: 'text-emerald-500' },
                        { k: 'doc_csf', n: 'Constancia Fiscal SAT (Actualizada)', c: 'text-blue-500' },
                        { k: 'doc_domicilio', n: 'Comprobante de Domicilio (Luz/Agua)', c: 'text-orange-500' },
                        { k: 'doc_acta', n: 'Acta de Nacimiento', c: 'text-pink-500' }
                      ].map(doc => (
                        <div key={doc.k} className="bg-white border border-slate-200 rounded-[20px] md:rounded-3xl p-4 md:p-6 flex items-center justify-between shadow-sm group hover:border-emerald-200 transition-colors">
                          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 transition-colors shrink-0"><FileText className={`w-5 h-5 md:w-6 md:h-6 ${doc.c}`} /></div>
                            <div className="overflow-hidden"><p className="font-black text-[9px] md:text-[11px] uppercase italic text-slate-950 leading-none tracking-tighter truncate">{doc.n}</p><p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-widest truncate">{formData[doc.k as keyof typeof formData] ? 'Archivo Cargado' : 'Sin Archivo'}</p></div>
                          </div>
                          {formData[doc.k as keyof typeof formData] && (
                            <button type="button" onClick={() => setDocPreview({ url: formData[doc.k as keyof typeof formData] as string, nombre: doc.n })} className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shrink-0 ml-2"><Eye className="w-4 h-4 md:w-5 md:h-5" /></button>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}

                  <div className="pt-6 md:pt-8 mt-6 md:mt-10 flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4 border-t border-slate-200">
                    <button type="button" onClick={() => setModalAbierto(false)} className="w-full sm:w-auto text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] px-6 md:px-8 py-3.5 md:py-4 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-8 md:px-10 py-3.5 md:py-4 rounded-xl font-black shadow-xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 md:gap-3 uppercase text-[10px] md:text-[11px] tracking-widest">GUARDAR <Save className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* VISOR DE DOCUMENTOS */}
        <AnimatePresence>
          {docPreview && (
            <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={() => setDocPreview(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white mt-12 md:mt-0" onClick={e => e.stopPropagation()}>
                <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100 shrink-0">
                  <h3 className="font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 md:gap-3 text-xs md:text-sm"><FileText className="w-4 h-4 md:w-6 md:h-6 text-orange-500 shrink-0" /> <span className="truncate">Visor: {docPreview.nombre}</span></h3>
                  <button onClick={() => setDocPreview(null)} className="p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors shrink-0"><X className="w-4 h-4 md:w-6 md:h-6" /></button>
                </div>
                <div className="flex-1 bg-slate-800 p-2 md:p-0"><iframe src={docPreview.url} className="w-full h-full border-none bg-white rounded-xl md:rounded-none" title={docPreview.nombre} /></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

    </div>
  )
}