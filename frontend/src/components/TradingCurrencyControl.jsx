export default function TradingCurrencyControl({ currency, currencies, setCurrency }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--pe-text-muted)]">
    <label className="flex items-center gap-2">Devise des résultats
      <select aria-label="Devise des résultats" value={currency} onChange={event => setCurrency(event.target.value)} className="pe-control !min-h-9 !h-9 !px-3 text-xs">
        {(currencies.length ? currencies : [currency]).map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <span>Devises séparées · aucune conversion automatique</span>
  </div>;
}
