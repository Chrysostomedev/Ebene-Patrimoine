"use client";

import { useState, useEffect } from "react";

/**
 * useMediaQuery - Hook client pour écouter les media queries.
 * Gère le SSR en s'initialisant à false et ne s'exécutant qu'au montage côté client.
 *
 * @param query La media query à écouter (ex: '(max-width: 767px)')
 * @returns boolean true si la query correspond, false sinon
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
