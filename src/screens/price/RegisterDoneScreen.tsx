import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackActions } from '@react-navigation/native';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { PJS, typography } from '../../theme/typography';
import { formatPrice } from '../../utils/format';

type Props = PriceRegisterScreenProps<'Done'>;

const RegisterDoneScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { itemCount, storeName, firstItemName, firstItemPrice } = route.params;

  const summaryText = useMemo(() => {
    if (!firstItemName || firstItemPrice == null) {
      return `${itemCount}개 품목 등록이 완료됐어요.`;
    }
    const extra = itemCount > 1 ? ` 외 ${itemCount - 1}개` : '';
    return `${firstItemName}${extra} · ${formatPrice(firstItemPrice)}`;
  }, [firstItemName, firstItemPrice, itemCount]);

  const points = itemCount * 12;

  const handleGoHome = useCallback(() => {
    navigation.dispatch(StackActions.popToTop());
    navigation.getParent()?.navigate('HomeStack' as never);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>OK</Text>
        </View>

        <Text style={styles.title}>등록 완료!</Text>
        <Text style={styles.subtitle}>{summaryText}</Text>

        {storeName ? (
          <View style={styles.storePill}>
            <Text style={styles.storePillText}>{storeName}</Text>
          </View>
        ) : null}

        <View style={styles.pointPill}>
          <Text style={styles.pointPillText}>{`+${points} 포인트`}</Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          onPress={handleGoHome}
          style={styles.homeButton}
          accessibilityRole="button"
          accessibilityLabel="홈으로 이동"
        >
          <Text style={styles.homeButtonText}>홈으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: spacing.shadowRadiusLg,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYMd },
    elevation: spacing.elevationLg,
  },
  iconText: {
    fontFamily: PJS.extraBold,
    fontSize: 24,
    color: colors.onPrimary,
    letterSpacing: 0.3,
  },
  title: {
    ...typography.headingXl,
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  storePill: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primaryLight,
  },
  storePillText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  pointPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.successLight,
  },
  pointPillText: {
    ...typography.labelMd,
    color: colors.success,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderThin,
    borderTopColor: colors.surfaceContainer,
  },
  homeButton: {
    height: spacing.buttonHeight,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  homeButtonText: {
    ...typography.headingMd,
    color: colors.onPrimary,
  },
});

export default RegisterDoneScreen;
