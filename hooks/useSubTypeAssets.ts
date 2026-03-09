// hooks/useSubTypeAssets.ts
import { useState, useEffect } from "react";
import { SubTypeAssetService, SubTypeAsset } from "../services/sub-type-asset.service";

export const useSubTypeAssets = () => {
  const [subTypes, setSubTypes] = useState<SubTypeAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubTypes = async () => {
    setIsLoading(true);
    try {
      const data = await SubTypeAssetService.getSubTypes();
      setSubTypes(
        data.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        )
      );
    } catch (err) {
      console.error("Erreur sous-types", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubTypes();
  }, []);

  return { subTypes, isLoading, fetchSubTypes };
};
