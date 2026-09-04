const option = (id, label, extra = {}) => ({ id, label, hidden: false, custom: false, ...extra });

export { PROP_FIRMS } from "../config/propFirms";
import { PROP_FIRMS } from "../config/propFirms";

export const ASSET_GROUPS = {
  cfd: [
    { id: "forex", name: "Forex", description: "Paires de devises", color: "#7C4DFF" },
    { id: "indices_cfd", name: "Indices CFD", description: "DAX, Nasdaq, S&P 500…", color: "#4F8CFF" },
    { id: "commodities_cfd", name: "Matières premières CFD", description: "Or, argent, pétrole…", color: "#FFB855" },
    { id: "stocks_cfd", name: "Actions CFD", description: "Actions internationales", color: "#00E676" },
    { id: "crypto_cfd", name: "Crypto CFD", description: "Bitcoin, Ether et autres", color: "#F7931A" },
  ],
  futures: [
    { id: "indices_futures", name: "Indices Futures", description: "ES, NQ, YM, RTY…", color: "#4F8CFF" },
    { id: "commodities_futures", name: "Matières premières Futures", description: "CL, GC, SI, NG…", color: "#FFB855" },
    { id: "fx_futures", name: "Devises Futures", description: "6E, 6B, 6J, micro FX…", color: "#B58BFF" },
    { id: "crypto_futures", name: "Crypto Futures", description: "Micro Bitcoin et Micro Ether", color: "#F7931A" },
  ],
};

export const MARKET_INSTRUMENTS = [
  ...["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD"].map(x=>option(`cfd-${x.toLowerCase()}`,x,{market:"cfd",group:"Forex"})),
  ...["XAUUSD","XAGUSD"].map(x=>option(`cfd-${x.toLowerCase()}`,x,{market:"cfd",group:"Matières premières"})),
  ...["NAS100","US30","SPX500","GER40","UK100"].map(x=>option(`cfd-${x.toLowerCase()}`,x,{market:"cfd",group:"Indices"})),
  ...["BTCUSD","ETHUSD"].map(x=>option(`cfd-${x.toLowerCase()}`,x,{market:"cfd",group:"Crypto"})),
  ...["ES","MES","NQ","MNQ","YM","MYM","RTY","M2K"].map(x=>option(`futures-${x.toLowerCase()}`,x,{market:"futures",group:"Indices Futures"})),
  ...["CL","MCL","GC","MGC","SI"].map(x=>option(`futures-${x.toLowerCase()}`,x,{market:"futures",group:"Matières premières Futures"})),
  ...["6E","6B","ZB","ZN"].map(x=>option(`futures-${x.toLowerCase()}`,x,{market:"futures",group:"Contrats Futures"})),
];

export const TRADE_RESULTS = [
  ["winner","Gagnant"],["loser","Perdant"],["breakeven","Break-even"],["partial","Partiellement clôturé"],["open","Position encore ouverte"],["cancelled","Annulé"],
];

export const EMOTION_INTENSITIES = [["low","Faible"],["medium","Moyenne"],["high","Forte"]];

export const DEFAULT_CHECKLIST = [
  option("check-plan", "Le setup respecte mon plan de trading", { enabled: true, required: true }),
  option("check-risk", "Le risque est calculé", { enabled: true, required: true }),
  option("check-stop", "Le stop loss est défini", { enabled: true, required: true }),
  option("check-exit", "Le take profit ou le scénario de sortie est défini", { enabled: true, required: false }),
  option("check-context", "Le contexte de marché est clair", { enabled: true, required: true }),
  option("check-news", "J’ai vérifié les annonces économiques", { enabled: true, required: false }),
  option("check-emotion", "Mon état émotionnel est stable", { enabled: true, required: true }),
  option("check-hours", "Je respecte ma plage horaire", { enabled: true, required: false }),
  option("check-trades", "Je n’ai pas dépassé mon nombre maximal de trades", { enabled: true, required: true }),
  option("check-loss", "Je n’ai pas atteint ma perte journalière maximale", { enabled: true, required: true }),
];

const DEFAULT_GROUPS = {
  sessions: ["Asie","Londres","New York AM","New York PM","London Kill Zone","New York Kill Zone","Power Hour","Hors session","Swing / Multi-session","Autre"],
  setups: ["FVG","Inverse FVG","Order Block","Breaker Block","Mitigation Block","Liquidity Sweep","Break of Structure","Change of Character","Market Structure Shift","Opening Range Breakout","Support / Résistance","Breakout","Retest","Pullback","Fibonacci","Supply / Demand","Trend Following","Reversal","Range","News Trade","Autre"],
  emotions: ["Calme","Concentré","Confiant","Patient","Neutre","Discipliné","Stressé","Impatient","FOMO","Frustré","En colère","Euphorique","Fatigué","Distrait","Peur de perdre","Revenge trading","Surconfiant","Autre"],
  durations: ["Moins de 1 minute","1 à 5 minutes","5 à 15 minutes","15 à 30 minutes","30 minutes à 1 heure","1 à 2 heures","2 à 4 heures","Plus de 4 heures","Swing — plusieurs jours"],
  mistakes: ["FOMO","Overtrading","Revenge trading","Risque trop élevé","Entrée anticipée","Entrée tardive","Stop déplacé","Take profit déplacé","Sortie prématurée","Trade hors session","Trade contre tendance","News ignorée","Setup incomplet","Mauvaise taille de position","Non-respect du plan"],
  exitReasons: ["Objectif atteint","Stop loss atteint","Sortie manuelle","Sortie partielle","Fin de session","Signal invalidé","Risque réduit","Sortie émotionnelle"],
  tags: ["A+ setup","Haute volatilité","Faible liquidité","Avec tendance","Contre-tendance","News","Hors plan"],
  noteSuggestions: ["Bonne exécution","Entrée trop tôt","Entrée trop tard","Stop trop serré","Take profit déplacé","Sortie émotionnelle","Trade hors plan","Revenge trade","Bonne patience","Mauvaise gestion"],
};

const groupOptions = (key, labels) => labels.map((label,index)=>option(`${key}-${index+1}`,label));

export const createDefaultJournalPreferences = () => ({
  favoriteInstruments: [],
  hiddenInstruments: [],
  customInstruments: [],
  instrumentLabels: {},
  instrumentOrder: [],
  sessions: groupOptions("session", DEFAULT_GROUPS.sessions),
  setups: groupOptions("setup", DEFAULT_GROUPS.setups),
  emotions: groupOptions("emotion", DEFAULT_GROUPS.emotions),
  durations: groupOptions("duration", DEFAULT_GROUPS.durations),
  mistakes: groupOptions("mistake", DEFAULT_GROUPS.mistakes),
  exitReasons: groupOptions("exit", DEFAULT_GROUPS.exitReasons),
  tags: groupOptions("tag", DEFAULT_GROUPS.tags),
  noteSuggestions: groupOptions("note", DEFAULT_GROUPS.noteSuggestions),
  favorites: { sessions: [], setups: [], emotions: [], durations: [] },
});

const normalizeOptionArray = (value, fallback) => Array.isArray(value) ? value.map((item,index)=>typeof item === "string" ? option(`legacy-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,item) : {...item,hidden:Boolean(item.hidden)}) : fallback;

export const normalizeJournalPreferences = (stored = {}) => {
  const defaults=createDefaultJournalPreferences();
  return {
    ...defaults,
    ...stored,
    favoriteInstruments: Array.isArray(stored.favoriteInstruments) ? stored.favoriteInstruments : defaults.favoriteInstruments,
    hiddenInstruments: Array.isArray(stored.hiddenInstruments) ? stored.hiddenInstruments : defaults.hiddenInstruments,
    customInstruments: normalizeOptionArray(stored.customInstruments,defaults.customInstruments),
    instrumentLabels: stored.instrumentLabels && typeof stored.instrumentLabels === "object" ? stored.instrumentLabels : {},
    instrumentOrder: Array.isArray(stored.instrumentOrder) ? stored.instrumentOrder : [],
    sessions: normalizeOptionArray(stored.sessions,defaults.sessions),
    setups: normalizeOptionArray(stored.setups,defaults.setups),
    emotions: normalizeOptionArray(stored.emotions,defaults.emotions),
    durations: normalizeOptionArray(stored.durations,defaults.durations),
    mistakes: normalizeOptionArray(stored.mistakes,defaults.mistakes),
    exitReasons: normalizeOptionArray(stored.exitReasons,defaults.exitReasons),
    tags: normalizeOptionArray(stored.tags,defaults.tags),
    noteSuggestions: normalizeOptionArray(stored.noteSuggestions,defaults.noteSuggestions),
    favorites: {...defaults.favorites,...(stored.favorites || {})},
  };
};

export const marketKeys = (type) => type === "both" ? ["cfd","futures"] : [type === "cfd" ? "cfd" : "futures"];

export const marketForFirm = (firmName) => PROP_FIRMS.find(firm=>firm.name.toLowerCase() === String(firmName || "").toLowerCase())?.markets || [];

export const accountMarkets = (account) => account?.market_type ? [account.market_type] : marketForFirm(account?.firm);

export const getVisibleOptions = (preferences, key, historicalValues = []) => {
  const prefs=normalizeJournalPreferences(preferences);
  const favorites=new Set(prefs.favorites?.[key] || []);
  const visible=prefs[key].filter(item=>!item.hidden).sort((a,b)=>Number(favorites.has(b.id))-Number(favorites.has(a.id)));
  const labels=new Set(visible.map(item=>item.label));
  const history=(historicalValues || []).filter(Boolean).filter(label=>!labels.has(label)).map((label,index)=>option(`history-${key}-${index}`,label,{historical:true}));
  return [...visible,...history];
};

export const getInstrumentsForMarket = (traderType, preferences, historicalValue) => {
  const prefs=normalizeJournalPreferences(preferences);
  const markets=marketKeys(traderType);
  const hidden=new Set(prefs.hiddenInstruments);
  const favorites=new Set(prefs.favoriteInstruments);
  const order=new Map(prefs.instrumentOrder.map((id,index)=>[id,index]));
  const base=[...MARKET_INSTRUMENTS,...prefs.customInstruments].map(item=>({...item,label:prefs.instrumentLabels[item.id] || item.label})).filter(item=>markets.includes(item.market) && !hidden.has(item.id) && !item.hidden);
  base.sort((a,b)=>Number(favorites.has(b.id))-Number(favorites.has(a.id)) || (order.get(a.id) ?? 9999)-(order.get(b.id) ?? 9999) || a.label.localeCompare(b.label));
  if (historicalValue && !base.some(item=>item.label===historicalValue)) base.push(option("historical-instrument",historicalValue,{market:markets[0],historical:true}));
  return base;
};

export const restorePreferenceGroup = (current, key) => ({...normalizeJournalPreferences(current),[key]:createDefaultJournalPreferences()[key],favorites:{...normalizeJournalPreferences(current).favorites,[key]:[]}});

export const makeCustomOption = (key, label, extra = {}) => option(`custom-${key}-${Date.now()}`,label.trim(),{custom:true,...extra});
