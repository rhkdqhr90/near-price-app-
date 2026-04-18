import axios from 'axios';

export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'TOKEN_INVALID'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ClassifiedError {
  code: ApiErrorCode;
  message: string;
  status?: number;
}

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_FAILED: '입력값을 확인해 주세요.',
  UNAUTHORIZED: '다시 로그인해 주세요.',
  TOKEN_INVALID: '다시 로그인해 주세요.',
  NOT_FOUND: '요청한 정보를 찾을 수 없어요.',
  CONFLICT: '이미 처리된 요청이에요.',
  RATE_LIMITED: '잠시 후 다시 시도해 주세요.',
  INTERNAL_ERROR: '서버에서 일시적인 오류가 발생했어요.',
  SERVICE_UNAVAILABLE: '서비스를 잠시 이용할 수 없어요.',
  NETWORK: '네트워크 연결을 확인해 주세요.',
  TIMEOUT: '응답이 지연되고 있어요. 다시 시도해 주세요.',
  UNKNOWN: '알 수 없는 오류가 발생했어요.',
};

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'TOKEN_INVALID',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

export const classifyError = (error: unknown): ClassifiedError => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: DEFAULT_MESSAGES.TIMEOUT };
    }
    if (!error.response) {
      return { code: 'NETWORK', message: DEFAULT_MESSAGES.NETWORK };
    }
    const status = error.response.status;
    const body = error.response.data as { code?: string; message?: string } | undefined;
    const code = (body?.code as ApiErrorCode) ?? STATUS_TO_CODE[status] ?? 'UNKNOWN';
    const message = body?.message ?? DEFAULT_MESSAGES[code] ?? DEFAULT_MESSAGES.UNKNOWN;
    return { code, message, status };
  }
  return { code: 'UNKNOWN', message: DEFAULT_MESSAGES.UNKNOWN };
};

export const getErrorMessage = (error: unknown): string => classifyError(error).message;
