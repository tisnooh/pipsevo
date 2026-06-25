import { useState } from "react"
import { motion } from "framer-motion"
import { Star, MoreHorizontal, Edit2, Trash2, Camera, Plus, Filter, ChevronDown } from "lucide-react"
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts"

const trades = [
  { id: 1, date: "9 juin 2025 14:32", asset: "EURUSD", direction: "Achat (Long)", result: "+$320.00", r: "+1.32R", duration: "2h 15m", account: "Topstep $100K", tags: ["Breakout", "News"], win: true },
  { id: 2, date: "9 juin 2025 12:17", asset: "NAS100", direction: "Vente (Short)", result: "-$110.00", r: "-0.45R", duration: "1h 02m", account: "Apex $50K", tags: ["FVG"], win: false },
  { id: 3, date: "8 juin 2025 16:45", asset: "XAUUSD", direction: "Achat (Long)", result: "+$550.00", r: "+2.11R", duration: "3h 10m", account: "FTMO $100K", tags: ["Trend", "TP1"], win: true },
  { id: 4, date: "8 juin 2025 09:21", asset: "GBPUSD", direction: "Achat (Long)", result: "+$280.00", r: "+1.05R", duration: "1h 45m", account: "FundedNext $25K", tags: ["London"], win: true },
  { id: 5, date: "7 juin 2025 11:03", asset: "US30", direction: "Vente (Short)", result: "-$210.00", r: "-0.78R", duration: "2h 05m", account: "Topstep $100K", tags: ["Reversal"], win: false },
  { id: 6, date: "7 juin 2025 10:11", asset: "EURUSD", direction: "Achat (Long)", result: "+$150.00", r: "+0.65R", duration: "54m", account: "Topstep $100K", tags: [], win: true },
  { id: 7, date: "6 juin 2025 15:32", asset: "NAS100", direction: "Achat (Long)", result: "+$430.00", r: "+1.80R", duration: "2h 30m", account: "Apex $50K", tags: ["Breakout", "News"], win: true },
  { id: 8, date: "6 juin 2025 09:47", asset: "BTCUSD", direction: "Vente (Short)", result: "-$360.00", r: "-1.20R", duration: "4h 12m", account: "FTMO $100K", tags: ["Volatility"], win: false },
  { id: 9, date: "5 juin 2025 14:05", asset: "XAUUSD", direction: "Achat (Long)", result: "+$620.00", r: "+2.35R", duration: "3h 05m", account: "FundedNext $25K", tags: ["Trend", "TP2"], win: true },
  { id: 10, date: "5 juin 2025 11:22", asset: "GBPJPY", direction: "Vente (Short)", result: "-$180.00", r: "-0.62R", duration: "1h 20m", account: "Topstep $100K", tags: [], win: false },
]

const miniChartData = [
  { t: 1, v: 1.0784 },
  { t: 2, v: 1.0790 },
  { t: 3, v: 1.0785 },
  { t: 4, v: 1.0795 },
  { t: 5, v: 1.0802 },
  { t: 6, v: 1.0808 },
  { t: 7, v: 1.0815 },
  { t: 8, v: 1.0812 },
]

const kpis = [
  { label: "Trades", value: "328", sub: "+18 vs période précédente", icon: "📊", color: "#4F8CFF" },
  { label: "Win Rate", value: "62%", sub: "+8%", icon: "🎯", color: "#00E676" },
  { label: "Profit net", value: "+$12,450", sub: "+12.4%", icon: "📈", color: "#00E676" },
  { label: "Gain moyen", value: "+$210.50", sub: "", icon: "⬆️", color: "#00E676" },
  { label: "Perte moyenne", value: "-$118.30", sub: "", icon: "⬇️", color: "#FF5252" },
  { label: "R Multiple moyen", value: "1.78", sub: "", icon: "📐", color: "#7C4DFF" },
]

export function JournalPage() {
  const [selectedTrade, setSelectedTrade] = useState(trades[0])
  const [activeTab, setActiveTab] = useState("Aperçu")
  const [activeFilter, setActiveFilter] = useState("Tous")

  const detailTabs = ["Aperçu", "Graphique", "Notes", "Capture d'écran", "Statistiques"]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: trades list */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-white">Journal</h1>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg border border-[#1E2430] bg-[#0F1117] text-xs text-[#9CA3AF] flex items-center gap-2 cursor-pointer hover:border-[#7C4DFF]/50">
              <span>Tous les comptes</span><ChevronDown className="w-3 h-3" />
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-[#1E2430] bg-[#0F1117] text-xs text-[#9CA3AF] flex items-center gap-2 cursor-pointer hover:border-[#7C4DFF]/50">
              <span>30 derniers jours</span><ChevronDown className="w-3 h-3" />
            </div>
            <button className="px-3 py-1.5 rounded-lg border border-[#1E2430] bg-[#0F1117] text-xs text-[#9CA3AF] flex items-center gap-1.5 hover:border-[#7C4DFF]/50">
              <Filter className="w-3 h-3" /> Filtres
            </button>
            <button
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)" }}
            >
              <Plus className="w-3 h-3" /> Nouveau trade
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 border-b border-[#1E2430]">
          {["Tous les trades", "Positions ouvertes", "✩ Favoris"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === tab || (tab === "Tous les trades" && activeFilter === "Tous")
                  ? "text-[#7C4DFF] border-b-2 border-[#7C4DFF]"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-6 gap-3 mb-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl border border-[#1E2430] bg-[#0F1117]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#9CA3AF]">{kpi.label}</span>
                <span className="text-xs">{kpi.icon}</span>
              </div>
              <div className="text-base font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              {kpi.sub && <p className="text-[9px] text-[#9CA3AF] mt-0.5">{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#1E2430] bg-[#0F1117] overflow-hidden">
          {/* Header */}
          <div
            className="grid text-[11px] text-[#9CA3AF] px-4 py-3 border-b border-[#1E2430] bg-[#0A0C14]"
            style={{ gridTemplateColumns: "2rem 2fr 1fr 1.5fr 1fr 0.8fr 1fr 1.5fr 1fr 2rem" }}
          >
            <span></span>
            <span>Date</span>
            <span>Actif</span>
            <span>Direction</span>
            <span>Résultat</span>
            <span>R Multiple</span>
            <span>Durée</span>
            <span>Compte</span>
            <span>Tags</span>
            <span></span>
          </div>

          {trades.map((trade, i) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedTrade(trade)}
              className={`grid items-center px-4 py-3 border-b border-[#1E2430]/50 last:border-0 cursor-pointer transition-all text-xs ${
                selectedTrade.id === trade.id ? "bg-[#111322]" : "hover:bg-[#111322]/50"
              }`}
              style={{ gridTemplateColumns: "2rem 2fr 1fr 1.5fr 1fr 0.8fr 1fr 1.5fr 1fr 2rem" }}
            >
              <Star className="w-3.5 h-3.5 text-[#1E2430] hover:text-yellow-400 transition-colors" />
              <span className="text-[#9CA3AF] text-[10px]">{trade.date}</span>
              <span className="text-white font-medium">{trade.asset}</span>
              <span className={trade.win ? "text-[#00E676]" : "text-[#FF5252]"}>{trade.direction}</span>
              <span className={`font-medium ${trade.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>{trade.result}</span>
              <span className={trade.win ? "text-[#00E676]" : "text-[#FF5252]"}>{trade.r}</span>
              <span className="text-[#9CA3AF]">{trade.duration}</span>
              <span className="text-[#9CA3AF] text-[10px] truncate">{trade.account}</span>
              <div className="flex gap-1 flex-wrap">
                {trade.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-[#1E2430] text-[#9CA3AF] rounded text-[9px]">{tag}</span>
                ))}
              </div>
              <button className="text-[#9CA3AF] hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        <button className="w-full mt-4 text-sm text-[#7C4DFF] hover:underline flex items-center justify-center gap-1 py-2">
          Voir plus de trades ↓
        </button>
      </div>

      {/* Right: trade detail panel */}
      <div className="w-[320px] flex-shrink-0 border-l border-[#1E2430] bg-[#0A0C14] overflow-y-auto scrollbar-thin">
        {selectedTrade && (
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{selectedTrade.asset}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    selectedTrade.win ? "bg-[#00E676]/20 text-[#00E676]" : "bg-[#FF5252]/20 text-[#FF5252]"
                  }`}
                >
                  {selectedTrade.win ? "Gagnant" : "Perdant"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 text-[#9CA3AF] hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                <button className="p-1 text-[#9CA3AF] hover:text-[#FF5252]"><Trash2 className="w-3.5 h-3.5" /></button>
                <button className="p-1 text-[#9CA3AF] hover:text-white"><MoreHorizontal className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Direction + values */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E2430]">
              <span className={`text-xs font-medium flex items-center gap-1 ${selectedTrade.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>
                📈 {selectedTrade.direction}
              </span>
              <div className="text-right">
                <div className={`text-sm font-bold ${selectedTrade.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>{selectedTrade.r}</div>
                <div className={`text-sm font-bold ${selectedTrade.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>{selectedTrade.result}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 mb-4 border-b border-[#1E2430] overflow-x-auto scrollbar-thin">
              {detailTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab ? "text-[#7C4DFF] border-b-2 border-[#7C4DFF]" : "text-[#9CA3AF] hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "Aperçu" && (
              <div>
                {/* Trade details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] mb-4">
                  {[
                    ["Date d'entrée", "9 juin 2025 - 12:17"],
                    ["Date de sortie", "9 juin 2025 - 14:32"],
                    ["Durée", selectedTrade.duration],
                    ["Actif", selectedTrade.asset],
                    ["Compte", "Topstep $100K"],
                    ["Taille", "1.00 lot"],
                    ["Entrée", "1.07845"],
                    ["Sortie", "1.08123"],
                    ["Stop Loss", "1.07610"],
                    ["Take Profit", "1.08250"],
                    ["R Multiple", selectedTrade.r],
                    ["Résultat", selectedTrade.result],
                    ["Commission", "-$4.20"],
                    ["Swap", "$0.00"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5 border-b border-[#1E2430]/50">
                      <span className="text-[#9CA3AF]">{k}</span>
                      <span className={`text-white font-medium ${v.includes("+") && !v.includes("$0") ? "text-[#00E676]" : v.includes("-") && !v.includes("$0") ? "text-[#FF5252]" : ""}`}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {selectedTrade.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-[#111322] border border-[#1E2430] text-[#9CA3AF] rounded text-[10px]">{tag}</span>
                  ))}
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Notes</p>
                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed bg-[#0F1117] rounded-lg p-3 border border-[#1E2430]">
                    Setup breakout sur résistance H1. Confluence avec order block + FVG. Gestion propre, sortie partielle à TP1. Bonne patience.
                  </p>
                </div>

                {/* Mini chart */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-[#9CA3AF]">Mini graphique</p>
                    <a href="#" className="text-[9px] text-[#7C4DFF] hover:underline">Voir sur TradingView →</a>
                  </div>
                  <div className="bg-[#0F1117] rounded-lg border border-[#1E2430] overflow-hidden">
                    <ResponsiveContainer width="100%" height={70}>
                      <AreaChart data={miniChartData}>
                        <defs>
                          <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00E676" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#00E676" strokeWidth={1.5} fill="url(#miniGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Screenshots */}
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Captures d'écran</p>
                  <div className="grid grid-cols-4 gap-1">
                    {["Before Entry", "During Trade", "After Exit"].map((label) => (
                      <div key={label} className="aspect-square bg-[#0F1117] rounded-lg border border-[#1E2430] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:border-[#7C4DFF]/50 transition-all">
                        <Camera className="w-3 h-3 text-[#9CA3AF]" />
                        <span className="text-[7px] text-[#9CA3AF] mt-0.5">{label}</span>
                      </div>
                    ))}
                    <div className="aspect-square bg-[#0F1117] rounded-lg border border-dashed border-[#1E2430] flex items-center justify-center cursor-pointer hover:border-[#7C4DFF]/50 transition-all">
                      <Plus className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg text-xs font-medium text-white border border-[#1E2430] hover:border-[#7C4DFF]/50 flex items-center justify-center gap-1 transition-all">
                    <Edit2 className="w-3 h-3" /> Modifier le trade
                  </button>
                  <button className="p-2 rounded-lg border border-[#FF5252]/30 text-[#FF5252] hover:bg-[#FF5252]/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
