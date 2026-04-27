import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, FileText, Share2, Check, Download } from 'lucide-react'

interface ModalVisorGlobalProps {
  titulo: string;
  urls: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ModalVisorGlobal({ titulo, urls, initialIndex = 0, onClose }: ModalVisorGlobalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!urls || urls.length === 0) return null;

  const currentUrl = urls[currentIndex];

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: titulo,
          url: currentUrl,
        });
      } catch (err) {
        console.log('Error sharing or cancelled:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1055] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[30px] md:rounded-[40px] w-full max-w-6xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white mt-12 md:mt-0 relative" onClick={e => e.stopPropagation()}>

        <div className="bg-white p-4 md:p-6 flex justify-between items-center border-b border-slate-100 z-10 shrink-0">
          <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px] md:text-sm flex items-center gap-2 md:gap-3">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-500 hidden sm:block shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">{titulo}</span>
            {urls.length > 1 && <span className="text-blue-500 bg-blue-50 px-1.5 md:px-2 py-1 rounded-md shrink-0">({currentIndex + 1}/{urls.length})</span>}
          </h3>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg md:rounded-xl transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Compartir'}</span>
            </button>
            <a href={currentUrl} download target="_blank" rel="noreferrer" className="flex items-center gap-1.5 md:gap-2 bg-orange-500 hover:bg-slate-900 text-white rounded-lg md:rounded-xl shadow-sm px-3 md:px-5 py-2 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest">
              <Download size={14} />
              <span className="hidden sm:inline">Descargar</span>
            </a>
            <div className="flex items-center bg-slate-100 rounded-lg md:rounded-xl overflow-hidden shadow-inner hidden md:flex">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">-</button>
              <span className="text-[9px] md:text-[10px] font-black text-slate-600 px-1 w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 md:p-2 md:px-3 hover:bg-slate-200 text-slate-600 font-black transition-colors">+</button>
            </div>
            <button onClick={onClose} className="p-1.5 md:p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
          </div>
        </div>

        <div className="flex-1 bg-slate-800 relative flex items-center justify-center overflow-auto custom-scrollbar p-2 md:p-4">
          {urls.length > 1 && (
            <>
              <button onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setZoom(1); }} disabled={currentIndex === 0} className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-[1000] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
              <button onClick={() => { setCurrentIndex(Math.min(urls.length - 1, currentIndex + 1)); setZoom(1); }} disabled={currentIndex === urls.length - 1} className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-[1000] md:z-20 p-2 md:p-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md disabled:opacity-30 transition-all shadow-xl"><ChevronRight className="w-5 h-5 md:w-6 md:h-6" /></button>
            </>
          )}
          <div className="transition-transform duration-300 origin-center flex items-center justify-center w-full h-full" style={{ transform: `scale(${zoom})` }}>
            {currentUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
              <img src={currentUrl} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Visor" />
            ) : (
              <iframe src={currentUrl} className="w-full h-full border-none bg-white rounded-xl shadow-2xl min-h-[60vh] md:min-h-full" title={titulo} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
