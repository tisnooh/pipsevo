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
- Dépendances serveur effectivement utilisées épinglées ; PyJWT, cryptography, AnyIO et urllib3 mis à jour vers des versions corrigées disponibles. Les bibliothèques anciennes inutilisées (`python-jose`, `passlib`, pandas, numpy, boto3, etc.) sont retirées du runtime déclaré. Les outils de développement passent dans `requirements-dev.txt`, pytest dans `requirements-test.txt`. Le transport WebSocket utilisé dynamiquement par cTrader est conservé.
- Suivi e-mail : les réservations d'envoi de plus de cinq minutes apparaissent « Interrompu » sans modifier la base. La configuration du fournisseur sélectionné doit être complète ; sa présence n'est pas présentée comme une preuve de livraison. Les erreurs et la dernière activité sont visibles pour l'administrateur.

## Vérifications locales

| Contrôle | Résultat |
| --- | --- |
| `cd backend; python -m pytest -q` | 163 tests réussis ; également 163 dans un environnement virtuel neuf avec les nouvelles dépendances |
| `cd frontend; npm.cmd test -- --watchAll=false --runInBand` | 47 suites, 194 tests réussis |
| `cd frontend; npm.cmd run build` | Compilation de production réussie |
| `git diff --check` | Aucun problème de whitespace |
| Installation isolée de `requirements.txt` et `requirements-test.txt`, puis `pip check` | Installation réussie, aucune incompatibilité ; aucun paquet global modifié |
| `pip_audit --local --strict` dans cet environnement neuf | 68 paquets contrôlés, aucun avis connu retourné, code de sortie 0 |

Les avertissements de tests concernent notamment les anciens événements FastAPI, les dates de mongomock et une clé JWT réservée aux tests. Le passage des tests ne remplace pas une recette métier réelle.

## Sécurité : portée et limites

Une revue ciblée et une contre-revue indépendante ont confirmé et vérifié quatre correctifs : contournement de révocation via JWT historique, calcul bcrypt public non borné, injection de formule CSV et concurrence du quota Atlas. Le scan scellé a une couverture partielle : 57 fichiers entièrement revus sur 379 fichiers dans le périmètre.

L'audit npm conserve 71 alertes (63 hautes, 5 modérées, 3 faibles ; aucune critique) après les mises à jour compatibles. Elles sont principalement portées par l'ancienne chaîne CRA/CRACO et ses dépendances de compilation/développement. Cela ne prouve ni leur exploitabilité dans le bundle navigateur ni leur innocuité. Une migration contrôlée de cette chaîne et une analyse de portée restent nécessaires ; `npm audit fix --force` n'a pas été utilisé.

La protection Supabase contre les mots de passe compromis est désactivée dans le projet inspecté. Son activation doit être vérifiée avec les possibilités de l'offre choisie. Aucun changement payant ni mise à niveau de base n'a été déclenché.

Le premier audit Python avec résolution intégrale a été interrompu après environ dix minutes ; pip répétait des erreurs de désérialisation du cache et n'avait pas terminé. Un audit ciblé des paquets de projet disponibles dans l'environnement global a ensuite retourné 29 avis dans six paquets, avec certains doublons. Ce résultat ne décrit pas les versions réellement installées sur Render. Il a guidé les mises à jour et le retrait des dépendances inutilisées, suivis d'une installation neuve et de tests dans un environnement isolé.

Dans cet environnement neuf sous Windows/Python 3.14, `pip-audit 2.10.1` a ensuite vérifié les 68 paquets installés (runtime, tests et outil d'audit), sans avis connu. pip lui-même a été mis à jour vers `26.2.1` dans cet environnement isolé. Ce résultat ne garantit pas l'absence de vulnérabilité inconnue ni les versions transitives du serveur Render ; leur inventaire doit être contrôlé au déploiement. Les tests SDK Anthropic se limitent au chargement et à la création du client sans appel réseau payant.

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

## Mails : blocage non résolu

Le journal de production inspecté contient trois envois de bienvenue : deux échecs et une réservation ancienne en statut `sending`. Aucun succès de livraison n'y a été observé. Le mécanisme de reprise est testé, mais la livraison réelle n'est pas certifiée.

Les instances Free de Render bloquent les ports SMTP `25`, `465` et `587` ([documentation officielle](https://render.com/docs/free#other-limitations)). Cela pourrait expliquer les échecs Gmail SMTP si ce service utilise cette offre ; l'offre effective et les logs restent à vérifier dans un tableau de bord Render authentifié. Aucun changement de fournisseur, offre payante, mot de passe ou secret n'a été effectué. La distinction SMTP/HTTPS et les limites de déduplication sont détaillées dans `docs/email-system.md`.

## Contrôles navigateur et publication

L'accueil de production a été inspecté à 390 × 844 en mode clair : texte/boutons lisibles, largeur du contenu égale à celle du viewport, aucune extension horizontale. Le thème initial et la taille normale du navigateur ont ensuite été rétablis. La session administrateur et le journal connectés ont été chargés en lecture seule.

Le commit initial de corrections `054c1fddec7f89e8bbffbef77618d0b8d8bb9249` a été poussé sur `main`. Vercel a confirmé un déploiement de production `READY` correspondant exactement à ce SHA, avec l'alias `pipsevo.vercel.app`. Le backend répond `200` au healthcheck ; son ancienne connexion répond désormais `410`, avec les nouveaux en-têtes. Cela vérifie la présence du premier correctif serveur, pas le SHA Render.

Les compléments de suivi e-mail et de dépendances doivent eux aussi être contrôlés après leur publication. Aucun test destructif sur les utilisateurs, comptes de trading ou données de production n'a été effectué.
