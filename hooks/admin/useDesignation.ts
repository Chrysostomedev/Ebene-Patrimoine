// hooks/admin/useDesignation.ts
import { useState, useEffect } from "react";
import { DesignationService, Designation } from "../../services/admin/designation.service";

export const useDesignation = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDesignations = async (params?: { sub_type_company_asset_id?: number }) => {
    setIsLoading(true);
    try {
      const data = await DesignationService.getDesignations(params);
      setDesignations(
        data.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        )
      );
    } catch (err) {
      console.error("Erreur designations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  return { designations, isLoading, fetchDesignations };
};
