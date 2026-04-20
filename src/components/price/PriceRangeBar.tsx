import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';

interface PriceRangeBarProps {
  low: number;
  avg: number;
  high: number;
}

/**
 * 동네 가격 분포 바 (레퍼런스 `마실 2/screens-detail.jsx` PriceRangeBar 포팅).
 *
 * 트랙(8h) 위에 3개 마커:
 *   - low: primary dot (원형, 테두리 흰색)
 *   - avg: black 세로 rect (현재 평균가 위치)
 *   - high: white outline 원형
 *
 * 그라디언트는 RN-native 미지원이므로 primary + primaryLight 두 색 레이어로 대체.
 */
const PriceRangeBar: React.FC<PriceRangeBarProps> = ({ low, avg, high }) => {
  const avgPct = useMemo(() => {
    if (high === low) return 50;
    return ((avg - low) / (high - low)) * 100;
  }, [low, avg, high]);

  return (
    <View>
      <View style={styles.track}>
        {/* low→avg primary fill */}
        <View style={[styles.fill, { width: `${avgPct}%` }]} />

        {/* low marker */}
        <View style={[styles.markerLow, styles.markerLowOffset]} />

        {/* avg marker */}
        <View style={[styles.markerAvg, { left: `${avgPct}%` }]} />

        {/* high marker */}
        <View style={[styles.markerHigh, styles.markerHighOffset]} />
      </View>

      <View style={styles.labels}>
        <View style={styles.labelCol}>
          <Text style={[styles.labelKicker, styles.labelKickerLow]}>최저</Text>
          <Text style={[styles.labelValue, styles.labelValueLow]}>
            {low.toLocaleString('ko-KR')}원
          </Text>
        </View>
        <View style={[styles.labelCol, styles.labelColCenter]}>
          <Text style={styles.labelKicker}>평균</Text>
          <Text style={styles.labelValue}>
            {avg.toLocaleString('ko-KR')}원
          </Text>
        </View>
        <View style={[styles.labelCol, styles.labelColRight]}>
          <Text style={[styles.labelKicker, styles.labelKickerHigh]}>최고</Text>
          <Text style={[styles.labelValue, styles.labelValueHigh]}>
            {high.toLocaleString('ko-KR')}원
          </Text>
        </View>
      </View>
    </View>
  );
};

const TRACK_H = 8;
const MARKER_LOW = 16;
const MARKER_AVG_W = 10;
const MARKER_AVG_H = 14;
const MARKER_HIGH = 14;

const styles = StyleSheet.create({
  track: {
    position: 'relative',
    height: TRACK_H,
    borderRadius: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: spacing.cardTextGap,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderTopLeftRadius: spacing.xs,
    borderBottomLeftRadius: spacing.xs,
    opacity: 0.85,
  },
  markerLow: {
    position: 'absolute',
    top: -(MARKER_LOW - TRACK_H) / 2,
    width: MARKER_LOW,
    height: MARKER_LOW,
    borderRadius: MARKER_LOW / 2,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
  },
  markerLowOffset: {
    left: 0,
  },
  markerAvg: {
    position: 'absolute',
    top: -(MARKER_AVG_H - TRACK_H) / 2,
    width: MARKER_AVG_W,
    height: MARKER_AVG_H,
    marginLeft: -MARKER_AVG_W / 2,
    borderRadius: spacing.micro,
    backgroundColor: colors.white,
    borderWidth: spacing.borderMedium,
    borderColor: colors.onBackground,
  },
  markerHigh: {
    position: 'absolute',
    top: -(MARKER_HIGH - TRACK_H) / 2,
    width: MARKER_HIGH,
    height: MARKER_HIGH,
    borderRadius: MARKER_HIGH / 2,
    backgroundColor: colors.white,
    borderWidth: spacing.borderMedium,
    borderColor: colors.gray400,
  },
  markerHighOffset: {
    right: 0,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm + spacing.micro,
  },
  labelCol: {
    flex: 1,
  },
  labelColCenter: {
    alignItems: 'center',
  },
  labelColRight: {
    alignItems: 'flex-end',
  },
  labelKicker: {
    ...typography.microLabel,
    color: colors.onBackground,
    letterSpacing: 0.5,
  },
  labelKickerLow: {
    color: colors.primary,
  },
  labelKickerHigh: {
    color: colors.gray400,
  },
  labelValue: {
    fontFamily: PJS.extraBold,
    fontSize: 13,
    color: colors.onBackground,
    marginTop: spacing.micro,
  },
  labelValueLow: {
    color: colors.primary,
  },
  labelValueHigh: {
    color: colors.gray400,
    fontFamily: PJS.bold,
  },
});

export default PriceRangeBar;
