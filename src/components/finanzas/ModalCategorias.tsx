import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Trash2, Plus } from 'lucide-react'
import { supabase } from '../../supabaseClient'

export default function ModalCategorias({ onClose, categoriasRaw, onSuccess, showAlert, showConfirm }: any) {
  const [procesando, setProcesando] = useState(false)
  const [nuevaCat, setNuevaCat] = useState('')
  const [nuevaSubcat, setNuevaSubcat] = useState('')

  const handleAgregar = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!nuevaCat || !nuevaSubcat) return showAlert('Aviso', 'Llene ambos campos.')
      setProcesando(true)
      const { error } = await supabase.from('finanzas_categorias').insert([{
          nombre_categoria: nuevaCat,
          nombre_subcategoria: nuevaSubcat
      }])
      if (error) showAlert('Error', error.message)
      else {
          setNuevaCat('')
          setNuevaSubcat('')
          onSuccess()
      }
      setProcesando(false)
  }

  const handleEliminar = async (id: number) => {
      if (!(await showConfirm('¿Estás seguro de eliminar esta categoría del catálogo?'))) return;
      setProcesando(true)
      const { error } = await supabase.from('finanzas_categorias').delete().eq('id', id)
      if (error) showAlert('Error', error.message)
      else onSuccess()
      setProcesando(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col border border-white max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Catálogo Contable</h3>
              <p className="text-[10px] uppercase text-slate-500 font-bold mt-1">Gestión de categorías y subcategorías</p>
          </div>
          <button onClick={onClose} disabled={procesando} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
            
            <form onSubmit={handleAgregar} className="bg-blue-50 p-4 rounded-2xl border border-blue-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Categoría</label>
                    <input type="text" required placeholder="Ej. Sueldos" value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Subcategoría</label>
                    <input type="text" required placeholder="Ej. Comisiones" value={nuevaSubcat} onChange={e=>setNuevaSubcat(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                </div>
                <div>
                   <button type="submit" disabled={procesando} className="w-full bg-blue-600 hover:bg-slate-900 border border-transparent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex justify-center items-center gap-1 shadow-md disabled:opacity-50 h-[34px]">
                       <Plus size={14}/> Agregar
                   </button>
                </div>
            </form>

            <div>
                <table className="w-full text-left bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-slate-400">Categoría</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-slate-400">Subcategoría</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-slate-400 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoriasRaw.map((c: any) => (
                            <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50">
                                <td className="px-4 py-3 text-xs font-bold text-slate-700">{c.nombre_categoria}</td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-600">{c.nombre_subcategoria}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleEliminar(c.id)} disabled={procesando} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                        <Trash2 size={12}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
      </motion.div>
    </div>
  )
}
