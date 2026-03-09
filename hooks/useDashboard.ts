// hooks/useDashboard.ts
import { useState, useEffect } from "react";
import { DashboardService, GlobalDashboard, AdminDashboard } from "../services/dashboard.service";

export const useDashboard = () => {
  const [dashboard, setDashboard] = useState<GlobalDashboard | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getGlobalDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || "Erreur dashboard global");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getAdminDashboard();
      setAdminDashboard(data);
    } catch (err: any) {
      setError(err.message || "Erreur dashboard admin");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return {
    dashboard,
    adminDashboard,
    isLoading,
    error,
    fetchDashboard,
    fetchAdminDashboard,
  };
};