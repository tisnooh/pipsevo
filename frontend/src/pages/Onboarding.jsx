import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { onboarding } from "@/lib/api";

const FIRMS = ["Topstep", "Apex", "FTMO", "FundedNext", "The5ers", "Take Profit Trader"];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [traderType, setTraderType] = useState("futures");
  const [firms, setFirms] = useState([]);
  const [numAccounts, setNumAccounts] = useState(1);
  const [rules, setRules] = useState({ max_trades: 3, daily_loss_limit: 300, max_risk_pct: 1, sessions: ["London", "NY"], stop_after_loss: 2 });
  const [loading, setLoading] = useState(false);

  const toggleFirm = (f) => setFirms((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f]);

  const finish = async () => {
    setLoading(true);
    try {
      await onboarding({ trader_type: traderType, prop_firms: firms, num_accounts: Number(numAccounts), rules });
      setUser({ ...user, onboarded: true, trader_type: traderType, prop_firms: firms, rules });
      toast.success("You're all set. Welcome to PipsEvo.");
      nav("/app/dashboard");
    } catch (err) {
      toast.error("Failed to save onboarding");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl card-elev p-10">
        <div className="flex gap-1.5 mb-6">
          {[1,2,3,4].map(s => <div key={s} className={`h-1 flex-1 rounded-full ${step>=s?"bg-[#4F8CFF]":"bg-white/10"}`} />)}
        </div>
        <div className="text-xs font-mono uppercase text-[#9CA3AF]">Step {step} of 4</div>

        {step === 1 && (
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gradient">What do you trade?</h2>
            <div className="grid grid-cols-3 gap-3 mt-8">
              {[{k:"futures",l:"Futures"},{k:"cfd",l:"CFD / Forex"},{k:"both",l:"Both"}].map(o => (
                <button key={o.k} onClick={()=>setTraderType(o.k)} data-testid={`onb-trader-${o.k}`} className={`card-elev p-6 text-left ${traderType===o.k?"border-[#4F8CFF] glow-blue":""}`}>
                  <div className="font-semibold text-lg">{o.l}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gradient">Which prop firms?</h2>
            <p className="text-[#9CA3AF] text-sm mt-2">Pick all that apply.</p>
            <div className="grid grid-cols-2 gap-3 mt-8">
              {FIRMS.map(f => (
                <button key={f} onClick={()=>toggleFirm(f)} data-testid={`onb-firm-${f}`} className={`card-elev p-4 text-left ${firms.includes(f)?"border-[#7C4DFF] glow-purple":""}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gradient">How many accounts?</h2>
            <input type="number" min="1" max="50" value={numAccounts} onChange={(e)=>setNumAccounts(e.target.value)} data-testid="onb-num-accounts" className="mt-8 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-3xl font-mono outline-none focus:border-[#4F8CFF]" />
          </div>
        )}

        {step === 4 && (
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gradient">Your trading rules</h2>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <Field label="Max trades / day" value={rules.max_trades} onChange={(v)=>setRules({...rules,max_trades:Number(v)})} testid="rule-max-trades" />
              <Field label="Daily loss limit ($)" value={rules.daily_loss_limit} onChange={(v)=>setRules({...rules,daily_loss_limit:Number(v)})} testid="rule-dll" />
              <Field label="Max risk per trade (%)" value={rules.max_risk_pct} onChange={(v)=>setRules({...rules,max_risk_pct:Number(v)})} testid="rule-risk" />
              <Field label="Stop after N losses" value={rules.stop_after_loss} onChange={(v)=>setRules({...rules,stop_after_loss:Number(v)})} testid="rule-stop-loss" />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-10">
          <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} className="btn-ghost text-white disabled:opacity-30">Back</button>
          {step < 4 ? (
            <button onClick={()=>setStep(s=>s+1)} className="btn-primary" data-testid="onb-next">Continue</button>
          ) : (
            <button onClick={finish} disabled={loading} className="btn-primary" data-testid="onb-finish">{loading?"Saving…":"Enter PipsEvo →"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, testid }) => (
  <div>
    <label className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input type="number" value={value} onChange={(e)=>onChange(e.target.value)} data-testid={testid} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono outline-none focus:border-[#4F8CFF]" />
  </div>
);
