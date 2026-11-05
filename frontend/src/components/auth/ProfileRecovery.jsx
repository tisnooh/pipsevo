import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ProfileRecovery({ suspended = false }) {
  const { refreshProfile, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const run = async action => {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch { toast.error("La session n’a pas pu être actualisée. Réessaie dans un instant."); }
    finally { setBusy(false); }
  };
  return <main className="grid min-h-screen place-items-center bg-pe-canvas px-4 py-12 text-pe-text">
    <section role="alert" className="pe-card w-full max-w-lg p-6 sm:p-8">
      <h1 className="text-xl font-semibold">{suspended ? "Ton accès est suspendu" : "Ton profil n’a pas pu être chargé"}</h1>
      <p className="pe-page-copy mt-3">{suspended ? "Ton compte n’est pas actif. Les fonctionnalités privées restent fermées. Si ton accès a été rétabli, actualise ton profil ; sinon, contacte le support." : "Ta session est reconnue, mais tes paramètres restent indisponibles. Pour protéger tes données, la configuration et les modifications sont suspendues jusqu’au chargement de ton profil."}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={busy || !refreshProfile} onClick={() => run(refreshProfile)} className="btn-primary disabled:opacity-50">{busy ? "Actualisation…" : "Réessayer"}</button>
        <button type="button" disabled={busy} onClick={() => run(() => logout())} className="btn-ghost disabled:opacity-50">Se déconnecter</button>
      </div>
    </section>
  </main>;
}
