import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const sessionFallbackUser = (session) => ({
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Trader",
      onboarding_completed: false,
      onboarded: false,
      profile_loading_error: true,
    });

    const refreshUser = async (knownSession = null) => {
      const sessionResult = knownSession
        ? { data: { session: knownSession }, error: null }
        : await supabase.auth.getSession();

      if (!active) return;
      if (sessionResult.error || !sessionResult.data.session) {
        localStorage.removeItem("pipsevo_token");
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const result = await auth.me();
        if (!active) return;
        setUser(result.data);
        sessionStorage.removeItem("pipsevo_pending_email");
      } catch (error) {
        // Une session Supabase valide ne doit jamais être transformée en déconnexion
        // simplement parce que le profil met quelques instants à devenir disponible.
        if (active) setUser((current) => current || sessionFallbackUser(sessionResult.data.session));
      } finally {
        if (active) setLoading(false);
      }
    };

    refreshUser();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && active) {
        localStorage.removeItem("pipsevo_token");
        setUser(null);
        setLoading(false);
      }
      if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event) && session && active) {
        // Sortir du callback évite de bloquer le client Supabase pendant le chargement du profil.
        window.setTimeout(() => refreshUser(session), 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const expire = () => {
      setUser(null);
      toast.error("Ta session a expiré. Reconnecte-toi pour continuer.");
    };
    window.addEventListener("pipsevo:session-expired", expire);
    return () => window.removeEventListener("pipsevo:session-expired", expire);
  }, []);

  const login = async (email, password) => {
    const { data } = await auth.login({ email, password });
    if (data.token) localStorage.setItem("pipsevo_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name) => {
    const { data } = await auth.register({ email, password, name });
    if (data.token) localStorage.setItem("pipsevo_token", data.token);
    sessionStorage.removeItem("pipsevo_pending_email");
    setUser(data.user);
    return data;
  };

  const resendConfirmation = async (email) => {
    const { data } = await auth.resendConfirmation(email);
    return data;
  };

  const logout = async (scope = "local") => {
    await auth.logout(scope);
    localStorage.removeItem("pipsevo_token");
    setUser(null);
  };

  const deleteAccount = async (confirmation) => {
    await auth.deleteAccount(confirmation);
    localStorage.removeItem("pipsevo_token");
    sessionStorage.removeItem("pipsevo_pending_email");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, setUser, loading, login, register, resendConfirmation, logout, deleteAccount }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
