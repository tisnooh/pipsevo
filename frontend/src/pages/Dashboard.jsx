import React, { useEffect, useState } from "react";
import { dashboard, trades, accounts as accAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, TrendingUp, Shield, Wallet, Target, ArrowDownRight, Sparkles, Calendar, BarChart3 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { DEMO_TRADES, DEMO_ACCOUNTS, DEMO_KPIS, DEMO_METRICS, DEMO_EQUITY, isEmpty } from "@/lib/demo";
import { useAuth } from "@/context/AuthContext";

const kpiColors = {
  green: { stroke: "#00E676", id: "g-green" },
  purple: { stroke: "#B58BFF", id: "g-purple" },
  blue:   { stroke: "#4F8CFF", id: "g-blue" },
  red:    { stroke: "#FF5252", id: "g-red" },
};

const sparkData = (seed, down) => {
  const out = []; let v = 12;
  for (let i = 0; i < 24; i++) { v += (Math.sin(seed*1.7 + i*0.7) + 0.55 + (down ? -0.5 : 0.35)) * 1.3; out.push({ x: i, y: Math.max(1, v) }); }
  return out;
};

const KPICard = ({ label, value, sub, sparkColor = "green", icon: Icon, testid }) => {
  const c = kpiColors[sparkColor];
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} transition={{ duration: .25 }} className="card-elev p-4 sm:p-5 relative overflow-hidden h-[160px] sm:h-[180px] group hover:border-white/15" data-testid={testid}>
      <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition" style={{background:c.stroke}}/>
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-[#9CA3AF]">{label}</div>
        {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: c.stroke }} />}
      </div>
      <div className="text-[26px] sm:text-[34px] font-bold font-mono mt-3 leading-none" style={{ color: sparkColor === "red" ? "#FF5252" : sparkColor === "green" ? "#00E676" : "white" }}>{value}</div>
      {sub && <div className="text-xs mt-2 flex items-center gap-1" style={{ color: c.stroke }}>◆ <span>{sub}</span></div>}
      <div className="absolute left-0 right-0 bottom-0 h-[58px] pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData(label.length, sparkColor === "red")} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00E676" stopOpacity="0.55"/><stop offset="100%" stopColor="#00E676" stopOpacity="0"/></linearGradient>
              <linearGradient id="g-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B58BFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#B58BFF" stopOpacity="0"/></linearGradient>
              <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#4F8CFF" stopOpacity="0"/></linearGradient>
              <linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF5252" stopOpacity="0.55"/><stop offset="100%" stopColor="#FF5252" stopOpacity="0"/></linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke={c.stroke} strokeWidth={2} fill={`url(#${c.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [recent, setRecent] = useState([]);
  const [accs, setAccs] = useState([]);
  const [tab, setTab] = useState("Tous");
  const [period, setPeriod] = useState("30");
  const [accountFilter, setAccountFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");

  useEffect(() => {
    dashboard().then(r => setD(r.data)).catch(()=>{});
    trades.list().then(r => setRecent(r.data)).catch(()=>{});
    accAPI.list().then(r => setAccs(r.data)).catch(()=>{});
  }, []);

  // Fallback to demo data if real data is empty
  const useDemo = isEmpty(recent) && isEmpty(accs);
  const k = useDemo ? DEMO_KPIS : (d?.kpis || DEMO_KPIS);
  const m = useDemo ? DEMO_METRICS : (d?.metrics || DEMO_METRICS);
  const equityData = (useDemo || !d?.equity_curve?.length) ? DEMO_EQUITY : d.equity_curve;
  const tradeList = useDemo ? DEMO_TRADES : recent;
  const accList = useDemo ? DEMO_ACCOUNTS : accs;

  const filtered = tradeList.filter(t =>
    (!accountFilter || t.account_id === accountFilter) &&
    (!assetFilter || t.instrument === assetFilter) &&
    (tab === "Tous" || (tab === "Gagnants" ? t.pnl > 0 : t.pnl < 0))
  ).slice(0, 5);

  return (
    <div className="p-4 sm:p-7 space-y-5 max-w-[1800px] mx-auto">
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-[#111426] via-[#0B0E1A] to-[#090B13] p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,.32)]">
        <div className="absolute -top-32 right-[8%] w-80 h-80 rounded-full bg-[#7C4DFF] blur-3xl opacity-15"/><div className="absolute -bottom-36 left-[25%] w-72 h-72 rounded-full bg-[#4F8CFF] blur-3xl opacity-10"/>
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div><div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-mono text-[#B58BFF]"><span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_10px_#00E676]"/>Centre de pilotage</div><h1 className="text-2xl sm:text-4xl font-bold mt-3">Bonjour {user?.name?.split(" ")[0] || "Trader"}<span className="text-[#B58BFF]">.</span></h1><p className="text-sm text-[#9CA3AF] mt-2">Garde le contrôle de ton risque, de ta discipline et de tes prochains objectifs.</p></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0 xl:min-w-[420px]">{[["Capital suivi",`$${k.funded_capital?.toLocaleString?.() || "0"}`,"#4F8CFF"],["Score trader",`${k.trader_score || k.discipline_score}/100`,"#B58BFF"],["Payouts",`$${k.total_payouts?.toLocaleString?.() || "0"}`,"#00E676"]].map(([l,v,c])=><div key={l} className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4 backdrop-blur"><div className="text-[9px] text-[#6B7280] uppercase tracking-wider">{l}</div><div className="text-sm sm:text-xl font-bold font-mono mt-2 truncate" style={{color:c}}>{v}</div></div>)}</div>
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          {useDemo ? <div className="text-[11px] text-[#B58BFF] inline-flex items-center gap-2" data-testid="demo-banner"><span className="w-1.5 h-1.5 rounded-full bg-[#B58BFF]"/>Mode démonstration : ajoute un compte et des trades pour afficher tes chiffres.</div> : <div className="text-[11px] text-[#00E676] inline-flex items-center gap-2"><Shield className="w-3.5 h-3.5"/>Données synchronisées avec ton journal.</div>}
          <div className="flex items-center gap-2 flex-wrap">
          <label className="card-flat px-3 py-2 text-sm flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[#9CA3AF]"/><select value={period} onChange={e=>setPeriod(e.target.value)} className="bg-transparent"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></label>
          <Link to="/app/markets" className="card-flat px-3 py-2 text-sm inline-flex items-center gap-2 hover:border-[#7C4DFF]/40"><BarChart3 className="w-4 h-4 text-[#B58BFF]"/> Marchés</Link>
          <Link to="/app/accounts" className="btn-primary inline-flex items-center gap-2 text-sm py-2.5" data-testid="dash-add-account"><Plus className="w-4 h-4"/> Ajouter un compte</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard label="Profit net" value={`+$${k.total_profit.toLocaleString()}`} sub="+ 12.4% vs période précédente" sparkColor="green" icon={TrendingUp} testid="kpi-profit" />
        <KPICard label="Score de discipline" value={<><span>{k.discipline_score}</span><span className="text-[#9CA3AF] text-base"> /100</span></>} sub="Excellent" sparkColor="purple" icon={BarChart3} testid="kpi-discipline" />
        <KPICard label="Comptes actifs" value={k.active_accounts} sub="Tous sains" sparkColor="blue" icon={Shield} testid="kpi-accounts" />
        <KPICard label="Win Rate" value={`${m.winrate}%`} sub="+ 8%" sparkColor="green" icon={Target} testid="kpi-winrate" />
        <KPICard label="Drawdown restant" value={`$${k.remaining_drawdown.toLocaleString()}`} sub="24.6% restant" sparkColor="red" icon={ArrowDownRight} testid="kpi-dd" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">Courbe d'équité</div>
            <select value={period} onChange={e=>setPeriod(e.target.value)} className="text-xs bg-[#0D1020] text-[#9CA3AF] px-2.5 py-1 rounded-lg border border-white/5"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs><linearGradient id="eqfill-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0"/></linearGradient></defs>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v)=>`$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="equity" stroke="#B58BFF" strokeWidth={2.4} fill="url(#eqfill-d)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="card-elev p-5">
            <div className="text-sm font-semibold mb-3">Progression des payouts</div>
            <div className="text-xs text-[#9CA3AF]">Topstep Combine</div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-2xl font-bold font-mono">$6,240</div>
              <div className="text-xs text-[#9CA3AF]">/ $10,000</div>
              <div className="ml-auto text-xs font-mono">62%</div>
            </div>
            <div className="h-2 rounded-full bg-white/5 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] rounded-full" style={{ width: "62%" }} /></div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div><div className="text-xs text-[#9CA3AF]">Prochain payout estimé</div><div className="text-xl font-bold font-mono mt-1">${k.estimated_payout.toLocaleString()}</div></div>
              <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/5"><Calendar className="w-3 h-3"/>Dans 18 jours</div>
            </div>
          </div>
          <div className="card-elev p-5">
            <div className="text-sm font-semibold mb-3">Répartition discipline</div>
            <div className="flex items-center justify-center"><BigGauge value={k.discipline_score} /></div>
            <Link to="/app/discipline" className="block text-center mt-2 text-xs text-[#B58BFF]" data-testid="dash-discipline-link">Détails →</Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Trades récents</div>
            <div className="flex items-center gap-2">
              <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} className="text-xs bg-[#0D1020] text-[#9CA3AF] px-2 py-1 rounded-lg border border-white/5"><option value="">Tous les comptes</option>{accList.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
              <select value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} className="text-xs bg-[#0D1020] text-[#9CA3AF] px-2 py-1 rounded-lg border border-white/5"><option value="">Tous les actifs</option>{[...new Set(tradeList.map(t=>t.instrument))].filter(Boolean).map(x=><option key={x}>{x}</option>)}</select>
            </div>
          </div>
          <div className="flex gap-5 border-b border-white/5 text-sm">
            {["Tous","Gagnants","Perdants"].map(t => (
              <button key={t} onClick={()=>setTab(t)} data-testid={`tab-${t}`} className={`pb-2 ${tab===t ? "text-white border-b-2 border-[#7C4DFF]" : "text-[#9CA3AF]"}`}>{t}</button>
            ))}
          </div>
          <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0 mt-3">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-[#6B7280] text-[11px] uppercase font-mono">
                <tr><th className="text-left py-2 font-normal">Date</th><th className="text-left font-normal">Actif</th><th className="text-left font-normal">Direction</th><th className="text-right font-normal">Résultat</th><th className="text-right font-normal">R Multiple</th><th className="text-left pl-4 font-normal">Durée</th><th className="text-left font-normal">Compte</th><th className="text-left font-normal">Tags</th></tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="py-2.5 text-xs text-[#B5BBC9]">{t.date}</td>
                    <td className="font-medium">{t.instrument}</td>
                    <td className={t.direction === "long" ? "text-[#00E676]" : "text-[#FF5252]"}>{t.direction === "long" ? "Achat (Long)" : "Vente (Short)"}</td>
                    <td className="text-right font-mono" style={{ color: t.pnl >= 0 ? "#00E676" : "#FF5252" }}>{t.pnl>=0?"+":""}${Math.abs(t.pnl).toFixed(2)}</td>
                    <td className="text-right font-mono" style={{ color: t.pnl >= 0 ? "#00E676" : "#FF5252" }}>{(t.r ?? (t.pnl/100)).toFixed?.(2) ?? (t.r ?? (t.pnl/100))}R</td>
                    <td className="pl-4 text-xs text-[#9CA3AF]">{t.duration || t.session || "—"}</td>
                    <td className="text-xs text-[#B5BBC9]">{t.account || (accs.find(a=>a.id===t.account_id)?.firm) || "—"}</td>
                    <td className="space-x-1">{(t.tags || (t.setup ? [t.setup] : [])).map((tag,i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-[#B5BBC9] inline-block">{tag}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/app/journal" className="block text-center mt-4 text-xs text-[#B58BFF]">Voir tous les trades →</Link>
        </div>

        <div className="space-y-4">
          <div className="card-elev p-5 glow-purple">
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-[#B58BFF]"/> AI Coach Insight</div>
            <p className="text-xs text-[#B5BBC9] mt-3 leading-relaxed">Tu sur-trades les mardis. Ta win rate ce jour-là est 18% plus basse que la moyenne.</p>
            <Link to="/app/coach" className="block text-center mt-4 text-xs btn-primary py-2" data-testid="dash-insight-link">Voir l'insight →</Link>
          </div>
          <div className="card-elev p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Comptes</div>
              <Link to="/app/accounts" className="text-xs text-[#B58BFF]">Voir tout</Link>
            </div>
            {accList.map(a => {
              const pnl = a.balance - a.initial_balance;
              return (
                <div key={a.id} className="flex items-center justify-between py-2 border-t border-white/5 first:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: pnl >= 0 ? "#00E676" : "#FF5252" }} />
                    <div className="text-xs">{a.firm} {a.name}</div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: pnl >= 0 ? "#00E676" : "#FF5252" }}>{pnl>=0?"+":""}${pnl.toLocaleString()}</div>
                </div>
              );
            })}
            <Link to="/app/accounts" className="block text-center mt-4 text-xs text-[#B58BFF]">Gérer mes comptes →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigGauge({ value }) {
  const pct = value / 100;
  return (
    <div className="relative w-44 h-28">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs><linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00E676"/><stop offset="100%" stopColor="#7C4DFF"/></linearGradient></defs>
        <path d="M20 95 A75 75 0 0 1 180 95" stroke="#1E2430" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M20 95 A75 75 0 0 1 180 95" stroke="url(#bg-grad)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="236" strokeDashoffset={236 - 236*pct} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-3xl font-bold font-mono">{value}<span className="text-sm text-[#9CA3AF]">/100</span></div>
        <div className="text-[10px] text-[#9CA3AF] mt-0.5">Excellent</div>
      </div>
    </div>
  );
}
