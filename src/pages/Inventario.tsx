import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { 
  Search, Plus, Package, ArrowDownRight, ArrowUpRight, 
  ClipboardSignature, FolderKanban, ShieldAlert, Camera, Barcode,
  AlertTriangle, CheckCircle2, History, Filter, X, Save,
  Wrench, Car, Laptop, Zap, Settings2, LayoutGrid, ScanLine,
  Trash2, FileText, MapPin, Eye, Gauge, ShieldCheck, PenTool, Calendar,
  DownloadCloud, RotateCcw, Loader2
} from 'lucide-react'

// IMPORTAR COMPONENTES GLOBALES
import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'

import degradadoBg from '../assets/degradado.png'

// CATEGORÍAS ESTÁNDAR SOLARIS
const CATEGORIAS = [
  { id: 'paneles', nombre: 'Paneles Solares', icono: <LayoutGrid className="w-4 h-4"/>, reqSerie: true, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'inversores', nombre: 'Inversores', icono: <Zap className="w-4 h-4"/>, reqSerie: true, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'ferreteria', nombre: 'Ferretería / Eléctrico', icono: <Settings2 className="w-4 h-4"/>, reqSerie: false, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  { id: 'herramienta', nombre: 'Herramientas', icono: <Wrench className="w-4 h-4"/>, reqSerie: true, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'vehiculos', nombre: 'Vehículos', icono: <Car className="w-4 h-4"/>, reqSerie: true, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'computo', nombre: 'Cómputo / Oficina', icono: <Laptop className="w-4 h-4"/>, reqSerie: true, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' }
]

const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

export default function Inventario() {
  const navigate = useNavigate()
  const [tabActiva, setTabActiva] = useState<'catalogo' | 'movimientos' | 'despacho' | 'responsivas'>('catalogo')
  const [cargando, setCargando] = useState(true)
  
  // FILTROS GLOBALES
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState('paneles')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  // DATOS DB
  const [catalogoDb, setCatalogoDb] = useState<any[]>([])
  const [movimientosDb, setMovimientosDb] = useState<any[]>([])
  const [seriesDisponibles, setSeriesDisponibles] = useState<any[]>([])
  const [seriesEnObra, setSeriesEnObra] = useState<any[]>([])
  const [responsivasDb, setResponsivasDb] = useState<any[]>([])
  const [proyectosDb, setProyectosDb] = useState<any[]>([])
  const [colaboradoresDb, setColaboradoresDb] = useState<any[]>([])

  // MODALES
  const [modalIngreso, setModalIngreso] = useState(false)
  const [modalDespacho, setModalDespacho] = useState(false)
  const [modalResponsiva, setModalResponsiva] = useState(false)
  const [modalMantenimiento, setModalMantenimiento] = useState<{abierto: boolean, activo: any | null}>({abierto: false, activo: null})

  // CHAT GLOBAL
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInicial, setChatInicial] = useState<any>(null)

  const usuarioLogueado = useMemo(() => {
    const data = localStorage.getItem('session_gea_solar')
    return data ? JSON.parse(data) : null
  }, [])

  const fetchData = async () => {
      setCargando(true);
      const [cat, movs, serDisp, serObra, resp, proy, colab] = await Promise.all([
          supabase.from('inventario_catalogo').select('*').order('created_at', { ascending: false }),
          supabase.from('inventario_movimientos').select('*, catalogo:catalogo_id(nombre, sku, categoria), usuario:usuario_id(nombre, apellidos)').order('created_at', { ascending: false }).limit(1000),
          supabase.from('inventario_series').select('*, catalogo:catalogo_id(nombre, sku, categoria)').eq('estatus', 'Disponible'),
          supabase.from('inventario_series').select('*, catalogo:catalogo_id(nombre, sku, categoria), proyecto:proyecto_id(nombre_proyecto)').eq('estatus', 'En Proyecto').order('created_at', { ascending: false }),
          supabase.from('inventario_responsivas').select('*, serie:serie_id(*, catalogo:catalogo_id(nombre, categoria, sku)), asignado:asignado_a(nombre, apellidos, puesto_actual)').order('created_at', { ascending: false }),
          supabase.from('proyectos').select('id, nombre_proyecto, estatus').neq('estatus', 'Cotización').order('created_at', { ascending: false }),
          supabase.from('perfiles').select('id, nombre, apellidos, puesto_actual, avatar_url').order('nombre')
      ]);

      if (cat.data) setCatalogoDb(cat.data);
      if (movs.data) setMovimientosDb(movs.data);
      if (serDisp.data) setSeriesDisponibles(serDisp.data);
      if (serObra.data) setSeriesEnObra(serObra.data);
      if (resp.data) setResponsivasDb(resp.data);
      if (proy.data) setProyectosDb(proy.data);
      if (colab.data) setColaboradoresDb(colab.data);
      setCargando(false);
  }

  useEffect(() => { fetchData() }, [])

  // --- LÓGICA DE DEVOLUCIÓN DE RESPONSIVAS ---
  const handleDevolverResponsiva = async (responsiva: any) => {
      if(!confirm(`¿Confirmas la devolución y liberación de: ${responsiva.serie?.catalogo?.nombre}?`)) return;
      
      try {
          setCargando(true);
          await supabase.from('inventario_responsivas').update({ estatus: 'Devuelta', fecha_devolucion: new Date().toISOString() }).eq('id', responsiva.id);
          await supabase.from('inventario_series').update({ estatus: 'Disponible' }).eq('id', responsiva.serie_id);
          await supabase.from('inventario_movimientos').insert([{
              tipo: 'Devolución Activo', catalogo_id: responsiva.serie?.catalogo_id, cantidad: 1, 
              usuario_id: usuarioLogueado?.id, referencia: `Devuelto por: ${responsiva.asignado?.nombre} ${responsiva.asignado?.apellidos}`
          }]);
          
          alert("Activo liberado correctamente. Ya está disponible en stock.");
          fetchData();
      } catch (error: any) {
          alert("Error al devolver: " + error.message);
      } finally { setCargando(false); }
  }

  // --- FILTROS GLOBALES ---
  const filtrarPorFechaYBusqueda = (arr: any[], dateField: string, searchFields: string[], catField?: string) => {
      return arr.filter(item => {
          const matchBusqueda = searchFields.some(field => getNestedValue(item, field)?.toLowerCase().includes(busqueda.toLowerCase()));
          const matchCat = catField ? (filtroCat === 'Todas' || getNestedValue(item, catField) === filtroCat) : true;
          let matchFecha = true;
          if (fechaInicio && fechaFin) {
              const d = new Date(getNestedValue(item, dateField));
              matchFecha = d >= new Date(fechaInicio) && d <= new Date(fechaFin + 'T23:59:59');
          }
          return matchBusqueda && matchCat && matchFecha;
      });
  };

  const catalogoFiltrado = useMemo(() => filtrarPorFechaYBusqueda(catalogoDb, 'created_at', ['nombre', 'sku'], 'categoria'), [catalogoDb, busqueda, filtroCat, fechaInicio, fechaFin]);
  const movimientosFiltrados = useMemo(() => filtrarPorFechaYBusqueda(movimientosDb, 'created_at', ['catalogo.nombre', 'catalogo.sku', 'referencia'], 'catalogo.categoria'), [movimientosDb, busqueda, filtroCat, fechaInicio, fechaFin]);
  const despachoFiltrado = useMemo(() => filtrarPorFechaYBusqueda(seriesEnObra, 'created_at', ['catalogo.nombre', 'numero_serie', 'proyecto.nombre_proyecto'], 'catalogo.categoria'), [seriesEnObra, busqueda, filtroCat, fechaInicio, fechaFin]);
  const responsivasFiltradas = useMemo(() => filtrarPorFechaYBusqueda(responsivasDb, 'created_at', ['serie.catalogo.nombre', 'serie.numero_serie', 'asignado.nombre'], 'serie.catalogo.categoria'), [responsivasDb, busqueda, filtroCat, fechaInicio, fechaFin]);

  // --- EXPORTACIÓN A EXCEL ---
  const exportarCSV = () => {
      let dataToExport: any[] = [];
      let columns: {key: string, label: string}[] = [];
      let filename = '';

      if (tabActiva === 'catalogo') {
          dataToExport = catalogoFiltrado;
          filename = 'Catalogo_Inventario';
          columns = [ {key: 'sku', label: 'SKU'}, {key: 'nombre', label: 'Articulo'}, {key: 'categoria', label: 'Categoria'}, {key: 'stock_actual', label: 'Stock Actual'}, {key: 'stock_minimo', label: 'Stock Minimo'}, {key: 'created_at', label: 'Fecha de Alta'} ];
      } else if (tabActiva === 'movimientos') {
          dataToExport = movimientosFiltrados;
          filename = 'Kardex_Movimientos';
          columns = [ {key: 'created_at', label: 'Fecha'}, {key: 'tipo', label: 'Tipo Movimiento'}, {key: 'catalogo.sku', label: 'SKU'}, {key: 'catalogo.nombre', label: 'Articulo'}, {key: 'cantidad', label: 'Cantidad'}, {key: 'usuario.nombre', label: 'Responsable'}, {key: 'referencia', label: 'Referencia / Proyecto'} ];
      } else if (tabActiva === 'despacho') {
          dataToExport = despachoFiltrado;
          filename = 'Material_En_Obra';
          columns = [ {key: 'proyecto.nombre_proyecto', label: 'Proyecto'}, {key: 'catalogo.sku', label: 'SKU'}, {key: 'catalogo.nombre', label: 'Articulo'}, {key: 'numero_serie', label: 'Num. Serie'}, {key: 'created_at', label: 'Fecha Salida'} ];
      } else if (tabActiva === 'responsivas') {
          dataToExport = responsivasFiltradas;
          filename = 'Responsivas_Activos';
          columns = [ {key: 'created_at', label: 'Fecha Asignacion'}, {key: 'serie.catalogo.nombre', label: 'Activo'}, {key: 'serie.numero_serie', label: 'Serie/Placa'}, {key: 'asignado.nombre', label: 'Asignado A'}, {key: 'estatus', label: 'Estatus'} ];
      }

      if (dataToExport.length === 0) return alert('No hay datos para exportar con los filtros actuales.');

      let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + columns.map(c => c.label).join(",") + "\n";
      
      dataToExport.forEach(row => {
          const rowData = columns.map(col => {
              let val = getNestedValue(row, col.key) || '';
              if (col.key === 'created_at') val = new Date(val).toLocaleString('es-MX');
              return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvContent += rowData.join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover flex flex-col" style={{ backgroundImage: `url(${degradadoBg})` }}>
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none" />

      <ChatGlobal isOpen={chatAbierto} onClose={() => setChatAbierto(false)} usuarioLogueado={usuarioLogueado} chatInicial={chatInicial} />
      <Header titulo="Control de Inventarios" onAbrirChat={(c) => { setChatInicial(c || null); setChatAbierto(true); }} />

      <main className="max-w-[1800px] mx-auto w-full px-4 md:px-8 py-6 md:py-8 relative z-10 flex-1 flex flex-col">
        
        {/* --- TABS REDISEÑADAS --- */}
        <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-[20px] shadow-sm border border-slate-200 w-max min-w-full xl:min-w-fit overflow-x-auto scrollbar-hide mb-4 shrink-0">
            <button onClick={() => setTabActiva('catalogo')} className={`px-6 py-2.5 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'catalogo' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}><Package className="w-4 h-4" /> STOCK / CATÁLOGO</button>
            <button onClick={() => setTabActiva('movimientos')} className={`px-6 py-2.5 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'movimientos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}><History className="w-4 h-4" /> KARDEX (MOVS)</button>
            <button onClick={() => setTabActiva('despacho')} className={`px-6 py-2.5 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'despacho' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50'}`}><FolderKanban className="w-4 h-4" /> SALIDAS A OBRA</button>
            <button onClick={() => setTabActiva('responsivas')} className={`px-6 py-2.5 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'responsivas' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}><ClipboardSignature className="w-4 h-4" /> ACTIVOS Y AUTOS</button>
        </div>

        {/* --- BARRA DE FILTROS Y ACCIONES --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 mb-6 bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 w-full sm:w-64 shrink-0 shadow-sm">
                    <Search className="text-slate-400 w-4 h-4 shrink-0" />
                    <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-transparent outline-none w-full font-bold text-xs" />
                </div>
                {(tabActiva === 'catalogo' || tabActiva === 'movimientos') && (
                    <div className="flex gap-2 flex-1 sm:flex-none">
                        <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} className="w-1/2 sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none text-slate-500 shadow-sm" title="Ingresado Desde"/>
                        <input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} className="w-1/2 sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none text-slate-500 shadow-sm" title="Ingresado Hasta"/>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                <button onClick={exportarCSV} className="w-full sm:w-auto bg-green-50 text-green-700 px-5 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-green-100 transition-all shadow-sm border border-green-200 uppercase tracking-widest whitespace-nowrap"><DownloadCloud className="w-4 h-4" /> Exportar Excel</button>
                
                {tabActiva === 'catalogo' && <button onClick={() => setModalIngreso(true)} className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><ArrowDownRight className="w-4 h-4" /> Ingreso Material</button>}
                {tabActiva === 'despacho' && <button onClick={() => setModalDespacho(true)} className="w-full sm:w-auto bg-orange-500 text-white px-5 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><ArrowUpRight className="w-4 h-4" /> Nuevo Despacho</button>}
                {tabActiva === 'responsivas' && <button onClick={() => setModalResponsiva(true)} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><ClipboardSignature className="w-4 h-4" /> Nueva Responsiva</button>}
            </div>
        </div>

        {/* --- BOTONES DE CATEGORÍA (FILTROS RAPIDOS) --- */}
        {(tabActiva === 'catalogo' || tabActiva === 'movimientos' || tabActiva === 'despacho' || tabActiva === 'responsivas') && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto custom-scrollbar shrink-0 pb-2">
                {CATEGORIAS.map(cat => (
                    <button key={cat.id} onClick={() => setFiltroCat(cat.id)} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 shadow-sm ${filtroCat === cat.id ? `${cat.bg} ${cat.color} ${cat.border} border-2` : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                        {cat.icono} {cat.nombre}
                    </button>
                ))}
                <button className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap shadow-sm ml-auto ${filtroCat === 'Todas' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`} onClick={() => setFiltroCat('Todas')}>Mostrar Todas</button>
            </div>
        )}

        {/* ======================================================================================= */}
        {/* VISTAS DE LAS PESTAÑAS */}
        {/* ======================================================================================= */}

        {/* 1. CATÁLOGO / STOCK */}
        {tabActiva === 'catalogo' && (
            <div className="bg-white/95 backdrop-blur-xl rounded-[20px] md:rounded-[30px] shadow-2xl border border-white flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {cargando ? (
                        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
                    ) : catalogoFiltrado.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Package size={48} className="mx-auto mb-4 opacity-30 text-slate-500"/>
                            <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">Sin Resultados</p>
                            <p className="text-[10px] font-medium mt-2 max-w-sm mx-auto">No hay artículos que coincidan con los filtros aplicados.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10">
                                    <th className="p-4 font-black whitespace-nowrap">SKU / Artículo</th>
                                    <th className="p-4 font-black whitespace-nowrap">Categoría</th>
                                    <th className="p-4 font-black text-center whitespace-nowrap">Stock Actual</th>
                                    <th className="p-4 font-black text-center whitespace-nowrap">Fecha Alta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {catalogoFiltrado.map((item) => {
                                    const isCritico = item.stock_minimo > 0 && item.stock_actual <= item.stock_minimo;
                                    const catData = CATEGORIAS.find(c => c.id === item.categoria);
                                    return (
                                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-black text-xs uppercase text-slate-900 line-clamp-2 md:line-clamp-1">{item.nombre}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 tracking-widest flex items-center gap-1"><Barcode size={10}/> {item.sku}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1.5 whitespace-nowrap">{catData?.icono} {catData?.nombre || item.categoria}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-base md:text-lg font-black italic px-3 py-1 rounded-lg ${isCritico ? 'bg-red-50 text-red-600 border border-red-200' : 'text-slate-900'}`}>
                                                    {item.stock_actual}
                                                </span>
                                                <span className="text-[8px] text-slate-400 font-bold ml-1 uppercase">{item.unidad_medida}</span>
                                                {isCritico && <p className="text-[7px] text-red-500 font-black uppercase mt-1">Stock Crítico</p>}
                                            </td>
                                            <td className="p-4 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                                {new Date(item.created_at).toLocaleDateString('es-MX')}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        )}

        {/* 2. MOVIMIENTOS (KARDEX) */}
        {tabActiva === 'movimientos' && (
            <div className="bg-white/95 backdrop-blur-xl rounded-[20px] md:rounded-[30px] shadow-2xl border border-white overflow-hidden flex flex-col flex-1">
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    {cargando ? (
                        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
                    ) : movimientosFiltrados.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <History size={48} className="mx-auto mb-4 opacity-30 text-slate-500"/>
                            <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">Sin Movimientos</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10">
                                    <th className="p-4 font-black">Fecha</th>
                                    <th className="p-4 font-black">Movimiento</th>
                                    <th className="p-4 font-black">Artículo</th>
                                    <th className="p-4 font-black text-center">Cant.</th>
                                    <th className="p-4 font-black">Responsable</th>
                                    <th className="p-4 font-black">Referencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientosFiltrados.map(mov => (
                                    <tr key={mov.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="p-4 text-[9px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">{new Date(mov.created_at).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'})}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest ${mov.tipo.includes('Entrada') || mov.tipo.includes('Devolución') ? 'bg-emerald-50 text-emerald-600' : mov.tipo.includes('Salida') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-black text-[10px] md:text-[11px] uppercase text-slate-900 line-clamp-1">{mov.catalogo?.nombre}</p>
                                            <p className="text-[8px] md:text-[9px] text-slate-400 font-bold mt-0.5">SKU: {mov.catalogo?.sku}</p>
                                        </td>
                                        <td className="p-4 text-center font-black text-sm">{mov.cantidad}</td>
                                        <td className="p-4 text-[9px] md:text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">{mov.usuario?.nombre} {mov.usuario?.apellidos}</td>
                                        <td className="p-4 text-[9px] md:text-[10px] font-bold text-slate-500">{mov.referencia || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        )}

        {/* 3. DESPACHO (MATERIAL EN OBRA) */}
        {tabActiva === 'despacho' && (
            <div className="bg-white/95 backdrop-blur-xl rounded-[20px] md:rounded-[30px] shadow-2xl border border-white overflow-hidden flex flex-col flex-1">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {cargando ? (
                        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
                    ) : despachoFiltrado.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <FolderKanban size={48} className="mx-auto mb-4 opacity-30 text-slate-500"/>
                            <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">No hay material instalado</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10">
                                    <th className="p-4 font-black">Proyecto / Obra</th>
                                    <th className="p-4 font-black">Artículo Instalado</th>
                                    <th className="p-4 font-black text-center">No. de Serie</th>
                                    <th className="p-4 font-black text-center">Fecha Salida</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despachoFiltrado.map(serie => (
                                    <tr key={serie.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="p-4 text-[10px] md:text-[11px] font-black uppercase text-slate-900">{serie.proyecto?.nombre_proyecto || 'Desconocido'}</td>
                                        <td className="p-4">
                                            <p className="font-black text-[10px] md:text-[11px] uppercase text-slate-900 line-clamp-1">{serie.catalogo?.nombre}</p>
                                            <p className="text-[8px] md:text-[9px] text-slate-400 font-bold mt-0.5">SKU: {serie.catalogo?.sku}</p>
                                        </td>
                                        <td className="p-4 text-center text-xs font-black uppercase tracking-widest text-orange-600">{serie.numero_serie}</td>
                                        <td className="p-4 text-center text-[9px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">{new Date(serie.created_at).toLocaleDateString('es-MX')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        )}

        {/* 4. RESPONSIVAS (ACTIVOS FIJOS) */}
        {tabActiva === 'responsivas' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {responsivasFiltradas.filter(r => r.estatus === 'Activa').map(resp => {
                        const esAuto = resp.serie?.catalogo?.categoria === 'vehiculos';
                        const esPC = resp.serie?.catalogo?.categoria === 'computo';
                        return (
                            <div key={resp.id} className="bg-white border border-slate-200 rounded-[20px] md:rounded-[24px] p-5 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4 gap-2">
                                        <div className="flex gap-3 overflow-hidden">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 text-slate-600">
                                                {esAuto ? <Car size={18}/> : esPC ? <Laptop size={18}/> : <Wrench size={18}/>}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="font-black text-[11px] md:text-xs uppercase text-slate-900 leading-tight truncate" title={resp.serie?.catalogo?.nombre}>{resp.serie?.catalogo?.nombre}</p>
                                                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest truncate">SERIE/PLACA: {resp.serie?.numero_serie}</p>
                                                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest truncate">SKU: {resp.serie?.catalogo?.sku}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100 shadow-inner">
                                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1.5 md:mb-2 tracking-widest">Resguardo Asignado A:</p>
                                        <p className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase leading-none truncate">👤 {resp.asignado?.nombre} {resp.asignado?.apellidos}</p>
                                        <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase truncate">{resp.asignado?.puesto_actual}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
                                    <button onClick={() => handleDevolverResponsiva(resp)} className="text-[8px] md:text-[9px] font-black uppercase text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-3 py-1.5 md:py-2 rounded-lg transition-colors flex items-center gap-1.5"><RotateCcw size={12}/> Liberar (Devolver)</button>
                                    <span className="bg-blue-50 text-blue-600 px-2.5 py-1 md:py-1.5 rounded-md border border-blue-200 text-[8px] font-black uppercase">{resp.estatus}</span>
                                </div>
                            </div>
                        )
                    })}
                    {responsivasFiltradas.filter(r => r.estatus === 'Activa').length === 0 && <p className="col-span-full text-center py-10 text-xs font-bold text-slate-400 uppercase">No hay responsivas activas en esta categoría.</p>}
                </div>
            </div>
        )}

      </main>

      {/* ================================================================================================= */}
      {/* ZONA DE MODALES CON COMBOBOXES MEJORADOS (UI LIMPIA)                                              */}
      {/* ================================================================================================= */}
      
      <AnimatePresence>
        {modalIngreso && (
            <ModalIngresoMaterial 
                onClose={() => setModalIngreso(false)} 
                onSave={() => {setModalIngreso(false); fetchData();}} 
                catalogo={catalogoDb} 
                categorias={CATEGORIAS} 
                usuarioLogueado={usuarioLogueado}
            />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalDespacho && (
            <ModalDespachoProyecto 
                onClose={() => setModalDespacho(false)} 
                onSave={() => {setModalDespacho(false); fetchData();}} 
                catalogo={catalogoDb.filter(c => ['paneles','inversores','ferreteria','herramienta'].includes(c.categoria) && c.stock_actual > 0)} 
                proyectos={proyectosDb}
                usuarioLogueado={usuarioLogueado}
            />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalResponsiva && (
            <ModalNuevaResponsiva 
                onClose={() => setModalResponsiva(false)} 
                onSave={() => {setModalResponsiva(false); fetchData();}} 
                colaboradores={colaboradoresDb} 
                series={seriesDisponibles.filter(s => ['vehiculos','computo','herramienta'].includes(s.catalogo?.categoria))}
                usuarioLogueado={usuarioLogueado}
            />
        )}
      </AnimatePresence>

    </div>
  )
}

// ============================================================================
// COMPONENTES DE MODALES (Aislados con Custom Combobox)
// ============================================================================

function ModalIngresoMaterial({ onClose, onSave, catalogo, categorias, usuarioLogueado }: any) {
    const [tipoIngreso, setTipoIngreso] = useState<'existente' | 'nuevo'>('existente');
    const [procesando, setProcesando] = useState(false);

    // Formulario
    const [catalogoId, setCatalogoId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [series, setSeries] = useState<string[]>(['']);
    
    // Combobox Estado
    const [busquedaCat, setBusquedaCat] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);
    
    // Si es nuevo
    const [sku, setSku] = useState('');
    const [nombre, setNombre] = useState('');
    const [categoriaId, setCategoriaId] = useState('ferreteria');
    const [stockMinimo, setStockMinimo] = useState<number | ''>('');
    const [unidad, setUnidad] = useState('PZA');

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (cantidad > series.length) setSeries([...series, ...Array(cantidad - series.length).fill('')]);
        else if (cantidad < series.length) setSeries(series.slice(0, cantidad));
    }, [cantidad]);

    const reqSerie = useMemo(() => {
        if (tipoIngreso === 'nuevo') return categorias.find((c:any) => c.id === categoriaId)?.reqSerie;
        if (catalogoId) {
            const cat = catalogo.find((c:any) => c.id === catalogoId);
            return categorias.find((c:any) => c.id === cat?.categoria)?.reqSerie;
        }
        return false;
    }, [tipoIngreso, categoriaId, catalogoId, categorias, catalogo]);

    const catalogoFiltradoOpciones = useMemo(() => {
        return catalogo.filter((c:any) => `${c.nombre} ${c.sku}`.toLowerCase().includes(busquedaCat.toLowerCase()));
    }, [catalogo, busquedaCat]);

    const itemSeleccionado = catalogo.find((c:any) => c.id === catalogoId);

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (tipoIngreso === 'existente' && !catalogoId) return alert("Selecciona un artículo del buscador.");
        
        const seriesCapturadas = series.filter(s => s.trim() !== '');
        
        setProcesando(true);
        try {
            let targetCatalogoId = catalogoId;

            if (tipoIngreso === 'nuevo') {
                const { data: newCat, error: errCat } = await supabase.from('inventario_catalogo').insert([{
                    sku: sku.toUpperCase().trim(),
                    nombre: nombre.trim(),
                    categoria: categoriaId,
                    stock_minimo: stockMinimo || 0,
                    unidad_medida: unidad,
                    stock_actual: 0
                }]).select().single();
                
                if (errCat) throw errCat;
                targetCatalogoId = newCat.id;
            }

            const { data: currentCat } = await supabase.from('inventario_catalogo').select('stock_actual').eq('id', targetCatalogoId).single();
            await supabase.from('inventario_catalogo').update({ stock_actual: (currentCat?.stock_actual || 0) + cantidad }).eq('id', targetCatalogoId);

            await supabase.from('inventario_movimientos').insert([{
                tipo: 'Entrada', catalogo_id: targetCatalogoId, cantidad: cantidad, 
                usuario_id: usuarioLogueado?.id, referencia: 'Ingreso Manual al Almacén'
            }]);

            if (reqSerie && seriesCapturadas.length > 0) {
                const payloadSeries = seriesCapturadas.map(s => ({
                    catalogo_id: targetCatalogoId, numero_serie: s.trim().toUpperCase(), estatus: 'Disponible'
                }));
                await supabase.from('inventario_series').upsert(payloadSeries, { onConflict: 'numero_serie' });
            }

            alert("Ingreso registrado correctamente en el Kardex.");
            onSave();
        } catch (err: any) {
            alert("Error al registrar: " + err.message);
        } finally { setProcesando(false); }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="bg-slate-900 p-5 md:p-6 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ArrowDownRight size={18} className="text-emerald-500"/> Ingreso de Material</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18}/></button>
                </div>
                
                <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
                    <button type="button" onClick={() => setTipoIngreso('existente')} className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${tipoIngreso === 'existente' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500'}`}>A Existente</button>
                    <button type="button" onClick={() => setTipoIngreso('nuevo')} className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${tipoIngreso === 'nuevo' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500'}`}>Nuevo SKU</button>
                </div>

                <form onSubmit={handleGuardar} className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 bg-slate-50 flex flex-col gap-6">
                    
                    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tipoIngreso === 'existente' ? (
                            <div className="sm:col-span-2 relative" ref={dropRef}>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Buscar y Seleccionar del Catálogo</label>
                                <div className="relative mt-1.5">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Escribe para buscar..." 
                                        value={showDrop ? busquedaCat : (itemSeleccionado ? `[${itemSeleccionado.sku}] ${itemSeleccionado.nombre}` : '')} 
                                        onFocus={() => setShowDrop(true)}
                                        onChange={e => { setBusquedaCat(e.target.value); setShowDrop(true); setCatalogoId(''); }}
                                        className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 text-slate-700 shadow-inner"
                                    />
                                    <AnimatePresence>
                                        {showDrop && (
                                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                                {catalogoFiltradoOpciones.length === 0 ? (
                                                    <div className="p-4 text-center text-slate-400 text-[10px] font-bold">No se encontraron artículos.</div>
                                                ) : (
                                                    catalogoFiltradoOpciones.map((c:any) => (
                                                        <div key={c.id} onClick={() => { setCatalogoId(c.id); setShowDrop(false); setBusquedaCat(''); }} className="p-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer flex flex-col gap-0.5">
                                                            <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{c.nombre}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase truncate">SKU: {c.sku} | Stock Disp: {c.stock_actual}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">SKU / Modelo</label><input required type="text" value={sku} onChange={e=>setSku(e.target.value)} placeholder="Ej: JKM550M" className="w-full bg-slate-50 border border-slate-200 p-3 md:p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner uppercase"/></div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Categoría</label>
                                    <select required value={categoriaId} onChange={e=>setCategoriaId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 md:p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner text-slate-700">
                                        {CATEGORIAS.map((c:any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre del Artículo</label><input required type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Panel Solar 550W..." className="w-full bg-slate-50 border border-slate-200 p-3 md:p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner"/></div>
                                <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Stock Mínimo (Opcional)</label><input type="number" min="0" value={stockMinimo} onChange={e=>setStockMinimo(e.target.value ? parseInt(e.target.value) : '')} placeholder="Dejar vacío si no aplica" className="w-full bg-slate-50 border border-slate-200 p-3 md:p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner"/></div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Unidad Medida</label>
                                    <select required value={unidad} onChange={e=>setUnidad(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 md:p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner text-slate-700">
                                        <option value="PZA">Pieza (PZA)</option>
                                        <option value="MTS">Metros (MTS)</option>
                                        <option value="KGS">Kilos (KGS)</option>
                                    </select>
                                </div>
                            </>
                        )}
                        
                        <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Cantidad a Ingresar</label>
                            <div className="flex items-center mt-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner w-full sm:w-1/2">
                                <button type="button" onClick={() => setCantidad(c => Math.max(1, c - 1))} className="px-5 py-3 md:py-3.5 font-black text-slate-400 hover:text-emerald-500 hover:bg-slate-100 transition-colors">-</button>
                                <input type="number" required min="1" value={cantidad} onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 w-full bg-transparent text-center text-sm font-black outline-none text-slate-800" />
                                <button type="button" onClick={() => setCantidad(c => c + 1)} className="px-5 py-3 md:py-3.5 font-black text-slate-400 hover:text-emerald-500 hover:bg-slate-100 transition-colors">+</button>
                            </div>
                        </div>
                    </div>

                    {reqSerie && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 md:p-6 shadow-inner shrink-0">
                            <h4 className="font-black text-[11px] uppercase tracking-widest text-emerald-800 flex items-center gap-2 mb-2"><ScanLine size={16}/> Escaneo de Series <span className="text-emerald-500 font-bold ml-2">(Opcional en Ingreso)</span></h4>
                            <p className="text-[9px] font-bold text-emerald-600/80 uppercase mb-4 leading-relaxed">Si la caja viene sellada, puedes dejar las series vacías y escanearlas al momento de dar salida a Obra.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1 md:pr-2">
                                {series.map((serie, idx) => (
                                    <div key={idx} className="flex items-center relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg z-10 shadow-sm border-r-0"><Barcode className="w-4 h-4 text-slate-400"/></div>
                                        <input type="text" placeholder={`Serie #${idx + 1} (Opcional)...`} value={serie} onChange={(e) => {const n = [...series]; n[idx] = e.target.value; setSeries(n);}} className="w-full bg-white border border-slate-200 p-2.5 md:p-3 pl-12 rounded-lg text-xs font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 shadow-sm uppercase tracking-wider transition-all"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </form>
                
                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleGuardar} disabled={procesando} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save size={14}/> Registrar Ingreso</>}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function DespachoItemRow({ item, idxItem, catalogo, items, setItems }: any) {
    const [busqueda, setBusqueda] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const catSelect = catalogo.find((c:any) => c.id === item.catalogo_id);
    const requiereSerie = catSelect ? CATEGORIAS.find(c => c.id === catSelect.categoria)?.reqSerie : false;
    const maxDisp = catSelect ? catSelect.stock_actual : 999;
    
    const catalogoFiltrado = useMemo(() => catalogo.filter((c:any) => `${c.nombre} ${c.sku}`.toLowerCase().includes(busqueda.toLowerCase())), [catalogo, busqueda]);

    const handleCantidadChange = (nuevaCantidad: number) => {
        const cant = Math.min(Math.max(1, nuevaCantidad), maxDisp);
        const newItems = [...items];
        const currentSeries = newItems[idxItem].series;
        if (cant > currentSeries.length) newItems[idxItem].series = [...currentSeries, ...Array(cant - currentSeries.length).fill('')];
        else if (cant < currentSeries.length) newItems[idxItem].series = currentSeries.slice(0, cant);
        newItems[idxItem].cantidad = cant;
        setItems(newItems);
    }

    return (
        <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm relative">
            {items.length > 1 && <button onClick={() => setItems(items.filter((_:any,i:number)=>i!==idxItem))} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative" ref={dropRef}>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">SKU a Enviar (Solo disponibles)</label>
                    <div className="relative mt-1.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" placeholder="Buscar insumo en Stock..." 
                            value={showDrop ? busqueda : (catSelect ? `[${catSelect.sku}] ${catSelect.nombre}` : '')} 
                            onFocus={() => setShowDrop(true)}
                            onChange={e => { setBusqueda(e.target.value); setShowDrop(true); const n=[...items]; n[idxItem].catalogo_id=''; setItems(n); }}
                            className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-orange-500 text-slate-700 shadow-inner"
                        />
                        <AnimatePresence>
                            {showDrop && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                    {catalogoFiltrado.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin stock disponible.</div> : catalogoFiltrado.map((c:any) => (
                                        <div key={c.id} onClick={() => { const n=[...items]; n[idxItem].catalogo_id=c.id; n[idxItem].cantidad=1; n[idxItem].series=['']; setItems(n); setShowDrop(false); setBusqueda(''); }} className="p-3 border-b border-slate-50 hover:bg-orange-50 cursor-pointer flex flex-col gap-0.5">
                                            <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{c.nombre}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase truncate">SKU: {c.sku} | Disp: {c.stock_actual}</p>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Cantidad (Máx: {maxDisp})</label>
                    <div className="flex items-center mt-1.5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                        <button onClick={() => handleCantidadChange(item.cantidad - 1)} className="px-4 py-3.5 font-black text-slate-400 hover:text-orange-500 hover:bg-slate-100">-</button>
                        <input type="number" min="1" max={maxDisp} value={item.cantidad} onChange={(e) => handleCantidadChange(parseInt(e.target.value)||1)} className="flex-1 w-full bg-transparent text-center text-sm font-black outline-none text-slate-800" />
                        <button onClick={() => handleCantidadChange(item.cantidad + 1)} className="px-4 py-3.5 font-black text-slate-400 hover:text-orange-500 hover:bg-slate-100">+</button>
                    </div>
                </div>
            </div>
            
            {requiereSerie && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-inner mt-4">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-orange-800 flex items-center gap-2 mb-3"><ScanLine size={14}/> Escaneo de Series <span className="text-red-500 font-bold ml-1">(OBLIGATORIO)</span></h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {item.series.map((serie:string, idxSerie:number) => (
                            <div key={idxSerie} className="flex items-center relative">
                                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg z-10 shadow-sm border-r-0"><Barcode className="w-4 h-4 text-slate-400"/></div>
                                <input 
                                    autoFocus={idxSerie === 0} type="text" placeholder={`Serie #${idxSerie + 1}...`} value={serie} required
                                    onChange={(e) => { const n = [...items]; n[idxItem].series[idxSerie] = e.target.value; setItems(n); }}
                                    className={`w-full bg-white border p-2.5 pl-12 rounded-lg text-xs font-black outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-700 shadow-sm uppercase tracking-wider transition-all ${serie.trim() === '' ? 'border-red-300' : 'border-slate-200'}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ModalDespachoProyecto({ onClose, onSave, catalogo, proyectos, usuarioLogueado }: any) {
    const [procesando, setProcesando] = useState(false);
    const [proyectoId, setProyectoId] = useState('');
    const [items, setItems] = useState<any[]>([{ catalogo_id: '', cantidad: 1, series: [''] }]);
    
    // Combobox Proyectos
    const [busquedaProy, setBusquedaProy] = useState('');
    const [showProyDrop, setShowProyDrop] = useState(false);
    const proyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (proyRef.current && !proyRef.current.contains(e.target as Node)) setShowProyDrop(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const proyectosFiltrados = useMemo(() => proyectos.filter((p:any) => p.nombre_proyecto.toLowerCase().includes(busquedaProy.toLowerCase())), [proyectos, busquedaProy]);
    const proySeleccionado = proyectos.find((p:any) => p.id === proyectoId);

    const checkValid = () => {
        if (!proyectoId) return false;
        return items.every(item => {
            if (!item.catalogo_id || item.cantidad <= 0) return false;
            const cat = catalogo.find((c:any) => c.id === item.catalogo_id);
            if (CATEGORIAS.find(c => c.id === cat?.categoria)?.reqSerie) {
                return item.series.every((s:string) => s.trim() !== ''); // Candado OBLIGATORIO
            }
            return true;
        });
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkValid()) return alert("Completa toda la información y escanea las series necesarias.");
        
        setProcesando(true);
        try {
            for (const item of items) {
                const cat = catalogo.find((c:any) => c.id === item.catalogo_id);
                if (cat.stock_actual < item.cantidad) throw new Error(`Stock insuficiente para ${cat.nombre}`);
                
                await supabase.from('inventario_catalogo').update({ stock_actual: cat.stock_actual - item.cantidad }).eq('id', cat.id);

                await supabase.from('inventario_movimientos').insert([{
                    tipo: 'Salida a Obra', catalogo_id: cat.id, cantidad: item.cantidad, 
                    usuario_id: usuarioLogueado?.id, referencia: proySeleccionado?.nombre_proyecto
                }]);

                if (CATEGORIAS.find(c => c.id === cat.categoria)?.reqSerie && item.series.length > 0) {
                    const seriesLimpio = item.series.map((s:string) => ({
                        catalogo_id: cat.id, numero_serie: s.trim().toUpperCase(), estatus: 'En Proyecto', proyecto_id: proyectoId
                    }));
                    await supabase.from('inventario_series').upsert(seriesLimpio, { onConflict: 'numero_serie' });
                }
            }
            alert("Salida a obra y series registradas en Kardex con éxito.");
            onSave();
        } catch (err: any) {
            alert("Error al despachar: " + err.message);
        } finally { setProcesando(false); }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden h-[90vh]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ArrowUpRight size={18} className="text-orange-500"/> Despacho a Obra</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-7">Salida de Material Obligatorio con Serie</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full transition-colors"><X size={18}/></button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-5 md:p-8 flex flex-col gap-4 md:gap-6 custom-scrollbar">
                    
                    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm shrink-0" ref={proyRef}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Buscar Proyecto Destino</label>
                        <div className="relative mt-1.5">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" placeholder="Filtrar proyectos..." 
                                value={showProyDrop ? busquedaProy : (proySeleccionado ? proySeleccionado.nombre_proyecto : '')} 
                                onFocus={() => setShowProyDrop(true)}
                                onChange={e => { setBusquedaProy(e.target.value); setShowProyDrop(true); setProyectoId(''); }}
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-orange-500 text-slate-700 shadow-inner"
                            />
                            <AnimatePresence>
                                {showProyDrop && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {proyectosFiltrados.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin proyectos.</div> : proyectosFiltrados.map((p:any) => (
                                            <div key={p.id} onClick={() => { setProyectoId(p.id); setShowProyDrop(false); setBusquedaProy(''); }} className="p-3 border-b border-slate-50 hover:bg-orange-50 cursor-pointer flex flex-col gap-0.5">
                                                <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{p.nombre_proyecto}</p>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        {items.map((item, idxItem) => (
                            <DespachoItemRow key={idxItem} item={item} idxItem={idxItem} catalogo={catalogo} items={items} setItems={setItems} />
                        ))}

                        <button onClick={() => setItems([...items, { catalogo_id: '', cantidad: 1, series: [''] }])} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-[20px] md:rounded-3xl text-slate-400 font-black uppercase text-xs tracking-widest hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16}/> Añadir otro artículo a la salida
                        </button>
                    </div>
                </div>
                
                <div className="p-5 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button disabled={!checkValid() || procesando} onClick={handleGuardar} className="w-full sm:w-auto bg-orange-500 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50 disabled:bg-slate-300 shadow-lg">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save size={16}/> Registrar Salida</>}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function ModalNuevaResponsiva({ onClose, onSave, colaboradores, series, usuarioLogueado }: any) {
    const [fotos, setFotos] = useState<(File|null)[]>([null, null, null, null]);
    const [previews, setPreviews] = useState<(string|null)[]>([null, null, null, null]);
    const [asignadoId, setAsignadoId] = useState('');
    const [serieId, setSerieId] = useState('');
    const [procesando, setProcesando] = useState(false);
    
    // Comboboxes
    const [bColab, setBColab] = useState('');
    const [showColab, setShowColab] = useState(false);
    const colabRef = useRef<HTMLDivElement>(null);

    const [bSerie, setBSerie] = useState('');
    const [showSerie, setShowSerie] = useState(false);
    const serieRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { 
            if (colabRef.current && !colabRef.current.contains(e.target as Node)) setShowColab(false);
            if (serieRef.current && !serieRef.current.contains(e.target as Node)) setShowSerie(false); 
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const colabFiltrados = useMemo(() => colaboradores.filter((c:any) => `${c.nombre} ${c.apellidos}`.toLowerCase().includes(bColab.toLowerCase())), [colaboradores, bColab]);
    const seriesFiltradas = useMemo(() => series.filter((s:any) => `${s.catalogo?.nombre} ${s.numero_serie}`.toLowerCase().includes(bSerie.toLowerCase())), [series, bSerie]);

    const colabSelect = colaboradores.find((c:any) => c.id === asignadoId);
    const serieSelect = series.find((s:any) => s.id === serieId);

    const handleSubirFoto = (index: number, file: File) => {
        const urlLocal = URL.createObjectURL(file);
        const p = [...previews]; p[index] = urlLocal; setPreviews(p);
        const f = [...fotos]; f[index] = file; setFotos(f);
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!asignadoId || !serieId || fotos.includes(null)) return alert("Completa el formulario y sube las 4 fotos obligatorias.");
        setProcesando(true);
        try {
            // PROCESAMIENTO PARALELO = SÚPER RÁPIDO
            const uploadPromises = fotos.map(async (file, i) => {
                const path = `responsivas/${Date.now()}_${i}.jpg`;
                await supabase.storage.from('expedientes').upload(path, file as File);
                const {data} = supabase.storage.from('expedientes').getPublicUrl(path);
                return data.publicUrl;
            });
            const urls = await Promise.all(uploadPromises);

            await supabase.from('inventario_responsivas').insert([{
                serie_id: serieId, asignado_a: asignadoId, entregado_por: usuarioLogueado?.id,
                fotos_entrega: urls, estatus: 'Activa'
            }]);

            await supabase.from('inventario_series').update({ estatus: 'Asignado' }).eq('id', serieId);

            const serieInfo = series.find((s:any) => s.id === serieId);
            const colaboradorInfo = colaboradores.find((c:any) => c.id === asignadoId);
            await supabase.from('inventario_movimientos').insert([{
                tipo: 'Asignación Activo', catalogo_id: serieInfo?.catalogo_id, cantidad: 1, 
                usuario_id: usuarioLogueado?.id, referencia: `Responsiva a: ${colaboradorInfo?.nombre} ${colaboradorInfo?.apellidos}`
            }]);

            alert("Responsiva y Kardex registrados exitosamente.");
            onSave();
        } catch (err:any) {
            alert("Error: " + err.message);
        } finally { setProcesando(false); }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden h-[85vh] md:max-h-[90vh]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ClipboardSignature size={18} className="text-blue-500"/> Nueva Responsiva</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-7">Asignación Física de Activos Fijos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full transition-colors"><X size={18}/></button>
                </div>
                
                <div className="flex-1 p-5 md:p-8 bg-slate-50 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm">
                        <div ref={colabRef}>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Colaborador Destinatario</label>
                            <div className="relative mt-1.5">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" placeholder="Filtrar empleado..." 
                                    value={showColab ? bColab : (colabSelect ? `${colabSelect.nombre} ${colabSelect.apellidos}` : '')} 
                                    onFocus={() => setShowColab(true)}
                                    onChange={e => { setBColab(e.target.value); setShowColab(true); setAsignadoId(''); }}
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-blue-500 text-slate-700 shadow-inner"
                                />
                                <AnimatePresence>
                                    {showColab && (
                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                            {colabFiltrados.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin resultados.</div> : colabFiltrados.map((c:any) => (
                                                <div key={c.id} onClick={() => { setAsignadoId(c.id); setShowColab(false); setBColab(''); }} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer flex items-center gap-3">
                                                    <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[9px]">{c.nombre.charAt(0)}</div>
                                                    <div><p className="text-slate-900 font-bold text-[10px] leading-none">{c.nombre} {c.apellidos}</p><p className="text-slate-400 text-[7px] mt-1 uppercase font-semibold">{c.puesto_actual}</p></div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        <div ref={serieRef}>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Activo a Entregar</label>
                            <div className="relative mt-1.5">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" placeholder="Filtrar por serie o nombre..." 
                                    value={showSerie ? bSerie : (serieSelect ? `${serieSelect.catalogo?.nombre} (S/N: ${serieSelect.numero_serie})` : '')} 
                                    onFocus={() => setShowSerie(true)}
                                    onChange={e => { setBSerie(e.target.value); setShowSerie(true); setSerieId(''); }}
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-blue-500 text-slate-700 shadow-inner"
                                />
                                <AnimatePresence>
                                    {showSerie && (
                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                            {seriesFiltradas.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">No hay activos disponibles.</div> : seriesFiltradas.map((s:any) => (
                                                <div key={s.id} onClick={() => { setSerieId(s.id); setShowSerie(false); setBSerie(''); }} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5">
                                                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{s.catalogo?.nombre}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase truncate">S/N: {s.numero_serie}</p>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4"><Camera size={16} className="text-blue-500"/> Evidencia Fotográfica Obligatoria (4 vistas)</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            {[0,1,2,3].map(n => (
                                <label key={n} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-all shadow-inner overflow-hidden relative">
                                    {previews[n] ? (
                                        <img src={previews[n] as string} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Camera size={24} className="mb-2"/>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-center px-2">Foto {n+1}</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {if(e.target.files?.[0]) handleSubirFoto(n, e.target.files[0])}} />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 md:p-5 rounded-2xl border border-blue-200 flex items-start gap-3 shadow-inner">
                        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0"/>
                        <p className="text-blue-800 text-[9px] md:text-xs font-bold leading-relaxed">Las 4 fotos se subirán al servidor de forma simultánea. El colaborador deberá firmar desde su panel después.</p>
                    </div>
                </div>
                <div className="p-5 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 shadow-[0_-10px_15px_rgba(0,0,0,0.03)]">
                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button disabled={procesando || fotos.includes(null) || !asignadoId || !serieId} onClick={handleGuardar} className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin"/> : <><CheckCircle2 size={16}/> Firmar y Asignar</>}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}