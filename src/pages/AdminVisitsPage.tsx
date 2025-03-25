import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, Building2, ArrowRight, ChevronLeft, ChevronRight, X, Mail, Phone, Edit, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, setHours, setMinutes, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GroupVisit } from '../types';

type ViewMode = 'calendar' | 'list';

export function AdminVisitsPage() {
  const [visits, setVisits] = useState<GroupVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedVisit, setSelectedVisit] = useState<GroupVisit | null>(null);
  const [loadingProperties, setLoadingProperties] = useState<Record<string, boolean>>({});
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editTime, setEditTime] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Default to list view on mobile devices
    return window.innerWidth < 768 ? 'list' : 'calendar';
  });

  // Update view mode when window is resized
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? 'list' : 'calendar');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [currentMonth]);

  useEffect(() => {
    if (selectedVisit) {
      fetchProperty(selectedVisit.property_id);
    }
  }, [selectedVisit]);

  useEffect(() => {
    // Charger les propriétés pour toutes les visites
    const propertyIds = [...new Set(visits.map(visit => visit.property_id))];
    Promise.all(propertyIds.map(fetchProperty));
  }, [visits]);

  const fetchProperty = async (propertyId: string) => {
    try {
      setLoadingProperties(prev => ({ ...prev, [propertyId]: true }));
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setProperties(prev => ({ ...prev, [propertyId]: data }));
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoadingProperties(prev => ({ ...prev, [propertyId]: false }));
    }
  };

  const fetchVisits = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('group_visits')
        .select(`
          *,
          applications:group_visit_applications(
            application:applications(*)
          )
        `)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      setVisits(data.map(visit => ({
        ...visit,
        date: new Date(visit.date),
        created_at: new Date(visit.created_at),
        applications: visit.applications.map((a: any) => a.application)
      })));
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (visit: GroupVisit) => {
    setEditDate(visit.date);
    setEditTime(format(visit.date, 'HH:mm'));
    setShowEditModal(true);
  };

  const handleUpdateVisit = async () => {
    if (!selectedVisit || !editDate || !editTime) return;
    
    try {
      setUpdating(true);
      
      // Parse time and combine with date
      const [hours, minutes] = editTime.split(':').map(Number);
      const newDate = setHours(setMinutes(editDate, minutes), hours);

      // Update visit in database
      const { error } = await supabase
        .from('group_visits')
        .update({ date: newDate.toISOString() })
        .eq('id', selectedVisit.id);

      if (error) throw error;

      // Refresh visits
      await fetchVisits();
      
      // Update selected visit
      setSelectedVisit(prev => prev ? { ...prev, date: newDate } : null);
      
      // Close modal
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating visit:', error);
    } finally {
      setUpdating(false);
    }
  };

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start, end });

  const getVisitsForDay = (day: Date) => {
    return visits.filter(visit => isSameDay(visit.date, day));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Visites planifiées</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl mr-4 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium ${
                viewMode === 'calendar'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendrier</span>
            </button>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium whitespace-nowrap">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day headers */}
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map(day => {
              const dayVisits = getVisitsForDay(day);
              const hasVisits = dayVisits.length > 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border border-gray-100 relative group cursor-pointer transition-all duration-200 ${
                    isCurrentMonth
                      ? isWeekend
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                        : 'bg-white hover:bg-gray-50 text-gray-900'
                      : 'text-gray-400'
                  } ${
                    isToday(day)
                      ? 'ring-2 ring-indigo-500 bg-indigo-50'
                      : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isCurrentMonth
                      ? 'text-gray-800'
                      : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {hasVisits && (
                    <div className="space-y-1">
                      {dayVisits.map(visit => (
                        <div
                          key={visit.id}
                          className="text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-2 rounded-lg flex items-center gap-1.5 hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                          onClick={() => setSelectedVisit(visit)}
                        >
                          <Clock className="w-3 h-3" />
                          {format(visit.date, 'HH:mm')}
                          <Users className="w-3 h-3 ml-auto" />
                          {visit.applications.length}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hover details */}
                  {hasVisits && (
                    <div className="absolute left-full top-0 ml-2 z-10 w-64 hidden group-hover:block">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2">
                        {dayVisits.map(visit => (
                          <div key={visit.id} className="text-sm">
                            <div className="font-medium text-gray-900">
                              {format(visit.date, 'HH:mm')} ({visit.applications.length * 20} min)
                            </div>
                            <div className="text-gray-600">
                              {visit.property_title}
                            </div>
                            <div className="text-gray-500">
                              {visit.applications.length} visiteur(s)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-lg divide-y divide-gray-200">
          {visits.map(visit => (
            <div
              key={visit.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-l-4"
              style={loadingProperties[visit.property_id] ? {} : {
                borderLeftColor: properties[visit.property_id]?.type === 'rent' ? '#ec4899' : '#10b981',
                opacity: loadingProperties[visit.property_id] ? 0.5 : 1
              }}
              onClick={() => setSelectedVisit(visit)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">
                    {loadingProperties[visit.property_id] ? 'Chargement...' : properties[visit.property_id]?.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(visit.date, 'dd MMMM yyyy', { locale: fr })}
                  </div>
                  <div className="font-medium text-gray-900">
                    {format(visit.date, 'HH:mm')}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                    loadingProperties[visit.property_id] ? 'bg-gray-100 text-gray-700' :
                    properties[visit.property_id]?.type === 'rent'
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {loadingProperties[visit.property_id] ? '...' : 
                     properties[visit.property_id]?.type === 'rent' ? 'Location' : 'Vente'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    {visit.applications.length}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visit Details Slideout */}
      {selectedVisit && (
        <div 
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={() => setSelectedVisit(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          
          {/* Slideout */}
          <div 
            className="absolute inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Détails de la visite</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleEditClick(selectedVisit);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors text-indigo-600"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedVisit(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Visit Info */}
                <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-indigo-700 group">
                      <Calendar className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        {format(selectedVisit.date, 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center text-indigo-700 group">
                      <Clock className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        {format(selectedVisit.date, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-indigo-700">
                    <Users className="w-5 h-5 mr-2" />
                    <span>
                      {selectedVisit.applications.length} visiteur{selectedVisit.applications.length > 1 ? 's' : ''} •{' '}
                      {selectedVisit.applications.length * 20} minutes au total
                    </span>
                  </div>
                </div>

                {/* Property Info */}
                {properties[selectedVisit.property_id] && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                    <div className="aspect-video relative">
                      <img 
                        src={properties[selectedVisit.property_id].images[0]} 
                        alt={properties[selectedVisit.property_id].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900">{properties[selectedVisit.property_id].title}</h3>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {properties[selectedVisit.property_id].location}
                      </div>
                    </div>
                  </div>
                )}

                {/* Visitors List */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Liste des visiteurs</h3>
                  {selectedVisit.applications.map((application, index) => (
                    <div 
                      key={application.id}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </h4>
                          <div className="text-sm text-gray-500">
                            Visiteur {index + 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`mailto:${application.email}`}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                          >
                            <Mail className="w-5 h-5" />
                          </a>
                          <a 
                            href={`tel:${application.phone}`}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          {application.email}
                        </div>
                        <div className="flex items-center mt-1">
                          <Phone className="w-4 h-4 mr-2" />
                          {application.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedVisit && (
        <div 
          className="fixed inset-0 z-[60] overflow-hidden"
          onClick={() => setShowEditModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Modifier la visite
                  </h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate ? format(editDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditDate(new Date(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateVisit}
                  disabled={updating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updating ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminVisitsPage;