import { Redirect } from "expo-router";

/** `valhub://player` resolves to the Account tab, home of everything tied to a Riot account. */
export default function PlayerRedirect() {
  return <Redirect href="/account" />;
}
