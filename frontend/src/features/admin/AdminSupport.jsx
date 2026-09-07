import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi } from "./api";
import { Empty, LoadState, Page, Pagination, RefreshButton, Status, extractError, formatDate, useAdminData } from "./ui";

export function AdminSupport() {
  const [page, setPage] = useState(1), [filter, setFilter] = useState(""), [search, setSearch] = useState("");
  const state = useAdminData(() => adminApi.support({ page, per_page: 25, status: filter || undefined, search }), [page, filter, search]);
  return <Page eyebrow="RELATION UTILISATEUR" title="Support" description="Demandes réelles reçues par la messagerie PipsEvo." actions={<RefreshButton onClick={state.reload} />}>
    <div className="admin-filters"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ticket, sujet ou e-mail…" /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Tous les statuts</option><option value="open">Ouverts</option><option value="in_progress">En cours</option><option value="waiting_user">En attente utilisateur</option><option value="resolved">Résolus</option><option value="closed">Fermés</option></select></div>
    <LoadState {...state} />
    {state.data && <div className="admin-panel table-panel">{state.data.items.length ? <div className="admin-table-wrap"><table><thead><tr><th>Ticket</th><th>Demandeur</th><th>Statut</th><th>Priorité</th><th>Reçu</th></tr></thead><tbody>{state.data.items.map((item) => <tr key={item.id}><td><Link to={`/admin/support/${item.id}`}><strong>{item.subject}</strong><small>{item.id}</small></Link></td><td>{item.name}<small>{item.email}</small></td><td><Status value={item.status} /></td><td><Status value={item.priority} /></td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table></div> : <Empty />}<Pagination page={page} pages={state.data.pages} onChange={setPage} /></div>}
  </Page>;
}

export function AdminSupportDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const state = useAdminData(() => adminApi.supportTicket(ticketId), [ticketId]);
  const [message, setMessage] = useState(""), [kind, setKind] = useState("user_message"), [busy, setBusy] = useState(false);
  const update = async (payload) => { try { await adminApi.updateSupport(ticketId, payload); toast.success("Ticket mis à jour."); await state.reload(); } catch (error) { toast.error(extractError(error)); } };
  const send = async (event) => { event.preventDefault(); if (message.trim().length < 2) return; setBusy(true); try { await adminApi.replySupport(ticketId, { kind, message }); toast.success(kind === "internal_note" ? "Note interne ajoutée." : "Réponse envoyée."); setMessage(""); await state.reload(); } catch (error) { toast.error(extractError(error)); } finally { setBusy(false); } };
  const item = state.data;
  return <Page eyebrow="TICKET" title={item?.subject || ticketId} description={item ? `${item.name} · ${item.email}` : ""} actions={<><button className="admin-button secondary" onClick={() => navigate(-1)}>Retour</button><RefreshButton onClick={state.reload} /></>}>
    <LoadState {...state} />
    {item && <div className="admin-grid support-layout">
      <article className="admin-panel"><div className="admin-panel-head"><div><span>CONVERSATION</span><h2>Historique</h2></div><Status value={item.status} /></div><div className="admin-ticket-message initial"><small>{formatDate(item.created_at)} · utilisateur</small><p>{item.message}</p></div>{(item.messages || []).map((entry) => <div key={entry.id} className={`admin-ticket-message ${entry.kind}`}><small>{formatDate(entry.created_at)} · {entry.kind === "internal_note" ? "note interne" : entry.actor_email}</small><p>{entry.message}</p></div>)}<form className="admin-reply" onSubmit={send}><div><label><input type="radio" checked={kind === "user_message"} onChange={() => setKind("user_message")} /> Réponse utilisateur</label><label><input type="radio" checked={kind === "internal_note"} onChange={() => setKind("internal_note")} /> Note interne</label></div><textarea rows="6" maxLength="5000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={kind === "internal_note" ? "Visible uniquement par l’équipe…" : "Réponse envoyée par e-mail…"} /><button className="admin-button" disabled={busy || message.trim().length < 2}>{busy ? "Envoi…" : kind === "internal_note" ? "Ajouter la note" : "Envoyer la réponse"}</button></form></article>
      <aside className="admin-panel"><div className="admin-panel-head"><div><span>TRAITEMENT</span><h2>Qualification</h2></div></div><label>Statut<select value={item.status} onChange={(event) => update({ status: event.target.value })}><option value="open">Ouvert</option><option value="in_progress">En cours</option><option value="waiting_user">Attente utilisateur</option><option value="resolved">Résolu</option><option value="closed">Fermé</option></select></label><label>Priorité<select value={item.priority || "normal"} onChange={(event) => update({ priority: event.target.value })}><option value="low">Faible</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label><label>Assigné à<input key={item.assigned_to || "unassigned"} defaultValue={item.assigned_to || ""} onBlur={(event) => { if (event.target.value !== (item.assigned_to || "")) update({ assigned_to: event.target.value || null }); }} placeholder="E-mail ou équipe" /></label></aside>
    </div>}
  </Page>;
}
