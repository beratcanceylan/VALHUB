import { decodeStoredTokens, encodeTokens } from "@/auth/tokens";

describe("stored Riot tokens", () => {
  it("round-trips", () => {
    const t = { accessToken: "a", idToken: "i", expiresAt: 5 };
    expect(decodeStoredTokens(encodeTokens(t))).toEqual(t);
  });

  it("rejects garbage instead of throwing", () => {
    expect(decodeStoredTokens("not json")).toBeUndefined();
    expect(decodeStoredTokens(JSON.stringify({ accessToken: 1 }))).toBeUndefined();
    expect(decodeStoredTokens(null)).toBeUndefined();
  });
});
