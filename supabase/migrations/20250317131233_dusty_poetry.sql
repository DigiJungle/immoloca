/*
  # Improve email notification system

  1. New Tables
    - `email_templates`: Stores email templates
    - `email_logs`: Tracks email sending attempts
  
  2. Changes
    - Add proper templates for all notification types
    - Add logging system
    - Add retry mechanism
*/

-- Create email templates table
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email logs table
CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template_type text NOT NULL,
  variables jsonb NOT NULL,
  status text NOT NULL,
  error text,
  attempts integer DEFAULT 0,
  last_attempt timestamptz,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);
CREATE INDEX idx_email_templates_type ON email_templates(type);

-- Insert default templates
INSERT INTO email_templates (type, subject, html_content, text_content, variables) VALUES
-- Application approved
('application_approved',
'Votre candidature a été acceptée',
'<div>
  <h2>Félicitations !</h2>
  <p>Votre candidature pour le bien {{property_title}} a été acceptée.</p>
  <p>L''agent immobilier va vous contacter prochainement pour organiser la suite.</p>
</div>',
'Félicitations !

Votre candidature pour le bien {{property_title}} a été acceptée.
L''agent immobilier va vous contacter prochainement pour organiser la suite.',
'["property_title"]'::jsonb),

-- Application rejected
('application_rejected',
'Mise à jour de votre candidature',
'<div>
  <h2>Statut de votre candidature</h2>
  <p>Nous sommes désolés de vous informer que votre candidature pour le bien {{property_title}} n''a pas été retenue.</p>
  <p>Nous vous souhaitons bonne chance dans votre recherche.</p>
</div>',
'Statut de votre candidature

Nous sommes désolés de vous informer que votre candidature pour le bien {{property_title}} n''a pas été retenue.
Nous vous souhaitons bonne chance dans votre recherche.',
'["property_title"]'::jsonb),

-- Document rejected
('document_rejected',
'Document à mettre à jour',
'<div>
  <h2>Document à mettre à jour</h2>
  <p>Un document de votre dossier nécessite une mise à jour :</p>
  <ul>
    <li>Type : {{document_type}}</li>
    <li>Motif : {{reason}}</li>
  </ul>
  <p>Merci de fournir un nouveau document.</p>
</div>',
'Document à mettre à jour

Un document de votre dossier nécessite une mise à jour :
- Type : {{document_type}}
- Motif : {{reason}}

Merci de fournir un nouveau document.',
'["document_type", "reason"]'::jsonb);

-- Create function to send email
CREATE OR REPLACE FUNCTION send_application_email(
  application_id uuid,
  template_type text,
  variables jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record RECORD;
  template_record RECORD;
BEGIN
  -- Get application data
  SELECT * INTO app_record
  FROM applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Get template
  SELECT * INTO template_record
  FROM email_templates
  WHERE type = template_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email template not found';
  END IF;

  -- Log email attempt
  INSERT INTO email_logs (
    recipient,
    template_type,
    variables,
    status
  ) VALUES (
    app_record.email,
    template_type,
    variables,
    'pending'
  );
END;
$$;

-- Create policies
CREATE POLICY "Allow authenticated to read templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to read logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (true);