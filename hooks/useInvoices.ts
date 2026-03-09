// hooks/useInvoices.ts
import { useState, useCallback } from "react";
import {
  Invoice,
  InvoiceStats,
  InvoiceService,
  CreateInvoicePayload,
  MarkAsPaidPayload,
} from "../services/invoice.service";

interface UseInvoicesReturn {
  invoices: Invoice[];
  stats: InvoiceStats | null;
  isLoading: boolean;
  statsLoading: boolean;
  error: string | null;

  fetchInvoices: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchInvoicesByReport: (reportId: number) => Promise<Invoice[]>;
  createInvoice: (payload: CreateInvoicePayload) => Promise<Invoice>;
  deleteInvoice: (id: number) => Promise<void>;
  markAsPaid: (id: number, payload?: MarkAsPaidPayload) => Promise<void>;
}

export const useInvoices = (): UseInvoicesReturn => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Récupération liste factures ────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // ✅ CORRECTION : InvoiceService.getInvoices() retourne déjà un tableau
      const data = await InvoiceService.getInvoices();
      
      // ✅ data est maintenant TOUJOURS un tableau (Invoice[])
      const sorted = [...data].sort(
        (a, b) => {
          const dateA = new Date(a.invoice_date).getTime();
          const dateB = new Date(b.invoice_date).getTime();
          return dateB - dateA;  // Décroissant (plus récent en haut)
        }
      );
      
      setInvoices(sorted);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Erreur lors de la récupération des factures.";
      setError(message);
      console.error("❌ Erreur fetchInvoices:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Récupération statistiques ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await InvoiceService.getStats();
      setStats(data);
    } catch (err: any) {
      console.warn("⚠️ Erreur stats factures:", err?.response?.data?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Récupération factures d'un rapport ─────────────────────────────────────
  const fetchInvoicesByReport = useCallback(async (reportId: number): Promise<Invoice[]> => {
    try {
      const data = await InvoiceService.getInvoicesByReport(reportId);
      return data.sort(
        (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      );
    } catch (err: any) {
      console.error("❌ Erreur fetchInvoicesByReport:", err);
      return [];
    }
  }, []);

  // ── Création facture ────────────────────────────────────────────────────────
  const createInvoice = useCallback(
    async (payload: CreateInvoicePayload): Promise<Invoice> => {
      const newInvoice = await InvoiceService.createInvoice(payload);
      await fetchInvoices();
      await fetchStats();
      return newInvoice;
    },
    [fetchInvoices, fetchStats]
  );

  // ── Suppression facture ─────────────────────────────────────────────────────
  const deleteInvoice = useCallback(
    async (id: number): Promise<void> => {
      await InvoiceService.deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      await fetchStats();
    },
    [fetchStats]
  );

  // ── Marquer comme payée ─────────────────────────────────────────────────────
  const markAsPaid = useCallback(
    async (id: number, payload?: MarkAsPaidPayload): Promise<void> => {
      await InvoiceService.markAsPaid(id, payload);
      
      // ✅ Mise à jour optimiste
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...inv,
                payment_status: "paid" as const,
                payment_date: payload?.payment_date ?? new Date().toISOString(),
                payment_method: payload?.payment_method ?? inv.payment_method,
                payment_reference: payload?.payment_reference ?? inv.payment_reference,
              }
            : inv
        )
      );
      
      await fetchStats();
    },
    [fetchStats]
  );

  return {
    invoices,
    stats,
    isLoading,
    statsLoading,
    error,
    fetchInvoices,
    fetchStats,
    fetchInvoicesByReport,
    createInvoice,
    deleteInvoice,
    markAsPaid,
  };
};