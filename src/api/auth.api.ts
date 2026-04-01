import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { apiClient } from './client';
import type { AuthTokens, KakaoLoginDto, RefreshTokenResponse } from '../types/api.types';
import { AUTH_ENDPOINTS } from './constants';

export const authApi = {
  kakaoLogin: (dto: KakaoLoginDto) =>
    apiClient.post<AuthTokens>('/auth/kakao', dto),

  logout: () => apiClient.post<void>('/auth/logout'),
};

// apiClient를 사용하면 client → authStore → auth.api → client 순환 참조 발생.
// restoreAuth / 인터셉터에서 호출하는 refresh는 raw axios 직접 호출이 의도적인 설계.
export const refreshTokens = (refreshToken: string) =>
  axios.post<RefreshTokenResponse>(
    `${API_BASE_URL}${AUTH_ENDPOINTS.REFRESH}`,
    { refreshToken },
    { timeout: 10000 },
  );
