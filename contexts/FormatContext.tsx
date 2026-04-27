"use client";

import React, { createContext, useContext, useMemo } from "react";
import { formatDate as sharedFormatDate, formatCurrency as sharedFormatCurrency } from "@/lib/utils";

interface FormatContextType {
  formatDate: (iso?: string | null | Date) => string;
  formatCurrency: (amount?: number | string | null) => string;
}

const FormatContext = createContext<FormatContextType>({
  formatDate: sharedFormatDate,
  formatCurrency: sharedFormatCurrency,
});

/**
 * Provider pour le formatage centralisé. 
 * Permet d'injecter des comportements de formatage si besoin, 
 * tout en restant disponible via hook.
 */
export function FormatProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({
    formatDate: sharedFormatDate,
    formatCurrency: sharedFormatCurrency,
  }), []);

  return (
    <FormatContext.Provider value={value}>
      {children}
    </FormatContext.Provider>
  );
}

/**
 * Hook pour utiliser les utilitaires de formatage standardisés.
 */
export function useFormat() {
  return useContext(FormatContext);
}
