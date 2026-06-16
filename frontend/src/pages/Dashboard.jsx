import React, { useEffect, useState } from "react";
import { dashboard, trades, accounts as accAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, TrendingUp, Shield, Wallet, Target, ArrowDownRight, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const kpiColors = {
  green: { stroke: "#00E676", fill: "url(#g-green)" },
  purple: { stroke: "#B58BFF", fill: "url(#g-purple)" },
  blue: { stroke: "#4F8CFF", fill: "url(#g-blue)" },
  red: { stroke: "#FF5252", fill: "url(#g-red)" },
};

const sparkData = (seed, down) => {
  const out = [];
  let v = 10;
  for (let i = 0; i < 18; i++) { v += (Math.sin(seed + i) + 0.5 + (down ? -0.4 : 0.3)) * 1.5; out.push({ x: i, y: Math.max(1, v) }); }
  return out;
};

const KPICard = ({ label, value, sub, sparkColor = "green", icon: Icon, testid, subColor }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card-elev p-5 relative overflow-hidden" data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="text-sm text-[#9CA3AF]">{label}</div>
      {Icon && <Icon className="w-4 h-4" style={{ color: kpiColors[sparkColor].stroke }} />}
    </div>
    <div className="text-3xl font-bold font-mono mt-3" style={{ color: sparkColor === "red" ? "#FF5252" : sparkColor === "green" ? "#00E676" : "white" }}>{value}</div>
    {sub && <div className="text-xs mt-1" style={{ color: subColor || "#9CA3AF" }}>{sub}</div>}
    <div className="absolute left-0 right-0 bottom-0 h-12 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparkData(label.length, sparkColor === "red")}>
          <defs>
            <linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00E676" stopOpacity="0.45"/><stop offset="100%" stopColor="#00E676" stopOpacity="0"/></linearGradient>
            <linearGradient id="g-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B58BFF" stopOpacity="0.45"/><stop offset="100%" stopColor="#B58BFF" stopOpacity="0"/></linearGradient>
            <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.45"/><stop offset="100%" stopColor="#4F8CFF" stopOpacity="0"/></linearGradient>
            <linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF5252" stopOpacity="0.45"/><stop offset="100%" stopColor="#FF5252" stopOpacity="0"/></linearGradient>
          </defs>
          <Area type="monotone" dataKey="y" stroke={kpiColors[sparkColor].stroke} strokeWidth={2} fill={kpiColors[sparkColor].fill} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [recent, setRecent] = useState([]);
  const [accs, setAccs] = useState([]);
  const [tab, setTab] = useState("Tous");

  useEffect(() => {
    dashboard().then(r => setD(r.data)).catch(()=>{});
    trades.list().then(r => setRecent(r.data.slice(0, 6))).catch(()=>{});
    accAPI.list().then(r => setAccs(r.data)).catch(()=>{});
  }, []);

  const k = d?.kpis || { total_profit: 12450, discipline_score: 94, active_accounts: 5, remaining_drawdown: 8240, total_trades: 0 };
  const winrate = d?.metrics?.winrate ?? 62;

  const filtered = tab === "Tous" ? recent : tab === "Gagnants" ? recent.filter(t => t.pnl > 0) : recent.filter(t => t.pnl < 0);

  return (
    <div className="p-7 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vue d'ensemble</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Track. Analyse. Improve. Get Paid.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="card-flat px-3 py-2 text-sm flex items-center gap-2 hover:border-[#7C4DFF]/40" data-testid="date-range"><Calendar className="w-3.5 h-3.5 text-[#9CA3AF]"/>30 derniers jours</button>
          <Link to="/app/accounts" className="btn-primary inline-flex items-center gap-2 text-sm py-2.5" data-testid="dash-add-account"><Plus className="w-4 h-4"/> Ajouter un compte</Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Profit net" value={`+$${k.total_profit.toLocaleString()}`} sub="+ 12.4% vs période précédente" sparkColor="green" icon={TrendingUp} testid="kpi-profit" subColor="#00E676" />
        <KPICard label="Score de discipline" value={`${k.discipline_score} /100`} sub="Excellent" sparkColor="purple" icon={Shield} testid="kpi-discipline" subColor="#B58BFF" />
        <KPICard label="Comptes actifs" value={k.active_accounts} sub="Tous sains" sparkColor="blue" icon={Wallet} testid="kpi-accounts" subColor="#4F8CFF" />
        <KPICard label="Win Rate" value={`${winrate}%`} sub="+ 8%" sparkColor="green" icon={Target} testid="kpi-winrate" subColor="#00E676" />
        <KPICard label="Drawdown restant" value={`$${k.remaining_drawdown.toLocaleString()}`} sub="24.6% restant" sparkColor="red" icon={ArrowDownRight} testid="kpi-dd" subColor="#FF5252" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">Courbe d'équité</div>
            <button className="text-xs text-[#9CA3AF] flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/5">30 derniers jours <ChevronRight className="w-3 h-3"/></button>
          </div>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(d?.equity_curve?.length ? d.equity_curve : sampleEquity()).map((p,i) => ({ ...p, x: i }))}>
                <defs>
                  <linearGradient id="eqfill-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0"/></linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v)=>`$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="equity" stroke="#B58BFF" strokeWidth={2.2} fill="url(#eqfill-d)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elev p-5 space-y-5">
          <div>
            <div className="text-sm font-semibold mb-3">Progression des payouts</div>
            <div className="text-xs text-[#9CA3AF]">Topstep Combine</div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-2xl font-bold font-mono">${(d?.kpis?.estimated_payout || 6240).toLocaleString()}</div>
              <div className="text-xs text-[#9CA3AF]">/ $10,000</div>
              <div className="ml-auto text-xs font-mono">62%</div>
            </div>
            <div className="h-2 rounded-full bg-white/5 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] rounded-full" style={{ width: "62%" }} /></div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div><div className="text-xs text-[#9CA3AF]">Prochain payout estimé</div><div className="text-xl font-bold font-mono mt-1">$3,760</div></div>
              <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/5"><Calendar className="w-3 h-3"/>Dans 18 jours</div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-5">
            <div className="text-sm font-semibold mb-3">Répartition discipline</div>
            <div className="flex items-center justify-center">
              <BigGauge value={k.discipline_score} />
            </div>
            <Link to="/app/discipline" className="block text-center mt-3 text-xs text-[#B58BFF]" data-testid="dash-discipline-link">Détails →</Link>
          </div>
        </div>
      </div>

      {/* Recent trades + AI Coach + Accounts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Trades récents</div>
            <div className="flex items-center gap-2">
              <button className="text-xs text-[#9CA3AF] flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/5">Tous les comptes ▾</button>
              <button className="text-xs text-[#9CA3AF] flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/5">Tous les actifs ▾</button>
            </div>
          </div>
          <div className="flex gap-5 border-b border-white/5 text-sm">
            {["Tous","Gagnants","Perdants"].map(t => (
              <button key={t} onClick={()=>setTab(t)} data-testid={`tab-${t}`} className={`pb-2 ${tab===t ? "text-white border-b-2 border-[#7C4DFF]" : "text-[#9CA3AF]"}`}>{t}</button>
            ))}
          </div>
          <table className="w-full text-sm mt-3">
            <thead className="text-[#6B7280] text-[11px] uppercase font-mono">
              <tr><th className="text-left py-2 font-normal">Date</th><th className="text-left font-normal">Actif</th><th className="text-left font-normal">Direction</th><th className="text-right font-normal">Résultat</th><th className="text-right font-normal">R Multiple</th><th className="text-left pl-4 font-normal">Compte</th><th className="text-left font-normal">Tags</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-[#9CA3AF] py-6 text-xs">Aucun trade. <Link to="/app/journal" className="text-[#B58BFF] hover:underline">Logger un trade →</Link></td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2.5 text-xs text-[#B5BBC9]">{t.date}</td>
                  <td className="font-medium">{t.instrument}</td>
                  <td className={t.direction === "long" ? "text-[#00E676]" : "text-[#FF5252]"}>{t.direction === "long" ? "Achat (Long)" : "Vente (Short)"}</td>
                  <td className="text-right font-mono" style={{ color: t.pnl >= 0 ? "#00E676" : "#FF5252" }}>{t.pnl>=0?"+":""}${t.pnl}</td>
                  <td className="text-right font-mono text-[#B5BBC9]">{((t.pnl||0)/100).toFixed(2)}R</td>
                  <td className="pl-4 text-xs text-[#9CA3AF]">{t.session || "—"}</td>
                  <td><span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-[#9CA3AF]">{t.setup || "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/app/journal" className="block text-center mt-4 text-xs text-[#B58BFF]">Voir tous les trades →</Link>
        </div>

        <div className="space-y-4">
          <div className="card-elev p-5 glow-purple">
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-[#B58BFF]"/> AI Coach Insight</div>
            <p className="text-xs text-[#B5BBC9] mt-3 leading-relaxed">Tu sur-trades les mardis. Ton win rate ce jour-là est 18% plus basse que la moyenne.</p>
            <Link to="/app/coach" className="block text-center mt-4 text-xs btn-primary py-2" data-testid="dash-insight-link">Voir l'insight →</Link>
          </div>
          <div className="card-elev p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Comptes</div>
              <Link to="/app/accounts" className="text-xs text-[#B58BFF]">Voir tout</Link>
            </div>
            {accs.length === 0 && <div className="text-xs text-[#9CA3AF] py-4 text-center">Aucun compte. <Link to="/app/accounts" className="text-[#B58BFF] hover:underline">Ajouter →</Link></div>}
            {accs.slice(0, 5).map(a => {
              const pnl = a.balance - a.initial_balance;
              return (
                <div key={a.id} className="flex items-center justify-between py-2 border-t border-white/5 first:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: pnl >= 0 ? "#00E676" : "#FF5252" }} />
                    <div className="text-xs">{a.firm} {a.name}</div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: pnl >= 0 ? "#00E676" : "#FF5252" }}>{pnl>=0?"+":""}${pnl.toFixed(0)}</div>
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
        <defs>
          <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00E676"/>
            <stop offset="100%" stopColor="#7C4DFF"/>
          </linearGradient>
        </defs>
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

function sampleEquity() {
  const arr = [];
  let v = 100;
  const months = ["10 mai","13 mai","17 mai","20 mai","24 mai","27 mai","31 mai","3 juin","7 juin"];
  for (let i = 0; i < 30; i++) {
    v += Math.random() * 800 + 200;
    arr.push({ date: months[Math.floor(i/4)] || "", equity: Math.round(v) });
  }
  return arr;
}
