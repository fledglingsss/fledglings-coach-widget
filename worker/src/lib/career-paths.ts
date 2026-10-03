/* Career paths - "where else could this take me?"
 *
 * A learner asked for it (tester feedback, October 2026): the CV review
 * should say what kind of job a CV is pointing at, and show how the
 * same experience relates to other jobs, because most 16-24s only know
 * the jobs they have seen.
 *
 * Careers information is exactly the kind of thing a model gets
 * confidently wrong - a job title that does not exist, an entry
 * requirement out of date. So the split of work is deliberate:
 *
 *   - the ROLES are this list: real UK jobs a young person can start in
 *     or train into, each with a one-line description written here and
 *     a link to its official National Careers Service job profile (every
 *     address was fetched and checked when the list was written - see
 *     test/career-paths.test.ts for the shape, and re-run
 *     scripts/check-career-links.mjs if a link is ever reported dead);
 *   - the MODEL only matches: it picks roles from the list and must
 *     quote the line of the learner's own document that carries over.
 *     A path whose quote is not theirs is dropped (the no-fabrication
 *     law, same as praise).
 *
 * Pay, entry requirements and age rules are never stated here or by the
 * model. They change, and the official profile carries them.
 */

import { inventedNumbers, isGrounded, learnerWords } from "./verbatim";

export interface CareerRole {
  /** The slug of the role's National Careers Service job profile. */
  id: string;
  label: string;
  /** What the job is, in one line a 16-year-old would understand. */
  about: string;
}

const PROFILE_BASE = "https://nationalcareers.service.gov.uk/job-profiles/";

export const CAREER_ROLES: readonly CareerRole[] = [
  /* shops and customers */
  { id: "sales-assistant", label: "Sales assistant", about: "Serving customers, taking payments and keeping a shop floor stocked and tidy." },
  { id: "customer-service-assistant", label: "Customer service assistant", about: "Answering questions and sorting out problems for customers, in person, by phone or online." },
  { id: "receptionist", label: "Receptionist", about: "The first person visitors meet: greeting people, answering calls and keeping the front desk running." },
  { id: "visual-merchandiser", label: "Visual merchandiser", about: "Designing the shop displays and layouts that make people want to buy." },
  { id: "stock-control-assistant", label: "Stock control assistant", about: "Tracking what comes in and goes out, so the right stock is in the right place." },
  { id: "travel-agent", label: "Travel agent", about: "Helping customers choose and book holidays and travel." },
  { id: "estate-agent", label: "Estate agent", about: "Helping people buy, sell and rent homes: viewings, valuations and negotiating." },
  { id: "recruitment-consultant", label: "Recruitment consultant", about: "Matching people to jobs for employers, mostly by phone and email." },
  { id: "insurance-claims-handler", label: "Insurance claims handler", about: "Dealing with customers' insurance claims from the first call to the result." },
  { id: "cinema-or-theatre-attendant", label: "Cinema or theatre attendant", about: "Looking after audiences: tickets, seating, refreshments and safety." },
  /* food and hospitality */
  { id: "waiter", label: "Waiter", about: "Taking orders, serving food and drink and looking after tables." },
  { id: "barista", label: "Barista", about: "Making and serving coffee and running a busy counter." },
  { id: "counter-service-assistant", label: "Counter service assistant", about: "Serving food and drink at a counter and keeping it clean and stocked." },
  { id: "bar-person", label: "Bar person", about: "Serving drinks, taking payments and keeping a bar running." },
  { id: "kitchen-assistant", label: "Kitchen porter", about: "Keeping a professional kitchen clean and stocked, and helping the chefs prepare food." },
  { id: "chef", label: "Chef", about: "Preparing and cooking food in a professional kitchen, usually starting as a trainee or apprentice." },
  { id: "baker", label: "Baker", about: "Making bread, cakes and pastries in a shop, supermarket or factory." },
  { id: "housekeeper", label: "Hotel housekeeper", about: "Keeping hotel rooms and shared areas clean and ready for guests." },
  /* offices and business */
  { id: "admin-assistant", label: "Admin assistant", about: "Keeping an office organised: emails, records, diaries and documents." },
  { id: "bookkeeper", label: "Bookkeeper", about: "Recording what a business earns and spends, and keeping its accounts in order." },
  { id: "accounting-technician", label: "Accounting technician", about: "Preparing accounts, invoices and tax records, often trained on the job." },
  { id: "payroll-administrator", label: "Payroll administrator", about: "Making sure staff are paid the right amount, on time." },
  { id: "human-resources-officer", label: "Human resources officer", about: "Helping an employer hire, train and look after its staff." },
  { id: "marketing-executive", label: "Marketing executive", about: "Promoting products and services through campaigns, events and online content." },
  { id: "social-media-manager", label: "Social media manager", about: "Planning and posting content, and talking to customers on social platforms." },
  { id: "civil-service-administrative-officer", label: "Civil Service administrative officer", about: "Office and customer work for a government department." },
  { id: "legal-secretary", label: "Legal secretary", about: "Admin support for solicitors: documents, diaries and calls from clients." },
  /* digital and design */
  { id: "it-support-technician", label: "IT support technician", about: "Fixing computer problems and setting up equipment for the people who use it." },
  { id: "software-developer", label: "Software developer", about: "Designing and writing the code behind apps, websites and systems." },
  { id: "web-developer", label: "Web developer", about: "Building websites and keeping them working." },
  { id: "data-analyst-statistician", label: "Data analyst", about: "Collecting and studying numbers to answer questions for an organisation." },
  { id: "computer-games-tester", label: "Computer games tester", about: "Playing games methodically to find and report faults before they are released." },
  { id: "graphic-designer", label: "Graphic designer", about: "Creating the visuals for brands, adverts, websites and print." },
  { id: "photographer", label: "Photographer", about: "Taking and editing pictures for clients, events, shops or the media." },
  { id: "tv-or-film-production-runner", label: "TV or film production runner", about: "The entry job on a set or in a production office: errands, setting up and helping every department." },
  /* care, health and education */
  { id: "care-worker", label: "Care worker", about: "Supporting people with daily life, in their own home or a care home." },
  { id: "healthcare-assistant", label: "Healthcare assistant", about: "Helping nurses and doctors care for patients in hospitals and clinics." },
  { id: "hospital-porter", label: "Hospital porter", about: "Moving patients, equipment and supplies safely around a hospital." },
  { id: "emergency-care-assistant", label: "Emergency care assistant", about: "Working on an ambulance crew alongside paramedics." },
  { id: "dental-nurse", label: "Dental nurse", about: "Assisting a dentist during treatment and looking after patients." },
  { id: "pharmacy-assistant", label: "Pharmacy assistant", about: "Serving customers and helping pharmacists prepare medicines." },
  { id: "nursery-worker", label: "Nursery worker", about: "Looking after children under five and helping them learn through play." },
  { id: "teaching-assistant", label: "Teaching assistant", about: "Supporting pupils and teachers in the classroom." },
  { id: "playworker", label: "Playworker", about: "Running play sessions for children at clubs and holiday schemes." },
  { id: "youth-worker", label: "Youth worker", about: "Supporting young people through activities, advice and projects." },
  { id: "veterinary-nurse", label: "Veterinary nurse", about: "Caring for sick and injured animals alongside vets." },
  { id: "animal-care-worker", label: "Animal care worker", about: "Feeding, cleaning and caring for animals in kennels, rescue centres or sanctuaries." },
  /* sport, leisure and outdoors */
  { id: "leisure-centre-assistant", label: "Leisure centre assistant", about: "Setting up equipment, supervising activities and helping customers at a leisure centre." },
  { id: "fitness-instructor", label: "Fitness instructor", about: "Leading exercise sessions and helping people use a gym safely." },
  { id: "sports-coach", label: "Sports coach", about: "Teaching the skills of a sport and running training sessions." },
  { id: "lifeguard", label: "Lifeguard", about: "Keeping swimmers safe at a pool or beach." },
  { id: "outdoor-activities-instructor", label: "Outdoor activities instructor", about: "Leading activities like climbing, kayaking and orienteering." },
  { id: "horticultural-worker", label: "Horticultural worker", about: "Growing and looking after plants for garden centres, parks and nurseries." },
  { id: "gardener", label: "Gardener", about: "Planting and maintaining gardens, parks and green spaces." },
  { id: "florist", label: "Florist", about: "Designing and making flower arrangements and selling them to customers." },
  { id: "farm-worker", label: "Farm worker", about: "Looking after crops and animals and operating farm machinery." },
  /* trades, making and moving things */
  { id: "warehouse-worker", label: "Warehouse worker", about: "Receiving, storing, picking and packing goods." },
  { id: "delivery-van-driver", label: "Delivery van driver", about: "Collecting goods and delivering them to homes and businesses." },
  { id: "postman-or-postwoman", label: "Postperson", about: "Sorting and delivering letters and parcels." },
  { id: "electrician", label: "Electrician", about: "Installing and repairing electrical wiring and equipment, trained through an apprenticeship." },
  { id: "plumber", label: "Plumber", about: "Fitting and repairing water, heating and drainage systems." },
  { id: "carpenter", label: "Carpenter", about: "Making and fitting wooden structures, from doors and floors to roofs." },
  { id: "bricklayer", label: "Bricklayer", about: "Building and repairing walls, houses and other structures." },
  { id: "painter-and-decorator", label: "Painter and decorator", about: "Preparing and decorating the inside and outside of buildings." },
  { id: "construction-labourer", label: "Construction labourer", about: "The hands-on work of a building site: moving materials, digging and helping the trades." },
  { id: "motor-mechanic", label: "Motor mechanic", about: "Servicing and repairing cars, vans and motorbikes." },
  { id: "engineering-operative", label: "Engineering operative", about: "Making, assembling and finishing parts in a workshop or factory." },
  { id: "production-worker-manufacturing", label: "Production worker", about: "Working on a factory line to make, check and pack products." },
  { id: "laboratory-technician", label: "Laboratory technician", about: "Setting up experiments, running tests and recording results for scientists." },
  /* personal services */
  { id: "hairdresser", label: "Hairdresser", about: "Cutting, colouring and styling hair." },
  { id: "beauty-therapist", label: "Beauty therapist", about: "Giving face and body treatments in a salon or spa." },
  { id: "cleaner", label: "Cleaner", about: "Keeping homes, offices and public buildings clean." },
  /* uniformed and public services */
  { id: "police-officer", label: "Police officer", about: "Keeping people safe, responding to incidents and investigating crime." },
  { id: "firefighter", label: "Firefighter", about: "Responding to fires and emergencies and teaching people how to prevent them." },
  { id: "soldier", label: "Soldier", about: "Serving in the army, with a trade learned alongside the training." },
  { id: "security-officer", label: "Security officer", about: "Protecting buildings, people and events." },
  { id: "library-assistant", label: "Library assistant", about: "Helping people find books and information and running a library day to day." },
  { id: "charity-fundraiser", label: "Charity fundraiser", about: "Raising money for a cause through events, campaigns and talking to supporters." },
  { id: "cabin-crew", label: "Cabin crew", about: "Looking after passengers' safety and comfort on flights." },
];

const ROLE_BY_ID = new Map(CAREER_ROLES.map((role) => [role.id, role]));

export function careerProfileUrl(id: string): string {
  return PROFILE_BASE + id;
}

/** How many paths a report offers. Three: enough to widen a view, few
 * enough that each one gets read. */
export const CAREER_PATHS_SHOWN = 3;

export interface CareerDirection {
  /** The kind of work the CV points to as written, in a few words. */
  reads_as: string;
  /** The learner's own line that most says so, or null when the model's
   * quote could not be matched to their words. */
  evidence: string | null;
  /** With a target: does the CV point at it? null when none was given. */
  on_target: boolean | null;
  fit: string;
}

export interface CareerPath {
  id: string;
  role: string;
  about: string;
  url: string;
  /** Why this learner: quotes a line of their own document. */
  because: string;
  /** The one change that would point the CV this way. */
  bridge: string | null;
}

/** The two JSON fields the CV review prompt asks for. */
export const CAREER_JSON_FIELDS = `
  "direction": {
    "reads_as": "<the kind of work this CV points to right now, 2-5 plain words - what a recruiter skimming it would assume they want, e.g. 'Retail and customer service'>",
    "evidence": "<the ONE line of theirs that most says so, copied exactly>",
    "on_target": <true if they gave a target and the CV as written points at it; false if they gave a target and it points somewhere else; null if no target was given>,
    "fit": "<ONE plain sentence. With a target: how far the CV as written points at it, and the single biggest gap. Without one: what kind of role it reads as aimed at, and why>"
  },
  "paths": [
    {"role_id": "<an id from the CAREER LIST, copied exactly>", "because": "<ONE sentence that QUOTES a line of theirs in quotation marks and says why that counts in this job>", "bridge": "<the one thing to add or reword so the CV points this way, with [brackets] for anything only they know - advice, never a claim to paste in>"}
    , ...up to ${CAREER_PATHS_SHOWN}, each a different kind of work from the others
  ],`;

/** The rules and the list, appended to the CV review prompt. */
export function careerPathsBrief(): string {
  const list = CAREER_ROLES.map((role) => `${role.id}: ${role.label}`).join("; ");
  return `CAREER PATHS ("direction" and "paths"). Learners asked for this: most 16-24s only know the jobs they have seen, so show them where else what they have ALREADY done could take them.
- "direction" is a reading of the document, not a judgement of the person: say what it points at as written.
- "paths": choose up to ${CAREER_PATHS_SHOWN} roles from the CAREER LIST whose everyday work genuinely uses something this document shows. Not the role they already aim at, not the job they already do, and not three versions of the same thing - widen the view.
- Every path rests on a line they wrote: quote it. A path you cannot tie to a quote is left out. If the document supports fewer than ${CAREER_PATHS_SHOWN} honest paths, give fewer; an empty list is better than a stretch.
- Never promise they would get the job. Never state pay, entry requirements, qualifications needed or age rules: you do not know the current ones, and the page links each role to its official job profile, which does.
- Use ONLY ids from this list, copied exactly.
CAREER LIST (id: role) - ${list}`;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : null;
}

/** The model's "direction", shaped but not yet checked against the CV. */
export function parseDirection(value: unknown): CareerDirection | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const readsAs = text(raw.reads_as, 60);
  const fit = text(raw.fit, 320);
  if (!readsAs || !fit) return null;
  return {
    reads_as: readsAs,
    evidence: text(raw.evidence, 260),
    on_target: typeof raw.on_target === "boolean" ? raw.on_target : null,
    fit,
  };
}

/** The model's "paths": only roles on the list, each once, with the
 * role's facts taken from the list rather than from the model. */
export function parsePaths(value: unknown): CareerPath[] {
  const paths: CareerPath[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    if (paths.length === CAREER_PATHS_SHOWN) break;
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;
    const role = typeof raw.role_id === "string" ? ROLE_BY_ID.get(raw.role_id.trim()) : undefined;
    const because = text(raw.because, 320);
    if (!role || !because || paths.some((p) => p.id === role.id)) continue;
    paths.push({
      id: role.id,
      role: role.label,
      about: role.about,
      url: careerProfileUrl(role.id),
      because,
      bridge: text(raw.bridge, 320),
    });
  }
  return paths;
}

/**
 * Hold the career section to the learner's own document.
 *
 * - the direction's evidence is shown only as the learner's own words
 *   (the span they typed, not the model's tidied copy), and with no
 *   target given the CV cannot be "on target";
 * - a path survives only if its reason quotes the document and states
 *   no number the learner never gave.
 */
export function groundCareer(
  direction: CareerDirection | null,
  paths: readonly CareerPath[],
  documentText: string,
  targetText: string,
): { direction: CareerDirection | null; paths: CareerPath[]; dropped: number } {
  const grounded = paths.filter(
    (path) =>
      isGrounded(path.because, documentText) &&
      inventedNumbers(path.because, [documentText, targetText]).length === 0,
  );
  const checked = direction
    ? {
        ...direction,
        evidence: direction.evidence ? learnerWords(direction.evidence, [documentText]) : null,
        on_target: targetText.trim() ? direction.on_target : null,
      }
    : null;
  return { direction: checked, paths: grounded, dropped: paths.length - grounded.length };
}
