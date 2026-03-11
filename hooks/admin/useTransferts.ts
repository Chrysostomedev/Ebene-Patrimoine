/**
 * hooks/useTransferts.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook principal pour la page transferts.
 * Gère : chargement, pagination, filtres, stats, actions (initiate/status/export).
 *
 * Usage :
 *   const {
 *     transfers, stats, loading, statsLoading, error,
 *     filters, setFilters, search, setSearch,
 *     currentPage, setCurrentPage, totalPages, total,
 *     handleExport, handleUpdateStatus, refresh,
 *   } = useTransferts();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  transfertService,
  TransferRecord,
  TransferStats,
  TransferFilters,
  TransferStatus,
} from "../../services/admin/transfertService";

const PER_PAGE = 6;

// ─── Types retournés par le hook ──────────────────────────────────────────────
export interface UseTransfertsReturn {
  // Données
  transfers: TransferRecord[];
  stats: TransferStats | null;

  // États de chargement
  loading: boolean;
  statsLoading: boolean;
  actionLoading: boolean;
  exportLoading: boolean;
  error: string;

  // Filtres & recherche
  filters: TransferFilters;
  setFilters: (f: TransferFilters) => void;
  search: string;
  setSearch: (s: string) => void;

  // Pagination
  currentPage: number;
  setCurrentPage: (p: number) => void;
  totalPages: number;
  total: number;

  // Actions
  handleExport: () => Promise<void>;
  handleUpdateStatus: (id: number, status: "effectué" | "annulé") => Promise<void>;
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTransferts(): UseTransfertsReturn {
  const [transfers,     setTransfers]     = useState<TransferRecord[]>([]);
  const [stats,         setStats]         = useState<TransferStats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error,         setError]         = useState("");

  const [filters,      setFiltersState] = useState<TransferFilters>({});
  const [search,       setSearchState]  = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [total,        setTotal]        = useState(0);

  // Debounce sur la recherche (400ms)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement liste ───────────────────────────────────────────────────────
  const fetchTransfers = useCallback(async (page = currentPage) => {
    setLoading(true);
    setError("");
    try {
      const result = await transfertService.getAll({
        ...filters,
        search: search || undefined,
        page,
        per_page: PER_PAGE,
      });
      setTransfers(result.data);
      setTotalPages(result.last_page);
      setTotal(result.total);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Impossible de charger les transferts.");
    } finally {
      setLoading(false);
    }
  }, [filters, search, currentPage]);

  // ── Chargement stats ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await transfertService.getStats();
      setStats(result);
    } catch {
      // Stats non bloquantes — on laisse null silencieusement
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Déclenchement initial ────────────────────────────────────────────────
  useEffect(() => {
    fetchStats();
  }, []);

  // ── Re-fetch quand filtres ou page changent ──────────────────────────────
  useEffect(() => {
    fetchTransfers(currentPage);
  }, [filters, currentPage]);

  // ── Debounce recherche ────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      fetchTransfers(1);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // ── Setters avec reset page ────────────────────────────────────────────────
  const setFilters = useCallback((f: TransferFilters) => {
    setFiltersState(f);
    setCurrentPage(1);
  }, []);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      await transfertService.export({ status: filters.status as TransferStatus | undefined });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  }, [filters.status]);

  // ── Changer statut d'un transfert ─────────────────────────────────────────
  const handleUpdateStatus = useCallback(async (id: number, status: "effectué" | "annulé") => {
    setActionLoading(true);
    try {
      const updated = await transfertService.updateStatus(id, status);
      // Mise à jour optimiste dans la liste locale
      setTransfers(prev =>
        prev.map(t => t.id === id ? { ...t, status: updated.status } : t)
      );
      // Refresh stats
      fetchStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Erreur lors de la mise à jour du statut.");
    } finally {
      setActionLoading(false);
    }
  }, [fetchStats]);

  // ── Refresh manuel ────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    fetchTransfers(currentPage);
    fetchStats();
  }, [fetchTransfers, fetchStats, currentPage]);

  return {
    transfers,
    stats,
    loading,
    statsLoading,
    actionLoading,
    exportLoading,
    error,
    filters,
    setFilters,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    total,
    handleExport,
    handleUpdateStatus,
    refresh,
  };
}

// ─── Hook détail (page [id]) ──────────────────────────────────────────────────
export interface UseTransferDetailReturn {
  transfer: TransferRecord | null;
  loading: boolean;
  error: string;
  handleUpdateStatus: (status: "effectué" | "annulé") => Promise<void>;
  actionLoading: boolean;
  refresh: () => void;
}

export function useTransferDetail(id: number): UseTransferDetailReturn {
  const [transfer,      setTransfer]      = useState<TransferRecord | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,         setError]         = useState("");

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await transfertService.getById(id);
      setTransfer(result);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? "Transfert introuvable." : "Impossible de charger le transfert.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleUpdateStatus = useCallback(async (status: "effectué" | "annulé") => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      const updated = await transfertService.updateStatus(transfer.id, status);
      setTransfer(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Erreur lors de la mise à jour.");
    } finally {
      setActionLoading(false);
    }
  }, [transfer]);

  return {
    transfer,
    loading,
    error,
    handleUpdateStatus,
    actionLoading,
    refresh: fetch,
  };
}