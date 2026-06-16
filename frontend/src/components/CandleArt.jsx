import React from "react";

// Floating glowing 3D candlestick — body + thin wicks above & below
export const Candle = ({ color = "purple", height = 80, className = "", rot = 0, style = {} }) => {
  const cls = `candle-3d candle-${color} ${className}`;
  return (
    <div className={cls} style={{ height, "--rot": `${rot}deg`, ...style }} />
  );
};

// Big tilted PipsEvo dashboard mockup (the hero illustration)
export const DashboardMock = () => (
  <div className="relative w-full max-w-[680px] mx-auto" style={{ perspective: 1800 }}>
    <div
      className="rounded-[20px] border border-white/10 shadow-[0_60px_120px_-30px_rgba(124,77,255,0.6)] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0E1020 0%, #0A0B18 100%)",
        transform: "rotateY(-14deg) rotateX(6deg) rotateZ(-1deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* dashboard interior */}
      <div className="flex">
        {/* sidebar */}
        <div className="w-[148px] border-r border-white/5 p-3 bg-black/30">
          <div className="flex items-center gap-1.5 mb-5 text-[11px] font-bold"><span className="inline-block w-3 h-3"><svg viewBox="0 0 16 16"><path d="M3 2 L5 2 L5 4 L4 4 L4 12 L5 12 L5 14 L3 14 Z M13 2 L11 2 L11 4 L12 4 L12 12 L11 12 L11 14 L13 14 Z" fill="#7C4DFF"/></svg></span>PipsEvo.</div>
          {[
            { l: "Overview", a: true },
            { l: "Accounts" }, { l: "Journal" }, { l: "Analytics" },
            { l: "Discipline" }, { l: "AI Coach" }, { l: "Payouts" },
            { l: "Reports" }, { l: "Settings" },
          ].map((m, i) => (
            <div key={i} className={`text-[10px] py-1.5 px-2 rounded-md mb-0.5 ${m.a ? "bg-[#7C4DFF]/20 text-white border border-[#7C4DFF]/30" : "text-gray-500"}`}>{m.l}</div>
          ))}
        </div>
        {/* main */}
        <div className="flex-1 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold">Overview</div>
            <div className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-400">30 Days ▾</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <MockKPI label="Total Profit" value="+$12,450" sub="+12.4% vs last 30d" color="#00E676" />
            <MockKPI label="Discipline Score" value="94/100" sub="Excellent" color="#fff" />
            <MockKPI label="Active Accounts" value="5" sub="All healthy" color="#fff" />
            <MockKPI label="Drawdown Left" value="$8,240" sub="24.6% remaining" color="#FF5252" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="col-span-2 rounded-md bg-black/40 border border-white/5 p-2">
              <div className="flex justify-between mb-1"><div className="text-[9px] text-gray-300">Equity Curve</div><div className="text-[8px] text-gray-500">30 Days ▾</div></div>
              <svg viewBox="0 0 220 70" className="w-full h-14">
                <defs>
                  <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.5"/><stop offset="100%" stopColor="#7C4DFF" stopOpacity="0"/></linearGradient>
                </defs>
                <path d="M0,60 L20,55 L40,50 L60,52 L80,45 L100,40 L120,35 L140,30 L160,25 L180,20 L200,15 L220,8 L220,70 L0,70 Z" fill="url(#eqfill)"/>
                <path d="M0,60 L20,55 L40,50 L60,52 L80,45 L100,40 L120,35 L140,30 L160,25 L180,20 L200,15 L220,8" stroke="#B58BFF" strokeWidth="1.5" fill="none"/>
              </svg>
              <div className="flex justify-between text-[7px] text-gray-600 mt-0.5">
                <span>May 10</span><span>May 17</span><span>May 24</span><span>May 31</span><span>Jun 7</span>
              </div>
            </div>
            <div className="rounded-md bg-black/40 border border-white/5 p-2">
              <div className="text-[9px] text-gray-300 mb-1">Payout Progress</div>
              <div className="text-[7px] text-gray-500">Topstep Combine</div>
              <div className="text-[11px] font-bold mt-1">$6,240 <span className="text-[7px] text-gray-500">/ $10,000</span></div>
              <div className="h-1 rounded-full bg-white/5 mt-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF]" style={{ width: "62%" }} /></div>
              <div className="text-[8px] text-gray-500 mt-0.5">62%</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md bg-black/40 border border-white/5 p-2">
              <div className="text-[9px] text-gray-300 mb-1.5">Recent Trades</div>
              {[
                { s: "EURUSD", v: "+1.32R", up: true },
                { s: "NAS100", v: "-0.45R", up: false },
                { s: "XAUUSD", v: "+2.11R", up: true },
                { s: "GBPUSD", v: "+1.05R", up: true },
              ].map((t) => (
                <div key={t.s} className="flex justify-between text-[8px] py-0.5"><span className="text-gray-400">{t.s}</span><span style={{ color: t.up ? "#00E676" : "#FF5252" }}>{t.v}</span></div>
              ))}
            </div>
            <div className="rounded-md bg-black/40 border border-white/5 p-2 text-center">
              <div className="text-[9px] text-gray-300 mb-1">Discipline Breakdown</div>
              <Gauge value={94} />
              <div className="text-[7px] text-[#00E676] mt-1">Excellent</div>
            </div>
            <div className="rounded-md bg-gradient-to-br from-[#7C4DFF]/20 to-[#4F8CFF]/10 border border-[#7C4DFF]/20 p-2">
              <div className="text-[9px] text-[#B58BFF] mb-1 flex items-center gap-1"><svg viewBox="0 0 16 16" className="w-2 h-2"><circle cx="8" cy="8" r="6" fill="#7C4DFF"/></svg> AI Coach Insight</div>
              <div className="text-[7.5px] text-gray-300 leading-tight">You overtrade on news days. Focus on high probability setups and manage risk.</div>
              <div className="text-[8px] text-[#B58BFF] mt-1 font-semibold">View Insight →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MockKPI = ({ label, value, sub, color }) => (
  <div className="rounded-md bg-black/40 border border-white/5 p-2">
    <div className="text-[8px] text-gray-500">{label}</div>
    <div className="text-[12px] font-bold mt-0.5" style={{ color }}>{value}</div>
    <div className="text-[7px] text-gray-500 mt-0.5">{sub}</div>
  </div>
);

const Gauge = ({ value }) => {
  const r = 14;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c * 0.75; // 3/4 arc
  return (
    <div className="relative inline-block">
      <svg viewBox="0 0 40 40" width="40" height="32">
        <circle cx="20" cy="20" r={r} stroke="#1E2430" strokeWidth="3" fill="none" strokeDasharray={`${c*0.75} ${c}`} transform="rotate(135 20 20)" strokeLinecap="round" />
        <circle cx="20" cy="20" r={r} stroke="#00E676" strokeWidth="3" fill="none" strokeDasharray={`${c - off} ${c}`} transform="rotate(135 20 20)" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">{value}<span className="text-gray-500 text-[6px]">/100</span></div>
    </div>
  );
};
