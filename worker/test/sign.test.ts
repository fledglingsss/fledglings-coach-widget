import { describe, expect, it } from "vitest";

import {
  b64urlDecode,
  b64urlEncode,
  signPayload,
  verifyPayload,
} from "../src/lib/sign";

describe("signing", () => {
  it("round-trips base64url including unicode", () => {
    const text = JSON.stringify({ name: "Zoë", em: "—", n: 3 });
    expect(b64urlDecode(b64urlEncode(text))).toBe(text);
  });

  it("returns null for corrupt base64url", () => {
    expect(b64urlDecode("!!not-base64!!")).toBeNull();
  });

  it("verifies its own signatures and rejects tampering", async () => {
    const payload = b64urlEncode('{"v":1}');
    const sig = await signPayload("secret-a", payload);
    expect(await verifyPayload("secret-a", payload, sig)).toBe(true);
    expect(await verifyPayload("secret-a", payload + "x", sig)).toBe(false);
    expect(await verifyPayload("secret-b", payload, sig)).toBe(false);
    expect(await verifyPayload("secret-a", payload, "deadbeef")).toBe(false);
  });
});
