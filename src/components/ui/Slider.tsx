import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, PanResponder, View, type LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { Text } from "./Text";

const THUMB = 22;

function snap(raw: number, min: number, max: number, step: number): number {
  const stepped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, Number(stepped.toFixed(3))));
}

/**
 * Labelled slider with a live tabular readout. Drag anywhere on the track; each step gives
 * a light haptic tick. Screen readers get an adjustable control with increment/decrement.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  digits = 0,
  disabled = false,
}: Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  digits?: number;
  disabled?: boolean;
}>) {
  const t = useTheme();
  const { formatNumber } = useT();
  const [width, setWidth] = useState(0);
  const [active] = useState(() => new Animated.Value(0));
  // Latest props for the responder, which is created once.
  const live = useRef({ value, min, max, step, onChange, width, disabled });
  useLayoutEffect(() => {
    live.current = { value, min, max, step, onChange, width, disabled };
  });
  const startValue = useRef(value);

  const clamped = Math.min(max, Math.max(min, value));
  const fraction = max === min ? 0 : (clamped - min) / (max - min);

  const emit = (next: number) => {
    const cur = live.current;
    if (next === cur.value) return;
    void Haptics.selectionAsync();
    cur.onChange(next);
  };

  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.disabled,
      onMoveShouldSetPanResponder: (_, g) => !live.current.disabled && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const cur = live.current;
        Animated.spring(active, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
        if (cur.width <= 0) return;
        // Tapping the track jumps there; dragging continues from that point.
        const raw = cur.min + (e.nativeEvent.locationX / cur.width) * (cur.max - cur.min);
        const next = snap(raw, cur.min, cur.max, cur.step);
        startValue.current = next;
        emit(next);
      },
      onPanResponderMove: (_, g) => {
        const cur = live.current;
        if (cur.width <= 0) return;
        const raw = startValue.current + (g.dx / cur.width) * (cur.max - cur.min);
        emit(snap(raw, cur.min, cur.max, cur.step));
      },
      onPanResponderRelease: () => Animated.spring(active, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 4 }).start(),
      onPanResponderTerminate: () => Animated.spring(active, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  useEffect(() => () => active.stopAnimation(), [active]);

  const adjust = (dir: 1 | -1) => emit(snap(value + dir * step, min, max, step));
  const thumbX = fraction * Math.max(0, width - THUMB);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: clamped, text: formatNumber(value, digits) }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => adjust(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={{ paddingHorizontal: t.space[4], paddingVertical: t.space[3], opacity: disabled ? 0.45 : 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: t.space[3], marginBottom: t.space[2] }}>
        <Text variant="bodySm" style={{ flexShrink: 1 }}>
          {label}
        </Text>
        <Text variant="bodySm" weight="semibold" numeric>
          {formatNumber(value, digits)}
        </Text>
      </View>
      <View
        {...responder.panHandlers}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        hitSlop={{ top: 12, bottom: 12 }}
        style={{ height: THUMB, justifyContent: "center" }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: t.colors.surfaceSunken, overflow: "hidden" }}>
          <View style={{ width: `${fraction * 100}%`, height: 4, backgroundColor: t.colors.accent }} />
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: thumbX,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: t.colors.surface,
            borderWidth: t.borderWidth.thick,
            borderColor: t.colors.accent,
            transform: [{ scale: active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
          }}
        />
      </View>
    </View>
  );
}
