/*
  # Update email templates system

  1. Changes
    - Create email_templates table
    - Add group visit invitation template
    - Update email sending function
*/

-- Create email_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for reading templates
CREATE POLICY "Allow public to read templates"
  ON email_templates
  FOR SELECT
  TO public
  USING (true);

-- Insert group visit invitation template
INSERT INTO email_templates (
  type,
  subject,
  html_content,
  text_content,
  variables
) VALUES (
  'group_visit_invitation',
  'Invitation à une visite groupée',
  '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a1a1a;">Invitation à une visite groupée</h2>
  
  <p style="color: #4b5563;">
    Bonjour {{first_name}},
  </p>
  
  <p style="color: #4b5563;">
    Nous avons le plaisir de vous inviter à une visite groupée pour le bien suivant :
  </p>
  
  <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{property_title}}</strong></p>
    <p style="margin: 8px 0 0;">{{property_address}}</p>
  </div>

  <div style="background-color: #eef2ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0; color: #4338ca;"><strong>Détails de la visite :</strong></p>
    <ul style="margin: 8px 0 0; padding-left: 20px; color: #4338ca;">
      <li>Date : {{visit_date}}</li>
      <li>Durée : {{visit_duration}} minutes</li>
    </ul>
  </div>

  <p style="color: #4b5563;">
    Pour confirmer votre présence, merci de cliquer sur le lien ci-dessous :
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{confirmation_link}}" style="
      background: linear-gradient(to right, #4f46e5, #6366f1);
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      display: inline-block;
    ">Confirmer ma présence</a>
  </div>

  <p style="color: #4b5563;">
    Si vous ne pouvez pas assister à la visite, merci de nous en informer dès que possible.
  </p>

  <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 14px;">
      Cet email a été envoyé automatiquement, merci de ne pas y répondre.
    </p>
  </div>
</div>
',
'Invitation à une visite groupée

Bonjour {{first_name}},

Nous avons le plaisir de vous inviter à une visite groupée pour le bien suivant :

{{property_title}}
{{property_address}}

Détails de la visite :
- Date : {{visit_date}}
- Durée : {{visit_duration}} minutes

Pour confirmer votre présence, merci de cliquer sur le lien suivant :
{{confirmation_link}}

Si vous ne pouvez pas assister à la visite, merci de nous en informer dès que possible.

Cet email a été envoyé automatiquement, merci de ne pas y répondre.',
'["first_name", "property_title", "property_address", "visit_date", "visit_duration", "confirmation_link"]'::jsonb
);

-- Update send_group_visit_emails function to use template
CREATE OR REPLACE FUNCTION send_group_visit_emails(
  group_visit_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visit_record RECORD;
  application_record RECORD;
  property_record RECORD;
  template_record RECORD;
BEGIN
  -- Get group visit details
  SELECT * INTO visit_record
  FROM group_visits
  WHERE id = group_visit_id;

  -- Get property details
  SELECT * INTO property_record
  FROM properties
  WHERE id = visit_record.property_id;

  -- Get email template
  SELECT * INTO template_record
  FROM email_templates
  WHERE type = 'group_visit_invitation';

  -- Send email to each selected candidate
  FOR application_record IN
    SELECT a.*
    FROM applications a
    JOIN group_visit_applications gva ON gva.application_id = a.id
    WHERE gva.group_visit_id = group_visit_id
  LOOP
    -- Create email log
    INSERT INTO email_logs (
      recipient,
      template_type,
      variables,
      status
    ) VALUES (
      application_record.email,
      'group_visit_invitation',
      jsonb_build_object(
        'first_name', application_record.first_name,
        'property_title', property_record.title,
        'property_address', property_record.location,
        'visit_date', to_char(visit_record.date, 'DD/MM/YYYY à HH24:MI'),
        'visit_duration', visit_record.duration,
        'confirmation_link', format(
          'https://%s/visits/%s/confirm?token=%s',
          current_setting('request.headers')::json->>'host',
          group_visit_id,
          encode(hmac(group_visit_id::text || application_record.id::text, current_setting('app.jwt_secret'), 'sha256'), 'hex')
        )
      ),
      'pending'
    );

    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      property_id,
      application_id,
      first_name,
      last_name,
      property_title,
      read
    )
    SELECT
      a.user_id,
      'group_visit_scheduled',
      visit_record.property_id,
      application_record.id,
      application_record.first_name,
      application_record.last_name,
      property_record.title,
      false
    FROM applications a
    WHERE a.id = application_record.id;
  END LOOP;
END;
$$;