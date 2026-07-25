import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock3, Mail, Minus, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import PublicHeader from "@/components/PublicHeader";
import { contact } from "@/lib/api";
import { toast } from "sonner";
import { openCookieSettings } from "@/components/CookieConsent";
import { BILLING_CONFIG, COMMERCIAL_PHASES, PLANS, PRICING_COMPARISON, formatBillingPrice, launchOfferCopy } from "@/config/billing";
import { captureCommercialEvent } from "@/lib/commercialAnalytics";
import { useAuth } from "@/context/AuthContext";
import { INTEGRATIONS } from "@/config/integrations";

const faqs = [
  ["Comment ajouter mes trades ?", "Depuis le Journal, clique sur Nouveau trade, choisis ton compte puis renseigne le résultat et le contexte du trade."],
  ["Quelles prop firms sont compatibles ?", "La saisie guidée couvre actuellement Topstep, Apex, FTMO, FundedNext, The5ers et Take Profit Trader. Leur présence dans PipsEvo indique une compatibilité de suivi, pas un partenariat officiel."],
  ["PipsEvo donne-t-il des signaux ?", "Non. Le service analyse uniquement tes performances, ta discipline et tes habitudes."],
  ["Mes données sont-elles privées ?", "Tes données sont associées à ton compte et les routes privées nécessitent une authentification."],
  ["Puis-je utiliser plusieurs comptes ?", "Oui. Le plan bêta permet de centraliser plusieurs comptes et de filtrer les résultats par compte."],
  ["Comment fonctionne le coach IA ?", "Il s'appuie sur tes derniers trades pour proposer une analyse comportementale, jamais des ordres d'achat ou de vente."],
  ["Puis-je résilier à tout moment ?", "Aucun abonnement payant n'est proposé pendant la bêta. Les modalités de résiliation seront affichées clairement avant toute future souscription."],
];

function PublicLayout({ title, subtitle, children, wide = false }) {
  const longTitle = title.length > 28;
  return <div className="min-h-screen bg-[#050505] text-white">
    <PublicHeader />
    <main id="main-content" className={`${wide ? "max-w-6xl" : "max-w-5xl"} mx-auto px-5 pb-14 pt-14 sm:px-6 md:py-16`}><div className="mb-9 text-center sm:mb-10"><h1 className={`${longTitle ? "text-[36px] min-[390px]:text-[40px]" : "text-[40px] min-[390px]:text-[44px]"} mx-auto max-w-4xl break-normal font-bold leading-[1.08] text-gradient sm:text-5xl sm:leading-[1.05]`}>{title}</h1><p className="mx-auto mt-4 max-w-2xl text-[19px] leading-relaxed text-[#AAB0BE] min-[390px]:text-xl md:text-lg md:text-[#9CA3AF]">{subtitle}</p></div>{children}</main>
    <Footer/>
  </div>;
}

export function FAQPage(){return <PublicLayout title="Questions fréquentes" subtitle="Tout ce qu'il faut savoir pour utiliser PipsEvo."><div className="max-w-3xl mx-auto space-y-3">{faqs.map(([q,a])=><details key={q} className="card-flat p-5"><summary className="cursor-pointer font-semibold">{q}</summary><p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed">{a}</p></details>)}</div></PublicLayout>}

export function ContactPage(){
  const [form,setForm]=useState({name:"",email:"",subject:"",message:""}); const [sending,setSending]=useState(false);
  const submit=async(e)=>{e.preventDefault();setSending(true);try{await contact(form);toast.success("Message envoyé");setForm({name:"",email:"",subject:"",message:""})}catch(e){toast.error(e.response?.data?.detail || "Envoi impossible")}finally{setSending(false)}};
  const field=(k,label,type="text",autoComplete)=><label htmlFor={`contact-${k}`} className="block text-xs text-[#9CA3AF]">{label}<input id={`contact-${k}`} name={k} type={type} autoComplete={autoComplete} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="mt-2 w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#7C4DFF]"/></label>;
  return <PublicLayout title="Contacte-nous" subtitle="Une question, une difficulté ou une suggestion ? Notre équipe te répond."><div className="grid md:grid-cols-3 gap-5"><div className="card-elev p-6 space-y-4"><Mail className="text-[#B58BFF]"/><div><div className="font-semibold">Support</div><div className="text-sm text-[#9CA3AF] mt-1">Réponse habituelle sous 1 à 2 jours ouvrés.</div></div><a href="mailto:tyachatfr@gmail.com" className="text-sm text-[#B58BFF] hover:text-white">tyachatfr@gmail.com</a></div><form onSubmit={submit} className="card-elev p-6 md:col-span-2 space-y-4">{field("name","Ton nom","text","name")}{field("email","Ton e-mail","email","email")}{field("subject","Sujet")}<label htmlFor="contact-message" className="block text-xs text-[#9CA3AF]">Message<textarea id="contact-message" name="message" required minLength={10} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={6} className="mt-2 w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#7C4DFF] resize-y"/></label><button disabled={sending} className="btn-primary w-full disabled:opacity-50">{sending?"Envoi…":"Envoyer le message"}</button><p className="text-[10px] text-[#6B7280]">Les informations envoyées servent uniquement à traiter ta demande.</p></form></div></PublicLayout>;
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
    {isBeta&&<div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#00E676]/20 bg-[#00E676]/[0.05] p-5 text-center"><div className="text-xs font-mono uppercase tracking-[.2em] text-[#00E676]">Bêta gratuite en cours</div><p className="mt-2 text-sm leading-relaxed text-[#B5BBC9]">Les fonctions indiquées comme « prévues » ne sont pas encore vendues ni présentées comme disponibles. Tu peux utiliser la bêta immédiatement et sans carte bancaire.</p></div>}
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
  return <article className={`card-elev relative flex h-full flex-col overflow-hidden p-6 sm:p-7 ${recommended?"glow-purple border-[#7C4DFF]/55":""} ${current?"border-[#00E676]/35 bg-[#00E676]/[0.025]":""}`}>
    {recommended&&<span className="absolute right-5 top-5 rounded-full border border-[#7C4DFF]/35 bg-[#7C4DFF]/15 px-2.5 py-1 text-[9px] font-semibold tracking-wider text-[#C8AEFF]">LE PLUS COMPLET</span>}
    {current&&<span className="absolute right-5 top-5 rounded-full border border-[#00E676]/30 bg-[#00E676]/10 px-2.5 py-1 text-[9px] font-semibold tracking-wider text-[#70F5AE]">DISPONIBLE</span>}
    <div className="pr-24 text-[#B58BFF] font-mono uppercase text-xs">{plan.name}</div>
    <div className="mt-4 flex flex-wrap items-end gap-2"><span className="text-4xl font-bold font-numeric">{launchPro?formatBillingPrice(BILLING_CONFIG.prices.betaLaunch):formatBillingPrice(plan.price)}</span>{!isBetaPlan&&<span className="pb-1 text-sm text-[#9CA3AF]">/mois</span>}</div>
    {launchPro&&<p className="mt-2 text-xs text-[#C8AEFF]">Premier mois, puis {formatBillingPrice(BILLING_CONFIG.prices.pro)}/mois.</p>}
    <p className="mt-4 min-h-10 text-sm leading-relaxed text-[#9CA3AF]">{plan.description}</p>
    <div className="mt-6 flex-1 space-y-3">{plan.features.map(x=><div key={x} className="flex gap-2 text-sm text-[#D0D4DE]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00E676]"/>{x}</div>)}</div>
    {current?<Link to={authenticated?"/app/dashboard":"/register"} onClick={()=>captureCommercialEvent("beta_cta_clicked",{phase,authenticated})} className="btn-primary mt-7 inline-flex w-full items-center justify-center">{authenticated?"Ouvrir mon espace":"Commencer gratuitement"}</Link>:<button type="button" disabled onClick={()=>captureCommercialEvent(event,{phase})} title={unavailable?"Disponible après la bêta":"Paiement en cours de préparation"} className={`${recommended?"btn-primary":"btn-ghost"} mt-7 w-full cursor-not-allowed opacity-60`}>{unavailable?"Disponible après la bêta":launchPro?`Profiter de l’offre à ${formatBillingPrice(BILLING_CONFIG.prices.betaLaunch)}`:`Choisir ${plan.id==="pro"?"Pro":"Essential"}`}</button>}
    {!current&&<p className="mt-2 text-center text-[10px] text-[#7E8798]">{unavailable?"Fonctionnalités et paiement encore en préparation.":"Aucun débit aujourd’hui."}</p>}
  </article>;
};

const ComparisonValue=({value})=>{
  if(value===true)return <span className="inline-flex items-center gap-1.5 text-[#CFEFDD]"><Check className="h-4 w-4 text-[#00E676]"/>Inclus</span>;
  if(value==="planned")return <span className="inline-flex items-center gap-1.5 text-[#C8AEFF]"><Clock3 className="h-4 w-4"/>Prévu</span>;
  if(value===false)return <span className="inline-flex items-center gap-1.5 text-[#6F7787]"><Minus className="h-4 w-4"/>Non inclus</span>;
  return <span className="text-[#D6D9E2]">{value}</span>;
};

const PricingComparison=()=> <section aria-labelledby="pricing-comparison-title" className="mt-16 sm:mt-20">
  <div className="mx-auto mb-7 max-w-3xl text-center"><div className="text-xs font-mono uppercase tracking-[.2em] text-[#B58BFF]">Comparaison transparente</div><h2 id="pricing-comparison-title" className="mt-3 text-2xl font-bold sm:text-3xl">Ce que chaque formule comprend</h2><p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">« Prévu » signifie que la fonctionnalité fait partie de la feuille de route, mais qu’elle n’est pas encore commercialisée.</p></div>
  <div className="hidden overflow-hidden rounded-3xl border border-white/[0.08] bg-[#090B13] lg:block">
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Comparaison des formules Bêta, Essential et Pro</caption>
      <thead className="bg-[#0F1220]"><tr><th scope="col" className="w-[46%] px-6 py-5 text-xs uppercase tracking-[.16em] text-[#8E96A7]">Fonctionnalité</th><th scope="col" className="w-[18%] px-4 py-5 text-[#70F5AE]">Bêta</th><th scope="col" className="w-[18%] px-4 py-5 text-white">Essential</th><th scope="col" className="w-[18%] px-4 py-5 text-[#C8AEFF]">Pro</th></tr></thead>
      <tbody>{PRICING_COMPARISON.map(section=><React.Fragment key={section.id}><tr><th colSpan={4} scope="colgroup" className="border-y border-white/[0.07] bg-white/[0.025] px-6 py-4 text-xs font-semibold uppercase tracking-[.16em] text-[#B58BFF]">{section.title}</th></tr>{section.rows.map(row=><tr key={row.label} className="border-b border-white/[0.06] last:border-b-0"><th scope="row" className="px-6 py-4 font-medium text-[#E5E7ED]">{row.label}</th><td className="px-4 py-4"><ComparisonValue value={row.beta}/></td><td className="px-4 py-4"><ComparisonValue value={row.essential}/></td><td className="bg-[#7C4DFF]/[0.025] px-4 py-4"><ComparisonValue value={row.pro}/></td></tr>)}</React.Fragment>)}</tbody>
    </table>
  </div>
  <div className="space-y-4 lg:hidden">{PRICING_COMPARISON.map(section=><details key={section.id} className="card-flat group overflow-hidden" open={section.id==="accounts"}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold"><span>{section.title}</span><span aria-hidden="true" className="text-xl text-[#B58BFF] transition-transform group-open:rotate-45">+</span></summary><div className="border-t border-white/[0.07] px-4 pb-4">{section.rows.map(row=><div key={row.label} className="border-b border-white/[0.06] py-4 last:border-b-0"><div className="mb-3 text-sm font-medium text-white">{row.label}</div><div className="grid grid-cols-3 gap-2 text-[11px]"><div><div className="mb-1.5 text-[9px] uppercase tracking-wider text-[#70F5AE]">Bêta</div><ComparisonValue value={row.beta}/></div><div><div className="mb-1.5 text-[9px] uppercase tracking-wider text-[#9CA3AF]">Essential</div><ComparisonValue value={row.essential}/></div><div><div className="mb-1.5 text-[9px] uppercase tracking-wider text-[#C8AEFF]">Pro</div><ComparisonValue value={row.pro}/></div></div></div>)}</div></details>)}</div>
</section>;

const legal = {
  privacy:{title:"Politique de confidentialité",intro:"Comprendre quelles données sont utilisées et garder le contrôle sur tes choix.",sections:[
    ["Données traitées","PipsEvo traite les informations nécessaires à ton compte : nom affiché, adresse e-mail, préférences d’onboarding, comptes de trading, trades, règles, payouts et conversations enregistrées avec Atlas."],
    ["Finalités","Ces données servent à authentifier ton compte, fournir les tableaux de bord, calculer tes statistiques et répondre aux demandes adressées au support. Elles ne sont pas vendues."],
    ["Statistiques facultatives","PostHog n’est chargé qu’après ton accord. L’autocapture et l’enregistrement de session sont désactivés. Tu peux refuser ou modifier ce choix à tout moment."],
    ["Hébergement et prestataires","Le frontend est hébergé par Vercel et l’API par Render. Certains traitements peuvent également dépendre du fournisseur de base de données et du service IA utilisé par Atlas."],
    ["Conservation et droits","Les données sont conservées pour fournir le service tant que le compte est actif. Tu peux demander l’accès, la rectification, l’export ou la suppression de tes informations en contactant tyachatfr@gmail.com."],
  ]},
  terms:{title:"Conditions d’utilisation",intro:"Règles applicables à l’utilisation de la version bêta de PipsEvo.",sections:[
    ["Objet du service","PipsEvo est un outil de journalisation et d’analyse comportementale. Il ne fournit ni conseil financier, ni signal, ni recommandation d’achat ou de vente."],
    ["Version bêta","Le service peut évoluer, être interrompu ou contenir des erreurs. L’accès est actuellement gratuit et aucun paiement ne peut être souscrit pendant la bêta."],
    ["Responsabilité de l’utilisateur","Tu restes seul responsable de tes décisions, de tes comptes de trading, des informations saisies et de la sécurité de tes identifiants."],
    ["Utilisation acceptable","Il est interdit de compromettre le service, contourner ses protections, automatiser des accès abusifs ou utiliser PipsEvo pour promouvoir des rendements garantis."],
    ["Disponibilité et suppression","PipsEvo ne garantit pas une disponibilité permanente. Un compte peut être suspendu en cas d’abus. Une demande de suppression peut être transmise au support."],
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
export function LegalPage({type}){const page=legal[type];return <PublicLayout title={page.title} subtitle={page.intro}><div className="card-elev p-6 sm:p-8 max-w-3xl mx-auto"><div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-5"><ShieldCheck className="text-[#B58BFF]"/><span className="text-[10px] text-[#6B7280]">Mise à jour : 13 juillet 2026</span></div><div className="mt-6 space-y-7">{page.sections.map(([heading,text])=><section key={heading}><h2 className="font-semibold">{heading}</h2><p className="text-sm text-[#B5BBC9] mt-2 leading-relaxed">{text}</p></section>)}</div>{type==="privacy"&&<button onClick={openCookieSettings} className="btn-ghost mt-8">Gérer mes préférences de cookies</button>}</div></PublicLayout>}

export function PlatformsPage(){const{user}=useAuth();return <PublicLayout title="Plateformes et imports" subtitle="L’import CSV sécurisé est disponible. Les connexions automatiques resteront désactivées tant qu’un accès officiel n’est pas validé."><div className="grid sm:grid-cols-2 gap-4">{INTEGRATIONS.map(item=><div key={item.id} className="card-elev p-6"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-semibold">{item.name}</h2><span className={`rounded-full border px-2 py-1 text-[10px] whitespace-nowrap ${item.status==="available"?"border-[#00E676]/30 bg-[#00E676]/[0.06] text-[#6AFFB1]":"border-[#7C4DFF]/30 text-[#B58BFF]"}`}>{item.statusLabel}</span></div><p className="text-sm text-[#9CA3AF] mt-3">{item.description}</p>{item.id==="csv"&&<Link to={user?"/app/journal":"/register"} className="mt-4 inline-flex text-xs font-semibold text-[#B58BFF] hover:text-white">{user?"Ouvrir l’import dans le Journal →":"Créer un compte pour importer →"}</Link>}</div>)}</div><div className="mt-6 rounded-2xl border border-[#FFB855]/20 bg-[#FFB855]/5 p-4 text-xs text-[#B5BBC9]">Les noms de plateformes et prop firms indiquent une compatibilité de saisie ou une piste d’intégration. Ils n’impliquent aucun partenariat officiel.</div></PublicLayout>}

const posts=[
  {title:"Construire un journal de trading utile",intro:"Un bon journal relie le résultat, le contexte, l'émotion et le respect du plan.",steps:["Note le setup et la raison d'entrée avant d'évaluer le résultat.","Ajoute le risque prévu, le résultat en R et le respect de tes règles.","Relis chaque semaine les erreurs qui se répètent, pas seulement les pertes."]},
  {title:"Comprendre le drawdown d'une prop firm",intro:"Mesure le drawdown consommé avant de chercher à accélérer les gains.",steps:["Identifie si la limite est fixe, quotidienne ou suiveuse.","Calcule ton coussin restant avant chaque nouvelle session.","Réduis le risque quand la marge de sécurité diminue au lieu de tenter de te refaire."]},
  {title:"Pourquoi suivre son R multiple",intro:"Le R multiple compare des trades malgré des tailles de position différentes.",steps:["Définis 1R comme le montant réellement risqué au départ.","Exprime chaque gain ou perte en multiple de ce risque.","Compare ensuite les setups sur une série suffisante, jamais sur un seul trade."]},
  {title:"Éviter le revenge trading",intro:"Une règle simple après une perte protège mieux qu'une décision prise sous pression.",steps:["Impose une pause mesurable après une perte ou une violation de règle.","Note l'émotion et l'urgence ressenties avant toute nouvelle entrée.","Mesure le coût des trades pris hors plan pour rendre le pattern visible."]},
  {title:"Préparer une demande de payout",intro:"Un payout durable dépend autant de la régularité que du profit brut.",steps:["Relis les règles officielles et les jours minimum de ta firme.","Vérifie le coussin de drawdown qui restera après le retrait.","Conserve une trace de la demande et du montant réellement reçu."]},
  {title:"Utiliser un backtest sans se mentir",intro:"Un backtest crédible inclut aussi les périodes difficiles et les frais.",steps:["Définis les règles avant de commencer et ne les change pas au milieu du test.","Teste plusieurs contextes de marché avec un échantillon suffisant.","Compare espérance, drawdown et séries de pertes avant de passer en conditions réelles."]},
];
export function BlogPage(){return <PublicLayout title="Guides PipsEvo" subtitle="Des méthodes concrètes sur la discipline, l'analyse et les comptes financés."><div className="grid md:grid-cols-2 gap-4">{posts.map((post,i)=><details key={post.title} className="card-elev p-6 group"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] text-[#B58BFF] font-mono">GUIDE {String(i+1).padStart(2,"0")} · 3 MIN</div><h2 className="font-semibold text-lg mt-3">{post.title}</h2></div><span className="text-[#B58BFF] text-xl transition-transform group-open:rotate-45">+</span></div><p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed">{post.intro}</p></summary><ol className="mt-5 space-y-3 border-t border-white/[0.07] pt-5">{post.steps.map((step,index)=><li key={step} className="flex gap-3 text-sm text-[#B5BBC9] leading-relaxed"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7C4DFF]/15 text-[10px] text-[#B58BFF]">{index+1}</span>{step}</li>)}</ol><Link to="/register" className="text-sm text-[#B58BFF] hover:text-white inline-block mt-5">Appliquer dans mon journal →</Link></details>)}</div></PublicLayout>}

export function HelpPage(){return <PublicLayout title="Centre d'aide" subtitle="Trouve rapidement la bonne ressource."><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><HelpCard to="/faq" t="FAQ" d="Réponses aux questions courantes."/><HelpCard to="/platforms" t="Plateformes" d="Compatibilité et futures intégrations."/><HelpCard to="/contact" t="Support" d="Écris directement à l'équipe."/><HelpCard to="/blog" t="Guides" d="Bonnes pratiques pour progresser."/><HelpCard to="/security" t="Sécurité" d="Protection du compte et des données."/><HelpCard to="/app/settings" t="Mon compte" d="Profil, formule et préférences."/></div></PublicLayout>}
const HelpCard=({to,t,d})=><Link to={to} className="card-elev p-6 hover:border-[#7C4DFF]/40 transition"><h2 className="font-semibold">{t}</h2><p className="text-sm text-[#9CA3AF] mt-2">{d}</p><span className="text-[#B58BFF] text-sm inline-block mt-4">Ouvrir →</span></Link>;

export function AffiliatePage(){return <PublicLayout title="Programme partenaire en préparation" subtitle="Les candidatures ne créent actuellement aucun droit à commission."><div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto"><div className="card-elev p-7"><h2 className="text-xl font-semibold">Une communication responsable</h2><p className="text-sm text-[#9CA3AF] mt-3">Le futur programme pourra s’adresser aux formateurs, créateurs et communautés qui parlent de processus et de discipline sans promettre de gains.</p><div className="space-y-2 mt-5 text-sm">{["Aucune promesse de rendement","Transparence sur les liens partenaires","Respect de l’identité PipsEvo","Conditions écrites avant activation"].map(x=><div key={x} className="flex gap-2"><Check className="w-4 h-4 text-[#00E676]"/>{x}</div>)}</div></div><div className="card-elev p-7"><h2 className="text-xl font-semibold">Manifester son intérêt</h2><p className="text-sm text-[#9CA3AF] mt-3">Présente ton audience et ton approche. L’équipe te recontactera uniquement lorsque le programme sera prêt.</p><Link to="/contact" className="btn-primary block text-center mt-6">Contacter l’équipe</Link><Link to="/affiliate-terms" className="text-xs text-[#B58BFF] block text-center mt-4">Lire les conditions préliminaires</Link></div></div></PublicLayout>}

function Footer(){return <footer className="border-t border-white/5 px-5 py-10"><div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6 text-sm"><div><Logo/><p className="text-[#6B7280] mt-3">Journal et discipline pour traders financés.</p><p className="text-[10px] text-[#4B5563] mt-3">PipsEvo ne fournit aucun conseil financier ni signal.</p></div><div><div className="font-semibold mb-3">Aide</div><div className="flex flex-col gap-2 text-[#9CA3AF]"><Link to="/help">Centre d'aide</Link><Link to="/contact">Contact</Link><Link to="/platforms">Plateformes et imports</Link><Link to="/blog">Guides</Link><Link to="/faq">FAQ</Link><Link to="/affiliate">Programme partenaire</Link></div></div><div><div className="font-semibold mb-3">Légal</div><div className="flex flex-col items-start gap-2 text-[#9CA3AF]"><Link to="/terms">Conditions d'utilisation</Link><Link to="/privacy">Confidentialité</Link><Link to="/security">Sécurité</Link><Link to="/affiliate-terms">Conditions partenaires</Link><button onClick={openCookieSettings} className="hover:text-white">Gérer les cookies</button></div></div></div></footer>}
