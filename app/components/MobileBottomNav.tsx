"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, Calendar, Bell, User, FileText } from "lucide-react";
import { authService } from "../../services/AuthService";
import api from "../../core/axios";

const getApiPrefix = (role: string): string => {
  if (role === "MANAGER") return "/manager";
  if (role === "PROVIDER") return "/provider";
  return "/admin";
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    setRole(authService.getRole() || "");
  }, []);

  const fetchUnread = useCallback(async () => {
    const currentRole = authService.getRole();
    if (!currentRole || !authService.isAuthenticated()) return;
    const prefix = getApiPrefix(currentRole);
    try {
      const { data } = await api.get(`${prefix}/notifications/unread`);
      const items: any[] = Array.isArray(data?.data?.data)
        ? data.data.data
        : Array.isArray(data?.data) ? data.data : [];
      setUnreadCount(items.length);
    } catch (e) {
      // Échec silencieux
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  if (!role) return null;

  // Définition des boutons selon le rôle
  const navItems = [
    {
      label: "Accueil",
      href: role === "MANAGER" ? "/manager/dashboard" : role === "PROVIDER" ? "/provider/dashboard" : "/admin/dashboard",
      icon: <LayoutDashboard size={20} />,
      pattern: /dashboard/
    },
    {
      label: "Tickets",
      href: role === "MANAGER" ? "/manager/tickets" : role === "PROVIDER" ? "/provider/tickets" : "/admin/tickets",
      icon: <Ticket size={20} />,
      pattern: /tickets/
    },
    {
      label: role === "PROVIDER" ? "Planning" : "Patrimoine",
      href: role === "MANAGER" ? "/manager/patrimoines" : role === "PROVIDER" ? "/provider/planning" : "/admin/patrimoines",
      icon: role === "PROVIDER" ? <Calendar size={20} /> : <FileText size={20} />,
      pattern: role === "PROVIDER" ? /planning/ : /patrimoine/
    },
    {
      label: "Notifs",
      href: role === "MANAGER" ? "/manager/notifications" : role === "PROVIDER" ? "/provider/notifications" : "/admin/notifications",
      icon: <Bell size={20} />,
      badge: unreadCount,
      pattern: /notifications/
    },
    {
      label: "Profil",
      href: role === "MANAGER" ? "/manager/profile" : role === "PROVIDER" ? "/provider/profile" : "/admin/profile",
      icon: <User size={20} />,
      pattern: /profile/
    }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const isActive = item.pattern.test(pathname);
        return (
          <div key={item.label} className="mobile-bottom-nav__item">
            <Link
              href={item.href}
              className={`mobile-bottom-nav__btn ${isActive ? "active" : ""}`}
            >
              <div className="mobile-bottom-nav__icon-wrap">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span className="mobile-bottom-nav__badge">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
