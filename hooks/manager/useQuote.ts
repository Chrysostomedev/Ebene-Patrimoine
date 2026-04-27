"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useQuote.ts
// Détail d'un devis + toutes les actions métier
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { QuoteService } from "../../services/manager/quote.service";
import type { Quote } from "../../types/manager.types";

interface UseQuoteReturn {
  quote: Quote | null;
  isLoading: boolean;
  isActing: boolean;
  error: string | null;
  flash: { type: "success" | "error"; message: string } | null;
  refresh: () => void;
  approve: () => Promise<void>;
  reject: (reason?: string) => Promise<void>;
  validate: () => Promise<void>;
  invalidate: () => Promise<void>;
  convertToInvoice: () => Promise<number | null>;
}

export function useQuote(id: number): UseQuoteReturn {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchQuote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await QuoteService.getQuote(id);
      setQuote(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Impossible de charger le devis."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // ── Actions métier ──────────────────────────────────────────────

  const runAction = async (
    action: () => Promise<Quote>,
    successMsg: string
  ) => {
    setIsActing(true);
    try {
      const updated = await action();
      setQuote(updated);
      showFlash("success", successMsg);
    } catch (err: any) {
      showFlash(
        "error",
        err?.response?.data?.message ?? "Une erreur est survenue."
      );
    } finally {
      setIsActing(false);
    }
  };

  const approve = () =>
    runAction(() => QuoteService.approveQuote(id), "Devis approuvé avec succès.");

  const reject = (reason?: string) =>
    runAction(
      () => QuoteService.rejectQuote(id, reason),
      "Devis rejeté."
    );

  const validate = () =>
    runAction(
      () => QuoteService.validateQuote(id),
      "Devis validé avec succès."
    );

  const invalidate = () =>
    runAction(
      () => QuoteService.invalidateQuote(id),
      "Devis invalidé."
    );

  const convertToInvoice = async (): Promise<number | null> => {
    setIsActing(true);
    try {
      const result = await QuoteService.convertToInvoice(id);
      showFlash("success", "Devis converti en facture avec succès.");
      return result.invoice_id;
    } catch (err: any) {
      showFlash(
        "error",
        err?.response?.data?.message ?? "Erreur lors de la conversion."
      );
      return null;
    } finally {
      setIsActing(false);
    }
  };

  return {
    quote,
    isLoading,
    isActing,
    error,
    flash,
    refresh: fetchQuote,
    approve,
    reject,
    validate,
    invalidate,
    convertToInvoice,
  };
}