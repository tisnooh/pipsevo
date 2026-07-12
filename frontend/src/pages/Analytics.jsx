import React, { useEffect, useState } from "react";
import { dashboard } from "@/lib/api";
import { AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Sparkles, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { DEMO_KPIS, DEMO_METRICS, DEMO_EQUITY, DEMO_BEST_ASSETS } from "@/lib/demo";

const TABS = ["Vue d'ensemble","Performance","Trades","Temps","Risques","Comportement"];

export default function Analytics() {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("Vue d'ensemble");
  const [period, setPeriod] = useState("30");
  useEffect(() => { dashboard().then(r => setD(r.data)).catch(()=>{}); }, []);

  const useDemo = !d?.kpis?.total_trades;
  const m = useDemo ? DEMO_METRICS : (d?.metrics || DEMO_METRICS);
  const totalProfit = useDemo ? DEMO_KPIS.total_profit : (d?.kpis?.total_profit ?? DEMO_KPIS.total_profit);
  const totalTrades = useDemo ? DEMO_KPIS.total_trades : (d?.kpis?.total_trades || DEMO_KPIS.total_trades);
  const equity = (useDemo || !d?.equity_curve?.length) ? DEMO_EQUITY : d.equity_curve;
  const download = () => {
    const rows = [["date","equity"], ...equity.map(x=>[x.date,x.equity])];
    const blob = new Blob([rows.map(r=>r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download="pipsevo-statistiques.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-7 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Statistiques</h1>
      </div>

      <div className="flex items-center justify-between border-b border-white/5">
        <div className="flex gap-6">
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} data-testid={`stat-tab-${t}`} className={`pb-3 text-sm ${tab===t?"text-white border-b-2 border-[#7C4DFF]":"text-[#9CA3AF]"}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="card-flat bg-[#0D1020] px-3 py-1.5 text-xs"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select>
          <button onClick={download} title="Exporter en CSV" className="card-flat px-2 py-1.5 text-xs">⬇</button>
          <Link to="/app/settings" title="Paramètres" className="card-flat px-2 py-1.5 text-xs">⚙</Link>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SparkCard label="Profit net" value={`+$${totalProfit.toLocaleString()}`} sub="+ 12.4% vs période précédente" color="#00E676" />
        <SparkCard label="Taux de réussite" value={`${m.winrate}%`} sub="+ 8% vs période précédente" color="#00E676" />
        <SparkCard label="Facteur de profit" value={m.profit_factor} sub="Bon" color="#B58BFF" subColor="#B58BFF" />
        <SparkCard label="Gain moyen" value={`+$${m.avg_win.toFixed(2)}`} sub="" color="#00E676" />
        <SparkCard label="Perte moyenne" value={`${m.avg_loss.toFixed(2)}`} sub="" color="#FF5252" down />
        <div className="card-elev p-5 glow-purple">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-[#B58BFF]"/> Insight IA</div>
          <p className="text-xs text-[#B5BBC9] mt-3 leading-relaxed">Tu sur-trades les mardis. Ton win rate ce jour-là est 18% plus basse que la moyenne.</p>
          <Link to="/app/coach" className="block text-center mt-3 text-xs btn-primary py-1.5" data-testid="stat-insight-link">Voir l'analyse complète →</Link>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">Évolution du capital</div>
            <select value={period} onChange={e=>setPeriod(e.target.value)} className="card-flat bg-[#0D1020] px-2.5 py-1 text-xs"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity}>
                <defs><linearGradient id="cap-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0"/></linearGradient></defs>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v)=>`$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="equity" stroke="#B58BFF" strokeWidth={2.2} fill="url(#cap-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elev p-5">
            <div className="text-sm font-semibold mb-4">Répartition des résultats</div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={[{name:"W",value:m.winrate},{name:"L",value:100-m.winrate}]} dataKey="value" innerRadius={42} outerRadius={60} strokeWidth={0}>
                    <Cell fill="#00E676"/><Cell fill="#FF5252"/>
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00E676]"/>Gagnants <span className="text-[#9CA3AF] ml-2">{Math.round(m.winrate/100*totalTrades)} ({m.winrate}%)</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#FF5252]"/>Perdants <span className="text-[#9CA3AF] ml-2">{Math.round((100-m.winrate)/100*totalTrades)} ({100-m.winrate}%)</span></div>
                <div className="text-2xl font-bold font-mono pt-2">{totalTrades}<div className="text-xs text-[#9CA3AF] font-sans font-normal">Trades</div></div>
              </div>
            </div>
          </div>
          <div className="card-elev p-5">
            <div className="text-sm font-semibold mb-3">Meilleurs actifs</div>
            {DEMO_BEST_ASSETS.map(x => (
              <div key={x.s} className="flex justify-between py-1.5 text-xs">
                <span className="text-[#B5BBC9]">{x.s}</span>
                <span className="font-mono" style={{ color: x.v >= 0 ? "#00E676" : "#FF5252" }}>{x.v>=0?"+":""}${x.v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5">
          <div className="text-sm font-semibold mb-3">Performance par jour <span className="text-[10px] text-[#6B7280]">($)</span></div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayPerf()}>
                <XAxis dataKey="d" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12 }} />
                <Bar dataKey="v" radius={[4,4,0,0]}>{dayPerf().map((e,i)=><Cell key={i} fill={e.v >= 0 ? "#00E676" : "#FF5252"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elev p-5">
          <div className="text-sm font-semibold">Durée moyenne des trades</div>
          <div className="text-2xl font-bold font-mono mt-2">1h 42m</div>
          <div className="text-xs text-[#00E676] mt-1">+8m vs période précédente</div>
          <div className="h-44 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{n:"&lt; 5m",v:8},{n:"5m-15m",v:18},{n:"15m-1h",v:28},{n:"1h-4h",v:20},{n:"4h-1j",v:10},{n:"&gt; 1j",v:4}]}>
                <XAxis dataKey="n" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v)=>`${v}%`} />
                <Bar dataKey="v" radius={[6,6,0,0]} fill="#7C4DFF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elev p-5">
          <div className="text-sm font-semibold mb-3">Heures les plus rentables</div>
          <Heatmap />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="text-sm font-semibold mb-3">Performance par compte</div>
          {[
            { n: "Topstep Combine $100K", v: 8450 },
            { n: "Apex Trader Funding $50K", v: 3210 },
            { n: "FTMO $100K", v: 1870 },
            { n: "FundedNext $25K", v: 980 },
            { n: "The5ers $50K", v: -270 },
          ].map(a => (
            <div key={a.n} className="flex items-center justify-between py-2 border-t border-white/5 first:border-0">
              <div className="flex items-center gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full" style={{ background: a.v >= 0 ? "#00E676" : "#FF5252" }} />{a.n}</div>
              <span className="font-mono text-sm" style={{ color: a.v >= 0 ? "#00E676" : "#FF5252" }}>{a.v>=0?"+":""}${a.v.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="card-elev p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#7C4DFF22,#4F8CFF15)" }}>
          <Crown className="absolute -bottom-4 -right-4 w-32 h-32 text-[#7C4DFF]/30" />
          <div className="text-sm font-semibold">Débloque tout le potentiel</div>
          <p className="text-xs text-[#B5BBC9] mt-2">Passe à Pro pour accéder à des statistiques avancées et des rapports personnalisés.</p>
          <Link to="/app/settings" className="btn-primary inline-block mt-4 text-xs py-2" data-testid="stat-pro-cta">Découvrir Pro →</Link>
        </div>
      </div>
    </div>
  );
}

const SparkCard = ({ label, value, sub, color, subColor, down }) => (
  <div className="card-elev p-5 relative overflow-hidden">
    <div className="text-sm text-[#9CA3AF]">{label}</div>
    <div className="text-2xl font-bold font-mono mt-2" style={{ color }}>{value}</div>
    {sub && <div className="text-xs mt-1" style={{ color: subColor || color }}>{sub}</div>}
    <svg viewBox="0 0 100 30" className="w-full h-10 mt-2">
      <defs><linearGradient id={`sk-${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {down ? (
        <>
          <path d="M0,5 L10,8 L20,6 L30,10 L40,13 L50,11 L60,17 L70,15 L80,20 L90,18 L100,25 L100,30 L0,30 Z" fill={`url(#sk-${label.replace(/\s/g,"")})`}/>
          <path d="M0,5 L10,8 L20,6 L30,10 L40,13 L50,11 L60,17 L70,15 L80,20 L90,18 L100,25" stroke={color} strokeWidth="1.5" fill="none"/>
        </>
      ) : (
        <>
          <path d="M0,25 L10,22 L20,24 L30,18 L40,20 L50,14 L60,16 L70,10 L80,12 L90,7 L100,5 L100,30 L0,30 Z" fill={`url(#sk-${label.replace(/\s/g,"")})`}/>
          <path d="M0,25 L10,22 L20,24 L30,18 L40,20 L50,14 L60,16 L70,10 L80,12 L90,7 L100,5" stroke={color} strokeWidth="1.5" fill="none"/>
        </>
      )}
    </svg>
  </div>
);

const Heatmap = () => {
  const days = ["Lun","Mar","Mer","Jeu","Ven"];
  const hours = ["00-04h","04-08h","08-12h","12-16h","16-20h","20-00h"];
  // Predictable demo data
  const data = hours.map((_, r) => days.map((_, c) => (Math.sin(r*1.7+c*2.3)+1)/2));
  return (
    <div>
      <div className="grid grid-cols-[60px_1fr] gap-1 text-[10px] text-[#6B7280]">
        <div></div>
        <div className="grid grid-cols-5 gap-1 text-center mb-1">{days.map(d => <div key={d}>{d}</div>)}</div>
        {hours.map((h, r) => (
          <React.Fragment key={h}>
            <div className="self-center">{h}</div>
            <div className="grid grid-cols-5 gap-1">
              {days.map((_, c) => (
                <div key={c} className="aspect-square rounded" style={{ background: `rgba(124,77,255,${0.15 + data[r][c]*0.8})` }} />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="h-1.5 mt-3 rounded-full" style={{ background: "linear-gradient(90deg, #1E2430, #7C4DFF)" }} />
      <div className="flex justify-between text-[9px] text-[#6B7280] mt-1"><span>Moins rentable</span><span>Plus rentable</span></div>
    </div>
  );
};

const dayPerf = () => {
  const arr = [];
  const vals = [200,600,300,-400,1100,-200,800,-700,400,900,500,-300,200,-500,700,300,600,-400,500,-100];
  vals.forEach((v,i) => arr.push({ d: 10+Math.floor(i/3)+" mai", v }));
  return arr;
};

const sampleEquity = () => {
  const arr = [];
  let v = 1000;
  const labels = ["10 mai","13 mai","17 mai","20 mai","24 mai","27 mai","31 mai","3 juin","7 juin"];
  for (let i = 0; i < 30; i++) { v += Math.random()*900+200; arr.push({ date: labels[Math.floor(i/4)] || "", equity: Math.round(v) }); }
  return arr;
};
