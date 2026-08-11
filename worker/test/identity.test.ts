import { describe, expect, it } from "vitest";

import {
  addBinding,
  decideMint,
  IDENTITY_TTL_SECS,
  MAX_BOUND_DEVICES,
  mintIdentityToken,
  parseBindings,
  parseIdentityToken,
  verifyIdentityToken,
} from "../src/lib/identity";
import { isOriginAllowed, isSchoolOrigin } from "../src/lib/origin";

const SECRET = "test-signing-secret-value";
const EMAIL = "learner@example.com";
const DEVICE = "0123456789abcdef";
const OTHER_DEVICE = "fedcba9876543210";
const NOW = 1_785_000_000;

async function token(overrides: { email?: string; device?: string; now?: number; ttl?: number } = {}) {
  const t = await mintIdentityToken(
    SECRET,
    overrides.email ?? EMAIL,
    overrides.device ?? DEVICE,
    overrides.now ?? NOW,
    overrides.ttl,
  );
  if (t === null) throw new Error("mint returned null");
  return t;
}

describe("mintIdentityToken", () => {
  it("mints a token that verifies for its email and device", async () => {
    const t = await token();
    expect(await verifyIdentityToken(SECRET, t, NOW + 60, DEVICE)).toBe(EMAIL);
  });

  it("lowercases and trims the email it carries", async () => {
    const t = await token({ email: "  Learner@Example.COM " });
    expect(await verifyIdentityToken(SECRET, t, NOW, DEVICE)).toBe(EMAIL);
  });

  it("refuses to mint without a secret or with junk input", async () => {
    expect(await mintIdentityToken("", EMAIL, DEVICE, NOW)).toBeNull();
    expect(await mintIdentityToken(SECRET, "not-an-email", DEVICE, NOW)).toBeNull();
    expect(await mintIdentityToken(SECRET, EMAIL, "NOT-A-HASH", NOW)).toBeNull();
  });
});

describe("verifyIdentityToken", () => {
  it("rejects a tampered payload (the whole point)", async () => {
    const t = await token();
    const [payload, sig] = t.split(".");
    /* Re-encode the claims with a different victim email, keep the sig. */
    const claims = JSON.parse(
      Buffer.from(payload!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    claims.e = "victim@example.com";
    const forgedPayload = Buffer.from(JSON.stringify(claims))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(
      await verifyIdentityToken(SECRET, `${forgedPayload}.${sig}`, NOW, DEVICE),
    ).toBeNull();
  });

  it("rejects a token minted with a different secret", async () => {
    const t = await token();
    expect(await verifyIdentityToken("another-secret", t, NOW, DEVICE)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const t = await token();
    expect(await verifyIdentityToken(SECRET, t, NOW + IDENTITY_TTL_SECS + 1, DEVICE)).toBeNull();
  });

  it("rejects a token replayed on another device", async () => {
    const t = await token();
    expect(await verifyIdentityToken(SECRET, t, NOW, OTHER_DEVICE)).toBeNull();
    /* …and still verifies when the device is not being checked. */
    expect(await verifyIdentityToken(SECRET, t, NOW)).toBe(EMAIL);
  });

  it("fails closed on a missing secret, junk and empty input", async () => {
    const t = await token();
    expect(await verifyIdentityToken("", t, NOW, DEVICE)).toBeNull();
    expect(await verifyIdentityToken(SECRET, "", NOW, DEVICE)).toBeNull();
    expect(await verifyIdentityToken(SECRET, "no-dot-here", NOW, DEVICE)).toBeNull();
    expect(await verifyIdentityToken(SECRET, undefined, NOW, DEVICE)).toBeNull();
    expect(await verifyIdentityToken(SECRET, `${"x".repeat(40)}.${"a".repeat(64)}`, NOW, DEVICE)).toBeNull();
  });

  it("rejects a token claiming to be issued far in the future", async () => {
    const t = await token({ now: NOW + 4000 });
    expect(await verifyIdentityToken(SECRET, t, NOW, DEVICE)).toBeNull();
  });
});

describe("parseIdentityToken", () => {
  it("reads claims for display without verifying", async () => {
    const parsed = parseIdentityToken(await token());
    expect(parsed).not.toBeNull();
    expect(parsed!.claims.e).toBe(EMAIL);
    expect(parsed!.claims.exp - parsed!.claims.iat).toBe(IDENTITY_TTL_SECS);
  });

  it("returns null for anything that is not a token", () => {
    expect(parseIdentityToken(null)).toBeNull();
    expect(parseIdentityToken("short")).toBeNull();
    expect(parseIdentityToken(`${"z".repeat(30)}.${"a".repeat(64)}`)).toBeNull();
  });
});

describe("device bindings", () => {
  it("parses, ignores junk and caps the list", () => {
    expect(parseBindings(null)).toEqual([]);
    expect(parseBindings("not json")).toEqual([]);
    expect(parseBindings(JSON.stringify([DEVICE, "nope", 42]))).toEqual([DEVICE]);
    const many = Array.from({ length: 20 }, (_, i) => i.toString(16).padStart(16, "0"));
    expect(parseBindings(JSON.stringify(many))).toHaveLength(MAX_BOUND_DEVICES);
  });

  it("adds without duplicating, and REFUSES past the cap rather than evicting", () => {
    expect(addBinding([DEVICE], DEVICE)).toEqual([DEVICE]);
    const full = Array.from({ length: MAX_BOUND_DEVICES }, (_, i) =>
      i.toString(16).padStart(16, "0"),
    );
    /* Evicting would let repeated mints push the learner's own device
     * off their record and lock them out — so the list is immutable
     * once full, and the real device keeps its place. */
    expect(addBinding(full, DEVICE)).toEqual(full);
    expect(addBinding(full, DEVICE)).not.toContain(DEVICE);
    expect(full[0]).toBe(addBinding(full, DEVICE)[0]);
  });

  it("a full record admits nobody new — even from a school page", () => {
    const full = Array.from({ length: MAX_BOUND_DEVICES }, (_, i) =>
      i.toString(16).padStart(16, "0"),
    );
    expect(decideMint(full, DEVICE, false)).toEqual({
      allow: false,
      reason: "too_many_devices",
    });
    expect(decideMint(full, DEVICE, true)).toEqual({
      allow: false,
      reason: "too_many_devices",
    });
    /* A device already on the list still works. */
    expect(decideMint(full, full[0]!, false).allow).toBe(true);
  });
});

describe("decideMint", () => {
  it("lets an unclaimed email be claimed anywhere (first use)", () => {
    expect(decideMint([], DEVICE, false)).toEqual({ allow: true, reason: "first_claim" });
  });

  it("lets a device that already holds the email mint again", () => {
    expect(decideMint([DEVICE], DEVICE, false)).toEqual({
      allow: true,
      reason: "known_device",
    });
  });

  it("BLOCKS a stranger's browser claiming an email already in use", () => {
    expect(decideMint([OTHER_DEVICE], DEVICE, false)).toEqual({
      allow: false,
      reason: "claimed_elsewhere",
    });
  });

  it("allows a new device when the page came from the school (signed-in embed)", () => {
    expect(decideMint([OTHER_DEVICE], DEVICE, true)).toEqual({
      allow: true,
      reason: "school_origin",
    });
  });
});

describe("isSchoolOrigin", () => {
  const SCHOOL_URL = "https://fledglings.mycourse.app";

  it("recognises the school's own domains", () => {
    expect(isSchoolOrigin("https://www.fledglings.co")).toBe(true);
    expect(isSchoolOrigin("https://fledglings-school.co.uk")).toBe(true);
  });

  it("recognises the CONFIGURED LearnWorlds tenant only", () => {
    expect(isSchoolOrigin("https://fledglings.mycourse.app", SCHOOL_URL)).toBe(true);
    /* Anyone can create a free school at their own subdomain — the
     * vendor apex must never count as ours. */
    expect(isSchoolOrigin("https://attacker.learnworlds.com", SCHOOL_URL)).toBe(false);
    expect(isSchoolOrigin("https://attacker.mycourse.app", SCHOOL_URL)).toBe(false);
    expect(isSchoolOrigin("https://fledglings.mycourse.app")).toBe(false); // no config passed
    expect(isSchoolOrigin("https://fledglings.mycourse.app", "not a url")).toBe(false);
  });

  it("does NOT treat the worker's own domain or localhost as the school", () => {
    expect(isSchoolOrigin("https://fledglings-coach.fledglings.workers.dev")).toBe(false);
    expect(isSchoolOrigin("http://localhost:8787")).toBe(false);
    expect(isSchoolOrigin("")).toBe(false);
    expect(isSchoolOrigin("not a url")).toBe(false);
    /* …while both remain allowed callers of the API. */
    expect(isOriginAllowed("https://fledglings-coach.fledglings.workers.dev")).toBe(true);
  });
});
