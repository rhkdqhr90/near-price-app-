import { API_BASE_URL } from './config';

/**
 * 백엔드에서 내려온 이미지 URL을 현재 기기에서 접근 가능한 URL로 변환.
 * - 로컬/LAN 주소 (에뮬레이터 10.0.2.2, localhost, 192.168.x.x 등) → API_BASE_URL로 교체
 * - 상대 경로 → API_BASE_URL 앞에 붙이기
 * - 포트 없는 외부 CDN URL은 교체하지 않음
 */
export const fixImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (!url.startsWith('http')) {
    return `${API_BASE_URL}/${url.replace(/^\//, '')}`;
  }
  return url.replace(
    /https?:\/\/(?:localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):\d+/g,
    API_BASE_URL,
  );
};

export const formatPrice = (price: number | null | undefined): string => {
  if (price == null || isNaN(price) || !isFinite(price) || price < 0) return '-';
  return price.toLocaleString('ko-KR') + '원';
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Haversine formula — 두 좌표 간 거리(m) 반환.
 * 입력값이 하나라도 null/undefined이면 NaN을 반환. 호출부에서 isNaN 체크 필요.
 */
export const getDistanceM = (
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined,
): number => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return NaN;
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (meters: number): string => {
  if (isNaN(meters) || !isFinite(meters) || meters < 0) return '-';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return '방금 전';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(dateString);
};
