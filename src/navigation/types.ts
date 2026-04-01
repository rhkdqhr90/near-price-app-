import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { UnitType } from '../types/api.types';

// ─── Auth Stack ────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  LocationSetup: { returnTo?: 'mypage' } | undefined;
};

// ─── Main Tab ──────────────────────────────────────────────────────────────

export type MainTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  Flyer: NavigatorScreenParams<FlyerStackParamList>;
  PriceRegisterStack: NavigatorScreenParams<PriceRegisterStackParamList>;
  Wishlist: undefined;
  MyPageStack: NavigatorScreenParams<MyPageStackParamList>;
};

// ─── Flyer Stack ───────────────────────────────────────────────────────────

export type FlyerStackParamList = {
  FlyerList: undefined;
  FlyerDetail: { flyerId: string };
};

// ─── MyPage Stack (nested in MyPageTab) ───────────────────────────────────

export type MyPageStackParamList = {
  MyPage: undefined;
  Badge: undefined;
  MyPriceList: undefined;
  LikedPrices: undefined;
  LocationSetup: { returnTo: 'mypage' };
  NoticeList: undefined;
  NoticeDetail: { noticeId: string };
  Faq: undefined;
  Inquiry: undefined;
  NotificationSettings: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
};

// ─── Home Stack (nested in HomeTab) ───────────────────────────────────────

export type HomeStackParamList = {
  Home: undefined;
  Search: { initialQuery?: string };
  PriceCompare: { productId: string; productName: string };
  PriceDetail: { priceId: string };
  StoreDetail: { storeId: string };
  StoreInfo: { storeId: string };
};

// ─── Price Register Stack ──────────────────────────────────────────────────
// Flow: StoreSelect → InputMethod → (Camera → OcrResult | -) → ItemDetail → Confirm

export type PriceRegisterStackParamList = {
  StoreSelect: undefined;
  StoreRegister: { latitude: number; longitude: number };
  InputMethod: undefined;
  Camera: undefined;
  OcrResult: { imageUri: string };
  ItemDetail: {
    imageUri?: string;
    initialName?: string;
    initialPrice?: string;
    editIndex?: number;
    // 편집 모드 전용 — editIndex가 있을 때만 전달
    initialUnitType?: UnitType;
    initialQuantity?: string;
    initialQuality?: 'HIGH' | 'MID' | 'LOW';
    initialMemo?: string;
    initialHasEvent?: boolean;
    initialEventStart?: string;
    initialEventEnd?: string;
    initialProductId?: string;
  };
  Confirm: undefined;
};

// ─── Onboarding Stack ──────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  OnboardingIntro: undefined;
  Permission: undefined;
};

// ─── Root Navigator ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

// ─── Screen Props Helpers ──────────────────────────────────────────────────

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<HomeStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type PriceRegisterScreenProps<T extends keyof PriceRegisterStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<PriceRegisterStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type MyPageScreenProps<T extends keyof MyPageStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MyPageStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type FlyerScreenProps<T extends keyof FlyerStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<FlyerStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;
