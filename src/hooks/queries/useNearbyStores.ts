import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../../api/store.api';
import { STALE_TIME } from '../../lib/queryClient';
import type { NearbyStoreResponse } from '../../types/api.types';

export const storeSearchKeys = {
  nearby: (lat: number, lng: number, radius: number) =>
    ['stores', 'nearby', lat, lng, radius] as const,
};

export const useNearbyStores = (
  latitude: number | null,
  longitude: number | null,
  radius?: number,
) => {
  const effectiveRadius = radius ?? 3000;
  return useQuery<NearbyStoreResponse[]>({
    queryKey: storeSearchKeys.nearby(latitude ?? 0, longitude ?? 0, effectiveRadius),
    queryFn: async () => {
      if (latitude === null || longitude === null) return [];
      const res = await storeApi.getNearby(latitude, longitude, effectiveRadius);
      return res.data;
    },
    enabled: latitude !== null && longitude !== null,
    staleTime: STALE_TIME.medium,
  });
};
