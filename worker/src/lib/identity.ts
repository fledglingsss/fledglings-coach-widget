/* Signed identity tokens.
 *
 * THE RULE: an email address is never accepted as a claim. The only
 * thing that can key a learner's score history is a token this worker
 * minted and signed — issued at `/api/identity`, bound to the device
 * that asked for it, and expiring.
 *
 * Why binding matters: `learner_id` (the device id) travels with every
 * request already, so a token pasted onto another machine simply fails
 * — a leaked link is not a key to someone's history.
 *
 * What this cannot do: without LearnWorlds SSO or an email round-trip
 * there is no way to *prove* a person owns an address. The mint route
 * therefore layers what is available (school-origin gate, existence
 * check, first-claim binding, hard rate limits) and the residual is
 * documented honestly rather than hidden — see docs/IDENTITY.md.
 *
 * Token shape: <b64url(JSON claims)>.<hex HMAC-SHA256>
 */

import { b64urlDecode, b64urlEncode, signPayload, verifyPayload } from "./sign";

/** How long a minted token stays valid. Long enough that a learner is
 * not re-linking every week; short enough that an abandoned device
 * stops carrying an identity for ever. */
export const IDENTITY_TTL_SECS = 30 * 24 * 3600;

/** Clock-skew grace for a token that claims to be issued fractionally
 * in the future (browser clocks drift). */
const FUTURE_GRACE_SECS = 300;

export interface IdentityClaims {
  /** The learner's email — the key their scores hang from. */
  e: string;
  /** First 16 chars of the device hash the token was minted for. */
  d: string;
  /** Issued-at / expires-at, epoch seconds. */
  iat: number;
  exp: number;
}

/** The exact string that gets HMAC-signed. Versioned so the format can
 * move on without old tokens silently verifying against new rules. */
export function identitySigningPayload(payloadB64: string): string {
  return `fl-identity:v1:${payloadB64}`;
}

function claimsFrom(value: unknown): IdentityClaims | null {
  if (typeof value !== "object" || value === null) return null;
  const c = value as Record<string, unknown>;
  if (
    typeof c.e !== "string" ||
    typeof c.d !== "string" ||
    typeof c.iat !== "number" ||
    typeof c.exp !== "number" ||
    !Number.isFinite(c.iat) ||
    !Number.isFinite(c.exp)
  ) {
    return null;
  }
  const email = c.e.trim().toLowerCase();
  if (email.length < 6 || email.length > 120 || email.indexOf("@") === -1) return null;
  if (!/^[0-9a-f]{16}$/.test(c.d)) return null;
  return { e: email, d: c.d, iat: Math.round(c.iat), exp: Math.round(c.exp) };
}

/** Mint a signed token for an email + device. The caller is
 * responsible for having decided the learner may claim this email. */
export async function mintIdentityToken(
  secret: string,
  email: string,
  deviceHash16: string,
  nowSecs: number,
  ttlSecs: number = IDENTITY_TTL_SECS,
): Promise<string | null> {
  const claims = claimsFrom({
    e: email,
    d: deviceHash16,
    iat: nowSecs,
    exp: nowSecs + ttlSecs,
  });
  if (!secret || claims === null) return null;
  const payloadB64 = b64urlEncode(JSON.stringify(claims));
  const sig = await signPayload(secret, identitySigningPayload(payloadB64));
  return `${payloadB64}.${sig}`;
}

/** Split a token without verifying it — used for display-only reads in
 * the browser and by the verifier below. Never trust the result of
 * this on the server without calling verifyIdentityToken. */
export function parseIdentityToken(
  token: unknown,
): { claims: IdentityClaims; payloadB64: string; sig: string } | null {
  if (typeof token !== "string" || token.length < 20 || token.length > 2000) {
    return null;
  }
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const json = b64urlDecode(payloadB64);
  if (json === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const claims = claimsFrom(parsed);
  if (claims === null) return null;
  return { claims, payloadB64, sig };
}

/**
 * Verify a token and return the email it carries, or null.
 *
 * Fails closed on: a missing secret, a bad signature, expiry, a token
 * issued in the future beyond clock grace, and — when `deviceHash16`
 * is supplied — a device other than the one it was minted for.
 */
export async function verifyIdentityToken(
  secret: string,
  token: unknown,
  nowSecs: number,
  deviceHash16?: string,
): Promise<string | null> {
  if (!secret) return null;
  const parsed = parseIdentityToken(token);
  if (parsed === null) return null;
  const { claims, payloadB64, sig } = parsed;
  if (claims.exp <= nowSecs) return null;
  if (claims.iat - nowSecs > FUTURE_GRACE_SECS) return null;
  if (deviceHash16 !== undefined && claims.d !== deviceHash16) return null;
  const ok = await verifyPayload(secret, identitySigningPayload(payloadB64), sig);
  return ok ? claims.e : null;
}

/* ---------------- first-claim (device binding) ---------------- */

/** Devices bound to one email. Capped so a shared classroom machine
 * cannot grow the record without bound. */
export const MAX_BOUND_DEVICES = 6;

export function parseBindings(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (Array.isArray(parsed) ? parsed : [])
      .filter((d): d is string => typeof d === "string" && /^[0-9a-f]{16}$/.test(d))
      .slice(0, MAX_BOUND_DEVICES);
  } catch {
    return [];
  }
}

/** Add a device, or return the list unchanged when it is full.
 *
 * Deliberately fails CLOSED: evicting the oldest binding would let
 * repeated mints push a learner's real device off their own record and
 * lock them out. A full list means no new device — the learner (or
 * Fledglings) clears it instead. */
export function addBinding(existing: string[], deviceHash16: string): string[] {
  if (existing.includes(deviceHash16)) return existing;
  if (existing.length >= MAX_BOUND_DEVICES) return existing;
  return [...existing, deviceHash16];
}

/** True when the list is full and this device is not on it. */
export function bindingsFull(existing: string[], deviceHash16: string): boolean {
  return existing.length >= MAX_BOUND_DEVICES && !existing.includes(deviceHash16);
}

export type MintDecision =
  | { allow: true; reason: "first_claim" | "known_device" | "link_code" }
  | { allow: false; reason: "claimed_elsewhere" | "too_many_devices" };

/**
 * Decide whether this device may mint a token for this email.
 *
 * Naming an address is never enough once someone is using it. The only
 * ways in are: a device already on the record, an address nobody has
 * claimed yet, or a link code proved from an already-linked device.
 *
 * There is deliberately NO "came from a school page" branch: that
 * rested on an `Origin` header, which a non-browser client can simply
 * assert. The link code replaces it — see docs/IDENTITY.md.
 */
export function decideMint(
  bindings: string[],
  deviceHash16: string,
  withLinkCode: boolean,
): MintDecision {
  if (bindings.includes(deviceHash16)) return { allow: true, reason: "known_device" };
  /* A full record admits nobody new — even with a valid code — so the
   * cap can never be used to displace the real learner. */
  if (bindingsFull(bindings, deviceHash16)) {
    return { allow: false, reason: "too_many_devices" };
  }
  if (withLinkCode) return { allow: true, reason: "link_code" };
  if (bindings.length === 0) return { allow: true, reason: "first_claim" };
  return { allow: false, reason: "claimed_elsewhere" };
}

/* ------------------------------------------------------------------
 * Device link codes — how a learner adds a second device.
 *
 * A device that already holds the identity asks for a code; the new
 * device types it in. Possession of the code IS the proof, so no
 * header, origin or guessable address is involved.
 * ------------------------------------------------------------------ */

/** Short enough to read off a phone screen, long enough that guessing
 * is hopeless: 31^6 ≈ 887 million, one-time use, ten-minute life, and
 * redemption attempts are capped per device and per IP. */
export const LINK_CODE_LENGTH = 6;
export const LINK_CODE_TTL_SECS = 600;

/* No 0/O/1/I/L — a code is read aloud and typed by a tired teenager. */
const LINK_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** A fresh code, using the platform CSPRNG. */
export function generateLinkCode(): string {
  const bytes = new Uint8Array(LINK_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const b of bytes) code += LINK_CODE_ALPHABET[b % LINK_CODE_ALPHABET.length];
  return code;
}

/** Accept what the learner actually types — lower case, spaces and
 * hyphens are all fine. Anything outside the alphabet is dropped
 * (the ambiguous characters are not in it to begin with), and the
 * result must be exactly a code's worth. Returns "" otherwise. */
export function normaliseLinkCode(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 40) return "";
  const candidate = raw
    .toUpperCase()
    .split("")
    .filter((ch) => LINK_CODE_ALPHABET.includes(ch))
    .join("");
  return candidate.length === LINK_CODE_LENGTH ? candidate : "";
}

/** Group as XXX-XXX purely for display. */
export function formatLinkCode(code: string): string {
  return code.length === LINK_CODE_LENGTH ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export interface LinkCodeRecord {
  /** The address the code hands over. */
  e: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

export function parseLinkCodeRecord(
  raw: string | null,
  nowSecs: number,
): LinkCodeRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LinkCodeRecord>;
    if (typeof parsed.e !== "string" || typeof parsed.exp !== "number") return null;
    const email = parsed.e.trim().toLowerCase();
    if (email.indexOf("@") === -1 || parsed.exp <= nowSecs) return null;
    return { e: email, exp: parsed.exp };
  } catch {
    return null;
  }
}
