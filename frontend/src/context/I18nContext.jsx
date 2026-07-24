import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyDocumentPreferences, readSettings, SETTINGS_EVENT, writeSettings } from "@/lib/preferences";

const I18nContext = createContext(null);

const EN = new Map([
  ["Fonctionnalités", "Features"], ["Fonctionnement", "How it works"], ["Tarifs", "Pricing"],
  ["Bêta", "Beta"], ["Connexion", "Sign in"], ["Se connecter", "Sign in"], ["Déconnexion", "Sign out"],
  ["Se déconnecter", "Sign out"], ["Accès gratuit", "Free access"], ["Commencer gratuitement", "Start for free"],
  ["Découvrir PipsEvo", "Discover PipsEvo"], ["Comptes de prop firms compatibles", "Compatible prop firm accounts"],
  ["Bêta publique · Accès gratuit sans carte bancaire", "Public beta · Free access, no credit card"],
  ["Protège tes comptes financés.", "Protect your funded accounts."], ["Transforme tes trades en progrès.", "Turn your trades into progress."],
  ["PipsEvo révèle ce qui renforce ta performance, ce qui fragilise ta discipline et ce qui te rapproche réellement d'un payout.", "PipsEvo reveals what strengthens your performance, weakens your discipline, and truly moves you closer to a payout."],
  ["Commence", "Get started"], ["en 4 étapes simples", "in 4 simple steps"],
  ["De la création du compte à l’analyse de tes habitudes, ton suivi reste clair et progressif.", "From account creation to habit analysis, your journey stays clear and progressive."],
  ["Crée ton compte", "Create your account"], ["Inscription gratuite en quelques secondes.", "Free signup in just a few seconds."],
  ["Ajoute tes comptes", "Add your accounts"], ["Renseigne manuellement tes comptes financés.", "Add your funded accounts manually."],
  ["Journalise tes trades", "Log your trades"], ["Saisis le résultat, le contexte et le respect du plan.", "Record the result, context, and plan compliance."],
  ["Analyse ton processus", "Analyze your process"], ["Identifie tes forces, tes risques et tes habitudes.", "Identify your strengths, risks, and habits."],
  ["Multi-comptes", "Multiple accounts"], ["Centralise tes comptes financés dans une seule vue.", "Centralize your funded accounts in one view."],
  ["Journal structuré", "Structured journal"], ["Documente le résultat, le contexte, les notes et les émotions.", "Document the result, context, notes, and emotions."],
  ["Moteur de discipline", "Discipline engine"], ["Mesure le respect de tes règles et de ton plan.", "Measure compliance with your rules and plan."],
  ["Interroge tes propres données sans recevoir de signaux.", "Explore your own data without receiving signals."],
  ["Suivi des payouts", "Payout tracking"], ["Enregistre tes retraits et simule tes prochains objectifs.", "Record withdrawals and simulate your next goals."],
  ["ACTIFS COMPATIBLES", "SUPPORTED ASSETS"], ["Journalise tout.", "Log everything."], ["Analyse mieux.", "Analyze better."],
  ["Actions", "Stocks"], ["Matières premières", "Commodities"], ["Et d’autres instruments saisis manuellement.", "And other manually entered instruments."],
  ["TOUT AU MÊME ENDROIT", "EVERYTHING IN ONE PLACE"], ["Clair. Structuré.", "Clear. Structured."],
  ["Conçu pour les traders financés.", "Built for funded traders."], ["Suivi de plusieurs comptes", "Multiple account tracking"],
  ["Journal avec notes et contexte", "Journal with notes and context"], ["Score de discipline calculé", "Calculated discipline score"],
  ["Analyse comportementale par Atlas", "Behavioral analysis by Atlas"], ["Suivi des payouts et objectifs", "Payout and goal tracking"],
  ["Découvrir les fonctionnalités", "Explore the features"], ["DE LA PRESSION À LA MAÎTRISE", "FROM PRESSURE TO CONTROL"],
  ["Comprends ce qui te fait dévier.", "Understand what makes you drift."], ["Renforce ce qui te fait durer.", "Strengthen what makes you last."],
  ["Une mauvaise journée ne doit plus effacer une bonne semaine.", "One bad day should no longer erase a good week."],
  ["Teste avant de risquer ton compte financé.", "Test before risking your funded account."],
  ["Tes données racontent une histoire. L'IA t'aide à la lire.", "Your data tells a story. AI helps you read it."],
  ["Ne cherche plus seulement à gagner. Apprends à durer.", "Stop focusing only on winning. Learn to last."],
  ["Arrête de répéter les mêmes erreurs.", "Stop repeating the same mistakes."],
  ["Historique structuré par compte", "Structured history by account"], ["Tags, notes et émotions", "Tags, notes, and emotions"],
  ["Résultats comparables dans le temps", "Comparable results over time"], ["Commencer mon suivi", "Start tracking"],
  ["LE RISQUE INVISIBLE", "THE INVISIBLE RISK"], ["Avant le trade", "Before the trade"], ["Pendant la pression", "Under pressure"], ["Après le résultat", "After the result"],
  ["UNE BOUCLE QUI TE FAIT PROGRESSER", "A LOOP THAT MOVES YOU FORWARD"], ["Observe. Comprends. Ajuste. Répète.", "Observe. Understand. Adjust. Repeat."],
  ["Capture", "Capture"], ["Mesure", "Measure"], ["Comprends", "Understand"], ["Protège", "Protect"],
  ["GRAPHIQUE DE MARCHÉ CONNECTÉ", "CONNECTED MARKET CHART"], ["Analyse le contexte.", "Analyze the context."],
  ["Documente ensuite ta décision.", "Then document your decision."], ["Unité", "Timeframe"], ["Or", "Gold"],
  ["Créer mon journal →", "Create my journal →"], ["TABLEAU DE BORD", "DASHBOARD"],
  ["Vois le risque avant qu'il ne devienne une violation.", "See risk before it becomes a violation."],
  ["Vue consolidée multi-comptes", "Consolidated multi-account view"], ["Santé et survie de chaque compte", "Account health and survival"],
  ["Progression vers les objectifs", "Progress toward goals"], ["JOURNAL DE TRADING", "TRADING JOURNAL"],
  ["Le résultat dit combien. Le journal explique pourquoi.", "The result tells how much. The journal explains why."],
  ["Notes et contexte par trade", "Notes and context per trade"], ["Comparaison par setup et session", "Comparison by setup and session"],
  ["Respect du plan mesuré", "Measured plan compliance"], ["COACH COMPORTEMENTAL", "BEHAVIORAL COACH"],
  ["Questions basées sur ton historique", "Questions based on your history"], ["Analyse sans signaux de marché", "Analysis without market signals"],
  ["Actions orientées discipline", "Discipline-focused actions"], ["Aide", "Help"], ["Centre d'aide", "Help center"],
  ["Plateformes", "Platforms"], ["Plateformes et imports", "Platforms and imports"], ["Guides", "Guides"],
  ["Programme partenaire", "Partner program"], ["Légal", "Legal"], ["Conditions d'utilisation", "Terms of use"],
  ["Confidentialité", "Privacy"], ["Sécurité", "Security"], ["Conditions partenaires", "Partner terms"],
  ["Gérer les cookies", "Manage cookies"], ["Journal et discipline pour traders financés.", "Journal and discipline for funded traders."],
  ["PipsEvo ne fournit aucun conseil financier ni signal.", "PipsEvo does not provide financial advice or trading signals."],

  ["Aperçu", "Overview"], ["Comptes", "Accounts"], ["Marchés", "Markets"], ["Statistiques", "Analytics"],
  ["Analyse IA", "AI Analysis"], ["Rapports", "Reports"], ["Paramètres", "Settings"], ["Rechercher…", "Search…"],
  ["Rechercher une page…", "Search a page…"], ["Aucune page trouvée.", "No page found."],
  ["Discipline du jour", "Today's discipline"], ["À consolider", "Needs consistency"], ["À améliorer", "Needs improvement"], ["En attente", "Pending"],
  ["Passe à Pro", "Upgrade to Pro"], ["Plus d'analyses. Plus d'insights.", "More analysis. More insights."], ["Plus de payouts.", "More payouts."],
  ["Mettre à niveau →", "Upgrade →"], ["Notifications", "Notifications"], ["Tout est à jour. Aucune alerte active.", "Everything is up to date. No active alerts."],
  ["Mon profil et paramètres", "Profile and settings"], ["Mes comptes", "My accounts"], ["FAQ et centre d'aide", "FAQ and help center"],
  ["Contacter le support", "Contact support"], ["Utilisateur", "User"], ["Retour au tableau de bord", "Back to dashboard"],
  ["Ouvrir le menu", "Open menu"], ["Fermer le menu", "Close menu"], ["Ouvrir le menu du profil", "Open profile menu"],

  ["Centre de pilotage", "Control center"], ["Garde le contrôle de ton risque, de ta discipline et de tes prochains objectifs.", "Stay in control of your risk, discipline, and next goals."],
  ["Capital suivi", "Tracked capital"], ["Score trader", "Trader score"], ["Données réelles synchronisées avec ton journal.", "Real data synced with your journal."],
  ["Ton espace est prêt : ajoute un compte puis journalise ton premier trade.", "Your workspace is ready: add an account, then log your first trade."],
  ["Ajouter un compte", "Add account"], ["7 derniers jours", "Last 7 days"], ["30 derniers jours", "Last 30 days"], ["90 derniers jours", "Last 90 days"],
  ["Profit net", "Net profit"], ["Score de discipline", "Discipline score"], ["Comptes actifs", "Active accounts"],
  ["Drawdown restant", "Remaining drawdown"], ["Marge de risque disponible", "Available risk buffer"], ["Courbe d'équité", "Equity curve"],
  ["Progression des payouts", "Payout progress"], ["Aucun compte configuré", "No account configured"], ["Prochain payout estimé", "Estimated next payout"],
  ["Simuler", "Simulate"], ["Répartition discipline", "Discipline breakdown"], ["Détails →", "Details →"], ["Trades récents", "Recent trades"],
  ["affichés", "shown"], ["Tous les comptes", "All accounts"], ["Tous les actifs", "All assets"], ["Tous", "All"], ["Gagnants", "Winners"], ["Perdants", "Losers"],
  ["Aucun trade pour ces filtres.", "No trades match these filters."], ["Actif", "Asset"], ["Direction", "Direction"], ["Résultat", "Result"], ["Durée", "Duration"],
  ["Achat · Long", "Buy · Long"], ["Vente · Short", "Sell · Short"], ["Ajouter tes premiers trades pour obtenir un insight personnalisé.", "Add your first trades to get a personalized insight."],
  ["Ouvrir l’analyse IA", "Open AI analysis"], ["Voir tous les rapports", "View all reports"],

  ["Espace personnel", "Personal space"], ["Paramètres du compte", "Account settings"],
  ["Personnalise ton expérience PipsEvo et garde le contrôle sur ton compte.", "Personalize your PipsEvo experience and stay in control of your account."],
  ["Compte actif", "Active account"], ["Mon profil", "My profile"], ["Identité et marché", "Identity and market"],
  ["Règles de trading", "Trading rules"], ["Limites et check-list", "Limits and checklist"],
  ["Préférences du journal", "Journal preferences"], ["Listes et favoris", "Lists and favorites"],
  ["Préférences", "Preferences"], ["Affichage et trading", "Display and trading"], ["Alertes et résumés", "Alerts and summaries"],
  ["Accès au compte", "Account access"], ["Abonnement", "Subscription"], ["Plan et facturation", "Plan and billing"],
  ["Informations personnelles", "Personal information"], ["Ces informations apparaissent dans ton espace et tes rapports.", "This information appears in your workspace and reports."],
  ["Photo de profil", "Profile picture"], ["L’avatar utilise actuellement tes initiales.", "Your avatar currently uses your initials."],
  ["Nom complet", "Full name"], ["Adresse email", "Email address"], ["Marchés tradés", "Traded markets"], ["Futures et CFD / Forex", "Futures and CFD / Forex"],
  ["Sauvegarde…", "Saving…"], ["Enregistrer le profil", "Save profile"], ["Profil mis à jour", "Profile updated"],
  ["Modifie tes limites, prépare ta check-list avant trade et ajoute tes propres règles.", "Edit your limits, prepare your pre-trade checklist, and add your own rules."],
  ["Enregistrer mes règles", "Save my rules"], ["Enregistrer les préférences", "Save preferences"],
  ["Préférences de trading", "Trading preferences"], ["Adapte les montants, horaires et l’affichage à ta façon de travailler.", "Adapt amounts, time settings, and display to the way you work."],
  ["Devise principale", "Primary currency"], ["Fuseau horaire", "Time zone"], ["Langue", "Language"], ["Français", "French"],
  ["Affichage compact", "Compact display"], ["Réduit l’espacement des tableaux et affiche davantage de données à l’écran.", "Reduces table spacing and shows more data on screen."],
  ["Enregistrer", "Save"], ["Préférences enregistrées", "Preferences saved"], ["Choisis les informations que PipsEvo doit te signaler.", "Choose the information PipsEvo should notify you about."],
  ["Résumé quotidien", "Daily summary"], ["Reçois un résumé de tes trades, de ton P&L et de ta discipline.", "Receive a summary of your trades, P&L, and discipline."],
  ["Alertes de risque", "Risk alerts"], ["Sois averti lorsque ton drawdown ou tes limites approchent d’un seuil critique.", "Get notified when your drawdown or limits approach a critical threshold."],
  ["Objectifs de payout", "Payout goals"], ["Suis la progression de tes objectifs et les dates estimées de payout.", "Track your goals and estimated payout dates."],
  ["Nouveautés PipsEvo", "PipsEvo updates"], ["Découvre les nouvelles fonctionnalités et améliorations importantes.", "Discover new features and important improvements."],
  ["Sécurité du compte", "Account security"], ["Protège tes données et surveille tes accès.", "Protect your data and monitor account access."],
  ["Mot de passe", "Password"], ["Indisponible", "Unavailable"], ["Session actuelle", "Current session"], ["Navigateur actuel · dernière activité maintenant", "Current browser · active now"],
  ["Active", "Active"], ["PLAN ACTUEL · BÊTA", "CURRENT PLAN · BETA"], ["Accès bêta", "Beta access"], ["aujourd’hui", "today"],
  ["Aucune carte bancaire enregistrée et aucun prélèvement pendant la bêta.", "No payment card stored and no charges during the beta."],
  ["Facturation indisponible", "Billing unavailable"], ["Comptes multiples", "Multiple accounts"], ["Analyses avancées", "Advanced analytics"], ["Rapports détaillés", "Detailed reports"],

  ["Comptes financés", "Funded accounts"], ["Nouveau compte", "New account"], ["Modifier le compte", "Edit account"], ["Nom du compte", "Account name"],
  ["Type de marché", "Market type"], ["Solde actuel", "Current balance"], ["Solde initial", "Initial balance"], ["Objectif", "Target"],
  ["Limite de perte quotidienne", "Daily loss limit"], ["Créer le compte", "Create account"], ["Enregistrer les modifications", "Save changes"], ["Annuler", "Cancel"],
  ["Aucun compte pour le moment", "No accounts yet"], ["Ajoute ton premier compte financé pour commencer le suivi.", "Add your first funded account to start tracking."],
  ["Santé", "Health"], ["Survie", "Survival"], ["Drawdown utilisé", "Drawdown used"],

  ["Nouveau trade", "New trade"], ["Ajouter un trade", "Add trade"], ["Ajouter le trade", "Add trade"], ["Compte", "Account"], ["Instrument", "Instrument"],
  ["Achat (Long)", "Buy (Long)"], ["Vente (Short)", "Sell (Short)"], ["Date", "Date"], ["Entrée", "Entry"], ["Sortie", "Exit"],
  ["Stop loss", "Stop loss"], ["Take profit", "Take profit"], ["Session", "Session"], ["Setup", "Setup"], ["Émotion", "Emotion"], ["Notes", "Notes"],
  ["Check-list avant trade", "Pre-trade checklist"], ["Plan respecté", "Plan followed"], ["Enregistrement…", "Saving…"], ["Trade ajouté", "Trade added"],
  ["Trade mis à jour", "Trade updated"], ["Trade supprimé", "Trade deleted"], ["Toutes les trades", "All trades"], ["Tous les trades", "All trades"],
  ["Positions ouvertes", "Open positions"], ["Favoris", "Favorites"], ["Pas encore de trades — ajoute ton premier trade !", "No trades yet — add your first trade!"],
  ["Détails du trade", "Trade details"], ["Check-list du trade", "Trade checklist"], ["Captures d'écran", "Screenshots"], ["Aucune capture jointe.", "No screenshot attached."],

  ["Terminal de marché", "Market terminal"], ["Graphique TradingView, calculateur de position et check-list avant entrée.", "TradingView chart, position calculator, and pre-entry checklist."],
  ["Calculateur de position", "Position size calculator"], ["Capital du compte", "Account balance"], ["Risque", "Risk"], ["Montant risqué", "Amount at risk"],
  ["Taille estimée", "Estimated size"], ["conditions validées", "conditions completed"],
  ["Simulateur de stratégie", "Strategy simulator"], ["Teste une série de trades à partir d’hypothèses explicites.", "Test a series of trades using explicit assumptions."],
  ["Capital initial", "Starting capital"], ["Nombre de trades", "Number of trades"], ["Gain moyen", "Average win"], ["Perte moyenne", "Average loss"],
  ["Risque par trade", "Risk per trade"], ["Réinitialiser", "Reset"], ["Capital final", "Ending capital"], ["Drawdown max", "Max drawdown"], ["Espérance", "Expectancy"], ["Courbe simulée", "Simulated curve"],
  ["Performance", "Performance"], ["Risques", "Risk"], ["Comportement", "Behavior"], ["Exporter CSV", "Export CSV"],
  ["Performance par actif", "Performance by asset"], ["Performance par compte", "Performance by account"], ["Performance par jour de la semaine", "Performance by weekday"],
  ["Trades de la période", "Trades in period"], ["Aucune donnée", "No data"], ["Évolution du P&L", "P&L trend"], ["Respect du plan", "Plan compliance"],
  ["Coach Atlas", "Atlas Coach"], ["Ton coach IA de discipline et de performance", "Your AI discipline and performance coach"], ["Envoyer", "Send"],
  ["Analyse prête", "Analysis ready"], ["Pose une question pour démarrer ton analyse comportementale.", "Ask a question to start your behavioral analysis."],
  ["Règles personnalisées", "Custom rules"], ["Calculé depuis tes règles d’onboarding et tes trades réels.", "Calculated from your onboarding rules and real trades."],
  ["Règles du jour", "Today's rules"], ["Discipline non mesurable", "Discipline cannot be measured"], ["Journalise au moins un trade pour calculer ton score.", "Log at least one trade to calculate your score."],
  ["Trades hors plan", "Off-plan trades"], ["Pertes consécutives", "Consecutive losses"], ["Sur tout l’historique", "Across all history"],
  ["Suis tes retraits et projette ton prochain payout.", "Track withdrawals and project your next payout."], ["Enregistrer un payout", "Record a payout"],
  ["Total retiré", "Total withdrawn"], ["Payouts enregistrés", "Recorded payouts"], ["Simulateur de payout", "Payout simulator"],
  ["Profit / jour", "Profit / day"], ["Jours restants", "Days remaining"], ["Estimé", "Estimated"], ["Date estimée", "Estimated date"], ["Écart objectif", "Target gap"],
  ["Historique", "History"], ["Pas encore de payout", "No payouts yet"], ["Rapports & Trading DNA", "Reports & Trading DNA"], ["Trades analysés", "Trades analyzed"],

  ["Bienvenue,", "Welcome,"], ["Personnalisons ton espace.", "Let's personalize your workspace."], ["Profil", "Profile"], ["Actifs", "Assets"], ["Firms", "Firms"], ["Règles", "Rules"],
  ["Que trades-tu ?", "What do you trade?"], ["Les deux", "Both"], ["Quels actifs trades-tu ?", "Which assets do you trade?"],
  ["Les produits affichés correspondent à ton choix de marché.", "Displayed products match your market selection."], ["Tes instruments favoris", "Your favorite instruments"],
  ["Ils apparaîtront en premier dans Nouveau trade.", "They will appear first in New trade."], ["Choisis tes options habituelles. Elles resteront toutes disponibles, mais tes favorites apparaîtront en premier.", "Choose your usual options. All options remain available, while favorites appear first."],
  ["Sessions habituelles", "Usual sessions"], ["Setups utilisés", "Used setups"], ["États fréquents", "Frequent emotions"], ["Durées habituelles", "Usual durations"],
  ["Quelles prop firms ?", "Which prop firms?"], ["Combien de comptes ?", "How many accounts?"], ["Tes règles de trading", "Your trading rules"],
  ["Configurer maintenant", "Configure now"], ["Ajouter ultérieurement", "Add later"], ["Retour", "Back"], ["Continuer", "Continue"],
  ["Enregistrer et entrer dans PipsEvo", "Save and enter PipsEvo"], ["Continuer et configurer plus tard", "Continue and configure later"],
  ["Étape", "Step"], ["favorite", "favorite"], ["favorites", "favorites"],

  ["Créer ton compte.", "Create your account."], ["Protège ta carrière funded dès aujourd'hui.", "Protect your funded trading career today."],
  ["Nom", "Name"], ["Email", "Email"], ["Créer mon compte", "Create my account"], ["Déjà sur PipsEvo ?", "Already on PipsEvo?"],
  ["Bon retour.", "Welcome back."], ["Connecte-toi à ton espace PipsEvo.", "Sign in to your PipsEvo workspace."], ["Pas encore de compte ?", "No account yet?"],
  ["Créer un compte", "Create an account"], ["Mot de passe oublié ?", "Forgot password?"],
  ["Tes préférences de confidentialité", "Your privacy preferences"], ["Consulter la politique de confidentialité", "View the privacy policy"],
  ["Fermer sans choisir", "Close without choosing"], ["Refuser les statistiques", "Reject analytics"], ["Accepter les statistiques", "Accept analytics"],
  ["Questions fréquentes", "Frequently asked questions"], ["Tout ce qu'il faut savoir pour utiliser PipsEvo.", "Everything you need to know to use PipsEvo."],
  ["Contacte-nous", "Contact us"], ["Une question, une difficulté ou une suggestion ? Notre équipe te répond.", "A question, issue, or suggestion? Our team will get back to you."],
  ["Ton nom", "Your name"], ["Ton e-mail", "Your email"], ["Sujet", "Subject"], ["Message", "Message"], ["Envoyer le message", "Send message"],
  ["Gratuit pendant la bêta", "Free during beta"], ["Aucune carte bancaire et aucun prélèvement pendant la période bêta.", "No credit card and no charges during the beta period."],
  ["Bientôt disponible", "Coming soon"], ["Rejoindre la bêta", "Join the beta"], ["Politique de confidentialité", "Privacy policy"],
  ["Mise à jour : 13 juillet 2026", "Updated: July 13, 2026"], ["Gérer mes préférences de cookies", "Manage my cookie preferences"],
  ["Guides PipsEvo", "PipsEvo guides"], ["Centre d'aide", "Help center"], ["Trouve rapidement la bonne ressource.", "Quickly find the right resource."],
  ["Dernière étape", "Final step"], ["Vérifie ton e-mail.", "Check your email."],
  ["Nous avons envoyé un lien d'activation à", "We sent an activation link to"], ["ton adresse e-mail", "your email address"],
  ["Clique sur ce lien pour activer ton compte et commencer l'onboarding.", "Click the link to activate your account and start onboarding."],
  ["Vérifie aussi le dossier spam ou courrier indésirable.", "Also check your spam or junk folder."],
  ["Le lien te connectera automatiquement à PipsEvo.", "The link will sign you in to PipsEvo automatically."],
  ["Tu seras ensuite dirigé vers la personnalisation de ton profil.", "You will then be taken to profile setup."],
  ["Adresse e-mail", "Email address"], ["Envoi…", "Sending…"], ["Renvoyer l'e-mail", "Resend email"],
  ["Modifier mon adresse", "Change my email"], ["J'ai déjà confirmé", "I've already confirmed"],
]);

const originalText = new WeakMap();
const renderedText = new WeakMap();
const originalAttributes = new WeakMap();
const ATTRIBUTES = ["placeholder", "title", "aria-label"];

function translateText(value) {
  const direct = EN.get(value);
  if (direct) return direct;
  return value
    .replace(/^Bonjour (.+)\.$/, "Hello $1.")
    .replace(/^Sur les (\d+) derniers jours$/, "Over the last $1 days")
    .replace(/^(\d+) compte(s?) suivi(s?)$/, "$1 tracked account$2")
    .replace(/^(\d+) trades sur la période$/, "$1 trades in this period")
    .replace(/^Étape (\d+) \/ (\d+)$/, "Step $1 / $2")
    .replace(/^Renvoyer dans (\d+)s$/, "Resend in $1s")
    .replace(/^Plan respecté sur ([\d.,]+)% des trades\. Consulte ta discipline\.$/, "Plan followed on $1% of trades. Review your discipline.")
    .replace(/^Ajoute ton premier compte pour commencer le suivi\.$/, "Add your first account to start tracking.")
    .replace(/^Journalise ton premier trade pour activer les analyses\.$/, "Log your first trade to activate analytics.");
}

function translateNode(node, language) {
  if (node.nodeType === Node.TEXT_NODE) {
    const current = node.nodeValue || "";
    if (!current.trim()) return;
    if (!originalText.has(node) || (renderedText.has(node) && current !== renderedText.get(node))) originalText.set(node, current);
    const source = originalText.get(node);
    if (language === "fr") { if (current !== source) node.nodeValue = source; renderedText.delete(node); return; }
    if (renderedText.get(node) === current) return;
    const lead = source.match(/^\s*/)?.[0] || "";
    const trail = source.match(/\s*$/)?.[0] || "";
    const translated = `${lead}${translateText(source.trim())}${trail}`;
    if (current !== translated) node.nodeValue = translated;
    renderedText.set(node, translated);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.tagName)) return;
  let attrs = originalAttributes.get(node);
  if (!attrs) { attrs = {}; originalAttributes.set(node, attrs); }
  for (const attr of ATTRIBUTES) {
    if (!node.hasAttribute(attr)) continue;
    const current = node.getAttribute(attr);
    if (!(attr in attrs) || (attrs[`${attr}Rendered`] && current !== attrs[`${attr}Rendered`])) attrs[attr] = current;
    const next = language === "en" ? translateText(attrs[attr]) : attrs[attr];
    node.setAttribute(attr, next); attrs[`${attr}Rendered`] = language === "en" ? next : null;
  }
  node.childNodes.forEach(child => translateNode(child, language));
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => readSettings().language);
  const setLanguage = useCallback((next) => {
    const languageValue = next === "en" ? "en" : "fr";
    writeSettings({ language: languageValue });
    setLanguageState(languageValue);
  }, []);
  const t = useCallback((fr, en) => language === "en" ? (en || translateText(fr)) : fr, [language]);

  useEffect(() => {
    const sync = (event) => setLanguageState((event.detail || readSettings()).language === "en" ? "en" : "fr");
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, []);

  useEffect(() => {
    applyDocumentPreferences({ ...readSettings(), language });
    translateNode(document.body, language);
    const observer = new MutationObserver(records => records.forEach(record => {
      if (record.type === "characterData") translateNode(record.target, language);
      record.addedNodes.forEach(node => translateNode(node, language));
    }));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
