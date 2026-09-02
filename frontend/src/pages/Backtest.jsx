import React, { useMemo, useState } from "react";
import { BarChart3, FlaskConical, Play, RotateCcw, ShieldCheck, Target } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function Backtest() {
  const { settings, money } = useAppSettings();
  const initial = { capital: 10000, trades: 100, winrate: 55, gain: 2, loss: 1, risk: 1 };
  const [form, setForm] = useState(initial);
  const [ran, setRan] = useState(false);
  const result = useMemo(() => {
    let equity = +form.capital, peak = equity, maxDd = 0; const curve = [];
    for (let i=0;i<+form.trades;i++) {
      const risk = equity * (+form.risk/100);
      const isWin = ((i * 61 + 17) % 100) < +form.winrate;
      equity += isWin ? risk * +form.gain : -risk * +form.loss;
      peak = Math.max(peak, equity); maxDd = Math.max(maxDd, (peak-equity)/peak*100);
      curve.push(equity);
    }
    return { final: equity, profit: equity-(+form.capital), maxDd, expectancy: (+form.winrate/100)*+form.gain-(1-(+form.winrate/100))*+form.loss, curve };
  }, [form]);
  const valid = +form.capital > 0 && +form.trades >= 1 && +form.trades <= 5000 && +form.winrate >= 0 && +form.winrate <= 100 && +form.gain > 0 && +form.loss > 0 && +form.risk > 0 && +form.risk <= 10;
  const preview = {
    expectancy: (+form.winrate/100)*+form.gain-(1-(+form.winrate/100))*+form.loss,
    riskAmount: +form.capital*(+form.risk/100),
    requiredWinrate: (+form.loss/(+form.gain + +form.loss))*100,
  };
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return <div className="pe-page pe-page-stack mx-auto max-w-[1800px]">
    <div className="pe-page-header"><div><div className="pe-eyebrow">Projection statistique</div><h1 className="pe-page-title mt-2 flex items-center gap-2"><FlaskConical className="h-6 w-6 text-[#B58BFF]"/>Simulateur de stratégie</h1><p className="pe-page-copy mt-1">Teste des hypothèses avec un risque composé. Ce module n’utilise pas encore de données de marché historiques.</p></div></div>
    <div className="grid lg:grid-cols-3 gap-4">
      <form onSubmit={e=>{e.preventDefault();setRan(true)}} className="pe-card pe-card-pad space-y-4">
        {[["capital",`Capital initial (${settings.currency})`,100],['trades','Nombre de trades',1],['winrate','Win rate (%)',1],['gain','Gain moyen (R)',0.1],['loss','Perte moyenne (R)',0.1],['risk','Risque par trade (%)',0.1]].map(([k,l,s])=><label key={k} className="block text-xs font-medium text-[#9CA3AF]">{l}<input type="number" min={k==='winrate'?0:0.01} max={k==='winrate'?100:k==='risk'?10:k==='trades'?5000:undefined} step={s} value={form[k]} onChange={e=>set(k,e.target.value)} className="pe-control mt-2 w-full"/></label>)}
        {!valid&&<p className="text-xs text-[#F26A70]">Vérifie les valeurs : risque entre 0 et 10%, win rate entre 0 et 100%, maximum 5 000 trades.</p>}
        <div className="flex gap-2"><button disabled={!valid} className="btn-primary flex-1 inline-flex justify-center items-center gap-2 disabled:opacity-40"><Play className="w-4 h-4"/>Simuler</button><button type="button" title="Réinitialiser" aria-label="Réinitialiser la simulation" onClick={()=>{setForm(initial);setRan(false)}} className="pe-icon-button"><RotateCcw className="w-4 h-4"/></button></div>
      </form>
      <div className="lg:col-span-2 space-y-4">
        {!ran ? <div className="pe-card overflow-hidden">
          <div className="border-b border-white/[0.07] p-6 sm:p-8"><div className="font-semibold text-white">Aperçu de ton hypothèse</div><p className="mt-2 max-w-2xl text-sm text-[#9CA3AF]">Vérifie rapidement la cohérence de tes paramètres avant de lancer la projection statistique.</p></div>
          <div className="grid sm:grid-cols-3 gap-3 p-5 sm:p-6">
            <PreviewStat icon={BarChart3} label="Espérance théorique" value={`${preview.expectancy.toFixed(2)}R`} positive={preview.expectancy>=0}/>
            <PreviewStat icon={ShieldCheck} label="Risque au départ" value={money(preview.riskAmount)} positive/>
            <PreviewStat icon={Target} label="Win rate d’équilibre" value={`${preview.requiredWinrate.toFixed(1)}%`} positive/>
          </div>
          <div className="mx-5 mb-5 sm:mx-6 sm:mb-6 rounded-xl border border-[#B58BFF]/15 bg-[#B58BFF]/[0.05] p-4 text-xs leading-relaxed text-[#A5ADBA]">Il s’agit d’une simulation mathématique déterministe, pas d’un Trade Replay ni d’une prévision de performance. Lance-la pour visualiser le capital projeté et le drawdown du scénario.</div>
        </div> : <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat l="Capital final" v={money(result.final)} c="#B58BFF"/><Stat l="Profit net" v={money(result.profit,{signDisplay:"always"})} c={result.profit>=0?'#46C99A':'#F26A70'}/><Stat l="Drawdown max" v={`${result.maxDd.toFixed(1)}%`} c="#FFB855"/><Stat l="Espérance" v={`${result.expectancy.toFixed(2)}R`} c={result.expectancy>=0?'#46C99A':'#F26A70'}/>
          </div>
          <div className="pe-card pe-card-pad"><div className="pe-section-title mb-4">Courbe simulée</div><svg viewBox="0 0 600 180" className="h-64 w-full"><polyline points={result.curve.map((v,i)=>`${i/(Math.max(result.curve.length-1,1))*600},${170-(v-Math.min(...result.curve))/(Math.max(...result.curve)-Math.min(...result.curve)||1)*155}`).join(' ')} fill="none" stroke="#B58BFF" strokeWidth="3"/></svg></div>
        </>}
      </div>
    </div>
  </div>;
}
const Stat=({l,v,c})=><div className="pe-card p-4"><div className="text-pe-caption text-[#9CA3AF]">{l}</div><div className="font-numeric mt-2 text-2xl font-bold" style={{color:c}}>{v}</div></div>;
const PreviewStat=({icon:Icon,label,value,positive})=><div className="card-flat p-4"><div className="flex items-center gap-2 text-xs font-medium text-[#9CA3AF]"><Icon className="h-4 w-4 text-[#B58BFF]"/>{label}</div><div className={`font-numeric mt-3 text-2xl font-bold ${positive?"text-white":"text-[#F26A70]"}`}>{value}</div></div>;
