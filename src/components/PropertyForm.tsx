import React, { useState } from 'react';
import { X, Building2, MapPin, Euro, Maximize2, BedDouble, Calendar, Thermometer, Upload, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

interface PropertyFormProps {
  onClose: () => void;
  onSuccess: (property: Property) => void;
}

export function PropertyForm({ onClose, onSuccess }: PropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'rent' as 'rent' | 'sale',
    price: '',
    surface: '',
    rooms: '',
    location: '',
    description: '',
    images: [] as string[],
    features: [] as string[],
    furnished: false,
    energy_class: 'A' as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G',
    gas_emission_class: 'A' as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G',
    available_from: '',
    deposit_amount: '',
    charges: '',
    charges_included: false,
    floor_number: '',
    total_floors: '',
    property_type: 'apartment' as 'apartment' | 'house' | 'studio' | 'loft' | 'other',
    bedrooms: '',
    bathrooms: '',
    heating: 'individual' as 'individual' | 'collective' | 'electric' | 'gas' | 'other',
    orientation: [] as ('north' | 'south' | 'east' | 'west')[],
    feature: '' // Temporary field for feature input
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Basic validation
      if (!formData.title || !formData.price || !formData.surface || !formData.rooms || !formData.location) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Create property
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          ...formData,
          price: parseFloat(formData.price),
          surface: parseFloat(formData.surface),
          rooms: parseInt(formData.rooms),
          deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
          charges: formData.charges ? parseFloat(formData.charges) : null,
          floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
          total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          available_from: formData.available_from || null,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      onSuccess(data);
    } catch (err) {
      console.error('Error creating property:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(fileName);

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, publicUrl]
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        setError('Erreur lors du téléchargement de l\'image');
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addFeature = () => {
    if (formData.feature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, prev.feature.trim()],
        feature: ''
      }));
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Ajouter un bien</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-5rem)]">
          <div className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Informations générales
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Titre du bien"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'annonce
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'rent' | 'sale' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rent">Location</option>
                    <option value="sale">Vente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de bien
                  </label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value as 'apartment' | 'house' | 'studio' | 'loft' | 'other' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="apartment">Appartement</option>
                    <option value="house">Maison</option>
                    <option value="studio">Studio</option>
                    <option value="loft">Loft</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localisation
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Adresse du bien"
                    />
                    <MapPin className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description détaillée du bien"
                />
              </div>
            </div>

            {/* Characteristics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Maximize2 className="w-5 h-5 mr-2 text-blue-600" />
                Caractéristiques
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix {formData.type === 'rent' ? 'mensuel' : ''}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Prix"
                      min="0"
                      step="0.01"
                    />
                    <Euro className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surface
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.surface}
                      onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Surface en m²"
                      min="0"
                      step="0.01"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400">m²</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pièces
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.rooms}
                      onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre de pièces"
                      min="1"
                    />
                    <BedDouble className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chambres
                  </label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de chambres"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salles de bain
                  </label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de salles de bain"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Étage
                  </label>
                  <input
                    type="number"
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Numéro d'étage"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total étages
                  </label>
                  <input
                    type="number"
                    value={formData.total_floors}
                    onChange={(e) => setFormData({ ...formData, total_floors: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre total d'étages"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chauffage
                  </label>
                  <select
                    value={formData.heating}
                    onChange={(e) => setFormData({ ...formData, heating: e.target.value as 'individual' | 'collective' | 'electric' | 'gas' | 'other' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="individual">Individuel</option>
                    <option value="collective">Collectif</option>
                    <option value="electric">Électrique</option>
                    <option value="gas">Gaz</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Energy Performance */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
                Performance énergétique
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe énergie
                  </label>
                  <select
                    value={formData.energy_class}
                    onChange={(e) => setFormData({ ...formData, energy_class: e.target.value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(c => (
                      <option key={c} value={c}>Classe {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe GES
                  </label>
                  <select
                    value={formData.gas_emission_class}
                    onChange={(e) => setFormData({ ...formData, gas_emission_class: e.target.value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(c => (
                      <option key={c} value={c}>Classe {c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Informations complémentaires
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disponible à partir du
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.available_from}
                      onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orientation
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'north', label: 'Nord' },
                      { value: 'south', label: 'Sud' },
                      { value: 'east', label: 'Est' },
                      { value: 'west', label: 'Ouest' }
                    ].map(({ value, label }) => (
                      <label key={value} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.orientation.includes(value as any)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                orientation: [...formData.orientation, value as 'north' | 'south' | 'east' | 'west']
                              });
                            } else {
                              setFormData({
                                ...formData,
                                orientation: formData.orientation.filter(o => o !== value)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.type === 'rent' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dépôt de garantie
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.deposit_amount}
                          onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Montant du dépôt"
                          min="0"
                          step="0.01"
                        />
                        <Euro className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Charges
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.charges}
                          onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Montant des charges"
                          min="0"
                          step="0.01"
                        />
                        <Euro className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.charges_included}
                          onChange={(e) => setFormData({ ...formData, charges_included: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">Charges comprises</span>
                      </label>
                    </div>

                    <div className="col-span-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.furnished}
                          onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">Meublé</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-600" />
                Images
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {/* Upload button */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Ajouter des images</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Formats acceptés : JPG, PNG. Taille maximale : 5MB par image
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Équipements
              </h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.feature}
                  onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ajouter un équipement"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center group"
                  >
                    {feature}
                    <button
                      onClick={() => removeFeature(index)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Création...' : 'Créer le bien'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PropertyForm;