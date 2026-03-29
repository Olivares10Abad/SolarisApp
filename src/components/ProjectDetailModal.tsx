import React, { useState } from 'react';
import FileViewerModal from './FileViewerModal';

const ProjectDetailModal = ({ proyecto, onClose, ESTADOS_SOLARIS }: any) => {
  const [fileToView, setFileToView] = useState<string | null>(null);
  
  // Extraemos ID y Nombre asumiendo el formato "ID - Nombre"
  const partesNombre = proyecto.nombre_proyecto.split('-');
  const idProyecto = partesNombre[0]?.trim();
  const nombreReal = partesNombre[1]?.trim() || proyecto.nombre_proyecto;

  const styleEstatus = ESTADOS_SOLARIS[proyecto.estatus] || { bg: 'bg-slate-100', text: 'text-slate-700' };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
      
      {/* Contenedor principal estilo tarjeta */}
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Cabecera superior con línea naranja/amarilla debajo */}
        <div className="px-4 py-3 flex justify-between items-center border-b-[3px] border-orange-400">
          <p className="text-sm text-slate-700 font-medium truncate pr-4">
            Viabilidad: {idProyecto} - {nombreReal}
          </p>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-800 leading-none">
            ×
          </button>
        </div>

        {/* Cuerpo de la tarjeta */}
        <div className="p-4">
          
          {/* Imagen Aérea */}
          <div className="w-full aspect-video bg-slate-200 rounded-xl overflow-hidden mb-4">
            {proyecto.archivo_url ? (
              <img src={proyecto.archivo_url} alt="Vista Proyecto" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Sin imagen</div>
            )}
          </div>

          {/* Información e Identificadores */}
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="font-bold text-slate-900 text-sm">ID - {idProyecto}</p>
              <h2 className="font-bold text-slate-900 text-lg leading-tight mt-0.5">{nombreReal}</h2>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide ${styleEstatus.bg} ${styleEstatus.text}`}>
                {proyecto.estatus}
              </span>
              {/* Íconos decorativos simulados (como en tu imagen) */}
              <div className="flex text-slate-400 text-lg">
                👤<span className="text-xs absolute -mt-1 ml-3">+</span>
                👍
              </div>
            </div>
          </div>

          {/* Grid de Botones tipo Píldora (Homologado a la imagen) */}
          <div className="grid grid-cols-3 gap-2 pb-2">
            {[
              { label: 'Recibo', action: () => setFileToView(proyecto.archivo_url) },
              { label: 'Cotización', action: () => console.log('Acción Cotización') },
              { label: 'Recotización', action: () => console.log('Acción Recotización') },
              { label: 'Viabilidad', action: () => console.log('Acción Viabilidad') },
              { label: 'Reporte de Viabilidad', action: () => console.log('Acción Reporte') },
              { label: 'Cambios Ingeniería', action: () => console.log('Acción Cambios') },
              { label: 'Instalación', action: () => console.log('Acción Instalación') },
              { label: 'Solicitar Postventa', action: () => console.log('Acción Postventa') }
            ].map((btn) => (
              <button 
                key={btn.label}
                onClick={btn.action}
                className="py-2 px-1 rounded-full border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 text-[10px] font-medium leading-tight text-center transition-colors flex items-center justify-center h-10"
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Visor de PDF/Imagen */}
      {fileToView && <FileViewerModal url={fileToView} onClose={() => setFileToView(null)} />}
    </div>
  );
};

export default ProjectDetailModal;