/* The career quiz - "what kind of work might suit me?"
 *
 * A tester asked for it (October 2026): something like the UCAS careers
 * quiz, but pointing at every kind of pathway rather than university
 * courses alone. Most 16-24s can name a handful of jobs; the point of
 * this is to widen that list and show the routes in.
 *
 * How it works, and why it is shaped this way:
 *
 *   - 24 short "would you enjoy this?" statements, four for each of six
 *     interest areas. The six areas are the long-established
 *     interest-type model used by careers services (often called
 *     RIASEC); the learner-facing names and every statement are written
 *     here, in plain words, for this audience.
 *   - No AI and no server. The answers are scored in the learner's own
 *     browser by CAREER_QUIZ_JS below and never leave it. scoreQuiz()
 *     is the same scoring in TypeScript, and a test holds the two
 *     together, so what is tested is what the learner runs.
 *   - The jobs it suggests are the checked list in career-paths.ts -
 *     real roles, each linked to its official job profile. ROLE_AREAS
 *     says which two interest areas each role draws on most.
 *   - The "ways in" are the routes a young person can actually take,
 *     each linked to its official page (fetched and checked when this
 *     was written). No pay or grades are stated: the official pages
 *     carry those and keep them current. (Who a supported internship
 *     is for is said, because that is what it is.)
 *
 * It is a starting point for thinking, and the page says so. Nothing
 * here is a verdict on anyone.
 */

import { CAREER_ROLES, careerProfileUrl } from "./career-paths";

export type AreaId = "maker" | "solver" | "creator" | "helper" | "leader" | "organiser";

export interface QuizArea {
  id: AreaId;
  /** The learner-facing name. */
  name: string;
  /** One line that says what the area means, to the learner. */
  blurb: string;
}

/* What each interest looks like (its medal) is the page's business:
 * see AREA_ART in pages-careers.ts. */
export const QUIZ_AREAS: readonly QuizArea[] = [
  { id: "maker", name: "Hands-on", blurb: "You like making, fixing and working with real things." },
  { id: "solver", name: "Problem solver", blurb: "You like working out how and why things happen." },
  { id: "creator", name: "Creative", blurb: "You like making things that look, sound or read well." },
  { id: "helper", name: "People person", blurb: "You like helping, teaching and looking after people." },
  { id: "leader", name: "Go-getter", blurb: "You like persuading people and making things happen." },
  { id: "organiser", name: "Organiser", blurb: "You like order, detail and getting things right." },
];

export interface QuizItem {
  area: AreaId;
  /** Completes "Would you enjoy...": an activity, never a job title. */
  text: string;
}

/* Four per area, dealt out in turn so no two neighbours are the same
 * area and the quiz never feels like six mini-tests. */
const BY_AREA: Record<AreaId, readonly string[]> = {
  maker: [
    "Fixing something that has stopped working, like a bike or a phone",
    "Building or putting something together with your hands",
    "Working outdoors, whatever the weather",
    "Using tools or machines to get a job done",
  ],
  solver: [
    "Working out why something keeps going wrong",
    "Looking things up until a question is properly answered",
    "Testing an idea to see if it really works",
    "Spotting patterns in numbers or information",
  ],
  creator: [
    "Designing how something looks, like a poster or a room",
    "Making videos, music or photos",
    "Writing stories, posts or scripts",
    "Coming up with a new idea when everyone else is stuck",
  ],
  helper: [
    "Helping someone learn something new",
    "Looking after someone who is unwell or having a hard time",
    "Listening to someone's problem and helping them sort it out",
    "Welcoming new people and making them feel at ease",
  ],
  leader: [
    "Persuading someone to try or buy something",
    "Taking charge of a group to get something done",
    "Starting something of your own, like a small business or a club",
    "Speaking up for an idea in front of other people",
  ],
  organiser: [
    "Keeping records, lists or files in good order",
    "Planning the steps so a job gets done on time",
    "Checking work carefully to catch mistakes",
    "Working with money, numbers or spreadsheets",
  ],
};

export const ITEMS_PER_AREA = 4;

export const QUIZ_ITEMS: readonly QuizItem[] = Array.from({ length: ITEMS_PER_AREA }, (_, round) =>
  QUIZ_AREAS.map((area) => ({ area: area.id, text: BY_AREA[area.id][round]! })),
).flat();

/** The three answers, and what each is worth. */
export const QUIZ_ANSWERS = [
  { value: 0, label: "Not for me" },
  { value: 1, label: "Maybe" },
  { value: 2, label: "Yes, I'd enjoy that" },
] as const;

/* Which two interest areas each role draws on most: [main, second].
 * Every role in CAREER_ROLES has an entry (a test checks it), so a new
 * role cannot be added without deciding where it sits. */
export const ROLE_AREAS: Readonly<Record<string, readonly [AreaId, AreaId]>> = {
  "sales-assistant": ["leader", "helper"],
  "customer-service-assistant": ["helper", "organiser"],
  receptionist: ["organiser", "helper"],
  "visual-merchandiser": ["creator", "leader"],
  "stock-control-assistant": ["organiser", "maker"],
  "travel-agent": ["leader", "organiser"],
  "estate-agent": ["leader", "organiser"],
  "recruitment-consultant": ["leader", "helper"],
  "insurance-claims-handler": ["organiser", "leader"],
  "cinema-or-theatre-attendant": ["helper", "leader"],
  waiter: ["helper", "leader"],
  barista: ["helper", "maker"],
  "counter-service-assistant": ["helper", "maker"],
  "bar-person": ["helper", "leader"],
  "kitchen-assistant": ["maker", "organiser"],
  chef: ["maker", "creator"],
  baker: ["maker", "creator"],
  housekeeper: ["maker", "organiser"],
  "admin-assistant": ["organiser", "helper"],
  bookkeeper: ["organiser", "solver"],
  "accounting-technician": ["organiser", "solver"],
  "payroll-administrator": ["organiser", "solver"],
  "human-resources-officer": ["helper", "leader"],
  "marketing-executive": ["leader", "creator"],
  "social-media-manager": ["creator", "leader"],
  "civil-service-administrative-officer": ["organiser", "helper"],
  "legal-secretary": ["organiser", "leader"],
  "it-support-technician": ["solver", "maker"],
  "software-developer": ["solver", "organiser"],
  "web-developer": ["solver", "creator"],
  "data-analyst-statistician": ["solver", "organiser"],
  "computer-games-tester": ["solver", "organiser"],
  "graphic-designer": ["creator", "leader"],
  photographer: ["creator", "maker"],
  "tv-or-film-production-runner": ["creator", "leader"],
  "care-worker": ["helper", "maker"],
  "healthcare-assistant": ["helper", "maker"],
  "hospital-porter": ["maker", "helper"],
  "emergency-care-assistant": ["helper", "maker"],
  "dental-nurse": ["helper", "organiser"],
  "pharmacy-assistant": ["organiser", "helper"],
  "nursery-worker": ["helper", "creator"],
  "teaching-assistant": ["helper", "organiser"],
  playworker: ["helper", "creator"],
  "youth-worker": ["helper", "leader"],
  "veterinary-nurse": ["maker", "helper"],
  "animal-care-worker": ["maker", "helper"],
  "leisure-centre-assistant": ["helper", "maker"],
  "fitness-instructor": ["helper", "maker"],
  "sports-coach": ["helper", "leader"],
  lifeguard: ["maker", "helper"],
  "outdoor-activities-instructor": ["maker", "helper"],
  "horticultural-worker": ["maker", "solver"],
  gardener: ["maker", "creator"],
  florist: ["creator", "maker"],
  "farm-worker": ["maker", "solver"],
  "warehouse-worker": ["maker", "organiser"],
  "delivery-van-driver": ["maker", "organiser"],
  "postman-or-postwoman": ["maker", "organiser"],
  electrician: ["maker", "solver"],
  plumber: ["maker", "solver"],
  carpenter: ["maker", "creator"],
  bricklayer: ["maker", "organiser"],
  "painter-and-decorator": ["maker", "creator"],
  "construction-labourer": ["maker", "organiser"],
  "motor-mechanic": ["maker", "solver"],
  "engineering-operative": ["maker", "organiser"],
  "production-worker-manufacturing": ["maker", "organiser"],
  "laboratory-technician": ["solver", "maker"],
  hairdresser: ["creator", "helper"],
  "beauty-therapist": ["helper", "creator"],
  cleaner: ["maker", "organiser"],
  "police-officer": ["leader", "helper"],
  firefighter: ["maker", "helper"],
  soldier: ["maker", "leader"],
  "security-officer": ["organiser", "maker"],
  "library-assistant": ["organiser", "helper"],
  "charity-fundraiser": ["leader", "helper"],
  "cabin-crew": ["helper", "leader"],
};

export interface CareerRoute {
  id: string;
  name: string;
  /** What it is, in one line. No pay and no grades. */
  about: string;
  /** The official page for it. */
  url: string;
  /** Who runs that page, for the link's label. */
  source: string;
}

/* Routes in England (the page says so, and the official pages link to
 * the other nations' services). Every address was fetched and checked
 * on 2026-10-03. */
export const CAREER_ROUTES: readonly CareerRoute[] = [
  {
    id: "apprenticeship",
    name: "Apprenticeship",
    about: "A real job with training built in. You are paid, and you work towards a recognised qualification while you do it.",
    url: "https://www.gov.uk/apply-apprenticeship",
    source: "GOV.UK",
  },
  {
    id: "t-level",
    name: "T Level",
    about: "A two-year course after GCSEs that mixes classroom learning with a long placement at a real employer.",
    url: "https://www.tlevels.gov.uk/students",
    source: "T Levels",
  },
  {
    id: "college",
    name: "College course",
    about: "Practical courses in a subject or trade, such as BTECs and other technical qualifications, full time or part time.",
    url: "https://nationalcareers.service.gov.uk/find-a-course",
    source: "National Careers Service",
  },
  {
    id: "university",
    name: "A levels and university",
    about: "Studying subjects in depth, which can lead on to a degree. Some careers need one; many do not.",
    url: "https://www.ucas.com/",
    source: "UCAS",
  },
  {
    id: "job",
    name: "Straight into a job",
    about: "Entry-level jobs train you as you go. Your CV and your interview are what get you in.",
    url: "https://www.gov.uk/find-a-job",
    source: "GOV.UK",
  },
  {
    id: "volunteering",
    name: "Volunteering and work experience",
    about: "A way to try a kind of work, meet people who do it, and get something real for your CV.",
    url: "https://www.gov.uk/volunteering",
    source: "GOV.UK",
  },
  {
    id: "supported-internship",
    name: "Supported internship",
    about: "For 16 to 24 year olds with an education, health and care plan: a study programme based mostly at an employer, with a job coach alongside.",
    url: "https://www.skillsforcareers.education.gov.uk/your-training-options",
    source: "Skills for Careers",
  },
];

/** Official "what are my options?" pages, for the foot of the results. */
export const CAREER_OPTION_GUIDES = [
  { label: "Your options at 16", url: "https://nationalcareers.service.gov.uk/careers-advice/career-choices-at-16" },
  { label: "Your options at 18", url: "https://nationalcareers.service.gov.uk/careers-advice/career-choices-at-18" },
  { label: "Every training option, side by side", url: "https://www.skillsforcareers.education.gov.uk/your-training-options" },
] as const;

/* ---------------- scoring ---------------- */

/** How many roles the results show, and how many of them may share one
 * main area - so a strong single interest still shows some breadth. */
export const ROLES_SHOWN = 8;
export const ROLES_PER_AREA = 4;
/** How many interest areas are named as the learner's own. */
export const TOP_AREAS = 3;
/** Each named interest is given at least this many of the jobs shown,
 * so the list answers all of them and not only the strongest one. */
export const ROLES_PER_TOP_AREA = 2;

export interface QuizResult {
  /** Every area with its score, strongest first. `pct` is of the most
   * an area can score. */
  areas: Array<{ id: AreaId; score: number; pct: number }>;
  /** The areas named as theirs: up to three, never one that scored 0. */
  top: AreaId[];
  /** Roles to look at, best match first. `match` is 0-100. */
  roles: Array<{ id: string; match: number }>;
}

/**
 * Score a set of answers (one per item, in order: 0, 1 or 2; anything
 * else counts as unanswered).
 *
 * An area's score is the sum of its four answers. Ties go to the area
 * with more outright "yes" answers, then to the fixed order above. A
 * role scores twice its main area plus its second area, so the main
 * interest matters most without the second being ignored.
 *
 * The jobs shown are chosen in two steps: the best two for each of the
 * learner's named interests, then the best of everything else until
 * the list is full, with no single interest taking more than four
 * places. They are listed best match first.
 */
export function scoreQuiz(answers: readonly number[]): QuizResult {
  const score: Record<string, number> = {};
  const yeses: Record<string, number> = {};
  QUIZ_AREAS.forEach((area) => {
    score[area.id] = 0;
    yeses[area.id] = 0;
  });
  QUIZ_ITEMS.forEach((item, i) => {
    const answer = answers[i];
    if (answer !== 1 && answer !== 2) return;
    score[item.area]! += answer;
    if (answer === 2) yeses[item.area]! += 1;
  });
  const order = QUIZ_AREAS.map((area) => area.id);
  const maxArea = ITEMS_PER_AREA * 2;
  const areas = order
    .slice()
    .sort(
      (a, b) =>
        score[b]! - score[a]! || yeses[b]! - yeses[a]! || order.indexOf(a) - order.indexOf(b),
    )
    .map((id) => ({ id, score: score[id]!, pct: Math.round((score[id]! * 100) / maxArea) }));
  const top = areas
    .filter((area) => area.score > 0)
    .slice(0, TOP_AREAS)
    .map((area) => area.id);

  const maxRole = maxArea * 3;
  const scored = CAREER_ROLES.map((role, index) => {
    const pair = ROLE_AREAS[role.id];
    const points = pair ? 2 * score[pair[0]]! + score[pair[1]]! : 0;
    return { id: role.id, main: pair ? pair[0] : "", points, index };
  })
    .filter((role) => role.points > 0)
    .sort((a, b) => b.points - a.points || a.index - b.index);
  const perArea: Record<string, number> = {};
  const picked = new Set<string>();
  const pick = (role: { id: string; main: string }) => {
    picked.add(role.id);
    perArea[role.main] = (perArea[role.main] ?? 0) + 1;
  };
  for (const area of top) {
    scored
      .filter((role) => role.main === area)
      .slice(0, ROLES_PER_TOP_AREA)
      .forEach(pick);
  }
  for (const role of scored) {
    if (picked.size >= ROLES_SHOWN) break;
    if (picked.has(role.id) || (perArea[role.main] ?? 0) >= ROLES_PER_AREA) continue;
    pick(role);
  }
  const roles = scored
    .filter((role) => picked.has(role.id))
    .map((role) => ({ id: role.id, match: Math.round((role.points * 100) / maxRole) }));
  return { areas, top, roles };
}

/** Everything the quiz page needs, as one object for the browser. */
export function careerQuizData() {
  return {
    areas: QUIZ_AREAS,
    items: QUIZ_ITEMS,
    answers: QUIZ_ANSWERS,
    roles: CAREER_ROLES.map((role) => ({
      id: role.id,
      label: role.label,
      about: role.about,
      url: careerProfileUrl(role.id),
      areas: ROLE_AREAS[role.id] ?? [],
    })),
    routes: CAREER_ROUTES,
    guides: CAREER_OPTION_GUIDES,
    perArea: ITEMS_PER_AREA,
    rolesShown: ROLES_SHOWN,
    rolesPerArea: ROLES_PER_AREA,
    rolesPerTopArea: ROLES_PER_TOP_AREA,
    topAreas: TOP_AREAS,
  };
}

/** The browser's copy of scoreQuiz(), over the object above. Plain
 * ES5, because it runs on whatever a learner's school has. A test runs
 * this against scoreQuiz() on the same answers; they must agree. */
export const CAREER_QUIZ_JS = [
  "function flQuizScore(answers,D){",
  "var score={},yeses={},order=D.areas.map(function(a){return a.id});",
  "order.forEach(function(id){score[id]=0;yeses[id]=0});",
  "D.items.forEach(function(it,i){var v=answers[i];if(v!==1&&v!==2)return;",
  "score[it.area]+=v;if(v===2)yeses[it.area]+=1;});",
  "var maxArea=D.perArea*2;",
  "var areas=order.slice().sort(function(a,b){",
  "return score[b]-score[a]||yeses[b]-yeses[a]||order.indexOf(a)-order.indexOf(b)})",
  ".map(function(id){return {id:id,score:score[id],pct:Math.round(score[id]*100/maxArea)}});",
  "var top=areas.filter(function(a){return a.score>0}).slice(0,D.topAreas).map(function(a){return a.id});",
  "var maxRole=maxArea*3;",
  "var scored=D.roles.map(function(r,i){var p=r.areas;",
  "return {id:r.id,main:p.length?p[0]:'',points:p.length?2*score[p[0]]+score[p[1]]:0,index:i}})",
  ".filter(function(r){return r.points>0})",
  ".sort(function(a,b){return b.points-a.points||a.index-b.index});",
  "var perArea={},picked={},count=0;",
  "function pick(r){picked[r.id]=true;count++;perArea[r.main]=(perArea[r.main]||0)+1;}",
  "top.forEach(function(area){scored.filter(function(r){return r.main===area})",
  ".slice(0,D.rolesPerTopArea).forEach(pick);});",
  "for(var k=0;k<scored.length&&count<D.rolesShown;k++){var r=scored[k];",
  "if(picked[r.id]||(perArea[r.main]||0)>=D.rolesPerArea)continue;pick(r);}",
  "var roles=scored.filter(function(r){return picked[r.id]})",
  ".map(function(r){return {id:r.id,match:Math.round(r.points*100/maxRole)}});",
  "return {areas:areas,top:top,roles:roles};}",
].join("");
