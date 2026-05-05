import { vworldApi } from './vworld.api';
import { naverMapsApi } from './naver-maps.api';

// LocationSetupScreen 주소 검색 결과 형식
export interface NaverGeocodeResult {
  roadAddress: string;
  jibunAddress: string;
  x: string; // longitude
  y: string; // latitude
}

// 매장 키워드 검색은 Naver Local Search API 의 5건 한계 + 위치 미지원 때문에 자체 DB 검색
// (storeApi.searchNearby) 으로 전환했다. 좌표→동 변환과 주소→좌표 변환만 여기 남는다.

export const naverLocalApi = {
  // 역지오코딩: 좌표 → 동 이름 변환
  // 1순위: Naver Reverse Geocoding (NCP Maps API)
  // 2순위: Vworld (국토교통부, 심사 불필요)
  coord2Region: async (longitude: number, latitude: number): Promise<string | null> => {
    try {
      const res = await naverMapsApi.reverseGeocode(longitude, latitude);
      const result = res.data.results?.[0];
      const area3 = result?.region?.area3?.name;
      const area2 = result?.region?.area2?.name;
      if (area3) return area2 ? `${area2} ${area3}` : area3;
      throw new Error('no region data');
    } catch {
      // Naver 실패 시 Vworld 폴백
      try {
        return await vworldApi.reverseGeocode(longitude, latitude);
      } catch {
        return null;
      }
    }
  },

  // 주소/동 이름 검색: 텍스트 → 좌표 목록 (Naver Geocoding API)
  // roadAddress: 목록 표시용 전체 주소 / jibunAddress: 저장용 지번 주소
  searchAddress: async (query: string): Promise<NaverGeocodeResult[]> => {
    const res = await naverMapsApi.geocode(query);
    return (res.data.addresses ?? [])
      .filter(item => item.x && item.y) // Naver API는 좌표 없는 결과를 빈 문자열로 반환할 수 있음
      .map(item => ({
        roadAddress: item.roadAddress,
        jibunAddress: item.jibunAddress,
        x: item.x,
        y: item.y,
      }));
  },

};
