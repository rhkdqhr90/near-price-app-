import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  type ListRenderItemInfo,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import type { HomeScreenProps } from '../../navigation/types';
import {
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotificationList,
} from '../../hooks/queries/useNotifications';
import type { AppNotification } from '../../types/api.types';
import EmptyState from '../../components/common/EmptyState';
import ErrorView from '../../components/common/ErrorView';
import BellIcon from '../../components/icons/BellIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/format';

type Props = HomeScreenProps<'Notifications'>;

// 알림 딥링크 URL 보안 검증.
// 서버가 보낸 URL을 그대로 Linking.openURL에 넘기면 javascript:, intent://, tel:,
// 피싱 사이트 등 임의 스킴/호스트 호출이 가능하다.
// 정책:
//   1) https 스킴은 신뢰 호스트만 허용
//   2) 앱 내부 딥링크 nearprice:// 는 허용 (예: nearprice://flyer/{id})
const ALLOWED_NOTIFICATION_URL_HOSTS: readonly string[] = [
  // 자체 도메인 — 운영/사장님센터 페이지 등
  'nearprice.kr',
  'www.nearprice.kr',
  'bipanlife.com',
  'www.bipanlife.com',
];

const ALLOWED_APP_DEEPLINK_HOSTS: readonly string[] = [
  'flyer',
];

const isSafeNotificationUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'nearprice:') {
      const host = parsed.hostname.toLowerCase();
      return ALLOWED_APP_DEEPLINK_HOSTS.includes(host);
    }
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_NOTIFICATION_URL_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
};

const parseAppDeepLink = (
  raw: string,
): { type: 'flyer'; flyerId: string } | null => {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'nearprice:') return null;
    if (parsed.hostname !== 'flyer') return null;
    const flyerId = parsed.pathname.replace(/^\//, '').trim();
    if (!flyerId) return null;
    return { type: 'flyer', flyerId };
  } catch {
    return null;
  }
};

const NotificationListScreen: React.FC<Props> = ({ navigation }) => {
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationList();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const removeMutation = useDeleteNotification();

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );
  const hasUnread = useMemo(() => items.some((n) => !n.isRead), [items]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handlePress = useCallback(
    (notif: AppNotification) => {
      if (!notif.isRead) {
        markAsRead.mutate(notif.id);
      }
      // Deep link 라우팅 — linkType별 화면 분기
      switch (notif.linkType) {
        case 'price':
          // priceId만 아는 상태 — 화면에서 priceId로 조회 후 product 정보 파생.
          if (notif.linkId) {
            navigation.navigate('PriceDetail', {
              productId: '',
              productName: '',
              priceId: notif.linkId,
            });
          }
          break;
        case 'product':
          // productName은 알림 제목과 의미가 다르므로 빈 문자열 — 화면에서 조회 후 표시.
          if (notif.linkId) {
            navigation.navigate('PriceDetail', {
              productId: notif.linkId,
              productName: '',
            });
          }
          break;
        case 'store':
          if (notif.linkId) {
            navigation.navigate('StoreDetail', { storeId: notif.linkId });
          }
          break;
        case 'notice':
          // NoticeDetail은 MyPageStack에 있으므로 부모 탭으로 크로스 스택 이동
          if (notif.linkId) {
            navigation
              .getParent<BottomTabNavigationProp<MainTabParamList>>()
              ?.navigate('MyPageStack', {
                screen: 'NoticeDetail',
                params: { noticeId: notif.linkId },
              });
          }
          break;
        case 'url':
          // 외부/커스텀 URL — linkId가 URL 문자열.
          // 1) nearprice:// 앱 딥링크는 내부 네비게이션으로 처리
          // 2) 외부 URL은 https + 신뢰 호스트만 허용
          if (notif.linkId) {
            const appLink = parseAppDeepLink(notif.linkId);
            if (appLink?.type === 'flyer') {
              navigation
                .getParent<BottomTabNavigationProp<MainTabParamList>>()
                ?.navigate('Flyer', {
                  screen: 'FlyerDetail',
                  params: { flyerId: appLink.flyerId },
                });
              break;
            }
          }
          if (notif.linkId && isSafeNotificationUrl(notif.linkId)) {
            Linking.openURL(notif.linkId).catch(() => {
              // 열 수 없는 URL은 무시
            });
          }
          break;
        default:
          // 링크 없음 — 아무 동작 없음
          break;
      }
    },
    [navigation, markAsRead],
  );

  const handleLongPress = useCallback(
    (notif: AppNotification) => {
      Alert.alert('알림 삭제', '이 알림을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => removeMutation.mutate(notif.id),
        },
      ]);
    },
    [removeMutation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => (
      <TouchableOpacity
        style={[styles.item, !item.isRead && styles.itemUnread]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} — ${item.body}`}
      >
        {!item.isRead && <View style={styles.unreadDot} />}
        <View style={styles.itemBody}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemContent} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.itemTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handlePress, handleLongPress],
  );

  if (isError) {
    return (
      <ErrorView message="알림을 불러오지 못했어요" onRetry={refetch} />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasUnread && (
        <View style={styles.actionsBar}>
          <TouchableOpacity
            onPress={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            accessibilityRole="button"
            accessibilityLabel="모두 읽음 처리"
          >
            <Text style={styles.actionText}>모두 읽음</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              style={styles.footerLoader}
              color={colors.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={BellIcon}
              title="알림이 없어요"
              subtitle="새 알림이 오면 여기에 표시돼요."
            />
          )
        }
        removeClippedSubviews={true}
      />
    </View>
  );
};

const ItemSeparator: React.FC = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  actionText: {
    ...typography.bodySm,
    fontFamily: PJS.bold,
    color: colors.primary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  itemUnread: {
    backgroundColor: colors.primaryLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    ...typography.headingMd,
    marginBottom: spacing.micro,
  },
  itemContent: {
    ...typography.bodySm,
    color: colors.gray700,
    marginBottom: spacing.xs,
  },
  itemTime: {
    ...typography.caption,
    color: colors.gray600,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.gray200,
    marginHorizontal: spacing.xl,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});

export default NotificationListScreen;
