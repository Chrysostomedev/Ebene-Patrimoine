// hooks/useServices.ts
import { useState, useEffect } from "react";
import { ServiceService, Service } from "../services/service.service";

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ServiceService.getServices();
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
      setServices(sorted);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la récupération des services.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch au montage — alimente les selects (prestataires, planning, tickets...)
  useEffect(() => {
    fetchServices();
  }, []);

  return {
    services,
    isLoading,
    error,
    fetchServices,
    // ← Alias rétrocompatibles avec l'ancien useServices
    loading: isLoading,
  };
};