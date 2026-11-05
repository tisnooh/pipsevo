export const INITIAL_PROJECTION = Object.freeze({ capital: 10000, trades: 100, winrate: 55, gain: 2, loss: 1, risk: 1 });

export function projectionInputs(input) {
  if (Object.keys(INITIAL_PROJECTION).some(key => input?.[key] == null || typeof input[key] === "boolean" || String(input[key]).trim() === "")) return null;
  const values = Object.fromEntries(Object.keys(INITIAL_PROJECTION).map(key => [key, Number(input?.[key])]));
  if (Object.values(values).some(value => !Number.isFinite(value)) ||
      values.capital <= 0 || values.capital > 100000000 || !Number.isInteger(values.trades) ||
      values.trades < 1 || values.trades > 5000 || values.winrate < 0 || values.winrate > 100 ||
      values.gain <= 0 || values.gain > 100 || values.loss <= 0 || values.loss > 100 ||
      values.risk <= 0 || values.risk > 10 || values.risk * values.loss >= 100) return null;
  return values;
}

export function calculateProjection(input) {
  const values = projectionInputs(input);
  if (!values) throw new Error("Paramètres invalides. Utilise des nombres finis, 1 à 5 000 trades entiers et une perte inférieure au capital risqué.");
  const { capital, trades, winrate, gain, loss, risk } = values;
  const wins = Math.round(trades * winrate / 100);
  let equity = capital, peak = capital, maxDd = 0;
  const curve = [capital];
  for (let index = 0; index < trades; index += 1) {
    // An evenly spaced, deterministic sequence, not a market forecast or Monte Carlo sample.
    const isWin = Math.floor((index + 1) * wins / trades) > Math.floor(index * wins / trades);
    equity *= 1 + (risk / 100) * (isWin ? gain : -loss);
    if (!Number.isFinite(equity) || equity > 1e15 || equity < 1e-8) {
      throw new Error("Cette hypothèse dépasse la plage de calcul fiable. Réduis le nombre de trades, les gains ou le risque.");
    }
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak * 100);
    curve.push(equity);
  }
  const minimum = Math.min(...curve), maximum = Math.max(...curve);
  return { final: equity, profit: equity - capital, maxDd, expectancy: winrate / 100 * gain - (1 - winrate / 100) * loss,
    actualWinrate: wins / trades * 100, wins, losses: trades - wins, curve,
    points: curve.map((value, index) => `${index / trades * 600},${170 - (value - minimum) / (maximum - minimum || 1) * 155}`).join(" ") };
}
