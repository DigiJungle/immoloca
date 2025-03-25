import { DocumentAnalysisResult } from './documentAnalysis';

interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

export function validateDocumentSet(documents: Record<string, DocumentAnalysisResult>): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    issues: []
  };

  // Check if all required documents are present and valid
  const requiredDocuments = ['identity', 'payslip_1', 'payslip_2', 'payslip_3', 'employment_contract', 'proof_of_address'];
  
  for (const docType of requiredDocuments) {
    if (!documents[docType]) {
      result.isValid = false;
      result.issues.push(`Document manquant : ${
        docType.startsWith('payslip') ? 'bulletin de salaire' : 
        docType === 'identity' ? 'pièce d\'identité' :
        docType === 'employment_contract' ? 'contrat de travail' :
        docType === 'proof_of_address' ? 'justificatif de domicile' : docType
      }`);
    } else if (!documents[docType].isValid) {
      result.isValid = false;
      result.issues.push(`Document invalide : ${
        docType.startsWith('payslip') ? 'bulletin de salaire' : 
        docType === 'identity' ? 'pièce d\'identité' :
        docType === 'employment_contract' ? 'contrat de travail' :
        docType === 'proof_of_address' ? 'justificatif de domicile' : docType
      }`);
    }
  }

  // Check for consistency between documents
  if (documents.identity && documents.payslip_1) {
    const identityName = documents.identity.extractedData?.name?.toLowerCase();
    const payslipName = documents.payslip_1.extractedData?.employee_name?.toLowerCase();
    
    if (identityName && payslipName && !payslipName.includes(identityName)) {
      result.isValid = false;
      result.issues.push('Le nom sur les documents ne correspond pas');
    }
  }

  return result;
}