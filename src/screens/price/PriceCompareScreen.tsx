import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  LayoutAnimation,
  ActivityIndicator,
  Modal,
  Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useProductPricesByName } from '../../hooks/queries/usePrices';
import {
  useMyWishlist,
  useAddWishlist,
  useRemoveWishlist,
} from '../../hooks/queries/useWishlist';
import {
  useLocationStore,
  RADIUS_OPTIONS,
  type RadiusOption,
} from '../../store/locationStore';
import { getDistanceM, formatPrice, fixImageUrl } from '../../utils/format';
import PriceRankCard from '../../components/price/PriceRankCard';
import PriceMapSection from '../../components/price/PriceMapSection';
import PriceTrendChart from '../../components/price/PriceTrendChart';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import HeartIcon from '../../components/icons/HeartIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import TagIcon from '../../components/icons/TagIcon';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import ChevronDownIcon from '../../components/icons/ChevronDownIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import type { PriceResponse, ProductCategory } from '../../types/api.types';
import { useToastStore } from '../../store/toastStore';

const RADIUS_LABELS: Record<RadiusOption, string> = {
  1000: '1km 이내',
  3000: '3km 이내',
  5000: '5km 이내',
  10000: '10km 이내',
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  vegetable: '채소',
  fruit: '과일',
  meat: '육류',
  seafood: '해산물',
  dairy: '유제품',
  grain: '곡류',
  processed: '가공식품',
  household: '생활용품',
  other: '기타',
};

const CATEGORY_EMOJI: Record<ProductCategory, string> = {
  vegetable: '🥬',
  fruit: '🍎',
  meat: '🥩',
  seafood: '🐟',
  dairy: '🥛',
  grain: '🌾',
  processed: '🍱',
  household: '🧴',
  other: '📦',
};

function formatDistanceM(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

const TOP_RANK_COUNT = 3; // renderSummaryHeader에서 별도 렌더링하는 상위 카드 수

function getDistText(
  store: PriceResponse['store'],
  lat: number | null,
  lng: number | null,
): string | null {
  if (lat === null || lng === null) return null;
  if (store.latitude == null || store.longitude == null) return null;
  const d = getDistanceM(lat, lng, store.latitude, store.longitude);
  return isNaN(d) ? null : formatDistanceM(d);
}

type Props = HomeScreenProps<'PriceCompare'>;
type ViewMode = 'list' | 'map';

const PriceCompareScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId, productName } = route.params;
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const showToast = useToastStore(s => s.showToast);

  const { latitude, longitude, radius, setRadius } = useLocationStore();

  const {
    data: prices,
    isLoading: isPricesLoading,
    isError: isPricesError,
    refetch: refetchPrices,
  } = useProductPricesByName(productName);

  const filteredPrices = useMemo(() => {
    if (!prices) return [];
    if (latitude === null || longitude === null) return prices;
    return prices.filter(p => {
      if (p.store.latitude == null || p.store.longitude == null) return true;
      if (isNaN(p.store.latitude) || isNaN(p.store.longitude)) return true;
      const dist = getDistanceM(
        latitude,
        longitude,
        p.store.latitude,
        p.store.longitude,
      );
      return !isNaN(dist) && dist <= radius;
    });
  }, [prices, latitude, longitude, radius]);

  // 가격 통계
  const priceStats = useMemo(() => {
    if (!filteredPrices || filteredPrices.length === 0) return null;
    const sorted = [...filteredPrices].sort((a, b) => a.price - b.price);
    const min = sorted[0].price;
    const max = sorted[sorted.length - 1].price;
    const avg = Math.round(
      filteredPrices.reduce((s, p) => s + p.price, 0) / filteredPrices.length,
    );
    return {
      min,
      max,
      avg,
      count: filteredPrices.length,
      cheapestStore: sorted[0].store.name,
      cheapestStoreId: sorted[0].store.id,
      sortedPrices: sorted,
      allPrices: filteredPrices,
      heroImageUrl: fixImageUrl(filteredPrices[0]?.imageUrl) ?? '',
      category: filteredPrices[0]?.product?.category ?? 'other',
    };
  }, [filteredPrices]);

  useEffect(() => {
    setHeroImgFailed(false);
  }, [priceStats?.heroImageUrl]);

  // FlatList에 표시할 TOP_RANK_COUNT 이후 항목 (안정된 배열 참조 유지)
  const remainingPrices = useMemo(
    () => priceStats?.sortedPrices.slice(TOP_RANK_COUNT) ?? [],
    [priceStats],
  );

  const { data: wishlist, isLoading: isWishlistQueryLoading } = useMyWishlist();
  const { mutate: addWishlist, isPending: isAdding } = useAddWishlist();
  const { mutate: removeWishlist, isPending: isRemoving } = useRemoveWishlist();
  const isWishlistLoading = isAdding || isRemoving || isWishlistQueryLoading;
  const isWishlisted =
    wishlist?.items?.some(item => item.productId === productId) ?? false;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchPrices();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchPrices]);

  const handleWishlistToggle = useCallback(() => {
    if (isWishlistLoading) return;
    if (isWishlisted) {
      removeWishlist(productId);
    } else {
      addWishlist(productId);
    }
  }, [isWishlisted, isWishlistLoading, addWishlist, removeWishlist, productId]);

  const handleShare = useCallback(async () => {
    if (!priceStats) return;
    try {
      const message = `[마실] ${productName} 최저가 ${formatPrice(
        priceStats.min,
      )} - ${priceStats.cheapestStore}\n내 동네 최저가를 찾아보세요!`;
      await Share.share({
        message,
      });
    } catch {
      showToast('공유할 수 없어요', 'error');
    }
  }, [productName, priceStats, showToast]);

  const handlePriceCardPress = useCallback(
    (price: PriceResponse) => {
      navigation.navigate('PriceDetail', { priceId: price.id });
    },
    [navigation],
  );

  const handleStorePress = useCallback(
    (storeId: string) => {
      navigation.navigate('StoreDetail', { storeId });
    },
    [navigation],
  );

  const handleRadiusSelect = useCallback(
    (opt: RadiusOption) => {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          150,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
      setRadius(opt);
      setShowRadiusDropdown(false);
    },
    [setRadius],
  );

  const renderPriceItem = useCallback(
    ({ item, index }: { item: PriceResponse; index: number }) => (
      <PriceRankCard
        rank={index + TOP_RANK_COUNT + 1}
        price={item}
        onPress={handlePriceCardPress}
      />
    ),
    [handlePriceCardPress],
  );

  // ─── 상품 히어로 + 순위 헤더 (useMemo로 JSX 직접 생성 — ListHeaderComponent remount 방지) ───
  const summaryHeader = useMemo(() => {
    if (!priceStats) return null;
    const { sortedPrices, heroImageUrl, category, allPrices } = priceStats;
    const first = sortedPrices[0];
    const second: PriceResponse | undefined = sortedPrices[1];
    const third: PriceResponse | undefined = sortedPrices[2];

    const firstDistText = first ? getDistText(first.store, latitude, longitude) : null;
    const secondDistText = second ? getDistText(second.store, latitude, longitude) : null;
    const thirdDistText = third ? getDistText(third.store, latitude, longitude) : null;

    return (
      <View>
        {/* 히어로 이미지 + 오버레이 배지 */}
        <View style={styles.heroWrapper}>
          {heroImageUrl && !heroImgFailed ? (
            <Image
              source={{ uri: heroImageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={`${productName} 상품 이미지`}
              onError={() => setHeroImgFailed(true)}
            />
          ) : (
            <LinearGradient
              colors={[colors.primaryDark, colors.primary]}
              style={styles.heroPlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.heroPlaceholderEmojiLg}>{CATEGORY_EMOJI[category]}</Text>
              <Text style={styles.heroPlaceholderProductName} numberOfLines={1}>{productName}</Text>
            </LinearGradient>
          )}
        </View>

        {/* 상품 정보 */}
        <View style={styles.heroInfo}>
          <Text style={styles.categoryBreadcrumb}>{CATEGORY_LABELS[category]}</Text>
          <Text style={styles.heroProductName} numberOfLines={2}>{productName}</Text>
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroMinPrice}>{formatPrice(priceStats.min)}</Text>
            <Text style={styles.heroCount}>{priceStats.count}건 등록</Text>
          </View>
          <Text style={styles.heroCheapestStore}>{priceStats.cheapestStore} 최저가</Text>
        </View>

        {/* 마트별 최저가 순위 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>마트별 최저가 순위</Text>
          <Text style={styles.sectionSubtitle}>오늘 업데이트</Text>
        </View>

        {/* 1위 카드 */}
        {first && (
          <TouchableOpacity
            style={styles.rankFirstCard}
            onPress={() => handlePriceCardPress(first)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`1위 ${first.store.name} ${formatPrice(first.price)}`}
          >
            <View style={styles.rankFirstBadge}>
              <Text style={styles.rankFirstMedalText}>🥇</Text>
              <Text style={styles.rankFirstBadgeText}>실시간 최저가 1위</Text>
            </View>
            <View style={styles.rankFirstBody}>
              <View style={styles.rankFirstStoreInfo}>
                <Text style={styles.rankFirstStoreName} numberOfLines={1}>
                  {first.store.name}
                </Text>
                {firstDistText !== null && (
                  <Text style={styles.rankFirstDistance}>{firstDistText}</Text>
                )}
                {first.verificationCount > 0 && (
                  <View style={styles.rankFirstVerifyRow}>
                    {first.confirmedCount > 0 && (
                      <Text style={styles.rankFirstVerifyConfirm}>✓ 맞아요 {first.confirmedCount}</Text>
                    )}
                    {first.disputedCount > 0 && (
                      <Text style={styles.rankFirstVerifyDispute}>✗ 달라요 {first.disputedCount}</Text>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.rankFirstPrice}>{formatPrice(first.price)}</Text>
            </View>
            <TouchableOpacity
              style={styles.rankFirstRouteBtn}
              onPress={() => handleStorePress(first.store.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${first.store.name} 매장 상세 보기`}
            >
              <MapPinIcon size={spacing.iconSm} color={colors.white} />
              <Text style={styles.rankFirstRouteBtnText}>매장으로 길찾기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* 2, 3위 그리드 */}
        {(second !== undefined || third !== undefined) && (
          <View style={styles.rankGrid}>
            {second && (
              <TouchableOpacity
                style={styles.rankGridCard}
                onPress={() => handlePriceCardPress(second)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`2위 ${second.store.name} ${formatPrice(second.price)}`}
              >
                <View style={styles.rankGridTop}>
                  <View style={styles.rankGridBadge}>
                    <Text style={styles.rankGridBadgeText}>2위</Text>
                  </View>
                  {secondDistText !== null && (
                    <Text style={styles.rankGridDistance}>{secondDistText}</Text>
                  )}
                </View>
                <Text style={styles.rankGridStoreName} numberOfLines={1}>
                  {second.store.name}
                </Text>
                <Text style={styles.rankGridPrice}>{formatPrice(second.price)}</Text>
                {second.verificationCount > 0 && (
                  <Text style={styles.rankGridVerify}>✓ {second.verificationCount}명 확인</Text>
                )}
              </TouchableOpacity>
            )}
            {third && (
              <TouchableOpacity
                style={styles.rankGridCard}
                onPress={() => handlePriceCardPress(third)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`3위 ${third.store.name} ${formatPrice(third.price)}`}
              >
                <View style={styles.rankGridTop}>
                  <View style={styles.rankGridBadge}>
                    <Text style={styles.rankGridBadgeText}>3위</Text>
                  </View>
                  {thirdDistText !== null && (
                    <Text style={styles.rankGridDistance}>{thirdDistText}</Text>
                  )}
                </View>
                <Text style={styles.rankGridStoreName} numberOfLines={1}>
                  {third.store.name}
                </Text>
                <Text style={styles.rankGridPrice}>{formatPrice(third.price)}</Text>
                {third.verificationCount > 0 && (
                  <Text style={styles.rankGridVerify}>✓ {third.verificationCount}명 확인</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 가격 변동 추이 */}
        <PriceTrendChart prices={allPrices} />
      </View>
    );
  }, [priceStats, productName, handleStorePress, handlePriceCardPress, latitude, longitude, heroImgFailed]);

  const renderContent = () => {
    if (isPricesLoading) return <SkeletonCard variant="rank" />;
    if (isPricesError) {
      return (
        <EmptyState
          icon={WifiOffIcon}
          title="불러올 수 없어요"
          subtitle="네트워크 상태를 확인하고 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: refetchPrices }}
        />
      );
    }
    if (!priceStats) {
      return (
        <EmptyState
          icon={TagIcon}
          title="등록된 가격이 없어요"
          subtitle={
            prices && prices.length > 0
              ? `${RADIUS_LABELS[radius]} 내에 등록된 가격 정보가 없습니다. 거리 범위를 넓혀보세요.`
              : '아직 이 상품의 가격을 등록한 사람이 없어요'
          }
        />
      );
    }

    if (viewMode === 'list') {
      return (
        <FlatList
          data={remainingPrices}
          keyExtractor={item => item.id}
          renderItem={renderPriceItem}
          ListHeaderComponent={summaryHeader ?? undefined}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      );
    }
    return (
      <PriceMapSection prices={priceStats.allPrices} onMarkerPress={handleStorePress} />
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── 헤더 ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {/* 뒤로가기 + 상품명 */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={spacing.xxl} color={colors.black} />
          </TouchableOpacity>
          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>상품 상세</Text>
          </View>
          {/* 공유 버튼 */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={!priceStats}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="공유하기"
          >
            <ShareIcon size={spacing.iconSm} color={colors.gray400} />
          </TouchableOpacity>

          {/* 찜 버튼 */}
          <TouchableOpacity
            style={[styles.wishBtn, isWishlisted && styles.wishBtnActive]}
            onPress={handleWishlistToggle}
            disabled={isWishlistLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isWishlisted ? '찜 해제' : '찜하기'}
          >
            {isWishlistLoading ? (
              <ActivityIndicator
                size="small"
                color={isWishlisted ? colors.white : colors.primary}
              />
            ) : (
              <HeartIcon
                size={spacing.iconSm}
                color={isWishlisted ? colors.white : colors.gray400}
                filled={isWishlisted}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* 컨트롤 바: 목록/지도 토글 + 거리 드롭다운 */}
        <View style={styles.controlBar}>
          {/* 목록/지도 토글 */}
          <View style={styles.viewToggle}>
            {(['list', 'map'] as ViewMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.viewToggleBtn,
                  viewMode === mode && styles.viewToggleBtnActive,
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.create(
                      200,
                      LayoutAnimation.Types.easeInEaseOut,
                      LayoutAnimation.Properties.opacity,
                    ),
                  );
                  setViewMode(mode);
                }}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: viewMode === mode }}
              >
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === mode && styles.viewToggleTextActive,
                  ]}
                >
                  {mode === 'list' ? '목록' : '지도'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 거리 드롭다운 */}
          <TouchableOpacity
            style={styles.radiusDropdown}
            onPress={() => setShowRadiusDropdown(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`거리 필터: ${RADIUS_LABELS[radius]}`}
          >
            <Text style={styles.radiusDropdownText}>
              {RADIUS_LABELS[radius]}
            </Text>
            <ChevronDownIcon size={spacing.iconXs} color={colors.gray600} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 콘텐츠 ──────────────────────────────────────────────────── */}
      <View style={styles.content}>{renderContent()}</View>

      {/* ─── 거리 드롭다운 모달 ────────────────────────────────────────── */}
      <Modal
        visible={showRadiusDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRadiusDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowRadiusDropdown(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>거리 범위</Text>
            {RADIUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownItem,
                  radius === opt && styles.dropdownItemActive,
                ]}
                onPress={() => handleRadiusSelect(opt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    radius === opt && styles.dropdownItemTextActive,
                  ]}
                >
                  {RADIUS_LABELS[opt]}
                </Text>
                {radius === opt && <Text style={styles.dropdownCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },

  // ─── 헤더 ────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.gray100,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: spacing.backBtnSize,
    height: spacing.backBtnSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitleArea: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headingMd,
  },
  shareBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    borderRadius: spacing.headerIconSize / 2,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  wishBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    borderRadius: spacing.headerIconSize / 2,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  wishBtnActive: {
    backgroundColor: colors.primary,
  },

  // ─── 컨트롤 바 ──────────────────────────────────────────────────────
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: spacing.sm,
    padding: spacing.micro,
  },
  viewToggleBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.xs,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: 0.08,
    shadowRadius: spacing.shadowRadiusSm,
    elevation: 1,
  },
  viewToggleText: {
    ...typography.bodySm,
    fontWeight: '500' as const,
    color: colors.gray600,
  },
  viewToggleTextActive: {
    color: colors.black,
    fontWeight: '600' as const,
  },

  // ─── 거리 드롭다운 버튼 ───────────────────────────────────────────────
  radiusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: spacing.radiusFull,
  },
  radiusDropdownText: {
    ...typography.bodySm,
    fontWeight: '500' as const,
    color: colors.gray700,
  },

  // ─── 드롭다운 모달 ───────────────────────────────────────────────────
  dropdownOverlay: {
    flex: 1,
    backgroundColor: colors.dropdownOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    width: spacing.dropdownMenuWidth,
    paddingVertical: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYLg },
    shadowOpacity: 0.15,
    shadowRadius: spacing.shadowRadiusLg,
    elevation: 8,
  },
  dropdownTitle: {
    ...typography.bodySm,
    fontWeight: '600' as const,
    color: colors.gray400,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.gray100,
    marginBottom: spacing.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.black,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  dropdownCheck: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700' as const,
  },

  // ─── 상품 히어로 ─────────────────────────────────────────────────────
  heroWrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 2.5,
    backgroundColor: colors.gray100,
    borderRadius: spacing.radiusXl,
  },
  heroPlaceholder: {
    width: '100%',
    height: spacing.priceImagePlaceholderHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radiusXl,
    overflow: 'hidden',
  },
  heroPlaceholderEmojiLg: {
    fontSize: spacing.emojiLg,
    marginBottom: spacing.sm,
  },
  heroPlaceholderProductName: {
    ...typography.headingMd,
    color: colors.white,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  heroInfo: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  categoryBreadcrumb: {
    ...typography.caption,
    color: colors.gray400,
    marginBottom: spacing.xs,
  },
  heroProductName: {
    ...typography.headingXl,
    marginBottom: spacing.sm,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  heroMinPrice: {
    ...typography.price,
  },
  heroCount: {
    ...typography.caption,
    color: colors.gray400,
  },
  heroCheapestStore: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  // ─── 섹션 헤더 ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.gray700,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.gray400,
  },
  // ─── 1위 카드 ────────────────────────────────────────────────────────
  rankFirstCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderMedium,
    borderColor: colors.primary,
    overflow: 'hidden',
    elevation: 2,
  },
  rankFirstBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rankFirstMedalText: {
    fontSize: spacing.iconMd,
  },
  rankFirstBadgeText: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.white,
  },
  rankFirstBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rankFirstStoreInfo: {
    flex: 1,
  },
  rankFirstStoreName: {
    ...typography.headingBase,
    color: colors.black,
  },
  rankFirstDistance: {
    ...typography.caption,
    color: colors.gray400,
    marginTop: spacing.micro,
  },
  rankFirstPrice: {
    ...typography.price,
    flexShrink: 0,
  },
  rankFirstRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
  },
  rankFirstRouteBtnText: {
    ...typography.bodySm,
    fontWeight: '600' as const,
    color: colors.white,
  },
  // ─── 2, 3위 그리드 ───────────────────────────────────────────────────
  rankGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  rankGridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    shadowColor: colors.tertiaryContainer,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.08,
    shadowRadius: spacing.shadowRadiusXl,
    elevation: 3,
  },
  rankGridTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rankGridBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
  },
  rankGridBadgeText: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  rankGridDistance: {
    ...typography.caption,
    color: colors.gray400,
  },
  rankGridStoreName: {
    ...typography.bodySm,
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  rankGridPrice: {
    ...typography.headingMd,
    color: colors.primary,
  },
  rankGridVerify: {
    ...typography.caption,
    fontFamily: typography.captionBold.fontFamily,
    color: colors.primary,
    marginTop: spacing.xs,
  },

  // ─── 1위 카드 검증 행 ────────────────────────────────────────────────
  rankFirstVerifyRow: {
    flexDirection: 'row' as const,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rankFirstVerifyConfirm: {
    ...typography.captionBold,
    color: colors.primary,
  },
  rankFirstVerifyDispute: {
    ...typography.captionBold,
    color: colors.danger,
  },

  // ─── 콘텐츠 ─────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
});

export default PriceCompareScreen;
