import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, RotateCcw, PenTool, Eraser } from 'lucide-react';

interface ImageEditorProps {
   base64Image: string;
   onSave: (newBase64: string) => void;
   onClose: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ base64Image, onSave, onClose }) => {
   const containerRef = useRef<HTMLDivElement>(null);
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const imgRef = useRef<HTMLImageElement>(null);
   
   const [isDrawing, setIsDrawing] = useState(false);
   const [mode, setMode] = useState<'draw' | 'erase'>('draw');
   const [color, setColor] = useState('#ef4444');
   const [strokeWidth, setStrokeWidth] = useState(4);
   const [history, setHistory] = useState<ImageData[]>([]);
   
   const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

   useEffect(() => {
      const img = new Image();
      img.onload = () => {
         const maxWidth = window.innerWidth * 0.9;
         const maxHeight = window.innerHeight * 0.6;
         let w = img.width;
         let h = img.height;
         
         if (w > maxWidth || h > maxHeight) {
            const ratio = Math.min(maxWidth / w, maxHeight / h);
            w *= ratio;
            h *= ratio;
         }
         
         setDimensions({ width: w, height: h });
      };
      img.src = base64Image;
   }, [base64Image]);

   useEffect(() => {
      if (dimensions.width === 0 || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
         // Save initial empty state
         setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
   }, [dimensions]);

   const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
         x: (e.clientX - rect.left) * scaleX,
         y: (e.clientY - rect.top) * scaleY
      };
   };

   const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
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
         ctx.strokeStyle = mode === 'draw' ? color : 'rgba(0,0,0,1)';
         ctx.lineWidth = mode === 'draw' ? strokeWidth : strokeWidth * 4;
         ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
         ctx.lineJoin = 'round';
         ctx.lineCap = 'round';
         ctx.stroke();
      }
   };

   const stopDrawing = () => {
      if (isDrawing) {
         const canvas = canvasRef.current;
         const ctx = canvas?.getContext('2d');
         if (ctx && canvas) {
            ctx.closePath();
            setHistory([...history, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
         }
         setIsDrawing(false);
      }
   };

   const handleUndo = () => {
      if (history.length > 1) {
         const newHistory = [...history];
         newHistory.pop();
         setHistory(newHistory);
         
         const canvas = canvasRef.current;
         const ctx = canvas?.getContext('2d');
         if (ctx && canvas) {
            ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
         }
      }
   };

   const handleSave = () => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = dimensions.width;
      exportCanvas.height = dimensions.height;
      const ctx = exportCanvas.getContext('2d');
      
      if (ctx) {
         ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
         ctx.drawImage(canvas, 0, 0);
         onSave(exportCanvas.toDataURL('image/jpeg', 0.8));
      }
   };

   return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
         <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col bg-slate-900 rounded-[30px] overflow-hidden shadow-2xl border border-slate-700"
         >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#ffb000]/20 text-[#ffb000] rounded-xl">
                     <PenTool size={20} />
                  </div>
                  <div>
                     <h3 className="text-white text-lg font-black uppercase italic tracking-tighter">Editar Foto</h3>
                     <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Añade indicaciones a la imagen</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 bg-slate-700 text-slate-300 hover:text-white hover:bg-red-500 rounded-full transition-colors">
                  <X size={20} />
               </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700 shrink-0 overflow-x-auto custom-scrollbar">
               <div className="flex items-center gap-4 shrink-0">
                  <button onClick={() => setMode('draw')} className={`p-3 rounded-xl transition-colors ${mode === 'draw' ? 'bg-[#ffb000] text-slate-900' : 'text-slate-400 hover:bg-slate-700'}`}>
                     <PenTool size={20} />
                  </button>
                  <button onClick={() => setMode('erase')} className={`p-3 rounded-xl transition-colors ${mode === 'erase' ? 'bg-[#ffb000] text-slate-900' : 'text-slate-400 hover:bg-slate-700'}`}>
                     <Eraser size={20} />
                  </button>
                  
                  <div className="h-6 w-px bg-slate-700 mx-2"></div>

                  <label className="text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     Color:
                     <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        disabled={mode === 'erase'}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-50"
                     />
                  </label>

                  <div className="hidden md:flex gap-2">
                     {['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#ffffff', '#000000'].map(c => (
                        <button
                           key={c}
                           onClick={() => setColor(c)}
                           disabled={mode === 'erase'}
                           className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'} disabled:opacity-30`}
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
                        max="20"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-24 md:w-32 accent-[#ffb000]"
                     />
                  </label>
               </div>

               <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                     onClick={handleUndo}
                     disabled={history.length <= 1}
                     className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
               {dimensions.width > 0 && (
                  <div style={{ width: dimensions.width, height: dimensions.height }} className="relative shadow-2xl rounded-lg overflow-hidden">
                     <img 
                        ref={imgRef}
                        src={base64Image} 
                        width={dimensions.width} 
                        height={dimensions.height} 
                        className="absolute inset-0 block pointer-events-none" 
                        alt="Background" 
                     />
                     <canvas
                        ref={canvasRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerOut={stopDrawing}
                        onPointerCancel={stopDrawing}
                        className="absolute inset-0 touch-none"
                        style={{ cursor: mode === 'erase' ? 'cell' : 'crosshair' }}
                     />
                  </div>
               )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 bg-slate-800 border-t border-slate-700 flex justify-end gap-3 shrink-0">
               <button
                  onClick={onClose}
                  className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-colors"
               >
                  Cancelar
               </button>
               <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-[#ffb000] hover:bg-orange-500 text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2"
               >
                  <Save size={14} /> GUARDAR EDICIÓN
               </button>
            </div>
         </motion.div>
      </div>
   );
};
