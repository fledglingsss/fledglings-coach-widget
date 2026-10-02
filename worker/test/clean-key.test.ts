import { describe, expect, it } from "vitest";

import { cleanApiKey, generate } from "../src/lib/anthropic";

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

  it("survives a missing secret, so the health check can report one", () => {
    expect(cleanApiKey(undefined as unknown as string)).toBe("");
    expect(cleanApiKey("   ")).toBe("");
  });
});

describe("a model call with no key", () => {
  it("names the missing secret instead of failing on a property of undefined", async () => {
    /* A deployment or a local run with no key used to die with "Cannot
     * read properties of undefined (reading 'match')". */
    for (const key of ["", "   ", undefined as unknown as string]) {
      await expect(generate(key, "m", "system", "user", 10)).rejects.toThrow(/ANTHROPIC_API_KEY is not set/);
    }
  });
});
