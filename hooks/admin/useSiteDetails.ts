// hooks/useSiteDetails.ts
import { useState, useEffect } from "react";
import { Site } from "../../services/admin/site.service";

export const useSiteDetails = (id: number) => {
  const [site, setSite] = useState<Site | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🔹 fetch site depuis Laravel
  const fetchSite = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`admin/site/${id}`);
      if (!res.ok) throw new Error("Site introuvable");
      const data = await res.json();

      setSite(data);

      // si le site contient déjà des tickets dans la réponse, on les met
      if (data.tickets) {
        setTickets(data.tickets);
        setTotalPages(Math.ceil(data.tickets.length / 10)); // exemple pagination simple
      }
    } catch (e) {
      console.error("Erreur récupération site", e);
      setSite(null);
      setTickets([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSite();
  }, [id]);

  return {
    site,
    tickets,
    loading,
    page,
    totalPages,
    setPage,
  };
};
