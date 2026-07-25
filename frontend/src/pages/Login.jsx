import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Candle } from "@/components/CandleArt";
import { ArrowRight } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AUTH_CONFIG, hasCompletedOnboarding } from "@/config/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bon retour, ${u.name || u.email}`);
      nav(hasCompletedOnboarding(u) ? AUTH_CONFIG.authenticatedHomePath : AUTH_CONFIG.postSignUpPath, { replace: true });
    } catch (err) { toast.error(err.response?.data?.detail || "Connexion impossible"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7"><LanguageSwitcher compact /></div>
      <div className="absolute inset-0 grid-floor opacity-40" />
      <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
      <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #4F8CFF, transparent)" }} />
      <div className="absolute left-[8%] top-[28%] floaty"><Candle color="purple" height={90} rot={-6} /></div>
      <div className="absolute right-[8%] top-[20%] floaty-slow"><Candle color="pink" height={110} rot={8} /></div>
      <div className="absolute left-[12%] bottom-[15%] floaty-slow"><Candle color="green" height={80} rot={4} /></div>

      <div className="w-full max-w-md card-elev p-9 glow-purple relative z-10">
        <div className="mb-6"><Logo /></div>
        <h1 className="text-3xl font-bold text-gradient">Bon retour.</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Connecte-toi à ton command center.</p>
        <form onSubmit={submit} className="space-y-4 mt-7">
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Email</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="login-email" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3"><label className="text-xs font-mono uppercase text-[#9CA3AF]">Mot de passe</label><Link to="/forgot-password" data-testid="forgot-password-link" className="text-[11px] text-[#B58BFF] hover:text-white">Mot de passe oublié ?</Link></div>
            <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="login-password" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2" data-testid="login-submit">{loading ? "Connexion…" : (<>Se connecter <ArrowRight className="w-4 h-4"/></>)}</button>
        </form>
        <div className="text-center text-sm text-[#9CA3AF] mt-6">
          Pas encore de compte ? <Link to="/register" className="text-[#B58BFF] hover:underline" data-testid="login-go-register">Crée-en un</Link>
        </div>
        <div className="mt-6 text-xs text-center text-[#6B7280]">Un lien sécurisé peut être envoyé à ton adresse e-mail.</div>
      </div>
    </div>
  );
}
