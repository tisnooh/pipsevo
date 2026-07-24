import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, MailCheck, RefreshCw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const RESEND_DELAY = 60;

export default function VerifyEmail() {
  const location = useLocation();
  const { resendConfirmation } = useAuth();
  const { t } = useI18n();
  const initialEmail = location.state?.email || sessionStorage.getItem("pipsevo_pending_email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(initialEmail ? RESEND_DELAY : 0);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const maskedEmail = useMemo(() => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
  }, [email]);

  const resend = async () => {
    if (!email || seconds > 0 || sending) return;
    setSending(true);
    try {
      await resendConfirmation(email);
      sessionStorage.setItem("pipsevo_pending_email", email.trim());
      setSeconds(RESEND_DELAY);
      toast.success(t("Un nouvel e-mail de confirmation vient d'être envoyé.", "A new confirmation email has been sent."));
    } catch (error) {
      toast.error(error.response?.data?.detail || t("Impossible de renvoyer l'e-mail.", "Unable to resend the email."));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-hidden px-4 py-8 flex items-center justify-center">
      <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7"><LanguageSwitcher compact /></div>
      <div className="absolute inset-0 grid-floor opacity-25" />
      <div className="absolute -top-48 right-0 h-[620px] w-[620px] rounded-full bg-[#7C4DFF]/20 blur-3xl" />
      <div className="absolute -bottom-56 left-0 h-[620px] w-[620px] rounded-full bg-[#4F8CFF]/15 blur-3xl" />

      <section className="relative z-10 w-full max-w-xl rounded-[28px] border border-white/10 bg-[#090B14]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,.65)] backdrop-blur-xl sm:p-10">
        <Logo />
        <div className="mt-9 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#7C4DFF]/30 bg-[#7C4DFF]/10">
          <MailCheck className="h-8 w-8 text-[#B58BFF]" />
        </div>
        <p className="mt-7 text-[10px] font-mono uppercase tracking-[.22em] text-[#B58BFF]">Dernière étape</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Vérifie ton e-mail.</h1>
        <p className="mt-3 leading-relaxed text-[#9CA3AF]">
          Nous avons envoyé un lien d'activation à <strong className="font-semibold text-white">{maskedEmail || "ton adresse e-mail"}</strong>.
          Clique sur ce lien pour activer ton compte et commencer l'onboarding.
        </p>

        <div className="mt-7 space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm text-[#B5BBC9]">
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00E676]" />Vérifie aussi le dossier spam ou courrier indésirable.</div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00E676]" />Le lien te connectera automatiquement à PipsEvo.</div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00E676]" />Tu seras ensuite dirigé vers la personnalisation de ton profil.</div>
        </div>

        {!initialEmail && (
          <label className="mt-6 block text-xs font-medium text-[#B5BBC9]">
            Adresse e-mail
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0A0D18] px-4 py-3.5 outline-none transition focus:border-[#7C4DFF]/70 focus:ring-4 focus:ring-[#7C4DFF]/10" />
          </label>
        )}

        <button type="button" onClick={resend} disabled={!email || sending || seconds > 0} className="btn-primary mt-7 inline-flex w-full items-center justify-center gap-2 py-3.5 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
          {sending ? "Envoi…" : seconds > 0 ? `Renvoyer dans ${seconds}s` : "Renvoyer l'e-mail"}
        </button>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm sm:flex-row">
          <Link to="/register" className="text-[#9CA3AF] hover:text-white">Modifier mon adresse</Link>
          <Link to="/login" className="inline-flex items-center gap-2 font-medium text-[#B58BFF] hover:text-white">J'ai déjà confirmé <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}
