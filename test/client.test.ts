import { AppError } from "@valhub/domain";
import { call } from "@/data/client";

describe("call()", () => {
  it("returns loader data that matches the contract", async () => {
    await expect(call("capability", () => ({ capability: "AUDIO", available: false, reason: "RIGHTS_UNCLEARED" }))).resolves.toMatchObject({ capability: "AUDIO" });
  });

  it("turns contract mismatches into VALIDATION errors", async () => {
    await expect(call("capability", () => ({ nope: true }))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("passes AppErrors through and wraps unknown errors as UPSTREAM", async () => {
    await expect(
      call("capability", () => {
        throw new AppError("TIMEOUT", "t");
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    await expect(
      call("capability", () => {
        throw new Error("boom");
      }),
    ).rejects.toMatchObject({ code: "UPSTREAM" });
  });
});
