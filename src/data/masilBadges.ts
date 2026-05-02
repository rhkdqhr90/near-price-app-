/**
 * 마실 · 23개 레벨 뱃지 메타데이터.
 *
 * 디자인: Claude Design / Masil Badges.html
 * 5단계 티어 (브론즈 → 실버 → 골드 → 플래티넘 → 미식)
 *
 * - 뱃지 부여 조건은 백엔드 `BadgeEvaluator`가 판단.
 * - 화면(BadgeScreen / InlineBadge)은 이 메타데이터의 id/name/tier/desc/cond를 사용.
 * - 실제 SVG 일러스트 컴포넌트는 `components/badges/badges.tsx`에 별도 export.
 */
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'mythic';

export interface BadgeTierMeta {
  /** 한글 라벨 */
  kr: string;
  /** 영문 + 한줄 설명 */
  en: string;
  /** 한 문장 부가 설명 */
  desc: string;
  /** 칩(라벨) 배경색 */
  chipBg: string;
  /** 칩 텍스트색 */
  chipFg: string;
}

export const BADGE_TIER_ORDER: readonly BadgeTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'mythic',
] as const;

export const BADGE_TIER_META: Record<BadgeTier, BadgeTierMeta> = {
  bronze: {
    kr: '브론즈',
    en: 'COMMON · 입문',
    desc: '시작하는 모든 알뜰러',
    chipBg: '#FFEED9',
    chipFg: '#7A4A1F',
  },
  silver: {
    kr: '실버',
    en: 'RARE · 활동',
    desc: '꾸준한 발품의 증명',
    chipBg: '#E5E9EF',
    chipFg: '#5B6573',
  },
  gold: {
    kr: '골드',
    en: 'EPIC · 숙련',
    desc: '신뢰받는 등록자',
    chipBg: '#FFF0BB',
    chipFg: '#9D6F0E',
  },
  platinum: {
    kr: '플래티넘',
    en: 'LEGENDARY · 헌신',
    desc: '동네의 자랑',
    chipBg: '#EDE3FF',
    chipFg: '#5B3FB0',
  },
  mythic: {
    kr: '미식',
    en: 'MYTHIC · 전설',
    desc: '오직 소수만이 도달',
    chipBg: '#FFD4E0',
    chipFg: '#B0205E',
  },
};

/** 뱃지 정의 — 백엔드 `BadgeDefinition.id`(string)와 1:1 매칭 */
export interface MasilBadgeMeta {
  /** 백엔드 BadgeDefinition.id (`masil_1` ~ `masil_23`) */
  type: string;
  /** 디자인 시안의 1~23 번호 */
  num: number;
  tier: BadgeTier;
  name: string;
  desc: string;
  /** 획득 조건 한 줄 표시 */
  cond: string;
}

export const MASIL_BADGES: readonly MasilBadgeMeta[] = [
  // bronze
  { type: 'masil_1',  num: 1,  tier: 'bronze',   name: '새내기 복돌이',   desc: '마실에 첫 발을 디딘 당신',     cond: '회원가입 완료' },
  { type: 'masil_2',  num: 2,  tier: 'bronze',   name: '첫 거래',         desc: '첫 가격 등록 성공',            cond: '가격 등록 1건' },
  { type: 'masil_3',  num: 3,  tier: 'bronze',   name: '동네탐방',         desc: '발품 파는 알뜰러',             cond: '매장 5곳 방문' },
  { type: 'masil_4',  num: 4,  tier: 'bronze',   name: '영수증 마스터',   desc: '영수증을 모으는 재미',         cond: '영수증 10장 등록' },
  // silver
  { type: 'masil_5',  num: 5,  tier: 'silver',   name: '알뜰 사냥꾼',     desc: '최저가를 잘 잡는다',           cond: '최저가 발견 10건' },
  { type: 'masil_6',  num: 6,  tier: 'silver',   name: '카메라맨',         desc: '찰칵, OCR 장인',               cond: 'OCR 등록 30건' },
  { type: 'masil_7',  num: 7,  tier: 'silver',   name: '골목대장',         desc: '동네에서 1위',                 cond: '동네 등록 1위' },
  { type: 'masil_8',  num: 8,  tier: 'silver',   name: '시세 박사',       desc: '가격을 꿰뚫는다',              cond: '품목 30개 추적' },
  // gold
  { type: 'masil_9',  num: 9,  tier: 'gold',     name: '황금 영수증',     desc: '백 장의 헌신',                 cond: '가격 등록 100건' },
  { type: 'masil_10', num: 10, tier: 'gold',     name: '시장의 등불',     desc: '이웃에게 길을 비춘다',         cond: '채택률 80% 이상' },
  { type: 'masil_11', num: 11, tier: 'gold',     name: '신뢰의 인장',     desc: '믿고 보는 등록자',             cond: '정확도 95% 이상' },
  { type: 'masil_16', num: 16, tier: 'gold',     name: '황금 저울',       desc: '정직한 가격을 헤아리다',       cond: '가격 비교 1,000회' },
  { type: 'masil_17', num: 17, tier: 'gold',     name: '시장의 학자',     desc: '시세의 흐름을 기록하는 자',    cond: '연속 365일 활동' },
  // platinum
  { type: 'masil_12', num: 12, tier: 'platinum', name: '전단지 마스터',   desc: '오늘의 전단을 지켜내다',       cond: '전단지 50개 공유' },
  { type: 'masil_13', num: 13, tier: 'platinum', name: '동네 전설',       desc: '백만원의 절약',                cond: '누적 절약 100만원' },
  { type: 'masil_18', num: 18, tier: 'platinum', name: '매장 정복자',     desc: '온 동네를 발로 뛴다',          cond: '매장 100곳 방문' },
  { type: 'masil_19', num: 19, tier: 'platinum', name: '시간의 증인',     desc: '마실의 첫 해를 함께한 자',     cond: '1주년 + 활동 유지' },
  { type: 'masil_20', num: 20, tier: 'platinum', name: '가격 예언자',     desc: '내일의 가격을 본다',           cond: '예측 정확도 90%' },
  // mythic
  { type: 'masil_14', num: 14, tier: 'mythic',   name: '만석꾼 복돌이',   desc: '복이 넘쳐 흐른다',             cond: '1만 포인트 달성' },
  { type: 'masil_15', num: 15, tier: 'mythic',   name: '수호신 복돌이',   desc: '마실의 수호자',                cond: '1주년 + 14뱃지 완성' },
  { type: 'masil_21', num: 21, tier: 'mythic',   name: '봉황 복돌이',     desc: '천만원을 절약한 불사조',       cond: '누적 절약 1,000만원' },
  { type: 'masil_22', num: 22, tier: 'mythic',   name: '황금 도깨비',     desc: '도깨비도 인정한 알뜰함',       cond: '가격 등록 1,000건' },
  { type: 'masil_23', num: 23, tier: 'mythic',   name: '마실의 신',       desc: '오직 한 명, 마실의 정점',      cond: '전체 뱃지 + 채택 1만' },
];

/** id로 메타데이터 조회 */
export const findBadgeMeta = (type: string): MasilBadgeMeta | undefined =>
  MASIL_BADGES.find((b) => b.type === type);

/**
 * 보유 뱃지들 중 "최고 등급" 뱃지를 반환. 사용자가 대표 뱃지를 선택하지 않은 경우의 폴백.
 * 티어 순서(bronze<silver<gold<platinum<mythic) → 같은 티어면 num 큰 순.
 */
export const pickHighestBadge = (
  earnedTypes: readonly string[],
): MasilBadgeMeta | null => {
  let best: MasilBadgeMeta | null = null;
  for (const type of earnedTypes) {
    const meta = findBadgeMeta(type);
    if (!meta) continue;
    if (!best) {
      best = meta;
      continue;
    }
    const a = BADGE_TIER_ORDER.indexOf(meta.tier);
    const b = BADGE_TIER_ORDER.indexOf(best.tier);
    if (a > b || (a === b && meta.num > best.num)) {
      best = meta;
    }
  }
  return best;
};
