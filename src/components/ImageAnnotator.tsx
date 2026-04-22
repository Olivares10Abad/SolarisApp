import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, RotateCcw, PenTool } from 'lucide-react';

interface ImageAnnotatorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

export default function ImageAnnotator({ file, onSave, onCancel }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444'); // Red by default
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [imgUrl, setImgUrl] = useState<string>('');
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Initialize
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      originalImageRef.current = img;
      initCanvas();
    };
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = originalImageRef.current;
    if (!canvas || !container || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate scaling to fit container
    const rect = container.getBoundingClientRect();
    const maxWidth = rect.width - 32; // padding
    const maxHeight = rect.height - 32;

    let width = img.width;
    let height = img.height;

    // Scale down if needed
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
    }

    canvas.width = width;
    canvas.height = height;

    // Draw initial image
    ctx.drawImage(img, 0, 0, width, height);

    // Setup context for drawing
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates if canvas is styled to fit
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    initCanvas(); // Redraws original image
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to high quality JPEG
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const editedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        onSave(editedFile);
      },
      'image/jpeg',
      0.85
    );
  };

  return (
    <div className="fixed inset-0 z-[1050] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col bg-slate-900 rounded-[30px] overflow-hidden shadow-2xl border border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 bg-slate-800 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-500 rounded-xl">
              <PenTool size={20} />
            </div>
            <div>
              <h3 className="text-white text-lg font-black uppercase italic tracking-tighter">Editar Foto</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Marca los daños o hallazgos</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-700 text-slate-300 hover:text-white hover:bg-red-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-4 shrink-0">
            <label className="text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              Color:
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
            </label>

            <div className="hidden md:flex gap-2">
              {['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#ffffff', '#000000'].map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2 hidden md:block"></div>

            <label className="text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              Grosor:
              <input
                type="range"
                min="2"
                max="15"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                className="w-24 md:w-32 accent-rose-500"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={14} /> Deshacer
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-slate-950 relative touch-none select-none"
        >
          {imgUrl && (
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerOut={stopDrawing}
              onPointerCancel={stopDrawing}
              className="bg-black shadow-2xl rounded-lg touch-none"
              style={{ cursor: 'crosshair', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-slate-800 border-t border-slate-700 flex justify-end gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all flex items-center gap-2"
          >
            <Save size={14} /> GUARDAR EDICIÓN
          </button>
        </div>
      </motion.div>
    </div>
  );
}
