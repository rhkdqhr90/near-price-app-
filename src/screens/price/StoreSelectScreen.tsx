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
import { useMutation, useQuery } from '@tanstack/react-query';
import Geolocation from 'react-native-geolocation-service';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import type { CreateStoreDto, StoreType, NearbyStoreResponse } from '../../types/api.types';
import { useLocationStore } from '../../store/locationStore';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { useNearbyStores } from '../../hooks/queries/useNearbyStores';
import { useNaverPlaceSearch, type NaverPlaceDocument } from '../../hooks/queries/useNaverPlaceSearch';
import { useReverseGeocode } from '../../hooks/queries/useLocation';
import { storeApi } from '../../api/store.api';
import { isAxiosError } from '../../api/client';
import { STALE_TIME } from '../../lib/queryClient';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import {
  NaverMapMarkerOverlay,
  NaverMapCircleOverlay,
  type NaverMapViewRef,
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
import { getStoreCategoryColors } from '../../utils/storeCategory';
import { getDistanceM } from '../../utils/format';

// ─── 네이버 카테고리 → StoreType 추론 ─────────────────────────────────────────
const inferStoreType = (category: string): StoreType => {
  const cat = category.toLowerCase();
  if (cat.includes('편의점')) return 'convenience';
  if (cat.includes('대형마트') || cat.includes('이마트') || cat.includes('코스트코') || cat.includes('홈플러스')) return 'large_mart';
  if (cat.includes('시장') || cat.includes('재래시장')) return 'traditional_market';
  if (cat.includes('슈퍼')) return 'supermarket';
  return 'mart';
};

const normalizeRegionHint = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^(현재\s*위치|내\s*위치)$/.test(trimmed)) return null;
  return trimmed;
};

const parseNaverCoords = (
  place: NaverPlaceDocument,
): { latitude: number; longitude: number } | null => {
  const latitude = parseFloat(place.y);
  const longitude = parseFloat(place.x);
  if (isNaN(latitude) || isNaN(longitude)) return null;
  return { latitude, longitude };
};

const getDistanceFromOrigin = (
  originLatitude: number | null,
  originLongitude: number | null,
  targetLatitude: number,
  targetLongitude: number,
): number | null => {
  const distance = getDistanceM(
    originLatitude,
    originLongitude,
    targetLatitude,
    targetLongitude,
  );
  if (!Number.isFinite(distance)) return null;
  return Math.round(distance);
};

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

/** 선택된 매장 — DB 매장이거나 네이버 장소 (확정은 "다음" 버튼 탭 시점) */
type SelectedStore =
  | { kind: 'db'; store: NearbyStoreResponse }
  | { kind: 'naver'; place: NaverPlaceDocument };

const NEARBY_RADIUS_M = 3000; // 주변 매장 기본 반경 3km
const USER_RADIUS_M = 500;    // 지도 반경 원 표시용
const SEARCH_RADIUS_M = NEARBY_RADIUS_M;

const isWithinSearchRadius = (distanceM: number | null): boolean => {
  if (distanceM == null) return false;
  return distanceM <= SEARCH_RADIUS_M;
};

const StoreSelectScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { latitude: regionLat, longitude: regionLng, regionName } = useLocationStore();
  const { setStore } = usePriceRegisterStore();

  useUnsavedChangesWarning();

  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('pending');
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebounce(rawQuery, 300);
  const [selected, setSelected] = useState<SelectedStore | null>(null);
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

  const storedRegionHint = useMemo(
    () => normalizeRegionHint(regionName),
    [regionName],
  );
  const reverseTargetLat = gpsCoords?.latitude ?? null;
  const reverseTargetLng = gpsCoords?.longitude ?? null;
  const shouldResolveGpsRegionHint =
    reverseTargetLat !== null && reverseTargetLng !== null;
  const { data: gpsRegionHint } = useReverseGeocode(
    shouldResolveGpsRegionHint ? reverseTargetLng : null,
    shouldResolveGpsRegionHint ? reverseTargetLat : null,
  );
  const effectiveRegionHint = useMemo(() => {
    const normalizedGpsRegionHint = normalizeRegionHint(gpsRegionHint);
    if (gpsCoords) {
      return normalizedGpsRegionHint ?? undefined;
    }
    return storedRegionHint ?? undefined;
  }, [gpsCoords, gpsRegionHint, storedRegionHint]);

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

  // ─── 네이버 장소 검색 ────────────────────────────────────────────────────
  const {
    data: naverPlaces,
    isFetching: isNaverSearching,
    isError: isNaverError,
    refetch: refetchNaverPlaces,
  } = useNaverPlaceSearch(
    debouncedQuery,
    isSearching && hasSearchOrigin,
    effectiveRegionHint,
  );

  // ─── DB 매장명 검색 (검색 중일 때) ────────────────────────────────────────
  const {
    data: dbSearchStores,
    isFetching: isDbSearching,
    isError: isDbSearchError,
    refetch: refetchDbSearch,
  } = useQuery({
    queryKey: ['storeSearch', debouncedQuery],
    queryFn: () => storeApi.searchByName(debouncedQuery).then(r => r.data),
    enabled: isSearching && hasSearchOrigin,
    staleTime: STALE_TIME.medium,
  });

  // ─── 포커스 재진입 시 선택/쿼리 리셋 + GPS 재요청 ─────────────────────────
  const focusCountRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      setSelected(null);
      setRawQuery('');

      // 첫 마운트는 useEffect에서 처리, 재진입 시에만 GPS 재요청
      if (focusCountRef.current > 0) {
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
            setGpsCoords(null);
            setGpsStatus('failed');
            if (initialRegionLat.current != null && initialRegionLng.current != null) {
              mapRef.current?.animateCameraTo({
                latitude: initialRegionLat.current,
                longitude: initialRegionLng.current,
                zoom: 15,
              });
            }
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, forceRequestLocation: true },
        );
      }
      focusCountRef.current += 1;
    }, []),
  );

  // ─── GPS 마운트 1회 실행 ────────────────────────────────────────────────
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
          message: '주변 매장을 자동으로 표시하려면 위치 권한이 필요합니다',
          buttonPositive: '허용',
          buttonNegative: '건너뜀',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    };

    const run = async () => {
      const hasPermission = await requestPermission();
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
  }, []);

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

  // 검색 중 DB 결과를 "감지 가능 매장" 으로 merge
  type DbListItem = {
    kind: 'db';
    store: NearbyStoreResponse;
    distanceM: number | null;
  };

  type NaverListItem = {
    kind: 'naver';
    place: NaverPlaceDocument;
    distanceM: number | null;
  };

  type ListItem = DbListItem | NaverListItem;

  const listData = useMemo<ListItem[]>(() => {
    if (isSearching) {
      const originLatitude = searchOriginLatitude;
      const originLongitude = searchOriginLongitude;

      const dbMatches: DbListItem[] = (dbSearchStores ?? [])
        .map(s => {
          const distanceM = getDistanceFromOrigin(
            originLatitude,
            originLongitude,
            s.latitude,
            s.longitude,
          );

          return {
            kind: 'db' as const,
            store: {
              ...s,
              distance: distanceM ?? 0,
            } as NearbyStoreResponse,
            distanceM,
          };
        })
        .filter(item => isWithinSearchRadius(item.distanceM));

      const naverIds = new Set(
        (dbSearchStores ?? [])
          .map(s => s.externalPlaceId)
          .filter((v): v is string => !!v),
      );

      const naverItems: NaverListItem[] = (naverPlaces ?? [])
        .filter(p => !naverIds.has(p.id))
        .map(p => {
          const coords = parseNaverCoords(p);
          const distanceM = coords
            ? getDistanceFromOrigin(
                originLatitude,
                originLongitude,
                coords.latitude,
                coords.longitude,
              )
            : null;

          return {
            kind: 'naver' as const,
            place: p,
            distanceM,
          };
        })
        .filter(item => isWithinSearchRadius(item.distanceM));

      return [...dbMatches, ...naverItems].sort((a, b) => {
        if (a.distanceM === null && b.distanceM === null) return 0;
        if (a.distanceM === null) return 1;
        if (b.distanceM === null) return -1;
        return a.distanceM - b.distanceM;
      });
    }
    return sortedNearby.map(s => ({ kind: 'db', store: s, distanceM: s.distance }));
  }, [
    isSearching,
    dbSearchStores,
    naverPlaces,
    sortedNearby,
    searchOriginLatitude,
    searchOriginLongitude,
  ]);

  // ─── 지도 마커 ────────────────────────────────────────────────────────────
  const mapMarkers = useMemo(
    () =>
      listData
        .map(item => {
          if (item.kind === 'db') {
            return {
              id: item.store.id,
              latitude: item.store.latitude,
              longitude: item.store.longitude,
              title: item.store.name,
              type: item.store.type,
            };
          }
          const coords = parseNaverCoords(item.place);
          if (!coords) return null;
          return {
            id: item.place.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            title: item.place.name,
            type: inferStoreType(item.place.category),
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null),
    [listData],
  );

  // ─── 선택 핸들러 ──────────────────────────────────────────────────────────
  const selectedId: string | null = selected
    ? selected.kind === 'db'
      ? selected.store.id
      : selected.place.id
    : null;

  const handleSelectItem = useCallback(
    (item: ListItem) => {
      setInlineError(null);
      setSelected(item);
      const lat =
        item.kind === 'db'
          ? item.store.latitude
          : parseFloat(item.place.y);
      const lng =
        item.kind === 'db'
          ? item.store.longitude
          : parseFloat(item.place.x);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current?.animateCameraTo({ latitude: lat, longitude: lng, zoom: 17 });
      }
    },
    [],
  );

  // ─── "다음" 버튼 — DB 매장은 그대로, 네이버 장소는 find-or-create ─────────
  const { mutate: confirmSelection, isPending: isConfirming } = useMutation({
    mutationFn: async (sel: SelectedStore) => {
      if (sel.kind === 'db') return sel.store;
      // naver → DB find-or-create
      const place = sel.place;
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
      setInlineError(null);
      setStore(store.id, store.name);
      navigation.navigate('InputMethod');
    },
    onError: () => {
      setInlineError('매장 정보를 처리하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
    },
  });

  const handleNext = useCallback(() => {
    if (!selected) return;
    confirmSelection(selected);
  }, [selected, confirmSelection]);

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
    ({ item }: ListRenderItemInfo<ListItem>) => {
      const name = item.kind === 'db' ? item.store.name : item.place.name;
      const address =
        item.kind === 'db'
          ? item.store.address
          : item.place.roadAddress || item.place.address;
      const distance =
        item.distanceM;
      const type =
        item.kind === 'db'
          ? item.store.type
          : inferStoreType(item.place.category);
      const id = item.kind === 'db' ? item.store.id : item.place.id;
      return (
        <StoreListCard
          name={name}
          address={address}
          distance={distance}
          type={type}
          isActive={selectedId === id}
          onPress={() => handleSelectItem(item)}
        />
      );
    },
    [selectedId, handleSelectItem],
  );

  const keyExtractor = useCallback(
    (item: ListItem) => (item.kind === 'db' ? `db-${item.store.id}` : `nv-${item.place.id}`),
    [],
  );

  const isAwaitingGps = gpsStatus === 'pending';
  const isListLoading =
    isAwaitingGps ||
    (!isSearching && isNearbyLoading) ||
    (isSearching && hasSearchOrigin && (isNaverSearching || isDbSearching));
  const isAwaitingGpsForSearch = isSearching && !hasSearchOrigin;
  const isListError =
    (!isSearching && isNearbyError) ||
    (isSearching && hasSearchOrigin && (isNaverError || isDbSearchError));

  const handleRetryList = useCallback(() => {
    setInlineError(null);
    if (isSearching && hasSearchOrigin) {
      void Promise.all([refetchNaverPlaces(), refetchDbSearch()]);
      return;
    }
    void refetchNearbyStores();
  }, [isSearching, hasSearchOrigin, refetchNaverPlaces, refetchDbSearch, refetchNearbyStores]);

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

          {/* 매장 핀 (카테고리별 컬러) */}
          {mapMarkers.map(m => {
            const cat = getStoreCategoryColors(m.type);
            const isActive = selectedId === m.id;
            return (
              <NaverMapMarkerOverlay
                key={m.id}
                latitude={m.latitude}
                longitude={m.longitude}
                onTap={() => {
                  // 마커 탭 시 리스트에서 해당 아이템 찾아 선택
                  const found = listData.find(
                    it => (it.kind === 'db' ? it.store.id : it.place.id) === m.id,
                  );
                  if (found) handleSelectItem(found);
                }}
                tintColor={isActive ? colors.primary : cat.fg}
                caption={{
                  text: m.title,
                  textSize: 11,
                  color: isActive ? colors.primary : cat.fg,
                }}
              />
            );
          })}
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
          <Text style={styles.listStatusText}>현재 위치를 확인한 뒤 3km 반경으로 검색합니다.</Text>
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
                ? '내 위치 기준 3km 내 검색 결과가 없어요. 아래 "새 매장 직접 등록" 을 이용해 주세요.'
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
          style={[styles.nextBtn, (!selected || isConfirming) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected || isConfirming}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={selected ? '다음 단계' : '매장을 선택하세요'}
          accessibilityState={{ disabled: !selected || isConfirming }}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.nextBtnText}>다음</Text>
          )}
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
