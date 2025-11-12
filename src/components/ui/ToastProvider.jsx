import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';

const ToastContext = createContext({ addToast: () => {} });

let idSeq = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = idSeq++;
    const t = {
      id,
      type: toast.type || 'info',
      title: toast.title || '',
      message: toast.message || '',
      duration: typeof toast.duration === 'number' ? toast.duration : 3500,
    };
    setToasts((prev) => [...prev, t]);
    if (t.duration > 0) {
      setTimeout(() => removeToast(id), t.duration);
    }
    return id;
  }, [removeToast]);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 w-[90vw] max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const typeStyles = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warn: 'bg-yellow-600 text-white',
};

const ToastItem = ({ toast, onClose }) => {
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className={`shadow-lg rounded-lg overflow-hidden ${typeStyles[toast.type] || typeStyles.info}`}>
      <div className="px-4 py-3">
        {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
        {toast.message && <div className="text-sm opacity-90">{toast.message}</div>}
      </div>
      <button
        onClick={onClose}
        className="absolute top-1 right-2 text-white/80 hover:text-white text-sm"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

export default ToastProvider;

