import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Share2, Check, Download } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Archivo Adjunto',
          url: currentImage,
        });
      } catch (err) {
        console.log('Error sharing or cancelled:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(currentImage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header toolbar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full backdrop-blur transition-colors"
          >
            <X size={20} />
          </button>
          {images.length > 1 && (
            <span className="text-white font-bold text-xs bg-slate-800/80 px-3 py-1.5 rounded-full backdrop-blur">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full backdrop-blur transition-all font-bold text-xs uppercase tracking-widest"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
            <span className="hidden sm:inline">{copied ? 'Enlace Copiado' : 'Compartir'}</span>
          </button>
          <a
            href={currentImage}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full backdrop-blur transition-colors"
            title="Abrir en pestaña (Original)"
          >
            <Download size={20} />
          </a>
        </div>
      </div>

      {/* Main Media View */}
      <div className="relative w-full h-full flex items-center justify-center px-4 md:px-16 py-20 outline-none" onClick={e => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {(() => {
              const url = currentImage;
              if (!url) return null;
              let path = url;
              try {
                const parsed = new URL(url);
                path = parsed.pathname.toLowerCase();
              } catch(e) {
                path = url.toLowerCase();
              }

              if (path.match(/\.(mp4|webm|ogg|mov)$/)) {
                return <video src={url} controls className="max-w-full max-h-full rounded-lg shadow-2xl" />;
              }
              if (path.match(/\.(mp3|wav|ogg|m4a)$/)) {
                return (
                  <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-500">Clip de Audio</span>
                    <audio src={url} controls className="w-full max-w-sm" />
                  </div>
                );
              }
              if (path.match(/\.(pdf)$/)) {
                return <iframe src={url} className="w-full h-full border-none bg-white rounded-xl shadow-2xl md:min-w-[70vw]" title="Documento" />;
              }
              // Default to Image
              return <img src={url} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Media" />;
            })()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Overlays */}
        {images.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all shadow-lg"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all shadow-lg"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
