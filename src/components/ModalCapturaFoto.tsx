import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Paperclip, Image as ImageIcon, Trash2, Edit2 } from 'lucide-react';
import { ImageEditor } from './ImageEditor';

export interface FotoAdjunto {
   id: string;
   base64: string;
   name: string;
}

export interface RegistroFoto {
   categoria: string;
   ubicacion: string;
   comentarios: string;
   adjuntos: FotoAdjunto[];
}

interface ModalCapturaFotoProps {
   categoria: string;
   initialData?: RegistroFoto;
   onSave: (registro: RegistroFoto) => void;
   onClose: () => void;
}

export const ModalCapturaFoto: React.FC<ModalCapturaFotoProps> = ({ categoria, initialData, onSave, onClose }) => {
   const [ubicacion, setUbicacion] = useState(initialData?.ubicacion || 'Ubicación 1');
   const [comentarios, setComentarios] = useState(initialData?.comentarios || '');
   const [adjuntos, setAdjuntos] = useState<FotoAdjunto[]>(initialData?.adjuntos || []);
   const [editingImage, setEditingImage] = useState<FotoAdjunto | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach(file => {
         const reader = new FileReader();
         reader.onload = (event) => {
            const base64 = event.target?.result as string;
            // Basic compression via canvas can be done here, but for simplicity we assume it's small or we compress in editor
            setAdjuntos(prev => [...prev, {
               id: Math.random().toString(36).substr(2, 9),
               name: file.name,
               base64
            }]);
         };
         reader.readAsDataURL(file);
      });
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const handleRemove = (id: string) => {
      setAdjuntos(prev => prev.filter(a => a.id !== id));
   };

   const handleSave = () => {
      onSave({ categoria, ubicacion, comentarios, adjuntos });
      onClose();
   };

   const handleSaveEdit = (newBase64: string) => {
      if (editingImage) {
         setAdjuntos(prev => prev.map(a => a.id === editingImage.id ? { ...a, base64: newBase64 } : a));
         setEditingImage(null);
      }
   };

   return (
      <>
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 0.95 }} 
               onClick={e => e.stopPropagation()}
               className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
            >
               <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">{categoria}</h3>
                  <button onClick={onClose} className="p-1 hover:text-red-500"><X size={24} /></button>
               </div>
               
               <div className="p-6 flex flex-col gap-6">
                  
                  <div className="flex items-center justify-between gap-4">
                     <label className="text-xs font-bold text-slate-600">Ubicación Constructiva:</label>
                     <select 
                        value={ubicacion} 
                        onChange={e => setUbicacion(e.target.value)} 
                        className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#ffb000]"
                     >
                        <option value="Ubicación 1">Ubicación 1</option>
                        <option value="Ubicación 2">Ubicación 2</option>
                        <option value="Ubicación 3">Ubicación 3</option>
                     </select>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-600 mb-2 block">Comentarios</label>
                     <textarea 
                        value={comentarios} 
                        onChange={e => setComentarios(e.target.value)} 
                        rows={4} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-[#ffb000] resize-none"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-600 mb-2 block">Datos adjuntos</label>
                     <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        {adjuntos.map(adj => (
                           <div key={adj.id} className="flex items-center justify-between p-3 border-b border-slate-200 bg-white">
                              <div className="flex items-center gap-2 truncate">
                                 <ImageIcon size={16} className="text-[#ffb000] shrink-0" />
                                 <span className="text-xs font-bold truncate">{adj.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button onClick={() => setEditingImage(adj)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={16} /></button>
                                 <button onClick={() => handleRemove(adj.id)} className="p-1 text-slate-400 hover:text-red-500"><X size={16} /></button>
                              </div>
                           </div>
                        ))}
                        
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 p-3 text-xs font-bold text-slate-600 hover:bg-slate-100 w-full transition-colors">
                           <Paperclip size={16} /> Adjuntar un archivo
                        </button>
                        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                     </div>
                  </div>

                  <div className="flex gap-4 mt-2">
                     <button onClick={onClose} className="w-1/2 bg-slate-200 text-slate-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-colors">
                        Ver Fotos
                     </button>
                     <button onClick={handleSave} className="w-1/2 bg-[#ffb000] text-slate-900 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-colors">
                        Guardar
                     </button>
                  </div>
               </div>
            </motion.div>
         </div>

         {editingImage && (
            <ImageEditor 
               base64Image={editingImage.base64} 
               onSave={handleSaveEdit} 
               onClose={() => setEditingImage(null)} 
            />
         )}
      </>
   );
};
