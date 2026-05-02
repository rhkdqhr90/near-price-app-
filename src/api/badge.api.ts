import { apiClient } from './client';
import type {
  RepresentativeBadge,
  SetRepresentativeBadgeDto,
  UserBadgesResponse,
} from '../types/api.types';

export const badgeApi = {
  /** 사용자의 뱃지 목록 조회 (획득한 뱃지 + 진행 중인 뱃지) */
  getUserBadges: (userId: string) =>
    apiClient.get<UserBadgesResponse>(`/users/${userId}/badges`),

  /**
   * 대표 뱃지 설정/해제. type=null이면 해제.
   * 본인만 호출 가능. 보유한 뱃지가 아니면 백엔드에서 400 반환.
   */
  setRepresentativeBadge: (dto: SetRepresentativeBadgeDto) =>
    apiClient.patch<RepresentativeBadge | null>(
      '/users/me/representative-badge',
      dto,
    ),
};
