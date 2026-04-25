import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import type { FlyerProductItem } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { FlyerTemplateProps } from './ClassicTemplate';

// ─── HeroProduct ──────────────────────────────────────────────────────────────

interface HeroProductProps {
  hero: FlyerProductItem;
  savePct: number | null;
  onPress: (product: FlyerProductItem) => void;
}

const HeroProduct: React.FC<HeroProductProps> = ({ hero, savePct, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const handlePress = useCallback(() => onPress(hero), [onPress, hero]);
  const handleImageError = useCallback(() => setImageError(true), []);

  return (
    <TouchableOpacity
      style={styles.heroSection}
      onPress={handlePress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${hero.name} 상세보기`}
    >
      <View style={styles.heroRow}>
        {savePct !== null && (
          <View style={styles.saveCircle}>
            <Text style={styles.saveLabel}>SAVE</Text>
            <View style={styles.savePctRow}>
              <Text style={styles.savePct}>{savePct}</Text>
              <Text style={styles.savePctSign}>%</Text>
            </View>
          </View>
        )}
        {/* 히어로 이미지 또는 이모지 */}
        {hero.imageUrl && !imageError ? (
          <Image
            source={{ uri: hero.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <Text style={styles.heroEmoji}>{hero.emoji}</Text>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.heroSticker}>★ 이주의 특가 ★</Text>
          <Text style={styles.heroName} numberOfLines={2}>{hero.name}</Text>
          {hero.originalPrice !== null && (
            <Text style={styles.heroOriginal}>
              정가 {hero.originalPrice.toLocaleString('ko-KR')}원
            </Text>
          )}
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPrice}>{hero.salePrice.toLocaleString('ko-KR')}</Text>
            <Text style={styles.heroPriceUnit}>원</Text>
          </View>
        </View>
      </View>
      <View style={styles.stickerRow}>
        <View style={styles.yellowSticker}>
          <Text style={styles.stickerText}>📣 오늘만! 선착순 50명</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── GridProductCell ──────────────────────────────────────────────────────────

interface GridCellProps {
  product: FlyerProductItem;
  onPress: (product: FlyerProductItem) => void;
}

const GridCell: React.FC<GridCellProps> = ({ product, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const handlePress = useCallback(() => onPress(product), [onPress, product]);
  const handleImageError = useCallback(() => setImageError(true), []);

  return (
    <TouchableOpacity
      style={styles.productCell}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} 상세보기`}
    >
      <View style={styles.productImageBox}>
        {product.imageUrl && !imageError ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImageFull}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <Text style={styles.productEmoji}>{product.emoji}</Text>
        )}
        {product.badges[0] && (
          <View style={styles.productBadge}>
            <Text style={styles.productBadgeText}>{product.badges[0].label}</Text>
          </View>
        )}
      </View>
      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
      <View style={styles.productPriceRow}>
        <Text style={styles.productPrice}>{product.salePrice.toLocaleString('ko-KR')}</Text>
        <Text style={styles.productPriceUnit}>원</Text>
      </View>
      {product.originalPrice !== null && (
        <Text style={styles.productOriginal}>
          {product.originalPrice.toLocaleString('ko-KR')}원
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ─── RetroTemplate ───────────────────────────────────────────────────────────

const RetroTemplate: React.FC<FlyerTemplateProps> = ({ flyer, onDirection, onProductPress }) => {
  const hero = flyer.products?.[0] ?? null;

  const savePct = hero?.originalPrice
    ? Math.round((1 - hero.salePrice / hero.originalPrice) * 100)
    : null;

  const productPairs = useMemo(() => {
    const rest = flyer.products?.slice(1) ?? [];
    const pairs: FlyerProductItem[][] = [];
    for (let i = 0; i < rest.length; i += 2) {
      pairs.push(rest.slice(i, i + 2));
    }
    return pairs;
  }, [flyer.products]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.paper}>
        <View style={[styles.tape, styles.tapeLeft]} />
        <View style={[styles.tape, styles.tapeRight]} />

        {/* 마스트헤드 */}
        <View style={styles.masthead}>
          <View style={styles.mastheadInner}>
            <Text style={styles.weeklySpecial}>★ WEEKLY SPECIAL ★</Text>
            <Text style={styles.storeName}>{flyer.storeName}</Text>
            <Text style={styles.promotionTitle}>{flyer.promotionTitle}</Text>
            <Text style={styles.period}>{flyer.dateRange}</Text>
          </View>
        </View>

        {/* 히어로 상품 */}
        {hero && (
          <HeroProduct hero={hero} savePct={savePct} onPress={onProductPress} />
        )}

        {/* 상품 그리드 */}
        {productPairs.length > 0 && (
          <View style={styles.gridSection}>
            <View style={styles.gridDivider}>
              <View style={styles.gridDividerLine} />
              <Text style={styles.gridDividerLabel}>이번 주 특가 상품</Text>
              <View style={styles.gridDividerLine} />
            </View>
            {productPairs.map((pair, rowIdx) => (
              <View key={rowIdx} style={styles.productRow}>
                {pair.map((product) => (
                  <GridCell key={product.id} product={product} onPress={onProductPress} />
                ))}
                {pair.length === 1 && <View style={styles.productCellEmpty} />}
              </View>
            ))}
          </View>
        )}

        {/* 사장님 한마디 */}
        {flyer.ownerQuote ? (
          <View style={styles.ownerSection}>
            <Text style={styles.ownerDecor}>"</Text>
            <View style={styles.ownerRow}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarEmoji}>🏪</Text>
              </View>
              <View>
                {flyer.ownerRole ? <Text style={styles.ownerRole}>{flyer.ownerRole}</Text> : null}
                {flyer.ownerName ? <Text style={styles.ownerName}>{flyer.ownerName}</Text> : null}
              </View>
            </View>
            <Text style={styles.ownerQuote}>{flyer.ownerQuote}</Text>
          </View>
        ) : null}

        {/* 푸터 */}
        <TouchableOpacity
          style={styles.footer}
          onPress={onDirection}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="매장 위치 보기"
        >
          <Text style={styles.footerLeft}>◉ 매장 위치 보기</Text>
          {flyer.storeAddress ? (
            <Text style={styles.footerAddress} numberOfLines={1}>{flyer.storeAddress}</Text>
          ) : null}
          <Text style={styles.footerArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  paper: {
    backgroundColor: colors.flyerPaper,
    borderWidth: 4,
    borderColor: colors.flyerRed,
    borderRadius: 2,
    overflow: 'visible',
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  tape: { position: 'absolute', width: 54, height: 16, backgroundColor: 'rgba(255,235,180,0.85)', zIndex: 2, top: -8 },
  tapeLeft: { left: 20, transform: [{ rotate: '-8deg' }] },
  tapeRight: { right: 28, transform: [{ rotate: '6deg' }] },

  masthead: { borderBottomWidth: 3, borderBottomColor: colors.flyerInk, backgroundColor: colors.flyerRed, padding: 4 },
  mastheadInner: { backgroundColor: colors.flyerPaper, padding: spacing.md, alignItems: 'center' },
  weeklySpecial: { fontSize: 9, fontWeight: '800' as const, letterSpacing: 3.5, color: colors.flyerRed },
  storeName: { fontSize: 28, fontWeight: '900' as const, color: colors.flyerInk, letterSpacing: -1.2, marginTop: 2 },
  promotionTitle: { fontSize: 15, fontWeight: '700' as const, color: colors.flyerInk, marginTop: 4 },
  period: { fontSize: 11, fontWeight: '800' as const, color: colors.flyerRed, letterSpacing: 1, marginTop: 4 },

  // 히어로
  heroSection: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.flyerInk, borderStyle: 'dashed' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, position: 'relative', paddingRight: 70 },
  saveCircle: { position: 'absolute', top: -spacing.sm, right: 0, width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: colors.flyerRed, backgroundColor: colors.flyerPaper, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '14deg' }], zIndex: 1 },
  saveLabel: { fontSize: 7, fontWeight: '900' as const, color: colors.flyerRed, letterSpacing: 1.5 },
  savePctRow: { flexDirection: 'row', alignItems: 'flex-end' },
  savePct: { fontSize: 22, fontWeight: '900' as const, color: colors.flyerRed, letterSpacing: -1 },
  savePctSign: { fontSize: 12, fontWeight: '900' as const, color: colors.flyerRed },
  heroImage: { width: 72, height: 72, borderRadius: spacing.radiusSm, backgroundColor: colors.gray100 },
  heroEmoji: { fontSize: 52, width: 72, textAlign: 'center', marginTop: spacing.xs },
  heroInfo: { flex: 1 },
  heroSticker: { fontSize: 10, fontWeight: '800' as const, color: colors.flyerRed, letterSpacing: 2 },
  heroName: { fontSize: 15, fontWeight: '900' as const, color: colors.flyerInk, letterSpacing: -0.4, marginTop: 2 },
  heroOriginal: { fontSize: 11, color: colors.flyerInk, opacity: 0.55, textDecorationLine: 'line-through', marginTop: spacing.sm },
  heroPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 2 },
  heroPrice: { fontSize: 36, fontWeight: '900' as const, color: colors.flyerRed, letterSpacing: -2, lineHeight: 40 },
  heroPriceUnit: { fontSize: 16, fontWeight: '900' as const, color: colors.flyerRed, marginBottom: 4 },
  stickerRow: { marginTop: spacing.sm },
  yellowSticker: { alignSelf: 'flex-start', backgroundColor: colors.flyerBadgeYellow, paddingHorizontal: spacing.sm, paddingVertical: 5, transform: [{ rotate: '-1.5deg' }] },
  stickerText: { fontSize: 10, fontWeight: '900' as const, color: colors.flyerInk, letterSpacing: 0.5 },

  // 그리드
  gridSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  gridDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  gridDividerLine: { flex: 1, height: 1, backgroundColor: colors.flyerInk, opacity: 0.4 },
  gridDividerLabel: { fontSize: 11, fontWeight: '800' as const, color: colors.flyerInk, letterSpacing: 1 },
  productRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  productCell: { flex: 1, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.flyerInk, padding: spacing.sm, borderRadius: 2 },
  productCellEmpty: { flex: 1 },
  productImageBox: { width: '100%', height: 60, borderRadius: 2, backgroundColor: colors.flyerPaper, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, overflow: 'hidden', position: 'relative' },
  productImageFull: { width: '100%', height: '100%' },
  productEmoji: { fontSize: 30 },
  productBadge: { position: 'absolute', top: 3, right: 3, backgroundColor: colors.flyerBadgeYellow, paddingHorizontal: 4, paddingVertical: 1 },
  productBadgeText: { fontSize: 7, fontWeight: '900' as const, color: colors.flyerInk },
  productName: { fontSize: 11, fontWeight: '800' as const, color: colors.flyerInk, letterSpacing: -0.2 },
  productPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 },
  productPrice: { fontSize: 18, fontWeight: '900' as const, color: colors.flyerRed, letterSpacing: -0.6, lineHeight: 22 },
  productPriceUnit: { fontSize: 9, fontWeight: '800' as const, color: colors.flyerRed },
  productOriginal: { fontSize: 9, color: colors.flyerInk, opacity: 0.6, textDecorationLine: 'line-through', marginTop: 1 },

  // 사장님 한마디
  ownerSection: { borderTopWidth: 1, borderTopColor: colors.flyerInk, borderStyle: 'dashed', padding: spacing.md, overflow: 'hidden' },
  ownerDecor: { position: 'absolute', right: spacing.lg, top: -spacing.sm, fontSize: 70, color: colors.flyerRed, opacity: 0.06, fontWeight: '900' as const },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.flyerPaper, borderWidth: 1.5, borderColor: colors.flyerInk, alignItems: 'center', justifyContent: 'center' },
  ownerAvatarEmoji: { fontSize: 22 },
  ownerRole: { fontSize: 12, fontWeight: '900' as const, color: colors.flyerRed },
  ownerName: { fontSize: 10, fontWeight: '500' as const, color: colors.flyerInkSub },
  ownerQuote: { fontSize: 13, fontWeight: '500' as const, color: colors.flyerInk, lineHeight: 20, fontStyle: 'italic' },

  // 푸터
  footer: { backgroundColor: colors.flyerInk, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footerLeft: { fontSize: 10, fontWeight: '800' as const, color: colors.flyerPaper, letterSpacing: 1 },
  footerAddress: { flex: 1, fontSize: 9, color: colors.flyerPaper, opacity: 0.7 },
  footerArrow: { fontSize: 12, color: colors.flyerPaper, fontWeight: '800' as const },
});

export default RetroTemplate;
