import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, UploadCloud, Save, Search, FileText } from 'lucide-react'
import { supabase, enviarNotificacionRoles } from '../../supabaseClient'

export default function ModalNuevaSolicitud({ onClose, onSuccess, categorias, usuarioLogueado, showAlert }: any) {
  const [tipo, setTipo] = useState('Proveedor') // 'Comprobación', 'Proveedor', 'Reembolso'
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [monto, setMonto] = useState('')
  const [comentarios, setComentarios] = useState('')
  
  // Datos bancarios
  const [clabe, setClabe] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [tarjeta, setTarjeta] = useState('')
  const [banco, setBanco] = useState('')

  const [proyectos, setProyectos] = useState<any[]>([])
  const [proyectosRelacionados, setProyectosRelacionados] = useState<string[]>([])
  const [busquedaP, setBusquedaP] = useState('')
  
  // Evidencias / Archivos
  const [archivos, setArchivos] = useState<File[]>([])
  const inputFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
     const fn = async () => {
         const { data } = await supabase.from('proyectos').select('id, nombre_proyecto, estatus').order('created_at', { ascending: false })
         if (data) setProyectos(data)
     }
     fn()
  }, [])

  const [procesando, setProcesando] = useState(false)

  const categoriasUnicas = Array.from(new Set(categorias.map((c: any) => c.nombre_categoria)));
  const subcategorias = categorias.filter((c: any) => c.nombre_categoria === categoria).map((c: any) => c.nombre_subcategoria);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!monto || Number(monto) <= 0) return showAlert('Error', 'El monto debe ser mayor a 0.')
      if (!categoria || !subcategoria) return showAlert('Error', 'Debes seleccionar una categoría y subcategoría.')
      if ((tipo === 'Proveedor' || tipo === 'Reembolso') && !proveedor) return showAlert('Error', 'Debes ingresar el nombre del proveedor o beneficiario.')
      
      setProcesando(true)

      const uploadedEvidencias = []
      if (archivos.length > 0) {
          for (const file of archivos) {
              const fileExt = file.name.split('.').pop()
              const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
              const filePath = `finanzas/${fileName}`
              
              const { error: uploadError } = await supabase.storage.from('expedientes').upload(filePath, file)
              if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage.from('expedientes').getPublicUrl(filePath)
                  uploadedEvidencias.push({
                      nombre: file.name,
                      url: publicUrl,
                      tipo: file.type,
                      fecha: new Date().toISOString()
                  })
              }
          }
      }

      let estatus = 'Pendiente'
      const montoNum = Number(monto)

      if (tipo === 'Comprobación') {
          estatus = 'Solicitado'
      } else {
          if (montoNum < 5000) estatus = 'Solicitado'
          else estatus = 'Pendiente'
      }

      const { data, error } = await supabase.from('finanzas_pagos').insert([{
          usuario_id: usuarioLogueado.id,
          tipo_solicitud: tipo,
          categoria, subcategoria,
          proveedor_nombre: proveedor,
          monto_iva: montoNum,
          comentarios,
          proyectos_relacionados: proyectosRelacionados,
          datos_bancarios: { clabe, cuenta, tarjeta, banco },
          evidencias: uploadedEvidencias,
          estatus
      }]).select()

      if (error) {
          showAlert('Error', error.message)
      } else {
          // Lanzar Notificaciones
          if (tipo === 'Comprobación') {
              await enviarNotificacionRoles('notif_finanzas', `Nueva comprobación de gastos registrada por $${montoNum} (${usuarioLogueado.nombre})`, usuarioLogueado.id)
          } else {
              if (montoNum < 5000) {
                 await enviarNotificacionRoles('notif_finanzas', `Pago AUTO-APROBADO por $${montoNum} (${tipo}). Listo para pagarse.|||/pagos`, usuarioLogueado.id)
              } else {
                 await enviarNotificacionRoles('notif_finanzas_revision', `Pago Pendiente de Revisión por $${montoNum} (${tipo}).|||/revision`, usuarioLogueado.id)
              }
          }
          onSuccess()
      }
      setProcesando(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Nueva Solicitud</h3>
              <p className="text-[10px] uppercase text-slate-500 font-bold mt-1">Registra un nuevo movimiento financiero</p>
          </div>
          <button onClick={onClose} disabled={procesando} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
            
            <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Tipo de Solicitud</label>
                <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                    <option value="Proveedor">Pago a Proveedor</option>
                    <option value="Reembolso">Reembolso</option>
                    <option value="Comprobación">Comprobación de Gastos</option>
                </select>
                {tipo === 'Comprobación' && <p className="text-[10px] font-bold text-emerald-600 mt-2">Esta solicitud se procesará automáticamente y no requiere aprobación.</p>}
                {tipo !== 'Comprobación' && <p className="text-[10px] font-bold text-orange-600 mt-2">Montos menores a $5,000 MXN se aprueban auto. Mayores requieren revisión.</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Monto c/IVA (MXN)</label>
                    <input type="number" step="0.01" required value={monto} onChange={e=>setMonto(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Beneficiario / Proveedor</label>
                    <input type="text" required={tipo !== 'Comprobación'} value={proveedor} onChange={e=>setProveedor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="Nombre completo o Empresa" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-2">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Categoría Contable</label>
                    <select required value={categoria} onChange={e=>{setCategoria(e.target.value); setSubcategoria('')}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                        <option value="">-- Seleccionar --</option>
                        {categoriasUnicas.map((c: any) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Subcategoría</label>
                    <select required value={subcategoria} onChange={e=>setSubcategoria(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" disabled={!categoria}>
                        <option value="">-- Seleccionar --</option>
                        {subcategorias.map((s: any) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {tipo !== 'Comprobación' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Datos Bancarios (Opcional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="CLABE Interbancaria (18 d)" value={clabe} onChange={e=>setClabe(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                        <input type="text" placeholder="Número de Cuenta" value={cuenta} onChange={e=>setCuenta(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                        <input type="text" placeholder="Tarjeta" value={tarjeta} onChange={e=>setTarjeta(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                        <input type="text" placeholder="Banco" value={banco} onChange={e=>setBanco(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                    </div>
                </div>
            )}

            <div className="border-t border-slate-100 pt-6 mt-2 relative">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Proyectos Relacionados (Opcional)</label>
                
                <div className="relative">
                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus-within:border-blue-500 transition-colors">
                        <Search size={16} className="text-slate-400 mr-2 mt-0.5" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre de proyecto o estatus..." 
                            value={busquedaP} 
                            onChange={e => setBusquedaP(e.target.value)} 
                            className="w-full bg-transparent outline-none" 
                        />
                    </div>
                    
                    {busquedaP.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl max-h-48 overflow-y-auto rounded-xl custom-scrollbar">
                            {proyectos.filter(p => !proyectosRelacionados.includes(p.id) && (p.nombre_proyecto.toLowerCase().includes(busquedaP.toLowerCase()) || p.estatus.toLowerCase().includes(busquedaP.toLowerCase()))).map(p => (
                                <button 
                                    key={p.id}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setProyectosRelacionados([...proyectosRelacionados, p.id]);
                                        setBusquedaP('');
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-xs font-bold text-slate-700 flex justify-between items-center transition-colors"
                                >
                                    <span>{p.nombre_proyecto}</span>
                                    <span className="text-[9px] uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-widest">{p.estatus}</span>
                                </button>
                            ))}
                            {proyectos.filter(p => !proyectosRelacionados.includes(p.id) && (p.nombre_proyecto.toLowerCase().includes(busquedaP.toLowerCase()) || p.estatus.toLowerCase().includes(busquedaP.toLowerCase()))).length === 0 && (
                                <p className="px-4 py-3 text-xs text-slate-400 italic text-center">No se encontraron proyectos</p>
                            )}
                        </div>
                    )}
                </div>
                {proyectosRelacionados.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {proyectosRelacionados.map(pr => {
                            const found = proyectos.find(x => x.id === pr)
                            return (
                                <div key={pr} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                                    {found?.nombre_proyecto || 'Proyecto'} 
                                    <button onClick={(e) => { e.preventDefault(); setProyectosRelacionados(proyectosRelacionados.filter(x => x !== pr))}} className="hover:text-red-500"><X size={12} /></button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Conclusiones / Concepto Detallado</label>
                <textarea rows={3} required value={comentarios} onChange={e=>setComentarios(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="Escribe la justificación..."></textarea>
            </div>

            <div className="border-t border-slate-100 pt-6 mt-2 relative">
                 <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Carga de Evidencias (Facturas, Cotizaciones, Fotos)</label>
                 <div 
                    onClick={() => inputFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
                 >
                     <UploadCloud size={32} className="text-slate-400 mb-2" />
                     <p className="text-sm font-bold text-slate-700">Haz clic para subir archivos o evidencias</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">PDF, JPG, PNG, Excel</p>
                     <input 
                        type="file" 
                        ref={inputFileRef} 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                            if (e.target.files) {
                                setArchivos(prev => [...prev, ...Array.from(e.target.files!)]);
                            }
                        }} 
                     />
                 </div>
                 {archivos.length > 0 && (
                     <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto custom-scrollbar p-1">
                         {archivos.map((file, i) => (
                             <div key={i} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
                                 <div className="flex items-center gap-2 overflow-hidden">
                                     <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                         <FileText size={14} />
                                     </div>
                                     <div className="truncate">
                                         <p className="text-[10px] font-bold text-slate-700 truncate">{file.name}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                     </div>
                                 </div>
                                 <button type="button" onClick={(e) => { e.stopPropagation(); setArchivos(archivos.filter((_, idx) => idx !== i))}} className="text-slate-400 hover:text-red-500 p-1 mr-1"><X size={14} /></button>
                             </div>
                         ))}
                     </div>
                 )}
            </div>

            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={procesando} className="bg-orange-500 hover:bg-slate-900 border border-transparent text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center gap-2 shadow-md disabled:opacity-50">
                    {procesando ? 'Guardando...' : <><Save size={16}/> Enviar Solicitud</>}
                </button>
            </div>

        </form>

      </motion.div>
    </div>
  )
}
