import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Brain, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, LifeBuoy, Mail, Minus, Search, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { contact } from "@/lib/api";
import { toast } from "sonner";
import { openCookieSettings } from "@/components/CookieConsent";
import { BILLING_CONFIG, COMMERCIAL_PHASES, PLANS, PRICING_COMPARISON, formatBillingPrice, launchOfferCopy } from "@/config/billing";
import { captureCommercialEvent } from "@/lib/commercialAnalytics";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { getGuideBySlug, guides } from "@/content/guides";
import { FadeIn, MotionScope } from "../components/motion/MotionSystem";

const faqs = [
  { category: "start", questionFr: "Comment ajouter mon premier trade ?", questionEn: "How do I add my first trade?", answerFr: "Depuis le Journal, clique sur « Nouveau trade », choisis ton compte puis renseigne le résultat, le contexte et le respect de ton plan. Tu peux compléter les détails plus tard.", answerEn: "From the Journal, select “New trade”, choose your account, then enter the result, context, and plan compliance. You can complete the details later." },
  { category: "start", questionFr: "Puis-je importer un historique existant ?", questionEn: "Can I import an existing history?", answerFr: "Oui, l’import CSV sécurisé est disponible depuis le Journal. Les connexions automatiques restent clairement indiquées comme étant en préparation tant qu’elles ne sont pas validées.", answerEn: "Yes. Secure CSV import is available from the Journal. Automatic connections remain clearly marked as in preparation until they are validated." },
  { category: "accounts", questionFr: "Quelles prop firms sont compatibles ?", questionEn: "Which prop firms are supported?", answerFr: "Le suivi guidé couvre actuellement Topstep, Apex, FTMO, FundedNext, The5ers et Take Profit Trader. Leur présence indique une compatibilité de suivi, pas un partenariat officiel.", answerEn: "Guided tracking currently covers Topstep, Apex, FTMO, FundedNext, The5ers, and Take Profit Trader. Their presence indicates tracking compatibility, not an official partnership." },
  { category: "accounts", questionFr: "Puis-je suivre plusieurs comptes ?", questionEn: "Can I track multiple accounts?", answerFr: "Oui. PipsEvo centralise les comptes et permet de filtrer les résultats par compte, période et actif. Les limites du plan actif sont toujours affichées avant l’ajout.", answerEn: "Yes. PipsEvo centralizes accounts and lets you filter results by account, period, and asset. Your current plan limits are always shown before adding one." },
  { category: "analysis", questionFr: "PipsEvo donne-t-il des signaux de trading ?", questionEn: "Does PipsEvo provide trading signals?", answerFr: "Non. PipsEvo analyse uniquement tes propres données, ta discipline et ton processus. Il ne prédit pas le marché et ne recommande aucune entrée ou sortie.", answerEn: "No. PipsEvo only analyzes your own data, discipline, and process. It does not predict markets or recommend entries or exits." },
  { category: "analysis", questionFr: "Comment fonctionne Atlas IA ?", questionEn: "How does Atlas AI work?", answerFr: "Atlas s’appuie sur les trades présents dans ton journal pour faire ressortir des habitudes, écarts au plan et pistes de travail. Une réponse utile doit pouvoir être reliée aux données utilisées.", answerEn: "Atlas uses the trades in your journal to surface habits, plan deviations, and areas to work on. A useful answer should be traceable to the data it used." },
  { category: "security", questionFr: "Mes données sont-elles privées ?", questionEn: "Is my data private?", answerFr: "Tes données sont associées à ton compte et les espaces privés exigent une authentification. Les données d’analyse facultatives ne sont chargées qu’après ton accord.", answerEn: "Your data is linked to your account and private areas require authentication. Optional analytics data is only loaded after your consent." },
  { category: "security", questionFr: "Puis-je exporter ou supprimer mes données ?", questionEn: "Can I export or delete my data?", answerFr: "Oui. L’export est disponible dans les paramètres. Tu peux également demander la suppression définitive de ton compte depuis ton espace ou contacter le support.", answerEn: "Yes. Export is available in Settings. You can also request permanent account deletion from your workspace or contact support." },
  { category: "billing", questionFr: "La bêta est-elle vraiment gratuite ?", questionEn: "Is the beta really free?", answerFr: "Oui. Aucun abonnement payant ni carte bancaire ne sont requis pendant la bêta. Les futurs tarifs seront annoncés avant toute activation.", answerEn: "Yes. No paid subscription or credit card is required during beta. Future pricing will be announced before any activation." },
  { category: "billing", questionFr: "Que signifient les fonctions « prévues » ?", questionEn: "What do “planned” features mean?", answerFr: "Elles font partie de la feuille de route, mais ne sont ni présentées comme actives ni vendues aujourd’hui. Leur disponibilité peut encore évoluer.", answerEn: "They are part of the roadmap but are not presented as active or sold today. Their availability may still change." },
];

function PublicLayout({ eyebrow = "PipsEvo", title, subtitle, children, wide = false }) {
  return <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
    <PublicHeader variant="landing" />
    <MotionScope as="main" routeKey={title} id="main-content" className={`relative mx-auto px-5 pb-24 pt-40 sm:px-6 sm:pt-44 lg:px-10 lg:pb-32 lg:pt-48 ${wide ? "max-w-[1280px]" : "max-w-[1120px]"}`}>
      <div className="pointer-events-none absolute left-1/2 top-24 h-72 w-[720px] max-w-[90vw] -translate-x-1/2 rounded-full bg-[#7657FF]/[0.10] blur-[110px]" />
      <FadeIn className="relative mb-12 text-center sm:mb-14">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#7657FF]/25 bg-[#7657FF]/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#B29FFF]"><Sparkles className="h-3 w-3" />{eyebrow}</div>
        <h1 className="pe-marketing-title mx-auto mt-6 text-[#F2F3F6]">{title}</h1>
        <p className="pe-marketing-copy mx-auto mt-4">{subtitle}</p>
      </FadeIn>
      <div className="relative">{children}</div>
    </MotionScope>
    <PublicFooter />
  </div>;
}

export function FAQPage(){
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = [
    ["all", t("Toutes", "All")], ["start", t("Démarrage", "Getting started")], ["accounts", t("Comptes", "Accounts")],
    ["analysis", t("Analyse", "Analysis")], ["security", t("Sécurité", "Security")], ["billing", t("Bêta et tarifs", "Beta and pricing")],
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase(language === "en" ? "en" : "fr");
  const filtered = useMemo(() => faqs.filter(item => {
    if (category !== "all" && item.category !== category) return false;
    if (!normalizedQuery) return true;
    const haystack = `${language === "en" ? item.questionEn : item.questionFr} ${language === "en" ? item.answerEn : item.answerFr}`.toLocaleLowerCase(language === "en" ? "en" : "fr");
    return haystack.includes(normalizedQuery);
  }), [category, language, normalizedQuery]);

  return <PublicLayout eyebrow={t("Base de connaissances", "Knowledge base")} title={t("Questions fréquentes", "Frequently asked questions")} subtitle={t("Des réponses précises sur le journal, les comptes financés, Atlas et la sécurité de tes données.", "Clear answers about the journal, funded accounts, Atlas, and your data security.")} wide>
    <div className="mx-auto max-w-4xl">
      <label className="relative block">
        <span className="sr-only">{t("Rechercher dans la FAQ", "Search the FAQ")}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#737C8C]" />
        <input value={query} onChange={event => setQuery(event.target.value)} className="h-14 w-full rounded-2xl border border-white/[0.09] bg-[#0A0C14] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-[#656D7B] focus:border-[#7657FF]/65 focus:ring-4 focus:ring-[#7657FF]/10" placeholder={t("Rechercher une question…", "Search for a question…")} />
      </label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label={t("Catégories de questions", "Question categories")}>{categories.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition ${category === id ? "border-[#7657FF]/55 bg-[#7657FF]/15 text-[#D9D0FF]" : "border-white/[0.08] bg-white/[0.02] text-[#8E96A5] hover:border-white/20 hover:text-white"}`}>{label}</button>)}</div>
      <div className="mt-8 divide-y divide-white/[0.07] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090B12]">
        {filtered.map(item => {
          const question = language === "en" ? item.questionEn : item.questionFr;
          const answer = language === "en" ? item.answerEn : item.answerFr;
          return <details key={question} className="group px-5 sm:px-7">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-[15px] font-semibold text-[#E7E9EE] sm:py-6"><span>{question}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#7C8494] transition group-open:rotate-180 group-open:text-[#AA94FF]" /></summary>
            <p className="max-w-3xl pb-6 pr-9 text-sm leading-7 text-[#8D95A4]">{answer}</p>
          </details>;
        })}
        {!filtered.length && <div className="px-6 py-12 text-center"><CircleHelp className="mx-auto h-6 w-6 text-[#876DFF]" /><p className="mt-4 font-semibold">{t("Aucun résultat pour cette recherche.", "No result for this search.")}</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }} className="mt-3 text-sm text-[#AA94FF] hover:text-white">{t("Réinitialiser la recherche", "Reset search")}</button></div>}
      </div>
      <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-[22px] border border-[#7657FF]/20 bg-[#7657FF]/[0.055] p-6 sm:flex-row sm:items-center">
        <div><h2 className="font-semibold text-[#F0F1F4]">{t("Tu ne trouves pas ta réponse ?", "Can’t find your answer?")}</h2><p className="mt-1.5 text-sm text-[#8F97A6]">{t("Explique-nous précisément ce qui te bloque.", "Tell us exactly what is blocking you.")}</p></div>
        <Link to="/contact" className="btn-primary inline-flex shrink-0 items-center gap-2 !rounded-xl">{t("Contacter le support", "Contact support")}<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  </PublicLayout>;
}

export function ContactPage(){
  const [form,setForm]=useState({name:"",email:"",subject:"",message:""});
  const [sending,setSending]=useState(false);
  const submit=async(e)=>{e.preventDefault();setSending(true);try{await contact(form);toast.success("Message envoyé");setForm({name:"",email:"",subject:"",message:""})}catch(e){toast.error(e.response?.data?.detail || "Envoi impossible")}finally{setSending(false)}};
  const field=(key,label,type="text",autoComplete)=><label htmlFor={`contact-${key}`} className="block text-xs text-[#9CA3AF]">{label}<input id={`contact-${key}`} name={key} type={type} autoComplete={autoComplete} required value={form[key]} onChange={event=>setForm({...form,[key]:event.target.value})} className="pe-control mt-2 w-full"/></label>;
  return <PublicLayout title="Contacte-nous" subtitle="Une question, une difficulté ou une suggestion ? Notre équipe te répond.">
    <div className="grid gap-5 md:grid-cols-3">
      <div className="card-elev space-y-4 p-6"><Mail className="text-[#B58BFF]"/><div><div className="font-semibold">Support</div><div className="mt-1 text-sm text-[#9CA3AF]">Réponse habituelle sous 1 à 2 jours ouvrés.</div></div><a href="mailto:tyachatfr@gmail.com" className="text-sm text-[#B58BFF] hover:text-white">tyachatfr@gmail.com</a></div>
      <form onSubmit={submit} className="card-elev space-y-4 p-6 md:col-span-2">{field("name","Ton nom","text","name")}{field("email","Ton e-mail","email","email")}{field("subject","Sujet")}<label htmlFor="contact-message" className="block text-xs text-[#9CA3AF]">Message<textarea id="contact-message" name="message" required minLength={10} value={form.message} onChange={event=>setForm({...form,message:event.target.value})} rows={6} className="pe-control mt-2 h-auto min-h-36 w-full resize-y py-3"/></label><button disabled={sending} className="btn-primary w-full disabled:opacity-50">{sending?"Envoi…":"Envoyer le message"}</button><p className="text-pe-micro text-[#6B7280]">Les informations envoyées servent uniquement à traiter ta demande.</p></form>
    </div>
  </PublicLayout>;
}

export function PricingPage(){
  const { user }=useAuth();
  const phase=BILLING_CONFIG.currentPhase;
  const isBeta=phase===COMMERCIAL_PHASES.BETA;
  const isLaunch=phase===COMMERCIAL_PHASES.LAUNCH_OFFER;
  const launch=launchOfferCopy();
  useEffect(()=>captureCommercialEvent("pricing_viewed",{phase}),[phase]);
  const title=isBeta?"La bêta est gratuite":isLaunch?"L’offre de lancement PipsEvo":"Choisis ton plan PipsEvo";
  const subtitle=isBeta?"Teste les fonctions essentielles de PipsEvo gratuitement, sans carte bancaire.":isLaunch?`${launch.title} ${launch.detail}`:"Deux formules claires, sans engagement et adaptées à ton rythme.";
  const visiblePlans=isBeta?[PLANS.beta,PLANS.essential,PLANS.pro]:[PLANS.essential,PLANS.pro];
  return <PublicLayout title={title} subtitle={subtitle} wide>
    {isBeta&&<div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#46C99A]/20 bg-[#46C99A]/[0.05] p-5 text-center"><div className="text-xs font-mono uppercase tracking-[.2em] text-[#46C99A]">Bêta gratuite en cours</div><p className="mt-2 text-sm leading-relaxed text-[#B5BBC9]">Les fonctions indiquées comme « prévues » ne sont pas encore vendues ni présentées comme disponibles. Tu peux utiliser la bêta immédiatement et sans carte bancaire.</p></div>}
    {isLaunch&&<div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#7C4DFF]/30 bg-gradient-to-r from-[#7C4DFF]/10 to-[#4F8CFF]/10 p-5 text-center"><div className="text-xs font-mono uppercase tracking-[.2em] text-[#C8AEFF]">Offre réservée aux utilisateurs ayant rejoint la bêta</div><p className="mt-2 text-sm text-white">Sans engagement. Annulation possible à tout moment.</p>{BILLING_CONFIG.launchOfferEndDate&&<p className="mt-2 text-xs text-[#9CA3AF]">Offre valable jusqu’au {new Date(BILLING_CONFIG.launchOfferEndDate).toLocaleDateString("fr-FR")}.</p>}</div>}
    <div className="mb-5 text-center text-xs font-mono uppercase tracking-[.2em] text-[#7E8798]">{isBeta?"Accès actuel et tarifs mensuels prévus":"Abonnements mensuels"}</div>
    <div className={`mx-auto grid max-w-6xl gap-5 ${visiblePlans.length===3?"lg:grid-cols-3":"md:grid-cols-2"}`}>
      {visiblePlans.map(plan=><Plan key={plan.id} plan={plan} phase={phase} recommended={plan.id==="pro"} current={isBeta&&plan.id==="beta"} authenticated={Boolean(user)}/>)}
    </div>
    <PricingComparison/>
    <div className="mx-auto mt-7 max-w-3xl rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-5 text-center text-sm leading-relaxed text-[#9CA3AF]">{isBeta?"Les tarifs Essential et Pro sont indicatifs tant que la facturation n’est pas activée. Toute évolution sera annoncée avant le lancement et aucun prélèvement ne sera effectué sans ton accord.":"Le paiement n’est pas encore activé. Aucun prélèvement ne sera effectué sans ton consentement explicite."}</div>
  </PublicLayout>;
}
const Plan=({plan,phase,recommended=false,current=false,authenticated=false})=>{
  const isBetaPlan=plan.id==="beta";
  const unavailable=phase===COMMERCIAL_PHASES.BETA&&!isBetaPlan;
  const event=plan.id==="pro"?"pro_clicked":"essential_clicked";
  const launchPro=phase===COMMERCIAL_PHASES.LAUNCH_OFFER&&plan.id==="pro";
  return <article className={`card-elev relative flex h-full flex-col overflow-hidden p-6 sm:p-7 ${recommended?"glow-purple border-[#7C4DFF]/55":""} ${current?"border-[#46C99A]/35 bg-[#46C99A]/[0.025]":""}`}>
    {recommended&&<span className="pe-badge absolute right-5 top-5 border-[#7C4DFF]/35 bg-[#7C4DFF]/15 text-[#C8AEFF]">LE PLUS COMPLET</span>}
    {current&&<span className="pe-badge absolute right-5 top-5 border-[#46C99A]/30 bg-[#46C99A]/10 text-[#65D8AE]">DISPONIBLE</span>}
    <div className="pr-24 text-[#B58BFF] font-mono uppercase text-xs">{plan.name}</div>
    <div className="mt-4 flex flex-wrap items-end gap-2"><span className="text-4xl font-bold font-numeric">{launchPro?formatBillingPrice(BILLING_CONFIG.prices.betaLaunch):formatBillingPrice(plan.price)}</span>{!isBetaPlan&&<span className="pb-1 text-sm text-[#9CA3AF]">/mois</span>}</div>
    {launchPro&&<p className="mt-2 text-xs text-[#C8AEFF]">Premier mois, puis {formatBillingPrice(BILLING_CONFIG.prices.pro)}/mois.</p>}
    <p className="mt-4 min-h-10 text-sm leading-relaxed text-[#9CA3AF]">{plan.description}</p>
    <div className="mt-6 flex-1 space-y-3">{plan.features.map(x=><div key={x} className="flex gap-2 text-sm text-[#D0D4DE]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#46C99A]"/>{x}</div>)}</div>
    {current?<Link to={authenticated?"/app/dashboard":"/register"} onClick={()=>captureCommercialEvent("beta_cta_clicked",{phase,authenticated})} className="btn-primary mt-7 inline-flex w-full items-center justify-center">{authenticated?"Ouvrir mon espace":"Commencer gratuitement"}</Link>:<button type="button" disabled onClick={()=>captureCommercialEvent(event,{phase})} title={unavailable?"Disponible après la bêta":"Paiement en cours de préparation"} className={`${recommended?"btn-primary":"btn-ghost"} mt-7 w-full cursor-not-allowed opacity-60`}>{unavailable?"Disponible après la bêta":launchPro?`Profiter de l’offre à ${formatBillingPrice(BILLING_CONFIG.prices.betaLaunch)}`:`Choisir ${plan.id==="pro"?"Pro":"Essential"}`}</button>}
    {!current&&<p className="mt-2 text-center text-pe-micro text-[#7E8798]">{unavailable?"Fonctionnalités et paiement encore en préparation.":"Aucun débit aujourd’hui."}</p>}
  </article>;
};

const ComparisonValue=({value})=>{
  if(value===true)return <span className="inline-flex items-center gap-1.5 text-[#CFEFDD]"><Check className="h-4 w-4 text-[#46C99A]"/>Inclus</span>;
  if(value==="planned")return <span className="inline-flex items-center gap-1.5 text-[#C8AEFF]"><Clock3 className="h-4 w-4"/>Prévu</span>;
  if(value===false)return <span className="inline-flex items-center gap-1.5 text-[#6F7787]"><Minus className="h-4 w-4"/>Non inclus</span>;
  return <span className="text-[#D6D9E2]">{value}</span>;
};

const PricingComparison=()=> <section aria-labelledby="pricing-comparison-title" className="mt-16 sm:mt-20">
  <div className="mx-auto mb-7 max-w-3xl text-center"><div className="text-xs font-mono uppercase tracking-[.2em] text-[#B58BFF]">Comparaison transparente</div><h2 id="pricing-comparison-title" className="mt-3 text-2xl font-bold sm:text-3xl">Ce que chaque formule comprend</h2><p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">« Prévu » signifie que la fonctionnalité fait partie de la feuille de route, mais qu’elle n’est pas encore commercialisée.</p></div>
  <div className="hidden overflow-hidden rounded-3xl border border-white/[0.08] bg-[#090B13] lg:block">
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Comparaison des formules Bêta, Essential et Pro</caption>
      <thead className="bg-[#0F1220]"><tr><th scope="col" className="w-[46%] px-6 py-5 text-xs uppercase tracking-[.16em] text-[#8E96A7]">Fonctionnalité</th><th scope="col" className="w-[18%] px-4 py-5 text-[#65D8AE]">Bêta</th><th scope="col" className="w-[18%] px-4 py-5 text-white">Essential</th><th scope="col" className="w-[18%] px-4 py-5 text-[#C8AEFF]">Pro</th></tr></thead>
      <tbody>{PRICING_COMPARISON.map(section=><React.Fragment key={section.id}><tr><th colSpan={4} scope="colgroup" className="border-y border-white/[0.07] bg-white/[0.025] px-6 py-4 text-xs font-semibold uppercase tracking-[.16em] text-[#B58BFF]">{section.title}</th></tr>{section.rows.map(row=><tr key={row.label} className="border-b border-white/[0.06] last:border-b-0"><th scope="row" className="px-6 py-4 font-medium text-[#E5E7ED]">{row.label}</th><td className="px-4 py-4"><ComparisonValue value={row.beta}/></td><td className="px-4 py-4"><ComparisonValue value={row.essential}/></td><td className="bg-[#7C4DFF]/[0.025] px-4 py-4"><ComparisonValue value={row.pro}/></td></tr>)}</React.Fragment>)}</tbody>
    </table>
  </div>
  <div className="space-y-4 lg:hidden">{PRICING_COMPARISON.map(section=><details key={section.id} className="card-flat group overflow-hidden" open={section.id==="accounts"}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold"><span>{section.title}</span><span aria-hidden="true" className="text-xl text-[#B58BFF] transition-transform group-open:rotate-45">+</span></summary><div className="border-t border-white/[0.07] px-4 pb-4">{section.rows.map(row=><div key={row.label} className="border-b border-white/[0.06] py-4 last:border-b-0"><div className="mb-3 text-sm font-medium text-white">{row.label}</div><div className="grid grid-cols-3 gap-2 text-xs"><div><div className="mb-1.5 text-pe-micro uppercase tracking-wider text-[#65D8AE]">Bêta</div><ComparisonValue value={row.beta}/></div><div><div className="mb-1.5 text-pe-micro uppercase tracking-wider text-[#9CA3AF]">Essential</div><ComparisonValue value={row.essential}/></div><div><div className="mb-1.5 text-pe-micro uppercase tracking-wider text-[#C8AEFF]">Pro</div><ComparisonValue value={row.pro}/></div></div></div>)}</div></details>)}</div>
</section>;

export const legal = {
  privacy:{title:"Politique de confidentialité",intro:"Comprendre quelles données sont utilisées et garder le contrôle sur tes choix.",sections:[
    ["Responsable du traitement","[À RENSEIGNER : raison sociale ou nom de l’éditeur], [À RENSEIGNER : forme juridique, capital et numéro d’immatriculation], [À RENSEIGNER : adresse du siège]. Contact données : tyachatfr@gmail.com."],
    ["Données de compte et d’usage","PipsEvo traite l’adresse e-mail, le nom affiché, les préférences, les données d’onboarding, les comptes de trading, règles, trades, notes, tags, captures, payouts, check-lists et conversations Atlas que tu fournis. Les journaux techniques peuvent contenir un identifiant interne, un code d’erreur, un statut et une durée, jamais les mots de passe ou jetons secrets."],
    ["Finalités et bases","Ces informations servent à créer et sécuriser le compte, fournir le journal et les analyses demandées, synchroniser un compte quand tu actives explicitement un connecteur, délivrer les e-mails transactionnels, traiter le support et améliorer le produit avec ton consentement pour les statistiques facultatives. Elles ne sont pas vendues."],
    ["Atlas IA","Une question Atlas déclenche le calcul de métriques structurées à partir de tes données PipsEvo, puis leur transmission au fournisseur Anthropic afin de produire une analyse comportementale. Atlas ne doit pas recevoir tes mots de passe de trading et ne fournit ni signal ni conseil financier."],
    ["Synchronisation des comptes","Une connexion automatique n’est lancée qu’à ta demande. MetaApi peut recevoir les identifiants MetaTrader nécessaires à la connexion ; PipsEvo chiffre les secrets persistés par ses connecteurs ou les transmet sans les conserver lorsque le flux le prévoit. Les statuts disponibles dans l’interface distinguent suivi manuel, import et auto-sync."],
    ["Statistiques facultatives et stockage local","PostHog (région US configurée) n’est chargé qu’après ton consentement. L’autocapture et l’enregistrement de session sont désactivés ; les pages vues et événements produit explicitement codés peuvent être mesurés. La préférence de consentement, certains réglages d’interface et états non sensibles sont conservés dans le stockage local du navigateur."],
    ["Prestataires et hébergement","Le frontend est hébergé par Vercel, l’API par Render, l’authentification et certains espaces de données utilisent Supabase, les données applicatives utilisent MongoDB Atlas, les e-mails sont envoyés via Resend, Atlas utilise Anthropic et la synchronisation MetaTrader peut utiliser MetaApi. Leurs lieux de traitement et garanties contractuelles doivent être vérifiés par l’éditeur avant mise en production commerciale."],
    ["Transferts hors Espace économique européen","Certains prestataires configurés peuvent traiter des données hors de l’EEE, notamment PostHog dans sa région US. [À RENSEIGNER : mécanismes de transfert et liste contractuelle des sous-traitants après validation juridique]."],
    ["Conservation","Les données du compte sont conservées tant qu’il est actif, puis supprimées lors de la suppression effective sous réserve des obligations légales et sauvegardes techniques. [À RENSEIGNER : durées exactes des journaux, sauvegardes, demandes support et e-mails]."],
    ["Tes droits","Tu peux demander l’accès, la rectification, la portabilité, l’opposition, la limitation ou la suppression selon la réglementation applicable. L’export et la suppression sont accessibles dans Paramètres ; tu peux aussi écrire à tyachatfr@gmail.com. Tu peux retirer le consentement statistique à tout moment via « Gérer les cookies »."],
    ["Réclamation","Si le RGPD s’applique et qu’un différend subsiste, tu peux saisir l’autorité de contrôle compétente. Pour la France : la CNIL. [À RENSEIGNER : pays d’établissement et autorité compétente de l’éditeur]."],
  ]},
  terms:{title:"Conditions d’utilisation",intro:"Règles applicables à l’utilisation de la version bêta de PipsEvo.",sections:[
    ["Éditeur","Le service est édité par [À RENSEIGNER : raison sociale ou nom], [À RENSEIGNER : adresse et immatriculation]. Contact : tyachatfr@gmail.com."],
    ["Objet du service","PipsEvo est un outil de journalisation et d’analyse comportementale. Il ne fournit ni conseil financier, ni signal, ni recommandation d’achat ou de vente."],
    ["Version bêta","Le service peut évoluer, être interrompu ou contenir des erreurs. L’accès est actuellement gratuit et aucun paiement ne peut être souscrit pendant la bêta."],
    ["Compte et sécurité","Tu dois fournir des informations exactes, protéger tes accès et signaler tout usage non autorisé. Les fonctions de connexion automatique sont optionnelles et leur disponibilité dépend aussi de prestataires tiers."],
    ["Responsabilité de l’utilisateur","Tu restes seul responsable de tes décisions, de tes comptes de trading, des informations saisies, des règles officielles de ta prop firm et de la sécurité de tes identifiants. Toute performance passée affichée provient des données saisies ou importées et ne garantit aucun résultat futur."],
    ["Utilisation acceptable","Il est interdit de compromettre le service, contourner ses protections, automatiser des accès abusifs ou utiliser PipsEvo pour promouvoir des rendements garantis."],
    ["Données et propriété intellectuelle","Tu conserves tes droits sur les contenus et données que tu fournis. Tu accordes uniquement les autorisations techniques nécessaires pour fournir le service. L’interface, la marque et le code PipsEvo restent protégés par les droits applicables."],
    ["Disponibilité, suspension et suppression","PipsEvo ne garantit pas une disponibilité permanente. Un compte peut être suspendu en cas d’abus ou de risque de sécurité. Tu peux exporter puis supprimer ton compte depuis Paramètres ou contacter le support."],
    ["Responsabilité et droit applicable","Dans les limites autorisées par la loi, PipsEvo n’est pas responsable des décisions de trading, pertes financières, indisponibilités d’une prop firm ou d’un fournisseur externe. [À RENSEIGNER : droit applicable, tribunal compétent et procédure de médiation consommateur si applicable]."],
  ]},
  notice:{title:"Mentions légales",intro:"Informations sur l’éditeur et les prestataires techniques de PipsEvo.",sections:[
    ["Éditeur du site","[À RENSEIGNER : raison sociale ou nom complet] — [À RENSEIGNER : forme juridique et capital] — [À RENSEIGNER : numéro SIREN/RCS ou équivalent] — [À RENSEIGNER : adresse du siège]."],
    ["Direction de la publication","[À RENSEIGNER : nom du directeur ou de la directrice de publication]."],
    ["Contact","Support et contact légal : tyachatfr@gmail.com. [À RENSEIGNER : téléphone professionnel si requis]."],
    ["Hébergement","Frontend : Vercel Inc. API : Render Services, Inc. Authentification : Supabase, Inc. Base applicative : MongoDB Atlas. [À RENSEIGNER : adresses légales des hébergeurs requises par la juridiction applicable]."],
    ["Propriété intellectuelle","PipsEvo, son interface et ses contenus originaux sont protégés. Les logos de plateformes et prop firms restent la propriété de leurs détenteurs et n’impliquent aucun partenariat."],
  ]},
  cookies:{title:"Politique relative aux cookies",intro:"Comprendre les stockages nécessaires et les statistiques facultatives.",sections:[
    ["Stockages nécessaires","Supabase utilise le stockage navigateur nécessaire au maintien sécurisé de la session. PipsEvo stocke aussi certaines préférences d’interface, de langue, de check-list et de consentement. Ces éléments sont nécessaires au fonctionnement demandé et ne servent pas à la publicité ciblée."],
    ["Mesure d’audience facultative","PostHog n’est chargé qu’après accord. La configuration actuelle désactive l’autocapture et l’enregistrement de session, limite les profils aux utilisateurs identifiés et mesure uniquement les pages vues ou événements produit explicitement déclenchés."],
    ["Durée et liste détaillée","[À RENSEIGNER : tableau final des clés/cookies, finalité, domaine et durée après inventaire de production]. Le stockage PostHog utilise actuellement le localStorage lorsque tu l’acceptes."],
    ["Modifier ton choix","Tu peux accepter ou refuser les statistiques dans le bandeau, puis rouvrir les préférences avec le bouton ci-dessous. Le refus n’empêche pas l’utilisation des fonctions essentielles."],
  ]},
  data:{title:"Gestion de tes données",intro:"Exporter, corriger ou supprimer les informations associées à ton compte.",sections:[
    ["Exporter","Depuis Paramètres, tu peux générer une archive des données disponibles pour ton profil, tes comptes, trades, payouts et analyses associées. Vérifie l’archive avant toute suppression."],
    ["Rectifier","Les informations de profil, comptes et trades peuvent être corrigées dans l’application. Pour une donnée non modifiable, contacte tyachatfr@gmail.com depuis l’adresse du compte."],
    ["Supprimer le compte","La suppression définitive est disponible dans Paramètres. Elle vise le profil et les données applicatives associées. Une reconnexion ou une vérification récente peut être demandée par le fournisseur d’authentification."],
    ["Délais et sauvegardes","La demande est traitée dans les délais prévus par la réglementation applicable. [À RENSEIGNER : délai de purge des sauvegardes et durée de conservation des journaux de sécurité]."],
    ["E-mails","Chaque newsletter contient un lien de désinscription en un clic. Les préférences e-mail transactionnelles et marketing sont séparées ; certains messages de sécurité indispensables au compte ne peuvent pas être désactivés."],
  ]},
  security:{title:"Sécurité",intro:"Mesures appliquées et bonnes pratiques pour protéger ton espace.",sections:[
    ["Protection du compte","Les mots de passe sont hachés et ne sont pas enregistrés en clair. Les routes privées exigent un jeton d’authentification."],
    ["Transport et accès","Les services déployés utilisent HTTPS. Les données d’un utilisateur sont filtrées par son identifiant côté API."],
    ["Bonnes pratiques","Utilise un mot de passe unique, ne partage jamais ton jeton de connexion et déconnecte-toi des appareils partagés."],
    ["Signalement","En cas d’activité suspecte ou de vulnérabilité, contacte tyachatfr@gmail.com sans publier les détails sensibles."],
    ["Limites actuelles","La double authentification et la gestion avancée des sessions ne sont pas encore disponibles pendant la bêta."],
  ]},
  affiliate:{title:"Conditions du programme partenaire",intro:"Le programme n’est pas encore ouvert commercialement.",sections:[
    ["Statut du programme","Les candidatures servent uniquement à manifester un intérêt. Aucun lien rémunéré ni commission n’est actuellement garanti."],
    ["Communication responsable","Un futur partenaire devra présenter PipsEvo honnêtement, sans promettre de gains, de réussite en prop firm ou de performance financière."],
    ["Conditions futures","Les commissions, seuils, modalités de paiement et règles de marque feront l’objet de conditions distinctes avant l’ouverture du programme."],
    ["Fraude et abus","Toute fraude, publicité trompeuse, usurpation de marque ou manipulation des inscriptions entraînera un refus ou une suspension."],
  ]},
};
export function LegalPage({type}){const page=legal[type];return <PublicLayout eyebrow="Informations légales" title={page.title} subtitle={page.intro}><article className="card-elev mx-auto max-w-3xl p-5 sm:p-8"><div className="flex flex-col gap-3 border-b border-white/[0.07] pb-5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between"><ShieldCheck className="h-5 w-5 text-[#B58BFF]"/><span className="text-pe-micro text-[#6B7280]">Mise à jour : 3 septembre 2026</span></div><div className="mt-6 space-y-8">{page.sections.map(([heading,text])=><section key={heading}><h2 className="text-base font-semibold text-[#EEF0F4]">{heading}</h2><p className="mt-2 break-words text-sm leading-7 text-[#AAB1BE]">{text}</p></section>)}</div>{["privacy","cookies"].includes(type)&&<button type="button" onClick={openCookieSettings} className="btn-ghost mt-8 min-h-11 w-full sm:w-auto">Gérer mes préférences de cookies</button>}{type==="data"&&<div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/app/settings" className="btn-primary text-center">Ouvrir mes paramètres</Link><Link to="/contact" className="btn-ghost text-center">Contacter le support</Link></div>}</article></PublicLayout>}

function GuideCard({ guide, language, featured = false }) {
  const title = guide.title[language];
  const summary = guide.summary[language];
  const category = guide.category[language];
  return <Link to={`/blog/${guide.slug}`} className={`group relative flex overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0A0C15] transition duration-300 hover:-translate-y-1 hover:border-[#7657FF]/45 hover:bg-[#0D0F1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7657FF]/70 ${featured ? "min-h-[330px] p-7 sm:p-9 lg:min-h-[390px]" : "min-h-[260px] p-6 sm:p-7"}`}>
    <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#7657FF]/[0.13] blur-3xl transition group-hover:bg-[#7657FF]/[0.2]" />
    <div className="relative flex w-full flex-col">
      <div className="flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[.17em] text-[#A995FF]"><span>{category}</span><span className="font-mono text-[#676F80]">{guide.number}</span></div>
      <h2 className={`mt-7 max-w-2xl font-semibold tracking-[-0.035em] text-[#F0F1F5] ${featured ? "text-3xl leading-tight sm:text-4xl" : "text-xl leading-snug sm:text-2xl"}`}>{title}</h2>
      <p className={`mt-4 max-w-2xl leading-7 text-[#9098A8] ${featured ? "text-base" : "text-sm"}`}>{summary}</p>
      <div className="mt-auto flex items-center justify-between gap-4 pt-8"><span className="inline-flex items-center gap-2 text-xs text-[#747D8D]"><Clock3 className="h-4 w-4" />{guide.readTime} min</span><span className="inline-flex items-center gap-2 text-sm font-semibold text-[#B6A5FF] transition group-hover:text-white">{language === "en" ? "Read guide" : "Lire le guide"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
    </div>
  </Link>;
}

export function BlogPage(){
  const { language, t } = useI18n();
  return <PublicLayout eyebrow={t("Bibliothèque PipsEvo", "PipsEvo library")} title={t("Guides pratiques", "Practical guides")} subtitle={t("Des méthodes structurées pour mieux documenter tes décisions, protéger ton risque et relire tes habitudes.", "Structured methods to document decisions, protect risk, and review your habits.")} wide>
    <section aria-labelledby="featured-guide-title">
      <div className="mb-6 flex items-end justify-between gap-5"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8F78F8]">{t("Commencer ici", "Start here")}</div><h2 id="featured-guide-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#EEF0F4]">{t("Construis une base de travail fiable", "Build a reliable working foundation")}</h2></div><span className="hidden text-sm text-[#747C8B] sm:block">{guides.length} {t("guides disponibles", "guides available")}</span></div>
      <GuideCard guide={guides[0]} language={language} featured />
    </section>
    <section className="mt-14 sm:mt-20" aria-labelledby="all-guides-title">
      <div className="mb-6"><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8F78F8]">{t("Bibliothèque", "Library")}</div><h2 id="all-guides-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#EEF0F4]">{t("Approfondis un sujet", "Explore a topic")}</h2></div>
      <div className="grid gap-4 md:grid-cols-2">{guides.slice(1).map(guide => <GuideCard key={guide.slug} guide={guide} language={language} />)}</div>
    </section>
    <div className="mt-14 flex flex-col items-start justify-between gap-5 rounded-[24px] border border-[#7657FF]/25 bg-[#7657FF]/[0.07] p-7 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold text-[#F0F1F5]">{t("Passe de la lecture à la pratique", "Move from reading to practice")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#8E96A5]">{t("Crée ton journal, renseigne quelques trades et utilise tes propres données pour appliquer ces méthodes.", "Create your journal, add a few trades, and use your own data to apply these methods.")}</p></div><Link to="/register" className="btn-primary inline-flex shrink-0 items-center gap-2 !rounded-xl">{t("Créer mon espace", "Create my workspace")}<ArrowRight className="h-4 w-4" /></Link></div>
  </PublicLayout>;
}

export function GuideArticlePage(){
  const { slug } = useParams();
  const { language, t } = useI18n();
  const guide = getGuideBySlug(slug);
  if (!guide) return <PublicLayout eyebrow={t("Guide introuvable", "Guide not found")} title={t("Cette ressource n’existe pas", "This resource does not exist")} subtitle={t("Le lien a peut-être changé ou le guide a été déplacé.", "The link may have changed or the guide may have moved.")}><div className="text-center"><Link to="/blog" className="btn-primary inline-flex items-center gap-2 !rounded-xl"><ArrowLeft className="h-4 w-4" />{t("Retour aux guides", "Back to guides")}</Link></div></PublicLayout>;

  const title = guide.title[language];
  const summary = guide.summary[language];
  const related = guides.filter(item => item.slug !== guide.slug).slice(Math.max(0, Number(guide.number) - 2), Math.max(0, Number(guide.number) - 2) + 2);
  return <PublicLayout eyebrow={`${guide.category[language]} · ${guide.readTime} min`} title={title} subtitle={summary} wide>
    <div className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#737C8C]"><Link to="/blog" className="transition hover:text-white">{t("Guides", "Guides")}</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-[#A9AFBA]">{guide.number}</span></div>
    <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="rounded-[20px] border border-white/[0.08] bg-[#090B12] p-5 lg:sticky lg:top-32">
        <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8F78F8]">{t("Dans ce guide", "In this guide")}</div>
        <nav className="mt-4 space-y-1" aria-label={t("Sommaire du guide", "Guide contents")}>{guide.sections.map(section => <a key={section.id} href={`#${section.id}`} className="block rounded-xl px-3 py-2.5 text-sm leading-5 text-[#818A9A] transition hover:bg-white/[0.04] hover:text-white">{section.title[language]}</a>)}</nav>
        <div className="mt-5 border-t border-white/[0.07] pt-5 text-xs leading-5 text-[#697181]"><Clock3 className="mb-2 h-4 w-4 text-[#9A83FF]" />{guide.readTime} {t("minutes de lecture", "minute read")}</div>
      </aside>

      <article className="overflow-hidden rounded-[26px] border border-white/[0.085] bg-[#090B12]">
        <div className="border-b border-white/[0.07] bg-gradient-to-br from-[#7657FF]/[0.10] via-transparent to-transparent p-6 sm:p-9 lg:p-11">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7657FF]/25 bg-[#7657FF]/[0.12]"><BookOpen className="h-5 w-5 text-[#B39FFF]" /></div>
          <h2 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-[#EFF0F4]">{t("Ce que tu vas obtenir", "What you will get")}</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#9AA1AF]">{guide.outcome[language]}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">{guide.keyPoints[language].map(point => <div key={point} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><Check className="h-4 w-4 text-[#46C99A]" /><p className="mt-3 text-sm leading-6 text-[#B7BDC8]">{point}</p></div>)}</div>
        </div>

        <div className="space-y-12 p-6 sm:p-9 lg:p-11">{guide.sections.map(section => <section key={section.id} id={section.id} className="scroll-mt-36">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#EEF0F4]">{section.title[language]}</h2>
          <div className="mt-5 space-y-4">{section.paragraphs[language].map(paragraph => <p key={paragraph} className="text-[15px] leading-8 text-[#969EAD]">{paragraph}</p>)}</div>
          {section.bullets && <ul className="mt-6 grid gap-3 sm:grid-cols-2">{section.bullets[language].map(item => <li key={item} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm leading-6 text-[#B4BAC6]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8F78F8]" />{item}</li>)}</ul>}
        </section>)}

          <section className="rounded-[22px] border border-[#46C99A]/20 bg-[#46C99A]/[0.045] p-6 sm:p-7" aria-labelledby="guide-checklist-title">
            <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#46C99A]">{t("À mettre en pratique", "Put it into practice")}</div><h2 id="guide-checklist-title" className="mt-2 text-xl font-semibold text-[#EDF1F1]">{t("Ta check-list", "Your checklist")}</h2>
            <ul className="mt-5 space-y-3">{guide.checklist[language].map(item => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#AEB6C1]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#46C99A]/35 bg-[#46C99A]/10"><Check className="h-3 w-3 text-[#46C99A]" /></span>{item}</li>)}</ul>
          </section>

          <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-5 text-xs leading-6 text-[#737C8B]">{t("Contenu éducatif : adapte toujours ces principes à ta situation et vérifie les règles officielles de ta plateforme ou de ta prop firm. PipsEvo ne fournit aucun signal ni conseil financier.", "Educational content: always adapt these principles to your situation and verify the official rules of your platform or prop firm. PipsEvo provides no signals or financial advice.")}</div>
        </div>
      </article>
    </div>

    <section className="mt-16" aria-labelledby="related-guides-title"><div className="flex items-end justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8F78F8]">{t("Continuer", "Keep learning")}</div><h2 id="related-guides-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{t("Guides associés", "Related guides")}</h2></div><Link to="/blog" className="text-sm font-semibold text-[#A994FF] hover:text-white">{t("Voir tous les guides", "View all guides")}</Link></div><div className="mt-6 grid gap-4 md:grid-cols-2">{related.map(item => <GuideCard key={item.slug} guide={item} language={language} />)}</div></section>
  </PublicLayout>;
}

export function HelpPage(){
  const { t } = useI18n();
  const resources = [
    { to: "/faq", icon: CircleHelp, title: "FAQ", titleEn: "FAQ", description: "Réponses rapides sur les comptes, les imports, Atlas et la bêta.", descriptionEn: "Quick answers about accounts, imports, Atlas, and the beta." },
    { to: "/blog", icon: BookOpen, title: "Guides pratiques", titleEn: "Practical guides", description: "Construis un journal utile et analyse tes habitudes sans te mentir.", descriptionEn: "Build a useful journal and analyze your habits honestly." },
    { to: "/platforms", icon: WalletCards, title: "Plateformes et imports", titleEn: "Platforms and imports", description: "Vérifie ce qui fonctionne maintenant et ce qui reste en préparation.", descriptionEn: "See what works now and what is still in preparation." },
    { to: "/security", icon: ShieldCheck, title: "Sécurité et données", titleEn: "Security and data", description: "Comprends les protections actuelles et garde le contrôle sur tes données.", descriptionEn: "Understand current protections and keep control of your data." },
    { to: "/app/coach", icon: Brain, title: "Utiliser Atlas", titleEn: "Using Atlas", description: "Pose de meilleures questions à ton historique et interprète les réponses.", descriptionEn: "Ask better questions about your history and interpret the answers." },
    { to: "/contact", icon: LifeBuoy, title: "Support PipsEvo", titleEn: "PipsEvo support", description: "Signale un problème ou envoie une suggestion directement à l’équipe.", descriptionEn: "Report an issue or send feedback directly to the team." },
  ];
  const steps = [
    ["01", t("Créer ou choisir un compte", "Create or choose an account"), t("Renseigne ses objectifs et ses limites officielles.", "Enter its official goals and limits.")],
    ["02", t("Ajouter des trades", "Add trades"), t("Saisis-les manuellement ou utilise l’import CSV.", "Enter them manually or use CSV import.")],
    ["03", t("Lire les tendances", "Read the patterns"), t("Compare performance, discipline et risque sur une période utile.", "Compare performance, discipline, and risk over a useful period.")],
  ];

  return <PublicLayout eyebrow={t("Assistance PipsEvo", "PipsEvo support")} title={t("Centre d’aide", "Help center")} subtitle={t("Trouve la bonne ressource, configure ton espace et obtiens une réponse claire quand quelque chose bloque.", "Find the right resource, set up your workspace, and get a clear answer when something blocks you.")} wide>
    <section aria-labelledby="help-resources-title">
      <div className="flex items-end justify-between gap-6"><div><h2 id="help-resources-title" className="text-2xl font-semibold tracking-[-0.03em] text-[#EEF0F4]">{t("Choisis ton point de départ", "Choose where to start")}</h2><p className="mt-2 text-sm text-[#858D9C]">{t("Chaque ressource mène à une action précise.", "Each resource leads to a specific action.")}</p></div><Link to="/faq" className="hidden items-center gap-2 text-sm font-semibold text-[#A994FF] hover:text-white sm:inline-flex">{t("Voir toute la FAQ", "View all FAQs")}<ArrowRight className="h-4 w-4" /></Link></div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{resources.map(resource => <HelpCard key={resource.to + resource.title} resource={resource} t={t} />)}</div>
    </section>

    <section className="mt-16 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#090B12] sm:mt-20" aria-labelledby="quick-start-title">
      <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8"><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9D87FF]">{t("Démarrage rapide", "Quick start")}</div><h2 id="quick-start-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{t("Passe des données brutes à une lecture utile.", "Turn raw data into useful insight.")}</h2></div>
      <div className="grid lg:grid-cols-3">{steps.map(([number, title, copy], index) => <div key={number} className={`p-6 sm:p-8 ${index ? "border-t border-white/[0.07] lg:border-l lg:border-t-0" : ""}`}><span className="text-xs font-semibold text-[#8067F4]">{number}</span><h3 className="mt-4 font-semibold text-[#EBEDF1]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#858D9C]">{copy}</p></div>)}</div>
    </section>

    <section className="relative mt-8 overflow-hidden rounded-[26px] border border-[#7657FF]/25 bg-[#0B0B14] px-6 py-10 sm:px-10 sm:py-12">
      <span className="pointer-events-none absolute -right-20 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-[#7657FF]/15 blur-[80px]" />
      <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"><div><h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("Besoin d’une réponse humaine ?", "Need a human answer?")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#8D95A4]">{t("Envoie le contexte, la page concernée et le message affiché. Plus la demande est précise, plus la réponse sera utile.", "Send the context, the affected page, and the displayed message. The more precise the request, the more useful the answer.")}</p></div><Link to="/contact" className="btn-primary inline-flex shrink-0 items-center gap-2 !rounded-xl">{t("Écrire au support", "Contact support")}<ArrowRight className="h-4 w-4" /></Link></div>
    </section>
  </PublicLayout>;
}

const HelpCard=({resource,t})=>{
  const Icon=resource.icon;
  return <Link to={resource.to} className="group min-h-[210px] rounded-[22px] border border-white/[0.08] bg-[#090B12] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#7657FF]/40 hover:bg-[#0C0E17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7657FF]/65">
    <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#7657FF]/25 bg-[#7657FF]/[0.08] text-[#A790FF]"><Icon className="h-5 w-5" /></span>
    <h3 className="mt-6 font-semibold text-[#E9EBEF]">{t(resource.title,resource.titleEn)}</h3>
    <p className="mt-2 text-sm leading-6 text-[#858D9C]">{t(resource.description,resource.descriptionEn)}</p>
    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9F88FF] transition group-hover:text-white">{t("Ouvrir", "Open")}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
  </Link>;
};

export function AffiliatePage(){return <PublicLayout title="Programme partenaire en préparation" subtitle="Les candidatures ne créent actuellement aucun droit à commission."><div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto"><div className="card-elev p-7"><h2 className="text-xl font-semibold">Une communication responsable</h2><p className="text-sm text-[#9CA3AF] mt-3">Le futur programme pourra s’adresser aux formateurs, créateurs et communautés qui parlent de processus et de discipline sans promettre de gains.</p><div className="space-y-2 mt-5 text-sm">{["Aucune promesse de rendement","Transparence sur les liens partenaires","Respect de l’identité PipsEvo","Conditions écrites avant activation"].map(x=><div key={x} className="flex gap-2"><Check className="w-4 h-4 text-[#46C99A]"/>{x}</div>)}</div></div><div className="card-elev p-7"><h2 className="text-xl font-semibold">Manifester son intérêt</h2><p className="text-sm text-[#9CA3AF] mt-3">Présente ton audience et ton approche. L’équipe te recontactera uniquement lorsque le programme sera prêt.</p><Link to="/contact" className="btn-primary block text-center mt-6">Contacter l’équipe</Link><Link to="/affiliate-terms" className="text-xs text-[#B58BFF] block text-center mt-4">Lire les conditions préliminaires</Link></div></div></PublicLayout>}
