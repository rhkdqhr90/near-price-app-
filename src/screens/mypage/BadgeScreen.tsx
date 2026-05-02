import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../components/common/LoadingView';
import ErrorView from '../../components/common/ErrorView';
import type { MyPageScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import {
  useUserBadges,
  useSetRepresentativeBadge,
} from '../../hooks/queries/useBadges';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import {
  MASIL_BADGES,
  BADGE_TIER_ORDER,
  BADGE_TIER_META,
  type BadgeTier,
} from '../../data/masilBadges';
import { BADGE_ART } from '../../components/badges/Badges';

type Props = MyPageScreenProps<'Badge'>;

type FilterValue = 'all' | BadgeTier;

const BadgeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const {
    data: badgesData,
    isLoading,
    isError,
    refetch,
  } = useUserBadges(user?.id);

  const setRepresentativeBadgeMutation = useSetRepresentativeBadge();

  const [filter, setFilter] = useState<FilterValue>('all');

  // 보유 뱃지 type Set (조회 효율)
  const earnedTypes = useMemo<ReadonlySet<string>>(() => {
    if (!badgesData?.earned) return new Set();
    return new Set(badgesData.earned.map((e) => e.type));
  }, [badgesData?.earned]);

  // 사용자 대표 뱃지 type
  const representativeType = user?.representativeBadge?.type ?? null;

  const unlockedCount = earnedTypes.size;
  const totalCount = MASIL_BADGES.length;
  const unlockedPct = (unlockedCount / totalCount) * 100;

  const grouped = useMemo(() => {
    const byTier: Record<BadgeTier, typeof MASIL_BADGES[number][]> = {
      bronze: [],
      silver: [],
      gold: [],
      platinum: [],
      mythic: [],
    };
    for (const b of MASIL_BADGES) {
      byTier[b.tier].push(b);
    }
    return byTier;
  }, []);

  const handleCardPress = useCallback(
    (type: string, locked: boolean) => {
      if (locked) {
        return;
      }
      const isCurrent = representativeType === type;
      const next = isCurrent ? null : type;
      setRepresentativeBadgeMutation.mutate(next, {
        onError: (err) => {
          Alert.alert('오류', '대표 뱃지 설정에 실패했어요.');
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('setRepresentativeBadge error', err);
          }
        },
      });
    },
    [representativeType, setRepresentativeBadgeMutation],
  );

  const tierSections = useMemo(
    () =>
      BADGE_TIER_ORDER.filter((t) => filter === 'all' || filter === t).map(
        (tier) => ({
          tier,
          meta: BADGE_TIER_META[tier],
          list: grouped[tier],
          earnedInTier: grouped[tier].filter((b) => earnedTypes.has(b.type))
            .length,
        }),
      ),
    [filter, grouped, earnedTypes],
  );

  if (isLoading) {
    return <LoadingView message="뱃지 컬렉션을 불러오는 중..." />;
  }
  if (isError) {
    return (
      <ErrorView
        message="뱃지 정보를 불러오지 못했어요."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <ChevronLeftIcon size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>뱃지</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 페이지 헤드 */}
        <Text style={styles.eyebrow}>━━━ 마실 · LEVEL BADGES · v1</Text>
        <Text style={styles.h1}>복돌이 컬렉션</Text>
        <Text style={styles.lede}>
          알뜰함의 흔적을 모으세요. {totalCount}개의 뱃지가 당신의 마실 여정을
          기록합니다. 브론즈부터 미식까지, 더 많이 등록하고 더 정확할수록 복돌이는
          더 빛납니다.
        </Text>

        {/* Hero — 진행도 */}
        <View style={styles.hero}>
          <View style={styles.heroStat}>
            <Text style={styles.heroNum}>
              {unlockedCount}
              <Text style={styles.heroNumDenom}>/{totalCount}</Text>
            </Text>
            <Text style={styles.heroLabel}>UNLOCKED</Text>
          </View>
          <View style={styles.heroBarWrap}>
            <View style={styles.heroBarTrack}>
              <View
                style={[
                  styles.heroBarFill,
                  { width: `${Math.min(100, Math.max(0, unlockedPct))}%` },
                ]}
              />
            </View>
            <View style={styles.heroBarMarks}>
              {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'MYTHIC'] as const).map(
                (m) => (
                  <Text key={m} style={styles.heroBarMark}>
                    {m}
                  </Text>
                ),
              )}
            </View>
          </View>
        </View>

        {/* 필터 toolbar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(['all', ...BADGE_TIER_ORDER] as const).map((t) => {
            const active = filter === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.filterBtn, active && styles.filterBtnActive]}
                onPress={() => setFilter(t)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {t === 'all' ? '전체 보기' : BADGE_TIER_META[t].kr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 사용자 안내 */}
        {unlockedCount > 0 && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              💡 보유한 뱃지를 누르면 대표 뱃지로 설정돼서 작성한 글 옆에 함께 표시됩니다.
            </Text>
          </View>
        )}

        {/* 티어 섹션 × 5 */}
        {tierSections.map(({ tier, meta, list, earnedInTier }) => (
          <View key={tier} style={styles.tierSection}>
            <View style={styles.tierHead}>
              <Text style={styles.tierName}>{meta.kr}</Text>
              <View
                style={[
                  styles.tierEnPill,
                  { backgroundColor: meta.chipBg },
                ]}
              >
                <Text
                  style={[styles.tierEnText, { color: meta.chipFg }]}
                >
                  {meta.en}
                </Text>
              </View>
              <Text style={styles.tierDesc}>· {meta.desc}</Text>
              <Text style={styles.tierCount}>
                {earnedInTier}/{list.length}
              </Text>
            </View>

            <View style={styles.grid}>
              {list.map((b) => {
                const earned = earnedTypes.has(b.type);
                const isRepresentative = representativeType === b.type;
                const Comp = BADGE_ART[b.num];
                if (!Comp) return null;
                return (
                  <TouchableOpacity
                    key={b.type}
                    style={[
                      styles.card,
                      !earned && styles.cardLocked,
                      isRepresentative && styles.cardRepresentative,
                    ]}
                    onPress={() => handleCardPress(b.type, !earned)}
                    activeOpacity={earned ? 0.85 : 1}
                    accessibilityRole="button"
                    accessibilityLabel={`${earned ? b.name : '잠긴 뱃지'} ${
                      isRepresentative ? '(대표 뱃지)' : ''
                    }`}
                    accessibilityState={{ selected: isRepresentative, disabled: !earned }}
                  >
                    {isRepresentative && (
                      <View style={styles.repFlag}>
                        <Text style={styles.repFlagText}>대표</Text>
                      </View>
                    )}
                    <View style={styles.cardArt}>
                      <Comp locked={!earned} size={120} />
                    </View>
                    <Text style={styles.cardName}>
                      {earned ? b.name : '???'}
                    </Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {earned ? b.desc : '조건을 달성하면 해금됩니다'}
                    </Text>
                    <View style={styles.cardCondPill}>
                      <Text style={styles.cardCondText}>{b.cond}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const PAPER_BG = '#FAF6EC';
const TEAL = '#00BFA5';
const INK = '#1A2A26';
const INK_SOFT = '#3A4541';
const INK_MUTED = '#5B6573';
const SOFT_BORDER = 'rgba(26, 42, 38, 0.08)';
const SOFT_DIVIDER = 'rgba(26, 42, 38, 0.15)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAPER_BG,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: spacing.headerHeight,
  },
  backBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.headingMd,
    color: colors.onBackground,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    ...typography.tabLabel,
    fontFamily: PJS.bold,
    color: TEAL,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  h1: {
    fontSize: 32,
    fontFamily: PJS.extraBold,
    color: INK,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  lede: {
    ...typography.body,
    color: INK_SOFT,
    lineHeight: 22,
  },
  hero: {
    marginTop: spacing.xl,
    backgroundColor: '#fff',
    borderRadius: spacing.radiusLg,
    borderWidth: 1.5,
    borderColor: SOFT_BORDER,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroStat: {
    minWidth: 72,
  },
  heroNum: {
    fontSize: 28,
    fontFamily: PJS.extraBold,
    color: INK,
    letterSpacing: -1,
  },
  heroNumDenom: {
    fontSize: 16,
    color: INK_MUTED,
    fontFamily: PJS.semiBold,
  },
  heroLabel: {
    ...typography.caption,
    fontFamily: PJS.bold,
    color: INK_MUTED,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  heroBarWrap: {
    flex: 1,
    minWidth: 200,
  },
  heroBarTrack: {
    height: 10,
    backgroundColor: '#F0F3F2',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 999,
  },
  heroBarMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  heroBarMark: {
    fontSize: 9,
    fontFamily: PJS.bold,
    color: INK_MUTED,
    letterSpacing: 0.5,
  },
  filterRow: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(26, 42, 38, 0.12)',
  },
  filterBtnActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  filterText: {
    ...typography.bodySm,
    fontFamily: PJS.semiBold,
    color: INK_SOFT,
  },
  filterTextActive: {
    color: '#fff',
  },
  hintBox: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  hintText: {
    ...typography.bodySm,
    color: INK_SOFT,
    lineHeight: 18,
  },
  tierSection: {
    marginTop: spacing.xl,
  },
  tierHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: SOFT_DIVIDER,
    borderStyle: 'dashed',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tierName: {
    fontSize: 18,
    fontFamily: PJS.extraBold,
    color: INK,
    letterSpacing: -0.3,
  },
  tierEnPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierEnText: {
    fontSize: 9,
    fontFamily: PJS.bold,
    letterSpacing: 1.5,
  },
  tierDesc: {
    ...typography.caption,
    color: INK_MUTED,
  },
  tierCount: {
    marginLeft: 'auto',
    ...typography.bodySm,
    fontFamily: PJS.semiBold,
    color: INK_MUTED,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: SOFT_BORDER,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  cardLocked: {
    opacity: 0.7,
  },
  cardRepresentative: {
    borderColor: TEAL,
    borderWidth: 2.5,
  },
  cardArt: {
    marginBottom: spacing.sm,
  },
  cardName: {
    ...typography.bodyMd,
    fontFamily: PJS.extraBold,
    color: INK,
    textAlign: 'center',
    marginBottom: 2,
  },
  cardDesc: {
    ...typography.caption,
    color: INK_MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  cardCondPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#F0F3F2',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  cardCondText: {
    fontSize: 9,
    fontFamily: PJS.semiBold,
    color: INK_SOFT,
  },
  repFlag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: TEAL,
    zIndex: 2,
  },
  repFlagText: {
    fontSize: 9,
    fontFamily: PJS.extraBold,
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default BadgeScreen;

// 작은 활동 인디케이터 (mutation 진행 중)
export const _Loading: React.FC = () => (
  <ActivityIndicator size="small" color={TEAL} />
);
