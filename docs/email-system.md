# Système e-mail PipsEvo

Le code couvre désormais trois flux séparés :

1. les e-mails de compte Supabase (confirmation, récupération du mot de passe, invitation, lien magique, changement d’adresse, réauthentification et alerte après changement de mot de passe) via `supabase/functions/send-auth-email` et `supabase/templates` ;
2. la newsletter en double opt-in via l’API FastAPI, MongoDB et Resend ;
3. les préférences e-mail du compte, synchronisées côté serveur depuis **Paramètres > E-mails et notifications**.

## Configuration de production

### 1. Vérifier les domaines dans Resend

Créer deux sous-domaines sur un domaine réellement possédé par PipsEvo :

- `auth.<domaine>` pour les messages de sécurité ;
- `updates.<domaine>` pour la newsletter.

Ajouter dans le DNS les entrées SPF et DKIM fournies par Resend. Ne pas utiliser le domaine de test `resend.dev` en production.

### 2. Configurer l’API FastAPI

Ajouter sur l’hébergement du backend :

```dotenv
FRONTEND_URL=https://pipsevo.vercel.app
PUBLIC_API_URL=https://<api-pipsevo>/api
RESEND_API_KEY=re_...
EMAIL_TOKEN_SECRET=<secret-aleatoire-different-du-JWT>
NEWSLETTER_ADMIN_KEY=<cle-aleatoire-reservee-au-serveur>
AUTH_EMAIL_FROM=PipsEvo Sécurité <securite@auth.<domaine>>
NEWSLETTER_EMAIL_FROM=PipsEvo <newsletter@updates.<domaine>>
EMAIL_REPLY_TO=support@<domaine>
```

`EMAIL_TOKEN_SECRET` doit être long, aléatoire et conservé uniquement côté serveur.

### 3. Déployer le hook d’authentification Supabase

Depuis la racine du dépôt lié au projet Supabase :

```bash
npx supabase secrets set RESEND_API_KEY=re_... AUTH_EMAIL_FROM="PipsEvo Sécurité <securite@auth.<domaine>>" EMAIL_REPLY_TO=support@<domaine> SEND_EMAIL_HOOK_SECRET=<secret-du-hook>
npx supabase functions deploy send-auth-email --no-verify-jwt
```

Dans **Supabase Dashboard > Authentication > Hooks > Send Email** :

- sélectionner le hook HTTP ;
- utiliser l’URL de la fonction `send-auth-email` ;
- copier le secret du hook dans `SEND_EMAIL_HOOK_SECRET` ;
- activer le hook.

Dans **Authentication > Providers > Email**, activer **Confirm email** et **Secure password change**. Ajouter ces URL dans la liste des redirections autorisées :

- `https://pipsevo.vercel.app/onboarding`
- `https://pipsevo.vercel.app/reset-password`

### 4. Configurer le frontend

```dotenv
REACT_APP_REQUIRE_EMAIL_CONFIRMATION=true
REACT_APP_CONTACT_EMAIL=support@<domaine>
```

Redéployer le frontend après modification de variables `REACT_APP_*`.

## Comportement newsletter

- `POST /api/newsletter/subscribe` crée un abonnement en attente et envoie un lien valable 24 heures.
- `POST /api/newsletter/confirm` active l’abonnement et envoie le message de bienvenue.
- `POST /api/newsletter/unsubscribe` et `/one-click-unsubscribe` désactivent immédiatement le marketing.
- `GET/PUT /api/email-preferences` synchronise les choix d’un utilisateur connecté.
- `POST /api/internal/newsletter/campaigns/send` envoie ou reprend une campagne par lots de 100 destinataires maximum. Cette route exige l’en-tête privé `X-Newsletter-Admin-Key`.
- Les e-mails de sécurité ne peuvent pas être désactivés depuis les préférences marketing.
- Les réponses publiques ne révèlent pas si une adresse est déjà abonnée.

Chaque campagne doit avoir un `campaign_key` stable (par exemple `guide-discipline-2026-09`). Rejouer la même requête ignore les adresses déjà livrées ; réutiliser la même clé avec un contenu différent est refusé. Exemple de corps :

```json
{
  "campaign_key": "guide-discipline-2026-09",
  "subject": "Le guide discipline PipsEvo",
  "preheader": "Une méthode simple pour protéger tes sessions.",
  "title": "Protège ta prochaine session",
  "intro": "Voici le nouveau guide PipsEvo consacré à la discipline.",
  "body": "Trois étapes concrètes à appliquer avant ton premier trade.",
  "cta_label": "Lire le guide",
  "cta_url": "https://pipsevo.vercel.app/blog/discipline",
  "audience": "trading_education",
  "max_recipients": 50
}
```

## Recette obligatoire avant ouverture

1. Créer un compte neuf et confirmer que le message PipsEvo arrive (boîte principale + spam).
2. Vérifier que le bouton active le compte puis ouvre `/onboarding`.
3. Demander un mot de passe oublié et vérifier l’arrivée sur `/reset-password`.
4. S’inscrire depuis le pied de page, confirmer, puis utiliser le lien de désinscription.
5. Modifier les cinq choix dans les paramètres, recharger la page et vérifier qu’ils sont conservés.
6. Contrôler SPF, DKIM, le domaine d’envoi et l’absence de secret dans le bundle navigateur.
