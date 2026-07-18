import { describe, expect, it } from "vitest";

import { cleanApiKey } from "../src/lib/anthropic";

const KEY = "sk-ant-api03-" + "a".repeat(40);

describe("cleanApiKey", () => {
  it("passes a bare key through unchanged", () => {
    expect(cleanApiKey(KEY)).toBe(KEY);
  });

  it("extracts the key from surrounding whitespace and newlines", () => {
    expect(cleanApiKey(`  ${KEY}\r\n`)).toBe(KEY);
  });

  it("extracts the key from quotes", () => {
    expect(cleanApiKey(`"${KEY}"`)).toBe(KEY);
  });

  it("extracts the key from a pasted curl blob", () => {
    const blob = `curl https://api.anthropic.com/v1/messages -H "x-api-key: ${KEY}" -H "content-type: application/json"`;
    expect(cleanApiKey(blob)).toBe(KEY);
  });

  it("strips non-header-safe characters when no sk-ant token is present", () => {
    expect(cleanApiKey("some-other-key\r\n")).toBe("some-other-key");
  });
});
