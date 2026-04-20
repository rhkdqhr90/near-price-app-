import { apiClient } from './client';
import type {
  CreateVerificationDto,
  VerificationResponse,
  VerificationListResponse,
  MyVerificationsResponse,
  MyVerificationByPriceResponse,
  PriceTrustScoreResponse,
  UserTrustScoreResponse,
} from '../types/api.types';

export const verificationApi = {
  /**
   * 가격 검증 생성 (맞아요/달라요)
   */
  createVerification: (priceId: string, dto: CreateVerificationDto) =>
    apiClient.post<VerificationResponse>(
      `/prices/${priceId}/verifications`,
      dto,
    ),

  /**
   * 특정 가격의 검증 목록 조회
   */
  getVerifications: (priceId: string, page = 1, limit = 10) =>
    apiClient.get<VerificationListResponse>(
      `/prices/${priceId}/verifications`,
      { params: { page, limit } },
    ),

  /**
   * 내가 검증한 가격 목록 조회
   */
  getMyVerifications: (page = 1, limit = 20) =>
    apiClient.get<MyVerificationsResponse>(
      '/prices/my/verifications',
      { params: { page, limit } },
    ),

  /**
   * 특정 가격에 대해 내가 남긴 검증 1건 조회
   */
  getMyVerificationByPrice: (priceId: string) =>
    apiClient.get<MyVerificationByPriceResponse | null>(
      `/prices/${priceId}/verifications/me`,
    ),

  /**
   * 특정 가격의 신뢰도 점수 조회
   */
  getPriceTrustScore: (priceId: string) =>
    apiClient.get<PriceTrustScoreResponse>(
      `/prices/${priceId}/trust-score`,
    ),
};

export const trustScoreApi = {
  /**
   * 사용자 신뢰도 조회
   */
  getUserTrustScore: (userId: string) =>
    apiClient.get<UserTrustScoreResponse>(
      `/users/${userId}/trust-score`,
    ),
};
