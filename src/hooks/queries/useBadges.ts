import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { badgeApi } from '../../api/badge.api';
import { trustScoreApi } from '../../api/verification.api';
import { useAuthStore } from '../../store/authStore';
import type {
  RepresentativeBadge,
  UserBadgesResponse,
  UserTrustScoreResponse,
} from '../../types/api.types';

export const useUserBadges = (userId: string | undefined) =>
  useQuery<UserBadgesResponse>({
    queryKey: ['badges', userId],
    queryFn: () => badgeApi.getUserBadges(userId as string).then((r) => r.data),
    enabled: !!userId,
  });

export const useUserTrustScore = (userId: string | undefined) =>
  useQuery<UserTrustScoreResponse>({
    queryKey: ['trustScore', userId],
    queryFn: () =>
      trustScoreApi.getUserTrustScore(userId as string).then((r) => r.data),
    enabled: !!userId,
  });

/**
 * 대표 뱃지 설정 mutation.
 *  - 성공 시 authStore의 user.representativeBadge 업데이트
 *  - 다른 화면(작성자 옆 표시 등)이 즉시 반영
 *  - null 전달하면 해제
 */
export const useSetRepresentativeBadge = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation<RepresentativeBadge | null, Error, string | null>({
    mutationFn: (type) =>
      badgeApi.setRepresentativeBadge({ type }).then((r) => r.data),
    onSuccess: (data) => {
      if (user) {
        setUser({ ...user, representativeBadge: data });
      }
      // 작성자 옆 InlineBadge가 다시 렌더되도록 관련 캐시 무효화
      void queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
};
