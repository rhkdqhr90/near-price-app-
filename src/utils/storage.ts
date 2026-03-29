import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
// NOTE: iOS 빌드 시 `cd ios && pod install` 실행 필요 (react-native-keychain native module)

const KEYCHAIN_SERVICE = 'com.nearprice.tokens';
const KEYCHAIN_USERNAME = 'nearprice_tokens';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const secureTokenStorage = {
  saveTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    await Keychain.setGenericPassword(
      KEYCHAIN_USERNAME,
      JSON.stringify({ accessToken, refreshToken } satisfies StoredTokens),
      {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  },

  getTokens: async (): Promise<StoredTokens | null> => {
    const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (!result) return null;
    try {
      const parsed: unknown = JSON.parse(result.password);
      if (
        typeof (parsed as Record<string, unknown>)?.accessToken === 'string' &&
        typeof (parsed as Record<string, unknown>)?.refreshToken === 'string'
      ) {
        return parsed as StoredTokens;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearTokens: async (): Promise<void> => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  },
};

export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch (err) {
      console.error(`[storage.get] JSON.parse failed for key: ${key}`, err);
      return null;
    }
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  clear: async (): Promise<void> => {
    await AsyncStorage.clear();
  },
};

export const STORAGE_KEYS = {
  // 토큰은 Keychain(SecureStorage)에만 저장 — 이 키들은 사용 금지
  USER: '@nearprice/user',
  LOCATION: '@nearprice/location',
  ONBOARDING_SEEN: '@nearprice/onboarding_seen',
  RECENT_SEARCHES: '@nearprice/recent_searches',
  NOTIFICATION_SETTINGS: '@nearprice/notification_settings',
  CUSTOM_STORE_TYPES: '@nearprice/custom_store_types',
} as const;
