import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp, NavigationProp } from '@react-navigation/native';
import type { AuthStackParamList, MyPageStackParamList } from '../../navigation/types';
import Geolocation from 'react-native-geolocation-service';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import type { NaverGeocodeResult } from '../../api/naver-local.api';
import { useReverseGeocode, useGeocodeSearch } from '../../hooks/queries/useLocation';
import { useLocationStore } from '../../store/locationStore';
import MapPinIcon from '../../components/icons/MapPinIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const SCREEN_H = Dimensions.get('window').height;

type LocationSetupRoute =
  | RouteProp<AuthStackParamList, 'LocationSetup'>
  | RouteProp<MyPageStackParamList, 'LocationSetup'>;

const LocationSetupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList | MyPageStackParamList>>();
  const route = useRoute<LocationSetupRoute>();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsLatLng, setGpsLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [previewLocation, setPreviewLocation] = useState<{
    latitude: number;
    longitude: number;
    regionName: string;
  } | null>(null);

  // 인라인 에러 배너 상태
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { setLocation } = useLocationStore();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    data: reverseGeocodedName,
    isError: isReverseError,
    isFetching: isReverseFetching,
    invalidateAndRefetch,
  } = useReverseGeocode(gpsLatLng?.lng ?? null, gpsLatLng?.lat ?? null);

  const { data: geocodeResults, isFetching: isSearching } = useGeocodeSearch(debouncedSearchQuery);

  const searchResults: NaverGeocodeResult[] = useMemo(() => geocodeResults ?? [], [geocodeResults]);

  const selectedRegionName = previewLocation?.regionName || null;

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
        regionName: '',
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
    } else if (reverseGeocodedName === null) {
      setPreviewLocation({
        latitude: gpsLatLng.lat,
        longitude: gpsLatLng.lng,
        regionName: '',
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
    invalidateAndRefetch().catch(() => {});
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsLatLng({ lat: latitude, lng: longitude });
      },
      () => {
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

  const handleSelectAddress = (doc: NaverGeocodeResult) => {
    const latitude = parseFloat(doc.y);
    const longitude = parseFloat(doc.x);
    if (isNaN(latitude) || isNaN(longitude)) {
      setInlineError('유효하지 않은 주소입니다. 다른 주소를 선택해 주세요.');
      return;
    }
    setInlineError(null);
    const regionName = doc.jibunAddress || doc.roadAddress;
    setPreviewLocation({ latitude, longitude, regionName });
    setDebouncedSearchQuery('');
    setSearchQuery('');
  };

  const handleConfirm = () => {
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
  };

  const handleGpsDetectRef = useRef(handleGpsDetect);
  handleGpsDetectRef.current = handleGpsDetect;
  useEffect(() => {
    handleGpsDetectRef.current();
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  return (
    <View style={styles.root}>
      {/* ── 지도 영역 (상단 38%) ─────────────────────────────────────── */}
      <View style={styles.mapZone}>
        {previewLocation ? (
          <MapViewWrapper
            key={`${previewLocation.latitude}_${previewLocation.longitude}`}
            style={styles.mapFill}
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
            {typeof previewLocation.latitude === 'number' && typeof previewLocation.longitude === 'number'
              && !isNaN(previewLocation.latitude) && !isNaN(previewLocation.longitude) && (
                <NaverMapMarkerOverlay
                  latitude={previewLocation.latitude}
                  longitude={previewLocation.longitude}
                  tintColor={colors.primary}
                />
              )}
          </MapViewWrapper>
        ) : (
          <View style={styles.mapPlaceholder}>
            {isGpsLoading ? (
              <>
                <ActivityIndicator
                  color={colors.primary}
                  size="large"
                  accessibilityLabel="위치 감지 중"
                />
                <Text style={styles.mapPlaceholderText}>위치 찾는 중...</Text>
              </>
            ) : (
              <>
                <MapPinIcon size={36} color={colors.gray400} />
                <Text style={styles.mapPlaceholderText}>
                  {'위치를 선택하면\n지도가 표시됩니다'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* 동네 칩 오버레이 */}
        {selectedRegionName ? (
          <View style={styles.locationChipWrap}>
            <View style={styles.locationChip}>
              <MapPinIcon size={spacing.iconXs} color={colors.primary} />
              <Text style={styles.locationChipText}>{selectedRegionName}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── 하단 패널 ─────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.bottomPanel}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 드래그 핸들 */}
            <View style={styles.dragHandle} />

            <Text style={styles.title}>내 동네를 알려주세요</Text>
            <Text style={styles.subtitle}>어디서 장을 보시나요?</Text>

            {/* 인라인 에러 배너 */}
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

            {/* GPS 자동 감지 버튼 */}
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleGpsDetect}
              disabled={isGpsLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="현재 위치 자동 감지"
            >
              {isGpsLoading ? (
                <ActivityIndicator
                  color={colors.onPrimary}
                  size="small"
                  accessibilityLabel="위치 감지 중"
                />
              ) : (
                <>
                  <MapPinIcon size={spacing.iconSm} color={colors.onPrimary} />
                  <Text style={styles.gpsButtonText}>현재 위치 자동 감지</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는 직접 검색</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 주소 검색 */}
            <View style={styles.searchContainer}>
              <SearchIcon size={spacing.iconSm} color={colors.gray400} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={() => {
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                }}
                placeholder="동 이름으로 검색 (예: 역삼동)"
                placeholderTextColor={colors.gray400}
                returnKeyType="search"
                accessibilityLabel="동 이름 검색"
                accessibilityHint="동 이름으로 지역을 검색하세요"
              />
              {isSearching ? (
                <ActivityIndicator
                  color={colors.primary}
                  size="small"
                  accessibilityLabel="검색 중"
                />
              ) : null}
            </View>

            {/* 검색 결과 */}
            {searchResults.length > 0 ? (
              <View style={styles.searchResultList}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={`${item.jibunAddress}-${item.x}-${item.y}`}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectAddress(item)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`주소 ${item.roadAddress || item.jibunAddress}`}
                  >
                    <Text style={styles.searchResultText}>
                      {item.roadAddress || item.jibunAddress}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* 시작하기 버튼 */}
            <View style={styles.bottomArea}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedRegionName && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!selectedRegionName}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={selectedRegionName ? `${selectedRegionName}로 시작하기` : '동네를 선택하세요'}
                accessibilityState={{ disabled: !selectedRegionName }}
              >
                <Text style={styles.confirmButtonText}>시작하기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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

  // ── 지도 영역 ──────────────────────────────────────────────────────────
  mapZone: {
    height: SCREEN_H * 0.38,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  mapFill: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapPlaceholderText: {
    ...typography.bodySm,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── 동네 칩 오버레이 ───────────────────────────────────────────────────
  locationChipWrap: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.15,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 4,
  },
  locationChipText: {
    ...typography.labelMd,
    fontWeight: '700' as const,
    color: colors.black,
  },

  // ── 하단 패널 ──────────────────────────────────────────────────────────
  bottomPanel: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: spacing.radiusXl,
    borderTopRightRadius: spacing.radiusXl,
    marginTop: -spacing.radiusXl,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYUp },
    shadowOpacity: 0.08,
    shadowRadius: spacing.shadowRadiusXl,
    elevation: 8,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  dragHandle: {
    width: spacing.dragHandleW,
    height: spacing.dragHandleH,
    backgroundColor: colors.gray200,
    borderRadius: spacing.radiusFull,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  // ── 타이틀 ─────────────────────────────────────────────────────────────
  title: {
    ...typography.displaySm,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.gray600,
    marginBottom: spacing.lg,
  },

  // ── 에러 배너 ──────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.danger,
    flex: 1,
  },
  errorBannerClose: {
    ...typography.tagText,
    color: colors.danger,
    fontWeight: '600' as const,
  },

  // ── GPS 버튼 ──────────────────────────────────────────────────────────
  gpsButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    height: spacing.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYLg },
    shadowOpacity: 0.3,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 6,
  },
  gpsButtonText: {
    ...typography.labelMd,
    fontWeight: '700' as const,
    color: colors.onPrimary,
  },

  // ── 구분선 ─────────────────────────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    ...typography.tagText,
    fontWeight: '400' as const,
    marginHorizontal: spacing.sm,
    color: colors.gray400,
  },

  // ── 검색바 ────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 24,
    ...typography.bodyMd,
    color: colors.black,
    padding: 0,
  },

  // ── 검색 결과 ──────────────────────────────────────────────────────────
  searchResultList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.sm,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.08,
    shadowRadius: spacing.shadowRadiusXl,
    elevation: 4,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.surfaceContainerLow,
  },
  searchResultText: {
    ...typography.bodyMd,
    color: colors.black,
  },

  // ── 확인 버튼 ──────────────────────────────────────────────────────────
  bottomArea: {
    paddingTop: spacing.md,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    height: spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  confirmButtonText: {
    ...typography.labelMd,
    fontWeight: '700' as const,
    color: colors.onPrimary,
  },
});

export default LocationSetupScreen;
