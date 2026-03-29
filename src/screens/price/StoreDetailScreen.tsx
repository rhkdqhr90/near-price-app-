import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  FlatList,
  ListRenderItem,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { HomeScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useStoreDetail, useStoreReviews, useAddStoreReview } from '../../hooks/queries/useStores';
import { useStorePrices } from '../../hooks/queries/usePrices';
import type { PriceResponse, StoreReviewResponse, StoreResponse } from '../../types/api.types';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import LoadingView from '../../components/common/LoadingView';
import ErrorView from '../../components/common/ErrorView';
import { formatPrice, formatRelativeTime } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

type Props = HomeScreenProps<'StoreDetail'>;

const STORE_TYPE_LABELS: Record<StoreResponse['type'], string> = {
  large_mart: '대형마트',
  mart: '마트',
  supermarket: '슈퍼마켓',
  convenience: '편의점',
  traditional_market: '전통시장',
};

interface MapApp {
  name: string;
  appUrl: (lat: number, lng: number, name: string) => string;
  webUrl: (lat: number, lng: number, name: string) => string;
  scheme: string;
}

const MAP_APPS: MapApp[] = [
  {
    name: '네이버 지도',
    appUrl: (lat, lng, name) => `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=com.nearprice`,
    webUrl: (lat, lng, name) => `https://map.naver.com/v5/directions/-/${lng},${lat},${encodeURIComponent(name)}/-/walk`,
    scheme: 'nmap://',
  },
  {
    name: '카카오맵',
    appUrl: (lat, lng, name) => `kakaomap://look?p=${lat},${lng}&name=${encodeURIComponent(name)}`,
    webUrl: (lat, lng) => `https://map.kakao.com/link/map/${lat},${lng}`,
    scheme: 'kakaomap://',
  },
  {
    name: '구글맵',
    appUrl: (lat, lng) => `google.navigation:q=${lat},${lng}`,
    webUrl: (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`,
    scheme: 'google.navigation://',
  },
];

const openMapApp = async (lat: number, lng: number, name: string) => {
  const availableApps: Array<{ name: string; url: string }> = [];

  for (const app of MAP_APPS) {
    const supported = await Linking.canOpenURL(app.scheme);
    if (supported) {
      availableApps.push({
        name: app.name,
        url: app.appUrl(lat, lng, name),
      });
    }
  }

  if (availableApps.length === 0) {
    Linking.openURL(MAP_APPS[0].webUrl(lat, lng, name));
    return;
  }

  if (availableApps.length === 1) {
    Linking.openURL(availableApps[0].url);
    return;
  }

  Alert.alert(
    '지도 앱 선택',
    '어떤 지도 앱으로 열까요?',
    [
      ...availableApps.map((app) => ({
        text: app.name,
        onPress: () => Linking.openURL(app.url),
      })),
      { text: '취소', style: 'cancel' },
    ],
  );
};

// ─── PriceRow ──────────────────────────────────────────────────────────────

interface PriceRowProps {
  item: PriceResponse;
}

const PriceRow: React.FC<PriceRowProps> = memo(({ item }) => (
  <View style={styles.priceRow}>
    <View style={styles.priceRowLeft}>
      <Text style={styles.priceRowProduct} numberOfLines={1}>{item.product.name}</Text>
      <Text style={styles.priceRowMeta}>
        {formatRelativeTime(item.createdAt)}
        {item.verificationCount > 0 ? ` · 검증 ${item.verificationCount}명` : ''}
      </Text>
    </View>
    <Text style={styles.priceRowPrice}>{formatPrice(item.price)}</Text>
  </View>
));

// ─── ReviewRow ─────────────────────────────────────────────────────────────

interface ReviewRowProps {
  item: StoreReviewResponse;
}

const ReviewRow: React.FC<ReviewRowProps> = memo(({ item }) => (
  <View style={styles.reviewRow}>
    <View style={styles.reviewAvatar}>
      <Text style={styles.reviewAvatarText}>{item.user.nickname[0] ?? '?'}</Text>
    </View>
    <View style={styles.reviewBody}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewNickname}>{item.user.nickname}</Text>
        <Text style={styles.reviewStars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
      </View>
      {item.comment ? (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      ) : null}
      <Text style={styles.reviewTime}>{formatRelativeTime(item.createdAt)}</Text>
    </View>
  </View>
));

// ─── Main Screen ───────────────────────────────────────────────────────────

const StoreDetailScreen: React.FC<Props> = ({ route }) => {
  const { storeId } = route.params;
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: store, isLoading, isError, refetch } = useStoreDetail(storeId);
  const { data: pricesData } = useStorePrices(storeId);
  const { data: reviewsData } = useStoreReviews(storeId);
  const { mutate: addReview, isPending: isSubmittingReview } = useAddStoreReview(storeId);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const handleDirections = useCallback(async () => {
    if (!store) return;
    await openMapApp(store.latitude, store.longitude, store.name);
  }, [store]);

  const handleSubmitReview = useCallback(() => {
    addReview(
      { rating: selectedRating, comment: reviewComment.trim() || undefined },
      {
        onSuccess: () => {
          showToast('리뷰가 등록됐어요!', 'success');
          setShowReviewModal(false);
          setReviewComment('');
          setSelectedRating(5);
        },
        onError: () => {
          showToast('리뷰 등록에 실패했어요', 'error');
        },
      },
    );
  }, [addReview, selectedRating, reviewComment, showToast]);

  const renderPriceItem: ListRenderItem<PriceResponse> = useCallback(
    ({ item }) => <PriceRow item={item} />,
    [],
  );

  if (isLoading) {
    return <LoadingView message="매장 정보를 불러오는 중..." />;
  }
  if (isError || !store) {
    return <ErrorView message="매장 정보를 불러오지 못했습니다" onRetry={refetch} />;
  }

  const isValidMarker = typeof store.latitude === 'number' && typeof store.longitude === 'number'
    && !isNaN(store.latitude) && !isNaN(store.longitude);

  const prices = pricesData?.data ?? [];
  const reviews = reviewsData?.data ?? [];

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const listHeader = (
    <>
      {/* ─── 지도 ─── */}
      <View style={styles.mapContainer}>
        <MapViewWrapper
          style={styles.map}
          initialCamera={{ latitude: store.latitude, longitude: store.longitude, zoom: 15 }}
          isShowLocationButton={false}
          isShowZoomControls={false}
          minZoom={10}
          maxZoom={18}
          mapType="Basic"
          locale="ko"
        >
          {isValidMarker && (
            <NaverMapMarkerOverlay
              latitude={store.latitude}
              longitude={store.longitude}
              tintColor={colors.primary}
              caption={{ text: store.name, textSize: 12, color: colors.primary }}
            />
          )}
        </MapViewWrapper>
      </View>

      {/* ─── 매장 기본 정보 ─── */}
      <View style={styles.infoSection}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeName}>{store.name}</Text>
          <View style={styles.storeTypeBadge}>
            <Text style={styles.storeTypeText}>{STORE_TYPE_LABELS[store.type] ?? store.type}</Text>
          </View>
        </View>
        <Text style={styles.storeAddress}>{store.address}</Text>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleDirections}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${store.name}으로 길찾기`}
        >
          <Text style={styles.directionsButtonText}>지도로 길찾기</Text>
        </TouchableOpacity>
      </View>

      {/* ─── 등록 가격 섹션 헤더 ─── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>이 매장의 등록 가격</Text>
        {pricesData && <Text style={styles.sectionCount}>{pricesData.total}개</Text>}
      </View>

      {prices.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>아직 등록된 가격이 없어요</Text>
        </View>
      ) : null}
    </>
  );

  const listFooter = (
    <>
      {/* ─── 리뷰 섹션 ─── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>매장 리뷰</Text>
        {avgRating !== null && (
          <Text style={styles.avgRating}>
            ★ {avgRating.toFixed(1)} ({reviews.length}개)
          </Text>
        )}
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>아직 리뷰가 없어요</Text>
        </View>
      ) : (
        reviews.map((r) => <ReviewRow key={r.id} item={r} />)
      )}

      {user && (
        <TouchableOpacity
          style={styles.addReviewButton}
          onPress={() => setShowReviewModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="리뷰 작성"
        >
          <Text style={styles.addReviewButtonText}>리뷰 작성하기</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottomPadding} />
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={prices}
        keyExtractor={(item) => item.id}
        renderItem={renderPriceItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />

      {/* ─── 리뷰 작성 모달 ─── */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowReviewModal(false)}
            accessibilityRole="button"
            accessibilityLabel="모달 닫기"
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>매장 리뷰 작성</Text>

            {/* 별점 선택 */}
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  accessibilityRole="button"
                  accessibilityLabel={`${star}점`}
                >
                  <Text style={[styles.ratingStar, star <= selectedRating && styles.ratingStarActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="리뷰를 입력해 주세요 (선택)"
              placeholderTextColor={colors.gray400}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              maxLength={500}
              accessibilityLabel="리뷰 내용 입력"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setShowReviewModal(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn, isSubmittingReview && styles.modalBtnDisabled]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="리뷰 제출"
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>등록</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // ─── Map ──────────────────────────────────────────────────────────────────
  mapContainer: { height: spacing.storeMapH },
  map: { flex: 1 },

  // ─── Info Section ─────────────────────────────────────────────────────────
  infoSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  storeName: { ...typography.headingBase, flex: 1 },
  storeTypeBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  storeTypeText: { ...typography.caption, color: colors.white, fontWeight: '500' as const },
  storeAddress: { ...typography.tagText, color: colors.gray600, marginBottom: spacing.xxl },
  directionsButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  directionsButtonText: { ...typography.headingMd, color: colors.white },

  // ─── Section Header ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: { ...typography.headingMd, color: colors.onBackground },
  sectionCount: { ...typography.caption, color: colors.onSurfaceVariant },
  avgRating: { ...typography.captionBold, color: colors.warning },

  // ─── Price Row ────────────────────────────────────────────────────────────
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  priceRowLeft: { flex: 1, marginRight: spacing.md },
  priceRowProduct: { ...typography.bodyMd, color: colors.onBackground },
  priceRowMeta: { ...typography.caption, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  priceRowPrice: { ...typography.priceCard, color: colors.primary },

  // ─── Review Row ───────────────────────────────────────────────────────────
  reviewRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  reviewAvatar: {
    width: spacing.priceDetailVerifyAvatarSize,
    height: spacing.priceDetailVerifyAvatarSize,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  reviewAvatarText: { ...typography.captionBold, color: colors.primary },
  reviewBody: { flex: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  reviewNickname: { ...typography.bodySm, color: colors.onBackground },
  reviewStars: { ...typography.caption, color: colors.warning },
  reviewComment: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  reviewTime: { ...typography.caption, color: colors.gray400 },

  // ─── Add Review Button ────────────────────────────────────────────────────
  addReviewButton: {
    margin: spacing.lg,
    backgroundColor: colors.primaryContainer,
    borderRadius: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addReviewButtonText: { ...typography.bodyMd, color: colors.primary },

  // ─── Empty ────────────────────────────────────────────────────────────────
  emptySection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  emptySectionText: { ...typography.bodySm, color: colors.gray400 },

  bottomPadding: { height: spacing.xxl },

  // ─── Review Modal ─────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.modalOverlay },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: spacing.radiusXl,
    borderTopRightRadius: spacing.radiusXl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.headingBase, color: colors.onBackground, marginBottom: spacing.lg },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ratingStar: { fontSize: spacing.priceDetailRankCircleSm, color: colors.gray200 },
  ratingStarActive: { color: colors.warning },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: spacing.sm,
    padding: spacing.md,
    ...typography.bodySm,
    color: colors.onBackground,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalButtonRow: { flexDirection: 'row', gap: spacing.md },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
  },
  modalCancelBtn: { backgroundColor: colors.gray100 },
  modalCancelBtnText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  modalSubmitBtn: { backgroundColor: colors.primary },
  modalSubmitBtnText: { ...typography.bodyMd, color: colors.white },
  modalBtnDisabled: { opacity: 0.5 },
});

export default StoreDetailScreen;
