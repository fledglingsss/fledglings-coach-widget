import { describe, expect, it } from "vitest";

import {
  crisisHeuristic,
  guardReply,
  sanitiseLine,
  sanitiseText,
} from "../src/lib/safety";

/* Invisible characters built explicitly so this source file stays pure
 * ASCII and the assertions are deterministic. */
const CTRL = String.fromCharCode(0x01); // SOH control character
const ZWSP = String.fromCharCode(0x200b); // zero-width space
const RLO = String.fromCharCode(0x202e); // right-to-left override

describe("sanitiseText", () => {
  it("returns empty string for non-strings", () => {
    expect(sanitiseText(undefined, 10)).toBe("");
    expect(sanitiseText(42, 10)).toBe("");
    expect(sanitiseText(null, 10)).toBe("");
  });

  it("strips control and zero-width characters but keeps newlines", () => {
    expect(sanitiseText("a" + CTRL + "bc", 10)).toBe("abc");
    expect(sanitiseText("a" + ZWSP + "b" + RLO + "c", 10)).toBe("abc");
    expect(sanitiseText("line one\nline two", 40)).toBe("line one\nline two");
    expect(sanitiseText("tab\there", 20)).toBe("tab\there");
  });

  it("trims and caps length", () => {
    expect(sanitiseText("  hello  ", 10)).toBe("hello");
    expect(sanitiseText("x".repeat(50), 10)).toHaveLength(10);
  });
});

describe("sanitiseLine", () => {
  it("collapses internal whitespace to single spaces", () => {
    expect(sanitiseLine("Budgeting \n  That Works", 40)).toBe(
      "Budgeting That Works",
    );
  });
});

describe("crisisHeuristic", () => {
  it("fires on plain risk-of-harm statements", () => {
    const crisis = [
      "I want to die",
      "i've been thinking about suicide",
      "I keep hurting myself",
      "sometimes I think about killing myself",
      "my stepdad is abusing me",
      "I think I'm being groomed by someone online",
      "I feel unsafe at home",
      "there's no reason to carry on",
    ];
    for (const message of crisis) {
      expect(crisisHeuristic(message), message).toBe(true);
    }
  });

  it("does not fire on ordinary learning questions", () => {
    const safe = [
      "how do I read a payslip?",
      "what is phishing and how do scams work?",
      "the module on drug awareness was interesting",
      "I failed my mock interview and feel rubbish",
      "how do I complain about my apprenticeship wage?",
      "my landlord is putting the rent up, what are my rights?",
      "this budgeting module is killing me lol",
    ];
    for (const message of safe) {
      expect(crisisHeuristic(message), message).toBe(false);
    }
  });
});

describe("guardReply", () => {
  it("passes an ordinary coach reply through", () => {
    expect(
      guardReply("A payslip shows your gross pay, deductions and net pay."),
    ).toBe("A payslip shows your gross pay, deductions and net pay.");
  });

  it("rejects empty replies", () => {
    expect(guardReply("")).toBeNull();
    expect(guardReply("   ")).toBeNull();
  });

  it("rejects prompt-scaffolding leaks", () => {
    expect(
      guardReply("Sure! <context>learner first name: Alex</context>"),
    ).toBeNull();
    expect(
      guardReply("You are Fledge, the Fledglings learning coach and..."),
    ).toBeNull();
    expect(guardReply("My system prompt says I must...")).toBeNull();
    expect(guardReply("HARD RULES\n1. Never give scores")).toBeNull();
  });

  it("caps runaway replies at the length limit", () => {
    const long = guardReply("word ".repeat(2000));
    expect(long).not.toBeNull();
    expect((long as string).length).toBeLessThanOrEqual(1400);
  });
});
