import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../types';
import { Home, Euro, Maximize2, BedDouble, Eye, Clock } from 'lucide-react';

interface PropertyCardProps {
  property: Property & {
    applications?: { id: string; status: string }[];
    views_count?: number;
  };
  onClick: () => void;
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const navigate = useNavigate();
  const pendingApplications = property.applications?.filter(a => a.status === 'pending').length || 0;
  const propertySlug = `${slugify(property.title)}/${property.slug}`;
  const propertySlug = `${slugify(property.title)}/${property.slug}`;

  return (
    <div 
      onClick={() => navigate(`/property/${propertySlug}`)}
      className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
    >
      <div className="relative h-48">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-blue-600 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          <span className={property.type === 'sale' ? 'text-emerald-600' : 'text-rose-600'}>
            {property.type === 'sale' ? 'À Vendre' : 'À Louer'}
          </span>
        </div>
        {pendingApplications > 0 && (
          <div className="absolute bottom-2 right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {pendingApplications} candidature{pendingApplications > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.title}</h3>
        <p className="text-gray-600 mb-4 flex items-center">
          <Home className="w-4 h-4 mr-2" />
          {property.location}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
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
          <div className="flex items-center text-gray-700">
            <Eye className="w-4 h-4 mr-1" />
            <span className="font-semibold">{property.views_count || 0} vues</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyCard;