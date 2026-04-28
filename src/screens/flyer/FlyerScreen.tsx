import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { FlyerScreenProps, MainTabParamList } from '../../navigation/types';
import { useFlyers } from '../../hooks/queries/useFlyers';
import type { FlyerProductItem, FlyerTemplateType } from '../../types/api.types';
import { flyerApi } from '../../api/flyer.api';
import { naverLocalApi } from '../../api/naver-local.api';
import SkeletonCard from '../../components/common/SkeletonCard';
import EmptyState from '../../components/common/EmptyState';
import ErrorView from '../../components/common/ErrorView';
import TagIcon from '../../components/icons/TagIcon';
import ColorFlyerTemplate from '../../components/flyer/ColorFlyerTemplate';
import NewsFlyerTemplate from '../../components/flyer/NewsFlyerTemplate';
import RisoFlyerTemplate from '../../components/flyer/RisoFlyerTemplate';
import PosterFlyerTemplate from '../../components/flyer/PosterFlyerTemplate';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { openMapApp } from '../../utils/openMapApp';

type Props = FlyerScreenProps<'FlyerList'>;

type FlyerStyle = 'color' | 'news' | 'riso' | 'poster';

const PAGE_SIZE = 8;

const STYLE_BACKGROUND: Record<FlyerStyle, { bg: string; cardBg: string; text: string }> = {
  color: { bg: '#E8E0CC', cardBg: '#D4C6A4', text: '#2A1F14' },
  news: { bg: '#E6DDC8', cardBg: '#D5CCB8', text: '#1A1512' },
  riso: { bg: '#F0EBDD', cardBg: '#DCCDB3', text: '#1A1818' },
  poster: { bg: '#D8CCB0', cardBg: '#CAB998', text: '#1A1512' },
};

const toFlyerStyle = (templateType: FlyerTemplateType | null | undefined): FlyerStyle => {
  if (templateType === 'news') return 'news';
  if (templateType === 'retro') return 'riso';
  if (templateType === 'coupon') return 'poster';
  return 'color';
};

const weekOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
};

const FlyerScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    data: flyers,
    isLoading,
    isError,
    refetch,
  } = useFlyers();

  const [selectedFlyerId, setSelectedFlyerId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setSelectedFlyerId((prev) => {
      if (!flyers || flyers.length === 0) {
        return null;
      }
      const keep = prev && flyers.some((item) => item.id === prev);
      return keep ? prev : flyers[0].id;
    });
  }, [flyers]);

  const selectedFlyer = useMemo(() => {
    if (!flyers || flyers.length === 0) {
      return null;
    }
    if (!selectedFlyerId) {
      return flyers[0];
    }
    return flyers.find((item) => item.id === selectedFlyerId) ?? flyers[0];
  }, [flyers, selectedFlyerId]);

  const allProducts = useMemo(
    () => selectedFlyer?.products ?? [],
    [selectedFlyer?.products],
  );

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE)),
    [allProducts.length],
  );

  useEffect(() => {
    setPageIndex(0);
  }, [selectedFlyer?.id]);

  useEffect(() => {
    if (pageIndex <= pageCount - 1) {
      return;
    }
    setPageIndex(Math.max(0, pageCount - 1));
  }, [pageCount, pageIndex]);

  const pagedFlyer = useMemo(() => {
    if (!selectedFlyer) {
      return null;
    }
    const start = pageIndex * PAGE_SIZE;
    const pageProducts = allProducts.slice(start, start + PAGE_SIZE);
    return {
      ...selectedFlyer,
      products: pageProducts,
    };
  }, [allProducts, pageIndex, selectedFlyer]);

  const now = useMemo(() => new Date(), []);
  const weekNumber = useMemo(() => weekOfYear(now), [now]);
  const dateLabel = useMemo(() => {
    const month = String(now.getMonth() + 1);
    const day = String(now.getDate());
    const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];
    return `${month}.${day} ${weekday}`;
  }, [now]);

  const renderStyle = useMemo(
    () => toFlyerStyle(selectedFlyer?.templateType),
    [selectedFlyer?.templateType],
  );
  const palette = STYLE_BACKGROUND[renderStyle];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleProductPress = useCallback(
    async (product: FlyerProductItem) => {
      if (!selectedFlyer) {
        return;
      }

      flyerApi.trackProductView(selectedFlyer.id, product.id).catch(() => {});

      if (!selectedFlyer.storeId) {
        if (!selectedFlyer.storeAddress) {
          Alert.alert('안내', '매장 정보를 찾지 못해 상세 페이지로 이동할 수 없습니다.');
          return;
        }

        try {
          const candidates = await naverLocalApi.searchAddress(selectedFlyer.storeAddress);
          const first = candidates[0];
          if (first) {
            const latitude = parseFloat(first.y);
            const longitude = parseFloat(first.x);
            if (!isNaN(latitude) && !isNaN(longitude)) {
              await openMapApp(latitude, longitude, selectedFlyer.storeName);
              return;
            }
          }
        } catch {
          // fallback below
        }

        const query = encodeURIComponent(selectedFlyer.storeAddress);
        const naverUrl = `nmap://search?query=${query}&appname=com.nearpriceapp`;
        const fallbackUrl = `https://map.naver.com/v5/search/${query}`;
        const supported = await Linking.canOpenURL(naverUrl);
        Linking.openURL(supported ? naverUrl : fallbackUrl).catch(() => {
          Alert.alert('오류', '지도 앱을 열 수 없습니다.');
        });
        return;
      }

      const parentNavigation = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
      if (!parentNavigation) {
        Alert.alert('오류', '화면 이동에 실패했습니다. 앱을 다시 실행해 주세요.');
        return;
      }

      parentNavigation.navigate('HomeStack', {
        screen: 'StoreDetail',
        params: { storeId: selectedFlyer.storeId },
      });
    },
    [navigation, selectedFlyer],
  );

  const contentPaddingBottom = Math.max(insets.bottom, spacing.md) + spacing.xxl;

  if (isLoading) {
    return <SkeletonCard variant="price" />;
  }

  if (isError && (!flyers || flyers.length === 0)) {
    return <ErrorView message="전단지를 불러오지 못했습니다." onRetry={refetch} />;
  }

  return (
    <View style={[
      styles.screen,
      { backgroundColor: palette.bg },
    ]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={[styles.headerTitle, { color: palette.text }]}>동네 전단지</Text>
              <Text style={[styles.headerTemplate, { color: palette.text }]}>사장님센터 템플릿 적용</Text>
            </View>
            <View style={styles.headerDateWrap}>
              <Text style={[styles.headerDate, { color: palette.text }]}>W{weekNumber}</Text>
              <Text style={[styles.headerDate, { color: palette.text }]}>{dateLabel}</Text>
            </View>
          </View>

          {flyers && flyers.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.storeTabRow, { backgroundColor: palette.cardBg }]}
            >
              {flyers.map((item) => {
                const active = selectedFlyerId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.storeTab,
                      active && styles.storeTabActive,
                      active && { backgroundColor: palette.text, borderColor: palette.text },
                    ]}
                    onPress={() => setSelectedFlyerId(item.id)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.storeName} 전단지`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.storeTabText,
                        { color: palette.text },
                        active && styles.storeTabTextActive,
                      ]}
                    >
                      {item.storeName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.templateWrap}>
          {!pagedFlyer ? (
            <EmptyState
              icon={TagIcon}
              title="등록된 전단지가 없어요"
              subtitle="곧 동네 마트 전단지가 업데이트될 예정이에요"
            />
          ) : (
            <>
              {renderStyle === 'color' && (
                <ColorFlyerTemplate
                  flyer={pagedFlyer}
                  onProductPress={handleProductPress}
                />
              )}
              {renderStyle === 'news' && (
                <NewsFlyerTemplate
                  flyer={pagedFlyer}
                  onProductPress={handleProductPress}
                />
              )}
              {renderStyle === 'riso' && (
                <RisoFlyerTemplate
                  flyer={pagedFlyer}
                  onProductPress={handleProductPress}
                />
              )}
              {renderStyle === 'poster' && (
                <PosterFlyerTemplate
                  flyer={pagedFlyer}
                  onProductPress={handleProductPress}
                />
              )}

              {pageCount > 1 && (
                <View style={styles.pageControlsWrap}>
                  <TouchableOpacity
                    style={[styles.pageButton, pageIndex === 0 && styles.pageButtonDisabled]}
                    onPress={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={pageIndex === 0}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="이전 페이지"
                  >
                    <Text style={[styles.pageButtonText, pageIndex === 0 && styles.pageButtonTextDisabled]}>이전</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageIndicator}>{pageIndex + 1} / {pageCount}</Text>

                  <TouchableOpacity
                    style={[styles.pageButton, pageIndex >= pageCount - 1 && styles.pageButtonDisabled]}
                    onPress={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                    disabled={pageIndex >= pageCount - 1}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="다음 페이지"
                  >
                    <Text
                      style={[
                        styles.pageButtonText,
                        pageIndex >= pageCount - 1 && styles.pageButtonTextDisabled,
                      ]}
                    >
                      다음
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerWrap: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    marginTop: spacing.xs,
    ...typography.headingXl,
    fontWeight: '900' as const,
  },
  headerTemplate: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700' as const,
    opacity: 0.75,
  },
  headerDateWrap: {
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  storeTabRow: {
    marginTop: spacing.md,
    borderRadius: spacing.radiusLg,
    padding: 4,
    gap: spacing.xs,
  },
  storeTab: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
  },
  storeTabActive: {
    borderWidth: 1,
  },
  storeTabText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  storeTabTextActive: {
    color: '#FFF9EB',
  },
  templateWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  pageControlsWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  pageButtonText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '700' as const,
  },
  pageButtonTextDisabled: {
    color: colors.gray400,
  },
  pageIndicator: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '800' as const,
  },
});

export default FlyerScreen;
