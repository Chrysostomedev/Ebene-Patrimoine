"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Mail, Phone, Shield, Calendar,
  Camera, Lock, CheckCircle2, AlertCircle,
  Loader2, Save, KeyRound, Building2,
} from "lucide-react";
import axiosInstance from "../../../core/axios";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";

import { formatDate } from "@/lib/utils";
import { resolveStorageUrl } from "../../../lib/url";
import { parseApiError } from "../../../core/error";



export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const showFlash = (type: "success" | "error", msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4500);
  };

  const syncNavbar = (url: string) => {
    localStorage.setItem("profile_picture_url", url);
    // StorageEvent pour les autres onglets
    window.dispatchEvent(new StorageEvent("storage", { key: "profile_picture_url", newValue: url }));
    // CustomEvent pour le même onglet (Navbar)
    window.dispatchEvent(new CustomEvent("profile-picture-updated", { detail: { url } }));
    console.log("[Profile] photo Navbar sync →", url);
  };


  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get("/provider/profile");
      const data = res.data?.data ?? res.data;
      console.log("[Profile] données reçues :", data);
      setProfile(data);
      setFormData({
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        company_name: data.company_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
      });
      const photoUrl = data.url || (data.profile_picture_path ? resolveStorageUrl(data.profile_picture_path) : null);
      if (photoUrl) syncNavbar(photoUrl);
    } catch (e: any) {

      console.error("[Profile] erreur fetch :", e?.response?.data ?? e);
      showFlash("error", "Impossible de charger le profil.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("_method", "PUT"); // Spoofing PUT for Laravel with multipart/form-data
      fd.append("first_name", formData.first_name);
      fd.append("last_name", formData.last_name);
      fd.append("company_name", formData.company_name);
      fd.append("email", formData.email);
      if (formData.phone) fd.append("phone", formData.phone);
      if (fileInputRef.current?.files?.[0]) {
        fd.append("avatar", fileInputRef.current.files[0]);
        console.log("[Profile] upload avatar inclus dans PUT profile");
      }
      console.log("[Profile] PUT /provider/profile →", Object.fromEntries(fd.entries()));
      const res = await axiosInstance.post("/provider/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data?.data ?? res.data;
      console.log("[Profile] réponse update :", data);
      const photoUrl = data?.url || (data?.profile_picture_path ? resolveStorageUrl(data.profile_picture_path) : null);
      if (photoUrl) syncNavbar(photoUrl);

      showFlash("success", "Profil mis à jour avec succès.");
      fetchProfile();
    } catch (e: any) {
      console.error("[Profile] erreur update :", e?.response?.data ?? e);
      showFlash("error", parseApiError(e));
    } finally { setSaving(false); }


  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.password_confirmation) {
      showFlash("error", "Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put("/provider/profile/password", {
        current_password: passwordData.current_password,
        password: passwordData.password,
        password_confirmation: passwordData.password_confirmation,
      });
      showFlash("success", "Mot de passe modifié avec succès.");
      setPasswordData({ current_password: "", password: "", password_confirmation: "" });
    } catch (e: any) {
      showFlash("error", parseApiError(e));
    } finally { setSaving(false); }

  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("[Profile] fichier sélectionné :", file.name, file.size, "bytes");
    setAvatarPreview(URL.createObjectURL(file));
  };

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase()
    || profile?.company_name?.[0]?.toUpperCase()
    || "?";

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
    || profile?.company_name
    || "Prestataire";

  const photoUrl = avatarPreview ?? profile?.url ?? null;

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
      <p className="mt-4 text-slate-500 font-medium">Chargement du profil...</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="mt-20 p-8 max-w-5xl mx-auto w-full space-y-8">
        <PageHeader title="Mon Profil" subtitle="Gérez vos informations de prestataire" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonne gauche */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
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
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Cliquez pour changer · Max 2Mo</p>

              <div className="mt-4">
                <h3 className="text-xl font-black text-slate-900">{fullName}</h3>
                {profile?.company_name && (
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{profile.company_name}</p>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest">
                  <Shield size={10} /> PRESTATAIRE
                </div>
              </div>

              <div className="w-full mt-8 pt-8 border-t border-slate-50 space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <span className="text-slate-600 font-medium truncate">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span className="text-slate-600 font-medium">{profile?.phone || "Non renseigné"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <span className="text-slate-600 font-medium">
                    Depuis {formatDate(profile?.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="lg:col-span-2 space-y-8">

            {/* Informations */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                  <User className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Informations Personnelles</h3>
                  <p className="text-xs text-slate-400 font-medium">Modifiez vos coordonnées</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="Prénom" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="Nom de famille" required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de l'entreprise</label>
                    <input type="text" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="Nom de votre société" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="email@exemple.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="+225 07 00 00 00 00" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                    Sauvegarder les modifications
                  </button>
                </div>
              </form>
            </div>

            {/* Mot de passe */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg">
                  <KeyRound className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Mot de passe</h3>
                  <p className="text-xs text-slate-400 font-medium">Sécurisez votre compte</p>
                </div>
              </div>
              <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe actuel</label>
                  <input type="password" value={passwordData.current_password} onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })} required
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                    placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveau mot de passe</label>
                    <input type="password" value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmer</label>
                    <input type="password" value={passwordData.password_confirmation} onChange={e => setPasswordData({ ...passwordData, password_confirmation: e.target.value })} required
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white focus:border-slate-900 transition-all"
                      placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={18} />}
                    Mettre à jour le mot de passe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {flash && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl text-sm font-black flex items-center gap-3 border animate-in slide-in-from-top duration-300 ${flash.type === "success" ? "text-emerald-800 bg-emerald-50 border-emerald-100" : "text-red-800 bg-red-50 border-red-100"
          }`}>
          {flash.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {flash.msg}
        </div>
      )}
    </div>
  );
}
