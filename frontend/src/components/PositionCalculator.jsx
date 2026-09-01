import React, { useMemo, useState } from "react";
import { Calculator, Info, Ruler, SlidersHorizontal } from "lucide-react";
import {
  CFD_ASSETS,
  FUTURES_CONTRACTS,
  calculateCfdSize,
  calculateFuturesSize,
} from "@/lib/positionSizing";

const USD = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PositionCalculator({ defaultMode = "cfd" }) {
  const [mode, setMode] = useState(defaultMode === "futures" ? "futures" : "cfd");
  const [common, setCommon] = useState({ capital: 50000, riskPercent: 1 });
  const [cfd, setCfd] = useState({ assetId: "EURUSD", stopDistance: 20, pointValue: 10 });
  const [futures, setFutures] = useState({ contractId: "MNQ", stopTicks: 40 });

  const cfdAsset = CFD_ASSETS.find(item => item.id === cfd.assetId) || CFD_ASSETS[0];
  const futureContract = FUTURES_CONTRACTS.find(item => item.id === futures.contractId) || FUTURES_CONTRACTS[0];
  const cfdResult = useMemo(
    () => calculateCfdSize({ ...common, stopDistance: cfd.stopDistance, pointValue: cfd.pointValue }),
    [common, cfd.stopDistance, cfd.pointValue],
  );
  const futuresResult = useMemo(
    () => calculateFuturesSize({ ...common, stopTicks: futures.stopTicks, tickValue: futureContract.tickValue }),
    [common, futures.stopTicks, futureContract.tickValue],
  );

  const changeCommon = key => event => setCommon(current => ({ ...current, [key]: event.target.value }));
  const selectCfdAsset = event => {
    const asset = CFD_ASSETS.find(item => item.id === event.target.value) || CFD_ASSETS[0];
    setCfd(current => ({ ...current, assetId: asset.id, pointValue: asset.pointValue }));
  };
  const changeCfd = key => event => setCfd(current => ({ ...current, [key]: event.target.value }));
  const changeFutures = key => event => setFutures(current => ({ ...current, [key]: event.target.value }));

  return (
    <div className="pe-card pe-card-pad">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="pe-section-title flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#4F8CFF]" />
            Calculateur de position
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">Dimensionne la position avant d'entrer en marché.</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Type de marché">
          {[["cfd", "CFD / Forex"], ["futures", "Futures"]].map(([value, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={mode === value}
              key={value}
              onClick={() => setMode(value)}
              className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition-colors ${mode === value ? "bg-[#7C4DFF] text-white" : "text-[#8E95A6] hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Capital de référence (USD)" value={common.capital} onChange={changeCommon("capital")} min="0" step="100" />
        <Field label="Risque maximal (%)" value={common.riskPercent} onChange={changeCommon("riskPercent")} min="0" step="0.1" />
      </div>

      {mode === "cfd" ? (
        <div key="cfd-panel" role="tabpanel" className="mt-3">
          <label className="text-xs font-medium text-[#9CA3AF]">
            Actif
            <select value={cfd.assetId} onChange={selectCfdAsset} className="pe-control mt-2 w-full">
              {CFD_ASSETS.map(asset => <option value={asset.id} key={asset.id}>{asset.label} · {asset.family}</option>)}
            </select>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label={`Distance du stop (${cfdAsset.stopUnit}${Number(cfd.stopDistance) > 1 ? "s" : ""})`}
              value={cfd.stopDistance}
              onChange={changeCfd("stopDistance")}
              min="0"
              step="0.1"
            />
            <Field
              label={`Valeur d'un ${cfdAsset.stopUnit} par lot (USD)`}
              value={cfd.pointValue}
              onChange={changeCfd("pointValue")}
              min="0"
              step="0.01"
            />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#4F8CFF]/15 bg-[#4F8CFF]/5 p-3 text-xs leading-relaxed text-[#8E9BB5]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4F8CFF]" />
            <span>{cfdAsset.hint}. La taille de contrat et la valeur du point peuvent varier selon le courtier.</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Out label="Budget de risque" value={USD.format(cfdResult.riskAmount)} color="#FFB855" />
            <Out label="Risque pour 1 lot" value={USD.format(cfdResult.lossPerLot)} color="#B58BFF" />
            <Out label="Taille théorique" value={`${cfdResult.lots.toFixed(2)} lots`} color="#4F8CFF" />
          </div>
        </div>
      ) : (
        <div key="futures-panel" role="tabpanel" className="mt-3">
          <label className="text-xs font-medium text-[#9CA3AF]">
            Contrat Futures
            <select value={futures.contractId} onChange={changeFutures("contractId")} className="pe-control mt-2 w-full">
              {FUTURES_CONTRACTS.map(contract => <option value={contract.id} key={contract.id}>{contract.label} · {contract.group}</option>)}
            </select>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Stop loss (ticks)" value={futures.stopTicks} onChange={changeFutures("stopTicks")} min="0" step="1" />
            <ReadOnly label="Taille du tick" value={futureContract.tickSize} icon={<Ruler className="h-4 w-4" />} />
            <ReadOnly label="Valeur du tick" value={USD.format(futureContract.tickValue)} icon={<SlidersHorizontal className="h-4 w-4" />} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Out label="Budget de risque" value={USD.format(futuresResult.riskBudget)} color="#FFB855" />
            <Out label="Risque par contrat" value={USD.format(futuresResult.lossPerContract)} color="#B58BFF" />
            <Out label="Contrats maximum" value={`${futuresResult.contracts} contrat${futuresResult.contracts > 1 ? "s" : ""}`} color="#4F8CFF" />
          </div>
          <div className="mt-3 flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-[#8E95A6] sm:flex-row sm:items-center sm:justify-between">
            <span>Risque réel estimé : <strong className="text-white">{USD.format(futuresResult.actualRisk)}</strong></span>
            <span>Marge de risque non utilisée : <strong className="text-[#00E6B8]">{USD.format(futuresResult.unusedRisk)}</strong></span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#6B7280]">
            Valeurs de tick CME en USD. Estimation hors commissions, frais et slippage ; vérifie toujours le contrat et l'échéance chez ton courtier.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, ...inputProps }) {
  return <label className="text-xs font-medium text-[#9CA3AF]">{label}<input type="number" className="pe-control mt-2 w-full" {...inputProps} /></label>;
}

function ReadOnly({ label, value, icon }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5"><div className="text-xs font-medium text-[#7F8798]">{label}</div><div className="mt-2 flex items-center gap-2 font-numeric text-sm font-semibold text-white">{icon}{value}</div></div>;
}

function Out({ label, value, color }) {
  return <div className="card-flat p-4"><div className="text-pe-caption text-[#9CA3AF]">{label}</div><div className="font-numeric mt-2 text-xl font-bold sm:text-2xl" style={{ color }}>{value}</div></div>;
}
