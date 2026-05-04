import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Platform, type LayoutChangeEvent,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import TextRecognition, {
  TextRecognitionScript,
  type Frame,
  type TextBlock,
} from '@react-native-ml-kit/text-recognition';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import LoadingView from '../../components/common/LoadingView';
import ErrorView from '../../components/common/ErrorView';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = PriceRegisterScreenProps<'OcrResult'>;

interface OcrItem { name: string; price: string; frame?: Frame }

interface ImageSize { width: number; height: number; }

// 두 사각형의 교차 비율(a 기준). 0~1.
// 텍스트 블록이 가이드 영역에 얼마나 들어와 있는지 판정한다.
const intersectionRatio = (a: Frame, b: Frame): number => {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.left + a.width, b.left + b.width);
  const y2 = Math.min(a.top + a.height, b.top + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const aArea = a.width * a.height;
  return aArea > 0 ? ((x2 - x1) * (y2 - y1)) / aArea : 0;
};

// 가이드 영역 안에 50% 이상 들어와 있는 블록만 채택한다.
// guideBox 가 null 이면(갤러리 선택 등) 전체 블록 사용.
const filterBlocksByGuide = (blocks: TextBlock[], guideBox: Frame | null): TextBlock[] => {
  if (!guideBox) return blocks;
  return blocks.filter(
    (b) => b.frame !== undefined && intersectionRatio(b.frame, guideBox) >= 0.5,
  );
};

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

// 한 라인에서 후보를 추출하고 candidates 배열에 push 하는 공통 로직.
// blocks 기반/텍스트 기반 두 경로에서 모두 사용한다.
const collectLineCandidates = (
  lines: string[],
  candidates: Array<RankedCandidate & { frame?: Frame }>,
  blockFrame?: Frame,
): void => {
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
      frame: blockFrame,
    });
  }
};

const sortCandidates = (
  candidates: Array<RankedCandidate & { frame?: Frame }>,
): Array<RankedCandidate & { frame?: Frame }> => {
  return candidates.sort((a, b) => {
    if (a.hasMarker !== b.hasMarker) { return a.hasMarker ? -1 : 1; }
    if (a.hasComma !== b.hasComma) { return a.hasComma ? -1 : 1; }
    return b.num - a.num;
  });
};

// 가격표 한 장에는 보통 상품 1개만 있으므로(영수증 멀티 상품 시나리오는 미지원),
// 라인별 후보를 수집한 뒤 "원/₩ 마커 → 콤마 → 큰 값" 신뢰도 순으로 최상위 1개만 반환한다.
// 사용자가 틀렸다고 판단하면 화면 하단 "직접 입력" 버튼 사용.
//
// blocks 기반: 가이드 영역 필터링 후 통과한 블록의 텍스트만 후보로 삼는다.
// 각 후보에 원본 블록의 frame 을 매달아 시각화에 사용한다.
const parseOcrBlocks = (blocks: TextBlock[]): OcrItem[] => {
  const candidates: Array<RankedCandidate & { frame?: Frame }> = [];
  for (const block of blocks) {
    const lines = block.text.split('\n').map(l => l.trim()).filter(Boolean);
    collectLineCandidates(lines, candidates, block.frame);
  }
  if (candidates.length === 0) { return []; }
  const sorted = sortCandidates(candidates);
  return [{ name: sorted[0].name, price: sorted[0].price, frame: sorted[0].frame }];
};

// 텍스트 기반 폴백 — 블록 frame이 모두 누락된 케이스에 사용.
const parseOcrText = (text: string): OcrItem[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const candidates: Array<RankedCandidate & { frame?: Frame }> = [];
  collectLineCandidates(lines, candidates);
  if (candidates.length === 0) { return []; }
  const sorted = sortCandidates(candidates);
  return [{ name: sorted[0].name, price: sorted[0].price }];
};

const OcrResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri, imageFileName, imageMimeType, imageFileSize, guideRatio } = route.params;
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [rawText, setRawText] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [imageNativeSize, setImageNativeSize] = useState<ImageSize | null>(null);
  const [imageDisplaySize, setImageDisplaySize] = useState<ImageSize | null>(null);

  const handleImageLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setImageDisplaySize({ width, height });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    setOcrItems([]);
    setImageNativeSize(null);
    (async () => {
      try {
        const normalizedUri = normalizeImageUri(imageUri);
        // 한글 가격표 인식을 위해 KOREAN 스크립트 사용
        // (KOREAN 모델은 한글 + 라틴 문자 + 숫자 모두 인식 가능)
        // 이미지 native dimensions 와 OCR 을 병렬 처리.
        const [result, dimensions] = await Promise.all([
          TextRecognition.recognize(normalizedUri, TextRecognitionScript.KOREAN),
          new Promise<ImageSize>((resolve, reject) => {
            Image.getSize(normalizedUri, (w, h) => resolve({ width: w, height: h }), reject);
          }),
        ]);
        if (cancelled) return;
        setRawText(result.text);
        setImageNativeSize(dimensions);

        // 가이드 영역(픽셀) 계산 — guideRatio 가 있으면 중앙 비율 영역, 없으면 전체.
        const guideBox: Frame | null = guideRatio
          ? {
              width: dimensions.width * guideRatio.widthRatio,
              height: dimensions.height * guideRatio.heightRatio,
              left: (dimensions.width * (1 - guideRatio.widthRatio)) / 2,
              top: (dimensions.height * (1 - guideRatio.heightRatio)) / 2,
            }
          : null;

        const blocksInGuide = filterBlocksByGuide(result.blocks, guideBox);
        // 가이드 영역 내 블록에서 가격 후보를 우선 추출.
        // 후보가 없으면(블록 frame 누락 등) 텍스트 기반 폴백.
        let items = parseOcrBlocks(blocksInGuide);
        if (items.length === 0) {
          items = parseOcrText(result.text);
        }
        setOcrItems(items);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            screen: 'OcrResultScreen',
            action: 'recognize',
          },
        });
        if (!cancelled) { setOcrItems([]); setIsError(true); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imageUri, retryCount, guideRatio]);

  // 이미지 native pixel 좌표를 contain 모드로 그려진 화면 dp 좌표로 변환한다.
  const projectFrameToScreen = useCallback(
    (frame: Frame): { left: number; top: number; width: number; height: number } | null => {
      if (!imageNativeSize || !imageDisplaySize) return null;
      const scale = Math.min(
        imageDisplaySize.width / imageNativeSize.width,
        imageDisplaySize.height / imageNativeSize.height,
      );
      const renderedW = imageNativeSize.width * scale;
      const renderedH = imageNativeSize.height * scale;
      const offsetX = (imageDisplaySize.width - renderedW) / 2;
      const offsetY = (imageDisplaySize.height - renderedH) / 2;
      return {
        left: frame.left * scale + offsetX,
        top: frame.top * scale + offsetY,
        width: frame.width * scale,
        height: frame.height * scale,
      };
    },
    [imageNativeSize, imageDisplaySize],
  );

  const guideOverlayBox = useMemo(() => {
    if (!guideRatio || !imageNativeSize) return null;
    const guideFrame: Frame = {
      width: imageNativeSize.width * guideRatio.widthRatio,
      height: imageNativeSize.height * guideRatio.heightRatio,
      left: (imageNativeSize.width * (1 - guideRatio.widthRatio)) / 2,
      top: (imageNativeSize.height * (1 - guideRatio.heightRatio)) / 2,
    };
    return projectFrameToScreen(guideFrame);
  }, [guideRatio, imageNativeSize, projectFrameToScreen]);

  const highlightBoxes = useMemo(() => {
    return ocrItems
      .map((item) => (item.frame ? projectFrameToScreen(item.frame) : null))
      .filter((box): box is { left: number; top: number; width: number; height: number } => box !== null);
  }, [ocrItems, projectFrameToScreen]);

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
      <View style={styles.imageWrap} onLayout={handleImageLayout}>
        <Image
          source={{ uri: normalizeImageUri(imageUri) }}
          style={styles.image}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="촬영한 가격표 이미지"
        />
        {guideOverlayBox ? (
          <View
            style={[styles.guideOverlay, guideOverlayBox]}
            pointerEvents="none"
            accessibilityElementsHidden
          />
        ) : null}
        {highlightBoxes.map((box, idx) => (
          <View
            key={`hl-${idx}`}
            style={[styles.highlightOverlay, box]}
            pointerEvents="none"
            accessibilityElementsHidden
          />
        ))}
      </View>

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
  imageWrap: { width: '100%', height: spacing.imagePreviewH, backgroundColor: colors.black },
  image: { width: '100%', height: '100%' },
  guideOverlay: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.white,
    opacity: 0.7,
  },
  highlightOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
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
