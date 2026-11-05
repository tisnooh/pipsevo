# Bêta gratuite : publication et vérifications du 5 novembre 2026

Le journal manuel et le CSV sont le parcours de lancement. Aucune intervention
sur les plateformes de trading, aucun changement de domaine ni paiement.

## Base de données : publié et vérifié

La migration `20261011183000` a été appliquée seule, puis enregistrée sur le
projet PipsEvo. Le script `supabase/tests/live_rls_rollback.sql` a réussi sur
PostgreSQL hébergé : accès limité au propriétaire, suspension du profil,
suppression logique et ban Auth, réactivation, captures privées, refus anonyme,
refus d’élévation de rôle. Les deux identités synthétiques et toutes leurs
données ont été annulées. Ce test emploie les rôles et claims PostgreSQL ;
il ne valide pas l’inscription, la réception d’un e-mail ou un JWT HTTP réel.

Le conseiller sécurité Supabase a retourné un avertissement : la vérification
des mots de passe compromis est désactivée. Aucun changement de plan effectué.

## Serveur : publié et vérifié

Render a servi le commit `a3b6dda`, avec contrôle Mongo réussi au démarrage.
Les routes d’export du Lab, de suppression de compte et de reprise privée sont
présentes dans l’OpenAPI publique. L’export sans session répond 401. Un prévol
CORS avec l’origine du site répond 200 avec l’origine exacte ; une origine
étrangère répond 400 sans autorisation. Aucun effacement réel n’a été demandé.

Le rôle support est limité à l’identité dans la liste des utilisateurs, la
recherche globale et la fiche utilisateur : il ne reçoit pas l’abonnement ni
l’historique de trading de l’utilisateur. Tests backend : 392 réussis sur ce
commit. Le correctif suivant, `7f86bd3`, conserve également le Lab sur une
réponse Auth 200/null ou sur une redirection : 42 tests du module réussis.
Le healthcheck Render a ensuite confirmé ce second commit et le démarrage Mongo.

## Frontend : validation avant publication

Les 78 suites (500 tests) ont réussi, ainsi que le lint et la compilation de
production (2943 modules). Ces résultats ne remplacent pas une inspection
visuelle en navigateur. Les comptes anonymes Supabase sont désactivés et la
confirmation par e-mail est requise : ces contrôles sont conservés.

## Vérifications restant à clôturer

- Recette navigateur clair et sombre sur mobile et ordinateur, et sessions
  Auth de test sur le service publié.
- Audit de sécurité complet du candidat publié ; les tests ciblés ci-dessus
  ne constituent pas un audit exhaustif.
- Preuve de réception des e-mails de compte, de bienvenue, de support et de
  newsletter après configuration de l’expéditeur, en fin de préparation.
- La bêta reste gratuite ; les paiements et la commercialisation d’un plan
  payant ne font pas partie de cette publication.
