import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../../api/store.api';
import type { StoreResponse, StoreReviewResponse, PaginatedResponse, CreateStoreReviewDto } from '../../types/api.types';

export const storeKeys = {
  detail: (id: string) => ['store', id] as const,
  reviews: (id: string) => ['store', id, 'reviews'] as const,
};

export const useStoreDetail = (storeId: string) => {
  return useQuery<StoreResponse>({
    queryKey: storeKeys.detail(storeId),
    queryFn: () => storeApi.getOne(storeId).then((res) => res.data),
    enabled: storeId.length > 0,
  });
};

export const useStoreReviews = (storeId: string) => {
  return useQuery<PaginatedResponse<StoreReviewResponse>>({
    queryKey: storeKeys.reviews(storeId),
    queryFn: () => storeApi.getReviews(storeId).then((res) => res.data),
    enabled: storeId.length > 0,
  });
};

export const useAddStoreReview = (storeId: string) => {
  const queryClient = useQueryClient();
  return useMutation<StoreReviewResponse, Error, CreateStoreReviewDto>({
    mutationFn: (dto) => storeApi.addReview(storeId, dto).then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeKeys.reviews(storeId) });
    },
  });
};
