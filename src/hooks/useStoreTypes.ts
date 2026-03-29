import { useEffect, useState, useCallback } from 'react';
import type { StoreType } from '../types/api.types';
import { storage, STORAGE_KEYS } from '../utils/storage';

const DEFAULT_STORE_TYPES: { label: string; value: StoreType; isDefault: boolean }[] = [
  { label: '마트', value: 'mart', isDefault: true },
  { label: '시장', value: 'traditional_market', isDefault: true },
  { label: '슈퍼', value: 'supermarket', isDefault: true },
  { label: '편의점', value: 'convenience', isDefault: true },
  { label: '대형마트', value: 'large_mart', isDefault: true },
];

interface StorageItem {
  label: string;
  value: string;
  isDefault: boolean;
  createdAt: string;
}

const isStorageItem = (ct: unknown): ct is StorageItem =>
  typeof ct === 'object' && ct !== null &&
  typeof (ct as Record<string, unknown>).label === 'string' &&
  typeof (ct as Record<string, unknown>).value === 'string';

export const useStoreTypes = () => {
  const [storeTypes, setStoreTypes] = useState<{ label: string; value: StoreType; isDefault: boolean }[]>(
    DEFAULT_STORE_TYPES,
  );
  const [isLoading, setIsLoading] = useState(true);

  // 스토리지에서 커스텀 카테고리 로드
  useEffect(() => {
    const loadStoreTypes = async () => {
      try {
        const parsed = await storage.get<StorageItem[]>(STORAGE_KEYS.CUSTOM_STORE_TYPES);
        if (parsed !== null) {
          if (!Array.isArray(parsed)) throw new Error('Invalid format');
          const customTypes = parsed.filter(isStorageItem);
          const merged = [
            ...DEFAULT_STORE_TYPES,
            ...customTypes.map(ct => ({
              label: ct.label,
              value: ct.value as StoreType,
              isDefault: false,
            })),
          ];
          setStoreTypes(merged);
        } else {
          setStoreTypes(DEFAULT_STORE_TYPES);
        }
      } catch {
        void storage.remove(STORAGE_KEYS.CUSTOM_STORE_TYPES).catch(() => {});
        setStoreTypes(DEFAULT_STORE_TYPES);
      } finally {
        setIsLoading(false);
      }
    };

    void loadStoreTypes();
  }, []);

  // 새 카테고리 추가
  const addStoreType = useCallback(async (label: string): Promise<boolean> => {
    try {
      const trimmed = label.trim();
      if (!trimmed) return false;

      const customValue = `custom_${Date.now()}`;
      const newType = { label: trimmed, value: customValue as StoreType, isDefault: false };

      const existing = await storage.get<StorageItem[]>(STORAGE_KEYS.CUSTOM_STORE_TYPES);
      const customTypes: StorageItem[] = Array.isArray(existing) ? existing.filter(isStorageItem) : [];

      // 중복 확인 (스토리지 기준)
      if (customTypes.some(ct => ct.label === trimmed) ||
          DEFAULT_STORE_TYPES.some(st => st.label === trimmed)) {
        return false;
      }

      customTypes.push({
        label: trimmed,
        value: customValue,
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
      await storage.set(STORAGE_KEYS.CUSTOM_STORE_TYPES, customTypes);

      // 상태 업데이트
      setStoreTypes(prev => [...prev, newType]);
      return true;
    } catch {
      return false;
    }
  }, []);

  // 커스텀 카테고리 삭제
  const removeStoreType = useCallback(async (value: string): Promise<boolean> => {
    try {
      // 기본 카테고리는 삭제 불가
      if (DEFAULT_STORE_TYPES.some(dt => dt.value === value)) {
        return false;
      }

      const existing = await storage.get<StorageItem[]>(STORAGE_KEYS.CUSTOM_STORE_TYPES);
      if (existing !== null) {
        const customTypes: StorageItem[] = Array.isArray(existing) ? existing.filter(isStorageItem) : [];
        const filtered = customTypes.filter(ct => ct.value !== value);
        await storage.set(STORAGE_KEYS.CUSTOM_STORE_TYPES, filtered);
      }

      // 상태 업데이트
      setStoreTypes(prev => prev.filter(st => st.value !== value));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    storeTypes,
    isLoading,
    addStoreType,
    removeStoreType,
  };
};
