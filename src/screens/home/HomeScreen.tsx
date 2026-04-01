import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeScreenProps, MainTabParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { useInfiniteRecentPrices } from '../../hooks/queries/usePrices';
import { useFlyers } from '../../hooks/queries/useFlyers';
import { useAddWishlist } from '../../hooks/queries/useWishlist';
import { useLocationStore } from '../../store/locationStore';
import { useNetworkStore } from '../../store/networkStore';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import TagIcon from '../../components/icons/TagIcon';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import BellIcon from '../../components/icons/BellIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import ChevronDownIcon from '../../components/icons/ChevronDownIcon';
import StoreIcon from '../../components/icons/StoreIcon';
import type { ProductPriceCard } from '../../types/api.types';
import { formatPrice, getDistanceM, fixImageUrl, formatRelativeTime } from '../../utils/format';
import { POPULAR_TAGS, DEFAULT_FLYER_STORE_NAME } from '../../utils/constants';

type Props = HomeScreenProps<'Home'>;

// ─── FeedCardImage (이미지 onError 패턴) ─────────────────────────────────────
interface FeedCardImageProps {
  uri: string | null;
  productName: string;
}

const FeedCardImage = React.memo(({ uri, productName }: FeedCardImageProps) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={styles.feedImgPlaceholder}>
        <TagIcon size={26} color={colors.gray400} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFillObject}
      resizeMode="cover"
      accessible={true}
      accessibilityLabel={`${productName} 상품 이미지`}
      onError={() => setFailed(true)}
    />
  );
});

// ─── FeedCard (단일 컬럼 피드 카드) ──────────────────────────────────────────
interface FeedCardProps {
  item: ProductPriceCard;
  onPress: (card: ProductPriceCard) => void;
  onWishlist: (productId: string) => void;
}

const FeedCard = React.memo(({ item, onPress, onWishlist }: FeedCardProps) => {
  const imageUri = fixImageUrl(item.imageUrl);
  return (
    <Pressable
      style={({ pressed }) => [styles.feedCard, pressed && styles.feedCardPressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.productName} ${formatPrice(item.minPrice)}`}
    >
      {/* 이미지 */}
      <View style={styles.feedImgWrap}>
        <FeedCardImage uri={imageUri} productName={item.productName} />
        {item.hasClosingDiscount && (
          <View style={styles.feedDiscountBadge}>
            <Text style={styles.feedDiscountBadgeText}>마감</Text>
          </View>
        )}
      </View>

      {/* 정보 영역 */}
      <View style={styles.feedBody}>
        <Text style={styles.feedProductName} numberOfLines={2}>{item.productName}</Text>
        <Text style={styles.feedPrice}>{formatPrice(item.minPrice)}</Text>
        <View style={styles.feedStoreRow}>
          <StoreIcon size={spacing.iconXs} color={colors.gray400} />
          <Text style={styles.feedStoreName} numberOfLines={1}>
            {item.cheapestStore?.name ?? '매장 정보 없음'}
          </Text>
        </View>
        {item.verificationCount > 0 && (
          <View style={styles.feedVerifiedChip}>
            <Text style={styles.feedVerifiedText}>✓ {item.verificationCount}명 확인</Text>
          </View>
        )}
        {item.registrant && (
          <Text style={styles.feedRegistrantText}>
            @{item.registrant.nickname} · {formatRelativeTime(item.createdAt)}
          </Text>
        )}
      </View>

      {/* 찜 버튼 */}
      <Pressable
        style={styles.feedWishBtn}
        onPress={(e) => {
          e.stopPropagation();
          onWishlist(item.productId);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.productName} 찜하기`}
      >
        <Text style={styles.feedWishBtnText}>+</Text>
      </Pressable>
    </Pressable>
  );
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const rawRegionName = useLocationStore((s) => s.regionName);
  const regionName = rawRegionName ?? '내 동네';
  const isRegionNameMissing = rawRegionName === null;
  const userLat = useLocationStore((s) => s.latitude);
  const userLng = useLocationStore((s) => s.longitude);
  const radius = useLocationStore((s) => s.radius);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const listRef = useRef<FlatList>(null);
  const { mutate: addWishlist } = useAddWishlist();
  const { data: flyersData } = useFlyers();
  const isOffline = useNetworkStore((s) => s.isOffline);

  const radiusLabel = radius >= 1000 ? `${Math.round(radius / 1000)}km` : `${radius}m`;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  const {
    data: recentData,
    isLoading: isRecentLoading,
    isError: isRecentError,
    refetch: refetchRecent,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRecentPrices();

  const isOfflineRef = useRef(isOffline);
  useEffect(() => {
    const wasOffline = isOfflineRef.current;
    isOfflineRef.current = isOffline;
    if (wasOffline && !isOffline) {
      void refetchRecent();
    }
  }, [isOffline, refetchRecent]);

  const recentPrices = useMemo(() => {
    const all = recentData?.pages.flatMap(p => p.data) ?? [];
    const seen = new Set<string>();
    return all.filter(p => {
      if (seen.has(p.productId)) return false;
      seen.add(p.productId);
      return true;
    });
  }, [recentData]);

  const nearbyPrices = useMemo(() => {
    if (recentPrices.length === 0) return [];
    const validPrices = recentPrices.filter(
      (p) => p.productName && p.minPrice != null && p.cheapestStore != null,
    );
    if (userLat == null || userLng == null) return validPrices;
    return validPrices.filter((p) => {
      const lat = p.cheapestStore?.latitude;
      const lng = p.cheapestStore?.longitude;
      if (lat == null || lng == null) return true;
      if (isNaN(lat) || isNaN(lng)) return true;
      const dist = getDistanceM(userLat, userLng, lat, lng);
      return !isNaN(dist) && dist <= radius;
    });
  }, [recentPrices, userLat, userLng, radius]);

  const featuredCard = useMemo(() => nearbyPrices[0] ?? null, [nearbyPrices]);
  const feedCards = useMemo(() => nearbyPrices.slice(1), [nearbyPrices]);

  useEffect(() => {
    setHeroImgFailed(false);
  }, [featuredCard?.productId]);

  const handleTagPress = useCallback((tag: string) => {
    navigation.navigate('Search', { initialQuery: tag });
  }, [navigation]);

  const handleCardPress = useCallback(
    (card: ProductPriceCard) => {
      navigation.navigate('PriceCompare', {
        productId: card.productId,
        productName: card.productName,
      });
    },
    [navigation],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchRecent();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchRecent]);

  const handleNavigatePriceRegister = useCallback(() => {
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('PriceRegisterStack', { screen: 'StoreSelect' });
  }, [navigation]);

  const featuredImageUri = useMemo(
    () => (featuredCard ? fixImageUrl(featuredCard.imageUrl) : null),
    [featuredCard],
  );

  const listHeader = useMemo(() => {
    return (
      <>
        {/* ── 인기 태그 ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsRow}
        >
          {POPULAR_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={styles.tagChip}
              onPress={() => handleTagPress(tag)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${tag} 태그 검색`}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 히어로 카드 ── */}
        {!isRecentLoading && !isRecentError && featuredCard && (
          <Pressable
            style={({ pressed }) => [styles.heroCard, pressed && styles.heroCardPressed]}
            onPress={() => handleCardPress(featuredCard)}
            accessibilityRole="button"
            accessibilityLabel={`${featuredCard.productName} 이웃 추천 상품`}
          >
            {/* 이미지 영역 */}
            <View style={styles.heroInnerCard}>
              <View style={styles.heroImageWrap}>
                {featuredImageUri && !heroImgFailed ? (
                  <Image
                    source={{ uri: featuredImageUri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                    accessible={true}
                    accessibilityLabel={`${featuredCard.productName} 상품 이미지`}
                    onError={() => setHeroImgFailed(true)}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.primaryDark, colors.primary]}
                    style={[StyleSheet.absoluteFillObject, styles.heroGradientOverlay]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.heroGradientProductName} numberOfLines={2}>
                      {featuredCard.productName}
                    </Text>
                    <Text style={styles.heroGradientPrice}>
                      {formatPrice(featuredCard.minPrice)}
                    </Text>
                  </LinearGradient>
                )}
                {featuredCard.hasClosingDiscount && (
                  <View style={styles.heroClosingBadge}>
                    <Text style={styles.heroClosingBadgeText}>마감할인</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 텍스트 영역 */}
            <View style={styles.heroBody}>
              <View style={styles.heroRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroProductName} numberOfLines={2}>
                    {featuredCard.productName}
                  </Text>
                  <Text style={styles.heroStoreName} numberOfLines={1}>
                    {featuredCard.cheapestStore?.name ?? '매장 정보 없음'}
                  </Text>
                  <Text style={styles.heroTime}>• {formatRelativeTime(featuredCard.createdAt)}</Text>
                </View>
                <View style={styles.heroRight}>
                  <View style={styles.heroPriceRow}>
                    <Text style={styles.heroPrice}>
                      {featuredCard.minPrice.toLocaleString()}
                    </Text>
                    <Text style={styles.heroPriceUnit}>원</Text>
                  </View>
                  {featuredCard.storeCount > 1 && (
                    <Text style={styles.heroLowestLabel}>7일 최저가</Text>
                  )}
                </View>
              </View>

              {/* 커뮤니티 정보 (검증 수 + 등록자) */}
              {(featuredCard.verificationCount > 0 || featuredCard.registrant) && (
                <View style={styles.heroCommunityRow}>
                  {featuredCard.verificationCount > 0 && (
                    <View style={styles.heroVerifiedChip}>
                      <Text style={styles.heroVerifiedChipText}>✓ {featuredCard.verificationCount}명 확인</Text>
                    </View>
                  )}
                  {featuredCard.registrant && (
                    <Text style={styles.heroRegistrantText}>
                      @{featuredCard.registrant.nickname}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        )}

        {/* ── 오늘의 전단지 배너 ── */}
        <TouchableOpacity
          style={styles.flyerBanner}
          onPress={() => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Flyer', { screen: 'FlyerList' })}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="오늘의 전단지 보기"
        >
          <View style={styles.flashBadgeWrap}>
            <View style={styles.flashBadge}>
              <Text style={styles.flashBadgeText}>FLASH SALE</Text>
            </View>
          </View>
          <Text style={styles.flyerBannerTitle}>오늘의 전단지</Text>
          <Text style={styles.flyerBannerSub}>
            {flyersData?.[0]?.storeName ?? DEFAULT_FLYER_STORE_NAME} 최대 40% 할인
          </Text>
          <View style={styles.flyerFanWrap}>
            <View style={[styles.flyerFanCard, styles.flyerFanLeft]}>
              <Text style={styles.flyerFanEmoji}>🥦</Text>
            </View>
            <View style={[styles.flyerFanCard, styles.flyerFanCenter]}>
              <Text style={styles.flyerFanEmoji}>🥩</Text>
            </View>
            <View style={[styles.flyerFanCard, styles.flyerFanRight]}>
              <Text style={styles.flyerFanEmoji}>🍎</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── 최근 등록 가격 섹션 헤더 ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>최근 등록 가격</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Search', { initialQuery: undefined })}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="전체보기"
          >
            <Text style={styles.sectionMoreText}>전체 →</Text>
          </TouchableOpacity>
        </View>

        {/* 로딩 / 에러 / 빈 상태 */}
        {isRecentLoading && <SkeletonCard variant="price" />}
        {isRecentError && (
          <EmptyState
            icon={WifiOffIcon}
            title="불러올 수 없어요"
            subtitle="네트워크 상태를 확인하고 다시 시도해 주세요."
            action={{ label: '다시 시도', onPress: refetchRecent }}
          />
        )}
        {!isRecentLoading && !isRecentError && nearbyPrices.length === 0 && (
          <EmptyState
            icon={TagIcon}
            title="아직 우리 동네에 등록된 가격이 없어요"
            subtitle="첫 번째 가격을 등록하면 동네 사람들에게 도움이 돼요!"
            action={{
              label: '가격 등록하기',
              onPress: handleNavigatePriceRegister,
            }}
          />
        )}
      </>
    );
  }, [
    handleTagPress,
    isRecentLoading,
    isRecentError,
    nearbyPrices,
    refetchRecent,
    navigation,
    featuredCard,
    featuredImageUri,
    heroImgFailed,
    handleCardPress,
    handleNavigatePriceRegister,
    flyersData,
  ]);

  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: insets.top }],
    [insets.top],
  );

  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingBottom: insets.bottom + spacing.tabBarContentHeight + spacing.xl }],
    [insets.bottom],
  );

  const renderFeedCard = useCallback(
    ({ item }: ListRenderItemInfo<ProductPriceCard>) => (
      <FeedCard item={item} onPress={handleCardPress} onWishlist={addWishlist} />
    ),
    [handleCardPress, addWishlist],
  );

  return (
    <View style={containerStyle}>
      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.regionButton}
          activeOpacity={0.7}
          onPress={() => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('MyPageStack', { screen: 'LocationSetup', params: { returnTo: 'mypage' } })}
          accessibilityRole="button"
          accessibilityLabel={`${regionName} 지역 변경`}
        >
          <MapPinIcon size={16} color={colors.primary} />
          <Text style={styles.regionText}>{regionName}</Text>
          <ChevronDownIcon size={13} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.brandText}>마실</Text>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="알림"
            onPress={() => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('MyPageStack', {
              screen: 'NotificationSettings',
            })}
          >
            <BellIcon size={22} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 검색바 ── */}
      <View style={styles.searchBarWrap}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', { initialQuery: undefined })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="상품 이름을 검색하세요"
        >
          <SearchIcon size={18} color={colors.gray400} />
          <Text style={styles.searchPlaceholder}>상품 이름을 검색하세요</Text>
          <View style={styles.radiusPill}>
            <Text style={styles.radiusPillText}>반경 {radiusLabel}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── 동네 미설정 배너 ── */}
      {isRegionNameMissing && (
        <TouchableOpacity
          style={styles.locationBanner}
          onPress={() => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('MyPageStack', { screen: 'LocationSetup', params: { returnTo: 'mypage' } })}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="동네 설정하기"
        >
          <Text style={styles.locationBannerText}>내 동네를 설정하면 주변 가격을 볼 수 있어요</Text>
          <Text style={styles.locationBannerAction}>설정하기 →</Text>
        </TouchableOpacity>
      )}

      {/* ── 메인 콘텐츠 (단일 컬럼 피드) ── */}
      <FlatList
        ref={listRef}
        data={feedCards}
        keyExtractor={(item) => item.productId}
        renderItem={renderFeedCard}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={listHeader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ─── 헤더 ───────────────────────────────────────────────────────────
  header: {
    height: spacing.headerHeight,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.surfaceContainer,
  },
  regionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  regionText: {
    fontSize: typography.body.fontSize,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandText: {
    fontSize: typography.bodySm.fontSize,
    fontWeight: '800' as const,
    color: colors.tertiary,
    letterSpacing: -0.3,
  },
  headerIconBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── 검색바 ─────────────────────────────────────────────────────────
  searchBarWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.inputPad,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    ...typography.body,
    color: colors.gray400,
  },
  radiusPill: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  radiusPillText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700' as const,
    color: colors.white,
  },

  // ─── 동네 배너 ──────────────────────────────────────────────────────
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  locationBannerText: {
    ...typography.bodySm,
    color: colors.primary,
    flex: 1,
  },
  locationBannerAction: {
    ...typography.bodySm,
    fontWeight: '600' as const,
    color: colors.primary,
    marginLeft: spacing.sm,
  },

  // ─── 리스트 ─────────────────────────────────────────────────────────
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
  },

  // ─── 인기 태그 ──────────────────────────────────────────────────────
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tagChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
  },
  tagText: {
    fontSize: typography.tagText.fontSize,
    fontWeight: '600' as const,
    color: colors.gray600,
  },

  // ─── 섹션 헤더 ──────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '800' as const,
    color: colors.black,
    letterSpacing: -0.3,
  },
  sectionMoreText: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: '700' as const,
    color: colors.primary,
  },

  // ─── 히어로 카드 ────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: spacing.radiusXl,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.08,
    shadowRadius: spacing.shadowRadiusXl,
    elevation: 4,
  },
  heroCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  heroInnerCard: {
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: 0.06,
    shadowRadius: spacing.shadowRadiusSm,
    elevation: 2,
  },
  heroImageWrap: {
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceContainerLow,
  },
  heroGradientOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  heroGradientProductName: {
    ...typography.headingMd,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroGradientPrice: {
    ...typography.price,
    color: colors.white,
  },
  heroClosingBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroClosingBadgeText: {
    fontSize: typography.tabLabel.fontSize,
    fontWeight: '700' as const,
    color: colors.white,
  },
  heroBody: {
    padding: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroLeft: {
    flex: 1,
  },
  heroProductName: {
    fontFamily: PJS.extraBold,
    fontSize: typography.headingMd.fontSize,
    color: colors.black,
    letterSpacing: -0.3,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  heroStoreName: {
    fontSize: typography.bodySm.fontSize,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: spacing.micro,
  },
  heroTime: {
    fontSize: typography.caption.fontSize,
    fontWeight: '400' as const,
    color: colors.outlineColor,
  },
  heroRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '45%',
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.micro,
  },
  heroPrice: {
    ...typography.priceCard,
  },
  heroPriceUnit: {
    fontFamily: PJS.bold,
    fontSize: typography.bodySm.fontSize,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  heroLowestLabel: {
    fontSize: typography.microLabel.fontSize,
    fontWeight: '900' as const,
    color: colors.danger,
    letterSpacing: -0.2,
    marginTop: spacing.xs,
  },
  // 히어로 커뮤니티 정보
  heroCommunityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroVerifiedChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
  },
  heroVerifiedChipText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  heroRegistrantText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500' as const,
    color: colors.gray600,
  },

  // ─── 전단지 배너 ────────────────────────────────────────────────────
  flyerBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    backgroundColor: colors.flyerBannerBg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  flashBadgeWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  flashBadge: {
    backgroundColor: colors.tertiaryFixedDim,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  flashBadgeText: {
    fontSize: typography.tabLabel.fontSize,
    fontWeight: '900' as const,
    color: colors.onTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  flyerBannerTitle: {
    fontSize: typography.price.fontSize,
    fontWeight: '900' as const,
    color: colors.white,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  flyerBannerSub: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: '500' as const,
    color: colors.flyerSubtitleTextDim,
    textAlign: 'center' as const,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  flyerFanWrap: {
    height: spacing.flyerFanWrapH,
    position: 'relative',
  },
  flyerFanCard: {
    position: 'absolute',
    width: '40%',
    aspectRatio: 4 / 3,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.flyerFanShadowOffsetY },
    shadowOpacity: spacing.flyerFanShadowOpacity,
    shadowRadius: spacing.flyerFanShadowRadius,
    elevation: spacing.flyerFanElevation,
  },
  flyerFanLeft: {
    left: '4%',
    top: '15%',
    backgroundColor: colors.flyerFanBgLeft,
    transform: [{ rotate: '-13deg' }],
    zIndex: 1,
  },
  flyerFanCenter: {
    left: '28%',
    top: '2%',
    backgroundColor: colors.flyerFanBgCenter,
    transform: [{ rotate: '-1deg' }],
    zIndex: 3,
    width: '44%',
  },
  flyerFanRight: {
    right: '4%',
    top: '15%',
    backgroundColor: colors.flyerFanBgRight,
    transform: [{ rotate: '11deg' }],
    zIndex: 2,
  },
  flyerFanEmoji: {
    fontSize: spacing.emojiMd,
  },

  // ─── 피드 카드 (단일 컬럼) ──────────────────────────────────────────
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: 0.06,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 2,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  feedCardPressed: {
    opacity: 0.97,
    transform: [{ scale: 0.99 }],
  },
  feedImgWrap: {
    width: spacing.feedCardImageSize,
    height: spacing.feedCardImageSize,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    flexShrink: 0,
  },
  feedImgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  feedDiscountBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.danger,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.micro,
  },
  feedDiscountBadgeText: {
    fontSize: typography.microLabel.fontSize,
    fontWeight: '900' as const,
    color: colors.white,
  },
  feedBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  feedProductName: {
    fontSize: typography.labelMd.fontSize,
    fontWeight: '700' as const,
    color: colors.black,
    lineHeight: 20,
    marginBottom: spacing.micro,
  },
  feedPrice: {
    fontSize: typography.headingBase.fontSize,
    fontWeight: '900' as const,
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  feedStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.micro,
    marginBottom: spacing.xs,
  },
  feedStoreName: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: '500' as const,
    color: colors.gray600,
    flex: 1,
  },
  feedVerifiedChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    marginBottom: spacing.micro,
  },
  feedVerifiedText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  feedRegistrantText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '400' as const,
    color: colors.gray400,
  },
  feedWishBtn: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  feedWishBtnText: {
    fontSize: typography.headingMd.fontSize,
    fontWeight: '700' as const,
    color: colors.white,
    lineHeight: 20,
  },
});

export default HomeScreen;
