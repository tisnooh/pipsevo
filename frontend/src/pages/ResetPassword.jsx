import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { passwordValidation } from "@/lib/passwordSecurity";
import { useAuth } from "@/context/AuthContext";
import { AUTH_CONFIG, hasCompletedOnboarding } from "@/config/auth";
import { Logo } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setStatus(data.session ? "ready" : "invalid");
    }, 700);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === "PASSWORD_RECOVERY" || session)) setStatus("ready");
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    const validation = passwordValidation(password);
    if (!validation.valid) return toast.error(validation.message);
    if (password !== confirmation) return toast.error("Les mots de passe ne correspondent pas.");
    setLoading(true);
    try {
      await auth.updatePassword(password);
      await auth.signOutOtherSessions();
      toast.success("Ton mot de passe a été modifié.");
      navigate(hasCompletedOnboarding(user) ? AUTH_CONFIG.authenticatedHomePath : AUTH_CONFIG.postSignUpPath, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible de modifier le mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 text-white">
    <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7"><LanguageSwitcher compact /></div>
    <div className="absolute inset-0 grid-floor opacity-30" />
    <div className="absolute right-[15%] top-[10%] h-[420px] w-[420px] rounded-full bg-[#4F8CFF]/20 blur-3xl" />
    <div className="card-elev glow-purple relative z-10 w-full max-w-md p-7 sm:p-9">
      <Logo />
      {status === "checking" && <div className="grid min-h-52 place-items-center text-sm text-[#9CA3AF]"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Vérification du lien…</span></div>}
      {status === "invalid" && <div className="mt-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FF4D5E]/10 text-[#FF7A87]"><ShieldAlert className="h-7 w-7" /></span><h1 className="mt-5 text-2xl font-bold">Lien invalide ou expiré</h1><p className="mt-3 text-sm text-[#9CA3AF]">Demande un nouveau lien pour sécuriser ton compte.</p><Link to="/forgot-password" className="btn-primary mt-6 inline-flex w-full items-center justify-center">Recevoir un nouveau lien</Link></div>}
      {status === "ready" && <>
        <span className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-[#00E676]"><CheckCircle2 className="h-3.5 w-3.5" />Lien sécurisé vérifié</span>
        <h1 className="mt-3 text-3xl font-bold">Choisis un nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Il doit contenir au moins 8 caractères, une majuscule et un chiffre.</p>
        <form onSubmit={submit} className="mt-7 space-y-4" aria-busy={loading}>
          {[{ label: "Nouveau mot de passe", value: password, setValue: setPassword }, { label: "Confirmer le mot de passe", value: confirmation, setValue: setConfirmation }].map((field) => <label key={field.label} className="block text-xs font-medium text-[#B5BBC9]">{field.label}<span className="relative mt-2 block"><input type={visible ? "text" : "password"} autoComplete="new-password" required value={field.value} onChange={(event) => field.setValue(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 pr-12 outline-none transition focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/10" />{field.label === "Nouveau mot de passe" && <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-3 top-2 grid h-8 w-8 place-items-center text-[#6B7280] hover:text-white">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}</span></label>)}
          <button type="submit" disabled={loading} className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Modification…" : "Modifier le mot de passe"}</button>
        </form>
      </>}
    </div>
  </div>;
}
