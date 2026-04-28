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
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
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
      await hideDim();
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
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
    <LinearGradient
      colors={[colors.primaryLight, colors.surface]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      locations={[0, 0.55]}
      style={styles.container}
    >
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
        {/* 로고 마크 — 뒤 회전 카드 + 앞 흰 카드 */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBack} />
          <View style={styles.logoFront}>
            <Text style={styles.logoChar}>마</Text>
          </View>
        </View>

        <View style={styles.heroText}>
          <Text style={styles.appName}>마실</Text>
          <Text style={styles.taglineLine1}>동네에서 가장 싸게 사는 법</Text>
          <Text style={styles.taglineLine2}>이웃의 가격을 나누다</Text>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.sm }]}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.kakaoButton, isLoading && styles.kakaoButtonDisabled]}
            onPress={handleKakaoLogin}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="카카오로 3초만에 시작하기"
          >
            {isLoading ? (
              <ActivityIndicator color={colors.black} accessibilityLabel="로딩 중" />
            ) : (
              <>
                <Svg width={18} height={18} viewBox="0 0 18 18">
                  <Path
                    d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.44c0 2.12 1.42 3.97 3.54 5.02l-.9 3.29c-.08.28.24.5.48.34l3.93-2.59c.48.06.96.1 1.45.1 4.14 0 7.5-2.66 7.5-5.94S13.14 1.5 9 1.5Z"
                    fill={colors.black}
                  />
                </Svg>
                <Text style={styles.kakaoButtonText}>카카오로 3초만에 시작하기</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.termsText}>
          가입 시 <Text style={styles.termsLink}>이용약관</Text>과{' '}
          <Text style={styles.termsLink}>개인정보처리방침</Text>에 동의합니다.
        </Text>
      </View>
    </LinearGradient>
  );
};

const LOGO_SIZE = 92;
const LOGO_RADIUS = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
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

  // ── 중앙 히어로 ──
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBack: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-8deg' }],
  },
  logoFront: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  logoChar: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: colors.primary,
    letterSpacing: -2,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 48,
  },

  heroText: {
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    ...typography.brand,
    color: colors.onBackground,
    fontSize: 32,
    letterSpacing: -1,
    marginBottom: 2,
  },
  taglineLine1: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 21,
  },
  taglineLine2: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.onBackground,
    lineHeight: 21,
  },

  // ── 하단 CTA ──
  bottom: {
    gap: 10,
  },
  kakaoButton: {
    flexDirection: 'row',
    backgroundColor: colors.kakaoYellow,
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  kakaoButtonDisabled: {
    opacity: 0.6,
  },
  kakaoButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.black,
  },
  termsText: {
    fontSize: 11,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
