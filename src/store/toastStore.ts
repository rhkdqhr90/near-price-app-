import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  /** 현재 표시 중인 토스트 */
  visible: boolean;
  message: string;
  type: ToastType;
  /** 대기열 */
  queue: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

// 타이머는 리액티브 상태가 아니므로 Zustand 외부 모듈 스코프로 분리
let _timer: ReturnType<typeof setTimeout> | null = null;
let _idCounter = 0;

/** 큐에서 다음 토스트를 꺼내 표시 */
const _showNext = (set: (partial: Partial<ToastState> | ((s: ToastState) => Partial<ToastState>)) => void) => {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  set((state) => {
    if (state.queue.length === 0) {
      return { visible: false };
    }
    const [next, ...rest] = state.queue;
    _timer = setTimeout(() => {
      set({ visible: false });
      _timer = null;
      // 약간의 딜레이 후 다음 토스트 표시 (애니메이션 겹침 방지)
      _timer = setTimeout(() => _showNext(set), 200);
    }, 2000);
    return {
      visible: true,
      message: next.message,
      type: next.type,
      queue: rest,
    };
  });
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'success',
  queue: [],
  showToast: (message, type = 'success') => {
    set((state) => {
      // 동일 메시지 중복 방지: 현재 표시 중이거나 큐에 같은 메시지가 있으면 무시
      if (state.visible && state.message === message && state.type === type) {
        return state;
      }
      const isDuplicate = state.queue.some(
        (item) => item.message === message && item.type === type,
      );
      if (isDuplicate) {
        return state;
      }

      const newItem: ToastItem = {
        id: String(++_idCounter),
        message,
        type,
      };

      // 현재 토스트가 표시 중이면 큐에 추가
      if (state.visible) {
        return { queue: [...state.queue, newItem] };
      }

      // 표시 중인 게 없으면 즉시 표시
      if (_timer) {
        clearTimeout(_timer);
      }
      _timer = setTimeout(() => {
        set({ visible: false });
        _timer = null;
        _timer = setTimeout(() => _showNext(set), 200);
      }, 2000);

      return { visible: true, message, type };
    });
  },
  hideToast: () => {
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
    set({ visible: false, queue: [] });
  },
}));
