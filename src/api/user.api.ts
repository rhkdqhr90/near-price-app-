import { apiClient } from './client';
import type {
  PublicUserResponse,
  UserResponse,
  UpdateNicknameDto,
  UpdateNotificationSettingsDto,
  CheckNicknameResponseDto,
  SuccessResponse,
} from '../types/api.types';

export const userApi = {
  getCurrentUser: async () => {
    const response = await apiClient.get<UserResponse>('/user/me');
    return response.data;
  },

  updateNickname: async (userId: string, dto: UpdateNicknameDto) => {
    const response = await apiClient.patch<UserResponse>(
      `/user/${userId}/nickname`,
      dto,
    );
    return response.data;
  },

  checkNicknameAvailable: async (nickname: string, signal?: AbortSignal) => {
    const response = await apiClient.get<CheckNicknameResponseDto>(
      '/user/check-nickname',
      { params: { nickname }, signal },
    );
    return response.data;
  },

  updateFcmToken: async (userId: string, fcmToken: string) => {
    const response = await apiClient.patch<UserResponse>(
      `/user/${userId}/fcm-token`,
      { fcmToken },
    );
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await apiClient.get<PublicUserResponse>(`/user/${userId}`);
    return response.data;
  },

  updateNotificationSettings: async (
    userId: string,
    settings: UpdateNotificationSettingsDto,
  ) => {
    const response = await apiClient.patch<SuccessResponse>(
      `/user/${userId}/notification-settings`,
      settings,
    );
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete<SuccessResponse>('/user/me');
    return response.data;
  },
};
