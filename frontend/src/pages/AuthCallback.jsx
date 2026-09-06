import React, { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import AuthLayout from "../components/auth/AuthLayout";
import { getOAuthDestination, getOAuthError } from "../lib/googleAuth";

export default function AuthCallback() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [error] = useState(() => getOAuthError(location.search, location.hash));
  // The existing Supabase client consumes the token fragment. AuthProvider then
  // hydrates the application profile; never create a second session or profile.
  const destination = !error && !loading && getOAuthDestination(user);
  if (destination) return <Navigate to={destination} replace />;
  return <AuthLayout>
    {!error && loading ? <div role="status" className="py-12 text-center"><Loader2 className="mx-auto mb-5 h-7 w-7 animate-spin text-[#B58BFF]" /><h1 className="text-2xl font-semibold">{t("Connexion à ton espace…", "Signing you in…")}</h1><p className="mt-3 text-sm text-[#A9B0C2]">{t("Nous vérifions ta session et ton profil.", "Checking your session and profile.")}</p></div> : <div role="alert" className="py-8">
      <ShieldAlert className="mb-5 h-8 w-8 text-[#B58BFF]" />
      <h1 className="text-2xl font-semibold">{error === "cancelled" ? t("Connexion annulée", "Sign-in cancelled") : t("La connexion n’a pas abouti", "Sign-in could not be completed")}</h1>
      <p className="mt-3 text-sm leading-6 text-[#A9B0C2]">{user?.profile_loading_error ? t("Ta session est valide, mais ton profil n’a pas pu être chargé. Réessaie dans quelques instants.", "Your session is valid, but your profile could not be loaded. Please try again shortly.") : t("Réessaie avec Google ou utilise ton adresse e-mail pour te connecter.", "Try Google again or sign in with your email address.")}</p>
      {user?.profile_loading_error ? <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6 w-full">{t("Réessayer", "Try again")}</button> : <Link to="/login" replace className="btn-primary mt-6 inline-flex w-full justify-center">{t("Retour à la connexion", "Back to sign in")}</Link>}
    </div>}
  </AuthLayout>;
}
