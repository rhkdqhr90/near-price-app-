import { apiClient } from './client';
import type { StoreResponse, CreateStoreDto, NearbyStoreResponse, StoreReviewResponse, PaginatedResponse, CreateStoreReviewDto } from '../types/api.types';

export const storeApi = {
  getAll: () =>
    apiClient.get<PaginatedResponse<StoreResponse>>('/store'),

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

  // 좌표 + 키워드 결합 검색. 자체 DB 에서 거리순으로 결과를 반환한다.
  searchNearby: (params: {
    lat: number;
    lng: number;
    keyword?: string;
    radius?: number;
    limit?: number;
  }) =>
    apiClient.get<NearbyStoreResponse[]>('/store/searchNearby', {
      params: {
        lat: params.lat,
        lng: params.lng,
        keyword: params.keyword,
        radius: params.radius ?? 5000,
        limit: params.limit ?? 30,
      },
    }),

  create: (dto: CreateStoreDto) =>
    apiClient.post<StoreResponse>('/store', dto),

  getReviews: (storeId: string, page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<StoreReviewResponse>>(`/store/${storeId}/reviews`, { params: { page, limit } }),

  addReview: (storeId: string, dto: CreateStoreReviewDto) =>
    apiClient.post<StoreReviewResponse>(`/store/${storeId}/reviews`, dto),
};
