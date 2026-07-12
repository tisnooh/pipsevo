import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import AppShell from "@/pages/AppShell";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import { JournalPage } from "@/pages/Journal";
import Discipline from "@/pages/Discipline";
import Analytics from "@/pages/Analytics";
import Payouts from "@/pages/Payouts";
import AICoach from "@/pages/AICoach";
import TradingDNA from "@/pages/TradingDNA";
import Settings from "@/pages/Settings";
import Backtest from "@/pages/Backtest";
import { FAQPage, ContactPage, PricingPage, LegalPage, PlatformsPage, BlogPage, HelpPage, AffiliatePage } from "@/pages/SupportPages";
import "@/index.css";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return <AppShell />;
}

function OnboardingGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/security" element={<LegalPage type="security" />} />
          <Route path="/affiliate-terms" element={<LegalPage type="affiliate" />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/onboarding" element={<OnboardingGate><Onboarding /></OnboardingGate>} />
          <Route path="/app" element={<Protected />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="backtest" element={<Backtest />} />
            <Route path="discipline" element={<Discipline />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="coach" element={<AICoach />} />
            <Route path="dna" element={<TradingDNA />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
