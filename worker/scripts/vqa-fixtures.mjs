/* Inputs for the visual walks, and stand-in reports.
 *
 * The reports a walk renders should be REAL ones: run the desktop walk
 * with --model once and it saves what production returned to
 * worker/qa/captured.json, which every later run renders from without
 * spending a model call. The FALLBACK_* shapes below are only used
 * when nothing has been captured yet, so the scripts still run. */

export const CV_TEXT = [
  "IMOGEN HART",
  "07700 900123 | imogen@example.com | linkedin.com/in/imogen-hart-1a2b",
  "",
  "Career History",
  "Weekend Team Member, Garden Centre - Sept 24 - present",
  "Served 200+ customers a shift on tills and the plant desk",
  "Responsible for restocking shelves every weekend",
  "Trained two new starters on the till system",
  "",
  "Education",
  "Leeds City College - BTEC Business, Sept 23 - present",
  "",
  "Skills",
  "Tills, rotas, spreadsheets, customer service",
].join("\n");

export const ADVERT =
  "Customer Service Apprentice, Leeds branch. You will greet customers, handle cash and card payments accurately, " +
  "answer account questions, and support the team with daily admin. We look for reliability, attention to detail, " +
  "clear communication and a genuine interest in helping people. No experience needed; full training given. " +
  "Level 2 apprenticeship, 18 months.";

/* The lines of a LinkedIn "Save to PDF" export, in the order it prints them. */
export const LINKEDIN_LINES = [
  "Contact",
  "www.linkedin.com/in/imogen-hart-1a2b (LinkedIn)",
  "Top Skills",
  "Customer Service",
  "Cash Handling",
  "Teamwork",
  "Imogen Hart",
  "Weekend team member | BTEC Business student | Customer service",
  "Leeds, England, United Kingdom",
  "Summary",
  "I work weekends at a garden centre where I serve customers on the tills and the plant desk.",
  "I am studying BTEC Business at college and I want a customer service apprenticeship.",
  "Experience",
  "Garden Centre",
  "Weekend Team Member",
  "September 2024 - Present (1 year 1 month)",
  "Leeds, England, United Kingdom",
  "Served 200+ customers a shift on tills and the plant desk. Trained two new starters on the till system.",
  "Education",
  "Leeds City College",
  "BTEC Business",
  "September 2023 - June 2025",
];

export const INTERVIEW_ANSWERS = [
  "I am seventeen and I work weekends on the tills at a garden centre in Leeds. I applied because I like sorting out problems for customers, and last month I trained two new starters on the till system.",
  "My biggest strength is staying organised. For my Business coursework I made a plan with a deadline for each section, finished the first draft a week early and used the spare time to help a friend with her spreadsheet.",
];

/* Details typed into Templates and scripts - deliberately messy, the
 * way people type: a capital and a full stop where neither belongs. */
export const TEMPLATE_DETAILS = {
  yourName: "Imogen Hart",
  yourPhone: "07700 900123",
  yourStatus: "A Year 12 student studying Business.",
  theirName: "Ms Khan",
  theirFirst: "Priya",
  company: "Hillside Garden Centre",
  workWanted: "a Saturday job",
  reasonForThem: "I've shopped with you for years and your staff always know their plants",
  proof: "I work Saturdays on the tills at a cafe",
  availability: "At weekends and after 4pm on weekdays.",
  role: "Weekend Sales Assistant",
  appliedDate: "Monday 3 March",
  theirJob: "veterinary nursing",
  mutual: "my tutor, Mr Davies, suggested I get in touch",
};

export const FALLBACK_REVIEW = {
  report: {
    overall: 52,
    verdict: "Promising base, needs depth",
    dimensions: [
      { label: "Impact", score: 48, tip: "Your '200+ customers a shift' figure is strong. Apply the same logic to the restocking line.", evidence: "Responsible for restocking shelves every weekend" },
      { label: "ATS readiness", score: 60, tip: "'Career History' is a less standard label than 'Work Experience'.", evidence: "Career History" },
      { label: "Clarity & structure", score: 55, tip: "Move Skills above Education so your practical abilities land first.", evidence: "Skills" },
      { label: "Tailoring", score: 45, tip: "There is no opening summary to frame this for the role.", evidence: "Tills, rotas, spreadsheets, customer service" },
    ],
    strengths: [
      "You used a real number: '200+ customers a shift' tells a recruiter the scale you work at.",
      "'Trained two new starters on the till system' shows you were trusted with responsibility.",
    ],
    improvements: [
      { title: "Turn 'Responsible for' into a result", detail: "'Responsible for restocking shelves every weekend' describes a duty, not what happened because you did it.", example: "Kept the plant desk fully stocked every weekend, so customers could find [what] without asking." },
      { title: "Add a two-line profile", detail: "The CV opens on a heading. A recruiter has to work out for themselves what you are aiming at.", example: "Customer-focused team member with [how long] of weekend retail experience, studying BTEC Business." },
    ],
    rewrite: { before: "Responsible for restocking shelves every weekend", after: "Restocked the plant desk and shelving every weekend, keeping stock available for 200+ customers." },
    keywords: { matched: ["customer service"], reword: ["cash and card payments"], missing: ["attention to detail", "admin"] },
    direction: {
      reads_as: "Retail and customer service",
      evidence: "Served 200+ customers a shift on tills and the plant desk",
      on_target: true,
      fit: "As written it points squarely at customer-facing shop work, which is what the advert asks for; the gap is that it never uses the advert's own words.",
    },
    paths: [
      { id: "receptionist", role: "Receptionist", about: "The first person visitors meet: greeting people, answering calls and keeping the front desk running.", url: "https://nationalcareers.service.gov.uk/job-profiles/receptionist", because: "'Served 200+ customers a shift on tills and the plant desk' is front-desk work under another name.", bridge: "Add a line on [the phone or email queries you handle]." },
      { id: "horticultural-worker", role: "Horticultural worker", about: "Growing and looking after plants for garden centres, parks and nurseries.", url: "https://nationalcareers.service.gov.uk/job-profiles/horticultural-worker", because: "Working 'on tills and the plant desk' means you already know a garden centre from the inside.", bridge: "Say [which plants or stock you look after] on the plant desk." },
      { id: "admin-assistant", role: "Admin assistant", about: "Keeping an office organised: emails, records, diaries and documents.", url: "https://nationalcareers.service.gov.uk/job-profiles/admin-assistant", because: "Your skills line, 'Tills, rotas, spreadsheets, customer service', is the start of an office skill set.", bridge: "Add [what you use spreadsheets for]." },
    ],
    next_step: "Add a two-line profile at the very top. It is the fix most likely to move your score.",
    encouragement: "Being trusted to train new colleagues in a weekend role is genuinely unusual at your stage.",
  },
  checks: {
    passed: 9,
    total: 12,
    groups: [
      { key: "impact", label: "Impact", items: [
        { id: "quantified", label: "Numbers that prove impact", status: "pass", detail: "A line carries a number.", group: "Impact" },
        { id: "weak-openers", label: "Strong openers", status: "warn", detail: "1 line opens with a weak verb.", evidence: "Responsible for restocking shelves every weekend", group: "Impact" },
      ] },
      { key: "style", label: "Brevity & style", items: [
        { id: "length", label: "Right length (one page)", status: "fail", detail: "62 words. 200 to 700 is the sweet spot.", group: "Brevity & style" },
      ] },
    ],
    lines: [
      { text: "IMOGEN HART", flags: [] },
      { text: "Served 200+ customers a shift on tills and the plant desk", flags: ["strong"] },
      { text: "Responsible for restocking shelves every weekend", flags: ["weak-opener", "no-number"] },
      { text: "Trained two new starters on the till system", flags: ["no-number"] },
    ],
  },
};

const liSection = (id, label, score, weight, right, improve) => ({ id, label, score, weight, right, improve });
export const FALLBACK_LINKEDIN = {
  report: {
    overall: 52,
    verdict: "Solid base, needs more depth",
    next_step: "Expand the About section into two or three short paragraphs.",
    encouragement: "Your headline already says where you are heading.",
    sections: [
      liSection("url", "Profile URL", 3, 5, ["Your link works."], ["Claim a custom URL without the digits."]),
      liSection("headline", "Headline", 6, 10, ["'Weekend team member' says what you do now."], ["Say what you are looking for."]),
      liSection("location", "Location", 5, 5, ["'Leeds, England, United Kingdom' is clear."], []),
      liSection("about", "About", 10, 20, ["'I want a customer service apprenticeship' names a direction."], ["Open with the garden centre."]),
      liSection("experience", "Experience", 14, 25, ["'Served 200+ customers a shift' is specific."], ["Add what changed because you were there."]),
      liSection("education", "Education", 6, 10, ["'Leeds City College' with dates."], []),
      liSection("skills", "Skills", 8, 15, ["'Customer Service' fits."], ["Add two more."]),
      liSection("extras", "Certifications & extras", 0, 10, [], ["Add one thing outside work."]),
    ],
  },
};

export const FALLBACK_REWRITE = {
  rewrite: {
    headline: "Customer service apprenticeship candidate | Tills, plant desk and BTEC Business | Leeds",
    about: "Every weekend I serve 200+ customers on the tills and plant desk at a garden centre in Leeds.\n\nI am studying BTEC Business at college.\n\nI am looking for a customer service apprenticeship. You can reach me at [your email].",
    experience_tip: "- Served 200+ customers a shift on tills and the plant desk\n- Trained two new starters on the till system",
    next: "Paste the headline in first. It is the line recruiters see in search.",
  },
};

export const FALLBACK_COVER = {
  draft: {
    greeting: "Dear [Hiring manager's name],",
    paragraphs: [
      "Helping people sort out everyday problems is the kind of work I enjoy, so the Customer Service Apprentice role caught my eye straight away.",
      "At the garden centre I serve 200+ customers a shift on the tills and the plant desk, and I trained two new starters on the till system.",
      "I would love to bring that to [one sentence on why this company specifically]. Thank you for considering my application.",
    ],
    signoff: "Yours sincerely,",
    personalise: ["[Hiring manager's name]: ring and ask who is hiring.", "[one sentence on why this company specifically]"],
    tips: ["Read it aloud before you send it.", "Keep it to one page."],
  },
};

export const FALLBACK_INTERVIEW = {
  report: {
    overall: 72,
    verdict: "Grounded, real, nearly there",
    breakdown: { final: 72, answer: 72, answerMax: 100, speech: null, presence: null },
    speech: null,
    presence: null,
    answers: [
      { score: 74, strength: "You said 'I trained two new starters on the till system', which is a concrete recent action.", improve: "The reason you applied trails off. Name the role and what draws you to it.", impress: "A number: how many customers you serve in a shift.", sharper: "I work weekends on the tills at a garden centre in Leeds, where I serve [how many] customers a shift." },
      { score: 70, strength: "'finished the first draft a week early' proves the claim.", improve: "Say what the plan changed for the grade.", impress: "The result: the grade you got.", sharper: "For my Business coursework I set a deadline for each section and finished a week early, which earned [your grade]." },
    ],
    next_step: "End every story with one sentence that says what the result meant.",
    encouragement: "'I trained two new starters' is the line an interviewer will remember.",
  },
};
