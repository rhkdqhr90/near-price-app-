import * as Sentry from '@sentry/react-native';
import Config from 'react-native-config';

if (Config.SENTRY_DSN) {
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  });
}

import React, { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus, StatusBar, StyleSheet, UIManager, Platform, View } from 'react-native';

// Android에서 LayoutAnimation 사용을 위한 필수 설정
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from './src/navigation/RootNavigator';
import Toast from './src/components/common/Toast';
import OfflineBanner from './src/components/common/OfflineBanner';
import { colors } from './src/theme/colors';
import { useNetworkStore } from './src/store/networkStore';


function App(): React.JSX.Element {
  const [isBackground, setIsBackground] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setIsBackground(true);
      } else if (nextAppState === 'active') {
        setIsBackground(false);
        // 포그라운드 복귀 시 오프라인 상태 초기화 → 중단된 쿼리 재시도
        if (useNetworkStore.getState().isOffline) {
          useNetworkStore.getState().setOffline(false);
          void queryClient.invalidateQueries();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const handleNavigationReady = useCallback(() => {
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <Sentry.ErrorBoundary>
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar barStyle="dark-content" />
            <NavigationContainer onReady={handleNavigationReady}>
              <RootNavigator />
            </NavigationContainer>
            <Toast />
            <OfflineBanner />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
      {isBackground && <View style={styles.privacyOverlay} />}
    </GestureHandlerRootView>
    </Sentry.ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default App;
