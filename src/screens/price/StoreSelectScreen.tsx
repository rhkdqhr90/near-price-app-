import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
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

// ─── 네이버 카테고리 → StoreType 추론 ─────────────────────────────────────────
const inferStoreType = (category: string): StoreType => {
  const cat = category.toLowerCase();
  if (cat.includes('편의점')) return 'convenience';
  if (cat.includes('대형마트') || cat.includes('이마트') || cat.includes('코스트코') || cat.includes('홈플러스')) return 'large_mart';
  if (cat.includes('시장') || cat.includes('재래시장')) return 'traditional_market';
  if (cat.includes('슈퍼')) return 'supermarket';
  return 'mart';
};

type Props = PriceRegisterScreenProps<'StoreSelect'>;

interface GpsCoords {
  latitude: number;
  longitude: number;
}

/** 선택된 매장 — DB 매장이거나 네이버 장소 (확정은 "다음" 버튼 탭 시점) */
type SelectedStore =
  | { kind: 'db'; store: NearbyStoreResponse }
  | { kind: 'naver'; place: NaverPlaceDocument };

const NEARBY_RADIUS_M = 3000; // 주변 매장 기본 반경 3km
const USER_RADIUS_M = 500;    // 지도 반경 원 표시용

const StoreSelectScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { latitude: regionLat, longitude: regionLng, regionName } = useLocationStore();
  const { setStore } = usePriceRegisterStore();

  useUnsavedChangesWarning();

  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebounce(rawQuery, 300);
  const [selected, setSelected] = useState<SelectedStore | null>(null);

  const initialRegionLat = useRef(regionLat);
  const initialRegionLng = useRef(regionLng);
  const mapRef = useRef<NaverMapViewRef>(null);

  const isSearching = debouncedQuery.trim().length >= 2;

  // ─── 주변 매장 (쿼리 없을 때만 활성) ──────────────────────────────────────
  const {
    data: nearbyStores,
    isLoading: isNearbyLoading,
    isError: isNearbyError,
  } = useNearbyStores(
    !isSearching ? gpsCoords?.latitude ?? regionLat ?? null : null,
    !isSearching ? gpsCoords?.longitude ?? regionLng ?? null : null,
    NEARBY_RADIUS_M,
  );

  // ─── 네이버 장소 검색 ────────────────────────────────────────────────────
  const {
    data: naverPlaces,
    isFetching: isNaverSearching,
    isError: isNaverError,
  } = useNaverPlaceSearch(debouncedQuery, isSearching, regionName ?? undefined);

  // ─── DB 매장명 검색 (검색 중일 때) ────────────────────────────────────────
  const { data: dbSearchStores } = useQuery({
    queryKey: ['storeSearch', debouncedQuery],
    queryFn: () => storeApi.searchByName(debouncedQuery).then(r => r.data),
    enabled: isSearching,
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
        Geolocation.getCurrentPosition(
          pos => {
            const coords: GpsCoords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setGpsCoords(coords);
            mapRef.current?.animateCameraTo({
              latitude: coords.latitude,
              longitude: coords.longitude,
              zoom: 16,
            });
          },
          () => {},
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
        if (fallbackLat != null && fallbackLng != null) {
          setGpsCoords({ latitude: fallbackLat, longitude: fallbackLng });
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
          mapRef.current?.animateCameraTo({
            latitude: coords.latitude,
            longitude: coords.longitude,
            zoom: 16,
          });
        },
        _error => {
          if (fallbackLat != null && fallbackLng != null) {
            setGpsCoords({ latitude: fallbackLat, longitude: fallbackLng });
            mapRef.current?.animateCameraTo({
              latitude: fallbackLat,
              longitude: fallbackLng,
              zoom: 15,
            });
          } else {
            Alert.alert('위치 정보 없음', '저장된 위치 정보가 없어 서울 기준으로 검색됩니다.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, forceRequestLocation: true },
      );
    };

    void run();
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
  type ListItem =
    | { kind: 'db'; store: NearbyStoreResponse }
    | { kind: 'naver'; place: NaverPlaceDocument };

  const listData = useMemo<ListItem[]>(() => {
    if (isSearching) {
      const dbMatches: ListItem[] = (dbSearchStores ?? []).map(s => ({
        kind: 'db',
        store: { ...s, distance: 0 } as NearbyStoreResponse,
      }));
      const naverIds = new Set(
        (dbSearchStores ?? [])
          .map(s => s.externalPlaceId)
          .filter((v): v is string => !!v),
      );
      const naverItems: ListItem[] = (naverPlaces ?? [])
        .filter(p => !naverIds.has(p.id))
        .map(p => ({ kind: 'naver', place: p }));
      return [...dbMatches, ...naverItems];
    }
    return sortedNearby.map(s => ({ kind: 'db', store: s }));
  }, [isSearching, dbSearchStores, naverPlaces, sortedNearby]);

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
          const lat = parseFloat(item.place.y);
          const lng = parseFloat(item.place.x);
          if (isNaN(lat) || isNaN(lng)) return null;
          return {
            id: item.place.id,
            latitude: lat,
            longitude: lng,
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
      setStore(store.id, store.name);
      navigation.navigate('InputMethod');
    },
    onError: () => {
      Alert.alert('오류', '매장 정보를 처리하는 데 실패했습니다.');
    },
  });

  const handleNext = useCallback(() => {
    if (!selected) return;
    confirmSelection(selected);
  }, [selected, confirmSelection]);

  // ─── GPS 버튼 (지도 현재 위치 recenter) ───────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!gpsCoords) return;
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
        item.kind === 'db' && !isSearching ? item.store.distance : null;
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
    [selectedId, isSearching, handleSelectItem],
  );

  const keyExtractor = useCallback(
    (item: ListItem) => (item.kind === 'db' ? `db-${item.store.id}` : `nv-${item.place.id}`),
    [],
  );

  const isListLoading =
    (!isSearching && isNearbyLoading) || (isSearching && isNaverSearching);
  const isListError =
    (!isSearching && isNearbyError) || (isSearching && isNaverError);

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
      {isListLoading ? (
        <View style={styles.listStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isListError ? (
        <View style={styles.listStatus}>
          <Text style={styles.listStatusText}>매장을 불러오지 못했어요.</Text>
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
                ? '검색 결과가 없어요. 아래 "새 매장 직접 등록" 을 이용해 주세요.'
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
