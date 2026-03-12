"use client";
import { useState, useEffect, useCallback } from "react";
import {
  providerQuoteService,
  Quote, QuoteStats, QuoteFilters, CreateQuotePayload,
} from "../../services/provider/providerQuoteService";

export interface UseProviderQuotesReturn {
  quotes:        Quote[];
  stats:         QuoteStats | null;
  selectedQuote: Quote | null;
  loading:       boolean;
  statsLoading:  boolean;
  submitting:    boolean;
  error:         string;
  submitSuccess: string;
  submitError:   string;
  isPanelOpen:   boolean;
  isCreateOpen:  boolean;
  statusFilter:  string;
  openPanel:     (q: Quote) => void;
  closePanel:    () => void;
  openCreate:    () => void;
  closeCreate:   () => void;
  setStatusFilter: (s: string) => void;
  createQuote:   (p: CreateQuotePayload) => Promise<boolean>;
  exportXlsx:    () => Promise<void>;
}

export function useProviderQuotes(): UseProviderQuotesReturn {
  const [allQuotes,     setAllQuotes]     = useState<Quote[]>([]);
  const [stats,         setStats]         = useState<QuoteStats | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError,   setSubmitError]   = useState("");
  const [isPanelOpen,   setIsPanelOpen]   = useState(false);
  const [isCreateOpen,  setIsCreateOpen]  = useState(false);
  const [statusFilter,  setStatusFilter]  = useState("");

  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") { setSubmitSuccess(msg); setTimeout(() => setSubmitSuccess(""), 4000); }
    else                    { setSubmitError(msg);   setTimeout(() => setSubmitError(""),   5000); }
  };

  const fetchQuotes = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await providerQuoteService.getQuotes();
      setAllQuotes(data);
    } catch (e: any) {
      setError(e.response?.data?.message || "Erreur lors du chargement des devis.");
    } finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await providerQuoteService.getStats()); }
    catch { /* non bloquant */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchQuotes(); fetchStats(); }, [fetchQuotes, fetchStats]);

  // Filtrage côté client sur les statuts bruts de la BD
  const quotes = statusFilter
    ? allQuotes.filter(q => q.status === statusFilter)
    : allQuotes;

  const openPanel  = (q: Quote) => { setSelectedQuote(q); setIsPanelOpen(true); };
  const closePanel = () => { setIsPanelOpen(false); setTimeout(() => setSelectedQuote(null), 300); };
  const openCreate  = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  const createQuote = async (payload: CreateQuotePayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      await providerQuoteService.createQuote(payload);
      flash("success", "Devis créé et soumis avec succès.");
      closeCreate();
      fetchQuotes(); fetchStats();
      return true;
    } catch (e: any) {
      flash("error", e.response?.data?.message || "Erreur lors de la création.");
      return false;
    } finally { setSubmitting(false); }
  };

  const exportXlsx = async () => {
    try { await providerQuoteService.exportXlsx(); }
    catch { flash("error", "Erreur lors de l'export."); }
  };

  return {
    quotes, stats, selectedQuote,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen, statusFilter,
    openPanel, closePanel, openCreate, closeCreate,
    setStatusFilter, createQuote, exportXlsx,
  };
}