import React from 'react';
import { Property } from '../../types'; 
import { MoreVertical, ExternalLink, Edit, Copy, Trash2, Eye } from 'lucide-react';
import { slugify } from '../../lib/slugify';

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
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuContentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Ne pas fermer si on clique sur le bouton ou dans le menu
      if (
        buttonRef.current?.contains(event.target as Node) ||
        menuContentRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      
      // Fermer le menu dans tous les autres cas
      setShowActions(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleViewProperty = (e: React.MouseEvent) => {
    e.stopPropagation();
    const propertySlug = `${slugify(property.title)}/${property.slug}`;
    window.open(`/property/${propertySlug}`, '_blank');
  };
  
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const propertySlug = `${slugify(property.title)}/${property.slug}`;
    navigator.clipboard.writeText(`${window.location.origin}/property/${propertySlug}`);
    alert('Lien copié dans le presse-papier !');
  };

  const pendingApplications = property.applications?.filter(a => a.status === 'pending').length || 0;

  if (viewMode === 'grid') {
    return (
      <div 
        onClick={onClick}
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
            <div className="absolute bottom-2 right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              {pendingApplications} en attente
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
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showActions && (
                <div 
                  ref={menuContentRef}
                  className={`absolute bg-white rounded-lg shadow-lg py-1 z-[100] border border-gray-100 min-w-[200px] transform ${
                    viewMode === 'grid' 
                      ? 'left-1/2 -translate-x-1/2 bottom-full mb-2'
                      : 'right-full top-1/2 -translate-y-1/2 mr-1'
                  }`}
                >
                  <button
                    onClick={handleViewProperty}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir le bien
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('edit');
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le lien
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('delete');
                    }}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </button>
                </div>
              )}
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
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-500">
          <Eye className="w-4 h-4 mr-1.5" />
          <span>{property.views_count?.toLocaleString('fr-FR') || 0}</span>
        </div>
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
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {showActions && (
          <div 
            ref={menuContentRef}
            className={`absolute bg-white rounded-lg shadow-lg py-1 z-[100] border border-gray-100 min-w-[200px] transform ${
              viewMode === 'grid' 
                ? 'left-1/2 -translate-x-1/2 bottom-full mb-2'
                : 'right-[43%] top-[30%]'
            }`}
          >
            <button
              onClick={handleViewProperty}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir le bien
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('edit');
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier le lien
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('delete');
              }}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}