import React, { useLayoutEffect, useRef } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const PREVIEW_WIDTH = 1440;
const PREVIEW_HEIGHT = 820;

const NAV_ITEMS = [
  { id: "overview", label: "Aperçu", icon: LayoutDashboard },
  { id: "accounts", label: "Comptes", icon: WalletCards },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "markets", label: "Marchés", icon: BarChart3 },
  { id: "backtest", label: "Backtest", icon: FlaskConical },
  { id: "analytics", label: "Statistiques", icon: Gauge },
  { id: "coach", label: "Analyse IA", icon: Bot },
  { id: "discipline", label: "Discipline", icon: Shield },
  { id: "payouts", label: "Payouts", icon: CircleDollarSign },
  { id: "settings", label: "Paramètres", icon: Settings },
];

const KPI_ITEMS = [
  { label: "Profit net", value: "+21 850 $US", detail: "+12,7% vs 30 derniers jours", color: "#17E6AF", glow: "rgba(23,230,175,.15)" },
  { label: "Score de discipline", value: "78", suffix: "/100", detail: "+9 pts vs plan respecté", color: "#CC72FF", glow: "rgba(204,114,255,.14)" },
  { label: "Comptes actifs", value: "3", detail: "3 comptes suivis", color: "#28A8FF", glow: "rgba(40,168,255,.14)" },
  { label: "Win Rate", value: "62%", detail: "+6% vs période précédente", color: "#10DDA6", glow: "rgba(16,221,166,.14)" },
  { label: "Drawdown restant", value: "2 930 $US", detail: "Marge de risque disponible", color: "#22B7FF", glow: "rgba(34,183,255,.14)" },
];

const TRADES = [
  ["2026-07-26", "EURUSD", "Achat Long", "+560,00 $US", "+2.1", "1h 45m", "Topstep", "FVG"],
  ["2026-07-26", "ES (S&P500)", "Achat Long", "+1 200,00 $US", "+2.8", "2h 30", "Apex", "OB"],
  ["2026-07-25", "EURUSD", "Vente Short", "-320,00 $US", "-1.1", "45 min", "Topstep", "—"],
];

function PreviewSidebar({ activeSection }) {
  return (
    <aside className="product-preview-sidebar">
      <div className="product-preview-brand"><Logo size="md" /></div>
      <nav className="product-preview-nav" aria-label="Navigation de démonstration">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const selected = id === (activeSection || "overview");
          return (
            <div key={id} className={`product-preview-nav-item ${selected ? "is-active" : ""}`}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </div>
          );
        })}
      </nav>
      <div className="product-preview-logout"><LogOut aria-hidden="true" /><span>Déconnexion</span></div>
    </aside>
  );
}

function PreviewTopbar() {
  return (
    <header className="product-preview-topbar">
      <div className="product-preview-search"><Search aria-hidden="true" /><span>Rechercher...</span><kbd>⌘K</kbd></div>
      <div className="product-preview-actions"><Bell aria-hidden="true" /><span className="product-preview-bolt">ϟ</span><span className="product-preview-pro">PRO</span><ChevronDown aria-hidden="true" /></div>
    </header>
  );
}

function Sparkline({ color }) {
  return (
    <svg className="product-preview-spark" viewBox="0 0 210 44" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={`spark-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor={color} stopOpacity=".26"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d="M0 31 C25 32 33 18 62 22 C92 27 101 13 128 17 C154 21 174 6 210 13 L210 44 L0 44 Z" fill={`url(#spark-${color.replace("#", "")})`} />
      <path d="M0 31 C25 32 33 18 62 22 C92 27 101 13 128 17 C154 21 174 6 210 13" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function KpiCard({ item }) {
  return (
    <article className="product-preview-kpi" style={{ "--kpi-color": item.color, "--kpi-glow": item.glow }}>
      <div className="product-preview-kpi-label">{item.label}<span className="product-preview-kpi-dot" /></div>
      <div className="product-preview-kpi-value">{item.value}<span>{item.suffix}</span></div>
      <div className="product-preview-kpi-detail">◆ {item.detail}</div>
      <Sparkline color={item.color} />
    </article>
  );
}

function EquityChart() {
  return (
    <section className="product-preview-card product-preview-equity">
      <div className="product-preview-card-head"><strong>Courbe d’équité</strong><span>30 jours <ChevronDown aria-hidden="true" /></span></div>
      <div className="product-preview-chart">
        <div className="product-preview-chart-labels"><span>30K $US</span><span>20K $US</span><span>10K $US</span><span>0 $US</span><span>-10K $US</span></div>
        <svg viewBox="0 0 760 270" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#8B4DFF" stopOpacity=".38"/><stop offset="1" stopColor="#8B4DFF" stopOpacity="0"/></linearGradient></defs>
          <g stroke="rgba(255,255,255,.055)" strokeWidth="1"><path d="M0 35H760"/><path d="M0 95H760"/><path d="M0 155H760"/><path d="M0 215H760"/></g>
          <path d="M0 235 L22 217 L44 190 L66 204 L88 196 L110 165 L132 150 L154 122 L176 130 L198 141 L220 151 L242 136 L264 118 L286 102 L308 82 L330 74 L352 83 L374 94 L396 79 L418 58 L440 50 L462 45 L484 52 L506 39 L528 44 L550 30 L572 35 L594 22 L616 31 L638 17 L660 24 L682 11 L704 20 L726 8 L760 2 L760 270 L0 270 Z" fill="url(#equity-fill)"/>
          <path d="M0 235 L22 217 L44 190 L66 204 L88 196 L110 165 L132 150 L154 122 L176 130 L198 141 L220 151 L242 136 L264 118 L286 102 L308 82 L330 74 L352 83 L374 94 L396 79 L418 58 L440 50 L462 45 L484 52 L506 39 L528 44 L550 30 L572 35 L594 22 L616 31 L638 17 L660 24 L682 11 L704 20 L726 8 L760 2" fill="none" stroke="#A45CFF" strokeWidth="3"/>
        </svg>
        <span className="product-preview-chart-total">+21 850 $US</span>
        <div className="product-preview-chart-dates"><span>2026-06-26</span><span>2026-07-26</span></div>
      </div>
    </section>
  );
}

function PayoutCard() {
  return (
    <section className="product-preview-card product-preview-payout">
      <strong>Progression des payouts</strong>
      <div className="product-preview-payout-total"><span>2 450 $US <small>/ 10 000 $US</small></span><b>24%</b></div>
      <div className="product-preview-progress"><span /></div>
      <div className="product-preview-divider" />
      <small>Prochain payout estimé</small>
      <div className="product-preview-payout-next"><span>7 550 $US</span><button type="button" tabIndex={-1}>♙ Simuler</button></div>
    </section>
  );
}

function DisciplineCard() {
  return (
    <section className="product-preview-card product-preview-discipline">
      <strong>Répartition discipline</strong>
      <div className="product-preview-gauge"><div className="product-preview-gauge-track"><div className="product-preview-gauge-inner"><b>78<small>/100</small></b><span>Excellente</span></div></div></div>
      <div className="product-preview-detail-link">Détails →</div>
    </section>
  );
}

function CoachCard() {
  return (
    <section className="product-preview-card product-preview-coach">
      <div><Sparkles aria-hidden="true" /><strong>AI Coach Insight</strong></div>
      <p>Continue comme ça ! Ta régularité s’améliore.</p>
      <button type="button" tabIndex={-1}>Voir insight →</button>
    </section>
  );
}

function TradesCard() {
  return (
    <section className="product-preview-card product-preview-trades">
      <div className="product-preview-trades-head"><strong>Trades récents</strong><span>12 affichés</span><div className="product-preview-trade-filters"><span>Tous les comptes⌄</span><span>Tous les actifs⌄</span></div></div>
      <div className="product-preview-tabs"><span className="is-active">Tous</span><span>Gagnants</span><span>Perdants</span></div>
      <div className="product-preview-table">
        <div className="product-preview-row product-preview-row-head">{["DATE", "ACTIF", "DIRECTION", "RÉSULTAT", "R-MULTIPLE", "DURÉE", "COMPTE", "TAGS"].map((cell) => <span key={cell}>{cell}</span>)}</div>
        {TRADES.map((trade) => <div className="product-preview-row" key={`${trade[0]}-${trade[1]}-${trade[3]}`}>{trade.map((cell, index) => <span key={`${cell}-${index}`} className={index === 2 ? (cell.includes("Achat") ? "is-win" : "is-loss") : index === 3 || index === 4 ? (cell.startsWith("-") ? "is-loss" : "is-win") : ""}>{cell}</span>)}</div>)}
      </div>
      <div className="product-preview-detail-link">Voir tous les trades →</div>
    </section>
  );
}

const CONTEXT_LABELS = {
  overview: "Vue d'ensemble",
  journal: "Journal de trading",
  discipline: "Discipline & risque",
  backtest: "Backtest",
  coach: "Atlas — Coach IA",
  payouts: "Payouts",
};

const JOURNAL_ROWS = [
  ["31/05", "EURUSD", "Achat", "Break & Retest", "+2.15R", "+215 $", "1h 42m"],
  ["31/05", "GBPUSD", "Vente", "Order Block", "-0.85R", "-85 $", "47m"],
  ["30/05", "XAUUSD", "Achat", "Liquidité", "+1.30R", "+130 $", "2h 15m"],
  ["30/05", "US30", "Vente", "Rejet M15", "+0.60R", "+60 $", "35m"],
  ["29/05", "EURUSD", "Vente", "FVG", "-1.20R", "-120 $", "1h 05m"],
  ["29/05", "NAS100", "Achat", "Breakout", "+1.80R", "+180 $", "1h 20m"],
];

function PreviewPageHead({ eyebrow, title, description, action }) {
  return (
    <div className="product-preview-page-head">
      <div><span>{eyebrow}</span><strong>{title}</strong><p>{description}</p></div>
      {action ? <button type="button" tabIndex={-1}>{action}</button> : null}
    </div>
  );
}

function MiniMetric({ label, value, detail, tone = "purple", icon: Icon = TrendingUp }) {
  return (
    <article className={`product-preview-mini-metric tone-${tone}`}>
      <div><span>{label}</span><Icon aria-hidden="true" /></div><strong>{value}</strong><small>{detail}</small>
    </article>
  );
}

function JournalPreview() {
  return (
    <div className="product-preview-context product-preview-context--journal">
      <PreviewPageHead eyebrow="Chaque trade compte" title="Journal de trading" description="Analyse chaque décision, pas seulement le résultat." action="+ Nouveau trade" />
      <div className="product-preview-filterbar">{['Tous les comptes', 'Toutes les paires', 'Tous les setups', '30 derniers jours'].map((item) => <span key={item}>{item}<ChevronDown aria-hidden="true" /></span>)}</div>
      <div className="product-preview-mini-grid product-preview-mini-grid--four">
        <MiniMetric label="Trades" value="142" detail="+18 ce mois" tone="blue" icon={BookOpen} />
        <MiniMetric label="Win rate" value="62%" detail="+6% sur 30 jours" tone="green" />
        <MiniMetric label="R moyen" value="+1.48R" detail="Objectif +1.20R" tone="purple" />
        <MiniMetric label="Plan respecté" value="82%" detail="116 trades conformes" tone="pink" icon={CheckCircle2} />
      </div>
      <div className="product-preview-journal-layout">
        <section className="product-preview-card product-preview-journal-table">
          <div className="product-preview-section-title"><strong>Historique structuré</strong><span>142 trades</span></div>
          <table aria-label="Exemple d'historique du journal de trading">
            <thead><tr>{['DATE', 'ACTIF', 'SENS', 'SETUP', 'R', 'RÉSULTAT', 'DURÉE'].map((cell) => <th scope="col" key={cell}>{cell}</th>)}</tr></thead>
            <tbody>{JOURNAL_ROWS.map((row) => <tr key={`${row[0]}-${row[1]}-${row[4]}`}>{row.map((cell, index) => <td className={(index === 2 || index === 4 || index === 5) ? (cell.includes('-') || cell === 'Vente' ? 'is-loss' : 'is-win') : ''} key={`${cell}-${index}`}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </section>
        <section className="product-preview-card product-preview-trade-detail">
          <div className="product-preview-section-title"><strong>EURUSD <em>Achat</em></strong><b>+2.15R</b></div>
          <div className="product-preview-detail-list"><span><small>Compte</small>Principal</span><span><small>Setup</small>Break & Retest</span><span><small>Session</small>Londres</span><span><small>Émotion</small>Calme</span></div>
          <div className="product-preview-trade-map"><i className="entry">Entrée</i><i className="target">TP</i><i className="stop">SL</i><svg viewBox="0 0 310 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 66 L22 61 L43 69 L66 50 L87 54 L108 35 L132 44 L155 27 L177 34 L201 17 L221 25 L244 10 L265 18 L288 5 L310 12" /></svg></div>
          <div className="product-preview-checks"><span><CheckCircle2 /> Plan respecté</span><span><CheckCircle2 /> Risque calculé</span><span><CheckCircle2 /> Contexte validé</span></div>
        </section>
      </div>
    </div>
  );
}

function DisciplinePreview() {
  const rules = [["Risque max par trade", "1,50%", true], ["Perte max journalière", "300 $", true], ["Stop après 2 pertes", "Respectée", true], ["Pas de trade impulsif", "1 écart", false]];
  return (
    <div className="product-preview-context product-preview-context--discipline">
      <PreviewPageHead eyebrow="Protection du capital" title="Discipline & gestion du risque" description="Vois le risque avant qu'il ne devienne une violation." action="Compte principal⌄" />
      <div className="product-preview-mini-grid product-preview-mini-grid--four">
        <MiniMetric label="Drawdown restant" value="2 930 $" detail="7,8% de marge" tone="blue" icon={Gauge} />
        <MiniMetric label="Risque aujourd'hui" value="1,12%" detail="Objectif ≤ 1,50%" tone="purple" icon={Shield} />
        <MiniMetric label="Règles respectées" value="82%" detail="33 / 40 trades" tone="green" icon={CheckCircle2} />
        <MiniMetric label="Écarts détectés" value="2" detail="Sur les 7 derniers jours" tone="pink" icon={AlertTriangle} />
      </div>
      <div className="product-preview-risk-layout">
        <section className="product-preview-card product-preview-risk-budget"><div className="product-preview-section-title"><strong>Budget de risque</strong><span>En direct</span></div><div className="product-preview-risk-gauge"><div><strong>1,12%</strong><span>utilisé sur 2,00%</span></div></div><div className="product-preview-risk-lines"><span><small>Risque utilisé</small><b>143,50 $</b></span><span><small>Risque disponible</small><b>112,50 $</b></span></div></section>
        <section className="product-preview-card product-preview-drawdown-chart"><div className="product-preview-section-title"><strong>Évolution du drawdown</strong><span>30 jours</span></div><svg viewBox="0 0 560 230" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="risk-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff4f87" stopOpacity=".30"/><stop offset="1" stopColor="#ff4f87" stopOpacity="0"/></linearGradient></defs><g><path d="M0 32H560M0 88H560M0 144H560M0 200H560"/></g><path className="fill" d="M0 35 L35 48 L70 71 L105 62 L140 104 L175 92 L210 122 L245 116 L280 151 L315 139 L350 169 L385 178 L420 165 L455 191 L490 183 L525 197 L560 186 L560 230 L0 230Z"/><path className="line" d="M0 35 L35 48 L70 71 L105 62 L140 104 L175 92 L210 122 L245 116 L280 151 L315 139 L350 169 L385 178 L420 165 L455 191 L490 183 L525 197 L560 186"/></svg></section>
        <section className="product-preview-card product-preview-rule-list"><div className="product-preview-section-title"><strong>Règles clés</strong><span>Cette semaine</span></div>{rules.map(([label, value, valid]) => <div key={label}><span className={valid ? 'is-valid' : 'is-warning'}>{valid ? <CheckCircle2 /> : <AlertTriangle />}</span><p><strong>{label}</strong><small>{value}</small></p></div>)}</section>
      </div>
    </div>
  );
}

function CandlestickChart() {
  const candles = [58,62,55,47,42,49,36,29,34,22,31,18,25,39,44,36,51,46,58,62,54,68,61,72,65,78,69,81,75,88,80,91];
  return <div className="product-preview-candles"><div className="product-preview-chart-toolbar"><span>EURUSD · M15</span><b>Indicateurs</b><b>1x</b></div><div className="product-preview-candle-grid">{candles.map((height, index) => <i key={`${height}-${index}`} style={{ '--candle-h': `${height}px`, '--candle-y': `${(index % 5) * 8 + (index > 12 ? 18 : 45)}px` }} className={index % 3 === 0 || index > 22 ? 'up' : 'down'} />)}<span className="trade-zone profit">Objectif +2.4R</span><span className="trade-zone entry">Entrée 1.08125</span><span className="trade-zone loss">Stop -1R</span></div><div className="product-preview-replay"><Play /><span>10x</span><div><i /></div><small>24 mai · 10:30</small></div></div>;
}

function BacktestPreview() {
  return (
    <div className="product-preview-context product-preview-context--backtest">
      <PreviewPageHead eyebrow="Simulation bougie par bougie" title="Backtest de stratégie" description="Prouve ton avantage avant de risquer un seul euro." action="+ Nouvelle simulation" />
      <div className="product-preview-backtest-filters"><span>Break & Retest⌄</span><span>EURUSD⌄</span><span>M15⌄</span><span>01/05 — 31/05</span></div>
      <div className="product-preview-backtest-layout"><section className="product-preview-card product-preview-backtest-chart"><CandlestickChart /></section><aside className="product-preview-backtest-side"><section className="product-preview-card product-preview-backtest-result"><div className="product-preview-section-title"><strong>Résultats</strong><span>128 trades</span></div>{[['Taux de réussite','63,3%'],['Profit net','+2 430 $'],['Facteur de profit','1,87'],['R moyen','+0,82R'],['Drawdown max','6,2%']].map(([label,value])=><span key={label}><small>{label}</small><b className={value.includes('+') ? 'is-win' : ''}>{value}</b></span>)}</section><section className="product-preview-card product-preview-backtest-summary"><Target /><div><strong>Stratégie validée</strong><p>Expectancy positive sur 128 trades.</p></div></section></aside></div>
    </div>
  );
}

function CoachPreview() {
  return (
    <div className="product-preview-context product-preview-context--coach">
      <PreviewPageHead eyebrow="Analyse comportementale" title="Atlas — Coach IA" description="Transforme les répétitions en actions concrètes." action="+ Nouvelle analyse" />
      <div className="product-preview-coach-layout">
        <section className="product-preview-card product-preview-chat-panel"><div className="product-preview-atlas"><span>IA</span><div><strong>Atlas</strong><small>En ligne · basé sur tes trades</small></div></div><div className="product-preview-chat"><p className="assistant">Bonjour ! J'ai analysé tes 142 derniers trades.</p><p className="user">Pourquoi ai-je perdu deux trades hier ?</p><p className="assistant">Trois patterns expliquent l'essentiel de la perte. Voici l'action prioritaire.</p></div><div className="product-preview-chat-input"><span>Pose une question à Atlas...</span><MessageSquare /></div></section>
        <section className="product-preview-card product-preview-patterns"><div className="product-preview-section-title"><strong>Patterns détectés</strong><span>3 prioritaires</span></div>{[['Entrées contre tendance H1','-1,35R','danger'],['Sorties prématurées','-0,85R','warning'],['Risque supérieur à 1,5%','-0,60R','danger']].map(([title,impact,tone])=><div className={`pattern-${tone}`} key={title}><AlertTriangle /><p><strong>{title}</strong><small>Impact estimé <b>{impact}</b></small></p></div>)}</section>
        <section className="product-preview-card product-preview-action-plan"><div className="product-preview-section-title"><strong>Plan d'action</strong><span>Prochaine session</span></div>{['Filtrer les setups contre tendance', 'Attendre la confirmation M15', 'Limiter le risque à 1,00%', 'Faire une pause après une perte'].map((item,index)=><div key={item}><span>{index + 1}</span><p>{item}</p><CheckCircle2 /></div>)}<button type="button" tabIndex={-1}>Sauvegarder le plan</button></section>
      </div>
    </div>
  );
}

function PayoutsPreview() {
  return (
    <div className="product-preview-context product-preview-context--payouts">
      <PreviewPageHead eyebrow="Objectif récompense" title="Suivi des payouts" description="Suis ton éligibilité et prépare ton prochain retrait." action="+ Enregistrer un payout" />
      <div className="product-preview-mini-grid product-preview-mini-grid--three"><MiniMetric label="Total retiré" value="18 640 $" detail="7 payouts confirmés" tone="green" icon={CircleDollarSign}/><MiniMetric label="Prochain estimé" value="3 760 $" detail="Dans 18 jours" tone="purple" icon={Clock3}/><MiniMetric label="Comptes éligibles" value="2 / 3" detail="Un compte en attente" tone="blue" icon={WalletCards}/></div>
      <div className="product-preview-payouts-layout"><section className="product-preview-card product-preview-payout-goal"><div className="product-preview-section-title"><strong>Progression du prochain payout</strong><span>Topstep · Compte 01</span></div><div className="product-preview-payout-ring"><strong>62%</strong><span>6 240 $ / 10 000 $</span></div><div className="product-preview-milestones">{['Jours minimum','Cible atteinte','Règles respectées'].map((item,index)=><span key={item}><CheckCircle2/><small>{item}</small><b>{index === 1 ? '62%' : 'Validé'}</b></span>)}</div></section><section className="product-preview-card product-preview-payout-history"><div className="product-preview-section-title"><strong>Historique</strong><span>Cette année</span></div><table aria-label="Exemple d'historique des payouts"><thead><tr>{['DATE','COMPTE','MONTANT','STATUT'].map(cell => <th scope="col" key={cell}>{cell}</th>)}</tr></thead><tbody>{[['24 juin','Apex 50K','2 450 $','Payé'],['08 mai','Topstep 100K','3 120 $','Payé'],['19 mars','FTMO 100K','4 080 $','Payé'],['02 février','Apex 50K','1 890 $','Payé']].map(row=><tr key={row[0]}>{row.map((cell,index)=><td className={index===2||index===3?'is-win':''} key={cell}>{cell}</td>)}</tr>)}</tbody></table></section></div>
    </div>
  );
}

function OverviewPreview() {
  return <><div className="product-preview-beta"><span>#</span><strong>Bêta gratuite</strong><p>Certaines fonctionnalités avancées sont encore en développement.</p><button type="button" tabIndex={-1}>Voir la roadmap</button></div><div className="product-preview-kpis">{KPI_ITEMS.map((item) => <KpiCard item={item} key={item.label} />)}</div><div className="product-preview-dashboard-grid"><div className="product-preview-left-column"><EquityChart /><TradesCard /></div><div className="product-preview-right-column"><PayoutCard /><DisciplineCard /><CoachCard /></div></div></>;
}

function ContextPreview({ activeSection }) {
  if (activeSection === 'journal') return <JournalPreview />;
  if (activeSection === 'discipline') return <DisciplinePreview />;
  if (activeSection === 'backtest') return <BacktestPreview />;
  if (activeSection === 'coach') return <CoachPreview />;
  if (activeSection === 'payouts') return <PayoutsPreview />;
  return <OverviewPreview />;
}

function ProductCanvas({ activeSection, mobile }) {
  return (
    <div className={`product-preview-canvas ${mobile ? "is-mobile" : ""}`}>
      {!mobile && <PreviewSidebar activeSection={activeSection} />}
      <div className="product-preview-main">
        <PreviewTopbar />
        <div className="product-preview-content">
          <div className="product-preview-screen" key={activeSection}>
            <ContextPreview activeSection={activeSection} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDashboardPreview({ variant = "hero", activeSection = "overview", accent = "#7C4DFF", className = "" }) {
  const mobile = variant === "mobile";
  const previewRef = useRef(null);

  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;

    const baseWidth = mobile ? 1040 : PREVIEW_WIDTH;
    const updateScale = () => {
      preview.style.setProperty("--preview-scale", String(preview.clientWidth / baseWidth));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(preview);
    return () => observer.disconnect();
  }, [mobile]);

  return (
    <div
      ref={previewRef}
      className={`product-dashboard-preview product-dashboard-preview--${variant} ${className}`}
      role="img"
      aria-label={`Aperçu produit PipsEvo — ${CONTEXT_LABELS[activeSection] || CONTEXT_LABELS.overview}, avec des données de démonstration`}
      style={{ "--preview-accent": accent }}
    >
      <div className="product-dashboard-preview__scale" style={{ "--preview-width": PREVIEW_WIDTH, "--preview-height": PREVIEW_HEIGHT }}>
        <ProductCanvas activeSection={activeSection} mobile={mobile} />
      </div>
    </div>
  );
}
