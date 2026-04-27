"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { LogOut, AlertTriangle, Bell } from "lucide-react";
import { authService } from "../../services/AuthService";
import Link from "next/link";
import NotificationPanel from "./NotificationPanel";
import api from "../../core/axios";
import { useSidebar } from "./Sidebar";
import { useLanguage } from "../../contexts/LanguageContext";

const getNotificationsRoute = (role: string): string => {
  switch (role) {
    case "SUPER-ADMIN":
    case "ADMIN":    return "/admin/notifications";
    case "PROVIDER": return "/provider/notifications";
    case "MANAGER":  return "/manager/notifications";
    default:         return "#";
  }
};

const getApiPrefix = (role: string): string => {
  if (role === "MANAGER")  return "/manager";
  if (role === "PROVIDER") return "/provider";
  return "/admin";
};

const getMeEndpoint = (role: string): string => {
  if (role === "PROVIDER") return "/provider/profile";
  if (role === "MANAGER")  return "/manager/me";
  return "/admin/me";
};

// ── Bande notif in-app ────────────────────────────────────────────────────────
interface InAppBannerProps {
  title: string;
  body: string;
  onClose: () => void;
  href?: string;
}

function InAppBanner({ title, body, onClose, href }: InAppBannerProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[360px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <div className="h-1 w-full bg-slate-900" />
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mt-0.5">
          <Bell size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 leading-tight truncate">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-snug">{body}</p>
          {href && (
            <a href={href} className="text-xs font-bold text-slate-900 underline underline-offset-2 mt-1 inline-block hover:text-black transition">
              {t("common.see")}
            </a>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition shrink-0 text-slate-400 hover:text-slate-700">
          ✕
        </button>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const r = role.toLowerCase();
  if (r === "super-admin")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-theme-primary text-white">
        Super Admin
      </span>
    );
  if (r === "admin" || r === "manager")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-theme-light text-theme-primary border border-theme-light">
        {r === "admin" ? "Admin" : "Manager"}
      </span>
    );
  if (r === "provider")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 border border-orange-200">
        Prestataire
      </span>
    );
  return null;
}

export default function Navbar() {
  const router = useRouter();
  const { collapsed } = useSidebar();
  const { t } = useLanguage();
  const leftOffset = collapsed ? "left-16" : "left-64";
  const widthCalc  = collapsed ? "w-[calc(100%-4rem)]" : "w-[calc(100%-16rem)]";
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [role,      setRole]      = useState("");
  const [notifRoute, setNotifRoute] = useState("#");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [banner, setBanner] = useState<{ title: string; body: string; href?: string } | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const currentRole = authService.getRole();
    setFirstName(authService.getFirstName());
    setLastName(authService.getLastName());
    setRole(currentRole);
    setNotifRoute(getNotificationsRoute(currentRole));
    // Charger la photo de profil depuis localStorage ou l'API
    const storedPic = localStorage.getItem("profile_picture_url");
    if (storedPic) setProfilePicture(storedPic);
    else {
      const prefix = getApiPrefix(currentRole);
      if (currentRole && authService.isAuthenticated()) {
        api.get(getMeEndpoint(currentRole)).then(res => {
          const data = res.data?.data ?? res.data;
          // Le back retourne `url` via l'accesseur getUrlAttribute() sur Admin/User
          const picUrl = data?.url ?? null;
          if (picUrl) {
            setProfilePicture(picUrl);
            localStorage.setItem("profile_picture_url", picUrl);
          } else {
            // Pas de photo — s'assurer que localStorage ne contient rien
            localStorage.removeItem("profile_picture_url");
            setProfilePicture(null);
          }
        }).catch(() => {
          localStorage.removeItem("profile_picture_url");
          setProfilePicture(null);
        });
      }
    }

    // Écoute les changements de photo de profil depuis d'autres onglets (StorageEvent)
    // OU via un événement personnalisé dans le même onglet (profile-picture-updated)
    const handleUpdate = (e: any) => {
      const isStorage = e instanceof StorageEvent;
      const newUrl = isStorage 
        ? (e.key === "profile_picture_url" ? e.newValue : null) 
        : e.detail?.url;

      if (newUrl) {
        // On ajoute un timestamp pour éviter le cache navigateur si l'URL est identique
        const separator = newUrl.includes('?') ? '&' : '?';
        const finalUrl = `${newUrl}${separator}t=${Date.now()}`;
        setProfilePicture(finalUrl);
      }
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("profile-picture-updated" as any, handleUpdate);
    
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("profile-picture-updated" as any, handleUpdate);
    };
  }, []);



  // Polling notifications - 15s si page active, 60s si en arrière-plan
  const fetchUnread = useCallback(async () => {
    const currentRole = authService.getRole();
    if (!currentRole || !authService.isAuthenticated()) return;
    const prefix = getApiPrefix(currentRole);
    try {
      const { data } = await api.get(`${prefix}/notifications/unread`);
      const items: any[] = Array.isArray(data?.data?.data)
        ? data.data.data
        : Array.isArray(data?.data) ? data.data : [];
      const count = items.length;

      // Nouvelle notif détectée
      if (count > prevCountRef.current && prevCountRef.current > 0) {
        const newest = items[0];
        const notifData = newest?.data ?? {};
        const title = notifData.title || notifData.message || "Nouvelle notification";
        const body  = notifData.body  || notifData.summary || notifData.message || "";
        const href  = notifData.href  || notifData.action_url;

        setBanner({ title, body, href });

        // Son discret via Web Audio API (pas besoin de fichier audio)
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
      }

      prevCountRef.current = count;
      setUnreadCount(count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();

    // Polling adaptatif : 15s si visible, 60s si caché
    let interval = setInterval(fetchUnread, 15_000);

    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === "visible") {
        fetchUnread(); // fetch immédiat au retour
        interval = setInterval(fetchUnread, 15_000);
      } else {
        interval = setInterval(fetchUnread, 60_000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchUnread]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const getInitials = () =>
    firstName || lastName
      ? `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
      : "?";

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Utilisateur";

  return (
    <>
      {/* Bande notif in-app */}
      {banner && (
        <InAppBanner
          title={banner.title}
          body={banner.body}
          href={banner.href}
          onClose={() => setBanner(null)}
        />
      )}

      <header className={`fixed top-0 ${leftOffset} ${widthCalc} flex justify-between items-center px-4 py-3 bg-white shadow border-b border-gray-200 z-30 transition-all duration-300`}>

        {/* Infos utilisateur */}
        <div className="flex items-center gap-4">
          <Link
            href={role === "MANAGER" ? "/manager/profile" : role === "PROVIDER" ? "/provider/profile" : "/admin/profile"}
            className="w-10 h-10 rounded-full bg-theme-primary text-white font-black flex items-center justify-center text-sm tracking-wide shrink-0 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
            title="Voir mon profil"
          >
            {profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePicture} alt="Profil" className="object-cover w-full h-full" />
            ) : (
              getInitials()
            )}
          </Link>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <p className="text-gray-900 font-bold text-sm leading-tight">Bienvenue, {fullName} </p>
              <RoleBadge role={role} />
            </div>
            <p className="text-gray-500 text-xs font-medium">
              {t("nav.dashboard")}
            </p>
          </div>
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-3">

          {/* Cloche notifications */}
          <button
            onClick={() => setIsPanelOpen(true)}
            className="relative flex items-center gap-2.5 px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all"
          >
            <div className="relative">
              <Bell
                size={20}
                className={`transition-colors ${unreadCount > 0 ? "text-slate-900" : "text-slate-400"}`}
                strokeWidth={unreadCount > 0 ? 2.5 : 2}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-700">
              {t("notifications.title")}
            </span>
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Panel notifications */}
      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => { setIsPanelOpen(false); fetchUnread(); }}
      />

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
