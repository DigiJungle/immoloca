/*
  # Create notifications system

  1. New Tables
    - notifications: Stores email templates and notification settings
  2. Changes
    - Adds document rejection email template
  3. Security
    - Enables RLS with public read access
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public to read notifications" ON notifications;

-- Create notifications table for email templates if it doesn't exist
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
  E'<h2>Document refuse</h2>
  <p>Bonjour,</p>
  <p>Un document de votre dossier de candidature a ete refuse :</p>
  <ul>
    <li><strong>Document :</strong> {{ document_type }}</li>
    <li><strong>Motif du refus :</strong> {{ comment }}</li>
  </ul>
  <p>Merci de fournir un nouveau document en tenant compte du motif de refus.</p>
  <p>Cordialement,<br>L equipe de gestion</p>',
  E'Document refuse

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