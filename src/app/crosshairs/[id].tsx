import { Redirect, useLocalSearchParams } from "expo-router";

/** Deep link `valhub://crosshairs/{id}` opens the saved crosshair in the lab. */
export default function CrosshairDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/crosshairs/editor", params: { id } }} />;
}
