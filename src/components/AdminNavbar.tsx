import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Settings, LogOut, Upload, User, Bell, BellDot, Mail, Phone, Calendar, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AccountSettings } from './AccountSettings';
import { supabase } from '../lib/supabase';
import { sendTestEmail } from '../lib/email';

interface Notification {
  id: string;
  property_id: string;
  application_id: string;
  first_name: string;
  last_name: string;
  property_title: string;
  created_at: string;
  read: boolean;
}

export function AdminNavbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visitsCount, setVisitsCount] = useState({ upcoming: 0, total: 0 });

  useEffect(() => {
    // Fermer le dropdown au clic extérieur
    function handleClickOutside(event: MouseEvent) {
      const isNotificationClick = notificationsRef.current?.contains(event.target as Node);
      const isDropdownClick = dropdownRef.current?.contains(event.target as Node);
      
      if (!isNotificationClick && !isDropdownClick) {
        setIsDropdownOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Charger le logo existant
    async function loadLogo() {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('logo_url, first_name, agency_name')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (profile) {
          setLogoUrl(profile.logo_url);
          setFirstName(profile.first_name);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    if (user) {
      loadLogo();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Subscribe to notifications
      const subscription = supabase.channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as any;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .subscribe();

      // Load existing notifications
      loadNotifications();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(notifs || []);
      setUnreadCount(notifs?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    const fetchVisitsCount = async () => {
      try {
        const { data: visits, error } = await supabase
          .from('group_visits')
          .select(`
            id,
            applications:group_visit_applications(count)
          `)
          .gte('date', new Date().toISOString());

        if (error) throw error;

        const upcoming = visits?.length || 0;
        const total = visits?.reduce((sum, visit) => sum + (visit.applications?.[0]?.count || 0), 0) || 0;

        setVisitsCount({ upcoming, total });
      } catch (error) {
        console.error('Error fetching visits count:', error);
      }
    };

    fetchVisitsCount();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et nom */}
          <div className="flex items-center">
            {logoUrl ? (
              <img
                onClick={() => navigate('/admin')}
                src={logoUrl}
                alt="Logo"
                className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
              />
            ) : (
              <Building2
                onClick={() => navigate('/admin')}
                className="h-8 w-8 text-indigo-600 cursor-pointer hover:text-indigo-500 transition-colors"
              />
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={async () => {
                const result = await sendTestEmail();
                alert(result.success ? 'Email envoyé!' : 'Erreur d\'envoi');
              }}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Send className="w-5 h-5 text-gray-600" />
            </button>
            {/* Visites */}
            <button
              onClick={() => navigate('/admin/visits')}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <Calendar className="w-5 h-5 text-gray-600" />
              {visitsCount.upcoming > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {visitsCount.upcoming}
                </span>
              )}
            </button>

            {/* Menu dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsDropdownOpen(false);
                }}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              >
                {unreadCount > 0 ? (
                  <>
                    <BellDot className="w-5 h-5 text-rose-500" />
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Notifications dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-[420px] bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-700 rounded-full">
                          {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} candidature{unreadCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                            !notification.read ? 'bg-rose-50/50 border-l-4 border-rose-500' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-semibold text-gray-900">
                                    {notification.first_name || ''} {notification.last_name || ''}
                                  </span>
                                  {!notification.read && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-full animate-pulse">
                                      Nouveau
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                </span>
                              </div>
                              <a 
                                href="#"
                                className="block text-sm text-gray-700 font-medium mb-2 hover:text-rose-600 transition-colors"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  
                                  try {
                                    // Mark as read in database
                                    const { error } = await supabase
                                      .from('notifications')
                                      .update({ read: true })
                                      .eq('id', notification.id);
                                    
                                    if (error) throw error;
                                    
                                    // Update local state
                                    setNotifications(prev =>
                                      prev.map(n =>
                                        n.id === notification.id ? { ...n, read: true } : n
                                      )
                                    );
                                    if (!notification.read) {
                                      setUnreadCount(prev => Math.max(0, prev - 1));
                                    }
                                    
                                    // Navigate to property with application modal
                                    navigate(`/admin/property/${notification.property_id}?application=${notification.application_id}`);
                                  } catch (error) {
                                    console.error('Error marking notification as read:', error);
                                  }
                                }}
                              >
                                {notification.property_title || 'Bien immobilier'}
                              </a>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                  {notification.type === 'new_application' ? 'Nouvelle candidature' : 'Notification'}
                                </span>
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    
                                    try {
                                      // Mark as read in database
                                      const { error } = await supabase
                                        .from('notifications')
                                        .update({ read: true })
                                        .eq('id', notification.id);
                                      
                                      if (error) throw error;
                                      
                                      // Update local state
                                      setNotifications(prev =>
                                        prev.map(n =>
                                          n.id === notification.id ? { ...n, read: true } : n
                                        )
                                      );
                                      if (!notification.read) {
                                        setUnreadCount(prev => Math.max(0, prev - 1));
                                      }
                                      
                                      // Navigate to property with application modal
                                      navigate(`/admin/property/${notification.property_id}?application=${notification.application_id}`);
                                    } catch (error) {
                                      console.error('Error marking notification as read:', error);
                                    }
                                  }}
                                  className="text-sm text-rose-600 hover:text-rose-700 font-medium hover:underline"
                                >
                                  Voir le dossier
                                </button>
                              </div>
                            </div>
                        </div>
                      ))
                    )}
                    {notifications.length > 0 && (
                      <div className="p-4 text-center border-t border-gray-100">
                        <button className="text-sm text-gray-600 hover:text-gray-900">
                          Voir toutes les notifications
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          
            <div className="relative ml-4" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 flex items-center justify-center text-white">
                  {firstName?.[0].toUpperCase() || <User className="w-5 h-5" />}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {firstName || 'Mon compte'}
                </span>
              </button>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-100">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Mon compte</p>
                    <p className="text-xs text-gray-500 truncate">{firstName || 'Mon compte'}</p>
                  </div>

                  <button
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <AccountSettings onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
}