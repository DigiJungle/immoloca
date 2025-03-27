import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import { useQuery } from '@tanstack/react-query';
import { StatsCards, SearchFilters, PropertyList, ConfirmModal } from '../components/admin'; 
import { Mail } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Lazy load components
const PropertyForm = React.lazy(() => import('../components/PropertyForm'));

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState<'all' | 'rent' | 'sale'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'views'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const savedViewMode = localStorage.getItem('adminViewMode');
    return (savedViewMode === 'grid' || savedViewMode === 'list') ? savedViewMode : 'list';
  });

  // Restore state from location if available
  useEffect(() => {
    if (location.state) {
      setSearchQuery(location.state.searchQuery || '');
      setPropertyType(location.state.propertyType || 'all');
      setSortBy(location.state.sortBy || 'date');
      setSortOrder(location.state.sortOrder || 'desc');
    }
  }, [location.state]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('adminViewMode', viewMode);
  }, [viewMode]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleTestEmail = async () => {
    try {
      setSendingEmail(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to send test email');
      
      alert('Test email sent successfully!');
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Fetch properties with React Query
  const { data: properties = [], isLoading: loading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          applications (
            id,
            status
          ),
          property_views (
            id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(property => ({
        ...property,
        applications: property.applications || [],
        views_count: property.views_count || 0,
        createdAt: new Date(property.created_at),
        availableFrom: property.available_from ? new Date(property.available_from) : undefined
      }));
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes
  });

  // Fetch visits with React Query
  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_visits')
        .select(`
          id,
          applications:group_visit_applications(count)
        `)
        .gte('date', new Date().toISOString());

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!properties.length) {
      return {
        totalProperties: 0,
        totalViews: 0,
        upcomingVisits: 0,
        totalVisitCandidates: 0,
        pendingApplications: 0,
        processedApplications: 0,
        averagePrice: 0,
        averageViews: 0
      };
    }

    const totalProperties = properties.length;
    const totalViews = properties.reduce((sum, p) => sum + p.views_count, 0);
    const totalApplications = properties.reduce((sum, p) => sum + (p.applications?.length || 0), 0);
    const pendingApplications = properties.reduce((sum, p) => sum + 
      (p.applications?.filter(a => a.status === 'pending').length || 0), 0);
    const processedApplications = properties.reduce((sum, p) => sum + 
      (p.applications?.filter(a => a.status === 'approved' || a.status === 'rejected').length || 0), 0);

    const upcomingVisits = visits.length;
    const totalVisitCandidates = visits.reduce((sum, visit) => 
      sum + (visit.applications?.[0]?.count || 0), 0);

    const averagePrice = totalProperties > 0 
      ? properties.reduce((sum, p) => sum + p.price, 0) / totalProperties 
      : 0;
    const averageViews = totalProperties > 0 ? totalViews / totalProperties : 0;

    return {
      totalProperties,
      totalViews,
      upcomingVisits,
      totalVisitCandidates,
      pendingApplications,
      processedApplications,
      averagePrice,
      averageViews
    };
  }, [properties, visits]);

  // Memoize filtered properties
  const filteredProperties = React.useMemo(() => {
    return properties.filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          property.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = propertyType === 'all' || property.type === propertyType;
      return matchesSearch && matchesType;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        case 'views':
          return sortOrder === 'asc' ? 
            (a.views_count || 0) - (b.views_count || 0) : 
            (b.views_count || 0) - (a.views_count || 0);
        default:
          return sortOrder === 'asc' ? 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime() :
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [properties, searchQuery, propertyType, sortBy, sortOrder]);

  const handleDeleteProperty = async (property: Property) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) return;
    
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== property.id));
      clearCache('properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Erreur lors de la suppression du bien');
    }
  };

  const handleShareProperty = (property: Property) => {
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Découvrez ce bien : ${property.title}`,
        url: `${window.location.origin}/property/${property.id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/property/${property.id}`);
      alert('Lien copié dans le presse-papier !');
    }
  };

  // Restaurer la position de défilement
  useEffect(() => {
    if (location.state?.scrollPosition) {
      window.scrollTo(0, location.state.scrollPosition);
    }
  }, [location.state?.scrollPosition]);

  const handlePropertyAction = async (action: string, property: Property) => {
    switch (action) {
      case 'view':
        navigate(`/admin/property/${property.id}`, { 
          state: {
            viewMode,
            scrollPosition: window.scrollY,
            searchQuery,
            propertyType,
            sortBy,
            sortOrder
          }
        });
        break;
      case 'edit':
        setShowAddForm(true);
        break;
      case 'share':
        handleShareProperty(property);
        break;
      case 'delete':
        setPropertyToDelete(property);
        setShowConfirmDelete(true);
        break;
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableaux de bord</h1>
            <p className="mt-1 text-sm text-gray-500">
              {properties.length} bien{properties.length > 1 ? 's' : ''} en ligne
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] font-medium mb-4"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un bien
          </button>
        </div>
        
        <div className="flex flex-col gap-8">
          {/* Filters */}
          <div className="order-1">
            <SearchFilters
              searchQuery={searchQuery}
              propertyType={propertyType}
              sortBy={sortBy}
              sortOrder={sortOrder}
              viewMode={viewMode}
              onSearchChange={setSearchQuery}
              onPropertyTypeChange={setPropertyType}
              onSortChange={setSortBy}
              onSortOrderChange={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
              onViewModeChange={setViewMode}
            />
          </div>

          {/* Property Grid */}
          <div className="order-2">
            <PropertyList
              properties={filteredProperties}
              loading={loading}
              viewMode={viewMode}
              onPropertyClick={(property) => navigate(`/admin/property/${property.id}`)}
              onPropertyAction={handlePropertyAction}
            />
          </div>

          {/* Stats Cards - Order changes based on screen size */}
          <div className="order-3 lg:order-first mb-8">
            <StatsCards stats={stats} loading={loading} />
          </div>
        </div>

        {/* Confirm Delete Modal */}
        {showConfirmDelete && propertyToDelete && (
          <ConfirmModal
            isOpen={showConfirmDelete}
            onClose={() => {
              setShowConfirmDelete(false);
              setPropertyToDelete(null);
            }}
            onConfirm={() => {
              handleDeleteProperty(propertyToDelete);
              setShowConfirmDelete(false);
              setPropertyToDelete(null);
            }}
            title="Supprimer le bien"
            message="Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible."
            confirmText="Supprimer"
            cancelText="Annuler"
          />
        )}
      </div>
      {/* Add Property Modal */}
      {showAddForm && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        }>
          <PropertyForm
            onClose={() => setShowAddForm(false)}
            onSuccess={(newProperty) => {
              setProperties(prev => [newProperty, ...prev]);
              setShowAddForm(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default AdminPage;