import { describe, expect, it } from "vitest";
import { fnv1a } from "../src/lib/hash";

describe("fnv1a", () => {
  it("is stable and 16 hex chars", () => {
    expect(fnv1a("https://playvalorant.com/a")).toBe(fnv1a("https://playvalorant.com/a"));
    expect(fnv1a("x")).toMatch(/^[0-9a-f]{16}$/);
    expect(fnv1a("a")).not.toBe(fnv1a("b"));
  });
});
