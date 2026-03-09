// hooks/useSites.ts
import { useState, useEffect, useRef } from "react";
import {
  getSites,
  getSitesFiltered,
  createSite,
  getSiteStats,
  getManagers,
  Site,
} from "../services/site.service";

const PER_PAGE = 9;

export const useSites = () => {
  const [sites,      setSites]      = useState<Site[]>([]);
  const [stats,      setStats]      = useState<any>(null);
  const [managers,   setManagers]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [page,       setPageState]  = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Références internes pour éviter les closures périmées
  const pageRef   = useRef(1);
  const searchRef = useRef<string>("");
  const statusRef = useRef<string | undefined>(undefined);

  // ─────────────────────────────────────────────
  // FETCH PRINCIPAL — respecte page, search, status
  // ─────────────────────────────────────────────
  const fetchSites = async (
    search?:      string,
    status?:      string,
    overridePage?: number,
  ) => {
    searchRef.current = search ?? searchRef.current;
    statusRef.current = status !== undefined ? status : statusRef.current;

    const currentPage = overridePage ?? pageRef.current;

    setLoading(true);
    try {
      const { items, meta } = await getSitesFiltered({
        search:   searchRef.current || undefined,
        status:   statusRef.current || undefined,
        page:     currentPage,
        per_page: PER_PAGE,
      });
      setSites(items);
      setTotalPages(meta.last_page);
      setTotalItems(meta.total);
    } catch {
      setSites([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // FETCH SIMPLE — pour les selects (per_page élevé)
  // ─────────────────────────────────────────────
  const fetchSitesAll = async () => {
    try {
      const { items } = await getSites(undefined, 1, 1000);
      setSites(items);
    } catch {
      setSites([]);
    }
  };

  // ─────────────────────────────────────────────
  // Auto-fetch au montage UNIQUEMENT (pas de double)
  // ─────────────────────────────────────────────
  useEffect(() => {
    fetchSites();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // Réaction au changement de page
  // skipFirst évite le double-fetch au montage
  // ─────────────────────────────────────────────
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    pageRef.current = page;
    fetchSites(searchRef.current, statusRef.current, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const data = await getSiteStats();
      setStats(data);
    } catch {
      setStats(null);
    }
  };

  // ─────────────────────────────────────────────
  // Managers
  // ─────────────────────────────────────────────
  const fetchManagers = async () => {
    try {
      const data = await getManagers();
      setManagers(Array.isArray(data) ? data : data?.items ?? []);
    } catch {
      setManagers([]);
    }
  };

  // ─────────────────────────────────────────────
  // Créer un site
  // ─────────────────────────────────────────────
  const addSite = async (data: any) => {
    await createSite(data);
  };

  const setPage = (p: number) => {
    setPageState(p);
  };

  return {
    sites,
    stats,
    managers,
    loading,
    page,
    totalPages,
    totalItems,
    setPage,
    fetchSites,
    fetchSitesAll,
    fetchStats,
    fetchManagers,
    addSite,
  };
};