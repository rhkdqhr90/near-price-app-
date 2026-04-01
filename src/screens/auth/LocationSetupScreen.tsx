import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
  StyleSheet,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthScreenProps, MyPageScreenProps } from '../../navigation/types';
import Geolocation from 'react-native-geolocation-service';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import type { NaverGeocodeResult } from '../../api/naver-local.api';
import { useReverseGeocode, useGeocodeSearch } from '../../hooks/queries/useLocation';
import { useLocationStore } from '../../store/locationStore';
import MapPinIcon from '../../components/icons/MapPinIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import CloseIcon from '../../components/icons/CloseIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';

type Props = AuthScreenProps<'LocationSetup'> | MyPageScreenProps<'LocationSetup'>;

// useState lazy initializer용 헬퍼 — 컴포넌트 외부 정의로 hook 규칙 혼동 방지
// (useLocationStore.getState()는 React hook이 아닌 Zustand 정적 메서드)
const getInitialPreviewLocation = (): {
  latitude: number;
  longitude: number;
  regionName: string;
} | null => {
  const { latitude, longitude, regionName } = useLocationStore.getState();
  if (latitude !== null && longitude !== null) {
    return { latitude, longitude, regionName: regionName ?? '' };
  }
  return null;
};

const LocationSetupScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsLatLng, setGpsLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [previewLocation, setPreviewLocation] = useState<{
    latitude: number;
    longitude: number;
    regionName: string;
  } | null>(getInitialPreviewLocation);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { setLocation } = useLocationStore();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialLocation = useRef(useLocationStore.getState().latitude !== null);
  const isMountedRef = useRef(true);

  const {
    data: reverseGeocodedName,
    isError: isReverseError,
    isFetching: isReverseFetching,
    invalidateAndRefetch,
  } = useReverseGeocode(gpsLatLng?.lng ?? null, gpsLatLng?.lat ?? null);

  const { data: geocodeResults, isFetching: isSearching } = useGeocodeSearch(debouncedSearchQuery);

  const searchResults: NaverGeocodeResult[] = useMemo(() => geocodeResults ?? [], [geocodeResults]);

  const selectedRegionName = previewLocation?.regionName || null;

  // 런타임 값 기반 동적 스타일
  const topBarTop = useMemo(() => insets.top + spacing.sm, [insets.top]);
  const bottomPaddingBottom = useMemo(
    () => Math.max(insets.bottom, spacing.md) + spacing.md,
    [insets.bottom],
  );
  const modalHeaderPaddingTop = useMemo(() => insets.top + spacing.sm, [insets.top]);

  // Sync reverse geocode result → previewLocation
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (gpsLatLng === null) return;
    if (isReverseFetching) return;

    const resultKey = `${gpsLatLng.lat},${gpsLatLng.lng},${reverseGeocodedName ?? ''},${isReverseError}`;
    if (lastProcessedRef.current === resultKey) return;
    lastProcessedRef.current = resultKey;

    if (isReverseError) {
      setPreviewLocation({
        latitude: gpsLatLng.lat,
        longitude: gpsLatLng.lng,
        regionName: '현재 위치',
      });
      setIsGpsLoading(false);
      setInlineError('현재 위치의 동네 정보를 가져올 수 없습니다. 주소를 직접 검색하거나 다시 시도해 주세요.');
      return;
    }

    if (reverseGeocodedName) {
      setPreviewLocation({
        latitude: gpsLatLng.lat,
        longitude: gpsLatLng.lng,
        regionName: reverseGeocodedName,
      });
      setInlineError(null);
    } else if (reverseGeocodedName == null) { // null 및 undefined 모두 처리
      setPreviewLocation({
        latitude: gpsLatLng.lat,
        longitude: gpsLatLng.lng,
        regionName: '현재 위치',
      });
    }
    setIsGpsLoading(false);
  }, [gpsLatLng, reverseGeocodedName, isReverseError, isReverseFetching]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '위치 권한',
        message: '주변 매장과 가격을 보려면 위치 권한이 필요합니다',
        buttonPositive: '허용',
        buttonNegative: '거부',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const handleGpsDetect = useCallback(async () => {
    setInlineError(null);
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setInlineError('위치 권한을 허용해야 동네를 자동으로 설정할 수 있습니다.');
      return;
    }
    setIsGpsLoading(true);
    Geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;
        const { latitude, longitude } = position.coords;
        setGpsLatLng({ lat: latitude, lng: longitude });
        invalidateAndRefetch().catch(() => {});
      },
      () => {
        if (!isMountedRef.current) return;
        setIsGpsLoading(false);
        setInlineError('현재 위치를 가져올 수 없습니다. 주소를 직접 검색해 주세요.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        forceRequestLocation: true,
      },
    );
  }, [requestLocationPermission, invalidateAndRefetch]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setDebouncedSearchQuery('');
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearchQuery(query), 300);
  }, []);

  const handleSelectAddress = useCallback((doc: NaverGeocodeResult) => {
    const latitude = parseFloat(doc.y);
    const longitude = parseFloat(doc.x);
    if (isNaN(latitude) || isNaN(longitude)) {
      setInlineError('유효하지 않은 주소입니다. 다른 주소를 선택해 주세요.');
      setIsSearchModalVisible(false);
      return;
    }
    setInlineError(null);
    const fullAddress = (doc.jibunAddress || doc.roadAddress).trim();
    if (!fullAddress) {
      setInlineError('주소 정보를 가져올 수 없습니다. 다른 주소를 선택해 주세요.');
      setIsSearchModalVisible(false);
      return;
    }
    const parts = fullAddress.split(' ').filter(Boolean);
    const guIdx = parts.findIndex(p => p.endsWith('구') || p.endsWith('군'));
    const regionName = guIdx >= 0 && parts[guIdx + 1]
      ? `${parts[guIdx]} ${parts[guIdx + 1]}`
      : parts.filter(p => !/^\d/.test(p)).slice(-2).join(' ') || fullAddress;
    setPreviewLocation({ latitude, longitude, regionName });
    setDebouncedSearchQuery('');
    setSearchQuery('');
    setIsSearchModalVisible(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!previewLocation) {
      setInlineError('동네를 선택해 주세요.');
      return;
    }
    setLocation(previewLocation.latitude, previewLocation.longitude, previewLocation.regionName);
    // MyPageStack 진입 시: goBack으로 수동 복귀
    // AuthStack 진입 시: setLocation으로 locationStore가 업데이트되면
    //   RootNavigator가 조건부 렌더링으로 자동 Main 전환 — 명시적 navigate 불필요
    if (route.params?.returnTo === 'mypage') {
      navigation.goBack();
    }
  }, [previewLocation, setLocation, route.params, navigation]);

  useEffect(() => {
    if (!hasInitialLocation.current) {
      handleGpsDetect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  return (
    <View style={styles.root}>
      {/* ── 지도 (풀스크린) ───────────────────────────────────────────── */}
      {previewLocation ? (
        <MapViewWrapper
          key={`${previewLocation.latitude}_${previewLocation.longitude}`}
          style={StyleSheet.absoluteFill}
          initialCamera={{
            latitude: previewLocation.latitude,
            longitude: previewLocation.longitude,
            zoom: 14,
          }}
          isShowLocationButton={false}
          isShowZoomControls={false}
          isScrollGesturesEnabled={false}
          isZoomGesturesEnabled={false}
          isRotateGesturesEnabled={false}
          isTiltGesturesEnabled={false}
          mapType="Basic"
          locale="ko"
        >
          {typeof previewLocation.latitude === 'number'
            && typeof previewLocation.longitude === 'number'
            && !isNaN(previewLocation.latitude)
            && !isNaN(previewLocation.longitude) && (
              <NaverMapMarkerOverlay
                latitude={previewLocation.latitude}
                longitude={previewLocation.longitude}
                tintColor={colors.primary}
              />
            )}
        </MapViewWrapper>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
          {isGpsLoading ? (
            <ActivityIndicator
              color={colors.primary}
              size="large"
              accessibilityLabel="위치 감지 중"
            />
          ) : (
            <>
              <MapPinIcon size={40} color={colors.gray200} />
              <Text style={styles.mapPlaceholderText}>
                {'GPS 버튼을 탭하거나\n검색으로 동네를 설정하세요'}
              </Text>
            </>
          )}
        </View>
      )}

      {/* ── 상단 플로팅 검색바 ────────────────────────────────────────── */}
      <View style={[styles.topBar, { top: topBarTop }]}>
        <Pressable
          style={styles.searchPill}
          onPress={() => setIsSearchModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="동네 직접 검색"
          accessibilityHint="탭하면 주소 검색 화면이 열립니다"
        >
          <SearchIcon size={spacing.iconSm} color={colors.gray400} />
          <Text style={styles.searchPillText}>동 이름으로 검색 (예: 역삼동)</Text>
        </Pressable>
      </View>

      {/* ── 하단 플로팅 컨트롤 ───────────────────────────────────────── */}
      <View style={[styles.bottomControls, { paddingBottom: bottomPaddingBottom }]}>
        {/* 에러 배너 */}
        {inlineError ? (
          <View
            style={styles.errorBanner}
            accessible={true}
            accessibilityLiveRegion="polite"
            accessibilityLabel={`오류: ${inlineError}`}
          >
            <Text style={styles.errorBannerText}>{inlineError}</Text>
            <TouchableOpacity
              onPress={() => setInlineError(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="오류 메시지 닫기"
            >
              <Text style={styles.errorBannerClose}>닫기</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* GPS + 시작하기 버튼 행 */}
        <View style={styles.controlRow}>
          {/* GPS 아이콘 FAB */}
          <TouchableOpacity
            style={styles.gpsFab}
            onPress={handleGpsDetect}
            disabled={isGpsLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="현재 위치 자동 감지"
          >
            {isGpsLoading ? (
              <ActivityIndicator
                color={colors.primary}
                size="small"
                accessibilityLabel="위치 감지 중"
              />
            ) : (
              <MapPinIcon size={spacing.iconMd} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* 시작하기 버튼 */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedRegionName && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedRegionName}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              selectedRegionName ? `${selectedRegionName}으로 시작하기` : '동네를 선택하세요'
            }
            accessibilityState={{ disabled: !selectedRegionName }}
          >
            <Text style={styles.confirmButtonText} numberOfLines={1}>
              {selectedRegionName ? `${selectedRegionName}으로 시작` : '시작하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 주소 검색 모달 ────────────────────────────────────────────── */}
      <Modal
        visible={isSearchModalVisible}
        animationType="slide"
        onRequestClose={() => setIsSearchModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          {/* 헤더 */}
          <View style={[styles.modalHeader, { paddingTop: modalHeaderPaddingTop }]}>
            <TouchableOpacity
              onPress={() => setIsSearchModalVisible(false)}
              style={styles.modalBackBtn}
              accessibilityRole="button"
              accessibilityLabel="검색 닫기"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeftIcon size={spacing.iconLg} color={colors.onBackground} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>동네 검색</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {/* 검색 인풋 */}
          <View style={styles.modalSearchContainer}>
            <SearchIcon size={spacing.iconSm} color={colors.gray400} />
            <TextInput
              style={styles.modalSearchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="동 이름으로 검색 (예: 역삼동)"
              placeholderTextColor={colors.gray400}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="동 이름 검색"
              accessibilityHint="동 이름으로 지역을 검색하세요"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="검색어 초기화"
              >
                <CloseIcon size={spacing.iconSm} color={colors.gray400} />
              </TouchableOpacity>
            ) : isSearching ? (
              <ActivityIndicator
                color={colors.primary}
                size="small"
                accessibilityLabel="검색 중"
              />
            ) : null}
          </View>

          {/* 검색 결과 / 빈 상태 */}
          {searchResults.length > 0 ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.flex}
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={`${item.jibunAddress}-${item.x}-${item.y}`}
                  style={styles.modalResultItem}
                  onPress={() => handleSelectAddress(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`주소 ${item.roadAddress || item.jibunAddress}`}
                >
                  <MapPinIcon size={spacing.iconXs} color={colors.gray400} />
                  <Text style={styles.modalResultText}>
                    {item.roadAddress || item.jibunAddress}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : debouncedSearchQuery.length >= 2 && !isSearching ? (
            <View
              style={styles.modalEmptyState}
              accessible={true}
              accessibilityLabel="검색 결과 없음"
            >
              <Text style={styles.modalEmptyText}>
                {'검색 결과가 없습니다.\n더 구체적인 주소로 검색해 보세요.\n예: 강남구 역삼동'}
              </Text>
            </View>
          ) : (
            <View style={styles.modalEmptyState}>
              <Text style={styles.modalEmptyText}>
                {'동 이름 또는 주소를 입력하세요'}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
  },
  flex: {
    flex: 1,
  },

  // ── 지도 플레이스홀더 ───────────────────────────────────────────────────
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  mapPlaceholderText: {
    ...typography.bodySm,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: spacing.lineHeightMd,
  },

  // ── 상단 플로팅 검색바 ─────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    // top은 인라인 (insets.top 의존)
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: spacing.floatShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationMd,
  },
  searchPillText: {
    ...typography.bodyMd,
    color: colors.gray400,
    flex: 1,
  },

  // ── 하단 플로팅 컨트롤 ─────────────────────────────────────────────────
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    // paddingBottom은 인라인 (insets.bottom 의존)
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  gpsFab: {
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
  confirmButton: {
    flex: 1,
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYLg },
    shadowOpacity: spacing.primaryShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationMd,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.gray400,
    opacity: spacing.disabledOpacity,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },

  // ── 에러 배너 ──────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.danger,
    flex: 1,
  },
  errorBannerClose: {
    ...typography.tagText,
    fontFamily: PJS.semiBold,
    color: colors.danger,
  },

  // ── 검색 모달 ──────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray200,
  },
  modalBackBtn: {
    width: spacing.backBtnSize,
    height: spacing.backBtnSize,
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.labelMd,
    flex: 1,
    textAlign: 'center',
    color: colors.onBackground,
  },
  modalHeaderSpacer: {
    width: spacing.backBtnSize,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    height: spacing.xxl,
    ...typography.bodyMd,
    color: colors.onBackground,
    padding: 0,
  },
  modalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray200,
  },
  modalResultText: {
    ...typography.bodyMd,
    color: colors.onBackground,
    flex: 1,
  },
  modalEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalEmptyText: {
    ...typography.bodySm,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: spacing.lineHeightSm,
  },
});

export default LocationSetupScreen;
