/*
  # Configure email notifications for document rejection

  1. Changes
    - Create a notifications table to store email templates and settings
    - Add document rejection email template
*/

-- Create notifications table for email templates
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  subject text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for reading notifications
CREATE POLICY "Allow public to read notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (true);

-- Insert document rejection email template
INSERT INTO notifications (
  type,
  subject,
  content_html,
  content_text
) VALUES (
  'document_rejection',
  'Document refuse - Action requise',
  '
  <h2>Document refuse</h2>
  <p>Bonjour,</p>
  <p>Un document de votre dossier de candidature a ete refuse :</p>
  <ul>
    <li><strong>Document :</strong> {{ document_type }}</li>
    <li><strong>Motif du refus :</strong> {{ comment }}</li>
  </ul>
  <p>Merci de fournir un nouveau document en tenant compte du motif de refus.</p>
  <p>Cordialement,<br>L equipe de gestion</p>
  ',
  'Document refuse

Bonjour,

Un document de votre dossier de candidature a ete refuse :

Document : {{ document_type }}
Motif du refus : {{ comment }}

Merci de fournir un nouveau document en tenant compte du motif de refus.

Cordialement,
L equipe de gestion'
) ON CONFLICT (type) DO UPDATE
SET
  subject = EXCLUDED.subject,
  content_html = EXCLUDED.content_html,
  content_text = EXCLUDED.content_text,
  updated_at = now();