// hooks/useTypes.ts
import { useState, useEffect } from "react";
import { TypeAssetService, TypeAsset } from "../../services/admin/type-asset.service";

export const useTypes = () => {
  const [types, setTypes] = useState<TypeAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number } | null>(null);
  const [page, setPage] = useState(1);

  const fetchTypes = async (currentPage: number = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await TypeAssetService.getTypes(currentPage, 15);

      // 🔹 Vérifie si le controller renvoie un objet avec data (Laravel)
      setTypes(data?.data || []);  
      setMeta({
        current_page: data?.current_page || currentPage,
        last_page: data?.last_page || 1,
      });
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération des types");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Refetch automatique au changement de page
  useEffect(() => {
    fetchTypes(page);
  }, [page]);

  // Permet de changer la page depuis la pagination
  const changePage = (newPage: number) => {
    setPage(newPage);
    fetchTypes(newPage);
  };

  return {
    types,
    isLoading,
    error,
    fetchTypes,
    meta,
    page,
    setPage: changePage,
  };
};
