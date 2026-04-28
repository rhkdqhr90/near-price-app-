import Config from 'react-native-config';

const normalizeEnv = (value?: string): string => value?.replace(/^"|"$/g, '').trim() ?? '';

// 폐기된 운영 도메인. 잘못된 빌드를 조용히 폴백시키지 않고 fail-fast로 즉시 빌드 오류를 드러낸다.
// (정식 출시 후엔 잘못된 환경 설정을 숨기는 폴백이 더 위험)
const DEPRECATED_API_HOSTS = new Set([
  'api.nearprice.kr',
  'api.near-price.kr',
]);

const resolveApiBaseUrl = (): string => {
  const raw = normalizeEnv(Config.API_BASE_URL);
  if (!raw) {
    throw new Error('API_BASE_URL is missing for this build variant.');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('API_BASE_URL is invalid. Expected absolute URL.');
  }

  if (DEPRECATED_API_HOSTS.has(parsed.host)) {
    throw new Error(
      `API_BASE_URL points to a deprecated host (${parsed.host}). Update the build environment to the current production host.`,
    );
  }

  return raw.replace(/\/+$/, '');
};

export const NAVER_MAP_CLIENT_ID = normalizeEnv(Config.NAVER_MAP_CLIENT_ID);
export const NAVER_MAPS_API_BASE = 'https://maps.apigw.ntruss.com';

export const API_BASE_URL = resolveApiBaseUrl();

// package.json의 version을 단일 소스로 사용 (gradle versionName과 동기화 필요)
export const APP_VERSION: string = require('../../package.json').version;
