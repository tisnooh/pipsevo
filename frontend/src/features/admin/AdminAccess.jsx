import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "./api";

const AdminContext = createContext(null);
export const useAdminSession = () => useContext(AdminContext);

export default function AdminAccess() {
  const { user, loading } = useAuth();
  const [state, setState] = useState({ loading: true, session: null, forbidden: false, error: "" });

  useEffect(() => {
    let active = true;
    if (loading) return undefined;
    if (!user) {
      setState({ loading: false, session: null, forbidden: true, error: "" });
      return undefined;
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    adminApi.session().then(({ data }) => {
      if (active) setState({ loading: false, session: data, forbidden: false, error: "" });
    }).catch((error) => {
      if (!active) return;
      setState({
        loading: false,
        session: null,
        forbidden: error.response?.status === 401 || error.response?.status === 403,
        error: error.response?.data?.detail || "Le back-office est momentanément indisponible.",
      });
    });
    return () => { active = false; };
  }, [loading, user]);

  if (loading || state.loading) return <div className="admin-gate">Vérification des permissions…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (state.forbidden) return <Navigate to="/app/dashboard" replace />;
  if (state.error) return <div className="admin-gate"><strong>Administration indisponible</strong><span>{state.error}</span></div>;
  return <AdminContext.Provider value={state.session}><Outlet /></AdminContext.Provider>;
}
