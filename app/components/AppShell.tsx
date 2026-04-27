"use client";

/**
 * AppShell - wrapper qui adapte le contenu principal à l'état collapsed de la sidebar.
 * Remplace les ml-64 / pl-64 hardcodés dans chaque page.
 * Usage : entourer le contenu de chaque page avec <AppShell>...</AppShell>
 * OU utiliser directement useSidebar() dans les composants qui en ont besoin.
 */

import { useSidebar } from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className={`flex-1 w-full min-w-0 transition-all duration-300 ${collapsed ? "pl-16" : "pl-64"}`}>
      {children}
    </div>
  );
}
