import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useStorePrices } from '../../hooks/queries/usePrices';
import type { PriceResponse } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/format';
import { openMapApp } from '../../utils/openMapApp';
import MapPinIcon from '../icons/MapPinIcon';

interface StoreHistorySheetProps {
  storeId: string;
  productId: string;
  /** 길찾기 버튼 표시용 매장 좌표/이름. 미제공 시 버튼 숨김. */
  storeLat?: number | null;
  storeLng?: number | null;
  storeName?: string;
  /** 히스토리 행 탭 시 호출 — 가격 엔트리 상세로 진입. */
  onPressRow?: (priceId: string) => void;
  /** "더보기" 탭 시 호출 — 매장 × 상품 전체 이력 화면으로 진입. */
  onViewMore?: () => void;
}

/** 시트 인라인 노출 건수 상한. 초과 시 "더보기" 버튼 노출. */
const INLINE_LIMIT = 3;

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
const StoreHistorySheet: React.FC<StoreHistorySheetProps> = ({
  storeId,
  productId,
  storeLat,
  storeLng,
  storeName,
  onPressRow,
  onViewMore,
}) => {
  const { data, isLoading, isError } = useStorePrices(storeId);
  const [sortKey, setSortKey] = useState<SortKey>('latest');

  const canNavigate =
    typeof storeLat === 'number' &&
    typeof storeLng === 'number' &&
    !isNaN(storeLat) &&
    !isNaN(storeLng) &&
    !!storeName;

  const handleDirections = () => {
    if (!canNavigate) return;
    openMapApp(storeLat as number, storeLng as number, storeName as string).catch(
      () => undefined,
    );
  };

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

      {/* 길찾기 CTA — 매장 좌표/이름 있을 때만 노출 */}
      {canNavigate ? (
        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={handleDirections}
          accessibilityRole="button"
          accessibilityLabel={`${storeName ?? '매장'}으로 길찾기`}
        >
          <View style={styles.directionsBtnContent}>
            <MapPinIcon size={spacing.iconSm} color={colors.white} />
            <Text style={styles.directionsBtnText}>{storeName} 길찾기</Text>
          </View>
        </TouchableOpacity>
      ) : null}

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
          {rows.slice(0, INLINE_LIMIT).map((row) => (
            <HistoryRow
              key={row.id}
              row={row}
              onPress={onPressRow ? () => onPressRow(row.id) : undefined}
            />
          ))}
          {rows.length > INLINE_LIMIT && onViewMore ? (
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={onViewMore}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`전체 이력 ${rows.length}건 보기`}
            >
              <Text style={styles.viewMoreBtnText}>
                더보기 ({rows.length - INLINE_LIMIT}건) ›
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
};

const HistoryRow: React.FC<{ row: PriceResponse; onPress?: () => void }> = ({
  row,
  onPress,
}) => {
  const nickname = row.user?.nickname ?? '익명';
  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="가격 상세 보기"
      >
        <HistoryRowInner row={row} nickname={nickname} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.row}>
      <HistoryRowInner row={row} nickname={nickname} />
    </View>
  );
};

const HistoryRowInner: React.FC<{ row: PriceResponse; nickname: string }> = ({
  row,
  nickname,
}) => {
  return (
    <>
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
    </>
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
  directionsBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  directionsBtnText: {
    fontFamily: PJS.bold,
    fontSize: 13,
    color: colors.white,
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
  viewMoreBtn: {
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: spacing.borderHairline,
    borderTopColor: colors.surfaceContainerHigh,
  },
  viewMoreBtnText: {
    fontFamily: PJS.bold,
    fontSize: 12,
    color: colors.primary,
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
