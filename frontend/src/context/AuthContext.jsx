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
    const refreshUser = () => auth.me().then(r => {
      if (active) {
        setUser(r.data);
        sessionStorage.removeItem("pipsevo_pending_email");
      }
    }).catch(() => {
      localStorage.removeItem("pipsevo_token");
      if (active) setUser(null);
    }).finally(() => { if (active) setLoading(false); });
    refreshUser();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) setUser(null);
      if (event === "SIGNED_IN" && active) {
        // Supabase traite le lien de confirmation de manière asynchrone.
        // Sortir du callback évite de bloquer le client avant de charger le profil.
        window.setTimeout(refreshUser, 0);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const expire = () => { setUser(null); toast.error("Ta session a expiré. Reconnecte-toi pour continuer."); };
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
  const logout = async () => {
    await auth.logout();
    localStorage.removeItem("pipsevo_token");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, setUser, loading, login, register, resendConfirmation, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
