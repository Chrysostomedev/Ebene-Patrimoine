"use client";

/**
 * contexts/ToastContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provider de toasts global.
 *
 * - Les toasts s'affichent EN HAUT au centre, au-dessus de TOUT (z-[99999])
 * - API : useToast() → { toast }
 *   toast.success("message")
 *   toast.error("message")
 *   toast.info("message")
 *   toast.warning("message")
 *
 * Intégration :
 *   Wrappez vos layouts provider/manager avec <ToastProvider> (voir layouts).
 *   Dans les pages : import { useToast } from "@/contexts/ToastContext";
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useState,
    useRef,
} from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextValue {
    toast: {
        success: (message: string) => void;
        error: (message: string) => void;
        info: (message: string) => void;
        warning: (message: string) => void;
    };
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Config visuelle par type ───────────────────────────────────────────────────

const TOAST_CONFIG: Record<
    ToastType,
    { icon: React.ElementType; containerClass: string; iconClass: string; textClass: string }
> = {
    success: {
        icon: CheckCircle,
        containerClass: "bg-emerald-600 border border-emerald-500 shadow-emerald-200/50",
        iconClass: "text-white",
        textClass: "text-white",
    },
    error: {
        icon: XCircle,
        containerClass: "bg-red-600 border border-red-500 shadow-red-200/50",
        iconClass: "text-white",
        textClass: "text-white",
    },
    info: {
        icon: Info,
        containerClass: "bg-blue-600 border border-blue-500 shadow-blue-200/50",
        iconClass: "text-white",
        textClass: "text-white",
    },
    warning: {
        icon: AlertTriangle,
        containerClass: "bg-amber-500 border border-amber-400 shadow-amber-200/50",
        iconClass: "text-white",
        textClass: "text-white",
    },
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    // Utilise un ref pour éviter les closures périmées dans dismiss
    const toastsRef = useRef(toasts);
    toastsRef.current = toasts;

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (type: ToastType, message: string) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setToasts((prev) => [...prev, { id, type, message }]);

            // Auto-dismiss après 5 secondes
            setTimeout(() => dismiss(id), 5000);
        },
        [dismiss]
    );

    const toast: ToastContextValue["toast"] = {
        success: (msg) => addToast("success", msg),
        error: (msg) => addToast("error", msg),
        info: (msg) => addToast("info", msg),
        warning: (msg) => addToast("warning", msg),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}

            {/*
        ── Conteneur des toasts ──────────────────────────────────────────────
        Positionné :
          - fixed, top-4, centré horizontalement
          - z-[99999] : au-dessus de TOUTES les modales (SideModal z-[9999],
            SideDetailsPanel z-[9999])
          - pointer-events-none sur le wrapper pour ne pas bloquer les clics
            sous-jacents ; pointer-events-auto rétabli sur chaque toast
      */}
            <div
                aria-live="polite"
                aria-atomic="false"
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[100001] flex flex-col items-center gap-2 pointer-events-none"
                style={{ width: "min(480px, calc(100vw - 32px))" }}
            >
                {toasts.map((t) => {
                    const { icon: Icon, containerClass, iconClass, textClass } = TOAST_CONFIG[t.type];
                    return (
                        <div
                            key={t.id}
                            role="alert"
                            className={`
                pointer-events-auto w-full flex items-start gap-3
                px-4 py-3.5 rounded-2xl shadow-lg
                animate-in slide-in-from-top-2 fade-in duration-300
                ${containerClass}
              `}
                        >
                            {/* Icône */}
                            <Icon size={18} className={`shrink-0 mt-0.5 ${iconClass}`} />

                            {/* Message */}
                            <p className={`flex-1 text-sm font-semibold leading-snug ${textClass}`}>
                                {t.message}
                            </p>

                            {/* Bouton fermer */}
                            <button
                                onClick={() => dismiss(t.id)}
                                className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                aria-label="Fermer la notification"
                            >
                                <X size={14} className="text-white/80 hover:text-white" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast doit être utilisé à l'intérieur d'un <ToastProvider>.");
    }
    return ctx;
}