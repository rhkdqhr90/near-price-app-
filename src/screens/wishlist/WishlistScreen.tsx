import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable,
  StyleSheet, Alert, RefreshControl, Image, type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabScreenProps } from '../../navigation/types';
import type { WishlistItem, ProductCategory, UnitType } from '../../types/api.types';
import { useMyWishlist, useRemoveWishlist } from '../../hooks/queries/useWishlist';
import SkeletonCard from '../../components/common/SkeletonCard';
import HeartIcon from '../../components/icons/HeartIcon';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import TagIcon from '../../components/icons/TagIcon';
import { formatPrice, fixImageUrl } from '../../utils/format';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = MainTabScreenProps<'Wishlist'>;

// ── 단위 표시 ──────────────────────────────────────────────────────────────
const UNIT_LABEL: Record<UnitType, string> = {
  g: 'g', kg: 'kg', ml: 'ml', l: 'L',
  count: '개', bunch: '단', pack: '팩', bag: '봉', other: '',
};

// ── 카테고리 → 한글 배지 / 이모지 ─────────────────────────────────────────
const CATEGORY_LABEL: Record<ProductCategory, string> = {
  vegetable: '채소',
  fruit:     '과일',
  meat:      '육류',
  seafood:   '수산물',
  dairy:     '유제품',
  grain:     '곡류',
  processed: '가공식품',
  household: '생활용품',
  other:     '기타',
};

// ── 이미지 영역 서브컴포넌트 (onError fallback 상태 관리) ─────────────────
interface CardImageProps {
  imageUri: string | null;
  productName: string;
}

const CardImage = React.memo(({ imageUri, productName }: CardImageProps) => {
  const [imgError, setImgError] = useState(false);
  if (!imageUri || imgError) {
    return (
      <View style={styles.cardImgPlaceholder}>
        <TagIcon size={24} color={colors.gray400} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: imageUri }}
      style={styles.cardFillImage}
      resizeMode="cover"
      onError={() => setImgError(true)}
      accessible={true}
      accessibilityLabel={`${productName} 상품 이미지`}
    />
  );
});

const WishlistScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: wishlist, isLoading, isError, refetch } = useMyWishlist();
  const { mutate: removeWishlist } = useRemoveWishlist();

  const items = wishlist?.items ?? [];

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl + spacing.lg,
    }),
    [insets.bottom],
  );

  const handleItemPress = useCallback((item: WishlistItem) => {
    navigation.navigate('HomeStack', {
      screen: 'PriceCompare',
      params: { productId: item.productId, productName: item.productName },
    });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleDelete = useCallback((item: WishlistItem) => {
    Alert.alert('찜 삭제', `${item.productName}을(를) 찜 목록에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => removeWishlist(item.productId),
      },
    ]);
  }, [removeWishlist]);

  // ── 카드 (모든 아이템 동일 레이아웃) ────────────────────────────────────
  const renderItem = useCallback(({ item }: ListRenderItemInfo<WishlistItem>) => {
    const categoryLabel = CATEGORY_LABEL[item.category] ?? '기타';
    const unitLabel = UNIT_LABEL[item.unitType] ?? '';
    const imageUri = fixImageUrl(item.imageUrl);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleItemPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`찜한 상품 ${item.productName}${item.lowestPrice !== null ? ` ${formatPrice(item.lowestPrice)}` : ''}`}
      >
        {/* 이미지 영역: 카드 내부에 독립된 rounded 이미지 */}
        <View style={styles.cardImgWrap}>
          <CardImage imageUri={imageUri} productName={item.productName} />
        </View>

        {/* 콘텐츠 영역 */}
        <View style={styles.cardBody}>
          {/* 배지 + 하트 버튼 한 row */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{categoryLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.cardHeartBtn}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.productName} 찜 삭제`}
            >
              <HeartIcon size={16} color={colors.danger} filled />
            </TouchableOpacity>
          </View>

          {/* 상품명 (2줄) */}
          <Text style={styles.cardProductName} numberOfLines={2}>{item.productName}</Text>

          {/* 가격 + 단위 */}
          {item.lowestPrice !== null ? (
            <View style={styles.cardPriceRow}>
              <Text style={styles.cardPrice}>{formatPrice(item.lowestPrice)}</Text>
              {unitLabel ? <Text style={styles.cardPriceUnit}>/ {unitLabel}</Text> : null}
            </View>
          ) : (
            <Text style={styles.noPriceText}>가격 정보 없음</Text>
          )}

          {/* 매장 */}
          {item.lowestPriceStoreName ? (
            <View style={styles.cardStoreRow}>
              <MapPinIcon size={spacing.iconXs} color={colors.outlineColor} />
              <Text style={styles.cardStoreName} numberOfLines={1}>
                {item.lowestPriceStoreName}
              </Text>
            </View>
          ) : null}

          {/* 검증 칩 */}
          {item.verificationCount > 0 && (
            <View style={styles.verifyChip}>
              <Text style={styles.verifyChipText}>✓ {item.verificationCount}명 확인</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, [handleItemPress, handleDelete]);


  // ── 빈 상태 ──────────────────────────────────────────────────────────────
  const renderEmpty = useCallback(() => {
    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCard}>
            <WifiOffIcon size={64} color={colors.gray400} />
          </View>
          <Text style={styles.emptyTitle}>불러올 수 없어요</Text>
          <Text style={styles.emptySubtitle}>네트워크 상태를 확인하고 다시 시도해 주세요.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="다시 시도"
          >
            <Text style={styles.emptyBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyDecorCircle} />
        <View style={styles.emptyIconCard}>
          <HeartIcon size={80} color={colors.primary} filled />
        </View>
        <Text style={styles.emptyTitle}>찜한 항목이 없어요</Text>
        <Text style={styles.emptySubtitle}>
          마음에 드는 상품을 찜해보세요!{'\n'}하트 아이콘을 누르면 여기 저장돼요.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('HomeStack', { screen: 'Home' })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="홈으로 이동하여 상품 둘러보기"
        >
          <Text style={styles.emptyBtnText}>지금 둘러보기</Text>
        </TouchableOpacity>
        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <View style={styles.tipTextWrap}>
            <Text style={styles.tipLabel}>큐레이션 팁</Text>
            <Text style={styles.tipBody}>
              가격 카드의 하트 아이콘을 누르면 나중에 볼 수 있도록 저장됩니다.
            </Text>
          </View>
        </View>
      </View>
    );
  }, [isError, refetch, navigation]);


  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: insets.top }],
    [insets.top],
  );

  return (
    <View style={containerStyle}>
      {/* ── 헤더: "찜 목록" + 숫자 배지 ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>찜 목록</Text>
        {items.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{items.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <SkeletonCard variant="wishlist" />
      ) : isError ? (
        renderEmpty()
      ) : items.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.productId}
          renderItem={renderItem}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ─── 헤더 ─────────────────────────────────────────────────────────────────
  // HTML: flex items-center gap-2 px-5 py-3
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.surfaceContainer,
  },
  headerTitle: {
    fontSize: typography.headingLg.fontSize,
    fontWeight: '800' as const,
    color: colors.black,
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800' as const,
    color: colors.white,
  },

  // ─── 공통 ─────────────────────────────────────────────────────────────────
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }],
  },
  noPriceText: {
    fontSize: typography.bodySm.fontSize,
    fontWeight: '400' as const,
    color: colors.gray400,
  },

  // ─── 카드 (수평 레이아웃) ─────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusLg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    shadowOpacity: 0.06,
    shadowRadius: spacing.shadowRadiusLg,
    elevation: 3,
    overflow: 'hidden',
  },
  // 이미지: 고정 wishlistCardImgSize×wishlistCardImgSize, 자체 rounded corners
  cardImgWrap: {
    width: spacing.wishlistCardImgSize,
    height: spacing.wishlistCardImgSize,
    flexShrink: 0,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFillImage: {
    width: spacing.wishlistCardImgSize,
    height: spacing.wishlistCardImgSize,
  },
  cardImgPlaceholder: {
    width: spacing.wishlistCardImgSize,
    height: spacing.wishlistCardImgSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  // 콘텐츠 영역 (flex:1 — 이미지 오른쪽 나머지 공간)
  cardBody: {
    flex: 1,
  },
  // 배지 + 하트 버튼 헤더 row
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  // 하트 버튼 (인라인 배치, absolute 아님)
  cardHeartBtn: {
    width: spacing.heartBtnSm,
    height: spacing.heartBtnSm,
    borderRadius: spacing.heartBtnSm / 2,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: 0.15,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 3,
  },
  cardBadge: {
    backgroundColor: colors.tertiaryContainer,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cardBadgeText: {
    fontSize: typography.microLabel.fontSize,
    fontWeight: '800' as const,
    color: colors.onTertiaryContainer,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  cardProductName: {
    fontSize: typography.labelMd.fontSize,
    fontWeight: '700' as const,
    color: colors.black,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardPrice: {
    ...typography.price,
  },
  cardPriceUnit: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: '400' as const,
    color: colors.outlineColor,
  },
  cardStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,  // 16px → 8px
  },
  cardStoreName: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: '500' as const,
    color: colors.outlineColor,
    flex: 1,
  },

  // ─── 검증 칩 ──────────────────────────────────────────────────────────────
  verifyChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    marginTop: spacing.micro,
  },
  verifyChipText: {
    ...typography.captionBold,
    color: colors.primary,
  },

  // ─── 빈 상태 ──────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  emptyDecorCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryLight,
    opacity: 0.4,
    top: '15%',
  },
  emptyIconCard: {
    width: 120,
    height: 120,
    borderRadius: spacing.radiusXl,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.06,
    shadowRadius: spacing.sm,
    elevation: spacing.xs,
  },
  emptyTitle: {
    ...typography.headingXl,
    color: colors.gray900,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: spacing.xl,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  emptyBtnText: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.white,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusMd,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
  },
  tipEmoji: {
    fontSize: spacing.iconSm,
    lineHeight: 22,
  },
  tipTextWrap: { flex: 1 },
  tipLabel: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: spacing.micro,
  },
  tipBody: {
    ...typography.bodySm,
    color: colors.gray700,
    lineHeight: spacing.lg,
  },
});

export default WishlistScreen;
