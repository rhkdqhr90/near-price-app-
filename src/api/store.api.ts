import { apiClient } from './client';
import type { StoreResponse, CreateStoreDto, NearbyStoreResponse, StoreReviewResponse, PaginatedResponse, CreateStoreReviewDto } from '../types/api.types';

export const storeApi = {
  getAll: () =>
    apiClient.get<StoreResponse[]>('/store'),

  getOne: (id: string) =>
    apiClient.get<StoreResponse>(`/store/${id}`),

  getByExternalId: (externalPlaceId: string) =>
    apiClient.get<StoreResponse>(`/store/by-external/${externalPlaceId}`),

  getNearby: (lat: number, lng: number, radius?: number) =>
    apiClient.get<NearbyStoreResponse[]>('/store/nearby', {
      params: { lat, lng, radius: radius ?? 3000 },
    }),

  searchByName: (name: string) =>
    apiClient.get<StoreResponse[]>('/store/search', { params: { name } }),

  create: (dto: CreateStoreDto) =>
    apiClient.post<StoreResponse>('/store', dto),

  getReviews: (storeId: string, page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<StoreReviewResponse>>(`/store/${storeId}/reviews`, { params: { page, limit } }),

  addReview: (storeId: string, dto: CreateStoreReviewDto) =>
    apiClient.post<StoreReviewResponse>(`/store/${storeId}/reviews`, dto),
};
