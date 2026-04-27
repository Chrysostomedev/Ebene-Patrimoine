"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useInvoice.ts
// Détail d'une facture + factures liées au même rapport
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { InvoiceService } from "../../services/manager/invoice.service";
import type { Invoice } from "../../types/manager.types";

interface UseInvoiceReturn {
  invoice: Invoice | null;
  relatedInvoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  flash: { type: "success" | "error"; message: string } | null;
  refresh: () => void;
  /** Construit l'URL publique d'un pdf_path retourné par l'API */
  getPdfUrl: (pdfPath: string) => string;
}

export function useInvoice(id: number): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await InvoiceService.getInvoice(id);
      setInvoice(data);

      // Charger les factures liées au même rapport d'intervention
      if (data.report_id) {
        const related = await InvoiceService.getInvoicesByReport(
          data.report_id
        );
        setRelatedInvoices(related);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Impossible de charger la facture.";
      setError(msg);
      setFlash({ type: "error", message: msg });
      setTimeout(() => setFlash(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  return {
    invoice,
    relatedInvoices,
    isLoading,
    error,
    flash,
    refresh: fetchInvoice,
    getPdfUrl: InvoiceService.getPdfUrl,
  };
}