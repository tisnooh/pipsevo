import React, { useMemo, useState } from "react";
import { FlaskConical, Play, RotateCcw } from "lucide-react";

export default function Backtest() {
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
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return <div className="p-4 sm:p-7 space-y-5">
    <div><h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><FlaskConical className="text-[#B58BFF]"/>Backtest</h1><p className="text-sm text-[#9CA3AF] mt-1">Simule une stratégie avec un risque composé.</p></div>
    <div className="grid lg:grid-cols-3 gap-4">
      <form onSubmit={e=>{e.preventDefault();setRan(true)}} className="card-elev p-6 space-y-4">
        {[['capital','Capital initial ($)',100],['trades','Nombre de trades',1],['winrate','Win rate (%)',1],['gain','Gain moyen (R)',0.1],['loss','Perte moyenne (R)',0.1],['risk','Risque par trade (%)',0.1]].map(([k,l,s])=><label key={k} className="block text-xs text-[#9CA3AF]">{l}<input type="number" min={k==='winrate'?0:0.01} max={k==='winrate'?100:k==='risk'?10:k==='trades'?5000:undefined} step={s} value={form[k]} onChange={e=>set(k,e.target.value)} className="mt-1 w-full bg-[#0D1020] border border-white/10 rounded-xl px-3 py-2.5 text-white"/></label>)}
        {!valid&&<p className="text-xs text-[#FF7272]">Vérifie les valeurs : risque entre 0 et 10%, win rate entre 0 et 100%, maximum 5 000 trades.</p>}
        <div className="flex gap-2"><button disabled={!valid} className="btn-primary flex-1 inline-flex justify-center items-center gap-2 disabled:opacity-40"><Play className="w-4 h-4"/>Simuler</button><button type="button" title="Réinitialiser" onClick={()=>{setForm(initial);setRan(false)}} className="btn-ghost px-3"><RotateCcw className="w-4 h-4"/></button></div>
      </form>
      <div className="lg:col-span-2 space-y-4">
        {!ran ? <div className="card-elev p-12 text-center text-[#9CA3AF]">Renseigne tes hypothèses puis lance la simulation.</div> : <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat l="Capital final" v={`$${result.final.toFixed(0)}`} c="#B58BFF"/><Stat l="Profit net" v={`${result.profit>=0?'+':''}$${result.profit.toFixed(0)}`} c={result.profit>=0?'#00E676':'#FF5252'}/><Stat l="Drawdown max" v={`${result.maxDd.toFixed(1)}%`} c="#FFB855"/><Stat l="Espérance" v={`${result.expectancy.toFixed(2)}R`} c={result.expectancy>=0?'#00E676':'#FF5252'}/>
          </div>
          <div className="card-elev p-6"><div className="text-sm font-semibold mb-4">Courbe simulée</div><svg viewBox="0 0 600 180" className="w-full h-64"><polyline points={result.curve.map((v,i)=>`${i/(Math.max(result.curve.length-1,1))*600},${170-(v-Math.min(...result.curve))/(Math.max(...result.curve)-Math.min(...result.curve)||1)*155}`).join(' ')} fill="none" stroke="#B58BFF" strokeWidth="3"/></svg></div>
        </>}
      </div>
    </div>
  </div>;
}
const Stat=({l,v,c})=><div className="card-elev p-4"><div className="text-xs text-[#9CA3AF]">{l}</div><div className="text-xl font-bold font-mono mt-2" style={{color:c}}>{v}</div></div>;
