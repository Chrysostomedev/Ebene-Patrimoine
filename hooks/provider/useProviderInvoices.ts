"use client";

import { useState, useEffect, useCallback } from "react";
import {
  providerInvoiceService,
  Invoice, InvoiceStats, InvoiceMeta,
  InvoiceFilters, CreateInvoicePayload,
} from "../../services/provider/providerInvoiceService";

export interface UseProviderInvoicesReturn {
  invoices:        Invoice[];
  stats:           InvoiceStats | null;
  selectedInvoice: Invoice | null;
  meta:            InvoiceMeta | null;
  loading:         boolean;
  statsLoading:    boolean;
  submitting:      boolean;
  error:           string;
  submitSuccess:   string;
  submitError:     string;
  isPanelOpen:     boolean;
  isCreateOpen:    boolean;
  statusFilter:    string;
  currentPage:     number;
  openPanel:       (inv: Invoice) => void;
  closePanel:      () => void;
  openCreate:      () => void;
  closeCreate:     () => void;
  setStatusFilter: (s: string) => void;
  setPage:         (p: number) => void;
  setDateRange:    (debut?: string, fin?: string) => void;
  createInvoice:   (p: CreateInvoicePayload) => Promise<boolean>;
  exportXlsx:      () => Promise<void>;
  refresh:         () => void;
}

export function useProviderInvoices(): UseProviderInvoicesReturn {
  const [invoices,        setInvoices]        = useState<Invoice[]>([]);
  const [stats,           setStats]           = useState<InvoiceStats | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [meta,            setMeta]            = useState<InvoiceMeta | null>(null);

  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  const [error,         setError]         = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError,   setSubmitError]   = useState("");

  const [isPanelOpen,  setIsPanelOpen]  = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [statusFilter, setStatusFilterState] = useState("");
  const [currentPage,  setCurrentPage]       = useState(1);
  const [dateDebut,    setDateDebut]          = useState<string | undefined>(undefined);
  const [dateFin,      setDateFin]            = useState<string | undefined>(undefined);

  // ── flash helpers ─────────────────────────────────────────────────────────
  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSubmitSuccess(msg);
      setTimeout(() => setSubmitSuccess(""), 4500);
    } else {
      setSubmitError(msg);
      setTimeout(() => setSubmitError(""), 5000);
    }
  };

  // ── Fetch liste ───────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: InvoiceFilters = { page: currentPage, per_page: 10 };
      if (statusFilter) params.payment_status = statusFilter;
      if (dateDebut)    params.date_debut      = dateDebut;
      if (dateFin)      params.date_fin        = dateFin;

      const res = await providerInvoiceService.getInvoices(params);
      setInvoices(res.items);
      setMeta(res.meta);
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.response?.data?.error ?? "Erreur lors du chargement des factures.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, dateDebut, dateFin]);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await providerInvoiceService.getStats());
    } catch {
      // non bloquant
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchStats();    }, [fetchStats]);

  // ── Setters avec reset page ───────────────────────────────────────────────
  const setStatusFilter = (s: string) => {
    setStatusFilterState(s);
    setCurrentPage(1);
  };

  const setPage = (p: number) => setCurrentPage(p);

  const setDateRange = (debut?: string, fin?: string) => {
    setDateDebut(debut);
    setDateFin(fin);
    setCurrentPage(1);
  };

  // ── Panel ─────────────────────────────────────────────────────────────────
  const openPanel  = (inv: Invoice) => { setSelectedInvoice(inv); setIsPanelOpen(true); };
  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  const openCreate  = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  // ── Création ──────────────────────────────────────────────────────────────
  const createInvoice = async (payload: CreateInvoicePayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      await providerInvoiceService.createInvoice(payload);
      flash("success", "Facture générée avec succès.");
      closeCreate();
      fetchInvoices();
      fetchStats();
      return true;
    } catch (e: any) {
      flash(
        "error",
        e.response?.data?.message ??
        e.response?.data?.error   ??
        "Erreur lors de la création de la facture."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportXlsx = async () => {
    try {
      await providerInvoiceService.exportXlsx();
    } catch {
      flash("error", "Erreur lors de l'export XLSX.");
    }
  };

  return {
    invoices, stats, selectedInvoice, meta,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen,
    statusFilter, currentPage,
    openPanel, closePanel,
    openCreate, closeCreate,
    setStatusFilter, setPage, setDateRange,
    createInvoice, exportXlsx,
    refresh: fetchInvoices,
  };
}