import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import CameraIcon from '../../components/icons/CameraIcon';
import EditIcon from '../../components/icons/EditIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';

type Props = PriceRegisterScreenProps<'InputMethod'>;

/**
 * 가격 등록 — 입력 방식 선택 화면.
 * 레퍼런스 `마실 2/screens-register.jsx` RegisterMethod 기반.
 * - STEP 2/3 kicker + 매장 핀 pill
 * - 카드 2개 세로 스택 (다크 카메라 / 라이트 수동)
 */
const InputMethodScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const storeName = usePriceRegisterStore(s => s.storeName);

  const handleCamera = useCallback(() => {
    navigation.navigate('Camera');
  }, [navigation]);

  const handleManual = useCallback(() => {
    navigation.navigate('ItemDetail', {});
  }, [navigation]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md,
        },
      ]}
    >
      {/* 헤더 영역: STEP + 제목 + 매장 핀 */}
      <View style={styles.header}>
        <Text style={styles.kicker}>STEP 2 / 3</Text>
        <Text style={styles.title}>어떻게 등록할까요?</Text>
        {storeName ? (
          <View style={styles.storePill}>
            <MapPinIcon size={spacing.iconXs} color={colors.primary} />
            <Text style={styles.storePillText} numberOfLines={1}>{storeName}</Text>
          </View>
        ) : null}
      </View>

      {/* 카드 2개: 세로 스택 */}
      <View style={styles.cards}>
        {/* 1. 사진으로 등록 — 다크 카드 (RECOMMENDED) */}
        <TouchableOpacity
          style={styles.cameraCard}
          onPress={handleCamera}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="사진으로 등록 (추천)"
        >
          {/* 우하단 primary-tinted circle decoration */}
          <View style={styles.cameraDecoration} pointerEvents="none" />
          <View style={styles.cameraContent}>
            <CameraIcon size={spacing.xxl + spacing.sm} color={colors.white} />
            <Text style={styles.recommendBadge}>RECOMMENDED</Text>
            <Text style={styles.cameraTitle}>사진으로 등록</Text>
            <Text style={styles.cameraDesc}>가격표 한 장이면 자동 인식</Text>
          </View>
        </TouchableOpacity>

        {/* 2. 직접 입력 — 라이트 카드 */}
        <TouchableOpacity
          style={styles.manualCard}
          onPress={handleManual}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="직접 입력"
        >
          <EditIcon size={spacing.xxl + spacing.xs} color={colors.onBackground} />
          <Text style={styles.manualTitle}>직접 입력</Text>
          <Text style={styles.manualDesc}>품목 하나씩 꼼꼼히 입력</Text>
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  kicker: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.headingXl,
    marginTop: spacing.xs,
    color: colors.onBackground,
    letterSpacing: -0.5,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  storePillText: {
    ...typography.caption,
    fontFamily: PJS.bold,
    color: colors.primary,
  },

  cards: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },

  // ── 카메라 (다크 카드) ──
  cameraCard: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: colors.black,
    borderRadius: spacing.radiusHero,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraDecoration: {
    position: 'absolute',
    right: -spacing.xl,
    bottom: -spacing.xxl - spacing.xs,
    width: 120,
    height: 120,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primary,
    opacity: 0.27,
  },
  cameraContent: {
    position: 'relative',
  },
  recommendBadge: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.primary,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
  },
  cameraTitle: {
    ...typography.headingXl,
    color: colors.white,
    marginTop: spacing.xs,
    letterSpacing: -0.4,
  },
  cameraDesc: {
    ...typography.bodySm,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },

  // ── 수동 (라이트 카드) ──
  manualCard: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusHero,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
  },
  manualTitle: {
    ...typography.headingXl,
    color: colors.onBackground,
    marginTop: spacing.lg,
    letterSpacing: -0.4,
  },
  manualDesc: {
    ...typography.bodySm,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
});

export default InputMethodScreen;
