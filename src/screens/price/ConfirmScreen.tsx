import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Alert, InteractionManager, type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import type { CreatePriceDto } from '../../types/api.types';
import type { ConfirmItem } from '../../store/priceRegisterStore';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { priceApi } from '../../api/price.api';
import { productApi } from '../../api/product.api';
import { uploadApi } from '../../api/upload.api';
import { priceKeys } from '../../hooks/queries/usePrices';
import { formatPrice } from '../../utils/format';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useToastStore } from '../../store/toastStore';
import { getUnitLabel } from '../../utils/unitLabel';
import { getErrorMessage } from '../../utils/apiError';

type Props = PriceRegisterScreenProps<'Confirm'>;

const ConfirmScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const { storeId, storeName, items, removeItem, reset } = usePriceRegisterStore();
  // 부분 성공한 항목 인덱스 추적 (중복 등록 방지)
  const succeededIndicesRef = useRef<number[]>([]);

  const { mutate: submitAll, isPending } = useMutation({
    mutationFn: async (confirmItems: ConfirmItem[]) => {
      if (!storeId) throw new Error('매장 정보가 없습니다.');
      for (let i = 0; i < confirmItems.length; i++) {
        if (succeededIndicesRef.current.includes(i)) continue;
        const item = confirmItems[i];
        try {
          let imageUrl = '';
          if (item.imageUri) {
            const upload = await uploadApi
              .uploadImage(item.imageUri, 'price.jpg', 'image/jpeg')
              .catch((error) => {
                throw new Error(`이미지 업로드 실패: ${getErrorMessage(error)}`);
              });
            imageUrl = upload.data?.url ?? '';
          }
          let productId = item.productId;
          if (!productId) {
            const product = await productApi
              .create({
                name: item.productName,
                category: 'other',
                unitType: item.unitType ?? 'other',
              })
              .catch((error) => {
                throw new Error(`상품 생성 실패: ${getErrorMessage(error)}`);
              });
            productId = product.data.id;
          }
          const dto: CreatePriceDto = {
            storeId,
            productId,
            price: item.price,
            imageUrl,
            quantity: item.quantity,
            saleStartDate: item.eventStart,
            saleEndDate: item.eventEnd,
            condition: item.condition,
            // ── 가격표(PriceTag) 필드 ──
            priceTagType: item.priceTagType ?? 'normal',
            originalPrice: item.originalPrice,
            bundleType: item.bundleType,
            bundleQty: item.bundleQty,
            flatGroupName: item.flatGroupName,
            memberPrice: item.memberPrice,
            endsAt: item.endsAt,
            cardLabel: item.cardLabel,
            cardDiscountType: item.cardDiscountType,
            cardDiscountValue: item.cardDiscountValue,
            cardConditionNote: item.cardConditionNote,
            note: item.memo,
          };
          await priceApi.create(dto).catch((error) => {
            throw new Error(`가격 저장 실패: ${getErrorMessage(error)}`);
          });
          succeededIndicesRef.current.push(i);
        } catch (error) {
          const reason =
            error instanceof Error && error.message
              ? error.message
              : getErrorMessage(error);
          throw new Error(`${item.productName} 등록 실패: ${reason}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceKeys.all });
      showToast('가격 등록이 완료됐어요!', 'success');

      const successIndices =
        succeededIndicesRef.current.length > 0
          ? [...succeededIndicesRef.current]
          : items.map((_, idx) => idx);
      const firstSuccessItem =
        successIndices.length > 0 ? items[successIndices[0]] : items[0];

      InteractionManager.runAfterInteractions(() => {
        navigation.replace('Done', {
          itemCount: successIndices.length,
          storeName: storeName ?? undefined,
          firstItemName: firstSuccessItem?.productName,
          firstItemPrice: firstSuccessItem?.price,
        });
        reset();
        succeededIndicesRef.current = [];
      });
    },
    onError: (error) => {
      // 이미 성공한 항목을 store에서 역순으로 제거하여 중복 등록 방지
      const succeeded = [...succeededIndicesRef.current].sort((a, b) => b - a);
      succeeded.forEach((idx) => removeItem(idx));
      succeededIndicesRef.current = [];
      const message =
        error instanceof Error && error.message
          ? error.message
          : '일부 항목 등록에 실패했어요. 전체 등록을 다시 눌러주세요.';
      showToast(message, 'error');
    },
  });

  // 등록 진행 중 뒤로가기 차단 — 재마운트 후 부분 성공 항목 재등록 방지
  useEffect(() => {
    if (!isPending) return;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert('등록 중', '가격 등록이 진행 중입니다. 잠시만 기다려주세요.');
    });
  }, [navigation, isPending]);

  const handleDelete = useCallback((index: number) => {
    Alert.alert('삭제', '이 항목을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeItem(index) },
    ]);
  }, [removeItem]);

  const handleEdit = useCallback((index: number) => {
    const item = items[index];
    navigation.navigate('ItemDetail', {
      imageUri: item.imageUri,
      initialName: item.productName,
      initialPrice: String(item.price),
      editIndex: index,
      initialProductId: item.productId,
      initialUnitType: item.unitType,
      initialQuantity: item.quantity !== undefined ? String(item.quantity) : undefined,
      initialQuality: item.quality,
      initialMemo: item.memo,
      initialHasEvent: item.eventStart !== undefined || item.eventEnd !== undefined,
      initialEventStart: item.eventStart,
      initialEventEnd: item.eventEnd,
      // ── PriceTag 편집 복원용 (누락 시 수정 후 저장하면 priceTagType이 'normal'로 초기화됨) ──
      initialPriceTagType: item.priceTagType,
      initialOriginalPrice: item.originalPrice,
      initialBundleType: item.bundleType,
      initialBundleQty: item.bundleQty,
      initialFlatGroupName: item.flatGroupName,
      initialMemberPrice: item.memberPrice,
      initialEndsAt: item.endsAt,
      initialCardLabel: item.cardLabel,
      initialCardDiscountType: item.cardDiscountType,
      initialCardDiscountValue: item.cardDiscountValue,
      initialCardConditionNote: item.cardConditionNote,
    });
  }, [items, navigation]);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<ConfirmItem>) => (
    <View style={styles.itemCard}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.itemThumb} resizeMode="cover" accessibilityRole="image" accessibilityLabel={`${item.productName} 사진`} />
      ) : (
        <View style={styles.itemThumbPlaceholder} />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
        <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
        {item.unitType ? (
          <Text style={styles.itemUnit}>{getUnitLabel(item.unitType)}{item.quantity ? ` ${item.quantity}` : ''}</Text>
        ) : null}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(index)} disabled={isPending} accessibilityRole="button" accessibilityLabel={`${item.productName} 수정`}>
          <Text style={styles.editBtnText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(index)} disabled={isPending} accessibilityRole="button" accessibilityLabel={`${item.productName} 삭제`}>
          <Text style={styles.deleteBtnText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [handleEdit, handleDelete, isPending]);

  const handleSubmit = useCallback(() => {
    if (items.length === 0) {
      Alert.alert('알림', '등록할 항목이 없습니다.');
      return;
    }
    if (isPending) return;
    submitAll(items);
  }, [items, submitAll, isPending]);

  const containerStyle = useMemo(
    () => [styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }],
    [insets.bottom],
  );

  return (
    <View style={containerStyle}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.kicker}>FINAL STEP</Text>
        <Text style={styles.headerTitle}>등록 내역 확인</Text>
        <View style={styles.headerMeta}>
          {storeName ? <Text style={styles.headerStore} numberOfLines={1}>{storeName}</Text> : null}
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{items.length}개</Text>
          </View>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>등록할 항목이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (isPending || items.length === 0) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={isPending || items.length === 0}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isPending ? '등록 중' : `전체 등록 ${items.length}개`}
          accessibilityState={{ disabled: isPending || items.length === 0 }}
        >
          <Text style={styles.submitBtnText}>
            {isPending ? '등록 중...' : `전체 등록 (${items.length}개)`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  kicker: {
    ...typography.tabLabel,
    fontWeight: '800' as const,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  headerTitle: {
    ...typography.headingXl,
    marginTop: spacing.xs,
    color: colors.onBackground,
    letterSpacing: -0.5,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  headerStore: {
    ...typography.bodySm,
    color: colors.gray600,
    flex: 1,
  },
  countPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  countPillText: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    marginBottom: spacing.cardGap,
    gap: spacing.md,
  },
  itemThumb: { width: spacing.cameraControlSize, height: spacing.cameraControlSize, borderRadius: spacing.radiusMd },
  itemThumbPlaceholder: {
    width: spacing.cameraControlSize, height: spacing.cameraControlSize, borderRadius: spacing.radiusMd, backgroundColor: colors.gray100,
  },
  itemInfo: { flex: 1 },
  itemName: { ...typography.headingMd, marginBottom: spacing.cardTextGap },
  itemPrice: { ...typography.price },
  itemUnit: { ...typography.bodySm, color: colors.gray600, marginTop: spacing.micro },
  itemActions: { gap: spacing.xs + spacing.micro },
  editBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.sm,
    paddingVertical: spacing.xs + spacing.micro,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  editBtnText: { ...typography.bodySm, fontWeight: '600' as const, color: colors.primary },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.sm,
    paddingVertical: spacing.xs + spacing.micro,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { ...typography.bodySm, fontWeight: '600' as const, color: colors.danger },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.gray600 },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: spacing.borderHairline,
    borderTopColor: colors.outlineVariant,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitBtnText: { ...typography.headingLg, color: colors.white },
  btnDisabled: { backgroundColor: colors.gray400 },
});

export default ConfirmScreen;
