import { useQuery } from '@tanstack/react-query';
import { naverLocalApi, type NaverPlaceDocument } from '../../api/naver-local.api';
import { STALE_TIME } from '../../lib/queryClient';

export const useNaverPlaceSearch = (query: string, enabled: boolean, regionHint?: string) =>
  useQuery({
    queryKey: ['naverPlaceSearch', query, regionHint ?? ''],
    queryFn: () => naverLocalApi.searchKeyword(query, regionHint),
    enabled: enabled && query.length >= 2,
    staleTime: STALE_TIME.medium,
  });

export type { NaverPlaceDocument };
