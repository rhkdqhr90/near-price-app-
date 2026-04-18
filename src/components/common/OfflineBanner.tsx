import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../../store/networkStore';
import WifiOffIcon from '../icons/WifiOffIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const OfflineBanner: React.FC = () => {
  const isOffline = useNetworkStore((s) => s.isOffline);
  const insets = useSafeAreaInsets();
  const paddingStyle = useMemo(
    () => ({ paddingTop: insets.top + spacing.xs }),
    [insets.top],
  );

  if (!isOffline) return null;

  return (
    <View style={[styles.container, paddingStyle]} accessible={true} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <WifiOffIcon size={16} color={colors.white} />
      <Text style={styles.text}>네트워크 연결이 끊어졌어요</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    ...typography.bodySm,
    color: colors.white,
    fontWeight: '600' as const,
  },
});

export default OfflineBanner;
