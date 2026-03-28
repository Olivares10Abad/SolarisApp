import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, Pencil, Trash2, Search, X, Save, 
  Building2, Briefcase, UserPlus, Mail, Phone, Users, 
  Network, ShieldCheck, Check, LayoutGrid, Award, 
  GitGraph, Minimize2, MapPin, Calendar, Fingerprint,
  FileText, UploadCloud, FileBadge
} from 'lucide-react'

import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

// --- HELPER PARA COLORES DE ROLES ---
const getEstiloRol = (rol: string) => {
    const r = rol?.toLowerCase() || ''
    if (r.includes('director')) return 'bg-purple-100 text-purple-700 border-purple-200'
    if (r.includes('gerente')) return 'bg-blue-100 text-blue-700 border-blue-200'
    if (r.includes('coord')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (r.includes('analista')) return 'bg-amber-100 text-amber-700 border-amber-200'
    if (r.includes('ingenier')) return 'bg-orange-100 text-orange-700 border-orange-200'
    return 'bg-slate-100 text-slate-600 border-slate-200'
}

// --- NODO DEL ORGANIGRAMA ---
const NodoOrganigrama = ({ usuario, todosLosUsuarios, busqueda }: any) => {
  const subordinados = todosLosUsuarios.filter((u: any) => u.jefe_id === usuario.id);
  const estaResaltado = busqueda && (usuario.nombre + ' ' + usuario.apellidos).toLowerCase().includes(busqueda.toLowerCase());
  
  return (
    <div className="flex flex-col items-center relative">
      <motion.div animate={estaResaltado ? { scale: 1.1, ring: 4 } : { scale: 1 }} className={`relative p-2.5 rounded-xl border-2 min-w-[180px] shadow-lg backdrop-blur-md transition-all z-10 ${usuario.rol_sistema === 'Director' ? 'bg-slate-900 border-orange-500 text-white shadow-orange-500/20' : 'bg-white border-slate-100 text-slate-900'} ${estaResaltado ? 'ring-4 ring-orange-500 ring-offset-2' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-inner ${usuario.rol_sistema === 'Director' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-slate-100 text-slate-800'}`}>{usuario.nombre.charAt(0)}{usuario.apellidos.charAt(0)}</div>
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
  // NUEVA PESTAÑA DE DOCUMENTOS
  const [pestañaExpediente, setPestañaExpediente] = useState<'personales' | 'corporativo' | 'permisos' | 'documentos'>('personales')
  const [verOrganigrama, setVerOrganigrama] = useState(false)
  
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

  // ESTADOS PARA EL SELECTOR INTELIGENTE DE JEFES
  const [buscadorJefe, setBuscadorJefe] = useState('')
  const [mostrarListaJefes, setMostrarListaJefes] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const initialFormState = {
    nombre: '', apellidos: '', fecha_nacimiento: '', rfc: '', curp: '', direccion: '', 
    puesto_actual: '', email_corporativo: '', telefono_movil: '', 
    departamento: '', rol_sistema: '', jefe_id: '',
    ventas: false, usuarios: false, proyectos: false, inventario: false, comunicados: false,
    panel: false, instalacion: false, interconexion: false, ingenieria: false, 
    agendar_viabilidad: false, finanzas: false, cotizaciones: false, 
    revision_cotizaciones: false, administrador_pagos: false
  }
  const [formData, setFormData] = useState(initialFormState)

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

  // Cerrar dropdown de jefes si se hace clic afuera
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

  // Lógica para filtrar jefes
  const jefesFiltrados = useMemo(() => {
    return usuarios.filter(u => 
      u.id !== idEditando && // No puede ser jefe de sí mismo
      `${u.nombre} ${u.apellidos} ${u.puesto_actual}`.toLowerCase().includes(buscadorJefe.toLowerCase())
    );
  }, [usuarios, idEditando, buscadorJefe]);

  // Encontrar nombre del jefe actual para mostrarlo en el input
  const jefeActual = useMemo(() => {
    if (!formData.jefe_id) return null;
    return usuarios.find(u => u.id === formData.jefe_id);
  }, [formData.jefe_id, usuarios]);

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none" />

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm h-16 flex items-center">
        <div className="max-w-[1700px] mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/home')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-500"><ArrowLeft className="w-5 h-5"/></button>
            <img src={solarisLogo} alt="GEA" className="h-7 w-auto" />
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <h1 className="font-black text-base tracking-tight text-slate-900 uppercase italic">Administración GEA</h1>
          </div>
          <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="text-right flex flex-col">
              <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{usuarioLogueado?.nombre}</span>
              <span className="text-[9px] font-bold text-orange-500 uppercase mt-1">{usuarioLogueado?.puesto_actual}</span>
            </div>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-[10px]">{usuarioLogueado?.nombre?.charAt(0)}</div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1700px] mx-auto px-8 py-8 relative z-10">
        
        {/* SELECTOR PRINCIPAL */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-[18px] shadow-lg border border-white">
            <button onClick={() => setTabActiva('empleados')} className={`px-6 py-2.5 rounded-[15px] text-[11px] font-black transition-all flex items-center gap-2 ${tabActiva === 'empleados' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Users className="w-4 h-4" /> EMPLEADOS</button>
            <button onClick={() => setTabActiva('deptos')} className={`px-6 py-2.5 rounded-[15px] text-[11px] font-black transition-all flex items-center gap-2 ${tabActiva === 'deptos' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Building2 className="w-4 h-4" /> DEPARTAMENTOS</button>
            <button onClick={() => setTabActiva('roles')} className={`px-6 py-2.5 rounded-[15px] text-[11px] font-black transition-all flex items-center gap-2 ${tabActiva === 'roles' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Award className="w-4 h-4" /> ROLES</button>
          </div>
          {tabActiva === 'empleados' && (
            <div className="flex gap-3">
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 w-64 shadow-sm hidden md:flex"><Search className="text-slate-400 w-4 h-4" /><input type="text" placeholder="Buscar empleado..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" /></div>
              <button onClick={() => setVerOrganigrama(true)} className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-md border border-slate-200 uppercase tracking-widest"><GitGraph className="w-4 h-4 text-orange-500" /> Organigrama</button>
              <button onClick={() => { setModoEdicion(false); setFormData(initialFormState); setPestañaExpediente('personales'); setModalAbierto(true); }} className="bg-orange-500 text-white px-8 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest"><Plus className="w-5 h-5" /> Agregar</button>
            </div>
          )}
        </div>

        {/* --- VISTA EMPLEADOS --- */}
        {tabActiva === 'empleados' && (
          <div className="space-y-12">
            {Object.keys(usuariosAgrupados).map(depto => (
              <div key={depto}>
                <div className="mb-6 ml-2">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.2em]"><div className="w-2 h-6 bg-orange-500 rounded-full shadow-sm" /> {depto}</h3>
                    <div className="w-full h-px bg-slate-200 mt-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {usuariosAgrupados[depto].map((u: any) => (
                    <div key={u.id} className="bg-white/90 backdrop-blur-md border border-slate-100 rounded-[25px] p-5 shadow-sm flex justify-between items-center group hover:border-orange-400 transition-all hover:shadow-xl">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">{u.nombre.charAt(0)}{u.apellidos.charAt(0)}</div>
                        <div className="overflow-hidden">
                          <h4 className="font-black text-slate-900 text-sm leading-none truncate">{u.nombre} {u.apellidos}</h4>
                          <div className="flex gap-2 mt-2"><span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${getEstiloRol(u.rol_sistema)}`}>{u.rol_sistema}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setModoEdicion(true); setIdEditando(u.id); setFormData(u); setPestañaExpediente('personales'); setBuscadorJefe(''); setModalAbierto(true); }} className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-100"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => { if(confirm('¿Borrar?')) { await supabase.from('perfiles').delete().eq('id', u.id); fetchData(); } }} className="p-2 bg-slate-50 text-slate-400 hover:bg-red-600 hover:text-white rounded-lg border border-slate-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- VISTA DEPARTAMENTOS Y ROLES --- */}
        {(tabActiva === 'deptos' || tabActiva === 'roles') && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto mt-10">
            <div className="bg-white rounded-[30px] p-8 shadow-xl border border-white mb-8">
              <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tighter italic">Nuevo {tabActiva === 'deptos' ? 'Departamento' : 'Rol'}</h3>
              <div className="flex gap-4">
                <input type="text" placeholder={`Escribe el nombre...`} value={nuevoItemNombre} onChange={e => setNuevoItemNombre(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                <button onClick={() => handleAgregarCatalogo(tabActiva === 'deptos' ? 'departamentos' : 'roles_sistema')} className="bg-slate-900 text-white px-8 rounded-2xl font-black text-xs hover:bg-orange-500 transition-all shadow-lg flex items-center gap-2 uppercase tracking-widest"><Plus className="w-5 h-5"/> AGREGAR</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(tabActiva === 'deptos' ? deptos : roles).map(item => (
                <div key={item.id} className="bg-white/90 border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <span className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-orange-500" />{item.nombre}</span>
                  <button onClick={async () => { if(confirm('¿Eliminar?')) { const t = tabActiva === 'deptos' ? 'departamentos' : 'roles_sistema'; await supabase.from(t).delete().eq('id', item.id); fetchData(); } }} className="text-slate-300 hover:text-red-500 transition-all p-2"><Trash2 className="w-5 h-5"/></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* --- ORGANIGRAMA --- */}
        <AnimatePresence>
          {verOrganigrama && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-50 overflow-auto flex">
              <div className="fixed top-24 left-8 z-[210] w-64 hidden md:block">
                 <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2 tracking-widest">Buscar en Organigrama</label>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Nombre..." value={busquedaOrg} onChange={(e) => setBusquedaOrg(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold outline-none focus:border-orange-500 transition-all"/></div>
                 </div>
              </div>
              <button onClick={() => { setVerOrganigrama(false); setBusquedaOrg(''); }} className="fixed top-24 right-8 bg-slate-900 text-white p-3 rounded-full shadow-2xl hover:bg-orange-500 transition-all z-[210] border-2 border-white"><Minimize2 className="w-5 h-5" /></button>
              <div className="flex flex-col items-center w-full p-10 pt-24">
                  <div className="mb-12 text-center">
                    <img src={solarisLogo} alt="Logo" className="h-6 mx-auto mb-3" />
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">ESTRUCTURA GEA</h2>
                    <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto mt-2 rounded-full" />
                  </div>
                  <div className="flex flex-col items-center gap-12 min-w-max pb-32">
                    {raicesOrganigrama.map(root => <NodoOrganigrama key={root.id} usuario={root} todosLosUsuarios={usuarios} busqueda={busquedaOrg} />)}
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MODAL EXPEDIENTE DEL TRABAJADOR --- */}
        <AnimatePresence>
          {modalAbierto && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Cabecera del Modal */}
                <div className="bg-slate-900 p-6 md:p-8 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center"><UserPlus className="w-6 h-6 text-orange-400"/></div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">{modoEdicion ? 'Expediente Empleado' : 'Nuevo Ingreso'}</h2>
                            {modoEdicion && <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{formData.nombre} {formData.apellidos}</p>}
                        </div>
                    </div>
                    <button onClick={() => setModalAbierto(false)} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>

                {/* Pestañas del Expediente (AGREGADA "DOCUMENTOS") */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-8 shrink-0 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setPestañaExpediente('personales')} className={`py-4 px-5 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-2 ${pestañaExpediente === 'personales' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Users className="w-3.5 h-3.5"/> Personales</button>
                    <button onClick={() => setPestañaExpediente('corporativo')} className={`py-4 px-5 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-2 ${pestañaExpediente === 'corporativo' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Briefcase className="w-3.5 h-3.5"/> Corporativo</button>
                    <button onClick={() => setPestañaExpediente('permisos')} className={`py-4 px-5 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-2 ${pestañaExpediente === 'permisos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><ShieldCheck className="w-3.5 h-3.5"/> Permisos</button>
                    <button onClick={() => setPestañaExpediente('documentos')} className={`py-4 px-5 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap flex items-center gap-2 ${pestañaExpediente === 'documentos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><FileBadge className="w-3.5 h-3.5"/> Documentos</button>
                </div>

                {/* Cuerpo Formulario (Scrollable) */}
                <form onSubmit={handleGuardarUsuario} className="p-8 overflow-y-auto flex-1 bg-white">
                  
                  {/* PESTAÑA 1: DATOS PERSONALES */}
                  {pestañaExpediente === 'personales' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="col-span-1">Nombre(s) <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" required /></div>
                        <div className="col-span-1">Apellidos <input type="text" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" required /></div>
                        <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Calendar className="w-3 h-3"/> Nacimiento</span><input type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" /></div>
                        <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> Tel. Móvil</span><input type="text" value={formData.telefono_movil} onChange={e => setFormData({...formData, telefono_movil: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" /></div>
                        <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Fingerprint className="w-3 h-3"/> RFC</span><input type="text" value={formData.rfc} onChange={e => setFormData({...formData, rfc: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold uppercase focus:border-orange-400" /></div>
                        <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Fingerprint className="w-3 h-3"/> CURP</span><input type="text" value={formData.curp} onChange={e => setFormData({...formData, curp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold uppercase focus:border-orange-400" /></div>
                        <div className="col-span-2 flex flex-col"><span className="flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Dirección Completa</span><input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" placeholder="Calle, Número, Colonia, Ciudad..." /></div>
                    </motion.div>
                  )}

                  {/* PESTAÑA 2: PERFIL CORPORATIVO CON BUSCADOR DE JEFE */}
                  {pestañaExpediente === 'corporativo' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        
                        <div className="col-span-2 text-orange-600 bg-orange-50/50 p-5 rounded-xl border border-orange-200 relative" ref={dropdownRef}>
                            <span className="flex items-center gap-1.5 mb-2"><Network className="w-3 h-3"/> Jefe Directo (Buscador Inteligente)</span>
                            
                            {/* Input falso para mostrar seleccionado o buscar */}
                            <div 
                                className="w-full bg-white border border-orange-200 rounded-xl flex items-center shadow-sm relative cursor-text"
                                onClick={() => setMostrarListaJefes(true)}
                            >
                                <Search className="w-4 h-4 text-orange-300 absolute left-3" />
                                <input 
                                    type="text" 
                                    placeholder="Escribe el nombre del jefe..." 
                                    value={mostrarListaJefes ? buscadorJefe : (jefeActual ? `${jefeActual.nombre} ${jefeActual.apellidos}` : '')}
                                    onChange={(e) => { setBuscadorJefe(e.target.value); setMostrarListaJefes(true); }}
                                    className="w-full py-3 pl-10 pr-10 text-slate-900 font-bold outline-none bg-transparent rounded-xl"
                                />
                                {formData.jefe_id && !mostrarListaJefes && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setFormData({...formData, jefe_id: ''}); }}
                                        className="absolute right-3 p-1 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown de Resultados */}
                            <AnimatePresence>
                                {mostrarListaJefes && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto"
                                    >
                                        <div 
                                            className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-slate-400 italic font-bold text-xs"
                                            onClick={() => { setFormData({...formData, jefe_id: ''}); setMostrarListaJefes(false); setBuscadorJefe(''); }}
                                        >
                                            -- Sin Jefe (Nivel Directivo / Raíz) --
                                        </div>
                                        {jefesFiltrados.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-xs">No se encontraron empleados.</div>
                                        ) : (
                                            jefesFiltrados.map(jefe => (
                                                <div 
                                                    key={jefe.id} 
                                                    className="p-3 border-b border-slate-50 hover:bg-orange-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                    onClick={() => { setFormData({...formData, jefe_id: jefe.id}); setMostrarListaJefes(false); setBuscadorJefe(''); }}
                                                >
                                                    <div className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center font-black text-[9px]">{jefe.nombre.charAt(0)}</div>
                                                    <div>
                                                        <p className="text-slate-900 font-bold text-xs leading-none">{jefe.nombre} {jefe.apellidos}</p>
                                                        <p className="text-orange-500 text-[8px] font-black uppercase mt-1">{jefe.rol_sistema} • {jefe.departamento}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <div className="col-span-1">Departamento
                            <select value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" required>
                                <option value="">-- Seleccionar --</option>
                                {deptos.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">Rol en el Sistema
                            <select value={formData.rol_sistema} onChange={e => setFormData({...formData, rol_sistema: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" required>
                                <option value="">-- Seleccionar --</option>
                                {roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> Email Corporativo</span><input type="email" value={formData.email_corporativo} onChange={e => setFormData({...formData, email_corporativo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-orange-400" required /></div>
                        <div className="col-span-1 flex flex-col"><span className="flex items-center gap-1.5 text-blue-600">Username (Para Iniciar Sesión)</span><input type="text" value={formData.puesto_actual} onChange={e => setFormData({...formData, puesto_actual: e.target.value})} className="w-full bg-blue-50 border border-blue-200 rounded-xl py-3 px-4 mt-1 outline-none text-slate-900 font-bold focus:border-blue-500" required /></div>
                    </motion.div>
                  )}

                  {/* PESTAÑA 3: PERMISOS */}
                  {pestañaExpediente === 'permisos' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0" />
                            <p className="text-xs text-slate-600 font-medium">Selecciona los módulos a los que este empleado tendrá acceso en el menú lateral. Los módulos no marcados permanecerán ocultos para este usuario.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { label: 'Ventas', campo: 'ventas' }, { label: 'Usuarios', campo: 'usuarios' },
                            { label: 'Proyectos', campo: 'proyectos' }, { label: 'Inventario', campo: 'inventario' },
                            { label: 'Comunicados', campo: 'comunicados' }, { label: 'Panel', campo: 'panel' },
                            { label: 'Instalación', campo: 'instalacion' }, { label: 'Interconexión', campo: 'interconexion' },
                            { label: 'Ingeniería', campo: 'ingenieria' }, { label: 'Viabilidad', campo: 'agendar_viabilidad' },
                            { label: 'Finanzas', campo: 'finanzas' }, { label: 'Cotizaciones', campo: 'cotizaciones' },
                            { label: 'Revisión', campo: 'revision_cotizaciones' }, { label: 'Pagos', campo: 'administrador_pagos' }
                        ].map((perm) => (
                            <div key={perm.campo} onClick={() => setFormData({...formData, [perm.campo]: !formData[perm.campo as keyof typeof formData]})} className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all font-black text-[9px] uppercase tracking-widest ${formData[perm.campo as keyof typeof formData] ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                            {perm.label}
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${formData[perm.campo as keyof typeof formData] ? 'bg-white border-white text-orange-500' : 'bg-slate-100 border-slate-200'}`}>
                                {formData[perm.campo as keyof typeof formData] && <Check className="w-3 h-3" />}
                            </div>
                            </div>
                        ))}
                        </div>
                    </motion.div>
                  )}

                  {/* PESTAÑA 4: DOCUMENTOS E HISTORIAL (NUEVA) */}
                  {pestañaExpediente === 'documentos' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center justify-center py-10">
                        {modoEdicion ? (
                            <div className="w-full">
                                <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-blue-100 transition-colors cursor-pointer group mb-8">
                                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <UploadCloud className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <h4 className="text-slate-900 font-black text-sm uppercase">Subir Documento (PDF, JPG, PNG)</h4>
                                    <p className="text-slate-500 text-xs mt-1 font-medium">Contratos, identificaciones, constancias SAT.</p>
                                </div>

                                <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Documentos Archivados</h4>
                                <div className="space-y-3">
                                    {/* MOCK DE DOCUMENTOS (Aquí luego conectaremos con Supabase Storage) */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-orange-500" />
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase">Contrato_Indefinido_Firmado.pdf</p>
                                                <p className="text-[9px] font-bold text-slate-500">Subido el 15/Ene/2026 • 2.4 MB</p>
                                            </div>
                                        </div>
                                        <button className="text-blue-600 text-[10px] font-black uppercase hover:underline">Descargar</button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-blue-500" />
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase">INE_Frente_Reverso.jpg</p>
                                                <p className="text-[9px] font-bold text-slate-500">Subido el 15/Ene/2026 • 1.1 MB</p>
                                            </div>
                                        </div>
                                        <button className="text-blue-600 text-[10px] font-black uppercase hover:underline">Descargar</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-10">
                                <FileBadge className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-slate-900 font-black text-lg uppercase">Guarda el empleado primero</h3>
                                <p className="text-slate-500 text-xs font-medium mt-2 max-w-sm mx-auto">Para subir documentos o generar el expediente digital, primero debes completar y guardar la ficha de nuevo ingreso.</p>
                            </div>
                        )}
                    </motion.div>
                  )}

                  {/* PIE DEL MODAL (SIEMPRE VISIBLE) */}
                  <div className="pt-6 mt-8 flex justify-end gap-4 border-t border-slate-200">
                    <button type="button" onClick={() => setModalAbierto(false)} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-orange-500 transition-all flex items-center gap-2 uppercase text-[11px] tracking-widest">GUARDAR EXPEDIENTE <Save className="w-4 h-4"/></button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}