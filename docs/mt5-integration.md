# Architecture de synchronisation MetaTrader 5

## État réel

L'architecture PipsEvo est prête à recevoir un fournisseur MT5 autorisé, mais
aucun adaptateur réseau n'est livré tant qu'un contrat, des clés de test et une
validation de fiabilité ne sont pas disponibles. La synchronisation reste donc
désactivée par défaut avec `MT5_AUTO_SYNC_ENABLED=false`.

PipsEvo ne prétend pas qu'il existe une API MT5 publique et universelle. Les
possibilités réelles dépendent du fournisseur choisi, du broker, du type de
compte et de ses autorisations.

## Flux prévu

1. Le navigateur envoie temporairement le numéro de compte, le serveur et le
   mot de passe investisseur par HTTPS. Rien n'est conservé dans localStorage.
2. Le backend applique une limite de tentatives et appelle l'adaptateur réel.
3. L'utilisateur confirme le compte détecté.
4. Le backend crée le compte PipsEvo, puis chiffre le jeton fournisseur ou les
   identifiants avec AES-256-GCM et une clé versionnée.
5. Un import initial récupère l'historique. Les opérations de solde, crédit,
   commission et swap sont distinguées des trades.
6. Les synchronisations suivantes utilisent un curseur incrémental et une clé
   d'idempotence `(provider, external_account_id, provider_trade_id)`.
7. La déconnexion supprime définitivement les secrets chiffrés.

## Contrat fournisseur

Un adaptateur doit implémenter `MT5IntegrationProvider` : test, connexion,
déconnexion, état, historique, données récentes et reconnexion. Les points
d'extension `MetaApiProvider`, `BrokerDirectProvider` et `HostedMT5Provider`
sont volontairement abstraits : ils ne simulent aucun appel externe.

Avant activation, vérifier au minimum : comptes démo/réels, devises, fuseaux,
positions ouvertes, clôtures partielles, commissions, swaps, opérations de
solde, reconnexion, pagination, limites fournisseur et indisponibilités.

## Sécurité

- `SUPABASE_SECRET_KEY`, les clés de chiffrement et les identifiants MT5 sont
  exclusivement côté serveur.
- Le navigateur ne peut ni lire les tables privées, ni appeler les RPC de
  coffre-fort.
- Les messages publics sont filtrés et les journaux d'audit ne contiennent que
  des métadonnées non sensibles.
- La rotation se fait en ajoutant une clé à `INTEGRATION_ENCRYPTION_KEYS`, en
  augmentant `INTEGRATION_ENCRYPTION_KEY_VERSION`, puis en rechiffrant les
  enregistrements via une tâche serveur contrôlée.

## Exécution en arrière-plan

Le service `sync_connection` est indépendant des routes HTTP et peut être
appelé par un worker, une Edge Function planifiée ou une file durable. Aucun
polling navigateur n'est utilisé. Le choix final (webhooks signés, cron ou
queue) dépendra des capacités et garanties du fournisseur retenu.

## Activation contrôlée

1. Implémenter et enregistrer l'adaptateur réel dans `provider_registry`.
2. Appliquer la migration Supabase et configurer les secrets du backend.
   Appliquer aussi `20260726030000_harden_mt5_integrations.sql`, qui active
   explicitement RLS sur le schéma privé et ajoute les index de clés étrangères.
3. Tester sur des comptes dédiés et surveiller les audits/sync runs.
4. Activer d'abord `MT5_AUTO_SYNC_ENABLED=true` côté backend.
5. Activer `REACT_APP_MT5_AUTO_SYNC_ENABLED=true` côté frontend seulement après
   validation du backend.

Le backend refuse de démarrer avec le flag activé si le fournisseur, le secret
Supabase ou les clés AES sont absents.
