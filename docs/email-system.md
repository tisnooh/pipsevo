# Système e-mail PipsEvo

Le système couvre quatre flux distincts :

1. les e-mails de compte Supabase : confirmation, récupération du mot de passe, invitation, lien magique, changement d'adresse, réauthentification et alertes de sécurité ;
2. l'e-mail de bienvenue PipsEvo, envoyé une seule fois après la première connexion confirmée ;
3. le support : notification interne et accusé de réception bilingue avec référence de dossier ;
4. la newsletter en double opt-in, ses préférences et ses campagnes bilingues.

Pendant la phase temporaire Gmail, Supabase Auth envoie ses messages par le SMTP personnalisé Google et l'API FastAPI utilise le même compte SMTP. Aucun secret n'est exposé au frontend ni stocké dans Git.

## Configuration temporaire Gmail

Le compte d'envoi et de support provisoire est `tyachatfr@gmail.com`. Le nom visible doit rester `PipsEvo`.

### 1. Créer un mot de passe d'application Google

Activer la validation en deux étapes sur le compte Google, puis créer un mot de passe d'application réservé à PipsEvo. Ne jamais utiliser le mot de passe principal du compte.

### 2. Configurer le backend sur Render

Ajouter les variables suivantes dans l'environnement du backend :

```dotenv
FRONTEND_URL=https://pipsevo.vercel.app
PUBLIC_API_URL=https://<api-pipsevo>/api

EMAIL_PROVIDER=smtp
EMAIL_FROM_NAME=PipsEvo
EMAIL_FROM_ADDRESS=tyachatfr@gmail.com
EMAIL_REPLY_TO=tyachatfr@gmail.com
SUPPORT_EMAIL=tyachatfr@gmail.com
EMAIL_LOGO_URL=https://pipsevo.vercel.app/brand/pipsevo-logo.png

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tyachatfr@gmail.com
SMTP_PASSWORD=<mot-de-passe-application-google>
SMTP_USE_TLS=true

EMAIL_TOKEN_SECRET=<secret-aleatoire-different-du-JWT>
NEWSLETTER_ADMIN_KEY=<cle-aleatoire-reservee-au-serveur>
SUPPORT_RATE_LIMIT_SECRET=<secret-aleatoire>
SUPPORT_RATE_LIMIT_MAX=3
SUPPORT_RATE_LIMIT_WINDOW_MINUTES=15
```

`SMTP_PASSWORD`, `EMAIL_TOKEN_SECRET`, `NEWSLETTER_ADMIN_KEY` et `SUPPORT_RATE_LIMIT_SECRET` restent uniquement côté serveur.

### 3. Configurer Supabase Auth

Dans **Supabase Dashboard > Project Settings > Authentication > SMTP Settings**, activer le SMTP personnalisé avec :

- hôte : `smtp.gmail.com` ;
- port : `587` ;
- utilisateur : `tyachatfr@gmail.com` ;
- mot de passe : le mot de passe d'application Google ;
- adresse d'expédition : `tyachatfr@gmail.com` ;
- nom d'expéditeur : `PipsEvo`.

Dans **Authentication > Email Templates**, reporter les modèles présents dans `supabase/templates`. Ils sélectionnent automatiquement le français ou l'anglais selon la métadonnée `language` enregistrée à l'inscription.

Dans **Authentication > Providers > Email**, activer **Confirm email** et **Secure password change**. Dans les URL de redirection autorisées, conserver au minimum :

- `https://pipsevo.vercel.app/auth/callback` ;
- `https://pipsevo.vercel.app/onboarding` ;
- `https://pipsevo.vercel.app/reset-password`.

Le hook d'envoi Resend n'est pas utilisé pendant la phase Gmail. Le champ `From` reste ainsi légitime et cohérent avec le compte SMTP authentifié.

### 4. Configurer le frontend

```dotenv
REACT_APP_REQUIRE_EMAIL_CONFIRMATION=true
REACT_APP_CONTACT_EMAIL=tyachatfr@gmail.com
```

Les valeurs `REACT_APP_*` nécessitent un nouveau build du frontend.

## Support

`POST /api/support` accepte :

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "subject": "Synchronisation du journal",
  "category": "journal",
  "message": "Mon import ne met pas à jour le calendrier.",
  "locale": "fr",
  "website": ""
}
```

Catégories autorisées : `account`, `login`, `sync`, `journal`, `prop_firms`, `atlas`, `billing`, `bug`, `other`.

Le backend :

- valide et normalise les champs ;
- bloque silencieusement le champ leurre `website` ;
- limite les envois par adresse et empreinte IP, sans stocker l'adresse IP brute ;
- crée une référence `PE-AAAAMMJJ-XXXXXXXX` ;
- envoie la demande à `SUPPORT_EMAIL`, avec l'utilisateur en `Reply-To` ;
- envoie à l'utilisateur un accusé de réception dans sa langue.

## Bienvenue et authentification

- La langue est enregistrée dans les métadonnées Supabase ; le déclenchement ne dépend d'aucun marqueur client, ce qui couvre aussi les inscriptions Google.
- Après chaque ouverture de session confirmée, le client appelle `POST /api/email/welcome` et le backend envoie le message uniquement si cet utilisateur ne l'a jamais reçu.
- Une clé unique par utilisateur et une clé d'idempotence fournisseur empêchent les doubles envois.
- Un envoi interrompu en statut `sending` est automatiquement récupérable après cinq minutes.
- Les liens expirés affichent une action adaptée pour renvoyer la confirmation ou recommencer la récupération du mot de passe.

## Newsletter

- `POST /api/newsletter/subscribe` crée un abonnement en attente et envoie un lien valable 24 heures.
- `POST /api/newsletter/confirm` active l'abonnement et envoie le message de bienvenue marketing.
- `POST /api/newsletter/unsubscribe` et `/one-click-unsubscribe` désactivent immédiatement le marketing.
- `GET/PUT /api/email-preferences` synchronise les choix d'un utilisateur connecté.
- `POST /api/internal/newsletter/campaigns/send` envoie ou reprend une campagne par lots de 100 destinataires maximum. Cette route exige `X-Newsletter-Admin-Key`.
- Les e-mails de sécurité ne peuvent pas être désactivés depuis les préférences marketing.
- Les réponses publiques ne révèlent pas si une adresse est déjà abonnée.

Chaque campagne utilise un `campaign_key` stable. Rejouer le même contenu ignore les adresses déjà livrées ; réutiliser la même clé avec un contenu différent est refusé.

```json
{
  "campaign_key": "guide-discipline-2026-09",
  "subject": "Le guide discipline PipsEvo",
  "subject_en": "The PipsEvo discipline guide",
  "preheader": "Une méthode simple pour protéger tes sessions.",
  "preheader_en": "A simple method to protect your sessions.",
  "title": "Protège ta prochaine session",
  "title_en": "Protect your next session",
  "intro": "Voici le nouveau guide PipsEvo consacré à la discipline.",
  "intro_en": "Discover the new PipsEvo guide about discipline.",
  "body": "Trois étapes concrètes à appliquer avant ton premier trade.",
  "body_en": "Three practical steps to apply before your first trade.",
  "cta_label": "Lire le guide",
  "cta_label_en": "Read the guide",
  "cta_url": "https://pipsevo.vercel.app/blog/discipline",
  "audience": "trading_education",
  "max_recipients": 50
}
```

## Recette obligatoire avant ouverture

1. Envoyer un support FR puis EN et vérifier la notification, le `Reply-To`, la référence et l'accusé de réception.
2. Créer un compte neuf en FR puis EN et vérifier confirmation, redirection vers `/onboarding` et bienvenue unique.
3. Tester un lien de confirmation expiré et son renvoi.
4. Demander un mot de passe oublié et vérifier l'arrivée sur `/reset-password`.
5. Changer le mot de passe et l'adresse e-mail, puis vérifier les alertes de sécurité.
6. S'inscrire à la newsletter, confirmer, recevoir une campagne dans la bonne langue et se désinscrire.
7. Modifier les préférences e-mail, recharger et vérifier leur persistance.
8. Contrôler l'absence de secret dans le bundle navigateur et les logs publics.

Cette recette réelle nécessite le mot de passe d'application Google et la configuration SMTP du projet Supabase. Elle ne peut pas être validée uniquement avec les fichiers du dépôt.
