import type { ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { useState } from "react";
import Svg, { Text as SvgText } from "react-native-svg";
import { RemoteImage } from "@/components/ui";
import { useTheme } from "@/design/theme";

/**
 * Square minimap image with an SVG overlay in normalized 0..1 coordinates. Children receive
 * the rendered pixel size so they can map points.
 */
export function Minimap({
  uri,
  label,
  children,
  onLayoutSize,
}: Readonly<{
  uri: string | undefined;
  label: string;
  children?: (size: number) => ReactNode;
  onLayoutSize?: (size: number) => void;
}>) {
  const t = useTheme();
  const [size, setSize] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSize(w);
    onLayoutSize?.(w);
  };
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: "100%", aspectRatio: 1, borderRadius: t.radius.md, overflow: "hidden", backgroundColor: t.colors.surfaceSunken }}>
      <RemoteImage uri={uri} width="100%" aspectRatio={1} contentFit="contain" radius={0} style={{ position: "absolute", backgroundColor: "transparent" }} />
      {size > 0 && children ? (
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          {children(size)}
        </Svg>
      ) : null}
    </View>
  );
}

/** Legible map text: a stroked halo copy underneath the filled text. */
export function HaloText({ x, y, text, fill, halo, fontSize = 10 }: Readonly<{ x: number; y: number; text: string; fill: string; halo: string; fontSize?: number }>) {
  return (
    <>
      <SvgText x={x} y={y} fontSize={fontSize} fontWeight="700" textAnchor="middle" stroke={halo} strokeWidth={3} fill={halo}>
        {text}
      </SvgText>
      <SvgText x={x} y={y} fontSize={fontSize} fontWeight="700" textAnchor="middle" fill={fill}>
        {text}
      </SvgText>
    </>
  );
}
