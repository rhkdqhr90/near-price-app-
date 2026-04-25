import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FlyerScreenProps } from '../../navigation/types';
import { useFlyerDetail } from '../../hooks/queries/useFlyers';
import SkeletonCard from '../../components/common/SkeletonCard';
import ErrorView from '../../components/common/ErrorView';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import { naverLocalApi } from '../../api/naver-local.api';
import { openMapApp } from '../../utils/openMapApp';
import ClassicTemplate from '../../components/flyer/ClassicTemplate';
import RetroTemplate from '../../components/flyer/RetroTemplate';
import NewsTemplate from '../../components/flyer/NewsTemplate';
import CouponTemplate from '../../components/flyer/CouponTemplate';

type Props = FlyerScreenProps<'FlyerDetail'>;

const FlyerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { flyerId } = route.params;
  const { data: flyer, isLoading, isError, refetch } = useFlyerDetail(flyerId);

  const handleShare = useCallback(async () => {
    if (!flyer) { return; }
    try {
      await Share.share({
        message: `[${flyer.storeName}] ${flyer.promotionTitle} ${flyer.dateRange}\n\nNearPrice 앱에서 확인하세요!`,
        title: `${flyer.storeName} 전단지`,
      });
    } catch {
      Alert.alert('공유 실패', '공유 기능을 사용할 수 없습니다.');
    }
  }, [flyer]);

  const handleDirection = useCallback(async () => {
    if (!flyer?.storeAddress) { return; }
    try {
      const candidates = await naverLocalApi.searchAddress(flyer.storeAddress);
      const first = candidates[0];
      if (first) {
        const latitude = parseFloat(first.y);
        const longitude = parseFloat(first.x);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          await openMapApp(latitude, longitude, flyer.storeName);
          return;
        }
      }
    } catch {
      // fallback below
    }
    const query = encodeURIComponent(flyer.storeAddress);
    const naverUrl = `nmap://search?query=${query}&appname=com.nearpriceapp`;
    const fallbackUrl = `https://map.naver.com/v5/search/${query}`;
    const supported = await Linking.canOpenURL(naverUrl);
    Linking.openURL(supported ? naverUrl : fallbackUrl).catch(() => {
      Alert.alert('오류', '지도 앱을 열 수 없습니다.');
    });
  }, [flyer]);

  const handleCommunityShare = useCallback(async () => {
    if (!flyer) { return; }
    try {
      await Share.share({ message: `${flyer.storeName} 정보를 이웃과 공유했습니다.` });
    } catch {
      // ignore
    }
  }, [flyer]);

  const scrollContentStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl }),
    [insets.bottom],
  );

  if (isLoading) {
    return <SkeletonCard variant="price" />;
  }

  if (isError || !flyer) {
    return <ErrorView message="전단지를 불러오지 못했습니다." onRetry={refetch} />;
  }

  const templateType = flyer.templateType ?? 'classic';

  return (
    <View style={styles.screen}>
      {/* 공통 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <ChevronLeftIcon size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전단지 상세</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="공유하기"
        >
          <ShareIcon size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        {templateType === 'retro' && (
          <RetroTemplate
            flyer={flyer}
            onDirection={handleDirection}
            onCommunityShare={handleCommunityShare}
          />
        )}
        {templateType === 'news' && (
          <NewsTemplate
            flyer={flyer}
            onDirection={handleDirection}
            onCommunityShare={handleCommunityShare}
          />
        )}
        {templateType === 'coupon' && (
          <CouponTemplate
            flyer={flyer}
            onDirection={handleDirection}
            onCommunityShare={handleCommunityShare}
          />
        )}
        {templateType === 'classic' && (
          <ClassicTemplate
            flyer={flyer}
            onDirection={handleDirection}
            onCommunityShare={handleCommunityShare}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.flyerDetailHeaderBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headingMd,
    color: colors.primary,
    fontWeight: '800' as const,
  },
  scrollView: {
    flex: 1,
  },
});

export default FlyerDetailScreen;
