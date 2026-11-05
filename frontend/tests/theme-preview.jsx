import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '../src/context/I18nContext';
import AppShell from '../src/pages/AppShell';
import Dashboard from '../src/pages/Dashboard';
import { JournalPage as Journal } from '../src/pages/Journal';
import DayView from '../src/pages/DayView';
import MarketTerminal from '../src/pages/MarketTerminal';
import ThemeToggle from '../src/components/ThemeToggle';
import Accounts from '../src/pages/Accounts';
import Analytics from '../src/pages/Analytics';
import Discipline from '../src/pages/Discipline';
import Payouts from '../src/pages/Payouts';
import Settings from '../src/pages/Settings';
import TradingPlan from '../src/pages/TradingPlan';
import Backtest from '../src/pages/Backtest';
import TradingDNA from '../src/pages/TradingDNA';
import { Toaster } from 'sonner';
import '../src/index.css';

createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="pipsevo.theme-fixture">
    <I18nProvider><BrowserRouter>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150, background: '#FFE9A8', color: '#423100', textAlign: 'center', fontSize: 11 }}>TEST LOCAL · données fictives · aucun compte réel</div>
      <ThemeToggle className="pe-theme-toggle-global"/>
      <Toaster richColors/>
      <Routes><Route element={<AppShell/>}>
        <Route path="/app/dashboard" element={<Dashboard/>}/>
        <Route path="/app/journal" element={<Journal/>}/>
        <Route path="/app/day-view" element={<DayView/>}/>
        <Route path="/app/markets" element={<MarketTerminal/>}/>
        <Route path="/app/accounts" element={<Accounts/>}/>
        <Route path="/app/analytics" element={<Analytics/>}/>
        <Route path="/app/discipline" element={<Discipline/>}/>
        <Route path="/app/payouts" element={<Payouts/>}/>
        <Route path="/app/settings" element={<Settings/>}/>
        <Route path="/app/trading-plan" element={<TradingPlan/>}/>
        <Route path="/app/backtest" element={<Backtest/>}/>
        <Route path="/app/dna" element={<TradingDNA/>}/>
      </Route></Routes>
    </BrowserRouter></I18nProvider>
  </ThemeProvider>
);
