import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 chars");
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Account created. Let's set up your trader profile.");
      nav("/onboarding");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md card-elev p-8 glow-purple">
        <Link to="/" className="text-sm text-[#9CA3AF] hover:text-white">← Back</Link>
        <h1 className="text-3xl font-bold mt-4 text-gradient">Create your account</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Start protecting your funded career today.</p>
        <form onSubmit={submit} className="space-y-4 mt-8">
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="register-name" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="register-email" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-[#9CA3AF]">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="register-password" className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-[#7C4DFF] outline-none" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full" data-testid="register-submit">{loading ? "Creating…" : "Create account"}</button>
        </form>
        <div className="text-center text-sm text-[#9CA3AF] mt-6">
          Already on PipsEvo? <Link to="/login" className="text-[#4F8CFF] hover:underline" data-testid="register-go-login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
