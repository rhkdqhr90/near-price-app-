import Config from 'react-native-config';

const normalizeEnv = (value?: string): string => value?.replace(/^"|"$/g, '').trim() ?? '';

const DEPRECATED_API_HOSTS = new Set([
  'api.nearprice.kr',
  'api.near-price.kr',
]);

const FALLBACK_PROD_API_BASE_URL = 'https://api.bipanlife.com';

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

  // 과거/폐기 도메인으로 빌드된 앱에서 API 완전 불통이 발생해 운영 도메인으로 강제 폴백.
  if (DEPRECATED_API_HOSTS.has(parsed.host)) {
    return FALLBACK_PROD_API_BASE_URL;
  }

  return raw.replace(/\/+$/, '');
};

export const NAVER_MAP_CLIENT_ID = normalizeEnv(Config.NAVER_MAP_CLIENT_ID);
export const NAVER_MAPS_API_BASE = 'https://maps.apigw.ntruss.com';

export const API_BASE_URL = resolveApiBaseUrl();

// package.json의 version을 단일 소스로 사용 (gradle versionName과 동기화 필요)
export const APP_VERSION: string = require('../../package.json').version;
