import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const RADIUS_OPTIONS = [1000, 3000, 5000, 10000] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  regionName: string | null;
  radius: RadiusOption;
  setLocation: (lat: number, lng: number, regionName?: string | null) => void;
  setRadius: (radius: RadiusOption) => void;
  clearLocation: () => void;
  restoreLocation: () => Promise<void>;
}

interface PersistedLocation {
  latitude: number;
  longitude: number;
  regionName: string | null;
  radius?: RadiusOption;
}

const noop = () => undefined;

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  regionName: null,
  radius: 10000,

  setLocation: (latitude, longitude, regionName) => {
    set({ latitude, longitude, regionName: regionName ?? null });
    storage
      .set<PersistedLocation>(STORAGE_KEYS.LOCATION, {
        latitude,
        longitude,
        regionName: regionName ?? null,
        radius: get().radius,
      })
      .catch((err) => {
        console.error('[locationStore] setLocation 저장 실패', err);
      });
  },

  setRadius: (radius) => {
    set({ radius });
    const { latitude, longitude, regionName } = get();
    if (latitude !== null && longitude !== null) {
      storage
        .set<PersistedLocation>(STORAGE_KEYS.LOCATION, {
          latitude,
          longitude,
          regionName,
          radius,
        })
        .catch((err) => {
          console.error('[locationStore] setRadius 저장 실패', err);
        });
    }
  },

  clearLocation: () => {
    set({ latitude: null, longitude: null, regionName: null, radius: 10000 });
    storage.remove(STORAGE_KEYS.LOCATION).catch(noop);
  },

  restoreLocation: async () => {
    const saved = await storage.get<PersistedLocation>(STORAGE_KEYS.LOCATION);
    if (saved) {
      // 이전에 저장된 radius가 현재 옵션에 없으면 기본값 사용
      const validRadius = RADIUS_OPTIONS.includes(saved.radius as RadiusOption)
        ? (saved.radius as RadiusOption)
        : 10000;
      set({
        latitude: saved.latitude,
        longitude: saved.longitude,
        regionName: saved.regionName,
        radius: validRadius,
      });
    }
  },
}));
