import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Star, MoreHorizontal, Edit2, Trash2, Camera, Plus, Filter, ChevronDown } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { trades as tradesAPI, accounts as accAPI } from "@/lib/api"
import { toast } from "sonner"

const miniChartData = [
  { t: 1, v: 1.0784 }, { t: 2, v: 1.0790 }, { t: 3, v: 1.0785 },
  { t: 4, v: 1.0795 }, { t: 5, v: 1.0802 }, { t: 6, v: 1.0808 },
  { t: 7, v: 1.0815 }, { t: 8, v: 1.0812 },
]

const FIRMS = ["Topstep", "Apex", "FTMO", "FundedNext", "The5ers", "Take Profit Trader"]

export function JournalPage() {
  const [tradeList, setTradeList] = useState([])
  const [accounts, setAccounts] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [activeTab, setActiveTab] = useState("Aperçu")
  const [activeFilter, setActiveFilter] = useState("Tous les trades")
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState({
    instrument: "", direction: "long", pnl: "", r: "",
    account_id: "", date: new Date().toISOString().slice(0, 10),
    session: "", setup: "", emotion: "", plan_respected: true,
    entry: "", exit: "", stop_loss: "", take_profit: "", size: "1",
    notes: "", duration: ""
  })

  const load = async () => {
    setLoading(true)
    try {
      const [t, a] = await Promise.all([tradesAPI.list(), accAPI.list()])
      setTradeList(t.data)
      setAccounts(a.data)
      if (t.data.length > 0) setSelectedTrade(t.data[0])
      if (a.data.length > 0) setForm(f => ({ ...f, account_id: a.data[0].id }))
    } catch { toast.error("Erreur de chargement") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createTrade = async (e) => {
    e.preventDefault()
    try {
      await tradesAPI.create({
        ...form,
        pnl: parseFloat(form.pnl),
        r: parseFloat(form.r) || 0,
        entry: parseFloat(form.entry) || 0,
        exit: parseFloat(form.exit) || 0,
        stop_loss: parseFloat(form.stop_loss) || 0,
        take_profit: parseFloat(form.take_profit) || 0,
        size: parseFloat(form.size) || 1,
        tags: form.setup ? [form.setup] : [],
      })
      toast.success("Trade ajouté")
      setOpenForm(false)
      load()
    } catch { toast.error("Erreur") }
  }

  const deleteTrade = async (id) => {
    if (!window.confirm("Supprimer ce trade ?")) return
    try {
      await tradesAPI.delete(id)
      toast.success("Trade supprimé")
      setSelectedTrade(null)
      load()
    } catch { toast.error("Erreur") }
  }

  // Normalize trade fields
  const normalize = (t) => ({
    ...t,
    asset: t.instrument || t.asset || "—",
    direction: t.direction === "long" ? "Achat (Long)" : t.direction === "short" ? "Vente (Short)" : t.direction,
    win: (t.pnl ?? 0) > 0,
    result: t.pnl !== undefined ? `${t.pnl >= 0 ? "+" : ""}$${Math.abs(t.pnl).toFixed(2)}` : "—",
    rLabel: t.r !== undefined ? `${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}R` : "—",
    account: accounts.find(a => a.id === t.account_id)
      ? `${accounts.find(a => a.id === t.account_id).firm} $${(accounts.find(a => a.id === t.account_id).initial_balance / 1000).toFixed(0)}K`
      : "—",
    tags: t.tags || (t.setup ? [t.setup] : []),
    dateLabel: t.date || "—",
  })

  const normalized = tradeList.map(normalize)

  const filtered = activeFilter === "Tous les trades" || activeFilter === "Tous"
    ? normalized
    : activeFilter === "Positions ouvertes"
    ? normalized.filter(t => !t.exit)
    : normalized.filter(t => t.starred)

  // KPIs calculés depuis les vraies données
  const wins = normalized.filter(t => t.win)
  const losses = normalized.filter(t => !t.win)
  const totalPnl = normalized.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate = normalized.length ? Math.round((wins.length / normalized.length) * 100) : 0
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0
  const avgR = normalized.length ? normalized.reduce((s, t) => s + (t.r || 0), 0) / normalized.length : 0

  const kpis = [
    { label: "Trades", value: normalized.length.toString(), sub: "", icon: "📊", color: "#4F8CFF" },
    { label: "Win Rate", value: `${winRate}%`, sub: "", icon: "🎯", color: "#00E676" },
    { label: "Profit net", value: `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}`, sub: "", icon: "📈", color: totalPnl >= 0 ? "#00E676" : "#FF5252" },
    { label: "Gain moyen", value: `+$${avgWin.toFixed(2)}`, sub: "", icon: "⬆️", color: "#00E676" },
    { label: "Perte moyenne", value: `$${avgLoss.toFixed(2)}`, sub: "", icon: "⬇️", color: "#FF5252" },
    { label: "R Multiple moyen", value: avgR.toFixed(2), sub: "", icon: "📐", color: "#7C4DFF" },
  ]

  const detailTabs = ["Aperçu", "Notes", "Statistiques"]

  if (loading) return (
    <div className="flex h-full items-center justify-center text-[#9CA3AF]">Chargement…</div>
  )

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
              onClick={() => setOpenForm(true)}
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
                activeFilter === tab
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
        {normalized.length === 0 ? (
          <div className="rounded-xl border border-[#1E2430] bg-[#0F1117] p-16 text-center">
            <div className="text-[#9CA3AF] text-sm mb-4">Pas encore de trades — ajoute ton premier trade !</div>
            <button
              onClick={() => setOpenForm(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)" }}
            >
              <Plus className="w-4 h-4 inline mr-2" />Ajouter un trade
            </button>
          </div>
        ) : (
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

            {filtered.map((trade, i) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedTrade(tradeList.find(t => t.id === trade.id))}
                className={`grid items-center px-4 py-3 border-b border-[#1E2430]/50 last:border-0 cursor-pointer transition-all text-xs ${
                  selectedTrade?.id === trade.id ? "bg-[#111322]" : "hover:bg-[#111322]/50"
                }`}
                style={{ gridTemplateColumns: "2rem 2fr 1fr 1.5fr 1fr 0.8fr 1fr 1.5fr 1fr 2rem" }}
              >
                <Star className="w-3.5 h-3.5 text-[#1E2430] hover:text-yellow-400 transition-colors" />
                <span className="text-[#9CA3AF] text-[10px]">{trade.dateLabel}</span>
                <span className="text-white font-medium">{trade.asset}</span>
                <span className={trade.win ? "text-[#00E676]" : "text-[#FF5252]"}>{trade.direction}</span>
                <span className={`font-medium ${trade.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>{trade.result}</span>
                <span className={trade.win ? "text-[#00E676]" : "text-[#FF5252]"}>{trade.rLabel}</span>
                <span className="text-[#9CA3AF]">{trade.duration || "—"}</span>
                <span className="text-[#9CA3AF] text-[10px] truncate">{trade.account}</span>
                <div className="flex gap-1 flex-wrap">
                  {trade.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-[#111322] border border-[#1E2430] text-[#9CA3AF] rounded text-[8px] font-medium">{tag}</span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTrade(trade.id) }}
                  className="text-[#6B7280] hover:text-[#FF5252] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}

            <button className="w-full mt-3 py-2 text-[11px] text-[#7C4DFF] font-medium hover:bg-[rgba(124,77,255,0.06)] rounded-lg transition-all flex items-center justify-center gap-1">
              Voir tous les trades →
            </button>
          </div>
        )}
      </div>

      {/* Right: Trade detail panel */}
      {selectedTrade && (() => {
        const t = normalize(selectedTrade)
        return (
          <div className="w-80 border-l border-[#1E2430] bg-[#0A0C14] overflow-y-auto scrollbar-thin flex-shrink-0">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{t.asset}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    t.win ? "bg-[#00E676]/20 text-[#00E676]" : "bg-[#FF5252]/20 text-[#FF5252]"
                  }`}>
                    {t.win ? "Gagnant" : "Perdant"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 text-[#9CA3AF] hover:text-[#FF5252]" onClick={() => deleteTrade(selectedTrade.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 text-[#9CA3AF] hover:text-white"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Direction + values */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E2430]">
                <span className={`text-xs font-medium ${t.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>
                  {t.direction === "Achat (Long)" ? "📈" : "📉"} {t.direction}
                </span>
                <div className="text-right">
                  <div className={`text-sm font-bold ${t.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>{t.rLabel}</div>
                  <div className={`text-sm font-bold ${t.win ? "text-[#00E676]" : "text-[#FF5252]"}`}>{t.result}</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0 mb-4 border-b border-[#1E2430]">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab ? "text-[#7C4DFF] border-b-2 border-[#7C4DFF]" : "text-[#9CA3AF] hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Aperçu" && (
                <div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] mb-4">
                    {[
                      ["Date", t.dateLabel],
                      ["Durée", t.duration || "—"],
                      ["Actif", t.asset],
                      ["Compte", t.account],
                      ["Entrée", selectedTrade.entry || "—"],
                      ["Sortie", selectedTrade.exit || "—"],
                      ["Stop Loss", selectedTrade.stop_loss || "—"],
                      ["Take Profit", selectedTrade.take_profit || "—"],
                      ["R Multiple", t.rLabel],
                      ["Résultat", t.result],
                      ["Session", selectedTrade.session || "—"],
                      ["Setup", selectedTrade.setup || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 border-b border-[#1E2430]/50">
                        <span className="text-[#9CA3AF]">{k}</span>
                        <span className="text-white font-medium">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  {t.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {t.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-[#111322] border border-[#1E2430] text-[#9CA3AF] rounded text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Mini chart */}
                  <div className="mb-4">
                    <p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Mini graphique</p>
                    <div className="bg-[#0F1117] rounded-lg border border-[#1E2430] overflow-hidden">
                      <ResponsiveContainer width="100%" height={70}>
                        <AreaChart data={miniChartData}>
                          <defs>
                            <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={t.win ? "#00E676" : "#FF5252"} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={t.win ? "#00E676" : "#FF5252"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={t.win ? "#00E676" : "#FF5252"} strokeWidth={1.5} fill="url(#miniGrad)" />
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
                </div>
              )}

              {activeTab === "Notes" && (
                <div>
                  <p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Notes</p>
                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed bg-[#0F1117] rounded-lg p-3 border border-[#1E2430]">
                    {selectedTrade.notes || "Pas de notes pour ce trade."}
                  </p>
                  <p className="text-[10px] font-medium text-[#9CA3AF] mt-3 mb-2">Émotion</p>
                  <p className="text-[11px] text-white">{selectedTrade.emotion || "—"}</p>
                  <p className="text-[10px] font-medium text-[#9CA3AF] mt-3 mb-2">Plan respecté</p>
                  <p className={`text-[11px] font-medium ${selectedTrade.plan_respected ? "text-[#00E676]" : "text-[#FF5252]"}`}>
                    {selectedTrade.plan_respected ? "✓ Oui" : "✗ Non"}
                  </p>
                </div>
              )}

              {activeTab === "Statistiques" && (
                <div className="space-y-3 text-[11px]">
                  {[
                    ["Instrument", t.asset],
                    ["Direction", t.direction],
                    ["P&L", t.result],
                    ["R Multiple", t.rLabel],
                    ["Win Rate (compte)", "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-[#1E2430]/50">
                      <span className="text-[#9CA3AF]">{k}</span>
                      <span className="text-white font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal: Nouveau trade */}
      {openForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOpenForm(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={createTrade}
            className="rounded-xl border border-[#1E2430] bg-[#0A0C14] p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-white">Nouveau trade</h2>

            <div className="grid grid-cols-2 gap-3">
              <Fld label="Instrument" value={form.instrument} onChange={(v) => setForm({ ...form, instrument: v })} placeholder="EURUSD" required />
              <div>
                <label className="text-[10px] font-mono uppercase text-[#9CA3AF]">Direction</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#7C4DFF] text-white">
                  <option value="long">Achat (Long)</option>
                  <option value="short">Vente (Short)</option>
                </select>
              </div>
              <Fld label="P&L ($)" type="number" value={form.pnl} onChange={(v) => setForm({ ...form, pnl: v })} placeholder="320" required />
              <Fld label="R Multiple" type="number" value={form.r} onChange={(v) => setForm({ ...form, r: v })} placeholder="1.32" />
              <Fld label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
              <Fld label="Durée" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} placeholder="2h 15m" />
              <Fld label="Entrée" type="number" value={form.entry} onChange={(v) => setForm({ ...form, entry: v })} placeholder="1.07845" />
              <Fld label="Sortie" type="number" value={form.exit} onChange={(v) => setForm({ ...form, exit: v })} placeholder="1.08123" />
              <Fld label="Stop Loss" type="number" value={form.stop_loss} onChange={(v) => setForm({ ...form, stop_loss: v })} placeholder="1.07610" />
              <Fld label="Take Profit" type="number" value={form.take_profit} onChange={(v) => setForm({ ...form, take_profit: v })} placeholder="1.08250" />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#9CA3AF]">Compte</label>
              <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#7C4DFF] text-white">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.firm} — {a.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Fld label="Session" value={form.session} onChange={(v) => setForm({ ...form, session: v })} placeholder="London" />
              <Fld label="Setup" value={form.setup} onChange={(v) => setForm({ ...form, setup: v })} placeholder="FVG, Breakout…" />
              <Fld label="Émotion" value={form.emotion} onChange={(v) => setForm({ ...form, emotion: v })} placeholder="Calme" />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#9CA3AF]">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#7C4DFF] text-white h-20 resize-none"
                placeholder="Décris ton setup, ta gestion…" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="plan" checked={form.plan_respected} onChange={(e) => setForm({ ...form, plan_respected: e.target.checked })} className="rounded" />
              <label htmlFor="plan" className="text-xs text-[#9CA3AF]">Plan respecté</label>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setOpenForm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium border border-[#1E2430] text-[#9CA3AF] hover:border-[#7C4DFF]/50 transition-all">
                Annuler
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)" }}>
                Ajouter le trade
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const Fld = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <div>
    <label className="text-[10px] font-mono uppercase text-[#9CA3AF]">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#7C4DFF] text-white"
    />
  </div>
)
