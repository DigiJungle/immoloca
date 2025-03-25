import { supabase } from './supabase';

// Temporary mock implementation until email system is rebuilt
export async function sendApplicationEmail(
  applicationId: string,
  templateType: string,
  variables: Record<string, string>
): Promise<void> {
  console.log('Email functionality temporarily disabled', {
    applicationId,
    templateType,
    variables
  });
}

export async function sendTestEmail() {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test email from L\'Immo',
        html: '<p>Test email from L\'Immo</p>'
      })
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}