/* The Fledglings look, held in place.
 *
 * The first version of the career quiz and the leaderboard used six
 * colours the brand does not have and plain white cards, and the
 * founder called it generic. These tests are the things a person would
 * otherwise have to notice by eye: the colour families, the shared
 * pieces every page of this kind is built from, and the slogan's exact
 * wording. They cannot say a page is good; they can say it has not
 * drifted off-brand.
 */
import { describe, expect, it } from "vitest";

import { QUIZ_AREAS } from "../src/lib/career-quiz";
import { AREA_ART, CAREERS_CSS, interestMedal, renderCareerQuizPage } from "../src/pages-careers";
import { renderHubPage } from "../src/pages-hub";
import { KIT_CSS, confetti, sloganBand } from "../src/pages-kit";
import { LEADERBOARD_CSS, renderLeaderboardPage } from "../src/pages-leaderboard";

/** Every #rgb or #rrggbb colour written in a piece of CSS or markup. */
function hexColours(text: string): string[] {
  return [...new Set((text.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) ?? []).map((c) => c.toUpperCase()))];
}

function toHsl(hex: string): { hue: number; saturation: number; lightness: number } {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const spread = max - min;
  if (spread === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = spread / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) hue = ((g - b) / spread) % 6;
  else if (max === g) hue = (b - r) / spread + 2;
  else hue = (r - g) / spread + 4;
  return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}

/* The brand has two colour families and its neutrals: orange into mango
 * (and the bronze and cream the Skills Passport draws from them), and
 * navy into blue. A green, a purple or a teal is not ours. */
function inBrandFamily(hex: string): boolean {
  const { hue, saturation, lightness } = toHsl(hex);
  if (saturation < 0.16 || lightness > 0.97 || lightness < 0.03) return true; // a neutral
  const warm = hue >= 5 && hue <= 42;
  const cool = hue >= 198 && hue <= 216;
  return warm || cool;
}

const BRAND = ["#05253C", "#D9452B", "#ED9249", "#13507F", "#ECE7E6"];

describe("the colours on the new screens", () => {
  const SOURCES: Array<[string, string]> = [
    ["the shared pieces", KIT_CSS],
    ["the career quiz", CAREERS_CSS],
    ["the leaderboard", LEADERBOARD_CSS],
    ["the interest medals", JSON.stringify(AREA_ART)],
    ["the hub's two tiles", (() => {
      const html = renderHubPage();
      return html.slice(html.indexOf(".discover{"), html.indexOf(".id-tip{"));
    })()],
  ];

  for (const [name, text] of SOURCES) {
    it(`${name} use only the brand's two colour families and its neutrals`, () => {
      const colours = hexColours(text);
      expect(colours.length, `${name} should have colours to check`).toBeGreaterThan(3);
      const strays = colours.filter((colour) => !inBrandFamily(colour));
      expect(strays, `${name}: not a Fledglings colour`).toEqual([]);
    });
  }

  it("knows a stray when it sees one", () => {
    /* the three that were on the first version of the quiz */
    expect(inBrandFamily("#8A2F6B")).toBe(false); // plum
    expect(inBrandFamily("#1A7649")).toBe(false); // green
    expect(inBrandFamily("#6B4FBB")).toBe(false); // purple
    for (const colour of BRAND) expect(inBrandFamily(colour), colour).toBe(true);
  });

  it("uses the brand's own navy, orange, mango and blue, exactly", () => {
    const kit = hexColours(KIT_CSS);
    for (const colour of ["#05253C", "#D9452B", "#ED9249", "#13507F"]) expect(kit, colour).toContain(colour);
  });
});

describe("the interest medals", () => {
  it("gives every interest a medal of its own", () => {
    expect(Object.keys(AREA_ART).sort()).toEqual(QUIZ_AREAS.map((area) => area.id).sort());
    const faces = new Set(Object.values(AREA_ART).map((art) => art.medal));
    expect(faces.size).toBe(QUIZ_AREAS.length);
    const icons = new Set(Object.values(AREA_ART).map((art) => art.icon));
    expect(icons.size).toBe(QUIZ_AREAS.length);
  });

  it("draws each as a hexagon with a hidden icon, and with ribbons only when it is earned", () => {
    for (const area of QUIZ_AREAS) {
      const plain = interestMedal(area.id, 72);
      expect(plain).toContain("class='fk-medwrap'");
      expect(plain).toContain("aria-hidden='true'");
      expect(interestMedal(area.id, 72, true)).toContain("class='fk-medwrap earned'");
    }
    expect(KIT_CSS).toContain("clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)");
  });
});

describe("the shared pieces every page of this kind is built from", () => {
  const PAGES: Array<[string, string]> = [
    ["career quiz", renderCareerQuizPage()],
    ["leaderboard", renderLeaderboardPage()],
  ];

  for (const [name, html] of PAGES) {
    it(`${name}: opens on the navy hero with the bird behind it and one word in mango`, () => {
      expect(html).toContain("<section class='fk-hero");
      expect(html).toContain("<span class='fk-bird' aria-hidden='true'>");
      expect(html).toMatch(/<h2 class='fk-h'[^>]*>[^<]*<em>[^<]+<\/em>/);
    });

    it(`${name}: closes on the slogan, worded exactly as the brand words it`, () => {
      expect(html).toContain("<div class='s1'>Where Growth Takes <em>Flight</em></div>");
    });

    it(`${name}: is not built from the plain white cards it started as`, () => {
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
      expect(main).not.toContain("class='card");
    });
  }

  it("never alters the slogan", () => {
    expect(sloganBand("x")).toContain("Where Growth Takes <em>Flight</em>");
  });

  it("scatters the same confetti every time, in brand colours", () => {
    expect(confetti(18)).toBe(confetti(18));
    expect(hexColours(confetti(18)).every(inBrandFamily)).toBe(true);
  });

  it("sets everything in the brand's typeface: no page names another font", () => {
    for (const css of [KIT_CSS, CAREERS_CSS, LEADERBOARD_CSS]) {
      expect(css).not.toMatch(/font-family:(?!inherit)/);
    }
  });
});

describe("the hub's two tiles", () => {
  const html = renderHubPage();

  it("draws the quiz on navy with interest medals, and the leaderboard on the passport's warm tile with its places", () => {
    expect(html).toContain("<a class='dtile dt-quiz' data-tool='careers' id='quiz-card' href='/careers'>");
    expect(html).toContain("<a class='dtile dt-board' data-tool='leaderboard' href='/leaderboard'>");
    const quiz = html.slice(html.indexOf("class='dtile dt-quiz'"), html.indexOf("class='dtile dt-board'"));
    expect(quiz.split("class='fk-med'").length - 1).toBe(3);
    const board = html.slice(html.indexOf("class='dtile dt-board'"), html.indexOf("</div>", html.indexOf("class='dtile dt-board'")));
    for (const place of ["fk-pos p1", "fk-pos p2", "fk-pos p3"]) expect(board).toContain(place);
    expect(html).toContain(".dt-board{background:linear-gradient(135deg,#A66633,#B93A22);}");
  });
});
