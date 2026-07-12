import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { onboarding } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { TrendingUp, Bitcoin, BarChart3, LineChart, Fuel, Zap, ArrowRight, ArrowLeft } from "lucide-react";

const FIRMS = ["Topstep", "Apex", "FTMO", "FundedNext", "The5ers", "Take Profit Trader"];
const ASSETS = [
  { k: "forex", l: "Forex", I: () => <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg,#7C4DFF,#4F8CFF)" }}>$€</div> },
  { k: "crypto", l: "Crypto", I: () => <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg,#F7931A,#FFB855)" }}>₿</div> },
  { k: "stocks", l: "Actions", I: () => <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-black/40 border border-[#00E676]/40"><TrendingUp className="w-5 h-5 text-[#00E676]" /></div> },
  { k: "indices", l: "Indices", I: () => <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold text-white text-center leading-tight" style={{ background: "linear-gradient(135deg,#7C4DFF,#5A2DFF)" }}>S&P<br/>500</div> },
  { k: "commodities", l: "Matières premières", I: () => <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-[#3A4250]"><Fuel className="w-5 h-5 text-[#FFB855]" /></div> },
  { k: "futures", l: "Futures", I: () => <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-white text-lg" style={{ background: "linear-gradient(135deg,#7C4DFF,#4F8CFF)" }}>X</div> },
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
    <div className="min-h-screen px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute inset-0 grid-floor opacity-40" />
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex justify-center mb-6 sm:mb-8"><Logo /></div>
        <div className="card-elev p-5 sm:p-8 lg:p-10 glow-purple">
          <div className="flex gap-1.5 mb-6">
            {[1,2,3,4,5].map(s => <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step>=s?"bg-[#7C4DFF]":"bg-white/10"}`} />)}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#B58BFF]">Étape {step} / 5</div>

          {step === 1 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Que trades-tu ?</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-7">
                {[{k:"futures",l:"Futures"},{k:"cfd",l:"CFD / Forex"},{k:"both",l:"Les deux"}].map(o => (
                  <button key={o.k} onClick={()=>setTraderType(o.k)} data-testid={`onb-trader-${o.k}`} className={`card-flat p-3 sm:p-6 text-center sm:text-left transition-all ${traderType===o.k?"border-[#7C4DFF] glow-purple":"hover:border-white/20"}`}>
                    <div className="font-semibold text-xs sm:text-lg leading-snug break-words">{o.l}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Quels actifs trades-tu ?</h2>
              <p className="text-[#9CA3AF] text-sm mt-2">Sélectionne tous ceux qui s'appliquent.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 sm:mt-7">
                {ASSETS.map(a => (
                  <button key={a.k} onClick={()=>toggle(assets, setAssets, a.k)} data-testid={`onb-asset-${a.k}`} className={`card-flat p-5 text-center transition-all ${assets.includes(a.k)?"border-[#7C4DFF] glow-purple":"hover:border-white/20"}`}>
                    <a.I />
                    <div className="text-sm mt-3">{a.l}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient">Quelles prop firms ?</h2>
              <p className="text-[#9CA3AF] text-sm mt-2">Sélectionne tes prop firms.</p>
              <div className="grid grid-cols-2 gap-3 mt-5 sm:mt-7">
                {FIRMS.map(f => (
                  <button key={f} onClick={()=>toggle(firms, setFirms, f)} data-testid={`onb-firm-${f}`} className={`card-flat p-4 text-left transition-all ${firms.includes(f)?"border-[#7C4DFF] glow-purple":"hover:border-white/20"}`}>
                    {f}
                  </button>
                ))}
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
                <Field label="Max trades / jour" value={rules.max_trades} onChange={(v)=>setRules({...rules,max_trades:+v})} testid="rule-max-trades" />
                <Field label="Daily loss limit ($)" value={rules.daily_loss_limit} onChange={(v)=>setRules({...rules,daily_loss_limit:+v})} testid="rule-dll" />
                <Field label="Max risque / trade (%)" value={rules.max_risk_pct} onChange={(v)=>setRules({...rules,max_risk_pct:+v})} testid="rule-risk" />
                <Field label="Stop après N pertes" value={rules.stop_after_loss} onChange={(v)=>setRules({...rules,stop_after_loss:+v})} testid="rule-stop-loss" />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8 sm:mt-9">
            <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} className="btn-ghost inline-flex items-center justify-center gap-2 disabled:opacity-30 text-sm py-2.5"><ArrowLeft className="w-4 h-4"/> Retour</button>
            {step < 5 ? (
              <button onClick={()=>setStep(s=>s+1)} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5" data-testid="onb-next">Continuer <ArrowRight className="w-4 h-4"/></button>
            ) : (
              <button onClick={finish} disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5" data-testid="onb-finish">{loading?"Sauvegarde…":(<>Entrer dans PipsEvo <ArrowRight className="w-4 h-4"/></>)}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, testid }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input type="number" value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 font-mono outline-none focus:border-[#7C4DFF]" />
  </div>
);
