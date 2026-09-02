import { FEATURE_FLAGS } from "@/config/billing";

export const INTEGRATIONS = Object.freeze([
  {
    id: "manual",
    name: "Saisie manuelle",
    status: "available",
    statusLabel: "Disponible",
    description: "Ajoute immédiatement tes comptes et trades depuis le journal.",
  },
  {
    id: "csv",
    name: "Import CSV",
    status: "available",
    statusLabel: "Disponible en bêta",
    description: "Prévisualisation, validation, détection des doublons et annulation pour les fichiers CSV et rapports HTML MetaTrader.",
  },
  {
    id: "mt5",
    name: "MetaTrader 5",
    status: FEATURE_FLAGS.mt5AutoSync ? "available" : "coming_soon",
    statusLabel: FEATURE_FLAGS.mt5AutoSync ? "Disponible" : "Bientôt disponible",
    description: FEATURE_FLAGS.mt5AutoSync
      ? "Connexion en lecture seule, recherche du serveur et import automatique de l’historique MetaTrader."
      : "Connexion préparée, mais non annoncée tant que le fournisseur et les tests de fiabilité ne sont pas activés.",
  },
  {
    id: "ctrader",
    name: "cTrader",
    status: "requires_provider",
    statusLabel: "API officielle requise",
    description: "La connexion dépendra des autorisations, du consentement utilisateur et de la couverture des brokers.",
  },
  {
    id: "futures-platforms",
    name: "Tradovate / NinjaTrader",
    status: "requires_provider",
    statusLabel: "Fournisseur à connecter",
    description: "Connecteurs Futures préparés fonctionnellement, sans prétendre à une intégration active avant contrat et clés API.",
  },
  {
    id: "market-data",
    name: "Données historiques / Trade Replay",
    status: "requires_provider",
    statusLabel: "Flux historique requis",
    description: "Le replay réel sera activé uniquement avec des bougies historiques licenciées et vérifiables.",
  },
]);
