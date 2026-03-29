import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface NotificationState {
  allNotifications: boolean;
  priceChangeNotification: boolean;
  promotionNotification: boolean;
  setAllNotifications: (enabled: boolean) => void;
  setPriceChangeNotification: (enabled: boolean) => void;
  setPromotionNotification: (enabled: boolean) => void;
  restoreSettings: () => Promise<void>;
  syncFromServer: (settings: { notifPriceChange: boolean; notifPromotion: boolean }) => void;
}

const noop = () => undefined;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  allNotifications: true,
  priceChangeNotification: true,
  promotionNotification: false,

  setAllNotifications: (enabled) => {
    const s = get();
    const newPromotionNotification = enabled ? s.promotionNotification : false;
    set({
      allNotifications: enabled,
      priceChangeNotification: enabled,
      promotionNotification: newPromotionNotification,
    });
    storage
      .set(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
        allNotifications: enabled,
        priceChangeNotification: enabled,
        promotionNotification: newPromotionNotification,
      })
      .catch(noop);
  },

  setPriceChangeNotification: (enabled) => {
    const s = get();
    const allNotifications = enabled || s.promotionNotification;
    set({ priceChangeNotification: enabled, allNotifications });
    storage
      .set(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
        allNotifications,
        priceChangeNotification: enabled,
        promotionNotification: s.promotionNotification,
      })
      .catch(noop);
  },

  setPromotionNotification: (enabled) => {
    const s = get();
    const allNotifications = s.priceChangeNotification || enabled;
    set({ promotionNotification: enabled, allNotifications });
    storage
      .set(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
        allNotifications,
        priceChangeNotification: s.priceChangeNotification,
        promotionNotification: enabled,
      })
      .catch(noop);
  },

  syncFromServer: (settings) => {
    const state = {
      priceChangeNotification: settings.notifPriceChange,
      promotionNotification: settings.notifPromotion,
      allNotifications: settings.notifPriceChange || settings.notifPromotion,
    };
    set(state);
    storage.set(STORAGE_KEYS.NOTIFICATION_SETTINGS, state).catch(noop);
  },

  restoreSettings: async () => {
    const settings = await storage.get<{
      allNotifications: boolean;
      priceChangeNotification: boolean;
      promotionNotification: boolean;
    }>(STORAGE_KEYS.NOTIFICATION_SETTINGS);

    if (settings) {
      set({
        allNotifications: typeof settings.allNotifications === 'boolean' ? settings.allNotifications : true,
        priceChangeNotification: typeof settings.priceChangeNotification === 'boolean' ? settings.priceChangeNotification : true,
        promotionNotification: typeof settings.promotionNotification === 'boolean' ? settings.promotionNotification : false,
      });
    }
  },
}));
