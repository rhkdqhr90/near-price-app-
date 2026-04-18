import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import type { MyPageScreenProps } from '../../navigation/types';
import type { MyVerificationItem } from '../../types/api.types';
import { useMyVerifications } from '../../hooks/queries/useVerification';
import EmptyState from '../../components/common/EmptyState';
import HeartIcon from '../../components/icons/HeartIcon';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatPrice, formatRelativeTime } from '../../utils/format';

type Props = MyPageScreenProps<'LikedPrices'>;

const LikedPricesScreen: React.FC<Props> = () => {
  const { data, isLoading, isError, refetch } = useMyVerifications();

  const renderItem = useCallback(({ item }: ListRenderItemInfo<MyVerificationItem>) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.price?.product?.name ?? '-'}
        </Text>
        <Text style={styles.storeName} numberOfLines={1}>
          {item.price?.store?.name ?? '매장 정보 없음'}
        </Text>
        <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.priceText}>{formatPrice(item.price?.price)}</Text>
        <View style={[
          styles.resultBadge,
          item.result === 'confirmed' ? styles.resultConfirmed : styles.resultDisputed,
        ]}>
          <Text style={[
            styles.resultBadgeText,
            item.result === 'confirmed' ? styles.resultConfirmedText : styles.resultDisputedText,
          ]}>
            {item.result === 'confirmed' ? '맞아요' : '달라요'}
          </Text>
        </View>
      </View>
    </View>
  ), []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={WifiOffIcon}
          title="불러올 수 없어요"
          subtitle="네트워크 상태를 확인하고 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: refetch }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <EmptyState
            icon={HeartIcon}
            title="인정한 가격이 없어요"
            subtitle="가격 정보에 맞아요를 눌러 검증에 참여해 보세요"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.cardGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    shadowColor: colors.tertiaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    ...typography.headingMd,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  storeName: {
    ...typography.bodySm,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  priceText: {
    ...typography.priceSm,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
  },
  resultConfirmed: {
    backgroundColor: colors.primaryLight,
  },
  resultDisputed: {
    backgroundColor: colors.dangerLight,
  },
  resultBadgeText: {
    ...typography.bodySm,
    fontWeight: '600' as const,
  },
  resultConfirmedText: {
    color: colors.primary,
  },
  resultDisputedText: {
    color: colors.danger,
  },
});

export default LikedPricesScreen;
