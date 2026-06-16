import React, { useEffect, useState } from "react";
import { coach } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Send, Brain, AlertTriangle, Target, Clock, Shield, Trophy } from "lucide-react";

const PRESETS = [
  "Analyse mon mois",
  "Trouve mes erreurs",
  "Pourquoi je perds ?",
  "Quel est mon meilleur setup ?",
  "Comment améliorer ma discipline ?",
  "Quel est mon coût d'overtrading ?",
];

const INSIGHTS = [
  { I: AlertTriangle, t: "Biggest mistake", d: "Overtrading sur news days", c: "#FF5252" },
  { I: Trophy, t: "Best setup", d: "London FVG — 71% WR", c: "#00E676" },
  { I: Clock, t: "Worst session", d: "Asia — -0.3R en moyenne", c: "#FF5252" },
  { I: Shield, t: "Discipline warning", d: "3 violations cette semaine", c: "#FFB855" },
  { I: Target, t: "Payout recommendation", d: "Cap trades à 3/jour", c: "#B58BFF" },
];

export default function AICoach() {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { coach.history().then(r => setHistory(r.data)).catch(()=>{}); }, []);

  const ask = async (text) => {
    const question = text || q;
    if (!question.trim()) return;
    setLoading(true);
    try {
      const { data } = await coach.ask(question);
      setHistory(h => [data, ...h]);
      setQ(""); toast.success("Analyse prête");
    } catch (e) { toast.error(e.response?.data?.detail || "Coach indisponible"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-7 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] flex items-center justify-center glow-purple"><Brain className="w-5 h-5"/></div>
        <div>
          <h1 className="text-3xl font-bold">Analyse IA</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Discute avec Atlas — Claude Sonnet 4.5, analyse comportementale uniquement.</p>
        </div>
      </div>

      <div className="card-elev p-6 glow-purple">
        <div className="flex gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Pose ta question à Atlas…" data-testid="coach-input" className="flex-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#7C4DFF]" onKeyDown={(e)=>e.key==="Enter"&&ask()} />
          <button onClick={()=>ask()} disabled={loading} className="btn-primary inline-flex items-center gap-2 text-sm" data-testid="coach-ask"><Send className="w-4 h-4"/>{loading?"…":"Envoyer"}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map(p => <button key={p} onClick={()=>ask(p)} disabled={loading} data-testid={`coach-preset-${p.slice(0,8)}`} className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-[#7C4DFF]/40 text-[#B5BBC9] hover:text-white transition">{p}</button>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        {INSIGHTS.map(i => (
          <div key={i.t} className="card-flat p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${i.c}22` }}><i.I className="w-4 h-4" style={{ color: i.c }}/></div>
            <div className="text-xs font-semibold">{i.t}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">{i.d}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {history.length === 0 && !loading && (
          <div className="card-elev p-12 text-center">
            <Sparkles className="w-8 h-8 mx-auto text-[#B58BFF] mb-3"/>
            <div className="text-sm text-[#9CA3AF]">Pose une question pour démarrer ton analyse comportementale.</div>
          </div>
        )}
        {history.map(r => (
          <div key={r.id} className="card-elev p-6" data-testid={`coach-report-${r.id}`}>
            <div className="text-[10px] font-mono uppercase text-[#B58BFF] mb-2">{r.tag} · {new Date(r.created_at).toLocaleString()}</div>
            <div className="font-semibold mb-3">{r.question}</div>
            <div className="text-sm text-[#B5BBC9] whitespace-pre-wrap leading-relaxed">{r.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
