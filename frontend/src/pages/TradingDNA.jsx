import React, { useEffect, useState } from "react";
import { dna } from "@/lib/api";
import { Dna, Clock, Crosshair, Heart, FileText, RefreshCw } from "lucide-react";

export default function TradingDNA() {
  const [d, setD] = useState(null);
  const [error,setError]=useState("");
  const load=()=>{setError("");setD(null);dna().then(r=>setD(r.data)).catch(e=>setError(e.response?.data?.detail||"Impossible de générer le rapport."))};
  useEffect(() => { load(); }, []);
  if (error) return <div className="pe-page"><div className="pe-card pe-card-pad text-center text-[#FF8A8A]"><p>{error}</p><button onClick={load} className="btn-ghost inline-flex items-center gap-2 mt-4"><RefreshCw className="w-4 h-4"/>Réessayer</button></div></div>;
  if (!d) return <div className="pe-page grid md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-32 pe-card animate-pulse"/>)}</div>;
  if (!d.trades_logged) return <div className="pe-page"><div className="pe-card pe-empty-state py-16"><Dna className="w-9 h-9 mx-auto text-[#B58BFF]"/><h1 className="mt-4 text-xl font-bold">Trading DNA en attente</h1><p className="pe-page-copy mt-2">Ajoute des trades avec une session, un setup et une émotion pour construire ton profil.</p></div></div>;
  return (
    <div className="pe-page pe-page-stack mx-auto max-w-[1500px]">
      <div className="pe-page-header">
        <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#FF4FD8] flex items-center justify-center glow-pink"><FileText className="w-5 h-5"/></div>
        <div><div className="pe-eyebrow">Profil comportemental</div><h1 className="pe-page-title">Rapports & Trading DNA</h1></div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Dna} label="Trader Type" value={d.trader_type} color="#B58BFF" />
        <Card icon={Clock} label="Best Session" value={d.best_session || "—"} color="#4F8CFF" />
        <Card icon={Crosshair} label="Best Setup" value={d.best_setup || "—"} color="#00E676" />
        <Card icon={Heart} label="Best Emotion" value={d.best_emotion || "—"} color="#FF4FD8" />
      </div>
      <div className="pe-card pe-card-pad text-center">
        <div className="text-xs font-mono uppercase text-[#9CA3AF]">Trades analysés</div>
        <div className="text-5xl font-bold font-mono mt-2">{d.trades_logged}</div>
      </div>
    </div>
  );
}
const Card = ({ icon: I, label, value, color }) => (
  <div className="pe-card pe-card-pad">
    <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#9CA3AF]"><I className="w-4 h-4" style={{color}}/> {label}</div>
    <div className="text-2xl font-bold mt-3" style={{color}}>{value}</div>
  </div>
);
