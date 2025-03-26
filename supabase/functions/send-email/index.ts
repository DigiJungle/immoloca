import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MailerSend, EmailParams, Sender, Recipient } from 'npm:mailersend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': '*'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only POST requests are allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('MAILERSEND_API_KEY');
    if (!apiKey) {
      console.error('MAILERSEND_API_KEY environment variable is not set');
      return new Response(JSON.stringify({
        error: 'Configuration error',
        message: 'Email service is not properly configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request',
        message: 'Invalid JSON body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, text, html } = body;

    if (!to || !subject || (!text && !html)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request',
        message: 'Missing required fields: to, subject, and either text or html content'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mailerSend = new MailerSend({
      apiKey
    });

    const emailParams = new EmailParams()
      .setFrom(new Sender('noreply@trial-r6ke4n1xwvmgon12.mlsender.net', 'L\'Immo'))
      .setTo([new Recipient(to)])
      .setSubject(subject)
      .setText(text || '')
      .setHtml(html || '');

    try {
      const response = await mailerSend.email.send(emailParams);
      console.log('Email sent successfully:', response);

      return new Response(JSON.stringify({ success: true, data: response }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (emailError) {
      console.error('MailerSend error:', emailError);
      return new Response(JSON.stringify({ 
        error: 'Failed to send email',
        message: emailError.message,
        details: emailError.response?.data || emailError.toString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message || error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});