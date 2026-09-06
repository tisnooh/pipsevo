import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { Logo } from "../Logo";
import LanguageSwitcher from "../LanguageSwitcher";
import { useI18n } from "../../context/I18nContext";

export const authFieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3.5 text-base text-white placeholder:text-[#6B7280] outline-none transition focus:border-[#9B75FF] focus:ring-4 focus:ring-[#7C4DFF]/10 disabled:opacity-60";

export default function AuthLayout({ children }) {
  const { t } = useI18n();
  return <main className="relative flex min-h-screen flex-col bg-[#050505] text-white">
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#B5BBC9] transition hover:text-white"><ArrowLeft size={16} />{t("Retour à l’accueil", "Back to home")}</Link>
      <LanguageSwitcher />
    </header>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 15% 45%,rgba(124,77,255,.12),transparent 50%),radial-gradient(ellipse at 85% 85%,rgba(79,140,255,.08),transparent 45%)" }} />
    <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 sm:px-8 sm:pb-12">
      <div className="grid w-full max-w-[1120px] overflow-hidden rounded-3xl border border-white/10 bg-[#090C16] shadow-[0_24px_100px_rgba(0,0,0,.35)] lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between gap-9 border-r border-white/[.07] bg-gradient-to-br from-[#17102C] via-[#0D1120] to-[#090C16] p-10 lg:flex xl:p-12">
          <div>
            <Logo size="lg" />
            <p className="mt-10 text-xs font-medium tracking-[.16em] text-[#B58BFF]">{t("TON TRADING, EN PERSPECTIVE", "YOUR TRADING, IN PERSPECTIVE")}</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight">{t("Tes comptes. Tes décisions.", "Your accounts. Your decisions.")}<br /><span className="text-purple-grad">{t("Une vision claire.", "One clear view.")}</span></h2>
            <p className="mt-4 text-sm leading-6 text-[#A9B0C2]">{t("Retrouve ton journal, tes règles et tes performances dans un même espace.", "Your journal, rules and performance, together in one workspace.")}</p>
          </div>
          <figure>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#070A12] shadow-2xl"><img src="/brand/product-captures/dashboard.png" alt={t("Aperçu du tableau de bord PipsEvo", "PipsEvo dashboard preview")} width="1600" height="900" className="h-auto w-full" /></div>
            <figcaption className="mt-3 flex items-center gap-2 text-xs text-[#929AAF]"><span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />{t("Aperçu du produit · Données de démonstration", "Product preview · Demo data")}</figcaption>
          </figure>
          <div className="space-y-3">{[
            [BookOpen, t("Un journal pour comprendre chaque trade", "A journal to understand every trade")],
            [ShieldCheck, t("Tes règles et tes limites, toujours visibles", "Your rules and limits, always in view")],
            [ChartNoAxesCombined, t("Une lecture globale de tes performances", "A complete view of your performance")],
          ].map(([Icon, label]) => <div key={label} className="flex items-center gap-3 text-sm text-[#B5BBC9]"><Icon className="h-4 w-4 shrink-0 text-[#B58BFF]" />{label}</div>)}</div>
        </aside>
        <section className="flex min-w-0 flex-col justify-center p-6 sm:p-10 xl:p-12">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
        </section>
      </div>
    </div>
  </main>;
}
