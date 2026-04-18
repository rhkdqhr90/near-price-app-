import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../../api/product.api';
import { STALE_TIME } from '../../lib/queryClient';
import type {
  ProductResponse,
  CreateProductDto,
  SearchProductResult,
} from '../../types/api.types';

export const productKeys = {
  all: ['products'] as const,
  search: (keyword: string) => ['products', 'search', keyword] as const,
  searchES: (keyword: string) => ['products', 'search', 'es', keyword] as const,
};

// DB 직접 조회 (기존 방식 — unitType 등 전체 필드 포함, ItemDetailScreen 등에서 사용)
export const useSearchProducts = (keyword: string) => {
  return useQuery<ProductResponse[]>({
    queryKey: productKeys.search(keyword),
    queryFn: () => productApi.getAll(keyword).then(res => res.data),
    enabled: keyword.trim().length > 0,
  });
};

// ES 검색 (SearchScreen에서 사용 — highlight 포함, staleTime 적용)
export const useSearchProductsES = (keyword: string) => {
  return useQuery<SearchProductResult[]>({
    queryKey: productKeys.searchES(keyword),
    queryFn: () =>
      productApi.searchProducts(keyword).then(res => res.data),
    enabled: keyword.trim().length > 0,
    staleTime: STALE_TIME.realtime,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductDto) =>
      productApi.create(dto).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};
