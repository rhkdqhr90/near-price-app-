import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FlyerScreenProps } from '../../navigation/types';
import { useFlyers, useOwnerPosts } from '../../hooks/queries/useFlyers';
import type { FlyerResponse, OwnerPostResponse } from '../../types/api.types';
import SkeletonCard from '../../components/common/SkeletonCard';
import EmptyState from '../../components/common/EmptyState';
import ErrorView from '../../components/common/ErrorView';
import TagIcon from '../../components/icons/TagIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = FlyerScreenProps<'FlyerList'>;

const SCREEN_W = Dimensions.get('window').width;
const FLYER_CARD_W = Math.round(SCREEN_W * 0.74);
const FLYER_IMAGE_H = Math.round(FLYER_CARD_W * 1.2);

// ─── Sub-components ───────────────────────────────────────────────────────────

const FlyerCard: React.FC<{ item: FlyerResponse; onPress: (id: string) => void }> = ({ item, onPress }) => {
  const handlePress = React.useCallback(() => onPress(item.id), [onPress, item.id]);
  return (
    <TouchableOpacity
      style={styles.flyerCard}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${item.storeName} ${item.promotionTitle} 전단지 상세보기`}
    >
      <View style={[styles.flyerImage, { backgroundColor: item.bgColor }]}>
        <Text style={styles.flyerEmoji}>{item.emoji}</Text>
        <View style={[styles.flyerBadge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.flyerBadgeText}>{item.badge}</Text>
        </View>
      </View>
      <View style={styles.flyerBody}>
        <Text style={styles.flyerTitle} numberOfLines={1}>
          {item.storeName} {item.promotionTitle}
        </Text>
        <View style={styles.flyerMeta}>
          <Text style={styles.flyerMetaIcon}>📅</Text>
          <Text style={styles.flyerMetaText} numberOfLines={1}>{item.dateRange}</Text>
        </View>
        <View style={styles.flyerMeta}>
          <Text style={styles.flyerMetaIcon}>🛒</Text>
          <Text style={[styles.flyerMetaText, styles.flyerMetaBold]} numberOfLines={1}>
            {item.highlight}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const OwnerPostCard: React.FC<{ post: OwnerPostResponse }> = ({ post }) => (
  <View style={styles.ownerCard}>
    <View style={styles.ownerAvatarWrap}>
      <View style={styles.ownerAvatar}>
        <Text style={styles.ownerAvatarEmoji}>{post.emoji}</Text>
      </View>
    </View>
    <View style={styles.ownerContent}>
      <View style={styles.ownerNameRow}>
        <Text style={styles.ownerName}>{post.ownerName}</Text>
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerBadgeText}>{post.badge}</Text>
        </View>
      </View>
      <View style={styles.bubble}>
        <View style={styles.bubbleTail} />
        <Text style={styles.bubbleText}>{post.message}</Text>
      </View>
      <View style={styles.ownerActions}>
        <TouchableOpacity
          style={styles.ownerActionBtn}
          accessibilityRole="button"
          accessibilityLabel="문의하기"
        >
          <Text style={styles.ownerActionIcon}>💬</Text>
          <Text style={styles.ownerActionLabel}>문의하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ownerActionBtn}
          accessibilityRole="button"
          accessibilityLabel={`좋아요 ${post.likeCount}`}
        >
          <Text style={styles.ownerActionIcon}>🤍</Text>
          <Text style={styles.ownerActionCountLabel}>{post.likeCount.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

type FlyerStyle = 'retro' | 'news' | 'coupon';

const FLYER_STYLES: { k: FlyerStyle; label: string }[] = [
  { k: 'retro', label: '전단' },
  { k: 'news', label: '신문' },
  { k: 'coupon', label: '쿠폰' },
];

const weekOfYear = (d: Date) => {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
};

const FlyerScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data: flyers, isLoading: isFlyersLoading, isError: isFlyersError, refetch: refetchFlyers } = useFlyers();
  const { data: ownerPosts, isLoading: isPostsLoading, refetch: refetchPosts } = useOwnerPosts();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flyerStyle, setFlyerStyle] = useState<FlyerStyle>('retro');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (flyers && flyers.length > 0 && !selectedStoreId) {
      setSelectedStoreId(flyers[0].id);
    }
  }, [flyers, selectedStoreId]);

  const now = useMemo(() => new Date(), []);
  const weekNum = useMemo(() => weekOfYear(now), [now]);
  const dateLabel = useMemo(() => {
    const m = String(now.getMonth() + 1);
    const d = String(now.getDate());
    const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];
    return `${m}.${d} ${dow}`;
  }, [now]);

  const scrollContentStyle = React.useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl * 2 }),
    [insets.bottom],
  );

  const handleFlyerPress = useCallback((flyerId: string) => {
    navigation.navigate('FlyerDetail', { flyerId });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchFlyers(), refetchPosts()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchFlyers, refetchPosts]);

  const isLoading = isFlyersLoading || isPostsLoading;

  const listHeader = useMemo(() => (
    <>
      {/* 헤더 — 페이퍼 매스트헤드 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEyebrow}>━━━ NEIGHBORHOOD FLYERS</Text>
            <Text style={styles.headerTitle}>동네 전단지</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>W{weekNum}</Text>
            <Text style={styles.headerMeta}>{dateLabel}</Text>
          </View>
        </View>

        {/* 스타일 스위처 */}
        <View style={styles.styleSwitcher}>
          {FLYER_STYLES.map((s) => {
            const active = flyerStyle === s.k;
            return (
              <TouchableOpacity
                key={s.k}
                onPress={() => setFlyerStyle(s.k)}
                style={[styles.styleTab, active && styles.styleTabActive]}
                accessibilityRole="button"
                accessibilityLabel={`${s.label} 스타일`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.styleTabText, active && styles.styleTabTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 매장 탭 */}
        {flyers && flyers.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storeTabScroll}
          >
            {flyers.map((f) => {
              const active = selectedStoreId === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setSelectedStoreId(f.id)}
                  style={[styles.storeTab, active && styles.storeTabActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.storeName} 전단지 선택`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.storeTabText, active && styles.storeTabTextActive]}>
                    {f.storeName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* 전단지 영역 */}
      {isFlyersError ? (
        <ErrorView message="전단지를 불러오지 못했습니다." onRetry={refetchFlyers} />
      ) : !flyers || flyers.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="등록된 전단지가 없어요"
          subtitle="곧 동네 마트 전단지가 업데이트될 예정이에요"
        />
      ) : flyerStyle !== 'retro' ? (
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonTitle}>
            {flyerStyle === 'news' ? '신문 스타일' : '쿠폰북'} 준비 중
          </Text>
          <Text style={styles.comingSoonSub}>곧 만나보실 수 있어요</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flyerScroll}
          snapToInterval={FLYER_CARD_W + spacing.md}
          decelerationRate="fast"
        >
          {flyers.map((item) => (
            <FlyerCard key={item.id} item={item} onPress={handleFlyerPress} />
          ))}
        </ScrollView>
      )}

      {/* ── 섹션 2: 동네 사장님 추천 헤더 ──────────────────────── */}
      {ownerPosts && ownerPosts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>동네 사장님 추천</Text>
        </View>
      ) : null}
    </>
  ), [flyers, isFlyersError, ownerPosts, refetchFlyers, handleFlyerPress, flyerStyle, selectedStoreId, weekNum, dateLabel]);

  const renderOwnerPost = useCallback(
    ({ item }: ListRenderItemInfo<OwnerPostResponse>) => (
      <View style={styles.ownerPostItem}>
        <OwnerPostCard post={item} />
      </View>
    ),
    [],
  );

  if (isLoading) {
    return <SkeletonCard variant="price" />;
  }

  return (
    <FlatList
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={scrollContentStyle}
      data={ownerPosts ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderOwnerPost}
      ListHeaderComponent={listHeader}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    />
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.flyerPaper,
  },

  // ── Header (페이퍼 매스트헤드) ──
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: colors.flyerInkMono,
    letterSpacing: 2.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.flyerInk,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerMeta: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.flyerInkMono,
    letterSpacing: 0.5,
  },

  // ── 스타일 스위처 (전단/신문/쿠폰) ──
  styleSwitcher: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    padding: 3,
    backgroundColor: colors.flyerSwitcherBg,
    borderRadius: 10,
    gap: 4,
  },
  styleTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  styleTabActive: {
    backgroundColor: colors.flyerInk,
  },
  styleTabText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.flyerInkSub,
  },
  styleTabTextActive: {
    color: colors.flyerSwitcherActiveText,
  },

  // ── 매장 탭 ──
  storeTabScroll: {
    gap: 6,
    marginTop: spacing.md,
    paddingBottom: 2,
  },
  storeTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.flyerTabInactiveBorder,
    backgroundColor: colors.flyerTabInactiveBg,
  },
  storeTabActive: {
    backgroundColor: colors.flyerInk,
    borderColor: colors.flyerInk,
  },
  storeTabText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.flyerInk,
    letterSpacing: -0.2,
  },
  storeTabTextActive: {
    color: colors.flyerSwitcherActiveText,
  },

  // ── Coming Soon (news/coupon 준비 중) ──
  comingSoon: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.flyerInk,
    letterSpacing: -0.3,
  },
  comingSoonSub: {
    fontSize: 12,
    color: colors.flyerInkMono,
    marginTop: spacing.xs,
  },

  // ── Section Layout ──
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingLg,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  sectionSub: {
    ...typography.bodySm,
    color: colors.gray600,
    marginTop: spacing.xs,
  },

  // ── Flyer Cards ──
  flyerScroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  flyerCard: {
    width: FLYER_CARD_W,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: 0.07,
    shadowRadius: spacing.shadowRadiusLg,
    elevation: 3,
  },
  flyerImage: {
    width: '100%',
    height: FLYER_IMAGE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerEmoji: {
    fontSize: 64,
  },
  flyerBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  flyerBadgeText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 10,
  },
  flyerBody: {
    padding: spacing.cardPadH,
    gap: spacing.cardTextGap,
  },
  flyerTitle: {
    ...typography.headingMd,
    marginBottom: spacing.xs,
  },
  flyerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flyerMetaIcon: {
    fontSize: spacing.iconXs,
  },
  flyerMetaText: {
    ...typography.caption,
    color: colors.gray600,
    flex: 1,
  },
  flyerMetaBold: {
    fontWeight: '500' as const,
    color: colors.gray700,
  },

  // ── Owner Post ──
  ownerPostItem: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  ownerAvatarWrap: {
    borderRadius: spacing.radiusFull,
    borderWidth: spacing.borderMedium,
    borderColor: colors.primaryLight,
    padding: 2,
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarEmoji: {
    fontSize: 26,
  },
  ownerContent: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ownerName: {
    ...typography.headingMd,
    fontSize: 14,
  },
  ownerBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  ownerBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700' as const,
  },
  bubble: {
    backgroundColor: colors.surfaceBg,
    borderRadius: spacing.radiusMd,
    borderTopLeftRadius: spacing.radiusSm,
    padding: spacing.md,
  },
  bubbleTail: {
    position: 'absolute',
    top: 0,
    left: -spacing.sm,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderRightWidth: spacing.sm,
    borderBottomWidth: spacing.sm,
    borderRightColor: colors.surfaceBg,
    borderBottomColor: 'transparent',
  },
  bubbleText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.gray900,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingLeft: spacing.xs,
  },
  ownerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ownerActionIcon: {
    fontSize: 14,
  },
  ownerActionLabel: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700' as const,
  },
  ownerActionCountLabel: {
    ...typography.bodySm,
    color: colors.gray600,
    fontWeight: '600' as const,
  },

});

export default FlyerScreen;
