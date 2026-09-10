# Architecture de synchronisation MetaTrader 5

## État réel

PipsEvo dispose d'un adaptateur réseau MetaTrader 4/5 via MetaApi. Il crée et
déploie un compte MetaApi, vérifie les comptes détectés et récupère l'historique
réel des deals par l'API REST. Ce n'est pas une connexion native universelle à
MetaTrader : sa disponibilité dépend du token MetaApi serveur, du broker, du
serveur choisi et de la réussite du provisioning chez MetaApi.

PipsEvo ne prétend pas qu'il existe une API MT5 publique et universelle. Les
possibilités réelles dépendent du fournisseur choisi, du broker, du type de
compte et de ses autorisations.

## Flux effectif

1. Le navigateur envoie temporairement le numéro de compte, le serveur et le
   mot de passe investisseur par HTTPS. Rien n'est conservé dans localStorage.
2. Le backend applique une limite de tentatives et appelle l'adaptateur réel.
3. MetaApi déploie le compte et PipsEvo attend qu'il soit connecté et synchronisé.
4. L'utilisateur confirme le compte détecté lorsqu'une sélection est nécessaire.
5. Le backend crée le compte PipsEvo puis chiffre l'identifiant d'accès
   fournisseur avec AES-256-GCM et une clé versionnée.
6. Un import initial immédiat récupère l'historique. Les opérations de solde, crédit,
   commission et swap sont distinguées des trades.
7. Les synchronisations suivantes utilisent un curseur incrémental et une clé
   d'idempotence `(provider, external_account_id, provider_trade_id)`.
8. La déconnexion supprime définitivement les secrets chiffrés.

MetaApi peut répondre `202 Accepted` pendant la détection du serveur. PipsEvo
réinterroge alors la même opération avec le même `transaction-id`, conformément
au contrat fournisseur, afin de ne pas créer plusieurs comptes cloud pour une
seule tentative utilisateur.

Le formulaire recommande le mot de passe investisseur MetaTrader. Il permet de
consulter le compte sans autoriser les opérations de trading. Le type réel,
démo ou concours est ensuite déterminé depuis les informations du compte
renvoyées par MetaApi, et non uniquement depuis le nom du serveur.

## Contrat fournisseur

L'adaptateur historique `MT5IntegrationProvider` reste le contrat du flux MT5
antérieur. Le flux multi-plateformes actif utilise `TradingConnector`, implémenté
par `MetaApiConnector`. Aucun compte fictif ou appel simulé n'est injecté en
production.

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

Le service `sync_connection` est indépendant des routes HTTP. Aucun polling
navigateur n'est utilisé. Le déploiement actuel l'appelle via le cron Vercel
`/api/sync-due`, une fois par jour à 06:00 UTC pour rester compatible avec le
plan Hobby. Le seuil d'éligibilité interne reste configurable, mais une fréquence
réellement plus élevée requiert un planificateur ou worker capable de l'exécuter.

## Activation contrôlée

1. Enregistrer `MetaApiConnector` et configurer `METAAPI_TOKEN`.
2. Appliquer la migration Supabase et configurer les secrets du backend.
   Appliquer aussi `20260726031137_harden_mt5_integrations.sql`, qui active
   explicitement RLS sur le schéma privé et ajoute les index de clés étrangères.
3. Tester sur des comptes dédiés et surveiller les audits/sync runs.
4. Activer `MT4_SYNC_ENABLED` et/ou `MT5_SYNC_ENABLED` côté backend seulement
   après validation d'un compte de test dédié.
5. Ajouter `metaapi` à `INTEGRATION_ENABLED_PROVIDERS`.

La capacité reste indisponible si le token fournisseur, le secret Supabase ou
les clés AES sont absents. Une connexion bloquée en état `pending` doit être
diagnostiquée chez MetaApi ; elle ne prouve pas que l'historique est synchronisé.
