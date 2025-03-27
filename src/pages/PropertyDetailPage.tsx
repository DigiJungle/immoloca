import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Property } from '../types';
import { slugify } from '../lib/slugify';
import { 
  Euro, 
  Maximize2, 
  BedDouble, 
  MapPin, 
  ArrowLeft, 
  Calendar, 
  Home, 
  Thermometer, 
  Zap, 
  Key, 
  FileText, 
  MessageSquare, 
  User, 
  Mail, 
  Phone, 
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Heart,
  Share2,
  CheckCircle,
  Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackPropertyView } from '../lib/analytics';
import { useAuth } from '../contexts/AuthContext';
import { DocumentAnalysisResult } from '../lib/documentAnalysis';
import { validateDocumentSet } from '../lib/documentValidation';
import { ApplicationSummaryModal } from '../components/ApplicationSummaryModal';
import { GuidedDocumentUpload } from '../components/GuidedDocumentUpload';
import { Loader } from '@googlemaps/js-api-loader';

export function PropertyDetailPage() {
  const { "*": param } = useParams<{ "*": string }>();
  const [slug] = param?.split('/').reverse() || [];
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [documents, setDocuments] = useState<Record<string, DocumentAnalysisResult>>({});
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [agentLogo, setAgentLogo] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (slug) {
      fetchProperty(slug);
      trackPropertyView(slug, user?.id);
            
      // Vérifier si on vient de soumettre une candidature
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('application') === 'success') {
        setShowApplicationSuccess(true);
        // Retirer le paramètre de l'URL après 5 secondes
        setTimeout(() => {
          navigate(`/property/${slug}`, { replace: true });
          setShowApplicationSuccess(false);
        }, 5000);
      }
    }
  }, [slug, user?.id, location]);

  useEffect(() => {
    if (property?.user_id) {
      fetchAgentLogo(property.user_id);
    }
  }, [property?.user_id]);

  useEffect(() => {
    if (property && mapRef.current) {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
        libraries: ['places']
      });

      loader.load().then(async () => {
        // Créer le service de géocodage
        const geocoder = new google.maps.Geocoder();
        
        // Géocoder l'adresse
        const geocodeResponse = await geocoder.geocode({
          address: `${property.location}, La Réunion, France`
        });
        
        // Default location for La Réunion if geocoding fails
        const defaultLocation = {
          lat: -21.115141, 
          lng: 55.536384 
        };

        // Use first result's location or fall back to default
        const location = geocodeResponse.results?.[0]?.geometry?.location || defaultLocation;
        
        const map = new google.maps.Map(mapRef.current!, {
          center: location,
          zoom: 12,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Ajouter un marqueur pour le bien
        new google.maps.Marker({
          position: location,
          map,
          title: property.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#f43f5e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
      });
    }
  }, [property, mapRef.current]);

  const fetchAgentLogo = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('logo_url')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profile?.logo_url) {
        setAgentLogo(profile.logo_url);
      }
    } catch (error) {
      console.error('Error fetching agent logo:', error);
    }
  };

  const fetchProperty = async (propertySlug: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', propertySlug)
        .single();

      if (error) throw error;

      setProperty({
        ...data,
        createdAt: new Date(data.created_at),
        availableFrom: data.available_from ? new Date(data.available_from) : undefined
      });
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentsComplete = (completedDocuments: Record<string, DocumentAnalysisResult>) => {
    setDocuments(completedDocuments);
    setShowSummaryModal(true);
    setShowApplicationForm(false);
  };

  const nextImage = () => {
    if (!property) return;
    setCurrentImageIndex((prevIndex) => 
      prevIndex === property.images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    if (!property) return;
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? property.images.length - 1 : prevIndex - 1
    );
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const shareProperty = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.title || 'Propriété à découvrir',
        text: `Découvrez cette propriété: ${property?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bien non trouvé</h2>
          <p className="text-gray-600 mb-6">Le bien immobilier que vous recherchez n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{property ? `${property.title} - ${property.location} | Immobilier La Réunion` : 'Chargement...'}</title>
        <meta name="description" content={property ? 
          `${property.type === 'sale' ? 'À vendre' : 'À louer'} : ${property.title} à ${property.location}. ${property.surface}m², ${property.rooms} pièces, ${property.bedrooms} chambres. ${property.description.slice(0, 150)}...` : 
          'Chargement de la propriété...'
        } />
        <meta name="keywords" content={property ? 
          `immobilier, ${property.type === 'sale' ? 'vente' : 'location'}, ${property.location}, ${property.property_type}, ${property.rooms} pièces, ${property.surface}m²` : 
          'immobilier, La Réunion'
        } />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={property ? `${property.title} - ${property.location} | Immobilier La Réunion` : 'Chargement...'} />
        <meta property="og:description" content={property ? 
          `${property.type === 'sale' ? 'À vendre' : 'À louer'} : ${property.title} à ${property.location}. ${property.surface}m², ${property.rooms} pièces, ${property.bedrooms} chambres.` : 
          'Chargement de la propriété...'
        } />
        <meta property="og:image" content={property?.images[0] || 'https://www.okvoyage.com/wp-content/uploads/2023/10/photos-de-la-reunion.jpg'} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={window.location.href} />
        <meta property="twitter:title" content={property ? `${property.title} - ${property.location} | Immobilier La Réunion` : 'Chargement...'} />
        <meta property="twitter:description" content={property ? 
          `${property.type === 'sale' ? 'À vendre' : 'À louer'} : ${property.title} à ${property.location}. ${property.surface}m², ${property.rooms} pièces, ${property.bedrooms} chambres.` : 
          'Chargement de la propriété...'
        } />
        <meta property="twitter:image" content={property?.images[0] || 'https://www.okvoyage.com/wp-content/uploads/2023/10/photos-de-la-reunion.jpg'} />

        {/* Additional SEO */}
        <link rel="canonical" href={window.location.href} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Immobilier La Réunion" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="theme-color" content="#f43f5e" />

        {/* Property specific metadata */}
        {property && (
          <>
            <meta property="og:price:amount" content={property.price.toString()} />
            <meta property="og:price:currency" content="EUR" />
            <meta property="product:price:amount" content={property.price.toString()} />
            <meta property="product:price:currency" content="EUR" />
            <meta property="product:availability" content={property.available_from ? 'preorder' : 'in stock'} />
            <meta property="product:condition" content="new" />
          </>
        )}
      </Helmet>

      {/* Full-screen image gallery */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button 
            onClick={() => setShowImageGallery(false)}
            className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button 
            onClick={prevImage}
            className="absolute left-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img 
            src={property.images[currentImageIndex]} 
            alt={property.title} 
            className="max-h-screen max-w-full object-contain"
          />
          <button 
            onClick={nextImage}
            className="absolute right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
            {property.images.map((_, index) => (
              <button 
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2.5 h-2.5 rounded-full ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[60vh] sm:h-[70vh] bg-black">
        <div className="relative w-full h-full">
          <img
            src={property.images[currentImageIndex]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          
          {/* Navigation buttons */}
          {property.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white hover:bg-black/75 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white hover:bg-black/75 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6">
          <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-white hover:text-white/80 mb-4 group bg-transparent"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Retour aux biens
          </button>
          {/* Agent Logo */}
          <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
              {agentLogo ? (
                <img src={agentLogo} alt="Logo agent" className="w-8 h-8 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-rose-600" />
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">{property.title}</h1>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center text-white/90 text-lg">
                <MapPin className="w-6 h-6 mr-2" />
                <span>{property.location}</span>
              </div>
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white">
                {property.type === 'sale' ? 'À Vendre' : 'À Louer'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-xl">
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Euro className="w-6 h-6 text-white/80" />
                  <div>
                    <div className="text-2xl font-bold">{property.price.toLocaleString('fr-FR')} €</div>
                    <div className="text-sm text-white/80">Prix</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Maximize2 className="w-6 h-6 text-white/80" />
                  <div>
                    <div className="text-2xl font-bold">{property.surface} m²</div>
                    <div className="text-sm text-white/80">Surface</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <BedDouble className="w-6 h-6 text-white/80" />
                  <div>
                    <div className="text-2xl font-bold">{property.rooms}</div>
                    <div className="text-sm text-white/80">Pièces</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Property Details */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>

            {/* Caractéristiques détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  Informations générales
                </h3>
                <ul className="space-y-3">
                  <li className="flex justify-between text-gray-600">
                    <span>Type de bien</span>
                    <span className="font-medium text-gray-900">
                      {property.property_type === 'apartment' ? 'Appartement' :
                       property.property_type === 'house' ? 'Maison' :
                       property.property_type === 'studio' ? 'Studio' :
                       property.property_type === 'loft' ? 'Loft' : 'Autre'}
                    </span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Étage</span>
                    <span className="font-medium text-gray-900">{property.floor_number} / {property.total_floors}</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Chambres</span>
                    <span className="font-medium text-gray-900">{property.bedrooms}</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Salles de bain</span>
                    <span className="font-medium text-gray-900">{property.bathrooms}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
                  Confort et énergie
                </h3>
                <ul className="space-y-3">
                  <li className="flex justify-between text-gray-600">
                    <span>Chauffage</span>
                    <span className="font-medium text-gray-900">
                      {property.heating === 'individual' ? 'Individuel' :
                       property.heating === 'collective' ? 'Collectif' :
                       property.heating === 'electric' ? 'Électrique' :
                       property.heating === 'gas' ? 'Gaz' : 'Autre'}
                    </span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Classe énergie</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      property.energy_class === 'A' ? 'bg-green-100 text-green-800' :
                      property.energy_class === 'B' ? 'bg-green-100 text-green-800' :
                      property.energy_class === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      property.energy_class === 'D' ? 'bg-yellow-100 text-yellow-800' :
                      property.energy_class === 'E' ? 'bg-orange-100 text-orange-800' :
                      property.energy_class === 'F' ? 'bg-red-100 text-red-800' :
                      'bg-red-100 text-red-800'
                    }`}>{property.energy_class}</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Émissions GES</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      property.gas_emission_class === 'A' ? 'bg-green-100 text-green-800' :
                      property.gas_emission_class === 'B' ? 'bg-green-100 text-green-800' :
                      property.gas_emission_class === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      property.gas_emission_class === 'D' ? 'bg-yellow-100 text-yellow-800' :
                      property.gas_emission_class === 'E' ? 'bg-orange-100 text-orange-800' :
                      property.gas_emission_class === 'F' ? 'bg-red-100 text-red-800' :
                      'bg-red-100 text-red-800'
                    }`}>{property.gas_emission_class}</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Orientation</span>
                    <span className="font-medium text-gray-900">
                      {property.orientation?.map(o => 
                        o === 'north' ? 'Nord' :
                        o === 'south' ? 'Sud' :
                        o === 'east' ? 'Est' :
                        o === 'west' ? 'Ouest' : o
                      ).join(', ')}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Features */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipements et services</h3>
            <div className="flex flex-wrap gap-3 mb-8">
              {property.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-full text-sm font-medium border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Conditions financières */}
            {property.type === 'rent' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Euro className="w-5 h-5 mr-2 text-blue-600" />
                  Conditions financières
                </h3>
                <ul className="space-y-3">
                  <li className="flex justify-between text-gray-600">
                    <span>Loyer mensuel</span>
                    <span className="font-medium text-gray-900">{property.price.toLocaleString('fr-FR')} €/mois</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Charges</span>
                    <span className="font-medium text-gray-900">
                      {property.charges?.toLocaleString('fr-FR')} € 
                      {property.charges_included && ' (incluses)'}
                    </span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Dépôt de garantie</span>
                    <span className="font-medium text-gray-900">{property.deposit_amount?.toLocaleString('fr-FR')} €</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>Disponible à partir du</span>
                    <span className="font-medium text-gray-900">
                      {property.availableFrom?.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Application Form */}
          <div className="lg:col-span-1 min-h-[600px] lg:-mt-[8.5rem] relative z-10">
            {showApplicationForm ? (
              <div className="bg-white rounded-xl shadow-lg">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Constituer mon dossier</h2>
                    <button
                      onClick={() => setShowApplicationForm(false)}
                      className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <GuidedDocumentUpload 
                    propertyId={property.id} 
                    onComplete={handleDocumentsComplete} 
                    showSuccessState={showApplicationSuccess}
                  />
                </div>
              </div>
            ) : (
            <div className="bg-white rounded-xl shadow-2xl sticky top-28 border border-gray-100 backdrop-blur-sm">
              <div className="p-6 border-b border-gray-200">
                {showApplicationSuccess ? (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-green-800">
                          Candidature envoyée avec succès !
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Votre dossier a été transmis à l'agent immobilier. Vous serez recontacté rapidement pour la suite du processus.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900">Intéressé par ce bien ?</h2>
                    <p className="text-gray-600 mt-2">
                      Constituez votre dossier en quelques minutes et augmentez vos chances d'obtenir ce logement.
                    </p>
                  </>
                )}
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center">
                    <div className="bg-rose-100 rounded-full p-2 mr-4">
                      <FileText className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Dossier numérique</h3>
                      <p className="text-sm text-gray-600">Téléchargez vos documents en toute sécurité</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-emerald-100 rounded-full p-2 mr-4">
                      <Zap className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Analyse instantanée</h3>
                      <p className="text-sm text-gray-600">Vérification automatique de vos documents</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-purple-100 rounded-full p-2 mr-4">
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Suivi personnalisé</h3>
                      <p className="text-sm text-gray-600">Recevez des notifications sur l'avancement</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full mt-8 px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] font-medium"
                >
                  Constituer mon dossier
                </button>
                
                <p className="text-xs text-center text-gray-500 mt-4">
                  Vos documents sont chiffrés et sécurisés. Nous respectons votre vie privée.
                </p>
              </div>
              
              {/* Contact info */}
              <div className="p-6 bg-gray-50 rounded-b-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Localisation</h3>
                </div>
                <div 
                  ref={mapRef}
                  className="w-full h-[300px] rounded-lg overflow-hidden mt-4 bg-gray-100"
                >
                  <div className="w-full h-full animate-pulse bg-gray-200"></div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Application Summary Modal */}
      {showSummaryModal && (
        <ApplicationSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          documents={documents}
          property={{
            id: property.id,
            title: property.title,
            type: property.type,
            price: property.price,
            location: property.location
          }}
        />
      )}
    </div>
  );
}