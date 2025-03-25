import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const DOCUMENT_TYPE_LABELS = {
  identity: 'Pièce d\'identité',
  income: 'Justificatifs de revenus',
  tax: 'Avis d\'imposition',
  residence: 'Justificatif de domicile',
  guarantor: 'Documents du garant',
};

serve(async (req) => {
  try {
    const { recipientEmail, applicationId, document_type, comment } = await req.json();

    // Vérification des paramètres requis
    if (!applicationId || !document_type || !comment || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400 }
      );
    }

    // Initialiser le client Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Récupérer le template d'email
    const { data: template, error: templateError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('type', 'document_rejection')
      .single();

    if (templateError) {
      throw new Error('Failed to fetch email template');
    }

    // Remplacer les variables dans le template
    const htmlContent = template.content_html
      .replace('{{ document_type }}', document_type)
      .replace('{{ comment }}', comment);

    const textContent = template.content_text
      .replace('{{ document_type }}', document_type)
      .replace('{{ comment }}', comment);

    // Envoyer l'email
    const { error: emailError } = await supabaseAdmin.auth.admin.sendEmail(
      recipientEmail,
      template.subject,
      {
        html: htmlContent,
        text: textContent,
      }
    );

    if (emailError) {
      throw emailError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});