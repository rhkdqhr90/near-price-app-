import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { useOnboardingStore } from '../store/onboardingStore';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { colors } from '../theme/colors';
import { userApi } from '../api/user.api';

const Stack = createNativeStackNavigator<RootStackParamList>();
const RESTORE_TIMEOUT_MS = 4000;

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreAuth = useAuthStore((s) => s.restoreAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const { latitude, longitude, restoreLocation } = useLocationStore();
  const { hasSeenOnboarding, restoreOnboarding } = useOnboardingStore();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        await Promise.race([
          Promise.all([restoreAuth(), restoreLocation(), restoreOnboarding()]),
          new Promise<void>((resolve) => {
            setTimeout(resolve, RESTORE_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    };

    restore().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [restoreAuth, restoreLocation, restoreOnboarding]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const syncCurrentUser = async () => {
      try {
        const me = await userApi.getCurrentUser();
        if (cancelled) return;

        setUser({
          id: me.id,
          email: me.email,
          nickname: me.nickname,
          profileImageUrl: me.profileImageUrl,
          trustScore: me.trustScore,
          representativeBadge: me.representativeBadge,
        });
      } catch {
        // 프로필 동기화 실패는 치명적 오류가 아니므로 무시
      }
    };

    syncCurrentUser().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setUser]);

  if (isRestoring) {
    return <View style={styles.splash} />;
  }

  // 온보딩 미완료 → OnboardingStack
  // 로그인 O + 동네 설정 O → Main
  // 그 외 (로그인 X / 동네 미설정) → AuthStack
  const isLocationSet = latitude !== null && longitude !== null;
  const showMain = isAuthenticated && isLocationSet;

  return (
    <ErrorBoundary>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasSeenOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : showMain ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.white,
  },
});

export default RootNavigator;
