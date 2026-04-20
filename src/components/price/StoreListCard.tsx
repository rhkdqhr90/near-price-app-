import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import type { StoreType } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import {
  getStoreCategoryColors,
  getStoreCategoryLabel,
  formatDistance,
  formatWalkTime,
} from '../../utils/storeCategory';

interface StoreListCardProps {
  name: string;
  address: string;
  distance: number | null; // meters, null 시 거리/도보 미표시
  type: StoreType;
  isActive: boolean;
  onPress: () => void;
}

/**
 * 매장 리스트 카드 — StoreSelectScreen 하단 리스트용.
 * 레퍼런스 `마실 2/screens-register.jsx` RegisterStore 참조.
 */
const StoreListCard: React.FC<StoreListCardProps> = ({
  name,
  address,
  distance,
  type,
  isActive,
  onPress,
}) => {
  const cat = getStoreCategoryColors(type);
  const catLabel = getStoreCategoryLabel(type);

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${address}${distance != null ? ` ${formatDistance(distance)}` : ''}`}
      accessibilityState={{ selected: isActive }}
    >
      <View
        style={[
          styles.catBadge,
          isActive
            ? { backgroundColor: colors.primary }
            : { backgroundColor: cat.bg },
        ]}
      >
        <Text
          style={[
            styles.catText,
            isActive ? { color: colors.white } : { color: cat.fg },
          ]}
        >
          {catLabel}
        </Text>
      </View>

      <View style={styles.body}>
        <Text
          style={styles.name}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {name}
        </Text>
        {address ? (
          <Text
            style={styles.address}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {address}
          </Text>
        ) : null}
      </View>

      {distance != null ? (
        <View style={styles.distWrap}>
          <Text style={[styles.distance, isActive && styles.distanceActive]}>
            {formatDistance(distance)}
          </Text>
          <Text style={styles.walkTime}>{formatWalkTime(distance)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: spacing.storeListCardRadius,
    borderWidth: spacing.borderEmphasis,
    borderColor: colors.gray200,
    marginBottom: spacing.cardTextGap,
  },
  cardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  catBadge: {
    width: spacing.storeCatBadgeSize,
    height: spacing.storeCatBadgeSize,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catText: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.body,
    fontFamily: PJS.bold,
    color: colors.onBackground,
    letterSpacing: -0.2,
  },
  address: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing.micro,
  },
  distWrap: {
    alignItems: 'flex-end',
  },
  distance: {
    ...typography.bodySm,
    fontFamily: PJS.extraBold,
    color: colors.onBackground,
  },
  distanceActive: {
    color: colors.primary,
  },
  walkTime: {
    ...typography.tabLabel,
    color: colors.gray600,
    marginTop: spacing.micro,
  },
});

export default StoreListCard;
