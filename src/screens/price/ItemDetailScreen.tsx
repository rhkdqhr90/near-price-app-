import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Image, LayoutAnimation,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import type {
  BundleType,
  CardDiscountType,
  PriceTagType,
  UnitType,
} from '../../types/api.types';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { useSearchProducts } from '../../hooks/queries/useProducts';
import { colors, priceTagGradients } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import CameraIcon from '../../components/icons/CameraIcon';
import ChevronDownIcon from '../../components/icons/ChevronDownIcon';
import ChevronUpIcon from '../../components/icons/ChevronUpIcon';

type Props = PriceRegisterScreenProps<'ItemDetail'>;

const PRICE_TAG_OPTIONS: { label: string; value: PriceTagType }[] = [
  { label: '일반가', value: 'normal' },
  { label: '할인가', value: 'sale' },
  { label: '특가', value: 'special' },
  { label: '마감할인', value: 'closing' },
  { label: '묶음', value: 'bundle' },
  { label: '균일가', value: 'flat' },
  { label: '회원가', value: 'member' },
  { label: '카드할인', value: 'cardPayment' },
];

const BUNDLE_OPTIONS: { label: string; value: BundleType; qty: number }[] = [
  { label: '1+1', value: '1+1', qty: 2 },
  { label: '2+1', value: '2+1', qty: 3 },
  { label: '3+1', value: '3+1', qty: 4 },
];

const CARD_DISCOUNT_OPTIONS: { label: string; value: CardDiscountType }[] = [
  { label: '원 할인', value: 'amount' },
  { label: '% 할인', value: 'percent' },
];

// 레퍼런스 `마실 2/screens-register.jsx` 단위 라벨: kg / g / 개 / 구 / 팩 / 근 / 직접입력
const UNIT_OPTIONS: { label: string; value: UnitType }[] = [
  { label: 'kg', value: 'kg' },
  { label: 'g', value: 'g' },
  { label: '개', value: 'count' },
  { label: '구', value: 'bunch' },
  { label: '팩', value: 'pack' },
  { label: '봉', value: 'bag' },
  { label: '기타', value: 'other' },
];

// 단위 카테고리별 UX 메타: 필드 라벨 + placeholder + 입력 설명
const WEIGHT_UNITS: UnitType[] = ['kg', 'g', 'ml', 'l'];
const COUNT_UNITS: UnitType[] = ['count', 'bunch', 'pack', 'bag'];
function getUnitInputMeta(unit: UnitType | undefined): {
  label: string;
  placeholder: string;
} {
  if (!unit) return { label: '단위 · 수량', placeholder: '수량 (예: 1, 30, 600)' };
  if (WEIGHT_UNITS.includes(unit)) {
    return {
      label: `${unit} 기준 중량 · 용량`,
      placeholder: `숫자만 입력 (예: 500)`,
    };
  }
  if (COUNT_UNITS.includes(unit)) {
    return { label: '수량', placeholder: '숫자만 입력 (예: 1)' };
  }
  return { label: '수량', placeholder: '수량을 입력하세요' };
}

const QUALITY_OPTIONS = [
  { label: '상', value: 'HIGH' as const },
  { label: '중', value: 'MID' as const },
  { label: '하', value: 'LOW' as const },
];

interface FormErrors {
  productName?: string;
  price?: string;
  eventDate?: string;
  originalPrice?: string;
  bundleType?: string;
  flatGroupName?: string;
  memberPrice?: string;
  endsAt?: string;
  cardLabel?: string;
  cardDiscountType?: string;
  cardDiscountValue?: string;
}

const parseDateString = (s: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ItemDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    imageUri: paramImageUri,
    initialName = '',
    initialPrice = '',
    editIndex,
    initialUnitType,
    initialQuantity,
    initialQuality,
    initialMemo,
    initialHasEvent,
    initialEventStart,
    initialEventEnd,
    initialProductId,
    initialPriceTagType,
    initialOriginalPrice,
    initialBundleType,
    initialBundleQty,
    initialFlatGroupName,
    initialMemberPrice,
    initialEndsAt,
    initialCardLabel,
    initialCardDiscountType,
    initialCardDiscountValue,
    initialCardConditionNote,
  } = route.params;

  const { storeName, addItem, updateItem, items } = usePriceRegisterStore();

  const [productName, setProductName] = useState(initialName);
  const [price, setPrice] = useState(initialPrice);
  const [quantity, setQuantity] = useState(initialQuantity ?? '');
  const [selectedUnit, setSelectedUnit] = useState<UnitType | undefined>(initialUnitType);
  const [imageUri, setImageUri] = useState<string | undefined>(paramImageUri);
  const [hasEvent, setHasEvent] = useState(initialHasEvent ?? false);
  const [eventStart, setEventStart] = useState(initialEventStart ?? '');
  const [eventEnd, setEventEnd] = useState(initialEventEnd ?? '');
  const [quality, setQuality] = useState<'HIGH' | 'MID' | 'LOW' | undefined>(initialQuality);
  const [memo, setMemo] = useState(initialMemo ?? '');
  const [productId, setProductId] = useState<string | undefined>(initialProductId);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 가격표(PriceTag) 상태 ──
  const [priceTagType, setPriceTagType] = useState<PriceTagType>(
    initialPriceTagType ?? 'normal',
  );
  const [originalPrice, setOriginalPrice] = useState(
    initialOriginalPrice != null ? String(initialOriginalPrice) : '',
  );
  const [bundleType, setBundleType] = useState<BundleType | undefined>(initialBundleType);
  const [bundleQty, setBundleQty] = useState<number | undefined>(initialBundleQty);
  const [flatGroupName, setFlatGroupName] = useState(initialFlatGroupName ?? '');
  const [memberPrice, setMemberPrice] = useState(
    initialMemberPrice != null ? String(initialMemberPrice) : '',
  );
  const [endsAt, setEndsAt] = useState(initialEndsAt ?? '');
  const [cardLabel, setCardLabel] = useState(initialCardLabel ?? '');
  const [cardDiscountType, setCardDiscountType] = useState<CardDiscountType | undefined>(
    initialCardDiscountType,
  );
  const [cardDiscountValue, setCardDiscountValue] = useState(
    initialCardDiscountValue != null ? String(initialCardDiscountValue) : '',
  );
  const [cardConditionNote, setCardConditionNote] = useState(initialCardConditionNote ?? '');
  const [showEndsAtPicker, setShowEndsAtPicker] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // 레퍼런스 RegisterItemForm 에는 노출되지 않는 고급 옵션 — 접이식 처리
  const [expandPriceTag, setExpandPriceTag] = useState(
    (initialPriceTagType ?? 'normal') !== 'normal',
  );
  const [expandMemo, setExpandMemo] = useState(!!(initialMemo && initialMemo.length));

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  const { data: suggestions } = useSearchProducts(productName.trim());

  const handleProductNameChange = useCallback((v: string) => {
    setProductName(v);
    setProductId(undefined);
    setShowSuggestions(true);
    if (v.trim()) setErrors((prev) => ({ ...prev, productName: undefined }));
  }, []);

  const handlePriceChange = useCallback((v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    setPrice(cleaned);
    const num = parseInt(cleaned, 10);
    if (cleaned && !isNaN(num) && num > 0) {
      setErrors((prev) => ({ ...prev, price: undefined }));
    }
  }, []);

  const handleTodayOnly = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setEventStart(today);
    setEventEnd(today);
    setErrors((prev) => ({ ...prev, eventDate: undefined }));
  }, []);

  const handleStartDateChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (date) {
      setEventStart(formatDate(date));
      setErrors((prev) => ({ ...prev, eventDate: undefined }));
    }
  }, []);

  const handleEndDateChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (date) {
      setEventEnd(formatDate(date));
      setErrors((prev) => ({ ...prev, eventDate: undefined }));
    }
  }, []);

  const handlePickImage = useCallback(() => {
    Alert.alert('사진 선택', '사진을 선택하는 방법을 선택해주세요.', [
      { text: '카메라', onPress: () => {
        launchCamera({ mediaType: 'photo', quality: 0.8 }, res => {
          const uri = res.assets?.[0]?.uri;
          if (uri) setImageUri(uri);
        });
      }},
      { text: '갤러리', onPress: () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, res => {
          const uri = res.assets?.[0]?.uri;
          if (uri) setImageUri(uri);
        });
      }},
      { text: '취소', style: 'cancel' },
    ]);
  }, []);

  const handleSubmit = useCallback(() => {
    const newErrors: FormErrors = {};
    let hasError = false;

    if (!productName.trim()) {
      newErrors.productName = '상품명을 입력해주세요.';
      hasError = true;
    }

    const priceNum = parseInt(price, 10);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = '올바른 가격을 입력해주세요.';
      hasError = true;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (hasEvent && (!dateRegex.test(eventStart) || !dateRegex.test(eventEnd))) {
      newErrors.eventDate = '이벤트 시작일과 종료일을 선택해주세요.';
      hasError = true;
    }

    const originalPriceNum = parseInt(originalPrice, 10);
    const memberPriceNum = parseInt(memberPrice, 10);
    const cardDiscountValueNum = parseInt(cardDiscountValue, 10);

    if (priceTagType === 'sale' || priceTagType === 'closing' || priceTagType === 'cardPayment') {
      if (!originalPrice || isNaN(originalPriceNum) || originalPriceNum <= 0) {
        newErrors.originalPrice = '원가를 입력해주세요.';
        hasError = true;
      }
    }
    if (priceTagType === 'bundle' && !bundleType) {
      newErrors.bundleType = '묶음 타입을 선택해주세요.';
      hasError = true;
    }
    if (priceTagType === 'flat' && !flatGroupName.trim()) {
      newErrors.flatGroupName = '균일가 그룹명을 입력해주세요.';
      hasError = true;
    }
    if (priceTagType === 'member') {
      if (!memberPrice || isNaN(memberPriceNum) || memberPriceNum <= 0) {
        newErrors.memberPrice = '비회원가를 입력해주세요.';
        hasError = true;
      }
    }
    if (priceTagType === 'closing' && !endsAt) {
      newErrors.endsAt = '마감 시각을 선택해주세요.';
      hasError = true;
    }
    if (priceTagType === 'cardPayment') {
      if (!cardLabel.trim()) {
        newErrors.cardLabel = '카드명을 입력해주세요.';
        hasError = true;
      }
      if (!cardDiscountType) {
        newErrors.cardDiscountType = '할인 타입을 선택해주세요.';
        hasError = true;
      }
      if (!cardDiscountValue || isNaN(cardDiscountValueNum) || cardDiscountValueNum <= 0) {
        newErrors.cardDiscountValue = '할인 값을 입력해주세요.';
        hasError = true;
      }
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const item = {
      productId,
      productName: productName.trim(),
      price: priceNum,
      unitType: selectedUnit,
      quantity: quantity ? parseInt(quantity, 10) : undefined,
      imageUri,
      condition: hasEvent ? '이벤트중' : undefined,
      quality,
      memo: memo.trim() || undefined,
      eventStart: hasEvent ? eventStart : undefined,
      eventEnd: hasEvent ? eventEnd : undefined,
      priceTagType,
      originalPrice:
        priceTagType === 'sale' || priceTagType === 'closing' || priceTagType === 'cardPayment'
          ? originalPriceNum
          : undefined,
      bundleType: priceTagType === 'bundle' ? bundleType : undefined,
      bundleQty: priceTagType === 'bundle' ? bundleQty : undefined,
      flatGroupName: priceTagType === 'flat' ? flatGroupName.trim() : undefined,
      memberPrice: priceTagType === 'member' ? memberPriceNum : undefined,
      endsAt: priceTagType === 'closing' ? endsAt : undefined,
      cardLabel: priceTagType === 'cardPayment' ? cardLabel.trim() : undefined,
      cardDiscountType: priceTagType === 'cardPayment' ? cardDiscountType : undefined,
      cardDiscountValue: priceTagType === 'cardPayment' ? cardDiscountValueNum : undefined,
      cardConditionNote:
        priceTagType === 'cardPayment' && cardConditionNote.trim()
          ? cardConditionNote.trim()
          : undefined,
    };

    if (editIndex !== undefined) {
      updateItem(editIndex, item);
      navigation.navigate('Confirm');
    } else {
      addItem(item);
      Alert.alert(
        '등록 완료',
        `${item.productName}이(가) 추가됐어요.\n같은 매장에서 더 등록할까요?`,
        [
          { text: '더 등록할게요', onPress: () => navigation.navigate('InputMethod') },
          { text: '완료할게요', onPress: () => navigation.navigate('Confirm') },
        ],
      );
    }
  }, [
    productName, price, productId, selectedUnit, quantity,
    imageUri, hasEvent, eventStart, eventEnd, quality, memo,
    priceTagType, originalPrice, bundleType, bundleQty, flatGroupName,
    memberPrice, endsAt, cardLabel, cardDiscountType, cardDiscountValue,
    cardConditionNote,
    editIndex, addItem, updateItem, navigation,
  ]);

  const totalItems = items.length;
  const fromOcr =
    editIndex === undefined &&
    !!paramImageUri &&
    ((initialName?.length ?? 0) > 0 || (initialPrice?.length ?? 0) > 0);
  const containerStyle = useMemo(
    () => [styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }],
    [insets.bottom],
  );

  const submitDisabled = !productName.trim() || !price;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={containerStyle}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 3 / 3 · 매장명 */}
        <Text style={styles.kickerText} numberOfLines={1}>
          STEP 3 / 3{storeName ? ` · ${storeName}` : ''}
        </Text>

        {/* OCR 성공 배너 */}
        {fromOcr && (
          <View style={styles.ocrBanner}>
            <Text style={styles.ocrBannerIcon}>✨</Text>
            <Text style={styles.ocrBannerText}>AI가 가격표에서 정보를 인식했어요</Text>
          </View>
        )}

        {/* 상품명 */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            상품명 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.productName ? styles.inputError : undefined]}
            value={productName}
            onChangeText={handleProductNameChange}
            onBlur={() => setShowSuggestions(false)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="예: 양파, 계란, 삼겹살"
            placeholderTextColor={colors.gray400}
            accessibilityLabel="상품명"
          />
          {errors.productName ? (
            <Text style={styles.errorText}>{errors.productName}</Text>
          ) : null}
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.slice(0, 5).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.suggestionItem}
                  accessibilityRole="button"
                  accessibilityLabel={`추천 상품 ${p.name}`}
                  onPress={() => {
                    setProductName(p.name);
                    setProductId(p.id);
                    // unitType은 Price 속성으로 이관됨 — 사용자가 단위 칩에서 직접 선택.
                    setShowSuggestions(false);
                  }}
                  onPressIn={() => {
                    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                  }}
                >
                  <Text style={styles.suggestionText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 가격 — 레퍼런스 inputWrap: 오른쪽정렬 큰 숫자 + 원 suffix */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            가격 <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.priceWrap, errors.price ? styles.inputError : undefined]}>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={handlePriceChange}
              placeholder="0"
              placeholderTextColor={colors.gray400}
              keyboardType="numeric"
              accessibilityLabel="가격"
            />
            <Text style={styles.priceSuffix}>원</Text>
          </View>
          {errors.price ? (
            <Text style={styles.errorText}>{errors.price}</Text>
          ) : null}
        </View>

        {/* 단위 · 수량 (단위별 라벨/placeholder 동적) */}
        {(() => {
          const meta = getUnitInputMeta(selectedUnit);
          return (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{meta.label}</Text>
              <View style={styles.chipRow}>
                {UNIT_OPTIONS.map(opt => {
                  const active = selectedUnit === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, active && styles.chipInkActive]}
                      onPress={() => setSelectedUnit(active ? undefined : opt.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`단위 ${opt.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextInkActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedUnit && (
                <TextInput
                  style={[styles.input, styles.quantityInput]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={meta.placeholder}
                  placeholderTextColor={colors.gray400}
                  keyboardType="numeric"
                  accessibilityLabel={meta.label}
                />
              )}
            </View>
          );
        })()}

        {/* 할인 중인가요? — 레퍼런스 커스텀 pill 토글 */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>할인 중인가요?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleTrack, hasEvent && styles.toggleTrackOn]}
              onPress={() => setHasEvent(!hasEvent)}
              activeOpacity={0.8}
              accessibilityRole="switch"
              accessibilityState={{ checked: hasEvent }}
              accessibilityLabel="할인 중인가요?"
            >
              <View style={[styles.toggleThumb, hasEvent && styles.toggleThumbOn]} />
            </TouchableOpacity>
            <Text style={styles.toggleHelper}>
              {hasEvent ? '기간/할인율 상세 설정 가능' : '정가'}
            </Text>
          </View>

          {hasEvent && (
            <View style={styles.dateSection}>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.datePickerBtn, errors.eventDate ? styles.inputError : undefined]}
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={eventStart ? `시작일 ${eventStart}` : '시작일 선택'}
                >
                  <Text style={[styles.datePickerText, !eventStart && styles.datePickerPlaceholder]}>
                    {eventStart || '시작일 선택'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.dateSep}>~</Text>
                <TouchableOpacity
                  style={[styles.datePickerBtn, errors.eventDate ? styles.inputError : undefined]}
                  onPress={() => setShowEndPicker(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={eventEnd ? `종료일 ${eventEnd}` : '종료일 선택'}
                >
                  <Text style={[styles.datePickerText, !eventEnd && styles.datePickerPlaceholder]}>
                    {eventEnd || '종료일 선택'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.eventDate ? (
                <Text style={styles.errorText}>{errors.eventDate}</Text>
              ) : null}
              <TouchableOpacity style={styles.todayBtn} onPress={handleTodayOnly} accessibilityRole="button" accessibilityLabel="오늘만 설정">
                <Text style={styles.todayBtnText}>오늘만</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={parseDateString(eventStart) ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                  locale="ko"
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={parseDateString(eventEnd) ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                  minimumDate={parseDateString(eventStart) ?? undefined}
                  locale="ko"
                />
              )}
            </View>
          )}
        </View>

        {/* 사진 — 레퍼런스 100x100 */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>사진</Text>
          {imageUri ? (
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="사진 변경">
              <Image source={{ uri: imageUri }} style={styles.photoThumb} resizeMode="cover" accessibilityRole="image" accessibilityLabel="촬영한 가격표 사진" />
              <Text style={styles.changePhotoText}>사진 변경</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePickImage} accessibilityRole="button" accessibilityLabel="사진 추가">
              <CameraIcon size={22} color={colors.gray600} />
              <Text style={styles.photoPlaceholderText}>사진 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 품질 (선택) — 레퍼런스 3칩 full-width */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>품질 (선택)</Text>
          <View style={styles.qualityRow}>
            {QUALITY_OPTIONS.map(opt => {
              const active = quality === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.qualityChip, active && styles.qualityChipActive]}
                  onPress={() => setQuality(active ? undefined : opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`품질 ${opt.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.qualityChipText, active && styles.qualityChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 세부 가격표 타입 — 접이식 고급 옵션 */}
        <View style={styles.field}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
              );
              setExpandPriceTag(!expandPriceTag);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: expandPriceTag }}
          >
            <Text style={styles.collapsibleTitle}>세부 가격표 타입 (선택)</Text>
            {expandPriceTag ? (
              <ChevronUpIcon size={18} color={colors.gray600} />
            ) : (
              <ChevronDownIcon size={18} color={colors.gray600} />
            )}
          </TouchableOpacity>

          {expandPriceTag && (
            <View style={styles.collapsibleBody}>
              <View style={styles.chipRow}>
                {PRICE_TAG_OPTIONS.map((opt) => {
                  const active = priceTagType === opt.value;
                  const gradient = priceTagGradients[opt.value];
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.chip,
                        active && { backgroundColor: gradient[0], borderColor: gradient[1] },
                      ]}
                      onPress={() => {
                        setPriceTagType(opt.value);
                        if (opt.value !== 'sale' && opt.value !== 'closing' && opt.value !== 'cardPayment') {
                          setOriginalPrice('');
                        }
                        if (opt.value !== 'bundle') {
                          setBundleType(undefined);
                          setBundleQty(undefined);
                        }
                        if (opt.value !== 'flat') setFlatGroupName('');
                        if (opt.value !== 'member') setMemberPrice('');
                        if (opt.value !== 'closing') setEndsAt('');
                        if (opt.value !== 'cardPayment') {
                          setCardLabel('');
                          setCardDiscountType(undefined);
                          setCardDiscountValue('');
                          setCardConditionNote('');
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`가격표 ${opt.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextWhiteActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {(priceTagType === 'sale' || priceTagType === 'closing' || priceTagType === 'cardPayment') && (
                <View style={styles.priceTagSubField}>
                  <Text style={styles.fieldLabel}>
                    원가 <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.priceWrap, errors.originalPrice ? styles.inputError : undefined]}>
                    <TextInput
                      style={styles.priceInput}
                      value={originalPrice}
                      onChangeText={(v) => {
                        setOriginalPrice(v.replace(/[^0-9]/g, ''));
                        setErrors((e) => ({ ...e, originalPrice: undefined }));
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                      keyboardType="numeric"
                    />
                    <Text style={styles.priceSuffix}>원</Text>
                  </View>
                  {errors.originalPrice ? <Text style={styles.errorText}>{errors.originalPrice}</Text> : null}
                </View>
              )}

              {priceTagType === 'bundle' && (
                <View style={styles.priceTagSubField}>
                  <Text style={styles.fieldLabel}>
                    묶음 타입 <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.chipRow}>
                    {BUNDLE_OPTIONS.map((opt) => {
                      const active = bundleType === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.chip, active && styles.chipInkActive]}
                          onPress={() => {
                            setBundleType(opt.value);
                            setBundleQty(opt.qty);
                            setErrors((e) => ({ ...e, bundleType: undefined }));
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextInkActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.bundleType ? <Text style={styles.errorText}>{errors.bundleType}</Text> : null}
                </View>
              )}

              {priceTagType === 'flat' && (
                <View style={styles.priceTagSubField}>
                  <Text style={styles.fieldLabel}>
                    균일가 그룹명 <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.flatGroupName ? styles.inputError : undefined]}
                    value={flatGroupName}
                    onChangeText={(v) => {
                      setFlatGroupName(v);
                      if (v.trim()) setErrors((e) => ({ ...e, flatGroupName: undefined }));
                    }}
                    placeholder="예: 5000원 균일"
                    placeholderTextColor={colors.gray400}
                    maxLength={50}
                  />
                  {errors.flatGroupName ? <Text style={styles.errorText}>{errors.flatGroupName}</Text> : null}
                </View>
              )}

              {priceTagType === 'member' && (
                <View style={styles.priceTagSubField}>
                  <Text style={styles.fieldLabel}>
                    비회원가 <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.priceWrap, errors.memberPrice ? styles.inputError : undefined]}>
                    <TextInput
                      style={styles.priceInput}
                      value={memberPrice}
                      onChangeText={(v) => {
                        setMemberPrice(v.replace(/[^0-9]/g, ''));
                        setErrors((e) => ({ ...e, memberPrice: undefined }));
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                      keyboardType="numeric"
                    />
                    <Text style={styles.priceSuffix}>원</Text>
                  </View>
                  {errors.memberPrice ? <Text style={styles.errorText}>{errors.memberPrice}</Text> : null}
                </View>
              )}

              {priceTagType === 'closing' && (
                <View style={styles.priceTagSubField}>
                  <Text style={styles.fieldLabel}>
                    마감 시각 <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.datePickerBtn, errors.endsAt ? styles.inputError : undefined]}
                    onPress={() => setShowEndsAtPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.datePickerText, !endsAt && styles.datePickerPlaceholder]}>
                      {endsAt
                        ? new Date(endsAt).toLocaleString('ko-KR', {
                            hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric',
                          })
                        : '마감 시각 선택'}
                    </Text>
                  </TouchableOpacity>
                  {errors.endsAt ? <Text style={styles.errorText}>{errors.endsAt}</Text> : null}
                  {showEndsAtPicker && (
                    <DateTimePicker
                      value={endsAt ? new Date(endsAt) : new Date()}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_: DateTimePickerEvent, date?: Date) => {
                        setShowEndsAtPicker(Platform.OS === 'ios');
                        if (date) {
                          setEndsAt(date.toISOString());
                          setErrors((e) => ({ ...e, endsAt: undefined }));
                        }
                      }}
                      locale="ko"
                      minimumDate={new Date()}
                    />
                  )}
                </View>
              )}

              {priceTagType === 'cardPayment' && (
                <>
                  <View style={styles.priceTagSubField}>
                    <Text style={styles.fieldLabel}>
                      카드명 <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.cardLabel ? styles.inputError : undefined]}
                      value={cardLabel}
                      onChangeText={(v) => {
                        setCardLabel(v);
                        if (v.trim()) setErrors((e) => ({ ...e, cardLabel: undefined }));
                      }}
                      placeholder="예: 신한카드, 현대 M포인트"
                      placeholderTextColor={colors.gray400}
                      maxLength={50}
                    />
                    {errors.cardLabel ? <Text style={styles.errorText}>{errors.cardLabel}</Text> : null}
                  </View>

                  <View style={styles.priceTagSubField}>
                    <Text style={styles.fieldLabel}>
                      할인 방식 <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.chipRow}>
                      {CARD_DISCOUNT_OPTIONS.map((opt) => {
                        const active = cardDiscountType === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.chip, active && styles.chipInkActive]}
                            onPress={() => {
                              setCardDiscountType(opt.value);
                              setErrors((e) => ({ ...e, cardDiscountType: undefined }));
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextInkActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {errors.cardDiscountType ? <Text style={styles.errorText}>{errors.cardDiscountType}</Text> : null}
                  </View>

                  <View style={styles.priceTagSubField}>
                    <Text style={styles.fieldLabel}>
                      할인 값 <Text style={styles.required}>*</Text> {cardDiscountType === 'percent' ? '(%)' : '(원)'}
                    </Text>
                    <TextInput
                      style={[styles.input, errors.cardDiscountValue ? styles.inputError : undefined]}
                      value={cardDiscountValue}
                      onChangeText={(v) => {
                        setCardDiscountValue(v.replace(/[^0-9]/g, ''));
                        setErrors((e) => ({ ...e, cardDiscountValue: undefined }));
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                      keyboardType="numeric"
                    />
                    {errors.cardDiscountValue ? <Text style={styles.errorText}>{errors.cardDiscountValue}</Text> : null}
                  </View>

                  <View style={styles.priceTagSubField}>
                    <Text style={styles.fieldLabel}>조건 메모 (선택)</Text>
                    <TextInput
                      style={styles.input}
                      value={cardConditionNote}
                      onChangeText={setCardConditionNote}
                      placeholder="예: 3만원 이상 결제 시"
                      placeholderTextColor={colors.gray400}
                      maxLength={100}
                    />
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* 메모 — 접이식 */}
        <View style={styles.field}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
              );
              setExpandMemo(!expandMemo);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: expandMemo }}
          >
            <Text style={styles.collapsibleTitle}>메모 (선택)</Text>
            {expandMemo ? (
              <ChevronUpIcon size={18} color={colors.gray600} />
            ) : (
              <ChevronDownIcon size={18} color={colors.gray600} />
            )}
          </TouchableOpacity>
          {expandMemo && (
            <View style={styles.collapsibleBody}>
              <TextInput
                style={[styles.input, styles.memoInput]}
                value={memo}
                onChangeText={setMemo}
                placeholder="참고할 내용이 있다면 (최대 200자)"
                placeholderTextColor={colors.gray400}
                multiline
                maxLength={200}
                textAlignVertical="top"
                accessibilityLabel="메모"
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {totalItems > 0 && editIndex === undefined && (
          <Text style={styles.footerCount}>현재 {totalItems}개 담긴 상태</Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, submitDisabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitDisabled}
          accessibilityRole="button"
          accessibilityLabel={editIndex !== undefined ? '수정 완료' : '등록하기'}
          accessibilityState={{ disabled: submitDisabled }}
        >
          <Text style={[styles.submitBtnText, submitDisabled && styles.submitBtnTextDisabled]}>
            {editIndex !== undefined ? '수정 완료' : '등록하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.xxl,
  },
  kickerText: {
    ...typography.tabLabel,
    fontFamily: PJS.extraBold,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  ocrBanner: {
    backgroundColor: colors.successLight,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.micro,
    borderRadius: spacing.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ocrBannerIcon: { fontSize: spacing.iconSm },
  ocrBannerText: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.success,
  },

  field: { marginTop: spacing.lg + spacing.micro },
  fieldLabel: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.onBackground,
    marginBottom: spacing.sm,
  },
  required: { color: colors.danger },

  // 일반 인풋 — 레퍼런스 inputStyle: 48h, 1px line, radius 10, 화이트
  input: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPad,
    height: 48,
    ...typography.body,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  inputError: { borderColor: colors.danger },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  // 가격 입력 — 레퍼런스 inputWrap: 56h, 오른쪽정렬 큰 숫자
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  priceInput: {
    flex: 1,
    ...typography.headingXl,
    fontWeight: '800' as const,
    color: colors.onBackground,
    textAlign: 'right',
    letterSpacing: -0.5,
    padding: 0,
  },
  priceSuffix: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.onBackground,
    marginLeft: spacing.xs + spacing.micro,
  },

  // 칩: 단위/PriceTag 공용 — 레퍼런스 pill
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + spacing.micro },
  chip: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + spacing.micro,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  chipInkActive: { backgroundColor: colors.onBackground, borderColor: colors.onBackground },
  chipText: {
    ...typography.tagText,
    fontWeight: '600' as const,
    color: colors.onBackground,
  },
  chipTextInkActive: { color: colors.white },
  chipTextWhiteActive: { color: colors.white },

  quantityInput: { marginTop: spacing.sm },

  // 할인 토글 — 커스텀 pill (레퍼런스)
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.outlineVariant,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleHelper: {
    ...typography.bodySm,
    color: colors.gray600,
  },

  // 이벤트 날짜
  dateSection: { marginTop: spacing.md, gap: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  datePickerBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPad,
    height: 48,
    justifyContent: 'center',
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  datePickerText: { ...typography.body, color: colors.onBackground },
  datePickerPlaceholder: { color: colors.gray400 },
  dateSep: { ...typography.body, color: colors.gray400 },
  todayBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.xs + spacing.micro,
    paddingHorizontal: spacing.inputPad,
  },
  todayBtnText: {
    ...typography.tagText,
    fontWeight: '700' as const,
    color: colors.primary,
  },

  // 사진 — 100×100
  photoThumb: { width: 100, height: 100, borderRadius: spacing.radiusMd },
  changePhotoText: {
    ...typography.bodySm,
    color: colors.primary,
    marginTop: spacing.xs + spacing.micro,
    width: 100,
    textAlign: 'center',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusMd,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoPlaceholderText: {
    ...typography.tagText,
    fontWeight: '600' as const,
    color: colors.gray600,
  },

  // 품질 3칩 — flex:1, 활성시 primaryLight + primary 테두리/텍스트
  qualityRow: { flexDirection: 'row', gap: spacing.xs + spacing.micro },
  qualityChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.white,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  qualityChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  qualityChipText: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.onBackground,
  },
  qualityChipTextActive: { color: colors.primary },

  // 접이식
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.inputPad,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  collapsibleTitle: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.onBackground,
  },
  collapsibleBody: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  priceTagSubField: { gap: spacing.sm },

  // 제안 드롭다운
  suggestions: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.inputPad,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.surfaceContainerLow,
  },
  suggestionText: { ...typography.body, color: colors.onBackground },
  suggestionUnit: { ...typography.bodySm, color: colors.gray600 },

  memoInput: {
    height: undefined,
    minHeight: 80,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // Footer
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: spacing.borderHairline,
    borderTopColor: colors.outlineVariant,
  },
  footerCount: {
    ...typography.bodySm,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.outlineVariant },
  submitBtnText: {
    ...typography.headingLg,
    color: colors.white,
  },
  submitBtnTextDisabled: { color: colors.gray600 },
});

export default ItemDetailScreen;
