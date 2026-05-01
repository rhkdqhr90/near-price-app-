import { API_BASE_URL } from './config';

const API_BASE = API_BASE_URL.replace(/\/+$/, '');
const INVALID_URL_LITERALS = new Set(['null', 'undefined', 'nan', 'none', 'n/a']);

/**
 * 백엔드에서 내려온 이미지 URL을 현재 기기에서 접근 가능한 URL로 변환.
 * - 로컬/LAN 주소 (에뮬레이터 10.0.2.2, localhost, 192.168.x.x 등) → API_BASE_URL로 교체
 * - 상대 경로 → API_BASE_URL 앞에 붙이기
 * - 포트 없는 외부 CDN URL은 교체하지 않음
 *
 * TODO(운영 전 제거 대상): DB에 개발 환경 URL(localhost/LAN)이 섞여 저장된 과거 데이터를
 * 보정하기 위한 임시 처치. 운영 데이터는 모두 CloudFront 절대 URL로 정규화되어 있으므로
 * 이 함수가 실제로 rewrite를 수행하는 건 dev 환경 잔존 데이터뿐이다.
 *   해제 조건:
 *   1) 백엔드 normalizeImageUrl이 항상 CloudFront 절대 URL만 반환함을 확인
 *   2) 운영 DB에서 dev URL을 가진 row를 정리(또는 imageUrl null 처리)
 *   3) QA에서 fixImageUrl 호출 없이 모든 이미지 정상 표시 확인
 * 위 3개 충족 후 이 함수 삭제 + 호출부를 item.imageUrl 직접 사용으로 교체할 것.
 */
export const fixImageUrl = (url: string | null | undefined): string | null => {
  if (url == null) return null;

  const raw = String(url).trim();
  if (!raw) return null;
  if (INVALID_URL_LITERALS.has(raw.toLowerCase())) return null;

  const normalizedSlashes = raw.replace(/\\/g, '/');
  const withScheme = normalizedSlashes.startsWith('//')
    ? `https:${normalizedSlashes}`
    : normalizedSlashes;

  if (!/^https?:\/\//i.test(withScheme)) {
    return `${API_BASE}/${withScheme.replace(/^\/+/, '')}`;
  }

  const normalized = withScheme.replace(
    /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|0\.0\.0\.0|host\.docker\.internal)(?::\d+)?/i,
    API_BASE,
  );

  // Android cleartext 정책으로 외부 http 이미지는 로드 실패할 수 있어 https로 승격
  if (/^http:\/\//i.test(normalized) && !normalized.startsWith(API_BASE)) {
    return normalized.replace(/^http:\/\//i, 'https://');
  }

  return normalized;
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
