import { create } from 'zustand';
import type { UnitType } from '../types/api.types';

export interface ConfirmItem {
  key: string;
  productId?: string;
  productName: string;
  price: number;
  unitType?: UnitType;
  quantity?: number;
  imageUri?: string;
  condition?: string;
  quality?: 'HIGH' | 'MID' | 'LOW';
  memo?: string;
  eventStart?: string;
  eventEnd?: string;
}

/** 현재 작성 중인 폼의 드래프트 데이터 */
export interface DraftFormData {
  productName?: string;
  price?: string;
  unitType?: UnitType;
  quantity?: string;
  imageUri?: string;
  hasEvent?: boolean;
  eventStart?: string;
  eventEnd?: string;
  quality?: 'HIGH' | 'MID' | 'LOW';
  memo?: string;
  productId?: string;
}

/** 입력 방식 */
export type InputMethod = 'camera' | 'manual' | null;

interface PriceRegisterState {
  // 기존 필드
  storeId: string | null;
  storeName: string | null;
  items: ConfirmItem[];

  // 중간 저장 필드
  inputMethod: InputMethod;
  ocrImageUri: string | null;
  draftForm: DraftFormData | null;
  isDirty: boolean;

  // 기존 액션
  setStore: (storeId: string, storeName: string) => void;
  addItem: (item: Omit<ConfirmItem, 'key'>) => void;
  updateItem: (index: number, item: Omit<ConfirmItem, 'key'>) => void;
  removeItem: (index: number) => void;
  reset: () => void;

  // 중간 저장 액션
  setInputMethod: (method: InputMethod) => void;
  setOcrImageUri: (uri: string | null) => void;
  saveDraft: (data: DraftFormData) => void;
  clearDraft: () => void;
  markDirty: () => void;
  markClean: () => void;
}

export const usePriceRegisterStore = create<PriceRegisterState>((set) => ({
  storeId: null,
  storeName: null,
  items: [],
  inputMethod: null,
  ocrImageUri: null,
  draftForm: null,
  isDirty: false,

  setStore: (storeId, storeName) => set({ storeId, storeName, isDirty: true }),
  addItem: (item) => set((state) => ({
    items: [...state.items, { ...item, key: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}` }],
    isDirty: true,
  })),
  updateItem: (index, item) =>
    set((state) => {
      if (index < 0 || index >= state.items.length) return state;
      const items = [...state.items];
      items[index] = { ...item, key: items[index].key };
      return { items, isDirty: true };
    }),
  removeItem: (index) =>
    set((state) => ({ items: state.items.filter((_, i) => i !== index), isDirty: true })),
  reset: () => set({
    storeId: null,
    storeName: null,
    items: [],
    inputMethod: null,
    ocrImageUri: null,
    draftForm: null,
    isDirty: false,
  }),

  setInputMethod: (method) => set({ inputMethod: method }),
  setOcrImageUri: (uri) => set({ ocrImageUri: uri }),
  saveDraft: (data) => set({ draftForm: data, isDirty: true }),
  clearDraft: () => set({ draftForm: null }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
}));
