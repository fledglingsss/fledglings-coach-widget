import { describe, expect, it } from "vitest";

import { isOriginAllowed } from "../src/lib/origin";

describe("isOriginAllowed", () => {
  it("allows the Fledglings school domains", () => {
    expect(isOriginAllowed("https://www.fledglings.co")).toBe(true);
    expect(isOriginAllowed("https://fledglings.co")).toBe(true);
    expect(isOriginAllowed("https://www.fledglings-school.co.uk")).toBe(true);
  });

  it("allows LearnWorlds-hosted surfaces", () => {
    expect(isOriginAllowed("https://myschool.learnworlds.com")).toBe(true);
    expect(isOriginAllowed("https://lwfiles.mycourse.app")).toBe(true);
  });

  it("allows the worker's own preview page", () => {
    expect(isOriginAllowed("https://fledglings-coach.fledglings.workers.dev")).toBe(true);
    expect(isOriginAllowed("https://evil.fledglings.workers.dev")).toBe(false);
  });

  it("allows localhost for development", () => {
    expect(isOriginAllowed("http://localhost:8799")).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:3000")).toBe(true);
  });

  it("rejects everything else, including look-alikes", () => {
    expect(isOriginAllowed("https://evil.example.com")).toBe(false);
    expect(isOriginAllowed("https://fledglings.co.evil.com")).toBe(false);
    expect(isOriginAllowed("https://notfledglings.co")).toBe(false);
    expect(isOriginAllowed("")).toBe(false);
    expect(isOriginAllowed("not a url")).toBe(false);
  });
});
