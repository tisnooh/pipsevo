import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { onboarding } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { TrendingUp, Bitcoin, BarChart3, LineChart, Fuel, ArrowRight, ArrowLeft, Check } from "lucide-react";

const ASSET_GROUPS = {
  cfd: [
    { id: "forex", name: "Forex", description: "Paires de devises", icon: LineChart, color: "#7C4DFF" },
    { id: "indices_cfd", name: "Indices CFD", description: "DAX, Nasdaq, S&P 500…", icon: BarChart3, color: "#4F8CFF" },
    { id: "commodities_cfd", name: "Matières premières CFD", description: "Or, argent, pétrole…", icon: Fuel, color: "#FFB855" },
    { id: "stocks_cfd", name: "Actions CFD", description: "Actions internationales", icon: TrendingUp, color: "#00E676" },
    { id: "crypto_cfd", name: "Crypto CFD", description: "Bitcoin, Ether et autres", icon: Bitcoin, color: "#F7931A" },
  ],
  futures: [
    { id: "indices_futures", name: "Indices Futures", description: "ES, NQ, YM, RTY…", icon: BarChart3, color: "#4F8CFF" },
    { id: "commodities_futures", name: "Matières premières Futures", description: "CL, GC, SI, NG…", icon: Fuel, color: "#FFB855" },
    { id: "fx_futures", name: "Devises Futures", description: "6E, 6B, 6J, micro FX…", icon: LineChart, color: "#B58BFF" },
    { id: "crypto_futures", name: "Crypto Futures", description: "Micro Bitcoin et Micro Ether", icon: Bitcoin, color: "#F7931A" },
  ],
};

const PROP_FIRMS = [
  { id: "topstep", name: "Topstep", markets: ["futures"] },
  { id: "apex", name: "Apex Trader Funding", markets: ["futures"] },
  { id: "take-profit-trader", name: "Take Profit Trader", markets: ["futures"] },
  { id: "ftmo", name: "FTMO", markets: ["cfd"] },
  { id: "the5ers", name: "The5ers", markets: ["cfd"] },
  { id: "fundednext", name: "FundedNext", markets: ["futures", "cfd"] },
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [traderType, setTraderType] = useState("futures");
  const [assets, setAssets] = useState([]);
  const [firms, setFirms] = useState([]);
  const [numAccounts, setNumAccounts] = useState(1);
  const [rules, setRules] = useState({ max_trades: 3, daily_loss_limit: 300, max_risk_pct: 1, stop_after_loss: 2 });
  const [loading, setLoading] = useState(false);

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v]);
  const marketKeys = (type) => type === "both" ? ["cfd", "futures"] : [type];
  const selectTraderType = (type) => {
    const allowedMarkets = marketKeys(type);
    const allowedAssets = allowedMarkets.flatMap(m => ASSET_GROUPS[m].map(a => a.id));
    const allowedFirms = PROP_FIRMS.filter(f => f.markets.some(m => allowedMarkets.includes(m))).map(f => f.name);
    setTraderType(type);
    setAssets(current => current.filter(id => allowedAssets.includes(id)));
    setFirms(current => current.filter(name => allowedFirms.includes(name)));
  };
  const canContinue = step === 1 || (step === 2 && assets.length > 0) || (step === 3 && firms.length > 0) || (step === 4 && Number(numAccounts) >= 1 && Number(numAccounts) <= 50);
  const canFinish = Number(rules.max_trades) >= 1 && Number(rules.daily_loss_limit) > 0 && Number(rules.max_risk_pct) > 0 && Number(rules.max_risk_pct) <= 10 && Number(rules.stop_after_loss) >= 1;

  const finish = async () => {
    setLoading(true);
    try {
      await onboarding({ trader_type: traderType, prop_firms: firms, num_accounts: +numAccounts, rules: { ...rules, assets } });
      setUser({ ...user, onboarded: true, trader_type: traderType, prop_firms: firms, rules });
      toast.success("Bienvenue sur PipsEvo");
      nav("/app/dashboard");
    } catch { toast.error("Erreur") } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-7 sm:py-10 relative overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 grid-floor opacity-25" />
      <div className="absolute -top-36 right-[5%] w-[600px] h-[600px] rounded-full blur-3xl opacity-20 bg-[#7C4DFF]" />
      <div className="absolute -bottom-40 left-[10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-10 bg-[#4F8CFF]" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7"><Logo /><div className="text-right"><div className="text-xs text-[#9CA3AF]">Bienvenue, <span className="text-white font-medium">{user?.name || "Trader"}</span></div><div className="text-[10px] text-[#6B7280] mt-1">Personnalisons ton espace.</div></div></div>
        <div className="rounded-[26px] border border-white/[0.09] bg-gradient-to-br from-[#111426]/95 via-[#0B0E1A]/95 to-[#090B13]/95 p-5 sm:p-8 lg:p-10 shadow-[0_25px_90px_rgba(0,0,0,.5)] relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#7C4DFF] blur-3xl opacity-10"/>
          <div className="relative grid grid-cols-5 gap-2 mb-7">
            {["Profil","Actifs","Firms","Comptes","Règles"].map((label,i) => <div key={label}><div className={`h-1.5 rounded-full transition-all duration-500 ${step>=i+1?"bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] shadow-[0_0_12px_rgba(124,77,255,.35)]":"bg-white/10"}`} /><div className={`hidden sm:block text-[9px] mt-2 ${step===i+1?"text-[#B58BFF]":"text-[#4B5563]"}`}>{label}</div></div>)}
          </div>
          <div className="relative">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#B58BFF]">Étape {step} / 5</div>

          {step === 1 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Que trades-tu ?</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-7">
                {[{k:"futures",l:"Futures"},{k:"cfd",l:"CFD / Forex"},{k:"both",l:"Les deux"}].map(o => (
                  <button key={o.k} onClick={()=>selectTraderType(o.k)} data-testid={`onb-trader-${o.k}`} className={`card-flat p-3 sm:p-6 text-center sm:text-left transition-all ${traderType===o.k?"border-[#7C4DFF] glow-purple":"hover:border-white/20"}`}>
                    <div className="font-semibold text-xs sm:text-lg leading-snug break-words">{o.l}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Quels actifs trades-tu ?</h2>
              <p className="text-[#9CA3AF] text-sm mt-2">Les produits affichés correspondent à ton choix de marché.</p>
              <div className="space-y-7 mt-6">
                {marketKeys(traderType).map(market => <AssetSection key={market} market={market} assets={assets} onToggle={(id)=>toggle(assets,setAssets,id)} showTitle={traderType === "both"}/>) }
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Quelles prop firms ?</h2>
              <p className="text-[#9CA3AF] text-sm mt-2">Seules les firmes compatibles avec {traderType === "both" ? "tes deux marchés" : traderType === "futures" ? "les Futures" : "les CFD / Forex"} sont proposées.</p>
              <div className="space-y-7 mt-6">
                {marketKeys(traderType).map(market => <FirmSection key={market} market={market} selected={firms} onToggle={(name)=>toggle(firms,setFirms,name)} showTitle={traderType === "both"}/>) }
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Combien de comptes ?</h2>
              <input type="number" min="1" max="50" value={numAccounts} onChange={(e)=>setNumAccounts(e.target.value)} data-testid="onb-num-accounts" className="mt-5 sm:mt-7 w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-4 text-2xl sm:text-3xl font-mono outline-none focus:border-[#7C4DFF]" />
            </div>
          )}

          {step === 5 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Tes règles de trading</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-5 sm:mt-7">
                <Field label="Max trades / jour" min="1" max="100" value={rules.max_trades} onChange={(v)=>setRules({...rules,max_trades:+v})} testid="rule-max-trades" />
                <Field label="Daily loss limit ($)" min="1" value={rules.daily_loss_limit} onChange={(v)=>setRules({...rules,daily_loss_limit:+v})} testid="rule-dll" />
                <Field label="Max risque / trade (%)" min="0.1" max="10" step="0.1" value={rules.max_risk_pct} onChange={(v)=>setRules({...rules,max_risk_pct:+v})} testid="rule-risk" />
                <Field label="Stop après N pertes" min="1" max="20" value={rules.stop_after_loss} onChange={(v)=>setRules({...rules,stop_after_loss:+v})} testid="rule-stop-loss" />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8 sm:mt-10 pt-6 border-t border-white/[0.06]">
            <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} className="btn-ghost inline-flex items-center justify-center gap-2 disabled:opacity-30 text-sm py-2.5"><ArrowLeft className="w-4 h-4"/> Retour</button>
            {step < 5 ? (
              <button onClick={()=>setStep(s=>s+1)} disabled={!canContinue} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="onb-next">Continuer <ArrowRight className="w-4 h-4"/></button>
            ) : (
              <button onClick={finish} disabled={loading || !canFinish} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="onb-finish">{loading?"Sauvegarde…":(<>Entrer dans PipsEvo <ArrowRight className="w-4 h-4"/></>)}</button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ market }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className={`w-2 h-2 rounded-full ${market === "futures" ? "bg-[#4F8CFF]" : "bg-[#B58BFF]"}`} />
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B5BBC9]">{market === "futures" ? "Futures" : "CFD / Forex"}</div>
    <div className="h-px flex-1 bg-white/[0.07]" />
  </div>
);

const AssetSection = ({ market, assets, onToggle, showTitle }) => (
  <section>
    {showTitle && <SectionTitle market={market}/>} 
    <div className="grid sm:grid-cols-2 gap-3">
      {ASSET_GROUPS[market].map(asset => {
        const selected = assets.includes(asset.id); const Icon = asset.icon;
        return <button key={asset.id} onClick={()=>onToggle(asset.id)} data-testid={`onb-asset-${asset.id}`} className={`relative text-left rounded-2xl border p-4 transition-all ${selected ? "border-[#7C4DFF]/70 bg-[#7C4DFF]/10 shadow-[0_10px_35px_rgba(124,77,255,.12)]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/20"}`}>
          <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:`${asset.color}18`}}><Icon className="w-5 h-5" style={{color:asset.color}}/></span><div className="min-w-0"><div className="font-semibold text-sm">{asset.name}</div><div className="text-[10px] text-[#6B7280] mt-1">{asset.description}</div></div></div>
          {selected && <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#7C4DFF] flex items-center justify-center"><Check className="w-3 h-3"/></span>}
        </button>;
      })}
    </div>
  </section>
);

const FirmSection = ({ market, selected, onToggle, showTitle }) => {
  const firms = PROP_FIRMS.filter(f => f.markets.includes(market));
  return <section>
    {showTitle && <SectionTitle market={market}/>} 
    <div className="grid sm:grid-cols-2 gap-3">{firms.map(firm => {
      const active = selected.includes(firm.name);
      return <button key={`${market}-${firm.id}`} onClick={()=>onToggle(firm.name)} data-testid={`onb-firm-${firm.id}-${market}`} className={`relative text-left rounded-2xl border p-4 transition-all ${active ? "border-[#7C4DFF]/70 bg-[#7C4DFF]/10" : "border-white/[0.07] bg-white/[0.025] hover:border-white/20"}`}>
        <div className="font-semibold text-sm pr-8">{firm.name}</div><div className="flex gap-1.5 mt-2">{firm.markets.map(m=><span key={m} className={`text-[9px] px-2 py-0.5 rounded-full border ${m === "futures" ? "text-[#8FB4FF] border-[#4F8CFF]/30 bg-[#4F8CFF]/10" : "text-[#B58BFF] border-[#7C4DFF]/30 bg-[#7C4DFF]/10"}`}>{m === "futures" ? "Futures" : "CFD / Forex"}</span>)}</div>
        {active && <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#7C4DFF] flex items-center justify-center"><Check className="w-3 h-3"/></span>}
      </button>;
    })}</div>
  </section>;
};

const Field = ({ label, value, onChange, testid, min, max, step }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input type="number" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 font-mono outline-none focus:border-[#7C4DFF]" />
  </div>
);
