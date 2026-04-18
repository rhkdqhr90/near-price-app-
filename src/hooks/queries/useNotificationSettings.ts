import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/user.api';
import { useNotificationStore } from '../../store/notificationStore';
import { STALE_TIME } from '../../lib/queryClient';

export const notificationSettingsKeys = {
  settings: (userId: string) => ['notificationSettings', userId] as const,
};

export const useNotificationSettingsQuery = (userId: string | undefined) => {
  const syncFromServer = useNotificationStore((s) => s.syncFromServer);

  const query = useQuery({
    queryKey: notificationSettingsKeys.settings(userId ?? ''),
    queryFn: () => userApi.getUser(userId ?? ''),
    enabled: !!userId,
    staleTime: STALE_TIME.medium,
    select: (data) => ({
      notifPriceChange: data.notifPriceChange,
      notifPromotion: data.notifPromotion,
    }),
  });

  useEffect(() => {
    if (query.data) {
      syncFromServer(query.data);
    }
  }, [query.data, syncFromServer]);

  return query;
};

export const useUpdateNotificationSettings = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: { notifPriceChange?: boolean; notifPromotion?: boolean }) => {
      if (!userId) return Promise.reject(new Error('userId is required'));
      return userApi.updateNotificationSettings(userId, settings);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: notificationSettingsKeys.settings(userId),
        });
      }
    },
  });
};
