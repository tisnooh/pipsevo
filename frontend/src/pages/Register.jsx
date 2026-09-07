import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { passwordValidation } from "@/lib/passwordSecurity";
import AuthLayout, { authFieldClass } from "@/components/auth/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function Register() {
  const { register } = useAuth();
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const terms = useRef(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const strength = Object.values(passwordValidation(password).checks).filter(Boolean).length;
  const submit = async (event) => {
    event.preventDefault();
    if (loading || googleBusy || !terms.current.reportValidity()) return;
    const validation = passwordValidation(password);
    if (!validation.valid) return toast.error(t(validation.message, "Use at least 8 characters, one uppercase letter and one number."));
    setLoading(true);
    try {
      const result = await register(email, password, name, language);
      if (result.requires_email_confirmation) {
        sessionStorage.setItem("pipsevo_pending_email", email.trim());
        navigate("/verify-email", { state: { email: email.trim() } });
        return;
      }
      toast.success(t("Compte créé. Configurons ton profil.", "Account created. Let's set up your profile."));
      navigate("/onboarding", { replace: true });
    } catch (error) { toast.error(error.response?.data?.detail || t("Inscription impossible", "Unable to create your account")); }
    finally { setLoading(false); }
  };
  return <AuthLayout>
    <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.16em] text-[#B58BFF]"><span className="h-1.5 w-1.5 rounded-full bg-[#00E676]" />{t("Inscription gratuite", "Free signup")}</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("Crée ton espace PipsEvo.", "Create your PipsEvo workspace.")}</h1>
    <p className="mt-3 text-sm leading-6 text-[#A9B0C2]">{t("Commence avec ton profil, puis ajoute tes comptes et tes premiers trades.", "Start with your profile, then add your accounts and first trades.")}</p>
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-xs leading-5 text-[#A9B0C2]">
      <input ref={terms} id="register-terms" name="terms" type="checkbox" required form="register-form" className="mt-0.5 h-4 w-4 shrink-0 accent-[#7C4DFF]" />
      <label htmlFor="register-terms">{t("J’accepte les", "I accept the")} <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#B58BFF] hover:text-white">{t("conditions d’utilisation", "terms of use")}</Link> {t("et la", "and")} <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B58BFF] hover:text-white">{t("politique de confidentialité", "privacy policy")}</Link>.</label>
    </div>
    <div className="mt-5"><GoogleSignInButton disabled={loading} onBusyChange={setGoogleBusy} beforeSignIn={() => terms.current.reportValidity()} /></div>
    <div className="my-5 flex items-center gap-4 text-xs text-[#929AAF]"><span className="h-px flex-1 bg-white/10" />{t("ou avec ton e-mail", "or with your email")}<span className="h-px flex-1 bg-white/10" /></div>
    <form id="register-form" onSubmit={submit} className="space-y-4" aria-busy={loading || googleBusy}>
      <div><label htmlFor="register-name" className="text-sm text-[#B5BBC9]">{t("Nom affiché", "Display name")}</label><input id="register-name" name="name" autoComplete="nickname" required value={name} onChange={event => setName(event.target.value)} placeholder={t("Ex. Alex", "E.g. Alex")} data-testid="register-name" className={authFieldClass} /></div>
      <div><label htmlFor="register-email" className="text-sm text-[#B5BBC9]">{t("Adresse e-mail", "Email address")}</label><input id="register-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="alex@email.com" data-testid="register-email" className={authFieldClass} /></div>
      <div><label htmlFor="register-password" className="text-sm text-[#B5BBC9]">{t("Mot de passe", "Password")}</label><PasswordField id="register-password" name="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} aria-describedby="password-requirements" data-testid="register-password" /></div>
      <div><div aria-hidden="true" className="flex gap-2">{[0, 1, 2].map(index => <span key={index} className={`h-1 flex-1 rounded-full ${strength > index ? ["bg-[#FFB855]", "bg-[#B58BFF]", "bg-[#00E676]"][strength - 1] : "bg-white/10"}`} />)}</div><p id="password-requirements" className="mt-2 text-xs leading-5 text-[#929AAF]">{t("8 caractères minimum, une majuscule et un chiffre.", "At least 8 characters, one uppercase letter and one number.")}</p></div>
      <button type="submit" disabled={loading || googleBusy} className="btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-60" data-testid="register-submit">{loading ? t("Création…", "Creating account…") : <>{t("Créer mon compte", "Create my account")}<ArrowRight size={16} /></>}</button>
    </form>
    <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[#929AAF]"><CheckCircle2 size={14} className="text-[#00E676]" />{t("Aucune carte bancaire requise.", "No credit card required.")}</p>
    <p className="mt-5 border-t border-white/[.07] pt-5 text-center text-sm text-[#A9B0C2]">{t("Déjà inscrit ?", "Already registered?")} <Link to="/login" className="font-medium text-[#B58BFF] hover:text-white" data-testid="register-go-login">{t("Se connecter", "Sign in")}</Link></p>
  </AuthLayout>;
}
