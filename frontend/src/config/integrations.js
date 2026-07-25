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
    description: "Prévisualisation, validation, détection des doublons et annulation d’un lot importé.",
  },
  {
    id: "metatrader",
    name: "MetaTrader 4 / 5",
    status: "requires_provider",
    statusLabel: "API officielle requise",
    description: "Architecture prévue, mais aucune synchronisation n’est annoncée sans accès officiel et tests de fiabilité.",
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
