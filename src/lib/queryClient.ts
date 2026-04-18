import { QueryClient } from '@tanstack/react-query';

// staleTime 정책 — 각 쿼리는 데이터 변동성에 맞춰 아래 상수 중 하나를 참조한다.
export const STALE_TIME = {
  realtime: 30_000, // 실시간성 (검증 점수, 상품 목록 등)
  short: 60_000, // 단기 (최근 가격, 문의)
  medium: 1000 * 60 * 5, // 일반 (매장 검색, 알림 설정) — 기본값
  long: 1000 * 60 * 10, // 장기 (위치/동네 정보)
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: STALE_TIME.medium,
    },
  },
});
