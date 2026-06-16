import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="p-7 space-y-5">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-elev p-6 lg:col-span-2 space-y-2">
          <div className="text-sm font-semibold mb-3">Profil</div>
          <Row k="Nom" v={user?.name} />
          <Row k="Email" v={user?.email} />
          <Row k="Plan" v={user?.plan || "Free (Beta Pro accès)"} />
          <Row k="Type de trader" v={user?.trader_type} />
          <Row k="Prop firms" v={(user?.prop_firms || []).join(", ") || "—"} />
        </div>
        <div className="card-elev p-6 relative overflow-hidden glow-purple">
          <Crown className="absolute -top-6 -right-6 w-32 h-32 text-[#7C4DFF]/30" />
          <div className="text-sm font-semibold">Plan Pro — €19.99/mo</div>
          <div className="text-xs text-[#9CA3AF] mt-1">Stripe checkout en v2. Tu as accès Pro pendant la beta.</div>
          <div className="mt-4 space-y-2 text-xs">
            {["Comptes illimités","AI Coach Claude Sonnet 4.5","Trading DNA & Survival Score","Support prioritaire"].map(f => (
              <div key={f} className="flex items-center gap-2 text-[#B5BBC9]"><Check className="w-3.5 h-3.5 text-[#00E676]"/>{f}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
const Row = ({ k, v }) => (
  <div className="flex justify-between border-b border-white/5 py-2.5">
    <span className="text-[#9CA3AF] text-xs font-mono uppercase">{k}</span>
    <span className="text-sm">{v || "—"}</span>
  </div>
);
