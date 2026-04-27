"use client";

import { useState, useEffect, useCallback } from "react";
import {
  providerReportService,
  InterventionReport, ReportStats,
  CreateReportPayload, UpdateReportPayload,
} from "../../services/provider/providerReportService";

export type ReportFilterState = {
  status?: string;
  type?:   string;
  date_from?: string;
  date_to?:   string;
};

export interface UseProviderReportsReturn {
  // Données
  reports:         InterventionReport[];
  filteredReports: InterventionReport[];
  stats:           ReportStats | null;
  selectedReport:  InterventionReport | null;
  // Loaders
  loading:         boolean;
  statsLoading:    boolean;
  submitting:      boolean;
  // Messages
  error:           string;
  submitSuccess:   string;
  submitError:     string;
  // UI state
  isPanelOpen:  boolean;
  isCreateOpen: boolean;
  isEditOpen:   boolean;
  filters:      ReportFilterState;
  // Actions
  openPanel:    (r: InterventionReport) => void;
  closePanel:   () => void;
  openCreate:   () => void;
  closeCreate:  () => void;
  openEdit:     (r: InterventionReport) => void;
  closeEdit:    () => void;
  setFilters:   (f: ReportFilterState) => void;
  createReport: (p: CreateReportPayload)          => Promise<boolean>;
  updateReport: (id: number, p: UpdateReportPayload) => Promise<boolean>;
  exportXlsx:   () => Promise<void>;
  refresh:      () => void;
}

export function useProviderReports(initialFilters: ReportFilterState = {}): UseProviderReportsReturn {
  const [reports,        setReports]        = useState<InterventionReport[]>([]);
  const [stats,          setStats]          = useState<ReportStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<InterventionReport | null>(null);

  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  const [error,         setError]         = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError,   setSubmitError]   = useState("");

  const [isPanelOpen,  setIsPanelOpen]  = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen,   setIsEditOpen]   = useState(false);
  const [filters,      setFiltersState] = useState<ReportFilterState>(initialFilters);

  // ── flash ──────────────────────────────────────────────────────────────────
  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") { setSubmitSuccess(msg); setTimeout(() => setSubmitSuccess(""), 4500); }
    else                    { setSubmitError(msg);   setTimeout(() => setSubmitError(""),   5000); }
  };

  // ── fetchReports — passe les filtres directement à l'API ─────────────────
  const fetchReports = useCallback(async (f?: ReportFilterState) => {
    setLoading(true); setError("");
    try {
      const active = f ?? filters;
      const params: Record<string, any> = {};
      if (active.type)      params.intervention_type = active.type;
      if (active.status)    params.status            = active.status;
      if (active.date_from) params.date_debut        = active.date_from;
      if (active.date_to)   params.date_fin          = active.date_to;
      setReports(await providerReportService.getReports(params));
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.response?.data?.error ?? "Erreur lors du chargement des rapports.");
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fetchStats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await providerReportService.getStats()); }
    catch { /* non bloquant */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); fetchStats(); }, [fetchReports, fetchStats]);

  // ── filtrage côté client (fallback si l'API ne filtre pas tout) ───────────
  const filteredReports = reports.filter(r => {
    if (filters.status && r.status !== filters.status) return false;
    // On ne filtre plus sur le type côté Front pour faire confiance à l'API
    return true;
  });

  const setFilters = (f: ReportFilterState) => {
    setFiltersState(f);
    fetchReports(f);
  };

  // ── panel aperçu ───────────────────────────────────────────────────────────
  const openPanel  = (r: InterventionReport) => { setSelectedReport(r); setIsPanelOpen(true); };
  const closePanel = () => { setIsPanelOpen(false); setTimeout(() => setSelectedReport(null), 300); };

  // ── modale création ────────────────────────────────────────────────────────
  const openCreate  = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  // ── modale édition ─────────────────────────────────────────────────────────
  const openEdit  = (r: InterventionReport) => { setSelectedReport(r); setIsEditOpen(true); };
  const closeEdit = () => { setIsEditOpen(false); setTimeout(() => setSelectedReport(null), 300); };

  // ── createReport ───────────────────────────────────────────────────────────
  const createReport = async (payload: CreateReportPayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      const created = await providerReportService.createReport(payload);
      // Ajout optimiste en tête de liste
      setReports(prev => [created, ...prev]);
      flash("success", "Rapport soumis avec succès. Le gestionnaire a été notifié.");
      closeCreate();
      fetchStats();
      return true;
    } catch (e: any) {
      flash("error", e.response?.data?.message ?? e.response?.data?.error ?? "Erreur lors de la soumission.");
      return false;
    } finally { setSubmitting(false); }
  };

  // ── updateReport ───────────────────────────────────────────────────────────
  const updateReport = async (id: number, payload: UpdateReportPayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      const updated = await providerReportService.updateReport(id, payload);
      setReports(prev => prev.map(r => r.id === id ? updated : r));
      setSelectedReport(prev => prev?.id === id ? updated : prev);
      flash("success", "Rapport mis à jour avec succès.");
      closeEdit();
      return true;
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 422) flash("error", "Impossible de modifier un rapport déjà validé.");
      else if (status === 403) flash("error", "Accès refusé : ce rapport ne vous appartient pas.");
      else flash("error", e.response?.data?.message ?? "Erreur lors de la mise à jour.");
      return false;
    } finally { setSubmitting(false); }
  };

  // ── export ─────────────────────────────────────────────────────────────────
  const exportXlsx = async () => {
    try { await providerReportService.exportXlsx(); }
    catch { flash("error", "Erreur lors de l'export."); }
  };

  return {
    reports, filteredReports, stats, selectedReport,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen, isEditOpen, filters,
    openPanel, closePanel, openCreate, closeCreate, openEdit, closeEdit,
    setFilters, createReport, updateReport, exportXlsx,
    refresh: fetchReports,
  };
}