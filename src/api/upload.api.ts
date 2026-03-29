import { apiClient } from './client';
import type { UploadResponse } from '../types/api.types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const uploadApi = {
  // fileSize: React Native Image Picker/Camera가 제공하는 경우에만 전달 — 미전달 시 크기 검사 생략 (서버 측에서 2차 검증)
  uploadImage: (uri: string, filename: string, mimeType: string, fileSize?: number) => {
    if (!uri || !uri.startsWith('file://')) {
      return Promise.reject(new Error('유효한 파일 경로가 아닙니다.'));
    }
    if (!filename || filename.trim().length === 0) {
      return Promise.reject(new Error('파일명이 필요합니다.'));
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return Promise.reject(new Error(`지원하지 않는 파일 형식입니다. (허용: jpg, png, webp)`));
    }
    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE_BYTES) {
      return Promise.reject(new Error(`파일 크기가 너무 큽니다. (최대 10 MB)`));
    }

    const formData = new FormData();
    // React Native FormData는 웹 표준 Blob 대신 {uri, name, type} 객체를 허용하므로 단언 필요
    formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

    return apiClient.post<UploadResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
