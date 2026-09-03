import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { getGuideBySlug } from "@/content/guides";

const ORIGIN = "https://pipsevo.vercel.app";
const pages = {
  "/": ["PipsEvo — Journal et discipline pour traders financés", "Centralise tes comptes financés, ton journal de trades, ta discipline et tes objectifs de payout."],
  "/pricing": ["Tarifs bêta — PipsEvo", "Découvre l’accès gratuit pendant la bêta PipsEvo et les fonctionnalités prévues pour l’offre Pro."],
  "/faq": ["Questions fréquentes — PipsEvo", "Réponses sur le journal de trading, les prop firms, Atlas et la confidentialité."],
  "/contact": ["Contacter PipsEvo", "Contacte l’équipe PipsEvo pour une question, une difficulté ou une suggestion."],
  "/platforms": ["Prop firms et plateformes compatibles — PipsEvo", "Découvre les prop firms prises en charge, les imports disponibles et les futures connexions de PipsEvo."],
  "/blog": ["Guides de trading responsable — PipsEvo", "Guides pratiques sur la discipline, le journal de trading et les comptes financés."],
  "/help": ["Centre d’aide — PipsEvo", "Accède aux réponses, guides, informations de sécurité et au support PipsEvo."],
  "/privacy": ["Politique de confidentialité — PipsEvo", "Informations sur les données, les cookies et les droits des utilisateurs de PipsEvo."],
  "/terms": ["Conditions d’utilisation — PipsEvo", "Conditions applicables à l’utilisation du service PipsEvo."],
  "/security": ["Sécurité — PipsEvo", "Mesures de sécurité et bonnes pratiques pour protéger ton compte PipsEvo."],
  "/affiliate": ["Programme partenaire — PipsEvo", "Informations préliminaires sur le futur programme partenaire responsable de PipsEvo."],
  "/affiliate-terms": ["Conditions partenaires — PipsEvo", "Conditions préliminaires applicables au futur programme partenaire PipsEvo."],
  "/register": ["Créer un compte — PipsEvo", "Crée gratuitement ton espace PipsEvo pendant la bêta."],
  "/verify-email": ["Confirmer ton e-mail — PipsEvo", "Confirme ton adresse e-mail pour activer ton compte PipsEvo."],
  "/login": ["Connexion — PipsEvo", "Connecte-toi à ton espace PipsEvo."],
  "/newsletter/confirm": ["Confirmer la newsletter — PipsEvo", "Confirme ton abonnement aux communications PipsEvo."],
  "/newsletter/unsubscribe": ["Désinscription — PipsEvo", "Gère ta désinscription des communications PipsEvo."],
};

const pagesEn = {
  "/": ["PipsEvo — Trading journal and discipline for funded traders", "Centralize your funded accounts, trading journal, discipline and payout goals."],
  "/pricing": ["Beta pricing — PipsEvo", "Explore free beta access and the features planned for PipsEvo Pro."],
  "/faq": ["Frequently asked questions — PipsEvo", "Answers about the trading journal, prop firms, Atlas and privacy."],
  "/contact": ["Contact PipsEvo", "Contact the PipsEvo team with a question, issue or suggestion."],
  "/platforms": ["Supported prop firms and platforms — PipsEvo", "Discover supported prop firms, available imports, and upcoming PipsEvo connections."],
  "/blog": ["Responsible trading guides — PipsEvo", "Practical guides about discipline, trading journals and funded accounts."],
  "/help": ["Help center — PipsEvo", "Access answers, guides, security information and PipsEvo support."],
  "/privacy": ["Privacy policy — PipsEvo", "Information about data, cookies and PipsEvo user rights."],
  "/terms": ["Terms of use — PipsEvo", "Terms governing the use of the PipsEvo service."],
  "/security": ["Security — PipsEvo", "Security measures and good practices to protect your PipsEvo account."],
  "/affiliate": ["Partner program — PipsEvo", "Early information about PipsEvo's future responsible partner program."],
  "/affiliate-terms": ["Partner terms — PipsEvo", "Preliminary terms for the future PipsEvo partner program."],
  "/register": ["Create an account — PipsEvo", "Create your PipsEvo workspace for free during beta."],
  "/verify-email": ["Confirm your email — PipsEvo", "Confirm your email address to activate your PipsEvo account."],
  "/login": ["Sign in — PipsEvo", "Sign in to your PipsEvo workspace."],
  "/newsletter/confirm": ["Confirm newsletter — PipsEvo", "Confirm your subscription to PipsEvo communications."],
  "/newsletter/unsubscribe": ["Unsubscribe — PipsEvo", "Manage your PipsEvo marketing email subscription."],
};

const setMeta = (selector, attr, value) => {
  let element = document.head.querySelector(selector);
  if (!element) { element = document.createElement("meta"); const match=selector.match(/\[(name|property)="([^"]+)"\]/); if(match) element.setAttribute(match[1],match[2]); document.head.appendChild(element); }
  element.setAttribute(attr, value);
};

export default function RouteSEO() {
  const { pathname } = useLocation();
  const { language } = useI18n();
  useEffect(() => {
    const source = language === "en" ? pagesEn : pages;
    const guide = pathname.startsWith("/blog/") ? getGuideBySlug(pathname.slice(6)) : null;
    const [title, description] = guide
      ? [`${guide.title[language]} — PipsEvo`, guide.summary[language]]
      : source[pathname] || (language === "en" ? ["PipsEvo — Application", "Your personal PipsEvo workspace."] : ["PipsEvo — Application", "Espace personnel PipsEvo."]);
    const isPrivate = pathname.startsWith("/app") || pathname === "/onboarding" || pathname === "/verify-email" || pathname.startsWith("/newsletter/");
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[name="robots"]', "content", isPrivate ? "noindex,nofollow" : "index,follow");
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", `${ORIGIN}${pathname}`);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical); }
    canonical.href = `${ORIGIN}${pathname}`;
    const existingStructuredData = document.getElementById("pipsevo-structured-data");
    if (existingStructuredData) existingStructuredData.remove();
    const structuredData = pathname === "/" ? {
      "@context":"https://schema.org",
      "@type":"SoftwareApplication",
      name:"PipsEvo",
      applicationCategory:"BusinessApplication",
      operatingSystem:"Web",
      url:ORIGIN,
      description,
      offers:{"@type":"Offer",price:"0",priceCurrency:"EUR",description:language === "en" ? "Free access during beta" : "Accès gratuit pendant la bêta"}
    } : pathname === "/faq" ? {
      "@context":"https://schema.org",
      "@type":"FAQPage",
      mainEntity:(language === "en" ? [
        ["How do I add trades?","From the Journal, select New trade, choose your account, then enter the result and context."],
        ["Does PipsEvo provide signals?","No. The service only analyzes your performance, discipline and habits."],
        ["Can I use multiple accounts?","Yes. Beta access lets you centralize multiple accounts and filter results by account."]
      ] : [
        ["Comment ajouter mes trades ?","Depuis le Journal, clique sur Nouveau trade, choisis ton compte puis renseigne le résultat et le contexte du trade."],
        ["PipsEvo donne-t-il des signaux ?","Non. Le service analyse uniquement tes performances, ta discipline et tes habitudes."],
        ["Puis-je utiliser plusieurs comptes ?","Oui. L'accès bêta permet de centraliser plusieurs comptes et de filtrer les résultats par compte."]
      ]).map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}}))
    } : guide ? {
      "@context":"https://schema.org",
      "@type":"Article",
      headline:guide.title[language],
      description:guide.summary[language],
      datePublished:"2026-09-03",
      dateModified:"2026-09-03",
      mainEntityOfPage:`${ORIGIN}${pathname}`,
      author:{"@type":"Organization",name:"PipsEvo"},
      publisher:{"@type":"Organization",name:"PipsEvo"}
    } : null;
    if (structuredData) {
      const script=document.createElement("script");
      script.id="pipsevo-structured-data";
      script.type="application/ld+json";
      script.textContent=JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [pathname, language]);
  return null;
}
