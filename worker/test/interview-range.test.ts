/* A tester's note: "Any first job / apprenticeship" was too broad, and
 * the practice interviews needed more range and more specific types.
 * The old bank was seven sets that shared four of their five
 * questions. These pin what replaced it, so it cannot quietly collapse
 * back into one interview with seven names. */
import { describe, expect, it } from "vitest";

import {
  INTERVIEW_GROUP_LABELS,
  INTERVIEW_ROLES,
  INTERVIEW_SETS,
  ROLE_LABELS,
  acceptedQuestions,
  questionSet,
  validateInterviewRequest,
} from "../src/lib/interview";
import type { InterviewRole } from "../src/lib/interview";
import { crisisHeuristic, crisisInRawRequest } from "../src/lib/safety";
import { renderInterviewPage } from "../src/pages-interview";

const ANSWER =
  "At my volunteering job I greeted visitors every week and helped them find the right room, staying calm when it was busy.";

const TEAMWORK =
  "Tell me about a time you worked with other people to get something done. What was your part in it?";

describe("range", () => {
  it("offers specific interview types as well as kinds of work", () => {
    const types = INTERVIEW_ROLES.filter((r) => INTERVIEW_SETS[r].group === "type");
    const sectors = INTERVIEW_ROLES.filter((r) => INTERVIEW_SETS[r].group === "sector");
    expect(types.length).toBeGreaterThanOrEqual(8);
    expect(sectors.length).toBeGreaterThanOrEqual(12);
    expect(types.length + sectors.length).toBe(INTERVIEW_ROLES.length);
    for (const wanted of ["apprenticeship", "part-time", "work-experience", "competency", "strengths"]) {
      expect(types).toContain(wanted);
    }
  });

  it("no longer offers the catch-all the tester called too broad", () => {
    for (const label of Object.values(ROLE_LABELS)) {
      expect(label).not.toMatch(/any first job/i);
    }
  });

  it("asks genuinely different questions from one set to the next", () => {
    const all = new Set(INTERVIEW_ROLES.flatMap((r) => questionSet(r)));
    expect(all.size).toBeGreaterThanOrEqual(85);
    /* the old bank shared four of five; no two sets may share more
     * than the opener and the closer */
    for (const a of INTERVIEW_ROLES) {
      for (const b of INTERVIEW_ROLES) {
        if (a >= b) continue;
        const shared = questionSet(a).filter((q) => questionSet(b).includes(q)).length;
        expect(shared, `${a} and ${b} share ${shared} questions`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("gives every set a distinct name and a line that says what it is like", () => {
    const labels = INTERVIEW_ROLES.map((r) => INTERVIEW_SETS[r].label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const r of INTERVIEW_ROLES) {
      const s = INTERVIEW_SETS[r];
      expect(s.blurb.length, r).toBeGreaterThan(30);
      expect(s.blurb.length, r).toBeLessThanOrEqual(120);
      expect(s.icon.length, r).toBeGreaterThan(0);
      expect(INTERVIEW_GROUP_LABELS).toHaveProperty(s.group);
    }
  });
});

describe("every question is one a learner can be fairly asked", () => {
  for (const role of INTERVIEW_ROLES) {
    it(`${role}: five distinct, speakable, dash-free questions`, () => {
      const qs = questionSet(role);
      expect(qs.length).toBe(5);
      expect(new Set(qs).size).toBe(5);
      for (const q of qs) {
        expect(q.length).toBeGreaterThanOrEqual(30);
        expect(q.length).toBeLessThanOrEqual(220);
        expect(q).not.toMatch(/[–—]/);
        expect(q).toMatch(/[.?]$/);
      }
      const s = INTERVIEW_SETS[role];
      expect(s.label + s.blurb + (s.prompt ?? "")).not.toMatch(/[–—]/);
    });
  }

  it("never words a question so that it trips the crisis screen itself", () => {
    /* The raw-request screen reads the question text too. A question
     * that matched would send every learner who chose that set to the
     * support message instead of their feedback. */
    for (const role of INTERVIEW_ROLES) {
      const s = INTERVIEW_SETS[role];
      for (const text of [...s.questions, s.label, s.blurb, s.prompt ?? ""]) {
        expect(crisisHeuristic(text), `${role}: ${text}`).toBe(false);
      }
      const body = {
        learner_id: "abc",
        role,
        answers: questionSet(role).map((q) => ({ question: q, answer: ANSWER })),
      };
      expect(crisisInRawRequest(body), role).toBe(false);
    }
  });
});

describe("scoring accepts what the page can send", () => {
  it("validates a full run of every set", () => {
    for (const role of INTERVIEW_ROLES) {
      const r = validateInterviewRequest({
        role,
        answers: questionSet(role).map((q) => ({ question: q, answer: ANSWER })),
      });
      expect("error" in r, role).toBe(false);
    }
  });

  it("tells the scorer the job, not the name of a format", () => {
    const ask = (role: InterviewRole) => {
      const r = validateInterviewRequest({
        role,
        answers: [{ question: questionSet(role)[0], answer: ANSWER }],
      });
      if ("error" in r) throw new Error(r.error);
      return r.roleLabel;
    };
    expect(ask("retail")).toBe("Retail");
    expect(ask("general")).toBe("A first job or apprenticeship");
    expect(ask("strengths")).toMatch(/strengths-based interview/);
    expect(ask("apprenticeship")).toBe("An apprenticeship");
  });

  it("keeps the pitch working: the classic set still opens with tell me about yourself", () => {
    expect(questionSet("general")[0]).toBe(
      "Tell me a bit about yourself and why you applied for this role.",
    );
  });

  it("does not throw away an interview begun before the bank changed", () => {
    /* a page loaded before the release is still holding the old five */
    for (const role of ["retail", "care", "general"] as const) {
      expect(acceptedQuestions(role).has(TEAMWORK), role).toBe(true);
      const r = validateInterviewRequest({ role, answers: [{ question: TEAMWORK, answer: ANSWER }] });
      expect("error" in r, role).toBe(false);
    }
    /* ...but a set that never asked it does not start accepting it */
    expect(
      validateInterviewRequest({ role: "digital", answers: [{ question: TEAMWORK, answer: ANSWER }] }),
    ).toEqual({ error: "unknown_question" });
  });
});

describe("the picker page", () => {
  const html = renderInterviewPage();

  it("shows both ways in, and every set in exactly one of them", () => {
    expect(html).toContain(INTERVIEW_GROUP_LABELS.type);
    expect(html).toContain(INTERVIEW_GROUP_LABELS.sector);
    expect(html).toMatch(/data-pk='type'[^>]*>Interview type/);
    expect(html).toMatch(/data-pk='sector'[^>]*>Kind of work/);
    for (const role of INTERVIEW_ROLES) {
      const hits = html.split(`class='rolebtn' data-role='${role}'`).length - 1;
      expect(hits, role).toBe(1);
    }
  });

  it("hands the browser the same names the server validates against", () => {
    const m = /var FL_SETS=(\{.*?\});var FL_GROUPS=/s.exec(html);
    expect(m).not.toBeNull();
    const sets = JSON.parse(m![1]!) as Record<string, { label: string; group: string }>;
    expect(Object.keys(sets).sort()).toEqual([...INTERVIEW_ROLES].sort());
    for (const role of INTERVIEW_ROLES) expect(sets[role]!.label).toBe(INTERVIEW_SETS[role].label);
  });

  it("no longer carries its own copy of the labels to drift out of step", () => {
    expect(html).not.toContain("ROLE_LABELS_JS");
    expect(html).not.toMatch(/Any first job/i);
  });
});
