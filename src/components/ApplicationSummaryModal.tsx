import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, FileText, Mail, Phone, MessageSquare, Lock, Eye, EyeOff, UserPlus, UserX, MapPin } from 'lucide-react';
import { DocumentAnalysisResult } from '../lib/documentAnalysis';
import { validateDocumentSet } from '../lib/documentValidation';
import { supabase } from '../lib/supabase';
import { sendApplicationEmail } from '../lib/email';
import { useNavigate } from 'react-router-dom';

interface ApplicationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Record<string, DocumentAnalysisResult>;
  property: {
    id: string;
    title: string;
    type: 'sale' | 'rent';
    price: number;
    location: string;
  };
}

interface PayslipDocument extends DocumentAnalysisResult {
  period: string;
}

function ApplicationSummaryModal({ isOpen, onClose, documents, property }: ApplicationSummaryModalProps) {
  const [step, setStep] = useState<'summary' | 'account'>('summary');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withoutAccount, setWithoutAccount] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const navigate = useNavigate();

  // Ne garder que les bulletins de salaire validés
  const payslips = Object.entries(documents)
    .filter(([key, doc]) => key.startsWith('payslip_'))
    .filter(([_, doc]) => doc.isValid)
    .map(([_, doc]) => ({
      ...doc,
      period: doc.extractedData?.pay_period || ''
    }))
    .sort((a, b) => b.period.localeCompare(a.period));

  // Extract name from identity document if available
  const identityDoc = documents['identity'];
  const firstName = identityDoc?.extractedData?.given_names || '';
  const lastName = identityDoc?.extractedData?.surname || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // Basic validation
    if (!email.trim() || !phone.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      setLoading(false);
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      setLoading(false);
      return;
    }
    
    // Phone validation
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    if (!phoneRegex.test(phone)) {
      setError('Veuillez entrer un numéro de téléphone valide');
      setLoading(false);
      return;
    }

    try {
      let userId = null;
      
      // Create user account if requested
      if (!withoutAccount) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone
            }
          }
        });

        if (authError) throw authError;
        userId = authData.user?.id;
      }

      // Get property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('title, price, location')
        .eq('id', property.id)
        .single();

      if (propertyError) throw propertyError;

      // Prepare document status
      const validatedDocuments = Object.entries(documents)
        .filter(([_, doc]) => doc.isValid)
        .reduce((acc, [type, doc]) => ({
          ...acc,
          [type]: {
            status: 'verified',
            verifiedAt: new Date().toISOString(),
            confidence: doc.confidence || 1,
            extractedData: doc.extractedData || {},
            fileUrl: doc.fileUrl || null
          }
        }), {});

      // Create application
      const { error: applicationError } = await supabase
        .from('applications')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          property_id: property.id,
          user_id: userId,
          email,
          phone,
          message,
          status: 'pending',
          document_status: validatedDocuments
        }]);

      if (applicationError) throw applicationError;

      // Get the application ID from the insert response
      const { data: newApplication } = await supabase
        .from('applications')
        .select('*')
        .eq('property_id', property.id)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!newApplication?.id) {
        throw new Error('Failed to get application ID');
      }

      // Send confirmation email
      await sendApplicationEmail(
        newApplication.id,
        'application_submitted',
        {
          property_title: propertyData.title,
          property_price: propertyData.price.toLocaleString('fr-FR'),
          property_location: propertyData.location
        }
      );

      // Close modal and redirect
      setSubmissionSuccess(true);
      
      setTimeout(() => {
        onClose();
        navigate(`/property/${property.id}?application=success`);
      }, 3000);

    } catch (err) {
      console.error('Error submitting application:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      {submissionSuccess && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto text-center transform animate-[scale_0.5s_ease-in-out]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Dossier envoyé avec succès !</h3>
            <p className="text-gray-600 mb-6">
              Votre dossier a été transmis à l'agent immobilier. Vous serez recontacté rapidement.
            </p>
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">
                Redirection dans quelques secondes...
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'summary' ? 'Résumé de votre dossier' : 'Créer votre compte'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {step === 'summary' && (
            <div className="mt-2 flex space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-1.5" />
                {Object.keys(documents).length} documents analysés
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 mr-1.5 text-green-500" />
                Dossier complet
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-5rem)]">
          {step === 'summary' ? (
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Property Info */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{property.title}</h3>
                    <p className="text-gray-600 mt-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1.5" />
                      {property.location}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {property.price.toLocaleString('fr-FR')} € {property.type === 'rent' ? '/mois' : ''}
                  </div>
                </div>
              </div>

              {/* Documents Summary */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-rose-500" />
                  Documents fournis
                </h3>
                <div className="space-y-4">
                  {/* Bulletins de salaire */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Bulletins de salaire</h4>
                    <div className="space-y-4">
                      {payslips.map((doc, index) => doc.isValid && (
                        <div
                          key={index}
                          className="bg-white/50 backdrop-blur-sm rounded-lg border border-emerald-200 p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              Période : {doc.period}
                            </span>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p>Salarié : {doc.extractedData.employee_name}</p>
                            <p>Entreprise : {doc.extractedData.company_name}</p>
                            <p>Fonction : {doc.extractedData.job_title || 'Non renseigné'}</p>
                            <p>Statut : {doc.extractedData.employee_status || 'Non renseigné'}</p>
                            <p>Coefficient : {doc.extractedData.coefficient || 'Non renseigné'}</p>
                            <p>Date d'ancienneté : {doc.extractedData.seniority_date || 'Non renseigné'}</p>
                            <p>Salaire net : {doc.extractedData.net_salary?.toLocaleString('fr-FR')} €</p>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center mt-2 text-emerald-600 hover:text-emerald-700"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Voir le document
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {[
                    { type: 'identity', title: 'Pièce d\'identité' },
                    { type: 'employment_contract', title: 'Justificatif de situation professionnelle' },
                    { type: 'tax_notice', title: 'Avis d\'imposition' },
                    { type: 'proof_of_address', title: 'Justificatif de domicile' }
                  ].map(({ type, title }) => documents[type]?.isValid && !type.startsWith('payslip_') && (
                    <div
                      key={type}
                      className="p-4 rounded-lg bg-green-50 border border-green-100"
                    >
                      <div className="flex items-start">
                        <div className="mt-1 mr-3 text-green-500">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{title}</h4>
                          {documents[type].fileUrl && (
                            <a
                              href={documents[type].fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 mt-2 mb-2"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Voir le document
                            </a>
                          )}
                          {documents[type].extractedData && (
                            <div className="mt-2 text-sm">
                              {type === 'identity' && (
                                <div className="space-y-1">
                                  <p className="text-gray-600">
                                    Nom complet : {documents[type].extractedData.surname} {documents[type].extractedData.given_names}
                                  </p>
                                  <p className="text-gray-600">
                                    Nationalité : {documents[type].extractedData.nationality}
                                  </p>
                                  {documents[type].extractedData.date_of_birth && (
                                    <p className="text-gray-600">
                                      Date de naissance : {documents[type].extractedData.date_of_birth}
                                    </p>
                                  )}
                                  {documents[type].extractedData.document_number && (
                                    <p className="text-gray-600">
                                      N° de document : {documents[type].extractedData.document_number}
                                    </p>
                                  )}
                                </div>
                              )}
                              {type === 'employment_contract' && (
                                <div className="space-y-1">
                                  <p className="text-gray-600">
                                    Salarié : {documents[type].extractedData.employee_name}
                                  </p>
                                  <p className="text-gray-600">
                                    Entreprise : {documents[type].extractedData.company_name}
                                  </p>
                                  <p className="text-gray-600">
                                    Salaire net : {documents[type].extractedData.net_salary?.toLocaleString('fr-FR')} €
                                  </p>
                                  <p className="text-gray-600">
                                    Type de contrat : {documents[type].extractedData.contract_type}
                                  </p>
                                  <p className="text-gray-600">
                                    Période : {documents[type].extractedData.pay_period}
                                  </p>
                                </div>
                              )}
                              {type === 'proof_of_address' && (
                                <div className="space-y-1">
                                  <p className="text-gray-600">
                                    Type de document : {documents[type].extractedData.bill_type}
                                  </p>
                                  <p className="text-gray-600">
                                    Fournisseur : {documents[type].extractedData.provider_name}
                                  </p>
                                  <p className="text-gray-600">
                                    Date : {documents[type].extractedData.date}
                                  </p>
                                  <p className="text-gray-600">
                                    Montant : {documents[type].extractedData.amount?.toLocaleString('fr-FR')} €
                                  </p>
                                  <p className="text-gray-600">
                                    Adresse : {documents[type].extractedData.address}
                                  </p>
                                </div>
                              )}
                              {type === 'tax_notice' && (
                                <div className="space-y-1">
                                  <p className="text-gray-600">
                                    Revenu fiscal de référence : {documents[type].extractedData.reference_income?.toLocaleString('fr-FR')} €
                                  </p>
                                  <p className="text-gray-600">
                                    Année d'imposition : {documents[type].extractedData.tax_year}
                                  </p>
                                  <p className="text-gray-600">
                                    Nombre de parts : {documents[type].extractedData.number_of_parts}
                                  </p>
                                  <p className="text-gray-600">
                                    Adresse fiscale : {documents[type].extractedData.tax_address}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-6 -mx-8 mt-8">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setWithoutAccount(false);
                      setStep('account');
                    }}
                    className="px-8 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-md hover:shadow-lg hover:scale-[1.02] ring-1 ring-rose-400/50"
                  >
                    <span className="flex items-center">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Créer un compte
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setWithoutAccount(true);
                      setStep('account');
                    }}
                    className="px-8 py-3 rounded-xl font-medium transition-all duration-300 bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
                  >
                    <span className="flex items-center">
                      <UserX className="w-5 h-5 mr-2" />
                      Continuer sans compte
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {withoutAccount && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                    <h4 className="font-medium text-blue-800 mb-2">Information importante</h4>
                    <p className="text-sm text-blue-700">
                      Pour traiter votre dossier, nous avons besoin de pouvoir vous contacter. 
                      Ces informations resteront confidentielles et ne seront utilisées que dans le cadre de votre candidature.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                        placeholder="votre@email.com"
                      />
                      <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {!withoutAccount && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Minimum 8 caractères
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                        placeholder="06 12 34 56 78"
                      />
                      <Phone className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message (optionnel)
                    </label>
                    <div className="relative">
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                        placeholder="Ajoutez un message à votre candidature..."
                      />
                      <MessageSquare className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => setStep('summary')}
                    className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? 'Envoi en cours...' : (withoutAccount ? 'Envoyer mon dossier' : 'Créer mon compte')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ApplicationSummaryModal };