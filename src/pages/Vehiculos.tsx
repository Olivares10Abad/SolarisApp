import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase, enviarNotificacionRoles } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Loader2, FileText, MapPin, Gauge, ShieldCheck, Fuel, CheckCircle2, AlertCircle, Wrench, CalendarDays, ChevronRight, X, User as UserIcon, Calendar, Edit, Camera, Key, MessageSquare, ToolCase, Plus, Save } from 'lucide-react'
import Header from '../components/Header'
import { useDialog } from '../context/DialogContext'
import degradadoBg from '../assets/degradado.png'
import ChatGlobal from '../components/ChatGlobal'

// COMPONENTE: TARJETA DE VEHÍCULO
function VehiculoCard({ v, onClick, onClickAdmin, isAdmin }: any) {
    const isEnUso = v.estatus === 'En Uso'
    const isMantenimiento = v.estatus === 'En Mantenimiento'

    return (
        <motion.div whileHover={{ y: -5 }} onClick={onClick} className={`bg-white border ${isEnUso ? 'border-orange-200' : 'border-slate-200'} rounded-3xl p-5 shadow-sm cursor-pointer relative overflow-hidden group transition-all hover:shadow-xl`}>
            {isEnUso && (
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-xl tracking-widest flex items-center gap-1 shadow-sm">
                    <MapPin size={12} /> En Uso
                </div>
            )}
            {isMantenimiento && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-xl tracking-widest flex items-center gap-1 shadow-sm">
                    <Wrench size={12} /> Taller
                </div>
            )}
            {!isEnUso && !isMantenimiento && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-xl tracking-widest flex items-center gap-1 shadow-sm">
                    <CheckCircle2 size={12} /> Disponible
                </div>
            )}

            <div className="flex gap-4">
                <div className="w-24 h-24 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner shrink-0">
                    {v.imagen_url ? (
                        <img src={v.imagen_url} alt={v.modelo} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                        <Car size={32} className="text-slate-300" />
                    )}
                </div>
                <div className="flex flex-col justify-center flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{v.marca}</p>
                    <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter leading-none mb-2">{v.modelo}</h3>
                    <p className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded inline-block w-max border border-slate-200">{v.placas}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Gauge size={16} /></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Kilometraje</p>
                        <p className="text-xs font-black text-slate-700">{Number(v.km_actual || 0).toLocaleString()} km</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500"><Fuel size={16} /></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Gasolina</p>
                        <p className="text-xs font-black text-slate-700">{v.nivel_gasolina || 'Lleno'}</p>
                    </div>
                </div>
            </div>

            {isEnUso && v.usuario_actual && (
                <div className="mt-4 bg-orange-50 p-3 rounded-xl border border-orange-200 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-600 overflow-hidden shadow-inner">
                        {v.usuario_actual?.avatar_url ? <img src={v.usuario_actual.avatar_url} className="w-full h-full object-cover" /> : v.usuario_actual.nombre.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-0.5">Retirado Por</p>
                        <p className="text-xs font-bold text-orange-700 leading-none">{v.usuario_actual.nombre} {v.usuario_actual.apellidos}</p>
                        {v.fecha_estimada_regreso && <p className="text-[9px] font-bold mt-1.5 text-orange-600 bg-orange-100/50 inline-block px-1.5 py-0.5 rounded border border-orange-200">Regresa: {new Date(v.fecha_estimada_regreso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>
                </div>
            )}

            {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); onClickAdmin && onClickAdmin(); }} className="absolute bottom-3 right-3 bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-rose-500 transition-colors z-10 shadow-lg">
                    <FileText size={10} /> Ficha Técnica
                </button>
            )}
        </motion.div>
    )
}

export default function Vehiculos() {
    const { showAlert, showConfirm } = useDialog()
    const [vehiculos, setVehiculos] = useState<any[]>([])
    const [cargando, setCargando] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // Chat
    const [chatAbierto, setChatAbierto] = useState(false)
    const [chatInicial, setChatInicial] = useState<any>(null)

    // Modales
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<any>(null)
    const [modoModal, setModoModal] = useState<'checkout' | 'checkin' | 'reporte' | 'historial' | 'visor' | 'nuevo' | 'admin_hoja_vida' | null>(null)

    // Estados Formularios
    const [procesando, setProcesando] = useState(false)
    const [formKM, setFormKM] = useState('')
    const [formGas, setFormGas] = useState('Lleno')
    const [formRegreso, setFormRegreso] = useState('')
    const [formComentarios, setFormComentarios] = useState('')
    const [fotosExtra, setFotosExtra] = useState<File[]>([])
    const inputFileRef = useRef<HTMLInputElement>(null)
    const [reporteTitulo, setReporteTitulo] = useState('')
    const [formNuevoVH, setFormNuevoVH] = useState({ marca: '', modelo: '', placas: '', km_actual: '', nivel_gasolina: 'Lleno' })
    const [formMotivo, setFormMotivo] = useState('')
    const [formSubMotivo, setFormSubMotivo] = useState('')
    const [formFechaTaller, setFormFechaTaller] = useState('')
    const [formHojaVida, setFormHojaVida] = useState({ poliza_seguro: '', fin_poliza_seguro: '', ultimo_mantenimiento: '', km_ultimo_mantenimiento: '', ciclo_km_mantenimiento: '', ultimo_cambio_llantas: '', km_ultimo_cambio_llantas: '', ultima_reparacion: '' })

    // Visor Documentos Historial
    const [historialBitacora, setHistorialBitacora] = useState<any[]>([])
    const [reportesAbiertos, setReportesAbiertos] = useState<any[]>([])

    // Filtros Admin
    const [vistaAdmin, setVistaAdmin] = useState<'Flota' | 'Reportes'>('Flota')

    const usuarioLogueado = useMemo(() => {
        const data = localStorage.getItem('session_gea_solar')
        return data ? JSON.parse(data) : null
    }, [])

    useEffect(() => {
        const load = async () => {
            if (usuarioLogueado) setIsAdmin(usuarioLogueado?.vehiculos === true);
            await cargarVehiculos();
            await cargarReportesAdmin();
            setCargando(false);
        }
        load();
    }, [usuarioLogueado])

    const cargarVehiculos = async () => {
        setCargando(true)
        const { data } = await supabase.from('vehiculos').select(`
            *,
            usuario_actual:usuario_actual_id (id, nombre, apellidos, avatar_url)
        `).order('created_at', { ascending: true })
        if (data) setVehiculos(data)
    }

    const cargarHistorialVehiculo = async (vid: string) => {
        const { data } = await supabase.from('vehiculos_bitacora').select(`
            *,
            usuario:usuario_id (nombre, apellidos)
        `).eq('vehiculo_id', vid).order('fecha_salida', { ascending: false }).limit(20)
        setHistorialBitacora(data || [])
    }

    const cargarReportesAdmin = async () => {
        const { data } = await supabase.from('vehiculos_reportes').select(`
            *, vehiculo:vehiculo_id(marca, modelo, placas), usuario:usuario_id(nombre, apellidos)
        `).eq('estatus', 'Reportado').order('created_at', { ascending: false })
        if (data) setReportesAbiertos(data)
    }

    const abrirHojaVida = (v: any) => {
        setVehiculoSeleccionado(v)
        cargarHistorialVehiculo(v.id)
        setFormHojaVida({
            poliza_seguro: v.poliza_seguro || '',
            fin_poliza_seguro: v.fin_poliza_seguro ? v.fin_poliza_seguro.split('T')[0] : '',
            ultimo_mantenimiento: v.ultimo_mantenimiento ? v.ultimo_mantenimiento.split('T')[0] : '',
            km_ultimo_mantenimiento: v.km_ultimo_mantenimiento?.toString() || '',
            ciclo_km_mantenimiento: v.ciclo_km_mantenimiento?.toString() || '',
            ultimo_cambio_llantas: v.ultimo_cambio_llantas ? v.ultimo_cambio_llantas.split('T')[0] : '',
            km_ultimo_cambio_llantas: v.km_ultimo_cambio_llantas?.toString() || '',
            ultima_reparacion: v.ultima_reparacion ? v.ultima_reparacion.split('T')[0] : ''
        })
        setModoModal('admin_hoja_vida')
    }

    const handleSubmitHojaVida = async () => {
        if (!formHojaVida.ciclo_km_mantenimiento) return showAlert('Aviso', 'El ciclo de mantenimiento en KM es obligatorio para las alertas predictivas.');
        setProcesando(true)
        const { error } = await supabase.from('vehiculos').update({
            poliza_seguro: formHojaVida.poliza_seguro || null,
            fin_poliza_seguro: formHojaVida.fin_poliza_seguro ? new Date(formHojaVida.fin_poliza_seguro).toISOString() : null,
            ultimo_mantenimiento: formHojaVida.ultimo_mantenimiento ? new Date(formHojaVida.ultimo_mantenimiento).toISOString() : null,
            km_ultimo_mantenimiento: formHojaVida.km_ultimo_mantenimiento ? Number(formHojaVida.km_ultimo_mantenimiento) : null,
            ciclo_km_mantenimiento: formHojaVida.ciclo_km_mantenimiento ? Number(formHojaVida.ciclo_km_mantenimiento) : null,
            ultimo_cambio_llantas: formHojaVida.ultimo_cambio_llantas ? new Date(formHojaVida.ultimo_cambio_llantas).toISOString() : null,
            km_ultimo_cambio_llantas: formHojaVida.km_ultimo_cambio_llantas ? Number(formHojaVida.km_ultimo_cambio_llantas) : null,
            ultima_reparacion: formHojaVida.ultima_reparacion ? new Date(formHojaVida.ultima_reparacion).toISOString() : null
        }).eq('id', vehiculoSeleccionado.id)

        if (error) { setProcesando(false); return showAlert('Error BD', error.message); }
        await cargarVehiculos()
        setModoModal(null)
        setProcesando(false)
        showAlert('Guardado', 'Ficha Técnica actualizada correctamente.')
    }

    const abrirCoche = async (v: any) => {
        setVehiculoSeleccionado(v)
        setFormKM(v.km_actual?.toString() || '')
        setFormGas(v.nivel_gasolina || 'Lleno')
        setFormRegreso('')
        setFormComentarios('')
        setFotosExtra([])

        if (v.estatus === 'Disponible') {
            setModoModal('historial')
            await cargarHistorialVehiculo(v.id)
        } else if (v.estatus === 'En Uso') {
            if (v.usuario_actual_id === usuarioLogueado?.id) {
                setModoModal('historial') // Puedes liberar desde el historial
            } else {
                setModoModal('historial') // Solo ver historial, está ocupado
            }
            await cargarHistorialVehiculo(v.id)
        } else {
            // Mantenimiento
            setModoModal('historial')
            await cargarHistorialVehiculo(v.id)
        }
    }

    const handleUploadFotos = async () => {
        const urls: string[] = []
        for (const f of fotosExtra) {
            const ext = f.name.split('.').pop()
            const name = `vehiculos/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
            const { error } = await supabase.storage.from('expedientes').upload(name, f)
            if (!error) {
                const pu = supabase.storage.from('expedientes').getPublicUrl(name).data.publicUrl
                urls.push(pu)
            }
        }
        return urls
    }

    const handleSubmitCheckout = async () => {
        if (!formKM || isNaN(Number(formKM)) || Number(formKM) < Number(vehiculoSeleccionado.km_actual)) {
            return showAlert('Aviso', 'Ingresa un kilometraje válido (mayor o igual al actual).')
        }
        if (fotosExtra.length < 4) {
            return showAlert('Evidencia Incompleta', 'Debes adjuntar al menos 4 fotos (Frontal, Trasera, Izquierda, Derecha).')
        }
        if (!formMotivo) {
            return showAlert('Aviso', 'Es obligatorio especificar el motivo de salida.');
        }
        if (formMotivo === 'Taller' && (!formSubMotivo || !formFechaTaller)) {
            return showAlert('Aviso', 'Cuando la salida es por Taller, debes especificar el tipo de servicio y su fecha.');
        }

        if (formMotivo === 'Taller') {
            if (!(await showConfirm('⚠️ Has registrado un servicio de taller. Esto actualizará permanentemente las analíticas de desgaste en la Ficha Técnica de la unidad. ¿Deseas continuar?'))) return;
        } else {
            if (!(await showConfirm('¿Estás seguro de registrar la toma de este vehículo?'))) return;
        }

        setProcesando(true)
        const urlsFotos = await handleUploadFotos()

        const nuevKm = Number(formKM)

        // Definir campos a actualizar en la Ficha
        let techUpdate: any = {};
        if (formMotivo === 'Taller') {
            if (formSubMotivo === 'Mantenimiento') techUpdate.ultimo_mantenimiento = new Date(formFechaTaller).toISOString();
            if (formSubMotivo === 'Reparacion') techUpdate.ultima_reparacion = new Date(formFechaTaller).toISOString();
            if (formSubMotivo === 'Llantas') {
                techUpdate.ultimo_cambio_llantas = new Date(formFechaTaller).toISOString();
                techUpdate.km_ultimo_cambio_llantas = nuevKm;
            }
        }

        // Update vehicle
        const { error: errV } = await supabase.from('vehiculos').update({
            estatus: 'En Uso',
            usuario_actual_id: usuarioLogueado.id,
            km_actual: nuevKm,
            nivel_gasolina: formGas,
            fecha_estimada_regreso: formRegreso || null,
            ...techUpdate
        }).eq('id', vehiculoSeleccionado.id)

        if (errV) { setProcesando(false); return showAlert('Error Base de Datos', errV.message); }

        // Create bitacora
        const { error: errBit } = await supabase.from('vehiculos_bitacora').insert([{
            vehiculo_id: vehiculoSeleccionado.id,
            usuario_id: usuarioLogueado.id,
            fecha_salida: new Date().toISOString(),
            km_salida: nuevKm,
            gasolina_salida: formGas,
            fotos_salida: urlsFotos,
            comentarios_salida: formComentarios,
            motivo_salida: formMotivo,
            sub_motivo_taller: formSubMotivo || null,
            fecha_taller: formMotivo === 'Taller' && formFechaTaller ? new Date(formFechaTaller).toISOString() : null
        }])

        if (errBit) { setProcesando(false); return showAlert('Error Bitácora', errBit.message); }

        await cargarVehiculos()
        setModoModal(null)
        setProcesando(false)
        showAlert('Éxito', 'Vehículo asignado y llaves liberadas. ¡Conduce con cuidado!')
    }

    const handleSubmitCheckin = async () => {
        if (!formKM || isNaN(Number(formKM)) || Number(formKM) < Number(vehiculoSeleccionado.km_actual)) {
            return showAlert('Aviso', 'El kilometraje de regreso debe ser mayor o igual al de salida.')
        }
        if (fotosExtra.length < 2) {
            return showAlert('Aviso', 'Toma al menos 2 fotos: Tablero y General del Auto.')
        }
        if (!(await showConfirm('¿Estás seguro de devolver el vehículo?'))) return;

        setProcesando(true)
        const urlsFotos = await handleUploadFotos()
        const nuevKm = Number(formKM)

        // Find active bitacora
        const { data: bita } = await supabase.from('vehiculos_bitacora')
            .select('*').eq('vehiculo_id', vehiculoSeleccionado.id).eq('usuario_id', usuarioLogueado.id)
            .is('fecha_regreso', null).order('fecha_salida', { ascending: false }).limit(1).single()

        if (bita) {
            const ms = new Date().getTime() - new Date(bita.fecha_salida).getTime();
            const mins = Math.floor(ms / 60000);

            const { error: errBit } = await supabase.from('vehiculos_bitacora').update({
                fecha_regreso: new Date().toISOString(),
                km_regreso: nuevKm,
                gasolina_regreso: formGas,
                fotos_regreso: urlsFotos,
                comentarios_regreso: formComentarios,
                tiempo_uso_minutos: mins
            }).eq('id', bita.id)
            if (errBit) { setProcesando(false); return showAlert('Error Bitácora', errBit.message); }
        }

        // Release vehicle
        const { error: errV } = await supabase.from('vehiculos').update({
            estatus: 'Disponible',
            usuario_actual_id: null,
            km_actual: nuevKm,
            nivel_gasolina: formGas,
            fecha_estimada_regreso: null
        }).eq('id', vehiculoSeleccionado.id)
        if (errV) { setProcesando(false); return showAlert('Error BD', errV.message); }

        // Mantenimiento Predictivo Automático
        if (vehiculoSeleccionado.km_ultimo_mantenimiento && vehiculoSeleccionado.ciclo_km_mantenimiento) {
            const nextServiceKM = vehiculoSeleccionado.km_ultimo_mantenimiento + vehiculoSeleccionado.ciclo_km_mantenimiento;
            if (nuevKm >= (nextServiceKM - 500)) {
                await enviarNotificacionRoles('notif_vehiculos', `Mantenimiento Próximo o Vencido: Auto ${vehiculoSeleccionado.placas}. (Actual: ${nuevKm}km, Toca en: ${nextServiceKM}km)|||/vehiculos`, usuarioLogueado.id)
            }
        }

        await cargarVehiculos()
        setModoModal(null)
        setProcesando(false)
        showAlert('Vehículo Liberado', 'Has entregado el vehículo correctamente.')
    }

    const handleSubmitReporte = async () => {
        if (!reporteTitulo) return showAlert('Aviso', 'Describe brevemente la avería o reporte.')
        if (!(await showConfirm('¿Enviar reporte de revisión vehicular?'))) return;

        setProcesando(true)
        const urls = await handleUploadFotos()

        await supabase.from('vehiculos_reportes').insert([{
            vehiculo_id: vehiculoSeleccionado.id,
            usuario_id: usuarioLogueado.id,
            titulo: reporteTitulo,
            descripcion: formComentarios,
            fotos: urls
        }])

        await enviarNotificacionRoles('notif_vehiculos', `Reporte Vehicular: ${vehiculoSeleccionado.placas} - ${reporteTitulo}|||/vehiculos`, usuarioLogueado.id)

        setModoModal(null)
        setProcesando(false)
        showAlert('Enviado', 'Notificación técnica enviada al administrador.')
    }

    const resolverReporte = async (repId: string) => {
        if (!(await showConfirm('¿Marcar este incidente como RESUELTO?'))) return;
        setProcesando(true)
        await supabase.from('vehiculos_reportes').update({ estatus: 'Resuelto', resuelto_at: new Date().toISOString() }).eq('id', repId)
        await cargarReportesAdmin()
        setProcesando(false)
    }

    const handleSubmitCrearVehiculo = async () => {
        if (!formNuevoVH.marca || !formNuevoVH.modelo || !formNuevoVH.placas || !formNuevoVH.km_actual) return showAlert('Aviso', 'Llena todos los campos requeridos para crear la unidad.');
        setProcesando(true);
        let urlImg = null;
        if (fotosExtra.length > 0) {
            const f = fotosExtra[0];
            const ext = f.name.split('.').pop();
            const name = `vehiculos/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { error: errUp } = await supabase.storage.from('expedientes').upload(name, f);
            if (!errUp) urlImg = supabase.storage.from('expedientes').getPublicUrl(name).data.publicUrl;
        }
        const { error: errorAuto } = await supabase.from('vehiculos').insert([{
            marca: formNuevoVH.marca,
            modelo: formNuevoVH.modelo,
            placas: formNuevoVH.placas,
            km_actual: Number(formNuevoVH.km_actual),
            imagen_url: urlImg,
            estatus: 'Disponible',
            nivel_gasolina: formNuevoVH.nivel_gasolina,
            poliza_seguro: formHojaVida.poliza_seguro || null,
            fin_poliza_seguro: formHojaVida.fin_poliza_seguro ? new Date(formHojaVida.fin_poliza_seguro).toISOString() : null,
            ultimo_mantenimiento: formHojaVida.ultimo_mantenimiento ? new Date(formHojaVida.ultimo_mantenimiento).toISOString() : null,
            km_ultimo_mantenimiento: formHojaVida.km_ultimo_mantenimiento ? Number(formHojaVida.km_ultimo_mantenimiento) : null,
            ciclo_km_mantenimiento: formHojaVida.ciclo_km_mantenimiento ? Number(formHojaVida.ciclo_km_mantenimiento) : null,
            ultimo_cambio_llantas: formHojaVida.ultimo_cambio_llantas ? new Date(formHojaVida.ultimo_cambio_llantas).toISOString() : null,
            km_ultimo_cambio_llantas: formHojaVida.km_ultimo_cambio_llantas ? Number(formHojaVida.km_ultimo_cambio_llantas) : null,
            ultima_reparacion: formHojaVida.ultima_reparacion ? new Date(formHojaVida.ultima_reparacion).toISOString() : null
        }]);

        if (errorAuto) {
            setProcesando(false);
            return showAlert('Error de Base de Datos', errorAuto.message);
        }

        // Sincronización transparente con Inventario Maestro de Solaris
        try {
            const catNombre = `Auto: ${formNuevoVH.marca} ${formNuevoVH.modelo}`.trim();
            const { data: catExistente } = await supabase.from('inventario_catalogo').select('id, stock_actual').eq('nombre', catNombre).single();
            let catId = null;
            let currentStock = 0;

            if (catExistente) {
                catId = catExistente.id;
                currentStock = catExistente.stock_actual || 0;
            } else {
                const { data: catNew } = await supabase.from('inventario_catalogo').insert([{
                    sku: `VH-${formNuevoVH.placas.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4)}`.toUpperCase(),
                    nombre: catNombre,
                    categoria: 'vehiculos',
                    stock_minimo: 1,
                    unidad_medida: 'PZA',
                    stock_actual: 0
                }]).select().single();
                if (catNew) catId = catNew.id;
            }

            if (catId) {
                const { error: e1 } = await supabase.from('inventario_catalogo').update({ stock_actual: currentStock + 1 }).eq('id', catId);
                const { error: e2 } = await supabase.from('inventario_movimientos').insert([{
                    tipo: 'Entrada', catalogo_id: catId, cantidad: 1,
                    usuario_id: usuarioLogueado?.id, referencia: `Ingreso Auto (Desde Control Vehicular)`
                }]);
                const { error: e3 } = await supabase.from('inventario_series').insert([{
                    catalogo_id: catId,
                    numero_serie: formNuevoVH.placas.toUpperCase().trim(),
                    estatus: 'Disponible'
                }]);
                if (e1 || e2 || e3) throw new Error((e1 || e2 || e3)?.message);
            }
        } catch (errSync: any) {
            console.error("No se pudo reflejar en inventario:", errSync);
            setProcesando(false);
            return showAlert('Sincronización Fallida', `Auto guardado pero no se vinculó a inventario: ${errSync.message}`);
        }

        await cargarVehiculos();
        setModoModal(null);
        setProcesando(false);
        showAlert('Éxito', 'Vehículo agregado al inventario.');
    }

    const renderInteligencia = () => {
        if (!vehiculoSeleccionado) return null;
        const v = vehiculoSeleccionado;
        const today = new Date().getTime();

        // Seguro
        let seguroStatus = { texto: 'Sin registro', color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' };
        if (v.fin_poliza_seguro) {
            const diasSeguro = Math.ceil((new Date(v.fin_poliza_seguro).getTime() - today) / 86400000);
            if (diasSeguro < 0) seguroStatus = { texto: `¡VENCIDA hace ${Math.abs(diasSeguro)} días!`, color: 'text-red-500', bg: 'bg-red-50 border-red-200' }
            else if (diasSeguro <= 30) seguroStatus = { texto: `Vence en ${diasSeguro} días (Pronto)`, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' }
            else seguroStatus = { texto: `Vigente por ${diasSeguro} días`, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' }
        }

        // Servicio
        let servStatus = { texto: 'Sin registro', color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200', km: 'Desconocido' };
        if (v.ultimo_mantenimiento && v.km_ultimo_mantenimiento && v.ciclo_km_mantenimiento) {
            const diasServ = Math.ceil((today - new Date(v.ultimo_mantenimiento).getTime()) / 86400000);
            const kmFaltantes = (Number(v.km_ultimo_mantenimiento) + Number(v.ciclo_km_mantenimiento)) - (Number(v.km_actual) || 0);
            if (kmFaltantes <= 0) servStatus = { texto: `Hace ${diasServ} días.`, color: 'text-red-500', bg: 'bg-red-50 border-red-200', km: `¡VENCIDO POR ${Math.abs(kmFaltantes)} KM!` }
            else if (kmFaltantes <= 500) servStatus = { texto: `Hace ${diasServ} días.`, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', km: `Faltan ${kmFaltantes} KM (Agendar)` }
            else servStatus = { texto: `Hace ${diasServ} días.`, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', km: `Restan ${kmFaltantes} KM` }
        }

        // Llantas
        let llantasStatus = { texto: 'Sin registro', km: 'Sin datos' };
        if (v.ultimo_cambio_llantas && v.km_ultimo_cambio_llantas) {
            const diasLlantas = Math.ceil((today - new Date(v.ultimo_cambio_llantas).getTime()) / 86400000);
            const kmLlantas = (Number(v.km_actual) || 0) - Number(v.km_ultimo_cambio_llantas);
            llantasStatus = { texto: `${diasLlantas} días de uso`, km: `${Math.max(kmLlantas, 0).toLocaleString()} KM recorridos` };
        }

        return (
            <div className="flex flex-col gap-4 bg-slate-900 border border-slate-700 text-white p-5 rounded-2xl shadow-xl h-full">
                <div>
                    <p className="text-rose-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-1"><Gauge size={12}/> Dashboard Inteligente</p>
                    <h4 className="text-white text-lg font-black uppercase italic tracking-tighter">Analíticas en Vivo</h4>
                </div>

                <div className={`p-4 rounded-xl border ${servStatus.bg}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${servStatus.color} mb-1 flex items-center gap-1`}><Wrench size={10}/> Próximo Servicio</p>
                    <p className={`font-black text-sm ${servStatus.color}`}>{servStatus.km}</p>
                    <p className={`text-[10px] font-bold ${servStatus.color} opacity-80 mt-1`}>Realizado {servStatus.texto}</p>
                </div>

                <div className={`p-4 rounded-xl border ${seguroStatus.bg}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${seguroStatus.color} mb-1 flex items-center gap-1`}><ShieldCheck size={10}/> Póliza de Seguro</p>
                    <p className={`font-black text-sm ${seguroStatus.color}`}>{seguroStatus.texto}</p>
                </div>

                <div className="p-4 rounded-xl border bg-slate-800 border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1 flex items-center gap-1"><Car size={10}/> Desgaste Llantas</p>
                    <p className="font-black text-sm text-white">{llantasStatus.km}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{llantasStatus.texto}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-900 relative bg-fixed bg-cover" style={{ backgroundImage: `url(${degradadoBg})` }}>
            <ChatGlobal isOpen={chatAbierto} onClose={() => setChatAbierto(false)} usuarioLogueado={usuarioLogueado} chatInicial={chatInicial} />
            <Header usuarioLogueado={usuarioLogueado} titulo="Flotilla" onAbrirChat={(c: any) => { setChatInicial(c || null); setChatAbierto(true); }} />

            <div className="flex-1 w-full max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8">

                {/* Cabecera Flotilla */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
                            <Car className="text-rose-500 w-8 h-8 md:w-10 md:h-10" />
                            Control Vehicular
                        </h1>
                        <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest text-[10px]">Gestor Inteligente de Llaves y Bitácora</p>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-3">
                            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                <button onClick={() => setVistaAdmin('Flota')} className={`px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors ${vistaAdmin === 'Flota' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>Parque</button>
                                <button onClick={() => setVistaAdmin('Reportes')} className={`px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors ${vistaAdmin === 'Reportes' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'} relative`}>
                                    Tickets / Taller
                                    {reportesAbiertos.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">{reportesAbiertos.length}</span>}
                                </button>
                            </div>
                            <button onClick={() => { setFormNuevoVH({ marca: '', modelo: '', placas: '', km_actual: '', nivel_gasolina: 'Lleno' }); setFotosExtra([]); setVehiculoSeleccionado(null); setModoModal('nuevo'); }} className="bg-slate-900 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest shadow-md transition-all flex items-center gap-2 border border-slate-900"><Plus size={14} /> Auto</button>
                        </div>
                    )}
                </div>

                {cargando ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-rose-500 animate-spin" /></div>
                ) : (
                    <>
                        {vistaAdmin === 'Flota' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                <AnimatePresence>
                                    {vehiculos.map(v => (
                                        <VehiculoCard key={v.id} v={v} onClick={() => abrirCoche(v)} onClickAdmin={() => abrirHojaVida(v)} isAdmin={isAdmin} />
                                    ))}
                                    {vehiculos.length === 0 && (
                                        <div className="col-span-full py-20 text-center flex flex-col items-center">
                                            <Car className="w-16 h-16 text-slate-300 mb-4" />
                                            <p className="text-slate-400 font-black uppercase text-sm tracking-widest">No hay vehículos registrados en la base de datos.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reportesAbiertos.map(rep => (
                                    <div key={rep.id} className="bg-white border-l-4 border-l-red-500 border-y border-r border-slate-200 rounded-r-2xl p-5 shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-red-500 mb-1 flex items-center gap-2"><AlertCircle size={14} /> Reporte en {rep.vehiculo?.marca} {rep.vehiculo?.modelo}</p>
                                            <h4 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter mb-2">{rep.titulo}</h4>
                                            <p className="text-sm font-bold text-slate-600 mb-3">{rep.descripcion}</p>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                <UserIcon size={12} /> {rep.usuario?.nombre} {rep.usuario?.apellidos} • {new Date(rep.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 shrink-0">
                                            {rep.fotos && rep.fotos.length > 0 && (
                                                <div className="flex gap-2">
                                                    {rep.fotos.map((f: string, i: number) => <img key={i} src={f} className="w-10 h-10 rounded-lg object-cover border" onClick={() => window.open(f, '_blank')} />)}
                                                </div>
                                            )}
                                            <button onClick={() => resolverReporte(rep.id)} disabled={procesando} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 w-full py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2">
                                                <CheckCircle2 size={14} /> Marcar Resuelto
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {reportesAbiertos.length === 0 && (
                                    <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-sm">No hay reportes de fallas pendientes.</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODALES MEGA CONTAINER */}
            <AnimatePresence>
                {modoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative flex flex-col border border-white max-h-[90vh] overflow-hidden">

                            {/* Header Modal */}
                            {modoModal === 'nuevo' ? (
                                <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                                            <Plus className="text-slate-500 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black uppercase tracking-tighter italic text-lg text-slate-800 leading-none">Nueva Unidad</h3>
                                            <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Agregar a Flotilla</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setModoModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X /></button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                                            <Car className="text-slate-500 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black uppercase tracking-tighter italic text-lg text-slate-800 leading-none">{vehiculoSeleccionado?.marca} {vehiculoSeleccionado?.modelo}</h3>
                                            <p className="text-[10px] uppercase font-black text-slate-400 mt-1">{vehiculoSeleccionado?.placas}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setModoModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X /></button>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto w-full p-6 text-slate-700 bg-slate-50/50">

                                {modoModal === 'nuevo' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Marca</label>
                                                <input type="text" value={formNuevoVH.marca} onChange={e => setFormNuevoVH({ ...formNuevoVH, marca: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: Nissan" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Modelo / Año</label>
                                                <input type="text" value={formNuevoVH.modelo} onChange={e => setFormNuevoVH({ ...formNuevoVH, modelo: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: NP300 2021" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Placas</label>
                                                <input type="text" value={formNuevoVH.placas} onChange={e => setFormNuevoVH({ ...formNuevoVH, placas: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: JXY-12-34" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Kilometraje Inicial (Tablero)</label>
                                                <input type="number" value={formNuevoVH.km_actual} onChange={e => setFormNuevoVH({ ...formNuevoVH, km_actual: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: 50000" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Gasolina Actual</label>
                                                <select value={formNuevoVH.nivel_gasolina} onChange={e => setFormNuevoVH({ ...formNuevoVH, nivel_gasolina: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500">
                                                    <option value="Reserva">Reserva (Rojo)</option>
                                                    <option value="1/4">1/4 Tanque</option>
                                                    <option value="1/2">Medio Tanque (1/2)</option>
                                                    <option value="3/4">3/4 Tanque</option>
                                                    <option value="Lleno">Tanque Lleno</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Foto Perfil (1 imagen frontal)</label>
                                                <button onClick={() => inputFileRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors border border-blue-200 bg-white">Subir Foto Única</button>
                                                <input type="file" ref={inputFileRef} accept="image/*" className="hidden" onChange={e => { if (e.target.files) setFotosExtra([e.target.files[0]]) }} />
                                            </div>
                                            {fotosExtra.length > 0 && (
                                                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                                                    <img src={URL.createObjectURL(fotosExtra[0])} className="w-full h-full object-cover" />
                                                    <button onClick={() => setFotosExtra([])} className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white shadow"><X size={12} /></button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-2">Opcional: Alta de Ficha Técnica</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">KM Último Mantenimiento</label>
                                                    <input type="number" value={formHojaVida.km_ultimo_mantenimiento} onChange={e => setFormHojaVida({ ...formHojaVida, km_ultimo_mantenimiento: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: 50000" />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Ciclo Mantenimiento (Ej. 10000)</label>
                                                    <input type="number" value={formHojaVida.ciclo_km_mantenimiento} onChange={e => setFormHojaVida({ ...formHojaVida, ciclo_km_mantenimiento: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-orange-500" placeholder="Ej: 10000" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Póliza de Seguro</label>
                                                    <input type="text" value={formHojaVida.poliza_seguro} onChange={e => setFormHojaVida({ ...formHojaVida, poliza_seguro: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-emerald-500" placeholder="Ej: HDI - 123" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Vencimiento Póliza Seguro</label>
                                                    <input type="date" value={formHojaVida.fin_poliza_seguro} onChange={e => setFormHojaVida({ ...formHojaVida, fin_poliza_seguro: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-emerald-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Último Cambio Llantas (Fecha)</label>
                                                    <input type="date" value={formHojaVida.ultimo_cambio_llantas} onChange={e => setFormHojaVida({ ...formHojaVida, ultimo_cambio_llantas: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">KM en Cambio Llantas</label>
                                                    <input type="number" value={formHojaVida.km_ultimo_cambio_llantas} onChange={e => setFormHojaVida({ ...formHojaVida, km_ultimo_cambio_llantas: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" placeholder="Ej: 50000" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                                            <button onClick={() => setModoModal(null)} disabled={procesando} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl">Cancelar</button>
                                            <button onClick={handleSubmitCrearVehiculo} disabled={procesando} className="px-8 py-3 bg-rose-500 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex items-center gap-2"> {procesando ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} GUARDAR VEHÍCULO</button>
                                        </div>
                                    </div>
                                )}

                                {modoModal === 'admin_hoja_vida' && vehiculoSeleccionado && (
                                    <div className="flex flex-col gap-6">
                                        <div className="w-full">
                                            {renderInteligencia()}
                                        </div>
                                        <div className="space-y-6">
                                            <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded-xl flex gap-3 text-sm font-bold shadow-lg">
                                                <FileText className="shrink-0 mt-0.5 text-rose-500" />
                                                <div>
                                                    <p className="text-white">Hoja de Vida de la Unidad</p>
                                                    <p className="text-slate-400 font-normal mt-1 text-[10px]">Captura fechas clave y el odómetro preciso para medir componentes.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200">
                                                <div className="col-span-full mb-2">
                                                    <h5 className="font-black text-xs uppercase tracking-widest text-slate-800">Servicios Mecánicos</h5>
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2"><Wrench size={14} className="text-rose-500" /> KM Último Mantenimiento</label>
                                                    <input type="number" value={formHojaVida.km_ultimo_mantenimiento} onChange={e => setFormHojaVida({ ...formHojaVida, km_ultimo_mantenimiento: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: 50000" />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2"><Gauge size={14} className="text-orange-500" /> Ciclo Mantenimiento (Ej. 10000 KM)</label>
                                                    <input type="number" value={formHojaVida.ciclo_km_mantenimiento} onChange={e => setFormHojaVida({ ...formHojaVida, ciclo_km_mantenimiento: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-orange-500" placeholder="Ej: 10000" />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2"><CalendarDays size={14} className="text-slate-500" /> Fecha Último Mantenimiento</label>
                                                    <input type="date" value={formHojaVida.ultimo_mantenimiento} onChange={e => setFormHojaVida({ ...formHojaVida, ultimo_mantenimiento: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-slate-500" />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2"><Wrench size={14} className="text-slate-500" /> Fecha Última Reparación</label>
                                                    <input type="date" value={formHojaVida.ultima_reparacion} onChange={e => setFormHojaVida({ ...formHojaVida, ultima_reparacion: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-slate-500" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200">
                                                <div className="col-span-full mb-2 border-t pt-4">
                                                    <h5 className="font-black text-xs uppercase tracking-widest text-slate-800">Legal y Neumáticos</h5>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Póliza de Seguro (Núm/Aseguradora)</label>
                                                    <input type="text" value={formHojaVida.poliza_seguro} onChange={e => setFormHojaVida({ ...formHojaVida, poliza_seguro: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-emerald-500" placeholder="Ej: HDI - 123456789" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Vencimiento Póliza Seguro</label>
                                                    <input type="date" value={formHojaVida.fin_poliza_seguro} onChange={e => setFormHojaVida({ ...formHojaVida, fin_poliza_seguro: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-emerald-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Fecha Último Cambio de Llantas</label>
                                                    <input type="date" value={formHojaVida.ultimo_cambio_llantas} onChange={e => setFormHojaVida({ ...formHojaVida, ultimo_cambio_llantas: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">KM marcado al Cambiar Llantas</label>
                                                    <input type="number" value={formHojaVida.km_ultimo_cambio_llantas} onChange={e => setFormHojaVida({ ...formHojaVida, km_ultimo_cambio_llantas: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" placeholder="Ej: 50000" />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                                <button onClick={() => setModoModal(null)} disabled={procesando} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl">Cerrar</button>
                                                <button onClick={handleSubmitHojaVida} disabled={procesando} className="px-8 py-3 bg-slate-900 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex items-center gap-2"> {procesando ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} GUARDAR FICHA</button>
                                            </div>

                                            {historialBitacora.filter(b => b.motivo_salida === 'Taller').length > 0 && (
                                                <div className="mt-8">
                                                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4 border-b border-slate-200 pb-2"><ToolCase size={16} className="inline mr-2 text-rose-500" /> Expediente Clínico de Taller</h4>
                                                    <div className="space-y-3">
                                                        {historialBitacora.filter(b => b.motivo_salida === 'Taller').map(b => (
                                                            <div key={b.id} className="bg-orange-50 border border-orange-100 p-4 rounded-xl shadow-sm">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <p className="text-orange-600 font-black uppercase text-xs tracking-widest"><Wrench size={10} className="inline mr-1"/> {b.sub_motivo_taller || 'Taller General'}</p>
                                                                    <p className="text-slate-500 text-[9px] font-bold uppercase">{new Date(b.fecha_taller || b.fecha_salida).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-700 italic">KM Registrado: {b.km_salida}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Autorizó: {b.usuario?.nombre} {b.usuario?.apellidos}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {modoModal === 'historial' && vehiculoSeleccionado && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Estatus</p>
                                                <p className={`font-black uppercase tracking-widest text-sm ${vehiculoSeleccionado.estatus === 'Disponible' ? 'text-emerald-500' : 'text-orange-500'}`}>{vehiculoSeleccionado.estatus}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Último KM</p>
                                                <p className="font-black text-slate-800 text-sm">{Number(vehiculoSeleccionado.km_actual || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Gasolina Max</p>
                                                <p className="font-black text-slate-800 text-sm">{vehiculoSeleccionado.nivel_gasolina || 'Lleno'}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
                                                {vehiculoSeleccionado.estatus === 'Disponible' ? (
                                                    <button onClick={() => { setFotosExtra([]); setModoModal('checkout'); }} className="w-full bg-emerald-500 hover:bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm"><Key size={14} /> Tomar Unidad</button>
                                                ) : vehiculoSeleccionado.usuario_actual_id === usuarioLogueado?.id ? (
                                                    <button onClick={() => { setFotosExtra([]); setModoModal('checkin'); }} className="w-full bg-orange-500 hover:bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm"><CheckCircle2 size={14} /> Devolver LLaves</button>
                                                ) : (
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 text-center">Ocupado por otro usuario</div>
                                                )}
                                                <button onClick={() => { setFotosExtra([]); setReporteTitulo(''); setModoModal('reporte') }} className="w-full bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm"><AlertCircle size={14} /> Reportar Daño</button>
                                            </div>
                                        </div>

                                        <h4 className="font-black uppercase tracking-tighter italic text-slate-400 border-b border-slate-200 pb-2">Bitácora Reciente</h4>
                                        <div className="space-y-4">
                                            {historialBitacora.map(b => (
                                                <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold"><UserIcon size={14} /></div>
                                                            <div>
                                                                <p className="font-black text-sm uppercase text-slate-700 leading-none">{b.usuario?.nombre} {b.usuario?.apellidos}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Salida: {new Date(b.fecha_salida).toLocaleString('es-MX')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {b.tiempo_uso_minutos ? (
                                                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">{b.tiempo_uso_minutos} mins uso</span>
                                                            ) : (
                                                                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-orange-100 animate-pulse">En Curso</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-bold text-slate-600">
                                                        <div><span className="flex items-center gap-1 text-slate-400 text-[9px] uppercase tracking-widest mb-1"><MapPin size={10} /> KM Salida</span>{b.km_salida} km</div>
                                                        <div><span className="flex items-center gap-1 text-slate-400 text-[9px] uppercase tracking-widest mb-1"><MapPin size={10} /> KM Llegada</span>{b.km_regreso || '---'} km</div>
                                                        <div><span className="flex items-center gap-1 text-slate-400 text-[9px] uppercase tracking-widest mb-1"><Fuel size={10} /> Gas Salida</span>{b.gasolina_salida}</div>
                                                        <div><span className="flex items-center gap-1 text-slate-400 text-[9px] uppercase tracking-widest mb-1"><Fuel size={10} /> Gas Llegada</span>{b.gasolina_regreso || '---'}</div>
                                                    </div>

                                                    <div className="mt-3 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                                        {(b.fotos_salida || []).map((f: string, i: number) => <img key={`s${i}`} onClick={() => window.open(f, '_blank')} src={f} className="w-12 h-12 rounded-lg object-cover border-2 border-orange-100 cursor-pointer" title="Auto Salida" />)}
                                                        {(b.fotos_regreso || []).map((f: string, i: number) => <img key={`r${i}`} onClick={() => window.open(f, '_blank')} src={f} className="w-12 h-12 rounded-lg object-cover border-2 border-emerald-100 cursor-pointer" title="Auto Regreso" />)}
                                                    </div>
                                                </div>
                                            ))}
                                            {historialBitacora.length === 0 && <p className="text-xs font-bold text-slate-400 italic text-center py-6">No hay registros históricos de viajes aún.</p>}
                                        </div>
                                    </div>
                                )}

                                {(modoModal === 'checkout' || modoModal === 'checkin') && (
                                    <div className="space-y-6">
                                        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex gap-3 text-sm font-bold">
                                            <AlertCircle className="shrink-0 mt-0.5" />
                                            {modoModal === 'checkout' ? 'Estás a punto de responsabilizarte por esta unidad. Registra evidencia clara de sus 4 lados (Choques, rayones) para evitar que se te cobre un daño anterior.' : 'Vas a liberar la unidad. Toma foto del nivel de gasolina/tablero y del exterior para dar cierre seguro a tu viaje.'}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Kilometraje Leído en Tablero</label>
                                                <input type="number" min={vehiculoSeleccionado.km_actual} value={formKM} onChange={e => setFormKM(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" placeholder="Ej: 154000" />
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">El auto se entregó con {vehiculoSeleccionado.km_actual} km</p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Gasolina Tablero</label>
                                                <select value={formGas} onChange={e => setFormGas(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500">
                                                    <option value="Reserva">Reserva (Rojo)</option>
                                                    <option value="1/4">1/4 Tanque</option>
                                                    <option value="1/2">Medio Tanque (1/2)</option>
                                                    <option value="3/4">3/4 Tanque</option>
                                                    <option value="Lleno">Tanque Lleno</option>
                                                </select>
                                            </div>
                                            {modoModal === 'checkout' && (
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Motivo de Salida</label>
                                                    <select value={formMotivo} onChange={e => setFormMotivo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500">
                                                        <option value="">Seleccione un motivo...</option>
                                                        <option value="Ingenieria">Ingeniería</option>
                                                        <option value="Instalacion">Instalación</option>
                                                        <option value="Ventas">Ventas / Comercial</option>
                                                        <option value="Taller">Taller Mecánico</option>
                                                        <option value="Otro">Otro</option>
                                                    </select>
                                                </div>
                                            )}
                                            {modoModal === 'checkout' && formMotivo === 'Taller' && (
                                                <>
                                                    <div className="col-span-1">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center gap-1 text-orange-600"><Wrench size={12}/> Servicio en Taller</label>
                                                        <select value={formSubMotivo} onChange={e => setFormSubMotivo(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-black text-orange-700 outline-none focus:border-orange-500">
                                                            <option value="">Selecciona tipo...</option>
                                                            <option value="Mantenimiento">Mantenimiento Preventivo</option>
                                                            <option value="Reparacion">Reparación</option>
                                                            <option value="Llantas">Cambio de Llantas</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 text-orange-600">Fecha Realizada</label>
                                                        <input type="date" value={formFechaTaller} onChange={e => setFormFechaTaller(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-black text-orange-700 outline-none focus:border-orange-500" />
                                                    </div>
                                                </>
                                            )}
                                            {modoModal === 'checkout' && (
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Fecha/Hora Estimada de Regreso</label>
                                                    <input type="datetime-local" value={formRegreso} onChange={e => setFormRegreso(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-rose-500" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Evidencia Fotográfica ({fotosExtra.length} subidas)</label>
                                                <button onClick={() => inputFileRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors border border-blue-200 bg-white">Añadir Archivo/Cámara</button>
                                                <input type="file" ref={inputFileRef} multiple accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files) setFotosExtra([...fotosExtra, ...Array.from(e.target.files)]) }} />
                                            </div>
                                            <div className="flex flex-wrap gap-3 p-4 bg-white border border-slate-200 rounded-xl min-h-[100px] shadow-inner">
                                                {fotosExtra.map((f, i) => (
                                                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                                                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                                                        <button onClick={() => setFotosExtra(fotosExtra.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white shadow opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                                    </div>
                                                ))}
                                                {fotosExtra.length === 0 && <p className="text-xs italic text-slate-400 m-auto">Sin fotos. Require {modoModal === 'checkout' ? '4 fotos (lados)' : '2 fotos (tablero/exterior)'}.</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Comentarios (Opcional)</label>
                                            <textarea value={formComentarios} onChange={e => setFormComentarios(e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-slate-700 outline-none focus:border-rose-500" placeholder="¿Huele mal? ¿Está rayado? Déjalo por escrito aquí..."></textarea>
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3">
                                            {modoModal === 'checkout' && (
                                                <button onClick={() => { setFotosExtra([]); setModoModal('reporte'); }} disabled={procesando} className="w-full md:w-auto px-6 py-3 font-black text-[10px] uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-2"><AlertCircle size={14} /> Reportar Daño Físico</button>
                                            )}
                                            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 justify-end">
                                                <button onClick={() => setModoModal('historial')} disabled={procesando} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl">Cancelar</button>
                                                {modoModal === 'checkout' ? (
                                                    <button onClick={handleSubmitCheckout} disabled={procesando} className="px-8 py-3 bg-slate-900 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex items-center gap-2"> {procesando ? <Loader2 className="animate-spin w-4 h-4" /> : <Key className="w-4 h-4" />} INICIAR VIAJE OFICIAL</button>
                                                ) : (
                                                    <button onClick={handleSubmitCheckin} disabled={procesando} className="px-8 py-3 bg-emerald-500 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex items-center gap-2"> {procesando ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} REGRESAR VEHÍCULO</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modoModal === 'reporte' && (
                                    <div className="space-y-6">
                                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex gap-3 text-sm font-bold">
                                            <AlertCircle className="shrink-0 mt-0.5" />
                                            Describe la falla técnica, daño visual o siniestro de esta unidad. Se creará un ticket para los mecánicos/administradores de la flotilla.
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Categoría / Título Breve</label>
                                            <input type="text" value={reporteTitulo} onChange={e => setReporteTitulo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-red-500" placeholder="Ej: Ruido en motor, Llanta Pinchada, Choque..." />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Desarrollo del Problema</label>
                                            <textarea value={formComentarios} onChange={e => setFormComentarios(e.target.value)} rows={4} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-slate-700 outline-none focus:border-red-500" placeholder="Explica detalles del comportamiento..."></textarea>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Evidencias ({fotosExtra.length} subidas) Opcional</label>
                                                <button onClick={() => inputFileRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 border border-slate-200 bg-white px-3 py-1 rounded-lg transition-colors">Cámara / Fotos</button>
                                                <input type="file" ref={inputFileRef} multiple accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files) setFotosExtra([...fotosExtra, ...Array.from(e.target.files)]) }} />
                                            </div>
                                            <div className="flex flex-wrap gap-3 p-4 bg-white border border-slate-200 rounded-xl min-h-[100px] shadow-inner">
                                                {fotosExtra.map((f, i) => (
                                                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                                                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                                                        <button onClick={() => setFotosExtra(fotosExtra.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white shadow opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                                            <button onClick={() => setModoModal('historial')} disabled={procesando} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl">Cancelar</button>
                                            <button onClick={handleSubmitReporte} disabled={procesando} className="px-8 py-3 bg-red-500 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex items-center gap-2"> {procesando ? <Loader2 className="animate-spin w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} LEVANTAR TICKET URGENTE</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
