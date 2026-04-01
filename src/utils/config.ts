import Config from 'react-native-config';

export const NAVER_MAP_CLIENT_ID = Config.NAVER_MAP_CLIENT_ID ?? '';
export const NAVER_MAPS_API_BASE = 'https://maps.apigw.ntruss.com';

// 백엔드 Base URL — .env의 API_BASE_URL
// 에뮬레이터: http://10.0.2.2:3000 / 실기기: http://<LAN_IP>:3000
export const API_BASE_URL =
  Config.API_BASE_URL ??
  (__DEV__ ? 'http://10.0.2.2:3000' : 'https://api.nearprice.kr');

export const APP_VERSION = '1.0.0';
