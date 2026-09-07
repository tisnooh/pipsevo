import React, { useState } from "react";
import { toast } from "sonner";
import { useAdminSession } from "./AdminAccess";
import { adminApi } from "./api";
import { Empty, LoadState, Page, RefreshButton, Status, extractError, useAdminData } from "./ui";

const emptyFirm = {
  slug: "",
  name: "",
  logo_url: "",
  market_types_text: "",
  platforms_text: "",
  import_supported: false,
  auto_sync_supported: false,
  official_source: "",
  last_verified_at: "",
  active: true,
};

const toDraft = (item) => ({
  ...emptyFirm,
  ...(item || emptyFirm),
  market_types_text: (item?.market_types || []).join(", "),
  platforms_text: (item?.platforms || []).join(", "),
});

const splitValues = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

const toPayload = (draft) => ({
  slug: draft.slug.trim().toLowerCase(),
  name: draft.name.trim(),
  logo_url: draft.logo_url.trim() || null,
  market_types: splitValues(draft.market_types_text),
  platforms: splitValues(draft.platforms_text),
  import_supported: draft.import_supported,
  auto_sync_supported: draft.auto_sync_supported,
  official_source: draft.official_source.trim() || null,
  last_verified_at: draft.last_verified_at || null,
  active: draft.active,
});

function FirmForm({ selected, onCancel, onSaved }) {
  const [draft, setDraft] = useState(() => toDraft(selected));
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await adminApi.savePropFirm({ id: selected?.id, ...toPayload(draft) });
      toast.success(selected ? "Prop firm mise à jour." : "Prop firm ajoutée.");
      await onSaved();
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="admin-panel admin-form" onSubmit={submit}>
      <div className="admin-panel-head"><div><span>CATALOGUE</span><h2>{selected ? `Modifier ${selected.name}` : "Ajouter une prop firm"}</h2></div></div>
      <div className="admin-grid two compact">
        <label>Nom<input required minLength="2" maxLength="120" value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Identifiant<input required minLength="2" maxLength="80" pattern="[a-z0-9][a-z0-9-]+" value={draft.slug} onChange={(event) => update("slug", event.target.value)} /></label>
      </div>
      <label>URL du logo<input maxLength="500" placeholder="/brand/prop-firms/logo.svg" value={draft.logo_url} onChange={(event) => update("logo_url", event.target.value)} /></label>
      <label>Types de marchés<input placeholder="futures, forex" value={draft.market_types_text} onChange={(event) => update("market_types_text", event.target.value)} /></label>
      <label>Plateformes<input placeholder="MetaTrader 5, cTrader" value={draft.platforms_text} onChange={(event) => update("platforms_text", event.target.value)} /></label>
      <label>Source officielle<input type="url" placeholder="https://…" value={draft.official_source} onChange={(event) => update("official_source", event.target.value)} /></label>
      <label>Dernière vérification<input type="date" value={draft.last_verified_at} onChange={(event) => update("last_verified_at", event.target.value)} /></label>
      <label className="admin-check"><input type="checkbox" checked={draft.import_supported} onChange={(event) => update("import_supported", event.target.checked)} /> Import pris en charge</label>
      <label className="admin-check"><input type="checkbox" checked={draft.auto_sync_supported} onChange={(event) => update("auto_sync_supported", event.target.checked)} /> Synchronisation automatique prise en charge</label>
      <label className="admin-check"><input type="checkbox" checked={draft.active} onChange={(event) => update("active", event.target.checked)} /> Visible dans le catalogue</label>
      <div className="admin-head-actions"><button className="admin-button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button><button type="button" className="admin-button secondary" onClick={onCancel}>Annuler</button></div>
    </form>
  );
}

export default function AdminPropFirms() {
  const session = useAdminSession();
  const canWrite = session?.permissions?.includes("*") || session?.permissions?.includes("prop_firms.write");
  const state = useAdminData(adminApi.propFirms, []);
  const [editing, setEditing] = useState(undefined);
  const closeForm = () => setEditing(undefined);
  const reloadAndClose = async () => { await state.reload(); closeForm(); };

  const toggle = async (item) => {
    try {
      await adminApi.savePropFirm({ id: item.id, ...toPayload({ ...toDraft(item), active: !item.active }) });
      toast.success("Catalogue mis à jour.");
      await state.reload();
    } catch (error) {
      toast.error(extractError(error));
    }
  };

  return (
    <Page eyebrow="CATALOGUE" title="Prop firms et plateformes" description="Sources officielles et capacités réellement supportées par PipsEvo." actions={<><RefreshButton onClick={state.reload} />{canWrite && <button className="admin-button" onClick={() => setEditing(null)}>Ajouter</button>}</>}>
      {editing !== undefined && <FirmForm key={editing?.id || "new"} selected={editing} onCancel={closeForm} onSaved={reloadAndClose} />}
      <LoadState {...state} />
      {state.data && (state.data.items.length ? <div className="admin-cards">{state.data.items.map((item) => <article className="admin-panel firm-card" key={item.id}><div className="firm-logo">{item.logo_url ? <img src={item.logo_url} alt="" /> : item.name.slice(0, 2)}</div><div><h2>{item.name}</h2><span>{item.platforms.join(" · ") || "Aucune plateforme renseignée"}</span></div><Status value={item.active ? "active" : "inactive"} /><div className="firm-capabilities"><span>Import <strong>{item.import_supported ? "Oui" : "Non"}</strong></span><span>Auto-sync <strong>{item.auto_sync_supported ? "Oui" : "Non"}</strong></span><span>Vérifié <strong>{item.last_verified_at || "—"}</strong></span></div><div className="firm-actions">{item.official_source && <a href={item.official_source} target="_blank" rel="noreferrer">Source officielle</a>}<div className="admin-head-actions">{canWrite && <button className="admin-button secondary" onClick={() => setEditing(item)}>Modifier</button>}{canWrite && <button className={`admin-button ${item.active ? "danger" : "success"}`} onClick={() => toggle(item)}>{item.active ? "Désactiver" : "Réactiver"}</button>}</div></div></article>)}</div> : <Empty />)}
    </Page>
  );
}
