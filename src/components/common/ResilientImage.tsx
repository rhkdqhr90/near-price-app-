import React, { useEffect, useRef, useState } from 'react';
import { Image, type ImageProps } from 'react-native';

interface ResilientImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  maxRetries?: number;
  retryDelayMs?: number;
  onPermanentError?: () => void;
}

const ResilientImage: React.FC<ResilientImageProps> = ({
  uri,
  maxRetries = 2,
  retryDelayMs = 150,
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

  const handleError = () => {
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
    <Image
      key={`${uri}::${retryKey}`}
      {...rest}
      source={{ uri }}
      onError={handleError}
    />
  );
};

export default ResilientImage;
