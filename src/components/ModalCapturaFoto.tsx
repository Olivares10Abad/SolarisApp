import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Paperclip, Image as ImageIcon, Trash2, Edit2, FileText } from 'lucide-react';
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

   const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
               const canvas = document.createElement('canvas');
               let width = img.width;
               let height = img.height;
               const maxDimension = 1200;

               if (width > height) {
                  if (width > maxDimension) {
                     height *= maxDimension / width;
                     width = maxDimension;
                  }
               } else {
                  if (height > maxDimension) {
                     width *= maxDimension / height;
                     height = maxDimension;
                  }
               }
               canvas.width = width;
               canvas.height = height;
               const ctx = canvas.getContext('2d');
               ctx?.drawImage(img, 0, 0, width, height);
               resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (err) => reject(err);
         };
         reader.onerror = (err) => reject(err);
      });
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach(async file => {
         if (adjuntos.some(a => a.name === file.name)) return;
         try {
            const compressedBase64 = await compressImage(file);
            setAdjuntos(prev => {
               // Double check to avoid race conditions with multiple files
               if (prev.some(a => a.name === file.name)) return prev;
               return [...prev, {
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name,
                  base64: compressedBase64
               }];
            });
         } catch (e) {
            console.error("Error compressing", e);
         }
      });
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
               className="bg-white w-full max-w-[500px] rounded-3xl overflow-hidden shadow-2xl relative"
            >
               <div className="flex items-center justify-between p-5 border-b border-slate-200">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">{categoria}</h3>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20} strokeWidth={2.5} /></button>
               </div>

               <div className="p-6 flex flex-col gap-6">

                  <div className="flex items-center justify-between gap-4">
                     <label className="text-xs font-bold text-slate-600">Ubicación Constructiva:</label>
                     <select
                        value={ubicacion}
                        onChange={e => setUbicacion(e.target.value)}
                        className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#ffb000] focus:ring-2 focus:ring-[#ffb000]/20 transition-all cursor-pointer"
                     >
                        <option value="Ubicación 1">Ubicación 1</option>
                        <option value="Ubicación 2">Ubicación 2</option>
                        <option value="Ubicación 3">Ubicación 3</option>
                     </select>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-600 mb-2 block">Comentarios (Opcional)</label>
                     <textarea
                        value={comentarios}
                        onChange={e => setComentarios(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-[#ffb000] focus:bg-white transition-all resize-none shadow-inner"
                        placeholder="Agrega notas relevantes sobre esta evidencia..."
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-600 mb-2 block">Evidencia Fotográfica</label>
                     <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        {adjuntos.map(adj => (
                           <div key={adj.id} className="flex items-center justify-between p-3 border-b border-slate-200 bg-white group hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3 truncate">
                                 <div className="w-8 h-8 rounded-lg bg-[#ffb000]/10 flex items-center justify-center shrink-0">
                                    <ImageIcon size={16} className="text-[#ffb000]" />
                                 </div>
                                 <span className="text-xs font-bold text-slate-700 truncate">{adj.name}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => setEditingImage(adj)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                 <button onClick={() => handleRemove(adj.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                           </div>
                        ))}

                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-4 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 w-full transition-colors">
                           <Paperclip size={16} /> Agregar Archivos...
                        </button>
                        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                     </div>
                  </div>

                  <div className="flex gap-4 mt-2">
                     <button onClick={onClose} className="w-1/2 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors">
                        Ver Fotos
                     </button>
                     <button onClick={handleSave} className="w-1/2 bg-[#ffb000] text-slate-900 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-colors shadow-md">
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
