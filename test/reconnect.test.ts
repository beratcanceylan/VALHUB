import { AppError } from "@valhub/domain";
import { needsReconnect } from "@/auth/reconnect";

describe("needsReconnect", () => {
  it("asks to reconnect when a player query failed with UNAUTHORIZED", () => {
    expect(needsReconnect(new AppError("UNAUTHORIZED", "expired"))).toBe(true);
  });
  it("leaves other failures to the normal error state", () => {
    expect(needsReconnect(new AppError("NETWORK", "offline"))).toBe(false);
    expect(needsReconnect(new Error("boom"))).toBe(false);
    expect(needsReconnect(null)).toBe(false);
  });
});
