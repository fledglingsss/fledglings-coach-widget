/* Templates and scripts: the words for reaching out.
 *
 * A tester asked for "templates/guidance for emails, cold calls,
 * networking". The suite already helps a learner write the documents
 * (CV, cover letter, profile) and rehearse the interview; what it did
 * not cover is every moment in between - asking a shop whether they
 * have work, chasing an application, ringing ahead when the bus is
 * late, thanking the person who helped. Those are the moments a
 * sixteen-year-old has never seen done, and where a first job is
 * usually won or lost.
 *
 * Everything here is authored, not generated. No model call, no
 * request to the worker: the learner picks a situation, types their
 * own facts, and the page fills the shape on their device. That keeps
 * the no-fabrication law without needing to enforce it - there is
 * nothing in a template except the structure and the learner's own
 * words, and anything still missing shows as a [bracket] for them to
 * supply, exactly as the cover letter and CV tools do.
 *
 * Writing rules for every template, pinned by tests:
 *   - British English, no em dashes, short enough to actually send
 *   - a token such as {theirName} must be declared in the template's
 *     field list, and every declared field must be used
 *   - a "sentence" field stands alone: the template never adds its
 *     own full stop after one
 */

export type OutreachChannel = "email" | "call" | "network";

/** How a learner's value is tidied before it joins the template.
 *   name     - used exactly as typed (people, companies, job titles)
 *   phrase   - part of our sentence, so its own end punctuation goes
 *   sentence - a whole sentence: capitalised, and given a full stop */
export type OutreachFieldKind = "name" | "phrase" | "sentence";

export interface OutreachField {
  /** The form label. */
  label: string;
  /** Example shown as the input's placeholder. */
  example: string;
  /** What appears in [brackets] while the field is empty. */
  blank: string;
  kind: OutreachFieldKind;
  max: number;
  /** One line of help under the input. */
  hint?: string;
}

export const OUTREACH_FIELDS = {
  yourName: { label: "Your full name", example: "Imogen Hart", blank: "Your name", kind: "name", max: 60 },
  yourPhone: { label: "Your phone number", example: "07700 900123", blank: "Your phone number", kind: "name", max: 24 },
  yourStatus: {
    label: "What you're doing now",
    example: "a Year 12 student studying Business",
    blank: "what you're doing now",
    kind: "phrase",
    max: 90,
    hint: "Finish the sentence “I'm…”",
  },
  theirName: {
    label: "Their name",
    example: "Ms Khan",
    blank: "Their name",
    kind: "name",
    max: 60,
    hint: "No name? Type Hiring Manager.",
  },
  theirFirst: {
    label: "Their first name",
    example: "Priya",
    blank: "First name",
    kind: "name",
    max: 40,
    hint: "LinkedIn is first-name territory.",
  },
  company: { label: "Company or organisation", example: "Hillside Garden Centre", blank: "Company", kind: "name", max: 80 },
  role: {
    label: "Job title",
    example: "Weekend Sales Assistant",
    blank: "Job title",
    kind: "name",
    max: 80,
    hint: "The title exactly as the advert has it.",
  },
  workWanted: {
    label: "The work you're after",
    example: "a Saturday job",
    blank: "the work you're after",
    kind: "phrase",
    max: 80,
    hint: "For example: a Saturday job, work experience in June, an apprenticeship.",
  },
  whereSeen: { label: "Where you saw the advert", example: "your website", blank: "where you saw it", kind: "phrase", max: 60 },
  reasonForThem: {
    label: "Why this employer",
    example: "I've shopped with you for years and your staff always know their plants",
    blank: "One sentence on why you chose them",
    kind: "sentence",
    max: 160,
    hint: "One true, specific sentence. This is the line that gets replies.",
  },
  proof: {
    label: "One thing you've done that shows you'd be good",
    example: "I work Saturdays on the tills at a cafe",
    blank: "one thing you've done that shows you'd be good",
    kind: "phrase",
    max: 140,
    hint: "A job, a club, volunteering, caring for someone. Real, not impressive.",
  },
  availability: {
    label: "When you're free",
    example: "at weekends and after 4pm on weekdays",
    blank: "when you're free",
    kind: "phrase",
    max: 80,
  },
  appliedDate: { label: "When you applied", example: "Monday 3 March", blank: "the date you applied", kind: "phrase", max: 40 },
  interviewDate: {
    label: "Interview day and time",
    example: "Thursday 12 June at 10am",
    blank: "interview day and time",
    kind: "phrase",
    max: 50,
  },
  interviewTime: { label: "Your interview time", example: "10 o'clock", blank: "your interview time", kind: "phrase", max: 30 },
  reason: {
    label: "Why you can't make it",
    example: "I have an exam that morning",
    blank: "your reason, in a few words",
    kind: "phrase",
    max: 100,
  },
  newTime: {
    label: "Times you could do instead",
    example: "Friday 13 June at any time, or Monday 16 June after 2pm",
    blank: "two or three times you can do",
    kind: "phrase",
    max: 110,
  },
  adjustment: {
    label: "What would help",
    example: "having the questions in writing a few minutes before we start",
    blank: "the adjustment you need",
    kind: "phrase",
    max: 140,
    hint: "Say what would help. You do not have to explain why.",
  },
  talkedAbout: {
    label: "Something you talked about",
    example: "the new click and collect desk",
    blank: "something you talked about",
    kind: "phrase",
    max: 110,
  },
  startDate: { label: "Start date you were offered", example: "Monday 7 July", blank: "start date", kind: "phrase", max: 40 },
  refContext: {
    label: "How they know you",
    example: "you taught me Business for two years",
    blank: "how they know you",
    kind: "phrase",
    max: 110,
    hint: "Finish the sentence “Because…”",
  },
  delay: { label: "How late you'll be", example: "about 15 minutes", blank: "how long", kind: "phrase", max: 40 },
  theirJob: {
    label: "The job or field you're curious about",
    example: "veterinary nursing",
    blank: "the job or field",
    kind: "phrase",
    max: 60,
  },
  mutual: {
    label: "How you found them",
    example: "My tutor, Mr Davies, suggested I get in touch",
    blank: "One sentence on how you found them",
    kind: "sentence",
    max: 140,
  },
  contact: {
    label: "Who you'd like to meet",
    example: "your friend who works at the vets",
    blank: "who you'd like to meet",
    kind: "phrase",
    max: 90,
  },
  eventName: {
    label: "Where you met",
    example: "the careers fair at my college on Tuesday",
    blank: "where you met",
    kind: "phrase",
    max: 110,
  },
  theirHelp: {
    label: "What they did for you",
    example: "talking me through how you got into nursing",
    blank: "what they did for you",
    kind: "phrase",
    max: 120,
    hint: "Finish the sentence “Thank you for…”",
  },
  outcome: {
    label: "What happened next",
    example: "I've applied for two healthcare apprenticeships this week",
    blank: "One sentence on what happened next",
    kind: "sentence",
    max: 160,
  },
} as const satisfies Record<string, OutreachField>;

export type OutreachFieldId = keyof typeof OUTREACH_FIELDS;

export interface OutreachLine {
  /** "say" is spoken aloud; "note" is a stage direction. */
  k: "say" | "note";
  x: string;
}

export interface OutreachTemplate {
  /** Also the URL fragment: /templates#thank-you-interview. */
  id: string;
  channel: OutreachChannel;
  title: string;
  /** One line on when to reach for this. */
  when: string;
  fields: readonly OutreachFieldId[];
  /** Email subject line. */
  subject?: string;
  /** A message to copy and send. Exactly one of body or script is set. */
  body?: string;
  /** Words to say out loud, in order. */
  script?: readonly OutreachLine[];
  /** "If they say X" and what to answer. */
  branches?: ReadonlyArray<{ cue: string; reply: string }>;
  tips: readonly string[];
  /** Where to go next: another tool, or another template (#id). */
  link?: { href: string; label: string };
  /** Hard character limit to count against (a LinkedIn note). */
  limit?: number;
}

/** LinkedIn's own limit for a personalised connection note. */
export const LINKEDIN_NOTE_LIMIT = 200;

export const OUTREACH_TEMPLATES: readonly OutreachTemplate[] = [
  /* ============================ emails ============================ */
  {
    id: "speculative",
    channel: "email",
    title: "Ask about work experience or openings",
    when: "They are not advertising, but you would like to work there. This is called a speculative email.",
    fields: ["theirName", "company", "workWanted", "yourStatus", "reasonForThem", "proof", "availability", "yourName", "yourPhone"],
    subject: "Work enquiry: {yourName}",
    body: `Dear {theirName},

I'm {yourStatus}, and I'm writing to ask whether you might have {workWanted} at {company}, now or in the next few months.

{reasonForThem} That's why I'd like to learn from your team in particular.

{proof}, and I'd bring the same effort to your team. I'm free {availability}.

I've attached my CV. Could I call in or ring you for five minutes this week to introduce myself?

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Find a real name. The company website, LinkedIn or a quick call to reception will usually give you one.",
      "The line about why you chose them is the one that gets replies. Make it true and specific.",
      "No answer after a week? Follow up once, by phone if you can.",
    ],
    link: { href: "#cold-call", label: "Prefer to ring? Open the phone script" },
  },
  {
    id: "apply-email",
    channel: "email",
    title: "Send your CV for an advertised job",
    when: "The advert says to apply by email. This is the short message your CV and cover letter travel in.",
    fields: ["theirName", "role", "company", "whereSeen", "proof", "yourName", "yourPhone"],
    subject: "Application for {role}: {yourName}",
    body: `Dear {theirName},

Please find attached my CV and cover letter for the {role} role at {company}, which I saw advertised on {whereSeen}.

{proof}, and I'd be glad to bring that to your team.

I'm happy to send anything else you need, and you can reach me on {yourPhone}.

Kind regards,
{yourName}`,
    tips: [
      "Use the exact job title from the advert in the subject line. Some inboxes are sorted by it.",
      "Attach your CV as a PDF with your name in the file name, such as Imogen-Hart-CV.pdf.",
      "If the advert asks for something specific, such as a reference number or your availability, put it in.",
    ],
    link: { href: "/cover-letter", label: "Need the cover letter? Draft it from the advert" },
  },
  {
    id: "follow-up-application",
    channel: "email",
    title: "Chase an application you have heard nothing about",
    when: "It has been a week or more since you applied, or since the closing date, and there has been no reply.",
    fields: ["theirName", "role", "company", "appliedDate", "yourName", "yourPhone"],
    subject: "Following up: {role} application",
    body: `Dear {theirName},

I applied for the {role} role at {company} on {appliedDate}, and I wanted to check that my application reached you.

I'm still very interested in the role. If it would help, I can send my CV again or answer any questions.

Thank you for your time.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Chase once. If there is still nothing after another week, put your energy into the next application.",
      "Stay friendly. People are far more likely to reply to a polite check than to a complaint.",
      "If the advert gave a closing date, wait until a few days after it.",
    ],
    link: { href: "#call-follow-up", label: "Rather ring them? Open the phone script" },
  },
  {
    id: "confirm-interview",
    channel: "email",
    title: "Reply to an interview invitation",
    when: "They have invited you to interview. Reply the same day, even if it is just to say yes.",
    fields: ["theirName", "role", "interviewDate", "yourName", "yourPhone"],
    subject: "Re: Interview for {role}",
    body: `Dear {theirName},

Thank you for inviting me to interview for the {role} role. I'm pleased to confirm that I can attend on {interviewDate}.

Could you let me know who I should ask for when I arrive, and whether there is anything I should bring?

I look forward to meeting you.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Reply to their email rather than starting a new one, so everything stays in one thread.",
      "Repeat the day and time back to them. It catches mix-ups before they matter.",
      "Then put it in your calendar and plan the journey straight away.",
    ],
    link: { href: "/interview", label: "Now practise for it in Interview Practice" },
  },
  {
    id: "rearrange-interview",
    channel: "email",
    title: "Ask to move an interview",
    when: "You genuinely cannot make the time they offered. Tell them as early as you can.",
    fields: ["theirName", "role", "interviewDate", "reason", "newTime", "yourName", "yourPhone"],
    subject: "Interview for {role}: request to rearrange",
    body: `Dear {theirName},

Thank you for inviting me to interview for the {role} role on {interviewDate}.

Unfortunately {reason}, so I'm not able to make that time. I'm sorry for the inconvenience, and I'm still very keen to meet you.

I could come in on {newTime}. If none of those work, I'll fit around whatever suits you.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Give a real reason in a few words. You do not owe them the whole story.",
      "Offer two or three specific times, so they can simply pick one.",
      "Only ask once. Moving an interview twice is hard to come back from.",
    ],
  },
  {
    id: "adjustments",
    channel: "email",
    title: "Ask for adjustments at an interview",
    when: "You have a disability, a health condition or an access need, and something would help you show your best.",
    fields: ["theirName", "role", "interviewDate", "adjustment", "yourName", "yourPhone"],
    subject: "Interview for {role}: adjustment request",
    body: `Dear {theirName},

Thank you for inviting me to interview for the {role} role on {interviewDate}. I'm looking forward to it.

To help me do my best on the day, I'd like to ask for a reasonable adjustment: {adjustment}.

Please let me know if you need any more information from me. Thank you for your help.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "By law, employers must make reasonable adjustments for disabled job applicants. Asking is normal.",
      "Say what would help, not your medical history. You choose how much to share.",
      "Common examples: extra time for a written task, the questions in writing, a ground-floor room, or a video call instead of travelling.",
      "Ask as soon as you get the invitation, so they have time to arrange it.",
    ],
  },
  {
    id: "thank-you-interview",
    channel: "email",
    title: "Say thank you after an interview",
    when: "Send it the same day, while they still remember you.",
    fields: ["theirName", "role", "talkedAbout", "yourName"],
    subject: "Thank you: {role} interview",
    body: `Dear {theirName},

Thank you for meeting me today about the {role} role. I really enjoyed hearing about {talkedAbout}.

Our conversation made me even more keen to join the team, and I'd be glad to send anything else that would help you decide.

Kind regards,
{yourName}`,
    tips: [
      "Three sentences is enough. This is a thank you, not a second interview.",
      "Naming one real thing you talked about proves it is not a copy and paste.",
      "Do not ask when you will hear back. If they gave you a date, wait for it.",
    ],
  },
  {
    id: "feedback-request",
    channel: "email",
    title: "Ask for feedback after a no",
    when: "You did not get it. One piece of honest feedback makes the next interview easier.",
    fields: ["theirName", "role", "company", "yourName"],
    subject: "Thank you, and one question: {role}",
    body: `Dear {theirName},

Thank you for letting me know about the {role} role, and for the time you gave me. I'm disappointed, but I enjoyed finding out more about {company}.

Would you be willing to share one or two things I could do better next time? Any feedback would really help me.

I'd be glad to be considered if a similar role comes up in future.

Kind regards,
{yourName}`,
    tips: [
      "Not everyone replies, and that is not about you. Some employers have a policy of not giving feedback.",
      "Whatever they say, thank them and do not argue. You are collecting information, not appealing.",
      "Then practise exactly that point before your next interview.",
    ],
    link: { href: "/interview", label: "Practise it in Interview Practice" },
  },
  {
    id: "accept-offer",
    channel: "email",
    title: "Accept a job offer",
    when: "You have an offer and you want it. Put your yes in writing, even if you already said it on the phone.",
    fields: ["theirName", "role", "company", "startDate", "yourName", "yourPhone"],
    subject: "Accepting the {role} offer: {yourName}",
    body: `Dear {theirName},

Thank you for offering me the {role} role at {company}. I'm delighted to accept.

I understand my start date is {startDate}. Could you let me know what time I should arrive, who to ask for, and anything I need to bring or complete before then?

I'm really looking forward to getting started.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Check the offer first: pay, hours, start date and where you will be based. Ask about anything unclear before you say yes.",
      "Waiting on another employer? It is fine to thank them and ask for a day or two to decide.",
      "Keep the offer email or letter somewhere safe.",
    ],
  },
  {
    id: "decline-offer",
    channel: "email",
    title: "Turn down an offer politely",
    when: "You have decided to say no. Do it quickly and kindly: you may want to work with them one day.",
    fields: ["theirName", "role", "company", "yourName"],
    subject: "{role} offer: {yourName}",
    body: `Dear {theirName},

Thank you very much for offering me the {role} role at {company}, and for the time you spent with me.

After thinking it over carefully, I've decided not to accept. It was not an easy decision, and I'm grateful for the opportunity.

I wish you and the team all the best.

Kind regards,
{yourName}`,
    tips: [
      "Tell them as soon as you have decided, so they can offer it to someone else.",
      "You do not have to give a reason. If you want to, one honest line is plenty.",
      "Never just stop replying. People move between companies, and they remember.",
    ],
  },
  {
    id: "reference-request",
    channel: "email",
    title: "Ask someone to be your referee",
    when: "An application asks for references. Always ask before you put someone's name down.",
    fields: ["theirName", "role", "company", "refContext", "yourName", "yourPhone"],
    subject: "Could you be a referee for me?",
    body: `Dear {theirName},

I hope you're well. I'm applying for the {role} role at {company}, and I'd like to ask whether you would be willing to be a referee for me.

Because {refContext}, I think you could speak about how I work and whether I can be relied on.

If you're happy to, could you let me know the best email address and phone number for them to contact you on? I'll tell you as soon as I know they may be in touch.

Thank you. I really appreciate it.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Good referees are teachers, tutors, employers, coaches or volunteer leaders. Not family or friends.",
      "Tell them what the job is, so they know which of your strengths to talk about.",
      "Say thank you afterwards, and let them know whether you got it.",
    ],
    link: { href: "#thank-you-help", label: "Open the thank-you template" },
  },

  /* ========================= phone calls ========================= */
  {
    id: "cold-call",
    channel: "call",
    title: "Ring a local employer about work",
    when: "There is no advert and no contact name. A two-minute call can get you further than ten emails.",
    fields: ["yourName", "yourStatus", "workWanted", "availability"],
    script: [
      { k: "say", x: "Hello, my name is {yourName}. Could I speak to the manager, or whoever looks after hiring, please?" },
      { k: "note", x: "When you are put through, start again from the top. They have not heard your name yet." },
      { k: "say", x: "Hello, my name is {yourName}. I'm {yourStatus}. Have you got two minutes?" },
      { k: "say", x: "I'm looking for {workWanted}, and I'd really like to work with you. Do you have anything coming up?" },
      { k: "say", x: "I'm free {availability}, and I can drop my CV in or email it today. Which would you prefer?" },
      { k: "say", x: "Thank you for your time. Could I take your name, so I know who to send it to?" },
    ],
    branches: [
      {
        cue: "They say: “Just send us an email.”",
        reply: "Of course. Who should I address it to, and what's the best email address? I'll send it this afternoon.",
      },
      {
        cue: "They say: “We're not hiring.”",
        reply: "No problem, thank you for telling me. Would it be all right if I sent my CV anyway, in case something comes up?",
      },
      {
        cue: "They say: “The manager isn't in.”",
        reply: "Thanks. When's a good time to call back, and who should I ask for?",
      },
      {
        cue: "They sound rushed.",
        reply: "I can hear it's a busy time. When would be better for me to ring back?",
      },
    ],
    tips: [
      "Write down the name of everyone you speak to. “I spoke to Sam on Tuesday” opens doors next time.",
      "A no on the phone is still useful. Ask if you can send your CV for later.",
      "Send what you promised the same day.",
    ],
    link: { href: "#speculative", label: "Open the email to send afterwards" },
  },
  {
    id: "call-follow-up",
    channel: "call",
    title: "Ring to chase an application",
    when: "A week after applying, with no reply. A short, friendly call shows you are keen.",
    fields: ["yourName", "role", "appliedDate"],
    script: [
      {
        k: "say",
        x: "Hello, my name is {yourName}. I applied for the {role} role on {appliedDate}, and I'm ringing to check that my application arrived.",
      },
      { k: "say", x: "I'm still very interested. Is there anything else you need from me?" },
      { k: "say", x: "Do you know roughly when you'll be making decisions?" },
      { k: "say", x: "Thank you, I appreciate your time." },
    ],
    branches: [
      {
        cue: "They say: “We'll be in touch.”",
        reply: "Thank you. Would it be all right if I checked back at the end of next week?",
      },
      {
        cue: "They say: “The role has gone.”",
        reply: "Thank you for letting me know. Could you keep my details in case something similar comes up?",
      },
      {
        cue: "They cannot find your application.",
        reply: "No problem. I can send it again right now. What's the best email address?",
      },
    ],
    tips: [
      "Keep it under two minutes. You are checking, not pressing them for an answer.",
      "Have the date you applied and the job title ready. They will ask.",
    ],
  },
  {
    id: "voicemail",
    channel: "call",
    title: "Leave a voicemail worth returning",
    when: "Nobody picks up. Do not hang up: a clear 20-second message gets called back.",
    fields: ["yourName", "role", "yourPhone", "availability"],
    script: [
      { k: "say", x: "Hello, this is {yourName}, calling about the {role} role." },
      { k: "say", x: "I'd like to check on my application and ask one quick question." },
      { k: "say", x: "My number is {yourPhone}. That's {yourPhone}." },
      { k: "say", x: "You can reach me {availability}. Thank you, and I hope to speak to you soon." },
    ],
    tips: [
      "Say your number twice, slowly. It is the part people miss.",
      "Keep it under 20 seconds: name, why you rang, number, thanks.",
      "Sort out your own voicemail greeting too. Your name, nothing jokey.",
    ],
  },
  {
    id: "surprise-call",
    channel: "call",
    title: "When an employer rings you out of the blue",
    when: "An unknown number rings while you are on the bus or half asleep. You are allowed to buy yourself ten minutes.",
    fields: ["yourName"],
    script: [
      { k: "say", x: "Hello, {yourName} speaking." },
      { k: "note", x: "If you can talk properly, find somewhere quiet, grab a pen and carry on." },
      {
        k: "say",
        x: "Thank you for calling. I'd really like to give this my full attention, and I'm somewhere noisy at the moment. Could I call you back in ten minutes?",
      },
      { k: "say", x: "What's the best number to reach you on, and who should I ask for?" },
      { k: "note", x: "Then do call back in ten minutes, with your CV and the advert in front of you." },
    ],
    tips: [
      "While you are job hunting, answer unknown numbers with your name.",
      "Save each employer's number when you apply, so you know who is ringing.",
      "Missed it? Ring back the same day. Employers often move on to the next person on the list.",
    ],
  },
  {
    id: "running-late",
    channel: "call",
    title: "Ring ahead if you are running late",
    when: "The bus has not come and your interview is in 20 minutes. Ringing before you are late turns a disaster into a good impression.",
    fields: ["yourName", "theirName", "interviewTime", "delay"],
    script: [
      { k: "say", x: "Hello, my name is {yourName}. I have an interview with {theirName} at {interviewTime} today." },
      { k: "say", x: "I'm very sorry, I've been held up on the way and I'm going to be {delay} late." },
      { k: "say", x: "Is it still all right for me to come, or would you rather I rearranged?" },
      { k: "say", x: "Thank you. I'll be there as soon as I can." },
    ],
    tips: [
      "Ring as soon as you know, not when you are already late.",
      "Say sorry once, give the facts and offer to rearrange. No long excuses.",
      "Save the employer's number in your phone the night before.",
    ],
  },

  /* ========================== networking ========================== */
  {
    id: "linkedin-connect",
    channel: "network",
    title: "Send a LinkedIn connection note",
    when: "You want to connect with someone you do not know yet. A short note tells them why, so you are not just a stranger's name.",
    fields: ["theirFirst", "yourStatus", "theirJob", "mutual", "yourName"],
    body: "Hi {theirFirst}, I'm {yourStatus}, interested in {theirJob}. {mutual} I'd love to connect. Thanks, {yourName}",
    limit: LINKEDIN_NOTE_LIMIT,
    tips: [
      "LinkedIn allows up to 200 characters, and a free account only gets a few personalised notes each month. Save them for the people who matter most.",
      "Use their first name, and say one true thing about why you chose them.",
      "Do not ask for a job in the note. Connect first, then ask for advice.",
    ],
    link: { href: "/linkedin", label: "Get your own profile reviewed first" },
  },
  {
    id: "info-chat",
    channel: "network",
    title: "Ask someone for 15 minutes of advice",
    when: "Someone does a job you are curious about. Most people enjoy being asked how they got there.",
    fields: ["theirName", "mutual", "yourStatus", "theirJob", "yourName"],
    subject: "A quick question about getting into {theirJob}",
    body: `Hello {theirName},

{mutual} I'm {yourStatus}, and I'm trying to work out how to get into {theirJob}.

Would you be willing to spare 15 minutes for a phone or video call, so I could ask how you got started and what you would do in my position? I'd fit around whenever suits you.

I know you are busy, so no problem at all if not. Thank you for reading this.

Kind regards,
{yourName}`,
    tips: [
      "Prepare three questions before the call. “What do you wish you had known at my age?” always works.",
      "Keep to the 15 minutes you asked for, unless they offer more.",
      "Send a thank you the same day.",
    ],
    link: { href: "#thank-you-help", label: "Open the thank-you template" },
  },
  {
    id: "intro-request",
    channel: "network",
    title: "Ask someone you know for an introduction",
    when: "A teacher, relative, coach or boss knows someone in the field you want. Make it easy for them to help.",
    fields: ["theirName", "theirJob", "contact", "yourName", "yourStatus"],
    subject: "Could you introduce me to someone?",
    body: `Hello {theirName},

I hope you're well. I'm looking into {theirJob} and trying to talk to people who already do it.

You mentioned {contact}. Would you be happy to introduce us, or to pass on my details? I'd only ask them for 15 minutes of advice.

To make it easy, here is a line you could forward: "{yourName} is {yourStatus} and is keen to find out about {theirJob}. Would you be up for a short chat?"

Thank you, I really appreciate it.

{yourName}`,
    tips: [
      "Writing the line for them to forward is what makes this work. It turns a favour into a ten-second job.",
      "If they say yes, follow up with the new contact within a day or two.",
      "Whatever comes of it, tell the person who introduced you how it went.",
    ],
    link: { href: "#info-chat", label: "Open the message for the new contact" },
  },
  {
    id: "event-opener",
    channel: "network",
    title: "What to say at a careers fair or open day",
    when: "You are standing at an employer's stand and your mind has gone blank.",
    fields: ["yourName", "yourStatus", "theirJob"],
    script: [
      { k: "say", x: "Hello, I'm {yourName}. I'm {yourStatus}, and I'm interested in {theirJob}." },
      { k: "say", x: "What does a typical day look like for someone starting out with you?" },
      { k: "say", x: "What do you look for in the people you take on?" },
      { k: "say", x: "What's the best way to apply, and is there someone I could contact afterwards?" },
      { k: "say", x: "Thank you, that's really helpful. Could I take your name?" },
    ],
    tips: [
      "Three questions is plenty. Listen more than you talk.",
      "As you walk away, note their name and one thing they said on your phone.",
      "They may ask about you. Have your 60-second pitch ready: who you are, one thing you have done, what you are looking for.",
      "Send a follow-up message that evening, while they still remember you.",
    ],
    link: { href: "#event-follow-up", label: "Open the follow-up message" },
  },
  {
    id: "event-follow-up",
    channel: "network",
    title: "Follow up after meeting someone",
    when: "You met someone useful at a fair, an open day, a placement or through a friend. Message within a day or two.",
    fields: ["theirName", "eventName", "talkedAbout", "yourName", "yourPhone"],
    subject: "Good to meet you: {yourName}",
    body: `Hello {theirName},

Thank you for talking to me at {eventName}. I really appreciated your advice about {talkedAbout}.

I'd like to stay in touch. I've attached my CV in case it is useful, and I'd be grateful for any advice on the best next step.

Kind regards,
{yourName}
{yourPhone}`,
    tips: [
      "Mention something specific they said, so they can place you among everyone they met.",
      "One clear ask is enough: advice on the next step, not five questions.",
      "Connect with them on LinkedIn too, with a short note.",
    ],
    link: { href: "#linkedin-connect", label: "Open the LinkedIn note" },
  },
  {
    id: "thank-you-help",
    channel: "network",
    title: "Thank someone who helped you",
    when: "Someone gave you advice, an introduction or a reference. Tell them what happened next: it is the part people forget.",
    fields: ["theirName", "theirHelp", "outcome", "yourName"],
    subject: "Thank you",
    body: `Hello {theirName},

I wanted to say thank you for {theirHelp}.

{outcome} I would not have got there without your help.

I'll let you know how it goes.

{yourName}`,
    tips: [
      "Short and specific beats long and gushing.",
      "Telling people what their help led to is what makes them glad to help again.",
      "No news yet? Thank them anyway, and update them later.",
    ],
  },
];

export interface OutreachGuide {
  channel: OutreachChannel;
  /** Tab label. */
  label: string;
  icon: string;
  title: string;
  lead: string;
  rules: ReadonlyArray<{ h: string; d: string }>;
}

export const OUTREACH_GUIDES: readonly OutreachGuide[] = [
  {
    channel: "email",
    label: "Emails",
    icon: "✉️",
    title: "Before you press send",
    lead: "An employer decides in a few seconds whether to keep reading. These six habits get you past that.",
    rules: [
      {
        h: "Say what it is in the subject line",
        d: "“Application for Sales Assistant: Imogen Hart” gets opened. “Hi” or “Job” gets skipped.",
      },
      {
        h: "Use their name",
        d: "“Dear Ms Khan” or “Hello Sam”. Cannot find a name on the advert or the website? “Dear Hiring Manager” is fine.",
      },
      {
        h: "Get to the point in two lines",
        d: "Who you are and why you are writing, straight away. Busy people read the top and decide.",
      },
      { h: "Keep it short", d: "Under 150 words. Your CV carries the detail. The email just opens the door." },
      {
        h: "Check it twice",
        d: "Read it out loud, check how their name is spelt, and make sure your CV really is attached.",
      },
      {
        h: "Sound like you on a good day",
        d: "A sensible email address, no emojis or text speak, and “Kind regards” to finish.",
      },
    ],
  },
  {
    channel: "call",
    label: "Phone calls",
    icon: "📞",
    title: "Before you ring",
    lead: "A phone call feels like the scariest option and is often the quickest way to a yes. Two minutes of setting up makes it far easier.",
    rules: [
      { h: "Know your first line", d: "Your name and who you would like to speak to. Say it out loud once before you dial." },
      {
        h: "Pick your moment",
        d: "Mid-morning or mid-afternoon works best. Avoid opening time, and the lunch rush in shops and cafes.",
      },
      {
        h: "Have it all in front of you",
        d: "Your CV, the advert, a pen and your diary. You may be asked when you can come in.",
      },
      { h: "Stand up and smile", d: "It sounds odd, and it works: your voice comes out clearer and friendlier." },
      {
        h: "Leave with a name and a next step",
        d: "Write down who you spoke to and what happens next, before you forget.",
      },
      { h: "Nerves are normal", d: "Speak slowly. A pause sounds confident, and nobody minds if you read from notes." },
    ],
  },
  {
    channel: "network",
    label: "Networking",
    icon: "🤝",
    title: "Networking is just asking people about their work",
    lead: "You do not need contacts in high places. You need to ask the people you can already reach, politely and specifically.",
    rules: [
      {
        h: "You already have a network",
        d: "Family, teachers, coaches, neighbours, the people at your part-time job. Each of them knows people you do not.",
      },
      {
        h: "Ask for advice, not a job",
        d: "“Could I ask how you got into it?” is easy to say yes to. “Can you get me a job?” is not.",
      },
      { h: "Make the ask small", d: "Fifteen minutes, by phone or video. Offer to fit around them." },
      {
        h: "Say why you chose them",
        d: "One true, specific line: their job, their company, or who suggested them.",
      },
      {
        h: "Always close the loop",
        d: "Thank them, then tell them what happened next. That is what gets you helped a second time.",
      },
      {
        h: "Keep it professional and safe",
        d: "Public channels, public places, and nobody who is helping you for real asks for money. See the safety notes below.",
      },
    ],
  },
];

/* Reaching out to strangers is the one part of job hunting where a
 * young person can be targeted. The advice follows the UK government's
 * published guidance on job scams (never pay before starting work, be
 * careful with documents, an offer with no interview is a warning) and
 * names the free reporting service it points people to. */
export const OUTREACH_SAFETY = {
  title: "Staying safe when you reach out",
  lead: "Almost everyone you contact will be exactly who they say they are. These habits protect you from the few who are not.",
  points: [
    "Keep first conversations on email, LinkedIn, the phone or a video call.",
    "Meeting someone new in person? Choose a public place or their workplace in working hours, and tell someone you trust where you are going.",
    "Never pay to get a job, an interview, training, a uniform or a background check before you start.",
    "Do not send bank details, your National Insurance number or photos of your ID to an employer you have not checked is real.",
    "A job offer with no interview, or pay that sounds too good to be true, is a warning sign.",
    "If something feels off, stop replying and talk to a tutor, parent or carer.",
  ],
  report: {
    text: "You can report a suspected job scam, free, to JobsAware.",
    href: "https://www.jobsaware.co.uk/report",
    label: "Report it at jobsaware.co.uk",
  },
} as const;

/** Every {token} a template uses, across subject, body, script and
 * branches - what the field list is checked against. */
export function templateTokens(t: OutreachTemplate): string[] {
  const text = [
    t.subject ?? "",
    t.body ?? "",
    ...(t.script ?? []).map((l) => l.x),
    ...(t.branches ?? []).flatMap((b) => [b.cue, b.reply]),
  ].join("\n");
  const found = new Set<string>();
  for (const m of text.matchAll(/\{([a-zA-Z]+)\}/g)) found.add(m[1]!);
  return [...found];
}

/* The fill logic that runs in the learner's browser. It is written
 * once, here, as the exact source the page ships, so the tests can
 * load this very string and exercise what a learner actually runs
 * instead of a look-alike kept in step by hand.
 *
 * ES5 on purpose: it is inlined into the page beside the rest of the
 * hand-written client code, and must not contain a backtick. */
export const OUTREACH_FILL_JS = String.raw`
/* Words that begin a phrase but never a proper noun: when a phrase
 * lands mid-sentence, "A Year 12 student" becomes "a Year 12 student"
 * without ever lower-casing "Monday", "Mr Davies" or "I". */
var FL_OUT_LEADS=['a','an','the','in','at','on','my','our','we','it','there','this','that','these','those',
'weekends','weekdays','evenings','mornings','afternoons','most','any','every','after','before','from','about',
'currently','two','three','you','your','they','their','he','she','his','her',
/* A blanket "-ing" rule would lower-case Reading, Woking and Barking,
 * which are places learners live. These are the verbs people open with. */
'studying','working','doing','looking','finishing','talking','helping','taking','showing','giving','having',
'going','training','learning','applying','volunteering','waiting','starting','hoping','meeting','letting','writing'];
function flOutClean(v,kind){
v=String(v==null?'':v).replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');
if(!v)return '';
if(kind==='sentence'){v=v.charAt(0).toUpperCase()+v.slice(1);
if(!/[.!?]$/.test(v))v+='.';
return v;}
if(kind==='phrase')return v.replace(/[\s.,;:!?]+$/,'');
return v;}
function flOutLower(v){var first=v.split(' ')[0];var low=first.toLowerCase();
if(first===low)return v;
if(FL_OUT_LEADS.indexOf(low)>-1)return v.charAt(0).toLowerCase()+v.slice(1);
return v;}
function flOutUpper(v){return v.charAt(0).toUpperCase()+v.slice(1);}
/* text with {tokens} -> [{t:'text'|'fill'|'blank', v, f}] */
function flOutParts(text,values,fields){
var parts=[],re=/\{([a-zA-Z]+)\}/g,last=0,soFar='',m;
while((m=re.exec(text))!==null){
var before=text.slice(last,m.index);
if(before){parts.push({t:'text',v:before});soFar+=before;}
last=re.lastIndex;
var f=fields[m[1]];
if(!f){parts.push({t:'text',v:m[0]});soFar+=m[0];continue;}
var val=flOutClean(values?values[m[1]]:'',f.kind);
var atStart=/(^|[.!?]\s+|\n\s*)$/.test(soFar);
if(val){
if(f.kind==='phrase')val=atStart?flOutUpper(val):flOutLower(val);
parts.push({t:'fill',v:val,f:m[1]});soFar+=val;}
else{var b='['+(atStart?flOutUpper(f.blank):f.blank)+']';parts.push({t:'blank',v:b,f:m[1]});soFar+=b;}}
var tail=text.slice(last);
if(tail)parts.push({t:'text',v:tail});
return parts;}
function flOutText(parts){var s='';for(var i=0;i<parts.length;i++)s+=parts[i].v;return s;}
/* how many DIFFERENT details are still missing */
function flOutBlanks(parts){var seen={},n=0;
for(var i=0;i<parts.length;i++){var p=parts[i];if(p.t==='blank'&&!seen[p.f]){seen[p.f]=1;n++;}}
return n;}
`;
