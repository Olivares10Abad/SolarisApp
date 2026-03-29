import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const NuevoProyectoModal = ({ onClose, onRefresh, userId }: any) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: '', giro: 'Residencial', comentarios: '' });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Por favor, sube el recibo o imagen de fachada.");
    setLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `solicitudes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cotizaciones')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('cotizaciones').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('proyectos').insert({
        nombre_proyecto: form.nombre,
        giro_proyecto: form.giro,
        comentarios_iniciales: form.comentarios,
        archivo_url: urlData.publicUrl,
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Archivo / Recibo</label>
              <input 
                required
                type="file"
                className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
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