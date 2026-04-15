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

interface ModalViabilidadDetalleProps {
   proyectoSeleccionado: any;
   setProyectoSeleccionado: (p: any) => void;
   showModalSecundario: 'Agendar' | 'Visor' | 'Info' | 'Confirmar' | 'Cancelar' | null;
   setShowModalSecundario: (s: any) => void;
   cancelarViabilidad?: () => void;
   avanzarA?: (target: number, uploadPdf?: boolean) => void;
   procesando: boolean;
   setAgendaForm?: (form: any) => void;
   fileReporte?: File | null;
   setFileReporte?: (file: File | null) => void;
   onChatClick?: () => void;
   onBitacoraClick?: () => void;
   isRevisionMode?: boolean; // Toggles actions for Ventas in Revisión vs Ingeniería in Viabilidad
   onAprobarRevision?: () => void;
   onRechazarRevision?: () => void;
}

export default function ModalViabilidadDetalle({
   proyectoSeleccionado, setProyectoSeleccionado,
   showModalSecundario, setShowModalSecundario,
   cancelarViabilidad, avanzarA, procesando,
   setAgendaForm, fileReporte, setFileReporte,
   onChatClick, onBitacoraClick,
   isRevisionMode, onAprobarRevision, onRechazarRevision
}: ModalViabilidadDetalleProps) {

   // Dependiendo del modo, normalizamos el objeto de proyecto
   const isVControl = !!proyectoSeleccionado.proyecto_id; // Viene de viabilidad_control
   const viabilidadRef = isVControl ? proyectoSeleccionado : (proyectoSeleccionado.viabilidad_data || proyectoSeleccionado);
   const proyectoDatos = isVControl ? proyectoSeleccionado.proyecto : proyectoSeleccionado;

   const idRefStr = proyectoDatos?.id_referencia ? `${proyectoDatos.id_referencia}` : `${(proyectoDatos?.id || viabilidadRef.id)?.split('-')[0].toUpperCase()}`;

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
                  Viabilidad: {idRefStr} - {proyectoDatos?.nombre_proyecto || 'Sin Titulo'}
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
                           {cancelarViabilidad && !isRevisionMode && proyectoDatos?.sub_estatus !== 'Pendiente Aprobacion Ventas' && (
                              <button onClick={cancelarViabilidad} className="text-red-500 border border-red-200 bg-red-50 rounded-full p-[4px] hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Rechazar y regresar a Evaluación">
                                 <X size={14} strokeWidth={3} />
                              </button>
                           )}
                           {proyectoDatos?.fachada_url && (
                              <button onClick={() => setShowModalSecundario('Visor')} className="text-slate-600 border border-slate-200 bg-slate-50 rounded-lg p-[5px] hover:bg-slate-800 hover:text-white transition-all shadow-sm" title="Ampliar Fachada">
                                 <Camera size={14} strokeWidth={2.5} />
                              </button>
                           )}
                           <span className={`text-[8px] font-black px-2 py-1.5 rounded-md uppercase border shadow-sm flex items-center gap-1 w-fit ml-1 ${viabilidadRef?.status === 1 ? 'bg-orange-500 text-white border-orange-600' : 'bg-green-100 text-green-700 border-green-200'}`}>
                              {viabilidadRef?.status === 1 ? (proyectoDatos?.sub_estatus || 'Pendiente Ingeniería') : (STEPS.find(s => s.id === viabilidadRef?.status)?.label || 'Activo')}
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

                     {/* Fecha Viabilidad (Agendada) */}
                     <div className="bg-slate-50 rounded-xl p-3 mb-6 border border-slate-100 flex justify-between items-center shadow-inner">
                        <span className="text-[10px] font-black uppercase text-slate-400">Viabilidad</span>
                        <span className="text-[12px] font-black text-slate-800">
                           {viabilidadRef?.fecha_agendada ? `${new Date(viabilidadRef.fecha_agendada).toLocaleDateString()} ${viabilidadRef.hora_agendada_inicio || ''}` : 'Sin agendar'}
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
                              <p className="text-xs font-bold text-orange-600/80">Esperando que Ventas o Gerencia aprueben el presupuesto para confirmar la viabilidad solicitada.</p>
                           </div>
                        </div>
                     ) : viabilidadRef?.status === 1 ? (
                        // MODO PENDIENTE (INGENIERIA)
                        <div className="mt-auto pt-4 border-t border-slate-100 text-center flex flex-col gap-3">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revisión de Ingeniería Solicitada</p>
                           <div className="flex gap-2">
                              <button onClick={() => avanzarA && avanzarA(2)} disabled={procesando} className="flex-1 bg-green-500 hover:bg-green-600 text-white shadow-md rounded-[12px] py-3 text-[10px] uppercase font-black tracking-widest transition-all">
                                 Aceptar
                              </button>
                              {cancelarViabilidad && (
                                 <button onClick={cancelarViabilidad} disabled={procesando} className="flex-1 bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 shadow-sm rounded-[12px] py-3 text-[10px] uppercase font-black tracking-widest transition-all">
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
                                       ingeniero_id: viabilidadRef?.ingeniero_id || '',
                                       fecha_inicio: viabilidadRef?.fecha_agendada ? String(viabilidadRef.fecha_agendada).substring(0, 10) : '',
                                       hora_inicio: viabilidadRef?.hora_agendada_inicio || '09:00',
                                       fecha_fin: viabilidadRef?.fecha_agendada_fin ? String(viabilidadRef.fecha_agendada_fin).substring(0, 10) : (viabilidadRef?.fecha_agendada ? String(viabilidadRef.fecha_agendada).substring(0, 10) : ''),
                                       hora_fin: viabilidadRef?.hora_agendada_fin || '18:00'
                                    })
                                    setShowModalSecundario('Agendar')
                                 }
                              }}>
                                 <Clock size={14} strokeWidth={3} />
                              </div>
                           </div>

                           {/* Viabilidad (Upload File) */}
                           <div className="flex items-center gap-2">
                              <span className="flex-1">Viabilidad:</span>
                              <label className="cursor-pointer flex items-center">
                                 <div className={`w-[28px] h-[28px] rounded-[6px] ${fileReporte ? 'bg-green-50 text-green-500 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'} flex items-center justify-center border shadow-sm hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors`}>
                                    <FileText size={14} strokeWidth={2.5} />
                                 </div>
                                 <input type="file" accept=".pdf" className="hidden" onChange={e => {
                                    if (e.target.files && e.target.files.length > 0 && setFileReporte) setFileReporte(e.target.files[0])
                                 }} />
                              </label>
                              {fileReporte && setFileReporte && (
                                 <button onClick={() => setFileReporte(null)} className="text-red-500 hover:bg-red-50 p-1 rounded-full"><X size={14} strokeWidth={3} /></button>
                              )}
                           </div>

                           {/* Confirmar */}
                           <div className="flex items-center gap-2">
                              <span className="flex-1">Confirmar:</span>
                              {viabilidadRef?.status >= 4 ? (
                                 <div className="w-[28px] h-[28px] rounded-[6px] bg-green-500 text-white flex items-center justify-center shadow-inner cursor-not-allowed">
                                    <Check size={16} strokeWidth={4} />
                                 </div>
                              ) : (
                                 <button onClick={() => setShowModalSecundario('Confirmar')} disabled={procesando || viabilidadRef?.status < 3} className="w-[28px] h-[28px] rounded-[6px] bg-white border-2 border-slate-200 hover:border-green-500 text-transparent hover:text-green-500 hover:bg-green-50 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Check size={14} strokeWidth={4} />
                                 </button>
                              )}
                           </div>

                           {/* Ingeniería Pase 7 */}
                           <div className="flex items-center gap-2">
                              <span className="flex-1 text-[#ffb000]">Ingeniería:</span>
                              <button onClick={() => avanzarA && avanzarA(7, true)} disabled={procesando || (viabilidadRef?.status < 5 && !fileReporte)} className="w-[28px] h-[28px] rounded-[8px] bg-slate-100 hover:bg-[#ffb000] text-slate-400 hover:text-white transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-transparent">
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
