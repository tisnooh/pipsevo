import React, { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { CheckCircle2, Loader2, MailWarning, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import AuthLayout from "../components/auth/AuthLayout";
import { getOAuthDestination, getOAuthError } from "../lib/googleAuth";

export default function AuthCallback() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [error] = useState(() => getOAuthError(location.search, location.hash));
  const confirmationReturn = new URLSearchParams(location.search).has("next");
  // The existing Supabase client consumes the token fragment. AuthProvider then
  // hydrates the application profile; never create a second session or profile.
  const confirmedDestination = !error && !loading && getOAuthDestination(user);
  const destination = confirmationReturn ? null : confirmedDestination;
  if (destination) return <Navigate to={destination} replace />;
  return <AuthLayout>
    {!error && loading ? <div role="status" className="py-12 text-center"><Loader2 className="mx-auto mb-5 h-7 w-7 animate-spin text-[#B58BFF]" /><h1 className="text-2xl font-semibold">{t("Connexion à ton espace…", "Signing you in…")}</h1><p className="mt-3 text-sm text-[#A9B0C2]">{t("Nous vérifions ta session et ton profil.", "Checking your session and profile.")}</p></div> : confirmationReturn && confirmedDestination ? <div role="status" className="py-8">
      <CheckCircle2 className="mb-5 h-9 w-9 text-[#00E676]" />
      <h1 className="text-2xl font-semibold">{t("Adresse confirmée", "Email confirmed")}</h1>
      <p className="mt-3 text-sm leading-6 text-[#A9B0C2]">{t("Ton compte PipsEvo est prêt. Continue vers ton espace pour terminer la configuration.", "Your PipsEvo account is ready. Continue to your workspace to finish setup.")}</p>
      <Link to={confirmedDestination} replace className="btn-primary mt-6 inline-flex w-full justify-center">{t("Continuer vers PipsEvo", "Continue to PipsEvo")}</Link>
    </div> : <div role="alert" className="py-8">
      {error === "expired" ? <MailWarning className="mb-5 h-8 w-8 text-[#FFB855]" /> : error === "already_confirmed" ? <CheckCircle2 className="mb-5 h-9 w-9 text-[#00E676]" /> : <ShieldAlert className="mb-5 h-8 w-8 text-[#B58BFF]" />}
      <h1 className="text-2xl font-semibold">{error === "expired" ? t("Ce lien a expiré", "This link has expired") : error === "already_confirmed" ? t("Adresse déjà confirmée", "Email already confirmed") : error === "cancelled" ? t("Connexion annulée", "Sign-in cancelled") : t("La connexion n’a pas abouti", "Sign-in could not be completed")}</h1>
      <p className="mt-3 text-sm leading-6 text-[#A9B0C2]">{error === "expired" ? t("Demande un nouveau lien de confirmation ou de réinitialisation pour continuer en sécurité.", "Request a new confirmation or password reset link to continue securely.") : error === "already_confirmed" ? t("Cette adresse e-mail a déjà été vérifiée. Tu peux te connecter à PipsEvo.", "This email address has already been verified. You can sign in to PipsEvo.") : user?.profile_loading_error ? t("Ta session est valide, mais ton profil n’a pas pu être chargé. Réessaie dans quelques instants.", "Your session is valid, but your profile could not be loaded. Please try again shortly.") : t("Réessaie avec Google ou utilise ton adresse e-mail pour te connecter.", "Try Google again or sign in with your email address.")}</p>
      {error === "expired" ? <div className="mt-6 grid gap-3"><Link to="/verify-email" className="btn-primary inline-flex w-full justify-center">{t("Renvoyer la confirmation", "Resend confirmation")}</Link><Link to="/forgot-password" className="btn-ghost inline-flex w-full justify-center">{t("Réinitialiser mon mot de passe", "Reset my password")}</Link></div> : user?.profile_loading_error ? <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6 w-full">{t("Réessayer", "Try again")}</button> : <Link to="/login" replace className="btn-primary mt-6 inline-flex w-full justify-center">{error === "already_confirmed" ? t("Se connecter", "Sign in") : t("Retour à la connexion", "Back to sign in")}</Link>}
    </div>}
  </AuthLayout>;
}
