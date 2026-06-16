import React, { useEffect, useState } from "react";
import { dna } from "@/lib/api";
import { Dna, Clock, Crosshair, Heart, FileText } from "lucide-react";

export default function TradingDNA() {
  const [d, setD] = useState(null);
  useEffect(() => { dna().then(r => setD(r.data)).catch(()=>{}); }, []);
  if (!d) return <div className="p-10 text-[#9CA3AF]">Chargement…</div>;
  return (
    <div className="p-7 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#FF4FD8] flex items-center justify-center glow-pink"><FileText className="w-5 h-5"/></div>
        <h1 className="text-3xl font-bold">Rapports & Trading DNA</h1>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Dna} label="Trader Type" value={d.trader_type} color="#B58BFF" />
        <Card icon={Clock} label="Best Session" value={d.best_session || "—"} color="#4F8CFF" />
        <Card icon={Crosshair} label="Best Setup" value={d.best_setup || "—"} color="#00E676" />
        <Card icon={Heart} label="Best Emotion" value={d.best_emotion || "—"} color="#FF4FD8" />
      </div>
      <div className="card-elev p-8 text-center">
        <div className="text-xs font-mono uppercase text-[#9CA3AF]">Trades analysés</div>
        <div className="text-5xl font-bold font-mono mt-2">{d.trades_logged}</div>
      </div>
    </div>
  );
}
const Card = ({ icon: I, label, value, color }) => (
  <div className="card-elev p-6">
    <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#9CA3AF]"><I className="w-4 h-4" style={{color}}/> {label}</div>
    <div className="text-2xl font-bold mt-3" style={{color}}>{value}</div>
  </div>
);
