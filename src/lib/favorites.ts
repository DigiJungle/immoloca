import { supabase } from './supabase';

export async function addToFavorites(propertyId: string, userId: string) {
  const { error } = await supabase
    .from('favorites')
    .insert([{
      property_id: propertyId,
      user_id: userId
    }]);

  if (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
}

export async function removeFromFavorites(propertyId: string, userId: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('property_id', propertyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
}

export async function getFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      property_id,
      properties (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }

  return data;
}

export async function isFavorite(propertyId: string, userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = Not Found
    console.error('Error checking favorite status:', error);
    throw error;
  }

  return !!data;
}