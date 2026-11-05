# PipsEvo — candidat de lancement du 11 octobre 2026

Ce document conserve les résultats datés du 11 octobre. Pour les publications
ultérieures, consulter [le suivi du 5 novembre](./lancement-2026-11-05.md).

## Statut

Les corrections ci-dessous sont présentes dans le dépôt local. La migration
de suspension des profils et la neutralisation de l’ancienne fonction Edge ont
été publiées sur Supabase après validation du propriétaire. Aucun commit, push,
déploiement frontend/backend, paiement ni effacement de données réelles n’a été
réalisé pendant cette finalisation. Le design existant est conservé.

**Le site n’est pas déclaré prêt pour le lancement.** Les tests automatisés et
le build sont des preuves locales ; ils ne valident pas les e-mails reçus,
les politiques RLS réellement déployées ou l’ensemble des parcours navigateur.

Priorité respectée : aucune nouvelle tâche de synchronisation automatique de
plateforme n’a été réalisée. La lecture des métadonnées déjà stockées en base
n’appelle pas les API des plateformes. Marketing et réseaux sociaux restent
hors périmètre.

Consigne de priorité actualisée : poursuivre les tâches 2 et suivantes.
Le domaine et la configuration des e-mails restent à la fin ; leur absence
n’empêche pas de préparer et tester le candidat sur l’adresse Vercel existante.

## Parcours et frontières contrôlés

Le parcours manuel est : formulaire ou CSV → validation et déduplication →
mutations Supabase sous identité utilisateur/RLS → journal → calculs communs
du dashboard, des statistiques, de la discipline et d’Atlas.

Le Lab conserve ses données séparées : historique importé → session → replay
sans bougies futures → ordres simulés → résultats de session. Il ne représente
pas des cours live ni des opérations réelles.

| Frontière | Preuve obtenue | Limite |
| --- | --- | --- |
| Formulaires, import et rendu React | Tests Jest de composants et d’adaptateurs | Base et réseau simulés dans ces tests |
| API, propriétaires, pagination et réponses | Pytest / FastAPI TestClient | Pas de recette authentifiée sur la production |
| Calculs monétaires et règles de risque | Cas nuls, coûts, devises, drawdown, retraits et chronologie | Les règles de la prop firm doivent être renseignées correctement |
| Backtest | Import, session, ordres, advance, révision et résultats via TestClient | Ce n’est pas une preuve de flux live |
| Build frontend | Build Vite terminé avec code de sortie 0 | Pas de mesure Lighthouse ni de performances réseau en production |
| Navigateur | Dashboard du banc local affiché : +490 USD, 50 %, facteur 4,06, discipline 65/100 | Données fictives clairement marquées ; recette complète interrompue par `Transport closed` |
| E-mails | Tests des transports et cycles d’envoi | Acceptation fournisseur simulée, réception réelle non vérifiée |
| Paiements | Checkout indisponible explicitement, aucune URL fictive | Stripe et son cycle complet ne sont pas implémentés |
| Backend public | `/api/health` 200, API/base `ok` ; `/api/accounts` sans session 401 | Version publiée antérieure au candidat local |
| Supabase public | Lectures anonymes limitées à un identifiant : zéro ligne sur profiles, accounts, trades, payouts et ai_reports | Ce contrôle ne prouve pas l’isolation entre deux utilisateurs authentifiés |
| Politiques SQL locales | Sept tests PostgreSQL/PGlite, migrations exécutées, deux propriétaires et rôles distincts | Auth et tables Storage sont des substituts locaux ; pas les services/JWT Supabase de production |
| Politiques SQL déployées | Isolation de deux propriétaires synthétiques, suspension, réactivation, anonymes et captures vérifiés dans le PostgreSQL Supabase réel | Fixtures entièrement annulées ; rôles/claims SQL, pas un parcours HTTP avec de vrais JWT ; durcissement Auth supplémentaire encore local |

## Corrections réalisées

### Intégrité des résultats

- Lectures financières complètes et filtrées par propriétaire. Un échec ou
  une pagination incohérente échoue explicitement ; pas de résumé Mongo de
  secours ni de succès sur un historique tronqué.
- P&L net, win rate, gains/pertes moyens et profit factor calculés uniquement
  sur les résultats monétaires mesurés des trades clôturés. Les coûts déjà
  inclus dans un P&L net ne sont pas déduits une deuxième fois.
- Résultats manquants, positions ouvertes et imports non vérifiés ne deviennent
  pas zéro ou gagnants sur la seule base des prix.
- Les devises natives sont conservées, y compris lorsque la préférence
  d’affichage change. Pas d’addition USD/EUR, pas de conversion implicite et
  pas de devise inventée pour un compte dont l’unité est inconnue.
- Les comptes manuels historiques sans unité renseignée restent en USD,
  comme leur schéma d’origine. Une unité explicitement enregistrée est conservée.
- Dashboard, journal, statistiques et Atlas partagent les règles monétaires.
  Atlas utilise désormais l’historique complet, pas seulement 100/500 trades.
- Les quatre pages de reporting manuel rejettent les réponses périmées après
  un nouveau rafraîchissement ou une bascule de session, y compris A → B → A.
  Un échec de lecture retire les anciens résultats au lieu de les présenter
  comme les données actuelles ; une réponse de liste mal formée est refusée.
  Il n’est pas présenté comme une synchronisation réussie ni comme une période
  réellement vide. La sélection journalière demandée est préservée pour le retry.
- Les listes mobiles et desktop ne présentent pas un résultat ouvert,
  annulé ou non mesuré comme un P&L/R réalisé, même si un champ brut contient
  encore un nombre. Le changement d’utilisateur réinitialise l’interface privée.
- L’enregistrement manuel utilise un UUID stable pendant les tentatives d’un
  même formulaire. Après une réponse perdue ou un conflit, le trade existant
  est recherché sous son identifiant et son propriétaire ; une différence
  avec la première saisie invite à modifier ce trade, sans écrasement implicite.
- Une capture optionnelle en échec ne supprime plus le résultat enregistré,
  y compris lors d’une édition. Les doubles clics sont bloqués. Après un échec
  ambigu de rattachement, les fichiers potentiellement référencés sont conservés
  plutôt que supprimés ; des fichiers orphelins peuvent nécessiter un nettoyage
  après vérification. Aucun nettoyage de données réelles n’a été déclenché.
- Le facteur sans perte est explicitement non borné, pas `Infinity` dans JSON.
- Les pertes consécutives utilisent la date et l’heure de clôture, puis les
  identifiants comme départage. Une heure seule n’est pas triée avant sa date.

### Comptes, risque et payouts

- Soldes et observations fournisseur en lecture seule dans les formulaires.
- Pour les comptes manuels, solde et drawdown utilisé doivent être actualisés
  explicitement. La perte fixe est proposée lors d’une modification du solde,
  mais le drawdown suiveur réel peut être saisi sans inventer de référence.
- Les marges suiveuses inconnues restent inconnues ; les alertes ne prétendent
  pas valider un seuil absent.
- La limite de perte quotidienne a une devise propre, distincte de la préférence
  d’affichage. Une limite native de compte connue, même zéro, reste prioritaire.
- Les règles dont `configured` vaut `false` restent des brouillons inactifs :
  elles ne produisent pas une fausse validation du risque ou de la discipline.
- Le retrait prudent est une estimation arithmétique plafonnée par le profit
  et la marge protégée, jamais un prélèvement sur le capital. Aucun partage
  fournisseur de 80 % ni aucune éligibilité au payout n’est supposé.
- Le score « survie » de la carte est renommé marge de risque : indicateur
  explicatif, pas probabilité de survie du compte.
- Payouts : montant positif et fini, compte possédé, devise connue, dates
  validées et projections manuelles clairement identifiées.

### Journal, importations et portabilité

- CSV : guillemets, champs multilignes, formats de dates explicites, séparation
  brut/net, validation des coûts et des heures compatibles avec les colonnes.
- Nouvelle déduplication juste avant insertion, empreinte stable et vérification
  des collisions concurrentes par propriétaire.
- Un échec d’un lot tardif ou de son rapport conserve les trades déjà sauvés et
  annonce ce qui reste en attente. Pas de rollback destructif implicite.
- Une capture qui échoue après sauvegarde n’entraîne pas la suppression du trade.
- Archive personnelle : profil et plan, comptes, trades, références de captures,
  payouts, analyses et JSON du Lab. Le backend exporte uniquement le propriétaire,
  sans secrets. Une archive trop volumineuse est refusée, jamais tronquée.
- Les fichiers binaires des photos ne sont pas dans cette archive : l’interface
  et le fichier `LIRE-MOI.txt` demandent de les conserver séparément avant effacement.

### Suppression du compte utilisateur

- Confirmation exacte `SUPPRIMER`, identité Supabase vérifiée et travail privé
  persistant avant tout effet destructif.
- Révocation Auth confirmée avant nettoyage du Lab. Un échec de confirmation
  conserve les données du backtest.
- Nettoyage Auth/Storage/Mongo reprenable et filtré par propriétaire. Le dossier
  Storage est encore vérifié lorsque l’utilisateur Auth est déjà absent.
- `cleanup_pending` indique un nettoyage incomplet ; aucun faux message de fin.
- Ancienne route Lab d’effacement remplacée par une réponse 410 locale. L’ancienne
  fonction Edge a été publiée en version 2, JWT obligatoire, sans opération de
  suppression ; elle répond 410 dans son handler. Le catalogue confirme le
  déploiement, mais l’appel authentifié du handler n’a pas été testé dans le navigateur.
- Les sessions d’un utilisateur Auth supprimé sont rejetées avant lecture du profil.
- Une réponse Auth contenant un profil étranger, multiple ou malformé est refusée :
  aucun rôle de ce profil ne peut être attribué à l’utilisateur connecté.
- Les reprises excluent les jobs déjà verrouillés avant la limite et alternent
  les demandes incomplètes. Vingt anciens jobs ne bloquent plus indéfiniment les suivants.
- Les enregistrements explicitement associés au propriétaire sont traités sous
  son identifiant. Pour les enregistrements anonymes associés uniquement à son
  adresse, la date de la demande d’effacement sert de limite conservatrice.
  Les données d’un autre utilisateur ou d’un consentement ultérieur sont conservées.
- Une date absente/malformée ou un ancien job sans date de référence déclenche
  `manual_review_required`. Il ne devient pas « terminé » et n’expire pas par TTL.
- Le backend reprend désormais les demandes persistantes avec un worker interne
  toutes les dix minutes, configurable entre 30 secondes et 24 heures. Il utilise
  les verrous Mongo existants, attend avant son premier lot et s’arrête avant la
  fermeture du client Mongo. Aucun service cron payant ni nouvelle demande
  d’effacement n’est créé. Sa publication sur Render reste à faire.
- La confirmation Auth vérifie l’identité exacte et une date de suppression
  valide. Seul le code officiel `user_not_found` confirme une absence sur 404 ;
  une route absente, un proxy en erreur ou une réponse étrangère conservent les
  données du Lab. Les erreurs du worker ne journalisent ni adresse ni secret.

### Autres fonctionnalités

- Widget S&P : proxy CFD embarqué identifié comme tel et lien distinct vers les
  véritables futures ; pas de promesse que le proxy est le contrat ES.
- Paramètres, plan de trading, checklist et stockage local : validations, erreurs
  de persistance et retours partiels traités explicitement.
- Un rafraîchissement du profil n’écrase plus un brouillon utilisateur modifié.
  Les réponses anciennes sont annulées au changement de propriétaire, y compris
  une succession A → B → A. Les nombres de comptes et règles sont bornés et finis.
- L’échec de chargement d’un profil existant ouvre une récupération explicite,
  pas un onboarding qui écraserait son profil. Une erreur 401 ancienne ou publique
  ne déconnecte pas la nouvelle session d’un autre utilisateur.
- Les préférences de notification restent désactivées jusqu’à leur lecture réussie,
  avec reprise explicite ; les valeurs locales par défaut ne prétendent pas être sauvées.
- Les notifications distinguent chargement, erreur et succès partiel. Un échec
  ne devient plus « Tout est à jour ». Le faux mini-graphe montant a été retiré.
- Projection backtest bornée et déterministe : scénario, pas prévision de marché.
- Atlas : garde-fous de processus, risque, stop/objectif et checklist ; quotas
  atomiques. Le mode local reste un moteur déterministe identifié, pas une réponse
  présentée comme provenant d’un LLM externe.
- Atlas affiche les devises natives, refuse les réponses malformées et ne conserve
  pas un ancien bilan lorsque le nouveau chargement échoue. Une validation de prise
  de position disparaît dès que proposition, checklist, compte ou règles changent.
- Les calculs Atlas excluent les trades annulés et séparent positions ouvertes,
  clôtures sans résultat mesuré et pertes/gains réellement connus.
- Newsletter : confirmation à usage unique, consentement relu avant campagne,
  réservations concurrentes et limitation de débit.
- Bienvenue/support : refus SMTP et réponses HTTPS malformées ne sont pas marqués
  envoyés. Les corps d’erreur Supabase ne sont plus journalisés par l’insertion Atlas.

### Confidentialité et configuration HTTP

- Une faille de cycle de compte a été reproduite dans les anciennes politiques :
  une identité authentifiée conservée pouvait lire ses propres données malgré
  `profiles.status = suspended`. Aucun accès aux données d’un autre propriétaire
  n’a été démontré. La durée réelle d’acceptation d’un ancien JWT après bannissement
  reste à vérifier sur le service Supabase.
- La migration `20261011170000_enforce_active_profile_data_access.sql` ajoute
  une condition restrictive de profil actif aux tables personnelles et au bucket
  privé des captures, sans supprimer les protections propriétaire existantes.
  La lecture du propre profil reste disponible pour afficher la suspension ;
  les champs rôle/statut restent non modifiables par le client. Les opérations
  serveur de maintenance conservent leurs droits existants.
- Cette première migration est maintenant installée et enregistrée dans
  l’historique du projet Supabase `zwnrmnoutwhazhgoomoi`. Le catalogue confirme
  douze politiques restrictives personnelles, une politique UPDATE du profil
  et une politique Storage. La fonction reste SECURITY DEFINER avec search_path
  vide et sans droit d’exécution anonyme.
- Une seconde migration, `20261011183000_enforce_auth_lifecycle_data_access.sql`,
  couvre aussi la suppression logique Auth et les bans en cours, même si le profil
  n’a pas encore été mis à jour. Le défaut du contrôle limité au profil a été
  reproduit puis corrigé dans PostgreSQL local. Cette seconde migration n’a PAS
  été publiée : l’accès CLI Supabase est devenu indisponible après la première.
- Le banc `supabase/tests` exécute les migrations dans PostgreSQL embarqué,
  sans réseau, secrets ou base réelle : suspension/réactivation, lecture/écriture,
  isolation entre deux utilisateurs, anonymes, captures, abonnements et tables
  admin sont testés. Les sept tests réussissent. Les URL signées déjà émises ne
  sont pas révoquées par cette migration : elles restent utilisables jusqu’à
  leur expiration actuelle, au maximum une heure pour le helper frontend.
- La recette `supabase/tests/live_rls_rollback.sql` a réussi sur le Supabase réel
  après la première migration, dans sa version testant profil/suspension/isolation.
  Tous les utilisateurs et métadonnées synthétiques ont été annulés par une
  sous-transaction ; aucun fichier n’a été envoyé ni e-mail déclenché. Le fichier
  comprend désormais les vérifications Auth deletion/ban destinées à la seconde
  migration : cette version enrichie n’est pas encore validée sur la production.
- Le frontend bloque les pages privées, l’onboarding et l’administration si
  le profil est suspendu ou si sa relecture échoue. Une ancienne autorité en
  mémoire n’est plus présentée comme valide après une erreur de rafraîchissement.
  Cette barrière d’interface ne remplace pas les règles serveur/RLS.
- L’audit Codex Security est désormais démarré et conserve un brouillon partiel
  sur le snapshot du candidat antérieur à ces dernières corrections. La revue
  source n’est pas exhaustive ; les agents indépendants étaient indisponibles
  à cause de leur limite d’utilisation. Le correctif local et ses tests ne sont
  pas une preuve de publication ni un audit indépendant complet du nouveau diff.
- Le consentement reste effectif lorsque le navigateur interdit le stockage local.
  Le refus ou retrait en session prévaut sur une ancienne autorisation persistée ;
  les changements inter-onglets et le chargement tardif du SDK sont pris en compte.
- La télémétrie produit optionnelle exige le consentement réel. Retrait, profil
  indisponible et routes sensibles annulent les envois ; paramètres, fragments et
  identifiants de dossiers ne sont pas conservés dans les chemins transmis.
- Le chargeur PostHog public ne s’active pas sans le contrôle de consentement.
  Relecture, captures automatiques, exceptions, rage/dead clicks, enquêtes et
  événements automatiques de sortie/performance restent désactivés.
- Le candidat backend remplace CORS `*` par des origines explicites et validées,
  rejette credentials/path/query/fragment dans une origine, et réserve HTTP à la
  boucle locale explicitement configurée. La session API reste un bearer explicite,
  sans cookies ambiants. Origines, méthodes et en-têtes non autorisés sont testés.
  Cette politique suit la [configuration officielle FastAPI](https://fastapi.tiangolo.com/tutorial/cors/).
- La production observée accepte encore CORS `*` sur les deux prévols contrôlés.
  Cela n’a pas contourné l’authentification ; la politique locale n’y est pas publiée.

### Dépendances de compilation

- Mises à jour compatibles et verrouillées : `source-map-js` 1.2.2,
  `postcss-selector-parser` 7.1.6, `js-yaml` 4.3.2. La chaîne ancienne
  `argparse`/`sprintf-js` est retirée des outils de couverture.
- Le prébuild vérifie versions installées et verrouillées, absence de copies
  anciennes imbriquées, compatibilité YAML réelle du chargeur Istanbul et frontière
  des variables publiques. Aucun script d’installation tiers n’a été exécuté.
- Audit npm total : 27 signalements au départ, 5 restants. Ces cinq entrées
  correspondent à un seul avis `braces`, propagé à ses consommateurs de développement.
  Audit `--omit=dev` : zéro vulnérabilité signalée à la date du contrôle.
- L’avis [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  n’indique pas de version `braces` corrigée. Les globs Tailwind sont limités aux
  sources locales revues par un contrôle de prébuild ; ce garde-fou ne corrige pas
  la bibliothèque. Une migration majeure Tailwind n’a pas été forcée avant lancement.
- Les trois fichiers CSS produits sont identiques octet pour octet avant/après
  ces mises à jour, confirmé par SHA-256. Cela prouve l’absence de changement CSS
  lié aux dépendances, pas une recette visuelle complète.
- L’auditeur Python est installé uniquement dans un environnement local ignoré
  par Git. Le premier contrôle complet de `requirements.txt` a relevé quatre
  vulnérabilités sur `pymongo` 4.17.0. Le candidat passe à `pymongo` 4.18.3,
  correspondant aux [correctifs officiels MongoDB](https://raw.githubusercontent.com/mongodb/mongo-python-driver/4.18.3/doc/changelog.rst).
  Un second environnement isolé a été installé depuis les fichiers requirements
  et requirements-test : `pip check` réussi, 363 tests réussis avec cette version.
  Le Python partagé de l’utilisateur n’a pas été modifié.
- Le bootstrap pip 26.1.1 des environnements d’audit/test présentait aussi deux
  avis (quatre entrées dupliquées dans la réponse). Ces seuls environnements
  locaux passent à pip 26.2. L’audit strict du chemin de la nouvelle installation
  complète, dépendances de test et pip inclus, ne signale plus de vulnérabilité
  connue. Ce résultat concerne cette installation, pas les versions de production.
- Le second audit par résolution de `requirements.txt` n’a pas abouti dans le
  temps imparti. Il n’est pas annoncé comme réussi ; le contrôle final réussi
  porte directement sur les versions effectivement installées dans l’environnement isolé.
- La branche PyMongo 4.18 ne prend plus en charge MongoDB 4.2. Vérifier une
  version MongoDB >= 4.4 sur le service cible avant publication ; le contrôle
  public `/api/health` ne fournit pas cette version.

## Résultats locaux finaux

- Frontend : **78 suites, 499 tests réussis**, `npm.cmd test -- --runInBand`,
  après les corrections de reporting, captures, UUID, récupération/suspension
  du profil et affichage de l’abonnement bêta.
  Les 67 tests ciblés du journal/adaptateur ont également réussi.
- Backend : **387 tests réussis** dans une nouvelle installation isolée,
  incluant PyMongo 4.18.3, worker de reprise et confirmations Auth strictes ;
  nouveau passage complet réussi après ces corrections.
  `pip check` réussi lors de la validation des dépendances.
- Backend : 238 avertissements de dépendances/dépréciations, sans échec ; la clé
  JWT courte signalée concerne les fixtures de test, pas une preuve de configuration
  de la clé de production.
- ESLint : succès.
- Politiques Supabase : **7 tests SQL locaux réussis**, incluant les reproductions
  avant correctif et les contrôles après migration. Une recette SQL supplémentaire
  a réussi sur le PostgreSQL Supabase déployé avec fixtures annulées. Aucun de ces
  contrôles n’est présenté comme une recette HTTP de jetons Auth/Storage signés.
- Build Vite : succès, **2943 modules transformés**, après les corrections
  de reporting, captures, UUID, états d’erreur et abonnement. Garde-fous de prébuild réussis.
- `git diff --check` : succès ; avertissements LF/CRLF seulement.

Commandes de vérification locale, à lancer séparément depuis les dossiers indiqués :

```powershell
# frontend
$env:NODE_OPTIONS='--max-old-space-size=512'
npm.cmd test -- --runInBand
npm.cmd run lint
$env:RAYON_NUM_THREADS='1'
npm.cmd run build

# backend : vérifier dans un environnement local dédié à jour
py -m venv .cache/launch-verify/.venv
& '.cache/launch-verify/.venv/Scripts/python.exe' -m pip install --upgrade 'pip==26.2.0'
& '.cache/launch-verify/.venv/Scripts/python.exe' -m pip install -r requirements.txt -r requirements-test.txt
& '.cache/launch-verify/.venv/Scripts/python.exe' -m pip check
& '.cache/launch-verify/.venv/Scripts/python.exe' -m pytest tests -q

# racine
git diff --check

# supabase/tests : PostgreSQL embarqué, données synthétiques uniquement
npm.cmd ci --ignore-scripts
npm.cmd test
```

Les limites de mémoire règlent uniquement le processus local de compilation.
Elles n’ont pas été ajoutées aux paramètres de production.

## Contrôles externes non destructifs

- Backend public identifié depuis le bundle frontend :
  `https://pipsevo-backend.onrender.com`. Le contrôle HTTP de santé confirme API
  et Mongo disponibles au moment du test, pas tous les parcours utilisateurs.
- La dernière production Vercel observée est `READY` sur `main`, commit
  `49d905a68cd394b238a3d27d3d5710aaa7011b7c`. Elle correspond au HEAD de départ,
  pas à ce patch local non commité. Aucune variable ni configuration Vercel modifiée.
  Le contrôle complémentaire CLI confirme que `dpl_59p4m45dNs91z4dtzuHfmsNasezt`
  est Ready/Production et porte l’alias `pipsevo.vercel.app`. La liste des
  déploiements via MCP était refusée en 403 ; la CLI authentifiée a permis
  cette inspection en lecture seule, sans publier le candidat.
- Une recherche en lecture seule dans la boîte Gmail connectée n’a pas trouvé
  de preuve de réception PipsEvo bienvenue/confirmation/newsletter dans le périmètre
  recherché. Ce résultat ne prouve pas qu’aucun message n’a jamais été envoyé ou
  reçu ailleurs. Aucun e-mail réel n’a été déclenché par cette recette.
- Aucune donnée privée issue des lectures anonymes n’a été affichée ou exportée ;
  seuls les codes HTTP et nombres de lignes ont été contrôlés.
- Préflight Supabase : les treize tables attendues utilisent RLS, les six profils
  observés sont actifs, et le bucket captures est privé. L’historique comporte
  une ancienne version distante `20260928235518` sous le nom
  `protect_connected_integration_accounts`, contre `20260929030000` localement.
  La contrainte distante possède déjà la protection composite ON DELETE RESTRICT.
  Cette ancienne migration n’a été ni réappliquée ni réécrite ; seule la nouvelle
  migration de suspension a été exécutée puis enregistrée sous sa propre version.
- L’accès CLI Supabase a ensuite échoué avec `Access token not provided`, confirmé
  par un contrôle indépendant de la liste des projets. Aucun jeton n’a été extrait
  ou demandé dans la conversation pour contourner cette reconnexion nécessaire.
- Le backend public reste sain, mais sa description OpenAPI confirme l’absence
  de `/api/account/delete`, `/api/account/backtest-export` et
  `/api/internal/account-deletion/retry`. La publication frontend est suspendue
  pour éviter d’exposer des boutons dépendant de routes absentes.

## Blocages à lever avant ouverture

1. **Domaine et e-mails — reportés à la fin par le propriétaire.** Le service Render observé était Free et le SMTP
   y était bloqué ; voir `email-system.md`. Choisir/autoriser un transport HTTPS
   avec identité d’expédition vérifiée ou une offre compatible. Vérifier ensuite
   confirmation, récupération, bienvenue, support et newsletter dans les boîtes
   destinataires FR/EN. Aucun fournisseur, coût ou permission OAuth ajouté ici.
2. **Recette navigateur complète.** La commande navigateur renvoie `Transport
   closed`. Reprendre mobile 390/430 px, tablette et desktop, clair/sombre,
   navigation, formulaires, modales, captures, import/export et replay. Les tests
   DOM ne remplacent pas une inspection visuelle ou les parcours réels.
   Une nouvelle tentative dans la continuation du 11 octobre confirme la même
   indisponibilité ; la recette visuelle n’a pas été déclarée réussie.
3. **Audit sécurité complet et production.** Un scan Standard existe désormais
   (`9263bc43-af92-499f-82da-1990ebd53717`) avec couverture partielle, sans rapport
   final scellé. Le défaut de suspension du profil est corrigé, publié et testé
   avec deux propriétaires synthétiques sous rôles SQL ; le durcissement Auth
   supplémentaire attend une reconnexion Supabase. Vérifier encore les vrais
   parcours HTTP Auth/Storage avec deux comptes de test,
   les rôles admin, les URL Auth et les journaux de la version réellement déployée.
   Le contrôle anonyme réussi ne clôture pas ce point. Vérifier également l’avis
   résiduel de compilation et confirmer les versions réellement installées
   en production après mise à jour des dépendances Python.
4. **Facturation.** Ce candidat reste une bêta gratuite. Les offres payantes et
   les fonctionnalités futures sont désactivées ou identifiées « à venir ».
   La page Abonnement respecte maintenant les drapeaux de disponibilité et
   affiche un accès bêta gratuit sans ancien renouvellement payant. Les tests
   de Checkout confirment 503 pour les deux offres connues, 400 pour une offre
   inconnue et 401 sans authentification, sans URL fictive ni appel de paiement.
   Un lancement payant exige Checkout, webhooks signés/idempotents, portail,
   échecs, renouvellements, annulations et remboursement, puis validation du propriétaire.
5. **Déploiement coordonné autorisé.** Le frontend dépend des nouvelles routes
   backend d’export et d’effacement. Il faut également désactiver la fonction Edge
   historique (désormais neutralisée) et publier la reprise interne des jobs
   d’effacement. L’accès Render et la version Mongo restent à vérifier.

## Ordre de mise en production, après validation du propriétaire

Le propriétaire a autorisé la publication coordonnée par « ok fait le reste ».
Cela n’autorise aucune suppression réelle de test ni activation payante.

1. Revoir le diff et sauvegarder les sources et données selon le processus habituel.
   Ne pas inclure le rapport utilisateur `revue-bugs-2026-10-06.md` dans ce lot.
2. Publier la fonction Edge historique en 410 afin que les anciens clients ne
   puissent plus contourner l’effacement coordonné. Une ancienne interface peut
   alors refuser temporairement cette action : c’est préférable à un effacement partiel.
   Après revue des migrations déjà appliquées, publier la migration restrictive
   de profil actif et vérifier les deux identités de test, les captures et la
   réactivation. Ne pas utiliser de compte utilisateur réel pour cette recette.
   **Avancement :** Edge version 2 et première migration publiées ; première
   recette SQL réussie et fixtures annulées. Publier ensuite la seconde migration
   de cycle Auth et exécuter la version enrichie de la recette après reconnexion.
3. Publier le backend avec les routes `/api/account/delete` et
   `/api/account/backtest-export` et l’index TTL des jobs. Vérifier les réponses
   sans exposer les secrets ni effectuer d’effacement réel non autorisé.
4. Vérifier la présence privée de la configuration serveur Supabase appropriée
   et de `CRON_SECRET`. Ne jamais les injecter dans les variables publiques Vite/React.
   Vérifier MongoDB >= 4.4 avant le passage à PyMongo 4.18.3 ; employer un pip
   de compilation corrigé (>= 26.2), installer les requirements du candidat puis
   contrôler leur cohérence. Aucun changement de commande Render n’a été effectué ici.
   Vérifier `FRONTEND_URL` et les origines explicites de `CORS_ORIGINS` : production
   et chaque preview autorisée séparément. La boucle locale n’est pas autorisée
   implicitement. Tester prévol bearer autorisé, origine étrangère refusée et
   lecture sans session 401 après publication, sans créer de compte réel.
5. Vérifier le worker interne de reprise et ses compteurs après publication.
   L’appel privé de `POST /api/internal/account-deletion/retry` avec `x-cron-secret`
   reste une alternative d’exploitation, pas une dépendance à un cron externe.
   Aucun planificateur payant n’est nécessaire ou créé dans ce candidat.
   Prévoir une revue humaine des jobs `manual_review_required`, sans supprimer
   par adresse seule les nouveaux consentements ou les données d’un autre propriétaire.
6. Publier le frontend et vérifier qu’il utilise ce même backend. Ne pas pointer
   une preview destinée aux tests destructifs sur les données de production.
7. Réaliser la recette avec des comptes et données de test autorisés, puis
   contrôler réception des e-mails, isolation, exports et nettoyage reprenable.
8. En cas de rollback, conserver la fonction historique en 410 et le traitement
   des jobs jusqu’à leur résolution : ne pas réactiver l’ancien effacement autonome.
9. Décider de l’ouverture seulement après preuve des contrôles critiques.

**Les synchronisations automatiques ne reprennent qu’après ces étapes hors-sync.**
