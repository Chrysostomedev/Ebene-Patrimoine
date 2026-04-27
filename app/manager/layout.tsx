"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../../services/AuthService";
import Sidebar from "../components/Sidebar";
import AppShell from "../components/AppShell";
// ✅ AJOUT : ToastProvider global pour tous les toasts de l'espace manager
import { ToastProvider } from "../../contexts/ToastContext";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.replace("/login"); return; }
    if (!authService.hasRole(["MANAGER"])) {
      const role = authService.getRole();
      if (role === "ADMIN" || role === "SUPER-ADMIN") router.replace("/admin/dashboard");
      else if (role === "PROVIDER") router.replace("/provider/dashboard");
      else router.replace("/login");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    // ✅ ToastProvider wrappe tout le layout :
    //    - les toasts s'affichent en haut au-dessus de toutes les modales
    //    - useToast() est disponible dans toutes les pages manager/*
    <ToastProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar />
        <AppShell>
          <div className="flex-1 min-w-0">{children}</div>
        </AppShell>
      </div>
    </ToastProvider>
  );
}