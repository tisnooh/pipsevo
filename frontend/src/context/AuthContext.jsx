import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("pipsevo_token");
    if (!t) { setLoading(false); return; }
    auth.me().then(r => setUser(r.data)).catch(() => localStorage.removeItem("pipsevo_token")).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await auth.login({ email, password });
    localStorage.setItem("pipsevo_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const register = async (email, password, name) => {
    const { data } = await auth.register({ email, password, name });
    localStorage.setItem("pipsevo_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem("pipsevo_token");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
