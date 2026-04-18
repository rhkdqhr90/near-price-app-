import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { naverLocalApi, type NaverGeocodeResult } from '../../api/naver-local.api';
import { STALE_TIME } from '../../lib/queryClient';

export const locationKeys = {
  region: (lng: number | null, lat: number | null) => ['location', 'region', lng, lat] as const,
  geocode: (query: string) => ['location', 'geocode', query] as const,
};

// Vworld/카카오 역지오코딩: 좌표 → 동 이름
export const useReverseGeocode = (longitude: number | null, latitude: number | null) => {
  const queryClient = useQueryClient();

  // queryKey를 useMemo로 안정화 — 값이 같으면 같은 참조 유지
  const queryKey = useMemo(
    () => locationKeys.region(longitude, latitude),
    [longitude, latitude],
  );

  const result = useQuery({
    queryKey,
    queryFn: async () => {
      if (longitude === null || latitude === null) return null;
      return naverLocalApi.coord2Region(longitude, latitude);
    },
    enabled: longitude !== null && latitude !== null,
    staleTime: STALE_TIME.long,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
  });

  // 캐시 무효화 후 재요청 (GPS 버튼 재탭 시 사용)
  const invalidateAndRefetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return { ...result, invalidateAndRefetch };
};

// Nominatim 주소 검색: 텍스트 → NaverGeocodeResult[]
export const useGeocodeSearch = (query: string) => {
  return useQuery({
    queryKey: locationKeys.geocode(query),
    queryFn: (): Promise<NaverGeocodeResult[]> => naverLocalApi.searchAddress(query),
    enabled: query.length >= 2,
    staleTime: STALE_TIME.medium,
  });
};
