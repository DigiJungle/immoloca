import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { Euro, Maximize2, BedDouble, MapPin, Search, ArrowRight, LogIn, Building2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../lib/slugify';
import { supabase } from '../lib/supabase';

const currentDate = new Date();
const formattedDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(currentDate);

async function fetchProperties() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }

    return data.map(property => ({
      ...property,
      createdAt: new Date(property.created_at),
      availableFrom: property.available_from ? new Date(property.available_from) : undefined
    }));
  } catch (error) {
    console.error('Failed to fetch properties after retries:', error);
    return [];
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'sale' | 'rent'>('all');
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    fetchProperties().then(setProperties);
  }, []);

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || property.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Login Link */}
      <div className="absolute top-6 right-6 z-10 flex items-center space-x-6">
        <div className="relative group">
          <div className="absolute px-3 py-2 bg-black/75 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-2 -translate-x-1/2 left-1/2 pointer-events-none">
            <p className="text-white text-sm whitespace-nowrap">Espace agent</p>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-black/75"></div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="p-2 text-white hover:text-rose-400 transition-colors duration-200"
          >
            <LogIn className="w-6 h-6" />
          </button>
        </div>
        <div className="relative group">
          <div className="absolute px-3 py-2 bg-black/75 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-2 -translate-x-1/2 left-1/2 pointer-events-none">
            <p className="text-white text-sm whitespace-nowrap">Créer un compte</p>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-black/75"></div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="p-2 text-white hover:text-rose-400 transition-colors duration-200"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[80vh] min-h-[600px] bg-[url('https://www.okvoyage.com/wp-content/uploads/2023/10/photos-de-la-reunion.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30" />
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
          <p className="text-white/80 mb-4">{formattedDate}</p>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            Trouvez votre futur chez-vous
          </h1>
          <p className="text-xl text-white/90 mb-12 max-w-2xl font-light">
            Des biens d'exception vous attendent à La Réunion
          </p>
          
          {/* Search Bar */}
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-3 backdrop-blur-sm bg-white/95">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par lieu ou type de bien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 rounded-xl bg-transparent border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-gray-900 placeholder-gray-500"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'sale' | 'rent')}
                className="md:w-48 px-4 py-4 rounded-xl border border-gray-200 bg-transparent focus:outline-none focus:ring-2 focus:ring-rose-300 text-gray-900"
              >
                <option value="all">Tous les types</option>
                <option value="sale">À vendre</option>
                <option value="rent">À louer</option>
              </select>
              <button
                className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] font-medium flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                Rechercher
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">500+</div>
              <div className="text-white/80 text-sm">Biens disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">24h</div>
              <div className="text-white/80 text-sm">Délai de réponse</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">98%</div>
              <div className="text-white/80 text-sm">Clients satisfaits</div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Nos biens disponibles</h2>
            <p className="text-gray-600">Découvrez notre sélection de biens d'exception</p>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Prix croissant
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Surface décroissante
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => navigate(`/property/${slugify(property.title)}/${property.slug}`)}
            >
              <div className="relative h-64">
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-blue-600 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                  <span className={property.type === 'sale' ? 'text-emerald-600' : 'text-rose-600'}>
                    {property.type === 'sale' ? 'À Vendre' : 'À Louer'}
                  </span>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{property.title}</h3>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{property.location}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center text-gray-700">
                    <Euro className="w-4 h-4 mr-1" />
                    <span className="font-semibold">{property.price.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Maximize2 className="w-4 h-4 mr-1" />
                    <span className="font-semibold">{property.surface} m²</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <BedDouble className="w-4 h-4 mr-1" />
                    <span className="font-semibold">{property.rooms} pièces</span>
                  </div>
                </div>
                <button
                  className="w-full flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl hover:from-indigo-500 hover:to-violet-600 transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02] font-medium"
                  className="w-full flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02] font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/property/${slugify(property.title)}/${property.slug}`);
                  }}
                >
                  Voir le bien
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1.5 transition-transform duration-300" />
                </button>
              </div>
            </div>
          ))}
          {filteredProperties.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun bien ne correspond à vos critères
              </h3>
              <p className="text-gray-500">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}