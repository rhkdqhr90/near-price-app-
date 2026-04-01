import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useStoreDetail, useStoreReviews, useAddStoreReview } from '../../hooks/queries/useStores';
import { useStorePrices } from '../../hooks/queries/usePrices';
import type { PriceResponse, StoreReviewResponse } from '../../types/api.types';
import LoadingView from '../../components/common/LoadingView';
import ErrorView from '../../components/common/ErrorView';
import { formatPrice, formatRelativeTime } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import axios from 'axios';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import { STORE_TYPE_LABELS } from '../../utils/constants';

type Props = HomeScreenProps<'StoreInfo'>;

// ─── PriceCard ─────────────────────────────────────────────────────────────

interface PriceCardProps {
  item: PriceResponse;
}

const PriceCard = memo<PriceCardProps>(({ item }) => (
  <View style={styles.priceCard}>
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

// ─── ReviewCard ────────────────────────────────────────────────────────────

interface ReviewCardProps {
  item: StoreReviewResponse;
}

const ReviewCard = memo<ReviewCardProps>(({ item }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewAvatar}>
      <Text style={styles.reviewAvatarText}>{item.user.nickname.charAt(0) || '?'}</Text>
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

const StoreInfoScreen: React.FC<Props> = ({ route, navigation }) => {
  const { storeId } = route.params;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: store, isLoading, isError, refetch } = useStoreDetail(storeId);
  const { data: pricesData, isLoading: isPricesLoading } = useStorePrices(storeId);
  const { data: reviewsData, isLoading: isReviewsLoading } = useStoreReviews(storeId);
  const { mutate: addReview, isPending: isSubmittingReview } = useAddStoreReview(storeId);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const headerPaddingTop = useMemo(() => insets.top + spacing.sm, [insets.top]);
  const scrollBottomPadding = useMemo(
    () => Math.max(insets.bottom, spacing.md) + spacing.xxl,
    [insets.bottom],
  );
  const modalSheetPaddingBottom = useMemo(
    () => Math.max(insets.bottom, spacing.md) + spacing.xl,
    [insets.bottom],
  );

  const handleSubmitReview = useCallback(() => {
    if (!user) {
      showToast('로그인이 필요합니다', 'error');
      return;
    }
    addReview(
      { rating: selectedRating, comment: reviewComment.trim() || undefined },
      {
        onSuccess: () => {
          showToast('리뷰가 등록됐어요!', 'success');
          setShowReviewModal(false);
          setReviewComment('');
          setSelectedRating(5);
        },
        onError: (error) => {
          if (axios.isAxiosError(error) && error.response?.status === 409) {
            showToast('이미 이 매장에 리뷰를 작성했어요', 'info');
            setShowReviewModal(false);
          } else {
            showToast('리뷰 등록에 실패했어요', 'error');
          }
        },
      },
    );
  }, [addReview, selectedRating, reviewComment, showToast, user]);

  if (isLoading) {
    return <LoadingView message="매장 정보를 불러오는 중..." />;
  }
  if (isError || !store) {
    return <ErrorView message="매장 정보를 불러오지 못했습니다" onRetry={refetch} />;
  }

  const prices = pricesData?.data ?? [];
  const reviews = reviewsData?.data ?? [];

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const userHasReview = !isReviewsLoading && user !== null && reviews.some((r) => r.user.id === user.id);

  const storeTypeLabel = STORE_TYPE_LABELS[store.type] ?? store.type;

  return (
    <View style={styles.root}>
      {/* ─── 헤더 ─── */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <ChevronLeftIcon size={spacing.iconMd} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>매장 정보</Text>
        {/* 대칭용 */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── 매장 기본 정보 ─── */}
        <View style={styles.storeInfoSection}>
          <View style={styles.storeHeaderRow}>
            <Text style={styles.storeName} numberOfLines={2}>{store.name}</Text>
            <View style={styles.storeTypeBadge}>
              <Text style={styles.storeTypeText}>{storeTypeLabel}</Text>
            </View>
          </View>
          <Text style={styles.storeAddress}>{store.address}</Text>
        </View>

        <View style={styles.divider} />

        {/* ─── 등록 가격 섹션 ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>이 매장의 등록 가격</Text>
          {pricesData && (
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{pricesData.total}개</Text>
            </View>
          )}
        </View>
        {isPricesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.sectionLoader} />
        ) : prices.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>아직 등록된 가격이 없어요</Text>
          </View>
        ) : (
          prices.map((item) => <PriceCard key={item.id} item={item} />)
        )}

        <View style={styles.sectionDivider} />

        {/* ─── 리뷰 섹션 ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>매장 리뷰</Text>
          {avgRating !== null && (
            <Text style={styles.avgRating}>
              ★ {avgRating.toFixed(1)} ({reviews.length}개)
            </Text>
          )}
        </View>
        {isReviewsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.sectionLoader} />
        ) : reviews.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>아직 리뷰가 없어요</Text>
          </View>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} item={r} />)
        )}

        {user && !userHasReview && (
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => setShowReviewModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="리뷰 작성"
          >
            <Text style={styles.addReviewButtonText}>리뷰 작성하기</Text>
          </TouchableOpacity>
        )}
        {user && userHasReview && (
          <View style={styles.reviewedBadge}>
            <Text style={styles.reviewedBadgeText}>내 리뷰가 등록됐어요</Text>
          </View>
        )}
      </ScrollView>

      {/* ─── 리뷰 작성 Modal ─── */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior="padding"
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowReviewModal(false)}
            accessibilityRole="button"
            accessibilityLabel="모달 닫기"
          />
          <View style={[styles.modalSheet, { paddingBottom: modalSheetPaddingBottom }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>매장 리뷰 작성</Text>

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
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn, isSubmittingReview && styles.modalBtnDisabled]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
                activeOpacity={0.8}
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
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // ─── 헤더 ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerLow,
  },
  backBtn: {
    width: spacing.buttonHeight,
    height: spacing.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headingBase,
    flex: 1,
    textAlign: 'center',
    color: colors.onBackground,
  },

  // ─── 스크롤 콘텐츠 ────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: spacing.lg,
  },

  // ─── 매장 기본 정보 ───────────────────────────────────────────────────────
  storeInfoSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  storeName: {
    ...typography.headingLg,
    flex: 1,
    color: colors.onBackground,
  },
  storeTypeBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  storeTypeText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  storeAddress: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  divider: {
    height: spacing.dividerThick,
    backgroundColor: colors.surfaceContainerLow,
  },

  // ─── 섹션 공통 ────────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.onBackground,
  },
  sectionCountBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
  },
  sectionCountText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  avgRating: {
    ...typography.captionBold,
    color: colors.warning,
  },
  sectionDivider: {
    height: spacing.dividerThick,
    backgroundColor: colors.surfaceContainerLow,
    marginTop: spacing.lg,
  },
  sectionLoader: {
    marginVertical: spacing.xl,
    alignSelf: 'center',
  },
  emptySection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptySectionText: { ...typography.bodySm, color: colors.gray400 },

  // ─── Price Card ───────────────────────────────────────────────────────────
  priceCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: spacing.cardShadowOpacityLight,
    shadowRadius: spacing.shadowRadiusSm,
    elevation: spacing.elevationXs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRowLeft: { flex: 1, marginRight: spacing.md },
  priceRowProduct: { ...typography.bodyMd, color: colors.onBackground },
  priceRowMeta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  priceRowPrice: { ...typography.priceCard, color: colors.primary },

  // ─── Review Card ──────────────────────────────────────────────────────────
  reviewCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: spacing.cardShadowOpacityLight,
    shadowRadius: spacing.shadowRadiusSm,
    elevation: spacing.elevationXs,
    flexDirection: 'row',
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
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewNickname: { ...typography.bodySm, color: colors.onBackground },
  reviewStars: { ...typography.caption, color: colors.warning },
  reviewComment: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  reviewTime: { ...typography.caption, color: colors.gray400 },

  // ─── 리뷰 작성 버튼 ──────────────────────────────────────────────────────
  addReviewButton: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addReviewButtonText: { ...typography.bodyMd, color: colors.primary },
  reviewedBadge: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  reviewedBadgeText: { ...typography.bodySm, color: colors.gray400 },

  // ─── 리뷰 작성 모달 ──────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
  },
  dragHandle: {
    width: spacing.dragHandleW,
    height: spacing.dragHandleH,
    backgroundColor: colors.gray200,
    borderRadius: spacing.radiusFull,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: spacing.radiusXl,
    borderTopRightRadius: spacing.radiusXl,
    padding: spacing.xl,
  },
  modalTitle: {
    ...typography.headingBase,
    color: colors.onBackground,
    marginBottom: spacing.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ratingStar: { fontSize: spacing.ratingStarSize, color: colors.gray200 },
  ratingStarActive: { color: colors.warning },
  reviewInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    ...typography.bodySm,
    color: colors.onBackground,
    minHeight: spacing.reviewInputMinHeight,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalButtonRow: { flexDirection: 'row', gap: spacing.md },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusFull,
    alignItems: 'center',
  },
  modalCancelBtn: { backgroundColor: colors.gray100 },
  modalCancelBtnText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  modalSubmitBtn: { backgroundColor: colors.primary },
  modalSubmitBtnText: { ...typography.bodyMd, color: colors.white },
  modalBtnDisabled: { opacity: 0.5 },
});

export default StoreInfoScreen;
