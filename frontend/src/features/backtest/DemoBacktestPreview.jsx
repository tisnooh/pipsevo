import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import ReplayChart from "./ReplayChart";
import { usd } from "./api";

const START = Math.floor(Date.UTC(2026, 8, 29, 13, 30) / 1000);

function makeDemoBars() {
  let close = 24682;
  return Array.from({ length: 72 }, (_, index) => {
    const open = close;
    const drift = Math.sin(index * 0.72) * 8 + Math.cos(index * 0.21) * 4 + (index > 43 ? 3.4 : index > 25 ? -1.2 : 1.8);
    close = Math.round((open + drift) * 4) / 4;
    const wick = 4 + (index % 5) * 1.25;
    return {
      timestamp: START + index * 60,
      open,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick * 0.8,
      close,
      volume: 180 + ((index * 73) % 420),
    };
  });
}

const BARS = makeDemoBars();
const TRADES = [
  { closeIndex: 25, side: "Achat", result: 375, r: 1.5, exit: "Take Profit" },
  { closeIndex: 43, side: "Vente", result: -215, r: -0.86, exit: "Stop Loss" },
  { closeIndex: 66, side: "Achat", result: 482.5, r: 1.93, exit: "Take Profit" },
];

function metricTone(value) {
  if (typeof value !== "number" || value === 0) return "";
  return value > 0 ? "text-[#46C99A]" : "text-[#F26A70]";
}

export default function DemoBacktestPreview({ onCreate, onImport }) {
  const [visible, setVisible] = useState(BARS.length);
  const [playing, setPlaying] = useState(false);
  const completedTrades = useMemo(() => TRADES.filter(trade => trade.closeIndex < visible), [visible]);
  const net = completedTrades.reduce((sum, trade) => sum + trade.result, 0);
  const wins = completedTrades.filter(trade => trade.result > 0);
  const losses = completedTrades.filter(trade => trade.result < 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.result, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.result, 0));
  const finished = visible >= BARS.length;

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setVisible(current => Math.min(BARS.length, current + 1));
    }, 180);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => { if (playing && visible >= BARS.length) setPlaying(false); }, [playing, visible]);

  function replay() {
    setVisible(18);
    setPlaying(true);
  }

  const cursor = BARS[Math.max(0, visible - 1)].timestamp;
  const winRate = completedTrades.length ? (wins.length / completedTrades.length) * 100 : 0;
  const profitFactor = grossLoss ? grossWin / grossLoss : null;

  return <section className="bt-demo" aria-labelledby="bt-demo-title">
    <div className="bt-demo-heading">
      <div>
        <div className="bt-demo-badge"><Sparkles size={13}/> Démo interactive · données fictives</div>
        <h2 id="bt-demo-title">Voici à quoi ressemble une session de backtest.</h2>
        <p>Le graphique est généré dans PipsEvo. TradingView Lightweight Charts™ l’affiche, mais les bougies viennent des données du Backtest Lab.</p>
      </div>
      <div className="bt-demo-actions">
        <button type="button" className="btn-secondary" onClick={onImport}>Importer mes données</button>
        <button type="button" className="btn-primary" onClick={onCreate}>Créer une vraie session</button>
      </div>
    </div>

    <div className="bt-demo-toolbar" aria-label="Configuration fictive de la démonstration">
      <span><small>Marché</small><strong>NQ · Nasdaq futures</strong></span>
      <span><small>Unité de temps</small><strong>1 minute</strong></span>
      <span><small>Stratégie</small><strong>Breakout New York</strong></span>
      <span><small>Capital initial</small><strong>{usd(50000)}</strong></span>
    </div>

    <div className="bt-demo-workspace">
      <div className="min-w-0 space-y-3">
        <ReplayChart bars={BARS} cursor={cursor} timeframe="1m" timezone="Europe/Paris" position={null} tickSize="0.25" />
        <div className="bt-demo-replay" role="group" aria-label="Contrôles de la démonstration">
          <button type="button" className="pe-icon-button" onClick={replay} aria-label="Recommencer la démonstration"><RotateCcw size={17}/></button>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => finished ? replay() : setPlaying(value => !value)}>
            {playing ? <Pause size={15}/> : finished ? <RotateCcw size={15}/> : <Play size={15}/>}
            {playing ? "Pause" : finished ? "Rejouer la démo" : "Lecture"}
          </button>
          <button type="button" className="pe-icon-button" disabled={finished} onClick={() => { setPlaying(false); setVisible(value => Math.min(BARS.length, value + 1)); }} aria-label="Bougie suivante"><ChevronRight size={18}/></button>
          <span>{new Date(cursor * 1000).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}</span>
        </div>
      </div>

      <aside className="bt-demo-results">
        <div className="bt-demo-results-head"><span>Résultats simulés</span><strong>FICTIFS</strong></div>
        <div className="bt-demo-equity"><small>Solde de démonstration</small><strong>{usd(50000 + net)}</strong><span className={metricTone(net)}>{net >= 0 ? "+" : ""}{usd(net)}</span></div>
        <div className="bt-demo-metrics">
          <div><small>P&amp;L net</small><strong className={metricTone(net)}>{net >= 0 ? "+" : ""}{usd(net)}</strong></div>
          <div><small>Win rate</small><strong>{completedTrades.length ? `${winRate.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : "—"}</strong></div>
          <div><small>Profit factor</small><strong>{profitFactor ? profitFactor.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</strong></div>
          <div><small>Drawdown max</small><strong className="text-[#F26A70]">{losses.length ? usd(-215) : "—"}</strong></div>
        </div>
        <div className="bt-demo-trades">
          <div className="bt-demo-trades-title"><span>Trades clôturés</span><strong>{completedTrades.length}</strong></div>
          {completedTrades.length ? completedTrades.slice().reverse().map((trade, index) => <div className="bt-demo-trade" key={`${trade.closeIndex}-${index}`}>
            <span><b>{trade.side}</b><small>NQ · {trade.exit}</small></span>
            <strong className={metricTone(trade.result)}>{trade.result > 0 ? "+" : ""}{usd(trade.result)}<small>{trade.r > 0 ? "+" : ""}{trade.r.toFixed(2)}R</small></strong>
          </div>) : <p>Aucun trade clôturé pour le moment.</p>}
        </div>
      </aside>
    </div>
    <p className="bt-demo-disclaimer">Cette démonstration sert uniquement à présenter l’interface. Elle n’est pas sauvegardée, n’utilise aucun compte connecté et ne représente aucune performance réelle.</p>
  </section>;
}
