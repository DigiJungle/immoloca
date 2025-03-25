export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          title: string
          type: 'sale' | 'rent'
          price: number
          surface: number
          rooms: number
          location: string
          description: string
          images: string[]
          features: string[]
          created_at: string
          furnished?: boolean
          energy_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
          gas_emission_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
          available_from?: string
          deposit_amount?: number
          charges?: number
          charges_included?: boolean
          floor_number?: number
          total_floors?: number
          property_type?: 'apartment' | 'house' | 'studio' | 'loft' | 'other'
          bedrooms?: number
          bathrooms?: number
          heating?: 'individual' | 'collective' | 'electric' | 'gas' | 'other'
          orientation?: string[]
          user_id?: string
        }
        Insert: {
          id?: string
          title: string
          type: 'sale' | 'rent'
          price: number
          surface: number
          rooms: number
          location: string
          description: string
          images: string[]
          features: string[]
          created_at?: string
          furnished?: boolean
          energy_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
          gas_emission_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
          available_from?: string
          deposit_amount?: number
          charges?: number
          charges_included?: boolean
          floor_number?: number
          total_floors?: number
          property_type?: 'apartment' | 'house' | 'studio' | 'loft' | 'other'
          bedrooms?: number
          bathrooms?: number
          heating?: 'individual' | 'collective' | 'electric' | 'gas' | 'other'
          orientation?: string[]
          user_id?: string
        }
        Update: {
          id?: string
          title?: string
          type?: 'sale' | 'rent'
          price?: number
          surface?: number
          rooms?: number
          location?: string
          description?: string
          images?: string[]
          features?: string[]
          created_at?: string
          furnished?: boolean
          energy_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
          gas_emission_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
          available_from?: string
          deposit_amount?: number
          charges?: number
          charges_included?: boolean
          floor_number?: number
          total_floors?: number
          property_type?: 'apartment' | 'house' | 'studio' | 'loft' | 'other'
          bedrooms?: number
          bathrooms?: number
          heating?: 'individual' | 'collective' | 'electric' | 'gas' | 'other'
          orientation?: string[]
          user_id?: string
        }
      }
    }
  }
}