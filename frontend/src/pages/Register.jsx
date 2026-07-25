import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ArrowRight, BarChart3, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Register() {
  const { register } = useAuth(); const nav = useNavigate();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false); const [showPassword,setShowPassword]=useState(false);
  const strength=useMemo(()=>[password.length>=6,/[A-Z]/.test(password),/\d/.test(password)].filter(Boolean).length,[password]);
  const submit=async(e)=>{e.preventDefault();if(loading)return;if(password.length<6)return toast.error("Mot de passe min. 6 caractères");setLoading(true);try{const result=await register(email,password,name);if(result.requires_email_confirmation){sessionStorage.setItem("pipsevo_pending_email",email.trim());nav("/verify-email",{state:{email:email.trim()}});return}toast.success("Compte créé. Configurons ton profil.");nav("/onboarding",{replace:true})}catch(err){toast.error(err.response?.data?.detail||"Inscription impossible")}finally{setLoading(false)}};
  const field="w-full mt-2 bg-[#0A0D18]/90 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-[#4B5563] focus:border-[#7C4DFF]/70 focus:ring-4 focus:ring-[#7C4DFF]/10 outline-none transition";
  return <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden px-4 py-6 sm:p-8 flex items-center justify-center">
    <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7"><LanguageSwitcher compact /></div>
    <div className="absolute inset-0 grid-floor opacity-25"/><div className="absolute -top-40 -right-20 w-[650px] h-[650px] rounded-full blur-3xl opacity-20 bg-[#7C4DFF]"/><div className="absolute -bottom-40 -left-20 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 bg-[#FF4FD8]"/>
    <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-[1.05fr_.95fr] rounded-[28px] overflow-hidden border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,.65)] bg-[#080A12]/90 backdrop-blur-xl">
      <section className="hidden lg:flex p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 opacity-70" style={{background:"radial-gradient(circle at 20% 20%,rgba(124,77,255,.28),transparent 48%),radial-gradient(circle at 80% 90%,rgba(79,140,255,.16),transparent 45%)"}}/>
        <div className="relative"><Logo size="lg"/><div className="mt-16 text-[11px] font-mono tracking-[.24em] text-[#B58BFF] uppercase">Ton système de progression</div><h1 className="text-5xl xl:text-6xl font-bold leading-[1.06] mt-5">Protège ton compte.<br/><span className="text-purple-grad">Comprends tes décisions.</span></h1><p className="text-[#9CA3AF] mt-6 max-w-lg leading-relaxed">Centralise tes comptes financés, mesure ta discipline et transforme chaque trade en une leçon exploitable.</p></div>
        <div className="relative grid grid-cols-3 gap-3 my-12">{[["94","Discipline"],["87%","Survie"],["5","Comptes"]].map(([v,l],i)=><div key={l} className="rounded-2xl bg-white/[0.035] border border-white/[0.07] p-4"><div className="text-xl font-bold font-mono" style={{color:["#B58BFF","#00E676","#4F8CFF"][i]}}>{v}</div><div className="text-[10px] text-[#6B7280] mt-1">{l}</div></div>)}</div>
        <div className="relative space-y-3">{[[ShieldCheck,"Suivi du drawdown et des règles"],[BarChart3,"Statistiques multi-comptes"],[Sparkles,"Analyse comportementale par IA"]].map(([I,t])=><div key={t} className="flex items-center gap-3 text-sm text-[#B5BBC9]"><span className="w-8 h-8 rounded-lg bg-[#7C4DFF]/10 flex items-center justify-center"><I className="w-4 h-4 text-[#B58BFF]"/></span>{t}</div>)}</div>
      </section>
      <section className="p-6 sm:p-10 lg:p-12 xl:p-14 bg-[#090B14]/85">
        <div className="lg:hidden mb-9"><Logo/></div>
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-[#B58BFF] font-mono"><span className="w-1.5 h-1.5 rounded-full bg-[#00E676]"/>Inscription gratuite</div>
        <h2 className="text-3xl sm:text-4xl font-bold mt-4">Crée ton espace PipsEvo.</h2><p className="text-sm text-[#9CA3AF] mt-2">Configure ensuite ton profil en moins de deux minutes.</p>
        <form onSubmit={submit} className="space-y-5 mt-8" aria-busy={loading}>
          <label className="block text-xs font-medium text-[#B5BBC9]">Nom affiché<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex. Alex" data-testid="register-name" className={field}/></label>
          <label className="block text-xs font-medium text-[#B5BBC9]">Adresse e-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="alex@email.com" data-testid="register-email" className={field}/></label>
          <label className="block text-xs font-medium text-[#B5BBC9]">Mot de passe<div className="relative"><input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 caractères minimum" data-testid="register-password" className={`${field} pr-12`}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Masquer le mot de passe":"Afficher le mot de passe"} className="absolute right-3 top-[18px] w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-white">{showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></label>
          <div><div className="flex gap-2">{[0,1,2].map(i=><span key={i} className={`h-1 flex-1 rounded-full transition ${strength>i?["bg-[#FFB855]","bg-[#B58BFF]","bg-[#00E676]"][strength-1]:"bg-white/10"}`}/>)}</div><div className="text-[10px] text-[#6B7280] mt-2">Ajoute une majuscule et un chiffre pour renforcer le mot de passe.</div></div>
          <label htmlFor="register-terms" className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs leading-relaxed text-[#9CA3AF]"><input id="register-terms" name="terms" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#7C4DFF]"/><span>J’accepte les <Link to="/terms" target="_blank" className="text-[#B58BFF] hover:text-white">conditions d’utilisation</Link> et la <Link to="/privacy" target="_blank" className="text-[#B58BFF] hover:text-white">politique de confidentialité</Link>.</span></label>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 inline-flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(124,77,255,.28)]" data-testid="register-submit">{loading?"Création…":<>Créer mon compte <ArrowRight className="w-4 h-4"/></>}</button>
        </form>
        <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mt-5"><CheckCircle2 className="w-4 h-4 text-[#00E676]"/>Aucune carte bancaire requise.</div>
        <div className="text-center text-sm text-[#9CA3AF] mt-8 pt-6 border-t border-white/5">Déjà inscrit ? <Link to="/login" className="text-[#B58BFF] font-medium hover:text-white" data-testid="register-go-login">Se connecter</Link></div>
        <div className="text-center mt-5"><Link to="/" className="text-xs text-[#6B7280] hover:text-white">← Retour à l'accueil</Link></div>
      </section>
    </div>
  </div>;
}
