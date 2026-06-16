import React from "react";
import { FlaskConical, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Backtest() {
  return (
    <div className="p-7">
      <div className="card-elev p-12 text-center relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-[400px] h-[400px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] flex items-center justify-center mb-6 glow-purple"><FlaskConical className="w-8 h-8"/></div>
          <h1 className="text-3xl font-bold">Backtest</h1>
          <p className="text-[#9CA3AF] mt-3 max-w-md mx-auto">Importe ton historique, simule des stratégies et compare leur performance dans des conditions réelles.</p>
          <div className="inline-flex items-center gap-2 mt-6 px-3 py-1.5 rounded-full border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 text-[#B58BFF] text-xs"><Lock className="w-3 h-3"/> En préparation — v2</div>
          <Link to="/app/dashboard" className="block mt-8 text-sm text-[#B58BFF] hover:underline">← Retour au dashboard</Link>
        </div>
      </div>
    </div>
  );
}
