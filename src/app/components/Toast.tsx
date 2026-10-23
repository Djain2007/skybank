"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckIcon, InfoIcon, AlertIcon } from "./Icons";
import styles from "./Toast.module.css";

type ToastTone = "success" | "info" | "error";

interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (text: string, tone?: ToastTone) => void;
  success: (text: string) => void;
  info: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, tone: ToastTone = "success") => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
      setTimeout(() => {
        removeToast(id);
      }, 2600);
    },
    [removeToast]
  );

  const value: ToastContextValue = {
    showToast,
    success: (text) => showToast(text, "success"),
    info: (text) => showToast(text, "info"),
    error: (text) => showToast(text, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            <span className={styles.icon}>
              {toast.tone === "success" && <CheckIcon size={14} />}
              {toast.tone === "info" && <InfoIcon size={14} />}
              {toast.tone === "error" && <AlertIcon size={14} />}
            </span>
            <span className={styles.text}>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op if outside provider
    return {
      showToast: () => {},
      success: () => {},
      info: () => {},
      error: () => {},
    };
  }
  return ctx;
}
