/* Module health — where learners actually stall, unit by unit.
 *
 * Source: GET /v2/courses/{id}/units/{uid}/analytics (verified live:
 * viewers, users_completed, avg_study_time per unit). School-wide
 * figures; swept incrementally within subrequest budgets and cached a
 * day — content health moves slowly. */

export interface UnitHealth {
  name: string;
  type: string;
  viewers: number;
  completed: number;
  avgTimeSecs: number;
}

export interface CourseHealth {
  courseId: string;
  title: string;
  units: UnitHealth[];
}

export interface ModuleHealthState {
  status: "building" | "ready";
  cursor: number;
  totalCourses: number;
  courses: CourseHealth[];
  builtAt: string;
}

export function emptyHealthState(totalCourses: number, now: Date): ModuleHealthState {
  return {
    status: "building",
    cursor: 0,
    totalCourses,
    courses: [],
    builtAt: now.toISOString(),
  };
}

export interface StallReport {
  courseId: string;
  title: string;
  starters: number;
  finishers: number;
  /** % of starters still present at the final unit. */
  retention: number;
  /** The unit where the largest share of remaining learners is lost —
   * null when the module has no meaningful drop. */
  stallUnit: string | null;
  /** % of that unit's arrivals who go no further. */
  stallLossPct: number;
  /** viewer counts across units, for the funnel visual. */
  funnel: number[];
}

/** Certificates and admin units never count as content. */
function isContentUnit(u: UnitHealth): boolean {
  return !/certificate/i.test(u.type);
}

export function stallReport(course: CourseHealth): StallReport | null {
  const units = course.units.filter(isContentUnit);
  if (units.length < 2) return null;
  const starters = units[0]!.viewers;
  if (starters < 3) return null; // too few learners to say anything honest
  const finishers = units[units.length - 1]!.viewers;

  let stallUnit: string | null = null;
  let stallLossPct = 0;
  for (let i = 0; i < units.length - 1; i++) {
    const here = units[i]!.viewers;
    const next = units[i + 1]!.viewers;
    if (here < 3) continue;
    const loss = (here - next) / here;
    if (loss > stallLossPct) {
      stallLossPct = loss;
      stallUnit = units[i]!.name;
    }
  }
  return {
    courseId: course.courseId,
    title: course.title,
    starters,
    finishers,
    retention: starters ? Math.round((finishers / starters) * 100) : 0,
    stallUnit: stallLossPct >= 0.15 ? stallUnit : null,
    stallLossPct: Math.round(stallLossPct * 100),
    funnel: units.map((u) => u.viewers),
  };
}

/** All courses with enough data, worst retention first. */
export function healthSummary(state: ModuleHealthState): StallReport[] {
  return state.courses
    .map(stallReport)
    .filter((r): r is StallReport => r !== null)
    .sort((a, b) => a.retention - b.retention);
}
