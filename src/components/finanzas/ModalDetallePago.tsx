import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UploadCloud, Save, FileText, CheckCircle2, AlertCircle, Trash2, ShieldCheck, Check, Plus, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { supabase, enviarNotificacionRoles, enviarNotificacionVendedor } from '../../supabaseClient'

export default function ModalDetallePago({ pago, onClose, onSuccess, usuarioLogueado, showAlert, showConfirm }: any) {
  const [procesando, setProcesando] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  let URLsGuardadas: string[] = []
  if (pago.comprobante_pago_url) {
      if (pago.comprobante_pago_url.startsWith('[')) {
          try { URLsGuardadas = JSON.parse(pago.comprobante_pago_url) } catch {}
      } else {
          URLsGuardadas = [pago.comprobante_pago_url]
      }
  }

  const [comprobantesNuevos, setComprobantesNuevos] = useState<File[]>([])
  const inputComprobanteRef = useRef<HTMLInputElement>(null)
  
  const [docPreview, setDocPreview] = useState<{ urls: string[], currentIndex: number, nombre: string } | null>(null)
  const [zoom, setZoom] = useState(1)
  const inputFileRef = useRef<HTMLInputElement>(null)
  
  const evidenciasActuales: any[] = pago.evidencias || []

  const isAdmin = usuarioLogueado?.administrador_pagos === true
  const isRevisor = usuarioLogueado?.permisos_especificos?.aprobacion_pagos === true || !usuarioLogueado?.permisos_especificos
  
  const handleAprobar = async () => {
      if (!(await showConfirm('¿Estás seguro de Aprobar este pago?'))) return;
      
      setProcesando(true)
      const { error } = await supabase.from('finanzas_pagos').update({
          estatus: 'Solicitado',
          motivo_rechazo: motivoRechazo
      }).eq('id', pago.id)

      if (error) {
          showAlert('Error', error.message)
      } else {
          await enviarNotificacionVendedor(pago.usuario_id, `👍 Tu pago a ${pago.proveedor_nombre} fue APROBADO.${motivoRechazo ? ' Comentarios: '+motivoRechazo : ''}|||/pagos`, usuarioLogueado.id)
          await enviarNotificacionRoles('notif_finanzas', `Nuevo Pago Aprobado por Revisión: ${pago.proveedor_nombre} por $${pago.monto_iva}.|||/pagos`, usuarioLogueado.id)
          onSuccess()
      }
      setProcesando(false)
  }

  const handleRechazar = async () => {
      if (!motivoRechazo.trim()) return showAlert('Aviso', 'Debes ingresar un motivo de rechazo.')
      if (!(await showConfirm('¿Estás seguro de cancelar este pago?'))) return;
      
      setProcesando(true)
      const { error } = await supabase.from('finanzas_pagos').update({
          estatus: 'Cancelado',
          motivo_rechazo: motivoRechazo
      }).eq('id', pago.id)

      if (error) {
          showAlert('Error', error.message)
      } else {
          await enviarNotificacionVendedor(pago.usuario_id, `❌ Tu pago/reembolso a ${pago.proveedor_nombre} fue Cancelado por Finanzas. Motivo: ${motivoRechazo}|||/pagos`, usuarioLogueado.id)
          onSuccess()
      }
      setProcesando(false)
  }

  const handleMarcarPagado = async () => {
      if (comprobantesNuevos.length === 0 && URLsGuardadas.length === 0) return showAlert('Aviso', 'Debes adjuntar al menos un comprobante.')
      if (!(await showConfirm('¿Estás seguro de marcar este pago como Procesado/Pagado?'))) return;
      
      setProcesando(true)
      let uploaded: string[] = [...URLsGuardadas]

      for (const file of comprobantesNuevos) {
          const fileExt = file.name.split('.').pop()
          const fileName = `comp_${pago.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const { error } = await supabase.storage.from('expedientes').upload(`finanzas/${fileName}`, file)
          if (!error) {
              uploaded.push(supabase.storage.from('expedientes').getPublicUrl(`finanzas/${fileName}`).data.publicUrl)
          }
      }

      const stringificado = uploaded.length > 1 ? JSON.stringify(uploaded) : (uploaded[0] || null)

      const { error } = await supabase.from('finanzas_pagos').update({
          estatus: 'Procesado',
          comprobante_pago_url: stringificado
      }).eq('id', pago.id)

      if (error) {
          showAlert('Error', error.message)
      } else {
          await enviarNotificacionVendedor(pago.usuario_id, `✅ Tu pago a ${pago.proveedor_nombre} ha sido Procesado Exitosamente. Puedes ver el comprobante.|||/pagos`, usuarioLogueado.id)
          onSuccess()
      }
      setProcesando(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col border border-white max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-500 overflow-hidden shadow-sm">
                  {pago.usuario?.avatar_url ? <img src={pago.usuario?.avatar_url} className="w-full h-full object-cover"/> : pago.usuario?.nombre?.charAt(0)}
              </div>
              <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-tighter italic">Solicitud de {pago.usuario?.nombre}</h3>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mt-0.5">{pago.id.toUpperCase().split('-')[0]}</p>
              </div>
          </div>
          <button onClick={onClose} disabled={procesando} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Monto IVA Incluido</p>
                    <p className="text-xl font-black text-slate-800">${Number(pago.monto_iva || 0).toLocaleString('es-MX', {minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Estatus</p>
                    <p className={`text-sm font-black uppercase tracking-widest ${pago.estatus==='Procesado'?'text-emerald-500':(pago.estatus==='Cancelado'?'text-red-500':'text-orange-500')}`}>{pago.estatus}</p>
                </div>
            </div>

            {pago.motivo_rechazo && pago.estatus !== 'Pendiente' && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${pago.estatus === 'Cancelado' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">{pago.estatus === 'Cancelado' ? 'Motivo de Rechazo' : 'Comentarios del Revisor'}</p>
                        <p className="text-sm font-bold">{pago.motivo_rechazo}</p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo de Solicitud</label>
                        <p className="font-bold text-slate-700 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{pago.tipo_solicitud}</p>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Categoría</label>
                        <p className="font-bold text-slate-700 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate">{pago.subcategoria || pago.categoria}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Beneficiario / Proveedor</label>
                    <p className="font-bold text-slate-700 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{pago.proveedor_nombre}</p>
                </div>

                {pago.datos_bancarios && typeof pago.datos_bancarios === 'object' && Object.keys(pago.datos_bancarios).length > 0 && pago.tipo_solicitud !== 'Comprobación' && (
                    <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                        <div><span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">Banco</span> {pago.datos_bancarios.banco || '-'}</div>
                        <div><span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">Cuenta</span> {pago.datos_bancarios.cuenta || '-'}</div>
                        <div><span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">CLABE</span> {pago.datos_bancarios.clabe || '-'}</div>
                        <div><span className="block text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">Tarjeta</span> {pago.datos_bancarios.tarjeta || '-'}</div>
                    </div>
                )}

                <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Justificación / Concepto</label>
                    <p className="font-bold text-slate-700 text-xs bg-slate-50 px-3 py-3 rounded-xl border border-slate-100 italic">{pago.comentarios}</p>
                </div>
            </div>

            <hr className="border-slate-100" />

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><FileText size={16}/> Evidencias Adjuntas</h4>
                </div>
                
                {evidenciasActuales.length === 0 ? (
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                        No hay evidencias adjuntas a esta solicitud.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {evidenciasActuales.map((ev, idx) => (
                            <div key={idx} onClick={() => setDocPreview({ urls: evidenciasActuales.map(e=>e.url), currentIndex: idx, nombre: ev.nombre })} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-400 group transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                         <FileText size={14} />
                                     </div>
                                     <div className="truncate">
                                         <p className="text-[10px] font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">{ev.nombre}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(ev.fecha).toLocaleDateString()}</p>
                                     </div>
                                </div>
                                <button className="text-slate-400 hover:text-blue-500"><Eye size={16}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECCIÓN ADMIN Y COMPROBANTES */}
            <hr className="border-slate-100" />
            
            {pago.estatus === 'Procesado' && URLsGuardadas.length > 0 && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex justify-between items-center shadow-inner">
                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2"><CheckCircle2 size={16}/> Comprobante Final Adjunto</p>
                    <button onClick={() => setDocPreview({ urls: URLsGuardadas, currentIndex: 0, nombre: 'Comprobantes de Pago' })} className="font-black text-[9px] uppercase tracking-widest text-emerald-700 bg-white shadow-sm border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">Ver {URLsGuardadas.length > 1 ? 'Múltiples Archivos' : 'Archivo'}</button>
                </div>
            )}

            {isAdmin && pago.estatus === 'Solicitado' && (
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2"><ShieldCheck size={16}/> Acciones de Administración Financiera</h4>
                    
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Comprobante de Pago Final (Múltiples Permitidos)</label>
                        <div onClick={() => inputComprobanteRef.current?.click()} className="w-full bg-white border-2 border-dashed border-blue-200 rounded-xl px-4 py-4 text-xs font-black uppercase tracking-widest text-blue-500 outline-none cursor-pointer hover:border-blue-400 hover:bg-blue-100 flex items-center justify-between transition-colors">
                           {comprobantesNuevos.length > 0 ? `${comprobantesNuevos.length} Archivos Listos para Subir` : 'Click para Seleccionar Comprobantes'} 
                           <UploadCloud size={16} />
                        </div>
                        <input type="file" ref={inputComprobanteRef} multiple className="hidden" accept="image/*,.pdf" onChange={(e) => {
                             if(e.target.files) setComprobantesNuevos(Array.from(e.target.files));
                        }} />
                    </div>

                    <div className="flex gap-4 items-center">
                        <button onClick={handleMarcarPagado} disabled={procesando} className="bg-emerald-500 hover:bg-slate-900 border border-transparent text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center gap-2 shadow-md disabled:opacity-50 flex-1 justify-center">
                            {procesando ? 'Procesando...' : <><Check size={16}/> Marcar como Pagado</>}
                        </button>
                    </div>

                    <div className="pt-4 border-t border-blue-200/50 mt-4">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Rechazar Operación (Admin)</p>
                        <textarea value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-red-500 mb-2" placeholder="Explica por qué cancelas este pago desde Finanzas..."></textarea>
                        <button onClick={handleRechazar} disabled={procesando} className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-colors flex items-center gap-2">
                           <Trash2 size={12}/> Rechazar Definitivamente
                        </button>
                    </div>
                </div>
            )}

            {isRevisor && pago.estatus === 'Pendiente' && (
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center gap-2"><ShieldCheck size={16}/> Aprobación de Ejecutivos</h4>
                    
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Comentarios / Resolución (Obligatorio para rechazos)</p>
                        <textarea value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-orange-500 mb-2" placeholder="Escribe un mensaje para el usuario solicitante..."></textarea>
                    </div>

                    <div className="flex gap-4 items-center">
                        <button onClick={handleAprobar} disabled={procesando} className="bg-orange-500 hover:bg-slate-900 border border-transparent text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center gap-2 shadow-md disabled:opacity-50 flex-1 justify-center">
                            {procesando ? 'Procesando...' : <><CheckCircle2 size={16}/> Mover a Solicitado</>}
                        </button>
                        <button onClick={handleRechazar} disabled={procesando} className="bg-red-100 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center gap-2 flex-1 justify-center">
                           <Trash2 size={16}/> Rechazar Pago
                        </button>
                    </div>
                </div>
            )}

        </div>
      </motion.div>

      <AnimatePresence>
          {docPreview && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 backdrop-blur-xl">
              <div className="flex justify-between items-center p-4 md:p-6 bg-transparent shrink-0">
                <div className="text-white drop-shadow-md">
                   <p className="font-bold text-xs md:text-sm uppercase tracking-widest opacity-80 mb-1">Visor de Archivos</p>
                   <p className="font-black text-sm md:text-lg">{docPreview.nombre}</p>
                   <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                      Documento {docPreview.currentIndex + 1} de {docPreview.urls.length}
                   </p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 md:p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"><Search size={18} /></button>
                   <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 md:p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"><Search size={18} /></button>
                   <button onClick={() => { setDocPreview(null); setZoom(1); }} className="p-2 md:p-3 bg-red-500/20 hover:bg-red-500 text-red-100 hover:text-white rounded-xl transition-colors shrink-0 ml-2"><X size={20} /></button>
                </div>
              </div>
              
              <div className="flex-1 w-full relative overflow-auto custom-scrollbar p-2 md:p-8 flex items-center justify-center">
                {docPreview.urls.length > 1 && (
                  <>
                    <button onClick={() => { setDocPreview(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null); setZoom(1); }} disabled={docPreview.currentIndex === 0} className="fixed left-2 sm:left-4 md:absolute md:left-6 top-1/2 -translate-y-1/2 z-[300] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
                    <button onClick={() => { setDocPreview(prev => prev ? { ...prev, currentIndex: Math.min(prev.urls.length - 1, prev.currentIndex + 1) } : null); setZoom(1); }} disabled={docPreview.currentIndex === docPreview.urls.length - 1} className="fixed right-2 sm:right-4 md:absolute md:right-6 top-1/2 -translate-y-1/2 z-[300] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronRight className="w-5 h-5 md:w-6 md:h-6" /></button>
                  </>
                )}
                <div className="transition-transform duration-300 origin-center flex items-center justify-center w-full h-full" style={{ transform: `scale(${zoom})` }}>
                  {docPreview.urls[docPreview.currentIndex].toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                    <img src={docPreview.urls[docPreview.currentIndex]} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Visor" />
                  ) : (<iframe src={docPreview.urls[docPreview.currentIndex]} className="w-full h-full border-none bg-white rounded-xl shadow-2xl min-h-[60vh] md:min-h-[80vh]" title={docPreview.nombre} />)}
                </div>
              </div>
            </div>
          )}
      </AnimatePresence>

    </div>
  )
}
