# Recette de lancement — 12 novembre

- Inscription : le message de confirmation du compte dédié a été retrouvé dans
  Gmail, dans **Spam**. Une réception n’est pas une garantie de placement en
  boîte principale. Les onglets observés étaient la confirmation et la connexion.
- Support et newsletter : une demande de test par parcours sur le backend
  publié a répondu HTTP 503. Aucune livraison de ces deux messages n’est validée.
- Correctif support : un ticket enregistré reste accessible via le filtre
  « ouvert » et sa référence est rendue même si le transport échoue. Cela
  ne confirme pas l’envoi de l’accusé. Aucun ancien ticket n’est modifié.
- Le transport Gmail HTTPS est facultatif et désactivé par défaut. Ne pas
  activer sans consentement d’envoi de la boîte expéditrice, secrets privés
  et contrôle d’un envoi réel. Il ne change pas le transport de Supabase Auth.
- Le fichier synthétique `frontend/tests/fixtures/recette-journal.csv` contient
  deux trades nets : +125 et −50. Avec un compte manuel USD, les attentes sont
  +75 USD, 50 % de réussite et un profit factor de 2,5. Le test automatisé
  vérifie le parseur, le rejet des doublons et le calcul utilisé par Journal
  et Statistiques. L’écriture et la relecture sur le compte de recette restent
  à vérifier séparément. Ne jamais importer ce fichier sur un compte principal.
- L’audit de sécurité complet nécessite une session avec profil de fichiers
  géré compatible avec les workers en lecture seule. Il n’est pas clôturé.
