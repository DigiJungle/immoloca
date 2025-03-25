import React, { useState, useEffect } from 'react';
import { Building2, Mail, User, Phone, Upload, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  agency_name: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface AccountSettingsProps {
  onClose?: () => void;
}

export function AccountSettings({ onClose }: AccountSettingsProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, logo_url, agency_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          agency_name: profile.agency_name,
          phone: profile.phone
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setSuccess('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setError(null);

      // Vérifier le type et la taille du fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 2MB');
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-logo-${Date.now()}.${fileExt}`;

      // Upload du fichier
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Mettre à jour le profil avec la nouvelle URL du logo
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      setSuccess('Logo mis à jour avec succès');
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du téléchargement du logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setError(null);
      setSuccess(null);

      const { error } = await supabase.auth.resetPasswordForEmail(
        user?.email || '',
        { redirectTo: `${window.location.origin}/account-settings` }
      );

      if (error) throw error;
      setSuccess('Un email de réinitialisation du mot de passe vous a été envoyé');
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Erreur lors de la réinitialisation du mot de passe');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90 z-50"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">Paramètres du compte</h2>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-10rem)] overflow-y-auto px-8 py-6 space-y-8">
                {/* Logo Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                    Logo de l'agence
                  </h3>
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 rounded-xl border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                      {profile?.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 inline-block mr-2" />
                        {isUploading ? 'Téléchargement...' : 'Changer le logo'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        PNG, JPG jusqu'à 2MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                        Informations
                      </h3>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Nom de l'agence
                      </label>
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          value={profile?.agency_name || ''}
                          onChange={e => setProfile(prev => prev ? { ...prev, agency_name: e.target.value } : null)}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 pl-4"
                          placeholder="Nom de votre agence"
                        />
                        <Building2 className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prénom
                      </label>
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          value={profile?.first_name || ''}
                          onChange={e => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 pl-4"
                        />
                        <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom
                      </label>
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          value={profile?.last_name || ''}
                          onChange={e => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 pl-4"
                        />
                        <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1 relative">
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="block w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm text-gray-500 h-12 pl-4"
                        />
                        <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Téléphone
                      </label>
                      <div className="mt-1 relative">
                        <input
                          type="tel"
                          value={profile?.phone || ''}
                          onChange={e => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 pl-4"
                          placeholder="06 12 34 56 78"
                        />
                        <Phone className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                      {success}
                    </div>
                  )}
                </form>

                {/* Password Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <KeyRound className="w-5 h-5 mr-2 text-indigo-600" />
                    Mot de passe
                  </h3>
                  <p className="text-sm text-gray-600">
                    Pour des raisons de sécurité, la modification du mot de passe se fait via un lien envoyé par email.
                  </p>
                  <button
                    onClick={handlePasswordReset}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                  >
                    Changer le mot de passe
                  </button>
                </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6 rounded-b-2xl">
              <div className="flex justify-end space-x-4">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AccountSettings;