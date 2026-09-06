import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { AUTH_CONFIG, hasCompletedOnboarding } from "@/config/auth";
import AuthLayout, { authFieldClass } from "@/components/auth/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (loading || googleBusy) return;
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(t("Bon retour !", "Welcome back!"));
      navigate(hasCompletedOnboarding(user) ? AUTH_CONFIG.authenticatedHomePath : AUTH_CONFIG.postSignUpPath, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || t("Connexion impossible", "Unable to sign in"));
    } finally { setLoading(false); }
  };
  return <AuthLayout>
    <p className="text-xs font-medium uppercase tracking-[.16em] text-[#B58BFF]">{t("Ton espace PipsEvo", "Your PipsEvo workspace")}</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("Bon retour.", "Welcome back.")}</h1>
    <p className="mb-7 mt-3 text-sm leading-6 text-[#A9B0C2]">{t("Retrouve ton espace de trading et reprends là où tu en étais.", "Return to your trading workspace and pick up where you left off.")}</p>
    <GoogleSignInButton disabled={loading} onBusyChange={setGoogleBusy} />
    <div className="my-6 flex items-center gap-4 text-xs text-[#929AAF]"><span className="h-px flex-1 bg-white/10" />{t("ou avec ton e-mail", "or with your email")}<span className="h-px flex-1 bg-white/10" /></div>
    <form onSubmit={submit} className="space-y-5" aria-busy={loading || googleBusy}>
      <div><label htmlFor="login-email" className="text-sm text-[#B5BBC9]">{t("Adresse e-mail", "Email address")}</label><input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="alex@email.com" data-testid="login-email" className={authFieldClass} /></div>
      <div><div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="login-password" className="text-sm text-[#B5BBC9]">{t("Mot de passe", "Password")}</label><Link to="/forgot-password" data-testid="forgot-password-link" className="text-xs text-[#B58BFF] hover:text-white">{t("Mot de passe oublié ?", "Forgot password?")}</Link></div><PasswordField id="login-password" name="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} data-testid="login-password" /></div>
      <button type="submit" disabled={loading || googleBusy} className="btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-60" data-testid="login-submit">{loading ? t("Connexion…", "Signing in…") : <>{t("Se connecter", "Sign in")}<ArrowRight size={16} /></>}</button>
    </form>
    <p className="mt-7 border-t border-white/[.07] pt-6 text-center text-sm text-[#A9B0C2]">{t("Pas encore de compte ?", "New to PipsEvo?")} <Link to="/register" className="font-medium text-[#B58BFF] hover:text-white" data-testid="login-go-register">{t("Créer un compte", "Create an account")}</Link></p>
    <p className="mt-4 text-center text-xs text-[#929AAF]">{t("Accès gratuit pendant la bêta. Sans carte bancaire.", "Free beta access. No credit card required.")}</p>
  </AuthLayout>;
}
