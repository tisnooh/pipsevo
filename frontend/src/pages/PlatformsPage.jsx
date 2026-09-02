import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock3, FileSpreadsheet, Layers3, Link2, ShieldCheck, Upload, WalletCards } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { INTEGRATIONS } from "@/config/integrations";
import { PROP_FIRMS } from "@/lib/journalPreferences";

const firmPresentation = {
  topstep: { logo: "/brand/prop-firms/topstep.webp", logoClass: "h-6", noteFr: "Comptes Futures", noteEn: "Futures accounts" },
  apex: { logo: "/brand/prop-firms/apex.svg", logoClass: "h-9", noteFr: "Comptes Futures", noteEn: "Futures accounts" },
  "take-profit-trader": { logo: "/brand/prop-firms/take-profit-trader.svg", logoClass: "h-8", noteFr: "Comptes Futures", noteEn: "Futures accounts" },
  ftmo: { logo: "/brand/prop-firms/ftmo.svg", logoClass: "h-7", noteFr: "CFD et Forex", noteEn: "CFDs and Forex" },
  the5ers: { logo: "/brand/prop-firms/the5ers.svg", logoClass: "h-8", noteFr: "CFD et Forex", noteEn: "CFDs and Forex" },
  fundednext: { logo: "/brand/prop-firms/fundednext.png", logoClass: "h-7", noteFr: "Futures, CFD et Forex", noteEn: "Futures, CFDs and Forex" },
};

const methodIcons = {
  manual: WalletCards,
  csv: Upload,
  mt5: Link2,
  ctrader: Link2,
  "futures-platforms": Layers3,
  "market-data": FileSpreadsheet,
};

function StatusBadge({ status, children }) {
  const available = status === "available";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.11em] ${available ? "border-[#46C99A]/25 bg-[#46C99A]/[0.07] text-[#65D8AE]" : "border-[#7657FF]/25 bg-[#7657FF]/[0.08] text-[#B4A3F8]"}`}>
    {available ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{children}
  </span>;
}

function FirmCard({ firm, tr }) {
  const presentation = firmPresentation[firm.id];
  return <article className="group relative min-h-[230px] overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#090B11] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#7657FF]/35 sm:p-6">
    <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#7657FF]/0 blur-[55px] transition duration-300 group-hover:bg-[#7657FF]/[0.13]" />
    <div className="relative flex items-start justify-between gap-4">
      <div className="flex h-14 min-w-16 items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3">
        <img src={presentation.logo} alt="" className={`${presentation.logoClass} max-w-[118px] object-contain object-left`} />
      </div>
      <StatusBadge status="available">{tr("Suivi compatible", "Tracking supported")}</StatusBadge>
    </div>
    <div className="relative mt-7">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#ECEEF2]">{firm.name}</h2>
      <p className="mt-1 text-xs text-[#7C8493]">{tr(presentation.noteFr, presentation.noteEn)}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {firm.markets.map(market => <span key={market} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] text-[#A8AEB9]">{market === "futures" ? "Futures" : "CFD / Forex"}</span>)}
      </div>
      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#868E9D]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8E76F2]" />{tr("Compte, règles, journal et payouts centralisés.", "Account, rules, journal, and payouts centralized.")}</p>
    </div>
  </article>;
}

export default function PlatformsPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const tr = (fr, en) => language === "en" ? en : fr;
  const availableMethods = INTEGRATIONS.filter(item => item.status === "available");
  const upcomingMethods = INTEGRATIONS.filter(item => item.status !== "available");

  return <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
    <PublicHeader variant="landing" />
    <main id="main-content">
      <section className="relative border-b border-white/[0.06] px-5 pb-20 pt-40 sm:px-6 sm:pb-24 sm:pt-44 lg:px-10 lg:pb-28 lg:pt-48">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[860px] -translate-x-1/2 rounded-full bg-[#5E42D5]/[0.10] blur-[120px]" />
        <div className="relative mx-auto max-w-[1180px] text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#46C99A]/20 bg-[#46C99A]/[0.045] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.17em] text-[#65D8AE]"><span className="h-1.5 w-1.5 rounded-full bg-[#46C99A]" />{tr("Compatibilité PipsEvo", "PipsEvo compatibility")}</div>
          <h1 className="mx-auto mt-7 max-w-4xl text-balance text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#F3F4F6] sm:text-5xl lg:text-[68px]">{tr("Toutes tes plateformes. Un seul suivi cohérent.", "All your platforms. One consistent workflow.")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-7 text-[#949CAB] sm:text-base">{tr("Ajoute tes comptes financés, structure tes trades et suis les limites de chaque prop firm depuis PipsEvo, sans mélanger compatibilité de suivi et connexion automatique.", "Add your funded accounts, structure your trades, and track each prop firm's limits from PipsEvo—without confusing tracking compatibility with automatic connections.")}</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={user ? "/app/accounts" : "/register"} className="btn-primary inline-flex items-center justify-center gap-2 !rounded-xl">{user ? tr("Ajouter un compte", "Add an account") : tr("Commencer gratuitement", "Start for free")}<ArrowRight className="h-4 w-4" /></Link>
            <a href="#compatibility" className="btn-ghost inline-flex items-center justify-center gap-2 !rounded-xl">{tr("Voir les plateformes", "View platforms")}<ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.075] bg-[#080A10]/80 py-5">
            <div><strong className="block text-2xl font-semibold text-white">{PROP_FIRMS.length}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-[#69717F]">Prop firms</span></div>
            <div><strong className="block text-2xl font-semibold text-[#46C99A]">{availableMethods.length}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-[#69717F]">{tr("Modes disponibles", "Available methods")}</span></div>
            <div><strong className="block text-2xl font-semibold text-[#A994FF]">2</strong><span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-[#69717F]">{tr("Marchés couverts", "Markets covered")}</span></div>
          </div>
        </div>
      </section>

      <section id="compatibility" className="scroll-mt-24 px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#9D87FF]"><span className="h-px w-7 bg-[#7657FF]" />Prop firms</div>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] text-[#F1F2F5] sm:text-4xl lg:text-5xl">{tr("Les comptes que tu peux déjà piloter dans PipsEvo.", "The accounts you can already manage in PipsEvo.")}</h2>
            <p className="mt-5 text-sm leading-7 text-[#8D95A4] sm:text-[15px]">{tr("La compatibilité signifie que tu peux créer le compte, renseigner ses règles et centraliser son suivi. Elle ne signifie pas qu’une synchronisation directe est active.", "Compatibility means you can create the account, enter its rules, and centralize its tracking. It does not mean a direct sync is active.")}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROP_FIRMS.map(firm => <FirmCard key={firm.id} firm={firm} tr={tr} />)}
          </div>
          <p className="mt-5 rounded-2xl border border-[#FFB855]/15 bg-[#FFB855]/[0.035] px-4 py-3 text-[10px] leading-5 text-[#858D9B]">{tr("Les marques affichées restent la propriété de leurs détenteurs. Leur présence indique une compatibilité de suivi et n’implique aucun partenariat, agrément ou recommandation officielle.", "Displayed brands remain the property of their owners. Their presence indicates tracking compatibility and does not imply any official partnership, endorsement, or recommendation.")}</p>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#07080C] px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#9D87FF]"><span className="h-px w-7 bg-[#7657FF]" />{tr("Entrées de données", "Data input")}</div>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-[#F1F2F5] sm:text-4xl">{tr("Ce qui fonctionne aujourd’hui. Ce qui arrive ensuite.", "What works today. What comes next.")}</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#8D95A4]">{tr("PipsEvo affiche séparément les fonctions disponibles et les connexions qui nécessitent encore une API ou un fournisseur officiel. Aucun connecteur n’est présenté comme actif avant d’être réellement validé.", "PipsEvo clearly separates available features from connections that still require an official API or provider. No connector is presented as active before it is truly validated.")}</p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#46C99A]/20 bg-[#46C99A]/[0.035] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-semibold">{tr("Disponible maintenant", "Available now")}</h3><span className="h-2 w-2 rounded-full bg-[#46C99A] shadow-[0_0_16px_rgba(70,201,154,.65)]" /></div>
              <div className="mt-5 space-y-3">{availableMethods.map(item => {
                const Icon = methodIcons[item.id] || FileSpreadsheet;
                return <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-[#080A10] p-4 sm:p-5"><div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#46C99A]/20 bg-[#46C99A]/[0.06] text-[#65D8AE]"><Icon className="h-[18px] w-[18px]" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-[#EAECF0]">{item.name}</h4><StatusBadge status={item.status}>{item.statusLabel}</StatusBadge></div><p className="mt-2 text-xs leading-5 text-[#858D9C]">{item.description}</p>{item.id === "csv" && <Link to={user ? "/app/journal" : "/register"} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#65D8AE]">{tr("Ouvrir l’import", "Open import")}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div></div></article>;
              })}</div>
            </div>

            <div className="rounded-[24px] border border-[#7657FF]/20 bg-[#7657FF]/[0.035] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-semibold">{tr("Connexions en préparation", "Connections in preparation")}</h3><Clock3 className="h-4 w-4 text-[#A48EFF]" /></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{upcomingMethods.map(item => {
                const Icon = methodIcons[item.id] || Link2;
                return <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-[#080A10] p-4"><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#7657FF]/20 bg-[#7657FF]/[0.07] text-[#A28CF9]"><Icon className="h-4 w-4" /></span><h4 className="mt-4 text-sm font-semibold text-[#E7E9EE]">{item.name}</h4><p className="mt-2 text-[11px] leading-5 text-[#7E8695]">{item.description}</p><div className="mt-3"><StatusBadge status={item.status}>{item.statusLabel}</StatusBadge></div></article>;
              })}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1180px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#090B11] lg:grid-cols-[.85fr_1.15fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#9D87FF]"><span className="h-px w-7 bg-[#7657FF]" />{tr("Processus", "Workflow")}</div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-[#F1F2F5] sm:text-4xl">{tr("Ta plateforme exécute. PipsEvo donne du sens.", "Your platform executes. PipsEvo makes sense of it.")}</h2>
            <p className="mt-5 text-sm leading-7 text-[#8D95A4]">{tr("PipsEvo ne passe aucun ordre. Il centralise les informations utiles pour comprendre ton risque, ta discipline et ta progression.", "PipsEvo does not place orders. It centralizes the information needed to understand your risk, discipline, and progress.")}</p>
          </div>
          <div className="border-t border-white/[0.08] lg:border-l lg:border-t-0">
            {[
              ["01", tr("Ajoute le compte", "Add the account"), tr("Choisis la prop firm et renseigne les limites officielles de ton compte.", "Choose the prop firm and enter your account's official limits.")],
              ["02", tr("Journalise ou importe", "Log or import"), tr("Saisis tes trades manuellement ou utilise l’import CSV sécurisé.", "Enter trades manually or use the secure CSV import.")],
              ["03", tr("Analyse le processus", "Analyze the process"), tr("Relie résultats, règles, discipline et payouts dans une seule lecture.", "Connect results, rules, discipline, and payouts in one view.")],
            ].map(([number, title, copy], index) => <div key={number} className={`grid grid-cols-[40px_1fr] gap-4 p-6 sm:p-8 ${index ? "border-t border-white/[0.08]" : ""}`}><span className="font-mono text-xs text-[#706A82]">{number}</span><div><h3 className="font-semibold text-[#E9EBEF]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#818999]">{copy}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6 sm:pb-28 lg:px-10 lg:pb-32">
        <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[28px] border border-[#7657FF]/25 bg-[#0B0B14] px-6 py-14 text-center sm:px-10 sm:py-16">
          <span className="pointer-events-none absolute left-1/2 top-full h-52 w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7657FF]/20 blur-[100px]" />
          <h2 className="relative text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{tr("Centralise ton premier compte financé.", "Centralize your first funded account.")}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-6 text-[#929AA9]">{tr("La bêta est gratuite et ne demande aucune carte bancaire.", "The beta is free and requires no credit card.")}</p>
          <Link to={user ? "/app/accounts" : "/register"} className="btn-primary relative mt-7 inline-flex items-center gap-2 !rounded-xl">{user ? tr("Ouvrir mes comptes", "Open my accounts") : tr("Créer mon espace", "Create my workspace")}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>

    <PublicFooter />
  </div>;
}
