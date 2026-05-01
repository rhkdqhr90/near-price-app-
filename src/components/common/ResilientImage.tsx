import React, { useEffect, useRef, useState } from 'react';
import FastImage, {
  type FastImageProps,
  type OnErrorEvent,
} from '@d11/react-native-fast-image';

/**
 * 네트워크 이미지 로딩에 영구 실패 콜백을 얹은 FastImage 래퍼.
 *
 * 내부 라이브러리: `@d11/react-native-fast-image` (Dream11/DS Horizon 포크, New Arch 지원)
 *  - 메모리 + 디스크 캐시 (cacheControl: immutable)
 *  - FlatList 가상화로 언마운트 후 재진입해도 캐시 히트 → 깜빡임 제거
 *  - Fabric / TurboModules 호환
 *
 * 재시도 정책:
 *  - 기본 `maxRetries=0` (재시도 없음). 이미지 사이즈가 백엔드에서 압축되어 있어
 *    첫 fetch가 거의 항상 성공하며, 영구 오류(404, 잘못된 URL)에 retry는 의미 없음.
 *  - 일시적 네트워크 실패 케이스에서만 호출처가 명시적으로 maxRetries를 지정.
 */
interface ResilientImageProps extends Omit<FastImageProps, 'source' | 'onError'> {
  uri: string;
  maxRetries?: number;
  retryDelayMs?: number;
  onPermanentError?: () => void;
}

const ResilientImage: React.FC<ResilientImageProps> = ({
  uri,
  maxRetries = 0,
  retryDelayMs = 300,
  onPermanentError,
  ...rest
}) => {
  const [attempt, setAttempt] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didReportPermanentErrorRef = useRef(false);

  useEffect(() => {
    setAttempt(0);
    setRetryKey(0);
    didReportPermanentErrorRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [uri]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleError = (_e: OnErrorEvent) => {
    if (didReportPermanentErrorRef.current) {
      return;
    }

    if (attempt < maxRetries) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setAttempt((prev) => prev + 1);
        setRetryKey((prev) => prev + 1);
      }, retryDelayMs);
      return;
    }

    didReportPermanentErrorRef.current = true;
    onPermanentError?.();
  };

  return (
    <FastImage
      key={`${uri}::${retryKey}`}
      {...rest}
      source={{
        uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      onError={handleError}
    />
  );
};

export default ResilientImage;
