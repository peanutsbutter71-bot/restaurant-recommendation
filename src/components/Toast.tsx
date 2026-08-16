import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div
      id="app-toast"
      className="fixed bottom-6 right-6 z-50 bg-stone-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-lg border border-stone-800 flex items-center gap-2.5 text-xs sm:text-sm font-medium animate-in slide-in-from-bottom-5 duration-200"
    >
      <Sparkles className="w-4 h-4 text-emerald-200" />
      <span>{message}</span>
    </div>
  );
};
