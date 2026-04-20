import type { StoreType } from '../types/api.types';
import { storeCategoryColors, type StoreCategoryKey } from '../theme/colors';

/** StoreType → 한글 2글자 라벨 (카테고리 뱃지 표시용) */
export const getStoreCategoryLabel = (type: StoreType): string => {
  switch (type) {
    case 'convenience':        return '편의';
    case 'traditional_market': return '시장';
    case 'supermarket':        return '슈퍼';
    case 'large_mart':         return '대형';
    case 'mart':               return '마트';
    default:                   return '기타';
  }
};

/** StoreType → 카테고리 컬러 (뱃지 bg/fg, 지도 핀 색상) */
export const getStoreCategoryColors = (
  type: StoreType,
): (typeof storeCategoryColors)[StoreCategoryKey] => {
  if (type in storeCategoryColors) {
    return storeCategoryColors[type as StoreCategoryKey];
  }
  return storeCategoryColors.mart;
};

/** 거리(m) → 사람 친화적 표기 (e.g. 320m / 1.2km) */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
};

/** 거리(m) → 도보 예상 분수 (67m/min 기준) */
export const formatWalkTime = (meters: number): string => {
  const min = Math.max(1, Math.round(meters / 67));
  return `도보 ${min}분`;
};
