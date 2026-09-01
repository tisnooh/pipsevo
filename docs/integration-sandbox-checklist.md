# Checklist sandbox avant activation d'un connecteur

Cette checklist est bloquante. Un connecteur non validé reste absent de
`INTEGRATION_ENABLED_PROVIDERS`.

## Contrat commun

- [ ] Le provider confirme un accès de lecture seule.
- [ ] Aucun secret n'apparaît dans les réponses API, logs, audit ou erreurs.
- [ ] Un utilisateur ne peut pas lire la connexion ou les comptes d'un autre.
- [ ] Une autorisation avec un seul compte le sélectionne automatiquement ; une autorisation multi-compte affiche tous les comptes et exige un choix explicite.
- [ ] L'import initial couvre l'historique attendu et pagine réellement.
- [ ] Le delta ne recrée ni trade ni exécution.
- [ ] Les fills partiels et sorties fractionnées sont conservés séparément.
- [ ] Les dates sont stockées en UTC et restituées dans le fuseau utilisateur.
- [ ] Une resynchronisation ne modifie pas notes, tags, captures, setup, émotions ou check-list.
- [ ] Le score de discipline n'invente pas `plan_respected=true`.
- [ ] Le verrou empêche deux synchronisations simultanées du même compte.
- [ ] Un token expiré est rafraîchi ou produit un état `expired` explicite.
- [ ] La déconnexion supprime le secret local même si la révocation distante échoue.
- [ ] Les limites de débit et erreurs temporaires déclenchent retry/backoff sans boucle infinie.

## cTrader

- [ ] OAuth live et demo avec `state` à usage unique.
- [ ] Application auth, account list et account auth réussissent.
- [ ] Fenêtres historiques multiples testées sur plus de 180 jours.
- [ ] Symboles, volume, `moneyDigits`, commissions, swap et PnL vérifiés.
- [ ] Compte live et compte demo d'une même autorisation testés.

## MetaApi

- [ ] Lien de configuration expirant testé.
- [ ] Mot de passe absent de Supabase et des logs après la requête.
- [ ] Déploiement et état du compte gèrent correctement un compte encore en attente.
- [ ] Pagination au-delà de 1 000 deals testée.
- [ ] Région MetaApi du compte utilisée pour le client REST.

## TradeLocker

- [ ] JWT demo et live testés.
- [ ] Refresh token testé après expiration.
- [ ] `/trade/config` utilisé pour mapper les colonnes retournées.
- [ ] `accNum` envoyé pour chaque compte sélectionné.
- [ ] Ordre partiel, position ouverte et position clôturée testés.

## Tradovate

- [ ] Application OAuth officiellement approuvée.
- [ ] Compte Futures de sandbox listé.
- [ ] Fills et fill pairs reconstituent une position sans PnL inventé.
- [ ] Snapshot de solde vérifié contre l'interface Tradovate.
- [ ] Expiration et renouvellement OAuth validés avec la documentation du compte développeur.

## NinjaTrader

- [ ] Accès Trader API et documentation authentifiée reçus.
- [ ] Authentification implémentée sans stocker de mot de passe.
- [ ] Historique REST et flux WebSocket testés.
- [ ] Contrats principaux ES/MES, NQ/MNQ, YM/MYM, RTY/M2K, CL/MCL et GC/MGC validés.
- [ ] Seulement après ces tests, statut UI changé de `Accès développeur requis` à `Disponible`.
