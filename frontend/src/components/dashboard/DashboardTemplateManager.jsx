import React, { useEffect, useMemo, useState } from "react";
import { Check, LayoutTemplate, LockKeyhole, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DEFAULT_DASHBOARD_TEMPLATES, TEMPLATE_STORAGE_KEY } from "@/lib/dashboardTemplates";

const OPTIONAL_WIDGETS = [
  { id: "summary", label: "Indicateurs de performance", description: "P&L, win rate, profit factor et jours gagnants." },
  { id: "equity", label: "P&L cumulatif", description: "Évolution cumulée sur la période sélectionnée." },
  { id: "daily", label: "P&L journalier", description: "Résultat des sept dernières séances." },
  { id: "accounts", label: "Santé des comptes", description: "Aperçu des comptes suivis et de leur santé." },
];

const REQUIRED_WIDGETS = [
  "Drawdown disponible",
  "Répartition discipline",
  "Atlas",
  "Trades récents",
];

export function DashboardTemplateManager({ state, onChange }) {
  const [open, setOpen] = useState(false);
  const templates = useMemo(() => [...DEFAULT_DASHBOARD_TEMPLATES, ...state.custom], [state.custom]);
  const active = templates.find((template) => template.id === state.activeId) || DEFAULT_DASHBOARD_TEMPLATES[0];
  const [draft, setDraft] = useState(() => createDraft(active));

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const openBuilder = () => {
    setDraft(createDraft(active));
    setOpen(true);
  };

  const toggleWidget = (widgetId, checked) => {
    setDraft((current) => ({
      ...current,
      widgets: checked
        ? [...new Set([...current.widgets, widgetId])]
        : current.widgets.filter((id) => id !== widgetId),
    }));
  };

  const save = (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return toast.error("Donne un nom à ton template.");

    const id = draft.id || `custom-${Date.now()}`;
    const template = { id, name, accent: draft.accent, widgets: draft.widgets, builtIn: false };
    const custom = draft.id
      ? state.custom.map((item) => item.id === draft.id ? template : item)
      : [...state.custom, template];
    onChange({ activeId: id, custom });
    setOpen(false);
    toast.success(draft.id ? "Template mis à jour." : "Nouveau template créé.");
  };

  const removeActive = () => {
    if (active.builtIn) return;
    onChange({ activeId: "pipsevo", custom: state.custom.filter((item) => item.id !== active.id) });
    setOpen(false);
    toast.success("Template supprimé.");
  };

  return (
    <>
      <div className="flex h-9 min-w-0 items-center rounded-lg border border-[#6965D8]/25 bg-[#0C1122] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
        <label className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-[#8C85FF]" />
          <span className="sr-only">Template du Dashboard</span>
          <select
            value={active.id}
            onChange={(event) => onChange({ ...state, activeId: event.target.value })}
            className="min-w-0 flex-1 bg-transparent text-xs text-[#D7DAE7] outline-none"
            data-testid="dashboard-template-select"
          >
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={openBuilder}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#8E95A7] transition hover:bg-white/[0.06] hover:text-white"
          aria-label={active.builtIn ? "Créer un template à partir de cette vue" : "Modifier ce template"}
          data-testid="dashboard-template-open"
        >
          {active.builtIn ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[#7667E8]/25 bg-[#090D1A] sm:max-w-xl">
          <DialogHeader>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl border border-[#7764F2]/25 bg-[#7764F2]/10 text-[#9D91FF]">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <DialogTitle>{draft.id ? "Modifier mon template" : "Créer mon template"}</DialogTitle>
            <DialogDescription className="text-[#858DA1]">
              Choisis les analyses visibles. Les blocs indispensables restent toujours affichés.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-5">
            <div>
              <label htmlFor="dashboard-template-name" className="mb-2 block text-xs font-medium text-[#BFC5D4]">Nom du template</label>
              <Input
                id="dashboard-template-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex. Ma routine prop firm"
                maxLength={36}
                autoFocus
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-[#BFC5D4]">Couleur d’accent</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: "violet", label: "Violet PipsEvo", color: "#8067F4" }, { id: "blue", label: "Bleu électrique", color: "#4F8DFF" }].map((accent) => (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, accent: accent.id }))}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition ${draft.accent === accent.id ? "border-[#8376F3]/55 bg-[#7A66EE]/10 text-white" : "border-white/[0.08] bg-[#0D1222] text-[#9299AA] hover:border-white/[0.16]"}`}
                  >
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: accent.color }} />{accent.label}</span>
                    {draft.accent === accent.id && <Check className="h-4 w-4 text-[#9D91FF]" />}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-[#BFC5D4]">Blocs personnalisables</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {OPTIONAL_WIDGETS.map((widget) => {
                  const checked = draft.widgets.includes(widget.id);
                  return (
                    <label key={widget.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${checked ? "border-[#7767E8]/35 bg-[#7461E8]/[0.08]" : "border-white/[0.07] bg-[#0D1222] hover:border-white/[0.14]"}`}>
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleWidget(widget.id, value === true)} className="mt-0.5 border-[#7569D7] data-[state=checked]:bg-[#725BE2]" />
                      <span><span className="block text-xs font-medium text-[#D7DAE4]">{widget.label}</span><span className="mt-1 block text-[10px] leading-4 text-[#747D91]">{widget.description}</span></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-xl border border-[#4D83FF]/15 bg-[#4D83FF]/[0.055] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[#AFC9FF]"><LockKeyhole className="h-3.5 w-3.5" />Toujours inclus</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REQUIRED_WIDGETS.map((widget) => <span key={widget} className="rounded-md border border-white/[0.07] bg-[#0B1020] px-2 py-1 text-[9px] text-[#8792A8]">{widget}</span>)}
              </div>
            </div>

            <DialogFooter>
              {draft.id && <Button type="button" variant="ghost" onClick={removeActive} className="mr-auto text-[#FF7E8B] hover:bg-[#FF5266]/10 hover:text-[#FF9AA4]"><Trash2 />Supprimer</Button>}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">{draft.id ? "Enregistrer" : "Créer le template"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function createDraft(template) {
  return {
    id: template.builtIn ? null : template.id,
    name: template.builtIn ? `${template.name} personnalisé` : template.name,
    accent: template.accent || "violet",
    widgets: [...(template.widgets || [])],
  };
}
