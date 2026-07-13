import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { DEFAULT_CHECKLIST, MARKET_INSTRUMENTS, createDefaultJournalPreferences, getInstrumentsForMarket, makeCustomOption, normalizeJournalPreferences } from "@/lib/journalPreferences";

const GROUPS = [
  ["instruments","Instruments favoris"],["sessions","Sessions"],["setups","Setups"],["emotions","Émotions"],
  ["durations","Durées"],["mistakes","Erreurs fréquentes"],["exitReasons","Raisons de sortie"],["tags","Tags"],["checklist","Checklist avant trade"],
];

const move = (items,index,delta) => { const next=[...items]; const target=index+delta; if(target<0||target>=next.length)return next; [next[index],next[target]]=[next[target],next[index]]; return next; };

export default function JournalPreferencesEditor({ value, onChange, checklist, onChecklistChange }) {
  const prefs=normalizeJournalPreferences(value); const [active,setActive]=useState("instruments"); const [draft,setDraft]=useState(""); const [market,setMarket]=useState("futures");
  const items=useMemo(()=>active==="instruments" ? getInstrumentsForMarket("both",prefs) : active==="checklist" ? checklist : prefs[active],[active,prefs,checklist]);
  const favorites=new Set(active==="instruments" ? prefs.favoriteInstruments : prefs.favorites?.[active] || []);

  const updateItems = next => active === "checklist" ? onChecklistChange(next) : onChange({...prefs,[active]:next});
  const updateLabel=(item,label)=>{
    if(active==="instruments") {
      if(item.custom) onChange({...prefs,customInstruments:prefs.customInstruments.map(current=>current.id===item.id?{...current,label}:current)});
      else onChange({...prefs,instrumentLabels:{...prefs.instrumentLabels,[item.id]:label}});
    } else updateItems(items.map(current=>current.id===item.id?{...current,label}:current));
  };
  const toggleHidden=item=>{
    if(active==="instruments") {const ids=prefs.hiddenInstruments;onChange({...prefs,hiddenInstruments:ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id]});}
    else if(active==="checklist") updateItems(items.map(current=>current.id===item.id?{...current,enabled:current.enabled===false}:current));
    else updateItems(items.map(current=>current.id===item.id?{...current,hidden:!current.hidden}:current));
  };
  const toggleFavorite=item=>{
    if(active==="checklist") return;
    if(active==="instruments") {const ids=prefs.favoriteInstruments;onChange({...prefs,favoriteInstruments:ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id]});}
    else {const ids=prefs.favorites[active] || [];onChange({...prefs,favorites:{...prefs.favorites,[active]:ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id]}});}
  };
  const moveItem=(item,delta)=>{
    const index=items.findIndex(current=>current.id===item.id); const next=move(items,index,delta);
    if(active==="instruments") onChange({...prefs,instrumentOrder:next.map(current=>current.id)}); else updateItems(next);
  };
  const add=()=>{
    const label=draft.trim();if(!label)return;
    if(active==="instruments") onChange({...prefs,customInstruments:[...prefs.customInstruments,makeCustomOption("instrument",label,{market})]});
    else if(active==="checklist") onChecklistChange([...checklist,{...makeCustomOption("check",label),enabled:true,required:false}]);
    else updateItems([...items,makeCustomOption(active,label)]);
    setDraft("");
  };
  const restore=()=>{
    const defaults=createDefaultJournalPreferences();
    if(active==="instruments") onChange({...prefs,favoriteInstruments:[],hiddenInstruments:[],customInstruments:[],instrumentLabels:{},instrumentOrder:[]});
    else if(active==="checklist") onChecklistChange(DEFAULT_CHECKLIST.map(item=>({...item})));
    else onChange({...prefs,[active]:defaults[active],favorites:{...prefs.favorites,[active]:[]}});
  };

  return <div className="space-y-5">
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">{GROUPS.map(([id,label])=><button type="button" key={id} onClick={()=>setActive(id)} aria-pressed={active===id} className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${active===id?"border-[#7C4DFF] bg-[#7C4DFF]/15 text-white":"border-white/10 text-[#7E8798] hover:text-white"}`}>{label}</button>)}</div>
    <div className="rounded-2xl border border-white/[0.07] bg-[#090C15] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">{GROUPS.find(([id])=>id===active)?.[1]}</h3><p className="mt-1 text-xs text-[#687183]">Les valeurs masquées restent visibles dans les anciens trades, mais ne sont plus proposées pour les nouveaux.</p></div><button type="button" onClick={restore} className="btn-ghost inline-flex w-full items-center justify-center gap-2 text-xs sm:w-auto"><RotateCcw className="h-3.5 w-3.5"/>Restaurer les valeurs par défaut</button></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">{active==="instruments"&&<select value={market} onChange={e=>setMarket(e.target.value)} className="rounded-xl border border-white/10 bg-[#0D1020] px-3 py-2.5 text-xs text-white outline-none focus:border-[#7C4DFF]"><option value="futures">Futures</option><option value="cfd">CFD / Forex</option></select>}<input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}} maxLength={100} placeholder="Ajouter une option…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0D1020] px-4 py-2.5 text-sm outline-none focus:border-[#7C4DFF]"/><button type="button" onClick={add} disabled={!draft.trim()} className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-40 sm:w-auto"><Plus className="h-4 w-4"/>Ajouter</button></div>
      <div className="mt-4 grid gap-2">{items.map((item,index)=>{const hidden=active==="instruments"?prefs.hiddenInstruments.includes(item.id):active==="checklist"?item.enabled===false:item.hidden;return <div key={item.id} className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center ${hidden?"border-white/[0.04] bg-white/[0.01] opacity-55":"border-white/[0.07] bg-white/[0.025]"}`}><input value={item.label} onChange={e=>updateLabel(item,e.target.value)} aria-label={`Modifier ${item.label}`} className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none focus:border-[#7C4DFF]/50"/><div className="flex flex-wrap items-center justify-end gap-1">{active!=="checklist"&&<button type="button" onClick={()=>toggleFavorite(item)} aria-label={favorites.has(item.id)?"Retirer des favoris":"Ajouter aux favoris"} aria-pressed={favorites.has(item.id)} className={`grid h-8 w-8 place-items-center rounded-lg ${favorites.has(item.id)?"bg-[#FFB855]/10 text-[#FFB855]":"text-[#687183] hover:bg-white/5"}`}><Star className={`h-3.5 w-3.5 ${favorites.has(item.id)?"fill-current":""}`}/></button>}<button type="button" disabled={index===0} onClick={()=>moveItem(item,-1)} aria-label="Monter" className="grid h-8 w-8 place-items-center rounded-lg text-[#687183] hover:bg-white/5 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5"/></button><button type="button" disabled={index===items.length-1} onClick={()=>moveItem(item,1)} aria-label="Descendre" className="grid h-8 w-8 place-items-center rounded-lg text-[#687183] hover:bg-white/5 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5"/></button><button type="button" onClick={()=>toggleHidden(item)} aria-label={hidden?"Afficher":"Masquer"} className="grid h-8 w-8 place-items-center rounded-lg text-[#687183] hover:bg-white/5">{hidden?<Eye className="h-3.5 w-3.5"/>:<EyeOff className="h-3.5 w-3.5"/>}</button><button type="button" onClick={()=>{if(!hidden)toggleHidden(item)}} aria-label="Supprimer des nouveaux choix" title="Masque l’option sans modifier les anciens trades" className="grid h-8 w-8 place-items-center rounded-lg text-[#687183] hover:bg-[#FF5252]/10 hover:text-[#FF6B76]"><Trash2 className="h-3.5 w-3.5"/></button></div></div>})}</div>
    </div>
  </div>;
}
