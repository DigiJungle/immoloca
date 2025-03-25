export interface Property {
  id: string;
  slug: string;
  title: string;
  type: 'sale' | 'rent';
  price: number;
  surface: number;
  rooms: number;
  location: string;
  description: string;
  images: string[];
  features: string[];
  created_at: Date;
  // New rental-specific fields
  furnished?: boolean;
  energy_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  gas_emission_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  available_from?: Date;
  deposit_amount?: number;
  charges?: number;
  charges_included?: boolean;
  floor_number?: number;
  total_floors?: number;
  property_type?: 'apartment' | 'house' | 'studio' | 'loft' | 'other';
  bedrooms?: number;
  bathrooms?: number;
  heating?: 'individual' | 'collective' | 'electric' | 'gas' | 'other';
  orientation?: ('north' | 'south' | 'east' | 'west')[];
  user_id?: string;
}

export interface ApplicationForm {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  documents: string[];
  status: 'pending' | 'approved' | 'rejected';
  score?: number;
  createdAt: Date;
  created_at: string;
  salary?: number;
  employment_type?: string;
  employer_name?: string;
  employment_start_date?: string;
  guarantor_required?: boolean;
  guarantor_info?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    salary?: number;
    employmentType?: string;
    employerName?: string;
  };
  documentTypes: string[];
  document_types: string[];
  document_status: Record<string, {
    status: 'pending' | 'verified' | 'rejected';
    verifiedAt?: Date;
    comment?: string;
  }>;
  // Propriétés mappées pour l'affichage
  firstName?: string;
  lastName?: string;
  employmentType?: string;
  employerName?: string;
  employmentStartDate?: Date;
  guarantorRequired?: boolean;
  guarantorInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    salary?: number;
    employmentType?: string;
    employerName?: string;
  };
  documentStatus?: Record<string, {
    status: 'pending' | 'verified' | 'rejected';
    verifiedAt?: Date;
    comment?: string;
  }>;
  selected?: boolean;
}

export interface GroupVisit {
  id: string;
  property_id: string;
  date: Date;
  duration: number;
  max_visitors: number;
  created_at: Date;
  applications: ApplicationForm[];
}