# Frontend PipsEvo

React 19, React Router, Tailwind CSS 3 et Vite. La chaîne CRA/CRACO a été retirée ; les composants métier et les routes sont conservés.

## Lancement local

Utiliser Node `^20.19.0 || >=22.12.0` et npm (Vercel utilise Node 24.x).

```powershell
npm.cmd ci --ignore-scripts
npm.cmd start
```

L'application écoute uniquement sur `http://127.0.0.1:3000`. Configurer les valeurs publiques à partir de `.env.example`. Les variables `REACT_APP_*` existantes restent compatibles : seules les six clés revues dans `scripts/public-env.cjs` sont injectées dans le navigateur. Ne jamais y ajouter une clé de service Supabase, un secret de cron, un mot de passe SMTP ou une clé IA.

## Vérifications

```powershell
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd audit
```

Le `prebuild` contrôle automatiquement les versions verrouillées, l'absence de l'ancienne chaîne, la frontière des variables publiques et les réécritures SPA. Jest et Babel sont configurés indépendamment de Vite. `npm.cmd run preview` sert le bundle optimisé sur `http://127.0.0.1:4173`.

L'audit des dépendances de production est distinct de l'audit complet : les dépendances de compilation restent à contrôler. Ne pas appliquer `npm audit fix --force` ni masquer les alertes sans analyse de compatibilité.

## Déploiement Vercel

La racine du projet Vercel est `frontend`. `vercel.json` sélectionne Vite et le dossier `build`, garde les en-têtes de sécurité et le cron, et laisse `/api/sync-due` atteindre sa fonction serveur. Vérifier une preview avec le SHA exact avant publication sur `main`.

## Démo de backtest isolée

Depuis la racine du dépôt, lancer le serveur de données synthétiques :

```powershell
python backend/tests/backtest_preview.py
```

Dans un autre terminal ouvert dans `frontend` :

```powershell
node scripts/backtest-preview.cjs
```

Ouvrir `http://127.0.0.1:4188/app/backtest`. Cette démo utilise les vrais composants avec une API locale sur le port 8091, sans authentification de production, compte réel ou base externe. `node scripts/backtest-preview.cjs --build-only` vérifie séparément sa compilation. Les données synthétiques ne sont jamais importées dans la production.
