import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import MapViewWrapper from './MapViewWrapper';
import { colors } from '../../theme/colors';
import { formatPrice } from '../../utils/format';

export interface PriceMarkerItem {
  id: string;
  price: number;
  storeName: string;
  latitude: number;
  longitude: number;
}

interface Props {
  prices: PriceMarkerItem[];
  onMarkerPress?: (id: string) => void;
  initialLatitude: number;
  initialLongitude: number;
}

interface MarkerProps {
  item: PriceMarkerItem;
  isMin: boolean;
  onPress?: (id: string) => void;
}

const PriceMarker: React.FC<MarkerProps> = React.memo(({ item, isMin, onPress }) => {
  const handleTap = useCallback(() => onPress?.(item.id), [onPress, item.id]);
  return (
    <NaverMapMarkerOverlay
      latitude={item.latitude}
      longitude={item.longitude}
      onTap={handleTap}
      tintColor={isMin ? colors.danger : colors.primary}
      caption={{
        text: formatPrice(item.price),
        textSize: 12,
        color: isMin ? colors.danger : colors.primary,
      }}
      subCaption={{
        text: item.storeName,
        textSize: 10,
      }}
    />
  );
});
PriceMarker.displayName = 'PriceMarker';

const PriceMapView: React.FC<Props> = ({
  prices,
  onMarkerPress,
  initialLatitude,
  initialLongitude,
}) => {
  const minPrice = useMemo(() => {
    if (prices.length === 0) return null;
    return prices.reduce((min, p) => Math.min(min, p.price), Infinity);
  }, [prices]);

  // 유효한 마커만 필터링 (좌표가 숫자인지 확인)
  const validMarkers = useMemo(() => {
    return prices.filter((p) => {
      const isValidLat = typeof p.latitude === 'number' && !isNaN(p.latitude);
      const isValidLng = typeof p.longitude === 'number' && !isNaN(p.longitude);
      const isValidPrice = typeof p.price === 'number' && !isNaN(p.price);
      return isValidLat && isValidLng && isValidPrice;
    });
  }, [prices]);

  return (
    <MapViewWrapper
      style={styles.map}
      initialCamera={{ latitude: initialLatitude, longitude: initialLongitude, zoom: 14 }}
      isShowLocationButton
      isShowZoomControls={false}
      minZoom={10}
      maxZoom={18}
      mapType="Basic"
      locale="ko"
    >
      {validMarkers.map((p) => (
        <PriceMarker
          key={p.id}
          item={p}
          isMin={p.price === minPrice}
          onPress={onMarkerPress}
        />
      ))}
    </MapViewWrapper>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

export default React.memo(PriceMapView);
