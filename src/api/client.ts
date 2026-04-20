import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useNetworkStore } from '../store/networkStore';
import { API_BASE_URL } from '../utils/config';
import { queryClient } from '../lib/queryClient';
import { AUTH_ENDPOINTS } from './constants';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export { isAxiosError, isCancel } from 'axios';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 동시 401 발생 시 단일 refresh만 실행하도록 Promise 공유
// 주의: refresh 응답 body에는 accessToken/refreshToken이 포함되므로 절대 로깅 금지
let refreshPromise: Promise<string> | null = null;

const performTokenRefresh = async (): Promise<string> => {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('리프레시 토큰이 없습니다.');
  }
  const res = await axios.post<{
    accessToken: string;
    refreshToken: string;
  }>(`${API_BASE_URL}${AUTH_ENDPOINTS.REFRESH}`, { refreshToken }, { timeout: 10000 });
  const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
  setTokens(newAccess, newRefresh);
  // 토큰 갱신 성공 후 개인정보 포함 쿼리만 무효화 (전체 무효화 시 불필요한 API 폭풍 발생)
  // 키 출처: wishlistKeys.mine, priceKeys.mine (순환 의존 방지 위해 문자열 리터럴 사용)
  void queryClient.invalidateQueries({ queryKey: ['wishlists', 'me'] });
  void queryClient.invalidateQueries({ queryKey: ['prices', 'my'] });
  return newAccess;
};

apiClient.interceptors.response.use(
  (response) => {
    // 요청 성공 → 오프라인 상태 해제
    useNetworkStore.getState().setOffline(false);
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    // 네트워크 에러 감지 (서버 응답 없음 = 네트워크 문제)
    if (
      !error.response &&
      error.code !== 'ERR_CANCELED' &&
      error.code !== 'ECONNABORTED'
    ) {
      useNetworkStore.getState().setOffline(true);
    }

    const config = error.config as RetryConfig;

    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;

      const { refreshToken, logout } = useAuthStore.getState();
      if (!refreshToken) {
        queryClient.clear();
        logout();
        return Promise.reject(error);
      }

      // 단일 refresh promise를 공유해 동시 401을 하나의 갱신 요청으로 합침
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newAccess = await refreshPromise;
        config.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(config);
      } catch (err) {
        queryClient.clear();
        logout();
        return Promise.reject(err);
      }
    }

    // 403 = 토큰 폐기/계정 정지 → 즉시 로그아웃 (재시도 없음).
    // 백엔드의 AdminGuard 엔드포인트(관리자 쓰기 API)는 일반 앱 플로우에서 호출하지 않는다.
    // 만약 향후 일반 유저가 도달 가능한 403 응답이 생기면 body.code로 분기 필요.
    if (error.response?.status === 403) {
      const { logout } = useAuthStore.getState();
      queryClient.clear();
      logout();
    }

    return Promise.reject(error);
  },
);
