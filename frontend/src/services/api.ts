import axios from 'axios';
import type {
  ProviderDetail,
  PaginatedProviders,
  Review,
  ReviewDetail,
  ProviderMetrics,
  PaginatedHires,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Dev-only: avatar placeholder
// ---------------------------------------------------------------------------

let carlosSilvaImg = '';

if (import.meta.env.DEV) {
  const { default: img } = await import('@/assets/carlos_silva.png');
  carlosSilvaImg = img as string;
}

function getMockImageUrl(id: string): string {
  return id === '00000000-0000-0000-0000-000000000004'
    ? carlosSilvaImg
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop';
}

export type ProviderDetailExtended = ProviderDetail & { image_url: string };

// ---------------------------------------------------------------------------
// API service
// ---------------------------------------------------------------------------

export const apiService = {
  // --- Providers ---

  async searchProviders(
    params: {
      lat: number;
      lng: number;
      radius_km: number;
      category?: string;
      page?: number;
      page_size?: number;
    },
    signal?: AbortSignal
  ): Promise<PaginatedProviders> {
    const response = await apiClient.get<PaginatedProviders>('/providers', {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius_km: params.radius_km,
        category: params.category || undefined,
        page: params.page || 1,
        page_size: params.page_size || 20,
      },
      signal,
    });
    return response.data;
  },

  async getProvider(
    id: string,
    viewerLat?: number,
    viewerLng?: number
  ): Promise<ProviderDetailExtended> {
    const params: Record<string, number> = {};
    if (viewerLat !== undefined) params.lat = viewerLat;
    if (viewerLng !== undefined) params.lng = viewerLng;
    const response = await apiClient.get<ProviderDetail>(`/providers/${id}`, {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return { ...response.data, image_url: getMockImageUrl(id) };
  },

  async getProviderMeDetails(): Promise<ProviderDetailExtended> {
    const response = await apiClient.get<ProviderDetail>('/providers/me');
    return { ...response.data, image_url: getMockImageUrl(response.data.id) };
  },

  async getProviderMetrics(): Promise<ProviderMetrics> {
    const response = await apiClient.get<ProviderMetrics>('/providers/me/metrics');
    return response.data;
  },

  async recordProviderEvent(
    providerId: string,
    data: { event_type: 'WHATSAPP_CLICK'; out_of_area: boolean }
  ): Promise<void> {
    await apiClient.post(`/providers/${providerId}/events`, data);
  },

  // --- Reviews ---

  async createReview(data: {
    provider_id: string;
    rating: number;
    comment?: string;
    verified_hire?: boolean;
  }): Promise<Review> {
    const response = await apiClient.post<Review>('/reviews', data);
    return response.data;
  },

  async respondToReview(reviewId: string, response: string): Promise<ReviewDetail> {
    const res = await apiClient.patch<ReviewDetail>(`/reviews/${reviewId}/response`, {
      response,
    });
    return res.data;
  },

  // --- Hires ---

  async createHire(data: {
    provider_id: string;
    estimated_value?: number | null;
  }): Promise<void> {
    await apiClient.post('/residents/hires', data);
  },

  async listHires(params?: { page?: number; limit?: number }): Promise<PaginatedHires> {
    const response = await apiClient.get<PaginatedHires>('/residents/hires', {
      params: { page: params?.page ?? 1, limit: params?.limit ?? 20 },
    });
    return response.data;
  },

  // --- Auth ---

  async getProfileMe(): Promise<unknown> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async registerProfile(data: {
    user_type: 'morador' | 'prestador';
    full_name: string;
    cpf: string;
    phone?: string;
    business_name?: string;
    category?: string;
    description?: string;
    center_lat?: number;
    center_lng?: number;
    radius_km?: number;
    contact_whatsapp?: string;
    experience_years?: number;
    services?: string[];
  }): Promise<unknown> {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  async updateProviderMe(data: {
    business_name?: string;
    category?: string;
    description?: string;
    center_lat?: number;
    center_lng?: number;
    radius_km?: number;
    contact_whatsapp?: string;
    experience_years?: number;
    services?: string[];
  }): Promise<unknown> {
    const response = await apiClient.patch('/providers/me', data);
    return response.data;
  },
};
