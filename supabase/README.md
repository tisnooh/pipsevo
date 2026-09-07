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

## Messagerie PipsEvo — configuration temporaire Gmail

Le code utilise une identité d’expéditeur centralisée et n’enregistre aucun secret dans le dépôt :

- nom affiché : `PipsEvo`
- adresse d’envoi et de réponse temporaire : `tyachatfr@gmail.com`
- support : `tyachatfr@gmail.com`

### API PipsEvo / Render

Copier les variables e-mail documentées dans `backend/.env.example` dans le gestionnaire de secrets Render. Activer la validation en deux étapes du compte Google, générer un mot de passe d’application dédié à PipsEvo puis le placer uniquement dans `SMTP_PASSWORD`.

Le formulaire public envoie désormais `POST /api/support`. Le serveur applique validation, honeypot et limite de fréquence, enregistre la demande, transmet la demande au support avec l’utilisateur en `Reply-To`, puis envoie un accusé de réception avec une référence.

### E-mails Supabase Auth

Dans Supabase > Authentication > SMTP Settings, activer le SMTP personnalisé avec :

- Host : `smtp.gmail.com`
- Port : `587`
- Username : `tyachatfr@gmail.com`
- Password : le même mot de passe d’application Google, stocké uniquement dans Supabase
- Sender email : `tyachatfr@gmail.com`
- Sender name : `PipsEvo`

Les modèles versionnés dans `supabase/templates/` couvrent confirmation, récupération, changement d’adresse, invitation, lien magique, réauthentification et notifications de sécurité. Ils choisissent le français ou l’anglais avec `user_metadata.language`. Pour un projet Supabase hébergé, copier ces modèles dans Authentication > Email Templates ; `config.toml` configure uniquement le développement local.

Vérifier aussi dans Supabase :

- Site URL : `https://pipsevo.vercel.app`
- Redirect URLs : `/onboarding`, `/reset-password` et `/auth/callback` pour le domaine de production et localhost
- Confirm email activé
- Secure email change activé
- notifications « password changed » et « email changed » activées

Ne pas activer l’ancien Send Email Hook Resend avec cette adresse Gmail : un domaine `gmail.com` ne peut pas être vérifié comme domaine d’envoi Resend. À terme, migrer vers des adresses PipsEvo dédiées sur un domaine possédé et séparer transactionnel et marketing.

### Recette avant production

Tester avec une adresse dédiée : inscription et confirmation, renvoi de confirmation, lien expiré, mot de passe oublié, changement de mot de passe, changement d’e-mail, formulaire support FR/EN, réception support, accusé de réception, spam et mobile. Contrôler l’expéditeur visible, les liens, le dossier indésirable et les journaux Supabase/Render sans jamais y écrire le contenu sensible des messages.

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
