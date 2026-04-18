import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastType } from '../../store/toastStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const TOAST_BG: Record<ToastType, string> = {
  success: colors.primary,
  error: colors.danger,
  info: colors.gray600,
};

const Toast: React.FC = () => {
  const { visible, message, type } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(spacing.lg)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: spacing.lg,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const bottomOffset = insets.bottom + spacing.tabBarContentHeight + spacing.md;

  const dynamicStyle = useMemo(
    () => ({ bottom: bottomOffset, backgroundColor: TOAST_BG[type] }),
    [bottomOffset, type],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        dynamicStyle,
        { opacity, transform: [{ translateY }] },
      ]}
      accessible={true}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusXl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    maxWidth: spacing.toastMaxWidth,
    zIndex: spacing.zIndexToast,
  },
  message: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
  },
});

export default Toast;
