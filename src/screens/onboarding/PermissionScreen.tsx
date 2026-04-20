import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useNotificationStore } from '../../store/notificationStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import MapPinIcon from '../../components/icons/MapPinIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import BellIcon from '../../components/icons/BellIcon';
import CheckIcon from '../../components/icons/CheckIcon';

interface PermissionConfig {
  key: 'location' | 'camera' | 'notification';
  title: string;
  description: string;
  required: boolean;
  Icon: React.FC<{ size?: number; color?: string }>;
}

const PERMISSION_LIST: PermissionConfig[] = [
  {
    key: 'location',
    title: '위치',
    description: '내 주변 매장 가격을 확인해요',
    required: true,
    Icon: MapPinIcon,
  },
  {
    key: 'camera',
    title: '카메라',
    description: '가격표를 촬영해서 자동으로 등록해요',
    required: true,
    Icon: CameraIcon,
  },
  {
    key: 'notification',
    title: '알림',
    description: '내 동네 가격 변동 소식을 받아요',
    required: false,
    Icon: BellIcon,
  },
];

const ICON_BOX = spacing.headerIconSize; // 40
const ICON_RADIUS = spacing.radiusMd;    // 10 → 시안과 유사한 12에 가까움
const ICON_GLYPH = ICON_BOX / 2;         // 아이콘 글리프 크기

const requestAndroidSystemPermission = async (config: PermissionConfig): Promise<boolean> => {
  const permission =
    config.key === 'location'
      ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      : PermissionsAndroid.PERMISSIONS.CAMERA;

  const result = await PermissionsAndroid.request(permission);

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    await new Promise<void>((resolve) => {
      Alert.alert(
        `${config.title} 권한 필요`,
        '설정에서 권한을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel', onPress: () => resolve() },
          {
            text: '설정으로 이동',
            onPress: () => {
              Linking.openSettings();
              resolve();
            },
          },
        ],
      );
    });
    return false;
  }

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const PermissionScreen: React.FC = () => {
  const { markOnboardingSeen } = useOnboardingStore();
  const setAllNotifications = useNotificationStore((s) => s.setAllNotifications);
  const insets = useSafeAreaInsets();
  const [permissionStatuses, setPermissionStatuses] = useState<Record<string, boolean>>({
    location: false,
    camera: false,
    notification: false,
  });

  const handleAllow = useCallback(async () => {
    const newStatuses: Record<string, boolean> = { location: false, camera: false, notification: false };

    for (const p of PERMISSION_LIST) {
      if (p.key === 'notification') {
        // FCM 알림 권한 요청 (iOS + Android 13+)
        try {
          const status = await messaging().requestPermission();
          const granted =
            status === messaging.AuthorizationStatus.AUTHORIZED ||
            status === messaging.AuthorizationStatus.PROVISIONAL;
          newStatuses[p.key] = granted;
          setAllNotifications(granted);
        } catch {
          newStatuses[p.key] = false;
          setAllNotifications(false);
        }
      } else if (Platform.OS === 'android') {
        try {
          const granted = await requestAndroidSystemPermission(p);
          newStatuses[p.key] = granted;
        } catch {
          newStatuses[p.key] = false;
        }
      }
    }

    setPermissionStatuses(newStatuses);
    // iOS 위치/카메라: 각 기능 첫 사용 시 시스템이 직접 요청
    markOnboardingSeen();
  }, [markOnboardingSeen, setAllNotifications]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>앱 사용에 필요한{'\n'}권한을 허용해 주세요</Text>
        <Text style={styles.subtitle}>허용하지 않아도 앱을 사용할 수 있어요</Text>

        <View style={styles.list}>
          {PERMISSION_LIST.map((item) => {
            const { Icon } = item;
            const isGranted = permissionStatuses[item.key];
            return (
              <View
                key={item.key}
                style={[styles.item, isGranted && styles.itemGranted]}
              >
                <View style={styles.iconBox}>
                  <Icon size={ICON_GLYPH} color={colors.primary} />
                </View>
                <View style={styles.itemText}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {!item.required && (
                      <View style={styles.optionalBadge}>
                        <Text style={styles.optionalText}>선택</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                {isGranted && (
                  <View style={styles.statusIcon}>
                    <CheckIcon size={16} color={colors.white} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: spacing.xl + spacing.lg + Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity style={styles.allowButton} onPress={handleAllow} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="권한 허용 확인">
          <Text style={styles.allowButtonText}>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + spacing.xl,
  },
  title: {
    ...typography.displaySm,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray600,
    marginBottom: spacing.xxl,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
  },
  itemGranted: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: ICON_RADIUS,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    gap: spacing.micro,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTitle: {
    ...typography.headingMd,
  },
  optionalBadge: {
    backgroundColor: colors.gray100,
    borderRadius: spacing.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
  },
  optionalText: {
    ...typography.captionBold,
    color: colors.gray600,
  },
  itemDescription: {
    ...typography.body,
    color: colors.gray600,
  },
  statusIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl + spacing.lg, // + insets.bottom (동적으로 추가됨)
  },
  allowButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  allowButtonText: {
    ...typography.headingLg,
    color: colors.white,
  },
});

export default PermissionScreen;
