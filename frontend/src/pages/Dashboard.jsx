import React, { useEffect, useState } from "react";
import { dashboard } from "@/lib/api";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";
import { TrendingUp, Shield, Trophy, Activity, Target, Heart } from "lucide-react";

const KPI = ({ icon: I, label, value, sub, color = "white", testid }) => (
  <div className="card-elev p-5" data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="text-xs font-mono uppercase tracking-widest text-[#9CA3AF]">{label}</div>
      <I className="w-4 h-4 text-[#9CA3AF]" />
    </div>
    <div className="text-3xl font-bold font-mono mt-3" style={{ color }}>{value}</div>
    {sub && <div className="text-xs text-[#9CA3AF] mt-1">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { dashboard().then(r => setData(r.data)).catch(()=>{}); }, []);

  if (!data) return <div className="p-10 text-[#9CA3AF]">Loading dashboard…</div>;
  const k = data.kpis;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Command Center</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Your funded empire, at a glance.</p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPI icon={Trophy} label="Funded Capital" value={`$${k.funded_capital.toLocaleString()}`} testid="kpi-funded" />
        <KPI icon={TrendingUp} label="Total Profit" value={`${k.total_profit>=0?"+":""}$${k.total_profit.toLocaleString()}`} color={k.total_profit>=0?"#00E676":"#FF5252"} testid="kpi-profit" />
        <KPI icon={Shield} label="Remaining DD" value={`$${k.remaining_drawdown.toLocaleString()}`} testid="kpi-dd" />
        <KPI icon={Activity} label="Estimated Payout" value={`$${k.estimated_payout.toLocaleString()}`} color="#4F8CFF" testid="kpi-est-payout" />
        <KPI icon={Target} label="Discipline" value={`${k.discipline_score}/100`} color="#00E676" testid="kpi-discipline" />
        <KPI icon={Heart} label="Trader Score" value={`${k.trader_score}/100`} color="#7C4DFF" testid="kpi-trader" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-5 lg:col-span-2 glow-blue">
          <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">Equity Curve</div>
          {data.equity_curve.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.equity_curve}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                <YAxis stroke="#9CA3AF" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12 }} />
                <Area type="monotone" dataKey="equity" stroke="#4F8CFF" strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-[#9CA3AF] text-sm">Log trades to see your equity curve.</div>
          )}
        </div>

        <div className="card-elev p-5">
          <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">Performance Metrics</div>
          <div className="space-y-3">
            <Row label="Winrate" value={`${data.metrics.winrate}%`} />
            <Row label="Profit Factor" value={data.metrics.profit_factor} />
            <Row label="Avg Win" value={`$${data.metrics.avg_win}`} color="#00E676" />
            <Row label="Avg Loss" value={`$${data.metrics.avg_loss}`} color="#FF5252" />
            <Row label="Plan Respect" value={`${data.metrics.plan_respect_rate}%`} color="#4F8CFF" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-elev p-5">
          <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">Best Setup</div>
          <div className="text-2xl font-bold">{data.best_setup || "—"}</div>
        </div>
        <div className="card-elev p-5">
          <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-4">Worst Setup</div>
          <div className="text-2xl font-bold text-[#FF5252]">{data.worst_setup || "—"}</div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, color }) => (
  <div className="flex justify-between text-sm">
    <span className="text-[#9CA3AF]">{label}</span>
    <span className="font-mono font-semibold" style={{ color: color || "white" }}>{value}</span>
  </div>
);
