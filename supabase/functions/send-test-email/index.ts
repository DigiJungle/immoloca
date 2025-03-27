import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { MailerSend, EmailParams, Sender, Recipient } from 'npm:mailersend@2.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('MAILERSEND_API_KEY')
    if (!apiKey) {
      throw new Error('MAILERSEND_API_KEY environment variable is not set')
    }

    const mailerSend = new MailerSend({
      apiKey: apiKey
    });

    const sentFrom = new Sender('test@trial-r6ke4n1xwvmgon12.mlsender.net', 'Test Sender');
    const recipients = [new Recipient('sounsty@gmail.com', 'Test Recipient')];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Test email')
      .setText('This is a test email')
      .setHtml('<p>This is a test email</p>');

    const response = await mailerSend.email.send(emailParams);

    return new Response(JSON.stringify(response), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('MailerSend error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})