const numberOrNull = value => value === "" || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);

export const calculateDuration = (entryTime, exitTime) => {
  if (!entryTime || !exitTime) return null;
  const [eh,em]=entryTime.split(":").map(Number); const [xh,xm]=exitTime.split(":").map(Number);
  if (![eh,em,xh,xm].every(Number.isFinite)) return null;
  let minutes=(xh*60+xm)-(eh*60+em); if(minutes<0) minutes+=24*60;
  const hours=Math.floor(minutes/60); const rest=minutes%60;
  return {minutes,label:hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`};
};

export const calculateRMultiple = ({entry,stop,exit,direction}) => {
  const e=numberOrNull(entry), s=numberOrNull(stop), x=numberOrNull(exit);
  if (e===null || s===null || x===null || e===s) return null;
  const risk=direction === "short" ? s-e : e-s;
  if (risk<=0) return null;
  const result=direction === "short" ? e-x : x-e;
  return Number((result/risk).toFixed(2));
};

export const calculatePnl = ({entry,exit,direction,size,pointValue,commission=0}) => {
  const e=numberOrNull(entry), x=numberOrNull(exit), qty=numberOrNull(size), point=numberOrNull(pointValue), fees=numberOrNull(commission) ?? 0;
  if ([e,x,qty,point].some(value=>value===null) || qty<=0 || point<=0) return null;
  const movement=direction === "short" ? e-x : x-e;
  return Number((movement*qty*point-fees).toFixed(2));
};

export const validateTradePrices = ({entry,stop,takeProfit,direction}) => {
  const e=numberOrNull(entry), s=numberOrNull(stop), tp=numberOrNull(takeProfit); const warnings=[];
  if (e!==null && s!==null && ((direction==="long" && s>=e) || (direction==="short" && s<=e))) warnings.push(direction==="long" ? "Pour un achat, le stop est normalement inférieur à l’entrée." : "Pour une vente, le stop est normalement supérieur à l’entrée.");
  if (e!==null && tp!==null && ((direction==="long" && tp<=e) || (direction==="short" && tp>=e))) warnings.push(direction==="long" ? "Pour un achat, l’objectif est normalement supérieur à l’entrée." : "Pour une vente, l’objectif est normalement inférieur à l’entrée.");
  return warnings;
};

export const isFiniteOrBlank = value => value === "" || value === null || value === undefined || Number.isFinite(Number(value));

