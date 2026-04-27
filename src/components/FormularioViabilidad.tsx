import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Clock, MapPin, Camera, AlertCircle, CheckCircle2, CloudOff, FileText, LayoutList, Zap } from 'lucide-react';
import { ModalCapturaFoto, type RegistroFoto } from './ModalCapturaFoto';
import { useDialog } from '../context/DialogContext';

interface FormularioViabilidadProps {
   proyectoSeleccionado: any;
   onClose: () => void;
   onSaveOffline: (payload: any, isTerminar: boolean) => void;
   initialData?: any;
   usuarioLogueado?: any;
}

const CATEGORIAS_EVIDENCIA = [
   { id: 'foto_medidor', label: 'FOTO MEDIDOR', required: true },
   { id: 'foto_transformador', label: 'FOTO DE TRANSFORMADOR', required: false },
   { id: 'foto_itm', label: 'FOTO DEL ITM PRINCIPAL O TABLERO', required: false },
   { id: 'foto_cable', label: 'FOTO CALIBRE DE CABLE Y MATERIAL', required: false },
   { id: 'ruta_bajada', label: 'RUTA DE BAJADA CON MEDIDAS', required: false },
   { id: 'foto_inversor', label: 'FOTO DE PROPUESTA DE UBICACION DE INVERSOR', required: false },
   { id: 'ruta_interconexion', label: 'RUTA DE INVERSOR AL PUNTO DE INTERCONEXION CON MEDIDAS', required: false },
   { id: 'diagrama', label: 'DIAGRAMA ELÉCTRICO', required: true },
   { id: 'croquis', label: 'CROQUIS DE SITIO', required: true },
   { id: 'mapa_puntos', label: 'MAPA CON PUNTOS', required: true },
   { id: 'area_instalacion', label: 'ÁREA DE INSTALACIÓN', required: true },
];

export default function FormularioViabilidad({ proyectoSeleccionado, onClose, onSaveOffline, initialData, usuarioLogueado }: FormularioViabilidadProps) {
   const { showAlert, showConfirm } = useDialog();
   const [isOnline, setIsOnline] = useState(navigator.onLine);
   const [activeTab, setActiveTab] = useState<'Viabilidad' | 'Fotos'>('Viabilidad');

   // Tiempos y Tareas
   const [fechaInicio, setFechaInicio] = useState(initialData?.fechaInicio || '');
   const [horaInicio, setHoraInicio] = useState(initialData?.horaInicio || '');
   const [ubicacionInicio, setUbicacionInicio] = useState(initialData?.ubicacionInicio || '');

   const [fechaFin, setFechaFin] = useState(initialData?.fechaFin || '');
   const [horaFin, setHoraFin] = useState(initialData?.horaFin || '');
   const [ubicacionFin, setUbicacionFin] = useState(initialData?.ubicacionFin || '');

   const [comentariosGenerales, setComentariosGenerales] = useState(initialData?.comentariosGenerales || '');
   const [evidencias, setEvidencias] = useState<Record<string, RegistroFoto>>(initialData?.evidencias || {});

   const [activeCategoria, setActiveCategoria] = useState<string | null>(null);

   // Campos de Viabilidad (Nuevos)
   const [formData, setFormData] = useState({
      realizo: initialData?.realizo || (usuarioLogueado ? `${usuarioLogueado.nombre} ${usuarioLogueado.apellidos}` : ''),
      reviso: initialData?.reviso || '',
      proyecto: initialData?.proyecto || proyectoSeleccionado?.proyecto?.nombre_proyecto || '',
      estado: initialData?.estado || proyectoSeleccionado?.proyecto?.estado_dir || '',
      localidad: initialData?.localidad || proyectoSeleccionado?.proyecto?.ciudad || '',
      contacto: initialData?.contacto || proyectoSeleccionado?.proyecto?.nombre_cliente || '',
      telefono: initialData?.telefono || proyectoSeleccionado?.proyecto?.numero_cliente || '',
      coordenadas: initialData?.coordenadas || '',
      nombre_vendedor: initialData?.nombre_vendedor || (proyectoSeleccionado?.proyecto?.vendedor ? `${proyectoSeleccionado.proyecto.vendedor.nombre} ${proyectoSeleccionado.proyecto.vendedor.apellidos}` : ''),
      telefono_vendedor: initialData?.telefono_vendedor || (proyectoSeleccionado?.proyecto?.vendedor?.telefono_movil || ''),
      cantidad_paneles: initialData?.cantidad_paneles || '',
      capacidad_paneles_w: initialData?.capacidad_paneles_w || '',
      cantidad_inversores: initialData?.cantidad_inversores || '',
      capacidad_inversores_kw: initialData?.capacidad_inversores_kw || '',
      tarifa_electrica: initialData?.tarifa_electrica || '',
      largo_m: initialData?.largo_m || '',
      ancho_m: initialData?.ancho_m || '',
      altura_inmueble_m: initialData?.altura_inmueble_m || '',
      estructura_elevada: initialData?.estructura_elevada || '',
      tipo_material: initialData?.tipo_material || '',
      acceso_azotea: initialData?.acceso_azotea || '',
      requiere: initialData?.requiere || '',
      cuenta_con_sombras: initialData?.cuenta_con_sombras || '',
      se_puede_perforar: initialData?.se_puede_perforar || '',
      modificar_area: initialData?.modificar_area || '',
      caben_todos_los_paneles: initialData?.caben_todos_los_paneles || '',
      se_puede_ranurar: initialData?.se_puede_ranurar || '',
      ruta_tuberia_bajada: initialData?.ruta_tuberia_bajada || '',
      distancia_instalacion_m: initialData?.distancia_instalacion_m || '',
      voltaje: initialData?.voltaje || '',
      fases: initialData?.fases || '',
      internet: initialData?.internet || '',
      nombre_red: initialData?.nombre_red || '',
      contrasena_red: initialData?.contrasena_red || '',
      cable_calibre: initialData?.cable_calibre || '',
      material_cable: initialData?.material_cable || '',
      itm: initialData?.itm || '',
      capacidad_centro_carga: initialData?.capacidad_centro_carga || '',
      transformador: initialData?.transformador || '',
      tipo_transformador: initialData?.tipo_transformador || '',
      punto_interconexion_viable_masas: initialData?.punto_interconexion_viable_masas || '',
      punto_interconexion_viable_cc: initialData?.punto_interconexion_viable_cc || '',
      punto_interconexion_viable_itm: initialData?.punto_interconexion_viable_itm || '',
      ubicacion_inversor: initialData?.ubicacion_inversor || '',
      cantidad_tubos: initialData?.cantidad_tubos || '',
      espacio_bloques_distribucion: initialData?.espacio_bloques_distribucion || '',
      cuenta_con_tierra_fisica: initialData?.cuenta_con_tierra_fisica || ''
   });

   useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
      };
   }, []);

   // Registrar inicio automáticamente al abrir (si no existe)
   useEffect(() => {
      if (!initialData?.fechaInicio) {
         const now = new Date();
         setFechaInicio(now.toISOString().split('T')[0]);
         setHoraInicio(now.toTimeString().substring(0, 5));
         if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
               const coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
               setUbicacionInicio(coords);
               if (!formData.coordenadas) {
                  setFormData(prev => ({ ...prev, coordenadas: coords }));
               }
            }, () => {
               setUbicacionInicio('No se pudo obtener la ubicación');
            });
         }
      }
   }, [initialData, formData.coordenadas]);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
   };

   const handleSaveEvidencia = (registro: RegistroFoto) => {
      setEvidencias(prev => ({
         ...prev,
         [registro.categoria]: registro
      }));
   };

   const getPayload = () => ({
      proyecto_id: proyectoSeleccionado?.id, // ID de la tabla viabilidad_control
      id_real_proyecto: proyectoSeleccionado?.proyecto_id, // ID de la tabla proyectos padre
      vendedor_id: proyectoSeleccionado?.proyecto?.vendedor_id,
      nombre_proyecto: proyectoSeleccionado?.proyecto?.nombre_proyecto,
      hoja_digital_json: {
         fechaInicio, horaInicio, ubicacionInicio,
         fechaFin, horaFin, ubicacionFin,
         comentariosGenerales,
         evidencias,
         ...formData
      }
   });

   const handleGuardar = () => {
      onSaveOffline(getPayload(), false);
   };

   const handleTerminar = async () => {
      const faltantes = CATEGORIAS_EVIDENCIA.filter(c => c.required && (!evidencias[c.label] || evidencias[c.label].adjuntos.length === 0));
      if (faltantes.length > 0) {
         await showAlert('Faltan Evidencias', 'Faltan fotos obligatorias por cargar: \n- ' + faltantes.map(f => f.label).join('\n- '));
         return;
      }
      
      const isConfirmed = await showConfirm(
         "Terminar y Enviar",
         "¿Estás seguro de terminar y enviar? Esta información se usará para generar el reporte de ingeniería y será visible para el cliente."
      );
      if (!isConfirmed) return;

      // Registrar fin automáticamente y luego guardar
      const now = new Date();
      const newFechaFin = now.toISOString().split('T')[0];
      const newHoraFin = now.toTimeString().substring(0, 5);
      
      setFechaFin(newFechaFin);
      setHoraFin(newHoraFin);

      let finalUbicacionFin = ubicacionFin;
      
      if (navigator.geolocation && !ubicacionFin) {
         try {
            finalUbicacionFin = await new Promise<string>((resolve) => {
               navigator.geolocation.getCurrentPosition(
                  (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
                  () => resolve('No se pudo obtener la ubicación')
               );
            });
            setUbicacionFin(finalUbicacionFin);
         } catch (e) {
            finalUbicacionFin = 'Error al obtener ubicación';
         }
      }

      const finalPayload = {
         proyecto_id: proyectoSeleccionado?.id,
         hoja_digital_json: {
            ...getPayload().hoja_digital_json,
            fechaFin: newFechaFin,
            horaFin: newHoraFin,
            ubicacionFin: finalUbicacionFin
         }
      };

      onSaveOffline(finalPayload, true);
   };

   const renderInput = (label: string, name: keyof typeof formData, type: string = 'text') => (
      <div className="flex flex-col gap-1.5">
         <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">{label}</label>
         <input 
            type={type} 
            name={name} 
            value={formData[name]} 
            onChange={handleChange} 
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:border-[#ffb000] focus:bg-white transition-all shadow-inner"
         />
      </div>
   );

   return (
      <>
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#f0f2f5] border-[3px] border-white w-full max-w-[900px] h-[95vh] md:h-[90vh] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col">
               
               {/* HEADER */}
               <div className="bg-white px-5 py-4 flex justify-between items-center border-b-[4px] border-[#ffb000] shrink-0">
                  <div>
                     <h3 className="font-black tracking-widest uppercase text-slate-800 text-[12px] md:text-sm">Hoja de Viabilidad Técnica</h3>
                     <p className="text-[10px] font-bold text-slate-500 mt-1">{proyectoSeleccionado?.proyecto?.nombre_proyecto || 'Proyecto'}</p>
                  </div>
                  <button onClick={onClose} className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 rounded-full transition-colors"><X size={24} strokeWidth={2.5} /></button>
               </div>

               {/* TABS & OFFLINE BANNER */}
               <div className="bg-white px-5 pt-3 flex flex-col gap-3 shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.02)] z-10">
                  {!isOnline && (
                     <div className="bg-red-50 text-red-600 border border-red-200 p-2.5 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl">
                        <CloudOff size={16} /> Modo Offline - Los datos se guardarán localmente
                     </div>
                  )}
                  <div className="flex border-b border-slate-200">
                     <button 
                        onClick={() => setActiveTab('Viabilidad')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'Viabilidad' ? 'text-[#ffb000] border-b-[3px] border-[#ffb000]' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent hover:border-slate-300'}`}
                     >
                        Viabilidad
                     </button>
                     <button 
                        onClick={() => setActiveTab('Fotos')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'Fotos' ? 'text-[#ffb000] border-b-[3px] border-[#ffb000]' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent hover:border-slate-300'}`}
                     >
                        Fotos y Evidencia
                     </button>
                  </div>
               </div>
               
               {/* BODY */}
               <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50">
                  
                  {activeTab === 'Viabilidad' && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        {/* INFORMACION GENERAL */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                           <h4 className="text-xs uppercase tracking-widest font-black text-[#ffb000] mb-5 flex items-center gap-2 pb-3 border-b border-slate-100">
                              <LayoutList size={16}/> Información General
                           </h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {renderInput('Realizo', 'realizo')}
                              {renderInput('Reviso', 'reviso')}
                              {renderInput('Proyecto', 'proyecto')}
                              {renderInput('Estado', 'estado')}
                              {renderInput('Localidad', 'localidad')}
                              {renderInput('Contacto', 'contacto')}
                              {renderInput('Teléfono', 'telefono', 'tel')}
                              {renderInput('Coordenadas', 'coordenadas')}
                              {renderInput('Nombre Vendedor', 'nombre_vendedor')}
                              {renderInput('Teléfono Vendedor', 'telefono_vendedor', 'tel')}
                              {renderInput('Cantidad Paneles', 'cantidad_paneles', 'number')}
                              {renderInput('Capacidad Paneles W', 'capacidad_paneles_w', 'number')}
                              {renderInput('Cantidad Inversores', 'cantidad_inversores', 'number')}
                              {renderInput('Capacidad Inversores KW', 'capacidad_inversores_kw', 'number')}
                              {renderInput('Tarifa Electrica', 'tarifa_electrica')}
                           </div>
                        </div>

                        {/* INFORMACION DEL SITIO */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                           <h4 className="text-xs uppercase tracking-widest font-black text-[#ffb000] mb-5 flex items-center gap-2 pb-3 border-b border-slate-100">
                              <MapPin size={16}/> Información del Sitio
                           </h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                              {renderInput('Largo (m)', 'largo_m', 'number')}
                              {renderInput('Ancho (m)', 'ancho_m', 'number')}
                              {renderInput('Altura Inmueble (m)', 'altura_inmueble_m', 'number')}
                              {renderInput('Estructura Elevada', 'estructura_elevada')}
                              {renderInput('Tipo Material', 'tipo_material')}
                              {renderInput('Acceso Azotea', 'acceso_azotea')}
                              {renderInput('Requiere', 'requiere')}
                              {renderInput('Cuenta Con Sombras', 'cuenta_con_sombras')}
                              {renderInput('Se Puede Perforar', 'se_puede_perforar')}
                              {renderInput('Modificar Area', 'modificar_area')}
                              {renderInput('Caben Todos Los Paneles', 'caben_todos_los_paneles')}
                              {renderInput('Se Puede Ranurar', 'se_puede_ranurar')}
                              {renderInput('Ruta Tuberia Bajada', 'ruta_tuberia_bajada')}
                              {renderInput('Distancia Instalacion (m)', 'distancia_instalacion_m', 'number')}
                           </div>
                        </div>

                        {/* INSTALACION ELECTRICA */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                           <h4 className="text-xs uppercase tracking-widest font-black text-[#ffb000] mb-5 flex items-center gap-2 pb-3 border-b border-slate-100">
                              <Zap size={16}/> Instalación Eléctrica
                           </h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                              {renderInput('Voltaje', 'voltaje')}
                              {renderInput('Fases', 'fases')}
                              {renderInput('Internet', 'internet')}
                              {renderInput('Nombre Red', 'nombre_red')}
                              {renderInput('Contraseña Red', 'contrasena_red')}
                              {renderInput('Cable Calibre', 'cable_calibre')}
                              {renderInput('Material Cable', 'material_cable')}
                              {renderInput('ITM', 'itm')}
                              {renderInput('Capacidad Centro Carga', 'capacidad_centro_carga')}
                              {renderInput('Transformador', 'transformador')}
                              {renderInput('Tipo Transformador', 'tipo_transformador')}
                              {renderInput('Punto Interconexión Viable Masas', 'punto_interconexion_viable_masas')}
                              {renderInput('Punto Interconexión Viable CC', 'punto_interconexion_viable_cc')}
                              {renderInput('Punto Interconexión Viable ITM', 'punto_interconexion_viable_itm')}
                              {renderInput('Ubicación Inversor', 'ubicacion_inversor')}
                              {renderInput('Cantidad Tubos', 'cantidad_tubos', 'number')}
                              {renderInput('Espacio Bloques Distribución', 'espacio_bloques_distribucion')}
                              {renderInput('Cuenta Con Tierra Física', 'cuenta_con_tierra_fisica')}
                           </div>
                        </div>
                     </motion.div>
                  )}

                  {activeTab === 'Fotos' && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                        {/* Evidencia Fotográfica (Compacta) */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                              {CATEGORIAS_EVIDENCIA.map((cat) => {
                                 const numAdjuntos = evidencias[cat.label]?.adjuntos?.length || 0;
                                 const hasData = numAdjuntos > 0;
                                 
                                 // Determinar color base según requerimiento y estado
                                 let bgColor = 'bg-slate-100 text-slate-600 border border-slate-200'; // Opcional vacío
                                 let hoverColor = 'hover:bg-slate-200';
                                 
                                 if (hasData) {
                                    bgColor = 'bg-[#ffb000] text-slate-900 border border-orange-400'; // Naranja corporativo
                                    hoverColor = 'hover:bg-orange-500 hover:text-white';
                                 } else if (cat.required) {
                                    bgColor = 'bg-red-50 text-red-600 border border-red-200'; // Rojo suave requeridos
                                    hoverColor = 'hover:bg-red-100';
                                 }

                                 return (
                                    <div key={cat.id} className="flex flex-col text-center gap-1.5 h-full">
                                       <span className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase flex items-end justify-center h-8 leading-tight">{cat.label}</span>
                                       <button 
                                          onClick={() => setActiveCategoria(cat.label)}
                                          className={`w-full flex-1 min-h-[44px] ${bgColor} ${hoverColor} rounded-xl font-bold text-[11px] transition-colors flex flex-col items-center justify-center relative`}
                                       >
                                          <span>{hasData ? 'Ver / Editar' : 'Cargar'}</span>
                                          {hasData && (
                                             <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/40 px-1.5 py-0.5 rounded-md text-[10px] text-slate-900 font-black">
                                                {numAdjuntos}
                                             </span>
                                          )}
                                       </button>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                     </motion.div>
                  )}

               </div>
               
               {/* Footer / Actions */}
               <div className="bg-white p-4 md:p-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-3 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  <button onClick={onClose} className="px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors w-full sm:w-auto text-center">
                     Cerrar
                  </button>
                  <div className="flex gap-3 w-full sm:w-auto">
                     <button onClick={handleGuardar} className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shadow-sm flex justify-center items-center gap-2">
                        <Save size={16} />
                        Guardar Progreso
                     </button>
                     <button onClick={handleTerminar} className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest bg-[#ffb000] text-slate-900 hover:bg-orange-500 hover:text-white transition-colors shadow-md flex justify-center items-center gap-2">
                        <CheckCircle2 size={16} />
                        Terminar y Enviar
                     </button>
                  </div>
               </div>
            </motion.div>
         </div>

         {/* Modal Secundario de Captura */}
         <AnimatePresence>
            {activeCategoria && (
               <ModalCapturaFoto
                  categoria={activeCategoria}
                  initialData={evidencias[activeCategoria]}
                  onSave={handleSaveEvidencia}
                  onClose={() => setActiveCategoria(null)}
               />
            )}
         </AnimatePresence>
      </>
   );
}

