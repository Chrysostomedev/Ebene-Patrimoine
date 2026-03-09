"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, AlertTriangle, BellDot } from "lucide-react";
import { authService } from "../../services/AuthService";
import Link from "next/link";

function RoleBadge({ role }: { role: string }) {
  if (role === "super-admin")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-theme-primary text-white">
        Super Admin
      </span>
    );
  if (role === "admin" || role === "manager")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-theme-light text-theme-primary border border-theme-light">
        {role === "admin" ? "Admin" : "Manager"}
      </span>
    );
  return null;
}

export default function Navbar() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [role,      setRole]      = useState("");

  useEffect(() => {
    setFirstName(authService.getFirstName());
    setLastName(authService.getLastName());
    setRole(authService.getRole());
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/admin/login");
    } catch {
      localStorage.clear();
      window.location.href = "/admin/login";
    }
  };

  const getInitials = () =>
    firstName || lastName
      ? `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
      : "?";

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Utilisateur";

  return (
    <>
      <header className="fixed top-0 left-64 w-[calc(100%-16rem)] flex justify-between items-center px-6 py-4 bg-white shadow border-b border-gray-200 z-30">

        {/* Infos utilisateur */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-theme-primary text-white font-black flex items-center justify-center text-sm tracking-wide shrink-0">
            {getInitials()}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <p className="text-gray-900 font-bold text-sm leading-tight">Bonjour, {fullName}</p>
              <RoleBadge role={role} />
            </div>
            <p className="text-gray-500 text-xs font-medium">
              Bienvenue sur votre espace d'administration de Facility Management
            </p>
          </div>
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin/notifications"
            className="relative flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all"
          >
            <BellDot size={22} className="text-theme-primary" strokeWidth={2.5} />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "rgb(var(--color-text-primary))" }}>
              Notifications
            </span>
          </Link>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Modal déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-white w-[90%] max-w-lg rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={38} strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Déconnexion de votre compte</h2>
              <p className="text-gray-500 text-lg leading-relaxed font-medium px-4">
                Souhaitez-vous vous déconnecter ? Vous pourrez vous reconnecter facilement à tout moment.
              </p>
            </div>
            <div className="flex gap-4 w-full pt-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-6 rounded-2xl bg-theme-primary text-white font-bold hover:opacity-90 transition-all"
              >
                Rester connecté
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-6 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-200"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}