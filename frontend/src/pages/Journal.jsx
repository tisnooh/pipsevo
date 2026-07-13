import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Star, Edit2, Trash2, Camera, Check, Plus } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { trades as tradesAPI, accounts as accAPI } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { normalizeTradingRules } from "@/components/TradingRulesEditor"
import TradeFormModal from "@/components/TradeFormModal"
import { createEmptyTradeForm, hydrateTradeForm } from "@/lib/tradeFormModel"

const miniChartData = [
  { t: 1, v: 1.0784 }, { t: 2, v: 1.0790 }, { t: 3, v: 1.0785 },
  { t: 4, v: 1.0795 }, { t: 5, v: 1.0802 }, { t: 6, v: 1.0808 },
  { t: 7, v: 1.0815 }, { t: 8, v: 1.0812 },
]

export function JournalPage() {
  const { user } = useAuth()
  const [tradeList, setTradeList] = useState([])
  const [accounts, setAccounts] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [activeTab, setActiveTab] = useState("Aperçu")
  const [activeFilter, setActiveFilter] = useState("Tous les trades")
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)
  const [saving, setSaving] = useState(false)
  const [checklistChecks, setChecklistChecks] = useState({})
  const [accountFilter, setAccountFilter] = useState("")
  const [days, setDays] = useState("30")
  const [form, setForm] = useState(()=>createEmptyTradeForm(null))
  const userRules = normalizeTradingRules(user?.rules)
  const activeChecklist = userRules.pre_trade_checklist.filter(item=>item.enabled !== false)

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

  const saveTrade = async (payload) => {
    setSaving(true)
    try {
      if (editingTrade) await tradesAPI.update(editingTrade.id, payload); else await tradesAPI.create(payload)
      localStorage.setItem("pipsevo_last_trade_choices",JSON.stringify({account_id:payload.account_id,session:payload.session,setups:payload.setups,emotion:payload.emotion,emotion_intensity:payload.emotion_intensity,duration:payload.duration,market_type:payload.market_type}))
      toast.success(editingTrade ? "Trade mis à jour" : "Trade ajouté")
      setOpenForm(false)
      setEditingTrade(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || "Impossible d’enregistrer le trade") }
    finally { setSaving(false) }
  }

  const openNewTrade = () => {
    if (!accounts.length) { toast.error("Ajoute d’abord un compte de trading"); return }
    setEditingTrade(null)
    setChecklistChecks({})
    let last={};try{last=JSON.parse(localStorage.getItem("pipsevo_last_trade_choices"))||{}}catch{}
    const account=accounts.find(item=>item.id===last.account_id&&(item.status||"active")==="active") || accounts.find(item=>(item.status||"active")==="active") || accounts[0]
    setForm(createEmptyTradeForm(account,last))
    setOpenForm(true)
  }

  const openEditTrade = (trade) => {
    setEditingTrade(trade)
    setChecklistChecks(Object.fromEntries((trade.checklist_results || []).map(item=>[item.id,Boolean(item.checked)])))
    const account=accounts.find(item=>item.id===trade.account_id) || accounts[0]
    setForm(hydrateTradeForm(trade,account))
    setOpenForm(true)
  }

  const toggleFavorite = async (trade, e) => {
    e?.stopPropagation()
    try { const { data } = await tradesAPI.update(trade.id, { starred: !trade.starred }); setTradeList(list=>list.map(t=>t.id===trade.id?data:t)); if (selectedTrade?.id===trade.id) setSelectedTrade(data) }
    catch { toast.error("Impossible de modifier le favori") }
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
    toneClass: typeof t.pnl !== "number" || t.pnl === 0 ? "text-[#9CA3AF]" : t.pnl > 0 ? "text-[#00E676]" : "text-[#FF5252]",
    chartColor: typeof t.pnl !== "number" || t.pnl === 0 ? "#7C4DFF" : t.pnl > 0 ? "#00E676" : "#FF5252",
    statusLabel: ({winner:"Gagnant",loser:"Perdant",breakeven:"Break-even",partial:"Partiellement clôturé",open:"Position ouverte",cancelled:"Annulé"})[t.result_status] || (t.pnl > 0 ? "Gagnant" : t.pnl < 0 ? "Perdant" : "Break-even"),
    result: typeof t.pnl === "number" ? `${t.pnl >= 0 ? "+" : ""}$${Math.abs(t.pnl).toFixed(2)}` : t.result_status === "open" ? "Ouverte" : "—",
    rLabel: typeof t.r === "number" ? `${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}R` : "—",
    account: accounts.find(a => a.id === t.account_id)
      ? `${accounts.find(a => a.id === t.account_id).firm} $${(accounts.find(a => a.id === t.account_id).initial_balance / 1000).toFixed(0)}K`
      : "—",
    tags: t.tags || (t.setup ? [t.setup] : []),
    dateLabel: t.date || "—",
  })

  const normalized = tradeList.map(normalize)

  const byAccountAndDate = normalized.filter(t => {
    const recentEnough = !t.date || (Date.now() - new Date(t.date).getTime()) <= Number(days) * 86400000
    return (!accountFilter || t.account_id === accountFilter) && recentEnough
  })
  const filtered = activeFilter === "Tous les trades" || activeFilter === "Tous"
    ? byAccountAndDate
    : activeFilter === "Positions ouvertes"
    ? byAccountAndDate.filter(t => t.result_status === "open" || t.exit_price === null || t.exit_price === undefined)
    : byAccountAndDate.filter(t => t.starred)

  // KPIs calculés depuis les vraies données
  const wins = filtered.filter(t => typeof t.pnl === "number" && t.pnl > 0)
  const losses = filtered.filter(t => typeof t.pnl === "number" && t.pnl < 0)
  const totalPnl = filtered.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate = filtered.length ? Math.round((wins.length / filtered.length) * 100) : 0
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0
  const avgR = filtered.length ? filtered.reduce((s, t) => s + (t.r || 0), 0) / filtered.length : 0

  const kpis = [
    { label: "Trades", value: filtered.length.toString(), sub: "", icon: "📊", color: "#4F8CFF" },
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
    <div className="flex flex-col lg:flex-row h-full lg:overflow-hidden">
      {/* Left: trades list */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-white">Journal</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-[#1E2430] bg-[#0F1117] text-xs text-[#9CA3AF]"><option value="">Tous les comptes</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select value={days} onChange={e=>setDays(e.target.value)} className="px-3 py-1.5 rounded-lg border border-[#1E2430] bg-[#0F1117] text-xs text-[#9CA3AF]"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option><option value="3650">Toute la période</option></select>
            <button
              onClick={openNewTrade}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-5">
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
          <div className="rounded-xl border border-[#1E2430] bg-[#0F1117] p-8 sm:p-16 text-center">
            <div className="text-[#9CA3AF] text-sm mb-4">Pas encore de trades — ajoute ton premier trade !</div>
            <button
              onClick={openNewTrade}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #7C4DFF, #4F8CFF)" }}
            >
              <Plus className="w-4 h-4 inline mr-2" />Ajouter un trade
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#1E2430] bg-[#0F1117] overflow-x-auto">
            {/* Header */}
            <div
              className="grid text-[11px] text-[#9CA3AF] px-4 py-3 border-b border-[#1E2430] bg-[#0A0C14] min-w-[780px]"
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
                className={`grid items-center px-4 py-3 border-b border-[#1E2430]/50 last:border-0 cursor-pointer transition-all text-xs min-w-[780px] ${
                  selectedTrade?.id === trade.id ? "bg-[#111322]" : "hover:bg-[#111322]/50"
                }`}
                style={{ gridTemplateColumns: "2rem 2fr 1fr 1.5fr 1fr 0.8fr 1fr 1.5fr 1fr 2rem" }}
              >
                <button aria-label={trade.starred?"Retirer des favoris":"Ajouter aux favoris"} onClick={(e)=>toggleFavorite(trade,e)}><Star className={`w-3.5 h-3.5 transition-colors ${trade.starred ? "text-yellow-400 fill-yellow-400" : "text-[#374151] hover:text-yellow-400"}`}/></button>
                <span className="text-[#9CA3AF] text-[10px]">{trade.dateLabel}</span>
                <span className="text-white font-medium">{trade.asset}</span>
                <span className={trade.toneClass}>{trade.direction}</span>
                <span className={`font-medium ${trade.toneClass}`}>{trade.result}</span>
                <span className={trade.toneClass}>{trade.rLabel}</span>
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

            <button onClick={()=>{setActiveFilter("Tous les trades");setAccountFilter("");setDays("3650")}} className="w-full mt-3 py-2 text-[11px] text-[#7C4DFF] font-medium hover:bg-[rgba(124,77,255,0.06)] rounded-lg transition-all flex items-center justify-center gap-1">
              Voir tous les trades →
            </button>
          </div>
        )}
      </div>

      {/* Right: Trade detail panel */}
      {selectedTrade && (() => {
        const t = normalize(selectedTrade)
        return (
          <div className="fixed inset-0 z-40 bg-[#0A0C14] lg:static lg:z-auto lg:w-80 lg:border-l lg:border-[#1E2430] overflow-y-auto scrollbar-thin flex-shrink-0">
            <div className="p-4">
              <button onClick={() => setSelectedTrade(null)} className="lg:hidden mb-4 text-xs text-[#9CA3AF] hover:text-white flex items-center gap-1.5">← Retour à la liste</button>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{t.asset}</span>
                  <span className={`px-2 py-0.5 rounded-full bg-white/[0.05] text-[10px] font-medium ${t.toneClass}`}>
                    {t.statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 text-[#9CA3AF] hover:text-white" aria-label="Modifier ce trade" onClick={() => openEditTrade(selectedTrade)}><Edit2 className="w-3.5 h-3.5"/></button>
                  <button className="p-1 text-[#9CA3AF] hover:text-[#FF5252]" aria-label="Supprimer ce trade" onClick={() => deleteTrade(selectedTrade.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Direction + values */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E2430]">
                <span className={`text-xs font-medium ${t.toneClass}`}>
                  {t.direction === "Achat (Long)" ? "📈" : "📉"} {t.direction}
                </span>
                <div className="text-right">
                  <div className={`text-sm font-bold ${t.toneClass}`}>{t.rLabel}</div>
                  <div className={`text-sm font-bold ${t.toneClass}`}>{t.result}</div>
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
                      ["Sortie", selectedTrade.exit_price ?? "—"],
                      ["Stop Loss", selectedTrade.stop ?? "—"],
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

                  {selectedTrade.checklist_results?.length > 0 && <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0F1117] p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-[#9CA3AF]">Check-list du trade</span><span className="text-[9px] text-[#B58BFF]">{selectedTrade.checklist_results.filter(item=>item.checked).length}/{selectedTrade.checklist_results.length} respectées</span></div><div className="space-y-1.5">{selectedTrade.checklist_results.map(item=><div key={item.id} className="flex items-center gap-2"><span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${item.checked ? "bg-[#00E676] text-[#06130C]" : "bg-[#FF5252]/10 text-[#FF6B76]"}`}>{item.checked ? <Check className="h-2.5 w-2.5"/> : "×"}</span><span className={`text-[10px] ${item.checked ? "text-[#B5BBC9]" : "text-[#7E8798]"}`}>{item.label}</span></div>)}</div></div>}

                  {/* Mini chart */}
                  <div className="mb-4">
                    <p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Mini graphique</p>
                    <div className="bg-[#0F1117] rounded-lg border border-[#1E2430] overflow-hidden">
                      <ResponsiveContainer width="100%" height={70}>
                        <AreaChart data={miniChartData}>
                          <defs>
                            <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={t.chartColor} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={t.chartColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={t.chartColor} strokeWidth={1.5} fill="url(#miniGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mb-4"><p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Captures d'écran</p>{selectedTrade.screenshots?.length?<div className="grid grid-cols-3 gap-2">{selectedTrade.screenshots.map((src,i)=><img key={src+i} src={src} alt={`Capture ${i+1}`} className="aspect-square rounded-lg border border-[#1E2430] object-cover"/>)}</div>:<div className="rounded-lg border border-dashed border-[#1E2430] p-3 text-center text-[10px] text-[#6B7280]"><Camera className="w-4 h-4 mx-auto mb-1"/>Aucune capture jointe. L’import d’images n’est pas disponible dans cette version.</div>}</div>
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
      {openForm && <TradeFormModal form={form} setForm={setForm} accounts={accounts} user={user} checklist={activeChecklist} checklistChecks={checklistChecks} setChecklistChecks={setChecklistChecks} editingTrade={editingTrade} saving={saving} onClose={()=>{if(!saving){setOpenForm(false);setEditingTrade(null)}}} onSave={saveTrade}/>}
    </div>
  )
}
