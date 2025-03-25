/*
  # Nettoyage des candidatures et fichiers

  1. Suppression des données
    - Vide la table des candidatures
    - Supprime les fichiers du bucket 'applications'
    - Vide la table des logs de notifications

  2. Sécurité
    - Préserve la structure des tables
    - Maintient les politiques RLS
*/

-- Vider la table des candidatures
TRUNCATE TABLE applications CASCADE;

-- Vider la table des logs de notifications
TRUNCATE TABLE notification_logs CASCADE;

-- Supprimer tous les fichiers du bucket 'applications'
DELETE FROM storage.objects
WHERE bucket_id = 'applications';