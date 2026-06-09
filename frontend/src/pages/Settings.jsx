import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gradient">Settings</h1>
      <div className="card-elev p-6 space-y-3">
        <Row k="Name" v={user?.name} />
        <Row k="Email" v={user?.email} />
        <Row k="Plan" v={user?.plan || "Free"} />
        <Row k="Trader Type" v={user?.trader_type} />
        <Row k="Prop Firms" v={(user?.prop_firms || []).join(", ") || "—"} />
      </div>
      <div className="card-elev p-6">
        <div className="text-xs font-mono uppercase text-[#9CA3AF] mb-3">Billing</div>
        <p className="text-sm text-[#9CA3AF]">Stripe checkout (Starter €9.99 / Pro €19.99) integration is coming in v2. You're on the free plan with full Pro access during beta.</p>
      </div>
    </div>
  );
}
const Row = ({ k, v }) => (
  <div className="flex justify-between border-b border-white/5 py-2">
    <span className="text-[#9CA3AF] text-sm font-mono uppercase">{k}</span>
    <span className="text-sm">{v || "—"}</span>
  </div>
);
