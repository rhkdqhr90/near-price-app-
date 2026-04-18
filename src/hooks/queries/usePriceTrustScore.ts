import { useQuery } from '@tanstack/react-query';
import { verificationApi } from '../../api/verification.api';
import { STALE_TIME } from '../../lib/queryClient';
import type { PriceTrustScoreResponse } from '../../types/api.types';

export const priceTrustScoreKeys = {
  detail: (priceId: string) => ['priceTrustScore', priceId] as const,
};

/**
 * 특정 가격의 신뢰도 점수 및 상태 조회
 */
export const usePriceTrustScore = (priceId: string) =>
  useQuery<PriceTrustScoreResponse>({
    queryKey: priceTrustScoreKeys.detail(priceId),
    queryFn: () =>
      verificationApi.getPriceTrustScore(priceId).then((res) => res.data),
    enabled: !!priceId,
    staleTime: STALE_TIME.realtime,
  });
