// @ts-nocheck

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer, ChevronRight, X, CheckCircle2, AlertCircle, Calendar,
  User, Check, MapPin, Clock, Zap, Settings, ArrowRight,
  Info, ShieldCheck, ClipboardCheck, Phone, Mail, MessageSquare, Loader2, Search
} from 'lucide-react'

import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import degradadoBg from '../assets/degradado.png'

const STEPS = [
  { id: 1, label: 'Ingeniería', icon: Zap, status: 'Revisión Técnica' },
  { id: 2, label: 'Mesa Control', icon: ShieldCheck, status: 'Auditoría Administrativa' },
  { id: 3, label: 'Agendar Visita', icon: Calendar, status: 'Programación en Campo' },
  { id: 4, label: 'Visita Campo', icon: MapPin, status: 'Verificación Técnica' },
  { id: 5, label: 'Gerencia', icon: ClipboardCheck, status: 'Aprobación Final' }
]

export default function Viabilidad() {
  const navigate = useNavigate()
  const [viabilidades, setViabilidades] = useState<any[]>([])
  const [ingenieros, setIngenieros] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
  const [showPanel, setShowPanel] = useState(false)

  // Formulario Agenda
  const [agendaForm, setAgendaForm] = useState({ ingeniero_id: '', fecha: '', hora: '' })

  // FILTROS Y BÚSQUEDA
  const [busqueda, setBusqueda] = useState('')
  const [filtroPaso, setFiltroPaso] = useState<number | 'Todos'>('Todos')

  const [comentarioPaso, setComentarioPaso] = useState('')

  // ESTADOS CHAT GLOBAL
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInicial, setChatInicial] = useState<any>(null)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  const fetchViabilidades = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('viabilidad_control')
      .select(`
        *,
        proyecto:proyecto_id (
          id, nombre_proyecto, giro_proyecto, estatus, vendedor:vendedor_id (nombre, apellidos, avatar_url),
          link_maps, calle, colonia, ciudad, estado_dir, codigo_postal, nombre_cliente, numero_cliente, requiere_escalera, comentarios_solicitud, fachada_url
        ),
        ingeniero:ingeniero_id (nombre, apellidos)
      `)
      .order('fecha_solicitada', { ascending: false })

    if (data) setViabilidades(data)

    const { data: engs } = await supabase
      .from('perfiles')
      .select('id, nombre, apellidos')
      .eq('rol_sistema', 'Ingeniería')
    if (engs) setIngenieros(engs)

    setCargando(false)
  }

  const viabilidadesFiltradas = useMemo(() => {
    return viabilidades.filter(v => {
      const p = v.proyecto || {};
      const vend = p.vendedor || {};
      
      const searchStr = `${p.nombre_proyecto || ''} ${p.giro_proyecto || ''} ${vend.nombre || ''} ${vend.apellidos || ''}`.toLowerCase();
      const matchTexto = searchStr.includes(busqueda.toLowerCase());

      const matchPaso = filtroPaso === 'Todos' || v.status === (filtroPaso as any);

      return matchTexto && matchPaso;
    });
  }, [viabilidades, busqueda, filtroPaso]);

  const handleAvanzarPaso = async (v: any, nuevoStatus: number, extraData = {}) => {
    setProcesando(true)
    try {
      const updates: any = { status: nuevoStatus, ...extraData }

      // Mapeo de fechas por paso
      if (nuevoStatus === 2) updates.fecha_revisada_ingenieria = new Date().toISOString()
      if (nuevoStatus === 3) updates.fecha_revisada_ventas = new Date().toISOString()
      if (nuevoStatus === 4) updates.fecha_agendada = new Date().toISOString()
      if (nuevoStatus === 5) updates.fecha_verificada = new Date().toISOString()
      if (nuevoStatus === 6) { // Finalizado
        updates.fecha_terminada = new Date().toISOString()
        updates.status = 5 // Mantener en 5 pero marcar proyecto como terminado
      }

      await supabase.from('viabilidad_control').update(updates).eq('id', v.id)

      // Reject to "Evaluación"
      if (nuevoStatus === 0) {
        await supabase.from('proyectos').update({ estatus: 'Evaluación' }).eq('id', v.proyecto_id);
      }
      // Send to "Revisión" (Step 1.5 basically, so we leave status at 1 but change estatus to 'Viabilidad - Revisión')
      else if (nuevoStatus === 1.5) {
        // We do NOT update viabilidad_control status here, just keep it 1, or maybe we do update it?
        // Let's update `viabilidad_control` to 1.5, meaning it's in Revision. 
        // Oh wait, `status` may be integer constraint. Let's just use 1 and rely on `sub_estatus`.
        // Let's actually update `viabilidad_control` to 1, but update `proyectos` estatus:
        await supabase.from('proyectos').update({ 
           estatus: 'Viabilidad - Revisión',
           sub_estatus: 'Revisión de Viabilidad'
        }).eq('id', v.proyecto_id);
      }
      else {
          const estatusMap: any = {
            2: 'Viabilidad',
            3: 'Viabilidad',
            4: 'Viabilidad',
            5: 'Viabilidad',
            6: 'Completado'
          }
          const subEstatusMap: any = {
            2: 'Solicitada',
            3: 'Visita Agendada',
            4: 'Visita Terminada',
            5: 'Revisión Gerencia'
          }

          if (estatusMap[nuevoStatus]) {
            await supabase.from('proyectos').update({ 
                estatus: estatusMap[nuevoStatus],
                sub_estatus: subEstatusMap[nuevoStatus] || null
            }).eq('id', v.proyecto_id)
          }
      }

      await supabase.from('proyectos_interacciones').insert([{
        proyecto_id: v.proyecto_id,
        usuario_id: usuarioLogueado.id,
        accion: nuevoStatus === 0 ? 'Rechazado a Evaluación' : (nuevoStatus === 1.5 ? 'Enviado a Revisión' : 'Avance Viabilidad'),
        mensaje: nuevoStatus === 0 ? `Se dictaminó no viable: ${(extraData as any).comentarios_cancelacion || ''}` : (nuevoStatus === 1.5 ? 'Se envía a aprobación en Revisión' : `Avance a Paso ${nuevoStatus}: ${STEPS.find(s => s.id === (nuevoStatus > 5 ? 5 : nuevoStatus))?.label}`)
      }])
      
      if (nuevoStatus === 1.5) {
          await enviarNotificacionRoles('notif_viabilidad_revision', `Viabilidad Técnica finalizada, requiere revisión gerencial: ${v.proyecto?.nombre_proyecto}|||/revision`, usuarioLogueado?.id);
      }

      fetchViabilidades()
      setShowPanel(false)
    } finally {
      setProcesando(false)
    }
  }

  useEffect(() => { fetchViabilidades() }, [])

  const handleAbrirPanel = (v: any) => {
    setProyectoSeleccionado(v)
    setComentarioPaso('')
    setAgendaForm({ ingeniero_id: v.ingeniero_id || '', fecha: v.agenda_fecha || '', hora: v.agenda_hora_inicio || '' })
    setShowPanel(true)
  }

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover overflow-x-hidden" style={{ backgroundImage: `url(${degradadoBg})` }}>

      <ChatGlobal
        isOpen={chatAbierto}
        onClose={() => setChatAbierto(false)}
        usuarioLogueado={usuarioLogueado}
        chatInicial={chatInicial}
      />

      <Header
        titulo="Viabilidad"
        onAbrirChat={(chatInit) => {
          setChatInicial(chatInit || null);
          setChatAbierto(true);
        }}
      />

      <main className="max-w-[1700px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10">

        {/* BARRA DE FILTROS Y BÚSQUEDA TIPO PREMIUM */}
        <div className="flex flex-col lg:flex-row gap-6 mb-10 items-stretch lg:items-center">

          {/* TABS DE ESTADOS */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 self-start md:self-auto w-full md:w-auto">
            <button onClick={() => setFiltroPaso('Todos')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${filtroPaso === 'Todos' ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-200' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
            <button onClick={() => setFiltroPaso(1)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${filtroPaso === 1 ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-200' : 'text-slate-400 hover:text-slate-600'}`}>Técnica</button>
            <button onClick={() => setFiltroPaso(2)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${filtroPaso === 2 ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-200' : 'text-slate-400 hover:text-slate-600'}`}>Control</button>
          </div>

          <div className="bg-white rounded-2xl border border-white shadow-sm flex items-center px-5 py-2 w-full lg:w-[350px]">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Buscar por proyecto o vendedor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-transparent outline-none flex-1 text-xs font-bold text-slate-700 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* LISTADO DE VIABILIDADES (HORIZONTAL CARDS) */}
        <div className="flex flex-col gap-4 mb-20">
          {cargando ? (
            <div className="py-20 text-center font-black text-slate-400 uppercase tracking-widest">Sincronizando flujo técnico...</div>
          ) : viabilidadesFiltradas.length === 0 ? (
            <div className="py-20 text-center bg-white/50 rounded-[40px] border border-white">
              <Info size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No hay resultados para tu búsqueda</p>
            </div>
          ) : (
            viabilidadesFiltradas.map((v) => (
              <div key={v.id} onClick={() => { setProyectoSeleccionado(v); setShowPanel(true); }} className="bg-white border border-slate-100 rounded-[20px] md:rounded-[25px] p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 group hover:border-orange-400 transition-all hover:shadow-xl cursor-pointer relative overflow-hidden">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-lg md:text-xl flex-shrink-0 shadow-md"> {v.proyecto?.nombre_proyecto?.charAt(0)} </div>
                      <div className="flex-1 overflow-hidden md:hidden">
                        <h4 className="font-black text-slate-950 text-[12px] uppercase italic tracking-tighter leading-none truncate">{v.proyecto?.nombre_proyecto}</h4>
                        <p className="text-[9px] font-semibold text-slate-600 uppercase mt-1.5 truncate flex items-center gap-1.5 leading-none"> <MapPin size={10} className="text-orange-400"/> {v.proyecto?.giro_proyecto} </p>
                      </div>
                  </div>
                  
                  <div className="flex-1 w-full min-w-0 hidden md:block">
                    <h3 className="font-black text-slate-950 text-base uppercase italic tracking-tighter leading-tight truncate group-hover:text-orange-600 transition-all">
                      {v.proyecto?.nombre_proyecto}
                    </h3>
                    <div className="flex items-center gap-2 mt-4 md:mt-2">
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${v.status === 1 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}><Zap size={10}/> Ing.</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 md:hidden flex-shrink-0" />
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${v.status === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><ShieldCheck size={10}/> Control</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 md:hidden flex-shrink-0" />
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${v.status === 3 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><Calendar size={10}/> Visita</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 md:hidden flex-shrink-0" />
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${v.status >= 5 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><CheckCircle2 size={10}/> Fin</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-200 flex items-center justify-center text-white font-black overflow-hidden shadow-lg shadow-slate-200">
                        {v.proyecto?.vendedor?.avatar_url ? <img src={v.proyecto.vendedor.avatar_url} className="w-full h-full object-cover" /> : <span>{v.proyecto?.vendedor?.nombre?.charAt(0)}</span>}
                      </div>
                      <div className="hidden md:block">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Vendedor</p>
                        <p className="text-[10px] font-bold text-slate-900 uppercase truncate max-w-[120px]">{v.proyecto?.vendedor?.nombre} {v.proyecto?.vendedor?.apellidos}</p>
                      </div>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* PANEL LATERAL DE PASOS (STATE MACHINE) */}
      <AnimatePresence>
        {showPanel && proyectoSeleccionado && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[600px] bg-slate-50 z-[101] shadow-2xl flex flex-col border-l border-white"
            >
              {/* Header Panel */}
                <div className="bg-slate-900 border-b border-white/10 p-6 md:p-8 shrink-0 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 text-white/5 rotate-12 pointer-events-none">
                    <Timer size={180} />
                  </div>
                  
                  <div className="flex items-center gap-5 relative z-10 w-full mb-6">
                    <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
                      <Timer className="w-7 h-7 text-orange-400" />
                    </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-white">Flujo Técnico</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Expediente de Viabilidad #{proyectoSeleccionado.id.substring(0, 6)}</p>
                  </div>
                </div>
                <button onClick={() => setShowPanel(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-orange-500 rounded-full transition-all text-white z-20">
                  <X size={20} />
                </button>
                <div className="bg-white/10 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 relative z-10 m-6 mt-0">
                  <h3 className="font-black uppercase italic tracking-widest text-sm text-white">{proyectoSeleccionado.proyecto?.nombre_proyecto}</h3>
                  <div className="grid grid-cols-2 gap-4 text-[9px] font-bold text-slate-300 uppercase">
                    <span className="flex items-center gap-1.5"><MapPin size={10} className="text-orange-500" /> Giro: {proyectoSeleccionado.proyecto?.giro_proyecto}</span>
                    <span className="flex items-center gap-1.5"><Clock size={10} className="text-orange-500" /> Iniciado: {new Date(proyectoSeleccionado.fecha_solicitada).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5 truncate"><User size={10} className="text-orange-500" /> Cliente: {proyectoSeleccionado.proyecto?.nombre_cliente}</span>
                    <span className="flex items-center gap-1.5"><Phone size={10} className="text-orange-500" /> Num: {proyectoSeleccionado.proyecto?.numero_cliente}</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase bg-slate-950/40 p-2 rounded-lg mt-1 border border-white/5">
                    <MapPin size={10} className="inline mr-1 text-orange-400" /> 
                    {proyectoSeleccionado.proyecto?.calle}, {proyectoSeleccionado.proyecto?.colonia}, {proyectoSeleccionado.proyecto?.ciudad}, {proyectoSeleccionado.proyecto?.estado_dir} CP: {proyectoSeleccionado.proyecto?.codigo_postal}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {proyectoSeleccionado.proyecto?.link_maps && (
                        <a href={proyectoSeleccionado.proyecto.link_maps} target="_blank" rel="noreferrer" className="flex-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 py-1.5 rounded-lg text-center font-black text-[9px] uppercase hover:bg-orange-500 hover:text-white transition-colors shadow-sm">Ver Maps</a>
                    )}
                    {proyectoSeleccionado.proyecto?.fachada_url && (
                        <a href={proyectoSeleccionado.proyecto.fachada_url} target="_blank" rel="noreferrer" className="flex-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 py-1.5 rounded-lg text-center font-black text-[9px] uppercase hover:bg-orange-500 hover:text-white transition-colors shadow-sm">Ver Fachada</a>
                    )}
                  </div>
                  {proyectoSeleccionado.proyecto?.comentarios_solicitud && (
                    <div className="bg-orange-500/10 border-l-2 border-orange-500 p-2 mt-1 text-[10px] text-orange-100 italic">
                      "{proyectoSeleccionado.proyecto.comentarios_solicitud}"
                    </div>
                  )}
                  {proyectoSeleccionado.proyecto?.requiere_escalera && (
                    <p className="text-xs font-black text-rose-400 uppercase mt-1 animate-pulse">⚠️ Requiere Escalera</p>
                  )}
                </div>
              </div>

              {/* Body Panel - Pasos */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="space-y-6">
                  {STEPS.map((step) => {
                    const isActive = proyectoSeleccionado.status === step.id
                    const isCompleted = proyectoSeleccionado.status > step.id
                    const isLocked = proyectoSeleccionado.status < step.id

                    return (
                      <div key={step.id} className="relative">
                        {/* Linea conectora */}
                        {step.id < 5 && (
                          <div className={`absolute left-7 top-14 w-0.5 h-12 ${isCompleted ? 'bg-orange-500' : 'bg-slate-200'}`} />
                        )}

                        <div className={`flex gap-6 transition-all ${isLocked ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-all ${isCompleted ? 'bg-orange-500 text-white shadow-orange-500/20' :
                            isActive ? 'bg-orange-500 text-white shadow-xl scale-110 ring-4 ring-orange-100' :
                              'bg-white text-slate-300'
                            }`}>
                            {isCompleted ? <Check size={24} strokeWidth={4} /> : <step.icon size={24} />}
                          </div>

                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className={`font-black uppercase italic tracking-tighter text-sm md:text-base leading-none ${isActive ? 'text-slate-900 scale-105 origin-left transition-transform' : 'text-slate-800'}`}>
                                  Paso {step.id}: {step.label}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{step.status}</p>
                              </div>
                              {isCompleted && <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md uppercase border border-orange-100 shadow-sm">Completado</span>}
                              {isActive && <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md uppercase border border-orange-100 shadow-sm animate-pulse">En Proceso</span>}
                              {isLocked && <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Pendiente</span>}
                            </div>

                            {/* Acciones de cada paso */}
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 bg-white border border-orange-200 p-5 rounded-[25px] shadow-xl"
                              >
                                {step.id === 1 && (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Revisión técnica inicial por el área de ingeniería. Valida si la solicitud tiene la información básica necesaria.</p>
                                    <textarea
                                      value={comentarioPaso}
                                      onChange={e => setComentarioPaso(e.target.value)}
                                      placeholder="Observaciones de ingeniería..."
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500 min-h-[80px]"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleAvanzarPaso(proyectoSeleccionado, 1.5, { comentarios_ingenieria: comentarioPaso })}
                                        disabled={procesando}
                                        className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg disabled:opacity-50"
                                      >
                                        {procesando ? 'Procesando...' : 'Enviar a Revisión'}
                                      </button>
                                      <button
                                        onClick={() => handleAvanzarPaso(proyectoSeleccionado, 0, { comentarios_cancelacion: comentarioPaso })}
                                        className="px-4 py-3 border border-slate-200 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all font-black text-[10px] uppercase"
                                      >
                                        Rechazar
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {step.id === 2 && (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Mesa de Control valida la viabilidad administrativa y comercial del proyecto.</p>
                                    <textarea
                                      value={comentarioPaso}
                                      onChange={e => setComentarioPaso(e.target.value)}
                                      placeholder="Comentarios de Mesa de Control..."
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500 min-h-[80px]"
                                    />
                                    <button
                                      onClick={() => handleAvanzarPaso(proyectoSeleccionado, 3, { comentarios_revision_ingenieria: comentarioPaso })}
                                      disabled={procesando}
                                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg disabled:opacity-50"
                                    >
                                      {procesando ? 'Procesando...' : 'Aprobar Control'}
                                    </button>
                                  </div>
                                )}
                                {step.id === 3 && (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Selecciona un ingeniero y establece la fecha/hora de la visita física.</p>
                                    <div className="space-y-3">
                                      <select
                                        value={agendaForm.ingeniero_id}
                                        onChange={e => setAgendaForm({ ...agendaForm, ingeniero_id: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500"
                                      >
                                        <option value="">Seleccionar Ingeniero...</option>
                                        {ingenieros.map(eng => <option key={eng.id} value={eng.id}>{eng.nombre} {eng.apellidos}</option>)}
                                      </select>
                                      <input
                                        type="date"
                                        value={agendaForm.fecha}
                                        onChange={e => setAgendaForm({ ...agendaForm, fecha: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500"
                                      />
                                      <input
                                        type="time"
                                        value={agendaForm.hora}
                                        onChange={e => setAgendaForm({ ...agendaForm, hora: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500"
                                      />
                                      <button
                                        onClick={() => handleAvanzarPaso(proyectoSeleccionado, 3, { agenda_fecha: agendaForm.fecha, agenda_hora_inicio: agendaForm.hora })}
                                        disabled={procesando || !agendaForm.fecha || !agendaForm.hora}
                                        className="w-full bg-slate-900 text-white hover:bg-orange-500 border-none py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all shadow-md mt-4 disabled:opacity-50"
                                      >
                                        {procesando ? 'Agendando...' : 'Confirmar Cita'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {step.id === 4 && (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Registro de hallazgos en campo. Sube fotos y detalles técnicos.</p>
                                    <textarea
                                      value={comentarioPaso}
                                      onChange={e => setComentarioPaso(e.target.value)}
                                      placeholder="Hallazgos en campo..."
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500 min-h-[80px]"
                                    />
                                    <button
                                      onClick={() => handleAvanzarPaso(proyectoSeleccionado, 5, { comentarios_ingenieria: comentarioPaso })}
                                      disabled={procesando}
                                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg disabled:opacity-50"
                                    >
                                      {procesando ? 'Procesando...' : 'Finalizar Visita'}
                                    </button>
                                  </div>
                                )}
                                {step.id === 5 && (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Vo.Bo. Final de Gerencia Técnica para proceder con la ingeniería oficial.</p>
                                    <textarea
                                      value={comentarioPaso}
                                      onChange={e => setComentarioPaso(e.target.value)}
                                      placeholder="Dictamen de Gerencia..."
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500 min-h-[80px]"
                                    />
                                    <button
                                      onClick={() => handleAvanzarPaso(proyectoSeleccionado, 6, { comentarios_revision_gerencia: comentarioPaso })}
                                      disabled={procesando}
                                      className="w-full bg-slate-900 text-white py-3 rounded-[20px] shadow-md hover:bg-orange-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                                    >
                                      {procesando ? 'Procesando...' : 'Aprobación Final'}
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer Panel */}
              <div className="p-8 bg-white border-t border-slate-100 shrink-0 space-y-3">
                <button
                  onClick={() => setChatAbierto(true)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white transition-all group"
                >
                  <MessageSquare size={18} className="text-orange-500 group-hover:text-white" />
                  Chat del Proyecto
                </button>
                
                {proyectoSeleccionado.status > 0 && proyectoSeleccionado.status < 5 && (
                  <button
                    onClick={() => {
                        if(!comentarioPaso) {
                          alert("Por favor, ingresa el motivo de la cancelación en el campo de comentarios.");
                          return;
                        }
                        handleAvanzarPaso(proyectoSeleccionado, 0, { comentarios_cancelacion: comentarioPaso })
                    }}
                    disabled={procesando}
                    className="w-full bg-red-50 text-red-600 border border-red-100 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                  >
                    {procesando ? 'Cancelando...' : 'Cancelar Viabilidad'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChatGlobal 
        isOpen={chatAbierto} 
        onClose={() => setChatAbierto(false)} 
        usuarioLogueado={usuarioLogueado}
        chatInicial={chatInicial}
      />
    </div>
  )
}
