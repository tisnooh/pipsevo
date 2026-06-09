import React, { useEffect, useState } from "react";
import { coach } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Send } from "lucide-react";

const PRESETS = [
  "Analyze my month",
  "Find my mistakes",
  "What's my best setup",
  "Why am I losing",
  "How can I improve discipline",
];

export default function AICoach() {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { coach.history().then(r => setHistory(r.data)); }, []);

  const ask = async (text) => {
    const question = text || q;
    if (!question.trim()) return;
    setLoading(true);
    try {
      const { data } = await coach.ask(question);
      setHistory(h => [data, ...h]);
      setQ("");
      toast.success("Coach analysis ready");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Coach error");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-2"><Sparkles className="w-7 h-7 text-[#7C4DFF]"/> AI Coach</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Powered by Claude Sonnet 4.5 — behavior analysis, never signals.</p>
      </div>

      <div className="card-elev p-5 glow-purple">
        <div className="flex gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Ask your coach…" data-testid="coach-input" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#7C4DFF]" />
          <button onClick={()=>ask()} disabled={loading} className="btn-primary inline-flex items-center gap-2" data-testid="coach-ask"><Send className="w-4 h-4"/>{loading?"Thinking…":"Ask"}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map(p => <button key={p} onClick={()=>ask(p)} disabled={loading} data-testid={`coach-preset-${p.slice(0,8)}`} className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-[#7C4DFF]/40 text-[#9CA3AF] hover:text-white">{p}</button>)}
        </div>
      </div>

      <div className="space-y-4">
        {history.length === 0 && !loading && <div className="card-elev p-12 text-center text-[#9CA3AF]">Ask anything about your trading behavior.</div>}
        {history.map(r => (
          <div key={r.id} className="card-elev p-6" data-testid={`coach-report-${r.id}`}>
            <div className="text-xs font-mono uppercase text-[#7C4DFF] mb-2">{r.tag} · {new Date(r.created_at).toLocaleString()}</div>
            <div className="font-semibold mb-3">{r.question}</div>
            <div className="text-sm text-[#9CA3AF] whitespace-pre-wrap leading-relaxed">{r.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
