"use client";

import { useState, useEffect, useRef } from "react";
import { 
  User, Mail, Phone, Shield, Calendar, 
  Camera, Lock, CheckCircle2, AlertCircle, 
  Loader2, Save, KeyRound 
} from "lucide-react";
import Image from "next/image";
import axiosInstance from "../../../core/axios";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";

import { resolveStorageUrl } from "../../../lib/url";
import { parseApiError } from "../../../core/error";


export default function ManagerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ 
    first_name: "", 
    last_name: "", 
    email: "",
    phone: "" 
  });
  const [passwordData, setPasswordData] = useState({ 
    current_password: "", 
    password: "", 
    password_confirmation: "" 
  });
  // Mot de passe initial stocké à la création du compte (si disponible)
  const [initialPassword, setInitialPassword] = useState<string | null>(null);

  const showFlash = (type: "success" | "error", msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const dispatchProfileUpdate = (url: string) => {
    localStorage.setItem("profile_picture_url", url);
    // StorageEvent pour les autres onglets
    window.dispatchEvent(new StorageEvent("storage", { key: "profile_picture_url", newValue: url }));
    // CustomEvent pour le même onglet (Navbar)
    window.dispatchEvent(new CustomEvent("profile-picture-updated", { detail: { url } }));
  };


  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get("/manager/me");
      const data = res.data?.data ?? res.data;
      console.log("[ManagerProfile] données reçues :", data);
      setProfile(data);
      setFormData({
        first_name: data.first_name || "",
        last_name:  data.last_name  || "",
        email:      data.email      || "",
        phone:      data.phone      || "",
      });
      const photoUrl = data.url || (data.profile_picture_path ? resolveStorageUrl(data.profile_picture_path) : null);
      if (photoUrl) {
        dispatchProfileUpdate(photoUrl);
      }
    } catch (e: any) {


      console.error("[ManagerProfile] erreur fetch :", e?.response?.data ?? e);
      showFlash("error", "Impossible de charger le profil.");
    } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchProfile();
    // Récupérer le mot de passe initial stocké à la création du compte
    const stored = localStorage.getItem("initial_password");
    if (stored) setInitialPassword(stored);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("first_name", formData.first_name);
      fd.append("last_name",  formData.last_name);
      fd.append("email",      formData.email || profile?.email);
      if (formData.phone) fd.append("phone", formData.phone);
      if (fileInputRef.current?.files?.[0]) {
        fd.append("avatar", fileInputRef.current.files[0]);
        console.log("[ManagerProfile] upload avatar :", fileInputRef.current.files[0].name);
      }
      console.log("[ManagerProfile] POST /manager/profile →", Object.fromEntries(fd.entries()));
      const res  = await axiosInstance.post("/manager/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data?.data ?? res.data;
      console.log("[ManagerProfile] réponse update :", data);
      if (data?.url) {
        localStorage.setItem("profile_picture_url", data.url);
        window.dispatchEvent(new StorageEvent("storage", { key: "profile_picture_url", newValue: data.url }));
      }
      showFlash("success", "Profil mis à jour avec succès.");
      fetchProfile();
    } catch (e: any) {
      console.error("[ManagerProfile] erreur update :", e?.response?.data ?? e);
      showFlash("error", parseApiError(e));
    } finally { setSaving(false); }


  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.password_confirmation) {
      showFlash("error", "Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put("/manager/profile/password", passwordData);
    } catch (e: any) {
      showFlash("error", parseApiError(e));
    } finally { setSaving(false); }

  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("[ManagerProfile] fichier sélectionné :", file.name, file.size, "bytes");
    const formDataObj = new FormData();
    formDataObj.append("avatar", file);
    setSaving(true);
    try {
      const res = await axiosInstance.post("/manager/profile/avatar", formDataObj, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = res.data?.data ?? res.data;
      console.log("[ManagerProfile] réponse avatar :", data);
      const avatarUrl = data?.url || (data?.profile_picture_path ? resolveStorageUrl(data.profile_picture_path) : null);
      if (avatarUrl) {
        dispatchProfileUpdate(avatarUrl);
      }

      showFlash("success", "Photo de profil mise à jour.");
      fetchProfile();
    } catch (e: any) {
      console.error("[ManagerProfile] erreur avatar :", e?.response?.data ?? e);
      showFlash("error", parseApiError(e));
    } finally { setSaving(false); }


  };

  const getInitials = () => {
    if (!profile) return "??";
    const fn = profile.first_name || "";
    const ln = profile.last_name || "";
    if (!fn && !ln) return profile.name?.substring(0, 2).toUpperCase() || "??";
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
  };

  if (loading) return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
        </div>
      </div>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader title="Mon Profil" subtitle="Gérez vos informations personnelles et votre sécurité" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            
            {/* Colonne Gauche: Carte Identité */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-slate-900 to-slate-800" />
                
                <div className="relative mt-4 group cursor-pointer" onClick={handleAvatarClick}>
                  <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl relative z-10">
                    <div className="w-full h-full rounded-[2rem] bg-slate-100 overflow-hidden border border-slate-50 flex items-center justify-center">
                      {profile?.profile_picture_path ? (
                        <Image 
                          src={profile.url || resolveStorageUrl(profile.profile_picture_path)} 
                          alt="Profil" 
                          width={128} 
                          height={128} 
                          className="object-cover w-full h-full" 
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                           <span className="text-4xl font-black text-white">{getInitials()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-1.5 bg-black/60 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 scale-95 group-hover:scale-100">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="mt-6 relative z-10 w-full">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                    {profile?.first_name} {profile?.last_name}
                  </h3>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 mt-3 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
                    <Shield size={12} />
                    {profile?.role_name || "MANAGER"}
                  </div>
                </div>

                <div className="w-full mt-10 pt-8 border-t border-slate-100 space-y-5 text-left">
                  <div className="group/item flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:text-slate-900 group-hover/item:bg-white border border-transparent group-hover/item:border-slate-200 transition-all">
                      <Mail size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Email</span>
                      <span className="text-slate-700 font-bold text-sm truncate">{profile?.email}</span>
                    </div>
                  </div>

                  <div className="group/item flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:text-slate-900 group-hover/item:bg-white border border-transparent group-hover/item:border-slate-200 transition-all">
                      <Phone size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Téléphone</span>
                      <span className="text-slate-700 font-bold text-sm">{profile?.phone || "Non renseigné"}</span>
                    </div>
                  </div>

                  <div className="group/item flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:text-slate-900 group-hover/item:bg-white border border-transparent group-hover/item:border-slate-200 transition-all">
                      <Calendar size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Depuis le</span>
                      <span className="text-slate-700 font-bold text-sm">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Droite: Formulaires */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Infos Personnelles */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 text-white">
                      <User size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg tracking-tight">Informations de base</h3>
                      <p className="text-slate-400 text-xs font-medium">Mettez à jour vos informations publiques</p>
                    </div>
                  </div>
                  {saving && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                </div>

                <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prénom</label>
                       <input 
                         type="text" 
                         value={formData.first_name} 
                         onChange={e => setFormData({...formData, first_name: e.target.value})} 
                         className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                         placeholder="Votre prénom"
                       />
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nom</label>
                       <input 
                         type="text" 
                         value={formData.last_name} 
                         onChange={e => setFormData({...formData, last_name: e.target.value})} 
                         className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                         placeholder="Votre nom"
                       />
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                       <input
                         type="email"
                         value={formData.email}
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                         placeholder="email@exemple.com"
                       />
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">N° Téléphone</label>
                       <input 
                         type="tel" 
                         value={formData.phone} 
                         onChange={e => setFormData({...formData, phone: e.target.value})} 
                         className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                         placeholder="+225 00 00 00 00"
                       />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={saving} 
                      className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-black hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-900/20"
                    >
                      <Save size={18} />
                      Enregistrer les modifications
                    </button>
                  </div>
                </form>
              </div>

              {/* Mot de passe */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20 flex items-center justify-center text-white">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">Mot de passe</h3>
                    <p className="text-slate-400 text-xs font-medium">Sécurisez votre compte</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mot de passe actuel</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={passwordData.current_password} 
                          onChange={e => setPasswordData({...passwordData, current_password: e.target.value})} 
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900" 
                          placeholder="••••••••" 
                        />
                        {/* Bouton pour pré-remplir avec le mot de passe initial */}
                        {initialPassword && (
                          <button
                            type="button"
                            onClick={() => setPasswordData({...passwordData, current_password: initialPassword})}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500 hover:text-orange-700 uppercase tracking-widest border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-xl transition"
                          >
                            Mot de passe initial
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nouveau mot de passe</label>
                        <input 
                          type="password" 
                          value={passwordData.password} 
                          onChange={e => setPasswordData({...passwordData, password: e.target.value})} 
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900" 
                          placeholder="••••••••" 
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirmer le mot de passe</label>
                        <input 
                          type="password" 
                          value={passwordData.password_confirmation} 
                          onChange={e => setPasswordData({...passwordData, password_confirmation: e.target.value})} 
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900" 
                          placeholder="••••••••" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={saving} 
                      className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-orange-500/20"
                    >
                      <CheckCircle2 size={18} />
                      Mettre à jour le mot de passe
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </main>
        
        {/* Flash Message */}
        {flash && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-8 duration-300">
            <div className={`px-8 py-5 rounded-[2rem] shadow-2xl text-sm font-black flex items-center gap-4 border backdrop-blur-md ${
              flash.type === "success" 
                ? "text-emerald-800 bg-emerald-50/90 border-emerald-100" 
                : "text-red-800 bg-red-50/90 border-red-100"
            }`}>
              {flash.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {flash.msg}
            </div>
          </div>
        )}
      </div>
    
  );
}
