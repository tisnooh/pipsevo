import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import CookieConsent from "@/components/CookieConsent";
import RouteSEO from "@/components/RouteSEO";
import { AUTH_CONFIG, hasCompletedOnboarding } from "@/config/auth";
import { JOURNAL_DETAIL_ROUTE, JOURNAL_LIST_ROUTE } from "@/lib/journalNavigation";
import "@/index.css";

const Landing = lazy(() => import("@/pages/LandingV2"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const AppShell = lazy(() => import("@/pages/AppShell"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Accounts = lazy(() => import("@/pages/Accounts"));
const JournalPage = lazy(() => import("@/pages/Journal").then((module) => ({ default: module.JournalPage })));
const Discipline = lazy(() => import("@/pages/Discipline"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Payouts = lazy(() => import("@/pages/Payouts"));
const AICoach = lazy(() => import("@/pages/AICoach"));
const TradingDNA = lazy(() => import("@/pages/TradingDNA"));
const Settings = lazy(() => import("@/pages/Settings"));
const Backtest = lazy(() => import("@/pages/Backtest"));
const MarketTerminal = lazy(() => import("@/pages/MarketTerminal"));
const EconomicCalendar = lazy(() => import("@/pages/EconomicCalendar"));
const DayView = lazy(() => import("@/pages/DayView"));
const NewsletterActionPage = lazy(() => import("@/pages/NewsletterActionPage"));
const PlatformsPage = lazy(() => import("@/pages/PlatformsPage"));

const loadSupportPages = () => import("@/pages/SupportPages");
const supportPage = (name) => lazy(() => loadSupportPages().then((module) => ({ default: module[name] })));
const FAQPage = supportPage("FAQPage");
const ContactPage = supportPage("ContactPage");
const PricingPage = supportPage("PricingPage");
const LegalPage = supportPage("LegalPage");
const BlogPage = supportPage("BlogPage");
const GuideArticlePage = supportPage("GuideArticlePage");
const HelpPage = supportPage("HelpPage");
const AffiliatePage = supportPage("AffiliatePage");

function RouteLoading() {
  return <div role="status" aria-live="polite" className="min-h-screen bg-[#050505] text-white">
    <span className="sr-only">Chargement…</span>
  </div>;
}

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
        <Suspense fallback={<RouteLoading />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </I18nProvider>
  );
}
