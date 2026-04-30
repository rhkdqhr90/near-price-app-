import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
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
import { colors, priceTagGradients } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { useInfiniteRecentPrices } from '../../hooks/queries/usePrices';
import { useFlyers } from '../../hooks/queries/useFlyers';
import { useUnreadNotificationCount } from '../../hooks/queries/useNotifications';
import { RADIUS_OPTIONS, useLocationStore, type RadiusOption } from '../../store/locationStore';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import TagIcon from '../../components/icons/TagIcon';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import BellIcon from '../../components/icons/BellIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import ChevronDownIcon from '../../components/icons/ChevronDownIcon';
import ChevronUpIcon from '../../components/icons/ChevronUpIcon';
import { PriceCard } from '../../components/price/PriceCard';
import { getPriceTagLabel } from '../../components/price/PriceTag';
import type { ProductPriceCard } from '../../types/api.types';
import { fixImageUrl, formatPrice, getDistanceM, formatRelativeTime } from '../../utils/format';
import { POPULAR_TAGS, DEFAULT_FLYER_STORE_NAME } from '../../utils/constants';

type Props = HomeScreenProps<'Home'>;

const getProductCardKey = (item: ProductPriceCard): string =>
  `${item.productId}::${item.unitType ?? 'other'}`;

const hasImageUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  return lowered !== 'null' && lowered !== 'undefined' && lowered !== 'nan';
};

const IMAGE_FAILURE_RETRY_MS = 20_000;

// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const rawRegionName = useLocationStore((s) => s.regionName);
  const regionName = rawRegionName ?? '내 동네';
  const isRegionNameMissing = rawRegionName === null;
  const userLat = useLocationStore((s) => s.latitude);
  const userLng = useLocationStore((s) => s.longitude);
  const radius = useLocationStore((s) => s.radius);
  const setRadius = useLocationStore((s) => s.setRadius);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTagIdx, setActiveTagIdx] = useState<number | null>(null);
  const [isRadiusMenuOpen, setIsRadiusMenuOpen] = useState(false);
  const [failedCardImages, setFailedCardImages] = useState<Record<string, string>>({});
  const failedImageRetryTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const listRef = useRef<FlatList>(null);
  const { data: flyersData } = useFlyers();
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  const radiusLabel = radius >= 1000 ? `${Math.round(radius / 1000)}km` : `${radius}m`;

  const {
    data: recentData,
    isLoading: isRecentLoading,
    isError: isRecentError,
    refetch: refetchRecent,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRecentPrices({
    latitude: userLat,
    longitude: userLng,
    radiusM: radius,
  });

  const recentPrices = useMemo(() => {
    const all = recentData?.pages.flatMap((p) => p.data) ?? [];
    const byProduct = new Map<string, ProductPriceCard>();

    for (const item of all) {
      if (!item.productName || typeof item.productName !== 'string') {
        continue;
      }

      const key = getProductCardKey(item);
      const current = byProduct.get(key);

      if (!current) {
        byProduct.set(key, item);
        continue;
      }

      if (item.minPrice < current.minPrice) {
        byProduct.set(key, item);
        continue;
      }

      if (item.minPrice === current.minPrice) {
        const currentHasImage = hasImageUrl(current.imageUrl);
        const itemHasImage = hasImageUrl(item.imageUrl);
        if (itemHasImage && !currentHasImage) {
          byProduct.set(key, item);
          continue;
        }

        const currentTs = new Date(current.createdAt).getTime();
        const itemTs = new Date(item.createdAt).getTime();
        if (itemTs > currentTs) {
          byProduct.set(key, item);
        }
      }
    }

    return Array.from(byProduct.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
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

  const handleTagPress = useCallback(
    (tag: string, idx: number) => {
      setActiveTagIdx(idx);
      navigation.navigate('Search', { initialQuery: tag });
    },
    [navigation],
  );

  const handleCardPress = useCallback(
    (card: ProductPriceCard) => {
      navigation.navigate('PriceDetail', {
        productId: card.productId,
        productName: card.productName,
        autoExpandTopStore: true,
      });
    },
    [navigation],
  );

  const clearFailedImageRetryTimers = useCallback(() => {
    const timers = failedImageRetryTimersRef.current;
    for (const timer of Object.values(timers)) {
      clearTimeout(timer);
    }
    failedImageRetryTimersRef.current = {};
  }, []);

  const resetFailedCardImages = useCallback(() => {
    clearFailedImageRetryTimers();
    setFailedCardImages({});
  }, [clearFailedImageRetryTimers]);

  useEffect(() => {
    return () => {
      clearFailedImageRetryTimers();
    };
  }, [clearFailedImageRetryTimers]);

  const handleRefresh = useCallback(async () => {
    resetFailedCardImages();
    setIsRefreshing(true);
    try {
      await refetchRecent();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchRecent, resetFailedCardImages]);

  const handleRadiusSelect = useCallback((nextRadius: RadiusOption) => {
    resetFailedCardImages();
    setRadius(nextRadius);
    setIsRadiusMenuOpen(false);
  }, [resetFailedCardImages, setRadius]);

  const getCardKey = useCallback(
    (item: ProductPriceCard) => getProductCardKey(item),
    [],
  );

  const handleNavigatePriceRegister = useCallback(() => {
    navigation
      .getParent<BottomTabNavigationProp<MainTabParamList>>()
      ?.navigate('PriceRegisterStack', { screen: 'StoreSelect' });
  }, [navigation]);

  const listHeader = useMemo(() => {
    return (
      <>
        {/* ── 히어로 그라디언트 카드 ── */}
        {!isRecentLoading && !isRecentError && featuredCard && (
          <HeroGradient card={featuredCard} onPress={handleCardPress} />
        )}

        {/* ── 인기 태그 (chips) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsRow}
        >
          {POPULAR_TAGS.map((tag, idx) => {
            const active = activeTagIdx === idx;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => handleTagPress(tag, idx)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${tag} 태그 검색`}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 섹션 헤더 ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>근처 최저가</Text>
            <Text style={styles.sectionSub}>
              {nearbyPrices.length}개 매장 · 반경 {radiusLabel}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Search', { initialQuery: undefined })}
            activeOpacity={0.7}
            style={styles.sectionMoreBtn}
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
    isRecentLoading,
    isRecentError,
    featuredCard,
    handleCardPress,
    activeTagIdx,
    handleTagPress,
    nearbyPrices.length,
    radiusLabel,
    navigation,
    refetchRecent,
    handleNavigatePriceRegister,
  ]);

  const listFooter = useMemo(() => {
    return (
      <>
        {isFetchingNextPage && (
          <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
        )}
        {/* 전단지 배너 */}
        <TouchableOpacity
          style={styles.flyerBanner}
          onPress={() =>
            navigation
              .getParent<BottomTabNavigationProp<MainTabParamList>>()
              ?.navigate('Flyer', { screen: 'FlyerList' })
          }
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="오늘의 전단지 보기"
        >
          <View style={styles.flyerDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flashBadgeText}>FLASH SALE</Text>
            <Text style={styles.flyerBannerTitle}>오늘의 전단지</Text>
            <Text style={styles.flyerBannerSub}>
              {flyersData?.[0]?.storeName ?? DEFAULT_FLYER_STORE_NAME} 최대 40% 할인
            </Text>
          </View>
          <Text style={styles.flyerChev}>›</Text>
        </TouchableOpacity>
      </>
    );
  }, [isFetchingNextPage, navigation, flyersData]);

  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: insets.top }],
    [insets.top],
  );

  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      { paddingBottom: insets.bottom + spacing.tabBarContentHeight + spacing.xl },
    ],
    [insets.bottom],
  );

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<ProductPriceCard>) => {
      const cardKey = getCardKey(item);
      const imageUri = fixImageUrl(item.imageUrl);
      const imageLoadFailed = imageUri != null && failedCardImages[cardKey] === imageUri;

      return (
        <View style={styles.cardWrap}>
          <PriceCard
            item={item}
            imageUri={imageUri}
            imageLoadFailed={imageLoadFailed}
            onImagePermanentError={() => {
              if (!imageUri) return;
              setFailedCardImages((prev) => {
                if (prev[cardKey] === imageUri) {
                  return prev;
                }
                return {
                  ...prev,
                  [cardKey]: imageUri,
                };
              });

              const prevTimer = failedImageRetryTimersRef.current[cardKey];
              if (prevTimer) {
                clearTimeout(prevTimer);
              }

              failedImageRetryTimersRef.current[cardKey] = setTimeout(() => {
                setFailedCardImages((prev) => {
                  if (prev[cardKey] !== imageUri) {
                    return prev;
                  }

                  const next = { ...prev };
                  delete next[cardKey];
                  return next;
                });

                delete failedImageRetryTimersRef.current[cardKey];
              }, IMAGE_FAILURE_RETRY_MS);
            }}
            onPress={() => handleCardPress(item)}
          />
        </View>
      );
    },
    [failedCardImages, getCardKey, handleCardPress],
  );

  return (
    <View style={containerStyle}>
      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.regionButton}
          activeOpacity={0.7}
          onPress={() =>
            navigation
              .getParent<BottomTabNavigationProp<MainTabParamList>>()
              ?.navigate('MyPageStack', {
                screen: 'LocationSetup',
                params: { returnTo: 'mypage' },
              })
          }
          accessibilityRole="button"
          accessibilityLabel={`${regionName} 지역 변경`}
        >
          <MapPinIcon size={16} color={colors.primary} />
          <Text style={styles.regionText}>{regionName}</Text>
          <ChevronDownIcon size={13} color={colors.gray700} />
          <View style={styles.radiusPill}>
            <Text style={styles.radiusPillText}>{radiusLabel}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Search', { initialQuery: undefined })}
            accessibilityRole="button"
            accessibilityLabel="검색"
          >
            <SearchIcon size={20} color={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0 ? `알림 ${unreadCount}개 안읽음` : '알림'
            }
            onPress={() => navigation.navigate('Notifications')}
          >
            <BellIcon size={22} color={colors.black} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.radiusSelectorWrap}>
        <Pressable
          onPress={() => setIsRadiusMenuOpen((prev) => !prev)}
          style={({ pressed }) => [
            styles.radiusDropdownButton,
            pressed && styles.radiusDropdownButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`반경 선택, 현재 ${radiusLabel}`}
          accessibilityState={{ expanded: isRadiusMenuOpen }}
        >
          <Text style={styles.radiusDropdownText}>반경 {radiusLabel}</Text>
          {isRadiusMenuOpen ? (
            <ChevronUpIcon size={16} color={colors.gray700} />
          ) : (
            <ChevronDownIcon size={16} color={colors.gray700} />
          )}
        </Pressable>

        {isRadiusMenuOpen && (
          <View style={styles.radiusDropdownMenu}>
            {RADIUS_OPTIONS.map((option) => {
              const isActive = option === radius;
              const label = `${Math.round(option / 1000)}km`;

              return (
                <Pressable
                  key={option}
                  onPress={() => handleRadiusSelect(option)}
                  style={({ pressed }) => [
                    styles.radiusDropdownItem,
                    isActive && styles.radiusDropdownItemActive,
                    pressed && styles.radiusDropdownItemPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`반경 ${label} 설정`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[
                      styles.radiusDropdownItemText,
                      isActive && styles.radiusDropdownItemTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── 검색바 ── */}
      <View style={styles.searchBarWrap}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', { initialQuery: undefined })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="오늘 뭐 살까? 품목 검색"
        >
          <SearchIcon size={18} color={colors.gray400} />
          <Text style={styles.searchPlaceholder}>오늘 뭐 살까? · 품목 검색</Text>
        </TouchableOpacity>
      </View>

      {/* ── 동네 미설정 배너 ── */}
      {isRegionNameMissing && (
        <TouchableOpacity
          style={styles.locationBanner}
          onPress={() =>
            navigation
              .getParent<BottomTabNavigationProp<MainTabParamList>>()
              ?.navigate('MyPageStack', {
                screen: 'LocationSetup',
                params: { returnTo: 'mypage' },
              })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.locationBannerText}>
            내 동네를 설정하면 주변 가격을 볼 수 있어요
          </Text>
          <Text style={styles.locationBannerAction}>설정하기 →</Text>
        </TouchableOpacity>
      )}

      {/* ── 메인 피드 ── */}
      <FlatList
        ref={listRef}
        data={feedCards}
        keyExtractor={getCardKey}
        renderItem={renderCard}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={listFooter}
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

// ─── HeroGradient ──────────────────────────────────────────────────────────
// screens-home.jsx의 HeroGradient 패턴을 PriceTag 시스템 색상으로 구현.
// 가격표 타입별 그라디언트 → 등록된 가격표 타입에 맞는 색상으로 히어로 카드 렌더링.
interface HeroGradientProps {
  card: ProductPriceCard;
  onPress: (card: ProductPriceCard) => void;
}

const HeroGradient = React.memo(({ card, onPress }: HeroGradientProps) => {
  const { priceTag, signals } = card;
  const gradient = priceTagGradients[priceTag.type];
  const tagLabel = getPriceTagLabel(priceTag);

  const originalPrice = priceTag.originalPrice;
  const savings =
    originalPrice && originalPrice > card.minPrice
      ? Math.round((1 - card.minPrice / originalPrice) * 100)
      : null;

  const range = signals.maxPrice - signals.minPrice;
  const positionPct =
    range > 0 ? ((card.minPrice - signals.minPrice) / range) * 100 : 0;

  return (
    <Pressable
      onPress={() => onPress(card)}
      style={({ pressed }) => [styles.heroWrap, pressed && styles.heroPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${card.productName} 오늘의 최저가`}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* 장식 원 */}
        <View style={styles.heroDecorBig} />
        <View style={styles.heroDecorSm} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroTagBadge}>
            <Text style={styles.heroTagBadgeText}>{tagLabel}</Text>
          </View>
          <Text style={styles.heroTime}>· {formatRelativeTime(card.createdAt)}</Text>
        </View>

        <Text style={styles.heroProductName} numberOfLines={1}>
          {card.productName}
        </Text>
        <Text style={styles.heroStoreName} numberOfLines={1}>
          {card.cheapestStore?.name ?? '매장 정보 없음'}
        </Text>

        <View style={styles.heroPriceRow}>
          <Text style={styles.heroPrice}>{formatPrice(card.minPrice)}</Text>
          <Text style={styles.heroPriceUnit}>원</Text>
          {savings && (
            <View style={[styles.heroSavingsPill, { shadowColor: gradient[1] }]}>
              <Text style={[styles.heroSavingsText, { color: gradient[1] }]}>
                −{savings}%
              </Text>
            </View>
          )}
        </View>

        {range > 0 && (
          <>
            <View style={styles.heroBarTrack}>
              <View
                style={[
                  styles.heroBarFill,
                  { width: `${Math.max(6, 100 - positionPct)}%` },
                ]}
              />
            </View>
            <View style={styles.heroBarLabels}>
              <Text style={styles.heroBarLabel}>
                최저 {formatPrice(signals.minPrice)}
              </Text>
              <Text style={styles.heroBarLabel}>{signals.storeCount}곳 비교</Text>
              <Text style={styles.heroBarLabel}>
                최고 {formatPrice(signals.maxPrice)}
              </Text>
            </View>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
});

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
    paddingHorizontal: spacing.lg,
  },
  regionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  regionText: {
    ...typography.headingMd,
    fontFamily: PJS.bold,
    color: colors.black,
    letterSpacing: -0.3,
  },
  radiusPill: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.chipPadH,
    paddingVertical: spacing.chipPadV,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primaryLight,
  },
  radiusPillText: {
    ...typography.tabLabel,
    fontFamily: PJS.bold,
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.micro,
  },
  headerIconBtn: {
    width: spacing.backBtnSize,
    height: spacing.backBtnSize,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    minWidth: spacing.iconSm,
    height: spacing.iconSm,
    paddingHorizontal: spacing.xs,
    borderRadius: spacing.radiusXs,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontFamily: PJS.bold,
    fontSize: 9,
    color: colors.white,
    letterSpacing: -0.2,
  },

  // ─── 검색바 ─────────────────────────────────────────────────────────
  searchBarWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  radiusSelectorWrap: {
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
    zIndex: 20,
  },
  radiusDropdownButton: {
    minWidth: 120,
    height: spacing.touchTargetMin,
    borderRadius: spacing.radiusFull,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.white,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  radiusDropdownButtonPressed: {
    opacity: 0.82,
  },
  radiusDropdownText: {
    ...typography.captionBold,
    color: colors.gray700,
  },
  radiusDropdownMenu: {
    position: 'absolute',
    top: spacing.touchTargetMin + spacing.xs,
    left: spacing.lg,
    width: 120,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.white,
    paddingVertical: spacing.xs,
    shadowColor: colors.shadowBase,
    shadowOpacity: spacing.floatShadowOpacity,
    shadowRadius: spacing.sm,
    shadowOffset: { width: 0, height: spacing.xs },
    elevation: spacing.elevationSm,
  },
  radiusDropdownItem: {
    height: spacing.touchTargetMin,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  radiusDropdownItemActive: {
    backgroundColor: colors.primary,
  },
  radiusDropdownItemPressed: {
    opacity: 0.82,
  },
  radiusDropdownItemText: {
    ...typography.captionBold,
    color: colors.gray700,
  },
  radiusDropdownItemTextActive: {
    color: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radiusInput,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.micro,
    gap: spacing.searchBarGap,
    borderWidth: spacing.borderThin,
    borderColor: colors.surfaceContainer,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: PJS.regular,
    fontSize: 14,
    color: colors.gray400,
  },

  // ─── 동네 배너 ──────────────────────────────────────────────────────
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
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
    paddingTop: spacing.sm,
  },
  cardWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
  },

  // ─── 히어로 그라디언트 ──────────────────────────────────────────────
  heroWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: spacing.radiusHero,
    overflow: 'hidden',
    shadowColor: colors.shadowBase,
    shadowOpacity: spacing.floatShadowOpacity,
    shadowRadius: spacing.inputPad,
    shadowOffset: { width: 0, height: spacing.elevationMd },
    elevation: spacing.elevationMd,
  },
  heroPressed: {
    opacity: 0.94,
  },
  heroCard: {
    padding: spacing.heroCardPad,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecorBig: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.flyerCircleOverlay,
  },
  heroDecorSm: {
    position: 'absolute',
    right: 30,
    bottom: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.flyerCircleOverlayFaint,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroTagBadge: {
    backgroundColor: colors.onGradientChip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
  },
  heroTagBadgeText: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.white,
    letterSpacing: 1.5,
  },
  heroTime: {
    ...typography.tabLabel,
    fontFamily: PJS.regular,
    color: colors.onGradientTextMuted,
  },
  heroProductName: {
    fontFamily: PJS.extraBold,
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.4,
    marginTop: spacing.md,
  },
  heroStoreName: {
    ...typography.caption,
    color: colors.bannerTextMuted,
    marginTop: spacing.micro,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.inputPad,
    gap: spacing.sm,
  },
  heroPrice: {
    fontFamily: PJS.extraBold,
    fontSize: 42,
    color: colors.white,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  heroPriceUnit: {
    ...typography.headingMd,
    fontFamily: PJS.bold,
    color: colors.onGradientTextStrong,
  },
  heroSavingsPill: {
    marginLeft: 'auto',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm + spacing.micro,
    paddingVertical: spacing.xs + 1,
    borderRadius: spacing.radiusFull,
    shadowOpacity: 0.15,
    shadowRadius: spacing.xs,
    shadowOffset: { width: 0, height: spacing.micro },
  },
  heroSavingsText: {
    ...typography.caption,
    fontFamily: PJS.extraBold,
  },
  heroBarTrack: {
    marginTop: spacing.inputPad,
    height: spacing.micro + spacing.micro + 1,
    backgroundColor: colors.onGradientChip,
    borderRadius: spacing.micro + 1,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: spacing.micro + 1,
  },
  heroBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.cardTextGap,
  },
  heroBarLabel: {
    ...typography.tabLabel,
    fontFamily: PJS.bold,
    color: colors.onGradientTextBase,
  },

  // ─── 인기 태그 ──────────────────────────────────────────────────────
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tagChip: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusFull,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontFamily: PJS.semiBold,
    fontSize: 13,
    color: colors.gray700,
  },
  tagTextActive: {
    color: colors.white,
  },

  // ─── 섹션 헤더 ──────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: PJS.extraBold,
    fontSize: 18,
    color: colors.black,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: PJS.regular,
    fontSize: 12,
    color: colors.gray600,
    marginTop: 2,
  },
  sectionMoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    backgroundColor: colors.white,
  },
  sectionMoreText: {
    fontFamily: PJS.bold,
    fontSize: 12,
    color: colors.primary,
  },

  // ─── 전단지 배너 ────────────────────────────────────────────────────
  flyerBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: 18,
    backgroundColor: colors.flyerBannerBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  flyerDot: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.flyerPrimaryDotOverlay,
  },
  flashBadgeText: {
    fontFamily: PJS.extraBold,
    fontSize: 10,
    color: colors.tertiaryFixedDim,
    letterSpacing: 2,
    marginBottom: 4,
  },
  flyerBannerTitle: {
    fontFamily: PJS.extraBold,
    fontSize: 18,
    color: colors.white,
    letterSpacing: -0.4,
  },
  flyerBannerSub: {
    fontFamily: PJS.regular,
    fontSize: 12,
    color: colors.onGradientTextSubtle,
    marginTop: 3,
  },
  flyerChev: {
    fontSize: 24,
    color: colors.white,
    fontFamily: PJS.bold,
  },
});

export default HomeScreen;
