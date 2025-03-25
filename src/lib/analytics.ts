import { supabase } from './supabase';

export async function trackPropertyView(slug: string, userId?: string) {
  try {
    // First get the property ID from the slug
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('slug', slug)
      .single();

    if (propertyError) {
      console.error('Error getting property ID:', propertyError);
      return;
    }

    const { error } = await supabase
      .from('property_views')
      .insert([{
        property_id: property.id,
        user_id: userId
      }]);

    if (error) {
      console.error('Error tracking property view:', error);
    }
  } catch (error) {
    console.error('Error in trackPropertyView:', error);
  }
}

export async function getPropertyViews(propertyId: string) {
  const { data, error } = await supabase
    .from('property_views')
    .select('*')
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error fetching property views:', error);
    throw error;
  }

  return data;
}

export async function getPropertyViewsCount(propertyId: string) {
  const { count, error } = await supabase
    .from('property_views')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error fetching property views count:', error);
    throw error;
  }

  return count;
}