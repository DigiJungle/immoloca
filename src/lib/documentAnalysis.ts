import { supabase } from './supabase';
import OpenAI from 'openai';
import { convertPDFToImage } from './pdfService';
import { formatName } from './formatters';
import { format, subMonths, startOfMonth } from 'date-fns';

let openai: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openai) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for document analysis');
    }
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  return openai;
};


// Fonction pour obtenir les 3 derniers mois
function getValidPayslipPeriods(): string[] {
  const today = new Date();
  
  // Inclure le mois courant
  const validPeriods = [format(today, 'MM/yyyy')];
  
  // Ajouter les 3 mois précédents
  for (let i = 1; i <= 3; i++) {
    const date = subMonths(today, i);
    validPeriods.push(format(date, 'MM/yyyy'));
  }
  
  return validPeriods;
}

// Fonction pour vérifier si une période est valide
function isValidPayslipPeriod(period: string): boolean {
  if (!period || typeof period !== 'string') return false;
  
  // Format attendu: MM/YYYY
  const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
  if (!regex.test(period)) return false;
  
  const validPeriods = getValidPayslipPeriods();
  return validPeriods.includes(period);
}

export interface DocumentAnalysisResult {
  documentType: string;
  isValid: boolean;
  confidence: number;
  extractedData: Record<string, any>;
  potentialIssues: string[];
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  status?: 'pending' | 'analyzing' | 'completed' | 'error';
  error?: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
}

export function getDocumentValidationMessage(result: DocumentAnalysisResult): string {
  const documentTypes = {
    identity: "Pièce d'identité",
    payslip: "Bulletin de salaire",
    employment_contract: "Contrat de travail",
    tax_notice: "Avis d'imposition",
    proof_of_address: "Justificatif de domicile",
    unknown: "Document inconnu"
  };

  // Utiliser le type de document détecté
  let documentName = documentTypes[result.documentType as keyof typeof documentTypes];
  
  // Si c'est un justificatif de domicile, utiliser le type spécifique
  if (result.documentType === 'proof_of_address' && result.extractedData.bill_type) {
    const billTypes = {
      electricity: 'Facture d\'électricité',
      water: 'Facture d\'eau',
      internet: 'Facture internet',
      rent: 'Quittance de loyer',
      home_insurance: 'Attestation d\'assurance habitation'
    };
    documentName = billTypes[result.extractedData.bill_type as keyof typeof billTypes] || documentName;
  }

  // Ajouter des détails spécifiques selon le type de document
  let details = '';
  if (result.extractedData) {
    switch (result.documentType) {
      case 'identity':
        details += '\n\nInformations principales :';
        if (result.extractedData.surname || result.extractedData.given_names) {
          const fullName = [result.extractedData.surname, result.extractedData.given_names]
            .filter(Boolean)
            .join(' ');
          details += `\n• Nom complet : ${fullName}`;
        }
        if (result.extractedData.date_of_birth) {
          details += `\n• Date de naissance : ${result.extractedData.date_of_birth}`;
        }
        if (result.extractedData.nationality) {
          details += `\n• Nationalité : ${result.extractedData.nationality}`;
        }
        if (result.extractedData.document_number) {
          details += `\n• N° de document : ${result.extractedData.document_number}`;
        }
        break;

      case 'payslip':
        details += '\n\nInformations principales :';
        if (result.extractedData.employee_name) {
          details += `\n• Salarié : ${result.extractedData.employee_name}`;
        }
        if (result.extractedData.company_name) {
          details += `\n• Entreprise : ${result.extractedData.company_name}`;
        }
        if (result.extractedData.job_title) {
          details += `\n• Fonction : ${result.extractedData.job_title}`;
        }
        if (result.extractedData.employee_status) {
          details += `\n• Statut : ${result.extractedData.employee_status}`;
        }
        if (result.extractedData.coefficient) {
          details += `\n• Coefficient : ${result.extractedData.coefficient}`;
        }
        if (result.extractedData.seniority_date) {
          details += `\n• Date d'ancienneté : ${result.extractedData.seniority_date}`;
        }
        if (result.extractedData.net_salary) {
          details += `\n• Salaire net : ${typeof result.extractedData.net_salary === 'number' 
            ? result.extractedData.net_salary.toLocaleString('fr-FR') 
            : result.extractedData.net_salary} €`;
        }
        if (result.extractedData.contract_type) {
          details += `\n• Type de contrat : ${result.extractedData.contract_type}`;
        }
        if (result.extractedData.pay_period) {
          details += `\n• Période : ${result.extractedData.pay_period}`;
        }
        break;

      case 'proof_of_address':
        details += '\n\nInformations principales :';
        if (result.extractedData.bill_type) {
          const billTypes = {
            electricity: 'Facture d\'électricité',
            water: 'Facture d\'eau',
            internet: 'Facture internet',
            rent: 'Quittance de loyer',
            home_insurance: 'Attestation d\'assurance habitation'
          };
          details += `\n• Type de document : ${billTypes[result.extractedData.bill_type as keyof typeof billTypes] || 'Autre'}`;
        }
        if (result.extractedData.provider_name) {
          details += `\n• Fournisseur : ${result.extractedData.provider_name}`;
        }
        if (result.extractedData.date) {
          details += `\n• Date : ${result.extractedData.date}`;
        }
        if (result.extractedData.amount) {
          details += `\n• Montant : ${typeof result.extractedData.amount === 'number' 
            ? result.extractedData.amount.toLocaleString('fr-FR') 
            : result.extractedData.amount} €`;
        }
        if (result.extractedData.address) {
          details += `\n• Adresse : ${result.extractedData.address}`;
        }
        break;

      case 'tax_notice':
        details += '\n\nInformations principales :';
        if (result.extractedData.reference_income) {
          details += `\n• Revenu fiscal de référence : ${typeof result.extractedData.reference_income === 'number' 
            ? result.extractedData.reference_income.toLocaleString('fr-FR') 
            : result.extractedData.reference_income} €`;
        }
        if (result.extractedData.tax_year) {
          details += `\n• Année d'imposition : ${result.extractedData.tax_year}`;
        }
        if (result.extractedData.number_of_parts) {
          details += `\n• Nombre de parts : ${result.extractedData.number_of_parts}`;
        }
        if (result.extractedData.tax_address) {
          details += `\n• Adresse fiscale : ${result.extractedData.tax_address}`;
        }
        break;
    }
  }

  if (!result.isValid) {
    return `⛔️ Document non valide\n${result.potentialIssues.join('\n')}${details}`;
  }

  if (result.confidence < 0.8) {
    return `⚠️ Vérification manuelle nécessaire\n${documentName}${details}`;
  }

  return `✅ Document valide\n${documentName}${details}`;
}

export async function analyzeDocument({ url, expectedType, isPDF }: { url: string; expectedType?: string; isPDF?: boolean }): Promise<DocumentAnalysisResult> {
  try {
    console.log('Starting document analysis...');
    
    // Get OpenAI client only when needed
    const ai = getOpenAIClient();
    
    // Validate input
    if (!url) {
      throw new Error('URL is required for document analysis');
    }

    // Set initial status
    const result: DocumentAnalysisResult = {
      documentType: 'unknown',
      isValid: false,
      confidence: 0,
      extractedData: {},
      potentialIssues: [],
      status: 'analyzing'
    };
    
    // Get current date and valid periods
    const validPeriods = getValidPayslipPeriods();
    
    if (!url) {
      throw new Error('URL is required for document analysis');
    }

    // If it's a PDF, we need to convert it to an image first
    if (isPDF) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageData = await convertPDFToImage(new File([blob], 'document.pdf', { type: 'application/pdf' }));
        url = imageData;
      } catch (error) {
        console.error('Error converting PDF to image:', error);
        result.status = 'error';
        result.error = 'Failed to process PDF document. Please try uploading an image format instead.';
        return result;
      }
    }
    
    console.log('Sending request to GPT-4 Vision...');
    const response = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [{
            type: "text",
            text: `Analyze this document and provide a JSON response with the following structure:

{
  "document_type": "identity|payslip|employment_contract|tax_notice|proof_of_address",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    // For identity documents
    "surname": "string",
    "given_names": "string",// only the first given name !
    "nationality": "string",
    "date_of_birth": "string",
    "document_number": "string",

    // For employment contracts
    "contract_type": "string",
    "employee_name": "string", 
    "company_name": "string",
    "start_date": "string",

    // For payslips
    "employee_name": "string",
    "company_name": "string",
    "net_salary": number,
    "pay_period": "MM/YYYY",
    "seniority_date": "DD/MM/YYYY",
    "coefficient": "string",
    "job_title": "string",
    "employee_status": "cadre|non-cadre",

    // For proof of address
    "provider_name": "string",
    "bill_type": "string",
    "date": "string",
    "amount": number,
    "address": "string",

    // For tax notices
    "reference_income": number,
    "tax_year": string,
    "number_of_parts": number,
    "tax_address": string
  },
  "potential_issues": ["string"]
}

Rules:
- Contract type must be one of: CDI, CDD, Interim
- Start date must be in DD/MM/YYYY format
- Payslip period must be in: ${validPeriods.join(', ')}
- Dates format: DD/MM/YYYY
- Numbers: use decimal points
- Currency: no symbols, just numbers`
            },
            {
              type: "image_url",
              image_url: {
                url: url,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0
    });

    const content = response.choices[0].message.content;
    if (!content) {
      result.status = 'error';
      result.error = 'No content received from analysis';
      return result;
    }
    console.log('Received GPT response:', content);

    const analysis = JSON.parse(content);
    console.log('Parsed analysis:', analysis);
    console.log('Extracted information:', analysis.extracted_information || {});

    // Vérifier la validité de la période pour les bulletins de salaire
    if (analysis.document_type === 'payslip' && analysis.extracted_information?.pay_period) {
      const period = analysis.extracted_information.pay_period;
      result.isValid = true;
      result.documentType = analysis.document_type;
      result.confidence = 0.9;
      result.extractedData = analysis.extracted_information;
      
      // S'assurer que les informations extraites sont toujours présentes
      if (!analysis.extracted_information) {
        analysis.extracted_information = {};
      }
    }

    // Ensure extracted_information is always an object
    const extractedData = analysis.extracted_information || {};
    console.log('Final extracted data:', extractedData);
    
    // Format names in extracted data if it's an identity document
    if (analysis.document_type === 'identity') {
      if (extractedData.surname) {
        extractedData.surname = formatName(extractedData.surname);
      }
      if (extractedData.given_names) {
        extractedData.given_names = formatName(extractedData.given_names);
      }
    }
    
    // Set document type and validity
    result.documentType = analysis.document_type;
    result.isValid = analysis.validity_assessment === 'Valid';
    result.confidence = 0.9;
    result.extractedData = extractedData;

    if (expectedType && result.documentType !== expectedType) {
      return {
        documentType: result.documentType,
        isValid: false,
        confidence: 0.9,
        extractedData,
        potentialIssues: [`Ce document semble être un ${getDocumentTypeName(result.documentType)}. Veuillez fournir un ${getDocumentTypeName(expectedType)}.`]
      };
    }

    console.log('Final result with all fields:', result);
    return result;
  } catch (error) {
    console.error('Error analyzing document:', {
      error,
      url: url.split('?')[0], // Remove query params for logging
      stack: error.stack
    });
    return {
      documentType: 'unknown',
      isValid: false,
      confidence: 0,
      extractedData: {},
      potentialIssues: ['Error analyzing document']
    };
  }
}

// Helper function to get human-readable document type names
function getDocumentTypeName(type: string): string {
  const documentTypes = {
    'identity': 'pièce d\'identité',
    'payslip': 'bulletin de salaire',
    'employment_contract': 'contrat de travail',
    'tax_notice': 'avis d\'imposition',
    'proof_of_address': 'justificatif de domicile'
  };
  return documentTypes[type as keyof typeof documentTypes] || type;
}