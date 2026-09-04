import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import Landing from "@/pages/LandingV2";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
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
import MarketTerminal from "@/pages/MarketTerminal";
import EconomicCalendar from "@/pages/EconomicCalendar";
import DayView from "@/pages/DayView";
import NewsletterActionPage from "@/pages/NewsletterActionPage";
import { FAQPage, ContactPage, PricingPage, LegalPage, BlogPage, GuideArticlePage, HelpPage, AffiliatePage } from "@/pages/SupportPages";
import PlatformsPage from "@/pages/PlatformsPage";
import CookieConsent from "@/components/CookieConsent";
import RouteSEO from "@/components/RouteSEO";
import { AUTH_CONFIG, hasCompletedOnboarding } from "@/config/auth";
import { JOURNAL_DETAIL_ROUTE, JOURNAL_LIST_ROUTE } from "@/lib/journalNavigation";
import "@/index.css";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompletedOnboarding(user)) return <Navigate to="/onboarding" replace />;
  return <AppShell />;
}

function OnboardingGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (hasCompletedOnboarding(user)) return <Navigate to={AUTH_CONFIG.authenticatedHomePath} replace />;
  return children;
}

function AuthEntryGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return children;
  return <Navigate to={hasCompletedOnboarding(user) ? AUTH_CONFIG.authenticatedHomePath : AUTH_CONFIG.postSignUpPath} replace />;
}

function VerifyEmailGate() {
  const { user, loading } = useAuth();
  if (AUTH_CONFIG.requireEmailConfirmation) return <VerifyEmail />;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return <Navigate to="/register" replace />;
  return <Navigate to={hasCompletedOnboarding(user) ? AUTH_CONFIG.authenticatedHomePath : AUTH_CONFIG.postSignUpPath} replace />;
}

export default function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <BrowserRouter>
        <RouteSEO />
        <CookieConsent />
        <Toaster theme="dark" position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthEntryGate><Login /></AuthEntryGate>} />
          <Route path="/register" element={<AuthEntryGate><Register /></AuthEntryGate>} />
          <Route path="/verify-email" element={<VerifyEmailGate />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/newsletter/confirm" element={<NewsletterActionPage action="confirm" />} />
          <Route path="/newsletter/unsubscribe" element={<NewsletterActionPage action="unsubscribe" />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/security" element={<LegalPage type="security" />} />
          <Route path="/legal-notice" element={<LegalPage type="notice" />} />
          <Route path="/cookies" element={<LegalPage type="cookies" />} />
          <Route path="/data-rights" element={<LegalPage type="data" />} />
          <Route path="/affiliate-terms" element={<LegalPage type="affiliate" />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<GuideArticlePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/onboarding" element={<OnboardingGate><Onboarding /></OnboardingGate>} />
          <Route path="/app" element={<Protected />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path={JOURNAL_LIST_ROUTE} element={<JournalPage />} />
            <Route path={JOURNAL_DETAIL_ROUTE} element={<JournalPage />} />
            <Route path="backtest" element={<Backtest />} />
            <Route path="markets" element={<MarketTerminal />} />
            <Route path="economic-calendar" element={<EconomicCalendar />} />
            <Route path="day-view" element={<DayView />} />
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
    </I18nProvider>
  );
}
