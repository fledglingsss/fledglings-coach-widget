/* Skills Passport page — faithful implementation of the Credential
 * Dashboard design reference (Skills Passport 1c, 2026-07-19 handoff).
 * Server-rendered from real data; tabs/animations client-side. */

import { esc } from "./pages";
import { formatMinutes, type SkillsPassportModel } from "./lib/skills-passport";

/* Fledglings wordmark (from brand assets) — inline, scaled by height. */
const WORDMARK =
  '<svg viewBox="0 0 2000 519" fill="none" xmlns="http://www.w3.org/2000/svg" style="height:28px;width:auto" role="img" aria-label="Fledglings">' +
  '<path d="M175.148 228.581C172.771 227.321 169.852 227.715 167.916 229.58C158.683 238.067 105.63 278.895 86.6966 291.454C108.212 261.462 123.533 228.425 132.249 193.153C152.659 110.576 130.163 39.4427 114.891 4.32939L114.875 4.20407C113.697 0.934598 110.141 -0.797967 106.869 0.359271C106.037 0.671355 105.425 1.04181 104.852 1.55594C101.632 4.38079 25.6316 72.2792 4.55426 217.7C3.12095 226.2 -8.86688 303.588 13.0568 404.074C13.4228 405.704 14.3952 407.091 15.7977 408.003C17.0363 408.786 18.4727 409.1 19.8303 408.936C20.0182 408.913 20.2062 408.891 20.4125 408.845L20.9974 408.774C40.2212 402.664 58.7838 394.409 76.1232 384.266C84.3769 379.436 103.736 368.118 123.887 348.78C182.494 292.514 178.557 235.417 178.489 234.853C178.109 231.699 176.988 229.609 175.132 228.625L175.148 228.581Z" fill="#D9452B"/>' +
  '<path d="M74.3134 414.425C45.5535 417.892 25.0521 443.99 28.5139 472.708C31.9757 501.426 58.0916 521.904 86.8514 518.437C115.611 514.97 136.113 488.873 132.651 460.155C129.189 431.436 103.073 410.958 74.3134 414.425Z" fill="#D9452B"/>' +
  '<path d="M307.266 405.997V144.198H479.872V190.901H361.671V247.372H455.93V294.464H361.671V405.997H307.266Z" fill="#05253C"/>' +
  '<path d="M513.547 405.997V144.198H563.961V405.997H513.547Z" fill="#05253C"/>' +
  '<path d="M726.008 344.083H775.304C771.654 363.619 761.873 379.317 745.912 391.175C729.95 402.984 710.728 408.913 688.246 408.913C659 408.913 636.031 399.436 619.34 380.483C602.648 361.53 594.327 339.515 594.327 314.389C594.327 289.264 602.113 267.103 617.734 248.49C633.306 229.926 655.642 220.595 684.645 220.595C713.648 220.595 736.86 229.537 752.092 247.372C767.323 265.257 774.915 286.008 774.915 309.675C774.915 315.216 774.671 320.659 774.185 325.956H642.941C644.888 338.98 649.754 349.186 657.637 356.573C665.472 363.96 675.691 367.604 688.295 367.604C709.317 367.604 721.872 359.78 726.008 344.083ZM684.694 257.578C661.482 257.578 647.807 269.776 643.72 294.173H724.597C723.867 283.53 720.023 274.782 713.016 267.929C706.008 261.029 696.568 257.627 684.742 257.627L684.694 257.578Z" fill="#05253C"/>' +
  '<path d="M889.467 408.913C862.897 408.913 841.826 400.408 826.4 383.399C810.974 366.39 803.188 343.5 803.188 314.778C803.188 286.057 810.876 263.507 826.205 246.352C841.534 229.197 862.41 220.644 888.737 220.644C911.462 220.644 928.397 228.031 939.492 242.756V144.247H989.907V406.046H939.492V386.121C928.591 401.332 911.949 408.913 889.467 408.913ZM865.573 351.519C873.797 360.801 884.552 365.466 897.837 365.466C911.122 365.466 921.876 360.801 930.1 351.519C938.324 342.236 942.412 329.99 942.412 314.778C942.412 299.567 938.373 286.98 930.246 277.649C922.119 268.367 911.316 263.702 897.788 263.702C884.26 263.702 873.457 268.367 865.33 277.649C857.252 286.932 853.164 299.324 853.164 314.778C853.164 330.233 857.252 342.236 865.476 351.519H865.573Z" fill="#05253C"/>' +
  '<path d="M1159.25 223.51H1210.01V416.882C1210.01 435.933 1203.73 451.241 1191.18 462.711C1178.62 474.18 1161.93 479.914 1141.15 479.914H1049.03V440.453H1133.17C1140.91 440.453 1147.23 437.731 1152.2 432.288C1157.16 426.845 1159.64 419.896 1159.64 411.488V387.578C1155.07 394.333 1148.25 399.582 1139.35 403.324C1130.4 407.066 1120.52 408.912 1109.62 408.912C1082.8 408.912 1061.68 400.408 1046.35 383.398C1030.98 366.389 1023.34 343.499 1023.34 314.778C1023.34 286.056 1031.03 263.166 1046.35 246.157C1061.68 229.148 1082.56 220.643 1108.89 220.643C1131.37 220.643 1148.16 227.641 1159.3 241.637V223.51H1159.25ZM1085.09 351.712C1093.17 360.897 1104.02 365.466 1117.55 365.466C1131.08 365.466 1141.98 360.897 1150.2 351.712C1158.42 342.527 1162.51 330.232 1162.51 314.778C1162.51 299.323 1158.42 286.979 1150.2 277.649C1141.98 268.366 1131.13 263.701 1117.55 263.701C1103.97 263.701 1093.22 268.366 1085.09 277.649C1076.96 286.931 1072.92 299.323 1072.92 314.778C1072.92 330.232 1076.96 342.527 1085.09 351.712Z" fill="#05253C"/>' +
  '<path d="M1252.78 405.997V144.198H1303.2V405.997H1252.78Z" fill="#05253C"/>' +
  '<path d="M1368.26 144.198H1368.6C1383.3 144.198 1395.27 156.105 1395.27 170.83C1395.27 185.507 1383.35 197.462 1368.6 197.462H1368.26C1353.56 197.462 1341.59 185.555 1341.59 170.83C1341.59 156.154 1353.52 144.198 1368.26 144.198ZM1343.05 405.997V223.511H1393.81V405.997H1343.05Z" fill="#05253C"/>' +
  '<path d="M1430.79 405.997V223.51H1481.55V248.878C1492.45 230.071 1510.94 220.643 1537.02 220.643C1557.56 220.643 1574.05 227.301 1586.51 240.568C1598.97 253.835 1605.2 271.088 1605.2 292.325V406.045H1554.44V303.551C1554.44 292.471 1551.18 283.335 1544.66 276.191C1538.14 269.095 1529.67 265.499 1519.26 265.499C1508.12 265.499 1499.07 269.29 1492.06 276.92C1485.05 284.501 1481.55 294.221 1481.55 306.079V405.997H1430.79Z" fill="#05253C"/>' +
  '<path d="M1771.63 223.51H1822.38V416.882C1822.38 435.933 1816.1 451.241 1803.55 462.711C1790.99 474.18 1774.3 479.914 1753.52 479.914H1661.4V440.453H1745.54C1753.28 440.453 1759.61 437.731 1764.57 432.288C1769.53 426.845 1772.01 419.896 1772.01 411.488V387.578C1767.44 394.333 1760.63 399.582 1751.72 403.324C1742.77 407.066 1732.89 408.912 1721.99 408.912C1695.18 408.912 1674.06 400.408 1658.73 383.398C1643.35 366.389 1635.71 343.499 1635.71 314.778C1635.71 286.056 1643.4 263.166 1658.73 246.157C1674.06 229.148 1694.93 220.643 1721.26 220.643C1743.74 220.643 1760.53 227.641 1771.67 241.637V223.51H1771.63ZM1697.51 351.712C1705.59 360.897 1716.44 365.466 1729.97 365.466C1743.5 365.466 1754.4 360.897 1762.62 351.712C1770.85 342.527 1774.93 330.232 1774.93 314.778C1774.93 299.323 1770.85 286.979 1762.62 277.649C1754.4 268.366 1743.55 263.701 1729.97 263.701C1716.39 263.701 1705.64 268.366 1697.51 277.649C1689.39 286.931 1685.35 299.323 1685.35 314.778C1685.35 330.232 1689.39 342.527 1697.51 351.712Z" fill="#05253C"/>' +
  '<path d="M1929 408.913C1906.52 408.913 1888.32 403.081 1874.45 391.369C1860.53 379.657 1853.14 364.008 1852.16 344.472H1895.67C1896.64 352.685 1900.1 359.149 1905.98 363.863C1911.92 368.577 1919.56 370.909 1929 370.909C1936.74 370.909 1943.06 369.208 1948.03 365.855C1952.99 362.502 1955.47 358.274 1955.47 353.171C1955.47 346.416 1952.07 341.459 1945.3 338.349C1938.54 335.19 1930.31 333.003 1920.63 331.642C1910.95 330.33 1901.36 328.337 1891.82 325.664C1882.28 322.991 1874.11 317.597 1867.35 309.384C1860.58 301.171 1857.17 289.945 1857.17 275.705C1857.17 259.765 1863.35 246.595 1875.67 236.244C1887.98 225.844 1903.6 220.692 1922.43 220.692C1944.43 220.692 1962.24 226.135 1975.91 236.973C1989.59 247.81 1996.89 262.195 1997.86 280.079H1953.96C1952.99 272.595 1949.54 266.763 1943.65 262.535C1937.71 258.307 1931.14 256.218 1923.89 256.218C1916.64 256.218 1910.85 257.773 1906.47 260.932C1902.14 264.09 1899.95 268.416 1899.95 273.956C1899.95 280.711 1903.4 285.474 1910.27 288.244C1917.18 291.014 1925.5 292.909 1935.28 293.881C1945.06 294.853 1954.84 296.554 1964.67 298.935C1974.45 301.365 1982.82 306.905 1989.68 315.605C1996.59 324.304 2000 336.259 2000 351.47C2000 368.868 1993.53 382.816 1980.58 393.313C1967.64 403.81 1950.41 409.059 1928.9 409.059L1929 408.913Z" fill="#05253C"/></svg>';

const ICONS = {
  clock:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13507F" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  flame:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#D9452B" class="flame" aria-hidden="true"><path d="M12 2c1 3-2 4-2 7 0 2 1 3 2 3s2-1 2-3c2 2 3 4 3 6a5 5 0 1 1-10 0c0-4 3-6 5-13z"/></svg>',
  trophy:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13507F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M9 15h6M8 20h8M12 15v5"/></svg>',
  book:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13507F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v13H4z"/><path d="M4 9h16M9 5v13"/></svg>',
  lock:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa7b4" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};

/* One hand-drawn icon per badge — white strokes so they sit on the
 * tier-gradient medal. Keyed by badge code. */
const BADGE_ICONS: Record<string, string> = {
  /* Money Master — pound coin */
  MM: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 8.6a2.6 2.6 0 0 0-4.4 1.9c0 1.2.4 2 .4 3.2 0 1-.4 1.7-1.2 2.3h6"/><path d="M9 12.5h4"/></svg>',
  /* Job Ready — briefcase with clasp */
  JR: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="8" width="17" height="11" rx="2.5"/><path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8"/><path d="M3.5 12.5h17M12 11.5v2.5"/></svg>',
  /* True Grit — mountain peaks with flag */
  TG: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19l6-10 3.5 5.5L15 11l6 8z"/><path d="M15 11V5.5l3.5 1.5L15 8.5"/></svg>',
  /* Cyber Smart — shield with tick */
  CS: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 2.8v5.4c0 4.4-3 7.6-7 9.8-4-2.2-7-5.4-7-9.8V5.8z"/><path d="M9 12l2.2 2.2L15.5 9.7"/></svg>',
  /* Deep Diver — magnifying glass with depth lines */
  DD: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="M14.8 14.8L20 20"/><path d="M8 9.5c.7-1 1.6-1.5 2.5-1.5"/></svg>',
  /* On Fire — flame */
  OF: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.8 2.8-1.8 4-1.8 6.6 0 1.8.9 2.8 1.8 2.8s1.8-1 1.8-2.8c1.8 1.9 2.7 3.7 2.7 5.5a4.5 4.5 0 1 1-9 0c0-3.7 2.7-5.5 4.5-12.1z"/></svg>',
  /* All Rounder — star */
  AR: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/></svg>',
};

const MEDAL = {
  gold: {
    bg: "radial-gradient(circle at 35% 28%,#FFE3AE,#ED9249 55%,#D9452B)",
    ring: "#b5641f",
    text: "#fff",
    label: "#D9452B",
    card: "linear-gradient(180deg,#fff,#FFF7EE)",
  },
  silver: {
    bg: "radial-gradient(circle at 35% 28%,#F4F8FB,#C3CDD8 55%,#97A6B5)",
    ring: "#7a8798",
    text: "#05253C",
    label: "#7a8798",
    card: "linear-gradient(180deg,#fff,#F5F8FB)",
  },
  bronze: {
    bg: "radial-gradient(circle at 35% 28%,#F0CBA3,#C77B44 55%,#9A5A2C)",
    ring: "#7d4620",
    text: "#fff",
    label: "#9A5A2C",
    card: "linear-gradient(180deg,#fff,#FBF3EC)",
  },
} as const;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit',sans-serif;background:#ECE7E6;color:#05253C;-webkit-font-smoothing:antialiased}
@keyframes fl-shine{0%{transform:translateX(-140%) rotate(22deg)}60%,100%{transform:translateX(240%) rotate(22deg)}}
@keyframes fl-flame{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.14) rotate(3deg)}}
@keyframes fl-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes fl-pop{from{opacity:0;transform:scale(.82) translateY(12px)}to{opacity:1;transform:none}}
.page{padding:40px 20px;display:flex;justify-content:center}
.shell{width:100%;max-width:1160px;border-radius:28px;overflow:hidden;background:#fff;
  box-shadow:0 30px 70px -30px rgba(5,37,60,.45);border:1px solid rgba(5,37,60,.07)}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 30px;
  border-bottom:1px solid rgba(5,37,60,.08);gap:16px;flex-wrap:wrap}
.nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tabbar{display:flex;gap:4px;background:#ECE7E6;padding:4px;border-radius:999px}
.tabbar button{border:none;background:transparent;color:#13507F;font-family:inherit;font-size:13px;
  font-weight:600;padding:8px 14px;border-radius:999px;cursor:pointer;min-height:34px}
.tabbar button:hover{background:rgba(19,80,127,.1)}
.tabbar button.on{background:#05253C;color:#fff}
.tabbar button:focus-visible{outline:2px solid #05253C;outline-offset:2px}
.share{border:none;font-family:inherit;background:#D9452B;color:#fff;font-size:13px;font-weight:600;
  padding:10px 16px;border-radius:999px;cursor:pointer;transition:background .15s;min-height:38px}
.share:hover{background:#c23a22}
.inner{padding:40px 44px}
.hero{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin-bottom:32px}
.who{display:flex;align-items:center;gap:18px}
.avatar{width:84px;height:84px;border-radius:24px;background:linear-gradient(135deg,#ED9249,#D9452B);
  display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:30px;flex:none}
.who .nm{font-size:32px;font-weight:700}
.who .ch{color:#13507F;font-size:15.5px;font-weight:500}
.scorewrap{justify-self:end;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.ring{width:132px;height:132px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}
.ring .in{width:102px;height:102px;border-radius:50%;background:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center}
.ring .pc{font-size:32px;font-weight:800}
.ring .lb{font-size:11px;color:#13507F;font-weight:600}
.grade{background:linear-gradient(135deg,#ED9249,#D9452B);color:#fff;padding:18px 28px;border-radius:18px;text-align:center}
.grade .t{font-size:12px;font-weight:500;opacity:.9}
.grade .g{font-size:28px;font-weight:700}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:34px}
.stat{background:#ECE7E6;border-radius:20px;padding:24px}
.stat .h{display:flex;align-items:center;gap:8px;color:#13507F;font-size:12.5px;font-weight:600}
.stat .v{font-size:36px;font-weight:700;margin-top:10px}
.stat .v small{font-size:15px;color:#7d8a93;font-weight:600}
.stat .s{color:#7d8a93;font-size:13px;margin-top:2px}
.track{height:6px;border-radius:999px;background:#d4ccca;overflow:hidden;margin-top:8px}
.track i{display:block;height:100%;background:linear-gradient(90deg,#ED9249,#D9452B);transform-origin:left;animation:fl-fill 1s both}
.cols{display:grid;grid-template-columns:1.5fr 1fr;gap:26px;margin-bottom:34px}
.cols.even{grid-template-columns:1fr 1fr}
.sect-h{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}
.sect-h .t{font-size:21px;font-weight:700}
.sect-h .c{color:#D9452B;font-size:13.5px;font-weight:600}
.badges{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.chip{border:1px solid rgba(5,37,60,.09);border-radius:18px;padding:16px;display:flex;flex-direction:column;
  align-items:center;gap:10px;cursor:default;transition:transform .15s,box-shadow .15s;animation:fl-pop .5s both}
.chip:hover{transform:translateY(-4px);box-shadow:0 12px 24px -12px rgba(5,37,60,.4)}
.chip.locked{border-style:dashed;border-color:rgba(5,37,60,.2);opacity:.7;background:#fff}
.medwrap{position:relative;padding-bottom:12px;flex:none}
.medwrap.earned::before,.medwrap.earned::after{content:'';position:absolute;bottom:0;width:15px;height:30px;
  clip-path:polygon(0 0,100% 0,100% 100%,50% 72%,0 100%)}
.medwrap.earned::before{left:calc(50% - 19px);background:#13507F;transform:rotate(-10deg)}
.medwrap.earned::after{right:calc(50% - 19px);background:#D9452B;transform:rotate(10deg)}
.med{width:72px;height:78px;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;
  clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);overflow:hidden;flex:none}
.med .ic{position:relative;z-index:2;display:flex}
.med .rim{position:absolute;inset:5px;clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);
  background:transparent;border:0;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
.med .sh{position:absolute;top:0;left:0;width:40%;height:100%;z-index:3;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);animation:fl-shine 3.4s ease-in-out infinite}
.chip .bn{font-size:13.5px;font-weight:600;line-height:1.1;text-align:center}
.chip .bt{font-size:10.5px;font-weight:700;text-align:center}
.skills{display:flex;flex-direction:column;gap:15px}
.skill .r{display:flex;justify-content:space-between;font-size:15px;margin-bottom:6px}
.skill .r b{color:#D9452B;font-weight:700}
.skill .tk{height:11px;border-radius:999px;background:#ECE7E6;overflow:hidden}
.skill .tk i{display:block;height:100%;background:linear-gradient(90deg,#ED9249,#D9452B);transform-origin:left;animation:fl-fill 1s both}
.mods{display:flex;flex-direction:column;gap:12px}
.mod{display:grid;grid-template-columns:1fr auto;gap:6px 14px;background:#ECE7E6;border-radius:14px;padding:14px 16px}
.mod .t{font-weight:600;font-size:14px}
.mod .l{color:#13507F;font-size:11.5px;font-weight:600}
.mod .p{color:#D9452B;font-weight:700;font-size:14px;justify-self:end}
.mod .m{color:#7d8a93;font-size:11.5px;justify-self:end}
.mod .tk{grid-column:1/-1;height:7px;border-radius:999px;background:#d4ccca;overflow:hidden}
.mod .tk i{display:block;height:100%;background:linear-gradient(90deg,#ED9249,#D9452B);transform-origin:left;animation:fl-fill 1s both}
.flame{animation:fl-flame 1.8s ease-in-out infinite;transform-origin:bottom center}
.lb{display:flex;flex-direction:column;gap:10px}.lbrow{display:flex;align-items:center;gap:14px;background:#ECE7E6;border-radius:16px;padding:14px 18px}.lbrow.me{background:linear-gradient(180deg,#fff,#FFF7EE);border:2px solid #ED9249}.lbrow .pos{width:34px;height:34px;border-radius:50%;background:#05253C;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:none}.lbrow:nth-child(1) .pos{background:radial-gradient(circle at 35% 28%,#FFE3AE,#ED9249 55%,#D9452B)}.lbrow:nth-child(2) .pos{background:radial-gradient(circle at 35% 28%,#F4F8FB,#C3CDD8 55%,#97A6B5);color:#05253C}.lbrow:nth-child(3) .pos{background:radial-gradient(circle at 35% 28%,#F0CBA3,#C77B44 55%,#9A5A2C)}.lbrow .n{font-weight:600;font-size:15px;flex:1}.lbrow .d{color:#13507F;font-size:13px;font-weight:600}.next{display:flex;flex-direction:column;gap:12px}.nextrow{background:#ECE7E6;border-radius:16px;padding:16px 18px}.nextrow .t{font-weight:600;font-size:15px;margin-bottom:8px}.nextrow .tk{height:9px;border-radius:999px;background:#d4ccca;overflow:hidden}.nextrow .tk i{display:block;height:100%;background:linear-gradient(90deg,#ED9249,#D9452B);transform-origin:left;animation:fl-fill 1s both}.nextrow .p{color:#D9452B;font-weight:700;font-size:13.5px;margin-top:6px}.slogan{margin-top:34px;background:linear-gradient(120deg,#05253C,#13507F);color:#fff;border-radius:20px;padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.slogan .s1{font-size:19px;font-weight:700}.slogan .s2{font-size:13px;color:#CFE0EE;font-weight:500}.view{display:none}.view.on{display:block}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#05253C;color:#fff;
  padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;opacity:0;transition:opacity .25s;pointer-events:none}
.toast.on{opacity:1}
.demo-pill{background:#ECE7E6;color:#13507F;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700}
@media (max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}.cols{grid-template-columns:1fr}}
@media (max-width:640px){.hero{grid-template-columns:1fr}.scorewrap{justify-self:start}
  .badges{grid-template-columns:repeat(2,1fr)}.inner{padding:20px}.page{padding:16px 8px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

function badgeChip(b: {
  code: string;
  name: string;
  tier: "gold" | "silver" | "bronze";
  state: "earned" | "locked";
  toGo?: number;
}, index: number): string {
  const icon = BADGE_ICONS[b.code] ?? esc(b.code);
  if (b.state === "locked") {
    return (
      `<div class='chip locked' role='listitem' aria-label='${esc(b.name)}, locked, ${b.toGo ?? 1} to go'>` +
      `<div class='medwrap'><div class='med' style='background:#ECE7E6'><span class='ic'>${ICONS.lock}</span></div></div>` +
      `<div><div class='bn' style='color:#7d8a93'>${esc(b.name)}</div>` +
      `<div class='bt' style='color:#9aa7b4'>${b.toGo ?? 1} TO GO</div></div></div>`
    );
  }
  const m = MEDAL[b.tier];
  const shine = b.tier === "gold" ? `<div class='sh' style='animation-delay:${(index * 0.6).toFixed(1)}s'></div>` : "";
  return (
    `<div class='chip' style='background:${m.card};animation-delay:${(index * 0.06).toFixed(2)}s' role='listitem' ` +
    `aria-label='${esc(b.name)}, ${b.tier} badge, earned'>` +
    `<div class='medwrap earned'><div class='med' style='background:${m.bg};color:${m.text}'>` +
    `<span class='rim'></span><span class='ic'>${icon}</span>${shine}</div></div>` +
    `<div><div class='bn'>${esc(b.name)}</div><div class='bt' style='color:${m.label}'>${b.tier.toUpperCase()}</div></div></div>`
  );
}

export function renderSkillsPassport(
  model: SkillsPassportModel,
  opts: { demo: boolean; shareEmail: string | null },
): string {
  const s = model.stats;
  const deg = Math.round(model.score.percent * 3.6);
  const earned = model.badges.filter((b) => b.state === "earned");
  const rankMain =
    s.rank !== null && s.cohortSize !== null && s.cohortSize > 1
      ? `#${s.rank} <small>/ ${s.cohortSize}</small>`
      : "—";
  const rankSub =
    s.rank !== null && s.cohortSize !== null && s.cohortSize > 1
      ? `top ${Math.max(1, Math.round((s.rank / s.cohortSize) * 100))}% of ${esc(model.learner.cohort ?? "cohort")}`
      : "cohort rank appears as classmates join in";
  const modulesPct = s.modulesTotal > 0 ? Math.round((s.modulesDone / s.modulesTotal) * 100) : 0;

  const skillsHtml = model.skills
    .map(
      (sk, i) =>
        `<div class='skill'><div class='r'><span style='font-weight:500'>${esc(sk.name)}</span><b>${sk.percent}%</b></div>` +
        `<div class='tk' role='progressbar' aria-valuenow='${sk.percent}' aria-valuemin='0' aria-valuemax='100' aria-label='${esc(sk.name)}'>` +
        `<i style='width:${sk.percent}%;animation-delay:${(0.1 + i * 0.1).toFixed(1)}s'></i></div></div>`,
    )
    .join("");

  const boardHtml = model.board
    .map(
      (row) =>
        `<div class='lbrow${row.isMe ? " me" : ""}'>` +
        `<div class='pos'>${row.rank}</div>` +
        `<div class='n'>${esc(row.name)}${row.isMe ? " (you)" : ""}</div>` +
        `<div class='d'>${row.completed} module${row.completed === 1 ? "" : "s"}</div></div>`,
    )
    .join("");

  const nearlyHtml = model.nearlyThere
    .map(
      (m, i) =>
        `<div class='nextrow'><div class='t'>${esc(m.title)}</div>` +
        `<div class='tk' role='progressbar' aria-valuenow='${m.percent}' aria-valuemin='0' aria-valuemax='100' aria-label='${esc(m.title)}'>` +
        `<i style='width:${m.percent}%;animation-delay:${(0.15 + i * 0.1).toFixed(2)}s'></i></div>` +
        `<div class='p'>${m.percent}% — ${100 - m.percent}% to go</div></div>`,
    )
    .join("");

  const modulesHtml = model.modules
    .map(
      (m, i) =>
        `<div class='mod'><div><div class='t'>${esc(m.title)}</div><div class='l'>${esc(m.label)}${
          m.status === "completed" ? " · completed" : m.status === "not_started" ? " · not started" : ""
        }</div></div>` +
        `<div><div class='p'>${m.percent}%</div><div class='m'>${esc(formatMinutes(m.minutes))}</div></div>` +
        `<div class='tk' role='progressbar' aria-valuenow='${m.percent}' aria-valuemin='0' aria-valuemax='100' aria-label='${esc(m.title)}'>` +
        `<i style='width:${m.percent}%;animation-delay:${(i * 0.06).toFixed(2)}s'></i></div></div>`,
    )
    .join("");

  const body =
    "<div class='page'><div class='shell'>" +
    "<div class='topbar'>" +
    WORDMARK +
    "<div class='nav'>" +
    (opts.demo ? "<span class='demo-pill'>SAMPLE DATA</span>" : "") +
    "<div class='tabbar' role='tablist'>" +
    "<button class='on' data-v='overview' role='tab' aria-selected='true'>Overview</button>" +
    "<button data-v='badges' role='tab' aria-selected='false'>Badges</button>" +
    "<button data-v='modules' role='tab' aria-selected='false'>Modules</button></div>" +
    (opts.shareEmail ? "<button class='share' id='share'>Share ↗</button>" : "") +
    "</div></div>" +
    "<div class='inner'>" +
    /* hero */
    "<div class='hero'><div class='who'>" +
    `<div class='avatar' aria-hidden='true'>${esc(model.learner.initials)}</div>` +
    `<div><div class='nm'>${esc(model.learner.name)}</div>` +
    `<div class='ch'>${esc(model.learner.cohort ?? "Fledglings learner")} · Skills Passport ${esc(model.learner.year)}</div></div></div>` +
    "<div class='scorewrap'>" +
    `<div class='ring' style='background:conic-gradient(#D9452B 0deg ${deg}deg,#ECE7E6 ${deg}deg)' role='img' aria-label='Score ${model.score.percent} percent'>` +
    `<div class='in'><div class='pc'>${model.score.percent}%</div><div class='lb'>SCORE</div></div></div>` +
    `<div class='grade'><div class='t'>Overall grade</div><div class='g'>${esc(model.score.grade)}</div></div>` +
    "</div></div>" +
    /* stat cards */
    "<div class='cards'>" +
    `<div class='stat'><div class='h'>${ICONS.clock}<span>Time invested</span></div>` +
    `<div class='v'>${esc(formatMinutes(s.totalMinutes))}</div><div class='s'>avg ${esc(formatMinutes(s.avgMinutesPerModule))} / module</div></div>` +
    `<div class='stat'><div class='h'>${ICONS.flame}<span>Streak</span></div>` +
    `<div class='v'>${s.streakDays} day${s.streakDays === 1 ? "" : "s"}</div><div class='s'>personal best: ${s.streakBest}</div></div>` +
    `<div class='stat'><div class='h'>${ICONS.trophy}<span>Cohort rank</span></div>` +
    `<div class='v'>${rankMain}</div><div class='s'>${rankSub}</div></div>` +
    `<div class='stat'><div class='h'>${ICONS.book}<span>Modules</span></div>` +
    `<div class='v'>${s.modulesDone} <small>/ ${s.modulesTotal}</small></div>` +
    (s.stepsTotal > 0
      ? `<div class='s'>${s.stepsDone} of ${s.stepsTotal} learning steps done</div>`
      : "") +
    `<div class='track'><i style='width:${modulesPct}%'></i></div></div>` +
    "</div>" +
    /* overview view */
    "<div class='view on' id='v-overview'><div class='cols'>" +
    "<div><div class='sect-h'><div class='t'>Badge collection</div>" +
    `<div class='c'>${earned.length} earned</div></div>` +
    `<div class='badges' role='list'>${model.badges.slice(0, 6).map(badgeChip).join("")}</div></div>` +
    "<div><div class='sect-h'><div class='t'>Skill mastery</div></div>" +
    `<div class='skills'>${skillsHtml || "<div class='s' style='color:#7d8a93'>Start a module to grow your skills.</div>"}</div></div>` +
    "</div>" +
    /* leaderboard + nearly there */
    "<div class='cols even'>" +
    "<div><div class='sect-h'><div class='t'>Cohort leaderboard</div>" +
    `<div class='c'>${esc(model.learner.cohort ?? "your cohort")}</div></div>` +
    `<div class='lb'>${boardHtml || "<div class='s' style='color:#7d8a93'>The leaderboard fills up as your cohort visits their passports.</div>"}</div></div>` +
    "<div><div class='sect-h'><div class='t'>Nearly there</div>" +
    "<div class='c'>finish these next</div></div>" +
    `<div class='next'>${nearlyHtml || "<div class='s' style='color:#7d8a93'>Nothing in progress right now — pick a module and it will appear here.</div>"}</div></div>` +
    "</div></div>" +
    /* badges view */
    "<div class='view' id='v-badges'><div class='sect-h'><div class='t'>All badges</div>" +
    `<div class='c'>${earned.length} of ${model.badges.length} earned</div></div>` +
    `<div class='badges'>${model.badges.map(badgeChip).join("")}</div></div>` +
    /* modules view */
    "<div class='view' id='v-modules'><div class='sect-h'><div class='t'>Your modules</div>" +
    `<div class='c'>${s.modulesDone} completed</div></div>` +
    `<div class='mods'>${modulesHtml || "<div class='s' style='color:#7d8a93'>No modules yet — your pathway starts on the dashboard.</div>"}</div></div>` +
    /* slogan footer */
    "<div class='slogan'><div class='s1'>Where Growth Takes Flight</div>" +
    `<div class='s2'>Fledglings Skills Passport · ${esc(model.learner.year)}</div></div>` +
    "</div></div>" +
    "<div class='toast' id='toast'>Link copied — share away!</div>" +
    "<script>(function(){" +
    "var tabs=document.querySelectorAll('.tabbar button');" +
    "tabs.forEach(function(t){t.addEventListener('click',function(){" +
    "tabs.forEach(function(x){x.className='';x.setAttribute('aria-selected','false')});" +
    "t.className='on';t.setAttribute('aria-selected','true');" +
    "document.querySelectorAll('.view').forEach(function(v){v.className='view'});" +
    "document.getElementById('v-'+t.dataset.v).className='view on';});});" +
    (opts.shareEmail
      ? "var sh=document.getElementById('share');if(sh){sh.addEventListener('click',function(){" +
        "sh.disabled=true;" +
        "function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}" +
        "fetch('/api/passport',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
        `learner_id:stored(localStorage,'fl_coach_learner_v1'),session_id:stored(sessionStorage,'fl_coach_session_v1'),email:${JSON.stringify(opts.shareEmail)}})})` +
        ".then(function(r){return r.json()}).then(function(d){sh.disabled=false;" +
        "var say=function(msg){var t=document.getElementById('toast');t.textContent=msg;" +
        "t.className='toast on';setTimeout(function(){t.className='toast'},3200);};" +
        "if(d&&d.ok&&d.url){var u=location.origin+d.url;" +
        "var ok=function(){say('Link copied — share away!')};" +
        /* Clipboard API is blocked in iframes without an allow attribute —
         * fall back to execCommand, then to a prompt the learner can copy. */
        "var legacy=function(){var ta=document.createElement('textarea');ta.value=u;" +
        "ta.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(ta);ta.select();" +
        "var done=false;try{done=document.execCommand('copy')}catch(e){}document.body.removeChild(ta);" +
        "if(done){ok()}else{window.prompt('Copy your passport link:',u)}};" +
        "if(navigator.clipboard&&navigator.clipboard.writeText){" +
        "navigator.clipboard.writeText(u).then(ok,legacy)}else{legacy()}}" +
        "else{say(d&&d.reason==='daily_cap'?" +
        "'Share limit reached for today — try again tomorrow.':" +
        "'Could not create your share link — please try again.')}" +
        "}).catch(function(){sh.disabled=false;" +
        "var t=document.getElementById('toast');t.textContent='Could not create your share link — please try again.';" +
        "t.className='toast on';setTimeout(function(){t.className='toast'},3200);});});}"
      : "") +
    /* Tell the embedding page (LearnWorlds iframe) how tall we are so it
     * can size the frame without clipping or a scrollbar. */
    /* Measure .page, not scrollHeight — scrollHeight can never shrink
     * below the iframe viewport, which ratchets the frame ever taller. */
    "if(window.parent!==window){var ph=function(){var p=document.querySelector('.page');" +
    "if(p){try{parent.postMessage({flPassportHeight:Math.ceil(p.getBoundingClientRect().height)},'*')}catch(e){}}};" +
    "window.addEventListener('load',ph);window.addEventListener('resize',ph);setTimeout(ph,700);setTimeout(ph,1600);}" +
    "})();</script>";

  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'>" +
    `<title>Skills Passport — ${esc(model.learner.name)}</title>` +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${CSS}</style></head><body>` +
    body +
    "</body></html>"
  );
}
