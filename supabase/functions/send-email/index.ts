import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MailerSend, EmailParams, Sender, Recipient } from 'npm:mailersend';

const mailerSend = new MailerSend({
  apiKey: Deno.env.get('MAILERSEND_API_KEY') || ''
});

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const { to, subject, text, html } = await req.json();

    const emailParams = new EmailParams()
      .setFrom(new Sender('noreply@trial-r6ke4n1xwvmgon12.mlsender.net', 'L\'Immo'))
      .setTo([new Recipient(to)])
      .setSubject(subject)
      .setText(text)
      .setHtml(html);

    const response = await mailerSend.email.send(emailParams);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});