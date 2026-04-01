import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Alert, InteractionManager, type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StackActions } from '@react-navigation/native';
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
      let failedCount = 0;
      for (let i = 0; i < confirmItems.length; i++) {
        if (succeededIndicesRef.current.includes(i)) continue;
        const item = confirmItems[i];
        try {
          let imageUrl = '';
          if (item.imageUri) {
            const upload = await uploadApi.uploadImage(item.imageUri, 'price.jpg', 'image/jpeg');
            imageUrl = upload.data?.url ?? '';
          }
          let productId = item.productId;
          if (!productId) {
            const product = await productApi.create({
              name: item.productName,
              category: 'other',
              unitType: item.unitType ?? 'other',
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
          };
          await priceApi.create(dto);
          succeededIndicesRef.current.push(i);
        } catch {
          failedCount += 1;
        }
      }
      if (failedCount > 0) {
        throw new Error(`${failedCount}개 항목 등록 실패`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceKeys.all });
      showToast('가격 등록이 완료됐어요!', 'success');
      InteractionManager.runAfterInteractions(() => {
        navigation.dispatch(StackActions.popToTop());
        // 'as never' — React Navigation CompositeScreenProps 타입 추론 한계로 인한 워크어라운드
        navigation.getParent()?.navigate('HomeStack' as never);
        reset();
      });
    },
    onError: () => {
      // 이미 성공한 항목을 store에서 역순으로 제거하여 중복 등록 방지
      const succeeded = [...succeededIndicesRef.current].sort((a, b) => b - a);
      succeeded.forEach((idx) => removeItem(idx));
      succeededIndicesRef.current = [];
      showToast('일부 항목 등록에 실패했어요. 전체 등록을 다시 눌러주세요.', 'error');
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
        <Text style={styles.headerTitle}>{storeName ?? ''}</Text>
        <Text style={styles.headerSub}>총 {items.length}개 항목</Text>
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
  container: { flex: 1, backgroundColor: colors.gray100 },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  headerTitle: { ...typography.headingXl },
  headerSub: { ...typography.bodySm, marginTop: spacing.micro },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.gray200,
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.gray200,
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
