// src/components/FileViewerModal.tsx
import React from 'react';

interface FileViewerProps {
  url: string;
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerProps> = ({ url, onClose }) => {
  // Detectamos si es un PDF o una imagen por la extensión
  const isPDF = url.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
      
      {/* CONTENEDOR DEL VISOR */}
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* BARRA DE HERRAMIENTAS SUPERIOR */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="bg-orange-100 text-orange-600 p-2 rounded-lg text-xs font-bold uppercase">
              {isPDF ? 'PDF Documento' : 'Imagen'}
            </span>
            <p className="text-sm font-medium text-gray-600 truncate max-w-[200px] md:max-w-md">
              Visualizando: {url.split('/').pop()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÓN DESCARGAR (Como lo pediste) */}
            <a 
              href={url} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold hover:bg-gray-100 transition shadow-sm"
            >
              📥 Descargar
            </a>
            
            {/* BOTÓN CERRAR */}
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-red-500 transition text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* ÁREA DE VISUALIZACIÓN */}
        <div className="flex-grow bg-gray-200 relative">
          {isPDF ? (
            <iframe
              src={`${url}#toolbar=0&navpanes=0`} // #toolbar=0 oculta herramientas nativas si el navegador lo permite
              className="w-full h-full border-none"
              title="Visor PDF Solaris"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img 
                src={url} 
                alt="Vista previa" 
                className="max-w-full max-h-full rounded-lg shadow-lg object-contain"
              />
            </div>
          )}
        </div>

        {/* FOOTER (Solo diseño para que se vea Pro) */}
        <div className="p-3 bg-gray-50 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Sistema Solaris - Gestión de Proyectos
          </p>
        </div>
      </div>

      {/* CLICK AFUERA PARA CERRAR */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={onClose}
      />
    </div>
  );
};

export default FileViewerModal;