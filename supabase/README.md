# Supabase — PipsEvo

Le schéma principal, les politiques RLS, le calcul atomique du solde des comptes et le stockage privé des captures sont versionnés dans `migrations/`.

## Variables frontend (Vercel)

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_PUBLISHABLE_KEY`
- `REACT_APP_REQUIRE_EMAIL_CONFIRMATION=false` pendant la bêta. Pour le lancement officiel, activer également « Confirm email » dans Supabase Auth puis passer cette variable à `true`.
- `REACT_APP_BACKEND_URL`

La clé publishable est la seule clé Supabase autorisée dans le navigateur.

## Variables backend (Render)

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- les variables MongoDB restent nécessaires pendant la transition
- la clé IA reste uniquement côté serveur

## Import des données MongoDB existantes

1. Copier ponctuellement la clé `service_role` dans `SUPABASE_SERVICE_ROLE_KEY` sur la machine locale uniquement.
2. Lancer l’audit sans écriture :
   `python backend/migrate_mongo_to_supabase.py`
3. Comparer les volumes affichés à MongoDB.
4. Lancer l’import :
   `python backend/migrate_mongo_to_supabase.py --apply`
5. Tester connexion, onboarding, création/modification/suppression d’un compte, trade et payout.
6. Supprimer immédiatement `SUPABASE_SERVICE_ROLE_KEY` de l’environnement local.

Le script est relançable, utilise des upserts et préserve les UUID historiques afin que les relations restent intactes.
