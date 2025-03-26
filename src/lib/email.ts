import { supabase } from './supabase';

export async function sendApplicationEmail(
  applicationId: string,
  templateType: string,
  variables: Record<string, string>
): Promise<void> {
  try {
    const { data: application } = await supabase
      .from('applications')
      .select('email')
      .eq('id', applicationId)
      .single();

    if (!application?.email) {
      throw new Error('Application email not found');
    }

    const { error } = await supabase.functions.invoke('send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: application.email,
        subject: `L'Immo - ${templateType}`,
        text: `Notification: ${templateType}\n\n${JSON.stringify(variables, null, 2)}`,
        html: `<h2>Notification: ${templateType}</h2><pre>${JSON.stringify(variables, null, 2)}</pre>`
      })
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error sending application email:', error);
    throw error;
  }
}

export async function sendTestEmail() {
  try {
    console.log('Sending test email via Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'sounsty@gmail.com',
        subject: 'Test MailerSend',
        text: 'Ceci est un test d\'envoi d\'email via MailerSend.',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Test d'envoi d'email</h2>
            <p style="color: #4b5563;">
              Ceci est un test d'envoi d'email via MailerSend.
            </p>
            <p style="color: #4b5563;">
              Si vous recevez cet email, la configuration est correcte !
            </p>
          </div>
        `
      })
    });

    if (error) {
      console.error('Edge Function error:', {
        message: error.message,
        name: error.name,
        details: error.context
      });
      throw error;
    }

    console.log('Test email sent successfully');
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}