/* The Fledglings look, for pages inside the hub's app shell.
 *
 * The first version of the career quiz and the leaderboard worked and
 * looked like nothing in particular: white cards, thin grey borders,
 * six colours that are not ours. The founder called it what it was.
 * The product already has a look - the Skills Passport (the design
 * reference handed over in July 2026), the Learner Games page and the
 * demo page - and this file is that look as shared pieces, so a new page
 * starts from it instead of from a blank card:
 *
 *   - a navy hero with the bird mark behind it and one word in mango
 *   - tinted tiles with big figures (the passport's stat cards)
 *   - hexagon medals, with ribbons when they are earned
 *   - warm gradient bars and the gold, silver and bronze place markers
 *   - off-white rounded rows, the learner's own row ringed in mango
 *   - section labels led by the bird mark, and the slogan band to close
 *
 * Colours are the brand's and the passport's own tints of them. Nothing
 * here introduces a hue.
 */

import { BIRD_MARK } from "./brand";

/** The learner's avatar tile: the same warm gradient the Skills Passport
 * draws their initials on, so they look the same everywhere. */
export const AVATAR_GRADIENT = "linear-gradient(135deg,#A66633,#B93A22)";

export const KIT_CSS = `
@keyframes fk-pop{from{opacity:0;transform:scale(.82) translateY(12px)}to{opacity:1;transform:none}}
@keyframes fk-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes fk-drop{0%{opacity:0;transform:translateY(-14px) rotate(0deg)}10%{opacity:1}
  100%{opacity:0;transform:translateY(420px) rotate(560deg)}}
@keyframes fk-tw{0%,100%{transform:scale(.65);opacity:.35}50%{transform:scale(1.15);opacity:1}}
@keyframes fk-shine{0%{transform:translateX(-140%) rotate(22deg)}60%,100%{transform:translateX(240%) rotate(22deg)}}
@keyframes fk-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fk{max-width:1020px;}
/* ---- hero: navy, the bird behind it, one word in mango ---- */
.fk-hero{position:relative;overflow:hidden;border-radius:26px;color:#fff;padding:34px 36px 36px;margin-bottom:18px;
  background:linear-gradient(150deg,#05253C 0%,#0A3452 58%,#13507F 135%);
  box-shadow:0 26px 60px -32px rgba(5,37,60,.6);}
.fk-hero::before{content:'';position:absolute;left:0;right:0;top:0;height:4px;
  background:linear-gradient(90deg,#D9452B,#ED9249 55%,#D9452B);}
.fk-bird{position:absolute;right:-28px;top:-46px;height:165%;opacity:.08;pointer-events:none;}
.fk-bird svg{height:100%;width:auto;display:block;}
.fk-hero-b{position:relative;max-width:36em;}
.fk-kicker{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#ED9249;
  border:1px solid rgba(237,146,73,.5);background:rgba(237,146,73,.14);border-radius:999px;padding:6px 14px;}
.fk-h{font-size:36px;line-height:1.12;font-weight:800;letter-spacing:-.01em;margin:16px 0 0;color:#fff;text-wrap:balance;}
.fk-h em{font-style:normal;color:#ED9249;}
.fk-hero p{color:#B9CFE0;font-size:15.5px;line-height:1.6;margin-top:10px;}
.fk-hero p b{color:#fff;font-weight:600;}
.fk-hero-cta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:20px;}
.fk-hero .btn{box-shadow:0 10px 22px -10px rgba(217,69,43,.9);}
.fk-ghost{font-family:inherit;font-size:14.5px;font-weight:600;color:#fff;background:rgba(255,255,255,.1);cursor:pointer;
  border:1.5px solid rgba(255,255,255,.35);border-radius:12px;padding:12px 20px;min-height:46px;text-decoration:none;
  display:inline-flex;align-items:center;transition:background .15s ease;}
.fk-ghost:hover{background:rgba(255,255,255,.2);}
.fk-ghost:focus-visible,.fk-hero .btn:focus-visible{outline:3px solid #ED9249;outline-offset:2px;}
.fk-quiet{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#9FB8CC;margin-top:16px;}
.fk-quiet svg{width:15px;height:15px;flex:none;}
/* ---- panels: the white shell the passport sits in ---- */
.fk-panel{background:#fff;border-radius:24px;padding:28px 30px;margin-bottom:18px;border:1px solid rgba(5,37,60,.07);
  box-shadow:0 22px 50px -34px rgba(5,37,60,.45);}
.fk-sect{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.fk-sect h3{font-size:21px;font-weight:700;color:#05253C;margin:0;}
.fk-sect .fk-note{color:#B93A22;font-size:13.5px;font-weight:600;}
.fk-lead{font-size:14px;line-height:1.6;color:#4E5B66;margin:-8px 0 16px;max-width:46em;}
/* a section label: the bird, the words, a rule running out to the edge */
.fk-label{display:flex;align-items:center;gap:10px;margin:26px 2px 12px;font-size:11.5px;font-weight:800;
  letter-spacing:.16em;text-transform:uppercase;color:#05253C;}
.fk-label svg{height:17px;width:auto;flex:none;}
.fk-label::after{content:'';flex:1;height:1px;background:rgba(5,37,60,.14);}
/* ---- tinted tiles with big figures ---- */
.fk-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;}
.fk-tile{border-radius:20px;padding:20px;background:#ECE7E6;min-width:0;animation:fk-rise .5s both;}
.fk-tile .th{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#13507F;}
.fk-tile .th svg{width:17px;height:17px;flex:none;}
.fk-tile .tv{font-size:34px;font-weight:700;line-height:1.1;margin-top:10px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;}
.fk-tile .tv small{font-size:15px;color:#6B7883;font-weight:600;}
.fk-tile .tv.words{font-size:20px;line-height:1.25;}
.fk-tile .ts{color:#5C6A76;font-size:13px;margin-top:4px;line-height:1.45;}
.fk-tile.t1{background:#E8F1F8;}.fk-tile.t1 .tv{color:#13507F;}
.fk-tile.t2{background:#FCEBE4;}.fk-tile.t2 .tv,.fk-tile.t2 .th{color:#B93A22;}
.fk-tile.t3{background:#FBF0E2;}.fk-tile.t3 .tv,.fk-tile.t3 .th{color:#9A5812;}
.fk-tile.t4{background:#E6EBEF;}.fk-tile.t4 .tv{color:#05253C;}
.fk-tile:nth-child(2){animation-delay:.06s}.fk-tile:nth-child(3){animation-delay:.12s}.fk-tile:nth-child(4){animation-delay:.18s}
/* ---- bars ---- */
.fk-track{display:block;height:11px;border-radius:999px;background:#ECE7E6;overflow:hidden;}
.fk-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ED9249,#D9452B);
  transform-origin:left;animation:fk-fill 1s cubic-bezier(.2,.7,.3,1) both;}
/* ---- hexagon medals ---- */
.fk-medwrap{position:relative;display:inline-block;flex:none;line-height:0;}
.fk-medwrap.earned{padding-bottom:calc(var(--m,72px) * .17);}
.fk-medwrap.earned::before,.fk-medwrap.earned::after{content:'';position:absolute;bottom:0;
  width:calc(var(--m,72px) * .21);height:calc(var(--m,72px) * .42);
  clip-path:polygon(0 0,100% 0,100% 100%,50% 72%,0 100%);}
.fk-medwrap.earned::before{left:calc(50% - var(--m,72px) * .27);background:#13507F;transform:rotate(-10deg);}
.fk-medwrap.earned::after{right:calc(50% - var(--m,72px) * .27);background:#D9452B;transform:rotate(10deg);}
.fk-med{width:var(--m,72px);height:calc(var(--m,72px) * 1.083);display:flex;align-items:center;justify-content:center;
  position:relative;z-index:1;overflow:hidden;color:#fff;
  clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);}
.fk-med svg{width:42%;height:auto;position:relative;z-index:2;}
.fk-med .sh{position:absolute;top:0;left:0;width:40%;height:100%;z-index:3;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:fk-shine 3.6s ease-in-out infinite;}
/* ---- rows: off-white, rounded; the learner's own ringed in mango ---- */
.fk-rows{display:flex;flex-direction:column;gap:10px;}
.fk-row{display:flex;align-items:center;gap:14px;background:#ECE7E6;border-radius:16px;padding:14px 18px;min-width:0;
  animation:fk-rise .45s both;}
.fk-row.me{background:linear-gradient(180deg,#fff,#FFF7EE);box-shadow:inset 0 0 0 2px #ED9249;}
.fk-pos{width:36px;height:36px;border-radius:50%;background:#05253C;color:#fff;display:flex;align-items:center;
  justify-content:center;font-weight:700;font-size:14px;flex:none;font-variant-numeric:tabular-nums;}
.fk-pos.p1{background:radial-gradient(circle at 35% 28%,#FFE3AE,#ED9249 55%,#D9452B);color:#4A1D08;}
.fk-pos.p2{background:radial-gradient(circle at 35% 28%,#F4F8FB,#C3CDD8 55%,#97A6B5);color:#05253C;}
.fk-pos.p3{background:radial-gradient(circle at 35% 28%,#F0CBA3,#C77B44 55%,#9A5A2C);color:#fff;}
.fk-row .rn{flex:1;min-width:0;font-weight:600;font-size:15.5px;color:#05253C;overflow-wrap:anywhere;}
.fk-row .rd{flex:none;color:#13507F;font-size:13.5px;font-weight:600;white-space:nowrap;}
.fk-tag{display:inline-block;font-style:normal;font-size:11px;font-weight:800;letter-spacing:.03em;color:#8C2B18;background:#FBE1D6;
  border-radius:999px;padding:3px 10px;margin-left:8px;white-space:nowrap;vertical-align:2px;}
/* ---- the learner's avatar tile ---- */
.fk-av{width:40px;height:40px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;
  background:${AVATAR_GRADIENT};color:#fff;font-weight:700;font-size:14.5px;letter-spacing:.02em;}
/* ---- a call to act: the passport's "career journey" row - white, an
 * orange edge, an orange button. (Not another navy band: the page
 * closes on the slogan, and two navy bands in a row read as one.) ---- */
.fk-cta{display:flex;align-items:center;gap:20px;border-radius:18px;padding:20px 24px;margin-bottom:18px;color:#05253C;
  background:#fff;border:1.5px solid #E3DDDA;border-left:5px solid #D9452B;
  box-shadow:0 18px 40px -32px rgba(5,37,60,.5);}
.fk-cta-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
.fk-cta-k{font-size:11px;font-weight:800;letter-spacing:.16em;color:#B93A22;}
.fk-cta b{font-size:18.5px;font-weight:700;line-height:1.3;overflow-wrap:anywhere;}
.fk-cta-b span:last-child{font-size:14px;color:#4E5B66;line-height:1.5;}
.fk-cta .btn{flex:none;text-decoration:none;display:inline-flex;align-items:center;}
/* ---- empty and waiting ---- */
.fk-empty{display:flex;align-items:center;gap:18px;border-radius:18px;padding:22px 24px;background:#F6F2F0;
  border:1.5px dashed rgba(5,37,60,.2);}
.fk-empty .eb{width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none;
  box-shadow:0 6px 14px -8px rgba(5,37,60,.4);}
.fk-empty .eb svg{height:26px;width:auto;}
.fk-empty b{display:block;font-size:16.5px;font-weight:700;color:#05253C;}
.fk-empty p{font-size:14px;line-height:1.55;color:#4E5B66;margin-top:3px;max-width:44em;}
.fk-empty .btn{flex:none;text-decoration:none;display:inline-flex;align-items:center;}
.fk-wait{color:#5C6A76;font-size:14.5px;padding:8px 2px;}
/* ---- the close: the slogan, as the passport ends ---- */
.fk-slogan{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;color:#fff;
  background:linear-gradient(120deg,#05253C,#13507F);border-radius:20px;padding:20px 26px;margin:6px 0 16px;}
.fk-slogan .s1{font-size:18.5px;font-weight:700;}
.fk-slogan .s1 em{font-style:normal;color:#ED9249;}
.fk-slogan .s2{font-size:13px;color:#CFE0EE;font-weight:500;}
/* ---- confetti, for a result worth a moment ---- */
.fk-confetti{position:absolute;top:0;left:0;right:0;height:0;pointer-events:none;z-index:4;}
.fk-confetti i{position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;opacity:0;animation:fk-drop 3.2s ease-in both;}
.fk-small{font-size:12.5px;line-height:1.6;color:#5C6A76;max-width:60em;}
@media(max-width:900px){.fk-tiles{grid-template-columns:repeat(2,1fr);}}
@media(max-width:640px){
  .fk-hero{padding:26px 22px 28px;border-radius:22px;}.fk-h{font-size:28px;}.fk-hero p{font-size:14.5px;}
  .fk-panel{padding:20px 18px;border-radius:20px;}.fk-sect h3{font-size:19px;}
  .fk-cta{flex-direction:column;align-items:stretch;padding:22px;}.fk-cta .btn{justify-content:center;}
  .fk-empty{flex-direction:column;align-items:flex-start;}
  .fk-row{padding:12px 14px;gap:11px;}
}
@media(max-width:420px){.fk-tiles{gap:10px;}.fk-tile{padding:14px;}.fk-tile .tv{font-size:26px;}.fk-tile .tv.words{font-size:17px;}
  .fk-tile .tv small{font-size:13px;}}
@media print{.fk-hero,.fk-cta,.fk-slogan{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .fk-confetti{display:none;}}
`;

/** The bird mark, behind a hero. */
export function heroBird(): string {
  return `<span class='fk-bird' aria-hidden='true'>${BIRD_MARK}</span>`;
}

/** A section label: the bird, the words, a rule to the edge. */
export function sectionLabel(text: string): string {
  return `<div class='fk-label'>${BIRD_MARK}<span>${text}</span></div>`;
}

/** The slogan band every Fledglings page of this kind closes on. The
 * wording is the brand's and is never changed. */
export function sloganBand(right: string): string {
  return (
    "<div class='fk-slogan'><div class='s1'>Where Growth Takes <em>Flight</em></div>" +
    `<div class='s2'>${right}</div></div>`
  );
}

const CONFETTI_COLOURS = ["#D9452B", "#ED9249", "#13507F", "#05253C", "#F3B36B"];

/** A scatter of paper for a result worth a moment. Placed, timed and
 * tilted by arithmetic, so it is the same every time and needs no
 * randomness on the server. */
export function confetti(pieces = 18): string {
  return (
    "<div class='fk-confetti' aria-hidden='true'>" +
    Array.from({ length: pieces }, (_, i) => {
      const left = (i * 53 + 7) % 100;
      const delay = ((i * 37) % 22) / 10;
      const colour = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
      const tilt = ((i * 47) % 70) - 35;
      return `<i style='left:${left}%;background:${colour};animation-delay:${delay.toFixed(1)}s;transform:rotate(${tilt}deg)'></i>`;
    }).join("") +
    "</div>"
  );
}
