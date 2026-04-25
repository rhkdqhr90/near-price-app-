import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { FlyerResponse, FlyerProductItem, FlyerReviewItem } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import MapPinIcon from '../icons/MapPinIcon';
import ThumbUpIcon from '../icons/ThumbUpIcon';
import { formatPrice } from '../../utils/format';

export interface FlyerTemplateProps {
  flyer: FlyerResponse;
  onDirection: () => void;
  onCommunityShare: () => void;
  onProductPress: (product: FlyerProductItem) => void;
}

type BadgeType = 'red' | 'yellow' | 'blue';

// ─── ProductCell ──────────────────────────────────────────────────────────────

interface ProductCellProps {
  item: FlyerProductItem;
  onPress: (item: FlyerProductItem) => void;
}

const ProductCell: React.FC<ProductCellProps> = ({ item, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const priceStr = formatPrice(item.salePrice);
  const numPart = priceStr.replace('원', '').trim();
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const handleImageError = useCallback(() => setImageError(true), []);

  return (
    <TouchableOpacity
      style={styles.productCell}
      onPress={handlePress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} 상세보기`}
    >
      {(item.badges ?? []).length > 0 && (
        <View style={styles.badgeWrap}>
          {item.badges.map((badge) => (
            <View key={badge.label} style={badgeStyleMap[badge.type]}>
              <Text style={[styles.badgeText, badgeTextStyleMap[badge.type]]}>{badge.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 상품 이미지 또는 이모지 */}
      {item.imageUrl && !imageError ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
          onError={handleImageError}
        />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.productEmoji}>{item.emoji}</Text>
        </View>
      )}

      <View style={styles.productInfoWrap}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.productPriceBlock}>
          {item.originalPrice !== null && (
            <Text style={styles.originalPrice}>{formatPrice(item.originalPrice)}</Text>
          )}
          <View style={styles.salePriceRow}>
            <Text style={styles.salePrice}>{numPart}</Text>
            <Text style={styles.salePriceUnit}>원</Text>
          </View>
        </View>
        <View style={styles.cartBtn} accessibilityElementsHidden>
          <Text style={styles.cartBtnText}>🛒</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── ReviewCard ───────────────────────────────────────────────────────────────

const ReviewCard: React.FC<{ item: FlyerReviewItem }> = ({ item }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <View style={[styles.reviewAvatar, { backgroundColor: item.avatarColor }]}>
        <Text style={styles.reviewInitial}>{item.initial}</Text>
      </View>
      <View style={styles.reviewMeta}>
        <Text style={styles.reviewName}>{item.name}</Text>
        <Text style={styles.reviewTime}>{item.meta}</Text>
      </View>
    </View>
    <Text style={styles.reviewContent}>{item.content}</Text>
    {item.helpfulCount !== undefined && (
      <TouchableOpacity
        style={styles.helpfulBtn}
        disabled
        accessibilityRole="button"
        accessibilityLabel={`도움돼요 ${item.helpfulCount}`}
        accessibilityState={{ disabled: true }}
      >
        <ThumbUpIcon size={13} color={colors.primary} />
        <Text style={styles.helpfulText}>도움돼요 {item.helpfulCount}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── ClassicTemplate ─────────────────────────────────────────────────────────

const ClassicTemplate: React.FC<FlyerTemplateProps> = ({
  flyer,
  onDirection,
  onCommunityShare,
  onProductPress,
}) => {
  const productRows = useMemo(() => {
    const rows: FlyerProductItem[][] = [];
    const products = flyer.products ?? [];
    for (let i = 0; i < products.length; i += 2) {
      rows.push(products.slice(i, i + 2));
    }
    return rows;
  }, [flyer.products]);

  const ratingStars = flyer.storeRating != null
    ? '★'.repeat(Math.max(0, Math.min(5, Math.round(flyer.storeRating))))
    : '';

  return (
    <>
      {/* 히어로 배너 */}
      <View style={styles.hero}>
        <View style={styles.heroDecorCircle} />
        <View style={styles.weeklyBadge}>
          <Text style={styles.weeklyBadgeText}>WEEKLY SPECIAL</Text>
        </View>
        <Text style={styles.heroTitle}>
          {flyer.storeName}{' '}
          <Text style={styles.heroAccent}>{flyer.promotionTitle}</Text>
        </Text>
        <View style={styles.heroDateRow}>
          <View style={styles.heroDateLine} />
          <Text style={styles.heroDateText}>{flyer.dateRange}</Text>
          <View style={styles.heroDateLine} />
        </View>
      </View>

      {/* 상품 그리드 */}
      {productRows.length > 0 && (
        <View style={styles.productGrid}>
          {productRows.map((row, rowIdx) => (
            <View
              key={row[0]?.id ?? rowIdx}
              style={[styles.productRow, rowIdx > 0 && styles.productRowBorder]}
            >
              {row.map((product, colIdx) => (
                <View
                  key={product.id}
                  style={[
                    styles.productCellWrap,
                    colIdx === 0 && styles.productCellWrapBorderRight,
                  ]}
                >
                  <ProductCell item={product} onPress={onProductPress} />
                </View>
              ))}
              {row.length === 1 && <View style={styles.productCellWrap} />}
            </View>
          ))}
        </View>
      )}

      {/* 경고 배너 */}
      {flyer.warningText ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>{flyer.warningText}</Text>
        </View>
      ) : null}

      {/* 점장의 약속 */}
      {(flyer.ownerName || flyer.ownerQuote) ? (
        <View style={styles.ownerSection}>
          <View style={styles.ownerCard}>
            <Text style={styles.ownerQuoteDecor}>"</Text>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerAvatarWrap}>
                <Text style={styles.ownerAvatarEmoji}>🏪</Text>
              </View>
              <View>
                {flyer.ownerRole ? <Text style={styles.ownerRole}>{flyer.ownerRole}</Text> : null}
                {flyer.ownerName ? <Text style={styles.ownerName}>{flyer.ownerName}</Text> : null}
              </View>
            </View>
            {flyer.ownerQuote ? <Text style={styles.ownerQuote}>{flyer.ownerQuote}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* 매장 정보 */}
      {flyer.storeAddress ? (
        <View style={styles.martSection}>
          <View style={styles.martCard}>
            <View style={styles.martNameRow}>
              <Text style={styles.martName}>{flyer.storeName}</Text>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>인기 매장</Text>
              </View>
            </View>
            <View style={styles.martAddressRow}>
              <MapPinIcon size={14} color={colors.gray600} />
              <Text style={styles.martAddress}>{flyer.storeAddress}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStars}>{ratingStars}</Text>
              <Text style={styles.ratingNum}>{flyer.storeRating ?? '-'}</Text>
              <Text style={styles.ratingCount}>(리뷰 {flyer.storeReviewCount ?? '-'})</Text>
            </View>
            <View style={styles.martBtns}>
              <TouchableOpacity
                style={styles.directionBtnWrap}
                onPress={onDirection}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="길찾기"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.directionBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.directionBtnIcon}>🧭</Text>
                  <Text style={styles.directionBtnText}>길찾기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* 이웃들의 실시간 정보 */}
      <View style={styles.communitySection}>
        <View style={styles.communityHeader}>
          <Text style={styles.communityTitle}>이웃들의 실시간 정보</Text>
          <View style={styles.realtimeBadge}>
            <Text style={styles.realtimeBadgeText}>Real-time</Text>
          </View>
        </View>
        <View style={styles.reviewList}>
          {(flyer.reviews ?? []).map((review) => (
            <ReviewCard key={review.id} item={review} />
          ))}
        </View>
        <TouchableOpacity
          style={styles.shareInfoBtn}
          onPress={onCommunityShare}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="정보 공유하기"
        >
          <Text style={styles.shareInfoBtnText}>정보 공유하기</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.flyerHeroRed,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroDecorCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.flyerBadgeYellow,
    opacity: 0.18,
    top: -30,
    right: -20,
  },
  weeklyBadge: {
    backgroundColor: colors.flyerBadgeYellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
    marginBottom: spacing.md,
  },
  weeklyBadgeText: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: colors.flyerHeroRed,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontStyle: 'italic',
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  heroAccent: { color: colors.flyerBadgeYellow },
  heroDateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroDateLine: { width: 28, height: 1, backgroundColor: colors.flyerHeroDateLine },
  heroDateText: { fontSize: 13, fontWeight: '700' as const, color: colors.flyerHeroDateText, letterSpacing: 0.5 },

  productGrid: { backgroundColor: colors.gray200, gap: 1 },
  productRow: { flexDirection: 'row', gap: 1 },
  productRowBorder: { borderTopWidth: 1, borderTopColor: colors.gray200 },
  productCellWrap: { flex: 1, backgroundColor: colors.white },
  productCellWrapBorderRight: { borderRightWidth: 1, borderRightColor: colors.gray200 },

  productCell: { backgroundColor: colors.white },
  badgeWrap: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 1,
    gap: spacing.xs,
  },
  badge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: spacing.radiusSm },
  badgeRed: { backgroundColor: colors.flyerRed },
  badgeYellow: { backgroundColor: colors.flyerBadgeYellow },
  badgeBlue: { backgroundColor: colors.flyerBadgeBlue },
  badgeText: { fontSize: 9, fontWeight: '900' as const },
  badgeTextLight: { color: colors.white },
  badgeTextDark: { color: colors.black },

  productImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray100,
  },
  productImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.flyerProductDark,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  productEmoji: { fontSize: 40 },

  productInfoWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingRight: spacing.xxl + spacing.sm, position: 'relative' },
  productName: { fontSize: 12, fontWeight: '700' as const, color: colors.black, lineHeight: 17, marginBottom: spacing.xs },
  productPriceBlock: { gap: 1 },
  originalPrice: { fontSize: 10, color: colors.gray400, textDecorationLine: 'line-through', fontWeight: '500' as const },
  salePriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  salePrice: { fontSize: 20, fontWeight: '900' as const, color: colors.flyerRed, lineHeight: 24 },
  salePriceUnit: { fontSize: 11, fontWeight: '500' as const, color: colors.flyerRed },
  cartBtn: { position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  cartBtnText: { fontSize: 15 },

  warningBanner: { backgroundColor: colors.flyerBadgeYellow, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  warningText: { fontSize: 10, fontWeight: '900' as const, color: colors.flyerHeroRed, letterSpacing: -0.2, textAlign: 'center' },

  ownerSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  ownerCard: { backgroundColor: colors.white, borderRadius: spacing.radiusXl, padding: spacing.xl, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  ownerQuoteDecor: { position: 'absolute', right: spacing.lg, top: -spacing.sm, fontSize: 80, color: colors.primary, opacity: 0.06, fontWeight: '900' as const },
  ownerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  ownerAvatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  ownerAvatarEmoji: { fontSize: 24 },
  ownerRole: { fontSize: 14, fontWeight: '900' as const, color: colors.primary, marginBottom: 2 },
  ownerName: { fontSize: 11, fontWeight: '500' as const, color: colors.gray600 },
  ownerQuote: { fontSize: 14, fontWeight: '500' as const, color: colors.gray900, lineHeight: 22, fontStyle: 'italic' },

  martSection: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  martCard: { backgroundColor: colors.white, borderRadius: spacing.radiusXl, padding: spacing.xl, borderWidth: 1, borderColor: colors.gray100, shadowColor: colors.shadowBase, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  martNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  martName: { fontSize: 22, fontWeight: '800' as const, color: colors.primary, letterSpacing: -0.3 },
  popularBadge: { backgroundColor: colors.accentLight, borderRadius: spacing.radiusFull, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  popularBadgeText: { fontSize: 10, fontWeight: '700' as const, color: colors.olive },
  martAddressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  martAddress: { fontSize: 13, fontWeight: '500' as const, color: colors.gray600 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  ratingStars: { fontSize: 16, color: colors.starYellow },
  ratingNum: { fontSize: 15, fontWeight: '700' as const, color: colors.black },
  ratingCount: { fontSize: 12, color: colors.gray600, marginLeft: spacing.xs },
  martBtns: { flexDirection: 'row', gap: spacing.sm },
  directionBtnWrap: { flex: 1, borderRadius: spacing.radiusMd, overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  directionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  directionBtnIcon: { fontSize: 18 },
  directionBtnText: { fontSize: 14, fontWeight: '700' as const, color: colors.white },

  communitySection: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  communityHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  communityTitle: { fontSize: 18, fontWeight: '800' as const, color: colors.black, letterSpacing: -0.3 },
  realtimeBadge: { backgroundColor: colors.gray100, borderRadius: spacing.radiusSm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  realtimeBadgeText: { fontSize: 10, fontWeight: '500' as const, color: colors.gray600 },
  reviewList: { gap: spacing.md, marginBottom: spacing.xl },
  reviewCard: { backgroundColor: colors.surfaceBg, borderRadius: spacing.radiusXl, padding: spacing.xl },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewInitial: { fontSize: 15, fontWeight: '800' as const, color: colors.primary },
  reviewMeta: { gap: 2 },
  reviewName: { fontSize: 14, fontWeight: '700' as const, color: colors.black },
  reviewTime: { fontSize: 10, fontWeight: '500' as const, color: colors.gray600 },
  reviewContent: { fontSize: 13, fontWeight: '400' as const, color: colors.gray700, lineHeight: 20 },
  helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: spacing.radiusFull, borderWidth: 1, borderColor: colors.gray200 },
  helpfulText: { fontSize: 11, fontWeight: '700' as const, color: colors.primary },
  shareInfoBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.gray200, borderRadius: spacing.radiusXl, paddingVertical: spacing.xl, alignItems: 'center' },
  shareInfoBtnText: { fontSize: 14, fontWeight: '700' as const, color: colors.gray600 },
});

const badgeStyleMap: Record<BadgeType, ViewStyle[]> = {
  red: [styles.badge, styles.badgeRed],
  yellow: [styles.badge, styles.badgeYellow],
  blue: [styles.badge, styles.badgeBlue],
};

const badgeTextStyleMap: Record<BadgeType, TextStyle> = {
  red: styles.badgeTextLight,
  yellow: styles.badgeTextDark,
  blue: styles.badgeTextLight,
};

export default ClassicTemplate;
