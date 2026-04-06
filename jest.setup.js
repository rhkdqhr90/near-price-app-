jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  ErrorBoundary: ({ children }) => children,
}));

jest.mock('react-native-config', () => ({
  SENTRY_DSN: '',
  API_BASE_URL: 'http://localhost:3000',
}));

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModalProvider: ({ children }) => children,
}));
