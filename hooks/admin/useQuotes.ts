// hooks/useQuotes.ts
import { useState, useCallback } from "react";
import {
  Quote,
  QuoteStats,
  QuoteService,
  CreateQuotePayload,
  UpdateQuotePayload,
  ImportQuotePayload,
} from "../../services/admin/quote.service";

interface UseQuotesReturn {
  // Etat
  quotes: Quote[];
  stats: QuoteStats | null;
  isLoading: boolean;
  statsLoading: boolean;
  error: string | null;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  } | null;

  // Actions CRUD
  fetchQuotes: (page?: number, filters?: any) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchQuotesByTicket: (ticketId: number) => Promise<Quote[]>;
  createQuote: (payload: CreateQuotePayload) => Promise<Quote>;
  updateQuote: (id: number, payload: UpdateQuotePayload) => Promise<Quote>;
  deleteQuote: (id: number) => Promise<void>;

  // Actions workflow
  approveQuote: (id: number) => Promise<void>;
  rejectQuote: (id: number, reason: string) => Promise<void>;
  requestRevision: (id: number, reason?: string) => Promise<void>;

  // Import
  importQuotes: (payload: ImportQuotePayload) => Promise<{ success_count: number; errors: any[] }>;
}

export const useQuotes = (): UseQuotesReturn => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);

  /**
   * Charge la liste des devis avec pagination et filtres
   */
  const fetchQuotes = useCallback(async (page = 1, filters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      // QuoteService.getQuotes returns Quote[] directly or we need to handle pagination
      const data = await QuoteService.getQuotes({ page, ...filters });
      // In QuoteService.ts, getQuotes is typed to return Quote[]
      // But if it was returning { items, meta }, we'd need to adjust.
      // Based on my latest view of QuoteService, it returns Quote[]
      setQuotes(Array.isArray(data) ? data : []);
      // If meta is needed, it should be handled in QuoteService or here if the response structure allows it.
      // For now, let's ensure quotes is at least an empty array.
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Erreur lors du chargement des devis");
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charge les KPIs globaux (total, pending, approved, rejected, montants)
   */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await QuoteService.getStats();
      setStats(data);
    } catch (err: any) {
      console.warn("Erreur stats devis:", err?.response?.data?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Recuperation devis d'un ticket
  const fetchQuotesByTicket = useCallback(async (ticketId: number): Promise<Quote[]> => {
    try {
      const data = await QuoteService.getQuotesByTicket(ticketId);
      return data;
    } catch (err: any) {
      console.error("Error loading linked quotes", err);
      return [];
    }
  }, []);

  // Creation devis
  const createQuote = useCallback(
    async (payload: CreateQuotePayload): Promise<Quote> => {
      const newQuote = await QuoteService.createQuote(payload);
      await fetchQuotes(1);
      await fetchStats();
      return newQuote;
    },
    [fetchQuotes, fetchStats]
  );

  // Mise a jour devis
  const updateQuote = useCallback(
    async (id: number, payload: UpdateQuotePayload): Promise<Quote> => {
      const updated = await QuoteService.updateQuote(id, payload);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
      await fetchStats();
      return updated;
    },
    [fetchStats]
  );

  // Suppression devis
  const deleteQuote = useCallback(
    async (id: number): Promise<void> => {
      await QuoteService.deleteQuote(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      await fetchStats();
    },
    [fetchStats]
  );

  // Approbation devis
  const approveQuote = useCallback(
    async (id: number): Promise<void> => {
      await QuoteService.approveQuote(id);
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: "approved" as const, approved_at: new Date().toISOString() }
            : q
        )
      );
      await fetchStats();
    },
    [fetchStats]
  );

  // Rejet devis
  const rejectQuote = useCallback(
    async (id: number, reason: string): Promise<void> => {
      await QuoteService.rejectQuote(id, reason);
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: "rejected" as const, rejection_reason: reason, rejected_at: new Date().toISOString() }
            : q
        )
      );
      await fetchStats();
    },
    [fetchStats]
  );

  // Demande revision
  const requestRevision = useCallback(
    async (id: number, reason?: string): Promise<void> => {
      await QuoteService.requestRevision(id, reason);
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: "revision" as const, revision_reason: reason, revision_requested_at: new Date().toISOString() }
            : q
        )
      );
      await fetchStats();
    },
    [fetchStats]
  );

  // Import devis
  const importQuotes = useCallback(
    async (payload: ImportQuotePayload): Promise<{ success_count: number; errors: any[] }> => {
      const result = await QuoteService.importQuotes(payload);
      // Rafraichissement si au moins 1 devis importe
      if (result.success_count > 0) {
        await fetchQuotes();
        await fetchStats();
      }
      return result;
    },
    [fetchQuotes, fetchStats]
  );

  return {
    // Etat
    quotes,
    stats,
    isLoading,
    statsLoading,
    error,
    meta,

    // Actions CRUD
    fetchQuotes,
    fetchStats,
    fetchQuotesByTicket,
    createQuote,
    updateQuote,
    deleteQuote,

    // Actions workflow
    approveQuote,
    rejectQuote,
    requestRevision,

    // Import
    importQuotes,
  };
};
