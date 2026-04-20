import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { PJS, typography } from '../../theme/typography';
import { fixImageUrl, formatPrice, formatRelativeTime } from '../../utils/format';
import type { ProductPriceCard } from '../../types/api.types';
import { PriceTag } from './PriceTag';

interface PriceCardProps {
  item: ProductPriceCard;
  onPress?: (productId: string) => void;
  style?: ViewStyle;
}

/**
 * PriceCard — 홈 무한스크롤 상품 카드.
 *
 * 좌측: 이미지 + (상품명 + PriceTag 뱃지 + 스토어/거리/시간 + 등록자)
 * 우측: 현재가 + 원가 취소선(있을 때) + 비교 칩(n곳 · −savings%)
 * 하단: 가격대 진행바 (signals.minPrice vs item.price 위치 표시)
 */
function PriceCardBase({ item, onPress, style }: PriceCardProps) {
  const { priceTag, signals } = item;
  const originalPrice = priceTag.originalPrice;
  const savings =
    originalPrice && originalPrice > item.minPrice
      ? Math.round((1 - item.minPrice / originalPrice) * 100)
      : null;

  const storeName = item.cheapestStore?.name ?? '매장';
  const registrantName = item.registrant?.nickname ?? '익명';
  const relativeTime = formatRelativeTime(item.createdAt);
  const imageUri = fixImageUrl(item.imageUrl);

  // 진행바: minPrice → maxPrice 사이 비율 (최저가는 0, 최고가는 1)
  // 홈에서 최저가 카드만 보이므로 현재가는 항상 minPrice (= 0% 위치).
  // 시각적 의미: 얼마나 최저가에 가까운가 (현재는 항상 0 위치)
  const range = signals.maxPrice - signals.minPrice;
  const positionPct =
    range > 0 ? ((item.minPrice - signals.minPrice) / range) * 100 : 0;

  return (
    <Pressable
      onPress={() => onPress?.(item.productId)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.productName} ${formatPrice(item.minPrice)}원`}
    >
      <View style={styles.row}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>
              {item.productName.slice(0, 1)}
            </Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.productName}
            </Text>
            <PriceTag priceTag={priceTag} variant="compact" />
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {storeName} · {relativeTime}
          </Text>

          <Text style={styles.contributor} numberOfLines={1}>
            @{registrantName}
            {signals.isLowest7d ? '  ·  7일 내 최저' : ''}
          </Text>
        </View>

        <View style={styles.priceCol}>
          <View style={styles.priceRow}>
            <Text style={styles.priceNumber}>{formatPrice(item.minPrice)}</Text>
            <Text style={styles.priceWon}>원</Text>
          </View>
          {originalPrice ? (
            <Text style={styles.original}>{formatPrice(originalPrice)}원</Text>
          ) : null}
          <View style={styles.compareChip}>
            <Text style={styles.compareChipText}>
              {signals.storeCount}곳
              {savings ? ` · −${savings}%` : ''}
            </Text>
          </View>
        </View>
      </View>

      {range > 0 && (
        <View style={styles.barWrap}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(4, 100 - positionPct)}%`,
                },
              ]}
            />
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabel}>
              최저 {formatPrice(signals.minPrice)}
            </Text>
            <Text style={styles.barLabel}>
              최고 {formatPrice(signals.maxPrice)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export const PriceCard = React.memo(PriceCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.inputPad,
    paddingHorizontal: spacing.inputPad,
    shadowColor: colors.shadowBase,
    shadowOpacity: spacing.ambientShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    shadowOffset: { width: 0, height: spacing.xs },
    elevation: spacing.elevationXs,
  },
  cardPressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.md,
  },
  image: {
    width: spacing.priceCardImageSize,
    height: spacing.priceCardImageSize,
    borderRadius: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    ...typography.headingXl,
    color: colors.gray400,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.cardTextGap,
    flexWrap: 'wrap',
  },
  productName: {
    ...typography.bodyMd,
    fontFamily: PJS.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  meta: {
    ...typography.labelSm,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  contributor: {
    ...typography.caption,
    fontFamily: PJS.medium,
    marginTop: spacing.cardTextGap,
  },
  priceCol: {
    alignItems: 'flex-end',
    minWidth: spacing.priceColMinWidth,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    columnGap: spacing.priceUnitGap,
  },
  priceNumber: {
    ...typography.priceCardValue,
  },
  priceWon: {
    ...typography.labelSm,
    fontFamily: PJS.bold,
    color: colors.onBackground,
  },
  original: {
    ...typography.caption,
    color: colors.cardPriceStrike,
    marginTop: spacing.xs,
    textDecorationLine: 'line-through',
  },
  compareChip: {
    alignSelf: 'flex-end',
    marginTop: spacing.cardTextGap,
    paddingHorizontal: spacing.chipPadH,
    paddingVertical: spacing.chipPadV,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.primaryLight,
  },
  compareChipText: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.primaryDark,
  },
  barWrap: {
    marginTop: spacing.md,
  },
  barTrack: {
    height: spacing.xs,
    borderRadius: spacing.micro,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: spacing.micro,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  barLabel: {
    ...typography.tabLabel,
    color: colors.gray400,
  },
});
