/**
 * components/Sidebar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sidebar unique — menu filtré dynamiquement selon le rôle de l'utilisateur.
 *
 * Rôles & accès :
 *   SUPER-ADMIN → tous les menus admin + Gestion des rôles
 *   ADMIN       → tous les menus admin SAUF Gestion des rôles
 *   PROVIDER    → /provider/* (dashboard, tickets, planning, devis, factures, rapports, notifications)
 *   MANAGER     → /manager/* (dashboard, sites/détail, patrimoines, planning, prestataires, devis, factures, rapports, notifications)
 *
 * Structure :
 *   - MENU_BY_ROLE   : items principaux par rôle
 *   - BOTTOM_BY_ROLE : items bas de sidebar (paramètres, rôles) par rôle
 *   - NavItem        : composant récursif inchangé
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { authService, UserRole } from "../../services/AuthService";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard, Settings, LogOut, Building2, Users, Grid,
  ChevronDown, PieChart, Ticket, Calendar, Shield,
  FileText, FileSignature, AlertTriangle,
  ChartNoAxesColumnIncreasing, MapPinHouse, Users2,
  Building2Icon, Layers, FolderSync, Bell,
} from "lucide-react";

// ─── Type MenuItem ────────────────────────────────────────────────────────────
interface MenuItem {
  label: string;
  icon: JSX.Element;
  href?: string;
  subItems?: MenuItem[];
}

// ─── Menus principaux par rôle ────────────────────────────────────────────────

/** SUPER-ADMIN & ADMIN — même structure, le filtre "Gestion des rôles" se fait dans bottomItems */
const MENU_ADMIN: MenuItem[] = [
  {
    label: "Tableau de bord",
    icon: <LayoutDashboard size={20} />,
    href: "/admin/dashboard",
  },
  {
    label: "Administration",
    icon: <MapPinHouse size={20} />,
    href: "/admin/administration",
    subItems: [
      { label: "Tickets",   icon: <Ticket size={20} />,   href: "/admin/tickets"   },
      {
        label: "Patrimoines",
        icon: <Building2 size={20} />,
        href: "/admin/patrimoines",
        subItems: [
          { label: "Types",      icon: <Building2Icon size={18} />, href: "/admin/patrimoines/type"      },
          { label: "Sous-types", icon: <Building2 size={18} />,     href: "/admin/patrimoines/sous_type" },
        ],
      },
      { label: "Sites",               icon: <MapPinHouse size={20} />,                 href: "/admin/sites"        },
      { label: "Planning",            icon: <Calendar size={20} />,                    href: "/admin/planning"     },
      { label: "Prestataires",        icon: <Users size={20} />,                       href: "/admin/prestataires" },
      { label: "Devis",               icon: <FileSignature size={20} />,               href: "/admin/devis"        },
      { label: "Factures",            icon: <FileText size={20} />,                    href: "/admin/factures"     },
      { label: "Rapports",            icon: <ChartNoAxesColumnIncreasing size={20} />, href: "/admin/rapports"     },
      { label: "Services",            icon: <Layers size={20} />,                      href: "/admin/services"     },
      { label: "Transfert inter-sites", icon: <FolderSync size={20} />,                href: "/admin/transfert"    },
    ],
  },
  {
    label: "Gestionnaires",
    icon: <Grid size={20} />,
    href: "/admin/gestionnaires",
    subItems: [{ label: "Vue globale", icon: <PieChart size={20} />, href: "#" }],
  },
  {
    label: "Prestataires",
    icon: <Users size={20} />,
    href: "/admin/prestataires",
    subItems: [{ label: "Details prestataires", icon: <Users2 size={20} />, href: "#" }],
  },
];

/** PROVIDER — ses propres pages uniquement */
const MENU_PROVIDER: MenuItem[] = [
  { label: "Tableau de bord",  icon: <LayoutDashboard size={20} />,                href: "/provider/dashboard"      },
  { label: "Tickets",          icon: <Ticket size={20} />,                         href: "/provider/tickets"        },
  { label: "Planning",         icon: <Calendar size={20} />,                       href: "/provider/planning"       },
  { label: "Devis",            icon: <FileSignature size={20} />,                  href: "/provider/devis"          },
  { label: "Factures",         icon: <FileText size={20} />,                       href: "/provider/factures"       },
  { label: "Rapports",         icon: <ChartNoAxesColumnIncreasing size={20} />,    href: "/provider/rapports"       },
  { label: "Notifications",    icon: <Bell size={20} />,                           href: "/provider/notifications"  },
];

/**
 * MANAGER — accès restreint à ses sites/patrimoines/planning/etc.
 * Sites → page détail (pas la liste globale) : /manager/sites
 * Patrimoines → sans les sous-menus Type / Sous-type (gestion globale)
 */
const MENU_MANAGER: MenuItem[] = [
  { label: "Tableau de bord",  icon: <LayoutDashboard size={20} />,                href: "/manager/dashboard"       },
  // {
  //   label: "Sites",
  //   icon: <MapPinHouse size={20} />,
  //   href: "#",
  //   // Le manager voit ses propres sites — la page /manager/sites filtre côté back
  // },
  {
    label: "Patrimoines",
    icon: <Building2 size={20} />,
    href: "/manager/patrimoines",
    // Pas de sous-menus Type / Sous-type — réservés aux admins
  },
  { label: "Planning",         icon: <Calendar size={20} />,                       href: "/manager/planning"        },
  { label: "Prestataires",     icon: <Users size={20} />,                          href: "/manager/prestataires"    },
  { label: "Devis",            icon: <FileSignature size={20} />,                  href: "/manager/devis"           },
  { label: "Factures",         icon: <FileText size={20} />,                       href: "/manager/factures"        },
  { label: "Rapports",         icon: <ChartNoAxesColumnIncreasing size={20} />,    href: "/manager/rapports"        },
  { label: "Notifications",    icon: <Bell size={20} />,                           href: "/manager/notifications"   },
];

// ─── Items bas de sidebar par rôle ────────────────────────────────────────────

interface BottomItem {
  label: string;
  href: string;
  icon: JSX.Element;
}

/** SUPER-ADMIN : paramètres + gestion des rôles */
const BOTTOM_SUPER_ADMIN: BottomItem[] = [
  { label: "Gestion des rôles", href: "/admin/roles",      icon: <Shield size={20} />   },
  { label: "Paramètres",        href: "/admin/parametres", icon: <Settings size={20} /> },
];

/** ADMIN : paramètres uniquement (pas de gestion des rôles) */
const BOTTOM_ADMIN: BottomItem[] = [
  { label: "Paramètres", href: "/admin/parametres", icon: <Settings size={20} /> },
];

/** PROVIDER */
const BOTTOM_PROVIDER: BottomItem[] = [
  { label: "Paramètres", href: "/provider/parametre", icon: <Settings size={20} /> },
];

/** MANAGER */
const BOTTOM_MANAGER: BottomItem[] = [
  { label: "Paramètres", href: "/manager/parametres", icon: <Settings size={20} /> },
];

// ─── Mapping rôle → menus ─────────────────────────────────────────────────────
const getMenuByRole = (role: string): MenuItem[] => {
  switch (role) {
    case "SUPER-ADMIN": return MENU_ADMIN;
    case "ADMIN":       return MENU_ADMIN;
    case "PROVIDER":    return MENU_PROVIDER;
    case "MANAGER":     return MENU_MANAGER;
    default:            return [];
  }
};

const getBottomByRole = (role: string): BottomItem[] => {
  switch (role) {
    case "SUPER-ADMIN": return BOTTOM_SUPER_ADMIN;
    case "ADMIN":       return BOTTOM_ADMIN;
    case "PROVIDER":    return BOTTOM_PROVIDER;
    case "MANAGER":     return BOTTOM_MANAGER;
    default:            return [];
  }
};

// ─── Composant ────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  // Rôle lu depuis le localStorage — stable après hydratation
  const [role,           setRole]           = useState<string>("");
  const [menuItems,      setMenuItems]      = useState<MenuItem[]>([]);
  const [bottomItems,    setBottomItems]    = useState<BottomItem[]>([]);
  const [expandedMenus,  setExpandedMenus]  = useState<string[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Initialisation : lecture du rôle et construction des menus ──────────────
  useEffect(() => {
    const currentRole = authService.getRole();
    setRole(currentRole);
    setMenuItems(getMenuByRole(currentRole));
    setBottomItems(getBottomByRole(currentRole));
  }, []);

  // ── Auto-expansion du menu actif ────────────────────────────────────────────
  useEffect(() => {
    if (!menuItems.length) return;

    const findActiveParents = (items: MenuItem[], parents: string[] = []): string[] => {
      for (const item of items) {
        if (item.href && item.href === pathname) return parents;
        if (item.subItems) {
          const result = findActiveParents(item.subItems, [...parents, item.label]);
          if (result.length) return result;
        }
      }
      return [];
    };

    setExpandedMenus(findActiveParents(menuItems));
  }, [pathname, menuItems]);

  const toggleSubMenu = (label: string) =>
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      // authService.logout() nettoie le localStorage ET redirige vers /login
      await authService.logout();
    } catch {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  // ─── NavItem récursif — inchangé ─────────────────────────────────────────
  const NavItem = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const checkActive = (it: MenuItem): boolean =>
      (!!it.href && isActive(it.href)) || (it.subItems?.some(checkActive) ?? false);

    const active     = checkActive(item);
    const isExpanded = expandedMenus.includes(item.label);

    return (
      <div className="w-full">
        <div
          className={`flex items-center w-full rounded-xl transition-all duration-200 ${
            active && !hasSubItems
              ? "bg-theme-primary text-white shadow-md"
              : active && hasSubItems
              ? "text-theme-primary bg-theme-light"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Link
            href={item.href || "#"}
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 font-medium text-[15px] ${depth > 0 ? "pl-4" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>

          {hasSubItems && (
            <button
              onClick={e => { e.preventDefault(); toggleSubMenu(item.label); }}
              className={`px-3 py-2.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>

        {hasSubItems && isExpanded && (
          <div className="ml-4 mt-1 border-l-2 border-gray-100 pl-2 space-y-1 animate-in slide-in-from-top-1">
            {item.subItems?.map(sub => (
              <NavItem key={sub.label} item={sub} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <>
      <aside className="fixed top-0 left-0 w-64 h-screen bg-white shadow-lg border-r border-gray-200 flex flex-col z-40">

        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-center">
          <Image src="/images/logo-poste.png" alt="CANAL+" width={150} height={20} priority />
        </div>

        {/* Menu principal */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {menuItems.map(item => (
            <NavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Menu bas */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {bottomItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-[15px] ${
                  active
                    ? "bg-theme-primary text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Déconnexion — présent pour tous les rôles */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-[15px]"
          >
            <LogOut size={20} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* ── Modale déconnexion — inchangée ─────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative bg-white w-[90%] max-w-lg rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={38} strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Déconnexion de votre compte
              </h2>
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