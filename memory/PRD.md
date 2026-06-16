# PipsEvo PRD

## Problem statement
Build PipsEvo — the Operating System for Funded Traders. Trading journal + prop firm tracker + discipline + AI coach + multi-account manager + payouts in a premium fintech UI (Apple / Linear / Stripe / TradingView aesthetic).

## Tech
- Backend: FastAPI + MongoDB (Motor) + JWT auth (PyJWT + bcrypt)
- Frontend: React 19 + react-router-dom + Tailwind + shadcn/ui + recharts + framer-motion + sonner toasts
- AI Coach: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations.llm.chat` with `EMERGENT_LLM_KEY`

## Implemented (v1.1 — Feb 2026)
### Landing page (premium redesign matching reference images)
- Hero with **tilted 3D dashboard mockup** + **floating glowing 3D candlesticks** (purple / green / pink / blue)
- "Now in Beta · Join 2,400+ funded traders" pill
- "Protect Funded Accounts. Maximize Payouts." headline
- Trusted-by row: Topstep, Apex, FTMO, FundedNext, The5ers
- "Get Started in 4 Simple Steps" with numbered purple circles + dashed-arrow connectors
- 5 feature cards (Multi-Account, Smart Journal, Discipline Engine, AI Coach, Payout Tracker) with premium 3D-styled icons
- 6 asset class cards (Forex, Crypto, Stocks, Indices, Commodities, Futures)
- All-in-one section with secondary dashboard mockup
- Pricing (Starter €9.99 / Pro €19.99) — Pro highlighted
- FAQ
- Big CTA footer

### Auth
- Register, Login, /auth/me with JWT in localStorage
- Premium login/register screens with floating candlesticks + radial glows

### Onboarding (5 steps, French)
- Trader type (Futures / CFD / Both)
- Asset classes (6 cards)
- Prop firms (6 firms)
- Number of accounts
- Trading rules (max trades, daily loss limit, max risk, stop after N losses)

### App Shell (premium dark UI)
- French sidebar: Aperçu, Comptes, Journal, Backtest, Statistiques, Analyse IA, Discipline, Payouts, Rapports, Paramètres
- Bottom sidebar: Discipline du jour gauge + Passe à Pro upgrade card + Déconnexion
- Topbar: Rechercher (⌘K), notifications, user PRO badge

### Dashboard (Vue d'ensemble)
- 5 KPI cards with sparkline mini-charts (Profit net, Score de discipline, Comptes actifs, Win Rate, Drawdown restant)
- Equity curve area chart
- Payout progress card + discipline gauge
- Recent trades table with tabs (Tous / Gagnants / Perdants)
- AI Coach Insight panel
- Comptes overview list

### Accounts (Comptes)
- Premium cards with target progress bar, health/survival scores, P&L, max DD
- Add modal with name, firm dropdown, balance, initial, profit target, max drawdown
- Auto-computed health & survival scores

### Journal (premium)
- 6 KPI sparkline cards (Trades, Win Rate, Profit net, Gain moyen, Perte moyenne, R Multiple)
- Tabs: Tous / Positions ouvertes / Favoris
- Sortable table (Date, Actif, Direction, Résultat, R Multiple, Durée, Compte, Tags)
- Right-side sliding detail panel with full trade data + screenshot slots placeholder + Modifier/Supprimer
- Add modal with all trade fields

### Statistiques (Analytics)
- 6 tabs (Vue d'ensemble, Performance, Trades, Temps, Risques, Comportement)
- 6 KPI sparkline cards including IA Insight card
- Évolution du capital area chart
- Donut résultats + meilleurs actifs
- Performance par jour bar chart
- Durée moyenne des trades bar chart
- Heures les plus rentables heatmap
- Performance par compte
- Pro upgrade CTA

### Discipline
- Big animated gauge (0-100)
- 4 rule cards (Risque, Session, Plan, Max trades)
- Streak de consistance, Violations, Plan respect rate

### Payouts
- 3 KPI cards
- Payout simulator (daily profit × days remaining → estimated payout + date + probability)
- Add payout modal + history

### AI Coach (Analyse IA — Atlas)
- 6 French preset questions
- 5 insight cards
- Real Claude Sonnet 4.5 responses via emergentintegrations (~28s response time)
- Persistent history

### Rapports (Trading DNA)
- 4 DNA cards (Trader Type, Best Session, Best Setup, Best Emotion)
- Trades analyzed count

### Settings + Backtest placeholder

## Deferred to v2
- Stripe checkout (Starter €9.99 / Pro €19.99) — endpoint is placeholder
- Emergent Google Auth
- Object storage for screenshot uploads
- Backtest engine
- Admin dashboard
- Achievements, Goals, Mistake Cost Tracker, Performance Calendar, Notifications system, Setup Library page

## Architecture
- All API endpoints prefixed `/api`
- JWT (HS256, 168h expiry)
- bcrypt password hashing
- UUID-based document IDs
- MongoDB collections: users, accounts, trades, payouts, ai_reports
