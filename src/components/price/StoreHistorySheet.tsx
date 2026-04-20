import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useStorePrices } from '../../hooks/queries/usePrices';
import type { PriceResponse } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/format';

interface StoreHistorySheetProps {
  storeId: string;
  productId: string;
}

type SortKey = 'low' | 'latest' | 'mostConfirm' | 'mostDispute';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'low', label: '최저가' },
  { key: 'latest', label: '최신' },
  { key: 'mostConfirm', label: '👍 많은 순' },
  { key: 'mostDispute', label: '👎 많은 순' },
];

/**
 * 이 마트 등록 이력 섹션 (기획 0-3: 중복 등록은 레코드 추가 + 이력 표시).
 *
 * 백엔드에 (storeId × productId) 전용 엔드포인트가 없으므로,
 * `useStorePrices(storeId)` 전체 응답을 받아 클라이언트에서 productId로 필터.
 *
 * 정렬 토글 4종 (SCREENS.md 섹션 4-2 E).
 */
const StoreHistorySheet: React.FC<StoreHistorySheetProps> = ({ storeId, productId }) => {
  const { data, isLoading, isError } = useStorePrices(storeId);
  const [sortKey, setSortKey] = useState<SortKey>('latest');

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    const filtered = all.filter((p) => p.product.id === productId);
    const sorted = [...filtered];
    switch (sortKey) {
      case 'low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'latest':
        sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'mostConfirm':
        sorted.sort((a, b) => b.confirmedCount - a.confirmedCount);
        break;
      case 'mostDispute':
        sorted.sort((a, b) => b.disputedCount - a.disputedCount);
        break;
    }
    return sorted;
  }, [data, productId, sortKey]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>이 마트 등록 이력</Text>
        <Text style={styles.headerCount}>{rows.length}건</Text>
      </View>

      {/* 정렬 토글 */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortKey(opt.key)}
              style={[styles.sortChip, active && styles.sortChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label}로 정렬`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 리스트 */}
      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>이력을 불러오지 못했어요.</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>아직 등록된 이력이 없어요.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.map((row) => (
            <HistoryRow key={row.id} row={row} />
          ))}
        </View>
      )}
    </View>
  );
};

const HistoryRow: React.FC<{ row: PriceResponse }> = ({ row }) => {
  const nickname = row.user?.nickname ?? '익명';
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowPriceLine}>
          <Text style={styles.rowPrice}>
            {row.price.toLocaleString('ko-KR')}
          </Text>
          <Text style={styles.rowPriceUnit}>원</Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.rowMetaText}>{formatRelativeTime(row.createdAt)}</Text>
          <Text style={styles.rowMetaDot}>·</Text>
          <Text style={styles.rowMetaText} numberOfLines={1}>
            @{nickname}
          </Text>
        </View>
      </View>
      <View style={styles.rowVotes}>
        <Text style={styles.voteText}>👍 {row.confirmedCount}</Text>
        <Text style={styles.voteText}>👎 {row.disputedCount}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderWidth: spacing.borderEmphasis,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: spacing.md,
    borderBottomRightRadius: spacing.md,
    paddingHorizontal: spacing.inputPad,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.labelMd,
    color: colors.onBackground,
  },
  headerCount: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  sortChip: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.surfaceContainerLow,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
  },
  sortChipText: {
    fontFamily: PJS.semiBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  sortChipTextActive: {
    color: colors.white,
  },
  stateBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  stateText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: spacing.borderHairline,
    borderTopColor: colors.surfaceContainerHigh,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    gap: spacing.micro,
  },
  rowPriceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.priceUnitGap,
  },
  rowPrice: {
    fontFamily: PJS.extraBold,
    fontSize: 15,
    color: colors.onBackground,
  },
  rowPriceUnit: {
    fontFamily: PJS.bold,
    fontSize: 11,
    color: colors.onBackground,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardTextGap,
    flexWrap: 'wrap',
  },
  rowMetaText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  rowMetaDot: {
    ...typography.caption,
    color: colors.gray400,
  },
  rowVotes: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexShrink: 0,
  },
  voteText: {
    fontFamily: PJS.semiBold,
    fontSize: 11,
    color: colors.gray600,
  },
});

export default StoreHistorySheet;
