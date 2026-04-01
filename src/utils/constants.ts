// 기본 좌표 — 위치 권한 거부 시 서울 중심 좌표를 초기값으로 사용
export const DEFAULT_LATITUDE = 37.5665;
export const DEFAULT_LONGITUDE = 126.978;

export const POPULAR_TAGS = ['양파', '계란', '삼겹살', '대파', '사과', '두부'] as const;

// 전단지 배너 - 전단지 데이터 없을 때 표시할 기본 매장명
export const DEFAULT_FLYER_STORE_NAME = '마실 동네마트';

export const AD_BANNER_PLACEHOLDER = {
  storeName: '이마트 광교점',
  info: '이번 주 채소 특가 최대 40%',
} as const;

export const STORE_TYPE_LABELS: Record<string, string> = {
  large_mart: '대형마트',
  mart: '마트',
  supermarket: '슈퍼마켓',
  convenience: '편의점',
  traditional_market: '전통시장',
};
