import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { 
  ArrowLeft, Camera, Calendar, MapPin, Fingerprint, 
  Briefcase, Network, Save, Loader2, PlaneTakeoff, Clock, CheckCircle2, 
  XCircle, FileBadge, Send, Eye, FileText, X, ChevronLeft, ChevronRight
} from 'lucide-react'

import solarisLogo from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'

// --- LÓGICA LEY FEDERAL DEL TRABAJO (MÉXICO 2023) ---
const calcularDiasLFT = (añosCumplidos: number) => {
    if (añosCumplidos < 1) return 0;
    if (añosCumplidos === 1) return 12;
    if (añosCumplidos === 2) return 14;
    if (añosCumplidos === 3) return 16;
    if (añosCumplidos === 4) return 18;
    if (añosCumplidos === 5) return 20;
    if (añosCumplidos >= 6 && añosCumplidos <= 10) return 22;
    if (añosCumplidos >= 11 && añosCumplidos <= 15) return 24;
    if (añosCumplidos >= 16 && añosCumplidos <= 20) return 26;
    if (añosCumplidos >= 21 && añosCumplidos <= 25) return 28;
    return 30; 
}

const festivosMexico = [
    { mes: 0, dia: 1 }, { mes: 1, dia: 5 }, { mes: 2, dia: 21 },
    { mes: 3, dia: 2 }, { mes: 3, dia: 3 }, { mes: 4, dia: 1 },
    { mes: 4, dia: 5 }, { mes: 8, dia: 16 }, { mes: 10, dia: 2 },
    { mes: 10, dia: 20 }, { mes: 11, dia: 25 },
]

export default function Perfil() {
  const navigate = useNavigate()
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [tabActiva, setTabActiva] = useState<'informacion' | 'documentos' | 'vacaciones'>('informacion')
  
  // Vacaciones & Calendario Interactivo
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [nuevaSolicitud, setNuevaSolicitud] = useState({ fecha_inicio: '', fecha_fin: '', dias_solicitados: 0, motivo: '' })
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)
  
  const [pickerMonth, setPickerMonth] = useState(new Date())
  const [rangoSeleccionado, setRangoSeleccionado] = useState<{start: Date | null, end: Date | null}>({start: null, end: null})

  // Edición Info Completa
  const [editData, setEditData] = useState({ 
      nombre: '', apellidos: '', fecha_nacimiento: '', rfc: '', curp: '', 
      direccion: '', telefono_movil: '', email_corporativo: '' 
  })
  const [guardandoInfo, setGuardandoInfo] = useState(false)

  // Documentos & Visor
  const [docPreview, setDocPreview] = useState<{ url: string, nombre: string } | null>(null)
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null)

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)

  useEffect(() => {
    const data = localStorage.getItem('session_gea_solar')
    if (!data) navigate('/login')
    else {
        const user = JSON.parse(data);
        setSessionUser(user);
        cargarPerfilCompleto(user.id);
    }
  }, [navigate])

  const cargarPerfilCompleto = async (userId: string) => {
    setCargando(true)
    const { data: pData } = await supabase.from('perfiles').select('*, jefe:perfiles!jefe_id(nombre, apellidos)').eq('id', userId).single()
    if (pData) {
        setPerfil(pData)
        setEditData({ 
            nombre: pData.nombre || '', apellidos: pData.apellidos || '', 
            fecha_nacimiento: pData.fecha_nacimiento || '', rfc: pData.rfc || '', 
            curp: pData.curp || '', direccion: pData.direccion || '', 
            telefono_movil: pData.telefono_movil || '', email_corporativo: pData.email_corporativo || '' 
        })
    }

    const { data: sData } = await supabase.from('solicitudes_ausencia').select('*').eq('user_id', userId).order('creado_at', { ascending: false })
    if (sData) setSolicitudes(sData)
    
    setCargando(false)
  }

  const resumenVacaciones = useMemo(() => {
      if (!perfil?.fecha_ingreso) return { total: 0, tomados: 0, restantes: 0, años: 0 };
      
      const ingreso = new Date(perfil.fecha_ingreso);
      const hoy = new Date();
      let años = hoy.getFullYear() - ingreso.getFullYear();
      
      if (hoy.getMonth() < ingreso.getMonth() || (hoy.getMonth() === ingreso.getMonth() && hoy.getDate() < ingreso.getDate())) {
          años--;
      }

      const totalDiasLey = calcularDiasLFT(años);
      const ultimoAniversario = new Date(hoy.getFullYear(), ingreso.getMonth(), ingreso.getDate());
      if (hoy < ultimoAniversario) ultimoAniversario.setFullYear(hoy.getFullYear() - 1);

      const diasTomados = solicitudes.reduce((acc, sol) => {
          const fechaSol = new Date(sol.fecha_inicio);
          if (fechaSol >= ultimoAniversario && (sol.estado === 'Aprobada' || sol.estado === 'Pendiente') && sol.tipo === 'Vacaciones') {
              return acc + sol.dias_solicitados;
          }
          return acc;
      }, 0);

      return { total: totalDiasLey, tomados: diasTomados, restantes: totalDiasLey - diasTomados, años }
  }, [perfil, solicitudes]);

  // --- LÓGICA DE CALENDARIO Y SELECCIÓN DE FECHAS ---
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
  const isHoliday = (date: Date) => festivosMexico.some(f => f.mes === date.getMonth() && f.dia === date.getDate());

  const handleDayClick = (dia: number) => {
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      const fechaClick = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), dia);

      if (fechaClick < hoy) return;

      if (!perfil?.fecha_ingreso) {
          alert("Aún no tienes Fecha de Ingreso. Pide a Recursos Humanos que actualice tu expediente.");
          return;
      }
      if (resumenVacaciones.restantes <= 0) {
          alert("Ya no tienes días de vacaciones disponibles para este ciclo (o tienes menos de 1 año en la empresa).");
          return;
      }
      
      if (isWeekend(fechaClick) || isHoliday(fechaClick)) return; 

      let newStart = rangoSeleccionado.start;
      let newEnd = rangoSeleccionado.end;

      if (!newStart || (newStart && newEnd)) {
          newStart = fechaClick;
          newEnd = null;
      } else if (fechaClick < newStart) {
          newStart = fechaClick;
          newEnd = null;
      } else {
          newEnd = fechaClick;
      }

      setRangoSeleccionado({ start: newStart, end: newEnd });

      if (newStart && newEnd) {
          let count = 0;
          let cur = new Date(newStart);
          while (cur <= newEnd) {
              if (!isWeekend(cur) && !isHoliday(cur)) count++;
              cur.setDate(cur.getDate() + 1);
          }
          
          const formatLocal = (d: Date) => {
              const offset = d.getTimezoneOffset() * 60000;
              return new Date(d.getTime() - offset).toISOString().split('T')[0];
          }

          setNuevaSolicitud(prev => ({
              ...prev, 
              fecha_inicio: formatLocal(newStart!), 
              fecha_fin: formatLocal(newEnd!), 
              dias_solicitados: count
          }));
      } else {
          setNuevaSolicitud(prev => ({...prev, dias_solicitados: 0, fecha_inicio: '', fecha_fin: ''}));
      }
  }

  // --- SUBIDA DE ARCHIVOS ---
  const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'avatar' | 'doc_ine' | 'doc_csf' | 'doc_domicilio' | 'doc_acta') => {
      const file = e.target.files?.[0];
      if (!file || !perfil) return;

      const esAvatar = tipo === 'avatar';
      const bucket = esAvatar ? 'avatars' : 'expedientes';
      if(esAvatar) setSubiendoAvatar(true); else setSubiendoDoc(tipo);
      
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${perfil.id}_${tipo}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
          
          await supabase.from('perfiles').update({ [esAvatar ? 'avatar_url' : tipo]: publicUrl }).eq('id', perfil.id);
          setPerfil({ ...perfil, [esAvatar ? 'avatar_url' : tipo]: publicUrl });

          if (esAvatar) {
              const updatedSession = { ...sessionUser, avatar_url: publicUrl };
              localStorage.setItem('session_gea_solar', JSON.stringify(updatedSession));
              setSessionUser(updatedSession);
          }
      } catch (err: any) {
          alert(`Error subiendo ${tipo}: ` + err.message);
      } finally {
          if(esAvatar) setSubiendoAvatar(false); else setSubiendoDoc(null);
      }
  }

  // --- ACCIONES PERFIL ---
  const guardarInformacion = async (e: React.FormEvent) => {
      e.preventDefault();
      setGuardandoInfo(true);
      await supabase.from('perfiles').update(editData).eq('id', perfil.id);
      setPerfil({ ...perfil, ...editData });
      
      if (editData.nombre !== sessionUser.nombre || editData.apellidos !== sessionUser.apellidos) {
          const updatedSession = { ...sessionUser, nombre: editData.nombre, apellidos: editData.apellidos };
          localStorage.setItem('session_gea_solar', JSON.stringify(updatedSession));
          setSessionUser(updatedSession);
      }
      setGuardandoInfo(false);
      alert("Información actualizada correctamente.");
  }

  const handleSolicitarVacaciones = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!perfil?.fecha_ingreso) return alert("No podemos procesar tu solicitud porque falta tu Fecha de Ingreso en el expediente.");
      if (resumenVacaciones.restantes <= 0) return alert("No tienes suficientes días disponibles.");
      if (nuevaSolicitud.dias_solicitados <= 0) return alert("Debes seleccionar un rango de fechas en el calendario que incluya al menos 1 día hábil.");
      if (nuevaSolicitud.dias_solicitados > resumenVacaciones.restantes) return alert("Estás solicitando más días de los que tienes disponibles.");
      
      setEnviandoSolicitud(true);
      try {
          const payload = {
              user_id: perfil.id, tipo: 'Vacaciones',
              fecha_inicio: nuevaSolicitud.fecha_inicio, fecha_fin: nuevaSolicitud.fecha_fin,
              dias_solicitados: nuevaSolicitud.dias_solicitados, motivo: nuevaSolicitud.motivo
          };
          const { data, error } = await supabase.from('solicitudes_ausencia').insert([payload]).select('*').single();
          if (error) throw error;

          if (perfil.jefe_id) {
              await supabase.from('notificaciones').insert([{ usuario_id: perfil.jefe_id, autor_id: perfil.id, mensaje: `ha solicitado ${payload.dias_solicitados} días de vacaciones.` }]);
          }

          if (data) setSolicitudes([data, ...solicitudes]);
          setNuevaSolicitud({ fecha_inicio: '', fecha_fin: '', dias_solicitados: 0, motivo: '' });
          setRangoSeleccionado({start: null, end: null});
          alert("¡Solicitud enviada a tu jefe directo con éxito!");
      } catch (err: any) {
          alert("Error al enviar la solicitud: " + err.message);
      } finally {
          setEnviandoSolicitud(false);
      }
  }

  const cancelarSolicitud = async (id: string) => {
      if(!confirm("¿Deseas cancelar esta solicitud de vacaciones?")) return;
      await supabase.from('solicitudes_ausencia').delete().eq('id', id);
      setSolicitudes(solicitudes.filter(s => s.id !== id));
  }

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-orange-500"/></div>

  const getAvatar = () => {
      if (perfil?.avatar_url) return <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />;
      return <span className="font-black text-4xl">{perfil?.nombre?.charAt(0)}{perfil?.apellidos?.charAt(0)}</span>;
  }

  const diasEnMes = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
  const diaInicioMes = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />

      {/* NAV BAR */}
      <nav className="bg-white/95 backdrop-blur-2xl border-b border-white/20 sticky top-0 z-50 shadow-lg h-16 flex items-center relative">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => navigate('/home')} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500"><ArrowLeft className="w-5 h-5 md:w-6 md:h-6"/></button>
            <img src={solarisLogo} alt="GEA" className="h-6 md:h-8 w-auto drop-shadow-sm" />
            <div className="h-6 w-px bg-slate-300 mx-1 md:mx-2 hidden sm:block" />
            <h1 className="font-black text-sm md:text-lg tracking-tight text-slate-900 uppercase italic hidden sm:block">Gestión de Perfil</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* COLUMNA 1: TARJETA DE PERFIL */}
            <aside className="col-span-1 lg:col-span-4 space-y-6">
                <div className="bg-white/95 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl border border-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-br from-yellow-400 to-orange-500 opacity-20"></div>
                    
                    <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mt-2 md:mt-4 mb-4 md:mb-6 group">
                        <div className="w-full h-full rounded-[1rem] md:rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-xl overflow-hidden border-[3px] md:border-4 border-white relative z-10">
                            {subiendoAvatar ? <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-orange-500"/> : getAvatar()}
                        </div>
                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 rounded-[1rem] md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-20 backdrop-blur-sm border-[3px] md:border-4 border-transparent">
                            <Camera className="w-5 h-5 md:w-6 md:h-6 mb-1"/>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">Cambiar</span>
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => handleSubirArchivo(e, 'avatar')} className="hidden" />
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase leading-none">{perfil?.nombre} {perfil?.apellidos}</h2>
                    <p className="text-[9px] md:text-[10px] font-black text-orange-600 bg-orange-50 px-2 md:px-3 py-1 rounded-md uppercase tracking-widest border border-orange-100 w-fit mx-auto mt-2 md:mt-3">{perfil?.rol_sistema}</p>
                    
                    <div className="mt-6 md:mt-8 space-y-3 md:space-y-4 text-left border-t border-slate-100 pt-5 md:pt-6">
                        <div className="flex items-center gap-3 text-slate-600"><Briefcase className="w-4 h-4 text-slate-400 shrink-0"/><div className="text-xs overflow-hidden"><p className="font-bold text-slate-900 uppercase">Departamento</p><p className="text-[10px] font-bold uppercase tracking-widest truncate">{perfil?.departamento}</p></div></div>
                        <div className="flex items-center gap-3 text-slate-600"><Network className="w-4 h-4 text-slate-400 shrink-0"/><div className="text-xs overflow-hidden"><p className="font-bold text-slate-900 uppercase">Jefe Directo</p><p className="text-[10px] font-bold uppercase tracking-widest truncate">{perfil?.jefe?.nombre ? `${perfil.jefe.nombre} ${perfil.jefe.apellidos}` : 'Nivel Directivo'}</p></div></div>
                        <div className="flex items-center gap-3 text-slate-600"><Calendar className="w-4 h-4 text-orange-500 shrink-0"/><div className="text-xs overflow-hidden"><p className="font-bold text-slate-900 uppercase">Fecha de Ingreso</p><p className="text-[10px] font-black text-orange-600 uppercase tracking-widest truncate">{perfil?.fecha_ingreso ? new Date(perfil.fecha_ingreso).toLocaleDateString('es-MX', {year: 'numeric', month: 'short', day: 'numeric'}) : 'No registrada'}</p></div></div>
                    </div>
                </div>
            </aside>

            {/* COLUMNA 2: CONTENIDO CENTRAL */}
            <section className="col-span-1 lg:col-span-8 space-y-6">
                
                {/* TABS DE NAVEGACION - RESPONSIVE SCROLL */}
                <div className="overflow-x-auto pb-2 -mb-2 custom-scrollbar">
                    <div className="flex bg-white/95 backdrop-blur-xl p-1.5 rounded-[20px] md:rounded-[24px] shadow-lg border border-white w-max min-w-full md:min-w-fit md:w-fit">
                        <button onClick={() => setTabActiva('informacion')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-[16px] md:rounded-[18px] text-[9px] md:text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest whitespace-nowrap ${tabActiva === 'informacion' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><Fingerprint className="w-3.5 h-3.5 md:w-4 md:h-4" /> Info</button>
                        <button onClick={() => setTabActiva('documentos')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-[16px] md:rounded-[18px] text-[9px] md:text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest whitespace-nowrap ${tabActiva === 'documentos' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><FileBadge className="w-3.5 h-3.5 md:w-4 md:h-4" /> Expediente</button>
                        <button onClick={() => setTabActiva('vacaciones')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-[16px] md:rounded-[18px] text-[9px] md:text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest whitespace-nowrap ${tabActiva === 'vacaciones' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}><PlaneTakeoff className="w-3.5 h-3.5 md:w-4 md:h-4" /> Vacaciones</button>
                    </div>
                </div>

                <AnimatePresence mode='wait'>
                    
                    {/* --- PESTAÑA 1: INFORMACIÓN GENERAL --- */}
                    {tabActiva === 'informacion' && (
                        <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/95 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl border border-white">
                            <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 md:pb-4 mb-4 md:mb-6 flex items-center gap-3"><Fingerprint className="w-5 h-5 md:w-6 md:h-6 text-purple-500"/> Ficha de Colaborador</h3>
                            <form onSubmit={guardarInformacion} className="space-y-4 md:space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre(s)</label><input type="text" value={editData.nombre || ''} onChange={e => setEditData({...editData, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors" required/></div>
                                    <div><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellidos</label><input type="text" value={editData.apellidos || ''} onChange={e => setEditData({...editData, apellidos: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors" required/></div>
                                    
                                    <div><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nacimiento</label><input type="date" value={editData.fecha_nacimiento || ''} onChange={e => setEditData({...editData, fecha_nacimiento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors"/></div>
                                    <div><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Teléfono Móvil</label><input type="text" value={editData.telefono_movil || ''} onChange={e => setEditData({...editData, telefono_movil: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors"/></div>
                                    
                                    <div><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">RFC</label><input type="text" value={editData.rfc || ''} onChange={e => setEditData({...editData, rfc: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors uppercase"/></div>
                                    <div><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">CURP</label><input type="text" value={editData.curp || ''} onChange={e => setEditData({...editData, curp: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors uppercase"/></div>
                                    
                                    <div className="md:col-span-2"><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Corporativo</label><input type="email" value={editData.email_corporativo || ''} onChange={e => setEditData({...editData, email_corporativo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors"/></div>
                                    <div className="md:col-span-2"><label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Dirección Completa</label><textarea value={editData.direccion || ''} onChange={e => setEditData({...editData, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 mt-1 md:mt-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors resize-none h-20 md:h-24"/></div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" disabled={guardandoInfo} className="w-full md:w-auto bg-slate-900 text-white px-8 md:px-12 py-3.5 md:py-4 rounded-[16px] md:rounded-[20px] font-black text-xs hover:bg-purple-600 transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-3">
                                        {guardandoInfo ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> Guardar</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* --- PESTAÑA 2: EXPEDIENTE PROFESIONAL --- */}
                    {tabActiva === 'documentos' && (
                        <motion.div key="docs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/95 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl border border-white">
                             <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 md:pb-4 mb-4 md:mb-6 flex items-center gap-3"><FileBadge className="w-5 h-5 md:w-6 md:h-6 text-blue-500"/> Expediente</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {[
                                    { k: 'doc_csf', n: 'Constancia Fiscal', i: <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600"/>, b: 'blue' },
                                    { k: 'doc_domicilio', n: 'Comp. de Domicilio', i: <MapPin className="w-5 h-5 md:w-6 md:h-6 text-orange-600"/>, b: 'orange' },
                                    { k: 'doc_ine', n: 'Identificación (INE)', i: <Fingerprint className="w-5 h-5 md:w-6 md:h-6 text-emerald-600"/>, b: 'emerald' },
                                    { k: 'doc_acta', n: 'Acta Nacimiento', i: <FileBadge className="w-5 h-5 md:w-6 md:h-6 text-pink-600"/>, b: 'pink' }
                                ].map(doc => (
                                    <div key={doc.k} className="bg-slate-50 border border-slate-200 rounded-[20px] md:rounded-3xl p-5 md:p-6 flex flex-col justify-between">
                                        <div className="flex items-center gap-3 md:gap-4 mb-4">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 bg-${doc.b}-100 rounded-xl flex items-center justify-center shrink-0`}>{doc.i}</div>
                                            <div><p className="font-black text-[11px] md:text-xs uppercase text-slate-900 leading-tight">{doc.n}</p><p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-0.5">{perfil?.[doc.k] ? 'Cargado' : 'Pendiente'}</p></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <label className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase text-center hover:bg-slate-100 cursor-pointer transition-colors shadow-sm relative flex items-center justify-center">
                                                {subiendoDoc === doc.k ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Subir Archivo'}
                                                <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleSubirArchivo(e, doc.k as any)}/>
                                            </label>
                                            {perfil?.[doc.k] && <button type="button" onClick={() => setDocPreview({url: perfil[doc.k], nombre: doc.n})} className="px-3 md:px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors shadow-sm"><Eye className="w-4 h-4"/></button>}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </motion.div>
                    )}

                    {/* --- PESTAÑA 3: VACACIONES --- */}
                    {tabActiva === 'vacaciones' && (
                        <motion.div key="vacaciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            
                            {!perfil?.fecha_ingreso ? (
                                <div className="bg-orange-50 border border-orange-200 rounded-[20px] md:rounded-[30px] p-5 md:p-6 text-center text-orange-700 font-bold text-xs md:text-sm">
                                    Pide a Recursos Humanos que registre tu Fecha de Ingreso en el sistema para habilitar el cálculo automático de vacaciones.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl rounded-[20px] md:rounded-[35px] p-6 md:p-8 text-center relative overflow-hidden">
                                        <div className="absolute -top-4 -right-4 w-20 h-20 md:w-24 md:h-24 bg-blue-500 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
                                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 md:mb-2">Por Ley</p>
                                        <p className="text-4xl md:text-5xl font-black italic text-slate-900">{resumenVacaciones.total}</p>
                                    </div>
                                    <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl rounded-[20px] md:rounded-[35px] p-6 md:p-8 text-center relative overflow-hidden">
                                        <div className="absolute -top-4 -right-4 w-20 h-20 md:w-24 md:h-24 bg-orange-500 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
                                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 md:mb-2">Utilizados</p>
                                        <p className="text-4xl md:text-5xl font-black italic text-slate-900">{resumenVacaciones.tomados}</p>
                                    </div>
                                    <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl rounded-[20px] md:rounded-[35px] p-6 md:p-8 text-center relative overflow-hidden">
                                        <div className="absolute -top-4 -right-4 w-20 h-20 md:w-24 md:h-24 bg-emerald-500 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
                                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 md:mb-2">Disponibles</p>
                                        <p className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">{resumenVacaciones.restantes}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* FORMULARIO: CALENDARIO VISUAL DE SELECCIÓN */}
                                <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl border border-white h-fit">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 md:pb-4 mb-4 md:mb-6 flex items-center gap-2"><Calendar className="w-4 h-4 md:w-5 md:h-5 text-orange-500"/> Seleccionar Fechas</h3>
                                    
                                    <div className="bg-slate-50 border border-slate-200 rounded-[20px] md:rounded-3xl p-4 md:p-6 mb-6">
                                        <div className="flex items-center justify-between mb-4 md:mb-6 px-1 md:px-2">
                                            <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))} className="p-1 md:p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"><ChevronLeft className="w-4 h-4 md:w-5 md:h-5"/></button>
                                            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-900">{mesesNombres[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}</h3>
                                            <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))} className="p-1 md:p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"><ChevronRight className="w-4 h-4 md:w-5 md:h-5"/></button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                            {['D','L','M','M','J','V','S'].map((d, i) => <div key={i} className="text-[9px] md:text-[10px] font-black text-slate-400">{d}</div>)}
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1 relative">
                                            {Array.from({ length: diaInicioMes }).map((_, i) => <div key={`empty-${i}`} className="h-8 md:h-10" />)}
                                            
                                            {Array.from({ length: diasEnMes }).map((_, i) => {
                                                const diaActual = i + 1;
                                                const fecha = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), diaActual);
                                                const hoy = new Date();
                                                hoy.setHours(0,0,0,0);
                                                
                                                const esInhabil = isWeekend(fecha) || isHoliday(fecha);
                                                const esStart = rangoSeleccionado.start?.getTime() === fecha.getTime();
                                                const esEnd = rangoSeleccionado.end?.getTime() === fecha.getTime();
                                                const isInRange = rangoSeleccionado.start && rangoSeleccionado.end && fecha >= rangoSeleccionado.start && fecha <= rangoSeleccionado.end;
                                                
                                                const estaOcupado = solicitudes.some(sol => {
                                                    if (sol.estado === 'Rechazada') return false;
                                                    const sStart = new Date(sol.fecha_inicio);
                                                    const sEnd = new Date(sol.fecha_fin);
                                                    return fecha >= sStart && fecha <= sEnd;
                                                });

                                                const esPasado = fecha < hoy;

                                                let bgColor = "bg-white hover:bg-orange-50 cursor-pointer text-slate-700 border border-transparent hover:border-orange-200";
                                                
                                                if (isInRange || esStart || esEnd) {
                                                    bgColor = "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md border-transparent";
                                                } else if (estaOcupado) {
                                                    bgColor = "bg-blue-100 text-blue-600 cursor-not-allowed border-blue-200 opacity-60";
                                                } else if (esInhabil) {
                                                    bgColor = "bg-emerald-50 text-emerald-600 cursor-not-allowed border-emerald-100";
                                                } else if (esPasado) {
                                                    bgColor = "bg-slate-50 text-slate-300 cursor-not-allowed";
                                                }

                                                return (
                                                    <div 
                                                        key={diaActual} 
                                                        onClick={() => handleDayClick(diaActual)}
                                                        className={`h-8 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all select-none ${bgColor}`}
                                                    >
                                                        {diaActual}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSolicitarVacaciones} className="space-y-4 md:space-y-6">
                                        <div className="bg-orange-50 border border-orange-200 rounded-[16px] md:rounded-2xl p-4 md:p-5 flex items-center justify-between">
                                            <div>
                                                <span className="block text-[9px] md:text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Días a Descontar:</span>
                                                <span className="text-[11px] md:text-xs font-bold text-slate-600">{nuevaSolicitud.dias_solicitados === 0 ? 'Selecciona rango' : `${nuevaSolicitud.fecha_inicio} / ${nuevaSolicitud.fecha_fin}`}</span>
                                            </div>
                                            <span className="text-2xl md:text-3xl font-black italic text-orange-600">{nuevaSolicitud.dias_solicitados}</span>
                                        </div>
                                        <div><textarea value={nuevaSolicitud.motivo || ''} onChange={e => setNuevaSolicitud({...nuevaSolicitud, motivo: e.target.value})} placeholder="Motivo o destino (Opcional)..." className="w-full bg-slate-50 border border-slate-200 rounded-[14px] md:rounded-2xl px-4 py-3 md:px-5 md:py-4 text-xs md:text-sm font-bold outline-none focus:border-orange-500 resize-none h-16 md:h-20" /></div>
                                        <button type="submit" disabled={enviandoSolicitud} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3.5 md:py-4 rounded-[16px] md:rounded-[20px] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3">
                                            {enviandoSolicitud ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin"/> : <><Send className="w-4 h-4 md:w-5 md:h-5"/> Enviar Solicitud</>}
                                        </button>
                                    </form>
                                </div>

                                {/* HISTORIAL */}
                                <div className="lg:col-span-5 bg-white/95 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl border border-white flex flex-col max-h-[500px] md:max-h-[750px]">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 md:pb-4 mb-4 md:mb-6 flex items-center gap-2 shrink-0"><Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-500"/> Historial</h3>
                                    <div className="overflow-y-auto pr-1 md:pr-2 space-y-3 md:space-y-4 custom-scrollbar flex-1">
                                        {solicitudes.length === 0 ? <p className="text-[10px] md:text-xs text-slate-400 font-bold text-center py-6 md:py-10">No hay solicitudes.</p> : solicitudes.map(sol => (
                                            <div key={sol.id} className="bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-3xl p-4 md:p-5 relative shadow-sm">
                                                <div className="flex justify-between items-start mb-2 md:mb-3">
                                                    <div>
                                                        <p className="text-xs md:text-sm font-black text-slate-900 uppercase">{sol.dias_solicitados} Días</p>
                                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 md:mt-1">{sol.fecha_inicio} al {sol.fecha_fin}</p>
                                                    </div>
                                                    <span className={`text-[7px] md:text-[8px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-md uppercase tracking-widest border
                                                        ${sol.estado === 'Aprobada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                                          sol.estado === 'Rechazada' ? 'bg-red-100 text-red-700 border-red-200' : 
                                                          'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                                        {sol.estado === 'Aprobada' && <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 inline mr-1 md:mr-1.5 -mt-0.5"/>}
                                                        {sol.estado === 'Rechazada' && <XCircle className="w-2.5 h-2.5 md:w-3 md:h-3 inline mr-1 md:mr-1.5 -mt-0.5"/>}
                                                        {sol.estado}
                                                    </span>
                                                </div>
                                                {sol.motivo && <p className="text-[10px] md:text-xs text-slate-600 font-medium italic mt-1 md:mt-2">"{sol.motivo}"</p>}
                                                {sol.estado === 'Pendiente' && <button onClick={() => cancelarSolicitud(sol.id)} className="text-[9px] md:text-[10px] font-black text-red-500 uppercase hover:underline mt-3 md:mt-4 block text-right w-full">Cancelar</button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </div>
      </main>

      {/* MODAL VISOR DE DOCUMENTOS */}
      <AnimatePresence>
          {docPreview && (
              <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={() => setDocPreview(null)}>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white" onClick={e => e.stopPropagation()}>
                      <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100">
                          <h3 className="font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 md:gap-3 text-xs md:text-base"><FileText className="w-5 h-5 md:w-6 md:h-6 text-orange-500"/> {docPreview.nombre}</h3>
                          <button onClick={() => setDocPreview(null)} className="p-1.5 md:p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors"><X className="w-5 h-5 md:w-6 md:h-6"/></button>
                      </div>
                      <div className="flex-1 bg-slate-800"><iframe src={docPreview.url} className="w-full h-full border-none" title={docPreview.nombre} /></div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

    </div>
  )
}