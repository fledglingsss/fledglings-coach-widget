import { describe, expect, it } from "vitest";

import {
  FEED_MAX,
  parseWebhookEvent,
  pushFeed,
  toFeedEntry,
  verifyWebhookSignature,
  type FeedEntry,
} from "../src/lib/webhooks";

const NOW = new Date("2026-07-21T16:00:00Z");
const NOW_S = NOW.getTime() / 1000;

const COMPLETED = {
  version: 2,
  type: "courseCompleted",
  trigger: "course_completed",
  data: {
    completed_at: NOW_S - 30,
    course: { id: "sso-2-2", title: "Money Confidence & Everyday Decisions" },
    user: {
      email: "Sak.Awan@Example.com",
      username: "sakawan",
      first_name: "Sak",
      last_name: "Awan",
      tags: ["Swift Learners"],
      created: NOW_S - 90 * 86400,
    },
  },
};

describe("verifyWebhookSignature", () => {
  it("accepts matching signatures with or without the v1= prefix", () => {
    expect(verifyWebhookSignature("v1=abc123", "abc123")).toBe(true);
    expect(verifyWebhookSignature("abc123", "v1=abc123")).toBe(true);
    expect(verifyWebhookSignature(" v1=abc123 ", "abc123")).toBe(true);
  });
  it("rejects mismatches, empties and absences", () => {
    expect(verifyWebhookSignature("v1=abc124", "abc123")).toBe(false);
    expect(verifyWebhookSignature(undefined, "abc123")).toBe(false);
    expect(verifyWebhookSignature("v1=", "")).toBe(false);
  });
});

describe("parseWebhookEvent", () => {
  it("parses courseCompleted with email lowered and tags captured", () => {
    const ev = parseWebhookEvent(COMPLETED, NOW);
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe("courseCompleted");
    expect(ev!.email).toBe("sak.awan@example.com");
    expect(ev!.name).toBe("Sak Awan");
    expect(ev!.tags).toEqual(["Swift Learners"]);
    expect(ev!.courseTitle).toBe("Money Confidence & Everyday Decisions");
    expect(ev!.at).toBe(NOW_S - 30);
  });

  it("ignores payment/subscription and malformed payloads", () => {
    expect(parseWebhookEvent({ type: "paymentCreated", data: {} }, NOW)).toBeNull();
    expect(parseWebhookEvent({ type: "subscriptionUpdated", data: {} }, NOW)).toBeNull();
    expect(parseWebhookEvent({ type: "courseCompleted", data: { user: {} } }, NOW)).toBeNull();
    expect(parseWebhookEvent("junk", NOW)).toBeNull();
  });
});

describe("toFeedEntry", () => {
  it("maps completions and only surfaces genuinely-new users as joined", () => {
    const ev = parseWebhookEvent(COMPLETED, NOW)!;
    const entry = toFeedEntry(ev, "Swift Learners", NOW)!;
    expect(entry.kind).toBe("completion");
    expect(entry.detail).toBe("Money Confidence & Everyday Decisions");
    expect(entry.cohort).toBe("Swift Learners");

    const freshUser = parseWebhookEvent(
      {
        type: "userUpdated",
        data: { user: { email: "new@x.com", username: "new", created: NOW_S - 60 } },
      },
      NOW,
    )!;
    expect(toFeedEntry(freshUser, null, NOW)!.kind).toBe("joined");

    const oldUser = parseWebhookEvent(
      {
        type: "userUpdated",
        data: { user: { email: "old@x.com", username: "old", created: NOW_S - 86400 } },
      },
      NOW,
    )!;
    expect(toFeedEntry(oldUser, null, NOW)).toBeNull();
  });
});

describe("pushFeed", () => {
  const entry = (over: Partial<FeedEntry>): FeedEntry => ({
    kind: "completion",
    email: "a@b.c",
    name: "A",
    detail: "Module",
    cohort: null,
    at: 100,
    ...over,
  });

  it("prepends, dedupes retries and caps the buffer", () => {
    let feed: FeedEntry[] = [entry({ at: 100 })];
    feed = pushFeed(feed, entry({ at: 102 })); // LW retry, within 5s
    expect(feed.length).toBe(1);
    feed = pushFeed(feed, entry({ at: 200, detail: "Other" }));
    expect(feed[0]!.detail).toBe("Other");
    for (let i = 0; i < FEED_MAX + 20; i++) {
      feed = pushFeed(feed, entry({ at: 300 + i * 10, email: `u${i}@x.com` }));
    }
    expect(feed.length).toBe(FEED_MAX);
  });
});

describe("tag events", () => {
  it("accepts userTagAdded/Deleted but keeps them out of the feed", () => {
    const ev = parseWebhookEvent(
      { type: "userTagAdded", data: { user: { email: "a@b.c", username: "ab" } } },
      NOW,
    );
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe("userTagAdded");
    expect(toFeedEntry(ev!, null, NOW)).toBeNull();
    const del = parseWebhookEvent(
      { type: "userTagDeleted", data: { user: { email: "a@b.c", username: "ab" } } },
      NOW,
    );
    expect(toFeedEntry(del!, null, NOW)).toBeNull();
  });
});
