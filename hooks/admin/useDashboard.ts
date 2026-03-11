// hooks/admin/useDashboard.ts
import { useState, useEffect, useCallback } from "react";
import {
  DashboardService,
  GlobalDashboard,
  AdminDashboard,
} from "../../services/admin/dashboard.service";

// ─────────────────────────────────────────────────────────────────────────────
// HOOK useDashboard
//
// Corrections v2 :
//  1. isLoading séparés (global vs admin) → pas de race condition entre pages
//  2. useCallback sur chaque fetch → référence stable, safe dans useEffect([fn])
//  3. fetchDashboard auto au montage, fetchAdminDashboard à la demande
//  4. Erreurs individuelles par endpoint
// ─────────────────────────────────────────────────────────────────────────────

export const useDashboard = () => {
  // ── Dashboard global ──
  const [dashboard, setDashboard]   = useState<GlobalDashboard | null>(null);
  const [isLoading, setIsLoading]   = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Dashboard admin ──
  const [adminDashboard, setAdminDashboard]     = useState<AdminDashboard | null>(null);
  const [isAdminLoading, setIsAdminLoading]     = useState<boolean>(false);
  const [adminError, setAdminError]             = useState<string | null>(null);

  // ── Fetch global ──
  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getGlobalDashboard();
      setDashboard(data);
    } catch (err: any) {
      console.error("[useDashboard] fetchDashboard:", err?.response ?? err);
      setError(
        err?.response?.data?.message ??
        err?.message ??
        "Erreur chargement tableau de bord global."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch admin ──
  const fetchAdminDashboard = useCallback(async () => {
    setIsAdminLoading(true);
    setAdminError(null);
    try {
      const data = await DashboardService.getAdminDashboard();
      setAdminDashboard(data);
    } catch (err: any) {
      console.error("[useDashboard] fetchAdminDashboard:", err?.response ?? err);
      setAdminError(
        err?.response?.data?.message ??
        err?.message ??
        "Erreur chargement tableau de bord administration."
      );
    } finally {
      setIsAdminLoading(false);
    }
  }, []);

  // Auto-fetch global au montage uniquement
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    // Global
    dashboard,
    isLoading,
    error,
    fetchDashboard,

    // Admin
    adminDashboard,
    isAdminLoading,
    adminError,
    fetchAdminDashboard,
  };
};