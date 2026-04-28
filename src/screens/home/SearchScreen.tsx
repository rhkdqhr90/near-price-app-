import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  RefreshControl,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import type { PriceResponse, NearbyStoreResponse } from '../../types/api.types';
import { useProductPricesByName } from '../../hooks/queries/usePrices';
import { useNearbyStores } from '../../hooks/queries/useNearbyStores';
import { useAddWishlist } from '../../hooks/queries/useWishlist';
import { useLocationStore } from '../../store/locationStore';
import EmptyState from '../../components/common/EmptyState';
import LoadingView from '../../components/common/LoadingView';
import ResilientImage from '../../components/common/ResilientImage';
import SearchIcon from '../../components/icons/SearchIcon';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import TagIcon from '../../components/icons/TagIcon';
import StoreIcon from '../../components/icons/StoreIcon';
import CloseIcon from '../../components/icons/CloseIcon';
import HeartIcon from '../../components/icons/HeartIcon';
import CheckIcon from '../../components/icons/CheckIcon';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { formatPrice, fixImageUrl } from '../../utils/format';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
const MAX_RECENT_SEARCHES = 10;

/** 인기 품목 TOP 8 — 레퍼런스 `마실 2/screens-misc.jsx` SearchScreen quickTags 기반 정적 목록 */
const POPULAR_SEARCHES: readonly string[] = [
  '계란',
  '두부',
  '우유',
  '라면',
  '사과',
  '삼겹살',
  '양파',
  '쌀',
];

type Props = HomeScreenProps<'Search'>;

type TabType = 'product' | 'store';

interface SearchPriceCard {
  productId: string;
  productName: string;
  unitType: string;
  storeName: string;
  minPrice: number;
  maxPrice: number;
  storeCount: number;
  hasClosingDiscount: boolean;
  imageUrl: string | null;
  quantity: number | null;
}

const groupSearchPricesByProduct = (prices: PriceResponse[]): SearchPriceCard[] => {
  const map = new Map<string, PriceResponse[]>();
  prices.forEach((p) => {
    if (!p.product?.name) return;
    const key = p.product.name.trim().toLowerCase();
    const group = map.get(key) ?? [];
    group.push(p);
    map.set(key, group);
  });

  return Array.from(map.values())
    .filter((group) => group.length > 0)
    .map((group) => {
    const sorted = [...group].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    const priceList = sorted.map((p) => p.price);
    return {
      productId: cheapest.product.id,
      productName: cheapest.product.name,
      unitType: cheapest.unitType ?? 'other',
      storeName: cheapest.store?.name ?? '매장 정보 없음',
      minPrice: Math.min(...priceList),
      maxPrice: Math.max(...priceList),
      storeCount: group.length,
      hasClosingDiscount: group.some(
        (p) => p.condition != null && p.condition.includes('마감'),
      ),
      imageUrl: cheapest.imageUrl || null,
      quantity: cheapest.quantity,
    };
  });
};

const SearchScreen: React.FC<Props> = ({ navigation, route }) => {
  const { latitude, longitude } = useLocationStore();
  const [activeTab, setActiveTab] = useState<TabType>('product');
  const [searchQuery, setSearchQuery] = useState(route.params?.initialQuery ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const recentSearchesRef = useRef<string[]>([]);
  recentSearchesRef.current = recentSearches;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { mutate: addWishlist } = useAddWishlist();

  useEffect(() => {
    inputRef.current?.focus();
    void storage.get<string[]>(STORAGE_KEYS.RECENT_SEARCHES).then(saved => {
      if (saved) setRecentSearches(saved);
    }).catch(() => {});
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // 마운트 시 1회 실행: 검색어 히스토리 로드 + 키보드 포커스
  }, []);

  const saveRecentSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    // ref로 항상 최신 목록 참조 — stale closure 방지
    const updated = [trimmed, ...recentSearchesRef.current.filter(q => q !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    await storage.set(STORAGE_KEYS.RECENT_SEARCHES, updated);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedQuery(text), 300);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      void saveRecentSearch(searchQuery);
    }
  }, [searchQuery, saveRecentSearch]);

  const handleClear = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const handleRecentSearchPress = useCallback((query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
    void saveRecentSearch(query);
  }, [saveRecentSearch]);

  const handleDeleteRecentSearch = useCallback(async (query: string) => {
    // ref로 항상 최신 목록 참조 — stale closure 방지
    const updated = recentSearchesRef.current.filter(q => q !== query);
    setRecentSearches(updated);
    await storage.set(STORAGE_KEYS.RECENT_SEARCHES, updated);
  }, []);

  const handleClearAllRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    await storage.remove(STORAGE_KEYS.RECENT_SEARCHES);
  }, []);

  const { data: priceResults, isLoading: isProductLoading, isError: isProductError,
    isRefetching: isProductRefetching, refetch: refetchProducts } =
    useProductPricesByName(activeTab === 'product' ? debouncedQuery : '');

  const { data: storeResults, isLoading: isStoreLoading, isError: isStoreError,
    isRefetching: isStoreRefetching, refetch: refetchStores } =
    useNearbyStores(
      activeTab === 'store' ? latitude : null,
      activeTab === 'store' ? longitude : null,
    );

  const productCards = useMemo(
    () => groupSearchPricesByProduct(priceResults ?? []),
    [priceResults],
  );

  const filteredStoreResults = useMemo(() => {
    if (!storeResults) return undefined;
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return storeResults;
    return storeResults.filter(s => s.name.toLowerCase().includes(q));
  }, [storeResults, debouncedQuery]);

  const handleStorePress = useCallback(
    (store: NearbyStoreResponse) => {
      void saveRecentSearch(store.name);
      navigation.navigate('StoreDetail', { storeId: store.id });
    },
    [navigation, saveRecentSearch],
  );

  const renderProductCard = useCallback(
    ({ item }: ListRenderItemInfo<SearchPriceCard>) => {
      const imageUri = fixImageUrl(item.imageUrl);
      const savings = item.maxPrice > 0 && item.maxPrice !== item.minPrice
        ? Math.round((1 - item.minPrice / item.maxPrice) * 100)
        : 0;
      return (
        <Pressable
          style={({ pressed }) => [styles.listCard, pressed && styles.listCardPressed]}
          onPress={() => {
            void saveRecentSearch(item.productName);
            navigation.navigate('PriceDetail', {
              productId: item.productId,
              productName: item.productName,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={`${item.productName} ${formatPrice(item.minPrice)}`}
        >
          {/* 썸네일 */}
          <View style={styles.listThumbWrap}>
            {imageUri ? (
              <ResilientImage
                uri={imageUri}
                style={styles.listThumb}
                resizeMode="cover"
                maxRetries={1}
                retryDelayMs={120}
                accessibilityLabel={`${item.productName} 상품 이미지`}
              />
            ) : (
              <View style={styles.listThumbPlaceholder}>
                <TagIcon size={22} color={colors.gray400} />
              </View>
            )}
          </View>

          {/* 좌측 정보 */}
          <View style={styles.listInfo}>
            <View style={styles.listTitleRow}>
              <Text style={styles.listProductName} numberOfLines={1}>{item.productName}</Text>
              {item.hasClosingDiscount && (
                <View style={styles.closingBadge}>
                  <Text style={styles.closingBadgeText}>마감할인</Text>
                </View>
              )}
            </View>
            <Text style={styles.listMeta} numberOfLines={1}>
              {item.storeName}
              {item.storeCount > 1 ? ` · 매장 ${item.storeCount}곳` : ''}
            </Text>
            <View style={styles.verifiedRow}>
              <CheckIcon size={12} color={colors.midnightMint} />
              <Text style={styles.verifiedText}>인증된 가격</Text>
            </View>
          </View>

          {/* 우측 가격 */}
          <View style={styles.listPriceCol}>
            <TouchableOpacity
              style={styles.listHeartBtn}
              onPress={() => addWishlist(item.productId)}
              activeOpacity={0.8}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`${item.productName} 찜하기`}
            >
              <HeartIcon size={16} color={colors.gray400} />
            </TouchableOpacity>
            <View style={styles.listPriceRow}>
              <Text style={styles.listPriceValue}>{formatPrice(item.minPrice)}</Text>
              <Text style={styles.listPriceUnit}>원</Text>
            </View>
            {savings > 0 && (
              <Text style={styles.listPriceStrike}>{formatPrice(item.maxPrice)}</Text>
            )}
            {savings > 0 && (
              <View style={styles.savingsPill}>
                <Text style={styles.savingsPillText}>{item.storeCount}곳 · −{savings}%</Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [navigation, saveRecentSearch, addWishlist],
  );

  const renderStoreItem = useCallback(
    ({ item }: ListRenderItemInfo<NearbyStoreResponse>) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleStorePress(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`매장 ${item.name}, ${item.distance}미터`}
      >
        <View style={styles.storeIconBox}>
          <StoreIcon size={16} color={colors.gray600} />
        </View>
        <View style={styles.resultBody}>
          <Text style={styles.resultName}>{item.name}</Text>
          <Text style={styles.resultSub} numberOfLines={1}>{item.address}</Text>
        </View>
        <Text style={styles.distanceText}>{item.distance}m</Text>
      </TouchableOpacity>
    ),
    [handleStorePress],
  );

  const noLocation = activeTab === 'store' && (latitude == null || longitude == null);
  const isLoading = activeTab === 'product' ? isProductLoading : isStoreLoading;
  const isError = activeTab === 'product' ? isProductError : isStoreError;
  const onRetry = activeTab === 'product' ? refetchProducts : refetchStores;
  const isEmpty = activeTab === 'product'
    ? productCards.length === 0
    : (!filteredStoreResults || filteredStoreResults.length === 0);
  const showEmpty = !isLoading && !isError && debouncedQuery.trim().length > 0 && isEmpty;
  const showIdle = activeTab === 'product' && debouncedQuery.trim().length === 0;
  const showRecentSearches = showIdle && recentSearches.length > 0;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.inner}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.gray400} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            placeholder={activeTab === 'product' ? '상품 이름 검색' : '매장명 검색 (예: 이마트)'}
            placeholderTextColor={colors.gray400}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={activeTab === 'product' ? '상품 검색' : '매장명 검색'}
            accessibilityHint={activeTab === 'product' ? '상품 이름을 입력하세요' : '매장명을 입력하세요'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="검색어 삭제">
              <CloseIcon size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="취소">
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {(['product', 'store'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            accessibilityLabel={tab === 'product' ? '상품 검색' : '매장 검색'}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'product' ? '상품' : '매장'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 콘텐츠 */}
      {noLocation ? (
        <EmptyState
          icon={MapPinIcon}
          title="위치가 설정되지 않았어요"
          subtitle="홈 화면에서 동네를 설정한 후 매장을 검색해 주세요."
        />
      ) : showIdle ? (
        <ScrollView
          style={styles.idleScroll}
          contentContainerStyle={styles.idleContent}
          keyboardShouldPersistTaps="handled"
        >
          {showRecentSearches && (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>최근 검색어</Text>
                <TouchableOpacity
                  onPress={handleClearAllRecentSearches}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="최근 검색어 전체 삭제"
                >
                  <Text style={styles.clearAllText}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentChipRow}>
                {recentSearches.map((query) => (
                  <TouchableOpacity
                    key={query}
                    style={styles.recentChip}
                    onPress={() => handleRecentSearchPress(query)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`최근 검색어 ${query}`}
                  >
                    <Text style={styles.recentChipText}>{query}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteRecentSearch(query)}
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={`${query} 삭제`}
                    >
                      <CloseIcon size={12} color={colors.gray400} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* 인기 품목 TOP 8 — 레퍼런스 `마실 2/screens-misc.jsx` SearchScreen */}
          <Text style={styles.popularTitle}>인기 품목 TOP 8</Text>
          <View style={styles.popularGrid}>
            {POPULAR_SEARCHES.map((tag, i) => (
              <TouchableOpacity
                key={tag}
                style={styles.popularItem}
                onPress={() => handleRecentSearchPress(tag)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`인기 품목 ${i + 1}위 ${tag}`}
              >
                <Text style={styles.popularRank}>{i + 1}</Text>
                <Text style={styles.popularName} numberOfLines={1}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : isLoading ? (
        <LoadingView message="검색 중..." />
      ) : isError ? (
        <EmptyState
          icon={WifiOffIcon}
          title="검색에 실패했어요"
          subtitle="네트워크 상태를 확인하고 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: onRetry }}
        />
      ) : showEmpty ? (
        <EmptyState
          icon={TagIcon}
          title="🔍 검색 결과가 없어요"
          subtitle="다른 이름으로 검색해 보세요"
        />
      ) : activeTab === 'product' ? (
        <FlatList
          data={productCards}
          keyExtractor={(item) => item.productId}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isProductRefetching}
              onRefresh={refetchProducts}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            productCards.length > 0 ? (
              <View style={styles.resultHeader}>
                <Text style={styles.resultHeaderText}>검색 결과 {productCards.length}건</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredStoreResults ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderStoreItem}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isStoreRefetching}
              onRefresh={refetchStores}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray200,
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
  cancelBtn: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.headingMd,
    fontFamily: PJS.medium,
    color: colors.gray600,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray200,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.gray100,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.tagText,
    color: colors.gray600,
  },
  tabTextActive: {
    fontFamily: PJS.semiBold,
    color: colors.white,
  },

  // ── 매장 탭 텍스트 리스트 ──
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray100,
  },
  storeIconBox: {
    width: spacing.searchIconBox,
    height: spacing.searchIconBox,
    borderRadius: spacing.sm,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: {
    flex: 1,
  },
  resultName: {
    ...typography.headingMd,
    marginBottom: spacing.micro,
  },
  resultSub: {
    ...typography.bodySm,
  },
  distanceText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  resultHeader: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray200,
  },
  resultHeaderText: {
    ...typography.caption,
    fontFamily: PJS.semiBold,
    color: colors.gray600,
  },

  // ── 최근 검색어 / 인기 품목 (idle 상태) ──
  idleScroll: {
    flex: 1,
  },
  idleContent: {
    paddingBottom: spacing.xxl,
  },
  recentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + spacing.micro,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.micro,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.micro,
    borderRadius: spacing.radiusFull,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  recentChipText: {
    ...typography.tagText,
    fontFamily: PJS.semiBold,
    color: colors.onBackground,
  },
  popularTitle: {
    ...typography.headingMd,
    fontFamily: PJS.extraBold,
    color: colors.onBackground,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs + spacing.micro,
  },
  popularItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  popularRank: {
    ...typography.body,
    fontFamily: PJS.extraBold,
    color: colors.primary,
  },
  popularName: {
    ...typography.body,
    fontFamily: PJS.bold,
    color: colors.onBackground,
    flex: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray100,
  },
  recentTitle: {
    ...typography.headingMd,
    color: colors.black,
  },
  clearAllText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.gray100,
  },
  recentItemText: {
    flex: 1,
    ...typography.body,
    color: colors.gray700,
  },

  // ── 상품 탭 세로형 리스트 카드 (레퍼런스 `마실 2/screens-home.jsx` PriceCard) ──
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm + spacing.micro,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: spacing.radiusInput,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  listCardPressed: {
    opacity: 0.95,
    backgroundColor: colors.surfaceContainerLow,
  },
  listThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
  },
  listThumb: {
    width: '100%',
    height: '100%',
  },
  listThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: spacing.micro + spacing.micro,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.micro,
    flexWrap: 'wrap',
  },
  listProductName: {
    ...typography.body,
    fontFamily: PJS.bold,
    color: colors.onBackground,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  closingBadge: {
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.radiusSm - 2,
    paddingHorizontal: spacing.xs + spacing.micro,
    paddingVertical: spacing.micro,
  },
  closingBadgeText: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.danger,
  },
  listMeta: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.micro,
  },
  verifiedText: {
    ...typography.tabLabel,
    fontFamily: PJS.semiBold,
    color: colors.midnightMint,
  },
  listPriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 92,
    gap: spacing.micro,
  },
  listHeartBtn: {
    padding: spacing.micro,
    marginBottom: spacing.xs,
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  listPriceValue: {
    ...typography.headingXl,
    fontFamily: PJS.extraBold,
    color: colors.onBackground,
    letterSpacing: -0.6,
    lineHeight: spacing.radiusXl,
  },
  listPriceUnit: {
    ...typography.bodySm,
    fontFamily: PJS.bold,
    color: colors.onBackground,
  },
  listPriceStrike: {
    ...typography.caption,
    color: colors.gray400,
    textDecorationLine: 'line-through',
    marginTop: spacing.micro,
  },
  savingsPill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs + spacing.micro,
    paddingVertical: spacing.micro,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.primaryLight,
  },
  savingsPillText: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.primary,
  },
});

export default SearchScreen;
