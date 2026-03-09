// hooks/useQuotes.ts
import { useState, useCallback } from "react";
import {
  Quote,
  QuoteStats,
  QuoteService,
  CreateQuotePayload,
  UpdateQuotePayload,
  ImportQuotePayload,
} from "../services/quote.service";

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE DU HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseQuotesReturn {
  // État
  quotes: Quote[];
  stats: QuoteStats | null;
  isLoading: boolean;
  statsLoading: boolean;
  error: string | null;

  // Actions CRUD
  fetchQuotes: () => Promise<void>;
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

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const useQuotes = (): UseQuotesReturn => {
  // ── États ──────────────────────────────────────────────────────────────────
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Récupération liste devis ───────────────────────────────────────────────
  /**
   * Charge la liste complète des devis avec relations
   * Trie par date décroissante (plus récent en haut)
   */
  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await QuoteService.getQuotes();
      // Tri par date décroissante côté front (sécurité si backend ne trie pas)
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
      setQuotes(sorted);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Erreur lors de la récupération des devis.";
      setError(message);
      console.error("Erreur fetchQuotes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Récupération statistiques ──────────────────────────────────────────────
  /**
   * Charge les KPIs globaux (total, pending, approved, rejected, montants)
   * Non bloquant : si erreur, on affiche juste un warning console
   */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await QuoteService.getStats();
      setStats(data);
    } catch (err: any) {
      // Stats non critiques : on log juste un warning
      console.warn("Erreur stats devis:", err?.response?.data?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Récupération devis d'un ticket ─────────────────────────────────────────
  /**
   * Récupère tous les devis liés à un ticket spécifique
   * Utile pour afficher l'historique complet dans la page détails
   */
  const fetchQuotesByTicket = useCallback(async (ticketId: number): Promise<Quote[]> => {
    try {
      const data = await QuoteService.getQuotesByTicket(ticketId);
      return data.sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    } catch (err: any) {
      console.error("Erreur fetchQuotesByTicket:", err);
      return [];
    }
  }, []);

  // ── Création devis ──────────────────────────────────────────────────────────
  /**
   * Créer un nouveau devis avec items
   * Rafraîchit automatiquement la liste et les stats après création
   */
  const createQuote = useCallback(
    async (payload: CreateQuotePayload): Promise<Quote> => {
      const newQuote = await QuoteService.createQuote(payload);
      // Rafraîchissement auto de la liste
      await fetchQuotes();
      await fetchStats();
      return newQuote;
    },
    [fetchQuotes, fetchStats]
  );

  // ── Mise à jour devis ───────────────────────────────────────────────────────
  /**
   * Modifier un devis existant (description + items)
   * Interdit si status = "approved"
   */
  const updateQuote = useCallback(
    async (id: number, payload: UpdateQuotePayload): Promise<Quote> => {
      const updated = await QuoteService.updateQuote(id, payload);
      // Mise à jour optimiste dans la liste locale
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
      return updated;
    },
    []
  );

  // ── Suppression devis ───────────────────────────────────────────────────────
  /**
   * Supprimer un devis (réservé super-admin)
   * Rafraîchit automatiquement la liste et les stats
   */
  const deleteQuote = useCallback(
    async (id: number): Promise<void> => {
      await QuoteService.deleteQuote(id);
      // Suppression optimiste de la liste locale
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      await fetchStats();
    },
    [fetchStats]
  );

  // ── Approbation devis ───────────────────────────────────────────────────────
  /**
   * Valider un devis (status → "approved")
   * Mise à jour optimiste locale + rafraîchissement stats
   */
  const approveQuote = useCallback(
    async (id: number): Promise<void> => {
      await QuoteService.approveQuote(id);
      // Mise à jour optimiste immédiate dans l'UI
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

  // ── Rejet devis ─────────────────────────────────────────────────────────────
  /**
   * Rejeter un devis avec motif obligatoire
   * Status → "rejected", peut être re-soumis par le prestataire
   */
  const rejectQuote = useCallback(
    async (id: number, reason: string): Promise<void> => {
      await QuoteService.rejectQuote(id, reason);
      // Mise à jour optimiste
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

  // ── Demande révision ────────────────────────────────────────────────────────
  /**
   * Demander une révision au prestataire
   * Status → "revision", prestataire peut modifier et re-soumettre
   */
  const requestRevision = useCallback(
    async (id: number, reason?: string): Promise<void> => {
      await QuoteService.requestRevision(id, reason);
      // Mise à jour optimiste
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

  // ── Import Excel/CSV ────────────────────────────────────────────────────────
  /**
   * Importer des devis en masse depuis un fichier Excel/CSV
   * Retourne un rapport d'import (succès + erreurs)
   */
  const importQuotes = useCallback(
    async (payload: ImportQuotePayload): Promise<{ success_count: number; errors: any[] }> => {
      const result = await QuoteService.importQuotes(payload);
      // Rafraîchissement si au moins 1 devis importé
      if (result.success_count > 0) {
        await fetchQuotes();
        await fetchStats();
      }
      return result;
    },
    [fetchQuotes, fetchStats]
  );

  // ── Return ──────────────────────────────────────────────────────────────────
  return {
    // État
    quotes,
    stats,
    isLoading,
    statsLoading,
    error,

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