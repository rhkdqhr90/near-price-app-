import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { login } from '@react-native-seoul/kakao-login';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import type { AuthScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';


type Props = AuthScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const isLoginInProgress = useRef(false);
  const { setTokens, setUser } = useAuthStore();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      isLoginInProgress.current = false;
    }, []),
  );

  const handleButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 8,
    }).start();
  }, [buttonScale]);

  const showDim = useCallback(() => {
    Animated.timing(dimOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [dimOpacity]);

  const hideDim = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      Animated.timing(dimOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => resolve());
    });
  }, [dimOpacity]);

  const handleKakaoLogin = async () => {
    if (isLoginInProgress.current) return;
    isLoginInProgress.current = true;
    setIsLoading(true);
    showDim();
    try {
      const kakaoResult = await login();
      const res = await authApi.kakaoLogin({
        kakaoAccessToken: kakaoResult.accessToken,
      });
      // 네비게이션 전환 전에 딤 제거 (언마운트 후 애니메이션 실행 방지)
      await hideDim();
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      // RootNavigator가 isAuthenticated 변경을 감지하여 자동으로 LocationSetup 또는 MainTab으로 전환
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다';
      Alert.alert('로그인 실패', message);
      await hideDim();
    } finally {
      isLoginInProgress.current = false;
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 배경 딤 */}
      {isLoading && (
        <Animated.View
          style={[
            styles.dimOverlay,
            { opacity: dimOpacity },
          ]}
          pointerEvents="auto"
        >
          <View style={styles.spinnerContainer} accessible={true} accessibilityLabel="로그인 중">
            <ActivityIndicator size="large" color={colors.white} accessibilityLabel="로딩 중" />
          </View>
        </Animated.View>
      )}

      <View style={styles.hero}>
        <Text style={styles.appName}>마실</Text>
        <Text style={styles.tagline}>내 주변 최저가 찾기</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
        <Animated.View
          style={{
            transform: [{ scale: buttonScale }],
          }}
        >
          <TouchableOpacity
            style={[styles.kakaoButton, isLoading && styles.kakaoButtonDisabled]}
            onPress={handleKakaoLogin}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            disabled={isLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="카카오로 시작하기"
          >
            {isLoading ? (
              <ActivityIndicator color={colors.black} accessibilityLabel="로딩 중" />
            ) : (
              <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.xl,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    ...typography.brand,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.bodyMd,
    color: colors.gray600,
  },
  bottom: {
    paddingBottom: spacing.xxl,
  },
  kakaoButton: {
    backgroundColor: colors.kakaoYellow,
    borderRadius: spacing.sm,
    height: spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kakaoButtonDisabled: {
    opacity: 0.6,
  },
  kakaoButtonText: {
    ...typography.headingMd,
    color: colors.black,
  },
});

export default LoginScreen;
