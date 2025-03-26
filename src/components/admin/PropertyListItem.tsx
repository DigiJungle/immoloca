import React from 'react';
import { Property } from '../../types'; 
import { PropertyActions } from './PropertyActions';
import { MoreVertical } from 'lucide-react';

interface PropertyListItemProps {
  property: Property & {
    applications?: { id: string; status: string }[];
    views_count?: number;
  };
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onAction: (action: 'view' | 'edit' | 'share' | 'delete') => void;
}

export function PropertyListItem({ property, viewMode, onClick, onAction }: PropertyListItemProps) {
  const [showActions, setShowActions] = React.useState(false);

  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
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
          {property.applications && property.applications.filter(a => a.status === 'pending').length > 0 && (
            <div className="absolute bottom-2 right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              {property.applications.filter(a => a.status === 'pending').length} en attente
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.title}</h3>
          <p className="text-gray-600 mb-4">{property.location}</p>
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-900">
              {property.price.toLocaleString('fr-FR')} €
              {property.type === 'rent' && <span className="text-sm text-gray-500">/mois</span>}
            </div>
            <div className="relative z-10">
              <PropertyActions
                onAction={onAction}
                isOpen={showActions}
                onToggle={() => setShowActions(!showActions)}
                property={property}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onClick}>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <img className="h-10 w-10 rounded-lg object-cover" src={property.images[0]} alt="" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{property.title}</div>
            <div className="text-sm text-gray-500">{property.location}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          property.type === 'sale'
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {property.type === 'sale' ? 'Vente' : 'Location'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{property.price.toLocaleString('fr-FR')} €</div>
        {property.type === 'rent' && (
          <div className="text-xs text-gray-500">par mois</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {property.surface} m²
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {property.views_count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {property.applications?.length > 0 ? (
          <div className="flex items-center">
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {property.applications.filter(a => a.status === 'pending').length} en attente
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">Aucune</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative z-10">
        <PropertyActions
          onAction={onAction}
          isOpen={showActions}
          onToggle={() => setShowActions(!showActions)}
          property={property}
        />
      </td>
    </tr>
  );
}