export const PROP_FIRM_PLATFORM_LABELS = Object.freeze({
  topstepx: "TopstepX",
  ninjatrader: "NinjaTrader",
  tradovate: "Tradovate",
  rithmic: "Rithmic",
  tradingview: "TradingView",
  quantower: "Quantower",
  mt4: "MetaTrader 4",
  mt5: "MetaTrader 5",
  ctrader: "cTrader",
  "match-trader": "Match-Trader",
  dxtrade: "DXtrade",
  tradelocker: "TradeLocker",
  blackarrow: "BlackArrow",
  "e8-terminal": "E8 Terminal",
});

const firm = (entry) => Object.freeze({
  manualTrackingSupported: true,
  importSupported: false,
  importPlatforms: [],
  autoSyncSupported: false,
  autoSyncStatus: "not_available",
  logo: null,
  logoClass: "h-8",
  ...entry,
  slug: entry.slug || entry.id,
  markets: entry.marketTypes,
});

// Sources point to the firms' own current help centres. “Import” only means that
// PipsEvo already parses a standard export from one of the listed platforms; it
// never implies an API partnership or a direct account connection.
export const PROP_FIRMS = Object.freeze([
  firm({ id: "topstep", name: "Topstep", marketTypes: ["futures"], platforms: ["topstepx"], logo: "/brand/prop-firms/topstep.webp", logoClass: "h-6", officialSource: "https://help.topstep.com/en/articles/8284199-new-to-topstep-start-here", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "apex", name: "Apex Trader Funding", marketTypes: ["futures"], platforms: ["ninjatrader", "rithmic", "tradovate"], importSupported: true, importPlatforms: ["ninjatrader"], logo: "/brand/prop-firms/apex.svg", logoClass: "h-9", officialSource: "https://support.apextraderfunding.com/hc/en-us/articles/13397375485851-Connection-Guide-for-Rithmic-Using-NinjaTrader-8-1-X", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "take-profit-trader", name: "Take Profit Trader", marketTypes: ["futures"], platforms: ["tradovate", "ninjatrader", "rithmic", "tradingview", "quantower"], importSupported: true, importPlatforms: ["ninjatrader", "quantower"], logo: "/brand/prop-firms/take-profit-trader.svg", logoClass: "h-8", officialSource: "https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15173017163549-Choosing-Your-Platform", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "ftmo", name: "FTMO", marketTypes: ["cfd", "futures"], platforms: ["mt4", "mt5", "ctrader", "tradingview", "ninjatrader", "tradovate"], importSupported: true, importPlatforms: ["mt4", "mt5", "ctrader", "ninjatrader"], autoSyncStatus: "preparation", logo: "/brand/prop-firms/ftmo.svg", logoClass: "h-7", officialSource: "https://ftmo.com/en/faq/which-platforms-can-i-use-for-trading/", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "the5ers", name: "The5ers", marketTypes: ["cfd", "futures"], platforms: ["mt5", "ctrader", "tradingview", "blackarrow"], importSupported: true, importPlatforms: ["mt5", "ctrader"], autoSyncStatus: "preparation", logo: "/brand/prop-firms/the5ers.svg", logoClass: "h-8", officialSource: "https://the5ers.com/faqs/which-trading-platform-do-you-use/", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "fundednext", name: "FundedNext", marketTypes: ["cfd"], platforms: ["mt4", "mt5", "ctrader", "match-trader"], importSupported: true, importPlatforms: ["mt4", "mt5", "ctrader"], autoSyncStatus: "preparation", logo: "/brand/prop-firms/fundednext.png", logoClass: "h-7", officialSource: "https://help.fundednext.com/en/articles/8019808-which-platforms-can-i-use-for-trading-at-fundednext", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "fundingpips", name: "FundingPips", marketTypes: ["cfd"], platforms: ["mt5", "ctrader", "match-trader"], importSupported: true, importPlatforms: ["mt5", "ctrader"], autoSyncStatus: "preparation", officialSource: "https://help.fundingpips.com/hc/en-us/articles/43468639481105-Account-Workspace", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "my-funded-futures", name: "My Funded Futures", marketTypes: ["futures"], platforms: ["ninjatrader", "tradovate", "tradingview", "quantower"], importSupported: true, importPlatforms: ["ninjatrader", "quantower"], officialSource: "https://help.myfundedfutures.com/en/articles/8528335-overview-of-supported-platforms-at-mffu", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "alpha-capital-group", name: "Alpha Capital Group", marketTypes: ["cfd"], platforms: ["mt5", "ctrader", "dxtrade", "tradelocker"], importSupported: true, importPlatforms: ["mt5", "ctrader"], autoSyncStatus: "preparation", officialSource: "https://help.alphacapitalgroup.uk/en/articles/6933883-what-trading-platforms-are-available-for-use", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "earn2trade", name: "Earn2Trade", marketTypes: ["futures"], platforms: ["ninjatrader", "tradovate", "tradingview", "rithmic", "quantower"], importSupported: true, importPlatforms: ["ninjatrader", "quantower"], officialSource: "https://help.earn2trade.com/en/articles/2090521-what-platforms-can-i-use-for-the-gauntlet-mini-trader-career-path", lastVerifiedAt: "2026-09-03" }),
  firm({ id: "e8-markets", name: "E8 Markets", marketTypes: ["cfd"], platforms: ["tradelocker", "match-trader", "ctrader", "mt5", "e8-terminal"], importSupported: true, importPlatforms: ["ctrader", "mt5"], autoSyncStatus: "preparation", officialSource: "https://help.e8markets.com/en/articles/9799834-available-trading-platforms", lastVerifiedAt: "2026-09-03" }),
]);

export const PROP_FIRM_PLATFORM_FILTERS = Object.freeze([
  "mt5", "mt4", "ctrader", "tradelocker", "tradovate", "ninjatrader", "rithmic", "dxtrade", "match-trader",
]);

export function filterPropFirms(firms, { query = "", market = "all", platform = "all" } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return firms.filter((item) => {
    const matchesQuery = !normalizedQuery || item.name.toLocaleLowerCase().includes(normalizedQuery) || item.platforms.some((id) => PROP_FIRM_PLATFORM_LABELS[id]?.toLocaleLowerCase().includes(normalizedQuery));
    const matchesMarket = market === "all" || item.marketTypes.includes(market);
    const matchesPlatform = platform === "all" || item.platforms.includes(platform);
    return matchesQuery && matchesMarket && matchesPlatform;
  });
}
