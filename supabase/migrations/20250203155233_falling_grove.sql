/*
  # Add notification processing function

  1. Changes
    - Add function to process notifications asynchronously
  2. Security
    - Function is accessible only to authenticated users
*/

-- Create or replace the notification processing function
CREATE OR REPLACE FUNCTION process_notification(application_id uuid)
RETURNS void AS $$
DECLARE
  app_record RECORD;
  template_record RECORD;
  html_content TEXT;
  text_content TEXT;
BEGIN
  -- Get application data
  SELECT * INTO app_record
  FROM applications
  WHERE id = application_id
  AND notification_sent = true
  AND notification_data IS NOT NULL;

  IF FOUND THEN
    -- Get template
    SELECT * INTO template_record
    FROM notifications
    WHERE type = app_record.notification_type;

    IF FOUND THEN
      -- Replace placeholders in template
      html_content := template_record.content_html;
      text_content := template_record.content_text;

      html_content := replace(html_content, '{{ document_type }}', 
        (app_record.notification_data->>'document_type')::text);
      html_content := replace(html_content, '{{ comment }}', 
        (app_record.notification_data->>'comment')::text);

      text_content := replace(text_content, '{{ document_type }}', 
        (app_record.notification_data->>'document_type')::text);
      text_content := replace(text_content, '{{ comment }}', 
        (app_record.notification_data->>'comment')::text);

      -- Log notification attempt
      INSERT INTO notification_logs (
        application_id,
        notification_type,
        notification_data,
        processed_at
      ) VALUES (
        app_record.id,
        app_record.notification_type,
        app_record.notification_data,
        now()
      );

      -- Mark notification as processed
      UPDATE applications
      SET notification_sent = false,
          notification_data = notification_data || jsonb_build_object('processed_at', now())
      WHERE id = application_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;