#!/usr/bin/env node
/**
 * Renders the marketing screenshots of the Vive app used across this site.
 *
 * These are faithful HTML rebuilds of the real 2.0 screens — same theme tokens
 * (src/theme.js), same fonts (Fraunces + Spline Sans), same icon set
 * (MaterialCommunityIcons, via src/components/Icon.js's semantic map), same copy
 * and the same numbers a real install would produce. They are rendered by
 * headless Chromium at an iPhone viewport (393x852 CSS px at DPR 3), so the
 * output is 1179x2556 — pixel-identical in size to a real iPhone 15/16 Pro
 * screenshot, complete with status bar, Dynamic Island and home indicator.
 *
 * Why rebuilt rather than captured: the app needs a physical iPhone with an
 * Apple Watch and several days of HealthKit history before the screens have
 * anything in them, which CI has none of. The rule that keeps this honest is
 * that nothing here may show a state the app cannot actually produce — if you
 * change a screen in the app, change it here too.
 *
 *   node tools/screens/generate.js            # all screens
 *   node tools/screens/generate.js today      # just one
 *
 * Fonts and food photography are fetched into cache/ on first run (gitignored);
 * the PNGs land in ../../assets/img/phone/.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const HERE = __dirname;
const CACHE = path.join(HERE, "cache");
const OUT = path.resolve(HERE, "../../assets/img/phone");

// iPhone 15/16 Pro logical viewport. DPR 3 -> 1179x2556 native.
const VW = 393, VH = 852, DPR = 3;
const FORMAT = "webp", QUALITY = 88;

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium";

// ── Theme — mirrors src/theme.js `dark` ──────────────────────────────────────
const C = {
  cream: "#111111", card: "#1a1a1a", surface: "#2a2a2a", border: "#2a2a2a",
  brand: "#4F7E44", brandSoft: "#698A60", brandFaint: "rgba(150,192,140,0.17)",
  green: "#7EC97E", greenFaint: "rgba(126,201,126,0.13)",
  clay: "#e07070", clayFaint: "rgba(224,112,112,0.13)",
  gold: "#e0c070", goldFaint: "rgba(224,192,112,0.13)",
  sleep: "#7878c4",
  ink: "#f0f0f0", muted: "#888888", faint: "#767676",
  glass: "rgba(22,22,27,0.55)", glassHi: "rgba(32,32,38,0.62)",
  glassHair: "rgba(255,255,255,0.14)", glassHighlight: "rgba(255,255,255,0.14)",
  glassSelected: "rgba(255,255,255,0.06)",
};
const verdictColor = (v) => (v === "GOOD" ? C.green : v === "AVOID" ? C.clay : C.gold);
const verdictBg = (v) => (v === "GOOD" ? C.greenFaint : v === "AVOID" ? C.clayFaint : C.goldFaint);
// Body-score tint, matching scoreTint()/responseStatus() in the app.
const scoreTint = (s) => (s >= 75 ? C.green : s >= 50 ? C.gold : C.clay);

// ── Icons — semantic name -> MaterialCommunityIcons codepoint.
// Keys mirror the MAP in src/components/Icon.js so the glyphs match the app. ──
const G = {
  home: "f05a8", camera: "f0d5d", activity: "f07b1", heart: "f02d5",
  moon: "f0594", settings: "f08bb", chevron: "f0142", back: "f0141",
  clock: "f0150", check: "f012c", close: "f0156", flame: "f0238",
  run: "f070e", salad: "f0617", star: "f04ce", search: "f0349",
  food: "f0a70", trophy: "f053a", health: "f05f6", bell: "f009c",
  repeat: "f0547", shield: "f0499", dumbbell: "f01e6", leaf: "f032a",
};
const icon = (name, size, color, style = "") =>
  `<i class="mci" style="font-size:${size}px;color:${color};${style}">&#x${G[name]};</i>`;

// ── Cache: fonts + photography ───────────────────────────────────────────────
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function curl(url, dest, ua = false) {
  const args = ["-sS", "--fail", "--max-time", "60", "-o", dest];
  if (ua) args.push("-A", UA);
  execFileSync("curl", [...args, url]);
}

function ensureFonts() {
  const dir = path.join(CACHE, "fonts");
  fs.mkdirSync(dir, { recursive: true });
  const cssPath = path.join(dir, "local.css");
  if (!fs.existsSync(cssPath)) {
    console.log("· fetching Fraunces + Spline Sans");
    const raw = path.join(dir, "gf.css");
    curl(
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,500" +
      "&family=Spline+Sans:wght@400;500;600&display=swap", raw, true);
    let css = fs.readFileSync(raw, "utf8");
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com[^)]*/g) || [])];
    urls.forEach((u, i) => {
      const fn = `gf${i}.woff2`;
      curl(u, path.join(dir, fn));
      css = css.split(u).join(fn);
    });
    fs.writeFileSync(cssPath, css);
    fs.unlinkSync(raw);
  }
  const ttf = path.join(dir, "mci.ttf");
  if (!fs.existsSync(ttf)) {
    console.log("· fetching MaterialCommunityIcons");
    curl("https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/" +
         "react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf", ttf);
  }
}

function ensurePhotos() {
  const dir = path.join(CACHE, "photos");
  fs.mkdirSync(dir, { recursive: true });
  const { photos } = JSON.parse(fs.readFileSync(path.join(HERE, "photos.json"), "utf8"));
  for (const [key, meta] of Object.entries(photos)) {
    const dest = path.join(dir, `${key}.jpg`);
    if (fs.existsSync(dest)) continue;
    console.log(`· fetching photo ${key} (${meta.shows})`);
    curl(`https://images.unsplash.com/${meta.id}?w=1200&q=80&fm=jpg&fit=max`, dest);
  }
  return dir;
}

// ── Chrome-side helpers ──────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** iOS status bar, Dynamic Island and home indicator. `tint` for over-photo use. */
function chrome({ tint = C.ink, time = "9:41" } = {}) {
  return `
  <div class="statusbar" style="color:${tint}">
    <span class="sb-time">${time}</span>
    <span class="sb-right">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
        <rect x="0"  y="8"   width="3" height="4"  rx="1" fill="${tint}"/>
        <rect x="5"  y="5.5" width="3" height="6.5" rx="1" fill="${tint}"/>
        <rect x="10" y="3"   width="3" height="9"  rx="1" fill="${tint}"/>
        <rect x="15" y="0"   width="3" height="12" rx="1" fill="${tint}"/>
      </svg>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden="true">
        <path d="M1 3.6a11 11 0 0 1 15 0" stroke="${tint}" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 6.8a6.6 6.6 0 0 1 9 0"  stroke="${tint}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="8.5" cy="10.3" r="1.5" fill="${tint}"/>
      </svg>
      <svg width="27" height="13" viewBox="0 0 27 13" fill="none" aria-hidden="true">
        <rect x="0.5" y="0.5" width="22" height="12" rx="3.6" stroke="${tint}" stroke-opacity="0.4"/>
        <rect x="2" y="2" width="17" height="9" rx="2.2" fill="${tint}"/>
        <path d="M24.5 4.5v4a2.2 2.2 0 0 0 0-4z" fill="${tint}" fill-opacity="0.45"/>
      </svg>
    </span>
  </div>
  <div class="island"></div>
  <div class="home-indicator"></div>`;
}

/** Floating Liquid Glass tab bar — three tabs, Scan raised (src/components/BottomNav.js). */
function tabBar(active) {
  const tab = (id, glyph, label) => {
    const on = active === id;
    if (id === "scan") {
      return `<div class="tab">
        <div class="scan-pill">${icon(glyph, 22, "#fff")}</div>
        <span class="tab-label" style="color:${on ? C.ink : C.faint}">${label}</span>
      </div>`;
    }
    return `<div class="tab">
      <div class="tab-glyph" style="${on ? `background:${C.brandFaint};border:1px solid ${C.glassSelected}` : "border:0"}">
        ${icon(glyph, 18, on ? C.brand : C.muted)}
      </div>
      <span class="tab-label" style="color:${on ? C.ink : C.faint}">${label}</span>
    </div>`;
  };
  return `<div class="navbar">
    ${tab("today", "home", "Today")}
    ${tab("scan", "camera", "Scan")}
    ${tab("patterns", "activity", "Patterns")}
  </div>`;
}

/** NavBack — src/components/common.js */
const navBack = (label) => `
  <div class="navback">
    <div class="navback-btn">${icon("back", 18, C.ink)}</div>
    <span class="navback-label">${esc(label.toUpperCase())}</span>
  </div>`;

/** The 12-bar HR thumbnail beside a graded meal (MiniCurve in Today.js). */
function miniCurve(shape, tint) {
  const bars = shape.map((up) => 2 + Math.round(up * 12));
  return `<div class="mini">${bars
    .map((h) => `<span style="height:${h}px;background:${tint}"></span>`)
    .join("")}</div>`;
}

// ── Screens ──────────────────────────────────────────────────────────────────

/**
 * Today — the 2.0 home. Body strip, AI coach, and the Response feed: every meal
 * with the AI's read (the dot) next to the body's own verdict (the score).
 */
function screenToday() {
  const feed = [
    { name: "Greek yoghurt & berries", time: "9:12 am", verdict: "GOOD",
      status: "measuring", ready: "11:42 am" },
    { name: "Salmon & greens bowl", time: "Yesterday, 8:04 pm", verdict: "GOOD",
      status: "score", score: 88, label: "Calm",
      shape: [0.05, 0.1, 0.2, 0.35, 0.5, 0.42, 0.3, 0.22, 0.15, 0.1, 0.06, 0.04] },
    { name: "Overnight oats & honey", time: "Yesterday, 7:30 am", verdict: "GOOD",
      status: "score", score: 44, label: "Big response",
      shape: [0.1, 0.35, 0.7, 0.95, 1, 0.9, 0.78, 0.66, 0.55, 0.44, 0.36, 0.3] },
  ];

  const rows = feed.map((m) => {
    let right;
    if (m.status === "score") {
      const tint = scoreTint(m.score);
      right = `<div class="feed-right">
        <div class="score-chip" style="background:${tint}1f;border-color:${tint}40;color:${tint}">
          ${m.score} · ${m.label}
        </div>
        ${miniCurve(m.shape, tint)}
      </div>`;
    } else {
      right = `<div class="feed-measuring">${icon("clock", 12, C.faint)}
        <span>measuring · ~${m.ready}</span></div>`;
    }
    return `<div class="feed-row">
      <span class="dot" style="background:${verdictColor(m.verdict)}"></span>
      <div class="feed-main">
        <div class="feed-name">${esc(m.name)}</div>
        <div class="feed-time">${esc(m.time)}</div>
      </div>
      ${right}
    </div>`;
  }).join("");

  const tiles = [
    ["heart", "RECOVERY", C.green, "68", "ms"],
    ["moon", "SLEEP", C.sleep, "7.4", "h"],
    ["activity", "RESTING HR", C.clay, "54", "bpm"],
  ].map(([g, label, col, v, unit]) => `
    <div class="body-tile">
      <div class="bt-head">${icon(g, 14, col)}<span>${label}</span></div>
      <div class="bt-val">${v}<span class="bt-unit"> ${unit}</span></div>
    </div>`).join("");

  // Longevity: 82 "Strong" — diet 23/30, sleep 22/25, exercise 17/25, cardio 20/20,
  // matching the score card on the landing page.
  const pillars = [[30, 23, C.brand], [25, 22, C.sleep], [25, 17, C.green], [20, 20, C.clay]]
    .map(([max, got, hue]) => `
      <div class="lp" style="flex:${max}">
        <span style="width:${Math.round((got / max) * 100)}%;background:${hue}"></span>
      </div>`).join("");

  return { nav: "today", body: `
    <div class="scroll" style="padding:18px;padding-top:56px">
      <div class="eyebrow-date">THURSDAY, 20 AUGUST</div>
      <div class="greet-row">
        <div class="greet">Good morning, Archie<span style="color:${C.brand}">.</span></div>
        <div class="avatar">${icon("settings", 17, C.muted)}</div>
      </div>

      <div class="body-strip">${tiles}</div>

      <div class="eyebrow-coach">YOUR COACH</div>
      <div class="coach-focus">Your HRV is up — a good day to push.</div>
      <div class="tip">
        <div class="tip-glyph">${icon("activity", 18, C.brand)}</div>
        <div class="tip-main">
          <div class="tip-title">Add 20 minutes of Zone 2</div>
          <div class="tip-sub">20 minutes today keeps you on pace.</div>
          <div class="tip-chip">94 min Zone 2 this week</div>
        </div>
        <div class="tip-x">${icon("close", 15, C.faint)}</div>
      </div>

      <div class="eyebrow-feed">YOUR MEALS, GRADED BY YOUR BODY</div>
      <div class="feed">${rows}</div>

      <div class="surprise">
        ${icon("activity", 16, C.brand)}
        <span>Your body disagreed with the AI on <b>Overnight oats &amp; honey</b> — see Patterns →</span>
      </div>

      <div class="lscore">
        <div class="ls-head">
          <div>
            <div class="ls-label">LONGEVITY SCORE</div>
            <div class="ls-row">
              <span class="ls-num" style="color:${C.green}">82</span>
              <span class="ls-word">Strong</span>
              <span class="ls-delta">+3</span>
            </div>
          </div>
          ${icon("chevron", 17, C.faint)}
        </div>
        <div class="ls-bars">${pillars}</div>
      </div>
    </div>` };
}

/**
 * Result — the AI's read on a scanned plate. `verdict` drives the palette;
 * layout follows src/screens/Result.js (photo, verdict pill, name, summary,
 * profile card, macro grid, log button).
 */
function screenResult(opts) {
  const {
    photo, verdict, name, summary, flags = [], tags = [], profileFlags,
    macros, tone = verdict, swap = null,
  } = opts;
  const col = verdictColor(verdict);
  const toneCol = verdictColor(tone);

  const flagChips = flags.map((f) => `
    <div class="flag-chip">⚠ ${esc(f)}</div>`).join("");

  const tagChips = tags.length ? `<div class="tags">${tags.map((t) => `
    <span class="tag">↗ ${esc(t)}</span>`).join("")}</div>` : "";

  const macroTile = ([k, v]) => `
    <div class="macro"><div class="macro-v">${esc(v)}</div><div class="macro-k">${k}</div></div>`;

  const swapCard = swap ? `
    <div class="swap">
      <div class="swap-label">${icon("check", 11, C.green)} BETTER OPTION</div>
      <div class="swap-name">${esc(swap.name)}</div>
      <div class="swap-why">${esc(swap.why)}</div>
    </div>` : "";

  return { nav: null, photoTop: true, body: `
    <div class="scroll" style="padding:0">
      <img class="hero-photo" src="${photo}" alt="">
      <div style="padding:22px;padding-top:18px">
        <div class="res-head">
          <div class="navback-btn">${icon("back", 18, C.ink)}</div>
          <div class="res-actions">
            <span class="res-share">Share</span>
            <span class="res-save">♡ Save</span>
          </div>
        </div>

        <div class="pill-row">
          <div class="verdict-pill" style="background:${verdictBg(verdict)};border-color:${col}40;color:${col}">
            ${verdict}
          </div>
          ${flagChips}
        </div>

        <div class="res-name">${esc(name)}</div>
        <div class="res-summary">${esc(summary)}</div>
        ${tagChips}

        <div class="profile-card" style="background:${verdictBg(tone)};border-color:${toneCol}40">
          <div class="profile-label" style="color:${toneCol}">⚑ FOR YOUR PROFILE</div>
          ${profileFlags.map((f) => `
            <div class="profile-row">
              <span style="color:${verdictColor(f.tone)}">•</span>
              <span>${esc(f.note)}</span>
            </div>`).join("")}
        </div>

        <div class="macros">
          <div class="macro-row">${[["Calories", macros.calories], ["Carbs", macros.carbs], ["Protein", macros.protein]].map(macroTile).join("")}</div>
          <div class="macro-row">${[["Fat", macros.fat], ["Sugar", macros.sugar], ["Sat fat", macros.sat_fat]].map(macroTile).join("")}</div>
        </div>

        ${swapCard}

        <div class="log-btn">Log this meal →</div>
      </div>
    </div>` };
}

/**
 * Meal detail — the second verdict. Real Apple Watch HR only, so this screen is
 * the one that proves the app measures rather than estimates.
 * Follows src/components/MealResponseCard.js.
 */
function screenResponse(photo) {
  const baseline = 58, peak = 65, deltaUp = 7, settleMin = 55;
  const tint = C.green; // level "calm" (deltaUp < 10)
  const W = 317, H = 96;             // card inner width at 393 - 2*22 - 2*16
  const pts = [58, 58, 59, 61, 63, 64.5, 65, 64, 62.5, 61, 60, 59.2, 58.6, 58.3, 58.2, 58.1, 58];
  const lo = Math.min(baseline, ...pts) - 2, hi = Math.max(baseline, ...pts) + 2;
  const span = hi - lo;
  const X = (i) => (i / (pts.length - 1)) * W;
  const Y = (b) => H - ((b - lo) / span) * H;

  // Smooth cubic through the sampled points.
  let d = `M ${X(0)} ${Y(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = X(i), y1 = Y(pts[i]), x2 = X(i + 1), y2 = Y(pts[i + 1]);
    const mx = (x1 + x2) / 2;
    d += ` C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }
  const peakI = pts.indexOf(Math.max(...pts));
  const peakX = X(peakI), peakY = Y(pts[peakI]);
  const baseY = Y(baseline);

  const stat = (label, value) => `
    <div class="stat"><div class="stat-v">${esc(value)}</div><div class="stat-l">${esc(label)}</div></div>`;

  return { nav: null, photoTop: true, body: `
    <div class="scroll" style="padding:0">
      <img class="hero-photo" src="${photo}" alt="">
      <div style="padding:22px;padding-top:18px">
        <div class="res-head">
          <div class="navback-btn">${icon("back", 18, C.ink)}</div>
          <div class="res-actions"><span class="res-share">Share</span><span class="res-save">♥ Saved</span></div>
        </div>

        <div class="pill-row">
          <div class="verdict-pill" style="background:${C.greenFaint};border-color:${C.green}40;color:${C.green}">GOOD</div>
        </div>
        <div class="res-name">Salmon &amp; greens bowl</div>
        <div class="res-meta">Yesterday, 8:04 pm</div>

        <div class="resp-card">
          <div class="resp-head">
            <span class="resp-eyebrow">HOW YOUR BODY RESPONDED</span>
            <span class="resp-badges">
              <span class="resp-badge" style="background:${C.green}1f;border-color:${C.green}40;color:${C.green}">88 · CALM</span>
              <span class="resp-badge" style="background:${C.greenFaint};border-color:${C.green}40;color:${C.green}">♥ APPLE WATCH</span>
            </span>
          </div>
          <div class="resp-title">A calm, steady response</div>
          <div class="resp-line">Your heart rate barely moved (~${deltaUp} bpm) and stayed near its
            baseline — a sign of an easy-to-handle meal.</div>

          <div class="resp-chart-wrap">
            <svg class="resp-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0"    stop-color="${tint}" stop-opacity="0.30"/>
                  <stop offset="0.55" stop-color="${tint}" stop-opacity="0.05"/>
                  <stop offset="1"    stop-color="${tint}" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path d="${d} L ${W} ${H} L 0 ${H} Z" fill="url(#fill)"/>
              <line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="${C.border}" stroke-width="1"/>
              <path d="${d}" fill="none" stroke="${tint}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="${peakX}" cy="${peakY}" r="7" fill="${tint}" fill-opacity="0.2"/>
              <circle cx="${peakX}" cy="${peakY}" r="4" fill="${tint}" stroke="${C.card}" stroke-width="1.5"/>
            </svg>
            <div class="resp-peak" style="left:${peakX - 14}px;top:${peakY - 24}px;color:${tint}">${peak}</div>
          </div>

          <div class="resp-axis"></div>
          <div class="resp-xlabels"><span>ate</span><span>+1 hr</span><span>+2 hr</span></div>

          <div class="resp-stats">
            ${stat("Resting", String(baseline))}
            ${stat("Peak", `${peak} bpm`)}
            ${stat("Rise", `+${deltaUp}`)}
            ${stat("Back to rest", `${settleMin} min`)}
          </div>
        </div>

        <div class="macros">
          <div class="macro-row">${[["Calories", "520 kcal"], ["Carbs", "24 g"], ["Protein", "42 g"]]
            .map(([k, v]) => `<div class="macro"><div class="macro-v">${v}</div><div class="macro-k">${k}</div></div>`).join("")}</div>
        </div>
      </div>
    </div>` };
}

/** Patterns — what the body keeps saying, across a week of meals. */
function screenPatterns() {
  const foodRow = (label, n, score, tint) => `
    <div class="food-row">
      <span class="food-name">${esc(label)}</span>
      <span class="food-n">${n} meals</span>
      <span class="food-score" style="background:${tint}1f;color:${tint}">${score}</span>
    </div>`;

  return { nav: "patterns", body: `
    <div class="scroll" style="padding:18px;padding-top:56px">
      <div class="p-title">Your patterns<span style="color:${C.brand}">.</span></div>
      <div class="p-sub">What your own body keeps telling you.</div>

      <div class="p-eyebrow">THIS WEEK</div>
      <div class="p-card">
        <div class="week-head">
          <span class="week-num" style="color:${C.gold}">74</span>
          <span class="week-label">avg body score</span>
          <span class="week-delta" style="color:${C.green}">+6</span>
        </div>
        <div class="week-tiles">
          <div class="week-tile" style="background:${C.greenFaint}">
            <div class="wt-label" style="color:${C.green}">CALMEST</div>
            <div class="wt-name">Salmon &amp; greens bowl</div>
            <div class="wt-score" style="color:${C.green}">88</div>
          </div>
          <div class="week-tile" style="background:${C.clayFaint}">
            <div class="wt-label" style="color:${C.clay}">BIGGEST RESPONSE</div>
            <div class="wt-name">Overnight oats &amp; honey</div>
            <div class="wt-score" style="color:${C.clay}">44</div>
          </div>
        </div>
        <div class="week-lines">
          <div>You logged 14 meals this week, 11 of them graded by your watch.</div>
        </div>
      </div>

      <div class="p-eyebrow">FOODS YOUR BODY LOVES &amp; FIGHTS</div>
      <div class="p-sublabel" style="color:${C.green}">LOVES</div>
      <div class="food-list">
        ${foodRow("Salmon & greens bowl", 3, 88, C.green)}
      </div>
      <div class="p-sublabel" style="color:${C.clay};margin-top:14px">FIGHTS</div>
      <div class="food-list">
        ${foodRow("Overnight oats & honey", 3, 44, C.clay)}
        ${foodRow("Chocolate chip cookies", 2, 38, C.clay)}
      </div>

      <div class="p-eyebrow">WHERE YOUR BODY DISAGREED</div>
      <div class="p-note">Your body agreed with the AI on 78% of scored meals.</div>
      <div class="surprise-row">
        <span class="sr-name">Overnight oats &amp; honey</span>
        <span class="sr-chip" style="background:${C.greenFaint};color:${C.green}">GOOD</span>
        <span class="sr-arrow">→</span>
        <span class="sr-chip" style="background:${C.clay}1f;color:${C.clay}">44</span>
      </div>

      <div class="p-eyebrow">EXPERIMENTS</div>
      <div class="p-card exp">
        <div class="exp-head">
          <div class="exp-glyph">${icon("moon", 17, C.brand)}</div>
          <div>
            <div class="exp-title">Close the kitchen early</div>
            <div class="exp-tag">No food after 8:30pm for 5 nights</div>
          </div>
        </div>
        <div class="exp-bar"><span style="width:60%"></span></div>
        <div class="exp-foot">Day 3 of 5 · tracking deep sleep</div>
      </div>
    </div>` };
}

/** Sleep — the nightly score and its five components. */
function screenSleep() {
  const comps = [
    ["Duration", 26, 30], ["Deep & REM", 22, 25], ["Bedtime", 13, 15],
    ["Time awake", 13, 15], ["Recovery", 12, 15],
  ];
  const rows = comps.map(([label, pts, max]) => {
    const pct = pts / max;
    const col = pct >= 0.8 ? C.green : pct >= 0.5 ? "#6a85b6" : "#c4903f";
    return `<div class="comp">
      <div class="comp-head">
        <span class="comp-label">${esc(label)}</span>
        <span class="comp-pts" style="color:${col}">${pts}/${max}</span>
      </div>
      <div class="comp-track"><span style="width:${Math.round(pct * 100)}%;background:${col}"></span></div>
    </div>`;
  }).join("");

  const nights = [78, 71, 86, 80, 66, 88, 86];
  const days = ["F", "S", "S", "M", "T", "W", "T"];
  const maxN = Math.max(...nights);
  const bars = nights.map((v, i) => `
    <div class="night">
      <span class="night-v">${v}</span>
      <span class="night-bar" style="height:${Math.round((v / maxN) * 90)}px"></span>
      <span class="night-d">${days[i]}</span>
    </div>`).join("");

  return { nav: null, body: `
    <div class="scroll" style="padding:22px;padding-top:60px">
      ${navBack("Sleep Score")}
      <div class="sleep-card">
        <div class="sleep-eyebrow">LAST NIGHT · WED</div>
        <div class="sleep-score-row">
          <span class="sleep-score" style="color:${C.green}">86</span>
          <span class="sleep-of">/100</span>
          <span class="sleep-rating" style="color:${C.green}">Excellent</span>
        </div>
        <div class="sleep-msg">That's a 86 for last night — a genuinely restorative one,
          with plenty of deep and REM sleep standing out.</div>
        <div class="comps">${rows}</div>
        <div class="sleep-foot">7h 42m asleep · in bed 10:58pm–6:52am</div>
      </div>

      <div class="avg-row">
        <div class="avg-card">
          <div class="avg-num" style="color:${C.green}">79</div>
          <div class="avg-label">7-night average · High</div>
        </div>
        <div class="avg-card">
          <div class="avg-num">85</div>
          <div class="avg-label">target</div>
        </div>
      </div>

      <div class="sec-label">Last 7 nights</div>
      <div class="chart-card"><div class="nights">${bars}</div></div>
    </div>` };
}

/** Zone 2 — weekly aerobic minutes from real workout heart rate. */
function screenZone2() {
  const week = [["M", 22], ["T", 0], ["W", 31], ["T", 41], ["F", 0], ["S", 0], ["S", 0]];
  const longest = Math.max(...week.map((d) => d[1]));
  const bars = week.map(([d, v]) => `
    <div class="z-day">
      <span class="z-v">${v || ""}</span>
      <span class="z-bar" style="height:${Math.max(v ? (v / longest) * 90 : 3, v ? 8 : 3)}px;
        background:${v ? C.green : C.surface}"></span>
      <span class="z-d">${d}</span>
    </div>`).join("");

  return { nav: null, body: `
    <div class="scroll" style="padding:22px;padding-top:60px">
      ${navBack("Zone 2")}
      <div class="z-title">Keep <em>going</em>.</div>
      <div class="z-lead">Zone 2 is your easy-aerobic band — about 132–145 bpm (60–70% of your
        heart-rate reserve, max ~184). It builds the aerobic base linked to metabolic health.</div>

      <div class="z-card">
        <div class="z-total">94</div>
        <div class="z-total-label">minutes in Zone 2 · target 150</div>
        <div class="z-track"><span style="width:63%"></span></div>
        <div class="z-remaining">63% there — about 56 min to go.</div>
      </div>

      <div class="z-stats">
        ${[["Active days", "3/7"], ["Longest", "41 min"], ["Avg/session", "31 min"]]
          .map(([k, v]) => `<div class="z-stat"><div class="z-stat-v">${v}</div><div class="z-stat-k">${k}</div></div>`).join("")}
      </div>

      <div class="sec-label">Minutes per day</div>
      <div class="chart-card"><div class="z-week">${bars}</div></div>

      <div class="z-coach"><b>Coaching: </b>Aim for at least 3 sessions of 20–40 min.
        Consistency beats intensity for Zone 2.</div>
    </div>` };
}

/** Recipes — the library. Text cards, exactly as the app renders them. */
function screenRecipes() {
  const recipes = [
    { v: "GOOD", meta: "20 min · 520 kcal · 42g protein", name: "Miso salmon & greens bowl",
      blurb: "Omega-3s, a full serving of greens and enough protein to carry a whole afternoon.", match: true },
    { v: "GOOD", meta: "10 min · 310 kcal · 24g protein", name: "Greek yoghurt & berries",
      blurb: "High-protein breakfast with slow-release fruit sugars instead of added ones.", match: true },
    { v: "GOOD", meta: "25 min · 440 kcal · 21g protein", name: "Lentil & spinach dhal",
      blurb: "Fibre-dense, plant-forward, and it keeps for three days in the fridge.", match: false },
  ];
  const cards = recipes.map((r) => `
    <div class="r-card">
      <div class="r-meta">
        <span class="dot" style="background:${verdictColor(r.v)}"></span>
        <span>${esc(r.meta)}</span>
      </div>
      <div class="r-name">${esc(r.name)}</div>
      <div class="r-blurb">${esc(r.blurb)}</div>
      <div class="r-foot">
        <span class="r-view">View recipe →</span>
        ${r.match ? `<span class="r-match">Matches your goals ✓</span>` : ""}
      </div>
    </div>`).join("");

  return { nav: null, body: `
    <div class="scroll" style="padding:22px;padding-top:60px">
      ${navBack("Recipes")}
      <div class="r-title">Cook something <em>good</em>.</div>
      <div class="r-lead">1,000+ healthy recipes, all nutritionist-approved. Follow along and log in one tap.</div>
      <div class="r-search">Search recipes (e.g. salmon, vegan, high-protein)</div>
      ${cards}
    </div>` };
}

// ── Page shell + CSS ─────────────────────────────────────────────────────────
function page(screen) {
  const overPhoto = !!screen.photoTop;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="fonts/local.css">
<style>
@font-face { font-family: MCI; src: url(fonts/mci.ttf) format("truetype"); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${VW}px; height: ${VH}px; overflow: hidden; background: ${C.cream}; }
body { font-family: "Spline Sans", sans-serif; color: ${C.ink}; -webkit-font-smoothing: antialiased; }
/* Explicit device frame: headless Chromium resolves the body's own height a few
   dozen px short of the window, which silently mis-places everything anchored
   from the bottom (the tab bar, the home indicator). Pinning the frame ourselves
   makes the geometry exact regardless. */
.phone {
  position: relative; width: ${VW}px; height: ${VH}px;
  overflow: hidden; background: ${C.cream};
}
.mci { font-family: MCI; font-style: normal; line-height: 1; display: inline-block; }
b { font-weight: 600; }
em { font-family: Fraunces; font-weight: 500; font-style: italic; }
.dot { width: 8px; height: 8px; border-radius: 4px; flex: none; }

/* scroll body — clipped at the viewport like a real screenshot */
.scroll { position: absolute; inset: 0; overflow: hidden; }

/* ── iOS chrome ───────────────────────────────────────────── */
.statusbar {
  position: absolute; top: 0; left: 0; right: 0; height: 54px; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 30px 0 32px; font-size: 15.5px; font-weight: 600; letter-spacing: 0.1px;
}
.sb-time { margin-top: 4px; font-variant-numeric: tabular-nums; }
.sb-right { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 125px; height: 37px; border-radius: 19px; background: #000; z-index: 21;
}
.home-indicator {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  width: 139px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.32); z-index: 30;
}

/* ── floating glass tab bar ───────────────────────────────── */
.navbar {
  position: absolute; left: 22px; right: 22px; bottom: 22px; z-index: 25;
  display: flex; border-radius: 26px; padding: 14px 0;
  background: linear-gradient(${C.glassHi}, ${C.glass});
  backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid ${C.glassHair};
  box-shadow: 0 14px 24px rgba(0,0,0,0.4);
}
.navbar::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 1.5px;
  background: linear-gradient(${C.glassHighlight}, transparent);
}
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.tab-glyph { padding: 5px 10px; border-radius: 10px; }
.scan-pill {
  width: 38px; height: 38px; border-radius: 19px; background: ${C.brand};
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(79,126,68,0.5);
}
.tab-label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.3px; }

/* ── shared bits ──────────────────────────────────────────── */
.navback { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.navback-btn {
  width: 38px; height: 38px; border-radius: 999px; background: ${C.card};
  display: flex; align-items: center; justify-content: center; flex: none;
}
.navback-label { font-size: 11px; letter-spacing: 1.4px; color: ${C.brandSoft}; }
.sec-label {
  font-size: 11px; letter-spacing: 1px; color: ${C.brandSoft};
  margin: 18px 0 10px;
}
.chart-card { background: ${C.card}; border-radius: 18px; padding: 18px; }

/* ── Today ────────────────────────────────────────────────── */
.eyebrow-date { font-size: 10.5px; letter-spacing: 1.5px; color: ${C.faint}; margin-bottom: 6px; }
.greet-row { display: flex; align-items: flex-start; justify-content: space-between; }
.greet { font-family: Fraunces; font-weight: 600; font-size: 26px; color: ${C.ink}; flex: 1; }
.avatar {
  width: 38px; height: 38px; border-radius: 19px; background: ${C.card};
  border: 1px solid ${C.border}; display: flex; align-items: center; justify-content: center; flex: none;
}
.body-strip { display: flex; gap: 8px; margin-top: 22px; }
.body-tile {
  flex: 1; background: ${C.card}; border-radius: 16px; border: 1px solid ${C.border}; padding: 14px;
}
.bt-head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.bt-head span { font-size: 10px; letter-spacing: 0.6px; color: ${C.faint}; }
.bt-val { font-family: Fraunces; font-weight: 600; font-size: 19px; color: ${C.ink}; }
.bt-unit { font-family: "Spline Sans"; font-weight: 400; font-size: 11px; color: ${C.faint}; }
.eyebrow-coach { font-size: 11px; letter-spacing: 1px; color: ${C.brandSoft}; margin: 24px 0 12px; }
.coach-focus {
  border-left: 3px solid ${C.brand}; background: ${C.brandFaint}; border-radius: 10px;
  padding: 14px; font-size: 15px; font-weight: 600; line-height: 22px; color: ${C.ink};
}
.tip {
  margin-top: 10px; background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px;
  padding: 16px; display: flex; align-items: flex-start; gap: 14px;
}
.tip-glyph {
  width: 38px; height: 38px; border-radius: 12px; background: ${C.surface}; flex: none;
  display: flex; align-items: center; justify-content: center; margin-top: 1px;
}
.tip-main { flex: 1; }
.tip-title { font-size: 14px; font-weight: 600; line-height: 20px; color: ${C.ink}; }
.tip-sub { font-size: 12.5px; color: ${C.muted}; margin-top: 3px; line-height: 18px; }
.tip-chip {
  display: inline-block; background: ${C.surface}; border-radius: 999px;
  padding: 3px 8px; margin-top: 6px; font-size: 10px; color: ${C.faint};
}
.tip-x { margin-top: 1px; }
.eyebrow-feed { font-size: 10.5px; letter-spacing: 1.5px; color: ${C.faint}; margin: 30px 0 12px; }
.feed { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 18px; padding: 0 16px; }
.feed-row { display: flex; align-items: center; gap: 10px; padding: 13px 0; border-top: 1px solid ${C.border}; }
.feed-main { flex: 1; min-width: 0; }
.feed-name { font-size: 14.5px; font-weight: 500; color: ${C.ink}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-time { font-size: 11.5px; color: ${C.faint}; margin-top: 1px; }
.feed-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex: none; }
.score-chip {
  padding: 3.5px 10px; border-radius: 999px; border: 1px solid;
  font-size: 12px; font-weight: 600; white-space: nowrap;
}
.mini { display: flex; align-items: flex-end; gap: 1.5px; height: 14px; }
.mini span { width: 2.5px; border-radius: 1px; opacity: 0.85; }
.feed-measuring { display: flex; align-items: center; gap: 4px; flex: none; }
.feed-measuring span { font-size: 11.5px; color: ${C.faint}; }
.surprise {
  display: flex; align-items: center; gap: 10px; margin-top: 10px;
  background: ${C.brandFaint}; border-radius: 14px; padding: 14px;
}
.surprise span { flex: 1; font-size: 12.5px; color: ${C.ink}; line-height: 18px; }
.lscore {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px;
  padding: 15px; margin-top: 26px;
}
.ls-head { display: flex; align-items: center; gap: 12px; }
.ls-head > div { flex: 1; }
.ls-label { font-size: 9.5px; letter-spacing: 1.2px; color: ${C.faint}; }
.ls-row { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; }
.ls-num { font-family: Fraunces; font-weight: 600; font-size: 24px; }
.ls-word { font-size: 12.5px; color: ${C.muted}; }
.ls-delta { font-size: 12px; font-weight: 600; color: ${C.green}; }
.ls-bars { display: flex; gap: 3px; margin-top: 11px; }
.lp { height: 6px; border-radius: 999px; background: ${C.surface}; overflow: hidden; }
.lp span { display: block; height: 100%; border-radius: 999px; }

/* ── Result / meal detail ─────────────────────────────────── */
.hero-photo { width: ${VW}px; height: 240px; object-fit: cover; display: block; }
.res-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.res-actions { display: flex; align-items: center; gap: 16px; }
.res-share { font-size: 13px; font-weight: 600; color: ${C.brand}; }
.res-save { font-size: 13px; font-weight: 600; color: ${C.muted}; }
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.verdict-pill {
  padding: 6px 14px; border-radius: 999px; border: 1px solid;
  font-size: 12px; font-weight: 600; letter-spacing: 1px;
}
.flag-chip {
  padding: 6px 12px; border-radius: 999px; background: ${C.clayFaint};
  border: 1px solid ${C.clay}50; font-size: 11px; font-weight: 600;
  letter-spacing: 0.5px; color: ${C.clay};
}
.res-name { font-family: Fraunces; font-weight: 600; font-size: 30px; line-height: 34px; color: ${C.ink}; }
.res-meta { font-size: 12px; color: ${C.faint}; margin: 6px 0 12px; }
.res-summary { font-size: 15px; line-height: 24px; color: ${C.ink}; opacity: 0.85; margin-top: 10px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.tag {
  padding: 4px 10px; border-radius: 999px; background: ${C.greenFaint};
  border: 1px solid ${C.green}40; font-size: 11px; color: ${C.green};
}
.profile-card { border: 1px solid; border-radius: 16px; padding: 16px; margin-top: 20px; }
.profile-label { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; margin-bottom: 10px; }
.profile-row { display: flex; gap: 8px; margin-bottom: 4px; }
.profile-row span:last-child { flex: 1; font-size: 14px; color: ${C.ink}; opacity: 0.85; line-height: 20px; }
.macros { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.macro-row { display: flex; gap: 8px; }
.macro { flex: 1; background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px; padding: 12px; }
.macro-v { font-family: Fraunces; font-weight: 600; font-size: 16px; color: ${C.ink}; }
.macro-k { font-size: 11px; color: ${C.faint}; margin-top: 2px; }
.swap {
  background: ${C.greenFaint}; border: 1px solid ${C.green}40; border-radius: 14px;
  padding: 16px; margin-top: 20px;
}
.swap-label { font-size: 11px; font-weight: 600; color: ${C.green}; margin-bottom: 4px; }
.swap-name { font-family: Fraunces; font-weight: 600; font-size: 16px; color: ${C.ink}; }
.swap-why { font-size: 13px; color: ${C.muted}; margin-top: 2px; }
.log-btn {
  margin-top: 20px; padding: 18px; border-radius: 18px; background: ${C.brand};
  text-align: center; font-size: 16px; font-weight: 600; color: ${C.cream};
}

/* ── response card ────────────────────────────────────────── */
.resp-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px;
  padding: 16px; margin-top: 20px; position: relative;
}
.resp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
.resp-eyebrow { font-size: 11px; letter-spacing: 0.6px; color: ${C.brandSoft}; white-space: nowrap; }
.resp-badges { display: flex; align-items: center; gap: 6px; flex: none; }
.resp-badge {
  padding: 3px 8px; border-radius: 999px; border: 1px solid;
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.4px; white-space: nowrap;
}
.resp-title { font-family: Fraunces; font-weight: 600; font-size: 20px; color: ${C.ink}; margin: 6px 0 2px; }
.resp-line { font-size: 13.5px; color: ${C.muted}; line-height: 20px; margin-bottom: 14px; }
.resp-chart-wrap { position: relative; margin-bottom: 8px; }
.resp-chart { display: block; }
.resp-peak { position: absolute; width: 28px; text-align: center; font-size: 11px; font-weight: 600; }
.resp-axis { height: 1px; background: ${C.border}; margin-bottom: 5px; }
.resp-xlabels { display: flex; justify-content: space-between; margin-bottom: 14px; }
.resp-xlabels span { font-size: 10px; color: ${C.faint}; }
.resp-stats { display: flex; border-top: 1px solid ${C.border}; padding-top: 12px; }
.stat { flex: 1; }
.stat-v { font-family: Fraunces; font-weight: 600; font-size: 18px; color: ${C.ink}; }
.stat-l { font-size: 11px; color: ${C.faint}; margin-top: 1px; }

/* ── Patterns ─────────────────────────────────────────────── */
.p-title { font-family: Fraunces; font-weight: 600; font-size: 26px; color: ${C.ink}; }
.p-sub { font-size: 13px; color: ${C.muted}; margin: 2px 0 22px; }
.p-eyebrow { font-size: 10.5px; letter-spacing: 1.5px; color: ${C.faint}; margin: 22px 0 10px; }
.p-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 18px; padding: 18px; }
.week-head { display: flex; align-items: baseline; gap: 8px; }
.week-num { font-family: Fraunces; font-weight: 600; font-size: 38px; }
.week-label { font-size: 13px; color: ${C.faint}; }
.week-delta { font-size: 13px; font-weight: 600; }
.week-tiles { display: flex; gap: 10px; margin-top: 14px; }
.week-tile { flex: 1; border-radius: 12px; padding: 12px; min-width: 0; }
.wt-label { font-size: 10px; letter-spacing: 0.5px; }
.wt-name {
  font-size: 13px; font-weight: 600; color: ${C.ink}; margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.wt-score { font-size: 12px; margin-top: 2px; }
.week-lines { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
.week-lines div { font-size: 12.5px; color: ${C.muted}; line-height: 18px; }
.p-sublabel { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.food-list { display: flex; flex-direction: column; gap: 6px; }
.food-row {
  display: flex; align-items: center; gap: 10px; background: ${C.card};
  border: 1px solid ${C.border}; border-radius: 12px; padding: 12px;
}
.food-name { flex: 1; font-size: 13.5px; font-weight: 500; color: ${C.ink}; }
.food-n { font-size: 11px; color: ${C.faint}; }
.food-score { padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.p-note { font-size: 12.5px; color: ${C.muted}; margin-bottom: 12px; }
.surprise-row {
  display: flex; align-items: center; gap: 8px; background: ${C.card};
  border: 1px solid ${C.border}; border-radius: 14px; padding: 14px;
}
.sr-name { flex: 1; font-size: 13.5px; font-weight: 500; color: ${C.ink}; }
.sr-chip { padding: 3px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; }
.sr-arrow { font-size: 13px; color: ${C.faint}; }
.exp-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.exp-glyph {
  width: 34px; height: 34px; border-radius: 12px; background: ${C.brandFaint};
  display: flex; align-items: center; justify-content: center; flex: none;
}
.exp-title { font-size: 14px; font-weight: 600; color: ${C.ink}; }
.exp-tag { font-size: 12px; color: ${C.muted}; margin-top: 2px; }
.exp-bar { height: 6px; border-radius: 999px; background: ${C.surface}; overflow: hidden; }
.exp-bar span { display: block; height: 100%; background: ${C.brand}; border-radius: 999px; }
.exp-foot { font-size: 11px; color: ${C.faint}; margin-top: 8px; }

/* ── Sleep ────────────────────────────────────────────────── */
.sleep-card { background: ${C.card}; border-radius: 20px; padding: 22px; }
.sleep-eyebrow { font-size: 11px; letter-spacing: 1px; color: ${C.brandSoft}; display: block; margin-bottom: 8px; }
.sleep-score-row { display: flex; align-items: baseline; gap: 8px; }
.sleep-score { font-family: Fraunces; font-weight: 600; font-size: 64px; line-height: 68px; }
.sleep-of { font-size: 15px; color: ${C.faint}; }
.sleep-rating { font-size: 13px; font-weight: 600; margin-left: 4px; }
.sleep-msg { font-size: 14px; color: ${C.muted}; line-height: 21px; margin: 10px 0 16px; }
.comps { display: flex; flex-direction: column; }
.comp { margin-bottom: 11px; }
.comp-head { display: flex; justify-content: space-between; margin-bottom: 5px; }
.comp-label { font-size: 13.5px; font-weight: 500; color: ${C.ink}; }
.comp-pts { font-size: 12.5px; font-weight: 600; }
.comp-track { height: 6px; border-radius: 999px; background: ${C.surface}; overflow: hidden; }
.comp-track span { display: block; height: 100%; border-radius: 999px; }
.sleep-foot { font-size: 11.5px; color: ${C.faint}; margin-top: 6px; }
.avg-row { display: flex; gap: 10px; margin-top: 16px; }
.avg-card { flex: 1; background: ${C.card}; border-radius: 18px; padding: 18px; }
.avg-num { font-family: Fraunces; font-weight: 600; font-size: 30px; color: ${C.ink}; }
.avg-label { font-size: 11.5px; color: ${C.faint}; margin-top: 2px; }
.nights { display: flex; align-items: flex-end; gap: 8px; height: 130px; }
.night { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.night-v { font-size: 9px; color: ${C.faint}; }
.night-bar { width: 100%; background: ${C.sleep}; border-radius: 6px; }
.night-d { font-size: 11px; color: ${C.muted}; }

/* ── Zone 2 ───────────────────────────────────────────────── */
.z-title { font-family: Fraunces; font-weight: 600; font-size: 30px; line-height: 32px; color: ${C.ink}; }
.z-title em { color: ${C.clay}; }
.z-lead { font-size: 14px; color: ${C.muted}; margin: 6px 0 22px; line-height: 21px; }
.z-card { background: ${C.card}; border-radius: 20px; padding: 22px; text-align: center; margin-bottom: 16px; }
.z-total { font-family: Fraunces; font-weight: 600; font-size: 54px; color: ${C.green}; }
.z-total-label { font-size: 13px; color: ${C.faint}; margin-bottom: 14px; }
.z-track { height: 10px; border-radius: 999px; background: ${C.surface}; overflow: hidden; }
.z-track span { display: block; height: 100%; background: ${C.green}; border-radius: 999px; }
.z-remaining { font-size: 13px; color: ${C.muted}; margin-top: 10px; }
.z-stats { display: flex; gap: 8px; }
.z-stat { flex: 1; background: ${C.card}; border-radius: 14px; padding: 14px; }
.z-stat-v { font-family: Fraunces; font-weight: 600; font-size: 20px; color: ${C.ink}; }
.z-stat-k { font-size: 11px; color: ${C.faint}; margin-top: 2px; }
.z-week { display: flex; align-items: flex-end; gap: 8px; height: 130px; }
.z-day { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.z-v { font-size: 10px; color: ${C.faint}; }
.z-bar { width: 100%; border-radius: 6px; }
.z-d { font-size: 11px; color: ${C.muted}; }
.z-coach {
  background: ${C.card}; border-radius: 16px; padding: 16px; margin-top: 16px;
  font-size: 13px; color: ${C.ink}; line-height: 19px;
}
.z-coach b { color: ${C.green}; }

/* ── Recipes ──────────────────────────────────────────────── */
.r-title { font-family: Fraunces; font-weight: 600; font-size: 30px; line-height: 32px; color: ${C.ink}; }
.r-title em { color: ${C.brand}; }
.r-lead { font-size: 14px; color: ${C.muted}; margin: 6px 0 16px; line-height: 20px; }
.r-search {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px;
  padding: 13px 16px; font-size: 15px; color: ${C.faint}; margin-bottom: 12px;
}
.r-card {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 18px;
  padding: 18px; margin-bottom: 12px;
}
.r-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.r-meta span:last-child { font-size: 11px; color: ${C.faint}; }
.r-name { font-family: Fraunces; font-weight: 600; font-size: 20px; color: ${C.ink}; }
.r-blurb { font-size: 13px; color: ${C.muted}; margin-top: 4px; line-height: 19px; }
.r-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.r-view { font-size: 12px; font-weight: 600; color: ${C.brand}; }
.r-match {
  padding: 3px 9px; border-radius: 999px; background: ${C.greenFaint};
  border: 1px solid ${C.green}40; font-size: 11px; font-weight: 600; color: ${C.green};
}
</style></head><body>
<div class="phone">
${screen.body}
${screen.nav ? tabBar(screen.nav) : ""}
${chrome({ tint: overPhoto ? "#ffffff" : C.ink })}
</div>
</body></html>`;
}

// ── Headless Chromium over CDP ───────────────────────────────────────────────
// Command-line --window-size can't express what we need: this build clamps the
// window to a 500px minimum width and skims ~87px off the height for frame, so
// a 393x852 request silently lays out at 500x765 and never paints the bottom of
// the page. Emulation.setDeviceMetricsOverride sets the viewport exactly, and
// captureScreenshot then returns precisely 1179x2556.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Browser {
  static async launch() {
    const b = new Browser();
    b.userDataDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "vive-shots-"));
    b.proc = spawn(CHROME, [
      "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      "--remote-debugging-port=0", `--user-data-dir=${b.userDataDir}`,
      "--no-first-run", "--disable-extensions",
    ], { stdio: ["ignore", "ignore", "pipe"] });

    // Chromium prints the DevTools endpoint on stderr once it is listening.
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = "";
      const to = setTimeout(() => reject(new Error("chromium did not start")), 30000);
      b.proc.stderr.on("data", (d) => {
        buf += d.toString();
        const m = buf.match(/ws:\/\/[^\s]+/);
        if (m) { clearTimeout(to); resolve(m[0]); }
      });
      b.proc.on("exit", (c) => { clearTimeout(to); reject(new Error(`chromium exited (${c})`)); });
    });

    b.ws = new WebSocket(wsUrl);
    b.id = 0;
    b.pending = new Map();
    b.events = new Map();
    b.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id != null && b.pending.has(msg.id)) {
        const { resolve, reject } = b.pending.get(msg.id);
        b.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        (b.events.get(msg.method) || []).forEach((fn) => fn(msg.params));
      }
    });
    await new Promise((res, rej) => {
      b.ws.addEventListener("open", res, { once: true });
      b.ws.addEventListener("error", rej, { once: true });
    });
    return b;
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const list = this.events.get(method) || [];
      const fn = (p) => {
        this.events.set(method, (this.events.get(method) || []).filter((f) => f !== fn));
        resolve(p);
      };
      list.push(fn);
      this.events.set(method, list);
    });
  }

  /** Render one local HTML file to an image at exactly VW*DPR x VH*DPR. */
  async shoot(htmlPath, dest) {
    const { targetId } = await this.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });

    await this.send("Emulation.setDeviceMetricsOverride", {
      width: VW, height: VH, deviceScaleFactor: 1, mobile: true,
    }, sessionId);
    await this.send("Page.enable", {}, sessionId);

    const loaded = this.once("Page.loadEventFired");
    await this.send("Page.navigate", { url: `file://${htmlPath}` }, sessionId);
    await loaded;
    // Webfonts resolve after load; give the raster a beat to pick them up.
    await this.send("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => true)", awaitPromise: true,
    }, sessionId).catch(() => {});
    await sleep(250);

    // An explicit clip with `scale` is what pins the output to exactly
    // VW*DPR x VH*DPR; relying on deviceScaleFactor alone leaves the raster at 1x.
    // WebP rather than PNG: a lossless screenshot of a photographed meal runs to
    // 1.4MB, and eight of those is a 4.6MB landing page. At q88 the UI text is
    // pixel-indistinguishable and the whole set fits in about 1MB.
    const { data } = await this.send("Page.captureScreenshot", {
      format: FORMAT, quality: QUALITY,
      clip: { x: 0, y: 0, width: VW, height: VH, scale: DPR },
      captureBeyondViewport: true,
    }, sessionId);
    fs.writeFileSync(dest, Buffer.from(data, "base64"));
    await this.send("Target.closeTarget", { targetId });
  }

  async close() {
    try { this.ws.close(); } catch {}
    this.proc.kill();
    fs.rmSync(this.userDataDir, { recursive: true, force: true });
  }
}

// ── Build ────────────────────────────────────────────────────────────────────
async function build() {
  ensureFonts();
  const photoDir = ensurePhotos();
  const P = (k) => `${path.relative(CACHE, path.join(photoDir, `${k}.jpg`))}`;

  const screens = {
    today: screenToday,
    patterns: screenPatterns,
    sleep: screenSleep,
    zone2: screenZone2,
    recipes: screenRecipes,
    response: () => screenResponse(P("salmon")),
    "scan-good": () => screenResult({
      photo: P("buddha-bowl"),
      verdict: "GOOD",
      name: "Rainbow buddha bowl",
      summary: "Chickpeas, sweet potato and avocado over greens — high fibre, " +
               "a complete plant protein, nothing ultra-processed.",
      tags: ["Fibre 14g", "Whole foods"],
      profileFlags: [
        { tone: "GOOD", note: "21g plant protein toward your 140g day" },
        { tone: "GOOD", note: "High fibre and slow carbs — steady energy" },
        { tone: "GOOD", note: "No dairy — clear of your allergy profile" },
      ],
      macros: { calories: "545 kcal", carbs: "58 g", protein: "21 g",
                fat: "24 g", sugar: "11 g", sat_fat: "4 g" },
    }),
    "scan-avoid": () => screenResult({
      photo: P("cookies"),
      verdict: "AVOID",
      name: "Chocolate chip cookies",
      summary: "Refined flour, added sugar and palm oil — a fast spike with " +
               "nothing to slow it down.",
      flags: ["Ultra-processed", "Seed oils"],
      profileFlags: [
        { tone: "AVOID", note: "32g added sugar — over your daily ceiling" },
        { tone: "AVOID", note: "NOVA 4 ultra-processed — against your goal" },
        { tone: "MIXED", note: "2g protein — this won't hold you to dinner" },
      ],
      macros: { calories: "410 kcal", carbs: "54 g", protein: "4 g",
                fat: "19 g", sugar: "32 g", sat_fat: "9 g" },
      swap: { name: "Greek yoghurt, berries & dark chocolate",
              why: "Same sweet hit with 24g protein and a fraction of the added sugar." },
    }),
  };

  const only = process.argv.slice(2);
  const names = only.length ? only : Object.keys(screens);
  const unknown = names.filter((n) => !screens[n]);
  if (unknown.length) {
    console.error(`unknown screen(s): ${unknown.join(", ")}`);
    console.error(`available: ${Object.keys(screens).join(", ")}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await Browser.launch();
  try {
    for (const name of names) {
      const htmlPath = path.join(CACHE, `${name}.html`);
      fs.writeFileSync(htmlPath, page(screens[name]()));
      const file = `${name}.${FORMAT}`;
      const dest = path.join(OUT, file);
      await browser.shoot(htmlPath, dest);
      const { size } = fs.statSync(dest);
      console.log(`✓ ${file}  ${(size / 1024).toFixed(0)}kb  ${VW * DPR}x${VH * DPR}`);
    }
  } finally {
    await browser.close();
  }
}

build().catch((err) => { console.error(err); process.exit(1); });
