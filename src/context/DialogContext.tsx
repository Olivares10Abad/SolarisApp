import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, HelpCircle } from 'lucide-react';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'question';
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showAlert: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
  showConfirm: (message: string, title?: string, type?: 'warning' | 'error' | 'question', confirmText?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [options, setOptions] = useState<DialogOptions>({ message: '' });
  const [resolvePromise, setResolvePromise] = useState<((value: any) => void) | null>(null);

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    return new Promise<void>((resolve) => {
      setOptions({ message, type, title });
      setIsConfirm(false);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const showConfirm = (message: string, title?: string, type: 'warning' | 'error' | 'question' = 'question', confirmText: string = 'Confirmar') => {
    return new Promise<boolean>((resolve) => {
      setOptions({ message, type, title: title || 'Aviso', confirmText });
      setIsConfirm(true);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const handleClose = (value: boolean | void) => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(value);
      setResolvePromise(null);
    }
  };

  const renderIcon = () => {
    switch (options.type) {
      case 'success': return <CheckCircle2 size={32} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={32} className="text-orange-500" />;
      case 'error': return <X size={32} strokeWidth={3} className="text-red-500" />;
      case 'question': return <HelpCircle size={32} className="text-blue-500" />;
      default: return <Info size={32} className="text-slate-500" />;
    }
  };

  const getThemeClass = () => {
    switch (options.type) {
      case 'success': return 'border-green-500';
      case 'warning': return 'border-orange-500';
      case 'error': return 'border-red-500';
      case 'question': return 'border-blue-500';
      default: return 'border-slate-400';
    }
  };

  const getPrimaryButtonClass = () => {
    switch (options.type) {
      case 'error': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'warning': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'success': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'question': return 'bg-blue-600 hover:bg-blue-700 text-white';
      default: return 'bg-slate-800 hover:bg-slate-900 text-white';
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 10 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 10 }} 
               className={`bg-white border-t-[4px] w-full max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl relative flex flex-col ${getThemeClass()}`}
            >
              <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
                 <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                    {renderIcon()}
                 </div>
                 <h3 className="font-black tracking-tight text-slate-800 text-lg leading-tight mt-1">
                    {options.title}
                 </h3>
                 <p className="text-xs font-bold text-slate-500 leading-snug">
                    {options.message}
                 </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 w-full mt-auto">
                 {isConfirm ? (
                    <>
                       <button onClick={() => handleClose(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 hover:bg-slate-100 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm">
                          {options.cancelText || 'Cancelar'}
                       </button>
                       <button onClick={() => handleClose(true)} className={`flex-1 shadow-md py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${getPrimaryButtonClass()}`}>
                          {options.confirmText || 'Confirmar'}
                       </button>
                    </>
                 ) : (
                    <button onClick={() => handleClose()} className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${getPrimaryButtonClass()}`}>
                       {options.confirmText || 'Entendido'}
                    </button>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
