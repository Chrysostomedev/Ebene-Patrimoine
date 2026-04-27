"use client";

import { useState, useEffect } from "react";
import {
  Eye, ShieldCheck, User, Users, UserCog, Wrench,
  X, Lock, Unlock, Mail, Phone, MapPin, Calendar,
  CheckCircle2, Shield, Key, Building2,
  UserPlus, EyeOff, Eye as EyeIcon,
} from "lucide-react";
import axiosInstance from "../../../core/axios";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

// ══════════════════════════════════════
// DONNÉES STATIQUES
// ══════════════════════════════════════

const ROLES_CONFIG: Record<string, {
  label: string; badge: string; dot: string; icon: any; count: number; description: string;
  permissions: string[];
}> = {
  "super-admin": {
    label: "Super Administrateur", badge: "bg-slate-900 text-white", dot: "bg-white",
    icon: ShieldCheck, count: 1,
    description: "Accès total à toutes les fonctionnalités de la plateforme.",
    permissions: ["Gestion des rôles", "Gestion des utilisateurs", "Tous les modules", "Paramètres système", "Logs & Traçabilité"],
  },
  "admin": {
    label: "Administrateur", badge: "bg-slate-100 text-slate-800 border border-slate-200", dot: "bg-slate-700",
    icon: UserCog, count: 3,
    description: "Accès à la gestion opérationnelle complète hors rôles.",
    permissions: ["Tickets", "Patrimoines", "Devis", "Factures", "Rapports", "Planning"],
  },
  "manager": {
    label: "Manager", badge: "bg-blue-50 text-blue-800 border border-blue-200", dot: "bg-blue-600",
    icon: Users, count: 5,
    description: "Supervision des opérations et validation des interventions.",
    permissions: ["Tickets (lecture + validation)", "Planning", "Rapports", "Prestataires"],
  },
  "provider": {
    label: "Prestataire", badge: "bg-emerald-50 text-emerald-800 border border-emerald-200", dot: "bg-emerald-600",
    icon: Wrench, count: 14,
    description: "Accès limité aux missions assignées et aux devis.",
    permissions: ["Ses tickets assignés", "Ses devis", "Ses rapports d'intervention"],
  },
};

const USERS_DATA = [
  { id: 1,  name: "Konan Yves",          role: "super-admin", site: "Siège Abidjan",   phone: "+225 07 00 00 01", email: "konan.yves@canalci.com",      status: "active",   joined: "12/01/2024" },
  { id: 2,  name: "Adjoua Marie",        role: "admin",       site: "Siège Abidjan",   phone: "+225 07 00 00 02", email: "adjoua.marie@canalci.com",    status: "active",   joined: "03/03/2024" },
  { id: 3,  name: "Bamba Moussa",        role: "admin",       site: "Antenne Bouaké",  phone: "+225 07 00 00 03", email: "bamba.moussa@canalci.com",    status: "active",   joined: "15/04/2024" },
  { id: 4,  name: "Coulibaly Fatou",     role: "admin",       site: "Antenne Daloa",   phone: "+225 07 00 00 04", email: "coulibaly.fatou@canalci.com", status: "inactive", joined: "20/05/2024" },
  { id: 5,  name: "Diallo Ibrahim",      role: "manager",     site: "Siège Abidjan",   phone: "+225 07 00 00 05", email: "diallo.ibrahim@canalci.com",  status: "active",   joined: "01/06/2024" },
  { id: 6,  name: "Sanogo Aminata",      role: "manager",     site: "Antenne Bouaké",  phone: "+225 07 00 00 06", email: "sanogo.aminata@canalci.com",  status: "active",   joined: "14/06/2024" },
  { id: 7,  name: "Touré Koffi",         role: "manager",     site: "Store Plateau",   phone: "+225 07 00 00 07", email: "toure.koffi@canalci.com",     status: "active",   joined: "22/07/2024" },
  { id: 8,  name: "Ouattara Salimata",   role: "manager",     site: "Antenne Daloa",   phone: "+225 07 00 00 08", email: "ouattara.salimata@canalci.com",status: "active",  joined: "30/07/2024" },
  { id: 9,  name: "N'Guessan Paul",      role: "manager",     site: "Store Marcory",   phone: "+225 07 00 00 09", email: "nguessan.paul@canalci.com",   status: "inactive", joined: "10/08/2024" },
  { id: 10, name: "BAT Tech SARL",       role: "provider",    site: "Siège Abidjan",   phone: "+225 07 10 00 01", email: "contact@battech.ci",          status: "active",   joined: "05/02/2024" },
  { id: 11, name: "ElectroPro CI",       role: "provider",    site: "Antenne Bouaké",  phone: "+225 07 10 00 02", email: "contact@electropro.ci",       status: "active",   joined: "18/02/2024" },
  { id: 12, name: "ClimaCool Services",  role: "provider",    site: "Store Plateau",   phone: "+225 07 10 00 03", email: "admin@climacool.ci",           status: "active",   joined: "27/03/2024" },
  { id: 13, name: "Réseau Expert CI",    role: "provider",    site: "Store Marcory",   phone: "+225 07 10 00 04", email: "info@reseauexpert.ci",         status: "inactive", joined: "09/04/2024" },
  { id: 14, name: "MaintenancePro",      role: "provider",    site: "Antenne Daloa",   phone: "+225 07 10 00 05", email: "mpro@mpro.ci",                 status: "active",   joined: "15/05/2024" },
  { id: 15, name: "InfoSystems CI",      role: "provider",    site: "Siège Abidjan",   phone: "+225 07 10 00 06", email: "is@infosystems.ci",            status: "active",   joined: "01/06/2024" },
  { id: 16, name: "Sécurité Plus",       role: "provider",    site: "Antenne Bouaké",  phone: "+225 07 10 00 07", email: "contact@secplus.ci",           status: "active",   joined: "20/06/2024" },
  { id: 17, name: "GTM Bâtiment",        role: "provider",    site: "Store Plateau",   phone: "+225 07 10 00 08", email: "gtm@gtm.ci",                   status: "inactive", joined: "11/07/2024" },
  { id: 18, name: "TechServ International", role: "provider", site: "Siège Abidjan",   phone: "+225 07 10 00 09", email: "ts@techserv.ci",              status: "active",   joined: "05/08/2024" },
  { id: 19, name: "AquaFroid CI",        role: "provider",    site: "Store Marcory",   phone: "+225 07 10 00 10", email: "af@aquafroid.ci",              status: "active",   joined: "19/08/2024" },
  { id: 20, name: "MultiTech Solutions", role: "provider",    site: "Antenne Daloa",   phone: "+225 07 10 00 11", email: "mt@multitech.ci",              status: "active",   joined: "01/09/2024" },
  { id: 21, name: "PowerSafe CI",        role: "provider",    site: "Siège Abidjan",   phone: "+225 07 10 00 12", email: "ps@powersafe.ci",              status: "active",   joined: "15/09/2024" },
  { id: 22, name: "DataNet Services",    role: "provider",    site: "Antenne Bouaké",  phone: "+225 07 10 00 13", email: "dn@datanet.ci",                status: "inactive", joined: "28/09/2024" },
  { id: 23, name: "VentilPro",           role: "provider",    site: "Store Plateau",   phone: "+225 07 10 00 14", email: "vp@ventilpro.ci",             status: "active",   joined: "10/10/2024" },
];

type User = typeof USERS_DATA[0];

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLES_CONFIG[role];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
      status === "active"
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-slate-100 text-slate-500 border border-slate-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status === "active" ? "Actif" : "Inactif"}
    </span>
  );
}

// ══════════════════════════════════════
// SIDE PANEL UTILISATEUR
// ══════════════════════════════════════

function UserSidePanel({ user, onClose, onToggleStatus }: {
  user: User | null; onClose: () => void;
  onToggleStatus: (id: number) => void;
}) {
  if (!user) return null;
  const cfg     = ROLES_CONFIG[user.role];
  const isActive = user.status === "active";
  const Icon    = cfg?.icon ?? User;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Croix haut gauche */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Header utilisateur */}
        <div className="px-7 pt-4 pb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0">
              <span className="text-white font-black text-lg">
                {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{user.name}</h2>
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-6">

          {/* Infos de base */}
          <div className="space-y-0">
            {[
              { Icon: Mail,     label: "Email",      value: user.email },
              { Icon: Phone,    label: "Téléphone",  value: user.phone },
              { Icon: MapPin,   label: "Site",       value: user.site },
              { Icon: Calendar, label: "Membre depuis", value: user.joined },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2 text-slate-400">
                  <f.Icon size={13} />
                  <p className="text-xs font-medium">{f.label}</p>
                </div>
                <p className="text-sm font-bold text-slate-900">{f.value}</p>
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <p className="text-xs font-medium text-slate-400">Statut</p>
              <StatusBadge status={user.status} />
            </div>
          </div>

          {/* Permissions du rôle */}
          {cfg && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Key size={11} /> Permissions du rôle
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{cfg.description}</p>
                {cfg.permissions.map((perm, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-7 py-5 border-t border-slate-100 space-y-3 shrink-0">
          {/* Désactiver / Réactiver */}
          <button
            onClick={() => onToggleStatus(user.id)}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition ${
              isActive
                ? "border border-red-200 text-red-600 hover:bg-red-50"
                : "bg-slate-900 text-white hover:bg-black"
            }`}
          >
            {isActive
              ? <><Lock size={15} /> Désactiver l'utilisateur</>
              : <><Unlock size={15} /> Réactiver l'utilisateur</>
            }
          </button>

          {/* Changer le rôle
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition">
            <Shield size={15} /> Changer le rôle
          </button> */}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════
// ADD ADMIN SIDE PANEL
// POST /admin/admins - role_slug: admin | super-admin
// ══════════════════════════════════════

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", role_slug: "admin" as "admin" | "super-admin" };

function AddAdminSidePanel({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}) {
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [showPass,    setShowPass]    = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // Reset à l'ouverture
  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}); setShowPass(false); }
  }, [open]);

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())                              e.name     = "Le nom est obligatoire.";
    if (!form.email.trim())                             e.email    = "L'email est obligatoire.";
    else if (!/\S+@\S+\.\S+/.test(form.email))         e.email    = "Email invalide.";
    if (!form.phone.trim())                             e.phone    = "Le téléphone est obligatoire.";
    if (!form.password)                                 e.password = "Le mot de passe est obligatoire.";
    else if (form.password.length < 8)                  e.password = "Minimum 8 caractères.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setIsLoading(true);
    try {
      const res  = await axiosInstance.post("/admin/admins", form);
      const data = res.data?.data ?? res.data;
      onSuccess({
        id:     data.id ?? Date.now(),
        name:   form.name,
        email:  form.email,
        phone:  form.phone,
        role:   form.role_slug,
        site:   "",
        status: "active",
        joined: formatDate(new Date()),
      });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erreur lors de la création.";
      setErrors({ global: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const field = (
    key: keyof typeof EMPTY_FORM,
    label: string,
    IconComp: any,
    type: string,
    placeholder: string
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <IconComp size={10} /> {label}
      </label>
      <div className="relative">
        <input
          type={key === "password" ? (showPass ? "text" : "password") : type}
          value={form[key]}
          onChange={e => { setForm({ ...form, [key]: e.target.value }); setErrors({ ...errors, [key]: "" }); }}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 transition ${
            errors[key]
              ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200"
              : "border-slate-200 bg-slate-50 focus:border-slate-900 focus:ring-slate-900"
          } ${key === "password" ? "pr-11" : ""}`}
        />
        {key === "password" && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition"
          >
            {showPass ? <EyeOff size={15} /> : <EyeIcon size={15} />}
          </button>
        )}
      </div>
      {errors[key] && <p className="text-[11px] text-red-500 font-medium">{errors[key]}</p>}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Croix haut gauche */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Titre */}
        <div className="px-7 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900">Ajouter un administrateur</h2>
          <p className="text-slate-400 text-xs mt-0.5">Créez un compte admin ou super-admin</p>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-5">

          {/* Erreur globale */}
          {errors.global && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <X size={14} className="shrink-0" /> {errors.global}
            </div>
          )}

          {/* Sélecteur de rôle - visuels */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Shield size={10} /> Rôle
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { val: "admin",       label: "Administrateur",        Icon: UserCog,    sub: "Gestion opérationnelle"  },
                { val: "super-admin", label: "Super Administrateur",  Icon: ShieldCheck,sub: "Accès complet"           },
              ] as const).map(opt => {
                const { Icon } = opt;
                const active = form.role_slug === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setForm({ ...form, role_slug: opt.val })}
                    className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition text-left ${
                      active ? "border-slate-900 bg-slate-900" : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-white" : "text-slate-500"} />
                    <div>
                      <p className={`text-xs font-black ${active ? "text-white" : "text-slate-900"}`}>{opt.label}</p>
                      <p className={`text-[10px] ${active ? "text-white/60" : "text-slate-400"}`}>{opt.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Champs */}
          {field("name",     "Nom complet",   User,  "text",  "Diallo Ibrahim")}
          {field("email",    "Email",         Mail,  "email", "diallo@canal.ci")}
          {field("phone",    "Téléphone",     Phone, "tel",   "+225 07 01 23 45 67")}
          {field("password", "Mot de passe",  Key,   "password", "Minimum 8 caractères")}

          {/* Indicateur force mdp */}
          {form.password.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(lvl => {
                  const strength = form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? 4 : 3;
                  return (
                    <div key={lvl} className={`flex-1 h-1.5 rounded-full transition-colors ${
                      lvl <= strength
                        ? strength === 1 ? "bg-red-400" : strength === 2 ? "bg-amber-400" : strength === 3 ? "bg-blue-400" : "bg-emerald-500"
                        : "bg-slate-100"
                    }`} />
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">
                {form.password.length < 6 ? "Trop court" : form.password.length < 10 ? "Moyen" : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? "Très fort" : "Fort"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><UserPlus size={15} /> Créer l'administrateur</>
            }
          </button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════
// PAGE
// ══════════════════════════════════════

export default function RolesPage() {
  const [loading,      setLoading]      = useState(true);
  const [users,        setUsers]        = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isOpen,       setIsOpen]       = useState(false);
  const [roleFilter,   setRoleFilter]   = useState<string>("all");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalItems,   setTotalItems]   = useState(0);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const { toast } = useToast();
  const [stats,        setStats]        = useState({ total: 0, admins: 0, managers: 0, providers: 0 });

  const PER_PAGE = 10;


  const fetchStats = async () => {
    try {
      // Récupère les vraies stats depuis les endpoints dédiés
      const [adminsRes, providersRes] = await Promise.allSettled([
        axiosInstance.get("/admin/admins", { params: { per_page: 1, page: 1 } }),
        axiosInstance.get("/admin/providers/stats"),
      ]);

      // Admins depuis /admin/admins (inclut tous les rôles admin/manager/super-admin)
      let superAdmins = 0, adminsCount = 0, managersCount = 0;
      if (adminsRes.status === "fulfilled") {
        const d = adminsRes.value.data?.data;
        // Essaie d'abord /admin/roles/stats pour la répartition
        try {
          const rolesRes = await axiosInstance.get("/admin/roles/stats");
          const arr: any[] = rolesRes.data?.data ?? [];
          const get = (name: string) => arr.find((r: any) =>
            (r.role_name ?? r.slug ?? "").toUpperCase() === name.toUpperCase()
          )?.user_count ?? 0;
          superAdmins  = get("SUPER-ADMIN");
          adminsCount  = get("ADMIN") + superAdmins;
          managersCount = get("MANAGER");
        } catch {
          // Fallback : total depuis meta
          const total = d?.meta?.total ?? 0;
          adminsCount = total;
        }
      }

      // Providers depuis /admin/providers/stats
      let providers = 0;
      if (providersRes.status === "fulfilled") {
        providers = providersRes.value.data?.data?.total_providers ?? 0;
      }

      setStats({
        total:    adminsCount + managersCount + providers,
        admins:   adminsCount,
        managers: managersCount,
        providers,
      });
    } catch (e) {
      console.error("Stats error", e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let items: any[] = [];
      let lastPage = 1;
      let total = 0;

      if (roleFilter === "provider") {
        // Prestataires → /admin/providers
        const res = await axiosInstance.get("/admin/providers", {
          params: { page: currentPage, per_page: PER_PAGE },
        });
        const d = res.data?.data ?? res.data;
        const raw: any[] = Array.isArray(d?.items) ? d.items
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d) ? d : [];
        lastPage = d?.meta?.last_page ?? d?.last_page ?? 1;
        total    = d?.meta?.total    ?? d?.total    ?? raw.length;
        items = raw.map((u: any) => ({
          id:     u.id,
          name:   u.company_name ?? `Prestataire #${u.id}`,
          role:   "provider",
          phone:  u.phone ?? u.user?.phone ?? "",
          email:  u.email ?? u.user?.email ?? "",
          status: u.is_active ? "active" : "inactive",
          joined: formatDate(u.created_at),
        }));

      } else {
        // Admins / Managers / Super-Admin → /admin/admins?role_slug=...
        const roleSlugMap: Record<string, string> = {
          "admin":       "ADMIN",
          "super-admin": "SUPER-ADMIN",
          "manager":     "MANAGER",
        };
        const params: any = { page: currentPage, per_page: PER_PAGE };
        if (roleFilter !== "all") params.role_slug = roleSlugMap[roleFilter] ?? roleFilter.toUpperCase();

        const res = await axiosInstance.get("/admin/admins", { params });
        const d = res.data?.data ?? res.data;
        const raw: any[] = Array.isArray(d?.items) ? d.items
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d) ? d : [];
        lastPage = d?.meta?.last_page ?? d?.last_page ?? 1;
        total    = d?.meta?.total    ?? d?.total    ?? raw.length;
        items = raw.map((u: any) => {
          const roleName = (u.roles?.[0]?.name ?? u.role_name ?? "").toLowerCase();
          return {
            id:     u.id,
            name:   [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || `#${u.id}`,
            role:   roleName || (roleFilter !== "all" ? roleFilter : "admin"),
            phone:  u.phone_number ?? u.phone ?? "",
            email:  u.email ?? "",
            status: (u.is_active === true || u.is_active === 1 || u.status === "active" || u.status === "actif") ? "active" : "inactive",
            joined: formatDate(u.created_at),
          };
        });
      }

      setUsers(items);
      setTotalPages(lastPage);
      setTotalItems(total);
    } catch (e) {
      console.error("Fetch users error", e);
      toast.error("Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, currentPage]);

  const handleAdminCreated = (newUser: any) => {
    fetchUsers();
    fetchStats();
    toast.success(`Administrateur créé avec succès.`);
  };

  const handleToggleStatus = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const isProvider = user.role === "provider";
    const isActive = user.status === "active";
    const action = isActive ? "desactivate" : "activate";

    try {
      if (isProvider) {
        await axiosInstance.put(`/admin/providers/${action}/${id}`);
      } else {
        // Pour les autres on update le status si l'API le permet, sinon message
        await axiosInstance.put(`/admin/admins/${id}`, { status: isActive ? "inactive" : "active" });
      }
      
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, status: isActive ? "inactive" : "active" } : u
      ));
      if (selectedUser?.id === id) {
        setSelectedUser({ ...selectedUser, status: isActive ? "inactive" : "active" });
      }
      toast.success(`Statut mis à jour.`);
    } catch (e) {
      toast.error("Erreur lors de la mise à jour du statut.");
    }
  };

  const kpis = [
    { label: "Utilisateurs au total", value: stats.total,    delta: "",  trend: "up" as const },
    { label: "Administrateurs",        value: stats.admins,   delta: "",  trend: "up" as const },
    { label: "Managers",               value: stats.managers, delta: "",  trend: "up" as const },
    { label: "Prestataires",           value: stats.providers,delta: "",  trend: "up" as const },
  ];

  const ROLE_FILTERS = [
    { key: "all",        label: "Tous" },
    { key: "super-admin",label: "Super Admin" },
    { key: "admin",      label: "Admins" },
    { key: "manager",    label: "Managers" },
    { key: "provider",   label: "Prestataires" },
  ];

  const handleRoleFilter = (key: string) => { setRoleFilter(key); setCurrentPage(1); };

  const columns = [
    {
      header: "Utilisateur", key: "name",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-white">
              {row.name.split(" ").map((n:string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{row.name}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Rôle", key: "role",
      render: (_: any, row: any) => <RoleBadge role={row.role} />,
    },
    // {
    //   header: "Site / Entreprise", key: "site",
    //   render: (_: any, row: any) => (
    //     <div className="flex items-center gap-1.5 text-slate-600 text-sm">
    //       <Building2 size={13} className="text-slate-400" />
    //       {row.site}
    //     </div>
    //   ),
    // },
    {
      header: "Téléphone", key: "phone",
      render: (_: any, row: any) => <span className="text-sm text-slate-600">{row.phone}</span>,
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Membre depuis", key: "joined",
      render: (_: any, row: any) => <span className="text-xs text-slate-500">{row.joined}</span>,
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => { setSelectedUser(row); setIsOpen(true); }}
          className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition"
        >
          <Eye size={18} /> Aperçu
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <main className="mt-20 p-6 space-y-8">
          <PageHeader
            title="Gestion des rôles & Utilisateurs"
            subtitle="Gérez les rôles, permissions et accès de tous les utilisateurs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {ROLE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => handleRoleFilter(f.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                    roleFilter === f.key
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {loading && <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />}
              <p className="text-sm text-slate-400 font-medium">
                {totalItems} utilisateur{totalItems > 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setAddAdminOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <UserPlus size={15} />
                Ajouter un administrateur
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
            {loading && users.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-sm font-medium italic">Chargement des utilisateurs...</p>
              </div>
            ) : (
              <>
                <DataTable title="Liste des utilisateurs" columns={columns} data={users} onViewAll={() => {}} />
                {users.length === 0 && !loading && (
                   <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                     <Users size={40} className="text-slate-100 mb-2" />
                     <p className="text-sm font-medium italic">Aucun utilisateur trouvé pour ce filtre.</p>
                   </div>
                )}
                <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <p className="text-xs text-slate-400">
                    Page {currentPage} sur {totalPages || 1} · {totalItems} utilisateurs
                  </p>
                  <Paginate currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
                </div>
              </>
            )}
          </div>

          <UserSidePanel
            user={isOpen ? selectedUser : null}
            onClose={() => { setIsOpen(false); setSelectedUser(null); }}
            onToggleStatus={handleToggleStatus}
          />

          <AddAdminSidePanel
            open={addAdminOpen}
            onClose={() => setAddAdminOpen(false)}
            onSuccess={handleAdminCreated}
          />

        </main>
      </div>
  );
}