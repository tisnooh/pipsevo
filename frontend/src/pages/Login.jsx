import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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
      toast.success(`Welcome back, ${u.name || u.email}`);
      nav(u.onboarded ? "/app/dashboard" : "/onboarding");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md card-elev p-8 glow-blue">
        <Link to="/" className="text-sm text-[#9CA3AF] hover:text-white">← Back</Link>
        <h1 className="text-3xl font-bold mt-4 text-gradient">Welcome back</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Log in to your PipsEvo command center.</p>
        <form onSubmit={submit} className="space-y-4 mt-8">
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-[#4F8CFF] outline-none" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-[#4F8CFF] outline-none" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full" data-testid="login-submit">{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="text-center text-sm text-[#9CA3AF] mt-6">
          New here? <Link to="/register" className="text-[#4F8CFF] hover:underline" data-testid="login-go-register">Create account</Link>
        </div>
        <div className="mt-6 text-xs text-center text-[#9CA3AF]">Google login coming in v2</div>
      </div>
    </div>
  );
}
