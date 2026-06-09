# PipsEvo PRD

## Problem statement
Build PipsEvo — Operating System for Funded Traders. Trading journal + prop firm tracker + discipline + AI coach + multi-account manager + payouts.

## Tech
FastAPI + MongoDB + React. Claude Sonnet 4.5 via emergentintegrations for AI Coach. JWT auth.

## Implemented (v1 - Feb 2026)
- Landing page (hero, why-fail, features, how-it-works, command-center preview, discipline, AI coach, pricing, FAQ, CTA, footer)
- JWT auth: register, login, /auth/me
- Onboarding 4-step flow (trader type, prop firms, accounts, rules)
- App shell with sidebar (9 nav items)
- Dashboard (KPIs: funded capital, profit, drawdown, est payout, discipline, trader score; equity curve; metrics)
- Prop Accounts (CRUD with health/survival scores)
- Trading Journal (full CRUD with setup/session/emotion/plan)
- Discipline Center (live score, checklist)
- Analytics (per-setup, per-session bar charts)
- Payouts (history + record + estimated payout)
- AI Coach (Claude Sonnet 4.5 — claude-sonnet-4-5-20250929 via emergentintegrations, history persisted)
- Trading DNA (auto-detect best session/setup/emotion/type)
- Settings page

## Deferred to v2
- Emergent Google Auth (UI only)
- Stripe checkout (Starter €9.99, Pro €19.99) - mock endpoint exists
- Object storage for screenshot uploads
- Admin dashboard
- Achievements / Goal Center / Mistake Cost Tracker
- Performance Calendar heatmap
- Notifications system
- Setup Library page
- Multi-Account Command Center (separate page)
