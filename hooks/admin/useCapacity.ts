// hooks/admin/useCapacity.ts
import { useState, useEffect } from "react";
import { CapacityService, Capacity } from "../../services/admin/capacity.service";

export const useCapacity = () => {
  const [capacities, setCapacities] = useState<Capacity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCapacities = async (params?: { asset_designation_id?: number }) => {
    setIsLoading(true);
    try {
      const data = await CapacityService.getCapacities(params);
      setCapacities(
        data.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        )
      );
    } catch (err) {
      console.error("Erreur capacites", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacities();
  }, []);

  return { capacities, isLoading, fetchCapacities };
};
