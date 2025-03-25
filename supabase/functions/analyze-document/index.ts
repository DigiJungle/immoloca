import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import OpenAI from 'https://esm.sh/openai@4.28.0';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});

interface DocumentAnalysisResult {
  documentType: string;
  isValid: boolean;
  confidence: number;
  extractedData: {
    name?: string;
    amount?: number;
    date?: string;
    [key: string]: any;
  };
  potentialIssues: string[];
}

serve(async (req) => {
  try {
    // Vérifier la méthode
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Récupérer et valider les données
    const { documentUrl } = await req.json();
    if (!documentUrl) {
      return new Response(JSON.stringify({ error: 'Document URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Analyser le document avec GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Please analyze this document and provide a structured analysis in JSON format with:\n1. Document type\n2. Validity assessment\n3. Extracted information\n4. Any potential issues" },
            { type: "image_url", image_url: { url: documentUrl, detail: "high" } }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const analysis = response.choices[0].message.content;
    
    // Parser et structurer la réponse
    const result: DocumentAnalysisResult = {
      documentType: "unknown",
      isValid: false,
      confidence: 0,
      extractedData: {},
      potentialIssues: []
    };

    if (analysis) {
      // Déterminer le type de document
      if (analysis.toLowerCase().includes("carte d'identité")) {
        result.documentType = "identity";
      } else if (analysis.toLowerCase().includes("bulletin de salaire")) {
        result.documentType = "payslip";
      } else if (analysis.toLowerCase().includes("avis d'imposition")) {
        result.documentType = "tax_notice";
      }

      // Évaluer la validité
      result.isValid = !analysis.toLowerCase().includes("faux") && 
                      !analysis.toLowerCase().includes("falsifié") &&
                      !analysis.toLowerCase().includes("suspect");

      result.confidence = analysis.toLowerCase().includes("certain") ? 0.9 : 0.7;

      // Extraire les problèmes potentiels
      if (analysis.toLowerCase().includes("problème") || 
          analysis.toLowerCase().includes("issue") || 
          analysis.toLowerCase().includes("suspicious")) {
        result.potentialIssues.push("Document potentiellement altéré");
      }

      // Stocker l'analyse brute pour référence
      result.extractedData = {
        rawAnalysis: analysis
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    return new Response(JSON.stringify({ error: 'Failed to analyze document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});