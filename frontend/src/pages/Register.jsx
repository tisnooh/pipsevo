import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Candle } from "@/components/CandleArt";
import { ArrowRight } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mot de passe min 6 caractères");
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Compte créé. Configurons ton profil.");
      nav("/onboarding");
    } catch (err) { toast.error(err.response?.data?.detail || "Inscription impossible"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16 relative overflow-hidden">
      <div className="absolute inset-0 grid-floor opacity-40" />
      <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
      <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #FF4FD8, transparent)" }} />
      <div className="hidden sm:block absolute right-[8%] top-[28%] floaty"><Candle color="purple" height={90} rot={6} /></div>
      <div className="hidden sm:block absolute left-[8%] top-[20%] floaty-slow"><Candle color="green" height={110} rot={-8} /></div>
      <div className="hidden sm:block absolute right-[12%] bottom-[15%] floaty-slow"><Candle color="pink" height={80} rot={-4} /></div>

      <div className="w-full max-w-md card-elev p-6 sm:p-9 glow-pink relative z-10">
        <div className="mb-6"><Logo /></div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Crée ton compte.</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Protège ta carrière funded dès aujourd'hui.</p>
        <form onSubmit={submit} className="space-y-4 mt-7">
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Nom</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} data-testid="register-name" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Email</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="register-email" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Mot de passe</label>
            <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="register-password" className="w-full mt-1 bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2" data-testid="register-submit">{loading ? "Création…" : (<>Créer mon compte <ArrowRight className="w-4 h-4"/></>)}</button>
        </form>
        <div className="text-center text-sm text-[#9CA3AF] mt-6">
          Déjà sur PipsEvo ? <Link to="/login" className="text-[#B58BFF] hover:underline" data-testid="register-go-login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
