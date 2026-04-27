/**
 * components/Sidebar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sidebar unique - menu filtré dynamiquement selon le rôle de l'utilisateur.
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

import React, { useState, useEffect, useMemo, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { authService } from "../../services/AuthService";
import type { UserRole } from "../../services/AuthService";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard, Settings, LogOut, Building2, Users,
  ChevronDown, Ticket, Calendar, Shield,
  FileText, FileSignature, AlertTriangle,
  ChartNoAxesColumnIncreasing, MapPinHouse,
  Layers, FolderSync, Bell, User as UserIcon, UserCog,
  ChevronLeft, Menu,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

// ─── Sidebar Context ──────────────────────────────────────────────────────────

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    return { collapsed: false, setCollapsed: () => { }, toggleSidebar: () => { } };
  }
  return context;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  icon: ReactNode;
  href?: string;
  subItems?: MenuItem[];
}

interface BottomItem {
  label: string;
  href: string;
  icon: ReactNode;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebar();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<string>("");
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Initialisation : lecture du rôle ────────────────────────────────────────
  useEffect(() => {
    setRole(authService.getRole());
  }, []);

  // ── Build menus dynamically with translations ────────────────────────────────

  const buildMenuAdmin = (): MenuItem[] => [
    { label: t("nav.dashboard"), icon: <LayoutDashboard size={20} />, href: "/admin/dashboard" },
    {
      label: t("nav.administration"),
      icon: <MapPinHouse size={20} />,
      href: "/admin/administration",
      subItems: [
        { label: t("nav.tickets"), icon: <Ticket size={20} />, href: "/admin/tickets" },
        {
          label: t("nav.patrimoines"),
          icon: <Building2 size={20} />,
          href: "/admin/patrimoines",
          subItems: [
            { label: t("nav.types"), icon: <Building2 size={18} />, href: "/admin/patrimoines/type" },
            { label: t("nav.subtypes"), icon: <Building2 size={18} />, href: "/admin/patrimoines/sous_type" },
          ],
        },
        { label: t("nav.sites"), icon: <MapPinHouse size={20} />, href: "/admin/sites" },
        { label: t("nav.planning"), icon: <Calendar size={20} />, href: "/admin/planning" },
        { label: t("nav.entretien"), icon: <Calendar size={20} />, href: "/admin/entretien" },
        // { label: t("nav.prestataires"), icon: <Users size={20} />,                         href: "/admin/prestataires" },
        { label: t("nav.devis"), icon: <FileSignature size={20} />, href: "/admin/devis" },
        { label: t("nav.factures"), icon: <FileText size={20} />, href: "/admin/factures" },
        { label: t("nav.rapports"), icon: <ChartNoAxesColumnIncreasing size={20} />, href: "/admin/rapports" },
        { label: t("nav.services"), icon: <Layers size={20} />, href: "/admin/services" },
        { label: t("nav.transfert"), icon: <FolderSync size={20} />, href: "/admin/transfert" },
      ],
    },
    { label: t("nav.gestionnaires"), icon: <UserCog size={20} />, href: "/admin/gestionnaires" },
    { label: t("nav.prestataires"), icon: <Users size={20} />, href: "/admin/prestataires" },
  ];

  const buildMenuSuperAdmin = (): MenuItem[] => [
    ...buildMenuAdmin().slice(0, 2),
    { label: t("nav.gestionnaires"), icon: <UserCog size={20} />, href: "/admin/gestionnaires" },
    { label: t("nav.prestataires"), icon: <Users size={20} />, href: "/admin/prestataires" },
  ];

  const buildMenuProvider = (): MenuItem[] => [
    { label: t("nav.dashboard"), icon: <LayoutDashboard size={20} />, href: "/provider/dashboard" },
    { label: t("nav.tickets"), icon: <Ticket size={20} />, href: "/provider/tickets" },
    { label: t("nav.planning"), icon: <Calendar size={20} />, href: "/provider/planning" },
    { label: t("nav.devis"), icon: <FileSignature size={20} />, href: "/provider/devis" },
    { label: t("nav.factures"), icon: <FileText size={20} />, href: "/provider/factures" },
    { label: t("nav.rapports"), icon: <ChartNoAxesColumnIncreasing size={20} />, href: "/provider/rapports" },
    { label: t("nav.entretien"), icon: <Calendar size={20} />, href: "/provider/entretien" },
    { label: t("nav.notifications"), icon: <Bell size={20} />, href: "/provider/notifications" },
  ];

  const buildMenuManager = (): MenuItem[] => [
    { label: t("nav.dashboard"), icon: <LayoutDashboard size={20} />, href: "/manager/dashboard" },
    { label: t("nav.sites"), icon: <MapPinHouse size={20} />, href: "/manager/site" },
    { label: t("nav.patrimoines"), icon: <Building2 size={20} />, href: "/manager/patrimoines" },
    { label: t("nav.tickets"), icon: <Ticket size={20} />, href: "/manager/tickets" },
    { label: t("nav.entretien"), icon: <Calendar size={20} />, href: "/manager/entretien" },
    { label: t("nav.planning"), icon: <Calendar size={20} />, href: "/manager/planning" },
    { label: t("nav.prestataires"), icon: <Users size={20} />, href: "/manager/prestataires" },
    { label: t("nav.devis"), icon: <FileSignature size={20} />, href: "/manager/devis" },
    { label: t("nav.factures"), icon: <FileText size={20} />, href: "/manager/factures" },
    { label: t("nav.rapports"), icon: <ChartNoAxesColumnIncreasing size={20} />, href: "/manager/rapports" },
    { label: t("nav.notifications"), icon: <Bell size={20} />, href: "/manager/notifications" },
  ];

  const buildBottomAdmin = (): BottomItem[] => [
    { label: t("nav.profile"), href: "/admin/profile", icon: <UserIcon size={20} /> },
    // { label: t("nav.parametres"), href: "/admin/parametres", icon: <Settings size={20} /> },
  ];

  const buildBottomSuperAdmin = (): BottomItem[] => [
    { label: t("nav.profile"), href: "/admin/profile", icon: <UserIcon size={20} /> },
    // { label: t("nav.parametres"), href: "/admin/parametres", icon: <Settings size={20} /> },
    { label: t("nav.roles"), href: "/admin/roles", icon: <Shield size={20} /> },
  ];

  const buildBottomProvider = (): BottomItem[] => [
    { label: t("nav.profile"), href: "/provider/profile", icon: <UserIcon size={20} /> },
    // { label: t("nav.parametres"), href: "/provider/parametre", icon: <Settings size={20} /> },
  ];

  const buildBottomManager = (): BottomItem[] => [
    { label: t("nav.profile"), href: "/manager/profile", icon: <UserIcon size={20} /> },
    // { label: t("nav.parametres"), href: "/manager/parametres", icon: <Settings size={20} /> },
  ];

  // ── Mémoïsation des menus ────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const menuItems = useMemo((): MenuItem[] => {
    switch (role) {
      case "SUPER-ADMIN": return buildMenuSuperAdmin();
      case "ADMIN": return buildMenuAdmin();
      case "PROVIDER": return buildMenuProvider();
      case "MANAGER": return buildMenuManager();
      default: return [];
    }
  }, [role, t]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bottomItems = useMemo((): BottomItem[] => {
    switch (role) {
      case "SUPER-ADMIN": return buildBottomSuperAdmin();
      case "ADMIN": return buildBottomAdmin();
      case "PROVIDER": return buildBottomProvider();
      case "MANAGER": return buildBottomManager();
      default: return [];
    }
  }, [role, t]);

  // ── Auto-expansion du menu actif ─────────────────────────────────────────────
  useEffect(() => {
    if (!menuItems.length) return;

    const findActiveParents = (items: MenuItem[], parents: string[] = []): string[] => {
      for (const item of items) {
        const itemActive =
          item.href && item.href !== "#" && item.href.split("/").length >= 3
            ? pathname === item.href || pathname.startsWith(item.href + "/")
            : pathname === item.href;
        if (itemActive) return parents;
        if (item.subItems) {
          const result = findActiveParents(item.subItems, [...parents, item.label]);
          if (result.length) return result;
        }
      }
      return [];
    };

    setExpandedMenus(findActiveParents(menuItems));
  }, [pathname, menuItems]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const toggleSubMenu = (label: string) =>
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );

  const isActive = (href: string): boolean => {
    if (href === "/" || href === "#") return pathname === href;
    if (pathname === href) return true;
    if (href.split("/").length >= 3)
      return pathname.startsWith(href + "/") || pathname.startsWith(href);
    return false;
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  // ─── NavItem récursif ────────────────────────────────────────────────────────

  const NavItem = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const checkActive = (it: MenuItem): boolean =>
      (!!it.href && isActive(it.href)) || (it.subItems?.some(checkActive) ?? false);

    const active = checkActive(item);
    const isExpanded = expandedMenus.includes(item.label);

    return (
      <div className="w-full">
        <div
          className={`flex items-center w-full rounded-xl transition-all duration-200 ${active && !hasSubItems
            ? "bg-theme-primary text-white shadow-md"
            : active && hasSubItems
              ? "text-theme-primary bg-theme-light"
              : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Link
            href={item.href || "#"}
            onClick={(e) => {
              if (hasSubItems) {
                toggleSubMenu(item.label);
                if (!item.href || item.href === "#") {
                  e.preventDefault();
                }
              }
            }}
            className={`flex-1 flex items-center transition-all duration-200 ${collapsed ? "justify-center px-0" : "gap-3 px-3"
              } py-2.5 font-medium text-[15px] ${depth > 0 && !collapsed ? "pl-4" : ""}`}
          >
            <span className={`shrink-0 ${collapsed ? "flex items-center justify-center w-full" : ""}`}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </Link>

          {hasSubItems && !collapsed && (
            <button
              onClick={(e) => { e.preventDefault(); toggleSubMenu(item.label); }}
              className={`px-3 py-2.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>

        {hasSubItems && isExpanded && (
          <div className="ml-4 mt-1 border-l-2 border-gray-100 pl-2 space-y-1 animate-in slide-in-from-top-1">
            {item.subItems?.map((sub) => (
              <NavItem key={sub.label} item={sub} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-screen bg-white shadow-lg border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-64"
          }`}
      >
        {/* Logo & Toggle */}
        <div
          className={`px-4 py-6 border-b border-gray-100 flex items-center ${collapsed ? "justify-center" : "justify-between"
            }`}
        >
          {!collapsed && (
            <div className="flex-1 flex justify-center">
              <Image src="/images/logo_canal.png" alt="CANAL+" width={140} height={40} priority />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Menu principal */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Menu bas */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {bottomItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center transition-all font-medium text-[15px] py-2 rounded-xl ${collapsed ? "justify-center px-0" : "gap-3 px-3"
                  } ${active
                    ? "bg-theme-primary text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <span className={`shrink-0 ${collapsed ? "flex items-center justify-center w-full" : ""}`}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Déconnexion */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-[15px] ${collapsed ? "justify-center" : ""
              }`}
          >
            <LogOut size={20} />
            {!collapsed && <span>{t("nav.logout")}</span>}
          </button>
        </div>
      </aside>

      {/* Modale déconnexion */}
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
                {t("nav.disconnectTitle")}
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed font-medium px-4">
                {t("nav.disconnectMessage")}
              </p>
            </div>
            <div className="flex gap-4 w-full pt-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-6 rounded-2xl bg-theme-primary text-white font-bold hover:opacity-90 transition-all"
              >
                {t("nav.stayConnected")}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-6 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-200"
              >
                {t("nav.disconnect")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}