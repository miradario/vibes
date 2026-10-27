import React, { useMemo, useRef, useState } from "react";
import { Image, PanResponder, StyleSheet, View, type ImageSourcePropType } from "react-native";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  clampPointToContainer,
  previewPointToLatLng,
  type LatLng,
  type Size,
} from "../src/lib/mapPinMath";

const PIN_SIZE = 34;

type Props = {
  source: ImageSourcePropType;
  center: LatLng;
  // Tamaño en píxeles de mapa pedido a Static Maps (antes de scale=2).
  imageSize: Size;
  onMove: (next: LatLng) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onError?: () => void;
};

// Preview estática con pin movible: tocá o arrastrá para ajustar el punto.
// Durante el gesto se muestra un pin propio; al soltar se recentra la imagen.
export default function DraggableMapPreview({
  source,
  center,
  imageSize,
  onMove,
  onDragStateChange,
  onError,
}: Props) {
  const [container, setContainer] = useState<Size | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef({ container, center, onMove, onDragStateChange, imageSize });
  latest.current = { container, center, onMove, onDragStateChange, imageSize };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event) => {
          const size = latest.current.container;
          if (!size) return;
          latest.current.onDragStateChange?.(true);
          setDragPoint(
            clampPointToContainer(
              { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
              size,
            ),
          );
        },
        onPanResponderMove: (event) => {
          const size = latest.current.container;
          if (!size) return;
          setDragPoint(
            clampPointToContainer(
              { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
              size,
            ),
          );
        },
        onPanResponderRelease: (event) => {
          const { container: size, center: currentCenter, imageSize: image } = latest.current;
          latest.current.onDragStateChange?.(false);
          setDragPoint(null);
          if (!size) return;
          const point = clampPointToContainer(
            { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
            size,
          );
          latest.current.onMove(
            previewPointToLatLng({ center: currentCenter, point, container: size, image }),
          );
        },
        onPanResponderTerminate: () => {
          latest.current.onDragStateChange?.(false);
          setDragPoint(null);
        },
      }),
    [],
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setContainer({ width, height });
      }}
      accessibilityLabel="Mapa de la ubicación. Tocá o arrastrá para mover el pin."
      {...responder.panHandlers}
    >
      <Image source={source} style={styles.image} onError={onError} />
      {dragPoint ? (
        <View
          pointerEvents="none"
          style={[
            styles.pin,
            { left: dragPoint.x - PIN_SIZE / 2, top: dragPoint.y - PIN_SIZE },
          ]}
        >
          <Icon name="location" size={PIN_SIZE} color={vibesTheme.colors.accentCoral} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  pin: { position: "absolute", width: PIN_SIZE, height: PIN_SIZE },
});
