import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithGoogle } from "../../lib/googleAuth";
import { useI18n } from "../../context/I18nContext";

export default function GoogleSignInButton({ disabled = false, beforeSignIn, onBusyChange }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const start = async () => {
    if (busy || disabled || (beforeSignIn && !beforeSignIn())) return;
    setBusy(true);
    setError(false);
    onBusyChange?.(true);
    try {
      await signInWithGoogle();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return <div>
    <button type="button" onClick={start} disabled={disabled || busy} aria-busy={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/[.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B58BFF] disabled:cursor-wait disabled:opacity-60" data-testid="google-sign-in">
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>}
      {busy ? t("Connexion à Google…", "Connecting to Google…") : t("Continuer avec Google", "Continue with Google")}
    </button>
    {error && <p role="alert" className="mt-3 text-sm leading-5 text-[#FFB855]">{t("La connexion Google est momentanément indisponible. Tu peux continuer avec ton adresse e-mail.", "Google sign-in is temporarily unavailable. You can continue with your email address.")}</p>}
  </div>;
}
