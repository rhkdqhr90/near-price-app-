import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useStoreDetail } from '../../hooks/queries/useStores';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import LoadingView from '../../components/common/LoadingView';
import ErrorView from '../../components/common/ErrorView';
import MapPinIcon from '../../components/icons/MapPinIcon';
import StoreIcon from '../../components/icons/StoreIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import InfoCircleIcon from '../../components/icons/InfoCircleIcon';
import { STORE_TYPE_LABELS, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../../utils/constants';

type Props = HomeScreenProps<'StoreDetail'>;

interface MapApp {
  name: string;
  appUrl: (lat: number, lng: number, name: string) => string;
  webUrl: (lat: number, lng: number, name: string) => string;
  scheme: string;
}

const MAP_APPS: MapApp[] = [
  {
    name: '네이버 지도',
    appUrl: (lat, lng, name) => `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=com.nearprice`,
    webUrl: (lat, lng, name) => `https://map.naver.com/v5/directions/-/${lng},${lat},${encodeURIComponent(name)}/-/walk`,
    scheme: 'nmap://',
  },
  {
    name: '카카오맵',
    appUrl: (lat, lng, name) => `kakaomap://look?p=${lat},${lng}&name=${encodeURIComponent(name)}`,
    webUrl: (lat, lng) => `https://map.kakao.com/link/map/${lat},${lng}`,
    scheme: 'kakaomap://',
  },
  {
    name: '구글맵',
    appUrl: (lat, lng) => `google.navigation:q=${lat},${lng}`,
    webUrl: (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`,
    scheme: 'google.navigation://',
  },
];

const openMapApp = async (lat: number, lng: number, name: string) => {
  try {
    const availableApps: Array<{ name: string; url: string }> = [];

    for (const app of MAP_APPS) {
      const supported = await Linking.canOpenURL(app.scheme);
      if (supported) {
        availableApps.push({
          name: app.name,
          url: app.appUrl(lat, lng, name),
        });
      }
    }

    if (availableApps.length === 0) {
      await Linking.openURL(MAP_APPS[0].webUrl(lat, lng, name));
      return;
    }

    if (availableApps.length === 1) {
      await Linking.openURL(availableApps[0].url);
      return;
    }

    Alert.alert(
      '지도 앱 선택',
      '어떤 지도 앱으로 열까요?',
      [
        ...availableApps.map((app) => ({
          text: app.name,
          onPress: () => { Linking.openURL(app.url).catch(() => undefined); },
        })),
        { text: '취소', style: 'cancel' },
      ],
    );
  } catch {
    Linking.openURL(MAP_APPS[0].webUrl(lat, lng, name)).catch(() => undefined);
  }
};

const StoreDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { storeId } = route.params;
  const insets = useSafeAreaInsets();

  const { data: store, isLoading, isError, refetch } = useStoreDetail(storeId);

  const topBarTop = useMemo(() => insets.top + spacing.sm, [insets.top]);
  const bottomPadding = useMemo(
    () => Math.max(insets.bottom, spacing.md) + spacing.md,
    [insets.bottom],
  );

  const handleDirections = useCallback(async () => {
    if (!store) return;
    await openMapApp(store.latitude, store.longitude, store.name);
  }, [store]);

  if (isLoading) {
    return <LoadingView message="매장 정보를 불러오는 중..." />;
  }
  if (isError || !store) {
    return <ErrorView message="매장 정보를 불러오지 못했습니다" onRetry={refetch} />;
  }

  const isValidMarker = typeof store.latitude === 'number' && typeof store.longitude === 'number'
    && !isNaN(store.latitude) && !isNaN(store.longitude);

  const cameraLatitude = isValidMarker ? store.latitude : DEFAULT_LATITUDE;
  const cameraLongitude = isValidMarker ? store.longitude : DEFAULT_LONGITUDE;

  const storeTypeLabel = STORE_TYPE_LABELS[store.type] ?? store.type;

  return (
    <View style={styles.root}>
      {/* ─── 지도 (풀스크린) ─── */}
      <MapViewWrapper
        style={StyleSheet.absoluteFill}
        initialCamera={{ latitude: cameraLatitude, longitude: cameraLongitude, zoom: 15 }}
        isShowLocationButton={false}
        isShowZoomControls={false}
        minZoom={10}
        maxZoom={18}
        mapType="Basic"
        locale="ko"
      >
        {isValidMarker && (
          <NaverMapMarkerOverlay
            latitude={store.latitude}
            longitude={store.longitude}
            tintColor={colors.primary}
            caption={{ text: store.name, textSize: typography.labelSm.fontSize, color: colors.primary }}
          />
        )}
      </MapViewWrapper>

      {/* ─── 상단 플로팅 ─── */}
      <View style={[styles.topBar, { top: topBarTop }]}>
        <TouchableOpacity
          style={styles.backFab}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <ChevronLeftIcon size={spacing.iconMd} color={colors.onBackground} />
        </TouchableOpacity>

        <View style={styles.storeChip}>
          <StoreIcon size={spacing.iconSm} color={colors.primary} />
          <Text style={styles.storeChipText} numberOfLines={1}>{store.name}</Text>
          <View style={styles.storeChipBadge}>
            <Text style={styles.storeChipBadgeText}>{storeTypeLabel}</Text>
          </View>
        </View>

        {/* 대칭용 빈 뷰 */}
        <View style={styles.backFab} />
      </View>

      {/* ─── 하단 플로팅 컨트롤 ─── */}
      <View style={[styles.bottomControls, { paddingBottom: bottomPadding }]}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => navigation.navigate('StoreInfo', { storeId })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="매장 정보 보기"
          >
            <InfoCircleIcon size={spacing.iconSm} color={colors.primary} />
            <Text style={styles.infoButtonText}>매장 정보</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={handleDirections}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${store.name}으로 길찾기`}
          >
            <MapPinIcon size={spacing.iconSm} color={colors.onPrimary} />
            <Text style={styles.directionsButtonText}>길찾기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceContainerHigh },

  // ─── 상단 플로팅 ──────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backFab: {
    width: spacing.buttonHeight,
    height: spacing.buttonHeight,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: spacing.floatShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationSm,
  },
  storeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: spacing.floatShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationSm,
  },
  storeChipText: {
    ...typography.labelMd,
    color: colors.onBackground,
    flex: 1,
  },
  storeChipBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
  },
  storeChipBadgeText: {
    ...typography.captionBold,
    color: colors.primary,
  },

  // ─── 하단 플로팅 ──────────────────────────────────────────────────────────
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  controlRow: { flexDirection: 'row', gap: spacing.sm },
  infoButton: {
    flex: 1,
    height: spacing.buttonHeight,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusFull,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: spacing.floatShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationSm,
  },
  infoButtonText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  directionsButton: {
    flex: 1,
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYLg },
    shadowOpacity: spacing.primaryShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationMd,
  },
  directionsButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
});

export default StoreDetailScreen;
