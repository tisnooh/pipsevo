# Recette navigateur du 6 novembre 2026

## Périmètre réellement vérifié

Le navigateur intégré est maintenant accessible. Contrôle sur la session
PipsEvo déjà ouverte, sans ajout, modification ni suppression de données réelles.

- Dashboard, journal et paramètres : captures inspectées en clair et sombre,
  ordinateur et mobile 390 x 844.
- Journal et paramètres : contrôle supplémentaire à 320 pixels, sans débordement
  horizontal global.
- Dashboard et journal : même résultat, même nombre de trades et même win rate
  pour la période et la devise sélectionnées.
- Paramètres / Notifications : les préférences du serveur sont chargées, sans
  enregistrement ni changement de consentement.
- Aucun message console de niveau erreur dans les huit entrées maximum demandées
  à la fin de ce parcours. Ce constat limité ne remplace pas un audit des logs.
- Thème sombre initial restauré et surcharge de dimensions retirée après test.

## Corrections issues du contrôle

- En-têtes R Multiple / Durée : largeur minimale de colonne et espacement,
  alignés avec les lignes. Le tableau conserve son défilement interne.
- Badge de profil : fond et bordure utilisant les couleurs du thème.
- Bouton de suppression du journal : nom accessible explicite.
- Démo locale : champ trading_education aligné avec les préférences e-mail et
  commande de compilation --check sans sortie sur disque.

Validation locale dans le navigateur : journal à 1366, 768 et 390 pixels,
colonnes séparées de 12 pixels ; à 768 pixels, le tableau défile dans son
conteneur sans élargir la page. Badge des paramètres inspecté en clair.
Les 78 suites frontend / 500 tests passent.

## Ne pas confondre avec une validation complète

La recette ne couvre pas encore tous les parcours, les navigateurs Safari/Firefox
sur appareils physiques, la réception réelle des e-mails, les paiements ni un
audit de sécurité exhaustif. Les synchronisations restent hors périmètre.
Aucune opération destructive ou achat effectué.

## Incident détecté pendant la publication

La navigation d'un onglet resté ouvert vers la vue journalière a échoué sur
un ancien module JavaScript après remplacement du déploiement. Une actualisation
a rétabli la page. Cela invalide toute affirmation d'absence totale d'erreurs
sur l'ensemble de cette session : l'observation console ci-dessus était antérieure.

Un composant de récupération entoure désormais les routes chargées à la demande :
message compréhensible, avertissement sur les saisies non enregistrées et bouton
de rechargement explicite, sans boucle ni actualisation automatique. Trois tests
couvrent une page saine, un module asynchrone introuvable et une erreur de rendu.
Le détail technique de l'exception n'est pas affiché à l'utilisateur.

Le commit d4d1e02 a été poussé et le journal publié présente bien 12 pixels
d'espacement entre les en-têtes, vérifiés sur la session réelle après rechargement.
