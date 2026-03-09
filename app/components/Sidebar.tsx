"use client";

import { authService } from "../../services/AuthService";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard, Settings, LogOut, Building2, Users, Grid,
  ChevronDown, PieChart, Ticket, Calendar, Shield,
  FileText, FileSignature, AlertTriangle,
  ChartNoAxesColumnIncreasing, MapPinHouse, Users2,
  Building2Icon, Layers, FolderSync,
} from "lucide-react";

interface MenuItem {
  label: string;
  icon: JSX.Element;
  href?: string;
  subItems?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: "Tableau de bord", icon: <LayoutDashboard size={20} />, href: "/admin/dashboard/admin" },
  {
    label: "Administration",
    icon: <MapPinHouse size={20} />,
    href: "/admin/administration",
    subItems: [
      { label: "Tickets",   icon: <Ticket size={20} />,   href: "/admin/tickets"  },
      {
        label: "Patrimoines", icon: <Building2 size={20} />, href: "/admin/patrimoines",
        subItems: [
          { label: "Types",      icon: <Building2Icon size={18} />, href: "/admin/patrimoines/type"      },
          { label: "Sous-types", icon: <Building2 size={18} />,     href: "/admin/patrimoines/sous_type" },
        ],
      },
      { label: "Sites",               icon: <MapPinHouse size={20} />,                href: "/admin/sites"      },
      { label: "Planning",            icon: <Calendar size={20} />,                   href: "/admin/planning"   },
      { label: "Prestataires",        icon: <Users size={20} />,                      href: "/admin/prestataires" },
      { label: "Devis",               icon: <FileSignature size={20} />,              href: "/admin/devis"      },
      { label: "Factures",            icon: <FileText size={20} />,                   href: "/admin/factures"   },
      { label: "Rapports",            icon: <ChartNoAxesColumnIncreasing size={20} />, href: "/admin/rapports"  },
      { label: "Services",            icon: <Layers size={20} />,                     href: "/admin/services"   },
      { label: "Transfert inter-sites", icon: <FolderSync size={20} />,               href: "/admin/transfert"  },
    ],
  },
  {
    label: "Gestionnaires", icon: <Grid size={20} />, href: "/admin/gestionnaires",
    subItems: [{ label: "Vue globale", icon: <PieChart size={20} />, href: "#" }],
  },
  {
    label: "Prestataires", icon: <Users size={20} />, href: "/admin/prestataires",
    subItems: [{ label: "Details prestataires", icon: <Users2 size={20} />, href: "#" }],
  },
];

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [expandedMenus,    setExpandedMenus]    = useState<string[]>([]);
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);

  useEffect(() => {
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
  }, [pathname]);

  const toggleSubMenu = (label: string) =>
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/admin/login");
    } catch {
      localStorage.clear();
      window.location.href = "/admin/login";
    }
  };

  const NavItem = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const checkActive = (it: MenuItem): boolean =>
      (it.href && isActive(it.href)) || (it.subItems?.some(checkActive) ?? false);
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
              className={`px-3 py-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>

        {hasSubItems && isExpanded && (
          <div className="ml-4 mt-1 border-l-2 border-gray-100 pl-2 space-y-1 animate-in slide-in-from-top-1">
            {item.subItems?.map(sub => <NavItem key={sub.label} item={sub} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const bottomItems = [
    { label: "Gestion des roles", href: "/admin/roles",      icon: <Shield size={20} />   },
    { label: "Paramètres",        href: "/admin/parametres", icon: <Settings size={20} /> },
  ];

  return (
    <>
      <aside className="fixed top-0 left-0 w-64 h-screen bg-white shadow-lg border-r border-gray-200 flex flex-col z-40">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-center">
          <Image src="/images/logoci.png" alt="CANAL+" width={180} height={50} priority />
        </div>

        {/* Menu principal */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {menuItems.map(item => <NavItem key={item.label} item={item} />)}
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
                  active ? "bg-theme-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-[15px]"
          >
            <LogOut size={20} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Modale déconnexion */}
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