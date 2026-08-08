"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, title?: string) => void;
  toast: (options: { title?: string; description?: string; variant?: ToastType | "destructive" }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; border: string; text: string; iconColor: string; bg: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-[var(--card)]",
    border: "border-emerald-300 dark:border-emerald-500/30",
    text: "text-[var(--card-foreground)]",
    iconColor: "text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-[var(--card)]",
    border: "border-rose-300 dark:border-rose-500/30",
    text: "text-[var(--card-foreground)]",
    iconColor: "text-rose-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-[var(--card)]",
    border: "border-amber-300 dark:border-amber-500/30",
    text: "text-[var(--card-foreground)]",
    iconColor: "text-amber-400",
  },
  info: {
    icon: Info,
    bg: "bg-[var(--card)]",
    border: "border-indigo-300 dark:border-indigo-500/30",
    text: "text-[var(--card-foreground)]",
    iconColor: "text-amber-400",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-xl animate-slide-in",
        config.bg,
        config.border
      )}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconColor)} />
      <div className="flex-1 space-y-0.5">
        {toast.title && <h5 className="text-xs font-bold uppercase text-amber-400 tracking-wider">{toast.title}</h5>}
        <p className={cn("text-xs font-medium leading-relaxed", config.text)}>{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `toast-${++toastCounter}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, 5000);

      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const toast = useCallback(
    ({ title, description, variant }: { title?: string; description?: string; variant?: ToastType | "destructive" }) => {
      const mappedType: ToastType = variant === "destructive" ? "error" : (variant || "info");
      addToast(mappedType, description || title || "", title);
    },
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, toast }}>
      {children}

      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastItem as Toast };
