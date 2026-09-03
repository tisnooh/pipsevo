# Audit de l’application connectée PipsEvo

Audit réalisé le 13 juillet 2026 sur les routes, composants React, états, formulaires, appels API, données de démonstration et parcours accessibles après connexion.

## 1. Fonctionnel

| Page | Composant | Comportement actuel | Comportement attendu | Fichier | Priorité |
|---|---|---|---|---|---|
| Application | Routes protégées | Redirige un utilisateur non connecté vers la connexion et un nouvel utilisateur vers l’onboarding | Conserver ce contrôle | `frontend/src/App.js` | Critique |
| AppShell | Navigation principale | Toutes les entrées de la sidebar pointent vers une route existante | Conserver et fermer correctement le drawer mobile | `frontend/src/pages/AppShell.jsx` | Critique |
| AppShell | Menu mobile | Drawer, overlay, fermeture par croix, navigation et touche Échap fonctionnent | Conserver | `frontend/src/pages/AppShell.jsx` | Critique |
| AppShell | Recherche globale | Recherche les pages de l’application et navigue vers le résultat | Conserver et ajouter l’état « aucun résultat » | `frontend/src/pages/AppShell.jsx` | Importante |
| AppShell | Menu du profil | Ouvre les paramètres, les comptes, l’aide, le support et déconnecte | Conserver | `frontend/src/pages/AppShell.jsx` | Importante |
| Comptes | Création | Enregistre un compte via l’API | Ajouter validation, loading et erreurs détaillées | `frontend/src/pages/Accounts.jsx` | Critique |
| Comptes | Suppression | Supprime le compte et ses trades après confirmation native | Remplacer par une confirmation cohérente et gérer les erreurs | `frontend/src/pages/Accounts.jsx` | Critique |
| Journal | Création/suppression | Les trades sont créés et supprimés via l’API | Corriger le mapping de champs et sécuriser les états | `frontend/src/pages/Journal.jsx` | Critique |
| Marchés | TradingView | Le symbole et l’unité de temps modifient le graphique | Conserver | `frontend/src/pages/MarketTerminal.jsx` | Importante |
| Marchés | Calculateur/check-list | Les calculs et coches réagissent correctement | Persister les préférences utiles | `frontend/src/pages/MarketTerminal.jsx` | Secondaire |
| Backtest | Simulation | Calcule capital final, profit, drawdown et espérance | Ajouter validation et explication méthodologique | `frontend/src/pages/Backtest.jsx` | Importante |
| Payouts | Ajout/simulateur | Ajoute un payout et calcule une projection | Ajouter loading, erreurs et blocage sans compte | `frontend/src/pages/Payouts.jsx` | Critique |
| Analyse IA | Questions/historique | Interroge l’API et recharge l’historique | Conserver, avec meilleurs états vides et erreurs | `frontend/src/pages/AICoach.jsx` | Importante |
| Paramètres | Profil | Le nom et le type de marché sont sauvegardés via l’API | Conserver | `frontend/src/pages/Settings.jsx` | Critique |

## 2. Partiellement fonctionnel

| Page | Composant | Comportement actuel | Comportement attendu | Fichier | Priorité |
|---|---|---|---|---|---|
| Dashboard | KPI et graphiques | Utilise l’API, mais bascule automatiquement sur de fausses données si le compte est vide | Afficher zéro et un état vide clairement identifié | `frontend/src/pages/Dashboard.jsx` | Critique |
| Dashboard | Période | La valeur change visuellement sans filtrer toutes les données | Filtrer courbe et trades selon 7/30/90 jours | `frontend/src/pages/Dashboard.jsx` | Critique |
| Dashboard | Payout/insight | Valeurs et texte partiellement codés en dur | Dériver les informations du compte ou indiquer l’absence de données | `frontend/src/pages/Dashboard.jsx` | Critique |
| Comptes | Liste des prop firms | Liste identique pour tous les utilisateurs | Filtrer selon `trader_type` et les choix d’onboarding | `frontend/src/pages/Accounts.jsx` | Importante |
| Comptes | Formulaire | Ne bloque pas les doubles soumissions et affiche « Erreur » sans détail | Ajouter validation, loading et message API | `frontend/src/pages/Accounts.jsx` | Critique |
| Journal | Formulaire | Envoie `exit`, `stop_loss` alors que l’API attend `exit_price`, `stop` | Aligner exactement frontend et backend | `frontend/src/pages/Journal.jsx` | Critique |
| Journal | KPIs | Calculés sur tous les trades même lorsque les filtres sont actifs | Calculer à partir de la liste filtrée | `frontend/src/pages/Journal.jsx` | Importante |
| Discipline | Règles | Certaines cartes sont toujours positives et utilisent des textes fixes | Exploiter les règles d’onboarding et les trades réels | `frontend/src/pages/Discipline.jsx` | Critique |
| Paramètres | Préférences | Les choix sont stockés localement mais n’influencent pas l’application | Appliquer au minimum le mode compact et les préférences d’affichage | `frontend/src/pages/Settings.jsx`, `frontend/src/pages/AppShell.jsx` | Importante |
| Payouts | Historique | Liste réelle mais aucun état de chargement/erreur et aucune suppression | Ajouter les états et les actions disponibles côté API | `frontend/src/pages/Payouts.jsx` | Importante |
| Trading DNA | Rapport | Affiche les données API mais reste bloqué sur « Chargement » en cas d’erreur | Ajouter erreur, retry et état données insuffisantes | `frontend/src/pages/TradingDNA.jsx` | Importante |
| Analyse IA | Cartes d’insight | Questions réelles, cartes supérieures entièrement codées en dur | Calculer les cartes ou les masquer si les données manquent | `frontend/src/pages/AICoach.jsx` | Critique |

## 3. Inactif

| Page | Composant | Comportement actuel | Comportement attendu | Fichier | Priorité |
|---|---|---|---|---|---|
| Statistiques | Onglets | Changent uniquement leur style, sans changer le contenu | Afficher la section correspondant à l’onglet | `frontend/src/pages/Analytics.jsx` | Critique |
| Statistiques | Période | Change la valeur du select mais ne filtre pas les graphiques | Filtrer tous les calculs et graphiques | `frontend/src/pages/Analytics.jsx` | Critique |
| Statistiques | Graphiques secondaires | Actifs, jours, heatmap, durée et comptes sont codés en dur | Calculer à partir des trades et comptes réels | `frontend/src/pages/Analytics.jsx` | Critique |
| Journal | Positions ouvertes | Teste un champ `exit` qui n’est pas correctement persisté | Utiliser `exit_price` et un statut cohérent | `frontend/src/pages/Journal.jsx` | Critique |
| Journal | Favoris | Filtre un champ `starred` jamais sauvegardé | Ajouter une vraie persistance ou retirer l’option | `frontend/src/pages/Journal.jsx`, `backend/server.py` | Importante |
| Journal | Menu « plus » | Affiche seulement un toast | Retirer le bouton ou ouvrir un vrai menu d’actions | `frontend/src/pages/Journal.jsx` | Importante |
| Paramètres | Modifier le mot de passe | Affiche seulement « bientôt disponible » | Désactiver avec explication claire tant que l’API n’existe pas | `frontend/src/pages/Settings.jsx` | Importante |
| AppShell | Notifications | Affiche toujours « aucune notification » avec un point rose permanent | Supprimer le faux indicateur ou fournir de vraies alertes locales | `frontend/src/pages/AppShell.jsx` | Importante |

## 4. Manquant

| Page | Composant | Comportement actuel | Comportement attendu | Fichier | Priorité |
|---|---|---|---|---|---|
| API globale | Session expirée | Une erreur 401 ne déconnecte pas proprement l’utilisateur | Intercepteur global, nettoyage du token et retour connexion | `frontend/src/lib/api.js`, `frontend/src/context/AuthContext.jsx` | Critique |
| Comptes | Modification | Aucun endpoint ni formulaire de modification | Ajouter PATCH et modale d’édition | `backend/server.py`, `frontend/src/lib/api.js`, `frontend/src/pages/Accounts.jsx` | Importante |
| Trades | Modification/favori | Aucun endpoint de mise à jour | Ajouter PATCH en conservant le solde du compte cohérent | `backend/server.py`, `frontend/src/lib/api.js`, `frontend/src/pages/Journal.jsx` | Critique |
| Payouts | Suppression | Aucun endpoint | Ajouter DELETE avec confirmation | `backend/server.py`, `frontend/src/lib/api.js`, `frontend/src/pages/Payouts.jsx` | Importante |
| Toute l’application | Chargements/erreurs | Gestion variable selon les pages | États cohérents avec retry et boutons désactivés | Plusieurs pages | Critique |
| Toute l’application | Confirmations | Utilise parfois `window.confirm` | Employer une modale cohérente et accessible | Plusieurs pages | Importante |
| Personnalisation | Onboarding | Les choix sont sauvegardés mais peu consommés | Filtrer prop firms, marchés, règles et messages selon le profil | Plusieurs pages | Critique |
| Accessibilité | Focus/labels | Styles et libellés incomplets selon les boutons | Ajouter focus visible, aria-label et tooltips | Plusieurs pages | Importante |
| Responsive | Statistiques/Journal | Certains onglets et tableaux débordent sur petit écran | Navigation scrollable et cartes mobiles | `Analytics.jsx`, `Journal.jsx` | Importante |

## Ordre de correction retenu

1. Cohérence des données et suppression des fausses données présentées comme réelles.
2. Alignement des modèles frontend/backend et gestion globale de session.
3. Filtres, onglets et actions actuellement inactifs.
4. États loading, vide, erreur, disabled et confirmations.
5. Personnalisation issue de l’onboarding et responsive.
6. Vérification de production et tests des parcours accessibles.
