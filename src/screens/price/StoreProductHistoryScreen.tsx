import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/format';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import { useStorePrices } from '../../hooks/queries/usePrices';
import { openMapApp } from '../../utils/openMapApp';
import type { PriceResponse } from '../../types/api.types';

type Props = HomeScreenProps<'StoreProductHistory'>;

type SortKey = 'low' | 'latest' | 'mostConfirm' | 'mostDispute';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'low', label: '최저가' },
  { key: 'latest', label: '최신' },
  { key: 'mostConfirm', label: '👍 많은 순' },
  { key: 'mostDispute', label: '👎 많은 순' },
];

/**
 * 매장 × 상품 전체 등록 이력 화면.
 *
 * 진입: StoreHistorySheet의 "더보기" 탭 시.
 * StoreHistorySheet과 동일한 데이터·정렬 로직을 재사용하되, 상한 없이 전체를 보여준다.
 * 각 행 탭 시 PriceEntryDetail로 진입하여 맞아요/달라요/신고 가능.
 */
const StoreProductHistoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { storeId, productId, storeName, storeLat, storeLng } = route.params;
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useStorePrices(storeId);
  const [sortKey, setSortKey] = useState<SortKey>('latest');

  const canNavigate =
    typeof storeLat === 'number' &&
    typeof storeLng === 'number' &&
    !isNaN(storeLat) &&
    !isNaN(storeLng) &&
    !!storeName;

  const handleDirections = () => {
    if (!canNavigate) return;
    void openMapApp(storeLat as number, storeLng as number, storeName as string);
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
    <SafeAreaView style={styles.container} edges={[]}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <ChevronLeftIcon size={spacing.iconLg} color={colors.onBackground} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {storeName ?? '이 매장'}
          </Text>
          <Text style={styles.headerSubtitle}>등록 이력 {rows.length}건</Text>
        </View>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 길찾기 */}
        {canNavigate ? (
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={handleDirections}
            accessibilityRole="button"
            accessibilityLabel={`${storeName ?? '매장'}으로 길찾기`}
            activeOpacity={0.85}
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
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => void refetch()}
              accessibilityRole="button"
              accessibilityLabel="다시 시도"
            >
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>아직 등록된 이력이 없어요.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <HistoryRow
                key={row.id}
                row={row}
                onPress={() =>
                  navigation.navigate('PriceEntryDetail', { priceId: row.id })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const HistoryRow: React.FC<{ row: PriceResponse; onPress: () => void }> = ({
  row,
  onPress,
}) => {
  const nickname = row.user?.nickname ?? '익명';
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="가격 상세 보기"
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowPriceLine}>
          <Text style={styles.rowPrice}>{row.price.toLocaleString('ko-KR')}</Text>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.outlineVariant,
  },
  headerIconBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: PJS.extraBold,
    fontSize: 15,
    color: colors.onBackground,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  // ─── Scroll ──────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // ─── Directions ──────────────────────────────────────────────────────────
  directionsBtn: {
    paddingVertical: spacing.sm + 2,
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
    fontSize: 14,
    color: colors.white,
  },

  // ─── Sort ────────────────────────────────────────────────────────────────
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
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  sortChipTextActive: {
    color: colors.white,
  },

  // ─── List / State ────────────────────────────────────────────────────────
  list: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusInput,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
  },
  stateBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  stateText: {
    ...typography.body,
    color: colors.onSurfaceVariant,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    fontFamily: PJS.bold,
    fontSize: 13,
    color: colors.white,
  },

  // ─── Row ─────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
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
    fontSize: 16,
    color: colors.onBackground,
  },
  rowPriceUnit: {
    fontFamily: PJS.bold,
    fontSize: 12,
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
    fontSize: 12,
    color: colors.gray600,
  },
});

export default StoreProductHistoryScreen;
