export type UserType = 'morador' | 'prestador';
export type SubscriptionStatus = 'active' | 'inactive';

export interface RegisterProfileData {
  user_type: UserType;
  full_name: string;
  cpf: string;
  phone?: string;
  // prestador-only fields
  business_name?: string;
  category?: string;
  description?: string;
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
  contact_whatsapp?: string;
  experience_years?: number;
  services?: string[];
}

export interface Profile {
  id: string;
  user_type: UserType;
  full_name: string;
  email: string;
  phone?: string | null;
  cpf_hash?: string;
  deleted_at?: string | null;
  provider?: Provider | null;
  /** Frontend-only flag: set when a Supabase user exists but has no backend profile yet. */
  isProfileMissing?: boolean;
}

export interface Provider {
  id: string;
  business_name: string;
  category: string;
  description?: string | null;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  subscription_status: SubscriptionStatus;
  avg_rating?: number | null;
  review_count: number;
  distance_km?: number;
}

export interface Review {
  id: string;
  provider_id: string;
  resident_full_name: string;
  rating: number;
  comment?: string | null;
  verified_hire: boolean;
  created_at: string;
}

export interface ReviewDetail extends Review {
  provider_response?: string | null;
  responded_at?: string | null;
}

export interface ProviderDetail extends Provider {
  full_name: string;
  recent_reviews: ReviewDetail[];
  phone?: string | null;
  email?: string | null;
  contact_whatsapp?: string | null;
  experience_years?: number | null;
  services?: string[] | null;
  image_url?: string | null;
  is_within_service_area?: boolean | null;
}

export interface ProviderSearchItem {
  id: string;
  full_name: string;
  business_name: string;
  category: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  subscription_status: SubscriptionStatus;
  avg_rating: number | null;
  review_count: number;
  distance_km: number;
}

export interface PaginatedProviders {
  items: ProviderSearchItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProviderMetrics {
  profile_views: number;
  whatsapp_clicks: number;
  out_of_area_clicks: number;
  conversion_rate: number;
}

export interface HireItem {
  id: string;
  provider_id: string;
  provider_business_name: string;
  provider_category: string;
  hired_at: string;
  estimated_value: number | null;
  source_type: string;
  has_review: boolean;
  created_at: string;
}

export interface PaginatedHires {
  items: HireItem[];
  total: number;
  page: number;
  page_size: number;
}
