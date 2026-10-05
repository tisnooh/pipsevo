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
- Compilation frontend migrée de CRA/CRACO vers Vite 8.3.2 et son plugin React 6.1.1. Les anciennes substitutions transitives ne sont plus nécessaires : la chaîne vulnérable a été retirée. Les composants métier sont conservés ; seuls `App` et l'entrée changent d'extension vers `.jsx`. Node `^20.19.0 || >=22.12.0` est déclaré, npm 11.13.0 est conservé et Vercel utilise Node 24.x.
- Frontière de compilation : seules six variables publiques explicitement revues sont exposées. Les secrets SMTP, Supabase service role, IA, cron et les clés `REACT_APP_*` inconnues ne sont pas sérialisés. Contrôles exécutés avant chaque build et trois nouveaux tests de non-régression.
- Liens directs : la réécriture SPA couvre les pages publiques, auth, application et administration sans intercepter `/api/sync-due`. Les en-têtes et le cron existants sont conservés. La démo de backtest garde une entrée dédiée et une API synthétique locale, distinctes de l'application réelle.

## Vérifications locales

| Contrôle | Résultat |
| --- | --- |
| `cd backend; python -m pytest -q` | 163 tests réussis ; également 163 dans un environnement virtuel neuf avec les nouvelles dépendances |
| `cd frontend; npm.cmd test -- --watchAll=false --runInBand` | 48 suites, 197 tests réussis après migration et installation propre |
| `cd frontend; npm.cmd run build` | Compilation de production réussie |
| `git diff --check` | Aucun problème de whitespace |
| `cd frontend; npm.cmd ci --ignore-scripts` | Installation propre du lockfile réussie ; avertissements de dépréciation d'outils de développement encore présents |
| `cd frontend; npm.cmd run check:build-deps` | Versions verrouillées, retrait de CRA/CRACO, allowlist publique et routage SPA vérifiés |
| `cd frontend; npm.cmd run lint` | Contrôle des règles React Hooks réussi, aucune erreur ni avertissement |
| `cd frontend; node scripts/backtest-preview.cjs --build-only` | Compilation de la démo isolée réussie, sans importer l'entrée de production |
| `cd frontend; npm.cmd audit --omit=dev --json` | Aucune alerte connue, code de sortie 0 |
| `cd frontend; npm.cmd audit --json` | Cinq alertes hautes de compilation, aucune modérée ou critique ; cause unique non corrigée `braces` |
| Installation isolée de `requirements.txt` et `requirements-test.txt`, puis `pip check` | Installation réussie, aucune incompatibilité ; aucun paquet global modifié |
| `pip_audit --local --strict` dans cet environnement neuf | 68 paquets contrôlés, aucun avis connu retourné, code de sortie 0 |

Les avertissements de tests concernent notamment les anciens événements FastAPI, les dates de mongomock et une clé JWT réservée aux tests. Le passage des tests ne remplace pas une recette métier réelle.

## Sécurité : portée et limites

Une revue ciblée et une contre-revue indépendante ont confirmé et vérifié quatre correctifs : contournement de révocation via JWT historique, calcul bcrypt public non borné, injection de formule CSV et concurrence du quota Atlas. Le scan scellé a une couverture partielle : 57 fichiers entièrement revus sur 379 fichiers dans le périmètre.

Le premier lot de substitutions avait réduit l'audit npm de 71 à 58 alertes. Après retrait de CRA/CRACO et migration vers Vite, l'audit complet retourne **5 alertes hautes**, propagées par une seule cause : `braces` 3.0.3 via Tailwind 3, micromatch, fast-glob et chokidar. L'[avis GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), revérifié le 5 octobre, ne publie aucune version corrigée. Ces paquets sont utilisés par la compilation CSS, pas comme dépendances de production ; `tailwindcss-animate`, plugin de compilation seulement, est déclaré en développement. L'audit `--omit=dev` retourne zéro avis, sans suppression ni faux override. Cela ne certifie ni l'absence de toute vulnérabilité ni l'innocuité générale des outils de compilation.

Les glob patterns de contenu Tailwind sont deux constantes locales revues ; aucun utilisateur de l'application ne les fournit. Les builds ne doivent pas être exposés à des configurations non fiables. Un remplacement majeur par Tailwind 4 reste une évolution distincte à vérifier visuellement ; `npm audit fix --force` n'a pas été utilisé. Les anciennes causes node-forge, nth-check, svgo, uuid et Webpack ne sont plus dans le graphe audité.

La migration utilise des versions Vite/Jest/Babel explicitement épinglées et un lockfile testé par installation neuve. Les 197 tests frontend et la compilation optimisée passent ; les hashes locaux Vite sont `index-DviCptWz.js` et `index-B8iQaxjK.css`. Ils ne servent pas à identifier un bundle distant compilé avec d'autres variables d'environnement. La procédure actuelle est dans `frontend/README.md`.

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

Le journal de production inspecté contenait initialement deux échecs et une réservation ancienne en statut `sending`. Après publication, une connexion normale a repris cette réservation ; l'envoi SMTP a à nouveau échoué. Le journal affiche finalement trois échecs, sans envoi bloqué ni succès. Le mécanisme de reprise fonctionne, mais la livraison réelle n'est pas certifiée.

Le tableau de bord Render authentifié confirme désormais que `pipsevo-backend` utilise une instance **Free**. Les logs du 5 octobre à 07:48:40 affichent `OSError: [Errno 101] Network is unreachable` pendant `socket.create_connection`, avant l'authentification SMTP. Les instances Free bloquent les ports SMTP `25`, `465` et `587` ([documentation officielle](https://render.com/docs/free#other-limitations)). Le transport Gmail SMTP du backend ne peut donc pas fonctionner avec cette offre : changer le mot de passe ou pousser à nouveau le code ne débloque pas ces ports.

La solution doit être choisie par le propriétaire : envoi HTTPS via l'API Gmail avec une autorisation OAuth dédiée, ou fournisseur d'envoi HTTPS avec une identité d'expédition vérifiée. Aucun changement de fournisseur, permission Google supplémentaire, offre payante, mot de passe ou secret n'a été effectué. Le SMTP Supabase Auth reste un transport séparé, à tester indépendamment. La distinction SMTP/HTTPS et les limites de déduplication sont détaillées dans `docs/email-system.md`.

## Contrôles navigateur et publication

L'accueil de production a été inspecté à 390 × 844 en mode clair : texte/boutons lisibles, largeur du contenu égale à celle du viewport, aucune extension horizontale. Le thème initial et la taille normale du navigateur ont ensuite été rétablis. La session administrateur et le journal connectés ont été chargés en lecture seule.

Le commit initial de corrections `054c1fddec7f89e8bbffbef77618d0b8d8bb9249` a été poussé sur `main`. Vercel a confirmé un déploiement de production `READY` correspondant exactement à ce SHA, avec l'alias `pipsevo.vercel.app`. Le backend répond `200` au healthcheck ; son ancienne connexion répond désormais `410`, avec les nouveaux en-têtes. Cela vérifie la présence du premier correctif serveur, pas le SHA Render.

Le complément `43e07935af165466e8a47935bd3919445e3f2655` a aussi été poussé : déploiement Vercel de production `READY`, SHA exact et alias vérifiés. Le backend expose le nouveau champ de suivi des envois interrompus et répond `200` au healthcheck. Le journal des mails a été vérifié sur le vrai site, avec les trois échecs décrits ci-dessus.

Les substitutions de dépendances frontend ont été publiées dans `aee28a569e6abf0d131ca1ec0295846793e8c97a`. Le déploiement Vercel `dpl_eun9J3EqGAseYzEeEwzQznMA7jbC` est `READY`, cible `production`, SHA exact et alias `pipsevo.vercel.app` vérifiés. L'accueil répond `200` et conserve les en-têtes `nosniff` et `DENY`. Les hashes locaux mentionnés plus haut ne servent pas à identifier un bundle distant compilé avec d'autres variables d'environnement.

Render confirme le déploiement serveur `dep-db1jjegae00c73fjr7o0` en état `Live`, avec le commit exact `43e07935af165466e8a47935bd3919445e3f2655` ; le healthcheck répond `200` avec API et base `ok`. La mise à jour frontend suivante ne modifie pas le backend. Aucun test destructif sur les utilisateurs, comptes de trading ou données de production n'a été effectué.
