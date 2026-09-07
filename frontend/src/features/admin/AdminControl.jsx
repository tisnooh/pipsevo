import React, { useState } from "react";
import { toast } from "sonner";
import { adminApi } from "./api";
import {
  Empty,
  LoadState,
  Page,
  RefreshButton,
  Status,
  confirmAction,
  extractError,
  formatDate,
  useAdminData,
} from "./ui";

const defaultAnnouncement = {
  title: "",
  message: "",
  type: "info",
  audience: "all",
  audience_user_ids: [],
  starts_at: null,
  ends_at: null,
  dismissible: true,
  active: false,
};

const cleanRecord = (item, keys) => {
  const payload = { ...item };
  keys.forEach((key) => delete payload[key]);
  return payload;
};

export function AdminAnnouncements() {
  const state = useAdminData(adminApi.announcements, []);
  const [form, setForm] = useState(defaultAnnouncement);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.type === "critical" && form.active && !confirmAction("Publier cette annonce critique à l’audience sélectionnée ?")) return;
    setBusy(true);
    try {
      await adminApi.createAnnouncement(form);
      toast.success("Annonce créée.");
      setForm(defaultAnnouncement);
      await state.reload();
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    if (!confirmAction(`${item.active ? "Désactiver" : "Activer"} cette annonce ?`)) return;
    try {
      const payload = cleanRecord({ ...item, active: !item.active }, ["id", "created_at", "updated_at", "created_by"]);
      await adminApi.saveAnnouncement(item.id, payload);
      toast.success("Annonce mise à jour.");
      await state.reload();
    } catch (error) {
      toast.error(extractError(error));
    }
  };

  return (
    <Page eyebrow="COMMUNICATION" title="Annonces" description="Bannières ciblées dans le produit, avec dates de validité et désactivation immédiate." actions={<RefreshButton onClick={state.reload} />}>
      <div className="admin-grid controls-layout">
        <form className="admin-panel admin-form" onSubmit={submit}>
          <div className="admin-panel-head"><div><span>NOUVELLE ANNONCE</span><h2>Composer</h2></div></div>
          <label>Titre<input required minLength="2" maxLength="140" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Message<textarea required minLength="2" maxLength="2000" rows="5" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
          <div className="admin-grid two compact">
            <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="info">Information</option><option value="success">Succès</option><option value="warning">Avertissement</option><option value="critical">Critique</option></select></label>
            <label>Audience<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}><option value="all">Tous</option><option value="free">Free</option><option value="pro">Pro</option><option value="admins">Administrateurs</option></select></label>
          </div>
          <label className="admin-check"><input type="checkbox" checked={form.dismissible} onChange={(event) => setForm({ ...form, dismissible: event.target.checked })} /> Peut être masquée</label>
          <label className="admin-check"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Publier immédiatement</label>
          <button className="admin-button" disabled={busy}>{busy ? "Création…" : "Créer l’annonce"}</button>
        </form>
        <section className="admin-panel">
          <div className="admin-panel-head"><div><span>HISTORIQUE</span><h2>Annonces existantes</h2></div></div>
          <LoadState {...state} />
          {state.data?.items?.length ? <div className="admin-list">{state.data.items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.message}</span><small>{formatDate(item.created_at)} · {item.audience}</small></div><Status value={item.active ? item.type : "inactive"} /><button className={`admin-button ${item.active ? "danger" : "success"}`} onClick={() => toggle(item)}>{item.active ? "Désactiver" : "Activer"}</button></article>)}</div> : !state.loading && <Empty />}
        </section>
      </div>
    </Page>
  );
}

function FlagCard({ item, onSaved }) {
  const [draft, setDraft] = useState({ ...item, audience_values_text: (item.audience_values || []).join("\n") });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!confirmAction("Appliquer ce changement de déploiement ?")) return;
    setBusy(true);
    try {
      const payload = cleanRecord({
        ...draft,
        audience_values: draft.audience_values_text.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
      }, ["id", "created_at", "updated_at", "created_by", "updated_by", "audience_values_text"]);
      await adminApi.saveFlag({ id: item.id, ...payload });
      toast.success("Feature flag mis à jour.");
      await onSaved();
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="admin-panel flag-card">
      <div className="admin-panel-head"><div><span>{item.key}</span><h2>{item.name}</h2></div><Status value={draft.enabled ? "active" : "inactive"} /></div>
      <p>{item.description}</p>
      <label>Déploiement
        <select value={draft.rollout_percentage} onChange={(event) => setDraft({ ...draft, rollout_percentage: Number(event.target.value) })}>
          {[0, 10, 25, 50, 75, 100].map((value) => <option key={value} value={value}>{value}%</option>)}
        </select>
      </label>
      <label>Audience<select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}><option value="all">Tous</option><option value="admin_only">Admins uniquement</option><option value="specific_users">Utilisateurs ciblés</option><option value="plan">Par plan</option></select></label>
      {draft.audience !== "all" && draft.audience !== "admin_only" && <label>Valeurs ciblées<textarea rows="3" placeholder={draft.audience === "plan" ? "free, pro" : "Un identifiant utilisateur par ligne"} value={draft.audience_values_text} onChange={(event) => setDraft({ ...draft, audience_values_text: event.target.value })} /></label>}
      <label className="admin-check"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Fonctionnalité active</label>
      <button className="admin-button" onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le déploiement"}</button>
    </article>
  );
}

export function AdminFlags() {
  const state = useAdminData(adminApi.flags, []);
  return (
    <Page eyebrow="DÉPLOIEMENT" title="Feature flags" description="Activation contrôlée par audience et pourcentage. Réservé aux super administrateurs." actions={<RefreshButton onClick={state.reload} />}>
      <LoadState {...state} />
      {state.data && <div className="admin-cards">{state.data.items.map((item) => <FlagCard key={`${item.id}-${item.updated_at}`} item={item} onSaved={state.reload} />)}</div>}
    </Page>
  );
}

export function AdminIncidents() {
  const state = useAdminData(adminApi.incidents, []);
  const update = async (item, status) => {
    try {
      await adminApi.updateIncident(item.id, status);
      toast.success("Incident mis à jour.");
      await state.reload();
    } catch (error) {
      toast.error(extractError(error));
    }
  };
  return (
    <Page eyebrow="FIABILITÉ" title="Incidents" description="Erreurs techniques regroupées par source, sans secrets ni contenu utilisateur." actions={<RefreshButton onClick={state.reload} />}>
      <LoadState {...state} />
      {state.data && <div className="admin-panel table-panel">{state.data.items.length ? <div className="admin-table-wrap"><table><thead><tr><th>Incident</th><th>Source</th><th>Sévérité</th><th>Occurrences</th><th>Dernier signal</th><th>Statut</th></tr></thead><tbody>{state.data.items.map((item) => <tr key={item.id}><td><strong>{item.message}</strong><small>{item.error_code || item.id}</small></td><td>{item.source}</td><td><Status value={item.severity} /></td><td>{item.occurrences}</td><td>{formatDate(item.last_seen_at)}</td><td><select value={item.status} onChange={(event) => update(item, event.target.value)}><option value="open">Ouvert</option><option value="investigating">Investigation</option><option value="resolved">Résolu</option><option value="ignored">Ignoré</option></select></td></tr>)}</tbody></table></div> : <Empty />}</div>}
    </Page>
  );
}

export function AdminAudit() {
  const state = useAdminData(() => adminApi.audit({ per_page: 100 }), []);
  return (
    <Page eyebrow="SÉCURITÉ" title="Journal d’audit" description="Registre append-only des changements administratifs sensibles." actions={<RefreshButton onClick={state.reload} />}>
      <LoadState {...state} />
      {state.data && <div className="admin-panel table-panel">{state.data.items.length ? <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Administrateur</th><th>Action</th><th>Cible</th><th>Request ID</th></tr></thead><tbody>{state.data.items.map((item) => <tr key={item.id}><td>{formatDate(item.created_at)}</td><td>{item.actor_email || "Compte supprimé"}<small>{item.actor_id}</small></td><td><Status value={item.action} /></td><td>{item.target_type}<small>{item.target_id}</small></td><td>{item.request_id || "—"}</td></tr>)}</tbody></table></div> : <Empty />}</div>}
    </Page>
  );
}

function SettingRow({ item, onSaved }) {
  const [draft, setDraft] = useState(item.value);
  const [busy, setBusy] = useState(false);
  const save = async (value = draft) => {
    if (item.key === "maintenance_mode" && value === true && !confirmAction("Activer le mode maintenance ? Cette action affecte le produit.")) return;
    setBusy(true);
    try {
      await adminApi.saveSetting(item.key, value);
      toast.success("Réglage enregistré.");
      await onSaved();
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setBusy(false);
    }
  };
  const dirty = String(draft) !== String(item.value);
  return (
    <article className="admin-panel">
      <div><strong>{item.key.replaceAll("_", " ")}</strong><span>{item.description}</span><small>Mis à jour {formatDate(item.updated_at)}</small></div>
      {typeof item.value === "boolean" ? <button className={`admin-toggle ${item.value ? "on" : ""}`} role="switch" aria-checked={item.value} aria-label={`Modifier ${item.key}`} disabled={busy} onClick={() => save(!item.value)}><span /></button> : <div className="admin-setting-control"><input value={draft} onChange={(event) => setDraft(/^\d+$/.test(event.target.value) ? Number(event.target.value) : event.target.value)} /><button className="admin-button secondary" disabled={!dirty || busy} onClick={() => save()}>{busy ? "…" : "Enregistrer"}</button></div>}
    </article>
  );
}

export function AdminSettings() {
  const state = useAdminData(adminApi.settings, []);
  return (
    <Page eyebrow="SYSTÈME" title="Réglages" description="Liste volontairement limitée aux paramètres approuvés côté base de données." actions={<RefreshButton onClick={state.reload} />}>
      <LoadState {...state} />
      {state.data && <div className="admin-list settings-list">{state.data.items.map((item) => <SettingRow key={`${item.key}-${item.updated_at}`} item={item} onSaved={state.reload} />)}</div>}
    </Page>
  );
}
