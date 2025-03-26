import React from 'react';
import { ExternalLink, Edit, Copy, Trash2, MoreVertical } from 'lucide-react';
import { Property } from '../../types';
import { slugify } from '../../lib/slugify';

interface PropertyActionsProps {
  onAction: (action: 'view' | 'edit' | 'share' | 'delete') => void;
  isOpen: boolean;
  onToggle: () => void;
  property: Property;
}

export function PropertyActions({ onAction, isOpen, onToggle, property }: PropertyActionsProps) {
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 relative z-50"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      {isOpen && (
        <div 
          className="absolute right-14 top-0 bg-white rounded-lg shadow-lg py-1 z-[100] border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              const propertySlug = `${slugify(property.title)}/${property.slug}`;
              window.open(`/property/${propertySlug}`, '_blank');
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Voir le bien
          </button>
          <button
            onClick={() => onAction('edit')}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              const propertySlug = `${slugify(property.title)}/${property.slug}`;
              navigator.clipboard.writeText(`${window.location.origin}/property/${propertySlug}`);
              alert('Lien copié dans le presse-papier !');
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier le lien
          </button>
          <button
            onClick={() => onAction('delete')}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </button>
        </div>
      )}
    </>
  );
}