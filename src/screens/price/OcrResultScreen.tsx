import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import LoadingView from '../../components/common/LoadingView';
import ErrorView from '../../components/common/ErrorView';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = PriceRegisterScreenProps<'OcrResult'>;

interface OcrItem { name: string; price: string; }

const normalizeImageUri = (uri: string): string => {
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('http')) {
    return uri;
  }
  if (Platform.OS === 'ios') {
    return `file://${uri}`;
  }
  return uri;
};

// 가격 정규식 — 한글 문맥("쪽파 1단 1000원" 등)에서 앞쪽 1~2자리 숫자에 잘못 잡히지 않도록
//   (1) 콤마 형식: 1,000 / 12,000 (콤마 그룹 1개 이상 필수)
//   (2) 평문 형식: 100~999999 (3~6자리)
// 한 라인에 여러 후보가 있으면 "원/₩ 마커가 붙은 것 → 콤마 있는 것 → 큰 값" 순으로 가장 그럴듯한 가격 선정.
const PRICE_TOKEN_REGEX = /(₩|\\)?(\d{1,3}(?:,\d{3})+|\d{3,6})(\s*원)?/g;
// 추출된 name이 또 다른 가격 패턴을 포함하는지 검사용 (non-global)
const PRICE_LIKE_REGEX = /(?:\d{1,3}(?:,\d{3})+|\d{3,6})/;

interface PriceCandidate {
  full: string;
  num: number;
  hasMarker: boolean; // ₩ 또는 원
  hasComma: boolean;
}

const pickBestPrice = (line: string): PriceCandidate | null => {
  const candidates: PriceCandidate[] = [];
  for (const m of line.matchAll(PRICE_TOKEN_REGEX)) {
    const num = parseInt(m[2].replace(/,/g, ''), 10);
    if (num < 100 || num > 999999) { continue; }
    candidates.push({
      full: m[0],
      num,
      hasMarker: !!(m[1] || m[3]),
      hasComma: m[2].includes(','),
    });
  }
  if (candidates.length === 0) { return null; }
  candidates.sort((a, b) => {
    if (a.hasMarker !== b.hasMarker) { return a.hasMarker ? -1 : 1; }
    if (a.hasComma !== b.hasComma) { return a.hasComma ? -1 : 1; }
    return b.num - a.num;
  });
  return candidates[0];
};

interface RankedCandidate {
  name: string;
  price: string;
  num: number;
  hasMarker: boolean;
  hasComma: boolean;
}

// 가격표 한 장에는 보통 상품 1개만 있으므로(영수증 멀티 상품 시나리오는 미지원),
// 라인별 후보를 수집한 뒤 "원/₩ 마커 → 콤마 → 큰 값" 신뢰도 순으로 최상위 1개만 반환한다.
// 사용자가 틀렸다고 판단하면 화면 하단 "직접 입력" 버튼 사용.
const parseOcrText = (text: string): OcrItem[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const candidates: RankedCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const best = pickBestPrice(line);
    if (!best) { continue; }

    // 같은 라인에서 가격 토큰을 제외한 나머지를 상품명으로. 단, 남은 문자열에 또 다른
    // 가격 패턴이 포함되어 있다면(예: "1,000원 2,000원") 잘못된 이름이 되므로 이전 라인을 사용.
    const stripped = line.replace(best.full, '').replace(/원|₩/g, '').trim();
    const looksLikePrice = PRICE_LIKE_REGEX.test(stripped);
    const fromSameLine = stripped.length > 1 && !looksLikePrice;
    const name = fromSameLine ? stripped : (lines[i - 1] ?? '').trim();
    if (name.length <= 1) { continue; }

    candidates.push({
      name: name.substring(0, 30),
      price: String(best.num),
      num: best.num,
      hasMarker: best.hasMarker,
      hasComma: best.hasComma,
    });
  }

  if (candidates.length === 0) { return []; }

  candidates.sort((a, b) => {
    if (a.hasMarker !== b.hasMarker) { return a.hasMarker ? -1 : 1; }
    if (a.hasComma !== b.hasComma) { return a.hasComma ? -1 : 1; }
    return b.num - a.num;
  });

  return [{ name: candidates[0].name, price: candidates[0].price }];
};

const OcrResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri, imageFileName, imageMimeType, imageFileSize } = route.params;
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [rawText, setRawText] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    setOcrItems([]);
    (async () => {
      try {
        // 한글 가격표 인식을 위해 KOREAN 스크립트 사용
        // (KOREAN 모델은 한글 + 라틴 문자 + 숫자 모두 인식 가능)
        const result = await TextRecognition.recognize(
          normalizeImageUri(imageUri),
          TextRecognitionScript.KOREAN,
        );
        if (cancelled) return;
        setRawText(result.text);
        setOcrItems(parseOcrText(result.text));
      } catch {
        if (!cancelled) { setOcrItems([]); setIsError(true); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imageUri, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  const handleSelectItem = useCallback((item: OcrItem) => {
    navigation.navigate('ItemDetail', {
      imageUri,
      imageFileName,
      imageMimeType,
      imageFileSize,
      initialName: item.name,
      initialPrice: item.price,
    });
  }, [navigation, imageUri, imageFileName, imageMimeType, imageFileSize]);

  const handleManualEntry = useCallback(() => {
    navigation.navigate('ItemDetail', {
      imageUri,
      imageFileName,
      imageMimeType,
      imageFileSize,
    });
  }, [navigation, imageUri, imageFileName, imageMimeType, imageFileSize]);

  if (isLoading) return <LoadingView message="가격 정보를 읽는 중..." />;
  if (isError) return <ErrorView message="가격 정보 인식 중 오류가 발생했습니다." onRetry={handleRetry} />;

  return (
    <View style={styles.container}>
      <Image source={{ uri: normalizeImageUri(imageUri) }} style={styles.image} resizeMode="contain" accessibilityRole="image" accessibilityLabel="촬영한 가격표 이미지" />

      <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultSection}>
        <Text style={styles.sectionTitle}>인식된 가격 항목</Text>
        {ocrItems.length > 0 ? (
          ocrItems.map((item) => (
            <TouchableOpacity
              key={`${item.name}-${item.price}`}
              style={styles.ocrItemCard}
              onPress={() => handleSelectItem(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${parseInt(item.price, 10).toLocaleString()}원 선택`}
            >
              <View style={styles.ocrCardColorBar} />
              <View style={styles.ocrCardBody}>
                <Text style={styles.ocrItemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.ocrItemPrice}>{parseInt(item.price, 10).toLocaleString()}원</Text>
              </View>
              <Text style={styles.ocrSelectHint}>선택</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noResultBox}>
            <Text style={styles.noResultText}>
              {rawText.length > 0
                ? '가격 정보를 자동으로 인식하지 못했습니다.'
                : '텍스트를 인식하지 못했습니다.'}
            </Text>
            <TouchableOpacity style={styles.manualBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('InputMethod')} accessibilityRole="button" accessibilityLabel="다시 촬영하기">
              <Text style={styles.manualBtnText}>다시 촬영하기</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.manualBtn} onPress={handleManualEntry} accessibilityRole="button" accessibilityLabel="직접 입력">
          <Text style={styles.manualBtnText}>인식이 안 됐나요? 직접 입력</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  image: { width: '100%', height: spacing.imagePreviewH, backgroundColor: colors.black },
  resultScroll: { flex: 1 },
  resultSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.headingLg, marginBottom: spacing.md },
  ocrItemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: spacing.radiusMd,
    borderWidth: 0.5, borderColor: colors.gray200,
    overflow: 'hidden', marginBottom: spacing.cardGap,
  },
  ocrCardColorBar: {
    width: 3, backgroundColor: colors.primary, alignSelf: 'stretch',
    marginVertical: spacing.md, marginLeft: spacing.inputPad, borderRadius: spacing.micro,
  },
  ocrCardBody: { flex: 1, paddingVertical: spacing.inputPad, paddingLeft: spacing.md },
  ocrItemName: { ...typography.headingMd, marginBottom: spacing.xs },
  ocrItemPrice: { ...typography.price, color: colors.primary },
  ocrSelectHint: { ...typography.tagText, fontWeight: '600' as const, color: colors.primary, paddingRight: spacing.lg },
  noResultBox: {
    backgroundColor: colors.white, borderRadius: spacing.radiusMd, padding: spacing.xl,
    borderWidth: 0.5, borderColor: colors.gray200, alignItems: 'center',
    marginBottom: spacing.md,
  },
  noResultText: { ...typography.body, color: colors.gray600, textAlign: 'center' },
  manualBtn: { alignItems: 'center', paddingVertical: spacing.lg },
  manualBtnText: { ...typography.body, fontWeight: '600' as const, color: colors.primary },
});

export default OcrResultScreen;
