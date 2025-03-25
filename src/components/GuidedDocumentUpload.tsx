import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, ChevronRight, Info, HelpCircle, Trash2, Plus, Calendar } from 'lucide-react';
import { analyzeDocument, DocumentAnalysisResult } from '../lib/documentAnalysis';
import { supabase } from '../lib/supabase';

interface GuidedDocumentUploadProps {
  propertyId: string;
  onComplete: (documents: Record<string, DocumentAnalysisResult>) => void;
}

type DocumentStep = {
  id: string;
  title: string;
  description: string;
  helpText: string;
  acceptedFormats: string;
  validationCriteria: string[];
  multipleFiles?: boolean;
  requiredCount?: number;
};

const documentSteps: DocumentStep[] = [
    {
    id: 'identity',
    title: 'Pièce d\'identité',
    description: 'Carte nationale d\'identité, passeport ou titre de séjour en cours de validité',
    helpText: 'Le document doit être lisible et non expiré. Les deux faces de la carte d\'identité sont nécessaires.',
    acceptedFormats: '.jpg, .jpeg, .png, .pdf',
    validationCriteria: [
      'Document non expiré',
      'Informations lisibles',
      'Photo visible'
    ]
  },
  {
    id: 'payslip',
    title: 'Justificatif de revenu',
    description: '3 bulletins de salaire et dernier avis d\'imposition (toutes les pages)',
    helpText: 'Pour les bulletins de salaire, nous avons besoin des 3 derniers mois consécutifs. Pour l\'avis d\'imposition, il doit mentionner votre revenu fiscal de référence et le nombre de parts.',
    acceptedFormats: '.jpg, .jpeg, .png, .pdf',
    validationCriteria: [
      'Document récent (moins de 3 mois pour les bulletins)',
      'Nom et prénom visibles',
      'Montant du salaire net ou revenu fiscal visible',
      'Période ou année fiscale indiquée'
    ],
    multipleFiles: true,
    requiredCount: 3
  },
  {
    id: 'employment_contract',
    title: 'Justificatif professionnel',
    description: 'Contrat de travail ou attestation d\'emploi',
    helpText: 'Le document doit mentionner votre statut (CDI, CDD, etc.), votre salaire et la date de début du contrat.',
    acceptedFormats: '.jpg, .jpeg, .png, .pdf',
    validationCriteria: [
      'Type de contrat mentionné',
      'Salaire indiqué',
      'Date de début du contrat visible',
      'Signatures présentes'
    ]
  },
  {
    id: 'proof_of_address',
    title: 'Justificatif de domicile',
    description: 'Facture d\'électricité, d\'eau, de gaz ou quittance de loyer de moins de 3 mois',
    helpText: 'Le document doit être récent (moins de 3 mois) et mentionner votre nom et votre adresse actuelle.',
    acceptedFormats: '.jpg, .jpeg, .png, .pdf',
    validationCriteria: [
      'Document de moins de 3 mois',
      'Nom et adresse visibles',
      'Document émis par un organisme officiel'
    ]
  }
];

// Fonction pour obtenir les 3 derniers mois
function getLastThreeMonths() {
  const months = [];
  const today = new Date();
  
  // Commencer par le mois précédent
  for (let i = 1; i <= 3; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    months.push(`${month}/${year}`);
  }
  
  return months;
}

// Fonction pour vérifier si une période est dans les 3 derniers mois
function isValidPayslipPeriod(period: string): boolean {
  if (!period || typeof period !== 'string') return false;
  
  // Format attendu: MM/YYYY
  const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
  if (!regex.test(period)) return false;
  
  const validPeriods = getLastThreeMonths();
  return validPeriods.includes(period);
}

function GuidedDocumentUpload({ propertyId, onComplete }: GuidedDocumentUploadProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [documents, setDocuments] = useState<Record<string, DocumentAnalysisResult | DocumentAnalysisResult[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [expectedMonths] = useState(getLastThreeMonths());

  const isStepComplete = (stepId: string) => {
    const doc = documents[stepId];
    
    if (!doc) return false;
    
    if (Array.isArray(doc)) {
      const step = documentSteps.find(s => s.id === stepId);
      const requiredCount = step?.requiredCount || 1;
      
      // Pour les bulletins de salaire, on vérifie qu'il y a au moins 3 documents
      if (stepId === 'payslip') {
        return doc.length >= requiredCount && doc.every(d => d.isValid);
      }
      
      return doc.length >= requiredCount && doc.every(d => d.isValid);
    }
    
    return doc.isValid === true;
  };

  const currentStep = documentSteps[currentStepIndex];
  const progress = Math.round((documentSteps.filter(step => isStepComplete(step.id)).length / documentSteps.length) * 100);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    // Reset error state
    setError(null);

    // Validate file size and type before upload
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (5MB limit)
      if (file.size > maxSize) {
        setError(`Le fichier ${file.name} est trop volumineux. La taille maximale est de 5MB.`);
        return;
      }
      
      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError(`Le format du fichier ${file.name} n'est pas supporté. Formats acceptés : PDF, JPEG, PNG`);
        return;
      }
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Traiter chaque fichier
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressPerFile = 90 / files.length;
        const baseProgress = (i * progressPerFile) + 10;

        // Générer un nom de fichier unique
        const fileExt = file.name.split('.').pop();
        const fileName = `${propertyId}/${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Check if file is PDF
        const isPDF = file.type === 'application/pdf';

        // Upload du fichier
        const { error: uploadError } = await supabase.storage
          .from('applications')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * progressPerFile) + baseProgress);
            }
          });
        
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error('Erreur lors du téléchargement du fichier. Veuillez réessayer.');
        }
        setUploadProgress(baseProgress + progressPerFile * 0.6);
      
        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('applications')
          .getPublicUrl(fileName);

        if (!publicUrl) {
          throw new Error('Erreur lors de la récupération de l\'URL du fichier.');
        }
      
        setUploadProgress(baseProgress + progressPerFile * 0.7);
      
        // Analyser le document
        const analysisResult = await analyzeDocument({ 
          url: publicUrl,
          expectedType: currentStep.id,
          isPDF
        });
        
        // Vérifier si l'analyse a échoué
        if (analysisResult.status === 'error') {
          throw new Error(analysisResult.error || 'Erreur lors de l\'analyse du document');
        }

        // Vérifier si le document est valide
        if (!analysisResult.isValid) {
          throw new Error(analysisResult.potentialIssues.join(', '));
        }
        
        // Vérifier si l'analyse a échoué
        if (!analysisResult.isValid && analysisResult.error) {
          throw new Error(analysisResult.error);
        }

        // Ajouter l'URL et le nom du fichier au résultat
        analysisResult.fileUrl = publicUrl;
        analysisResult.fileName = file.name;
        analysisResult.uploadedAt = new Date().toISOString();

        setUploadProgress(baseProgress + progressPerFile * 0.9);
      
        // Vérifier les doublons pour les bulletins de salaire
        if (currentStep.multipleFiles && currentStep.id === 'payslip') {
          const existingDocs = documents[currentStep.id] || [];
          const docsArray = Array.isArray(existingDocs) ? existingDocs : [existingDocs];
        
          // Vérifier si un document avec la même période existe déjà
          const period = analysisResult.extractedData?.pay_period;
          if (period && docsArray.some(doc => doc.extractedData?.pay_period === period)) {
            console.warn(`Un bulletin pour la période ${period} a déjà été téléchargé.`);
            continue;
          }
        
          // Vérifier si la période est valide (dans les 3 derniers mois)
          if (period && !isValidPayslipPeriod(period)) {
            // Marquer le document comme invalide et ajouter un message d'erreur
            analysisResult.isValid = false;
            analysisResult.potentialIssues.push(`La période ${period} n'est pas dans les 3 derniers mois (${expectedMonths.join(', ')})`);
          }
        }
      
        // Mettre à jour l'état des documents
        if (currentStep.multipleFiles) {
          setDocuments(prev => {
            const existingDocs = prev[currentStep.id] || [];
            const docsArray = Array.isArray(existingDocs) ? existingDocs : [existingDocs];
          
            return {
              ...prev,
              [currentStep.id]: [
                ...docsArray,
                {
                  ...analysisResult,
                  documentType: currentStep.id,
                  fileUrl: publicUrl,
                  fileName: file.name,
                  uploadedAt: new Date().toISOString()
                }
              ]
            };
          });
        } else {
          setDocuments(prev => ({
            ...prev,
            [currentStep.id]: {
              ...analysisResult,
              documentType: currentStep.id,
              fileUrl: publicUrl,
              fileName: file.name,
              uploadedAt: new Date().toISOString()
            }
          }));
        }
      }
      
      setUploadProgress(100);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(error instanceof Error ? error.message : 'Une erreur est survenue lors du téléchargement du document.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const areAllDocumentsValid = () => documentSteps.every(step => isStepComplete(step.id));

  const canProceed = isStepComplete(currentStep.id);

  const goToNextStep = () => {
    if (currentStepIndex < documentSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (currentStepIndex === documentSteps.length - 1) {
      // Si nous sommes à la dernière étape et que tous les documents sont validés
      // Convertir les tableaux de documents en documents individuels pour la compatibilité
      const flattenedDocuments: Record<string, DocumentAnalysisResult> = {};
      
      Object.entries(documents).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Pour les étapes avec plusieurs documents, on utilise un suffixe numérique
          value.forEach((doc, index) => {
            flattenedDocuments[`${key}_${index + 1}`] = doc;
          });
        } else {
          flattenedDocuments[key] = value;
        }
      });
      
      onComplete(flattenedDocuments);
      setIsSubmitted(true);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Dossier envoyé avec succès !
          </h3>
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {property.title}
            </p>
            <p className="text-gray-600">
              {property.type === 'rent' ? 'Loyer : ' : 'Prix : '}
              {property.price.toLocaleString('fr-FR')} €
              {property.type === 'rent' ? '/mois' : ''}
            </p>
          </div>
          <p className="text-gray-600">
            Votre dossier a été transmis à l'agent immobilier. Vous serez recontacté rapidement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      
      {/* Steps navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {documentSteps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => {
              // Allow navigation to completed steps or the current step + 1
              if (isStepComplete(step.id) || index <= currentStepIndex) {
                setCurrentStepIndex(index);
              }
            }}
            disabled={!isStepComplete(step.id) && index > currentStepIndex}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-colors ${
              index === currentStepIndex
                ? 'bg-rose-100 text-rose-700 border-2 border-rose-500'
                : isStepComplete(step.id)
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <span className="mr-2">{index + 1}.</span>
            {isStepComplete(step.id) && <CheckCircle className="w-4 h-4 mr-2" />}
            {step.title}
          </button>
        ))}
      </div>

            {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Étape {currentStepIndex + 1} sur {documentSteps.length}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progress}% complété
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      {/* Current step */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              {currentStep.title}
              <button
                onClick={() => setShowHelp(showHelp === currentStep.id ? null : currentStep.id)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </h2>
            <div className="text-sm text-gray-500">
              {isStepComplete(currentStep.id) ? (
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {currentStep.multipleFiles ? 'Documents validés' : 'Document validé'}
                </span>
              ) : (
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  En attente
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-gray-600">{currentStep.description}</p>
          
          {showHelp === currentStep.id && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Conseils pour ce document</h4>
                  <p className="text-blue-700 text-sm mb-3">{currentStep.helpText}</p>
                  
                  <h5 className="font-medium text-blue-800 mb-1">Critères de validation :</h5>
                  <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                    {currentStep.validationCriteria.map((criteria, i) => (
                      <li key={i}>{criteria}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6">
          {currentStep.multipleFiles ? (
            // Affichage pour les documents multiples
            documents[currentStep.id] && Array.isArray(documents[currentStep.id]) ? (
              <div className="space-y-4">
                {/* Upload interface - Always displayed at the top */}
                <div className="mb-6">
                  {isStepComplete(currentStep.id) ? null : isUploading ? (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        {uploadProgress < 60 ? 'Téléchargement en cours...' : 
                         uploadProgress < 90 ? 'Analyse du document...' : 
                         'Finalisation...'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <label className="flex-1">
                        <div className="relative flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer">
                          <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept={currentStep.acceptedFormats}
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            multiple
                          />
                          <div className="text-center">
                            <Plus className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-1 text-sm text-gray-500">
                              {(documents[currentStep.id] as DocumentAnalysisResult[]).length < (currentStep.requiredCount || 1) ? "Ajouter un bulletin de salaire" : "Remplacer un bulletin de salaire"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Formats acceptés : {currentStep.acceptedFormats}
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Documents téléchargés ({(documents[currentStep.id] as DocumentAnalysisResult[]).length}/{currentStep.requiredCount})
                  </h4> 
                  {!isStepComplete(currentStep.id) && (documents[currentStep.id] as DocumentAnalysisResult[]).length < (currentStep.requiredCount || 1) && (
                    <div className="text-sm text-amber-600 font-medium">
                      {(currentStep.requiredCount || 1) - (documents[currentStep.id] as DocumentAnalysisResult[]).length} document{(currentStep.requiredCount || 1) - (documents[currentStep.id] as DocumentAnalysisResult[]).length > 1 ? 's' : ''} restant{(currentStep.requiredCount || 1) - (documents[currentStep.id] as DocumentAnalysisResult[]).length > 1 ? 's' : ''} ({
                        expectedMonths.filter(month => 
                          !(documents[currentStep.id] as DocumentAnalysisResult[])
                            .some(doc => doc.extractedData?.pay_period === month)
                        ).join(', ')
                      })
                    </div>
                  )}
                </div>
                
                {(documents[currentStep.id] as DocumentAnalysisResult[]).map((doc, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg ${
                      doc.isValid
                        ? 'bg-green-50 border border-green-100'
                        : 'bg-red-50 border border-red-100'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`mt-1 mr-3 ${
                        doc.isValid ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {doc.isValid ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {doc.isValid ? 'Document validé' : 'Document non valide'} 
                            {doc.extractedData?.pay_period && ` - Période: ${doc.extractedData.pay_period}`}
                          </h4>
                          <button
                            onClick={() => {
                              const newDocs = (documents[currentStep.id] as DocumentAnalysisResult[]).filter((_, i) => i !== index);
                              setDocuments(prev => ({
                                ...prev,
                                [currentStep.id]: newDocs
                              }));
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {doc.extractedData && (
                          <div className="mt-2 text-sm">
                            {/* Affichage des informations selon le type de document */}
                            {currentStep.id === 'payslip' && (
                              <>
                                {doc.extractedData.employee_name && (
                              <p className="text-gray-600">
                                Salarié : {doc.extractedData.employee_name}
                              </p>
                                )}
                                {doc.extractedData.company_name && (
                              <p className="text-gray-600">
                                Entreprise : {doc.extractedData.company_name}
                              </p>
                                )}
                                {doc.extractedData.net_salary && (
                              <p className="text-gray-600">
                                Salaire net : {doc.extractedData.net_salary.toLocaleString('fr-FR')} €
                              </p>
                                )}
                                {doc.extractedData.pay_period && (
                              <p className={`text-gray-600 ${!isValidPayslipPeriod(doc.extractedData.pay_period) ? 'text-red-600 font-medium' : ''}`}>
                                Période : {doc.extractedData.pay_period}
                                {!isValidPayslipPeriod(doc.extractedData.pay_period) && ' (hors période valide)'}
                              </p>
                                )}
                              </>
                            )}
                            {currentStep.id === 'identity' && (
                              <>
                                {doc.extractedData.surname && doc.extractedData.given_names && (
                                  <p className="text-gray-600">
                                    Nom complet : {doc.extractedData.surname} {doc.extractedData.given_names}
                                  </p>
                                )}
                                {doc.extractedData.nationality && (
                                  <p className="text-gray-600">
                                    Nationalité : {doc.extractedData.nationality}
                                  </p>
                                )}
                                {doc.extractedData.date_of_birth && (
                                  <p className="text-gray-600">
                                    Date de naissance : {doc.extractedData.date_of_birth}
                                  </p>
                                )}
                                {doc.extractedData.document_number && (
                                  <p className="text-gray-600">
                                    N° de document : {doc.extractedData.document_number}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        
                        {!doc.isValid && doc.potentialIssues.length > 0 && (
                          <div className="mt-2 text-sm text-red-700">
                            <p className="font-medium">Problèmes détectés :</p>
                            <ul className="list-disc pl-5 mt-1">
                              {doc.potentialIssues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Affichage des périodes attendues pour les bulletins de salaire */}
                {currentStep.id === 'payslip' && 
                 (documents[currentStep.id] as DocumentAnalysisResult[]).length > 0 && 
                 (documents[currentStep.id] as DocumentAnalysisResult[]).length < (currentStep.requiredCount || 1) && 
                 !isStepComplete(currentStep.id) && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex">
                      <Calendar className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800">Périodes attendues</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Nous attendons vos bulletins de salaire des 3 derniers mois : {expectedMonths.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Formulaire d'upload initial pour les documents multiples
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Télécharger vos bulletins de salaire ({currentStep.requiredCount} requis)
                  </label>
                  <span className="text-sm text-gray-500">0/{currentStep.requiredCount}</span>
                </div>
                
                {isUploading ? (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div 
                        className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      {uploadProgress < 60 ? 'Téléchargement en cours...' : 
                       uploadProgress < 90 ? 'Analyse du document...' : 
                       'Finalisation...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <label className="flex-1">
                      <div className="relative flex items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept={currentStep.acceptedFormats}
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          multiple
                        />
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Cliquez pour sélectionner des fichiers ou glissez-déposez
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Formats acceptés : {currentStep.acceptedFormats}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="flex">
                    <Info className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-amber-800">Information importante</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Vous devez télécharger vos 3 derniers bulletins de salaire consécutifs. 
                        Vous pouvez les sélectionner tous en même temps.
                      </p>
                      <p className="text-sm text-amber-700 mt-2">
                        Périodes attendues : {expectedMonths.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Affichage pour un document unique
            documents[currentStep.id] ? (
              <div className={`p-4 rounded-lg ${
                (documents[currentStep.id] as DocumentAnalysisResult).isValid
                  ? 'bg-green-50 border border-green-100'
                  : 'bg-red-50 border border-red-100'
              }`}>
                <div className="flex items-start">
                  <div className={`mt-1 mr-3 ${
                    (documents[currentStep.id] as DocumentAnalysisResult).isValid ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {(documents[currentStep.id] as DocumentAnalysisResult).isValid ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {(documents[currentStep.id] as DocumentAnalysisResult).isValid ? 'Document validé' : 'Document non valide'}
                    </h4>
                    
                    {(documents[currentStep.id] as DocumentAnalysisResult).extractedData && (
                      <div className="mt-2 text-sm">
                        {/* Render extracted data based on document type */}
                        {currentStep.id === 'identity' && (documents[currentStep.id] as DocumentAnalysisResult).extractedData && (
                          <>
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.surname && (
                              <p className="text-gray-600">
                                Nom : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.surname}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.given_names && (
                              <p className="text-gray-600">
                                Prénom : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.given_names}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.nationality && (
                              <p className="text-gray-600">
                                Nationalité : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.nationality}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.date_of_birth && (
                              <p className="text-gray-600">
                                Date de naissance : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.date_of_birth}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.document_number && (
                              <p className="text-gray-600">
                                N° de document : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.document_number}
                              </p>
                            )}
                          </>
                        )}
                        {currentStep.id === 'employment_contract' && (
                          <>
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.employee_name && (
                              <p className="text-gray-600">
                                Salarié : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.employee_name}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.company_name && (
                              <p className="text-gray-600">
                                Entreprise : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.company_name}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.net_salary && (
                              <p className="text-gray-600">
                                Salaire net : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.net_salary.toLocaleString('fr-FR')} €
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.contract_type && (
                              <p className="text-gray-600">
                                Type de contrat : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.contract_type}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.pay_period && (
                              <p className="text-gray-600">
                                Période : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.pay_period}
                              </p>
                            )}
                          </>
                        )}
                        {currentStep.id === 'proof_of_address' && (
                          <>
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.bill_type && (
                              <p className="text-gray-600">
                                Type de document : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.bill_type}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.provider_name && (
                              <p className="text-gray-600">
                                Fournisseur : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.provider_name}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.address && (
                              <p className="text-gray-600">
                                Adresse : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.address}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.date && (
                              <p className="text-gray-600">
                                Date : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.date}
                              </p>
                            )}
                            {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.amount && (
                              <p className="text-gray-600">
                                Montant : {(documents[currentStep.id] as DocumentAnalysisResult).extractedData.amount.toLocaleString('fr-FR')} €
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {!(documents[currentStep.id] as DocumentAnalysisResult).isValid && 
                      (documents[currentStep.id] as DocumentAnalysisResult).potentialIssues.length > 0 && (
                      <div className="mt-2 text-sm text-red-700">
                        <p className="font-medium">Problèmes détectés :</p>
                        <ul className="list-disc pl-5 mt-1">
                          {(documents[currentStep.id] as DocumentAnalysisResult).potentialIssues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Toujours afficher l'interface d'upload, même si le document est valide */}
                    {!(documents[currentStep.id] as DocumentAnalysisResult).isValid && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Télécharger un nouveau document
                        </label>
                        <div className="flex items-center">
                          <label className="flex-1">
                            <div className="relative flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer">
                              <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept={currentStep.acceptedFormats}
                                onChange={handleFileUpload}
                                disabled={isUploading}
                              />
                              <div className="text-center">
                                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-1 text-sm text-gray-500">
                                  Cliquez pour sélectionner un fichier
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Formats acceptés : {currentStep.acceptedFormats}
                                </p>
                              </div>
                            </div>
                          </label>
                        </div>
                        
                        {isUploading && (
                          <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                              <div 
                                className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                              {uploadProgress < 60 ? 'Téléchargement en cours...' : 
                               uploadProgress < 90 ? 'Analyse du document...' : 
                               'Finalisation...'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Télécharger votre {currentStep.title.toLowerCase()}
                </label>
                
                {isUploading ? (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div 
                        className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      {uploadProgress < 60 ? 'Téléchargement en cours...' : 
                       uploadProgress < 90 ? 'Analyse du document...' : 
                       'Finalisation...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <label className="flex-1">
                      <div className="relative flex items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept={currentStep.acceptedFormats}
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Cliquez pour sélectionner un fichier ou glissez-déposez
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Formats acceptés : {currentStep.acceptedFormats}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentStepIndex === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Précédent
          </button>
          
          {currentStepIndex === documentSteps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                // Convertir les tableaux de documents en documents individuels pour la compatibilité
                const flattenedDocuments: Record<string, DocumentAnalysisResult> = {};
                
                Object.entries(documents).forEach(([key, value]) => {
                  if (Array.isArray(value)) {
                    // Pour les étapes avec plusieurs documents, on utilise un suffixe numérique
                    value.forEach((doc, index) => {
                      flattenedDocuments[`${key}_${index + 1}`] = doc;
                    });
                  } else {
                    flattenedDocuments[key] = value;
                  }
                });
                
                onComplete(flattenedDocuments);
              }}
              disabled={!areAllDocumentsValid()}
              className={`px-6 py-2 text-sm font-medium rounded-md flex items-center ${
                areAllDocumentsValid()
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Finaliser mon dossier
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={!canProceed}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                canProceed
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
      
      {/* Summary of all steps */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Récapitulatif des documents</h3>
        </div>
        
        <div className="p-4">
          <ul className="divide-y divide-gray-200">
            {documentSteps.map((step) => (
              <li key={step.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    isStepComplete(step.id)
                      ? 'bg-green-100 text-green-600'
                      : currentStepIndex >= documentSteps.findIndex(s => s.id === step.id)
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isStepComplete(step.id) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-gray-900 font-medium">{step.title}</span>
                </div>
                <div>
                  {isStepComplete(step.id) ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Validé
                    </span>
                  ) : currentStepIndex === documentSteps.findIndex(s => s.id === step.id) ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      En cours
                    </span>
                  ) : currentStepIndex > documentSteps.findIndex(s => s.id === step.id) ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      À corriger
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      À venir
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {Object.keys(documents).filter(key => isStepComplete(key)).length} sur {documentSteps.length} étapes validées
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { GuidedDocumentUpload };