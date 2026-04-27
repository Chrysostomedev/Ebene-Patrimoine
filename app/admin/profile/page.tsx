"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Mail, Phone, Shield, Calendar,
  Camera, Lock, CheckCircle2, AlertCircle,
  Loader2, Save, KeyRound
} from "lucide-react";
import axiosInstance from "../../../core/axios";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import { formatDate } from "@/lib/utils";
import { parseApiError } from "../../../core/error";
import { useToast } from "@/contexts/ToastContext";


export default function AdminProfilePage() {
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [profile, setProfile]   = useState<any>(null);
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name:  "",
    email:      "",
    phone:      "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password:      "",
    password:              "",
    password_confirmation: "",
  });


  const dispatchProfileUpdate = (url: string) => {
    localStorage.setItem("profile_picture_url", url);
    // StorageEvent pour les autres onglets
    window.dispatchEvent(new StorageEvent("storage", { key: "profile_picture_url", newValue: url }));
    // CustomEvent pour le même onglet (Navbar)
    window.dispatchEvent(new CustomEvent("profile-picture-updated", { detail: { url } }));
  };


  const fetchProfile = async () => {
    try {
      const res  = await axiosInstance.get("/admin/me");
      const data = res.data?.data ?? res.data;
      console.log("[AdminProfile] données reçues :", data);
      setProfile(data);
      setFormData({
        first_name: data.first_name ?? "",
        last_name:  data.last_name  ?? "",
        email:      data.email      ?? "",
        phone:      data.phone_number ?? data.phone ?? "",
      });
      if (data.url) {
        dispatchProfileUpdate(data.url);
      }
    } catch (e: any) {
      console.error("[AdminProfile] erreur fetch :", e?.response?.data ?? e);
      toast.error("Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("first_name", formData.first_name);
      fd.append("last_name",  formData.last_name);
      fd.append("email",      formData.email);
      if (formData.phone) fd.append("phone", formData.phone);
      if (fileInputRef.current?.files?.[0]) {
        fd.append("avatar", fileInputRef.current.files[0]);
        console.log("[AdminProfile] upload avatar :", fileInputRef.current.files[0].name);
      }
      console.log("[AdminProfile] POST /admin/profile →", Object.fromEntries(fd.entries()));
      const res  = await axiosInstance.post("/admin/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data?.data ?? res.data;
      console.log("[AdminProfile] réponse update :", data);
      if (data?.url) {
        dispatchProfileUpdate(data.url);
      }
      toast.success("Profil mis à jour avec succès.");
      fetchProfile();
    } catch (e: any) {
      console.error("[AdminProfile] erreur update :", e?.response?.data ?? e);
      toast.error(parseApiError(e));
    } finally {
      setSaving(false);
    }


  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.password_confirmation) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put("/admin/profile/password", {
        current_password: passwordData.current_password,
        password:         passwordData.password,
        password_confirmation: passwordData.password_confirmation,
      });
      toast.success("Mot de passe modifié avec succès.");
      setPasswordData({ current_password: "", password: "", password_confirmation: "" });
    } catch (e: any) {
      toast.error(parseApiError(e));
    } finally {
      setSaving(false);
    }

  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "?";

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Utilisateur";
  const photoUrl = avatarPreview ?? profile?.url ?? null;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
        <p className="mt-4 text-slate-500 font-medium">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <main className="mt-20 p-8 max-w-5xl mx-auto w-full space-y-8">
        <PageHeader
          title="Mon Profil"
          subtitle="Gérez vos informations personnelles et la sécurité de votre compte"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonne gauche : Avatar + infos rapides */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">

              {/* Avatar cliquable */}
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Changer la photo de profil"
              >
                <div className="w-32 h-32 rounded-[2rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={fullName} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-4xl font-black text-slate-400">{initials}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpg,image/jpeg,image/png"
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-black text-slate-900">{fullName}</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <Shield size={10} />
                  {profile?.role_name ?? profile?.roles?.[0]?.name ?? "ADMIN"}
                </div>
              </div>

              <div className="w-full mt-8 pt-8 border-t border-slate-50 space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <a href={`mailto:${profile?.email}`} className="text-slate-600 font-medium truncate hover:underline">
                    {profile?.email}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  {(profile?.phone_number ?? profile?.phone) ? (
                    <a href={`tel:${profile?.phone_number ?? profile?.phone}`} className="text-slate-600 font-medium hover:underline">
                      {profile?.phone_number ?? profile?.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Non renseigné</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <span className="text-slate-600 font-medium">
                    Inscrit le {formatDate(profile?.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative">
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Lock size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Sécurité</h4>
                    <p className="text-white/60 text-[10px] uppercase font-black tracking-widest">Compte Vérifié</p>
                  </div>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Votre compte est protégé. Assurez-vous d'utiliser un mot de passe complexe pour une sécurité maximale.
                </p>
              </div>
              <Shield className="absolute -bottom-6 -right-6 text-white/5 w-32 h-32" />
            </div>
          </div>

          {/* Colonne droite : Formulaires */}
          <div className="lg:col-span-2 space-y-8">

            {/* Informations personnelles */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                  <User className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Informations Personnelles</h3>
                  <p className="text-xs text-slate-400 font-medium">Modifiez vos coordonnées de base</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="Nom de famille"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="+225 07 00 00 00 00"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                    Sauvegarder les modifications
                  </button>
                </div>
              </form>
            </div>

            {/* Changement de mot de passe */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg">
                  <KeyRound className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Mot de passe</h3>
                  <p className="text-xs text-slate-400 font-medium">Sécurisez votre compte en changeant de mot de passe régulièrement</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.password}
                      onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.password_confirmation}
                      onChange={e => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={18} />}
                    Mettre à jour le mot de passe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
