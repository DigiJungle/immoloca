import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import { StatsCards, SearchFilters, PropertyList, ConfirmModal } from '../components/admin';

// Lazy load components
const PropertyForm = React.lazy(() => import('../components/PropertyForm'));

export function AdminPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState<'all' | 'rent' | 'sale'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'views'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalViews: 0,
    upcomingVisits: 0,
    totalVisitCandidates: 0,
    pendingApplications: 0,
    processedApplications: 0,
    averagePrice: 0,
    averageViews: 0
  });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

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

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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

        const propertiesWithStats = data.map(property => ({
          ...property,
          applications: property.applications || [],
          views_count: property.property_views?.length || 0,
          createdAt: new Date(property.created_at),
          availableFrom: property.available_from ? new Date(property.available_from) : undefined
        }));

        setProperties(propertiesWithStats);

        // Calculate stats
        const totalProperties = propertiesWithStats.length;
        const totalViews = propertiesWithStats.reduce((sum, p) => sum + (p.views_count || 0), 0);
        const totalApplications = propertiesWithStats.reduce((sum, p) => sum + (p.applications?.length || 0), 0);
        const pendingApplications = propertiesWithStats.reduce((sum, p) => sum + 
          (p.applications?.filter(a => a.status === 'pending').length || 0), 0);
        const processedApplications = propertiesWithStats.reduce((sum, p) => sum + 
          (p.applications?.filter(a => a.status === 'approved' || a.status === 'rejected').length || 0), 0);
        
        // Fetch upcoming visits and candidates
        const { data: visits } = await supabase
          .from('group_visits')
          .select(`
            id,
            applications:group_visit_applications(
              application:applications(*)
            )
          `)
          .gte('date', new Date().toISOString());

        const upcomingVisits = visits?.length || 0;
        const totalVisitCandidates = visits?.reduce((sum, visit) => {
          return sum + (visit.applications?.length || 0);
        }, 0) || 0;

        const averagePrice = totalProperties > 0 
          ? propertiesWithStats.reduce((sum, p) => sum + p.price, 0) / totalProperties 
          : 0;
        const averageViews = totalProperties > 0 ? totalViews / totalProperties : 0;

        setStats({
          totalProperties,
          totalViews,
          upcomingVisits,
          totalVisitCandidates,
          pendingApplications,
          processedApplications,
          averagePrice,
          averageViews
        });

      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('properties_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'properties'
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setProperties(prev => [payload.new as Property, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setProperties(prev => prev.filter(p => p.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setProperties(prev => prev.map(p => 
            p.id === payload.new.id ? { ...p, ...payload.new } : p
          ));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDeleteProperty = async (property: Property) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) return;
    
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== property.id));
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

  const handlePropertyAction = async (action: string, property: Property) => {
    switch (action) {
      case 'view':
        navigate(`/admin/property/${property.id}`);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="mt-1 text-sm text-gray-500">
              {properties.length} bien{properties.length > 1 ? 's' : ''} en ligne
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un bien
          </button>
        </div>
        
        {/* Stats Cards */}
        {loading ? (
          <StatsCards stats={{
            totalProperties: 0,
            totalViews: 0,
            upcomingVisits: 0,
            totalVisitCandidates: 0,
            pendingApplications: 0,
            processedApplications: 0,
            averagePrice: 0,
            averageViews: 0
          }} />
        ) : (
          <StatsCards stats={stats} />
        )}

        {/* Filters */}
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

        {/* Property Grid */}
        <PropertyList
          properties={filteredProperties}
          loading={loading}
          viewMode={viewMode}
          onPropertyClick={(property) => navigate(`/admin/property/${property.id}`)}
          onPropertyAction={handlePropertyAction}
        />

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