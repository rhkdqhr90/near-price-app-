import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationApi } from '../../api/verification.api';
import { priceKeys } from './usePrices';
import { useAuthStore } from '../../store/authStore';
import type {
  VerificationListResponse,
  MyVerificationsResponse,
  CreateVerificationDto,
  VerificationResponse,
} from '../../types/api.types';

export const verificationKeys = {
  detail: (priceId: string) => ['verifications', priceId] as const,
  mine: ['verifications', 'my'] as const,
};

/**
 * 특정 가격의 검증 목록 조회
 */
export const useVerifications = (priceId: string) =>
  useQuery<VerificationListResponse>({
    queryKey: verificationKeys.detail(priceId),
    queryFn: () =>
      verificationApi.getVerifications(priceId, 1, 5).then((res) => res.data),
    enabled: !!priceId,
  });

/**
 * 내가 검증한 가격 목록 조회
 */
export const useMyVerifications = () => {
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);
  return useQuery<MyVerificationsResponse>({
    queryKey: verificationKeys.mine,
    queryFn: () => verificationApi.getMyVerifications().then((res) => res.data),
    enabled: isLoggedIn,
  });
};

/**
 * 가격 검증 생성 (맞아요/달라요)
 */
export const useVerifyPrice = (priceId: string) => {
  const queryClient = useQueryClient();
  return useMutation<VerificationResponse, Error, CreateVerificationDto>({
    mutationFn: (dto: CreateVerificationDto) =>
      verificationApi.createVerification(priceId, dto).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: verificationKeys.detail(priceId),
      });
      // 가격 정보도 갱신
      queryClient.invalidateQueries({
        queryKey: priceKeys.detail(priceId),
      });
      // 내가 인정한 가격 목록 갱신
      queryClient.invalidateQueries({
        queryKey: verificationKeys.mine,
      });
    },
  });
};
