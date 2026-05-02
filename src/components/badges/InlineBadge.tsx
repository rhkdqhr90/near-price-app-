import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { findBadgeMeta } from '../../data/masilBadges';
import { BADGE_ART } from './Badges';

interface InlineBadgeProps {
  /** 백엔드 BadgeDefinition.id (`masil_1` ~ `masil_23`) */
  type: string;
  /** 출력 사이즈(픽셀). 기본 28. */
  size?: number;
  style?: ViewStyle;
}

/**
 * 작성자 닉네임 앞에 붙는 작은 뱃지 아이콘.
 * 사용자가 BadgeScreen에서 대표 뱃지를 선택하지 않았다면 호출처에서 표시 자체를 생략한다.
 *
 * 디자인의 BadgeFrame은 viewBox 200×240 비율이라 size 28이면 실제 높이는 33.6.
 * 정렬을 위해 컨테이너 너비/높이를 size에 고정하고 SVG는 transform으로 중앙에 둔다.
 */
const InlineBadge: React.FC<InlineBadgeProps> = ({ type, size = 28, style }) => {
  const meta = findBadgeMeta(type);
  if (!meta) {
    return null;
  }

  const Comp = BADGE_ART[meta.num];
  if (!Comp) {
    return null;
  }

  return (
    <View
      style={[styles.wrap, { width: size, height: size }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${meta.name} 뱃지`}
    >
      <Comp size={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default React.memo(InlineBadge);
