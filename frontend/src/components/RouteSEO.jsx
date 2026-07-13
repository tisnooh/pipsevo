import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ORIGIN = "https://pipsevo.vercel.app";
const pages = {
  "/": ["PipsEvo — Journal et discipline pour traders financés", "Centralise tes comptes financés, ton journal de trades, ta discipline et tes objectifs de payout."],
  "/pricing": ["Tarifs bêta — PipsEvo", "Découvre l’accès gratuit pendant la bêta PipsEvo et les fonctionnalités prévues pour l’offre Pro."],
  "/faq": ["Questions fréquentes — PipsEvo", "Réponses sur le journal de trading, les prop firms, Atlas et la confidentialité."],
  "/contact": ["Contacter PipsEvo", "Contacte l’équipe PipsEvo pour une question, une difficulté ou une suggestion."],
  "/platforms": ["Plateformes et imports — PipsEvo", "Découvre les modes de saisie disponibles et les intégrations prévues dans PipsEvo."],
  "/blog": ["Guides de trading responsable — PipsEvo", "Guides pratiques sur la discipline, le journal de trading et les comptes financés."],
  "/help": ["Centre d’aide — PipsEvo", "Accède aux réponses, guides, informations de sécurité et au support PipsEvo."],
  "/privacy": ["Politique de confidentialité — PipsEvo", "Informations sur les données, les cookies et les droits des utilisateurs de PipsEvo."],
  "/terms": ["Conditions d’utilisation — PipsEvo", "Conditions applicables à l’utilisation du service PipsEvo."],
  "/security": ["Sécurité — PipsEvo", "Mesures de sécurité et bonnes pratiques pour protéger ton compte PipsEvo."],
  "/affiliate": ["Programme partenaire — PipsEvo", "Informations préliminaires sur le futur programme partenaire responsable de PipsEvo."],
  "/affiliate-terms": ["Conditions partenaires — PipsEvo", "Conditions préliminaires applicables au futur programme partenaire PipsEvo."],
  "/register": ["Créer un compte — PipsEvo", "Crée gratuitement ton espace PipsEvo pendant la bêta."],
  "/login": ["Connexion — PipsEvo", "Connecte-toi à ton espace PipsEvo."],
};

const setMeta = (selector, attr, value) => {
  let element = document.head.querySelector(selector);
  if (!element) { element = document.createElement("meta"); const match=selector.match(/\[(name|property)="([^"]+)"\]/); if(match) element.setAttribute(match[1],match[2]); document.head.appendChild(element); }
  element.setAttribute(attr, value);
};

export default function RouteSEO() {
  const { pathname } = useLocation();
  useEffect(() => {
    const [title, description] = pages[pathname] || ["PipsEvo — Application", "Espace personnel PipsEvo."];
    const isPrivate = pathname.startsWith("/app") || pathname === "/onboarding";
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
      offers:{"@type":"Offer",price:"0",priceCurrency:"EUR",description:"Accès gratuit pendant la bêta"}
    } : pathname === "/faq" ? {
      "@context":"https://schema.org",
      "@type":"FAQPage",
      mainEntity:[
        ["Comment ajouter mes trades ?","Depuis le Journal, clique sur Nouveau trade, choisis ton compte puis renseigne le résultat et le contexte du trade."],
        ["PipsEvo donne-t-il des signaux ?","Non. Le service analyse uniquement tes performances, ta discipline et tes habitudes."],
        ["Puis-je utiliser plusieurs comptes ?","Oui. L'accès bêta permet de centraliser plusieurs comptes et de filtrer les résultats par compte."]
      ].map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}}))
    } : null;
    if (structuredData) {
      const script=document.createElement("script");
      script.id="pipsevo-structured-data";
      script.type="application/ld+json";
      script.textContent=JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [pathname]);
  return null;
}
