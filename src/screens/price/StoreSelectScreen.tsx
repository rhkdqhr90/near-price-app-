import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  TextInput,
  FlatList,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Geolocation from 'react-native-geolocation-service';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import type { NearbyStoreResponse } from '../../types/api.types';
import { useLocationStore } from '../../store/locationStore';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { useNearbyStores } from '../../hooks/queries/useNearbyStores';
import { storeApi } from '../../api/store.api';
import { STALE_TIME } from '../../lib/queryClient';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import {
  NaverMapMarkerOverlay,
  NaverMapCircleOverlay,
  type NaverMapViewRef,
  type ClusterMarkerProp,
} from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import SearchIcon from '../../components/icons/SearchIcon';
import CloseIcon from '../../components/icons/CloseIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';
import StoreListCard from '../../components/price/StoreListCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../../utils/constants';
import { useDebounce } from '../../hooks/useDebounce';

// 자체 DB 의 좌표+키워드 결합 검색을 사용하므로 네이버 카테고리 추론/매장 등록 헬퍼는 더 이상 필요 없다.

type Props = PriceRegisterScreenProps<'StoreSelect'>;

interface GpsCoords {
  latitude: number;
  longitude: number;
}

/** GPS 위치 확인 단계 — 'pending'동안에는 검색 보류, 'failed' 시 동네 위치로 폴백하며 사용자에게 안내 */
type GpsStatus = 'pending' | 'success' | 'failed';

/** 매장 검색에 사용할 좌표 + 출처 (gps / region 폴백) */
type SearchOrigin =
  | { source: 'gps'; latitude: number; longitude: number }
  | { source: 'region'; latitude: number; longitude: number };

const NEARBY_RADIUS_M = 3000; // 주변 매장 기본 반경 3km
const USER_RADIUS_M = 500;    // 지도 반경 원 표시용
const SEARCH_RADIUS_M = 5000; // 키워드 검색 반경 — 본인 동네에서 살짝 떨어진 체인점도 포착

const StoreSelectScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { latitude: regionLat, longitude: regionLng } = useLocationStore();
  const { setStore } = usePriceRegisterStore();

  useUnsavedChangesWarning();

  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('pending');
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebounce(rawQuery, 300);
  const [selected, setSelected] = useState<NearbyStoreResponse | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const initialRegionLat = useRef(regionLat);
  const initialRegionLng = useRef(regionLng);
  const mapRef = useRef<NaverMapViewRef>(null);

  const isSearching = debouncedQuery.trim().length >= 2;

  // GPS 확인이 끝난 후에만 검색 좌표를 결정한다.
  // - GPS 성공: 현재 위치 사용
  // - GPS 실패: 동네 설정 위치로 폴백 (배너로 사용자에게 안내)
  // - GPS 확인 중(pending): null → 검색 보류
  const searchOrigin: SearchOrigin | null = useMemo(() => {
    if (gpsStatus === 'pending') {
      return null;
    }
    if (gpsCoords) {
      return {
        source: 'gps',
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
      };
    }
    if (regionLat != null && regionLng != null) {
      return { source: 'region', latitude: regionLat, longitude: regionLng };
    }
    return null;
  }, [gpsStatus, gpsCoords, regionLat, regionLng]);

  const searchOriginLatitude = searchOrigin?.latitude ?? null;
  const searchOriginLongitude = searchOrigin?.longitude ?? null;
  const hasSearchOrigin = searchOrigin !== null;
  const isUsingRegionFallback = searchOrigin?.source === 'region';

  // ─── 주변 매장 (쿼리 없을 때만 활성) ──────────────────────────────────────
  const {
    data: nearbyStores,
    isLoading: isNearbyLoading,
    isError: isNearbyError,
    refetch: refetchNearbyStores,
  } = useNearbyStores(
    !isSearching ? searchOriginLatitude : null,
    !isSearching ? searchOriginLongitude : null,
    NEARBY_RADIUS_M,
  );

  // ─── 좌표 + 키워드 결합 검색 (자체 DB) ─────────────────────────────────────
  // 백엔드가 거리 필터 + 거리순 정렬을 처리하므로 클라이언트에서는 결과를 그대로 사용한다.
  // 외부 검색 API(Naver Local) 의 5건 한계/위치 미지원 문제를 자체 DB 로 해결한다.
  const {
    data: searchResults,
    isFetching: isSearchFetching,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: [
      'storeSearchNearby',
      debouncedQuery.trim(),
      searchOriginLatitude,
      searchOriginLongitude,
    ],
    queryFn: () => {
      // enabled 가드로 진입 시점에 hasSearchOrigin 이 보장되지만, lint 회피 + 타입 안정성을
      // 위해 명시적 가드를 둔다.
      if (searchOriginLatitude === null || searchOriginLongitude === null) {
        return Promise.resolve([]);
      }
      // 백엔드도 trim 하지만 캐시 키 정합성과 명시성을 위해 클라이언트에서 한 번 더 정규화한다.
      return storeApi
        .searchNearby({
          lat: searchOriginLatitude,
          lng: searchOriginLongitude,
          keyword: debouncedQuery.trim(),
          radius: SEARCH_RADIUS_M,
        })
        .then((r) => r.data);
    },
    enabled: isSearching && hasSearchOrigin,
    staleTime: STALE_TIME.medium,
  });

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (already) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '위치 권한',
        message: '주변 매장을 자동으로 표시하려면 위치 권한이 필요합니다',
        buttonPositive: '허용',
        buttonNegative: '건너뜀',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  // ─── 포커스 재진입 시 선택/쿼리 리셋 + GPS 재요청 ─────────────────────────
  const focusCountRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      setSelected(null);
      setRawQuery('');

      // 첫 마운트는 useEffect에서 처리, 재진입 시에만 GPS 재요청
      if (focusCountRef.current > 0) {
        setGpsStatus('pending');
        requestLocationPermission()
          .then((hasPermission) => {
            if (!hasPermission) {
              setGpsCoords(null);
              setGpsStatus('failed');
              setInlineError('위치 권한이 꺼져 있어 현재 위치를 확인하지 못했어요. 권한을 허용해 주세요.');
              if (initialRegionLat.current != null && initialRegionLng.current != null) {
                mapRef.current?.animateCameraTo({
                  latitude: initialRegionLat.current,
                  longitude: initialRegionLng.current,
                  zoom: 15,
                });
              }
              return;
            }

            Geolocation.getCurrentPosition(
              pos => {
                const coords: GpsCoords = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                };
                setGpsCoords(coords);
                setGpsStatus('success');
                mapRef.current?.animateCameraTo({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  zoom: 16,
                });
              },
              () => {
                setGpsCoords(null);
                setGpsStatus('failed');
                if (initialRegionLat.current != null && initialRegionLng.current != null) {
                  mapRef.current?.animateCameraTo({
                    latitude: initialRegionLat.current,
                    longitude: initialRegionLng.current,
                    zoom: 15,
                  });
                } else {
                  // 저장된 동네 위치도 없는 엣지 케이스 — 사용자가 검색 보류 이유를 알 수 있도록 안내.
                  setInlineError(
                    '저장된 위치 정보가 없어요. 동네 설정 후 다시 시도해 주세요.',
                  );
                }
              },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, forceRequestLocation: true },
            );
          })
          .catch(() => {
            setGpsCoords(null);
            setGpsStatus('failed');
          });
      }
      focusCountRef.current += 1;
    }, [requestLocationPermission]),
  );

  // ─── GPS 마운트 1회 실행 ────────────────────────────────────────────────
  useEffect(() => {
    const fallbackLat = initialRegionLat.current;
    const fallbackLng = initialRegionLng.current;

    const run = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setGpsStatus('failed');
        if (fallbackLat != null && fallbackLng != null) {
          mapRef.current?.animateCameraTo({
            latitude: fallbackLat,
            longitude: fallbackLng,
            zoom: 15,
          });
        }
        return;
      }

      Geolocation.getCurrentPosition(
        pos => {
          const coords: GpsCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setGpsCoords(coords);
          setGpsStatus('success');
          mapRef.current?.animateCameraTo({
            latitude: coords.latitude,
            longitude: coords.longitude,
            zoom: 16,
          });
        },
        _error => {
          setGpsCoords(null);
          setGpsStatus('failed');
          if (fallbackLat != null && fallbackLng != null) {
            mapRef.current?.animateCameraTo({
              latitude: fallbackLat,
              longitude: fallbackLng,
              zoom: 15,
            });
          } else {
            setInlineError('저장된 위치 정보가 없어 서울 기준으로 검색 중입니다. 동네 설정 후 정확도가 높아집니다.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, forceRequestLocation: true },
      );
    };

    run().catch(() => undefined);
  }, [requestLocationPermission]);

  // ─── 지도 중심 ────────────────────────────────────────────────────────────
  const mapCenter = useMemo(
    () => ({
      latitude: gpsCoords?.latitude ?? regionLat ?? DEFAULT_LATITUDE,
      longitude: gpsCoords?.longitude ?? regionLng ?? DEFAULT_LONGITUDE,
    }),
    [gpsCoords, regionLat, regionLng],
  );

  // ─── 리스트 데이터 (검색 중 / 평상시) ────────────────────────────────────
  const sortedNearby = useMemo(() => {
    if (!nearbyStores) return [];
    return [...nearbyStores].sort((a, b) => a.distance - b.distance);
  }, [nearbyStores]);

  // 검색 결과 또는 주변 매장. 백엔드에서 거리 정렬 + 반경 필터를 모두 처리하므로
  // 클라이언트는 그대로 받아 표시한다.
  const listData = useMemo<NearbyStoreResponse[]>(() => {
    if (isSearching) {
      return searchResults ?? [];
    }
    return sortedNearby;
  }, [isSearching, searchResults, sortedNearby]);

  // ─── 지도 마커 (네이버 SDK native 클러스터링) ─────────────────────────────
  // 30개 마커가 한 화면에 폭주하지 않도록 줌 레벨에 따라 자동 클러스터링한다.
  // 클러스터(여러 매장 묶음) 탭 → SDK가 자동 줌 in. leaf(단일 매장) 탭 →
  // onTapClusterLeaf 로 매장 선택.
  const clusterMarkers = useMemo<ClusterMarkerProp[]>(
    () =>
      listData.map((item) => ({
        identifier: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        width: 32,
        height: 40,
      })),
    [listData],
  );

  const handleClusterLeafTap = useCallback(
    (p: { markerIdentifier: string }) => {
      const found = listData.find((it) => it.id === p.markerIdentifier);
      if (found) {
        setInlineError(null);
        setSelected(found);
        // 선택 시 그 매장 위치로 살짝 줌 in
        if (
          Number.isFinite(found.latitude) &&
          Number.isFinite(found.longitude)
        ) {
          mapRef.current?.animateCameraTo({
            latitude: found.latitude,
            longitude: found.longitude,
            zoom: 17,
          });
        }
      }
    },
    [listData],
  );

  // ─── 검색 결과가 들어오면 모든 매장이 화면에 보이도록 카메라 자동 fit ───────
  // 검색 직후 사용자 GPS 줌 레벨이 너무 빡빡해 결과 매장이 화면 밖에 있던 이슈를 해결.
  // 사용자 GPS 위치도 같이 보이게 포함하고, 5% padding 으로 가장자리 여유를 둔다.
  useEffect(() => {
    if (!isSearching) return;
    if (!searchResults || searchResults.length === 0) return;

    if (searchResults.length === 1) {
      mapRef.current?.animateCameraTo({
        latitude: searchResults[0].latitude,
        longitude: searchResults[0].longitude,
        zoom: 17,
      });
      return;
    }

    const lats = searchResults.map((s) => s.latitude);
    const lngs = searchResults.map((s) => s.longitude);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    if (gpsCoords) {
      minLat = Math.min(minLat, gpsCoords.latitude);
      maxLat = Math.max(maxLat, gpsCoords.latitude);
      minLng = Math.min(minLng, gpsCoords.longitude);
      maxLng = Math.max(maxLng, gpsCoords.longitude);
    }

    const padLat = (maxLat - minLat) * 0.05 || 0.001;
    const padLng = (maxLng - minLng) * 0.05 || 0.001;

    mapRef.current?.animateCameraWithTwoCoords({
      coord1: { latitude: minLat - padLat, longitude: minLng - padLng },
      coord2: { latitude: maxLat + padLat, longitude: maxLng + padLng },
    });
  }, [isSearching, searchResults, gpsCoords]);

  // ─── 선택 핸들러 ──────────────────────────────────────────────────────────
  const selectedId: string | null = selected ? selected.id : null;

  const handleSelectItem = useCallback((item: NearbyStoreResponse) => {
    setInlineError(null);
    setSelected(item);
    if (
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude)
    ) {
      mapRef.current?.animateCameraTo({
        latitude: item.latitude,
        longitude: item.longitude,
        zoom: 17,
      });
    }
  }, []);

  // ─── "다음" 버튼 — 자체 DB 매장이라 별도 비동기 작업 없이 바로 진행 ───────────
  const handleNext = useCallback(() => {
    if (!selected) return;
    setInlineError(null);
    setStore(selected.id, selected.name);
    navigation.navigate('InputMethod');
  }, [selected, setStore, navigation]);

  // ─── GPS 버튼 (지도 현재 위치 recenter) ───────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!gpsCoords) {
      setGpsStatus('pending');
      Geolocation.getCurrentPosition(
        pos => {
          const coords: GpsCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setGpsCoords(coords);
          setGpsStatus('success');
          mapRef.current?.animateCameraTo({
            latitude: coords.latitude,
            longitude: coords.longitude,
            zoom: 16,
          });
        },
        () => {
          setGpsStatus('failed');
          setInlineError('현재 위치를 확인하지 못했습니다. GPS와 위치 권한을 확인한 뒤 다시 시도해 주세요.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, forceRequestLocation: true },
      );
      return;
    }
    mapRef.current?.animateCameraTo({
      latitude: gpsCoords.latitude,
      longitude: gpsCoords.longitude,
      zoom: 16,
    });
  }, [gpsCoords]);

  // ─── "새 매장 직접 등록" ──────────────────────────────────────────────────
  const handleRegisterNew = useCallback(() => {
    const lat = gpsCoords?.latitude ?? initialRegionLat.current ?? DEFAULT_LATITUDE;
    const lng = gpsCoords?.longitude ?? initialRegionLng.current ?? DEFAULT_LONGITUDE;
    navigation.navigate('StoreRegister', { latitude: lat, longitude: lng });
  }, [gpsCoords, navigation]);

  // ─── 렌더 ─────────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<NearbyStoreResponse>) => (
      <StoreListCard
        name={item.name}
        address={item.address}
        distance={item.distance}
        type={item.type}
        isActive={selectedId === item.id}
        onPress={() => handleSelectItem(item)}
      />
    ),
    [selectedId, handleSelectItem],
  );

  const keyExtractor = useCallback(
    (item: NearbyStoreResponse) => item.id,
    [],
  );

  const isAwaitingGps = gpsStatus === 'pending';
  const isListLoading =
    isAwaitingGps ||
    (!isSearching && isNearbyLoading) ||
    (isSearching && hasSearchOrigin && isSearchFetching);
  const isAwaitingGpsForSearch = isSearching && !hasSearchOrigin;
  const isListError =
    (!isSearching && isNearbyError) ||
    (isSearching && hasSearchOrigin && isSearchError);

  const handleRetryList = useCallback(() => {
    setInlineError(null);
    if (isSearching && hasSearchOrigin) {
      void refetchSearch();
      return;
    }
    void refetchNearbyStores();
  }, [isSearching, hasSearchOrigin, refetchSearch, refetchNearbyStores]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <ChevronLeftIcon size={spacing.iconLg} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>매장 선택</Text>
        <View style={styles.backBtn} />
      </View>

      {/* STEP 라벨 */}
      <View style={styles.stepSection}>
        <Text style={styles.stepKicker}>STEP 1 / 3</Text>
        <Text style={styles.stepTitle}>어디서 장보고 계세요?</Text>
      </View>

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

      {/* 지도 (260px 고정) */}
      <View style={styles.mapWrap}>
        <MapViewWrapper
          ref={mapRef}
          style={styles.map}
          initialCamera={{
            latitude: mapCenter.latitude,
            longitude: mapCenter.longitude,
            zoom: 15,
          }}
          isShowLocationButton={false}
          isShowZoomControls={false}
          minZoom={10}
          maxZoom={18}
          mapType="Basic"
          locale="ko"
          clusters={[
            {
              width: 56,
              height: 56,
              markers: clusterMarkers,
              // maxZoom 보다 더 확대하면 모든 마커가 개별 표시됨 (15 정도가 적정)
              maxZoom: 15,
              screenDistance: 90,
            },
          ]}
          onTapClusterLeaf={handleClusterLeafTap}
        >
          {/* 반경 원 (500m) */}
          {gpsCoords ? (
            <NaverMapCircleOverlay
              latitude={gpsCoords.latitude}
              longitude={gpsCoords.longitude}
              radius={USER_RADIUS_M}
              color={'rgba(0,191,165,0.06)'}
              outlineWidth={1}
              outlineColor={'rgba(0,191,165,0.35)'}
            />
          ) : null}

          {/* 선택된 매장 강조 (클러스터 위 별도 오버레이) */}
          {selected ? (
            <NaverMapMarkerOverlay
              latitude={selected.latitude}
              longitude={selected.longitude}
              tintColor={colors.primary}
              width={44}
              height={52}
              caption={{
                text: selected.name,
                textSize: 12,
                color: colors.primary,
              }}
            />
          ) : null}
        </MapViewWrapper>

        {/* 지도 위 검색바 + 내 위치 버튼 */}
        <View style={styles.mapOverlay}>
          <View style={styles.searchBar}>
            <SearchIcon size={spacing.iconSm} color={colors.gray600} />
            <TextInput
              style={styles.searchInput}
              value={rawQuery}
              onChangeText={setRawQuery}
              placeholder="매장명 · 주소 검색"
              placeholderTextColor={colors.gray400}
              returnKeyType="search"
              accessibilityLabel="매장 검색"
            />
            {rawQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setRawQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="검색어 삭제"
              >
                <CloseIcon size={spacing.iconSm} color={colors.gray400} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={handleRecenter}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="내 위치로 이동"
          >
            <MapPinIcon size={spacing.iconMd} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* GPS 폴백 안내 — 현재 위치 확인 실패 시에만 표시 */}
      {isUsingRegionFallback ? (
        <TouchableOpacity
          style={styles.fallbackBanner}
          onPress={handleRecenter}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="현재 위치로 다시 검색"
        >
          <Text style={styles.fallbackBannerText}>
            현재 위치를 확인하지 못해 동네 설정 위치로 검색 중이에요. 탭하여 다시 시도하기
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* 리스트 헤더 */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>
          {isSearching ? '검색 결과' : '주변 매장'}{' '}
          <Text style={styles.listHeaderCount}>{listData.length}</Text>
          {isSearching ? '건' : '곳'}
        </Text>
        {!isSearching ? <Text style={styles.listHeaderSort}>가까운 순</Text> : null}
      </View>

      {/* 리스트 */}
      {isAwaitingGps ? (
        <View style={styles.listStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.listStatusText, styles.listStatusTextSpaced]}>
            현재 위치를 확인하는 중...
          </Text>
        </View>
      ) : isListLoading ? (
        <View style={styles.listStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isAwaitingGpsForSearch ? (
        <View style={styles.listStatus}>
          <Text style={styles.listStatusText}>{`현재 위치를 확인한 뒤 ${SEARCH_RADIUS_M / 1000}km 반경으로 검색합니다.`}</Text>
        </View>
      ) : isListError ? (
        <View style={styles.listStatus}>
          <Text style={styles.listStatusText}>매장을 불러오지 못했어요.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetryList}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="매장 목록 다시 시도"
          >
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {isSearching
                ? `내 위치 기준 ${SEARCH_RADIUS_M / 1000}km 내 검색 결과가 없어요. 아래 "새 매장 직접 등록" 을 이용해 주세요.`
                : '주변에 등록된 매장이 없어요.'}
            </Text>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.registerNewBtn}
              onPress={handleRegisterNew}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="새 매장 직접 등록"
            >
              <PlusCircleIcon size={spacing.iconSm} inactiveColor={colors.gray600} />
              <Text style={styles.registerNewText}>새 매장 직접 등록</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* 하단 고정 "다음" 버튼 */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={selected ? '다음 단계' : '매장을 선택하세요'}
          accessibilityState={{ disabled: !selected }}
        >
          <Text style={styles.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: spacing.headerHeight,
  },
  backBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.headingMd,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  // STEP 라벨 ─────────────────────────────────────────────────────────────
  stepSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  stepKicker: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  stepTitle: {
    ...typography.headingLg,
    fontFamily: PJS.extraBold,
    color: colors.onBackground,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },

  // 지도 영역 ────────────────────────────────────────────────────────────
  mapWrap: {
    height: spacing.storeMapH,
    marginHorizontal: spacing.md,
    borderRadius: spacing.radiusInput,
    overflow: 'hidden',
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    backgroundColor: colors.gray100,
  },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute',
    top: spacing.sm + spacing.micro,
    left: spacing.sm + spacing.micro,
    right: spacing.sm + spacing.micro,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    height: spacing.storeMapSearchBarH,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: spacing.cardShadowOpacity,
    shadowRadius: spacing.sm,
    elevation: spacing.elevationSm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.onBackground,
    padding: 0,
  },
  recenterBtn: {
    width: spacing.storeMapSearchBarH,
    height: spacing.storeMapSearchBarH,
    borderRadius: spacing.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: spacing.cardShadowOpacity,
    shadowRadius: spacing.sm,
    elevation: spacing.elevationSm,
  },

  // 리스트 헤더 ──────────────────────────────────────────────────────────
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + spacing.micro,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderTitle: {
    ...typography.bodySm,
    fontFamily: PJS.bold,
    color: colors.onBackground,
  },
  listHeaderCount: {
    color: colors.primary,
    fontFamily: PJS.extraBold,
  },
  listHeaderSort: {
    ...typography.caption,
    color: colors.gray600,
  },

  // 리스트 콘텐츠 ─────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listStatus: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  listStatusText: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  listStatusTextSpaced: {
    marginTop: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.micro,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    ...typography.captionBold,
    color: colors.white,
  },
  fallbackBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusSm,
    borderWidth: spacing.borderHairline,
    borderColor: colors.primary,
  },
  fallbackBannerText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600' as const,
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.radiusSm,
    borderWidth: spacing.borderHairline,
    borderColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  errorBannerClose: {
    ...typography.captionBold,
    color: colors.danger,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.gray600,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  // "새 매장 직접 등록" 점선 버튼 ────────────────────────────────────────
  registerNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.micro,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: spacing.borderEmphasis,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    borderRadius: spacing.storeListCardRadius,
    marginTop: spacing.sm,
  },
  registerNewText: {
    ...typography.bodySm,
    fontFamily: PJS.semiBold,
    color: colors.gray600,
  },

  // 하단 고정 "다음" ─────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: spacing.borderHairline,
    borderTopColor: colors.gray200,
  },
  nextBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: colors.gray200,
  },
  nextBtnText: {
    ...typography.headingMd,
    fontFamily: PJS.bold,
    color: colors.white,
    letterSpacing: -0.2,
  },
});

export default StoreSelectScreen;
