"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useProvider.ts
//
// Stratégie Option B :
//   1. GET /manager/ticket?provider_id={id}&per_page=500
//      → extrait le provider du premier ticket → profil complet
//      → calcule les stats depuis les tickets
//   2. GET /manager/ticket?provider_id={id}&page=N
//      → tickets paginés affichés dans la DataTable
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  ProviderService,
  type Provider,
  type ProviderStats,
  type ProviderTicket,
} from "../../services/manager/provider.service";
import type { PaginatedResponse } from "../../types/manager.types";

interface UseProviderReturn {
  provider: Provider | null;
  providerStats: ProviderStats | null;
  tickets: ProviderTicket[];
  ticketsMeta: PaginatedResponse<ProviderTicket>["meta"] | null;
  isLoading: boolean;
  isLoadingTickets: boolean;
  error: string | null;
  flash: { type: "success" | "error"; message: string } | null;
  ticketPage: number;
  setTicketPage: (page: number) => void;
  refresh: () => void;
}

export function useProvider(id: number): UseProviderReturn {
  const [provider, setProvider]           = useState<Provider | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [tickets, setTickets]             = useState<ProviderTicket[]>([]);
  const [ticketsMeta, setTicketsMeta]     =
    useState<PaginatedResponse<ProviderTicket>["meta"] | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [flash, setFlash]                 = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [ticketPage, setTicketPage]       = useState(1);

  // ── Chargement profil + stats ─────────────────────────────────
  const fetchProvider = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { provider: providerData, stats } =
        await ProviderService.getProvider(id);
      setProvider(providerData);
      setProviderStats(stats);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Impossible de charger le prestataire.";
      setError(msg);
      setFlash({ type: "error", message: msg });
      setTimeout(() => setFlash(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // ── Chargement tickets paginés ────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!id) return;
    setIsLoadingTickets(true);
    try {
      const paginated = await ProviderService.getProviderTickets(id, {
        page:     ticketPage,
        per_page: 10,
      });
      setTickets(paginated.items ?? []);
      setTicketsMeta(paginated.meta ?? null);
    } catch (err: any) {
      console.error("Erreur tickets prestataire", err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [id, ticketPage]);

  useEffect(() => { fetchProvider(); }, [fetchProvider]);
  useEffect(() => { fetchTickets();  }, [fetchTickets]);

  return {
    provider,
    providerStats,
    tickets,
    ticketsMeta,
    isLoading,
    isLoadingTickets,
    error,
    flash,
    ticketPage,
    setTicketPage,
    refresh: fetchProvider,
  };
}