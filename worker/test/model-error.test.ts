import { describe, expect, it } from "vitest";

import { classifyModelError } from "../src/lib/model-error";

describe("classifyModelError", () => {
  it("detects exhausted credits (the real Anthropic 400 shape)", () => {
    expect(
      classifyModelError({
        status: 400,
        message:
          '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}',
      }),
    ).toBe("billing");
    expect(
      classifyModelError({
        status: 400,
        error: { error: { message: "Your credit balance is too low" } },
      }),
    ).toBe("billing");
    expect(classifyModelError({ status: 402, message: "Payment Required" })).toBe(
      "billing",
    );
  });

  it("detects auth failures", () => {
    expect(classifyModelError({ status: 401, message: "authentication_error" })).toBe("auth");
    expect(classifyModelError({ status: 403, message: "permission_error" })).toBe("auth");
    expect(
      classifyModelError({ message: "Could not resolve authentication method." }),
    ).toBe("auth");
  });

  it("detects busy upstream", () => {
    expect(classifyModelError({ status: 429, message: "rate_limit_error" })).toBe("busy");
    expect(classifyModelError({ status: 529, message: "overloaded_error" })).toBe("busy");
  });

  it("everything else is other", () => {
    expect(classifyModelError(new Error("fetch failed"))).toBe("other");
    expect(classifyModelError({ status: 500, message: "api_error" })).toBe("other");
    expect(classifyModelError(undefined)).toBe("other");
  });
});
