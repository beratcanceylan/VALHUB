import type { FontSource } from "expo-font";
// Material Symbols draws every icon on Android (see components/ui/Icon); loading it before the
// first frame keeps icons from popping in after the text around them.
import regular from "expo-symbols/androidWeights/regular";

export const startupFonts: Record<string, FontSource> = { [regular.name]: regular.font };
