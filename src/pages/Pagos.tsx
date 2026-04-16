import { useEffect, useState, useMemo } from 'react'
import { useDialog } from '../context/DialogContext'
import { useNavigate } from 'react-router-dom'
import { supabase, enviarNotificacionRoles } from '../supabaseClient'
import Header from '../components/Header'
import ChatGlobal from '../components/ChatGlobal'
import degradadoBg from '../assets/degradado.png'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, Calendar as CalendarIcon, Download, Wallet, Plus, X,
    FileText, CheckCircle2, AlertCircle, Clock, Info, Check, XCircle, LayoutList, Eye
} from 'lucide-react'
import ModalNuevaSolicitud from '../components/finanzas/ModalNuevaSolicitud'
import ModalDetallePago from '../components/finanzas/ModalDetallePago'
import ModalCategorias from '../components/finanzas/ModalCategorias'

export default function Pagos() {
    const { showAlert, showConfirm } = useDialog()
    const navigate = useNavigate()

    const [cargando, setCargando] = useState(true)
    const [pagos, setPagos] = useState<any[]>([])
    const [categoriasRaw, setCategoriasRaw] = useState<any[]>([])

    // FILTROS
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstatus, setFiltroEstatus] = useState('Todos')
    const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
    const [filtroFechaHasta, setFiltroFechaHasta] = useState('')

    // MODALES
    const [modalNueva, setModalNueva] = useState(false)
    const [modalDetalle, setModalDetalle] = useState<any>(null)
    const [modalCategorias, setModalCategorias] = useState(false)

    // CHAT
    const [chatAbierto, setChatAbierto] = useState(false)
    const [chatInicial, setChatInicial] = useState<any>(null)

    const usuarioLogueado = useMemo(() => {
        const data = localStorage.getItem('session_gea_solar')
        return data ? JSON.parse(data) : null
    }, [])

    const isAdmin = usuarioLogueado?.administrador_pagos === true

    const fetchData = async () => {
        setCargando(true)
        let query = supabase.from('finanzas_pagos').select('*, usuario:usuario_id (nombre, apellidos, avatar_url)').order('created_at', { ascending: false })

        if (!isAdmin) {
            query = query.eq('usuario_id', usuarioLogueado?.id)
        }

        const [resPagos, resCats] = await Promise.all([
            query,
            supabase.from('finanzas_categorias').select('*').order('nombre_categoria')
        ])

        if (resPagos.data) setPagos(resPagos.data)
        if (resCats.data) setCategoriasRaw(resCats.data)

        setCargando(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    // EXPORTAR EXCEL CSV
    const descargarCSV = () => {
        if (pagosFiltrados.length === 0) return showAlert('Aviso', 'No hay datos para exportar.');

        // Convert to CSV
        let csvData = 'ID Solicitud,Fecha,Tipo,Creador,Categoria,Subcategoria,Proveedor,Monto IVA,Estatus\n';
        pagosFiltrados.forEach(p => {
            const fecha = new Date(p.created_at).toLocaleDateString()
            const creador = `${p.usuario?.nombre} ${p.usuario?.apellidos}`
            const monto = p.monto_iva || 0
            csvData += `${p.id},${fecha},${p.tipo_solicitud},${creador},${p.categoria || ''},${p.subcategoria || ''},${p.proveedor_nombre || ''},${monto},${p.estatus}\n`
        });

        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Finanzas_Exportacion_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const pagosFiltrados = useMemo(() => {
        return pagos.filter(p => {
            let matchBusqueda = true
            if (busqueda) {
                const str = `${p.proveedor_nombre} ${p.id} ${p.usuario?.nombre} ${p.usuario?.apellidos}`.toLowerCase()
                matchBusqueda = str.includes(busqueda.toLowerCase())
            }
            let matchEstatus = filtroEstatus === 'Todos' || p.estatus === filtroEstatus

            let matchFecha = true
            if (filtroFechaDesde) {
                matchFecha = matchFecha && new Date(p.created_at) >= new Date(filtroFechaDesde)
            }
            if (filtroFechaHasta) {
                const hasta = new Date(filtroFechaHasta)
                hasta.setHours(23, 59, 59)
                matchFecha = matchFecha && new Date(p.created_at) <= hasta
            }

            return matchBusqueda && matchEstatus && matchFecha
        })
    }, [pagos, busqueda, filtroEstatus, filtroFechaDesde, filtroFechaHasta])

    return (
        <div className="min-h-screen relative flex flex-col font-sans text-slate-900">
            <div
                className="fixed inset-0 z-0 pointer-events-none"
                style={{ backgroundImage: `url(${degradadoBg})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', opacity: 1 }}
            />
            <div className="relative z-10 flex flex-col flex-1 bg-transparent">
                <Header
                    titulo="Pagos y Finanzas"
                    onAbrirChat={(chatInicial) => {
                        setChatInicial(chatInicial); setChatAbierto(true);
                    }}
                />

                <div className="max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8 w-full flex flex-col flex-1 pb-24 relative">

                    {/* HERRAMIENTAS HEADER */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-xl flex items-center shadow-sm border border-slate-200">
                                <Search className="text-slate-400 w-4 h-4 ml-1 mr-2" />
                                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} type="text" placeholder="Buscar proveedor, ID o creador..." className="outline-nonetext-xs md:text-sm font-bold text-slate-700 bg-transparent min-w-[200px]" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs md:text-sm font-bold text-slate-700 outline-none shadow-sm cursor-pointer">
                                <option value="Todos">Todos los Estatus</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="Solicitado">Solicitado</option>
                                <option value="Procesado">Procesado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>

                            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs md:text-sm font-bold text-slate-700 shadow-sm flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} className="outline-none" />
                                <span className="text-slate-400">a</span>
                                <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} className="outline-none" />
                            </div>

                            {isAdmin && (
                                <button onClick={descargarCSV} className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wide text-xs transition-colors flex items-center gap-2 shadow-sm">
                                    <Download size={14} /> Exportar
                                </button>
                            )}

                            <button onClick={() => setModalNueva(true)} className="bg-orange-500 hover:bg-slate-900 border border-transparent hover:border-slate-800 text-white px-5 py-2 rounded-xl font-black uppercase tracking-wide text-xs transition-colors flex items-center gap-2 shadow-md">
                                <Plus size={14} /> Nueva Solicitud
                            </button>

                            {isAdmin && (
                                <button onClick={() => setModalCategorias(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold uppercase tracking-wide text-xs transition-colors flex items-center gap-2 shadow-sm border border-slate-200">
                                    <LayoutList size={14} /> Gestión Catálogo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* TABLA DE CONTENIDO */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            {cargando ? (
                                <p className="text-center font-bold text-slate-400 uppercase tracking-widest text-xs mt-10">Cargando transacciones...</p>
                            ) : pagosFiltrados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-10 opacity-70">
                                    <Wallet size={48} className="text-slate-300 mb-4" />
                                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No se encontraron pagos</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Info</th>
                                            <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Creador</th>
                                            <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Monto</th>
                                            <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Estatus</th>
                                            <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagosFiltrados.map(p => (
                                            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                                <td className="py-4 align-top">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${p.tipo_solicitud === 'Comprobación' ? 'bg-emerald-400' : (p.tipo_solicitud === 'Reembolso' ? 'bg-indigo-400' : 'bg-blue-400')}`}>
                                                            {p.tipo_solicitud.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-xs uppercase text-slate-800">{p.tipo_solicitud}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                                                            <p className="text-[10px] text-slate-400 italic max-w-[200px] truncate">{p.proveedor_nombre || p.categoria}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 align-top">
                                                    <div className="font-bold text-[10px] uppercase text-slate-600 flex items-center gap-2 mt-1">
                                                        <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center tracking-tighter text-slate-500 overflow-hidden">
                                                            {p.usuario?.avatar_url ? <img src={p.usuario?.avatar_url} /> : p.usuario?.nombre?.charAt(0)}
                                                        </div>
                                                        {p.usuario?.nombre} {p.usuario?.apellidos}
                                                    </div>
                                                </td>
                                                <td className="py-4 align-top">
                                                    <p className="font-black text-sm uppercase text-slate-800 mt-1">${Number(p.monto_iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                                </td>
                                                <td className="py-4 align-top">
                                                    <div className="mt-1">
                                                        {p.estatus === 'Pendiente' && <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase inline-flex items-center gap-1 border border-orange-200"><Clock size={10} /> Pendiente</span>}
                                                        {p.estatus === 'Solicitado' && <span className="bg-blue-100 text-blue-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase inline-flex items-center gap-1 border border-blue-200"><CheckCircle2 size={10} /> Solicitado</span>}
                                                        {p.estatus === 'Procesado' && <span className="bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase inline-flex items-center gap-1 border border-emerald-200"><Check size={10} /> Procesado</span>}
                                                        {p.estatus === 'Cancelado' && <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase inline-flex items-center gap-1 border border-red-200"><XCircle size={10} /> Cancelado</span>}

                                                        {/* AUTO APROBADO LOGO */}
                                                        {p.monto_iva < 5000 && p.estatus !== 'Cancelado' && p.estatus !== 'Procesado' && (
                                                            <span className="ml-2 mt-1 tooltip bg-yellow-100 text-yellow-600 px-2 py-1 rounded border border-yellow-300 text-[8px] font-black uppercase" title="Auto-Aprobación por SLA Mínimo">⚡ Auto</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 align-top text-right">
                                                    <button onClick={() => setModalDetalle(p)} className="bg-white hover:bg-slate-900 border border-slate-200 hover:border-slate-800 text-slate-600 hover:text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-sm hover:shadow-lg flex items-center justify-center gap-2 max-w-[120px] ml-auto">
                                                        <Eye size={14} className="shrink-0" /> Detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <AnimatePresence>
                {modalNueva && (
                    <ModalNuevaSolicitud
                        onClose={() => setModalNueva(false)}
                        onSuccess={() => { setModalNueva(false); fetchData() }}
                        categorias={categoriasRaw}
                        usuarioLogueado={usuarioLogueado}
                        showAlert={showAlert}
                    />
                )}
                {modalDetalle && (
                    <ModalDetallePago
                        pago={modalDetalle}
                        onClose={() => setModalDetalle(null)}
                        onSuccess={() => { setModalDetalle(null); fetchData() }}
                        usuarioLogueado={usuarioLogueado}
                        showAlert={showAlert}
                        showConfirm={showConfirm}
                    />
                )}
                {modalCategorias && (
                    <ModalCategorias
                        onClose={() => setModalCategorias(false)}
                        categoriasRaw={categoriasRaw}
                        onSuccess={() => { fetchData() }}
                        showAlert={showAlert}
                        showConfirm={showConfirm}
                    />
                )}
            </AnimatePresence>

            <ChatGlobal isOpen={chatAbierto} onClose={() => setChatAbierto(false)} usuarioLogueado={usuarioLogueado} chatInicial={chatInicial} />
        </div>
    )
}
