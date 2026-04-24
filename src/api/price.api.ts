import { apiClient } from './client';
import type { PriceResponse, CreatePriceDto, UpdatePriceDto, PaginatedResponse, ProductPriceCard } from '../types/api.types';

export const priceApi = {
  getRecent: (
    page = 1,
    limit = 20,
    filter?: { latitude?: number; longitude?: number; radiusM?: number },
  ) =>
    apiClient.get<PaginatedResponse<ProductPriceCard>>('/price/recent', {
      params: {
        page,
        limit,
        ...(filter?.latitude != null ? { latitude: filter.latitude } : {}),
        ...(filter?.longitude != null ? { longitude: filter.longitude } : {}),
        ...(filter?.radiusM != null ? { radiusM: filter.radiusM } : {}),
      },
    }),

  getByStore: (storeId: string, page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<PriceResponse>>(`/price/store/${storeId}`, { params: { page, limit } }),

  getByProduct: (productId: string, page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<PriceResponse>>(`/price/product/${productId}`, { params: { page, limit } }),

  getByProductName: (name: string) =>
    apiClient.get<PriceResponse[]>('/price/by-name', { params: { name } }),

  getAll: () =>
    apiClient.get<PaginatedResponse<PriceResponse>>('/price'),

  getMy: () =>
    apiClient.get<PaginatedResponse<PriceResponse>>('/price/my'),

  getOne: (id: string) =>
    apiClient.get<PriceResponse>(`/price/${id}`),

  create: (dto: CreatePriceDto) =>
    apiClient.post<PriceResponse>('/price', dto),

  update: (id: string, dto: UpdatePriceDto) =>
    apiClient.patch<PriceResponse>(`/price/${id}`, dto),

  remove: (id: string) =>
    apiClient.delete(`/price/${id}`),
};
