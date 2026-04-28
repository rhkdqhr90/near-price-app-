import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from '../../components/map/MapViewWrapper';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import type { CreateStoreDto, StoreType } from '../../types/api.types';
import { storeApi } from '../../api/store.api';
import { vworldApi } from '../../api/vworld.api';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { useStoreTypes } from '../../hooks/useStoreTypes';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = PriceRegisterScreenProps<'StoreRegister'>;

const StoreRegisterScreen: React.FC<Props> = ({ route, navigation }) => {
  const { latitude, longitude } = route.params;
  const insets = useSafeAreaInsets();
  const { setStore } = usePriceRegisterStore();
  const { storeTypes, addStoreType } = useStoreTypes();

  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeType, setStoreType] = useState<StoreType | string>('mart');
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  // GPS 주소 자동 채우기
  const handleAutoFillAddress = useCallback(() => {
    setInlineError(null);
    setIsAutoFilling(true);
    vworldApi.reverseGeocodeFullAddress(longitude, latitude)
      .then(address => {
        if (address) {
          setStoreAddress(address);
          if (errors.address) setErrors(prev => ({ ...prev, address: undefined }));
        } else {
          setInlineError('주소를 자동으로 찾지 못했습니다. 주소를 직접 입력해 주세요.');
        }
      })
      .catch(() => setInlineError('주소 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setIsAutoFilling(false));
  }, [latitude, longitude, errors.address]);

  // 매장 등록
  const { mutate: createStore, isPending: isCreating } = useMutation({
    mutationFn: (dto: CreateStoreDto) => storeApi.create(dto).then(r => r.data),
    onSuccess: created => {
      if (!created?.id || !created?.name) {
        setInlineError('매장 등록에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요.');
        return;
      }
      setInlineError(null);
      setStore(created.id, created.name);
      navigation.navigate('InputMethod');
    },
    onError: () => setInlineError('매장 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
  });

  const handleSubmit = useCallback(() => {
    const errs: { name?: string; address?: string } = {};
    if (!storeName.trim()) errs.name = '매장명을 입력해주세요.';
    if (!storeAddress.trim()) errs.address = '주소를 입력해주세요.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    createStore({
      name: storeName.trim(),
      type: storeType,
      latitude,
      longitude,
      address: storeAddress.trim(),
    });
  }, [storeName, storeAddress, storeType, latitude, longitude, createStore]);

  const handleAddType = useCallback(async () => {
    if (!newTypeInput.trim()) return;
    const ok = await addStoreType(newTypeInput.trim());
    if (ok) {
      setInlineError(null);
      setNewTypeInput('');
      setShowAddType(false);
    } else {
      setInlineError('이미 존재하는 카테고리입니다. 다른 이름을 사용해 주세요.');
    }
  }, [newTypeInput, addStoreType]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 지도 */}
      <MapViewWrapper
        style={styles.map}
        initialCamera={{ latitude, longitude, zoom: 17 }}
        isShowLocationButton={false}
        isShowZoomControls={false}
        isScrollGesturesEnabled={false}
        isZoomGesturesEnabled={false}
        mapType="Basic"
        locale="ko"
      >
        <NaverMapMarkerOverlay
          latitude={latitude}
          longitude={longitude}
          tintColor={colors.primary}
        />
      </MapViewWrapper>

      {/* 뒤로가기 */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + spacing.sm }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
      >
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* 폼 */}
      <ScrollView
        style={styles.form}
        contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>새 매장 등록</Text>

        {inlineError ? (
          <View
            style={styles.errorBanner}
            accessible={true}
            accessibilityLiveRegion="polite"
            accessibilityLabel={`오류: ${inlineError}`}
          >
            <Text style={styles.errorBannerText}>{inlineError}</Text>
            <TouchableOpacity
              onPress={() => setInlineError(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="오류 메시지 닫기"
            >
              <Text style={styles.errorBannerClose}>닫기</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 매장명 */}
        <Text style={styles.label}>매장명 *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={storeName}
          onChangeText={v => { setStoreName(v); if (v.trim()) setErrors(p => ({ ...p, name: undefined })); }}
          placeholder="예: 우리마트 광교점"
          placeholderTextColor={colors.gray400}
          accessibilityLabel="매장명"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        {/* 주소 */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>주소 *</Text>
          <TouchableOpacity onPress={handleAutoFillAddress} disabled={isAutoFilling} activeOpacity={0.7}>
            <Text style={styles.autoFillBtn}>{isAutoFilling ? '조회 중...' : 'GPS로 자동 채우기'}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, errors.address && styles.inputError]}
          value={storeAddress}
          onChangeText={v => { setStoreAddress(v); if (v.trim()) setErrors(p => ({ ...p, address: undefined })); }}
          placeholder="예: 서울 강남구 테헤란로 123"
          placeholderTextColor={colors.gray400}
          accessibilityLabel="주소"
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

        {/* 매장 유형 */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>매장 유형</Text>
          {!showAddType && (
            <TouchableOpacity onPress={() => setShowAddType(true)} activeOpacity={0.7}>
              <Text style={styles.autoFillBtn}>+ 추가</Text>
            </TouchableOpacity>
          )}
        </View>
        {showAddType && (
          <View style={styles.addTypeRow}>
            <TextInput
              style={[styles.input, styles.addTypeInput]}
              value={newTypeInput}
              onChangeText={setNewTypeInput}
              placeholder="예: 약국"
              placeholderTextColor={colors.gray400}
            />
            <TouchableOpacity style={styles.addTypeConfirm} onPress={handleAddType}>
              <Text style={styles.addTypeConfirmText}>추가</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addTypeCancel} onPress={() => { setShowAddType(false); setNewTypeInput(''); }}>
              <Text style={styles.addTypeCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.typeChips}>
          {storeTypes.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.typeChip, storeType === opt.value && styles.typeChipActive]}
              onPress={() => setStoreType(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: storeType === opt.value }}
            >
              <Text style={[styles.typeChipText, storeType === opt.value && styles.typeChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 등록 버튼 */}
        <TouchableOpacity
          style={[styles.submitBtn, isCreating && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isCreating}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isCreating ? '등록 중' : '매장 등록하기'}
        >
          <Text style={styles.submitBtnText}>{isCreating ? '등록 중...' : '등록하기'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  map: { height: 200 },
  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: spacing.backBtnSize, height: spacing.backBtnSize,
    borderRadius: spacing.backBtnSize / 2,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    zIndex: 10,
  },
  backBtnText: { fontSize: 20, color: colors.black },
  form: { flex: 1 },
  formContent: { padding: spacing.xl },
  title: { ...typography.headingXl, marginBottom: spacing.lg },
  errorBanner: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.radiusSm,
    borderWidth: spacing.borderHairline,
    borderColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  errorBannerClose: {
    ...typography.captionBold,
    color: colors.danger,
  },
  label: { ...typography.bodySm, fontWeight: '600' as const, color: colors.gray600, marginBottom: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xs },
  autoFillBtn: { ...typography.bodySm, color: colors.primary, fontWeight: '600' as const, textDecorationLine: 'underline' as const },
  input: {
    backgroundColor: colors.gray100, borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, borderWidth: 1, borderColor: 'transparent',
  },
  inputError: { borderColor: colors.danger },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  typeChip: {
    backgroundColor: colors.gray100, borderRadius: spacing.radiusFull,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  typeChipActive: { backgroundColor: colors.primary },
  typeChipText: { ...typography.bodySm, color: colors.gray600 },
  typeChipTextActive: { color: colors.white },
  addTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' },
  addTypeInput: { flex: 1 },
  addTypeConfirm: { backgroundColor: colors.primary, borderRadius: spacing.radiusMd, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  addTypeConfirmText: { ...typography.bodySm, fontWeight: '600' as const, color: colors.white },
  addTypeCancel: { backgroundColor: colors.gray200, borderRadius: spacing.radiusMd, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  addTypeCancelText: { ...typography.bodySm, fontWeight: '600' as const, color: colors.gray600 },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: spacing.radiusMd,
    paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.gray400 },
  submitBtnText: { ...typography.headingMd, color: colors.white },
});

export default StoreRegisterScreen;
