import React, { useEffect, useState } from "react";
import { dashboard } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export default function Analytics() {
  const [d, setD] = useState(null);
  useEffect(() => { dashboard().then(r=>setD(r.data)); }, []);
  if (!d) return <div className="p-10 text-[#9CA3AF]">Loading…</div>;
  const setupData = Object.entries(d.setups).map(([k,v]) => ({ name: k, pnl: v.pnl, winrate: v.winrate, trades: v.trades }));
  const sessionData = Object.entries(d.sessions).map(([k,v]) => ({ name: k, pnl: v.pnl, winrate: v.winrate, trades: v.trades }));
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Find what works. Cut what doesn't.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Chart title="Performance by Setup" data={setupData} />
        <Chart title="Performance by Session" data={sessionData} />
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Winrate" value={`${d.metrics.winrate}%`} />
        <Stat label="Profit Factor" value={d.metrics.profit_factor} />
        <Stat label="Avg Win" value={`$${d.metrics.avg_win}`} color="#00E676" />
        <Stat label="Avg Loss" value={`$${d.metrics.avg_loss}`} color="#FF5252" />
      </div>
    </div>
  );
}

const Chart = ({ title, data }) => (
  <div className="card-elev p-5">
    <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-3">{title}</div>
    {data.length === 0 ? <div className="h-56 flex items-center justify-center text-[#9CA3AF] text-sm">No data</div> : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
          <YAxis stroke="#9CA3AF" fontSize={11} />
          <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12 }} />
          <Bar dataKey="pnl" radius={[8,8,0,0]}>
            {data.map((e,i)=><Cell key={i} fill={e.pnl >= 0 ? "#00E676" : "#FF5252"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
);

const Stat = ({ label, value, color="white" }) => (
  <div className="card-elev p-4">
    <div className="text-xs font-mono uppercase text-[#9CA3AF]">{label}</div>
    <div className="text-2xl font-bold font-mono mt-2" style={{color}}>{value}</div>
  </div>
);
