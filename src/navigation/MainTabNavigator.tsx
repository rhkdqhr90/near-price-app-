import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFCM } from '../hooks/useFCM';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  MainTabParamList,
  HomeStackParamList,
  FlyerStackParamList,
  PriceRegisterStackParamList,
  MyPageStackParamList,
} from './types';
import { colors as dsColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography, PJS } from '../theme/typography';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/home/SearchScreen';
import PriceCompareScreen from '../screens/price/PriceCompareScreen';
import PriceDetailScreen from '../screens/price/PriceDetailScreen';
import StoreDetailScreen from '../screens/price/StoreDetailScreen';
import StoreInfoScreen from '../screens/price/StoreInfoScreen';
import StoreSelectScreen from '../screens/price/StoreSelectScreen';
import StoreRegisterScreen from '../screens/price/StoreRegisterScreen';
import InputMethodScreen from '../screens/price/InputMethodScreen';
import CameraScreen from '../screens/price/CameraScreen';
import OcrResultScreen from '../screens/price/OcrResultScreen';
import ItemDetailScreen from '../screens/price/ItemDetailScreen';
import ConfirmScreen from '../screens/price/ConfirmScreen';
import FlyerScreen from '../screens/flyer/FlyerScreen';
import FlyerDetailScreen from '../screens/flyer/FlyerDetailScreen';
import WishlistScreen from '../screens/wishlist/WishlistScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import MyPriceListScreen from '../screens/mypage/MyPriceListScreen';
import LikedPricesScreen from '../screens/mypage/LikedPricesScreen';
import NoticeListScreen from '../screens/mypage/NoticeListScreen';
import NoticeDetailScreen from '../screens/mypage/NoticeDetailScreen';
import FaqScreen from '../screens/mypage/FaqScreen';
import InquiryScreen from '../screens/mypage/InquiryScreen';
import NotificationSettingsScreen from '../screens/mypage/NotificationSettingsScreen';
import BadgeScreen from '../screens/mypage/BadgeScreen';
import TermsScreen from '../screens/mypage/TermsScreen';
import PrivacyPolicyScreen from '../screens/mypage/PrivacyPolicyScreen';
import LocationSetupScreen from '../screens/auth/LocationSetupScreen';
import HomeIconSvg from '../components/icons/HomeIcon';
import HeartIconSvg from '../components/icons/HeartIcon';
import UserIconSvg from '../components/icons/UserIcon';
import FlyerIconSvg from '../components/icons/FlyerIcon';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const FlyerStack = createNativeStackNavigator<FlyerStackParamList>();
const PriceRegisterStack =
  createNativeStackNavigator<PriceRegisterStackParamList>();
const MyPageStack = createNativeStackNavigator<MyPageStackParamList>();

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator>
    <HomeStack.Screen
      name="Home"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="Search"
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="PriceCompare"
      component={PriceCompareScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="PriceDetail"
      component={PriceDetailScreen}
      options={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    />
    <HomeStack.Screen
      name="StoreDetail"
      component={StoreDetailScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="StoreInfo"
      component={StoreInfoScreen}
      options={{ headerShown: false }}
    />
  </HomeStack.Navigator>
);

const PriceRegisterStackNavigator: React.FC = () => (
  <PriceRegisterStack.Navigator>
    <PriceRegisterStack.Screen
      name="StoreSelect"
      component={StoreSelectScreen}
      options={{ headerShown: false }}
    />
    <PriceRegisterStack.Screen
      name="StoreRegister"
      component={StoreRegisterScreen}
      options={{ headerShown: false }}
    />
    <PriceRegisterStack.Screen
      name="InputMethod"
      component={InputMethodScreen}
      options={{ title: '입력 방식 선택' }}
    />
    <PriceRegisterStack.Screen
      name="Camera"
      component={CameraScreen}
      options={{ headerShown: false }}
    />
    <PriceRegisterStack.Screen
      name="OcrResult"
      component={OcrResultScreen}
      options={{ title: '가격 인식 결과' }}
    />
    <PriceRegisterStack.Screen
      name="ItemDetail"
      component={ItemDetailScreen}
      options={{ title: '품목 상세' }}
    />
    <PriceRegisterStack.Screen
      name="Confirm"
      component={ConfirmScreen}
      options={{ title: '등록 확인' }}
    />
  </PriceRegisterStack.Navigator>
);

function makeTabIcon(
  Icon: React.FC<{ size?: number; color?: string; filled?: boolean; active?: boolean }>,
) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Icon size={24} color={focused ? dsColors.tabIconActive : dsColors.tabIconInactive} filled={focused} active={focused} />;
  };
}

const MyPageStackNavigator: React.FC = () => (
  <MyPageStack.Navigator>
    <MyPageStack.Screen
      name="MyPage"
      component={MyPageScreen}
      options={{ headerShown: false }}
    />
    <MyPageStack.Screen
      name="MyPriceList"
      component={MyPriceListScreen}
      options={{ title: '내가 등록한 가격' }}
    />
    <MyPageStack.Screen
      name="LikedPrices"
      component={LikedPricesScreen}
      options={{ title: '좋아요한 가격' }}
    />
    <MyPageStack.Screen
      name="LocationSetup"
      component={LocationSetupScreen}
      options={{ title: '동네 변경' }}
    />
    <MyPageStack.Screen
      name="NoticeList"
      component={NoticeListScreen}
      options={{ title: '공지사항' }}
    />
    <MyPageStack.Screen
      name="NoticeDetail"
      component={NoticeDetailScreen}
      options={{ title: '공지사항' }}
    />
    <MyPageStack.Screen
      name="Faq"
      component={FaqScreen}
      options={{ title: '도움말 / FAQ' }}
    />
    <MyPageStack.Screen
      name="Inquiry"
      component={InquiryScreen}
      options={{ headerShown: false }}
    />
    <MyPageStack.Screen
      name="NotificationSettings"
      component={NotificationSettingsScreen}
      options={{ title: '알림 설정' }}
    />
    <MyPageStack.Screen
      name="Badge"
      component={BadgeScreen}
      options={{ headerShown: false }}
    />
    <MyPageStack.Screen
      name="Terms"
      component={TermsScreen}
      options={{ title: '이용약관' }}
    />
    <MyPageStack.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicyScreen}
      options={{ title: '개인정보처리방침' }}
    />
  </MyPageStack.Navigator>
);

const FlyerStackNavigator: React.FC = () => (
  <FlyerStack.Navigator>
    <FlyerStack.Screen
      name="FlyerList"
      component={FlyerScreen}
      options={{ headerShown: false }}
    />
    <FlyerStack.Screen
      name="FlyerDetail"
      component={FlyerDetailScreen}
      options={{ headerShown: false }}
    />
  </FlyerStack.Navigator>
);

const HomeTabIcon = makeTabIcon(HomeIconSvg);
const FlyerTabIcon = makeTabIcon(FlyerIconSvg);
const HeartTabIcon = makeTabIcon(HeartIconSvg);
const UserTabIcon = makeTabIcon(UserIconSvg);

// 중앙 FAB 버튼 컴포넌트
const FABTabButton: React.FC<{ onPress?: BottomTabBarButtonProps['onPress'] }> = ({ onPress }) => (
  <TouchableOpacity
    style={styles.fabContainer}
    onPress={onPress ?? (() => {})}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel="가격 등록"
  >
    <LinearGradient
      colors={[dsColors.primary, dsColors.primaryDark]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.fabCircle}
    >
      <Text style={styles.fabPlus}>+</Text>
    </LinearGradient>
    <Text style={styles.fabLabel}>가격등록</Text>
  </TouchableOpacity>
);

// FAB 탭 버튼 렌더 함수 (모듈 레벨 — 렌더 중 재생성 방지)
const renderFABTabButton = (props: BottomTabBarButtonProps) => (
  <FABTabButton onPress={props.onPress} />
);

const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  useFCM();
  const tabBarHeight = spacing.tabBarContentHeight + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dsColors.tabIconActive,
        tabBarInactiveTintColor: dsColors.tabIconInactive,
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: insets.bottom + spacing.xs, height: tabBarHeight + spacing.sm },
        ],
        tabBarLabelStyle: styles.tabLabel,
      }}
      safeAreaInsets={{ bottom: 0 }}
    >
      <Tab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ tabBarLabel: '홈', tabBarIcon: HomeTabIcon }}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('HomeStack', { screen: 'Home' }); },
        })}
      />
      <Tab.Screen
        name="Flyer"
        component={FlyerStackNavigator}
        options={{
          tabBarLabel: '전단지',
          tabBarIcon: FlyerTabIcon,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('Flyer', { screen: 'FlyerList' }); },
        })}
      />
      <Tab.Screen
        name="PriceRegisterStack"
        component={PriceRegisterStackNavigator}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: renderFABTabButton,
          tabBarStyle: styles.tabBarHidden,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('PriceRegisterStack', { screen: 'StoreSelect' }); },
        })}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ tabBarLabel: '찜', tabBarIcon: HeartTabIcon }}
      />
      <Tab.Screen
        name="MyPageStack"
        component={MyPageStackNavigator}
        options={{ tabBarLabel: 'MY', tabBarIcon: UserTabIcon }}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('MyPageStack', { screen: 'MyPage' }); },
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: dsColors.surface,
    borderTopWidth: 0,
    shadowColor: dsColors.primary,
    shadowOffset: { width: 0, height: -spacing.ambientShadowOffsetY },
    shadowOpacity: spacing.ambientShadowOpacity,
    shadowRadius: spacing.ambientShadowRadius,
    elevation: 12,
    borderTopLeftRadius: spacing.radiusXl,
    borderTopRightRadius: spacing.radiusXl,
    paddingTop: spacing.sm,
  },
  tabLabel: {
    ...typography.tabLabel,
  },
  // FAB
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  fabCircle: {
    width: spacing.fabSize,
    height: spacing.fabSize,
    borderRadius: spacing.fabSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: -spacing.fabOverhang,
    borderWidth: 4,
    borderColor: dsColors.white,
    shadowColor: dsColors.primary,
    shadowOffset: { width: 0, height: spacing.fabShadowOffsetY },
    shadowOpacity: spacing.fabShadowOpacity,
    shadowRadius: spacing.fabShadowRadius,
    elevation: spacing.fabShadowElevation,
  },
  fabPlus: {
    // fontFamily 미설정 — PJS 폰트의 + 글리프 메트릭이 수직 중앙 어긋남
    // 시스템 폰트가 + 기호를 정확히 중앙에 렌더링
    fontSize: spacing.fabPlusFontSize,
    lineHeight: spacing.fabPlusLineHeight,
    color: dsColors.white,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  fabLabel: {
    ...typography.captionBold,
    fontFamily: PJS.extraBold,
    color: dsColors.primary,
  },
  tabBarHidden: {
    display: 'none' as const,
  },
});

export default MainTabNavigator;
