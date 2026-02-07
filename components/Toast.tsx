'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'error';
  details?: string[];
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { ...options, id };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss nach 5 Sekunden (Success) oder 8 Sekunden (Error)
      const duration = options.type === 'error' ? 8000 : 5000;
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

interface ToasterProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-down min-w-[320px] max-w-[480px] ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5 text-white/90">
            {toast.type === 'error' ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{toast.text}</p>
            {toast.details && toast.details.length > 0 && (
              <ul className="mt-2 text-sm space-y-1 text-white/85">
                {toast.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-white/60" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 p-1.5 -mr-1.5 -mt-1 rounded-lg transition text-white/70 hover:text-white hover:bg-white/20"
            aria-label="Meldung schließen"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
