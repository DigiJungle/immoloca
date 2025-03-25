import React from 'react';
import { Search, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';

interface SearchFiltersProps {
  searchQuery: string;
  propertyType: 'all' | 'rent' | 'sale';
  sortBy: 'date' | 'price' | 'views';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  onSearchChange: (query: string) => void;
  onPropertyTypeChange: (type: 'all' | 'rent' | 'sale') => void;
  onSortChange: (sort: 'date' | 'price' | 'views') => void;
  onSortOrderChange: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function SearchFilters({
  searchQuery,
  propertyType,
  sortBy,
  sortOrder,
  viewMode,
  onSearchChange,
  onPropertyTypeChange,
  onSortChange,
  onSortOrderChange,
  onViewModeChange,
}: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par titre ou localisation..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
        <select
          value={propertyType}
          onChange={(e) => onPropertyTypeChange(e.target.value as 'all' | 'rent' | 'sale')}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        >
          <option value="all">Tous les types</option>
          <option value="rent">Location</option>
          <option value="sale">Vente</option>
        </select>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'date' | 'price' | 'views')}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          >
            <option value="date">Date</option>
            <option value="price">Prix</option>
            <option value="views">Vues</option>
          </select>
          <button
            onClick={onSortOrderChange}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-l-lg ${
                viewMode === 'grid'
                  ? 'bg-rose-500 text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-r-lg ${
                viewMode === 'list'
                  ? 'bg-rose-500 text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}