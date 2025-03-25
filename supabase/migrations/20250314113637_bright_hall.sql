/*
  # Add test applications

  1. Changes
    - Add 3 test applications with pending status
    - Add notifications for each application
*/

-- Insert test applications
INSERT INTO applications (
  property_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  created_at
)
SELECT 
  id as property_id,
  'Jean' as first_name,
  'Dupont' as last_name,
  'jean.dupont@example.com' as email,
  '0612345678' as phone,
  'pending' as status,
  now() - interval '1 hour' as created_at
FROM properties 
WHERE type = 'rent'
LIMIT 1;

INSERT INTO applications (
  property_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  created_at
)
SELECT 
  id as property_id,
  'Marie' as first_name,
  'Martin' as last_name,
  'marie.martin@example.com' as email,
  '0623456789' as phone,
  'pending' as status,
  now() - interval '30 minutes' as created_at
FROM properties 
WHERE type = 'rent'
LIMIT 1;

INSERT INTO applications (
  property_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  created_at
)
SELECT 
  id as property_id,
  'Pierre' as first_name,
  'Durand' as last_name,
  'pierre.durand@example.com' as email,
  '0634567890' as phone,
  'pending' as status,
  now() as created_at
FROM properties 
WHERE type = 'rent'
LIMIT 1;

-- Insert notifications for each application
INSERT INTO notifications (
  user_id,
  type,
  subject,
  content_html,
  content_text,
  read,
  created_at
)
SELECT 
  p.user_id,
  'new_application',
  'Nouvelle candidature',
  format(
    '<div><p>Nouvelle candidature reçue pour le bien <strong>%s</strong></p><p>Candidat : %s %s</p></div>',
    p.title,
    a.first_name,
    a.last_name
  ),
  format(
    'Nouvelle candidature reçue pour le bien %s\nCandidat : %s %s',
    p.title,
    a.first_name,
    a.last_name
  ),
  false,
  a.created_at
FROM applications a
JOIN properties p ON a.property_id = p.id
WHERE a.status = 'pending';