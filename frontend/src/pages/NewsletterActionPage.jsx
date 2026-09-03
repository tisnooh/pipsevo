import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { newsletter } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";

export default function NewsletterActionPage({ action }) {
  const { search } = useLocation();
  const { t } = useI18n();
  const started = useRef(false);
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(search).get("token");
    if (!token) {
      setState("error");
      setMessage(t("Le lien est incomplet.", "This link is incomplete."));
      return;
    }
    const request = action === "confirm" ? newsletter.confirm(token) : newsletter.unsubscribe(token);
    request.then(() => {
      setState("success");
      setMessage(action === "confirm"
        ? t("Ton inscription est confirmée. Bienvenue dans la newsletter PipsEvo.", "Your subscription is confirmed. Welcome to the PipsEvo newsletter.")
        : t("Ton adresse a bien été désinscrite des communications marketing.", "Your address has been unsubscribed from marketing communications."));
    }).catch((error) => {
      setState("error");
      setMessage(error.response?.data?.detail || t("Ce lien est invalide ou a expiré.", "This link is invalid or has expired."));
    });
  }, [action, search, t]);

  const title = action === "confirm"
    ? t("Confirmation de la newsletter", "Newsletter confirmation")
    : t("Désinscription", "Unsubscribe");

  return <div className="min-h-screen bg-[#050505] text-white">
    <PublicHeader />
    <main className="relative flex min-h-[68vh] items-center justify-center overflow-hidden px-5 py-20">
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C4DFF]/15 blur-3xl" />
      <section className="relative w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0D1120]/95 p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-11">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border ${state === "error" ? "border-[#FF4D5E]/30 bg-[#FF4D5E]/10 text-[#FF7A87]" : "border-[#46C99A]/30 bg-[#46C99A]/10 text-[#46C99A]"}`}>
          {state === "loading" ? <Loader2 className="h-8 w-8 animate-spin text-[#B58BFF]" /> : state === "success" ? <CheckCircle2 className="h-8 w-8" /> : <MailWarning className="h-8 w-8" />}
        </div>
        <div className="mt-7 text-[10px] font-mono uppercase tracking-[.22em] text-[#B58BFF]">PipsEvo · E-mail</div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        <p role="status" aria-live="polite" className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#9CA3AF]">
          {state === "loading" ? t("Nous vérifions ton lien sécurisé…", "We are checking your secure link…") : message}
        </p>
        <Link to="/" className="btn-primary mt-8 inline-flex items-center justify-center gap-2">{t("Retourner à PipsEvo", "Return to PipsEvo")}<ArrowRight className="h-4 w-4" /></Link>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
