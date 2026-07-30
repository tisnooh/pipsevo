import React, { useLayoutEffect, useRef } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  CircleDollarSign,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Shield,
  Sparkles,
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

function ProductCanvas({ activeSection, mobile }) {
  return (
    <div className={`product-preview-canvas ${mobile ? "is-mobile" : ""}`}>
      {!mobile && <PreviewSidebar activeSection={activeSection} />}
      <div className="product-preview-main">
        <PreviewTopbar />
        <div className="product-preview-content">
          <div className="product-preview-beta"><span>#</span><strong>Bêta gratuite</strong><p>Certaines fonctionnalités avancées sont encore en développement.</p><button type="button" tabIndex={-1}>Voir la roadmap</button></div>
          <div className="product-preview-kpis">{KPI_ITEMS.map((item) => <KpiCard item={item} key={item.label} />)}</div>
          <div className="product-preview-dashboard-grid">
            <div className="product-preview-left-column"><EquityChart /><TradesCard /></div>
            <div className="product-preview-right-column"><PayoutCard /><DisciplineCard /><CoachCard /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDashboardPreview({ variant = "hero", activeSection = "overview", className = "" }) {
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
      aria-label="Aperçu du tableau de bord PipsEvo avec des données locales de démonstration"
    >
      <div className="product-dashboard-preview__scale" style={{ "--preview-width": PREVIEW_WIDTH, "--preview-height": PREVIEW_HEIGHT }}>
        <ProductCanvas activeSection={activeSection} mobile={mobile} />
      </div>
    </div>
  );
}
