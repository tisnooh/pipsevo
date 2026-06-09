import React, { useEffect, useState } from "react";
import { dna } from "@/lib/api";
import { Dna, Clock, Crosshair, Heart } from "lucide-react";

export default function TradingDNA() {
  const [d, setD] = useState(null);
  useEffect(() => { dna().then(r => setD(r.data)); }, []);
  if (!d) return <div className="p-10 text-[#9CA3AF]">Loading DNA…</div>;
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-2"><Dna className="w-7 h-7 text-[#7C4DFF]"/> Trading DNA</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Who you actually are as a trader.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card icon={Dna} label="Trader Type" value={d.trader_type} color="#7C4DFF" />
        <Card icon={Clock} label="Best Session" value={d.best_session || "—"} color="#4F8CFF" />
        <Card icon={Crosshair} label="Best Setup" value={d.best_setup || "—"} color="#00E676" />
        <Card icon={Heart} label="Best Emotion" value={d.best_emotion || "—"} color="#FF5252" />
      </div>
      <div className="card-elev p-6 text-center">
        <div className="text-xs font-mono uppercase text-[#9CA3AF]">Trades analyzed</div>
        <div className="text-4xl font-bold font-mono mt-2">{d.trades_logged}</div>
      </div>
    </div>
  );
}

const Card = ({ icon: I, label, value, color }) => (
  <div className="card-elev p-6">
    <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#9CA3AF]"><I className="w-4 h-4" style={{color}}/> {label}</div>
    <div className="text-3xl font-bold mt-3" style={{color}}>{value}</div>
  </div>
);
