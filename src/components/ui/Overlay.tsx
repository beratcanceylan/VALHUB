import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Modal as RNModal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { IconButton } from "./Button";
import { Text } from "./Text";

export function Modal({ visible, title, onClose, children }: Readonly<{ visible: boolean; title: string; onClose: () => void; children: ReactNode }>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.scrim, justifyContent: "center", padding: t.space[6] }}>
        <View accessibilityViewIsModal style={{ backgroundColor: t.colors.surface, borderRadius: t.radius.lg + 4, borderCurve: "continuous", padding: t.space[5], gap: t.space[3], maxHeight: "90%" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text variant="titleSm" weight="semibold" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={3}>
              {title}
            </Text>
            <IconButton icon="close" label={tr("common.close")} onPress={onClose} />
          </View>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

type ToastFn = (message: string) => void;
const ToastContext = createContext<ToastFn>(() => undefined);

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ToastFn>(
    (text) => {
      setMessage(text);
      AccessibilityInfo.announceForAccessibility(text);
      Animated.timing(opacity, { toValue: 1, duration: t.motion.fast, useNativeDriver: true }).start();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: t.motion.base, useNativeDriver: true }).start(() => setMessage(null));
      }, 2200);
    },
    [opacity, t.motion.base, t.motion.fast],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: t.space[4],
            right: t.space[4],
            bottom: insets.bottom + 72,
            opacity,
            backgroundColor: t.colors.textPrimary,
            borderRadius: t.radius.lg,
            borderCurve: "continuous",
            paddingVertical: t.space[3],
            paddingHorizontal: t.space[4],
          }}
        >
          <Text color="textInverse" weight="medium">
            {message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}
