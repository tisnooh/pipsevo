# Connexion Google PipsEvo

Le frontend utilise le client Supabase existant, pas `/api/auth/google` (ancien placeholder backend). Aucun secret Google ne doit être placé dans une variable `REACT_APP_*`.

## Activation

1. Dans Google Cloud, sélectionner le projet PipsEvo et configurer l'écran de consentement Google Auth Platform (nom PipsEvo, contact support, URLs publiques et confidentialité).
2. Créer un client OAuth de type Application Web.
3. Ajouter l'URI de redirection Google autorisée : `https://zwnrmnoutwhazhgoomoi.supabase.co/auth/v1/callback`.
4. Dans Supabase → Authentication → Sign In / Providers → Google, renseigner le client ID et le client secret, puis activer Google. Conserver les contrôles nonce et e-mail activés.
5. Dans Supabase → Authentication → URL Configuration, ajouter les retours exacts utilisés :
   - `https://pipsevo.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (développement)
   - `http://localhost:4173/auth/callback` (vérification locale du build)
6. Ajouter les comptes de test Google si l'application est encore en mode Testing. La disponibilité publique exige une configuration Audience adaptée dans Google Cloud.

## Parcours

- Login et inscription → Continuer avec Google → Google → Supabase → `/auth/callback`.
- L'inscription exige la case de consentement avant le départ vers Google, comme le formulaire e-mail.
- Supabase établit la session; AuthProvider charge le profil existant.
- Profil terminé → `/app/dashboard`; nouveau profil → `/onboarding`.
- Refus, erreur, callback sans session ou profil indisponible → message et possibilité de réessayer, sans détails sensibles du fournisseur.
- Le bouton vérifie les paramètres publics Supabase avant de rediriger pour éviter une page brute d'erreur si Google n'est pas configuré.
- Les statistiques tierces ne sont pas chargées sur les pages d'authentification ni sur une URL contenant des jetons, même avec un consentement antérieur.

## Configuration vérifiée le 6 septembre 2026

Le Site URL Supabase a été corrigé de `http://localhost:3000` vers `https://pipsevo.vercel.app`. Les trois routes `auth/callback`, `onboarding` et `reset-password` sont autorisées explicitement pour la production et pour localhost sur les ports 3000 et 4173 (9 URLs, sans wildcard). La sauvegarde a été vérifiée après rechargement du tableau de bord Supabase.

Google reste désactivé : client ID et secret vides. L'activation et le test réel restent à effectuer après connexion du propriétaire à Google Cloud.

## Validation avant disponibilité publique

Tester avec un compte Google autorisé : nouveau compte, compte existant, annulation, refresh du dashboard, déconnexion/reconnexion, et navigateur mobile. Vérifier qu'un profil et une souscription sont créés par les triggers Supabase existants, sans doublon. Ne pas considérer les tests unitaires comme une validation de la configuration Google externe.

Documentation officielle : https://supabase.com/docs/guides/auth/social-login/auth-google
