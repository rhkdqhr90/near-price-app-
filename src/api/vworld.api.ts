import { apiClient } from './client';

// Vworld Geocoder API 2.0 — 국토교통부 공공 역지오코딩
// 백엔드 /naver/vworld-geocode 프록시 경유
// https://www.vworld.kr/dev/v4dv_geocoderguide2_s001.do

interface VworldAddressResult {
  text: string; // 전체 주소 (예: "경기도 수원시 영통구 매탄동 123-4")
  type?: string;
  zipcode?: string;
}

interface VworldAddressResponse {
  response: {
    status: string; // "OK" | "NOT_FOUND" | "ERROR"
    result?: VworldAddressResult[];
  };
}

/**
 * Vworld 좌표 역지오코딩: 경도/위도 → "구 동" 형식 문자열
 * - 백엔드 /naver/vworld-geocode 프록시 경유
 * - 지번 주소(PARCEL)에서 시/구/동 추출
 */
export const vworldApi = {
  reverseGeocode: async (longitude: number, latitude: number): Promise<string | null> => {
    const res = await apiClient.get<VworldAddressResponse>(
      '/naver/vworld-geocode',
      {
        params: { lat: latitude, lng: longitude },
      },
    );

    const { status, result } = res.data.response;

    if (status === 'ERROR') {
      throw new Error('[vworldApi] API returned ERROR status');
    }

    if (status === 'NOT_FOUND' || !result || result.length === 0) {
      return null;
    }

    // result[0].text = "경기도 수원시 영통구 매탄동 123-4" 같은 형태
    const fullAddress = result[0]?.text;
    if (!fullAddress || fullAddress.trim() === '') return null;

    // 주소에서 "구 동" 또는 "시 동" 추출
    const parts = fullAddress.split(' ').map(p => p.trim()).filter(Boolean);
    // parts 예: ["경기도", "수원시", "영통구", "매탄동", "123-4"]

    // 동/읍/면 찾기 (끝이 동/읍/면/리로 끝나는 파트)
    const dongIdx = parts.findIndex(p =>
      p.endsWith('동') || p.endsWith('읍') || p.endsWith('면') || p.endsWith('리'),
    );

    if (dongIdx >= 0) {
      const dong = parts[dongIdx];
      // 동 앞의 구/군 찾기
      const guIdx = parts.findIndex(p => p.endsWith('구') || p.endsWith('군'));
      if (guIdx >= 0 && guIdx < dongIdx) {
        return `${parts[guIdx]} ${dong}`;
      }
      // 구가 없으면 시 + 동
      const siIdx = parts.findIndex(p => p.endsWith('시'));
      if (siIdx >= 0 && siIdx < dongIdx) {
        return `${parts[siIdx]} ${dong}`;
      }
      return dong;
    }

    // 동을 못 찾으면 구 반환
    const guPart = parts.find(p => p.endsWith('구') || p.endsWith('군'));
    if (guPart) {
      const siPart = parts.find(p => p.endsWith('시'));
      if (siPart) return `${siPart} ${guPart}`;
      return guPart;
    }

    // 최소한 시라도 반환
    const siPart = parts.find(p => p.endsWith('시'));
    if (siPart) return siPart;

    return null;
  },

  /** 전체 주소 반환 (매장 등록용) — "서울특별시 용산구 후암동 142-57" */
  reverseGeocodeFullAddress: async (longitude: number, latitude: number): Promise<string | null> => {
    const res = await apiClient.get<VworldAddressResponse>(
      '/naver/vworld-geocode',
      {
        params: { lat: latitude, lng: longitude },
      },
    );
    const { status, result } = res.data.response;
    if (status === 'ERROR') {
      throw new Error('[vworldApi] API returned ERROR status');
    }
    if (status === 'NOT_FOUND' || !result || result.length === 0) return null;
    return result[0].text || null;
  },
};
