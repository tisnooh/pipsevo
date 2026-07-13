import { MARKET_INSTRUMENTS, createDefaultJournalPreferences, getInstrumentsForMarket, getVisibleOptions, makeCustomOption, normalizeJournalPreferences } from "./journalPreferences";
import { calculateDuration, calculatePnl, calculateRMultiple, validateTradePrices } from "./tradeCalculations";
import { hydrateTradeForm } from "./tradeFormModel";

test("scénario 1 — les préférences choisies pendant l’onboarding passent en priorité",()=>{
  const prefs=createDefaultJournalPreferences(); const nq=MARKET_INSTRUMENTS.find(item=>item.label==="NQ"); const london=prefs.sessions.find(item=>item.label==="Londres");
  prefs.favoriteInstruments=[nq.id]; prefs.favorites.sessions=[london.id];
  expect(getInstrumentsForMarket("futures",prefs)[0].label).toBe("NQ");
  expect(getVisibleOptions(prefs,"sessions")[0].label).toBe("Londres");
});

test("scénario 2 — les options personnalisées des paramètres sont disponibles immédiatement",()=>{
  const prefs=createDefaultJournalPreferences(); prefs.setups.push(makeCustomOption("setups","Mon setup")); prefs.emotions.push(makeCustomOption("emotions","Très concentré"));
  prefs.setups=prefs.setups.map(item=>item.label==="FVG"?{...item,hidden:true}:item);
  const normalized=normalizeJournalPreferences(prefs);
  expect(getVisibleOptions(normalized,"setups").some(item=>item.label==="Mon setup")).toBe(true);
  expect(getVisibleOptions(normalized,"emotions").some(item=>item.label==="Très concentré")).toBe(true);
  expect(getVisibleOptions(normalized,"setups",["FVG"]).some(item=>item.label==="FVG"&&item.historical)).toBe(true);
});

test("scénario 3 — un profil Futures ne reçoit que des instruments Futures",()=>{
  expect(getInstrumentsForMarket("futures",createDefaultJournalPreferences()).every(item=>item.market==="futures")).toBe(true);
});

test("scénario 4 — un profil CFD reçoit uniquement des instruments CFD ou Forex",()=>{
  expect(getInstrumentsForMarket("cfd",createDefaultJournalPreferences()).every(item=>item.market==="cfd")).toBe(true);
});

test("scénario 5 — la durée est calculée depuis les heures",()=>{
  expect(calculateDuration("09:15","10:45")).toEqual({minutes:90,label:"1 h 30 min"});
  expect(calculateDuration("23:30","00:15")).toEqual({minutes:45,label:"45 min"});
});

test("scénario 6 — le R multiple est calculé pour un achat et une vente",()=>{
  expect(calculateRMultiple({entry:100,stop:95,exit:110,direction:"long"})).toBe(2);
  expect(calculateRMultiple({entry:100,stop:105,exit:90,direction:"short"})).toBe(2);
  expect(validateTradePrices({entry:100,stop:105,takeProfit:90,direction:"long"}).length).toBe(2);
  expect(validateTradePrices({entry:100,stop:95,takeProfit:110,direction:"short"}).length).toBe(2);
  expect(calculatePnl({entry:100,exit:105,direction:"long",size:2,pointValue:10,commission:4})).toBe(96);
});

test("scénario 7 — les données structurées survivent à la réouverture du trade",()=>{
  const account={id:"acc-1",firm:"Topstep",market_type:"futures"}; const saved={account_id:"acc-1",instrument:"NQ",direction:"long",result_status:"winner",pnl:250,entry:20000,exit_price:20050,stop:19975,session:"New York AM",setups:["FVG","Liquidity Sweep"],emotion:"Calme",emotion_secondary:"Confiant",emotion_intensity:"medium",entry_time:"15:30",exit_time:"16:15",duration:"45 min",duration_minutes:45,mistakes:["Entrée anticipée"],tags:["A+ setup"]};
  const reopened=hydrateTradeForm(saved,account);
  expect(reopened.setups).toEqual(["FVG","Liquidity Sweep"]); expect(reopened.emotion_secondary).toBe("Confiant"); expect(reopened.session).toBe("New York AM"); expect(reopened.duration_minutes).toBe(45); expect(reopened.mistakes).toEqual(["Entrée anticipée"]);
});
