import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, billing } from "@/lib/api";
import { Crown, Check, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [traderType, setTraderType] = useState(user?.trader_type || "futures");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try { const { data } = await auth.update({ name, trader_type: traderType }); setUser(data); toast.success("Profil mis à jour"); }
    catch (e) { toast.error(e.response?.data?.detail || "Impossible de sauvegarder"); }
    finally { setSaving(false); }
  };

  const upgrade = async () => {
    try {
      const { data } = await billing.checkout("pro");
      if (data.checkout_url) window.location.href = data.checkout_url;
      else toast.info(data.message || "Le paiement sera bientôt disponible");
    } catch { toast.error("Service de paiement indisponible"); }
  };

  return <div className="p-4 sm:p-7 space-y-5">
    <h1 className="text-2xl sm:text-3xl font-bold">Paramètres</h1>
    <div className="grid lg:grid-cols-3 gap-4">
      <form onSubmit={save} className="card-elev p-6 lg:col-span-2 space-y-4">
        <div className="text-sm font-semibold">Profil</div>
        <label className="block text-xs text-[#9CA3AF]">Nom
          <input value={name} onChange={e=>setName(e.target.value)} required maxLength={80} className="mt-1 w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 text-white" />
        </label>
        <label className="block text-xs text-[#9CA3AF]">Email
          <input value={user?.email || ""} disabled className="mt-1 w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 text-[#6B7280]" />
        </label>
        <label className="block text-xs text-[#9CA3AF]">Type de trader
          <select value={traderType} onChange={e=>setTraderType(e.target.value)} className="mt-1 w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 text-white">
            <option value="futures">Futures</option><option value="cfd">CFD</option><option value="both">Futures et CFD</option>
          </select>
        </label>
        <button disabled={saving} className="btn-primary inline-flex items-center gap-2"><Save className="w-4 h-4"/>{saving ? "Sauvegarde…" : "Enregistrer"}</button>
      </form>
      <div className="card-elev p-6 relative overflow-hidden glow-purple">
        <Crown className="absolute -top-6 -right-6 w-32 h-32 text-[#7C4DFF]/30" />
        <div className="text-sm font-semibold">Plan Pro — €19.99/mo</div>
        <div className="text-xs text-[#9CA3AF] mt-1">Accès Pro offert pendant la bêta.</div>
        <div className="mt-4 space-y-2 text-xs">{["Comptes illimités","AI Coach","Trading DNA","Support prioritaire"].map(f=><div key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#00E676]"/>{f}</div>)}</div>
        <button onClick={upgrade} className="btn-primary w-full mt-5">Passer à Pro</button>
      </div>
    </div>
  </div>;
}
