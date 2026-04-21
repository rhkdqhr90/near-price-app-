import { create } from 'zustand';

interface NetworkState {
  isOffline: boolean;
  transportErrorStreak: number;
  markTransportFailure: () => void;
  markRequestSuccess: () => void;
  resetNetworkState: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  transportErrorStreak: 0,
  markTransportFailure: () =>
    set((state) => {
      const nextStreak = state.transportErrorStreak + 1;
      return {
        transportErrorStreak: nextStreak,
        // 단일 네트워크 흔들림(keep-alive 소켓 종료 등)에서는 오프라인 배너를 띄우지 않음
        isOffline: nextStreak >= 2,
      };
    }),
  markRequestSuccess: () =>
    set((state) => {
      if (!state.isOffline && state.transportErrorStreak === 0) {
        return state;
      }
      return {
        isOffline: false,
        transportErrorStreak: 0,
      };
    }),
  resetNetworkState: () => set({ isOffline: false, transportErrorStreak: 0 }),
}));
