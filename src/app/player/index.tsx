import { Redirect } from "expo-router";

/** `valhub://player` resolves to the Performance tab (the player overview). */
export default function PlayerRedirect() {
  return <Redirect href="/performance" />;
}
