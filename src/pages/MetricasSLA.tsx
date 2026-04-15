import { useDialog } from '../context/DialogContext'
import { useEffect, useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Filter, Loader2, Download } from 'lucide-react'
import { toJpeg } from 'html-to-image'

import { supabase } from '../supabaseClient'
import logoBase from '../assets/solarislogo.png'
import degradadoBg from '../assets/degradado.png'
import ChatGlobal from '../components/ChatGlobal'
import Header from '../components/Header'

const COLORS_PIE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#06b6d4', '#eab308', '#f43f5e', '#a855f7'];

const GaugeChart = ({ value, max, title }: { value: number, max: number, title: string }) => {
  // Protección contra NaN o infinitos
  const valSeguro = (isNaN(value) || value < 0) ? 0 : value;
  const maxReal = max > valSeguro ? max : (valSeguro > 0 ? valSeguro * 2 : 100);
  const data = [
    { name: 'Actual', value: valSeguro, fill: '#f59e0b' },
    { name: 'Restante', value: maxReal - valSeguro, fill: '#e2e8f0' }
  ];

  return (
    <div className="flex flex-col items-center relative py-4 border border-slate-200 rounded-2xl bg-white shadow-sm w-full h-full">
      <h4 className="text-xs md:text-sm text-slate-700 font-bold mb-2">{title}</h4>
      <div className="h-28 w-full max-w-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute bottom-1 left-0 right-0 flex justify-between px-4 text-[9px] font-bold text-slate-400">
          <span>0.00</span>
          <span>{maxReal.toFixed(2)}</span>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <span className="text-2xl text-slate-600 font-black">{valSeguro.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default function MetricasSLA() {
    const { showAlert, showConfirm } = useDialog();
  const [cargando, setCargando] = useState(true)
  const [proyectos, setProyectos] = useState<any[]>([])
  const [viabilidades, setViabilidades] = useState<any[]>([])

  // Tabs
  const [mainTab, setMainTab] = useState<'Cotizaciones' | 'Viabilidad'>('Cotizaciones')

  // ESTADOS CHAT GLOBAL
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInicial, setChatInicial] = useState<any>(null)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  // Filtros Cotización
  // Por defecto fechas del mes en curso
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(firstDay)
  const [fechaFin, setFechaFin] = useState(lastDay)

  const capturarPantalla = async () => {
    const elemento = document.getElementById('dashboard-captura');
    if (!elemento) return;
    try {
      const dataUrl = await toJpeg(elemento, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = `Dashboard_SLA_${new Date().getTime()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      await showAlert('Aviso', 'Hubo un error al generar la imagen. Intenta nuevamente.');
    }
  }

  const fetchMetricas = async () => {
    setCargando(true)
    const [resProys, resViab] = await Promise.all([
      supabase.from('proyectos').select(`*, vendedor:vendedor_id (nombre, apellidos)`).order('created_at', { ascending: false }),
      supabase.from('viabilidad_control').select(`*, proyecto:proyecto_id (nombre_proyecto, giro_proyecto), ingeniero:ingeniero_id (nombre, apellidos)`)
    ]);

    if (resProys.data) setProyectos(resProys.data)
    if (resViab.data) setViabilidades(resViab.data)
    setCargando(false)
  }

  useEffect(() => { fetchMetricas() }, [])

  // -------------------------------------------------------------
  // PROCESAMIENTO PESTAÑA: COTIZACIONES
  // -------------------------------------------------------------
  const proysCotizacion = useMemo(() => {
    let filtrados = proyectos.filter(p => p.estatus.includes('Cotización') || p.estatus.includes('Recotización') || p.estatus === 'Cotizado');

    if (fechaInicio) {
      filtrados = filtrados.filter(p => new Date(p.created_at) >= new Date(fechaInicio));
    }
    if (fechaFin) {
      const dFin = new Date(fechaFin);
      dFin.setHours(23, 59, 59, 999);
      filtrados = filtrados.filter(p => new Date(p.created_at) <= dFin);
    }
    return filtrados;
  }, [proyectos, fechaInicio, fechaFin]);

  const kpisCot = useMemo(() => {
    const totales = proysCotizacion.length;
    const pendientes = proysCotizacion.filter(p => p.estatus !== 'Cotizado').length;
    const cotizados = proysCotizacion.filter(p => p.estatus === 'Cotizado').length;

    // Agrupar por Ingenieros evaluando si es Recotizacion o Cotizacion
    const vendMap: Record<string, number> = {};
    const giroMap: Record<string, number> = {};
    const origenMap: Record<string, number> = { 'App': 0, 'Chatbot': 0 };

    let sumHrsCotizacion = 0; let countHrsCotizacion = 0;
    let sumHrsAprob = 0; let countHrsAprob = 0;
    let sumHrsProceso = 0; let countHrsProceso = 0;

    proysCotizacion.forEach(p => {
      const isRecotz = p.estatus.includes('Recotización') || p.fecha_recotizado != null;

      let u = 'Sin Asignar';
      if (isRecotz && p.ingeniero_recotizador?.nombre) {
         u = `${p.ingeniero_recotizador.nombre} ${p.ingeniero_recotizador.apellidos}`.trim();
      } else if (!isRecotz && p.ingeniero?.nombre) {
         u = `${p.ingeniero.nombre} ${p.ingeniero.apellidos}`.trim();
      } else if (p.ingeniero?.nombre) { // fallback just in case
         u = `${p.ingeniero.nombre} ${p.ingeniero.apellidos}`.trim();
      }

      vendMap[u] = (vendMap[u] || 0) + 1;

      const g = p.giro_proyecto || 'Desconocido';
      giroMap[g] = (giroMap[g] || 0) + 1;

      const org = p.origen_cotizacion || 'App';
      origenMap[org] = (origenMap[org] || 0) + 1;

      const creado = new Date(p.created_at).getTime();

      if (isRecotz) {
        if (p.fecha_inicio_recotizacion && p.fecha_recotizado) {
          const diffHr = (new Date(p.fecha_recotizado).getTime() - new Date(p.fecha_inicio_recotizacion).getTime()) / 3600000;
          if (diffHr >= 0) { sumHrsCotizacion += diffHr; countHrsCotizacion++; }
        }
        if (p.fecha_recotizado && p.fecha_aprobacion_recotizacion) {
          const diffHr = (new Date(p.fecha_aprobacion_recotizacion).getTime() - new Date(p.fecha_recotizado).getTime()) / 3600000;
          if (diffHr >= 0) { sumHrsAprob += diffHr; countHrsAprob++; }
        }
        // Total Recotizacion (desde que vuelve a entrar a recotizar hasta que se aprueba)
        if (p.fecha_aprobacion_recotizacion && p.fecha_inicio_recotizacion) {
          const diffHr = (new Date(p.fecha_aprobacion_recotizacion).getTime() - new Date(p.fecha_inicio_recotizacion).getTime()) / 3600000;
          if (diffHr >= 0) { sumHrsProceso += diffHr; countHrsProceso++; }
        }
      } else {
        if (p.fecha_inicio_cotizacion && p.fecha_cotizado) {
          const diffHr = (new Date(p.fecha_cotizado).getTime() - new Date(p.fecha_inicio_cotizacion).getTime()) / 3600000;
          if (diffHr >= 0) { sumHrsCotizacion += diffHr; countHrsCotizacion++; }
        }
        if (p.fecha_cotizado && p.fecha_aprobacion_cotizacion) {
          const diffHr = (new Date(p.fecha_aprobacion_cotizacion).getTime() - new Date(p.fecha_cotizado).getTime()) / 3600000;
          if (diffHr >= 0) { sumHrsAprob += diffHr; countHrsAprob++; }
        }
        // Total Cotizacion
        if (p.fecha_aprobacion_cotizacion) {
          const diffHr = (new Date(p.fecha_aprobacion_cotizacion).getTime() - creado) / 3600000;
          if (diffHr >= 0) { sumHrsProceso += diffHr; countHrsProceso++; }
        }
      }
    });

    const chartVendedores = Object.entries(vendMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const chartGiros = Object.entries(giroMap).map(([name, value]) => ({ name, value }));
    const chartOrigen = Object.entries(origenMap).map(([name, value]) => ({ name, value }));

    return {
      totales, pendientes, cotizados,
      chartVendedores, chartGiros, chartOrigen,
      promCot: countHrsCotizacion ? sumHrsCotizacion / countHrsCotizacion : 0,
      promAprob: countHrsAprob ? sumHrsAprob / countHrsAprob : 0,
      promProc: countHrsProceso ? sumHrsProceso / countHrsProceso : 0,
    }
  }, [proysCotizacion]);

  // -------------------------------------------------------------
  // PROCESAMIENTO PESTAÑA: VIABILIDAD
  // -------------------------------------------------------------
  const proysViabilidad = useMemo(() => {
    let filtrados = viabilidades;
    if (fechaInicio) filtrados = filtrados.filter(v => new Date(v.fecha_solicitada) >= new Date(fechaInicio));
    if (fechaFin) {
      const dFin = new Date(fechaFin);
      dFin.setHours(23, 59, 59, 999);
      filtrados = filtrados.filter(v => new Date(v.fecha_solicitada) <= dFin);
    }
    return filtrados;
  }, [viabilidades, fechaInicio, fechaFin]);

  const kpisViab = useMemo(() => {
    const totales = proysViabilidad.length;
    const activos = proysViabilidad.filter(v => v.status < 5).length;
    const terminados = proysViabilidad.filter(v => v.fecha_terminada != null).length;
    const cancelados = proysViabilidad.filter(v => v.comentarios_cancelacion != null).length;

    let sumHrsIng = 0; let countHrsIng = 0;
    let sumHrsControl = 0; let countHrsControl = 0;
    let sumHrsAgendado = 0; let countHrsAgendado = 0;
    let sumHrsTotal = 0; let countHrsTotal = 0;

    proysViabilidad.forEach(v => {
      // 1. Solicitud -> Revisión Ingeniería
      if (v.fecha_solicitada && v.fecha_revisada_ingenieria) {
        const diff = (new Date(v.fecha_revisada_ingenieria).getTime() - new Date(v.fecha_solicitada).getTime()) / 3600000;
        if (diff >= 0) { sumHrsIng += diff; countHrsIng++; }
      }
      // 2. Revisión Ingeniería -> Mesa Control
      if (v.fecha_revisada_ingenieria && v.fecha_revisada_ventas) {
        const diff = (new Date(v.fecha_revisada_ventas).getTime() - new Date(v.fecha_revisada_ingenieria).getTime()) / 3600000;
        if (diff >= 0) { sumHrsControl += diff; countHrsControl++; }
      }
      // 3. Agendado -> Visita Campo
      if (v.fecha_agendada && v.fecha_verificada) {
        const diff = (new Date(v.fecha_verificada).getTime() - new Date(v.fecha_agendada).getTime()) / 3600000;
        if (diff >= 0) { sumHrsAgendado += diff; countHrsAgendado++; }
      }
      // Total Proceso
      if (v.fecha_solicitada && v.fecha_terminada) {
        const diff = (new Date(v.fecha_terminada).getTime() - new Date(v.fecha_solicitada).getTime()) / 3600000;
        if (diff >= 0) { sumHrsTotal += diff; countHrsTotal++; }
      }
    });

    const engMap: Record<string, number> = {};
    proysViabilidad.forEach(v => {
      if (v.ingeniero) {
        const n = `${v.ingeniero.nombre} ${v.ingeniero.apellidos}`;
        engMap[n] = (engMap[n] || 0) + 1;
      }
    });
    const topIngenieros = Object.entries(engMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      totales, activos, terminados, cancelados, topIngenieros,
      promIng: countHrsIng ? sumHrsIng / countHrsIng : 0,
      promControl: countHrsControl ? sumHrsControl / countHrsControl : 0,
      promVisita: countHrsAgendado ? sumHrsAgendado / countHrsAgendado : 0,
      promTotal: countHrsTotal ? sumHrsTotal / countHrsTotal : 0
    }
  }, [proysViabilidad]);

  const RenderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-2 text-xs rounded-lg shadow-xl font-bold">
          {`${payload[0].name} : ${payload[0].value}`}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans flex flex-col bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <Header 
        titulo="Métricas Solaris" 
        onAbrirChat={(chatInit) => {
          setChatInicial(chatInit || null);
          setChatAbierto(true);
        }} 
      />

      <main className="max-w-[1800px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 flex-1 flex flex-col relative z-10">

        {/* TABS SUPERIORES Y BOTON DESCARGA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 w-full">
          <div className="flex bg-white rounded-2xl p-2 shadow-sm border border-slate-100 justify-center w-full md:w-auto">
            <button onClick={() => setMainTab('Cotizaciones')} className={`flex-1 md:flex-none px-6 py-2.5 outline-none rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mainTab === 'Cotizaciones' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}>
              Cotizaciones
            </button>
            <button onClick={() => setMainTab('Viabilidad')} className={`flex-1 md:flex-none px-6 py-2.5 outline-none rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mainTab === 'Viabilidad' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}>
              Viabilidad
            </button>
          </div>
          <button onClick={capturarPantalla} className="w-full md:w-auto px-6 py-3.5 bg-orange-500 hover:bg-orange-600 outline-none rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-white shadow-xl flex justify-center items-center gap-2">
            <Download size={18} /> Descargar Reporte
          </button>
        </div>

        {cargando ? (
          <div className="flex-1 flex flex-col justify-center items-center">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
            <p className="font-black text-slate-500 uppercase tracking-widest">Sincronizando Tableros...</p>
          </div>
        ) : mainTab === 'Cotizaciones' ? (
          <div id="dashboard-captura" className="flex flex-col gap-6 p-4 rounded-[40px] bg-slate-50">

            {/* HEADER ESTILIZADO HOMOLOGADO */}
            <div className="bg-gradient-to-r from-orange-400 to-amber-500 text-center w-full py-6 px-8 flex justify-between items-center rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 opacity-20 w-full h-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #ffffff 0, transparent 50%), radial-gradient(circle at 0 0, #ffffff 0, transparent 50%)' }}></div>
              <div className="w-[120px] hidden md:block z-10" />
              <h1 className="text-3xl md:text-4xl font-black text-white px-2 uppercase tracking-tighter shadow-black/20 drop-shadow-md italic z-10">Cotizaciones</h1>
              <div className="w-[120px] bg-white rounded-2xl flex justify-center py-2 z-10 shadow-inner">
                <img src={logoBase} alt="Gea" className="h-6" />
              </div>
            </div>

            {/* FILA 1: KPIs y Filtros */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">

              {/* Filtro Fecha */}
              <div className="bg-white border text-center border-slate-100 rounded-3xl p-5 md:p-6 flex-1 flex flex-col shadow-sm max-w-full lg:max-w-[320px]">
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 text-left mb-3">Fecha de Creación</h4>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-colors" />
                  <span className="text-slate-300 font-bold hidden sm:block">-</span>
                  <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-colors" />
                </div>
              </div>

              {/* KPIs */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="w-full h-1 bg-slate-100 absolute top-0"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Proyectos</h4>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisCot.totales}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="w-full h-1 bg-amber-400 absolute top-0"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Pendientes</h4>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisCot.pendientes}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="w-full h-1 bg-emerald-400 absolute top-0"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Cotizados</h4>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisCot.cotizados}</p>
              </div>

            </div>

            {/* FILA 2+3: Gráficas Completas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* COLUMNA IZQUIERDA: Vendedores */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
                <h4 className="text-xs font-black uppercase tracking-widest text-center text-slate-400 mb-6">Analítica de Ingenieros</h4>
                <div className="flex-1 flex flex-col items-center justify-center -ml-8">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={kpisCot.chartVendedores} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none">
                        {kpisCot.chartVendedores.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />))}
                      </Pie>
                      <Tooltip content={<RenderCustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col text-[8px] md:text-[9px] gap-1 px-4 custom-scrollbar max-h-48 overflow-y-auto">
                  <p className="font-bold border-b border-slate-100 pb-1 mb-1">Nombre Completo</p>
                  {kpisCot.chartVendedores.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS_PIE[i % COLORS_PIE.length] }} /><span className="truncate">{v.name}</span></div>
                  ))}
                </div>
              </div>

              {/* COLUMNA CENTRO: Origen y Giro */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col">
                  <h4 className="text-xs font-black uppercase tracking-widest text-center text-slate-400 mb-4">Origen de Cotización</h4>
                  <div className="flex-1 flex items-center justify-center">
                    <ResponsiveContainer width={150} height={150}>
                      <PieChart>
                        <Pie data={kpisCot.chartOrigen} cx="50%" cy="50%" outerRadius={70} dataKey="value" stroke="none">
                          <Cell fill="#fcd34d" />
                          <Cell fill="#bfdbfe" />
                        </Pie>
                        <Tooltip content={<RenderCustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="ml-4 flex flex-col gap-1 text-[9px]">
                      <p className="font-bold mb-1">OrigenCreacion</p>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#fcd34d]" /><span>App</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#bfdbfe]" /><span>Chatbot</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col">
                  <h4 className="text-xs font-black uppercase tracking-widest text-center text-slate-400 mb-4">Giro del Proyecto</h4>
                  <div className="flex-1 flex items-center justify-center">
                    <ResponsiveContainer width={150} height={150}>
                      <PieChart>
                        <Pie data={kpisCot.chartGiros} cx="50%" cy="50%" outerRadius={70} dataKey="value" stroke="none">
                          {kpisCot.chartGiros.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />))}
                        </Pie>
                        <Tooltip content={<RenderCustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="ml-4 flex flex-col gap-1 text-[9px] max-h-32 overflow-y-auto">
                      <p className="font-bold mb-1">GiroCategoria</p>
                      {kpisCot.chartGiros.map((g, i) => (
                        <div key={i} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS_PIE[i % COLORS_PIE.length] }} /><span>{g.name}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: Gauges de SLA */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <GaugeChart title="Promedio Horas Cotización" value={kpisCot.promCot} max={24} />
                <GaugeChart title="Promedio Horas Aprobación Cotización" value={kpisCot.promAprob} max={12} />
                <GaugeChart title="Promedio Horas Proceso Cotización" value={kpisCot.promProc} max={48} />
              </div>

            </div>

          </div>
        ) : (
          <div id="dashboard-captura" className="flex flex-col gap-6 p-4 rounded-[40px] bg-slate-50">

            {/* HEADER ESTILIZADO HOMOLOGADO */}
            <div className="bg-gradient-to-r from-emerald-400 to-teal-500 text-center w-full py-6 px-8 flex justify-between items-center rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 opacity-20 w-full h-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #ffffff 0, transparent 50%), radial-gradient(circle at 0 0, #ffffff 0, transparent 50%)' }}></div>
              <div className="w-[120px] hidden md:block z-10" />
              <h1 className="text-3xl md:text-4xl font-black text-white px-2 uppercase tracking-tighter shadow-black/20 drop-shadow-md italic z-10">Métricas Viabilidad</h1>
              <div className="w-[120px] bg-white rounded-2xl flex justify-center py-2 z-10 shadow-inner">
                <img src={logoBase} alt="Gea" className="h-6" />
              </div>
            </div>

            {/* FILA 1: KPIs y Filtros */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
              {/* Filtro Fecha */}
              <div className="bg-white border text-center border-slate-100 rounded-3xl p-5 md:p-6 flex-1 flex flex-col shadow-sm max-w-full lg:max-w-[320px]">
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 text-left mb-3">Solicitadas desde</h4>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-colors" />
                  <span className="text-slate-300 font-bold hidden sm:block">-</span>
                  <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-colors" />
                </div>
              </div>

              {/* KPIs */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="w-full h-1 bg-slate-100 absolute top-0"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Solicitudes</h4>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisViab.totales}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="w-full h-1 bg-blue-400 absolute top-0"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">En Proceso</h4>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisViab.activos}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="w-full h-1 bg-emerald-400 absolute top-0"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Terminadas</h4>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisViab.terminados}</p>
              </div>
              {kpisViab.cancelados > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 flex-1 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                  <div className="w-full h-1 bg-red-400 absolute top-0"></div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Canceladas</h4>
                  <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900">{kpisViab.cancelados}</p>
                </div>
              )}
            </div>

            {/* FILA 2: Gráficas y SLAs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Top Ingenieros */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
                <h4 className="text-xs font-black uppercase tracking-widest text-center text-slate-400 mb-6">Asignaciones por Ingeniero</h4>
                <div className="flex-1 flex flex-col items-center justify-center -ml-8">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={kpisViab.topIngenieros} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none">
                        {kpisViab.topIngenieros.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />))}
                      </Pie>
                      <Tooltip content={<RenderCustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col text-[10px] gap-2 px-4 custom-scrollbar max-h-48 overflow-y-auto">
                    {kpisViab.topIngenieros.length === 0 ? <p className="text-center text-slate-400">Sin ingenieros asignados aún.</p> : kpisViab.topIngenieros.map((eng, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS_PIE[i % COLORS_PIE.length] }} />
                                <span className="font-bold text-slate-700">{eng.name}</span>
                            </div>
                            <span className="font-black text-slate-900">{eng.value}</span>
                        </div>
                    ))}
                </div>
              </div>

              {/* SLAs de Viabilidad */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GaugeChart title="Tiempo Solicitud -> Rev. Ingeniería (Hrs)" value={kpisViab.promIng} max={24} />
                  <GaugeChart title="Tiempo Ingeniería -> Mesa Control (Hrs)" value={kpisViab.promControl} max={24} />
                  <GaugeChart title="Tiempo Agendado -> Finalizado (Hrs)" value={kpisViab.promVisita} max={48} />
                  <GaugeChart title="Tiempo Total de Viabilidad (Hrs)" value={kpisViab.promTotal} max={72} />
              </div>

            </div>

          </div>
        )}
      </main>

      <ChatGlobal 
        isOpen={chatAbierto} 
        onClose={() => setChatAbierto(false)} 
        usuarioLogueado={usuarioLogueado}
        chatInicial={chatInicial}
      />
    </div>
  )
}
