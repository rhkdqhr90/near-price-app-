import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Linking, Dimensions, Image, type LayoutChangeEvent } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageEditor from '@react-native-community/image-editor';
import * as Sentry from '@sentry/react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PriceRegisterScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = PriceRegisterScreenProps<'Camera'>;

const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const inferMimeTypeFromPath = (path: string): string | undefined => {
  const normalized = path.toLowerCase();
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (normalized.endsWith('.png')) {
    return 'image/png';
  }
  if (normalized.endsWith('.webp')) {
    return 'image/webp';
  }
  if (normalized.endsWith('.heic') || normalized.endsWith('.heif')) {
    return 'image/heic';
  }
  return undefined;
};

const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  // 화면 포커스가 빠지면 카메라 세션을 정지해 배터리/메모리 점유를 줄인다.
  // 다른 화면 이동 후 돌아오면 자동 재활성화.
  const isFocused = useIsFocused();
  const shutterScaleRef = useRef(new Animated.Value(1)).current;
  const isCapturingRef = useRef(false);
  // 가이드 프레임이 그려지는 컨테이너의 실제 렌더 크기.
  // Dimensions.get('window')는 헤더/시스템바 영향으로 컨테이너 크기와 다를 수 있어
  // 크롭 좌표를 컨테이너 기준으로 정확히 계산하기 위해 onLayout으로 측정한다.
  const containerLayoutRef = useRef<{ width: number; height: number } | null>(null);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    containerLayoutRef.current = { width, height };
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        '카메라 권한이 필요합니다',
        '설정에서 허용해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정으로 이동', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }, [requestPermission]);

  const animateShutterPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(shutterScaleRef, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shutterScaleRef, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shutterScaleRef]);

  const handleTakePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    animateShutterPress();
    try {
      // takeSnapshot: Android에서는 preview view의 GPU 스크린샷을 반환한다.
      // → 사용자가 화면에서 보는 그대로의 비트맵 (EXIF 없음, 회전 없음, 좌표 변환 불필요)
      // → 가이드 프레임의 화면 좌표가 스냅샷의 픽셀 좌표와 동일 비율로 1:1 매핑됨
      // → takePhoto의 센서 raw + EXIF 처리에서 발생하는 orientation 어긋남 문제 자체를 회피
      const snapshot = await cameraRef.current.takeSnapshot({ quality: 100 });
      const sourceUri = `file://${snapshot.path}`;

      let imageUri = sourceUri;
      try {
        // 스냅샷의 실제 픽셀 dimensions를 읽는다 (preview view를 GPU 스크린샷한 결과).
        const { width: snapW, height: snapH } = await new Promise<{
          width: number;
          height: number;
        }>((resolve, reject) => {
          Image.getSize(sourceUri, (w, h) => resolve({ width: w, height: h }), reject);
        });

        // 가이드 프레임이 그려지는 화면 영역의 실제 크기.
        const fallback = Dimensions.get('window');
        const layoutW = containerLayoutRef.current?.width ?? fallback.width;
        const layoutH = containerLayoutRef.current?.height ?? fallback.height;

        // 스냅샷은 화면 비율과 동일하므로 cover-crop 보정 불필요.
        // 가이드 프레임의 화면 비율을 그대로 스냅샷 픽셀로 환산하여 중앙 영역을 잘라낸다.
        const cropW = Math.round(snapW * (spacing.cameraGuideFrameW / layoutW));
        const cropH = Math.round(snapH * (spacing.cameraGuideFrameH / layoutH));
        const cropX = Math.round((snapW - cropW) / 2);
        const cropY = Math.round((snapH - cropH) / 2);

        const safeX = Math.max(0, cropX);
        const safeY = Math.max(0, cropY);
        const cropped = await ImageEditor.cropImage(sourceUri, {
          offset: { x: safeX, y: safeY },
          size: {
            width: Math.min(cropW, snapW - safeX),
            height: Math.min(cropH, snapH - safeY),
          },
          format: 'jpeg',
        });
        imageUri = cropped.uri;
      } catch (cropError) {
        // 크롭 실패 → 원본 스냅샷 사용 (스냅샷 자체는 성공했으므로 흐름 유지)
        if (!__DEV__) {
          Sentry.captureException(cropError, {
            tags: { screen: 'CameraScreen', action: 'cropSnapshot' },
          });
        }
      }

      navigation.navigate('OcrResult', {
        imageUri,
        imageFileName: `price-${Date.now()}.jpg`,
        imageMimeType: 'image/jpeg',
      });
    } catch (error) {
      if (!__DEV__) {
        Sentry.captureException(error, { tags: { screen: 'CameraScreen', action: 'takeSnapshot' } });
      }
      Alert.alert('오류', '사진 촬영에 실패했습니다. 다시 시도해주세요.');
    } finally {
      isCapturingRef.current = false;
    }
  }, [navigation, animateShutterPress]);

  const handlePickFromGallery = useCallback(() => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
      assetRepresentationMode: 'compatible',
      restrictMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) { Alert.alert('오류', '이미지를 불러오는 데 실패했습니다.'); return; }
      const asset = response.assets?.[0];
      const uri = asset?.uri;
      if (!uri) return;

      const imageMimeType =
        asset.type?.toLowerCase() ??
        (asset.fileName ? inferMimeTypeFromPath(asset.fileName) : undefined) ??
        inferMimeTypeFromPath(uri);

      if (
        imageMimeType &&
        !(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(imageMimeType)
      ) {
        Alert.alert('지원하지 않는 이미지 형식', 'JPG, PNG, WEBP 형식의 사진만 등록할 수 있어요.');
        return;
      }

      navigation.navigate('OcrResult', {
        imageUri: uri,
        imageFileName: asset.fileName,
        imageMimeType,
        imageFileSize: asset.fileSize,
      });
    });
  }, [navigation]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>카메라 권한이 필요합니다</Text>
        <Text style={styles.permSub}>가격표 사진 촬영을 위해 카메라 접근 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={handleRequestPermission} accessibilityRole="button" accessibilityLabel="카메라 권한 허용하기">
          <Text style={styles.permBtnText}>권한 허용하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryAltBtn} onPress={handlePickFromGallery} accessibilityRole="button" accessibilityLabel="갤러리에서 선택">
          <Text style={styles.galleryAltText}>갤러리에서 선택</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>카메라를 사용할 수 없습니다</Text>
        <TouchableOpacity style={styles.galleryAltBtn} onPress={handlePickFromGallery} accessibilityRole="button" accessibilityLabel="갤러리에서 선택">
          <Text style={styles.galleryAltText}>갤러리에서 선택</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={isFocused}
        photo
        video={false}
      />

      {/* 카메라 가이드 오버레이 */}
      <View style={styles.guideFocusOverlay}>
        {/* 위쪽 반투명 영역 */}
        <View style={styles.guideDarkArea} />

        {/* 중앙 가이드 프레임과 양옆 반투명 영역 */}
        <View style={styles.guideMiddleRow}>
          <View style={styles.guideDarkArea} />
          <View style={styles.guideFrame}>
            <View style={[styles.guideCorner, styles.guideCornerTL]} />
            <View style={[styles.guideCorner, styles.guideCornerTR]} />
            <View style={[styles.guideCorner, styles.guideCornerBL]} />
            <View style={[styles.guideCorner, styles.guideCornerBR]} />
          </View>
          <View style={styles.guideDarkArea} />
        </View>

        {/* 아래쪽 반투명 영역 */}
        <View style={styles.guideDarkArea} />
      </View>

      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl + spacing.lg }]}>
        <Text style={styles.guideText}>가격표를 촬영해주세요</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} accessibilityRole="button" accessibilityLabel="갤러리">
            <Text style={styles.galleryBtnText}>갤러리</Text>
          </TouchableOpacity>
          <Animated.View style={[styles.shutterBtn, { transform: [{ scale: shutterScaleRef }] }]}>
            <TouchableOpacity onPress={handleTakePhoto} accessibilityRole="button" accessibilityLabel="사진 촬영" style={styles.shutterBtnInner}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.placeholder} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  camera: { flex: 1 },
  guideFocusOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    pointerEvents: 'none',
  },
  guideDarkArea: {
    flex: 1,
    backgroundColor: colors.black,
    opacity: 0.4,
  },
  guideMiddleRow: {
    flexDirection: 'row',
    height: spacing.cameraGuideFrameH,
  },
  guideFrame: {
    width: spacing.cameraGuideFrameW,
  },
  guideCorner: {
    position: 'absolute',
    width: spacing.cameraGuideCornerSize,
    height: spacing.cameraGuideCornerSize,
    borderColor: colors.primary,
  },
  guideCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: spacing.cameraGuideCornerBorder,
    borderLeftWidth: spacing.cameraGuideCornerBorder,
    borderTopLeftRadius: spacing.cameraGuideCornerBorder,
  },
  guideCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: spacing.cameraGuideCornerBorder,
    borderRightWidth: spacing.cameraGuideCornerBorder,
    borderTopRightRadius: spacing.cameraGuideCornerBorder,
  },
  guideCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: spacing.cameraGuideCornerBorder,
    borderLeftWidth: spacing.cameraGuideCornerBorder,
    borderBottomLeftRadius: spacing.cameraGuideCornerBorder,
  },
  guideCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: spacing.cameraGuideCornerBorder,
    borderRightWidth: spacing.cameraGuideCornerBorder,
    borderBottomRightRadius: spacing.cameraGuideCornerBorder,
  },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.xxl, alignItems: 'center',
  },
  guideText: { ...typography.body, color: colors.white, marginBottom: spacing.xxl, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  galleryBtn: {
    width: spacing.cameraControlSize, height: spacing.cameraControlSize, borderRadius: spacing.radiusMd,
    backgroundColor: colors.cameraOverlayDark, justifyContent: 'center', alignItems: 'center',
  },
  galleryBtnText: { ...typography.bodySm, color: colors.white, fontWeight: '600' as const },
  shutterBtn: {
    width: spacing.cameraShutterSize, height: spacing.cameraShutterSize,
    borderRadius: spacing.cameraShutterSize / 2,
    backgroundColor: colors.cameraShutterBg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.white,
  },
  shutterBtnInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: spacing.cameraControlSize, height: spacing.cameraControlSize,
    borderRadius: spacing.cameraControlSize / 2,
    backgroundColor: colors.white,
  },
  placeholder: { width: spacing.cameraControlSize },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.gray100, padding: spacing.xxl },
  permTitle: { ...typography.headingXl, textAlign: 'center', marginBottom: spacing.sm },
  permSub: { ...typography.body, color: colors.gray600, textAlign: 'center', marginBottom: spacing.xxl },
  permBtn: {
    backgroundColor: colors.primary, borderRadius: spacing.radiusMd, paddingVertical: spacing.inputPad,
    paddingHorizontal: spacing.xxl, marginBottom: spacing.md, alignItems: 'center', width: '100%', // 14: no exact spacing token
  },
  permBtnText: { ...typography.headingMd, color: colors.white },
  galleryAltBtn: {
    backgroundColor: colors.white, borderRadius: spacing.radiusMd, paddingVertical: spacing.inputPad,
    paddingHorizontal: spacing.xxl, borderWidth: 0.5, borderColor: colors.gray200, alignItems: 'center', width: '100%',
  },
  galleryAltText: { ...typography.headingMd, color: colors.black },
});

export default CameraScreen;
