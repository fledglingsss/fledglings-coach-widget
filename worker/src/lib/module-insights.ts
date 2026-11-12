/* Module insights - who has finished what, learner by learner.
 *
 * The main dashboard payload carries at most twelve modules per
 * learner (enough for a profile panel), so it cannot answer "which
 * enrolled modules has each learner NOT finished". This builds the
 * full learner-by-module picture from the roster snapshot, compactly:
 * module titles are listed once and each learner refers to them by
 * index. Pure functions - no I/O - so every rule here is testable. */

import type { LwUserCourse } from "./learnworlds";
import { isModuleTitle } from "./skills-passport";

/** One learner's standing on one module:
 * [module index, percent complete, minutes spent].
 * 100 always and only means completed; an unfinished module never
 * reads above 99 however far through it the learner is. */
export type ModuleCell = [number, number, number];

export interface ModuleInsightLearner {
  name: string;
  email: string;
  tags: string[];
  m: ModuleCell[];
}

export interface ModuleInsights {
  /** Every module any learner in scope is enrolled on, A to Z. */
  modules: string[];
  learners: ModuleInsightLearner[];
}

export interface InsightPerson {
  name: string;
  email: string;
  tags: string[];
  courses: LwUserCourse[];
}

export const COMPLETE_PCT = 100;
const MAX_UNFINISHED_PCT = 99;

function percentFor(course: LwUserCourse): number {
  if (course.completed) return COMPLETE_PCT;
  const rate = Math.round(course.progressRate ?? 0);
  return Math.max(0, Math.min(MAX_UNFINISHED_PCT, rate));
}

function compareTitles(a: string, b: string): number {
  return a.localeCompare(b, "en-GB", { numeric: true, sensitivity: "base" });
}

/** A learner enrolled twice on the same title (a re-issued course)
 * keeps their best standing on it, so a finished module is never
 * flagged as outstanding by its stale twin. */
function bestStandingByTitle(courses: LwUserCourse[]): Map<string, { pct: number; minutes: number }> {
  const best = new Map<string, { pct: number; minutes: number }>();
  for (const course of courses) {
    if (!isModuleTitle(course.title)) continue;
    const title = course.title.trim();
    const pct = percentFor(course);
    const minutes = Math.round((course.timeSeconds ?? 0) / 60);
    const previous = best.get(title);
    if (!previous) {
      best.set(title, { pct, minutes });
      continue;
    }
    best.set(title, {
      pct: Math.max(previous.pct, pct),
      minutes: Math.max(previous.minutes, minutes),
    });
  }
  return best;
}

export function buildModuleInsights(people: InsightPerson[]): ModuleInsights {
  const standings = people.map((person) => ({
    person,
    byTitle: bestStandingByTitle(person.courses),
  }));
  const titles = new Set<string>();
  for (const { byTitle } of standings) {
    for (const title of byTitle.keys()) titles.add(title);
  }
  const modules = [...titles].sort(compareTitles);
  const indexOf = new Map(modules.map((title, index) => [title, index]));

  const learners = standings
    .map(({ person, byTitle }) => ({
      name: person.name,
      email: person.email,
      tags: person.tags,
      m: [...byTitle.entries()]
        .map(([title, s]): ModuleCell => [indexOf.get(title)!, s.pct, s.minutes])
        .sort((a, b) => a[0] - b[0]),
    }))
    .sort((a, b) => compareTitles(a.name, b.name));

  return { modules, learners };
}

export interface OutstandingRow {
  name: string;
  email: string;
  tags: string[];
  module: string;
  status: "In progress" | "Not started";
  pct: number;
  minutes: number;
}

/** Every enrolled-but-unfinished module, one row each - the chase
 * list behind the CSV export. Modules under way come before ones not
 * yet opened within each learner (closest to done first). */
export function outstandingRows(insights: ModuleInsights): OutstandingRow[] {
  const rows: OutstandingRow[] = [];
  for (const learner of insights.learners) {
    const unfinished = learner.m
      .filter((cell) => cell[1] < COMPLETE_PCT)
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    for (const [moduleIndex, pct, minutes] of unfinished) {
      rows.push({
        name: learner.name,
        email: learner.email,
        tags: learner.tags,
        module: insights.modules[moduleIndex]!,
        status: pct > 0 ? "In progress" : "Not started",
        pct,
        minutes,
      });
    }
  }
  return rows;
}
