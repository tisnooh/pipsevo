import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { readSettings } from "@/lib/preferences";

const AuthCtx = createContext(null);
const removeStored = (kind, key) => { try { window[kind]?.removeItem(key); } catch { /* Authentication remains valid without optional browser storage. */ } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const welcomeAttemptedRef = useRef(new Set());
  const authRevisionRef = useRef(0);
  const visibleUserRef = useRef(user);
  visibleUserRef.current = user;
  const profileRefreshRef = useRef(null);
  const refreshProfile = useCallback(() => profileRefreshRef.current?.(), []);

  const updateUser = useCallback(next => {
    setUser(current => {
      const updated = typeof next === "function" ? next(current) : next;
      // A delayed settings response belongs to the session that initiated it.
      return current && updated?.id === current.id ? updated : current;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const sessionFallbackUser = (session) => ({
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Trader",
      onboarding_completed: false,
      onboarded: false,
      role: "user",
      status: "active",
      profile_loading_error: true,
    });

    const refreshUser = async (knownSession = null, revision = ++authRevisionRef.current) => {
      const isCurrent = () => active && revision === authRevisionRef.current;
      let sessionResult;
      try {
        sessionResult = knownSession
          ? { data: { session: knownSession }, error: null }
          : await supabase.auth.getSession();
      } catch {
        if (isCurrent()) {
          setUser(current => current ? { ...current, profile_loading_error: true } : null);
          setLoading(false);
          toast.error("Impossible de relire ta session. Réessaie dans un instant.");
        }
        return;
      }

      if (!isCurrent()) return;
      if (sessionResult.error || !sessionResult.data.session) {
        removeStored("localStorage", "pipsevo_token");
        setUser(null);
        setLoading(false);
        return;
      }

      if (visibleUserRef.current?.id && visibleUserRef.current.id !== sessionResult.data.session.user.id) {
        setUser(null);
        setLoading(true);
      }

      try {
        const result = await auth.me();
        if (!isCurrent()) return;
        if (result.data?.id !== sessionResult.data.session.user.id) throw new Error("Profile does not match the current session");
        setUser(result.data);
        removeStored("sessionStorage", "pipsevo_pending_email");
        const authUser = sessionResult.data.session.user;
        // Every authenticated account asks the backend for its welcome message.
        // The backend owns the once-only guarantee, so this also covers Google
        // accounts and sessions created before the former metadata flag existed.
        if (!welcomeAttemptedRef.current.has(authUser.id)) {
          welcomeAttemptedRef.current.add(authUser.id);
          const welcomeLanguage = authUser.user_metadata?.language || readSettings().language;
          auth.sendWelcome(welcomeLanguage).catch(() => {
            // Keep the session valid and allow a later auth refresh to retry.
            // Delivery errors remain visible in the server-side delivery log.
            welcomeAttemptedRef.current.delete(authUser.id);
          });
        }
      } catch (error) {
        // Une session Supabase valide ne doit jamais être transformée en déconnexion
        // simplement parce que le profil met quelques instants à devenir disponible.
        if (isCurrent()) setUser((current) => current?.id === sessionResult.data.session.user.id
          ? { ...current, profile_loading_error: true }
          : sessionFallbackUser(sessionResult.data.session));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };

    profileRefreshRef.current = () => {
      setLoading(true);
      return refreshUser();
    };
    refreshUser();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && active) {
        authRevisionRef.current += 1;
        removeStored("localStorage", "pipsevo_token");
        setUser(null);
        setLoading(false);
      }
      if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event) && session && active) {
        // Never show the former account while the new owner's profile loads.
        if (visibleUserRef.current?.id !== session.user.id) {
          setUser(null);
          setLoading(true);
        }
        // Sortir du callback évite de bloquer le client Supabase pendant le chargement du profil.
        const revision = ++authRevisionRef.current;
        window.setTimeout(() => {
          if (active && revision === authRevisionRef.current) refreshUser(session, revision);
        }, 0);
      }
    });

    return () => {
      active = false;
      profileRefreshRef.current = null;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const expire = () => {
      authRevisionRef.current += 1;
      setUser(null);
      setLoading(false);
      toast.error("Ta session a expiré. Reconnecte-toi pour continuer.");
    };
    window.addEventListener("pipsevo:session-expired", expire);
    return () => window.removeEventListener("pipsevo:session-expired", expire);
  }, []);

  const login = async (email, password) => {
    const revision = ++authRevisionRef.current;
    const { data } = await auth.login({ email, password });
    // Supabase owns session persistence. Do not duplicate its JWT in a legacy key.
    removeStored("localStorage", "pipsevo_token");
    if (revision === authRevisionRef.current) setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name, language = "fr") => {
    const revision = ++authRevisionRef.current;
    const { data } = await auth.register({ email, password, name, language });
    removeStored("localStorage", "pipsevo_token");
    removeStored("sessionStorage", "pipsevo_pending_email");
    if (revision === authRevisionRef.current) setUser(data.user);
    return data;
  };

  const resendConfirmation = async (email) => {
    const { data } = await auth.resendConfirmation(email);
    return data;
  };

  const logout = async (scope = "local") => {
    authRevisionRef.current += 1;
    await auth.logout(scope);
    authRevisionRef.current += 1;
    removeStored("localStorage", "pipsevo_token");
    setUser(null);
  };

  const deleteAccount = async (confirmation) => {
    authRevisionRef.current += 1;
    const { data } = await auth.deleteAccount(confirmation);
    authRevisionRef.current += 1;
    removeStored("localStorage", "pipsevo_token");
    removeStored("sessionStorage", "pipsevo_pending_email");
    setUser(null);
    return data;
  };

  return <AuthCtx.Provider value={{ user, setUser: updateUser, loading, refreshProfile, login, register, resendConfirmation, logout, deleteAccount }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
