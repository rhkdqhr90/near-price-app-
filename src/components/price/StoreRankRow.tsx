import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';

export interface StoreRankRowData {
  rank: number;
  storeName: string;
  distanceM: number | null;
  price: number;
  time: string;
  reporter: string;
  isMine?: boolean;
  confirmCount: number;
  disputeCount: number;
}

interface StoreRankRowProps {
  data: StoreRankRowData;
  /** 전체 row 중 최저가 (diff 계산용) */
  minPrice: number;
  /** 마트 row 탭 시 호출 — 펼쳐서 이 마트 등록 이력 표시 */
  onPress?: () => void;
  expanded?: boolean;
}

const formatDistance = (m: number | null): string => {
  if (m == null) return '거리 미확인';
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
};

/**
 * 마트 순위 row (레퍼런스 `마실 2/screens-detail.jsx` StoreRow 1:1 포팅).
 *
 * - rank=1: 🏆 + primaryLight 배경 + primary 테두리 + BEST 배지
 * - rank>=2: 회색 원형 배지 + white 배경
 * - 우측 가격: 1위=primary 색, 이외=onBackground + `+diff` 표시
 * - 하단: 👍N · 👎M (달라요/맞아요 투표 수치)
 */
const StoreRankRow: React.FC<StoreRankRowProps> = ({
  data,
  minPrice,
  onPress,
  expanded = false,
}) => {
  const { rank, storeName, distanceM, price, time, reporter, isMine, confirmCount, disputeCount } = data;
  const diff = price - minPrice;
  const isLowest = diff === 0;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        isLowest && styles.rowLowest,
        expanded && styles.rowExpanded,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rank}위 ${storeName} ${price.toLocaleString('ko-KR')}원`}
    >
      {/* 순위 배지 */}
      <View
        style={[
          styles.rankBadge,
          rank === 1 && styles.rankBadgeFirst,
          rank !== 1 && styles.rankBadgeRest,
        ]}
      >
        {rank === 1 ? (
          <Text style={styles.rankTrophy}>🏆</Text>
        ) : (
          <Text style={styles.rankNumber}>{rank}</Text>
        )}
      </View>

      {/* 중앙 정보 */}
      <View style={styles.mid}>
        <View style={styles.nameRow}>
          <Text style={styles.storeName} numberOfLines={1}>
            {storeName}
          </Text>
          {rank === 1 ? (
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>BEST</Text>
            </View>
          ) : null}
          {isMine ? (
            <View style={styles.myBadge}>
              <Text style={styles.myBadgeText}>내 제보</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDistance(distanceM)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{time}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>{reporter}</Text>
        </View>
        <View style={styles.voteRow}>
          <Text style={styles.voteText}>
            👍 {confirmCount}
          </Text>
          <Text style={styles.voteDot}>·</Text>
          <Text style={styles.voteText}>
            👎 {disputeCount}
          </Text>
        </View>
      </View>

      {/* 우측 가격 */}
      <View style={styles.priceCol}>
        <View style={styles.priceLine}>
          <Text
            style={[styles.priceValue, isLowest && styles.priceValueLowest]}
          >
            {price.toLocaleString('ko-KR')}
          </Text>
          <Text style={[styles.priceUnit, isLowest && styles.priceUnitLowest]}>원</Text>
        </View>
        {isLowest ? (
          <Text style={styles.lowestLabel}>최저가</Text>
        ) : (
          <Text style={styles.diffLabel}>+{diff.toLocaleString('ko-KR')}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const RANK_BADGE_SIZE = 32;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.inputPad,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderWidth: spacing.borderEmphasis,
    borderColor: colors.outlineVariant,
    borderRadius: spacing.md,
  },
  rowLowest: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  rowExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  rankBadge: {
    width: RANK_BADGE_SIZE,
    height: RANK_BADGE_SIZE,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankBadgeFirst: {
    backgroundColor: colors.primary,
  },
  rankBadgeRest: {
    backgroundColor: colors.surfaceContainerLow,
  },
  rankTrophy: {
    fontSize: 16,
  },
  rankNumber: {
    fontFamily: PJS.extraBold,
    fontSize: 13,
    color: colors.onBackground,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: spacing.micro,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    flexWrap: 'wrap',
  },
  storeName: {
    fontFamily: PJS.bold,
    fontSize: 13,
    color: colors.onBackground,
    flexShrink: 1,
  },
  bestBadge: {
    paddingHorizontal: spacing.cardTextGap,
    paddingVertical: 1,
    borderRadius: spacing.xs,
    backgroundColor: colors.primary,
  },
  bestBadgeText: {
    fontFamily: PJS.extraBold,
    fontSize: 9,
    color: colors.white,
    letterSpacing: 0.5,
  },
  myBadge: {
    paddingHorizontal: spacing.cardTextGap,
    paddingVertical: 1,
    borderRadius: spacing.xs,
    backgroundColor: colors.accentLight,
  },
  myBadgeText: {
    fontFamily: PJS.bold,
    fontSize: 9,
    color: colors.tertiary,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardTextGap,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  metaDot: {
    ...typography.caption,
    color: colors.gray400,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardTextGap,
    marginTop: 1,
  },
  voteText: {
    fontFamily: PJS.semiBold,
    fontSize: 11,
    color: colors.gray600,
  },
  voteDot: {
    ...typography.caption,
    color: colors.gray400,
  },
  priceCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  priceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.priceUnitGap,
  },
  priceValue: {
    fontFamily: PJS.extraBold,
    fontSize: 16,
    color: colors.onBackground,
    letterSpacing: -0.3,
  },
  priceValueLowest: {
    color: colors.primary,
  },
  priceUnit: {
    fontFamily: PJS.bold,
    fontSize: 11,
    color: colors.onBackground,
  },
  priceUnitLowest: {
    color: colors.primary,
  },
  lowestLabel: {
    fontFamily: PJS.extraBold,
    fontSize: 10,
    color: colors.primary,
    marginTop: spacing.micro,
  },
  diffLabel: {
    fontFamily: PJS.bold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: spacing.micro,
  },
});

export default StoreRankRow;
