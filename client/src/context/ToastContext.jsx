import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, message, type }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => <div className={`toast toast-${item.type}`} key={item.id}>
        {item.type === 'error' ? <CircleAlert size={18} /> : item.type === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
        <span>{item.message}</span>
        <button onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))} aria-label="Dismiss"><X size={16} /></button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
