"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useAsset.ts
// Détail complet d'un actif par son ID
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { AssetService } from "../../services/manager/asset.service";
import type { Asset } from "../../types/manager.types";

interface UseAssetReturn {
  asset: Asset | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAsset(id: number): UseAssetReturn {
  const [asset, setAsset]         = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchAsset = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AssetService.getAsset(id);
      setAsset(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Impossible de charger cet actif."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  return { asset, isLoading, error, refresh: fetchAsset };
}



