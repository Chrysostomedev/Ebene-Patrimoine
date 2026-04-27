"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useReport.ts
// Détail d'un rapport + action de validation avec notation
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { ReportService } from "../../services/manager/report.service";
import type { InterventionReport, ValidateReportPayload } from "../../types/manager.types";

interface UseReportReturn {
  report: InterventionReport | null;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  flash: { type: "success" | "error"; message: string } | null;
  refresh: () => void;
  validateReport: (payload: ValidateReportPayload) => Promise<void>;
  getAttachmentUrl: (filePath: string) => string;
}

export function useReport(id: number): UseReportReturn {
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchReport = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ReportService.getReport(id);
      setReport(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Impossible de charger le rapport.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /**
   * Valide le rapport avec une note et un commentaire optionnels.
   * Interdit si le rapport est déjà validé (status === 'validated').
   */
  const validateReport = async (
    payload: ValidateReportPayload
  ): Promise<void> => {
    if (report?.status === "validated") {
      showFlash("error", "Ce rapport est déjà validé.");
      return;
    }
    setIsValidating(true);
    try {
      const updated = await ReportService.validateReport(id, payload);
      setReport(updated);
      showFlash("success", "Rapport validé avec succès.");
    } catch (err: any) {
      showFlash(
        "error",
        err?.response?.data?.message ?? "Erreur lors de la validation."
      );
    } finally {
      setIsValidating(false);
    }
  };

  return {
    report,
    isLoading,
    isValidating,
    error,
    flash,
    refresh: fetchReport,
    validateReport,
    getAttachmentUrl: ReportService.getAttachmentUrl,
  };
}