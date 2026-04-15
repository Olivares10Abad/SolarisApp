import { useDialog } from "../context/DialogContext"

import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import {
    Search, Plus, Package, ArrowDownRight, ArrowUpRight,
    ClipboardSignature, FolderKanban, Camera, Barcode,
    AlertTriangle, CheckCircle2, History, X, Save,
    Wrench, Car, Laptop, Zap, Settings2, LayoutGrid, ScanLine,
    Trash2, FileText, MapPin, Eye, Gauge, PenTool, DownloadCloud, RotateCcw, Loader2, Calendar
} from 'lucide-react'

// IMPORTAR COMPONENTES GLOBALES
import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import FileViewerModal from '../components/FileViewerModal'

import degradadoBg from '../assets/degradado.png'

// CATEGORÍAS ESTÁNDAR SOLARIS
const CATEGORIAS = [
    { id: 'paneles', nombre: 'Paneles Solares', icono: <LayoutGrid className="w-4 h-4" />, reqSerie: true, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'inversores', nombre: 'Inversores', icono: <Zap className="w-4 h-4" />, reqSerie: true, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'ferreteria', nombre: 'Ferretería / Eléctrico', icono: <Settings2 className="w-4 h-4" />, reqSerie: false, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
    { id: 'herramienta', nombre: 'Herramientas', icono: <Wrench className="w-4 h-4" />, reqSerie: true, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
    { id: 'vehiculos', nombre: 'Vehículos', icono: <Car className="w-4 h-4" />, reqSerie: true, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
    { id: 'computo', nombre: 'Cómputo / Oficina', icono: <Laptop className="w-4 h-4" />, reqSerie: true, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' }
]

const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

export default function Inventario() {
    const { showAlert, showConfirm } = useDialog();
    const navigate = useNavigate()
    const [tabActiva, setTabActiva] = useState<'catalogo' | 'movimientos' | 'despacho' | 'responsivas'>('catalogo')
    const [cargando, setCargando] = useState(true)

    // FILTROS GLOBALES
    const [busqueda, setBusqueda] = useState('')
    const [filtroCat, setFiltroCat] = useState('Todas')
    const [filtroTipoMov, setFiltroTipoMov] = useState('Todos')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')

    // Efecto para limpiar filtros al cambiar de tab para evitar estados bloqueados
    useEffect(() => {
        setFiltroCat('Todas');
        setFiltroTipoMov('Todos');
    }, [tabActiva]);

    const categoriasVisibles = useMemo(() => {
        if (tabActiva === 'despacho') return CATEGORIAS.filter(c => !['vehiculos', 'computo'].includes(c.id));
        if (tabActiva === 'responsivas') return CATEGORIAS.filter(c => ['vehiculos', 'computo'].includes(c.id));
        return CATEGORIAS;
    }, [tabActiva]);

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
    const [modalMantenimiento, setModalMantenimiento] = useState<{ abierto: boolean, activo: any | null }>({ abierto: false, activo: null })
    const [modalEditar, setModalEditar] = useState<{ abierto: boolean, item: any | null }>({ abierto: false, item: null })
    const [escanerGlobal, setEscanerGlobal] = useState(false)
    const [modalAsignados, setModalAsignados] = useState<{ abierto: boolean, catalogo_id: string | null }>({ abierto: false, catalogo_id: null })
    const [visorArchivo, setVisorArchivo] = useState<string | null>(null)

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

    const handleDevolverResponsiva = async (responsiva: any) => {
        if (!(await showConfirm(`¿Confirmas la devolución y liberación de: ${responsiva.serie?.catalogo?.nombre}?`))) return;
        try {
            setCargando(true);
            const { error: e1 } = await supabase.from('inventario_responsivas').update({ estatus: 'Devuelta', fecha_devolucion: new Date().toISOString() }).eq('id', responsiva.id);
            if (e1) throw e1;

            const { error: e2 } = await supabase.from('inventario_series').update({ estatus: 'Disponible' }).eq('id', responsiva.serie_id);
            if (e2) throw e2;

            const { error: e3 } = await supabase.from('inventario_movimientos').insert([{
                tipo: 'Devolución Activo', catalogo_id: responsiva.serie?.catalogo_id, cantidad: 1,
                usuario_id: usuarioLogueado?.id, referencia: `Devuelto por: ${responsiva.asignado?.nombre} ${responsiva.asignado?.apellidos}`
            }]);
            if (e3) throw e3;

            await showAlert('Aviso', "Activo liberado correctamente. Ya está disponible en stock.");
            fetchData();
        } catch (error: any) {
            await showAlert('Aviso', "Error al devolver: " + error.message);
        } finally { setCargando(false); }
    }

    const handleEliminarArticulo = async (item: any) => {
        const haSidoUsado = movimientosDb.some(m => m.catalogo_id === item.id && ['Salida a Obra', 'Asignación Activo'].includes(m.tipo));

        if (haSidoUsado) {
            return await showAlert('Aviso', "No puedes eliminar este artículo porque ya tiene movimientos de salida o asignación de activos.");
        }

        if (!(await showConfirm(`¿Estás seguro de eliminar permanentemente "${item.nombre}" (${item.sku})? Esto borrará permanentemente su registro y stock.`))) return;

        try {
            setCargando(true);
            // 1. Eliminar de inventario_series
            await supabase.from('inventario_series').delete().eq('catalogo_id', item.id);
            // 2. Eliminar de movimientos
            await supabase.from('inventario_movimientos').delete().eq('catalogo_id', item.id);
            // 3. Eliminar de catalogo
            const { error } = await supabase.from('inventario_catalogo').delete().eq('id', item.id);
            if (error) throw error;

            await showAlert('Aviso', "Artículo eliminado correctamente.");
            fetchData();
        } catch (error: any) {
            await showAlert('Aviso', "Error al eliminar el artículo: " + error.message);
        } finally {
            setCargando(false);
        }
    }

    const getChipColor = (tipo: string) => {
        if (tipo.includes('Ingreso') || tipo.includes('Entrada') || tipo.includes('Devolución')) return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
        if (tipo.includes('Salida')) return 'bg-orange-50 text-orange-600 border border-orange-200';
        if (tipo.includes('Asignación')) return 'bg-blue-50 text-blue-600 border border-blue-200';
        if (tipo.includes('Baja')) return 'bg-red-50 text-red-600 border border-red-200';
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    };

    const filtrarPorFechaYBusqueda = (arr: any[], dateField: string, searchFields: string[], catField?: string, movField?: string) => {
        return arr.filter(item => {
            const matchBusqueda = searchFields.some(field => getNestedValue(item, field)?.toLowerCase().includes(busqueda.toLowerCase()));
            const matchCat = catField ? (filtroCat === 'Todas' || getNestedValue(item, catField) === filtroCat) : true;
            const matchMov = movField ? (filtroTipoMov === 'Todos' || getNestedValue(item, movField)?.includes(filtroTipoMov)) : true;
            let matchFecha = true;
            if (fechaInicio && fechaFin) {
                const d = new Date(getNestedValue(item, dateField));
                matchFecha = d >= new Date(fechaInicio) && d <= new Date(fechaFin + 'T23:59:59');
            }
            return matchBusqueda && matchCat && matchMov && matchFecha;
        });
    };

    const catalogoFiltrado = useMemo(() => filtrarPorFechaYBusqueda(catalogoDb, 'created_at', ['nombre', 'sku'], 'categoria'), [catalogoDb, busqueda, filtroCat, fechaInicio, fechaFin]);
    const movimientosFiltrados = useMemo(() => filtrarPorFechaYBusqueda(movimientosDb, 'created_at', ['catalogo.nombre', 'catalogo.sku', 'referencia'], 'catalogo.categoria', 'tipo'), [movimientosDb, busqueda, filtroCat, filtroTipoMov, fechaInicio, fechaFin]);
    const despachoFiltrado = useMemo(() => filtrarPorFechaYBusqueda(seriesEnObra, 'created_at', ['catalogo.nombre', 'numero_serie', 'proyecto.nombre_proyecto'], 'catalogo.categoria'), [seriesEnObra, busqueda, filtroCat, fechaInicio, fechaFin]);
    const responsivasFiltradas = useMemo(() => filtrarPorFechaYBusqueda(responsivasDb, 'created_at', ['serie.catalogo.nombre', 'serie.numero_serie', 'asignado.nombre'], 'serie.catalogo.categoria'), [responsivasDb, busqueda, filtroCat, fechaInicio, fechaFin]);

    const exportarCSV = async () => {
        let dataToExport: any[] = [];
        let columns: { key: string, label: string }[] = [];
        let filename = '';

        if (tabActiva === 'catalogo') {
            dataToExport = catalogoFiltrado; filename = 'Catalogo_Inventario';
            columns = [{ key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Articulo' }, { key: 'categoria', label: 'Categoria' }, { key: 'stock_actual', label: 'Stock Actual' }, { key: 'stock_minimo', label: 'Stock Minimo' }, { key: 'created_at', label: 'Fecha de Alta' }];
        } else if (tabActiva === 'movimientos') {
            dataToExport = movimientosFiltrados; filename = 'Kardex_Movimientos';
            columns = [{ key: 'created_at', label: 'Fecha' }, { key: 'tipo', label: 'Tipo Movimiento' }, { key: 'catalogo.sku', label: 'SKU' }, { key: 'catalogo.nombre', label: 'Articulo' }, { key: 'cantidad', label: 'Cantidad' }, { key: 'usuario.nombre', label: 'Responsable' }, { key: 'referencia', label: 'Referencia / Proyecto' }];
        } else if (tabActiva === 'despacho') {
            dataToExport = despachoFiltrado; filename = 'Material_En_Obra';
            columns = [{ key: 'proyecto.nombre_proyecto', label: 'Proyecto' }, { key: 'catalogo.sku', label: 'SKU' }, { key: 'catalogo.nombre', label: 'Articulo' }, { key: 'numero_serie', label: 'Num. Serie' }, { key: 'created_at', label: 'Fecha Salida' }];
        } else if (tabActiva === 'responsivas') {
            dataToExport = responsivasFiltradas; filename = 'Responsivas_Activos';
            columns = [{ key: 'created_at', label: 'Fecha Asignacion' }, { key: 'serie.catalogo.nombre', label: 'Activo' }, { key: 'serie.numero_serie', label: 'Serie/Placa' }, { key: 'asignado.nombre', label: 'Asignado A' }, { key: 'estatus', label: 'Estatus' }];
        }

        if (dataToExport.length === 0) return await showAlert('Aviso', 'No hay datos para exportar con los filtros actuales.');

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
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen text-slate-900 font-sans relative bg-fixed bg-cover flex flex-col" style={{ backgroundImage: `url(${degradadoBg})` }}>

            <ChatGlobal isOpen={chatAbierto} onClose={() => setChatAbierto(false)} usuarioLogueado={usuarioLogueado} chatInicial={chatInicial} />
            <Header titulo="Control de Inventarios" onAbrirChat={(c: any) => { setChatInicial(c || null); setChatAbierto(true); }} />

            <main className="max-w-[1800px] mx-auto w-full px-4 md:px-8 py-6 md:py-8 relative z-10 flex-1 flex flex-col overflow-hidden">

                {/* --- TABS REDISEÑADAS RESPONSIVAS --- */}
                <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-[20px] shadow-sm border border-slate-200 w-full xl:w-max overflow-x-auto custom-scrollbar mb-4 shrink-0">
                    <button onClick={() => setTabActiva('catalogo')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'catalogo' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-500 hover:bg-emerald-50'}`}><Package className="w-4 h-4" /> STOCK / CATÁLOGO</button>
                    <button onClick={() => setTabActiva('movimientos')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'movimientos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}><History className="w-4 h-4" /> KARDEX (MOVS)</button>
                    <button onClick={() => setTabActiva('despacho')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'despacho' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50'}`}><FolderKanban className="w-4 h-4" /> SALIDAS A OBRA</button>
                    <button onClick={() => setTabActiva('responsivas')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] text-[10px] md:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${tabActiva === 'responsivas' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}><ClipboardSignature className="w-4 h-4" /> ACTIVOS Y AUTOS</button>
                </div>

                {/* --- BARRA DE FILTROS Y ACCIONES RESPONSIVA --- */}
                <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Buscar por Serie o SKU..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 w-full font-bold text-xs outline-none focus:border-slate-400 shadow-inner" />
                            <button onClick={() => setEscanerGlobal(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><ScanLine size={14} /></button>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <div className="flex gap-2 flex-1 sm:flex-none">
                                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-1/2 sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none text-slate-500 shadow-sm" title="Ingresado Desde" />
                                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-1/2 sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none text-slate-500 shadow-sm" title="Ingresado Hasta" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button onClick={exportarCSV} className="w-full sm:w-auto bg-green-50 text-green-700 px-5 py-3 md:py-2.5 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-green-100 transition-all shadow-sm border border-green-200 uppercase tracking-widest whitespace-nowrap"><DownloadCloud className="w-4 h-4" /> Exportar Excel</button>
                        {tabActiva === 'catalogo' && <button onClick={() => setModalIngreso(true)} className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 md:py-2.5 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><ArrowDownRight className="w-4 h-4" /> Ingreso Material</button>}
                        {tabActiva === 'despacho' && <button onClick={() => setModalDespacho(true)} className="w-full sm:w-auto bg-orange-500 text-white px-5 py-3 md:py-2.5 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><ArrowUpRight className="w-4 h-4" /> Nuevo Despacho</button>}
                        {tabActiva === 'responsivas' && <button onClick={() => setModalResponsiva(true)} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-3 md:py-2.5 rounded-xl font-black text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md uppercase tracking-widest whitespace-nowrap"><ClipboardSignature className="w-4 h-4" /> Nueva Responsiva</button>}
                    </div>
                </div>

                {/* --- BOTONES DE CATEGORÍA --- */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto custom-scrollbar shrink-0 pb-2">
                    {categoriasVisibles.map(cat => (
                        <button key={cat.id} onClick={() => setFiltroCat(cat.id)} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 shadow-sm ${filtroCat === cat.id ? `${cat.bg} ${cat.color} ${cat.border} border-2` : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                            {cat.icono} {cat.nombre}
                        </button>
                    ))}
                    <button className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap shadow-sm ml-auto ${filtroCat === 'Todas' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`} onClick={() => setFiltroCat('Todas')}>Mostrar Todas ({categoriasVisibles.length})</button>
                </div>

                {/* ======================================================================================= */}
                {/* VISTAS DE LAS PESTAÑAS */}
                {/* ======================================================================================= */}

                {/* 1. CATÁLOGO / STOCK */}
                {tabActiva === 'catalogo' && (
                    <div className="bg-white/95 backdrop-blur-xl rounded-[20px] md:rounded-[30px] shadow-2xl border border-white flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {cargando ? (
                                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin w-8 h-8 text-orange-500" /></div>
                            ) : catalogoFiltrado.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <Package size={48} className="mx-auto mb-4 opacity-30 text-slate-500" />
                                    <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">Sin Resultados</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10 shadow-sm">
                                            <th className="p-4 font-black whitespace-nowrap">SKU / Artículo</th>
                                            <th className="p-4 font-black whitespace-nowrap">Categoría</th>
                                            <th className="p-4 font-black text-center whitespace-nowrap">Stock Actual</th>
                                            <th className="p-4 font-black text-center whitespace-nowrap">Fecha Alta</th>
                                            <th className="p-4 font-black text-center whitespace-nowrap">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {catalogoFiltrado.map((item) => {
                                            const isCritico = item.stock_minimo > 0 && item.stock_actual <= item.stock_minimo;
                                            const catData = CATEGORIAS.find(c => c.id === item.categoria);
                                            const asignados = responsivasDb.filter(r => r.estatus === 'Activa' && r.serie?.catalogo_id === item.id).length;
                                            const haSidoUsado = movimientosDb.some(m => m.catalogo_id === item.id && ['Salida a Obra', 'Asignación Activo'].includes(m.tipo));

                                            return (
                                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-black text-xs uppercase text-slate-900 line-clamp-2 md:line-clamp-1">{item.nombre}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-1 tracking-widest flex items-center gap-1"><Barcode size={10} /> {item.sku}</p>
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
                                                        {item.categoria === 'computo' && (
                                                            <button onClick={() => setModalAsignados({ abierto: true, catalogo_id: item.id })} className="text-[8.5px] font-black uppercase mt-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md py-0.5 px-2 inline-block hover:bg-blue-100 transition-colors">
                                                                Ver Asignados: {asignados}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                                        {new Date(item.created_at).toLocaleDateString('es-MX')}
                                                    </td>
                                                    <td className="p-4 text-center whitespace-nowrap h-full">
                                                        <div className="flex items-center justify-center gap-1.5 mt-2">
                                                            <button onClick={() => setModalEditar({ abierto: true, item })} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200 tooltip-trigger" title="Editar">
                                                                <PenTool size={14} />
                                                            </button>
                                                            {!haSidoUsado && (
                                                                <button onClick={() => handleEliminarArticulo(item)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 tooltip-trigger" title="Eliminar">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
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
                    <div className="bg-white/95 backdrop-blur-xl rounded-[20px] md:rounded-[30px] shadow-2xl border border-white flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            {cargando ? (
                                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin w-8 h-8 text-orange-500" /></div>
                            ) : movimientosFiltrados.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <History size={48} className="mx-auto mb-4 opacity-30 text-slate-500" />
                                    <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">Sin Movimientos</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10 shadow-sm">
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
                                                <td className="p-4 text-[9px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">{new Date(mov.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-sm ${getChipColor(mov.tipo)}`}>
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
                    <div className="bg-white/95 backdrop-blur-xl rounded-[20px] md:rounded-[30px] shadow-2xl border border-white flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            {cargando ? (
                                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin w-8 h-8 text-orange-500" /></div>
                            ) : despachoFiltrado.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <FolderKanban size={48} className="mx-auto mb-4 opacity-30 text-slate-500" />
                                    <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">No hay material en obra</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10 shadow-sm">
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
                        {cargando ? (
                            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin w-8 h-8 text-orange-500" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                                {responsivasFiltradas.filter(r => r.estatus === 'Activa').map(resp => {
                                    const cat = CATEGORIAS.find(c => c.id === resp.serie?.catalogo?.categoria);
                                    return (
                                        <div key={resp.id} className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[20px] md:rounded-[24px] p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-4 gap-2">
                                                    <div className="flex gap-3 overflow-hidden">
                                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 border ${cat?.bg} ${cat?.color} ${cat?.border}`}>
                                                            {cat?.icono}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="font-black text-[11px] md:text-xs uppercase text-slate-900 leading-tight truncate" title={resp.serie?.catalogo?.nombre}>{resp.serie?.catalogo?.nombre}</p>
                                                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest truncate">SERIE: {resp.serie?.numero_serie}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100 shadow-inner">
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Resguardo Asignado A:</p>
                                                    <p className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase leading-none truncate">👤 {resp.asignado?.nombre} {resp.asignado?.apellidos}</p>
                                                </div>
                                            </div>
                                            {resp.fotos_entrega?.length > 0 && (
                                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50 overflow-x-auto custom-scrollbar pb-1">
                                                    {resp.fotos_entrega.map((fotoUrl: string, idx: number) => (
                                                        <img
                                                            key={idx}
                                                            src={fotoUrl}
                                                            className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 border border-slate-200 transition-opacity bg-slate-100 shrink-0"
                                                            onClick={() => setVisorArchivo(fotoUrl)}
                                                            title={`Ver evidencia ${idx + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center pt-3 md:pt-4 mt-2 md:mt-4 border-t border-slate-100">
                                                <button onClick={() => handleDevolverResponsiva(resp)} className="text-[8px] md:text-[9px] font-black uppercase text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-3 py-1.5 md:py-2 rounded-lg transition-colors flex items-center gap-1.5"><RotateCcw size={12} /> Liberar / Devolver</button>
                                                <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1"><Calendar size={12} /> {new Date(resp.created_at).toLocaleDateString('es-MX')}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                                {responsivasFiltradas.filter(r => r.estatus === 'Activa').length === 0 && <p className="col-span-full text-center py-10 text-xs font-bold text-slate-400 uppercase">No hay responsivas activas.</p>}
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* ================================================================================================= */}
            {/* ZONA DE MODALES (Unificados, Inteligentes y Escáner Camara)                                       */}
            {/* ================================================================================================= */}

            {/* ESCANER GLOBAL PARA BÚSQUEDA */}
            <AnimatePresence>
                {escanerGlobal && (
                    <ModalEscanerCamara
                        onClose={() => setEscanerGlobal(false)}
                        onScan={(res: string) => { setBusqueda(res); setEscanerGlobal(false); }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalEditar.abierto && (
                    <ModalEditarArticulo
                        onClose={() => setModalEditar({ abierto: false, item: null })}
                        onSave={() => { setModalEditar({ abierto: false, item: null }); fetchData(); }}
                        item={modalEditar.item}
                        categorias={CATEGORIAS}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalIngreso && (
                    <ModalIngresoMaterial
                        onClose={() => setModalIngreso(false)}
                        onSave={() => { setModalIngreso(false); fetchData(); }}
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
                        onSave={() => { setModalDespacho(false); fetchData(); }}
                        catalogo={catalogoDb.filter(c => ['paneles', 'inversores', 'ferreteria', 'herramienta'].includes(c.categoria) && c.stock_actual > 0)}
                        proyectos={proyectosDb}
                        usuarioLogueado={usuarioLogueado}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalResponsiva && (
                    <ModalNuevaResponsiva
                        onClose={() => setModalResponsiva(false)}
                        onSave={() => { setModalResponsiva(false); fetchData(); }}
                        colaboradores={colaboradoresDb}
                        catalogo={catalogoDb.filter(c => ['vehiculos', 'computo', 'herramienta'].includes(c.categoria))}
                        usuarioLogueado={usuarioLogueado}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalAsignados.abierto && (
                    <ModalDetalleAsignados
                        catalogoId={modalAsignados.catalogo_id}
                        onClose={() => setModalAsignados({ abierto: false, catalogo_id: null })}
                        responsivasDb={responsivasDb}
                        fetchData={fetchData}
                        usuarioLogueado={usuarioLogueado}
                    />
                )}
            </AnimatePresence>

            {visorArchivo && (
                <FileViewerModal url={visorArchivo} onClose={() => setVisorArchivo(null)} />
            )}

        </div>
    )
}

// ============================================================================
// COMPONENTE DETALLE ASIGNADOS
// ============================================================================

function ModalDetalleAsignados({ onClose, catalogoId, responsivasDb, fetchData, usuarioLogueado }: any) {
    const { showAlert, showConfirm } = useDialog();
    const [procesando, setProcesando] = useState(false);
    const asignados = useMemo(() => responsivasDb.filter((r: any) => r.serie?.catalogo_id === catalogoId && r.estatus === 'Activa'), [responsivasDb, catalogoId]);

    const handleEditarSerie = async (serieId: string, oldSerie: string) => {
        const newSerie = prompt('Ingresa el nuevo número de serie:', oldSerie);
        if (!newSerie || newSerie.trim() === '' || newSerie.trim() === oldSerie) return;

        setProcesando(true);
        try {
            const { data: existe } = await supabase.from('inventario_series').select('id').eq('numero_serie', newSerie.trim().toUpperCase()).maybeSingle();
            if (existe) return await showAlert('Aviso', `El número de serie ${newSerie} ya existe en el sistema.`);

            const { error } = await supabase.from('inventario_series').update({ numero_serie: newSerie.trim().toUpperCase() }).eq('id', serieId);
            if (error) throw error;

            await showAlert('Aviso', 'Número de serie actualizado con éxito.');
            fetchData();
        } catch (e: any) {
            await showAlert('Aviso', "Error al actualizar serie: " + e.message);
        } finally {
            setProcesando(false);
        }
    }

    const handleDarDeBaja = async (resp: any) => {
        if (!(await showConfirm(`¿Estás seguro de dar de baja DEFINITIVA el equipo con serie ${resp.serie.numero_serie}? Esto reducirá el stock actual, cambiará su estatus a Baja y cerrará la responsiva.`))) return;

        setProcesando(true);
        try {
            // Update serie
            await supabase.from('inventario_series').update({ estatus: 'Baja' }).eq('id', resp.serie_id);
            // Update responsiva
            const { error: eResp } = await supabase.from('inventario_responsivas').update({ estatus: 'Baja', fecha_devolucion: new Date().toISOString() }).eq('id', resp.id);
            if (eResp) throw eResp;

            // Adjust catalog stock (decrement by 1)
            const { data: cat } = await supabase.from('inventario_catalogo').select('stock_actual').eq('id', catalogoId).single();
            if (cat && cat.stock_actual > 0) {
                await supabase.from('inventario_catalogo').update({ stock_actual: cat.stock_actual - 1 }).eq('id', catalogoId);
            }

            // Log move
            await supabase.from('inventario_movimientos').insert([{
                tipo: 'Baja de Activo', catalogo_id: catalogoId, cantidad: 1,
                usuario_id: usuarioLogueado?.id, referencia: `Baja de equipo averiado/perdido (Asignado a ${resp.asignado?.nombre})`
            }]);

            await showAlert('Aviso', 'Equipo dado de baja del inventario exitosamente.');
            fetchData();
        } catch (e: any) {
            await showAlert('Aviso', "Error al dar de baja: " + e.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-white">
                <div className="bg-slate-900 p-5 md:p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><Laptop size={18} className="text-blue-500" /> Personal Asignado</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-7">Equipos actualmente en resguardo</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 bg-slate-50 flex flex-col gap-4">
                    {asignados.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Laptop size={48} className="mx-auto mb-4 opacity-30 text-slate-500" />
                            <p className="font-black uppercase tracking-widest text-[11px] md:text-xs">No hay usuarios asignados a este activo</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {asignados.map((resp: any) => (
                                <div key={resp.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-800">👤 {resp.asignado?.nombre} {resp.asignado?.apellidos}</p>
                                        <p className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{resp.asignado?.puesto_actual || 'Colaborador'}</p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <Barcode size={10} /> SN: {resp.serie?.numero_serie}
                                            </span>
                                            <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar size={10} /> {new Date(resp.created_at).toLocaleDateString('es-MX')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                                        <button disabled={procesando} onClick={() => handleEditarSerie(resp.serie_id, resp.serie?.numero_serie)} className="w-full sm:w-auto px-4 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                                            <PenTool size={12} /> Editar S/N
                                        </button>
                                        <button disabled={procesando} onClick={() => handleDarDeBaja(resp)} className="w-full sm:w-auto px-4 py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                                            <AlertTriangle size={12} /> Dar de Baja
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ============================================================================
// COMPONENTE CÁMARA (Librería Html5Qrcode)
// ============================================================================

function ModalEscanerCamara({ onClose, onScan }: any) {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader-qr", {
            qrbox: { width: 250, height: 250 },
            fps: 10, rememberLastUsedCamera: true
        }, false);

        scanner.render((decodedText: string) => {
            scanner.clear();
            onScan(decodedText);
        }, (err: any) => { /* ignorar errores continuos */ });

        return () => { scanner.clear().catch((e: any) => console.error(e)); };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] w-full max-w-md shadow-2xl flex flex-col overflow-hidden border border-white">
                <div className="bg-slate-900 p-4 md:p-5 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ScanLine size={18} className="text-orange-500" /> Escáner de Código</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="p-4 md:p-6 bg-slate-50 flex flex-col items-center">
                    <div id="reader-qr" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-inner border-2 border-slate-200 bg-black min-h-[250px]"></div>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest text-center">Apunta la cámara del dispositivo al código de barras o QR</p>
                </div>
            </motion.div>
        </div>
    )
}


// ============================================================================
// COMPONENTES DE MODALES AISLADOS (Lógica Limpia y Selectores Inteligentes)
// ============================================================================

function ModalEditarArticulo({ onClose, onSave, item, categorias }: any) {
    const { showAlert, showConfirm } = useDialog();
    const [procesando, setProcesando] = useState(false);
    const [sku, setSku] = useState(item?.sku || '');
    const [nombre, setNombre] = useState(item?.nombre || '');
    const [categoriaId, setCategoriaId] = useState(item?.categoria || 'ferreteria');
    const [stockMinimo, setStockMinimo] = useState<number | ''>(item?.stock_minimo || '');
    const [unidad, setUnidad] = useState(item?.unidad_medida || 'PZA');

    // Novedad: Arrays de series adicionales
    const [seriesExtra, setSeriesExtra] = useState<string[]>([]);
    const [escanerActivo, setEscanerActivo] = useState<{ tipo: 'serie', idxSerie?: number } | null>(null);

    const catData = categorias.find((c: any) => c.id === categoriaId);
    const reqSerie = catData?.reqSerie;

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcesando(true);
        try {
            const { error } = await supabase.from('inventario_catalogo').update({
                sku: sku.toUpperCase().trim(), nombre: nombre.trim(), categoria: categoriaId,
                stock_minimo: stockMinimo || 0, unidad_medida: unidad
            }).eq('id', item.id);
            if (error) throw error;

            const capturadas = seriesExtra.filter(s => s.trim() !== '');
            if (reqSerie && capturadas.length > 0) {
                const payloadSeries = capturadas.map(s => ({
                    catalogo_id: item.id, numero_serie: s.trim().toUpperCase(), estatus: 'Disponible'
                }));
                const { error: errSer } = await supabase.from('inventario_series').upsert(payloadSeries, { onConflict: 'numero_serie' });
                if (errSer) throw errSer;
            }

            await showAlert('Aviso', "Artículo y series actualizados correctamente.");
            onSave();
        } catch (err: any) {
            console.error(err);
            await showAlert('Aviso', "Error al actualizar: " + err.message);
        } finally { setProcesando(false); }
    }

    const handleScanResult = async (text: string) => {
        if (escanerActivo?.tipo === 'serie' && escanerActivo.idxSerie !== undefined) {
            const n = [...seriesExtra];
            n[escanerActivo.idxSerie] = text;
            setSeriesExtra(n);
        }
        setEscanerActivo(null);
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="bg-slate-900 p-5 md:p-6 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><PenTool size={18} className="text-orange-500" /> Editar Artículo</h3>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleGuardar} className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 bg-slate-50 flex flex-col gap-4">
                    <div className="bg-white p-5 rounded-[20px] border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">SKU / Modelo</label>
                            <input required type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="Ej: JKM550M" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-orange-500 shadow-inner uppercase" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Categoría</label>
                            <select required value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-orange-500 shadow-inner text-slate-700">
                                {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Descripción Completa</label>
                            <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-orange-500 shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Stock Mínimo</label>
                            <input type="number" min="0" value={stockMinimo} onChange={e => setStockMinimo(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-orange-500 shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Unidad Medida</label>
                            <select required value={unidad} onChange={e => setUnidad(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-orange-500 shadow-inner text-slate-700">
                                <option value="PZA">Piezas (PZA)</option>
                                <option value="MTS">Metros (MTS)</option>
                                <option value="KGS">Kilos (KGS)</option>
                            </select>
                        </div>

                        {reqSerie && (
                            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Añadir Series Faltantes (Opcional)</label>
                                <div className="grid grid-cols-1 gap-3 mt-2">
                                    {seriesExtra.map((serie, idx) => (
                                        <div key={idx} className="flex items-center relative">
                                            <div onClick={() => setEscanerActivo({ tipo: 'serie', idxSerie: idx })} className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg z-10 shadow-sm border-r-0 hover:bg-orange-50 cursor-pointer transition-colors group">
                                                <ScanLine className="w-5 h-5 text-orange-400 group-hover:text-orange-600" />
                                            </div>
                                            <input type="text" placeholder={`Serie extra #${idx + 1}...`} value={serie} onChange={(e) => { const n = [...seriesExtra]; n[idx] = e.target.value; setSeriesExtra(n); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-14 pr-10 rounded-lg text-xs font-black outline-none focus:border-orange-500 text-slate-700 uppercase tracking-wider" />
                                            <button type="button" onClick={() => setSeriesExtra(seriesExtra.filter((_, i) => i !== idx))} className="absolute right-2 p-1.5 text-slate-400 hover:text-red-500 bg-white shadow-sm rounded-md"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setSeriesExtra([...seriesExtra, ''])} className="w-full py-3.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 font-black uppercase text-[10px] hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={14} /> + Añadir No. de Serie
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="button" onClick={handleGuardar} disabled={procesando} className="w-full sm:w-auto bg-orange-500 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save size={14} /> Actualizar Artículo</>}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {escanerActivo && <ModalEscanerCamara onClose={() => setEscanerActivo(null)} onScan={handleScanResult} />}
            </AnimatePresence>
        </div>
    )
}

function ModalIngresoMaterial({ onClose, onSave, catalogo, categorias, usuarioLogueado }: any) {
    const { showAlert, showConfirm } = useDialog();
    const [tipoIngreso, setTipoIngreso] = useState<'existente' | 'nuevo'>('existente');
    const [procesando, setProcesando] = useState(false);
    const [escanerActivo, setEscanerActivo] = useState<{ tipo: 'sku' | 'serie', idxSerie?: number } | null>(null);

    // Formulario
    const [catalogoId, setCatalogoId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [series, setSeries] = useState<string[]>(['']);

    // Si selecciona existente
    const [busquedaCat, setBusquedaCat] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    // Si crea nuevo
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
        if (tipoIngreso === 'nuevo') return categorias.find((c: any) => c.id === categoriaId)?.reqSerie;
        if (catalogoId) return categorias.find((c: any) => c.id === catalogo.find((cat: any) => cat.id === catalogoId)?.categoria)?.reqSerie;
        return false;
    }, [tipoIngreso, categoriaId, catalogoId, categorias, catalogo]);

    const catalogoFiltrado = useMemo(() => catalogo.filter((c: any) => `${c.nombre} ${c.sku}`.toLowerCase().includes(busquedaCat.toLowerCase())), [catalogo, busquedaCat]);
    const itemSeleccionado = catalogo.find((c: any) => c.id === catalogoId);

    const handleScanResult = async (text: string) => {
        if (escanerActivo?.tipo === 'sku') {
            setSku(text);
            // También buscamos si existe
            const existe = catalogo.find(c => c.sku.toUpperCase() === text.toUpperCase());
            if (existe) {
                setTipoIngreso('existente');
                setCatalogoId(existe.id);
            }
        }
        if (escanerActivo?.tipo === 'serie' && escanerActivo.idxSerie !== undefined) {
            const n = [...series];
            n[escanerActivo.idxSerie] = text;
            setSeries(n);
        }
        setEscanerActivo(null);
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (tipoIngreso === 'existente' && !catalogoId) return await showAlert('Aviso', "Selecciona un artículo del buscador o crea uno nuevo.");

        const seriesCapturadas = series.filter(s => s.trim() !== '');
        setProcesando(true);
        try {
            let targetCatalogoId = catalogoId;

            if (tipoIngreso === 'nuevo') {
                const { data: newCat, error: errCat } = await supabase.from('inventario_catalogo').insert([{
                    sku: sku.toUpperCase().trim(), nombre: nombre.trim(), categoria: categoriaId,
                    stock_minimo: stockMinimo || 0, unidad_medida: unidad, stock_actual: 0
                }]).select().single();
                if (errCat) throw errCat;
                targetCatalogoId = newCat.id;
            }

            const { data: currentCat, error: errFetch } = await supabase.from('inventario_catalogo').select('stock_actual').eq('id', targetCatalogoId).single();
            if (errFetch) throw errFetch;

            const { error: errUpd } = await supabase.from('inventario_catalogo').update({ stock_actual: (currentCat?.stock_actual || 0) + cantidad }).eq('id', targetCatalogoId);
            if (errUpd) throw errUpd;

            const { error: errMov } = await supabase.from('inventario_movimientos').insert([{
                tipo: 'Entrada', catalogo_id: targetCatalogoId, cantidad: cantidad,
                usuario_id: usuarioLogueado?.id, referencia: 'Ingreso Manual al Almacén'
            }]);
            if (errMov) throw errMov;

            if (reqSerie && seriesCapturadas.length > 0) {
                const payloadSeries = seriesCapturadas.map(s => ({
                    catalogo_id: targetCatalogoId, numero_serie: s.trim().toUpperCase(), estatus: 'Disponible'
                }));
                const { error: errSer } = await supabase.from('inventario_series').upsert(payloadSeries, { onConflict: 'numero_serie' });
                if (errSer) throw errSer;
            }

            await showAlert('Aviso', "Ingreso registrado correctamente.");
            onSave();
        } catch (err: any) {
            console.error(err);
            await showAlert('Aviso', "Error al registrar: Verifica que el SKU o las Series no estén duplicadas.");
        } finally { setProcesando(false); }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="bg-slate-900 p-5 md:p-6 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ArrowDownRight size={18} className="text-emerald-500" /> Ingreso de Material</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                </div>

                <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
                    <button type="button" onClick={() => setTipoIngreso('existente')} className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${tipoIngreso === 'existente' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500'}`}>A Existente</button>
                    <button type="button" onClick={() => setTipoIngreso('nuevo')} className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${tipoIngreso === 'nuevo' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500'}`}>Crear Nuevo SKU</button>
                </div>

                <form onSubmit={handleGuardar} className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 bg-slate-50 flex flex-col gap-6">

                    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tipoIngreso === 'existente' ? (
                            <div className="sm:col-span-2 relative" ref={dropRef}>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Buscar Artículo Existente</label>
                                <div className="relative mt-1.5 flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" placeholder="Escribe nombre o SKU..." value={showDrop ? busquedaCat : (itemSeleccionado ? `[${itemSeleccionado.sku}] ${itemSeleccionado.nombre}` : '')} onFocus={() => setShowDrop(true)} onChange={e => { setBusquedaCat(e.target.value); setShowDrop(true); setCatalogoId(''); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 text-slate-700 shadow-inner" />
                                    </div>
                                    <button type="button" onClick={() => setEscanerActivo({ tipo: 'sku' })} className="px-4 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase whitespace-nowrap hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-200"><ScanLine size={18} /></button>
                                </div>
                                <AnimatePresence>
                                    {showDrop && (
                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                            {catalogoFiltrado.length === 0 ? (
                                                <div className="p-4 text-center text-slate-400 text-[10px] font-bold">No se encontró. <button type="button" onClick={() => setTipoIngreso('nuevo')} className="text-emerald-500 hover:underline">Crear "{busquedaCat}"</button></div>
                                            ) : catalogoFiltrado.map((c: any) => (
                                                <div key={c.id} onClick={() => { setCatalogoId(c.id); setShowDrop(false); setBusquedaCat(''); }} className="p-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer flex flex-col gap-0.5">
                                                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{c.nombre}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase truncate">SKU: {c.sku} | Stock Actual: {c.stock_actual}</p>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                                <div className="sm:col-span-2 flex justify-between items-center mb-2">
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Crear Nuevo Artículo</h4>
                                    <button type="button" onClick={() => setTipoIngreso('existente')} className="text-[9px] font-bold text-slate-400 hover:text-emerald-500 hover:underline">Volver a Búsqueda</button>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">SKU / Modelo</label>
                                    <div className="relative mt-1">
                                        <input required type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="Ej: JKM550M" className="w-full bg-slate-50 border border-slate-200 p-3.5 pr-10 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 shadow-inner uppercase" />
                                        <button type="button" onClick={() => setEscanerActivo({ tipo: 'sku' })} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><ScanLine size={16} /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Categoría</label>
                                    <select required value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner text-slate-700">
                                        {CATEGORIAS.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Descripción Completa</label><input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Panel Solar 550W Monocristalino..." className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner" /></div>
                                <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Stock Mínimo (Opcional)</label><input type="number" min="0" value={stockMinimo} onChange={e => setStockMinimo(e.target.value ? parseInt(e.target.value) : '')} placeholder="0 por defecto" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner" /></div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Unidad Medida</label>
                                    <select required value={unidad} onChange={e => setUnidad(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner text-slate-700">
                                        <option value="PZA">Piezas (PZA)</option>
                                        <option value="MTS">Metros (MTS)</option>
                                        <option value="KGS">Kilos (KGS)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Cantidad a Ingresar</label>
                            <div className="flex items-center mt-1.5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner w-full sm:w-1/2">
                                <button type="button" onClick={() => setCantidad(c => Math.max(1, c - 1))} className="px-5 py-3.5 font-black text-slate-400 hover:text-emerald-500 hover:bg-slate-100 transition-colors">-</button>
                                <input type="number" required min="1" value={cantidad} onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 w-full bg-transparent text-center text-sm font-black outline-none text-slate-800" />
                                <button type="button" onClick={() => setCantidad(c => c + 1)} className="px-5 py-3.5 font-black text-slate-400 hover:text-emerald-500 hover:bg-slate-100 transition-colors">+</button>
                            </div>
                        </div>
                    </div>

                    {reqSerie && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 md:p-6 shadow-inner shrink-0">
                            <h4 className="font-black text-[11px] uppercase tracking-widest text-emerald-800 flex items-center gap-2 mb-2"><ScanLine size={16} /> Escaneo de Series <span className="text-emerald-500 font-bold ml-2">(Opcional en Ingreso)</span></h4>
                            <p className="text-[9px] font-bold text-emerald-600/80 uppercase mb-4 leading-relaxed">Si la caja viene sellada, déjalas vacías y escanéalas al dar salida a Obra.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1 md:pr-2">
                                {series.map((serie, idx) => (
                                    <div key={idx} className="flex items-center relative">
                                        <div onClick={() => setEscanerActivo({ tipo: 'serie', idxSerie: idx })} className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg z-10 shadow-sm border-r-0 hover:bg-emerald-50 cursor-pointer transition-colors group">
                                            <ScanLine className="w-5 h-5 text-emerald-400 group-hover:text-emerald-600" />
                                        </div>
                                        <input type="text" placeholder={`Serie #${idx + 1} (Opcional)...`} value={serie} onChange={(e) => { const n = [...series]; n[idx] = e.target.value; setSeries(n); }} className="w-full bg-white border border-slate-200 p-3.5 pl-14 rounded-lg text-xs font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 shadow-sm uppercase tracking-wider transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </form>

                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleGuardar} disabled={procesando} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save size={14} /> Guardar Ingreso</>}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {escanerActivo && <ModalEscanerCamara onClose={() => setEscanerActivo(null)} onScan={handleScanResult} />}
            </AnimatePresence>
        </div>
    )
}

function DespachoItemRow({ item, idxItem, catalogo, items, setItems, onScanRequest }: any) {
    const [busqueda, setBusqueda] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const catSelect = catalogo.find((c: any) => c.id === item.catalogo_id);
    const requiereSerie = catSelect ? CATEGORIAS.find(c => c.id === catSelect.categoria)?.reqSerie : false;
    const maxDisp = catSelect ? catSelect.stock_actual : 999;

    const catalogoFiltrado = useMemo(() => catalogo.filter((c: any) => `${c.nombre} ${c.sku}`.toLowerCase().includes(busqueda.toLowerCase())), [catalogo, busqueda]);

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
            {items.length > 1 && <button onClick={() => setItems(items.filter((_: any, i: number) => i !== idxItem))} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative" ref={dropRef}>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">SKU a Enviar (Solo en Stock)</label>
                    <div className="relative mt-1.5 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Buscar insumo en Stock..." value={showDrop ? busqueda : (catSelect ? `[${catSelect.sku}] ${catSelect.nombre}` : '')} onFocus={() => setShowDrop(true)} onChange={e => { setBusqueda(e.target.value); setShowDrop(true); const n = [...items]; n[idxItem].catalogo_id = ''; setItems(n); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-orange-500 text-slate-700 shadow-inner" />
                            <AnimatePresence>
                                {showDrop && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {catalogoFiltrado.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin stock disponible.</div> : catalogoFiltrado.map((c: any) => (
                                            <div key={c.id} onClick={() => { const n = [...items]; n[idxItem].catalogo_id = c.id; n[idxItem].cantidad = 1; n[idxItem].series = ['']; setItems(n); setShowDrop(false); setBusqueda(''); }} className="p-3 border-b border-slate-50 hover:bg-orange-50 cursor-pointer flex flex-col gap-0.5">
                                                <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{c.nombre}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase truncate">SKU: {c.sku} | Disp: {c.stock_actual}</p>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button type="button" onClick={() => onScanRequest('sku', idxItem)} className="px-4 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase whitespace-nowrap hover:bg-orange-100 transition-colors shadow-sm border border-orange-200"><ScanLine size={18} /></button>
                    </div>
                </div>
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Cantidad (Máx: {maxDisp})</label>
                    <div className="flex items-center mt-1.5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                        <button onClick={() => handleCantidadChange(item.cantidad - 1)} className="px-4 py-3.5 font-black text-slate-400 hover:text-orange-500 hover:bg-slate-100">-</button>
                        <input type="number" min="1" max={maxDisp} value={item.cantidad} onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)} className="flex-1 w-full bg-transparent text-center text-sm font-black outline-none text-slate-800" />
                        <button onClick={() => handleCantidadChange(item.cantidad + 1)} className="px-4 py-3.5 font-black text-slate-400 hover:text-orange-500 hover:bg-slate-100">+</button>
                    </div>
                </div>
            </div>

            {requiereSerie && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-inner mt-4">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-orange-800 flex items-center gap-2 mb-3"><ScanLine size={14} /> Escaneo de Series <span className="text-red-500 font-bold ml-1">(OBLIGATORIO)</span></h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {item.series.map((serie: string, idxSerie: number) => (
                            <div key={idxSerie} className="flex items-center relative">
                                <div onClick={() => onScanRequest('serie', idxItem, idxSerie)} className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg z-10 shadow-sm border-r-0 hover:bg-orange-50 cursor-pointer transition-colors group">
                                    <ScanLine className="w-5 h-5 text-orange-400 group-hover:text-orange-600" />
                                </div>
                                <input
                                    autoFocus={idxSerie === 0} type="text" placeholder={`Serie #${idxSerie + 1}...`} value={serie} required
                                    onChange={(e) => { const n = [...items]; n[idxItem].series[idxSerie] = e.target.value; setItems(n); }}
                                    className={`w-full bg-white border p-3.5 pl-14 rounded-lg text-xs font-black outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-700 shadow-sm uppercase tracking-wider transition-all ${serie.trim() === '' ? 'border-red-300' : 'border-slate-200'}`}
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
    const { showAlert, showConfirm } = useDialog();
    const [procesando, setProcesando] = useState(false);
    const [proyectoId, setProyectoId] = useState('');
    const [items, setItems] = useState<any[]>([{ catalogo_id: '', cantidad: 1, series: [''] }]);

    // Combobox Proyectos
    const [busquedaProy, setBusquedaProy] = useState('');
    const [showProyDrop, setShowProyDrop] = useState(false);
    const proyRef = useRef<HTMLDivElement>(null);

    // Escáner
    const [escanerActivo, setEscanerActivo] = useState<{ tipo: 'sku' | 'serie', idxItem?: number, idxSerie?: number } | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (proyRef.current && !proyRef.current.contains(e.target as Node)) setShowProyDrop(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const proyectosFiltrados = useMemo(() => proyectos.filter((p: any) => p.nombre_proyecto.toLowerCase().includes(busquedaProy.toLowerCase())), [proyectos, busquedaProy]);
    const proySeleccionado = proyectos.find((p: any) => p.id === proyectoId);

    const checkValid = () => {
        if (!proyectoId) return false;
        return items.every(item => {
            if (!item.catalogo_id || item.cantidad <= 0) return false;
            const cat = catalogo.find((c: any) => c.id === item.catalogo_id);
            if (CATEGORIAS.find(c => c.id === cat?.categoria)?.reqSerie) {
                return item.series.every((s: string) => s.trim() !== ''); // Candado OBLIGATORIO
            }
            return true;
        });
    }

    const handleScanResult = async (text: string) => {
        if (escanerActivo?.tipo === 'sku' && escanerActivo.idxItem !== undefined) {
            const existe = catalogo.find((c: any) => c.sku.toUpperCase() === text.toUpperCase());
            if (existe) {
                const n = [...items];
                n[escanerActivo.idxItem].catalogo_id = existe.id;
                setItems(n);
            } else {
                await showAlert('Aviso', `No se encontró stock disponible para el SKU: ${text}`);
            }
        }
        if (escanerActivo?.tipo === 'serie' && escanerActivo.idxItem !== undefined && escanerActivo.idxSerie !== undefined) {
            const n = [...items];
            n[escanerActivo.idxItem].series[escanerActivo.idxSerie] = text;
            setItems(n);
        }
        setEscanerActivo(null);
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkValid()) return await showAlert('Aviso', "Completa toda la información y escanea las series necesarias.");

        setProcesando(true);
        try {
            for (const item of items) {
                const cat = catalogo.find((c: any) => c.id === item.catalogo_id);
                if (cat.stock_actual < item.cantidad) throw new Error(`Stock insuficiente para ${cat.nombre}`);

                const { error: e1 } = await supabase.from('inventario_catalogo').update({ stock_actual: cat.stock_actual - item.cantidad }).eq('id', cat.id);
                if (e1) throw e1;

                const { error: e2 } = await supabase.from('inventario_movimientos').insert([{
                    tipo: 'Salida a Obra', catalogo_id: cat.id, cantidad: item.cantidad,
                    usuario_id: usuarioLogueado?.id, referencia: proySeleccionado?.nombre_proyecto
                }]);
                if (e2) throw e2;

                if (CATEGORIAS.find(c => c.id === cat.categoria)?.reqSerie && item.series.length > 0) {
                    const seriesLimpio = item.series.map((s: string) => ({
                        catalogo_id: cat.id, numero_serie: s.trim().toUpperCase(), estatus: 'En Proyecto', proyecto_id: proyectoId
                    }));
                    const { error: e3 } = await supabase.from('inventario_series').upsert(seriesLimpio, { onConflict: 'numero_serie' });
                    if (e3) throw e3;
                }
            }
            await showAlert('Aviso', "Salida a obra y series registradas en Kardex con éxito.");
            onSave();
        } catch (err: any) {
            console.error(err);
            await showAlert('Aviso', "Error al despachar: Verifica que las series ingresadas sean correctas.");
        } finally { setProcesando(false); }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden h-[90vh]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ArrowUpRight size={18} className="text-orange-500" /> Despacho a Obra</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-7">Salida de Material Obligatorio con Serie</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-5 md:p-8 flex flex-col gap-4 md:gap-6 custom-scrollbar">
                    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm shrink-0" ref={proyRef}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Buscar Proyecto Destino</label>
                        <div className="relative mt-1.5">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Filtrar proyectos..." value={showProyDrop ? busquedaProy : (proySeleccionado ? proySeleccionado.nombre_proyecto : '')} onFocus={() => setShowProyDrop(true)} onChange={e => { setBusquedaProy(e.target.value); setShowProyDrop(true); setProyectoId(''); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-orange-500 text-slate-700 shadow-inner" />
                            <AnimatePresence>
                                {showProyDrop && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {proyectosFiltrados.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin proyectos.</div> : proyectosFiltrados.map((p: any) => (
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
                            <DespachoItemRow key={idxItem} item={item} idxItem={idxItem} catalogo={catalogo} items={items} setItems={setItems} onScanRequest={(tipo: any, idxI: number, idxS?: number) => setEscanerActivo({ tipo, idxItem: idxI, idxSerie: idxS })} />
                        ))}

                        <button onClick={() => setItems([...items, { catalogo_id: '', cantidad: 1, series: [''] }])} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-[20px] md:rounded-3xl text-slate-400 font-black uppercase text-xs tracking-widest hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16} /> Añadir otro artículo a la salida
                        </button>
                    </div>
                </div>

                <div className="p-5 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 shadow-[0_-10px_15px_rgba(0,0,0,0.03)]">
                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button disabled={!checkValid() || procesando} onClick={handleGuardar} className="w-full sm:w-auto bg-orange-500 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50 disabled:bg-slate-300 shadow-lg shadow-orange-500/30">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save size={16} /> Registrar Salida</>}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {escanerActivo && <ModalEscanerCamara onClose={() => setEscanerActivo(null)} onScan={handleScanResult} />}
            </AnimatePresence>
        </div>
    )
}

function ResponsivaItemRow({ item, idxItem, catalogo, items, setItems, onScanRequest }: any) {
    const [busqueda, setBusqueda] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const catSelect = catalogo.find((c: any) => c.id === item.catalogo_id);

    const catalogoFiltrado = useMemo(() => catalogo.filter((c: any) => `${c.nombre} ${c.sku}`.toLowerCase().includes(busqueda.toLowerCase())), [catalogo, busqueda]);

    const handleCantidadChange = (nuevaCantidad: number) => {
        const cant = Math.max(1, nuevaCantidad);
        const newItems = [...items];
        const currentSeries = newItems[idxItem].series;
        if (cant > currentSeries.length) newItems[idxItem].series = [...currentSeries, ...Array(cant - currentSeries.length).fill('')];
        else if (cant < currentSeries.length) newItems[idxItem].series = currentSeries.slice(0, cant);
        newItems[idxItem].cantidad = cant;
        setItems(newItems);
    }

    return (
        <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm relative">
            {items.length > 1 && <button onClick={() => setItems(items.filter((_: any, i: number) => i !== idxItem))} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative" ref={dropRef}>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">SKU a Asignar</label>
                    <div className="relative mt-1.5 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Buscar producto en el catálogo..." value={showDrop ? busqueda : (catSelect ? `[${catSelect.sku}] ${catSelect.nombre}` : '')} onFocus={() => setShowDrop(true)} onChange={e => { setBusqueda(e.target.value); setShowDrop(true); const n = [...items]; n[idxItem].catalogo_id = ''; setItems(n); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-blue-500 text-slate-700 shadow-inner" />
                            <AnimatePresence>
                                {showDrop && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {catalogoFiltrado.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin resultados.</div> : catalogoFiltrado.map((c: any) => (
                                            <div key={c.id} onClick={() => { const n = [...items]; n[idxItem].catalogo_id = c.id; n[idxItem].cantidad = 1; n[idxItem].series = ['']; setItems(n); setShowDrop(false); setBusqueda(''); }} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5">
                                                <p className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{c.nombre}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase truncate">SKU: {c.sku} | Pzs: {c.stock_actual}</p>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button type="button" onClick={() => onScanRequest('sku', idxItem)} className="px-4 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase whitespace-nowrap hover:bg-blue-100 transition-colors shadow-sm border border-blue-200"><ScanLine size={18} /></button>
                    </div>
                </div>
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Cantidad</label>
                    <div className="flex items-center mt-1.5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                        <button onClick={() => handleCantidadChange(item.cantidad - 1)} className="px-4 py-3.5 font-black text-slate-400 hover:text-blue-500 hover:bg-slate-100">-</button>
                        <input type="number" min="1" value={item.cantidad} onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)} className="flex-1 w-full bg-transparent text-center text-sm font-black outline-none text-slate-800" />
                        <button onClick={() => handleCantidadChange(item.cantidad + 1)} className="px-4 py-3.5 font-black text-slate-400 hover:text-blue-500 hover:bg-slate-100">+</button>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-inner mt-4">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-blue-800 flex items-center gap-2 mb-3"><ScanLine size={14} /> Ingresar o Escanear Series <span className="text-red-500 font-bold ml-1">(OBLIGATORIO)</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {item.series.map((serie: string, idxSerie: number) => (
                        <div key={idxSerie} className="flex items-center relative">
                            <div onClick={() => onScanRequest('serie', idxItem, idxSerie)} className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg z-10 shadow-sm border-r-0 hover:bg-blue-50 cursor-pointer transition-colors group">
                                <ScanLine className="w-5 h-5 text-blue-400 group-hover:text-blue-600" />
                            </div>
                            <input
                                autoFocus={idxSerie === 0} type="text" placeholder={`Serie #${idxSerie + 1}...`} value={serie} required
                                onChange={(e) => { const n = [...items]; n[idxItem].series[idxSerie] = e.target.value; setItems(n); }}
                                className={`w-full bg-white border p-3.5 pl-14 rounded-lg text-xs font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700 shadow-sm uppercase tracking-wider transition-all ${serie.trim() === '' ? 'border-red-300' : 'border-slate-200'}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ModalNuevaResponsiva({ onClose, onSave, colaboradores, catalogo, usuarioLogueado }: any) {
    const { showAlert, showConfirm } = useDialog();
    const [fotos, setFotos] = useState<(File | null)[]>([null, null, null, null]);
    const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
    const [asignadoId, setAsignadoId] = useState('');
    const [items, setItems] = useState<any[]>([{ catalogo_id: '', cantidad: 1, series: [''] }]);
    const [procesando, setProcesando] = useState(false);

    // Comboboxes
    const [bColab, setBColab] = useState('');
    const [showColab, setShowColab] = useState(false);
    const colabRef = useRef<HTMLDivElement>(null);

    // Escáner
    const [escanerActivo, setEscanerActivo] = useState<{ tipo: 'sku' | 'serie', idxItem?: number, idxSerie?: number } | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (colabRef.current && !colabRef.current.contains(e.target as Node)) setShowColab(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const colabFiltrados = useMemo(() => colaboradores.filter((c: any) => `${c.nombre} ${c.apellidos}`.toLowerCase().includes(bColab.toLowerCase())), [colaboradores, bColab]);

    const colabSelect = colaboradores.find((c: any) => c.id === asignadoId);

    const handleSubirFoto = (index: number, file: File) => {
        const urlLocal = URL.createObjectURL(file);
        const p = [...previews]; p[index] = urlLocal; setPreviews(p);
        const f = [...fotos]; f[index] = file; setFotos(f);
    }

    const checkValid = () => {
        if (!asignadoId) return false;
        if (fotos[0] === null) return false; // Solo la primera foto es obligatoria
        return items.every(item => {
            if (!item.catalogo_id || item.cantidad <= 0) return false;
            return item.series.every((s: string) => s.trim() !== ''); // Candado
        });
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkValid()) return await showAlert('Aviso', "Completa la información, ingresa las series y sube al menos 1 foto.");
        setProcesando(true);
        try {
            // PROCESAMIENTO PARALELO (solo las fotos que se subieron)
            const fotosValidas = fotos.filter(f => f !== null) as File[];
            const uploadPromises = fotosValidas.map(async (file, i) => {
                const path = `responsivas/${Date.now()}_${i}.jpg`;
                const { error } = await supabase.storage.from('expedientes').upload(path, file);
                if (error) throw error;
                const { data } = supabase.storage.from('expedientes').getPublicUrl(path);
                return data.publicUrl;
            });
            const urls = await Promise.all(uploadPromises);

            const colaboradorInfo = colaboradores.find((c: any) => c.id === asignadoId);

            for (const item of items) {
                // Upsert series to 'Asignado'
                const seriesLimpio = item.series.map((s: string) => ({
                    catalogo_id: item.catalogo_id, numero_serie: s.trim().toUpperCase(), estatus: 'Asignado'
                }));
                const { data: upsertedSeries, error: e1 } = await supabase.from('inventario_series')
                    .upsert(seriesLimpio, { onConflict: 'numero_serie' }).select();
                if (e1) throw e1;

                // Create a responsiva per serie
                const responsivasToInsert = upsertedSeries.map(s => ({
                    serie_id: s.id, asignado_a: asignadoId, entregado_por: usuarioLogueado?.id,
                    fotos_entrega: urls, estatus: 'Activa'
                }));
                const { error: e2 } = await supabase.from('inventario_responsivas').insert(responsivasToInsert);
                if (e2) throw e2;

                // Kardex
                const { error: e3 } = await supabase.from('inventario_movimientos').insert([{
                    tipo: 'Asignación Activo', catalogo_id: item.catalogo_id, cantidad: item.cantidad,
                    usuario_id: usuarioLogueado?.id, referencia: `Responsiva a: ${colaboradorInfo?.nombre} ${colaboradorInfo?.apellidos}`
                }]);
                if (e3) throw e3;
            }

            await showAlert('Aviso', "Responsivas y Kardex registrados exitosamente.");
            onSave();
        } catch (err: any) {
            await showAlert('Aviso', "Error: " + err.message);
        } finally { setProcesando(false); }
    }

    const handleScanResult = async (text: string) => {
        if (escanerActivo?.tipo === 'sku' && escanerActivo.idxItem !== undefined) {
            const existe = catalogo.find((c: any) => c.sku.toUpperCase() === text.toUpperCase());
            if (existe) {
                const n = [...items];
                n[escanerActivo.idxItem].catalogo_id = existe.id;
                setItems(n);
            } else {
                await showAlert('Aviso', `No se encontró stock o producto para el SKU: ${text}`);
            }
        }
        if (escanerActivo?.tipo === 'serie' && escanerActivo.idxItem !== undefined && escanerActivo.idxSerie !== undefined) {
            const n = [...items];
            n[escanerActivo.idxItem].series[escanerActivo.idxSerie] = text;
            setItems(n);
        }
        setEscanerActivo(null);
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden h-[85vh] md:max-h-[90vh]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-3"><ClipboardSignature size={18} className="text-blue-500" /> Nueva Responsiva</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-7">Asignación Física de Activos Fijos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 p-5 md:p-8 bg-slate-50 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-3xl border border-slate-200 shadow-sm" ref={colabRef}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Colaborador Destinatario</label>
                        <div className="relative mt-1.5">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Filtrar empleado..." value={showColab ? bColab : (colabSelect ? `${colabSelect.nombre} ${colabSelect.apellidos}` : '')} onFocus={() => setShowColab(true)} onChange={e => { setBColab(e.target.value); setShowColab(true); setAsignadoId(''); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-10 rounded-xl text-xs font-bold outline-none focus:border-blue-500 text-slate-700 shadow-inner" />
                            <AnimatePresence>
                                {showColab && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {colabFiltrados.length === 0 ? <div className="p-4 text-center text-slate-400 text-[10px] font-bold">Sin resultados.</div> : colabFiltrados.map((c: any) => (
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

                    <div className="space-y-4 md:space-y-6">
                        {items.map((item, idxItem) => (
                            <ResponsivaItemRow key={idxItem} item={item} idxItem={idxItem} catalogo={catalogo} items={items} setItems={setItems} onScanRequest={(tipo: any, idxI: number, idxS?: number) => setEscanerActivo({ tipo, idxItem: idxI, idxSerie: idxS })} />
                        ))}

                        <button onClick={() => setItems([...items, { catalogo_id: '', cantidad: 1, series: [''] }])} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-[20px] md:rounded-3xl text-slate-400 font-black uppercase text-xs tracking-widest hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16} /> Asignar otro artículo
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4"><Camera size={16} className="text-blue-500" /> Evidencia Fotográfica <span className="text-slate-400 text-[9px] font-bold lowercase">(Mínimo 1 requerida)</span></p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            {[0, 1, 2, 3].map(n => (
                                <label key={n} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-all shadow-inner overflow-hidden relative">
                                    {previews[n] ? (
                                        <img src={previews[n] as string} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Camera size={24} className="mb-2" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-center px-2">Foto {n + 1}</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleSubirFoto(n, e.target.files[0]) }} />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 shadow-[0_-10px_15px_rgba(0,0,0,0.03)]">
                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button disabled={!checkValid() || procesando} onClick={handleGuardar} className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={16} /> Firmar y Asignar</>}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {escanerActivo && <ModalEscanerCamara onClose={() => setEscanerActivo(null)} onScan={handleScanResult} />}
            </AnimatePresence>
        </div>
    )
}