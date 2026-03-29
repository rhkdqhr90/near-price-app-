import { create } from 'zustand';
import { storage, secureTokenStorage, STORAGE_KEYS } from '../utils/storage';
import { refreshTokens } from '../api/auth.api';
import type { AuthTokens } from '../types/api.types';

// base64url → UTF-8 문자열 수동 디코딩 (서드파티/DOM API 미사용)
function decodeBase64Url(base64url: string): string {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < padded.length; i++) {
    const ch = padded[i];
    if (ch === '=') break;
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    buf = (buf << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      result += String.fromCharCode((buf >> bits) & 0xff);
    }
  }
  return result;
}

// JWT accessToken의 exp claim 추출
function getJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

export type AuthUser = AuthTokens['user'];

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  restoreAuth: () => Promise<void>;
}

const noop = () => undefined;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
    secureTokenStorage.saveTokens(accessToken, refreshToken).catch(noop);
  },

  setUser: (user) => {
    set({ user });
    storage.set(STORAGE_KEYS.USER, user).catch(noop);
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
    secureTokenStorage.clearTokens().catch(noop);
    storage.remove(STORAGE_KEYS.USER).catch(noop);
  },

  restoreAuth: async () => {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    const keychainTokens = await secureTokenStorage.getTokens();
    if (keychainTokens) {
      accessToken = keychainTokens.accessToken;
      refreshToken = keychainTokens.refreshToken;
    } else {
      // 마이그레이션: 기존 AsyncStorage 토큰을 Keychain으로 이전 후 삭제 (일회성)
      const legacyAccess = await storage.get<string>('@nearprice/access_token');
      const legacyRefresh = await storage.get<string>('@nearprice/refresh_token');
      if (legacyAccess && legacyRefresh) {
        try {
          await secureTokenStorage.saveTokens(legacyAccess, legacyRefresh);
          await storage.remove('@nearprice/access_token');
          await storage.remove('@nearprice/refresh_token');
        } catch {
          // Keychain 저장 실패 시: 레거시 토큰을 메모리에만 유지하고 계속 진행
          // 다음 로그인 시 Keychain 재시도
        }
        accessToken = legacyAccess;
        refreshToken = legacyRefresh;
      }
    }

    const user = await storage.get<AuthUser>(STORAGE_KEYS.USER);
    if (!accessToken || !refreshToken) return;

    const now = Math.floor(Date.now() / 1000);
    const exp = getJwtExpiry(accessToken);

    // exp === null: 만료 claim이 없는 토큰 — 서버 측에서 관리하므로 검증 건너뜀
    // now + 60: 기기 시계가 서버보다 최대 60초 느릴 경우 만료 토큰을 유효로 오판하는 것을 방지
    //           (보수적 사전 갱신 — 만료까지 60초 미만 남은 토큰도 갱신 대상에 포함)
    if (exp !== null && exp <= now + 60) {
      // accessToken 만료 또는 만료 임박 → refreshToken으로 갱신 시도
      try {
        const res = await refreshTokens(refreshToken);
        accessToken = res.data.accessToken;
        refreshToken = res.data.refreshToken;
        await secureTokenStorage.saveTokens(accessToken, refreshToken);
      } catch {
        // 갱신 실패 → 인메모리·스토리지 전체 정리
        get().logout();
        return;
      }
    }

    if (!user) {
      // 토큰은 있으나 유저 데이터 누락 → 불일치 상태이므로 로그아웃
      get().logout();
      return;
    }

    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },
}));
