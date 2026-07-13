import { accountMarkets } from "./journalPreferences";

export const createEmptyTradeForm = (account, last = {}) => {
  const markets=accountMarkets(account); const rememberedMarket=last.market_type && (markets.length===0 || markets.includes(last.market_type)) ? last.market_type : null;
  return {
    instrument:"",direction:"long",result_status:"winner",pnl:"",r:"",account_id:account?.id || "",market_type:rememberedMarket || account?.market_type || markets[0] || "futures",date:new Date().toISOString().slice(0,10),
    session:last.session || "",setups:last.setups || [],emotion:last.emotion || "",emotion_secondary:"",emotion_intensity:last.emotion_intensity || "medium",
    entry:"",exit_price:"",stop:"",take_profit:"",size:"1",point_value:"",commission:"0",entry_time:"",exit_time:"",duration:last.duration || "",duration_minutes:null,
    mistakes:[],exit_reason:"",tags:[],notes:"",plan_override:false,plan_exception_reason:"",
  };
};

export const hydrateTradeForm = (trade, account) => {
  const resultStatus=trade.result_status || (trade.exit_price===null||trade.exit_price===undefined ? "open" : trade.pnl>0 ? "winner" : trade.pnl<0 ? "loser" : "breakeven");
  return {...createEmptyTradeForm(account),...trade,result_status:resultStatus,pnl:trade.pnl??"",entry:trade.entry??"",exit_price:trade.exit_price??"",stop:trade.stop??"",take_profit:trade.take_profit??"",size:trade.size??"1",point_value:trade.point_value??"",commission:trade.commission??"0",setups:trade.setups?.length?trade.setups:trade.setup?[trade.setup]:[],mistakes:trade.mistakes||[],tags:trade.tags||[],plan_override:false,plan_exception_reason:trade.plan_exception_reason||""};
};
