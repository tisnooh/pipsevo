# Back-office PipsEvo

## Périmètre livré

Le back-office est une application privée sous `/admin`, distincte du shell trader. Elle ne s’appuie pas sur des compteurs de démonstration : les modules lisent les profils, abonnements, comptes, trades, connexions et rapports persistés dans Supabase, ainsi que le support, les événements e-mail, les événements techniques Atlas et les sessions Backtest conservés dans MongoDB.

| Domaine | Avant | Implémentation |
| --- | --- | --- |
| Accès administrateur | À créer | RBAC `user`, `support`, `admin`, `super_admin`, garde frontend et autorisation FastAPI par endpoint |
| Utilisateurs | À créer | Recherche, pagination, fiche, suspension, réactivation, confirmation e-mail, reset onboarding, rôle super-admin |
| Support | À corriger | Files, priorités, statuts, notes internes, réponses e-mail, audit |
| Synchronisations | Existant côté produit | Monitoring des connexions et runs, champs de secrets exclus |
| Prop firms | Catalogue frontend existant | Catalogue administrable, sources officielles et activation douce |
| E-mails | Existant côté service | Monitoring `sent`/échecs ; aucune fausse confirmation de livraison finale |
| Atlas | Existant côté produit | Événements techniques (résultat, code, latence) sans prompt ni réponse |
| Backtest | Existant côté produit | Usage réel des sessions et datasets privés |
| Analytics | À créer | Événements minimaux et funnel d’activation, sans contenu de journal |
| Annonces / flags / incidents | À créer | Tables privées, interface, ciblage et historique |
| Audit | À créer | Table append-only, inaccessible aux rôles navigateur |

## Sécurité

- Le rôle effectif vient de `public.profiles.role`, lu après validation du jeton Supabase. `user_metadata` n’accorde jamais une permission.
- Toutes les mutations administratives passent par FastAPI et une clé Supabase serveur. Cette clé ne doit jamais être exposée dans `REACT_APP_*`.
- La migration retire le droit `UPDATE` global sur `profiles` et ne réaccorde au navigateur que les colonnes de préférences éditables.
- Les tables d’administration ont RLS activé, aucun droit pour `anon`/`authenticated`, sauf lecture des prop firms actives.
- Les actions sensibles demandent `confirmation: true`, sont limitées en fréquence et écrites dans `admin_audit_logs`.
- Le support peut voir l’identité utile et les tickets, mais ne peut ni suspendre un compte, ni modifier un rôle, ni voir la facturation.
- Les secrets, jetons, mots de passe, identifiants complets et contenu Atlas sont exclus des réponses et de l’audit.

## Mise en service contrôlée

1. Sauvegarder la base puis appliquer `supabase/migrations/20260907102521_admin_backoffice.sql` dans l’environnement ciblé.
2. Vérifier côté backend : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`), `MONGO_URL`, `DB_NAME`, `JWT_SECRET` et `FRONTEND_URL`.
3. Amorcer le premier super administrateur manuellement par UUID dans l’éditeur SQL Supabase :

   ```sql
   update public.profiles
   set role = 'super_admin', status = 'active'
   where id = '<UUID_AUTH_VERIFIE>';
   ```

   Le bootstrap n’est volontairement lié à aucun e-mail codé en dur. Une fois connecté, ce compte peut attribuer les autres rôles depuis `/admin/users`.

4. Redéployer le backend puis le frontend. Aucun déploiement n’est réalisé automatiquement par cette livraison.
5. Vérifier avec un compte de chaque rôle que `/api/admin/session` renvoie les permissions attendues et qu’un compte `user` obtient `403`.

## Limites explicites

- Les montants Stripe n’étant pas persistés et Stripe n’étant pas configuré, le back-office affiche « Facturation non configurée » et ne fabrique ni MRR ni ARR.
- `registration_enabled` bloque le parcours PipsEvo et l’ancien endpoint FastAPI. Un blocage absolu de l’API publique Supabase Auth nécessite aussi de désactiver les inscriptions dans Supabase Auth ou d’installer un hook `before-user-created`.
- La donnée de marché Backtest automatique reste non configurée ; le monitoring reflète uniquement les CSV privés réellement importés.
- Les événements produit commencent à être comptés après application de la migration. L’historique antérieur n’est pas reconstitué artificiellement.

## Validation locale

```powershell
python -m compileall backend
python -m pytest backend/tests -q
cd frontend
npm.cmd test -- --watchAll=false
npm.cmd run build
```

Pour la migration, lancer les contrôles Supabase sur un environnement local démarré ou un projet explicitement lié. Ne jamais exécuter `db push` vers la production sans validation de la cible et sauvegarde.
