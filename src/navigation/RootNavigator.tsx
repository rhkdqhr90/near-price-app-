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

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, restoreAuth } = useAuthStore();
  const { latitude, longitude, restoreLocation } = useLocationStore();
  const { hasSeenOnboarding, restoreOnboarding } = useOnboardingStore();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    Promise.all([restoreAuth(), restoreLocation(), restoreOnboarding()]).finally(() => {
      setIsRestoring(false);
    });
  }, [restoreAuth, restoreLocation, restoreOnboarding]);

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
