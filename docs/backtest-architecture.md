# PipsEvo Backtest Lab — architecture et état réel

Date : 7 septembre 2026. Cette livraison est un **socle phases 1–2**, pas la réalisation complète des six phases de la mission. Aucun fournisseur payant n’a été activé, aucun cours artificiel n’est exposé en production, aucun déploiement n’est effectué par cette tâche.

## 1. Audit de départ

Checkout réellement utilisé : `C:\Users\utilisateur\Documents\Codex\Projects\PipsEvo`. Le chemin ambiant `Documents\ChatGPT\PipsEvo` n’est pas le checkout actif. Base de travail : `edbb808`, branche `main`, arbre initial propre.

| Zone | Constat et décision |
| --- | --- |
| Frontend | React 19, Vite, React Router 7, JSX, Tailwind, design `pe-*`. Routes chargées à la demande. Réutilisés sans refonte du thème. CRA/CRACO a été retiré le 5 octobre 2026. |
| Navigation | Shell connecté `/app/*`, protection existante via `AuthContext`. `/app/backtest` était un simulateur déterministe d’hypothèses, sans cours historiques. Conservé à `/app/backtest/projection`. |
| Auth | Supabase côté client, API FastAPI vérifiant le jeton et le profil (avec compatibilité JWT existante). Aucune nouvelle authentification de production. |
| Données | Le journal actuel utilise Supabase côté frontend ; FastAPI possède déjà MongoDB pour son état serveur et ses services. Le Lab utilise des collections MongoDB **distinctes**, accessibles exclusivement derrière l’auth API. Pas de double écriture journal live/Mongo/Supabase. |
| Calculs | Les utilitaires existants de journal et sizing servent le live et utilisent des nombres JS. Le moteur historique utilise `Decimal` côté serveur et conserve les montants en chaînes décimales. Aucun changement rétroactif des calculs live. |
| Dates | Les helpers calendrier live groupent des dates de trades. Le replay nécessite des instants UTC et un curseur unique ; domaine séparé pour ne pas changer le calendrier existant. |
| Graphiques | Recharts dans le produit, TradingView embarqué dans Marchés ; aucun des deux n’est un moteur historique d’ordres. Lightweight Charts ajouté uniquement au chunk du Lab. |
| Atlas | Contexte structuré existant dans `backend/atlas.py`, laissé intact. Futur branchement via métriques vérifiées du Lab, pas calcul approximatif par LLM. |
| Commercial | Le produit est en bêta. Limites centralisées dans `backend/backtest/limits.py` ; pas de faux abonnement Pro débloqué par métadonnées client. |
| Tests | Suites Jest et pytest existantes conservées ; tests domaine/API et banc visuel séparés ajoutés. Pas de script typecheck existant et projet majoritairement JSX. |

## 2. Choix de graphique et sources officielles

**Lightweight Charts 5.1.0** : rendu canvas incrémental, OHLCV, prix/croix/zoom/pan, plusieurs instances, personnalisation du thème. Licence Apache 2.0 ; attribution TradingView conservée dans le graphique et lien visible sous chaque graphique. La bibliothèque ne fournit ni données, ni moteur de replay, ni outils de dessin prêts à l’emploi. Sources : [documentation](https://tradingview.github.io/lightweight-charts/docs), [licence et présentation](https://www.tradingview.com/lightweight-charts/).

**Advanced Charts non retenu pour ce lot** : aucun accès/licence approuvé dans le dépôt ; ne pas copier ou charger une bibliothèque propriétaire depuis un tiers. [Conditions et accès officiels](https://www.tradingview.com/advanced-charts/).

### Comparaison des fournisseurs

Les droits de diffusion ne se déduisent pas d’une clé API ni d’un abonnement personnel. Prix examinés le 7 septembre 2026 ; aucun achat n’a été effectué.

| Fournisseur | Marchés | Historique / granularité | Coût estimé | SaaS commercial | Atouts / limites | Choix |
| --- | --- | --- | --- | --- | --- | --- |
| Databento | Futures, notamment CME via GLBX.MDP3 | OHLCV 1s/1m/1h/1d ; profondeur variable selon dataset, historique multiannuel | À l’usage ou abonnement ; montant du périmètre PipsEvo **à valider** avec estimation par requête | Droits de diffusion et conservation **à valider par écrit** avec fournisseur/place | Contrats datés et métadonnées ; bonne piste futures. Rollover, budget et redistribution doivent être explicités. | Candidat futures retenu pour prochaine intégration, **pas encore connecté** |
| Twelve Data | Forex notamment | Séries temporelles ; profondeur exacte par symbole/intervalle **à valider** | Plan Business et volume de crédits **à valider** | Offre Business, sous réserve des licences de places | Piste Forex ; ne pas utiliser un forfait personnel pour redistribuer au public. | Candidat Forex, non intégré |
| Fichiers CSV privés de l’utilisateur | Futures du catalogue, EURUSD/GBPUSD | Bougies 1m, jusqu’à 100 000 par fichier ; profondeur dépend du fichier | Pas d’achat API par PipsEvo ; stockage/hébergement restent payants | L’utilisateur doit disposer des droits adaptés ; aucune redistribution interutilisateur | Disponible sans service externe ; origine déclarée et structure validée, authenticité économique non certifiable par le parseur. | **Implémenté** |

Sources : [Databento tarifs](https://databento.com/pricing), [démarrage historique](https://databento.com/docs/getting-started/build-first-app?historical=http&live=http), [lecture de séries](https://databento.com/docs/api-reference-historical/timeseries/timeseries-get-range), [estimation de coût](https://databento.com/docs/api-reference-historical/metadata/metadata-get-cost), [Twelve Data usage commercial](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage), [Twelve Data conditions](https://twelvedata.com/terms).

## 3. Architecture du lot

```text
React (UI, lecture/pause, graphes synchronisés)
  → API authentifiée /api/backtest
    → commandes + révision attendue
      → moteur Decimal pur
      → sauvegarde atomique du snapshot
    → PrivateCsvProvider (filtrage propriétaire + bornes du curseur)
      → MongoDB, collections privées backtest_*
```

- `backend/backtest/instruments.py` : contrat, tick, multiplicateur, pas de quantité, sizing et P&L.
- `engine.py` : commandes, exécution, clôtures partielles, marquage d’équité.
- `data.py` : contrat `MarketDataProvider`, normalisation et provider privé.
- `analytics.py` : métriques calculées sur trades entièrement clôturés.
- `routes.py` : orchestration authentifiée, ownership, sauvegarde concurrente.
- `limits.py`, `body_limit.py` : quotas bêta et taille des requêtes avant parsing multipart.
- `frontend/src/features/backtest/*` : accueil, ticket, session, graphes, agrégation, API et styles isolés.

### Persistance et index

Nouvelles collections :

- `backtest_datasets` : source, instrument, contrat, statut d’import et qualité.
- `backtest_bars` : OHLCV normalisé, propriétaire, dataset, timestamp de début de minute.
- `backtest_sessions` : propriétaire, config, snapshot du moteur, curseur, réglages, révision.
- `backtest_strategies` : nom, description, règles. Snapshot indépendant dans chaque session/ordre/trade.
- `backtest_usage` : compteur par utilisateur/minute, TTL de deux minutes.

Index créés de manière idempotente au démarrage backend : ID unique ; propriétaire/date sur les collections de catalogue ; propriétaire/dataset/timestamp unique sur les bougies ; TTL sur les compteurs. **Aucune migration SQL Supabase requise pour ce choix de stockage.** Mongo n’utilise pas RLS : chaque route et chaque requête fournisseur filtre le propriétaire serveur, et aucun client Mongo n’est livré au navigateur. Les tests A/B couvrent lecture/écriture/réutilisation de dataset et suppression.

Une commande exige la révision courante. Le remplacement de snapshot est conditionné par `(id, user_id, revision)` ; deux onglets ne peuvent pas exécuter deux actions à partir de la même révision. Un conflit renvoie 409. Après une erreur réseau ambiguë, recharger au lieu de rejouer automatiquement une commande. Pas de sauvegarde optimiste de P&L côté navigateur.

## 4. Données et absence de fuite du futur

- CSV UTF-8, séparateur virgule, `timestamp` ou `ts_event` ISO avec offset explicite, `open,high,low,close`, `volume` facultatif.
- Les timestamps sont **les ouvertures des bougies 1m**. Ordre strict, sans doublons, OHLC cohérent, valeurs finies positives, prix alignés sur le tick. Prix négatifs (ex. cas exceptionnel WTI historique) non supportés et explicitement rejetés dans ce lot.
- Un contrat futures doit être daté (ex. NQH5), sans splice continu implicite ni correction de rollover. Si le CSV comporte un symbole de contrat, il doit correspondre au contrat déclaré.
- Le dernier OHLC visible correspond à `cursor`. `currentReplayTimestamp = cursor + 60` est l’instant connu **après sa clôture**.
- L’API de bougies plafonne toujours `before` au curseur serveur, même si un client demande une date future. Seule la prochaine minute est chargée pour une commande `next`, puis retournée une fois le snapshot sauvegardé.
- Au plus 2 000 bougies par page ; historique antérieur à la demande ; au plus 10 000 bougies en mémoire graphique. Aucun téléchargement de toute la série dans le navigateur au lancement.
- Intervalles absents comptés et affichés, jamais remplis par des bougies artificielles. Une fermeture ne peut pas être distinguée automatiquement d’une panne de feed dans ce lot : aucun calendrier de bourse/holiday complet n’est revendiqué.
- Agrégation 1m/5m/15m/1h/4h **alignée sur UTC**, uniquement à partir des bougies déjà connues ; dernière bougie et début d’une fenêtre peuvent être partiels. Ce n’est pas encore l’agrégation par ouverture de session propre à chaque place. Les overlays NY AM/killzones et le calendrier de vacances ne sont pas livrés.
- Fuseau IANA conservé dans la session ; conversion d’affichage via Intl et validation via zoneinfo/tzdata, incluant les changements d’heure. L’axe standard du graphique reste UTC ; les infobulles sont localisées.

## 5. Conventions d’exécution (version moteur 1)

| Action | Convention |
| --- | --- |
| Market | Commande après la clôture visible ; exécution prochaine ouverture disponible + slippage adverse. |
| Limit | Achat si low ≤ limite ; vente si high ≥ limite. Exécution à la limite ou meilleure ouverture si déjà exécutable. Aucun slippage violant la limite. |
| Stop d’entrée | Franchissement du high/low ; exécution au déclencheur ou ouverture défavorable en gap, puis slippage adverse. |
| SL et TP même bougie | SL prioritaire ; sortie marquée `ambiguous=true`. Pas d’inférence favorable du chemin intrabar. |
| Entrée intrabar | Si SL atteint, hypothèse conservatrice ; TP touché seulement dans cette bougie n’est pas crédité car il peut précéder l’entrée. Pas de précision tick prétendue. |
| Gap au-delà SL/TP à l’entrée | Ordre rejeté si l’encadrement devient invalide ; budget de risque réévalué sur le fill et ordre rejeté s’il est dépassé. |
| Stop en gap | Prix le plus défavorable entre ouverture et stop, puis slippage adverse. |
| TP | Ordre limite à l’objectif exact, sans amélioration optimiste. |
| Clôture volontaire | Ordre market de sortie à la prochaine ouverture. Quantité personnalisable pour les sorties partielles. |
| Break-even | Déplacement du stop au prix d’entrée si le cours connu l’a dépassé ; ne garantit pas zéro net après frais/gap. |
| Fin du fichier | Clôture explicite au dernier close disponible avec slippage (`data_end`), annulation des ordres non exécutés et session terminée. Aucun ordre bloqué indéfiniment faute de prochaine bougie. |
| Retour en arrière | Autorisé avant tout ordre ; désactivé ensuite pour ne pas mélanger une position issue du futur avec une bougie ancienne. Nouveau test = nouvelle session. |

Futures USD : `(exit - entry) × multiplicateur × contrats × sens`. Forex EURUSD/GBPUSD : différence de prix × 100 000 × lots × sens, donc P&L directement en USD. **USDJPY/GBPJPY sont exclus tant que les conversions historiques vers USD ne sont pas implémentées.** Pas de conversion au taux actuel.

Références multiplicateurs : [CME tableaux E-mini/Micro](https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html), [MNQ](https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html). Les spécifications sont centralisées ; valider de nouveau avec les définitions du fournisseur au branchement commercial.

Commission saisie en **aller-retour par contrat/lot** : moitié à l’entrée, moitié sur chaque quantité clôturée. P&L net d’un trade = somme des sorties brutes moins l’ensemble des frais. Les partiels ne créent pas plusieurs trades dans les analytics. Sizing arrondi vers le bas au pas de quantité, risque incluant frais et estimation du slippage entrée/sortie. Une seule position ou entrée en attente à la fois ; pas encore de scale-in.

Drawdown d’équité : observation aux clôtures de bougies/commandes, pas aux ticks ni aux extrêmes intrabar. MAE/MFE exacts non affichés. Les heures d’exécution intrabar sont identifiées par la minute, pas comme une seconde connue.

## 6. Fonctionnalités effectivement livrées

- Accueil sessions et formulaire de création, catalogue d’historiques privés, vérification CSV.
- Contrats ES/NQ/MES/MNQ/YM/RTY/CL/GC, EURUSD/GBPUSD (USD uniquement).
- Bougies/volumes, crosshair/zoom/pan, plein écran, un ou deux graphiques au même curseur.
- Play/pause, minute suivante, recul avant premier ordre, vitesses cibles 1/2/5/10/25 (débit réel limité par API/sauvegarde).
- Pause automatique lors d’une exécution, perte de visibilité de l’onglet et erreur.
- Market/Limit/Stop, achat/vente, SL/TP, quantité/risque USD/risque %, slippage/frais.
- Position, sortie partielle personnalisée, break-even, journal simulé indépendant et historique d’ordres.
- Création/listage de stratégies, checklist snapshot par ordre.
- Solde/équité, net, R, win rate, profit factor, espérance, moyennes, séries, drawdowns ; résultats cohérents après rechargement.
- Mode mobile une colonne sans overflow horizontal. Ticket sous le graphique dans ce lot, pas encore une bottom sheet de trading dédiée.

### Routes

- `/app/backtest` : Lab (sessions, données, stratégies).
- `/app/backtest/session/:sessionId` : replay.
- `/app/backtest/projection` : ancien simulateur mathématique conservé.
- API : `/api/backtest/catalog`, `/datasets`, `/strategies`, `/sessions`, `/sessions/:id/bars`, `/sessions/:id/commands`, `/account-data` (purge avant suppression de compte).

## 7. À faire avant de déclarer le Lab complet

**Phase 1 restante / mise en production** : connecteur Databento réellement intégré et testé avec clé ; licence de diffusion/conservation ; mapping contrats/calendrier de marché ; droits et abonnement Forex ; cache licencié ; budgets de téléchargement ; E2E avec authentification et vraie base staging ; traitement des imports interrompus après arrêt serveur ; quota de création atomique (les limites par comptage peuvent actuellement être dépassées par créations simultanées). La suppression de compte appelle désormais la purge authentifiée `/api/backtest/account-data` avant de supprimer l’identité Supabase ; son isolation multi-utilisateur est couverte par test.

**Phase 2 complémentaire** : dragging SL/TP, prévisualisation du risque/RR avant envoi, break-even avec frais, sorties 25/50/75 rapides, édition de protections, audit événementiel complet plutôt que snapshots uniquement, clôtures testées sur microstructure plus fine.

**Phase 3** : édition/suppression des stratégies, règles structurées par marchés/sessions, notes/émotions/captures, analyses intersessions et graphiques de distribution/calendrier/segments, métriques de conformité.

**Phases 4–6** : drawings persistants, undo, FVG/liquidité/BOS/MSS/killzones, agrégation par marché, quatre graphiques, comparaison Backtest/Live, Atlas, replay aveugle de trades réels, DSL utilisateur, stratégies automatiques, Monte Carlo. Rien de ceci n’est présenté comme fonctionnel dans l’UI actuelle.

## 8. Variables, comptes, coût et déploiement

Import privé : aucune nouvelle clé requise. Réutilise les variables existantes backend `MONGO_URL`, `DB_NAME`, validation Supabase, CORS, et frontend `REACT_APP_BACKEND_URL`. Les index sont créés au démarrage ; ne pas exposer MongoDB au navigateur.

Prochaine connexion Databento : créer/choisir un compte fournisseur autorisé pour l’usage PipsEvo, valider par écrit droits de diffusion et rétention, puis ajouter une clé **server-only** (nom proposé `DATABENTO_API_KEY`). Cette variable **n’est pas encore consommée par ce code** : ajouter seulement une clé ne suffit pas à activer un connecteur. Aucun callback OAuth nécessaire pour une API historique par clé. Prévoir un plafond global/utilisateur, estimation `metadata.get_cost` avant récupération, et accords de cache. Montants **à valider** selon contrats, période et droits.

Coûts actuels : stockage Mongo des fichiers privés, trafic API et hébergement déjà utilisés. Pas de coût historique externe automatique. Les tests ne consomment aucune API payante.

## 9. Validation et reproduction

Commandes depuis le checkout :

```text
python -m pip install -r backend/requirements-test.txt
python -m pytest backend/tests -q
cd frontend
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
```

La configuration `requirements.txt` fournit déjà `tzdata` ; ce paquet manquait dans l’environnement Python local et a été installé. L’installation de Lightweight Charts a révélé un peer Recharts absent (`react-is`) ; désormais déclaré explicitement en version 19.0.0. `lightweight-charts` est fixé à 5.1.0. Les dépendances directes vulnérables signalées pendant ce lot ont été relevées vers `axios` 1.20.0, `react-router-dom` 7.18.3 et `postcss` 8.5.28. L’audit restant concerne surtout l’ancienne chaîne CRA/`react-scripts` et ses outils de build ; `npm audit fix --force` propose notamment un remplacement destructif par `react-scripts@0.0.0` et ne doit pas être appliqué sans migration dédiée.

Résultat final local : **61 tests backend** et **132 tests frontend** réussis ; compilation Python réussie ; build frontend optimisé réussi. Le dépôt ne fournit pas de script TypeScript (code JSX) ni de configuration ESLint 9 autonome ; le contrôle de compilation CRA/CRACO est passé sans erreur. Ruff n’est pas installé dans l’environnement. L’audit npm après correctifs directs signale encore 37 alertes sans critique, liées principalement à CRA/`react-scripts` et ses transitives.

Tests ajoutés : fixtures ES/NQ/MNQ/EURUSD ; market différé ; ordres limite/stop longs/shorts ; stop/TP simultané ; gap ; partiels/frais/slippage ; rejet budget ; break-even ; liquidation EOF ; snapshot/checklist ; CSV invalide/DST ; inconnues analytics ; future bars interdites ; agrégation UTC/gaps ; fenêtre 100k → 10k ; parcours API import/création/replay/fin/relecture ; isolation A/B ; auth requise ; CAS 409 ; réglages persistants ; requête surdimensionnée ; purge de compte isolée par propriétaire.

### Banc de test visuel isolé

```text
python backend/tests/backtest_preview.py
cd frontend
node scripts/backtest-preview.cjs
```

Ouvrir `http://127.0.0.1:4188/app/backtest`. Backend éphémère en mémoire sur 127.0.0.1:8091, composants React réels, bandeau de test, fixtures synthétiques **uniquement dans les dossiers tests**. Aucune connexion à la production/Supabase/compte réel. Le serveur n’est pas importé dans `server.py`. Ne jamais déployer ce banc de test.

Parcours navigateur vérifié : nouvelle session NQ de test à 13:00 UTC ; commission 4 USD ; ordre market 2 contrats, SL 20060/TP 20100 ; aucune position avant la minute suivante ; entrée 20076, frais d’entrée 4 USD ; rechargement conserve la position ; clôture à l’ouverture suivante ; résultat net 2 USD, un trade au journal ; dual-chart 5m/1h ; vitesse 25× avec progression et sauvegardes ; mobile 390 px sans overflow horizontal ; aucune erreur/alerte console.

La vérification visuelle de ce lot ne remplace pas un E2E authentifié en staging avec fournisseur de vraies données. Le module reste à valider avant publication commerciale.
