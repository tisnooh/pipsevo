import React, { useId } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = { green: "#46C99A", purple: "#B58BFF", blue: "#4F8CFF", red: "#F26A70" };

const sparkData = (seed, down) => {
  const points = [];
  let value = 12;
  for (let index = 0; index < 24; index += 1) {
    value += (Math.sin(seed * 1.7 + index * 0.7) + 0.55 + (down ? -0.5 : 0.35)) * 1.3;
    points.push({ x: index, y: Math.max(1, value) });
  }
  return points;
};

export function DashboardKpiCard({ label, value, sub, sparkColor = "green", icon: Icon, testid, preview = false, flat = false }) {
  const gradientId = `kpi-${sparkColor}-${useId().replace(/:/g, "")}`;
  const color = colors[sparkColor];
  const Wrapper = preview ? "div" : motion.div;
  const motionProps = preview ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, whileHover: { y: -3 }, transition: { duration: 0.25 } };
  return <Wrapper {...motionProps} className={`card-elev relative overflow-hidden group hover:border-white/15 ${preview ? "h-[116px] p-3" : "h-[160px] p-4 sm:h-[180px] sm:p-5"}`} data-testid={testid}>
    <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-10 blur-3xl transition group-hover:opacity-20" style={{ background: color }} />
    <div className="flex items-center justify-between"><div className={preview ? "text-[11px] text-[#9CA3AF]" : "text-xs text-[#9CA3AF] sm:text-sm"}>{label}</div>{Icon && <Icon className={preview ? "h-3.5 w-3.5" : "h-4 w-4"} style={{ color }} />}</div>
    <div className={`${preview ? "mt-2 text-[23px]" : "mt-3 text-[26px] sm:text-[34px]"} font-numeric font-bold leading-none`} style={{ color: sparkColor === "red" || sparkColor === "green" ? color : "white" }}>{value}</div>
    {sub && <div className={`${preview ? "mt-1.5 text-[9px]" : "mt-2 text-xs"} flex items-center gap-1`} style={{ color }}><span aria-hidden="true">◆</span><span>{sub}</span></div>}
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 ${preview ? "h-[38px]" : "h-[58px]"}`}>{preview ? <svg viewBox="0 0 220 38" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.5"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d="M0 32 C32 34 40 25 70 26 S108 20 137 21 S181 11 220 8 L220 38 L0 38Z" fill={`url(#${gradientId})`}/><path d="M0 32 C32 34 40 25 70 26 S108 20 137 21 S181 11 220 8" fill="none" stroke={color} strokeWidth="2"/></svg> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={flat ? Array.from({ length: 24 }, (_, x) => ({ x, y: 8 })) : sparkData(label.length, sparkColor === "red")} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={flat ? "0.12" : "0.55"} /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><Area type="monotone" dataKey="y" stroke={flat ? "#343A47" : color} strokeWidth={2} fill={`url(#${gradientId})`} /></AreaChart></ResponsiveContainer>}</div>
  </Wrapper>;
}

export function DashboardEquityCard({ data, money = (value) => `${value}`, preview = false, period = "30", onPeriodChange }) {
  const gradientId = `equity-${useId().replace(/:/g, "")}`;
  return <div className={`card-elev ${preview ? "p-4" : "p-5"}`}>
    <div className="flex items-center justify-between"><div className={preview ? "text-[12px] font-semibold" : "text-sm font-semibold"}>Courbe d’équité</div>{preview ? <span className="rounded-lg border border-white/5 bg-[#0D1020] px-2.5 py-1 text-[10px] text-[#9CA3AF]">30 jours</span> : <select value={period} onChange={onPeriodChange} className="rounded-lg border border-white/5 bg-[#0D1020] px-2.5 py-1 text-xs text-[#9CA3AF]"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select>}</div>
    <div className={preview ? "mt-3 h-[185px]" : "mt-4 h-64"}>{preview ? <svg viewBox="0 0 700 185" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.55"/><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0"/></linearGradient></defs>{[35,75,115,155].map(y=><line key={y} x1="48" y1={y} x2="690" y2={y} stroke="rgba(255,255,255,.045)"/>)}<path d="M48 154 C95 145 118 112 166 120 S232 103 278 109 S348 76 397 84 S471 51 518 59 S604 32 690 20 L690 170 L48 170Z" fill={`url(#${gradientId})`}/><path d="M48 154 C95 145 118 112 166 120 S232 103 278 109 S348 76 397 84 S471 51 518 59 S604 32 690 20" fill="none" stroke="#B58BFF" strokeWidth="3"/><g fill="#6B7280" fontSize="10"><text x="4" y="158">250 k$</text><text x="4" y="117">255 k$</text><text x="4" y="77">260 k$</text><text x="4" y="38">265 k$</text><text x="48" y="183">7 mai</text><text x="250" y="183">17 mai</text><text x="460" y="183">28 mai</text><text x="650" y="183">4 juin</text></g></svg> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.55" /><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0" /></linearGradient></defs><XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => money(value, { maximumFractionDigits: 0 })} /><Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2430", borderRadius: 12, fontSize: 12 }} /><Area type="monotone" dataKey="equity" stroke="#B58BFF" strokeWidth={2.4} fill={`url(#${gradientId})`} /></AreaChart></ResponsiveContainer>}</div>
  </div>;
}
