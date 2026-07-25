import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/api";
import { Logo } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await auth.resetPassword(email);
      setSent(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Impossible d’envoyer le lien de réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 text-white">
    <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7"><LanguageSwitcher compact /></div>
    <div className="absolute inset-0 grid-floor opacity-30" />
    <div className="absolute left-[15%] top-[10%] h-[420px] w-[420px] rounded-full bg-[#7C4DFF]/25 blur-3xl" />
    <div className="card-elev glow-purple relative z-10 w-full max-w-md p-7 sm:p-9">
      <Logo />
      {sent ? <div className="mt-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#00E676]/10 text-[#00E676]"><CheckCircle2 className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-bold">Vérifie ta boîte e-mail</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">Si un compte correspond à <strong className="text-white">{email}</strong>, un lien sécurisé vient d’être envoyé. Il expire après une heure.</p>
        <button type="button" onClick={() => setSent(false)} className="btn-ghost mt-6 w-full">Utiliser une autre adresse</button>
      </div> : <>
        <h1 className="mt-8 text-3xl font-bold">Mot de passe oublié ?</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">Entre ton adresse e-mail pour recevoir un lien de réinitialisation sécurisé.</p>
        <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={loading}>
          <label className="block text-xs font-medium text-[#B5BBC9]">Adresse e-mail
            <span className="relative mt-2 block"><Mail className="absolute left-4 top-3.5 h-4 w-4 text-[#596172]" /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0D1020] py-3 pl-11 pr-4 outline-none transition focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/10" /></span>
          </label>
          <button type="submit" disabled={loading} className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Envoi…" : "Envoyer le lien"}</button>
        </form>
      </>}
      <Link to="/login" className="mt-7 flex items-center justify-center gap-2 text-xs text-[#9CA3AF] transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Retour à la connexion</Link>
    </div>
  </div>;
}
