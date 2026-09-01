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

L'application historique lit encore Accounts, Journal, Statistiques et Atlas
depuis MongoDB. Le repository serveur conserve Supabase comme source sécurisée
des connexions, exécutions, curseurs et snapshots, puis reflète chaque compte et
trade normalisé dans MongoDB avec le même UUID. Ce miroir utilise un upsert sur
l'identité fournisseur et ne met à jour que les champs possédés par le provider.
Les enrichissements utilisateur restent donc intacts, tandis que le trade devient
immédiatement visible dans le Dashboard, le Journal et Atlas. L'index Mongo
`trades_provider_identity_unique` garantit la même déduplication côté lecture.

## Parcours par fournisseur

### cTrader

1. PipsEvo crée un `state` aléatoire à usage unique, stocké sous forme de hash.
2. L'utilisateur autorise le scope `accounts` sur cTrader ID.
3. Le backend échange le code, chiffre access/refresh tokens et récupère les
   comptes autorisés.
4. Un compte unique est sélectionné automatiquement. Si l'autorisation expose
   plusieurs comptes, PipsEvo les affiche tous et demande un choix explicite.
5. L'import utilise l'Open API JSON sur le proxy live ou demo, par fenêtres de
   180 jours, puis les deltas repartent cinq minutes avant le dernier fill pour
   tolérer les retards fournisseur.

### MetaTrader 4/5 via MetaApi

1. Le backend crée un compte MetaApi et un lien de configuration temporaire.
2. L'utilisateur termine l'autorisation chez MetaApi.
3. PipsEvo déploie le compte, vérifie son état et propose la sélection.
4. L'historique des deals est paginé par lots de 1 000.

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

### Tradovate

Le flux utilise OAuth, `/v1/account/list`, les fills, fill pairs et snapshots de
solde. Le connecteur n'est activé que lorsque l'application Tradovate est
approuvée et que les trois variables OAuth sont présentes.

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

Les variables Vercel `BACKEND_INTERNAL_URL` et `CRON_SECRET` doivent être privées
(jamais préfixées par `REACT_APP_`). Le cron `/api/sync-due` s'exécute toutes les
dix minutes et appelle le backend avec le secret partagé.

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

La migration n'a pas pu être exécutée sur la base locale de cette machine car
Docker/Podman n'y est pas installé. Elle doit donc obligatoirement être validée
sur une branche Supabase ou un environnement de staging avant production.
