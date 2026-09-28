# PipsEvo Admin — installation et exploitation

Le back-office est intégré au produit existant sous `/admin`. Il réutilise Supabase Auth, les profils PipsEvo et les données opérationnelles déjà persistées. Il n’emploie ni données de démonstration ni secrets dans le navigateur.

## Accès et rôles

Les rôles reconnus sont `user`, `support`, `admin` et `super_admin`.

- `user` : aucun accès administrateur ;
- `support` : utilisateurs en lecture limitée et tickets support ;
- `admin` : pilotage produit, comptes de trading, intégrations et opérations ;
- `super_admin` : accès total, rôles, feature flags, audit et paramètres sensibles.

Les contrôles sont appliqués par FastAPI avant chaque lecture ou mutation. Les vérifications d’interface ne remplacent jamais les autorisations serveur. Les actions sensibles exigent une confirmation et alimentent `admin_audit_logs`.

Pour créer le premier administrateur, appliquer la migration puis attribuer le rôle directement depuis une session SQL privilégiée :

```sql
update public.profiles
set role = 'super_admin', status = 'active'
where email = 'admin@votre-domaine.tld';
```

Reconnecter ensuite l’utilisateur afin de rafraîchir sa session. Ne jamais exposer `SUPABASE_SECRET_KEY` au frontend.

## Migration

Appliquer dans l’ordre les migrations de `supabase/migrations`, notamment `20260907102521_admin_backoffice.sql`. Elle ajoute les rôles et statuts de profils, les annonces, feature flags, incidents, paramètres, événements produit et journaux d’audit, avec RLS et révocations adaptées.

## Routes principales

- `/admin` — Dashboard
- `/admin/users` — Utilisateurs
- `/admin/subscriptions` — Abonnements
- `/admin/trading-accounts` — Comptes de trading
- `/admin/integrations` — Intégrations
- `/admin/support` — Support
- `/admin/analytics` — Analytics
- `/admin/announcements` — Annonces
- `/admin/feature-flags` — Feature Flags
- `/admin/audit-logs` — Audit Logs
- `/admin/system` — Système
- `/admin/settings` — Paramètres

Les anciennes routes opérationnelles (`trading-sync`, `prop-firms`, `emails`, `atlas`, `backtesting`, `incidents`, `audit`) restent valides pour ne casser aucun lien existant.

## Variables serveur

Minimum : `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` et `FRONTEND_URL`.

Les cartes Système signalent uniquement la configuration connue. Selon les modules activés, ajouter les variables Stripe, SMTP/Resend, MetaApi, cTrader et Tradovate déjà documentées dans `.env.example`. Aucune valeur de secret n’est renvoyée par les APIs admin.

## Vérification locale

```powershell
python -m pytest backend/tests -q
python -m compileall backend
cd frontend
npm.cmd ci
npm.cmd test -- --watchAll=false
npm.cmd run build
```

Vérifier ensuite avec un compte `user` que `/admin` est refusé, puis avec chaque rôle staff que seules les rubriques autorisées apparaissent. Tester enfin les confirmations, la déconnexion et la présence des événements dans `admin_audit_logs`.

## Limites explicites

- Le revenu n’est pas inventé : MRR/ARR reste indisponible tant que les montants Stripe ne sont pas persistés de façon fiable.
- « Configuré » signifie que les variables nécessaires existent ; cela ne prétend pas qu’un fournisseur externe est disponible en temps réel.
- Les agrégations opérationnelles sont bornées à 10 000 lignes et exposent un indicateur lorsque cette limite est atteinte.
- Les données sensibles des connexions de trading sont masquées et les jetons/mots de passe sont filtrés récursivement avant toute réponse ou entrée d’audit.
