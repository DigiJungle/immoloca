import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { ArrowLeft, Building2, Euro, Maximize2, BedDouble, MapPin, Users, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, UserPlus, UserX, Calendar, Check, Home, Key, Zap, Mail, Phone, Briefcase, BarChart3, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ApplicationDetailPage } from './ApplicationDetailPage';
import { trackPropertyView } from '../lib/analytics';
import { GroupVisitModal } from '../components/GroupVisitModal';

export function AdminPropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewsCount, setViewsCount] = useState<number>(0);
  const [viewsLoading, setViewsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [visits, setVisits] = useState<GroupVisit[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const [showGroupVisitModal, setShowGroupVisitModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProperty();
      fetchVisits();
      // Scroll to top when page loads
      window.scrollTo(0, 0);
    }
  }, [id]);

  const fetchVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('group_visits')
        .select(`
          *,
          applications:group_visit_applications(
            application:applications(*)
          )
        `)
        .eq('property_id', id);

      if (error) throw error;

      setVisits(data.map(visit => ({
        ...visit,
        date: new Date(visit.date),
        created_at: new Date(visit.created_at),
        applications: visit.applications.map((a: any) => a.application)
      })));
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
  };

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProperty({
        ...data,
        createdAt: new Date(data.created_at),
        availableFrom: data.available_from ? new Date(data.available_from) : undefined
      });

      // After getting property, fetch applications and views
      fetchApplications(data.id);
      fetchViewsCount(data.id);
    } catch (error) {
      console.error('Error fetching property:', error);
      navigate('/admin');
    }
  };

  useEffect(() => {
    const applicationId = searchParams.get('application');
    if (applicationId && applications.length > 0) {
      const application = applications.find(a => a.id === applicationId);
      if (application) {
        setSelectedApplication(application);
      }
    }
  }, [searchParams, applications]);

  const filteredApplications = applications.filter(application => 
    application.status === statusFilter
  );

  const fetchViewsCount = async (propertyId: string) => {
    try {
      const { count } = await supabase
        .from('property_views')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      setViewsCount(count || 0);
    } catch (error) {
      console.error('Error fetching views count:', error);
    } finally {
      setViewsLoading(false);
    }
  };

  const fetchApplications = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) {
        setApplications([]);
        return;
      }

      setApplications(data.map(app => ({
        ...app,
        createdAt: new Date(app.created_at),
        firstName: app.first_name,
        lastName: app.last_name,
        employmentType: app.employment_type,
        employerName: app.employer_name,
        employmentStartDate: app.employment_start_date,
        guarantorRequired: app.guarantor_required,
        guarantorInfo: app.guarantor_info,
        documentStatus: app.document_status || {}
      })));
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleGroupVisit = async (date: Date, duration: number) => {
    try {
      // Create group visit
      const { data: groupVisit, error: groupVisitError } = await supabase
        .from('group_visits')
        .insert({
          property_id: property.id,
          date: date,
          duration: duration,
          max_visitors: selectedApplications.length
        })
        .select()
        .single();

      if (groupVisitError) throw groupVisitError;

      // Link applications to group visit
      const { error: applicationsError } = await supabase
        .from('group_visit_applications')
        .insert(
          selectedApplications.map(applicationId => ({
            group_visit_id: groupVisit.id,
            application_id: applicationId
          }))
        );

      if (applicationsError) throw applicationsError;

      // Clear selection and refresh
      setSelectedApplications([]);
      fetchApplications(property.id);
    } catch (error) {
      console.error('Error scheduling group visit:', error);
      throw error;
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 group mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          Retour à la liste
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:flex lg:flex-row">
          {/* Property Info */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1 lg:w-1/3">
            {/* Main Info Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden top-28">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
                </div>
                <div className="flex items-center text-gray-500 mt-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.location}
                  <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                    property.type === 'sale'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {property.type === 'sale' ? 'À Vendre' : 'À Louer'}
                  </div>
                </div>
              </div>
              <div className="aspect-video relative">
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <div className="text-2xl font-bold">{property.price.toLocaleString('fr-FR')} €</div>
                      <div className="text-sm opacity-90">{property.type === 'sale' ? 'Prix de vente' : 'Loyer mensuel'}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">{viewsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Surface
                    </div>
                    <div className="text-lg font-semibold">{property.surface} m²</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 mb-1">
                      <BedDouble className="w-4 h-4 mr-2" />
                      Pièces
                    </div>
                    <div className="text-lg font-semibold">{property.rooms}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Home className="w-4 h-4 mr-2" />
                      Type
                    </div>
                    <div className="text-lg font-semibold capitalize">{property.property_type}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 mb-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      Disponible
                    </div>
                    <div className="text-lg font-semibold">
                      {property.available_from ? new Date(property.available_from).toLocaleDateString('fr-FR') : 'Immédiat'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Energy Performance */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-blue-600" />
                Performance énergétique
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Classe énergie</span>
                    <div className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                      property.energy_class === 'A' ? 'bg-green-100 text-green-800' :
                      property.energy_class === 'B' ? 'bg-green-100 text-green-800' :
                      property.energy_class === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      property.energy_class === 'D' ? 'bg-yellow-100 text-yellow-800' :
                      property.energy_class === 'E' ? 'bg-orange-100 text-orange-800' :
                      property.energy_class === 'F' ? 'bg-red-100 text-red-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <Zap className="w-4 h-4" />
                      <span>
                      Classe {property.energy_class}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Émissions GES</span>
                    <div className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                      property.gas_emission_class === 'A' ? 'bg-green-100 text-green-800' :
                      property.gas_emission_class === 'B' ? 'bg-green-100 text-green-800' :
                      property.gas_emission_class === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      property.gas_emission_class === 'D' ? 'bg-yellow-100 text-yellow-800' :
                      property.gas_emission_class === 'E' ? 'bg-orange-100 text-orange-800' :
                      property.gas_emission_class === 'F' ? 'bg-red-100 text-red-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <Zap className="w-4 h-4" />
                      <span>
                      Classe {property.gas_emission_class}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Key className="w-5 h-5 mr-2 text-blue-600" />
                Détails supplémentaires
              </h3>
              <div className="space-y-4">
                {property.type === 'rent' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Charges</span>
                      <span className="font-medium">{property.charges?.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Dépôt de garantie</span>
                      <span className="font-medium">{property.deposit_amount?.toLocaleString('fr-FR')} €</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Étage</span>
                  <span className="font-medium">{property.floor_number} / {property.total_floors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Chauffage</span>
                  <span className="font-medium capitalize">{property.heating}</span>
                </div>
                {property.orientation && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Orientation</span>
                    <span className="font-medium">
                      {property.orientation.map(o => 
                        o === 'north' ? 'Nord' :
                        o === 'south' ? 'Sud' :
                        o === 'east' ? 'Est' :
                        o === 'west' ? 'Ouest' : o
                      ).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Équipements</h3>
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="lg:col-span-2 order-1 lg:order-2 lg:flex-1 sticky top-24">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-xl font-semibold">Candidatures</h2>
                  <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 sm:pb-0">
                      <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          statusFilter === 'pending'
                            ? 'bg-amber-500 text-white shadow-lg transform'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        À traiter ({applications.filter(a => a.status === 'pending').length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          statusFilter === 'approved'
                            ? 'bg-emerald-500 text-white shadow-lg transform'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        Validées ({applications.filter(a => a.status === 'approved').length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('rejected')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          statusFilter === 'rejected'
                            ? 'bg-rose-500 text-white shadow-lg transform'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        }`}
                      >
                        Refusées ({applications.filter(a => a.status === 'rejected').length})
                      </button>
                  </div>
                  {statusFilter === 'approved' && selectedApplications.length > 0 && (
                    <button
                      onClick={() => {
                        setShowGroupVisitModal(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Calendar className="w-4 h-4" />
                      Planifier visite ({selectedApplications.length})
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Chargement des candidatures...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune candidature pour le moment</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <div
                      key={application.id}
                      className="p-6 hover:bg-gray-50/80 cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedApplication(application)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-400 mb-1">
                            Candidature déposée le {application.createdAt.toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {application.firstName} {application.lastName}
                            </h3>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              application.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : application.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {application.status === 'pending' && <Clock className="w-4 h-4" />}
                              {application.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                              {application.status === 'rejected' && <XCircle className="w-4 h-4" />}
                            </div>
                            {application.status === 'approved' && (
                              <div className="flex items-center gap-2">
                                {/* Fetch and display visit info */}
                                {(() => {
                                  const visit = visits.find(v => 
                                    v.applications.some(a => a.id === application.id)
                                  );
                                  
                                  if (visit) {
                                    return (
                                      <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Visite le {format(visit.date, 'dd/MM/yyyy à HH:mm')}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-y-4 gap-x-8">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              {application.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {application.phone}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 rounded-lg">
                              <Briefcase className="w-4 h-4 mr-2" />
                              {application.document_status?.employment_contract?.extractedData?.contract_type || 'Non renseigné'}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 rounded-lg">
                              <Euro className="w-4 h-4 mr-2" />
                              {(() => {
                                // Récupérer tous les bulletins de salaire
                                const payslips = Object.entries(application.document_status || {})
                                  .filter(([key]) => key.startsWith('payslip_'))
                                  .map(([_, doc]) => doc.extractedData?.net_salary || 0);
                                
                                // Calculer la moyenne si on a des bulletins
                                if (payslips.length > 0) {
                                  const average = payslips.reduce((a, b) => a + b, 0) / payslips.length;
                                  return `${average.toLocaleString('fr-FR')} €`;
                                }
                                
                                return 'Non renseigné';
                              })()}
                            </div>
                          </div>
                        </div>
                        {statusFilter === 'approved' && (
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              selectedApplications.includes(application.id)
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApplications(prev => 
                                prev.includes(application.id)
                                  ? prev.filter(id => id !== application.id)
                                  : [...prev, application.id]
                              );
                            }}
                          >
                            {selectedApplications.includes(application.id) && (
                              <Check className="w-4 h-4" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between text-sm gap-2">
                        <div className="flex items-center text-gray-500">
                          <FileText className="w-4 h-4 mr-1" />
                          {Object.keys(application.document_status || {}).length} document{Object.keys(application.document_status || {}).length !== 1 ? 's' : ''} fourni{Object.keys(application.document_status || {}).length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center justify-end">
                          {application.score && (
                            <div className={`flex items-center px-3 py-1 rounded-full ${
                              application.score >= 80 ? 'bg-green-100 text-green-800' :
                              application.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Score : {application.score}/100
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedApplication && (
        <ApplicationDetailPage
          application={selectedApplication}
          property={property}
          onClose={() => {
            setSelectedApplication(null);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('application');
            navigate(`/admin/property/${property.id}?${newSearchParams.toString()}`, { replace: true });
            fetchApplications(property.id);
          }}
          isOpen={true}
        />
      )}
      {showGroupVisitModal && (
        <GroupVisitModal
          isOpen={showGroupVisitModal}
          onClose={() => setShowGroupVisitModal(false)}
          selectedApplications={applications.filter(app => selectedApplications.includes(app.id))}
          onSchedule={handleScheduleGroupVisit}
        />
      )}
    </>
  );
}

export default AdminPropertyDetailPage;