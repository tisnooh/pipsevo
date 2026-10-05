import { useCallback, useState, useEffect, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Star, Edit2, Trash2, Camera, Check, Plus, Upload, BarChart3, Target, TrendingUp, ArrowUpRight, ArrowDownRight, Ruler, CalendarDays, X } from "lucide-react"
import { trades as tradesAPI, accounts as accAPI, tradeScreenshots } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { normalizeTradingRules } from "@/components/TradingRulesEditor"
import TradeFormModal from "@/components/TradeFormModal"
import { createEmptyTradeForm, hydrateTradeForm } from "@/lib/tradeFormModel"
import CsvExportButton from "@/components/CsvExportButton"
import TradeCsvImportModal from "@/components/TradeCsvImportModal"
import { useAppSettings } from "@/hooks/useAppSettings"
import { clearPreTradeChecks, readPreTradeChecks, writePreTradeChecks } from "@/lib/preTradeChecklist"
import { listenForAppDataChanges } from "@/lib/appDataEvents"
import { JOURNAL_LIST_PATH, journalTradePath, resolveJournalRoute } from "@/lib/journalNavigation"
import MobileTradeList from "@/components/MobileTradeList"
import { measuredTradePnl, tradeOutcome } from "@/lib/tradeAnalytics"
import { apiErrorMessage } from "@/lib/apiError"
import PrivateTradeImage from "@/components/PrivateTradeImage"
import { useConfirmDialog } from "@/components/ConfirmDialog"

export function JournalPage() {
  const { confirm, confirmationDialog } = useConfirmDialog()
  const { user } = useAuth()
  const { money } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const { tradeId = "" } = useParams()
  const [tradeList, setTradeList] = useState([])
  const [accounts, setAccounts] = useState([])
  const [activeTab, setActiveTab] = useState("Aperçu")
  const [activeFilter, setActiveFilter] = useState("Tous les trades")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [openForm, setOpenForm] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)
  const [saving, setSaving] = useState(false)
  const [checklistChecks, setChecklistChecks] = useState({})
  const [accountFilter, setAccountFilter] = useState("")
  const [days, setDays] = useState("30")
  const [form, setForm] = useState(()=>createEmptyTradeForm(null))
  const userRules = normalizeTradingRules(user?.rules)
  const activeChecklist = userRules.pre_trade_checklist.filter(item=>item.enabled !== false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const [t, a] = await Promise.all([tradesAPI.list(), accAPI.list()])
      setTradeList(t.data)
      setAccounts(a.data)
      if (a.data.length > 0) setForm(f => ({ ...f, account_id: a.data[0].id }))
    } catch (error) { setLoadError(apiErrorMessage(error,"Erreur de chargement")) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    return listenForAppDataChanges(load, ["accounts", "trades"])
  }, [load])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("import") === "1") {
      setImportOpen(true)
      navigate(JOURNAL_LIST_PATH, { replace: true })
      return
    }
  }, [location.search, navigate])

  const journalRoute = useMemo(
    () => resolveJournalRoute(location.search, tradeList, tradeId),
    [location.search, tradeId, tradeList],
  )
  const { dateFilter, selectedTrade } = journalRoute

  useEffect(() => {
    if (dateFilter) setDays("3650")
  }, [dateFilter])

  useEffect(() => {
    if (openForm && !editingTrade) writePreTradeChecks(checklistChecks, activeChecklist)
  }, [activeChecklist, checklistChecks, editingTrade, openForm])

  const saveTrade = async (payload, screenshotFiles = []) => {
    setSaving(true)
    let createdTrade = null
    const uploadedPaths = []
    try {
      const tradeId = editingTrade?.id || (await tradesAPI.create({...payload,screenshots:[]})).data.id
      if (!editingTrade) createdTrade = { id: tradeId }
      for (const file of screenshotFiles) uploadedPaths.push(await tradeScreenshots.upload(tradeId,file))
      const nextScreenshots=[...(payload.screenshots || []),...uploadedPaths]
      if (editingTrade) {
        await tradesAPI.update(tradeId,{...payload,screenshots:nextScreenshots})
        const removed=(editingTrade.screenshots || []).filter(path=>!nextScreenshots.includes(path))
        if (removed.length) tradeScreenshots.delete(removed).catch(()=>toast.warning("Le trade est enregistré, mais une ancienne capture n’a pas pu être supprimée."))
      } else if (nextScreenshots.length) {
        await tradesAPI.update(tradeId,{screenshots:nextScreenshots})
      }
      localStorage.setItem("pipsevo_last_trade_choices",JSON.stringify({account_id:payload.account_id,session:payload.session,setups:payload.setups,emotion:payload.emotion,emotion_intensity:payload.emotion_intensity,duration:payload.duration,market_type:payload.market_type}))
      if (!editingTrade) { clearPreTradeChecks(); setChecklistChecks({}) }
      toast.success(editingTrade ? "Trade mis à jour" : "Trade ajouté")
      setOpenForm(false)
      setEditingTrade(null)
      load()
    } catch (e) {
      if (uploadedPaths.length) await tradeScreenshots.delete(uploadedPaths).catch(()=>{})
      if (createdTrade) await tradesAPI.delete(createdTrade.id).catch(()=>{})
      toast.error(e.response?.data?.detail || e.message || "Impossible d’enregistrer le trade")
    }
    finally { setSaving(false) }
  }

  const openNewTrade = () => {
    if (!accounts.length) { toast.error("Ajoute d’abord un compte de trading"); return }
    setEditingTrade(null)
    setChecklistChecks(readPreTradeChecks(activeChecklist))
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
    try { const { data } = await tradesAPI.update(trade.id, { starred: !trade.starred }); setTradeList(list=>list.map(t=>t.id===trade.id?data:t)) }
    catch { toast.error("Impossible de modifier le favori") }
  }

  const deleteTrade = async (id) => {
    const accepted = await confirm({ title: "Supprimer ce trade ?", description: "Le trade et ses données associées seront supprimés définitivement.", confirmLabel: "Supprimer", destructive: true })
    if (!accepted) return
    try {
      const screenshotPaths=tradeList.find(trade=>String(trade.id)===String(id))?.screenshots || []
      await tradesAPI.delete(id)
      if (screenshotPaths.length) await tradeScreenshots.delete(screenshotPaths).catch(()=>toast.warning("Le trade est supprimé, mais ses captures devront être nettoyées ultérieurement."))
      toast.success("Trade supprimé")
      if (String(selectedTrade?.id) === String(id)) navigate(JOURNAL_LIST_PATH, { replace: true })
      load()
    } catch { toast.error("Erreur") }
  }

  // Normalize trade fields
  const normalize = (t) => {
    const linkedAccount = accounts.find(a => a.id === t.account_id)
    const pnl = measuredTradePnl(t)
    const outcome = tradeOutcome(t)
    return ({
    ...t,
    pnl,
    outcome,
    asset: t.instrument || t.asset || "—",
    direction: t.direction === "long" ? "Achat (Long)" : t.direction === "short" ? "Vente (Short)" : t.direction,
    win: outcome > 0,
    toneClass: pnl === null || pnl === 0 ? "text-[#9CA3AF]" : pnl > 0 ? "text-[#46C99A]" : "text-[#F26A70]",
    statusLabel: ({partial:"Partiellement clôturé",open:"Position ouverte",cancelled:"Annulé",canceled:"Annulé"})[t.result_status] || (outcome === null ? "Non mesuré" : outcome > 0 ? "Gagnant" : outcome < 0 ? "Perdant" : "Break-even"),
    result: pnl !== null ? money(pnl,{signDisplay:"always"}) : t.result_status === "open" ? "Ouverte" : "—",
    rLabel: Number.isFinite(t.r) && outcome !== null ? `${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}R` : "—",
    account_name: linkedAccount?.name || "",
    account_firm: linkedAccount?.firm || "",
    account: linkedAccount
      ? `${linkedAccount.firm} $${(linkedAccount.initial_balance / 1000).toFixed(0)}K`
      : "—",
    tags: t.tags || (t.setup ? [t.setup] : []),
    dateLabel: t.date || "—",
  })}

  const normalized = tradeList.map(normalize)

  const byAccountAndDate = normalized.filter(t => {
    const exactDate = !dateFilter || String(t.date || "").slice(0, 10) === dateFilter
    const recentEnough = dateFilter || !t.date || (Date.now() - new Date(t.date).getTime()) <= Number(days) * 86400000
    return (!accountFilter || t.account_id === accountFilter) && exactDate && recentEnough
  })
  const filtered = activeFilter === "Tous les trades" || activeFilter === "Tous"
    ? byAccountAndDate
    : activeFilter === "Positions ouvertes"
    ? byAccountAndDate.filter(t => t.result_status === "open" || t.exit_price === null || t.exit_price === undefined)
    : byAccountAndDate.filter(t => t.starred)

  // KPIs calculés depuis les vraies données
  const outcomes = filtered.map(t => ({ trade: t, outcome: t.outcome })).filter(item => item.outcome !== null)
  const wins = outcomes.filter(item => item.outcome > 0)
  const losses = outcomes.filter(item => item.outcome < 0)
  const measuredTrades = filtered.filter(t => typeof t.pnl === "number")
  const monetaryWins = measuredTrades.filter(t => t.pnl > 0)
  const monetaryLosses = measuredTrades.filter(t => t.pnl < 0)
  const totalPnl = measuredTrades.length ? measuredTrades.reduce((s, t) => s + t.pnl, 0) : null
  const winRate = outcomes.length ? Math.round((wins.length / outcomes.length) * 100) : null
  const avgWin = monetaryWins.length ? monetaryWins.reduce((s, t) => s + t.pnl, 0) / monetaryWins.length : null
  const avgLoss = monetaryLosses.length ? monetaryLosses.reduce((s, t) => s + t.pnl, 0) / monetaryLosses.length : null
  const rTrades = filtered.filter(t => Number.isFinite(t.r) && t.outcome !== null)
  const avgR = rTrades.length ? rTrades.reduce((s, t) => s + t.r, 0) / rTrades.length : null

  const kpis = [
    { label: "Trades", value: filtered.length.toString(), sub: "", Icon: BarChart3, color: "#4F8CFF" },
    { label: "Win Rate", value: winRate === null ? "—" : `${winRate}%`, sub: "", Icon: Target, color: "#46C99A" },
    { label: "Profit net", value: totalPnl === null ? "—" : money(totalPnl,{signDisplay:"always"}), sub: "", Icon: TrendingUp, color: totalPnl === null ? "#7E8798" : totalPnl >= 0 ? "#46C99A" : "#F26A70" },
    { label: "Gain moyen", value: avgWin === null ? "—" : money(avgWin,{signDisplay:"always"}), sub: "", Icon: ArrowUpRight, color: avgWin === null ? "#7E8798" : "#46C99A" },
    { label: "Perte moyenne", value: avgLoss === null ? "—" : money(avgLoss), sub: "", Icon: ArrowDownRight, color: avgLoss === null ? "#7E8798" : "#F26A70" },
    { label: "R Multiple moyen", value: avgR === null ? "—" : `${avgR.toFixed(2)}R`, sub: "", Icon: Ruler, color: "#7C4DFF" },
  ]

  const detailTabs = ["Aperçu", "Notes", "Statistiques"]

  if (loading) return (
    <div className="flex h-full items-center justify-center text-[#9CA3AF]">Chargement…</div>
  )
  if (loadError) return <div role="alert" className="pe-card p-6"><p>{loadError}</p><button className="btn-primary mt-4" onClick={load}>Réessayer</button></div>

  return (
    <div className="flex h-full flex-col lg:flex-row lg:overflow-hidden">
      {/* Left: trades list */}
      <div className="pe-page flex-1 overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="pe-page-header mb-6">
          <div><div className="pe-eyebrow">Historique de trading</div><h1 className="pe-page-title mt-2">Journal</h1><p className="pe-page-copy mt-1">Analyse tes décisions, ton contexte et la qualité de ton exécution.</p></div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {dateFilter && <button type="button" onClick={()=>navigate(JOURNAL_LIST_PATH)} className="pe-control inline-flex items-center gap-2 border-[#7165DD]/35 bg-[#7165DD]/10 text-[#C7C0FF]"><CalendarDays className="h-4 w-4"/>{new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${dateFilter}T12:00:00`))}<X className="h-3.5 w-3.5"/></button>}
            <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} className="pe-control min-w-[150px] flex-1 sm:flex-none"><option value="">Tous les comptes</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select value={days} onChange={e=>setDays(e.target.value)} className="pe-control min-w-[150px] flex-1 sm:flex-none"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option><option value="3650">Toute la période</option></select>
            <CsvExportButton rows={filtered} type="trades" filename="pipsevo-trades-filtres" className="btn-ghost inline-flex h-11 items-center justify-center px-4"/>
            <button type="button" onClick={()=>setImportOpen(true)} className="btn-ghost inline-flex h-11 items-center justify-center gap-2 px-4"><Upload className="h-4 w-4"/>Importer</button>
            <button
              onClick={openNewTrade}
              className="btn-primary inline-flex h-11 items-center justify-center gap-2 px-4"
            >
              <Plus className="h-4 w-4" /> Nouveau trade
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-5 grid grid-cols-3 border-b border-[#1E2430]" role="tablist" aria-label="Filtres du journal">
          {["Tous les trades", "Positions ouvertes", "Favoris"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              role="tab"
              aria-selected={activeFilter === tab}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-center text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                activeFilter === tab
                  ? "border-[#7C4DFF] text-[#A78BFA]"
                  : "border-transparent text-[#9CA3AF] hover:text-white"
              }`}
            >
              {tab === "Favoris" && <Star className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
              <span className="truncate">{tab}</span>
            </button>
          ))}
        </div>

        {/* KPI row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="pe-card min-h-[104px] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-pe-caption text-[#9CA3AF]">{kpi.label}</span>
                <kpi.Icon className="h-4 w-4" style={{ color: kpi.color }}/>
              </div>
              <div className="font-numeric text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              {kpi.sub && <p className="mt-1 text-pe-caption text-[#9CA3AF]">{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* Table */}
        {normalized.length === 0 ? (
          <div className="pe-empty-state">
            <div className="text-[#9CA3AF] text-sm mb-4">Pas encore de trades — ajoute ton premier trade !</div>
            <button
              onClick={openNewTrade}
              className="btn-primary inline-flex items-center justify-center px-6"
            >
              <Plus className="w-4 h-4 inline mr-2" />Ajouter un trade
            </button>
          </div>
        ) : (
          <>
          <MobileTradeList
            trades={filtered}
            onSelect={(trade) => navigate(journalTradePath(trade.id))}
            onToggleFavorite={toggleFavorite}
          />
          <div className="pe-table-shell hidden md:block">
            {/* Header */}
            <div
            className="grid min-w-[780px] border-b border-[#6571CF]/15 bg-[#090E1C] px-4 py-3.5 text-pe-label uppercase tracking-[0.08em] text-[#98A1B5]"
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
                onClick={() => navigate(journalTradePath(trade.id))}
                className={`grid min-w-[780px] cursor-pointer items-center border-b border-[#1E2430]/50 px-4 py-3.5 text-[13px] transition-all last:border-0 ${
                  selectedTrade?.id === trade.id ? "bg-[#15182A]" : "hover:bg-[#15182A]/50"
                }`}
                style={{ gridTemplateColumns: "2rem 2fr 1fr 1.5fr 1fr 0.8fr 1fr 1.5fr 1fr 2rem" }}
              >
                <button aria-label={trade.starred?"Retirer des favoris":"Ajouter aux favoris"} onClick={(e)=>toggleFavorite(trade,e)}><Star className={`w-3.5 h-3.5 transition-colors ${trade.starred ? "text-yellow-400 fill-yellow-400" : "text-[#374151] hover:text-yellow-400"}`}/></button>
                <span className="text-xs text-[#9CA3AF]">{trade.dateLabel}</span>
                <span className="text-white font-medium">{trade.asset}</span>
                <span className={trade.toneClass}>{trade.direction}</span>
                <span className={`font-medium ${trade.toneClass}`}>{trade.result}</span>
                <span className={trade.toneClass}>{trade.rLabel}</span>
                <span className="text-[#9CA3AF]">{trade.duration || "—"}</span>
                <span className="truncate text-xs text-[#9CA3AF]">{trade.account}</span>
                <div className="flex gap-1 flex-wrap">
                  {trade.tags.map((tag) => (
                    <span key={tag} className="pe-badge bg-[#15182A] text-[#98A1B5]">{tag}</span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTrade(trade.id) }}
                  className="text-[#6B7280] hover:text-[#F26A70] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}

            <button onClick={()=>{setActiveFilter("Tous les trades");setAccountFilter("");setDays("3650")}} className="flex min-h-11 w-full items-center justify-center gap-1 text-xs font-medium text-[#B58BFF] transition-all hover:bg-[rgba(124,77,255,0.06)]">
              Voir tous les trades →
            </button>
          </div>
          </>
        )}
      </div>

      {/* Right: Trade detail panel */}
      {selectedTrade && (() => {
        const t = normalize(selectedTrade)
        return (
          <div className="fixed inset-0 z-40 bg-[#090E1C] lg:static lg:z-auto lg:w-80 lg:border-l lg:border-[#6571CF]/15 overflow-y-auto scrollbar-thin flex-shrink-0">
            <div className="p-4">
              <button onClick={() => navigate(JOURNAL_LIST_PATH)} className="lg:hidden mb-4 text-xs text-[#9CA3AF] hover:text-white flex items-center gap-1.5">← Retour à la liste</button>
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
                  <button className="p-1 text-[#9CA3AF] hover:text-[#F26A70]" aria-label="Supprimer ce trade" onClick={() => deleteTrade(selectedTrade.id)}>
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

                  {selectedTrade.checklist_results?.length > 0 && <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0F1117] p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-[#9CA3AF]">Check-list du trade</span><span className="text-[9px] text-[#B58BFF]">{selectedTrade.checklist_results.filter(item=>item.checked).length}/{selectedTrade.checklist_results.length} respectées</span></div><div className="space-y-1.5">{selectedTrade.checklist_results.map(item=><div key={item.id} className="flex items-center gap-2"><span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${item.checked ? "bg-[#46C99A] text-[#06130C]" : "bg-[#F26A70]/10 text-[#F26A70]"}`}>{item.checked ? <Check className="h-2.5 w-2.5"/> : "×"}</span><span className={`text-[10px] ${item.checked ? "text-[#B5BBC9]" : "text-[#7E8798]"}`}>{item.label}</span></div>)}</div></div>}

                  <p className="mb-4 rounded-lg border border-[#1E2430] p-3 text-[10px] text-[#9CA3AF]">L’historique des bougies n’est pas fourni avec ce trade. Ajoute une capture de ton graphique ci-dessous.</p>

                  <div className="mb-4"><p className="text-[10px] font-medium text-[#9CA3AF] mb-2">Captures d'écran</p>{selectedTrade.screenshots?.length?<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{selectedTrade.screenshots.map((path,i)=><PrivateTradeImage key={path} path={path} alt={`Capture ${i+1}`} className="aspect-video w-full rounded-lg border border-[#1E2430] object-cover"/>)}</div>:<button type="button" onClick={()=>openEditTrade(selectedTrade)} className="w-full rounded-lg border border-dashed border-[#1E2430] p-3 text-center text-[10px] text-[#6B7280] hover:border-[#7C4DFF]/40 hover:text-[#B58BFF]"><Camera className="w-4 h-4 mx-auto mb-1"/>Ajouter des captures à ce trade</button>}</div>
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
                  <p className={`text-[11px] font-medium ${selectedTrade.plan_respected ? "text-[#46C99A]" : "text-[#F26A70]"}`}>
                    {selectedTrade.plan_respected === true ? "✓ Oui" : selectedTrade.plan_respected === false ? "✗ Non" : "Non renseigné"}
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
      {importOpen && <TradeCsvImportModal accounts={accounts} existingTrades={tradeList} onClose={()=>setImportOpen(false)} onImported={load}/>}
      {confirmationDialog}
    </div>
  )
}
