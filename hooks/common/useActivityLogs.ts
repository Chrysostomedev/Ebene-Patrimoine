import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../core/axios";
import { authService } from "../../services/AuthService";

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  model_type: string;
  model_id: number;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  properties?: any;
}

export const useActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const role = authService.getRole()?.toLowerCase() || "manager";
      // Route unifiée: {role}/activity-log/mine (V1 est déjà dans la baseURL)
      const response = await axiosInstance.get(`${role}/activity-log/mine`);
      const data = response.data?.data?.data || response.data?.data || [];
      setLogs(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Erreur lors de la récupération des logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refresh: fetchLogs };
};
