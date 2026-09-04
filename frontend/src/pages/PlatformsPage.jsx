import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock3, ExternalLink, FileSpreadsheet, Layers3, Link2, Search, ShieldCheck, Upload, WalletCards } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { INTEGRATIONS } from "@/config/integrations";
import { IMPORT_FORMATS_IN_VALIDATION, IMPORT_PLATFORMS } from "@/config/importPlatforms";
import { filterPropFirms, PROP_FIRMS, PROP_FIRM_PLATFORM_FILTERS, PROP_FIRM_PLATFORM_LABELS } from "@/config/propFirms";

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
  const initials = firm.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return <article className="group relative min-h-[280px] overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#090B11] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#7657FF]/35 sm:p-6">
    <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#7657FF]/0 blur-[55px] transition duration-300 group-hover:bg-[#7657FF]/[0.13]" />
    <div className="relative flex items-start justify-between gap-4">
      <div className="flex h-14 min-w-16 items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3">
        {firm.logo ? <img src={firm.logo} alt={`${firm.name} logo`} className={`${firm.logoClass} max-w-[118px] object-contain object-left`} /> : <span aria-hidden="true" className="text-sm font-semibold tracking-[.08em] text-[#D6D0F8]">{initials}</span>}
      </div>
      <StatusBadge status="available">{tr("Suivi manuel", "Manual tracking")}</StatusBadge>
    </div>
    <div className="relative mt-7">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#ECEEF2]">{firm.name}</h2>
      <p className="mt-1 text-xs text-[#7C8493]">{firm.marketTypes.map((market) => ({ futures: "Futures", cfd: "CFD / Forex", crypto: "Crypto" }[market] || market)).join(" · ")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {firm.platforms.map(platform => <span key={platform} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] text-[#A8AEB9]">{PROP_FIRM_PLATFORM_LABELS[platform]}</span>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {firm.importSupported && <StatusBadge status="available">{tr("Import format plateforme", "Platform-format import")}</StatusBadge>}
        {firm.autoSyncSupported ? <StatusBadge status="available">Auto-sync</StatusBadge> : firm.autoSyncStatus === "preparation" ? <StatusBadge status="preparation">{tr("Auto-sync en préparation", "Auto-sync in preparation")}</StatusBadge> : <span className="inline-flex items-center rounded-full border border-white/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.08em] text-[#8A92A1]">{tr("Auto-sync indisponible", "Auto-sync unavailable")}</span>}
      </div>
      <a href={firm.officialSource} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[11px] font-semibold text-[#A994FF] transition hover:text-[#C5B7FF]">{tr("Plateformes officielles", "Official platforms")}<ExternalLink className="h-3 w-3" /></a>
    </div>
  </article>;
}

function ImportPlatformCard({ platform, tr }) {
  return <article className="group relative overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#090B11] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#46C99A]/30 sm:p-6">
    <span className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[#46C99A]/0 blur-[55px] transition duration-300 group-hover:bg-[#46C99A]/[0.10]" />
    <div className="relative flex min-h-12 items-start justify-between gap-4">
      <div className={`flex h-12 min-w-16 max-w-[150px] items-center rounded-xl border border-white/[0.07] px-3 ${platform.logoSurface || "bg-white/[0.035]"}`}>
        <img src={platform.logo} alt={`${platform.name} logo`} className={`${platform.logoClass} max-w-full object-contain object-left`} />
      </div>
      <StatusBadge status="available">{tr("Import testé", "Tested import")}</StatusBadge>
    </div>
    <div className="relative mt-6">
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#ECEEF2]">{platform.name}</h3>
      <p className="mt-1 text-xs text-[#7C8493]">{tr(platform.marketsFr, platform.marketsEn)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {platform.formats.map(format => <span key={format} className="rounded-full border border-[#46C99A]/20 bg-[#46C99A]/[0.055] px-2.5 py-1 text-[10px] font-semibold text-[#65D8AE]">{format}</span>)}
      </div>
      <p className="mt-4 min-h-10 text-[11px] leading-5 text-[#8A92A1]">{tr(platform.instructionsFr, platform.instructionsEn)}</p>
      <a href={platform.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#A994FF] transition hover:text-[#C5B7FF]">{tr("Voir l’export officiel", "View official export guide")}<ExternalLink className="h-3 w-3" /></a>
    </div>
  </article>;
}

function ValidationPlatformCard({ platform, tr }) {
  return <article className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-[#090B11] p-4">
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.035] p-2">
      <img src={platform.logo} alt={`${platform.name} logo`} className="max-h-full max-w-full object-contain" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#E7E9EE]">{platform.name}</h3><span className="rounded-full border border-[#7657FF]/25 bg-[#7657FF]/[0.08] px-2 py-0.5 text-[9px] font-semibold text-[#B4A3F8]">{platform.format}</span></div>
      <p className="mt-1.5 text-[11px] leading-5 text-[#7E8695]">{tr(platform.noteFr, platform.noteEn)}</p>
      <a href={platform.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#9D87FF]">{tr("Source officielle", "Official source")}<ExternalLink className="h-3 w-3" /></a>
    </div>
  </article>;
}

export default function PlatformsPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const tr = (fr, en) => language === "en" ? en : fr;
  const availableMethods = INTEGRATIONS.filter(item => item.status === "available");
  const upcomingMethods = INTEGRATIONS.filter(item => item.status !== "available");
  const [firmQuery, setFirmQuery] = useState("");
  const [firmMarket, setFirmMarket] = useState("all");
  const [firmPlatform, setFirmPlatform] = useState("all");
  const filteredFirms = useMemo(() => filterPropFirms(PROP_FIRMS, { query: firmQuery, market: firmMarket, platform: firmPlatform }), [firmQuery, firmMarket, firmPlatform]);
  const coveredMarkets = useMemo(() => new Set(PROP_FIRMS.flatMap((firm) => firm.marketTypes)).size, []);

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
            <a href="#imports" className="btn-ghost inline-flex items-center justify-center gap-2 !rounded-xl">{tr("Voir les plateformes", "View platforms")}<ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 rounded-2xl border border-white/[0.075] bg-[#080A10]/80 py-5 text-center">
            <div className="min-w-0 px-2"><strong className="block text-2xl font-semibold text-white">{PROP_FIRMS.length}</strong><span className="mt-1 block text-[9px] uppercase leading-4 tracking-[.08em] text-[#8A92A1] sm:tracking-[.12em]">Prop firms</span></div>
            <div className="min-w-0 border-x border-white/[0.08] px-2"><strong className="block text-2xl font-semibold text-[#46C99A]">{IMPORT_PLATFORMS.length}</strong><span className="mt-1 block text-[9px] uppercase leading-4 tracking-[.08em] text-[#8A92A1] sm:tracking-[.12em]">{tr("Imports testés", "Tested imports")}</span></div>
            <div className="min-w-0 px-2"><strong className="block text-2xl font-semibold text-[#A994FF]">{coveredMarkets}</strong><span className="mt-1 block text-[9px] uppercase leading-4 tracking-[.08em] text-[#8A92A1] sm:tracking-[.12em]">{tr("Marchés couverts", "Markets covered")}</span></div>
          </div>
        </div>
      </section>

      <section id="imports" className="scroll-mt-24 px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-8 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#65D8AE]"><span className="h-px w-7 bg-[#46C99A]" />{tr("Import de trades", "Trade import")}</div>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] text-[#F1F2F5] sm:text-4xl lg:text-5xl">{tr("Importe ton historique depuis les plateformes déjà prises en charge.", "Import your history from supported platforms.")}</h2>
            </div>
            <p className="text-sm leading-7 text-[#8D95A4]">{tr("Chaque format annoncé comme disponible est couvert par l’importeur et vérifié avant écriture : aperçu, erreurs, doublons et annulation de l’import.", "Every format shown as available is handled by the importer and checked before writing: preview, errors, duplicates, and import rollback.")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_PLATFORMS.map(platform => <ImportPlatformCard key={platform.id} platform={platform} tr={tr} />)}
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#46C99A]/20 bg-[#46C99A]/[0.035] p-5 sm:flex-row sm:items-center">
            <div><h3 className="text-sm font-semibold text-[#E9EBEF]">{tr("Ton export ne correspond à aucune plateforme ?", "Your export does not match any platform?")}</h3><p className="mt-1 text-xs leading-5 text-[#858D9C]">{tr("Le modèle CSV universel PipsEvo reste disponible pour n’importe quel broker ou journal.", "The universal PipsEvo CSV template remains available for any broker or journal.")}</p></div>
            <Link to={user ? "/app/journal" : "/register"} className="btn-primary inline-flex shrink-0 items-center gap-2 !rounded-xl text-sm">{tr("Ouvrir l’import", "Open import")}<Upload className="h-4 w-4" /></Link>
          </div>

          <div className="mt-12 rounded-[24px] border border-[#7657FF]/20 bg-[#7657FF]/[0.035] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#A994FF]"><Clock3 className="h-3.5 w-3.5" />{tr("Formats identifiés", "Identified formats")}</div><h3 className="mt-3 text-xl font-semibold text-[#ECEEF2]">{tr("Exports officiels encore en validation", "Official exports still being validated")}</h3></div><p className="max-w-lg text-xs leading-5 text-[#858D9C]">{tr("Ils ne sont pas encore présentés comme compatibles : l’adaptateur et ses fichiers réels doivent d’abord passer les tests.", "They are not yet presented as compatible: the adapter and real files must pass tests first.")}</p></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">{IMPORT_FORMATS_IN_VALIDATION.map(platform => <ValidationPlatformCard key={platform.id} platform={platform} tr={tr} />)}</div>
          </div>

          <p className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[10px] leading-5 text-[#777F8E]">{tr("Les logos et marques appartiennent à leurs détenteurs. Leur affichage décrit uniquement un format d’import ou d’export et n’implique aucun partenariat avec PipsEvo.", "Logos and trademarks belong to their owners. Their display only describes an import or export format and does not imply any partnership with PipsEvo.")}</p>
        </div>
      </section>

      <section id="compatibility" className="scroll-mt-24 border-t border-white/[0.06] bg-[#07080C] px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#9D87FF]"><span className="h-px w-7 bg-[#7657FF]" />Prop firms</div>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] text-[#F1F2F5] sm:text-4xl lg:text-5xl">{tr("Les comptes que tu peux déjà piloter dans PipsEvo.", "The accounts you can already manage in PipsEvo.")}</h2>
            <p className="mt-5 text-sm leading-7 text-[#8D95A4] sm:text-[15px]">{tr("La compatibilité signifie que tu peux créer le compte, renseigner ses règles et centraliser son suivi. Elle ne signifie pas qu’une synchronisation directe est active.", "Compatibility means you can create the account, enter its rules, and centralize its tracking. It does not mean a direct sync is active.")}</p>
          </div>
          <div className="mt-8 grid gap-3 rounded-2xl border border-white/[0.075] bg-[#090B11] p-4 md:grid-cols-[1fr_auto_auto]">
            <label className="relative block"><span className="sr-only">{tr("Rechercher une prop firm", "Search a prop firm")}</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#69717F]" /><input value={firmQuery} onChange={(event) => setFirmQuery(event.target.value)} className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#07080C] pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#7657FF]/60" placeholder={tr("Rechercher une prop firm ou une plateforme…", "Search a prop firm or platform…")} /></label>
            <label><span className="sr-only">{tr("Filtrer par marché", "Filter by market")}</span><select value={firmMarket} onChange={(event) => setFirmMarket(event.target.value)} className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#07080C] px-3 text-sm text-[#D5D8DF] outline-none focus:border-[#7657FF]/60"><option value="all">{tr("Tous les marchés", "All markets")}</option><option value="futures">Futures</option><option value="cfd">CFD / Forex</option><option value="crypto">Crypto</option></select></label>
            <label><span className="sr-only">{tr("Filtrer par plateforme", "Filter by platform")}</span><select value={firmPlatform} onChange={(event) => setFirmPlatform(event.target.value)} className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#07080C] px-3 text-sm text-[#D5D8DF] outline-none focus:border-[#7657FF]/60"><option value="all">{tr("Toutes les plateformes", "All platforms")}</option>{PROP_FIRM_PLATFORM_FILTERS.map((platform) => <option key={platform} value={platform}>{PROP_FIRM_PLATFORM_LABELS[platform]}</option>)}</select></label>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFirms.map(firm => <FirmCard key={firm.id} firm={firm} tr={tr} />)}
          </div>
          {!filteredFirms.length && <p role="status" className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center text-sm text-[#8D95A4]">{tr("Aucune prop firm ne correspond à ces filtres.", "No prop firm matches these filters.")}</p>}
          <p className="mt-5 rounded-2xl border border-[#FFB855]/15 bg-[#FFB855]/[0.035] px-4 py-3 text-[10px] leading-5 text-[#858D9B]">{tr("Les marques affichées restent la propriété de leurs détenteurs. Leur présence indique une compatibilité de suivi et n’implique aucun partenariat, agrément ou recommandation officielle.", "Displayed brands remain the property of their owners. Their presence indicates tracking compatibility and does not imply any official partnership, endorsement, or recommendation.")}</p>
        </div>
      </section>

      <section className="border-y border-white/[0.06] px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
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
            ].map(([number, title, copy], index) => <div key={number} className={`grid grid-cols-[40px_1fr] gap-4 p-6 sm:p-8 ${index ? "border-t border-white/[0.08]" : ""}`}><span className="font-mono text-xs text-[#918AA4]">{number}</span><div><h3 className="font-semibold text-[#E9EBEF]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#818999]">{copy}</p></div></div>)}
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
