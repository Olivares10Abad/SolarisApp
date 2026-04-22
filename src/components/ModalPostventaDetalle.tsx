import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Info, MapPin, Clock, FileText, Check, ChevronRight, MessageSquare, History, Calendar, MapPin as MapIcon } from 'lucide-react'

const STEPS = [
   { id: 1, label: 'Pendiente', filtro: 'Pendiente' },
   { id: 2, label: 'Solicitada', filtro: 'Solicitada' },
   { id: 3, label: 'Agendada', filtro: 'Agendada' },
   { id: 4, label: 'Verificada', filtro: 'Verificada' },
   { id: 5, label: 'Ingeniería', filtro: 'Ingeniería' },
   { id: 7, label: 'Terminada', filtro: 'Terminada' }
]

interface ModalPostventaDetalleProps {
   proyectoSeleccionado: any;
   setProyectoSeleccionado: (p: any) => void;
   showModalSecundario: 'Agendar' | 'Visor' | 'Info' | 'Confirmar' | 'Cancelar' | null;
   setShowModalSecundario: (s: any) => void;
   cancelarPostventa?: () => void;
   avanzarA?: (target: number, uploadPdf?: boolean) => void;
   procesando: boolean;
   setAgendaForm?: (form: any) => void;
   fileReporte?: File | null;
   setFileReporte?: (file: File | null) => void;
   filesReporte?: File[];
   setFilesReporte?: (files: File[]) => void;
   onChatClick?: () => void;
   onBitacoraClick?: () => void;
   isRevisionMode?: boolean; // Toggles actions for Ventas in Revisión vs Ingeniería in Postventa
   onAprobarRevision?: () => void;
   onRechazarRevision?: () => void;
}

export default function ModalPostventaDetalle({
   proyectoSeleccionado, setProyectoSeleccionado,
   showModalSecundario, setShowModalSecundario,
   cancelarPostventa, avanzarA, procesando,
   setAgendaForm, fileReporte, setFileReporte, filesReporte, setFilesReporte,
   onChatClick, onBitacoraClick,
   isRevisionMode, onAprobarRevision, onRechazarRevision
}: ModalPostventaDetalleProps) {

   // Dependiendo del modo, normalizamos el objeto de proyecto
   const isVControl = !!proyectoSeleccionado.proyecto_id; // Viene de postventa_control
   const postventaRef = isVControl ? proyectoSeleccionado : (proyectoSeleccionado.postventa_data || proyectoSeleccionado);
   const proyectoDatos = isVControl ? proyectoSeleccionado.proyecto : proyectoSeleccionado;

   const idRefStr = proyectoDatos?.id_referencia ? `${proyectoDatos.id_referencia}` : `${(proyectoDatos?.id || postventaRef.id)?.split('-')[0].toUpperCase()}`;

   const renderMapsFallback = () => {
      const link = proyectoDatos?.link_maps || '';
      if (!link) {
         return <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2"><MapIcon size={32} className="opacity-40" /> Sin Ubicación</div>;
      }
      if (link.includes('<iframe') || link.includes('pb=')) {
         return <div className="w-full h-full opacity-80" dangerouslySetInnerHTML={{ __html: link.includes('<iframe') ? link : `<iframe src="${link}" class="w-full h-full border-0" allowFullScreen="" loading="lazy"></iframe>` }} />;
      }
      // If it's a raw google maps link that blocks iframe, show a button
      return (
         <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
            <MapIcon size={32} className="text-slate-300" />
            <p className="text-[10px] font-bold text-slate-500 uppercase">La ubicación no se puede previsualizar integrada.</p>
            <a href={link} target="_blank" rel="noreferrer" className="bg-[#ffb000] text-slate-900 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:scale-105 transition-transform flex items-center gap-2">Abrir en Google Maps</a>
         </div>
      );
   }

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 xl:p-8 bg-slate-900/60 backdrop-blur-md overflow-hidden" onClick={(e) => {
         if (e.target === e.currentTarget) setProyectoSeleccionado(null)
      }}>
         <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#f0f2f5] w-full max-w-[420px] rounded-[32px] overflow-hidden shadow-2xl relative border-[3px] border-white max-h-[96vh] flex flex-col"
         >
            {/* HEADER MOCKUP */}
            <div className="bg-white px-5 py-4 flex justify-between items-center border-b-[4px] border-[#ffb000] shrink-0 z-20 shadow-sm">
               <h3 className="font-black text-slate-900 text-sm truncate pr-4">
                  Postventa: {idRefStr} - {proyectoDatos?.nombre_proyecto || 'Sin Titulo'}
               </h3>
               <button onClick={() => setProyectoSeleccionado(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={26} strokeWidth={2.5} /></button>
            </div>

            {/* CUERPO MOCKUP */}
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col pb-6">
               <div className="bg-white rounded-[26px] shadow-sm overflow-hidden p-0 border border-slate-100 flex flex-col h-full relative">

                  {/* Contenedor de Imagen con el Padding Solicitado para Redondear adentro */}
                  <div className="p-3 bg-white w-full">
                     <div className="relative h-[200px] bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-100 group">
                        {proyectoDatos?.fachada_url ? (
                           <img src={proyectoDatos.fachada_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        ) : renderMapsFallback()}
                     </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 flex flex-col flex-1">
                     {/* Fila del ID y Botones Superiores */}
                     <div className="flex justify-between items-center mb-4">
                        <span className="font-black text-slate-800 text-[14px]">
                           ID - {idRefStr}
                        </span>
                        <div className="flex items-center gap-1.5">
                           {cancelarPostventa && !isRevisionMode && proyectoDatos?.sub_estatus !== 'Pendiente Aprobacion Ventas' && (
                              <button onClick={cancelarPostventa} className="text-red-500 border border-red-200 bg-red-50 rounded-full p-[4px] hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Rechazar y regresar a Evaluación">
                                 <X size={14} strokeWidth={3} />
                              </button>
                           )}
                           {proyectoDatos?.fachada_url && (
                              <button onClick={() => setShowModalSecundario('Visor')} className="text-slate-600 border border-slate-200 bg-slate-50 rounded-lg p-[5px] hover:bg-slate-800 hover:text-white transition-all shadow-sm" title="Ampliar Fachada">
                                 <Camera size={14} strokeWidth={2.5} />
                              </button>
                           )}
                           <span className={`text-[8px] font-black px-2 py-1.5 rounded-md uppercase border shadow-sm flex items-center gap-1 w-fit ml-1 ${postventaRef?.status === 1 ? 'bg-orange-500 text-white border-orange-600' : 'bg-green-100 text-green-700 border-green-200'}`}>
                              {postventaRef?.status === 1 ? (proyectoDatos?.sub_estatus || 'Pendiente Ingeniería') : (STEPS.find(s => s.id === postventaRef?.status)?.label || 'Activo')}
                           </span>
                        </div>
                     </div>

                     {/* Info del cliente/vendedor */}
                     <div className="text-[12px] font-bold text-slate-600 leading-snug space-y-1 mb-5">
                        <p className="text-[14px] font-black text-slate-900 truncate" title={proyectoDatos?.nombre_proyecto}>{proyectoDatos?.nombre_proyecto}</p>
                        {proyectoDatos?.vendedor && (
                           <p>Vendedor: <span className="text-slate-800">{proyectoDatos.vendedor.nombre} {proyectoDatos.vendedor.apellidos}</span></p>
                        )}
                        <p>Número: <span className="text-slate-800">{proyectoDatos?.numero_cliente}</span></p>
                     </div>

                     {/* Fecha Postventa (Agendada) */}
                     <div className="bg-slate-50 rounded-xl p-3 mb-6 border border-slate-100 flex justify-between items-center shadow-inner">
                        <span className="text-[10px] font-black uppercase text-slate-400">Postventa</span>
                        <span className="text-[12px] font-black text-slate-800">
                           {postventaRef?.fecha_agendada ? `${new Date(postventaRef.fecha_agendada).toLocaleDateString()} ${postventaRef.hora_agendada_inicio || ''}` : 'Sin agendar'}
                        </span>
                     </div>

                     {/* MODO REVISION (VENTAS) */}
                     {isRevisionMode ? (
                        <div className="mt-auto pt-4 border-t border-slate-100 text-center flex flex-col gap-3">
                           <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-tight">Aprobación Pendiente por Ventas</p>
                           <div className="flex gap-2">
                              <button onClick={onAprobarRevision} disabled={procesando} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md rounded-[12px] py-3 text-[10px] uppercase font-black tracking-widest transition-all">
                                 Aprobar Solicitada
                              </button>
                              <button onClick={onRechazarRevision} disabled={procesando} className="flex-1 bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 shadow-sm rounded-[12px] py-3 text-[10px] uppercase font-black tracking-widest transition-all">
                                 Rechazar
                              </button>
                           </div>
                        </div>
                     ) : proyectoDatos?.sub_estatus === 'Pendiente Aprobacion Ventas' ? (
                        <div className="mt-auto pt-4 border-t border-slate-100 text-center flex flex-col gap-3">
                           <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                              <p className="text-[10px] uppercase tracking-widest font-black text-orange-500 mb-1">En Revisión de Ventas</p>
                              <p className="text-xs font-bold text-orange-600/80">Esperando que Ventas o Gerencia aprueben el presupuesto para confirmar la postventa solicitada.</p>
                           </div>
                        </div>
                     ) : postventaRef?.status === 1 ? (
                        // MODO PENDIENTE (INGENIERIA)
                        <div className="mt-auto pt-4 border-t border-slate-100 text-center flex flex-col gap-3">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revisión de Ingeniería Solicitada</p>
                           <div className="flex gap-2">
                              <button onClick={() => avanzarA && avanzarA(2)} disabled={procesando} className="flex-1 bg-green-500 hover:bg-green-600 text-white shadow-md rounded-[12px] py-3 text-[10px] uppercase font-black tracking-widest transition-all">
                                 Aceptar
                              </button>
                              {cancelarPostventa && (
                                 <button onClick={cancelarPostventa} disabled={procesando} className="flex-1 bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 shadow-sm rounded-[12px] py-3 text-[10px] uppercase font-black tracking-widest transition-all">
                                    Rechazar
                                 </button>
                              )}
                           </div>
                        </div>
                     ) : (
                        // GRID DE ICONOS AVANZADOS (SOLO SE MUESTRA SI YA SE ACEPTÓ LA MT Y FUE APROBADA)
                        <div className="grid grid-cols-2 gap-y-5 gap-x-2 text-[11px] font-black text-slate-600 items-center mt-auto border-t border-slate-100 pt-5">

                           {/* Información */}
                           <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowModalSecundario('Info')}>
                              <span className="flex-1">Información:</span>
                              <div className="w-[28px] h-[28px] rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-200 shadow-sm hover:bg-green-500 hover:text-white transition-colors" title="Ver Info Capturada">
                                 <Info size={14} strokeWidth={2.5} />
                              </div>
                           </div>

                           {/* Ubicación */}
                           <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                              if (proyectoDatos?.link_maps) window.open(proyectoDatos.link_maps, '_blank');
                           }}>
                              <span className="flex-1">Ubicación:</span>
                              <div className="w-[28px] h-[28px] rounded-[8px] bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm hover:bg-[#ffb000] hover:border-[#ffb000] hover:text-white transition-colors">
                                 <MapPin size={14} strokeWidth={2.5} />
                              </div>
                           </div>

                           {/* Agendar */}
                           <div className="flex items-center gap-2">
                              <span className="flex-1">Agendar:</span>
                              <div className="w-[28px] h-[28px] rounded-full bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm cursor-pointer hover:bg-[#ffb000] hover:border-[#ffb000] hover:text-white transition-all" onClick={() => {
                                 if (setAgendaForm) {
                                    setAgendaForm({
                                       ingeniero_id: postventaRef?.ingeniero_id || '',
                                       fecha_inicio: postventaRef?.fecha_agendada ? String(postventaRef.fecha_agendada).substring(0, 10) : '',
                                       hora_inicio: postventaRef?.hora_agendada_inicio || '09:00',
                                       fecha_fin: postventaRef?.fecha_agendada_fin ? String(postventaRef.fecha_agendada_fin).substring(0, 10) : (postventaRef?.fecha_agendada ? String(postventaRef.fecha_agendada).substring(0, 10) : ''),
                                       hora_fin: postventaRef?.hora_agendada_fin || '18:00'
                                    })
                                    setShowModalSecundario('Agendar')
                                 }
                              }}>
                                 <Clock size={14} strokeWidth={3} />
                              </div>
                           </div>

                           {/* Postventa (Upload File) */}
                           <div className="flex items-center gap-2">
                              <span className="flex-1">Postventa:</span>
                              <label className="cursor-pointer flex items-center relative">
                                 <div className={`w-[28px] h-[28px] rounded-[6px] ${(filesReporte && filesReporte.length > 0) ? 'bg-green-50 text-green-500 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'} flex items-center justify-center border shadow-sm hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors`}>
                                    <FileText size={14} strokeWidth={2.5} />
                                 </div>
                                 {(filesReporte && filesReporte.length > 0) && (
                                     <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-green-500 text-white font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 border border-white">
                                        {filesReporte.length}
                                     </span>
                                 )}
                                 <input type="file" accept=".pdf,image/*" multiple className="hidden" onChange={e => {
                                    if (e.target.files && setFilesReporte) {
                                       setFilesReporte([...(filesReporte || []), ...Array.from(e.target.files)]);
                                    }
                                 }} />
                              </label>
                              {(filesReporte && filesReporte.length > 0) && setFilesReporte && (
                                 <button onClick={() => setFilesReporte([])} className="text-red-500 hover:bg-red-50 p-1 rounded-full"><X size={14} strokeWidth={3} /></button>
                              )}

                              {postventaRef?.reportes_ingenieria?.length > 0 ? (
                                 <div className="flex gap-1 ml-1 overflow-x-auto custom-scrollbar max-w-[80px]">
                                     {postventaRef.reportes_ingenieria.map((url: string, idx: number) => (
                                        <button key={idx} onClick={() => window.open(url, '_blank')} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded-md shrink-0 border border-blue-100" title={`Ver Adjunto ${idx+1}`}><FileText size={12} strokeWidth={3}/></button>
                                     ))}
                                 </div>
                              ) : postventaRef?.reporte_ingenieria && (
                                 <button onClick={() => window.open(postventaRef.reporte_ingenieria, '_blank')} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-md ml-2 border border-blue-100" title="Ver Reporte Técnico"><FileText size={12} strokeWidth={3}/></button>
                              )}
                           </div>

                           {/* Confirmar */}
                           <div className="flex items-center gap-2">
                              <span className="flex-1">Confirmar:</span>
                              {postventaRef?.status >= 4 ? (
                                 <div className="w-[28px] h-[28px] rounded-[6px] bg-green-500 text-white flex items-center justify-center shadow-inner cursor-not-allowed">
                                    <Check size={16} strokeWidth={4} />
                                 </div>
                              ) : (
                                 <button onClick={() => setShowModalSecundario('Confirmar')} disabled={procesando || postventaRef?.status < 3} className="w-[28px] h-[28px] rounded-[6px] bg-white border-2 border-slate-200 hover:border-green-500 text-transparent hover:text-green-500 hover:bg-green-50 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Check size={14} strokeWidth={4} />
                                 </button>
                              )}
                           </div>

                           <div className="flex items-center gap-2">
                              <span className="flex-1 text-[#ffb000]">Ingeniería:</span>
                              <button onClick={() => avanzarA && avanzarA(7, true)} disabled={procesando || (postventaRef?.status < 5 && (!filesReporte || filesReporte.length === 0))} className="w-[28px] h-[28px] rounded-[8px] bg-slate-100 hover:bg-[#ffb000] text-slate-400 hover:text-white transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-transparent">
                                 <ChevronRight size={18} strokeWidth={3} />
                              </button>
                           </div>

                        </div>
                     )}
                  </div>
               </div>

               {/* Botones de acción inferior */}
               <div className="flex gap-4 mt-6">
                  <button onClick={onChatClick} className="flex-1 bg-white text-slate-800 py-3.5 px-2 rounded-[16px] font-black uppercase text-[10px] tracking-widest shadow-md flex items-center justify-center gap-2 border-[1.5px] border-slate-100 hover:border-[#ffb000] hover:text-[#ffb000] transition-colors">
                     <MessageSquare size={16} /> Chat Proyecto
                  </button>
                  <button onClick={onBitacoraClick} className="flex-1 bg-white text-slate-800 py-3.5 px-2 rounded-[16px] font-black uppercase text-[10px] tracking-widest shadow-md flex items-center justify-center gap-2 border-[1.5px] border-slate-100 hover:border-[#ffb000] hover:text-[#ffb000] transition-colors">
                     <History size={16} /> Ver Bitácora
                  </button>
               </div>

            </div>
         </motion.div>
      </div>
   )
}
