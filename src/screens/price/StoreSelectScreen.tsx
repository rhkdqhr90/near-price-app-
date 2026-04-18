import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Alert,
  Platform, PermissionsAndroid,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import Geolocation from 'react-native-geolocation-service';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import type { CreateStoreDto, StoreType, NearbyStoreResponse } from '../../types/api.types';
import { useLocationStore } from '../../store/locationStore';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { useNearbyStores } from '../../hooks/queries/useNearbyStores';
import { useNaverPlaceSearch, type NaverPlaceDocument } from '../../hooks/queries/useNaverPlaceSearch';
import { storeApi } from '../../api/store.api';
import { isAxiosError } from '../../api/client';
import { STALE_TIME } from '../../lib/queryClient';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { NaverMapMarkerOverlay, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import SearchIcon from '../../components/icons/SearchIcon';
import CloseIcon from '../../components/icons/CloseIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import DetectedStoreSheet from '../../components/price/DetectedStoreSheet';
import PendingPlaceSheet from '../../components/price/PendingPlaceSheet';
import StoreSearchResultsSheet from '../../components/price/StoreSearchResultsSheet';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../../utils/constants';
import { useDebounce } from '../../hooks/useDebounce';

// ─── 네이버 카테고리 → StoreType 추론 ─────────────────────────────────────────
const inferStoreType = (category: string): StoreType => {
  const cat = category.toLowerCase();
  if (cat.includes('편의점')) return 'convenience';
  if (cat.includes('대형마트') || cat.includes('이마트') || cat.includes('코스트코') || cat.includes('홈플러스')) return 'large_mart';
  if (cat.includes('시장') || cat.includes('재래시장')) return 'traditional_market';
  if (cat.includes('슈퍼')) return 'supermarket';
  return 'mart';
};

// ─────────────────────────────────────────────────────────────────────────────

type Props = PriceRegisterScreenProps<'StoreSelect'>;

interface GpsCoords {
  latitude: number;
  longitude: number;
}

interface PlaceMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
}

const AUTO_DETECT_RADIUS_M = 150;

const StoreSelectScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { latitude: regionLat, longitude: regionLng, regionName } = useLocationStore();
  const { setStore } = usePriceRegisterStore();

  // 작성 중 뒤로가기 시 확인 다이얼로그
  useUnsavedChangesWarning();

  const [uiMode, setUiMode] = useState<'search' | 'detected' | 'register'>('search');
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [detectionCoords, setDetectionCoords] = useState<GpsCoords | null>(null);
  const [detectedStore, setDetectedStore] = useState<NearbyStoreResponse | null>(null);
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebounce(rawQuery, 300);
  const [userDismissedDetection, setUserDismissedDetection] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<NaverPlaceDocument | null>(null);

  const initialRegionLat = useRef(regionLat);
  const initialRegionLng = useRef(regionLng);
  const mapRef = useRef<NaverMapViewRef>(null);

  // ─── 자동 감지: 150m 이내 DB 매장 ───────────────────────────────────────────
  const { data: detectionStores, isSuccess: isDetectionSuccess, isError: isDetectionError } =
    useNearbyStores(
      detectionCoords?.latitude ?? null,
      detectionCoords?.longitude ?? null,
      AUTO_DETECT_RADIUS_M,
    );

  // ─── 네이버 장소 검색 ────────────────────────────────────────────────────────
  const { data: naverPlaces, isFetching: isNaverSearching, isError: isNaverError, refetch: refetchPlaces } =
    useNaverPlaceSearch(debouncedQuery, showSearchResults, regionName ?? undefined);

  // ─── DB 매장 검색 (우리 앱에 등록된 매장) ──────────────────────────────────
  const { data: dbStores, isLoading: isDbLoading } = useQuery({
    queryKey: ['storeSearch', debouncedQuery],
    queryFn: () => storeApi.searchByName(debouncedQuery).then(r => r.data),
    enabled: showSearchResults && debouncedQuery.length >= 2,
    staleTime: STALE_TIME.medium,
  });

  // ─── 화면 재진입 시 상태 리셋 + GPS 재요청 ──────────────────────────────
  const gpsRequestCount = useRef(0);
  useFocusEffect(
    useCallback(() => {
      // 화면에 포커스가 올 때마다 감지 상태 리셋
      detectionProcessedRef.current = false;
      setUserDismissedDetection(false);
      setShowSearchResults(false);
      setRawQuery('');
      setSelectedPlaceId(null);
      setPendingPlace(null);
      setUiMode('search');

      // 첫 마운트는 useEffect에서 처리, 재진입 시에만 GPS 재요청
      if (gpsRequestCount.current > 0) {
        Geolocation.getCurrentPosition(
          pos => {
            const coords: GpsCoords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setGpsCoords(coords);
            setDetectionCoords(coords);
            mapRef.current?.animateCameraTo({
              latitude: coords.latitude,
              longitude: coords.longitude,
              zoom: 16,
            });
          },
          () => {
            // GPS 실패 시 기존 좌표 유지
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, forceRequestLocation: true },
        );
      }
      gpsRequestCount.current += 1;
    }, []),
  );

  // ─── 자동 감지 결과 처리 ───────────────────────────────────────────────────
  const detectionProcessedRef = useRef(false);
  useEffect(() => {
    if (detectionProcessedRef.current) return;
    if (uiMode !== 'search') return;
    if (userDismissedDetection) return;
    if (isDetectionSuccess) {
      detectionProcessedRef.current = true;
      const nearest = detectionStores && detectionStores.length > 0
        ? [...detectionStores].sort((a, b) => a.distance - b.distance)[0]
        : null;
      if (nearest) {
        setDetectedStore(nearest);
        setUiMode('detected');
      } else {
        // DB에 매장이 없으면 → "마트"로 자동 검색
        setRawQuery('마트');
        setShowSearchResults(true);
      }
    } else if (isDetectionError) {
      detectionProcessedRef.current = true;
      // 감지 실패 → "마트"로 자동 검색
      setRawQuery('마트');
      setShowSearchResults(true);
    }
  }, [isDetectionSuccess, isDetectionError, detectionStores, uiMode, userDismissedDetection]);

  // ─── GPS 마운트 1회 실행 ────────────────────────────────────────────────────
  useEffect(() => {
    const fallbackLat = initialRegionLat.current;
    const fallbackLng = initialRegionLng.current;

    const requestPermission = async (): Promise<boolean> => {
      if (Platform.OS !== 'android') return true;
      const already = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (already) return true;
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한',
          message: '주변 매장을 자동으로 감지하려면 위치 권한이 필요합니다',
          buttonPositive: '허용',
          buttonNegative: '건너뜀',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    };

    const run = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        if (fallbackLat != null && fallbackLng != null) {
          setGpsCoords({ latitude: fallbackLat, longitude: fallbackLng });
        }
        setShowSearchResults(true);
        return;
      }

      Geolocation.getCurrentPosition(
        pos => {
          const coords: GpsCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setGpsCoords(coords);
          setDetectionCoords(coords);
          mapRef.current?.animateCameraTo({
            latitude: coords.latitude,
            longitude: coords.longitude,
            zoom: 16,
          });
        },
        (_error) => {
          // GPS 실패 시 동네 설정 좌표로 폴백
          if (fallbackLat != null && fallbackLng != null) {
            setGpsCoords({ latitude: fallbackLat, longitude: fallbackLng });
            setDetectionCoords({ latitude: fallbackLat, longitude: fallbackLng });
            mapRef.current?.animateCameraTo({
              latitude: fallbackLat,
              longitude: fallbackLng,
              zoom: 15,
            });
          } else {
            Alert.alert('위치 정보 없음', '저장된 위치 정보가 없어 서울 기준으로 검색됩니다.');
            setShowSearchResults(true);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, forceRequestLocation: true },
      );
    };

    void run();
  }, []);


  // ─── 지도 중심 ───────────────────────────────────────────────────────────────
  const mapCenter = useMemo(() => ({
    latitude: gpsCoords?.latitude ?? regionLat ?? DEFAULT_LATITUDE,
    longitude: gpsCoords?.longitude ?? regionLng ?? DEFAULT_LONGITUDE,
  }), [gpsCoords, regionLat, regionLng]);

  // ─── 지도 마커 ───────────────────────────────────────────────────────────────
  const mapMarkers = useMemo<PlaceMarker[]>(() => {
    if (uiMode === 'detected' && detectedStore) {
      return [{
        id: detectedStore.id,
        latitude: detectedStore.latitude,
        longitude: detectedStore.longitude,
        title: detectedStore.name,
      }];
    }
    if (showSearchResults && naverPlaces) {
      return naverPlaces.map(p => ({
        id: p.id,
        latitude: parseFloat(p.y),
        longitude: parseFloat(p.x),
        title: p.name,
      }));
    }
    return [];
  }, [uiMode, showSearchResults, detectedStore, naverPlaces]);

  // ─── 감지된 DB 매장 선택 ────────────────────────────────────────────────────
  const handleSelectDetected = useCallback((store: NearbyStoreResponse) => {
    setStore(store.id, store.name);
    navigation.navigate('InputMethod');
  }, [setStore, navigation]);

  // ─── 네이버 장소 선택 → DB find-or-create ───────────────────────────────────
  const { mutate: selectNaverPlace, isPending: isSelectingPlace } = useMutation({
    mutationFn: async (place: NaverPlaceDocument) => {
      try {
        const existing = await storeApi.getByExternalId(place.id).then(r => r.data);
        return existing;
      } catch (err) {
        if (!isAxiosError(err) || err.response?.status !== 404) throw err;
        const dto: CreateStoreDto = {
          name: place.name,
          type: inferStoreType(place.category),
          latitude: parseFloat(place.y),
          longitude: parseFloat(place.x),
          address: place.roadAddress || place.address,
          externalPlaceId: place.id,
        };
        return storeApi.create(dto).then(r => r.data);
      }
    },
    onSuccess: store => {
      setStore(store.id, store.name);
      navigation.navigate('InputMethod');
    },
    onError: () => {
      Alert.alert('오류', '매장 정보를 처리하는 데 실패했습니다.');
    },
  });

  // 목록에서 매장 탭 → 지도 이동 + 확인 모달 표시 (바로 등록하지 않음)
  const handleSelectNaverPlace = useCallback((place: NaverPlaceDocument) => {
    setSelectedPlaceId(place.id);
    setPendingPlace(place);
    setShowSearchResults(false); // 목록 닫기
    // 지도 카메라를 해당 위치로 이동
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current?.animateCameraTo({ latitude: lat, longitude: lng, zoom: 17 });
    }
  }, []);

  // 확인 모달에서 "이 매장이에요" 누르면 실제 등록/선택 진행
  const handleConfirmPlace = useCallback(() => {
    if (!pendingPlace) return;
    selectNaverPlace(pendingPlace);
  }, [pendingPlace, selectNaverPlace]);

  // 확인 모달에서 "다른 매장" 누르면 목록으로 복귀
  const handleCancelPlace = useCallback(() => {
    setPendingPlace(null);
    setSelectedPlaceId(null);
    setShowSearchResults(true);
  }, []);


  // ─── 검색 결과 리스트 "직접 등록" 핸들러 ─────────────────────────────────────
  const handleRegisterNew = useCallback(() => {
    setShowSearchResults(false);
    setPendingPlace(null);
    const lat = gpsCoords?.latitude ?? initialRegionLat.current ?? DEFAULT_LATITUDE;
    const lng = gpsCoords?.longitude ?? initialRegionLng.current ?? DEFAULT_LONGITUDE;
    navigation.navigate('StoreRegister', { latitude: lat, longitude: lng });
  }, [setShowSearchResults, setPendingPlace, gpsCoords, navigation]);

  // ─── DB 매장 선택 핸들러 ─────────────────────────────────────────────────────
  const handleSelectDbStore = useCallback((storeId: string, storeName: string) => {
    setStore(storeId, storeName);
    setShowSearchResults(false);
    navigation.navigate('InputMethod');
  }, [setStore, setShowSearchResults, navigation]);

  // ─── 감지 해제 핸들러 ───────────────────────────────────────────────────────
  const handleDismissDetected = useCallback(() => {
    setUserDismissedDetection(true);
    setUiMode('search');
    setShowSearchResults(true);
  }, []);


  return (
    <View style={styles.container}>
      {/* 지도 영역 */}
      <MapViewWrapper
        ref={mapRef}
        style={styles.map}
        initialCamera={{
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          zoom: 14,
        }}
        isShowLocationButton={false}
        isShowZoomControls={false}
        minZoom={10}
        maxZoom={18}
        mapType="Basic"
        locale="ko">
        {mapMarkers
          .filter(m => typeof m.latitude === 'number' && typeof m.longitude === 'number' && !isNaN(m.latitude) && !isNaN(m.longitude))
          .map(m => (
            <NaverMapMarkerOverlay
              key={m.id}
              latitude={m.latitude}
              longitude={m.longitude}
              onTap={() => setSelectedPlaceId(m.id)}
              tintColor={selectedPlaceId === m.id ? colors.danger : colors.primary}
              caption={{
                text: m.title,
                textSize: 11,
                color: selectedPlaceId === m.id ? colors.danger : colors.primary,
              }}
            />
          ))}
      </MapViewWrapper>

      {/* 상단 검색바 */}
      <View style={[styles.searchBarOverlay, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backFab}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <ChevronLeftIcon size={24} color={colors.black} />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <SearchIcon size={16} color={colors.gray400} />
            <TextInput
              style={styles.searchInput}
              value={rawQuery}
              onChangeText={(text) => {
                setRawQuery(text);
                // 검색 시작하면 확인 모달 닫기 (겹침 방지)
                if (pendingPlace) {
                  setPendingPlace(null);
                  setSelectedPlaceId(null);
                }
                setShowSearchResults(true);
              }}
              placeholder="네이버 지도에서 매장 검색"
              placeholderTextColor={colors.gray400}
              returnKeyType="search"
              autoFocus={false}
              accessibilityLabel="매장 검색"
              accessibilityHint="네이버 지도에서 매장을 검색하세요"
            />
            {rawQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setRawQuery('');
                  setShowSearchResults(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="검색어 삭제">
                <CloseIcon size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 감지된 매장 시트 */}
      {uiMode === 'detected' && detectedStore ? (
        <DetectedStoreSheet
          store={detectedStore}
          onConfirm={handleSelectDetected}
          onDismiss={handleDismissDetected}
        />
      ) : null}

      {/* 검색 매장 확인 시트 */}
      {pendingPlace ? (
        <PendingPlaceSheet
          place={pendingPlace}
          isLoading={isSelectingPlace}
          onConfirm={handleConfirmPlace}
          onCancel={handleCancelPlace}
        />
      ) : null}


      {/* 검색 결과 시트 */}
      {showSearchResults ? (
        <StoreSearchResultsSheet
          naverPlaces={naverPlaces ?? []}
          dbStores={dbStores}
          debouncedQuery={debouncedQuery}
          selectedPlaceId={selectedPlaceId}
          isNaverSearching={isNaverSearching}
          isDbLoading={isDbLoading}
          isNaverError={isNaverError}
          isSelectingPlace={isSelectingPlace}
          bottomInset={insets.bottom}
          onSelectPlace={handleSelectNaverPlace}
          onSelectDbStore={handleSelectDbStore}
          onClose={() => setShowSearchResults(false)}
          onRetry={() => void refetchPlaces()}
          onRegisterNew={handleRegisterNew}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  map: { flex: 1 },

  // ─── 상단 검색바 오버레이 ──────────────────────────────────────────────────────
  searchBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.08,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 40,
    zIndex: 40,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },

  backFab: {
    width: 40,
    height: 40,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.15,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 4,
  },
});

export default StoreSelectScreen;
