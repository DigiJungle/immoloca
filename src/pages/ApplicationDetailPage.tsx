import React, { useState, useEffect } from 'react';
import { ApplicationForm, Property } from '../types';
import { ArrowLeft, User, Phone, Mail, FileText, Calendar, CheckCircle, Clock, XCircle, ThumbsUp, ThumbsDown, Briefcase, Euro, Building2, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendDocumentRejectionEmail } from '../lib/email';

interface ApplicationDetailPageProps {
  application: ApplicationForm;
  property: Property;
  onClose: () => void;
  isOpen: boolean;
}

const requiredDocuments = [
  {
    id: 'identity',
    title: 'Pièce d\'identité'
  },
  {
    id: 'payslip',
    title: 'Justificatifs de revenus',
    multipleFiles: true,
    requiredCount: 3
  },
  {
    id: 'employment_contract',
    title: 'Justificatif professionnel'
  },
  {
    id: 'proof_of_address',
    title: 'Justificatif de domicile'
  },
];

function ApplicationDetailPage({ application, property, onClose, isOpen }: ApplicationDetailPageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');
  const [error, setError] = useState<string | null>(null);

  // Add effect to control body scroll
  useEffect(() => {
    if (isOpen) {
      // Get scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Add padding to compensate for scrollbar removal
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getStatusColor = (status: ApplicationForm['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: ApplicationForm['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const handleApplicationAction = async (action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      setError(null);

      if (action === 'approve') {
        const { error: approveError } = await supabase.rpc('approve_application', {
          application_id: application.id
        });

        if (approveError) throw approveError;
      } else {
        const { error: rejectError } = await supabase.rpc('reject_application', {
          application_id: application.id
        });

        if (rejectError) throw rejectError;
      }

      onClose();
    } catch (err) {
      console.error('Error updating application:', err);
      setError('Une erreur est survenue lors de la mise à jour de la candidature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] overflow-hidden ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ease-in-out ${
          isOpen ? 'animate-[fadeInOverlay_0.3s_ease-in-out]' : 'animate-[fadeOutOverlay_0.3s_ease-in-out]'
        }`} 
      />
      <div 
        className={`absolute inset-y-0 right-0 w-full lg:w-3/4 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[101] flex flex-col ${
          isOpen ? 'translate-x-0 animate-[slideInRight_0.3s_cubic-bezier(0.16, 1, 0.3, 1)]' : 'translate-x-full animate-[slideOutRight_0.3s_cubic-bezier(0.7, 0, 0.84, 0)]'
        } h-full`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-white flex flex-col gap-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-900 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
              Retour aux candidatures
            </button>
            <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center ${
              application.status === 'pending'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : application.status === 'approved'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {getStatusIcon(application.status)}
              <span className="ml-2">
                {application.status === 'pending' && 'À traiter'}
                {application.status === 'approved' && 'Validée'}
                {application.status === 'rejected' && 'Refusée'}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {application.firstName} {application.lastName}
                </h1>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Candidature déposée le {application.createdAt.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row relative overflow-x-auto">
          {/* Mobile Tabs */}
          <div className="lg:hidden px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'info'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md transform translate-y-[-1px]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Informations
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'documents'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md transform translate-y-[-1px]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Documents
              </button>
            </div>
          </div>

          {/* Left Column - Information */}
          <div className={`p-6 lg:w-2/3 ${
            activeTab === 'info' ? 'block' : 'hidden lg:block'
          }`}>
            <div className="space-y-8">
              {/* Salary Analysis */}
              {(() => {
                const payslips = Object.entries(application.document_status || {})
                  .filter(([key]) => key.startsWith('payslip_'))
                  .map(([_, doc]) => doc.extractedData?.net_salary || 0);
                
                if (payslips.length > 0) {
                  const averageSalary = payslips.reduce((a, b) => a + b, 0) / payslips.length;
                  const salaryRatio = averageSalary / property.price;
                  const remainingMoney = averageSalary - property.price;
                  
                  return (
                    <section className="p-6 rounded-xl bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {application.document_status?.employment_contract?.extractedData?.contract_type || 'CDI'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Ratio salaire/loyer
                        </div>
                      </div>
                      
                      <div className="text-2xl font-semibold text-gray-900 mb-6">
                        Le candidat gagne {Math.round(salaryRatio * 100) / 100}x le loyer requis de {property.price.toLocaleString('fr-FR')} €
                      </div>
                      
                      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            salaryRatio >= 3.5 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                            salaryRatio >= 3.1 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                            salaryRatio >= 3.0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            salaryRatio >= 2.5 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                            'bg-gradient-to-r from-rose-400 to-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, (salaryRatio / 4) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs font-medium">
                        <span className="text-rose-500">2x</span>
                        <span className="text-orange-500">2.5x</span>
                        <span className="text-yellow-500">3x</span>
                        <span className="text-green-500">3.5x</span>
                        <span className="text-emerald-500">4x</span>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between p-4 bg-white/80 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Euro className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-600">Reste à vivre</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {remainingMoney.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </section>
                  );
                }
                return null;
              })()}

              {/* Personal Information */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Informations personnelles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: <User className="w-5 h-5 text-gray-400" />,
                      label: "Nom complet",
                      value: `${application.firstName} ${application.lastName}`
                    },
                    {
                      icon: <Mail className="w-5 h-5 text-gray-400" />,
                      label: "Email",
                      value: application.email
                    },
                    {
                      icon: <Phone className="w-5 h-5 text-gray-400" />,
                      label: "Téléphone",
                      value: application.phone
                    },
                    {
                      icon: <Calendar className="w-5 h-5 text-gray-400" />,
                      label: "Date de candidature",
                      value: application.createdAt.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start bg-gray-50 rounded-lg p-4">
                      <div className="mt-1 mr-3">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.value}</div>
                        <div className="text-sm text-gray-500">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Professional Information */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Situation professionnelle</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: <Briefcase className="w-5 h-5 text-gray-400" />,
                      label: "Fonction",
                      value: application.document_status?.payslip_1?.extractedData?.job_title || 'Non renseigné'
                    },
                    {
                      icon: <Users className="w-5 h-5 text-gray-400" />,
                      label: "Statut",
                      value: application.document_status?.payslip_1?.extractedData?.employee_status || 'Non renseigné'
                    },
                    {
                      icon: <Building2 className="w-5 h-5 text-gray-400" />,
                      label: "Employeur",
                      value: application.document_status?.payslip_1?.extractedData?.company_name || 'Non renseigné'
                    },
                    {
                      icon: <FileText className="w-5 h-5 text-gray-400" />,
                      label: "Coefficient",
                      value: application.document_status?.payslip_1?.extractedData?.coefficient || 'Non renseigné'
                    },
                    {
                      icon: <Calendar className="w-5 h-5 text-gray-400" />,
                      label: "Date d'ancienneté",
                      value: application.document_status?.payslip_1?.extractedData?.seniority_date || 'Non renseigné'
                    },
                    {
                      icon: <Euro className="w-5 h-5 text-gray-400" />,
                      label: "Salaire mensuel net",
                      value: (() => {
                        const payslips = Object.entries(application.document_status || {})
                          .filter(([key]) => key.startsWith('payslip_'))
                          .map(([_, doc]) => doc.extractedData?.net_salary || 0);
                        
                        if (payslips.length > 0) {
                          const average = payslips.reduce((a, b) => a + b, 0) / payslips.length;
                          return `${average.toLocaleString('fr-FR')} €`;
                        }
                        return 'Non renseigné';
                      })()
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start bg-gray-50 rounded-lg p-4">
                      <div className="mt-1 mr-3">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.value}</div>
                        <div className="text-sm text-gray-500">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Guarantor Information */}
              {application.guarantorRequired && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">Information du garant</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <Users className="w-5 h-5 text-gray-400 mt-1 mr-3" />
                      <div>
                        <div className="font-medium">
                          {application.guarantorInfo?.firstName} {application.guarantorInfo?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">Nom complet</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 text-gray-400 mt-1 mr-3" />
                      <div>
                        <div className="font-medium">{application.guarantorInfo?.email}</div>
                        <div className="text-sm text-gray-500">Email</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Phone className="w-5 h-5 text-gray-400 mt-1 mr-3" />
                      <div>
                        <div className="font-medium">{application.guarantorInfo?.phone}</div>
                        <div className="text-sm text-gray-500">Téléphone</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Euro className="w-5 h-5 text-gray-400 mt-1 mr-3" />
                      <div>
                        <div className="font-medium">
                          {application.guarantorInfo?.salary?.toLocaleString('fr-FR')} €
                        </div>
                        <div className="text-sm text-gray-500">Salaire mensuel net</div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Message du candidat */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Message du candidat</h2>
                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{application.message || 'Aucun message'}</p>
                </div>
                
                {/* Actions */}
                {application.status === 'pending' && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Actions disponibles</h2>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleApplicationAction('reject')}
                        disabled={loading}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-all duration-300 hover:border-gray-400 hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className="flex items-center justify-center">
                          <ThumbsDown className="w-5 h-5 mr-2" />
                          {loading ? 'Traitement...' : 'Refuser la candidature'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleApplicationAction('approve')}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] hover:ring-2 hover:ring-indigo-500/50"
                      >
                        <span className="flex items-center justify-center">
                          <ThumbsUp className="w-5 h-5 mr-2" />
                          {loading ? 'Traitement...' : 'Valider la candidature'}
                        </span>
                      </button>
                    </div>
                    {error && (
                      <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Application Score */}
              {application.score && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">Score de la candidature</h2>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Score global</span>
                      <span className={`text-2xl font-bold ${
                        application.score >= 80 ? 'text-green-600' :
                        application.score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {application.score}/100
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Right Column - Documents */}
          <div className={`lg:p-6 lg:w-1/3 ${
            activeTab === 'documents' ? 'block' : 'hidden lg:block'
          }`}>
            <div className="p-4 lg:p-0 space-y-6">
              <h2 className="text-lg font-semibold mb-4 lg:mb-6">Documents fournis</h2>
              <div className="space-y-4">
                {requiredDocuments.map((doc) => {
                  // Récupérer les documents validés pour ce type
                  const docFiles = Object.entries(application.documentStatus || {})
                    .filter(([key]) => {
                      // Mapper les types de documents aux IDs
                      const mappings = {
                        'payslip': (key: string) => key.startsWith('payslip_'),
                        'employment_contract': (key: string) => key === 'employment_contract',
                        'proof_of_address': (key: string) => key === 'proof_of_address',
                        'identity': (key: string) => key === 'identity'
                      };
                      
                      // Vérifier si le document correspond au type actuel
                      return mappings[doc.id]?.(key) || false;
                    })
                    .map(([key, docStatus]) => ({
                      key,
                      ...docStatus
                    }));

                  return (
                    <div
                      key={doc.id}
                      className="rounded-2xl bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900 text-lg flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                            {doc.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                          {docFiles.length === 0 && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                              Non fourni
                            </span>
                          )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {docFiles.map((docStatus) => (
                            <div 
                              key={docStatus.key} 
                              className={`rounded-lg p-4 transition-all duration-300 transform ${
                                docStatus.status === 'verified'
                                  ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border border-emerald-100/50 shadow-sm'
                                  : 'bg-white/80 border border-gray-100/50 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  {docStatus.status === 'verified' ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                  ) : docStatus.status === 'rejected' ? (
                                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                                  ) : (
                                    <Clock className="w-5 h-5 text-amber-500 mr-2" />
                                  )}
                                  <span className="font-medium text-gray-900">
                                    {docStatus.key.startsWith('payslip_') ? 
                                      `Bulletin de salaire - ${docStatus.extractedData?.pay_period || 'Période non spécifiée'}` :
                                      'Document fourni'
                                    }
                                  </span>
                                </div>
                                <a
                                  href={docStatus.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white hover:bg-gray-50 rounded-lg transition-all duration-300 transform hover:scale-[1.02] text-indigo-600 hover:text-indigo-700 font-medium shadow-sm hover:shadow-md"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1.5" />
                                  Voir
                                </a>
                              </div>
                              {docStatus.status === 'rejected' && docStatus.comment && (
                                <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                  Motif du refus : {docStatus.comment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ApplicationDetailPage };