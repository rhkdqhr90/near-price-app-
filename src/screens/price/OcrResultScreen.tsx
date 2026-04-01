import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
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

const parseOcrText = (text: string): OcrItem[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items: OcrItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // ₩ 또는 \ (일부 OCR에서 ₩를 역슬래시로 인식) 앞에 붙는 경우 포함
    const priceMatch = line.match(/(?:₩|\\)?(\d{1,3}(?:,\d{3})*|\d{3,6})(?:\s*원)?/);
    if (priceMatch) {
      const priceNum = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      if (priceNum >= 100 && priceNum <= 999999) {
        const namePart = line.replace(priceMatch[0], '').replace(/원|₩/g, '').trim();
        const name = namePart.length > 1 ? namePart : (lines[i - 1] ?? '').trim();
        if (name.length > 1) items.push({ name: name.substring(0, 30), price: String(priceNum) });
      }
    }
  }
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.name}-${item.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
};

const OcrResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri } = route.params;
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
        const result = await TextRecognition.recognize(normalizeImageUri(imageUri));
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
      initialName: item.name,
      initialPrice: item.price,
    });
  }, [navigation, imageUri]);

  const handleManualEntry = useCallback(() => {
    navigation.navigate('ItemDetail', { imageUri });
  }, [navigation, imageUri]);

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
                <Text style={styles.ocrItemName} numberOfLines={1}>{item.name}</Text>
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
