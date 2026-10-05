# Vérification PipsEvo — 5 octobre 2026

Ce document décrit les contrôles réellement exécutés. Il ne constitue pas une certification de sécurité complète ni une validation de toutes les plateformes en conditions réelles. Marketing et comptes de réseaux sociaux sont hors périmètre.

## Correctifs livrés

- Authentification backend exclusivement validée par Supabase : les anciens JWT Mongo ne donnent plus accès aux API. Les anciens endpoints d'inscription/connexion répondent `410` sans calcul bcrypt ni création d'utilisateur.
- Quota Atlas partagé et atomique : dix réservations par utilisateur sur vingt-quatre heures, y compris les requêtes en cours. Une panne du stockage refuse l'analyse ; un échec après réservation ne libère pas la place.
- Contexte envoyé aux fournisseurs IA borné, données d'identification supprimées, troncature signalée et délai Anthropic explicite.
- Exports CSV protégés contre les formules précédées d'espaces/caractères de contrôle ; les nombres négatifs légitimes restent numériques.
- Newsletter limitée par adresse, IP et volume global, avec compteurs atomiques et identifiants hachés.
- En-têtes de protection ajoutés au frontend et au backend ; configuration CORS avec wildcard sans cookies d'authentification.
- TradeLocker : prix/quantités/coûts non finis ou invalides écartés ; un tick cost absent ou nul ne produit plus un P&L fictif de zéro. La version de normalisation passe à 3 pour réimporter l'historique à la prochaine synchronisation.
- Les anciens résultats dérivés avec tick cost nul sont traités comme non mesurés à la lecture. Le win rate peut être déterminé par des prix d'entrée/sortie valides, indépendamment d'un montant monétaire inconnu. Les positions ouvertes n'entrent pas dans ces résultats.
- Journal/statistiques : signes des pertes conservés, résultat inconnu affiché `—`, absence de respect du plan non assimilée à un refus, mini-graphique fictif retiré.
- Confirmations adaptées au thème et au mobile pour comptes, connexions, imports, trades et payouts. Les mutations payout ne peuvent pas être déclenchées deux fois pendant une confirmation.
- Administration : délai de vérification limité, message d'erreur lisible et nouvelle tentative ; une ancienne réponse ne remplace plus une réponse actualisée.
- Versions serveur FastAPI, Starlette, Uvicorn, Motor et PyMongo alignées sur les versions utilisées lors des tests. Résolution des dépendances vérifiée avec `pip install --dry-run`.

## Vérifications locales

| Contrôle | Résultat |
| --- | --- |
| `cd backend; python -m pytest -q` | 151 tests réussis |
| `cd frontend; npm.cmd test -- --watchAll=false --runInBand` | 46 suites, 192 tests réussis |
| `cd frontend; npm.cmd run build` | Compilation de production réussie |
| `git diff --check` | Aucun problème de whitespace |
| `cd backend; python -m pip install --dry-run -r requirements.txt` | Résolution réussie, sans installation globale |

Les avertissements de tests concernent notamment les anciens événements FastAPI, les dates de mongomock et une clé JWT réservée aux tests. Le passage des tests ne remplace pas une recette métier réelle.

## Sécurité : portée et limites

Une revue ciblée et une contre-revue indépendante ont confirmé et vérifié quatre correctifs : contournement de révocation via JWT historique, calcul bcrypt public non borné, injection de formule CSV et concurrence du quota Atlas. Le scan scellé a une couverture partielle : 57 fichiers entièrement revus sur 379 fichiers dans le périmètre.

L'audit npm conserve 71 alertes (63 hautes, 5 modérées, 3 faibles ; aucune critique) après les mises à jour compatibles. Elles sont principalement portées par l'ancienne chaîne CRA/CRACO et ses dépendances de compilation/développement. Cela ne prouve ni leur exploitabilité dans le bundle navigateur ni leur innocuité. Une migration contrôlée de cette chaîne et une analyse de portée restent nécessaires ; `npm audit fix --force` n'a pas été utilisé.

La protection Supabase contre les mots de passe compromis est désactivée dans le projet inspecté. Son activation doit être vérifiée avec les possibilités de l'offre choisie. Aucun changement payant ni mise à niveau de base n'a été déclenché. L'audit Python complet des avis de vulnérabilité n'a pas été exécuté : `pip_audit` n'est pas installé dans l'environnement.

## Plateformes : état réellement observé

| Plateforme | État de vérification |
| --- | --- |
| TradeLocker | Synchronisations de production réussies observées. Les montants monétaires ne sont pas certifiés : les réponses inspectées donnent un tick cost nul et aucun P&L exploitable. Le correctif évite les faux zéros ; il ne crée pas une conversion monétaire manquante. Comparaison avec le relevé broker nécessaire. |
| MetaTrader / MetaApi | Connexion MT5 encore en attente, aucune synchronisation réussie observée. Compte de test et état fournisseur à résoudre. |
| cTrader | Code et tests présents ; aucune connexion réelle active observée. Recette OAuth et historique avec application approuvée nécessaire. |
| Tradovate | Code et tests présents ; aucune connexion réelle active observée. Accès API/application approuvée et compte sandbox nécessaires. |
| NinjaTrader | Accès développeur et documentation authentifiée requis ; pas de certification automatique. |
| Quantower, Sierra Chart, DXtrade, Match-Trader | Import manuel compatible ; pas de synchronisation automatique certifiée. |

Objectifs, règles de challenge, émotions, plan de trading, notes et captures ne sont pas inventés lorsque le fournisseur ne les expose pas. Les champs requis restent configurables manuellement.

## Contrôles navigateur et publication

L'accueil de production a été inspecté à 390 × 844 en mode clair : texte/boutons lisibles, largeur du contenu égale à celle du viewport, aucune extension horizontale. Le thème initial et la taille normale du navigateur ont ensuite été rétablis. La session administrateur et le journal connectés ont été chargés en lecture seule.

La publication se fait sur `main`, pour `https://pipsevo.vercel.app`. La réussite du push, le SHA exact du déploiement Vercel et la présence du correctif backend doivent être contrôlés après publication. Aucun test destructif sur les utilisateurs, comptes de trading ou données de production n'a été effectué.
