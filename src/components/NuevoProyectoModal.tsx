import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, FileText } from 'lucide-react';

const NuevoProyectoModal = ({ onClose, onRefresh, userId }: any) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: '', giro: 'Residencial', comentarios: '' });
  const [archivos, setArchivos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (archivos.length === 0) return alert("Por favor, sube al menos un recibo o archivo.");
    setLoading(true);

    try {
      const adjuntos = [];
      for (const file of archivos) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `solicitudes/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('cotizaciones')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath);
          adjuntos.push(urlData.publicUrl);
      }

      const { error: insertError } = await supabase.from('proyectos').insert({
        nombre_proyecto: form.nombre,
        giro_proyecto: form.giro,
        comentarios_iniciales: form.comentarios,
        archivo_url: adjuntos[0] || null,
        archivos_adjuntos: adjuntos.length > 1 ? adjuntos : null, // Store all of them if many
        vendedor_id: userId,
        estatus: 'Cotización'
      });

      if (insertError) throw insertError;

      onRefresh();
      onClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Nueva Solicitud de Proyecto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ID y Nombre del Proyecto</label>
            <input 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Ej: 379 - Hospital GOLO"
              onChange={e => setForm({...form, nombre: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giro</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                onChange={e => setForm({...form, giro: e.target.value})}
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Archivos / Recibos</label>
              <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full border-2 border-dashed border-orange-200 rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition-colors bg-slate-50"
              >
                  <p className="text-xs font-bold text-slate-700">Seleccionar múltiples archivos</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
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
                  <div className="mt-2 grid grid-cols-1 gap-2 max-h-24 overflow-y-auto custom-scrollbar p-1">
                      {archivos.map((f, i) => (
                          <div key={i} className="flex justify-between items-center bg-orange-50 px-2 py-1.5 rounded-md border border-orange-100 shadow-sm">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                  <FileText size={12} className="text-orange-500 shrink-0" />
                                  <span className="text-[10px] font-bold text-orange-800 truncate">{f.name}</span>
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setArchivos(archivos.filter((_, idx) => idx !== i))}} className="text-red-400 hover:text-red-600 shrink-0"><X size={12} /></button>
                          </div>
                      ))}
                  </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
            <textarea 
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Detalles específicos para el área de cotización..."
              onChange={e => setForm({...form, comentarios: e.target.value})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Procesando...' : 'Enviar a Cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevoProyectoModal;