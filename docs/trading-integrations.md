# Synchronisation automatique des plateformes de trading

## Portée livrée

PipsEvo dispose désormais d'une couche serveur commune, strictement en lecture,
pour cTrader, MetaTrader 4/5 via MetaApi, TradeLocker et Tradovate. NinjaTrader
est volontairement limité à l'import de fichier tant que PipsEvo ne possède pas
l'accès développeur officiel permettant d'implémenter et de tester son Trader API.

Une plateforme n'est marquée `available` par `/api/integrations/capabilities`
que si son connecteur, ses variables requises, le coffre de chiffrement et la clé
serveur Supabase sont présents, et si son flag de déploiement explicite est actif.
L'absence de configuration ne produit jamais un faux état connecté.

## Architecture

```text
Application React
  -> FastAPI /integrations
      -> TradingConnector
          -> cTrader OAuth + Open API WebSocket
          -> MetaApi provisioning + REST history
          -> TradeLocker JWT + REST
          -> Tradovate OAuth + REST
      -> coffre AES-GCM (private.integration_connection_credentials)
      -> Supabase RLS
          -> integration_connections (une autorisation)
          -> integration_accounts (plusieurs comptes)
          -> trade_executions (fills immuables/dédupliqués)
          -> trades (positions normalisées)
          -> integration_account_snapshots
          -> integration_sync_runs + audit
```

Chaque compte possède son propre curseur et son propre verrou atomique. Une
synchronisation manuelle et une tâche planifiée ne peuvent donc pas traiter le
même compte simultanément. Les exécutions sont dédupliquées par fournisseur,
compte externe et identifiant d'exécution. Les trades sont dédupliqués par
fournisseur, compte externe et identifiant de position/trade.

Les colonnes enrichies par l'utilisateur (notes, captures, tags, erreurs,
check-list, setup) ne sont jamais incluses dans les mises à jour fournisseur.
`plan_respected` vaut `null` sur un import automatique : une API de courtier ne
peut pas déterminer cette information subjective.

Supabase est la source de vérité du Journal et des comptes synchronisés. Le
repository serveur y conserve les connexions, comptes détectés, exécutions,
curseurs, snapshots et trades normalisés. Le miroir MongoDB historique reste
alimenté pour les consommateurs qui n'ont pas encore été migrés. Chaque miroir
utilise un upsert sur l'identité fournisseur et ne met à jour que les champs
possédés par le provider, afin de préserver notes, captures, tags, erreurs,
check-list et setup saisis par l'utilisateur.

## Parcours par fournisseur

### cTrader

1. PipsEvo crée un `state` aléatoire à usage unique, stocké sous forme de hash.
2. L'utilisateur autorise le scope `accounts` sur cTrader ID.
3. Le backend échange le code, chiffre access/refresh tokens et récupère les
   comptes autorisés.
4. Un compte unique est sélectionné automatiquement. Si l'autorisation expose
   plusieurs comptes, PipsEvo les affiche tous et demande un choix explicite.
5. Dès qu'un seul compte est sélectionné, l'import initial est exécuté et son
   résultat réel est renvoyé à l'interface. L'import utilise l'Open API JSON sur
   le proxy live ou demo, par fenêtres de 180 jours, puis les deltas repartent
   cinq minutes avant le dernier fill pour tolérer les retards fournisseur.
6. Les réponses `hasMore` sont subdivisées en fenêtres plus petites afin de ne
   pas tronquer silencieusement les historiques denses. Une limite de sécurité
   produit un état partiel explicite si l'historique ne peut toujours pas être
   récupéré en entier.

### MetaTrader 4/5 via MetaApi

1. Le backend crée un compte MetaApi et un lien de configuration temporaire.
2. L'utilisateur termine l'autorisation chez MetaApi.
3. PipsEvo déploie le compte, vérifie son état et propose la sélection.
4. Un compte unique déclenche immédiatement l'import initial.
5. L'historique des deals est paginé par lots de 1 000 et toute troncature est
   signalée comme import partiel.

Un mot de passe MetaTrader éventuellement saisi est transmis directement à
MetaApi pendant la requête de création, puis oublié. Il n'est jamais écrit dans
Supabase, les logs, l'audit ou le navigateur après soumission. Le token MetaApi
global reste une variable serveur et n'est jamais exposé au frontend.

### TradeLocker

Le mot de passe est échangé contre les JWT officiels puis effacé. Seuls les
jetons chiffrés sont conservés. Le connecteur charge dynamiquement `/trade/config`
avant de mapper les tableaux de l'API, afin de ne pas dépendre de positions de
colonnes codées en dur. Les ordres partiels restent des exécutions distinctes et
les positions clôturées sont reconstruites sans écraser le journal utilisateur.
TradeLocker distingue l'identifiant `accountId`, utilisé dans les routes, du
numéro de séquence `accNum`, transmis dans l'en-tête. PipsEvo conserve les deux
séparément. L'historique saturé est subdivisé selon la limite publiée par
`/trade/config` ou lorsque la réponse indique `hasMore`. L'expiration
`expireDate` est conservée et le renouvellement accepte la réponse officielle
HTTP 201. `TRADELOCKER_DEVELOPER_API_KEY` est facultative pour un test à
faible volume mais recommandée par TradeLocker pour une application
multi-utilisateur.

L'API publique JWT ne réutilise pas la session Google ou Apple d'un TradeLocker
Profile. Elle exige les trois identifiants émis par un broker ou une prop firm :
email, mot de passe et serveur. Le compte ODA gratuit du profil ne constitue donc
pas à lui seul un compte de validation end-to-end pour cette intégration.

### Tradovate

Le flux utilise OAuth, `/v1/account/list`, les fills, fill pairs et snapshots de
solde. Les fills sont rattachés au bon compte par leur `positionId`, les contrats
sont résolus en symboles lisibles et le P&L réalisé provient du journal de solde.
Le connecteur n'est activé que lorsque l'application Tradovate est approuvée et
que les variables OAuth sont présentes.

### NinjaTrader

Le Trader API officiel nécessite un accès développeur qui n'est pas disponible
dans ce dépôt. L'interface affiche donc explicitement `Accès développeur requis`
et renvoie vers l'import de fichier. À réception de l'accès, l'implémentation doit
respecter le même contrat `TradingConnector` et réussir la checklist ci-dessous
avant activation.

## Variables serveur

Les exemples complets sont dans `backend/.env.example`. Minimum commun :

- `SUPABASE_SECRET_KEY`
- `INTEGRATION_ENCRYPTION_KEYS`
- `INTEGRATION_ENCRYPTION_KEY_VERSION`
- `CRON_SECRET`
- `PUBLIC_API_URL`
- `FRONTEND_URL`

Variables propres aux connecteurs :

- cTrader : `CTRADER_CLIENT_ID`, `CTRADER_CLIENT_SECRET`,
  `CTRADER_REDIRECT_URI`
- MetaTrader : `METAAPI_TOKEN`, `METAAPI_DOMAIN`
- TradeLocker : `TRADELOCKER_DEMO_URL`, `TRADELOCKER_LIVE_URL` et, recommandé
  en production, `TRADELOCKER_DEVELOPER_API_KEY`
- Tradovate : `TRADOVATE_CLIENT_ID`, `TRADOVATE_CLIENT_SECRET`,
  `TRADOVATE_REDIRECT_URI`, `TRADOVATE_OAUTH_URL`

Les variables Vercel `BACKEND_INTERNAL_URL` et `CRON_SECRET` doivent être privées
(jamais préfixées par `REACT_APP_`). Sur le déploiement Hobby actuel, le cron
`/api/sync-due` s'exécute une fois par jour à 06:00 UTC et appelle le backend avec
le secret partagé. `MT5_SYNC_INTERVAL_MINUTES` détermine quels comptes sont dus,
mais ne rend pas le planificateur plus fréquent. Une synchronisation réellement
proche du temps réel exige donc un planificateur externe fiable, une queue/worker
ou un plan Vercel autorisant une fréquence supérieure.

Les flags de déploiement sont `CTRADER_SYNC_ENABLED`, `MT5_SYNC_ENABLED`,
`MT4_SYNC_ENABLED`, `TRADELOCKER_SYNC_ENABLED`, `TRADOVATE_SYNC_ENABLED` et
`NINJATRADER_SYNC_ENABLED`. Ils restent à `false` jusqu'à validation du compte
sandbox correspondant. `INTEGRATION_ENABLED_PROVIDERS` reste un allowlist
serveur supplémentaire : une plateforme doit satisfaire le flag, l'allowlist
et la configuration de credentials pour être proposée comme active.

## Sécurité et suppression

- OAuth `state` expire après dix minutes et ne peut être consommé qu'une fois.
- Les tokens sont chiffrés AES-GCM avec données associées utilisateur/connexion.
- Les tables publiques utilisent RLS par propriétaire.
- Les secrets et états OAuth restent dans le schéma `private`.
- La déconnexion tente la révocation fournisseur, puis supprime toujours les
  secrets locaux et marque tous les comptes comme déconnectés.
- Aucun mot de passe de trading n'est journalisé.

## Déploiement

1. Appliquer `20260901090000_multi_platform_trading_integrations.sql` sur une
   branche Supabase ou un projet de staging.
2. Déployer le backend avec les variables du fournisseur à tester.
3. Configurer exactement les URI OAuth du backend.
4. Déployer le frontend et ses variables cron privées.
5. Exécuter la checklist sandbox avant d'ajouter le fournisseur à
   `INTEGRATION_ENABLED_PROVIDERS` en production.

Les migrations locales et distantes du projet Supabase lié sont alignées. Les
anciens scripts conservent leur SQL lisible dans Git, avec les mêmes horodatages
que l'historique effectivement appliqué. La migration du back-office
`20260907102521_admin_backoffice.sql` a été appliquée et vérifiée le 10 septembre
2026 avant le déploiement des correctifs d'intégration.
