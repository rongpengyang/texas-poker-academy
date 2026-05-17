const fs = require("node:fs");
const path = require("node:path");
const {
  brand,
  nav,
  assets,
  characters,
  analyzeExamples,
  articles,
  handReviews,
  glossary,
  staticPages,
  dailyHands,
  preflopRanges,
  preflopMatrices,
  rangeTrainerSpots,
  studySpots,
  practiceSpots,
  practicePacks,
  boardTextureAtlas,
  potOddsTrainer,
  playerTypeTest,
  trainingPlan,
  futureExpansionBlueprint,
  trainingTaxonomy,
  phaseFiveTargets,
  phaseFiveQualityStandards,
} = require("./english-content");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");
const domain = "https://smartpokerlab.com";
const lastmod = "2026-05-10";
const googleSiteVerification = "NtOh5bR-B1p_NFxUEfShvLhWqLvKZddo5xGLT9NkOuc";
const assetVersion = "20260517-core-lovable";
const publicPageCount = "143";

const analyticsScriptSrc = (() => {
  try {
    const config = JSON.parse(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG || "{}");
    const src = config.analytics?.scriptSrc || "/_vercel/insights/script.js";
    if (src.startsWith("http") || src.startsWith("/")) return src;
    return `/${src}`;
  } catch {
    return "/_vercel/insights/script.js";
  }
})();

function fileForUrl(url) {
  if (url === "/") return path.join(outDir, "index.html");
  return path.join(outDir, url.replace(/^\/|\/$/g, ""), "index.html");
}

function rel(url, currentUrl) {
  if (url.startsWith("#")) return url;
  if (/^(https?:|mailto:|data:)/.test(url)) return url;
  const depth = currentUrl.split("/").filter(Boolean).length;
  const prefix = depth === 0 ? "." : Array(depth).fill("..").join("/");
  const [withoutHash, hash = ""] = url.split("#");
  const [pathPart, query = ""] = withoutHash.split("?");
  const suffix = `${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  if (pathPart === "/") return `${prefix}/index.html${suffix}`;
  const normalized = pathPart.endsWith("/") ? pathPart : `${pathPart}/`;
  return `${prefix}${normalized}index.html${suffix}`;
}

function asset(file, currentUrl) {
  const depth = currentUrl.split("/").filter(Boolean).length;
  const prefix = depth === 0 ? "." : Array(depth).fill("..").join("/");
  return `${prefix}/${file}`;
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scriptJson(data) {
  return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
}

function dataScript(id, data) {
  return `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`;
}

function faqJsonLd(faqs) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function segmentLabel(segment) {
  const labels = {
    study: "Study Mode",
    analyze: "Analyze Lite",
    progress: "Progress Report",
    learn: "Beginner Lessons",
    preflop: "Preflop Ranges",
    gto: "GTO Academy",
    "player-types": "Player Types",
    "hand-review": "Hand Reviews",
    tools: "Training Tools",
    resources: "Study Sheets",
    glossary: "Glossary",
    "training-plan": "Training Plan",
    "submit-hand": "Submit a Hand",
    "weekly-challenge": "Weekly Challenge",
    "drill-packs": "Drill Packs",
  };
  return (
    labels[segment] ||
    segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function breadcrumbJsonLd(currentUrl, title) {
  const parts = currentUrl.split("/").filter(Boolean);
  let pathSoFar = "";
  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${domain}/`,
    },
  ];

  parts.forEach((part, index) => {
    pathSoFar += `/${part}/`;
    itemListElement.push({
      "@type": "ListItem",
      position: index + 2,
      name: index === parts.length - 1 ? title : segmentLabel(part),
      item: `${domain}${pathSoFar}`,
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

function itemListJsonLd(name, items, getUrl) {
  return {
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title || item[1],
      url: `${domain}${getUrl(item)}`,
    })),
  };
}

const onboardingQuestions = [
  {
    id: "onboard-utg-kjo",
    question: "6-max cash. You are UTG with KJo. What is the cleaner beginner baseline?",
    options: [
      { id: "fold", label: "Fold and avoid dominated top-pair spots", path: "preflop", score: 10 },
      { id: "open", label: "Open because it is a broadway hand", path: "preflop-leak", score: 0 },
    ],
  },
  {
    id: "onboard-half-pot",
    question: "Pot 100, villain bets 50, you call 50. Required equity?",
    options: [
      { id: "25", label: "About 25%", path: "math", score: 10 },
      { id: "33", label: "About 33%", path: "math-leak", score: 0 },
    ],
  },
  {
    id: "onboard-k72-cbet",
    question: "CO opens QJs, BB calls. Flop K72 rainbow. BB checks. What matters first?",
    options: [
      { id: "range", label: "CO range advantage and low-cost pressure", path: "postflop", score: 10 },
      { id: "hand", label: "Hero missed, so never bet", path: "postflop-leak", score: 0 },
    ],
  },
  {
    id: "onboard-station-aj",
    question: "BTN has AJ on A72 rainbow versus a calling station. Best default goal?",
    options: [
      { id: "value", label: "Value bet worse Ax and sticky pairs", path: "value", score: 10 },
      { id: "bluff", label: "Bluff because stations might fold", path: "value-leak", score: 0 },
    ],
  },
  {
    id: "onboard-876",
    question: "BTN opens AQo, BB calls. Flop 876 two-tone. What changes?",
    options: [
      { id: "slowdown", label: "BB connects more, so weak air checks more", path: "texture", score: 10 },
      { id: "rangebet", label: "Always range-bet because Hero opened", path: "texture-leak", score: 0 },
    ],
  },
  {
    id: "onboard-river-blocker",
    question: "You hold the ace of spades after a missed spade draw. What else is required before bluffing?",
    options: [
      { id: "story", label: "Credible value story and a fold target", path: "river", score: 10 },
      { id: "always", label: "The blocker alone is enough", path: "river-leak", score: 0 },
    ],
  },
  {
    id: "onboard-nit-raise",
    question: "A tight-passive player raises your turn bet large. What is the main adjustment?",
    options: [
      { id: "respect", label: "Respect the value-heavy range", path: "player-types", score: 10 },
      { id: "ignore", label: "Ignore player type and call top pair", path: "player-type-leak", score: 0 },
    ],
  },
  {
    id: "onboard-review",
    question: "After a confusing hand, what should you record first?",
    options: [
      { id: "structure", label: "Positions, stack, board, action, and question", path: "review", score: 10 },
      { id: "result", label: "Only whether you won or lost", path: "review-leak", score: 0 },
    ],
  },
  {
    id: "onboard-bb-qjs",
    question: "BB has QJs versus a BTN open. Beginner baseline?",
    options: [
      { id: "defend", label: "Defend often and plan postflop", path: "preflop", score: 10 },
      { id: "fold", label: "Fold because BB is out of position", path: "preflop-leak", score: 0 },
    ],
  },
  {
    id: "onboard-progress",
    question: "Where is Smart Poker Lab progress stored in this sprint?",
    options: [
      { id: "local", label: "Only in this browser unless exported", path: "routine", score: 10 },
      { id: "cloud", label: "Automatically in a cloud account", path: "routine-leak", score: 0 },
    ],
  },
];

function tagsFrom(...values) {
  return values
    .flat()
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,\|]/))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 10);
}

const growthPages = [
  {
    id: "growth-submit-hand",
    type: "Review Tool",
    title: "Anonymous Hand Submission Guide",
    description: "Format an anonymous Texas Hold'em hand review draft locally before using Analyze Lite.",
    url: "/submit-hand/",
    tags: ["hand review", "analyze", "anonymous", "offline study"],
  },
  {
    id: "growth-weekly-challenge",
    type: "Weekly Routine",
    title: "Weekly Poker Training Challenge",
    description: "Complete a seven-action weekly study loop and copy a local share summary.",
    url: "/weekly-challenge/",
    tags: ["weekly challenge", "daily workout", "practice", "progress"],
  },
  {
    id: "growth-drill-packs",
    type: "Drill Pack Library",
    title: "Poker Drill Packs",
    description: "SEO landing library for focused Smart Poker Lab practice packs.",
    url: "/drill-packs/",
    tags: ["drill pack", "practice", "smart score", "training"],
  },
  {
    id: "growth-training-library",
    type: "Training Library",
    title: "Training Library Blueprint",
    description: "Phase 5 taxonomy, coverage targets, and production standards for the Smart Poker Lab drill library.",
    url: "/training-library/",
    tags: ["taxonomy", "phase 5", "drill library", "training roadmap"],
  },
];

function drillPackLandingPacks() {
  return practicePacks.filter((pack) => pack.id !== "all");
}

function drillPackUrl(pack) {
  return `/drill-packs/${pack.id}/`;
}

function practiceUrlForPack(packId) {
  return `/practice/?pack=${encodeURIComponent(packId)}`;
}

function drillPackSpots(pack) {
  if (pack.dynamic) return [];
  return practiceSpots.filter((spot) => spotMatchesPracticePackStatic(spot, pack));
}

function packFocusRows(pack) {
  if (Array.isArray(pack.whyRows) && pack.whyRows.length) return pack.whyRows;
  const rows = {
    "preflop-discipline": [
      ["Range shape", "Open stronger from early position and widen only when position improves."],
      ["Common leak", "Playing dominated broadways and weak offsuit hands because they look familiar."],
      ["Next habit", "Name the position and response plan before entering the pot."],
    ],
    value: [
      ["Range shape", "Separate clear value, thin value, showdown value, and hands that should check."],
      ["Common leak", "Checking back too often versus sticky opponents who call worse pairs."],
      ["Next habit", "List the worse hands that can call before choosing a river size."],
    ],
    "board-texture": [
      ["Range shape", "Dry high-card boards often differ from low connected boards."],
      ["Common leak", "Auto-c-betting every flop because Hero raised preflop."],
      ["Next habit", "Ask who owns range advantage, nut advantage, and high-equity continues."],
    ],
    "river-decisions": [
      ["Range shape", "River actions need value targets, fold targets, blockers, and a credible story."],
      ["Common leak", "Bluffing because the draw missed without checking if villain can fold."],
      ["Next habit", "Choose the hand class first: value, bluff-catcher, give-up, or bluff."],
    ],
    "math-stack-depth": [
      ["Range shape", "Pot odds, SPR, and stack depth change how much equity is required."],
      ["Common leak", "Using the current pot instead of the final pot after calling."],
      ["Next habit", "Say the formula out loud before deciding: call amount divided by final pot."],
    ],
    "review-queue": [
      ["Range shape", "Low-score spots reveal which situations need spaced repetition."],
      ["Common leak", "Moving to new content before replaying the same mistake type."],
      ["Next habit", "Review three low-score decisions before starting a new pack."],
    ],
  };
  return rows[pack.id] || [
    ["Training goal", "Build a repeatable decision process around one focused leak."],
    ["Common leak", "Treating a single hand result as proof instead of reviewing the range."],
    ["Next habit", "Run five spots, write the leak label, then check Progress."],
  ];
}

function buildSearchIndex() {
  const items = [];
  const add = (item) => {
    items.push({
      id: item.id,
      title: item.title,
      description: item.description || item.setup || item.question || "",
      url: item.url,
      type: item.type,
      tags: [...new Set(tagsFrom(item.tags, item.position, item.street, item.mode, item.playerType, item.family, item.category, item.level))],
    });
  };

  articles.forEach((article) =>
    add({
      id: `article-${article.slug}`,
      type: "Lesson",
      title: article.title,
      description: article.description,
      url: articleUrl(article),
      tags: [article.section, article.category, article.level, ...article.keywords],
    }),
  );
  handReviews.forEach((hand) =>
    add({
      id: `hand-${hand.slug}`,
      type: "Hand Review",
      title: hand.title,
      description: hand.description,
      url: `/hand-review/${hand.slug}/`,
      tags: hand.meta,
    }),
  );
  practiceSpots.forEach((spot) =>
    add({
      id: `practice-${spot.id}`,
      type: "Practice Spot",
      title: spot.title,
      description: spot.setup,
      url: "/practice/",
      tags: [spot.mode, spot.street, spot.position, spot.playerType, spot.leak, ...(spot.tags || [])],
    }),
  );
  dailyHands.forEach((hand) =>
    add({
      id: `daily-${hand.id}`,
      type: "Daily Workout",
      title: hand.title,
      description: hand.subtitle || hand.question,
      url: "/tools/daily-hand/",
      tags: [hand.street, hand.position, hand.playerType, ...(hand.tags || hand.concepts || [])],
    }),
  );
  rangeTrainerSpots.forEach((spot) =>
    add({
      id: `range-${spot.id}`,
      type: "Range Drill",
      title: spot.title,
      description: spot.concept || spot.question,
      url: "/tools/range-trainer/",
      tags: [spot.position, spot.matrixId, ...(spot.tags || [])],
    }),
  );
  boardTextureAtlas.forEach((texture) =>
    add({
      id: `texture-${texture.id}`,
      type: "Board Texture",
      title: texture.title,
      description: texture.baseline,
      url: "/tools/board-texture-atlas/",
      tags: [texture.family, texture.example, "c-bet", "board texture"],
    }),
  );
  Object.entries(toolDetails || {}).forEach(([slug, tool]) =>
    add({
      id: `tool-${slug}`,
      type: "Tool",
      title: tool.title,
      description: tool.description,
      url: `/tools/${slug}/`,
      tags: [tool.eyebrow, "tool", "training"],
    }),
  );
  Object.entries(resourceDetails || {}).forEach(([slug, resource]) =>
    add({
      id: `resource-${slug}`,
      type: "Resource",
      title: resource.title,
      description: resource.description,
      url: `/resources/${slug}/`,
      tags: [resource.eyebrow, "study sheet", "printable"],
    }),
  );
  glossary.forEach(([slug, term, definition]) =>
    add({
      id: `glossary-${slug}`,
      type: "Glossary",
      title: term,
      description: definition,
      url: `/glossary/${slug}/`,
      tags: ["glossary", term],
    }),
  );
  growthPages.forEach(add);
  drillPackLandingPacks().forEach((pack) =>
    add({
      id: `drill-pack-${pack.id}`,
      type: "Drill Pack",
      title: `${pack.label} Drill Pack`,
      description: pack.description,
      url: drillPackUrl(pack),
      tags: [pack.label, "drill pack", "practice", "Smart Score"],
    }),
  );
  return items;
}

function layout({ currentUrl, title, description, body, extraHead = "" }) {
  const navHtml = nav.map((item) => `<a href="${rel(item.url, currentUrl)}">${item.label}</a>`).join("");
  const mobileDock = [
    { label: "Study", url: "/study/" },
    { label: "Practice", url: "/practice/" },
    { label: "Review", url: "/analyze/" },
    { label: "Progress", url: "/progress/" },
    { label: "Tools", url: "/tools/" },
  ]
    .map((item) => `<a href="${rel(item.url, currentUrl)}">${item.label}</a>`)
    .join("");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)} | ${brand.name}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="author" content="${brand.name}" />
    <meta name="robots" content="index, follow" />
    <meta name="google-site-verification" content="${googleSiteVerification}" />
    <link rel="canonical" href="${domain}${currentUrl}" />
    <meta property="og:title" content="${esc(title)} | ${brand.name}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${domain}${currentUrl}" />
    <meta property="og:image" content="${domain}/og-image.svg" />
    <meta property="og:site_name" content="${brand.name}" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)} | ${brand.name}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="theme-color" content="#17211d" />
    <link rel="icon" href="${asset("favicon.svg", currentUrl)}" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${asset("app-icon.svg", currentUrl)}" />
    <link rel="manifest" href="${asset("site.webmanifest", currentUrl)}" />
    <link rel="stylesheet" href="${asset("styles.css", currentUrl)}?v=${assetVersion}" />
    ${currentUrl === "/" ? "" : scriptJson(breadcrumbJsonLd(currentUrl, title))}
    ${extraHead}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="${rel("/", currentUrl)}" aria-label="${brand.name} home">
        <span class="brand-mark">S♠</span>
        <span>
          <strong>${brand.name}</strong>
          <small>${brand.tagline}</small>
        </span>
      </a>
      <nav class="main-nav" aria-label="Main navigation">${navHtml}</nav>
      <form class="site-search" role="search" aria-label="Search lessons and drills">
        <label class="sr-only" for="global-search-input">Search Smart Poker Lab</label>
        <input id="global-search-input" type="search" placeholder="Search BTN vs BB, river thin value..." autocomplete="off" />
        <button type="submit" aria-label="Search">Search</button>
      </form>
    </header>
    <nav class="mobile-dock" aria-label="Mobile quick navigation">${mobileDock}</nav>
    ${dataScript("global-search-data", buildSearchIndex())}
    ${dataScript("onboarding-questions-data", onboardingQuestions)}
    <section class="search-panel" id="global-search-panel" hidden aria-label="Search results">
      <div class="search-panel-head">
        <strong>Search Results</strong>
        <button type="button" class="mini-action" data-close-search>Close</button>
      </div>
      <div class="search-shortcuts" aria-label="Popular searches">
        <button type="button" data-search-query="river thin value">river thin value</button>
        <button type="button" data-search-query="BTN vs BB K72 c-bet">BTN vs BB K72</button>
        <button type="button" data-search-query="BB defend pot odds">BB defend</button>
        <button type="button" data-search-query="calling station value">calling station</button>
      </div>
      <div id="global-search-results" class="search-results">Start typing to find lessons, drills, tools, and hand reviews.</div>
    </section>
    <section class="onboarding-modal" id="onboarding-modal" hidden aria-label="5-minute skill check">
      <div class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button class="modal-close" type="button" data-close-onboarding aria-label="Close onboarding">Close</button>
        <p class="eyebrow">5-Minute Skill Check</p>
        <h2 id="onboarding-title">Find your first 7-day path.</h2>
        <p id="onboarding-copy">Answer 10 quick study questions. Your result stays only in this browser and routes you to the best starting workflow.</p>
        <div id="onboarding-progress" class="onboarding-progress">Question 1 of ${onboardingQuestions.length}</div>
        <div id="onboarding-question" class="onboarding-question"></div>
        <div id="onboarding-options" class="quiz-options"></div>
        <div id="onboarding-result" class="onboarding-result" hidden></div>
      </div>
    </section>
    <section class="guided-tour" id="guided-tour" hidden aria-label="First training guide">
      <div class="guided-tour-card" role="dialog" aria-modal="true" aria-labelledby="guided-tour-title">
        <button class="modal-close" type="button" data-close-guide aria-label="Close guide">Close</button>
        <p class="eyebrow">First Drill Guide</p>
        <h2 id="guided-tour-title">Make the decision before reading the answer.</h2>
        <ol>
          <li>Choose an action first.</li>
          <li>Read the Smart Score and leak label.</li>
          <li>Send low-score spots into Review Queue.</li>
          <li>Open Progress after your first answer.</li>
        </ol>
        <button class="primary-action" type="button" data-close-guide>Start Training</button>
      </div>
    </section>
    <section class="install-prompt" id="install-prompt" hidden aria-label="Install Smart Poker Lab">
      <strong>Add Smart Poker Lab to your home screen</strong>
      <p>Install the training lab for faster mobile practice. Progress still stays in this browser unless you export it.</p>
      <div class="resource-actions">
        <button class="primary-action" id="install-app-button" type="button">Install App</button>
        <button class="secondary-action" id="install-dismiss-button" type="button">Not Now</button>
      </div>
    </section>
    ${body}
    ${notice()}
    <footer class="site-footer">
      <div>
        <strong>${brand.name}</strong>
        <p>Rules, ranges, poker math, GTO basics, player types, hand reviews, and training tools.</p>
      </div>
      <div>
        <div class="footer-links">
          <a href="${rel("/about/", currentUrl)}">About</a>
          <a href="${rel("/editorial-policy/", currentUrl)}">Editorial Policy</a>
          <a href="${rel("/responsible-play/", currentUrl)}">Responsible Play</a>
          <a href="${rel("/disclaimer/", currentUrl)}">Disclaimer</a>
          <a href="${rel("/privacy/", currentUrl)}">Privacy</a>
        </div>
      </div>
    </footer>
    <script src="${asset("script.js", currentUrl)}?v=${assetVersion}"></script>
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    </script>
    <script defer src="${analyticsScriptSrc}"></script>
  </body>
</html>`;
}

function notice() {
  return `<section class="compliance-strip" data-component="ComplianceStrip" aria-label="Education-only site boundary">
    <strong>Education-only poker training.</strong>
    <span>Offline study only. Not a solver. Not real-time play assistance. We do not provide money-flow services, platform promotion, commercial access arrangements, or earnings promises. Progress and custom ranges stay in local browser storage. Minors should not use this site.</span>
  </section>`;
}

function responsiveImage(image, currentUrl, className, loading = "lazy") {
  return `<img class="${className}" src="${asset(image.src, currentUrl)}" alt="${esc(image.alt)}" loading="${loading}" decoding="async" />`;
}

function renderCards(cards) {
  return cards.map((card) => `<span class="playing-card${card.includes("♥") || card.includes("♦") ? " red" : ""}">${card}</span>`).join("");
}

function cardGrid(items, currentUrl) {
  return `<div class="hub-grid">${items
    .map(
      (item) => `<a class="hub-card" href="${rel(item.url, currentUrl)}">
        <span class="card-icon">${item.icon || "♠"}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </a>`,
    )
    .join("")}</div>`;
}

function articleUrl(article) {
  return `/${article.section}/${article.slug}/`;
}

function articleCard(article, currentUrl) {
  return `<a class="article-card" href="${rel(articleUrl(article), currentUrl)}">
    <span>${article.category} · ${article.level}</span>
    <h3>${article.title}</h3>
    <p>${article.description}</p>
  </a>`;
}

function faqSection(faqs) {
  return `<section class="faq-section-inline" aria-labelledby="faq-title">
    <h2 id="faq-title">FAQ</h2>
    <div class="faq-grid">${faqs.map((faq) => `<details><summary>${faq.question}</summary><p>${faq.answer}</p></details>`).join("")}</div>
  </section>`;
}

function learningPath(currentUrl, links) {
  return `<section class="learning-path" aria-labelledby="next-title">
    <h2 id="next-title">Next Steps</h2>
    <div>${links.map((link) => `<a href="${rel(link.url, currentUrl)}"><strong>${link.title}</strong><span>${link.description}</span></a>`).join("")}</div>
  </section>`;
}

function dataTable(headers, rows, className = "data-table") {
  return `<div class="${className}" role="region" aria-label="Training data table" tabindex="0">
    <table>
      <thead><tr>${headers.map((header) => `<th scope="col">${esc(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function visualLearningStrip(currentUrl) {
  const visuals = [
    {
      title: "Study Matrix",
      copy: "Turn boards into baseline, pressure, trap, and next-drill rows.",
      image: assets.study,
      url: "/study/",
    },
    {
      title: "Practice Feedback",
      copy: "Make the decision first, then review score, grade, leak, and pack progress.",
      image: assets.practice,
      url: "/practice/",
    },
    {
      title: "Analyze Report",
      copy: "Convert one hand into street plan, range shift, leak label, and drill route.",
      image: assets.analyze,
      url: "/analyze/",
    },
  ];
  return `<section class="section visual-learning-section" aria-labelledby="visual-learning-title">
    <div class="section-heading"><p class="eyebrow">Visual Learning</p><h2 id="visual-learning-title">More teaching images, less casino noise.</h2></div>
    <div class="visual-learning-grid">
      ${visuals
        .map(
          (item) => `<a class="visual-learning-card" href="${rel(item.url, currentUrl)}">
            ${responsiveImage(item.image, currentUrl, "mode-visual")}
            <span>${esc(item.title)}</span>
            <strong>${esc(item.copy)}</strong>
          </a>`,
        )
        .join("")}
    </div>
  </section>`;
}

function homeDecisionMatrix() {
  return dataTable(
    ["Training Action", "User Input", "Feedback Surface", "Next Habit"],
    [
      ["Study", "Board family, position, street, concept", "Baseline, exploit adjustment, range lens", "Send the spot into a drill pack"],
      ["Practice", "One decision and four actions", "Smart Score, grade, leak tag, streak", "Replay low-score spots"],
      ["Analyze", "Hand, board, action line, question", "Street plan, range shift, likely leak", "Queue the recommended pack"],
      ["Progress", "Browser-local events only", "7-day rhythm, weakest pack, study queue", "Follow the next three actions"],
    ],
    "data-table product-data-table",
  );
}

function homeTrainingPrescription(currentUrl) {
  return `<section class="section training-prescription-section" aria-labelledby="prescription-title">
    <div class="section-heading">
      <p class="eyebrow">Daily Training Prescription</p>
      <h2 id="prescription-title">Open the site and know the next move in 15 minutes.</h2>
    </div>
    <div class="training-prescription-shell">
      <article class="prescription-command-card">
        <span>Recommended First Loop</span>
        <strong>1 hand, 5 drill decisions, 1 review note.</strong>
        <p>This keeps the product close to a training app: study a pattern, make decisions, label the leak, then send the next spot into review. All progress remains browser-local.</p>
        <div class="prescription-actions">
          <a class="primary-action" href="${rel("/training-plan/day-01/", currentUrl)}">Start Day 1 Challenge</a>
          <a class="secondary-action" href="${rel("/tools/daily-hand/", currentUrl)}">Today's Workout</a>
          <a class="secondary-action" href="${rel("/progress/", currentUrl)}">See My Progress</a>
        </div>
      </article>
      <div class="prescription-data-card">
        ${dataTable(
          ["Step", "Training Action", "Success Signal", "Where It Updates"],
          [
            ["01", "Answer today's main hand", "A Smart Score and leak label appear", "Daily Workout"],
            ["02", "Run five focused drill-pack spots", "Low scores below 70 join the Review Queue", "Practice Mode"],
            ["03", "Analyze one remembered hand", "The report names a decision point and next pack", "Analyze Lite"],
            ["04", "Follow the next prescription", "Progress recommends a pack instead of showing empty stats", "Progress Report"],
          ],
          "data-table prescription-data-table",
        )}
      </div>
    </div>
  </section>`;
}

function weeklyTrainingPath(currentUrl, variant = "dark") {
  const steps = [
    { id: "study", day: "Mon", title: "Study one pattern", copy: "Open a board family or concept report.", url: "/study/" },
    { id: "daily", day: "Tue", title: "Answer Daily Workout", copy: "Make one decision before reading feedback.", url: "/tools/daily-hand/" },
    { id: "practice", day: "Wed", title: "Run a drill pack", copy: "Complete five focused Practice decisions.", url: "/practice/" },
    { id: "range", day: "Thu", title: "Check a range", copy: "Use the matrix before guessing a preflop hand.", url: "/tools/range-trainer/" },
    { id: "math", day: "Fri", title: "Do pot-odds reps", copy: "Repeat final-pot math until it is automatic.", url: "/tools/pot-odds-trainer/" },
    { id: "analyze", day: "Sat", title: "Review one hand", copy: "Save one Analyze Lite report after study.", url: "/analyze/" },
    { id: "progress", day: "Sun", title: "Follow the prescription", copy: "Check Progress and choose next week's leak.", url: "/progress/" },
  ];
  return `<section class="section weekly-path-section weekly-path-${variant}" aria-labelledby="weekly-path-title">
    <div class="section-heading">
      <p class="eyebrow">7-Day Training Path</p>
      <h2 id="weekly-path-title">A weekly routine that feels like a product, not homework.</h2>
      <p id="weekly-path-summary">Progress lights up in this browser after Study, Daily Workout, Practice, Range, Math, Analyze, and Progress actions.</p>
    </div>
    <div class="weekly-path-grid" id="weekly-training-path">
      ${steps
        .map(
          (step, index) => `<a class="weekly-path-step" data-weekly-step="${step.id}" href="${rel(step.url, currentUrl)}">
            <span>${step.day}</span>
            <b>0${index + 1}</b>
            <strong>${esc(step.title)}</strong>
            <p>${esc(step.copy)}</p>
            <small>Not started</small>
          </a>`,
        )
        .join("")}
    </div>
  </section>`;
}

function spotMatchesPracticePackStatic(spot, pack) {
  if (!pack || pack.id === "all") return true;
  if (pack.dynamic) return false;
  const match = pack.match || {};
  const checks = [];
  if (Array.isArray(match.modes)) checks.push(match.modes.includes(spot.mode));
  if (Array.isArray(match.streets)) checks.push(match.streets.includes(spot.street));
  if (Array.isArray(match.playerTypes)) checks.push(match.playerTypes.includes(spot.playerType));
  if (Array.isArray(match.leaks)) checks.push(match.leaks.includes(spot.leak) || spot.options.some((option) => match.leaks.includes(option.leak)));
  return checks.length ? checks.some(Boolean) : true;
}

function practicePackLibrary(currentUrl = "/practice/") {
  const featuredPacks = practicePacks.filter((pack) => pack.id !== "all");
  return `<div class="drill-pack-library" aria-labelledby="drill-pack-library-title">
    <div class="section-heading compact-heading">
      <p class="eyebrow">Drill Pack Library</p>
      <h3 id="drill-pack-library-title">Choose a focused pack instead of guessing what to study.</h3>
    </div>
    <div class="drill-pack-grid">
      ${featuredPacks
        .map((pack) => {
          const count = pack.dynamic ? "Local" : practiceSpots.filter((spot) => spotMatchesPracticePackStatic(spot, pack)).length;
          const focus = pack.dynamic ? "Review Queue" : pack.label.replace(" and ", " / ");
          const whyRows = (pack.whyRows || [])
            .slice(0, 2)
            .map((row) => `<li><b>${esc(row[0])}</b><span>${esc(row[1])}</span></li>`)
            .join("");
          return `<article class="pack-card">
            <div>
              <span>${esc(focus)}</span>
              <strong>${esc(pack.label)}</strong>
              <p>${esc(pack.description)}</p>
              ${whyRows ? `<ul class="pack-why-list">${whyRows}</ul>` : ""}
            </div>
            <div class="pack-card-footer">
              <b>${esc(String(count))}</b>
              <small>${pack.dynamic ? "browser-local spots" : "available spots"}</small>
              <a href="${rel(practiceUrlForPack(pack.id), currentUrl)}">Train Pack</a>
            </div>
          </article>`;
        })
        .join("")}
    </div>
  </div>`;
}

function studyPatternMatrix() {
  return dataTable(
    ["Board Family", "Baseline Pattern", "When to Adjust", "Best Next Drill"],
    [
      ["K72 rainbow", "Raiser can use small frequent pressure", "Remove weak air versus sticky callers", "Board Texture and C-Bets"],
      ["876 two-tone", "Caller connects harder with pairs and draws", "Value and strong equity before autopilot bluffs", "Connected Boards"],
      ["AA5 paired", "Raiser has top-end density and small pressure", "Check some Ax so checks are protected", "Nut Advantage"],
      ["River blocker", "Bluffs need blocker plus credible value story", "Give up more versus calling stations", "River Decisions"],
    ],
    "data-table mode-data-table",
  );
}

function practiceScoreMatrix() {
  return dataTable(
    ["Score Band", "Meaning", "Example Leak", "Next Action"],
    [
      ["90-100", "Preferred lab decision", "Best move or clean value", "Repeat the spot with a new board"],
      ["70-89", "Acceptable but conditional", "Mixed spot or thin edge", "Read the baseline and exploit note"],
      ["40-69", "Review needed", "Missed value, over-fold, or weak bluff", "Add to Review Queue"],
      ["0-39", "Major leak", "Deep-stack jam, dominated open, or no plan", "Run the linked drill pack"],
    ],
    "data-table mode-data-table",
  );
}

function analyzeReportMatrix() {
  return dataTable(
    ["Report Row", "What It Shows", "Why It Matters", "Training Route"],
    [
      ["Input Quality", "How complete the hand review is", "Weak inputs create weak conclusions", "Fill stack, position, board, and street action"],
      ["Decision Profile", "Street, texture, hand class, opponent", "The same hand changes by node", "Replay the first decision street"],
      ["Leak Weight", "A heuristic study-cost band", "Recurring leaks deserve priority before fancy lines", "Queue the matching drill pack"],
      ["Range Shift", "How villain range changes by action", "Prevents single-hand guessing", "Write which worse hands call"],
      ["Recommended Pack", "The drill category linked to the leak", "Turns review into repetition", "Queue the pack into Practice"],
    ],
    "data-table mode-data-table",
  );
}

function studyModePanel(currentUrl = "/study/") {
  return `<section class="section study-mode-section" aria-labelledby="study-mode-title">
    ${dataScript("study-mode-data", studySpots)}
    ${dataScript("study-practice-packs-data", practicePacks)}
    <div class="section-heading">
      <p class="eyebrow">Study Mode v2</p>
      <h2 id="study-mode-title">Browse patterns, save the note, then train the matching pack.</h2>
    </div>
    <div class="study-command-bar" aria-live="polite">
      <article>
        <span>Active Study Spot</span>
        <strong id="study-active-title">Loading study spot</strong>
        <p id="study-active-summary">Choose a report to see the baseline, exploit adjustment, and next drill.</p>
      </article>
      <div class="study-command-stats" aria-label="Local study stats">
        <div><span>Viewed</span><strong id="study-viewed-count">0</strong></div>
        <div><span>Marked</span><strong id="study-mastered-count">0</strong></div>
        <div><span>Queued</span><strong id="study-queued-count">0</strong></div>
      </div>
    </div>
    <div class="study-filters" aria-label="Study filters">
      <label>Position<select id="study-position-filter"><option value="all">All positions</option></select></label>
      <label>Board Type<select id="study-texture-filter"><option value="all">All board types</option></select></label>
      <label>Concept<select id="study-concept-filter"><option value="all">All concepts</option></select></label>
      <label>Street<select id="study-street-filter"><option value="all">All streets</option></select></label>
    </div>
    <div class="study-shell">
      <aside class="study-browser" aria-labelledby="study-browser-title">
        <div>
          <span>Spot Explorer</span>
          <strong id="study-browser-title">Original study reports</strong>
        </div>
        <div class="study-list" id="study-list"></div>
      </aside>
      <article class="study-report" aria-labelledby="study-title">
        <div class="study-meta" id="study-meta"></div>
        <h3 id="study-title">Loading study spot</h3>
        <p id="study-setup"></p>
        <div class="study-board-strip" id="study-board"></div>
        <div class="study-lens-grid" id="study-lens-grid"></div>
        <div class="study-report-grid">
          <section>
            <span>Baseline</span>
            <p id="study-baseline"></p>
          </section>
          <section>
            <span>Exploit Adjustment</span>
            <p id="study-exploit"></p>
          </section>
          <section>
            <span>Check-Range Note</span>
            <p id="study-check-range"></p>
          </section>
          <section>
            <span>Training Drill</span>
            <p id="study-drill"></p>
          </section>
        </div>
        <div id="study-data-table" class="study-data-table"></div>
        <div class="study-mistake-box">
          <strong>Common beginner traps</strong>
          <ul id="study-mistakes"></ul>
        </div>
        <div class="study-linked-box">
          <strong>Linked Training Pack</strong>
          <p id="study-linked-pack">Choose a study spot to see the recommended drill pack.</p>
          <output id="study-action-result" class="study-action-result">Local study actions stay in this browser.</output>
        </div>
        <div class="study-compare-box" id="study-compare-box"></div>
        <div class="study-resource-links" id="study-resource-links"></div>
        <div class="study-actions" id="study-actions">
          <button class="tool-button" id="study-mark-mastered" type="button">Mark Studied</button>
          <button class="secondary-action inline-action" id="study-send-practice" type="button">Send to Practice Pack</button>
          <button class="secondary-action inline-action" id="study-copy-notes" type="button">Copy Study Notes</button>
          <a class="secondary-action" href="${rel("/analyze/", currentUrl)}">Build Analyze Report</a>
        </div>
      </article>
    </div>
  </section>`;
}

function practiceModePanel() {
  const defaultSpot = practiceSpots[0];
  const defaultPack = practicePacks[0];
  const defaultOptions = defaultSpot.options
    .map((option) => `<button class="answer-card" type="button" data-practice-answer="${esc(option.id)}">${esc(option.label)}</button>`)
    .join("");
  const defaultMeta = [defaultSpot.mode, defaultSpot.street, defaultSpot.position, defaultSpot.playerType, defaultSpot.difficulty]
    .filter(Boolean)
    .map((item) => `<span>${esc(item)}</span>`)
    .join("");
  return `<section class="section practice-mode-section" aria-labelledby="practice-mode-title">
    ${dataScript("practice-mode-data", practiceSpots)}
    ${dataScript("practice-packs-data", practicePacks)}
    <div class="section-heading">
      <p class="eyebrow">Practice Mode</p>
      <h2 id="practice-mode-title">Make decisions, score them, then review your leaks.</h2>
    </div>
    <div class="practice-routine-bar" aria-live="polite">
      <div>
        <span>Active Drill Pack</span>
        <strong id="practice-pack-title">${esc(defaultPack.label)}</strong>
        <p id="practice-pack-description">${esc(defaultPack.description)}</p>
      </div>
      <div class="practice-progress-card">
        <span id="practice-progress-label">Start 1 of ${practiceSpots.length} available spots</span>
        <div class="score-track"><i id="practice-progress-bar"></i></div>
      </div>
    </div>
    <div class="practice-pack-teaching" id="practice-pack-teaching">
      ${dataTable(
        ["Why This Pack", "Training Cue", "Avoid"],
        defaultPack.whyRows || [["Start broad", "Choose a pack after one score reveals a leak.", "Do not jump between random spots without a review note."]],
        "data-table mini-data-table",
      )}
    </div>
    <div class="practice-controls" aria-label="Practice filters">
      <label>Drill Pack<select id="practice-pack-filter">
        <option value="all">All Spots</option>
      </select></label>
      <label>Street<select id="practice-street-filter">
        <option value="all">All streets</option>
        <option value="Preflop">Preflop</option>
        <option value="Flop">Flop</option>
        <option value="Turn">Turn</option>
        <option value="River">River</option>
      </select></label>
      <label>Mode<select id="practice-mode-filter">
        <option value="all">All modes</option>
        <option value="Preflop">Preflop</option>
        <option value="Postflop">Postflop</option>
        <option value="Math">Math</option>
      </select></label>
      <label>Opponent<select id="practice-player-filter">
        <option value="all">All player types</option>
        <option value="Calling station">Calling station</option>
        <option value="Regular">Regular</option>
        <option value="Passive player">Passive player</option>
        <option value="Unknown">Unknown</option>
      </select></label>
      <button class="secondary-action inline-action" id="practice-next-spot" type="button">Next Spot</button>
      <button class="secondary-action inline-action" id="practice-retry-queue" type="button">Retry Queue</button>
      <button class="secondary-action inline-action" id="practice-reset-session" type="button">Reset Session</button>
    </div>
    <div class="practice-shell">
      <article class="practice-table" aria-labelledby="practice-spot-title">
        <div class="practice-spot-meta" id="practice-spot-meta">${defaultMeta}</div>
        <h3 id="practice-spot-title">${esc(defaultSpot.title)}</h3>
        <p id="practice-spot-setup">${esc(defaultSpot.setup)}</p>
        <div class="practice-board">
          <span id="practice-hand">Hero: ${esc(defaultSpot.hand)}</span>
          <span id="practice-board">Board: ${esc(defaultSpot.board)}</span>
        </div>
        <p class="practice-question" id="practice-question">${esc(defaultSpot.question)}</p>
        <div id="practice-data-table" class="practice-data-table" hidden></div>
        <div class="quiz-options" id="practice-options">${defaultOptions}</div>
        <div class="smart-score-card" id="practice-score" hidden>
          <span>Smart Score</span>
          <strong>0</strong>
          <div class="score-track"><i></i></div>
          <p>Choose an action to see the score tier and leak label.</p>
        </div>
        <output class="tool-result" id="practice-result">Choose an action to see Smart Score, beginner mistake, baseline, exploit adjustment, next plan, and recommended next drill.</output>
      </article>
      <aside class="practice-session" aria-labelledby="practice-session-title">
        <h3 id="practice-session-title">Session Report</h3>
        <div class="practice-stats">
          <div><span>Average</span><strong id="practice-average">No data</strong></div>
          <div><span>Decisions</span><strong id="practice-count">0</strong></div>
          <div><span>Review Queue</span><strong id="practice-mistakes">0</strong></div>
          <div><span>Streak</span><strong id="practice-streak">0 / 0</strong></div>
          <div><span>Pack Done</span><strong id="practice-pack-progress">0%</strong></div>
        </div>
        <div class="practice-queue">
          <strong>Recommended Next Pack</strong>
          <div id="practice-recommendation">Complete a few decisions to unlock a recommendation.</div>
        </div>
        <div class="practice-queue">
          <strong>Recent Decisions</strong>
          <div id="practice-history">Complete a practice spot to build history.</div>
        </div>
        <div class="practice-queue">
          <strong>Mistake Review Queue</strong>
          <div id="practice-mistake-queue">No major leaks yet.</div>
        </div>
      </aside>
    </div>
    ${practicePackLibrary("/practice/")}
  </section>`;
}

function articleFaq(article) {
  return [
    {
      question: `Who is this ${article.title} lesson for?`,
      answer: `It is written for ${article.level.toLowerCase()} players who want to connect ${article.keywords[0]} with real positions, ranges, and betting decisions.`,
    },
    {
      question: "Should I study GTO or player types first?",
      answer: "Use GTO as a baseline language, then adjust when opponents clearly call too much, fold too much, or bluff too much.",
    },
    {
      question: "Is this a real-time play tool?",
      answer: "No. This lesson is for offline poker education, not a poker room, casino, or play assistant.",
    },
  ];
}

function handFaq(hand) {
  return [
    { question: "What is the main lesson of this hand?", answer: hand.lesson },
    { question: "What is the difference between GTO baseline and exploit adjustment?", answer: "The baseline prevents obvious exploitation. Exploit adjustments intentionally deviate when an opponent has a clear leak." },
    { question: "What should I record when reviewing a hand?", answer: "Record positions, stack depth, board texture, bet sizes, opponent type, your thought process, and the better alternative line." },
  ];
}

function articleDeepSections(article, currentUrl) {
  if (!article.comic && !article.example && !article.drill && !article.conceptMap && !article.baselineVsExploit && !article.trainingLoop) return "";
  const relatedPackCards = (article.relatedDrillPacks || [])
    .map((packId) => practicePacks.find((pack) => pack.id === packId))
    .filter(Boolean);
  return `<section class="deep-learning" aria-label="Training explanation">
    ${article.comic ? `<div class="comic-strip"><strong>Comic Scene</strong><p>${article.comic}</p></div>` : ""}
    ${article.example ? `<h2>Table Example</h2><p>${article.example}</p>` : ""}
    ${
      article.trainingPrescription
        ? `<h2>Study-to-Practice Prescription</h2>${dataTable(["Step", "What to do next"], article.trainingPrescription, "data-table mini-data-table")}`
        : ""
    }
    ${
      article.conceptMap
        ? `<h2>Concept Map</h2><div class="concept-map-grid">${article.conceptMap.map(([label, text]) => `<article><strong>${label}</strong><p>${text}</p></article>`).join("")}</div>`
        : ""
    }
    ${
      article.baselineVsExploit
        ? `<h2>GTO Baseline vs Exploit Adjustment</h2><div class="concept-matrix">${article.baselineVsExploit.map(([spot, baseline, exploit]) => `<article><strong>${spot}</strong><p><b>Baseline:</b> ${baseline}</p><p><b>Exploit:</b> ${exploit}</p></article>`).join("")}</div>`
        : ""
    }
    ${article.mistakes ? `<h2>Common Mistakes</h2><ul>${article.mistakes.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    ${
      article.trainingLoop
        ? `<h2>Training Loop</h2><ol class="training-loop-list">${article.trainingLoop.map((item) => `<li>${item}</li>`).join("")}</ol>`
        : ""
    }
    ${article.drill ? `<div class="training-question"><strong>Training Question</strong><p>${article.drill.question}</p><button class="tool-button reveal-answer" type="button">Show Answer</button><p class="hidden-answer" hidden>${article.drill.answer}</p></div>` : ""}
    ${
      relatedPackCards.length
        ? `<h2>Train This Concept</h2><div class="drill-pack-seo-grid concept-drill-grid">${relatedPackCards
            .map((pack) => {
              const count = pack.dynamic ? "Local queue" : `${drillPackSpots(pack).length} spots`;
              return `<article class="drill-pack-seo-card concept-drill-card">
                <span>${esc(count)}</span>
                <strong>${esc(pack.label)}</strong>
                <p>${esc(pack.description)}</p>
                <div class="concept-drill-actions">
                  <a href="${rel(practiceUrlForPack(pack.id), currentUrl)}">Train now</a>
                  <a href="${rel(drillPackUrl(pack), currentUrl)}">Read pack</a>
                </div>
              </article>`;
            })
            .join("")}</div>`
        : ""
    }
    ${
      article.relatedTools || article.relatedHands || relatedPackCards.length
        ? learningPath(currentUrl, [
            ...(article.relatedTools || []).map((url) => ({ title: "Related Tool", description: "Turn the concept into a repeatable drill.", url })),
            ...relatedPackCards.map((pack) => ({ title: `${pack.label} Drill Pack`, description: pack.description, url: drillPackUrl(pack) })),
            ...(article.relatedHands || []).map((url) => ({ title: "Related Hand Review", description: "See the concept inside a real decision point.", url })),
          ])
        : ""
    }
  </section>`;
}

function handStreetTrainingRows(hand) {
  const streetNames = ["Preflop", "Flop", "Turn", "River", "Decision"];
  const source = hand.potByStreet || hand.streets || [];
  return source.slice(0, 6).map((item, index) => {
    const text = String(item);
    const match = text.match(/^([^:]+):\s*(.*)$/);
    const street = match ? match[1] : streetNames[index] || `Street ${index + 1}`;
    const focus = match ? match[2] : text;
    return [street, focus];
  });
}

function handDeepSections(hand, currentUrl) {
  if (!hand.stacks && !hand.potByStreet && !hand.quiz && !hand.decisionTree && !hand.beginnerVsPro && !hand.nextDrills && !hand.relatedDrillPacks && !hand.handTrainingPrescription) return "";
  const relatedPackCards = (hand.relatedDrillPacks || [])
    .map((packId) => practicePacks.find((pack) => pack.id === packId))
    .filter(Boolean);
  const streetRows = handStreetTrainingRows(hand);
  return `<section class="deep-learning" aria-label="Deep hand review">
    ${hand.stacks ? `<h2>Hand Setup</h2><p>${hand.stacks}</p>` : ""}
    ${streetRows.length ? `<h2>Street-by-Street Training Map</h2>${dataTable(["Street", "Training focus"], streetRows, "data-table mini-data-table street-training-table")}` : ""}
    ${hand.potByStreet ? `<h2>Pot and Sizing</h2><ol>${hand.potByStreet.map((item) => `<li>${item}</li>`).join("")}</ol>` : ""}
    ${hand.rangeByStreet ? `<h2>Range Changes by Street</h2><ol>${hand.rangeByStreet.map((item) => `<li>${item}</li>`).join("")}</ol>` : ""}
    ${hand.handTrainingPrescription ? `<h2>Hand-to-Drill Prescription</h2>${dataTable(["Step", "What to do next"], hand.handTrainingPrescription, "data-table mini-data-table")}` : ""}
    ${
      hand.decisionTree
        ? `<h2>Decision Tree</h2><div class="concept-map-grid">${hand.decisionTree.map(([node, note]) => `<article><strong>${node}</strong><p>${note}</p></article>`).join("")}</div>`
        : ""
    }
    ${
      hand.beginnerVsPro
        ? `<h2>Beginner Thought vs Professional Thought</h2><div class="concept-matrix">${hand.beginnerVsPro.map(([node, beginner, pro]) => `<article><strong>${node}</strong><p><b>Beginner:</b> ${beginner}</p><p><b>Professional:</b> ${pro}</p></article>`).join("")}</div>`
        : ""
    }
    ${hand.alternatives ? `<h2>Alternative Lines</h2><ul>${hand.alternatives.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    ${
      hand.exploitTable
        ? `<h2>Exploit Adjustment Table</h2><div class="comparison-table">${hand.exploitTable.map(([type, plan]) => `<div><strong>${type}</strong><span>${plan}</span></div>`).join("")}</div>`
        : ""
    }
    ${
      hand.nextDrills
        ? `<h2>Next Drills</h2><div class="concept-map-grid">${hand.nextDrills.map((item) => `<article><strong>${item.title}</strong><p>${item.description}</p>${item.url ? `<a class="secondary-action" href="${rel(item.url, currentUrl)}">Open Drill</a>` : ""}</article>`).join("")}</div>`
        : ""
    }
    ${
      relatedPackCards.length
        ? `<h2>Train This Hand</h2><div class="drill-pack-seo-grid concept-drill-grid">${relatedPackCards
            .map((pack) => {
              const count = pack.dynamic ? "Local queue" : `${drillPackSpots(pack).length} spots`;
              return `<article class="drill-pack-seo-card concept-drill-card">
                <span>${esc(count)}</span>
                <strong>${esc(pack.label)}</strong>
                <p>${esc(pack.description)}</p>
                <div class="concept-drill-actions">
                  <a href="${rel(practiceUrlForPack(pack.id), currentUrl)}">Train now</a>
                  <a href="${rel(drillPackUrl(pack), currentUrl)}">Read pack</a>
                </div>
              </article>`;
            })
            .join("")}</div>`
        : ""
    }
    ${hand.quiz ? `<div class="training-question"><strong>Interactive Question</strong><p>${hand.quiz.question}</p><button class="tool-button reveal-answer" type="button">Show Answer</button><p class="hidden-answer" hidden>${hand.quiz.answer}</p></div>` : ""}
  </section>`;
}

function handRankToolPanel() {
  return `<article class="tool-panel" aria-labelledby="rank-title">
    <h2 id="rank-title">Hand Rank Checker</h2>
    <p>Enter 5 to 7 cards and find the best five-card poker hand. This tool teaches hand rankings, not equity.</p>
    <div class="tool-row"><label for="card-input">Cards</label><input id="card-input" type="text" value="As Ks Qs Js Ts" autocomplete="off" /></div>
    <p class="hint">Format: As Ks Qs Js Ts. Ranks: A/K/Q/J/T/9. Suits: s/h/d/c.</p>
    <button class="tool-button" id="check-hand" type="button">Check Hand</button>
    <output class="tool-result" id="hand-result">Royal Flush: A♠ K♠ Q♠ J♠ T♠</output>
  </article>`;
}

function potOddsToolPanel() {
  return `<article class="tool-panel" aria-labelledby="odds-title">
    <h2 id="odds-title">Pot Odds Calculator</h2>
    <p>Enter the current pot, villain bet, and call amount to calculate the required equity.</p>
    <p class="formula">Formula: required equity = call amount / (current pot + villain bet + call amount)</p>
    <div class="number-grid">
      <label>Current Pot<input id="pot-size" type="number" min="0" step="1" value="100" /></label>
      <label>Villain Bet<input id="bet-size" type="number" min="0" step="1" value="50" /></label>
      <label>Call Amount<input id="call-size" type="number" min="0" step="1" value="50" /></label>
    </div>
    <button class="tool-button" id="calculate-odds" type="button">Calculate Pot Odds</button>
    <output class="tool-result" id="odds-result">Final pot 200. Required equity 25.0%.</output>
  </article>`;
}

function dailyHandToolPanel(currentUrl = "/tools/") {
  const hand = dailyHands[0];
  const relatedDrills = dailyHands
    .slice(1, 4)
    .map((item) => `<li><strong>${esc(item.title)}</strong><span>${esc(item.tags?.slice(0, 3).join(" / ") || "Decision drill")}</span></li>`)
    .join("");
  return `<article class="tool-panel training-tool daily-hand-panel" aria-labelledby="daily-title">
    <div class="tool-panel-media">${responsiveImage(assets.dailyHand, currentUrl, "tool-illustration")}</div>
    <h2 id="daily-title">15-Minute Daily Workout</h2>
    <p>Train one main hand, review the score tier, tag the mistake, then move into a small related drill. Offline study only; not real-time play assistance.</p>
    <div class="daily-hand-widget" data-tool="daily-hand">
      ${dataScript("daily-hand-data", dailyHands)}
      <div class="daily-workout-command" aria-live="polite">
        <article><span>Workout Streak</span><strong id="daily-workout-streak">0 days</strong><p>Completed days in this browser.</p></article>
        <article><span>Today Status</span><strong id="daily-workout-status">Not started</strong><p id="daily-workout-status-note">Answer the main hand first.</p></article>
        <article><span>Today's Focus</span><strong id="daily-workout-focus">Decision drill</strong><p id="daily-workout-focus-note">One spot, one leak, one route.</p></article>
      </div>
      <div class="daily-workout-steps" aria-label="Daily workout steps">
        <span data-workout-step="read">01 Read setup</span>
        <span data-workout-step="main">02 Main hand</span>
        <span data-workout-step="micro">03 Mini-drills</span>
        <span data-workout-step="route">04 Next route</span>
      </div>
      <div class="daily-workout-meter" aria-label="Daily workout progress">
        <i id="daily-workout-meter-bar"></i>
      </div>
      <div class="hand-situation">
        <div class="daily-hand-nav">
          <button class="secondary-action inline-action" id="daily-prev-hand" type="button">Previous Spot</button>
          <span id="daily-hand-index">Today</span>
          <button class="secondary-action inline-action" id="daily-next-hand" type="button">Next Spot</button>
        </div>
        <strong id="daily-hand-title">${esc(hand.title)}</strong>
        <p id="daily-hand-subtitle">${esc(hand.subtitle)}</p>
        <div class="hand-board mini-board" id="daily-hand-board">${renderCards([...(hand.hero || []), ...(hand.board || [])])}</div>
        <p class="hint" id="daily-hand-context">${esc(hand.villain)} ${esc(hand.pot)}</p>
        <p class="practice-question" id="daily-hand-question">${esc(hand.question || "Hero acts. What is the best training line?")}</p>
      </div>
      <div class="quiz-options" id="daily-hand-options"></div>
      <div class="smart-score-card" id="daily-hand-score" hidden>
        <span>Smart Score</span>
        <strong>0</strong>
        <div class="score-track"><i></i></div>
        <p>Choose an action to create a score tier.</p>
      </div>
      <output class="tool-result" id="daily-hand-result">Choose an action to see score, leak label, baseline, exploit adjustment, next plan, and recommended next drill.</output>
      <div class="daily-related-box">
        <strong>Related mini-drills after today's hand</strong>
        <ul id="daily-related-drills">${relatedDrills}</ul>
      </div>
      <div class="daily-route-panel" id="daily-route-panel">
        <strong>Finish the 15-minute loop</strong>
        <p id="daily-route-copy">After the main hand, run two mini-drills, then queue a Practice pack or build one Analyze report.</p>
        <div class="training-action-row">
          <a class="primary-action" id="daily-practice-route" href="/practice/">Open Practice Pack</a>
          <a class="secondary-action" id="daily-analyze-route" href="/analyze/">Analyze One Hand</a>
          <a class="secondary-action" id="daily-progress-route" href="/progress/">View Progress</a>
        </div>
        <div class="training-action-row">
          <button class="secondary-action" id="daily-review-note" type="button">I Wrote One Review Note</button>
          <button class="tool-button" id="daily-complete-workout" type="button">Mark 15-Min Workout Complete</button>
        </div>
      </div>
    </div>
  </article>`;
}

function preflopRangeToolPanel() {
  return `<article class="tool-panel training-tool" aria-labelledby="range-title">
    <h2 id="range-title">Preflop Range Finder</h2>
    <p>Choose a position and review basic open, defense, and 3-bet training ranges. These are study baselines, not fixed answers.</p>
    ${dataScript("preflop-range-data", preflopRanges)}
    ${dataTable(
      ["Position", "Default Job", "Pressure Risk"],
      [
        ["UTG / MP", "Enter with durable hands and avoid domination", "Too many players can 3-bet or call behind"],
        ["CO / BTN", "Use position to widen playable opens", "Blinds can fight back if you steal too much"],
        ["SB / BB", "Respect out-of-position realization", "Good price does not make every hand profitable"],
      ],
      "data-table mini-data-table",
    )}
    <div class="tool-row"><label for="range-position">Position</label><select id="range-position"></select></div>
    <div class="range-output" id="range-output"></div>
  </article>`;
}

function potOddsTrainerPanel() {
  return `<article class="tool-panel training-tool" aria-labelledby="odds-trainer-title">
    <h2 id="odds-trainer-title">Pot Odds Trainer</h2>
    <p>Solve short pot odds drills until required equity becomes automatic.</p>
    ${dataScript("pot-odds-trainer-data", potOddsTrainer)}
    <div class="drill-card" id="pot-odds-drill"></div>
    <div class="tool-row"><label for="pot-odds-answer">Your Answer (%)</label><input id="pot-odds-answer" type="text" inputmode="decimal" autocomplete="off" value="25" /></div>
    <button class="tool-button" id="check-pot-odds" type="button">Check Answer</button>
    <button class="secondary-action inline-action" id="next-pot-odds" type="button">Next Drill</button>
    <output class="tool-result" id="pot-odds-trainer-result">Complete a drill to see the explanation.</output>
  </article>`;
}

function playerTypeTestPanel() {
  return `<article class="tool-panel training-tool" aria-labelledby="player-test-title">
    <h2 id="player-test-title">Player Type Test</h2>
    <p>Answer 10 questions to identify your current training tendency.</p>
    ${dataScript("player-type-test-data", playerTypeTest)}
    <div class="player-test" id="player-type-test"></div>
    <output class="tool-result" id="player-type-result">Finish the test to see your training recommendation.</output>
  </article>`;
}

function rangeTrainerPanel() {
  const matrixOptions = Object.values(preflopMatrices)
    .map((matrix) => `<option value="${esc(matrix.id)}">${esc(matrix.title)}</option>`)
    .join("");
  return `<article class="tool-panel training-tool range-trainer-panel" aria-labelledby="range-trainer-title">
    <h2 id="range-trainer-title">Range Trainer</h2>
    <p>Practice one preflop decision at a time, edit a local 13x13 range, and compare your version against a conservative beginner baseline. Offline study only. Not a solver. Not real-time play assistance. Progress and custom ranges stay in local browser storage only.</p>
    ${dataScript("range-trainer-data", rangeTrainerSpots)}
    ${dataScript("preflop-matrix-data", preflopMatrices)}
    <div class="trainer-console" id="range-trainer">
      <div class="range-challenge-card" id="range-daily-challenge">
        <div>
          <span>Daily Preflop Discipline</span>
          <strong>Five range decisions, one clean habit.</strong>
          <p>Today&apos;s challenge is generated locally from the current drill library and saved only in this browser.</p>
        </div>
        <button class="tool-button" id="start-range-challenge" type="button">Start Today&apos;s Challenge</button>
      </div>
      <div class="drill-card" id="range-trainer-spot"></div>
      <div class="range-editor-toolbar" aria-label="Range editor controls">
        <label>Matrix<select id="range-matrix-select">${matrixOptions}</select></label>
        <div class="range-action-palette" role="group" aria-label="Choose matrix action">
          <button class="matrix-action-button is-active matrix-raise" type="button" data-range-paint="raise">Raise</button>
          <button class="matrix-action-button matrix-call" type="button" data-range-paint="call">Call</button>
          <button class="matrix-action-button matrix-three-bet" type="button" data-range-paint="three-bet">3-Bet</button>
          <button class="matrix-action-button matrix-fold" type="button" data-range-paint="fold">Fold</button>
        </div>
        <button class="secondary-action inline-action" id="toggle-range-editor" type="button">Edit Matrix</button>
        <button class="secondary-action inline-action" id="save-custom-range" type="button">Save Custom</button>
        <button class="secondary-action inline-action" id="reset-custom-range" type="button">Reset Custom</button>
      </div>
      <div class="range-matrix-shell" id="range-trainer-matrix" aria-label="Preflop matrix"></div>
      <div class="range-compare-panel" id="range-compare-panel">
        <strong>Range Comparison</strong>
        <p>Choose a matrix to compare your browser-local custom range with the beginner baseline.</p>
      </div>
      <div class="range-shape-panel" id="range-shape-panel">
        ${dataTable(
          ["Hand Bucket", "Baseline", "Your Range", "Coach Cue"],
          [
            ["Pairs", "0", "0", "Pairs need position, stack depth, and response plans."],
            ["Suited Ax", "0", "0", "Suited aces gain value from blockers and nut-flush potential."],
            ["Offsuit Broadways", "0", "0", "Watch domination when ranges behind are strong."],
          ],
          "data-table mini-data-table",
        )}
      </div>
      <div class="range-vs-range-panel" id="range-vs-range-panel">
        <strong>Range-vs-Range Shape Preview</strong>
        <p>Select or edit a matrix to compare broad range shape against a common opposing range. This is a teaching visual, not solver equity.</p>
      </div>
      <div class="quiz-options" id="range-trainer-options"></div>
      <div class="smart-score-card compact-score" id="range-trainer-score" hidden>
        <span>Smart Score</span>
        <strong>0</strong>
        <div class="score-track"><i></i></div>
        <p>Complete a range decision to create a score.</p>
      </div>
      <output class="tool-result" id="range-trainer-result">Choose an action to see the preflop review.</output>
      <button class="secondary-action inline-action" id="next-range-spot" type="button">Next Spot</button>
    </div>
  </article>`;
}

function handReviewBuilderPanel() {
  return `<article class="tool-panel training-tool review-builder-panel" aria-labelledby="review-builder-title">
    <h2 id="review-builder-title">Hand Review Builder</h2>
    <p>Turn a messy hand memory into a structured review. Nothing is uploaded; the draft stays in this browser.</p>
    <div class="review-form-grid">
      <label>Game Type<select id="review-game-type"><option>6-max cash</option><option>MTT</option><option>SNG</option><option>Home study hand</option></select></label>
      <label>Effective Stack<input id="review-stack" type="text" value="100BB" autocomplete="off" /></label>
      <label>Hero Position<select id="review-position"><option>BTN</option><option>CO</option><option>MP</option><option>UTG</option><option>SB</option><option>BB</option></select></label>
      <label>Hero Hand<input id="review-hand" type="text" value="AJs" autocomplete="off" /></label>
      <label>Board<input id="review-board" type="text" value="A72r / 9h / 2d" autocomplete="off" /></label>
      <label>Villain Type<select id="review-villain"><option>Calling station</option><option>Nit</option><option>Maniac</option><option>Regular</option><option>Unknown</option></select></label>
    </div>
    <label class="wide-label">Action Line<textarea id="review-line" rows="5">BTN opens 2.5BB, BB calls. Flop A72r. BB checks, Hero bets small, BB calls. Turn 9h. BB checks, Hero bets, BB calls. River 2d. BB checks.</textarea></label>
    <label class="wide-label">Question<textarea id="review-question" rows="3">Can Hero value bet river, and what changes if BB check-raises?</textarea></label>
    <button class="tool-button" id="build-review" type="button">Build Review Template</button>
    <button class="secondary-action inline-action" id="save-review-draft" type="button">Save Draft Locally</button>
    <div class="review-output" id="review-builder-output">
      <strong>Your structured review will appear here.</strong>
      <p>Use it after a session, away from the table, to separate baseline strategy from exploit adjustment.</p>
    </div>
  </article>`;
}

function analyzeLitePanel() {
  return `<section class="section analyze-lite-section" aria-labelledby="analyze-lite-title">
    ${dataScript("analyze-examples-data", analyzeExamples)}
    ${dataScript("analyze-practice-packs-data", practicePacks)}
    <div class="section-heading">
      <p class="eyebrow">Analyze Lite 2.0</p>
      <h2 id="analyze-lite-title">Turn a hand into a coach-style review report.</h2>
    </div>
    <div class="analyze-command-grid" aria-label="Analyze Lite local review metrics">
      <article><span>Saved Reports</span><strong id="analyze-command-reports">0</strong><p>Browser-local hand reviews.</p></article>
      <article><span>Input Quality</span><strong id="analyze-command-quality">0%</strong><p>How complete this review is.</p></article>
      <article><span>Likely Leak</span><strong id="analyze-command-leak">Not built</strong><p>Detected after report build.</p></article>
      <article><span>Leak Weight</span><strong id="analyze-command-weight">Not built</strong><p>Heuristic study priority.</p></article>
      <article><span>Next Pack</span><strong id="analyze-command-pack">Practice</strong><p>Training route for this hand.</p></article>
    </div>
    <div class="analyze-shell">
      <article class="analyze-form-panel" aria-labelledby="analyze-form-title">
        <div class="analyze-samples">
          <strong id="analyze-form-title">Load a sample or enter your hand</strong>
          <div id="analyze-sample-buttons"></div>
        <div class="analyze-method-strip">
          <span>Review after the session</span>
          <span>Describe the decision node</span>
          <span>Estimate the leak weight</span>
          <span>Train the linked pack</span>
        </div>
        </div>
        <div class="review-form-grid analyze-form-grid">
          <label>Game Type<select id="analyze-game-type"><option>6-max cash</option><option>MTT</option><option>SNG</option><option>Home study hand</option></select></label>
          <label>Effective Stack<input id="analyze-stack" type="text" value="100BB" autocomplete="off" /></label>
          <label>Pot Type<select id="analyze-pot-type"><option>Single-raised pot</option><option>3-bet pot</option><option>4-bet pot</option><option>Blind vs blind</option><option>Multiway pot</option></select></label>
          <label>Hero Position<select id="analyze-hero-position"><option>BTN</option><option>CO</option><option>MP</option><option>UTG</option><option>SB</option><option>BB</option></select></label>
          <label>Villain Position<select id="analyze-villain-position"><option>BB</option><option>SB</option><option>BTN</option><option>CO</option><option>MP</option><option>UTG</option></select></label>
          <label>Hero Hand<input id="analyze-hero-hand" type="text" value="AJs" autocomplete="off" /></label>
          <label>Board / Runout<input id="analyze-board" type="text" value="Ad 7c 2s / 9h / 2d" autocomplete="off" /></label>
          <label>Villain Type<select id="analyze-villain-type"><option>Calling station</option><option>Nit</option><option>Maniac</option><option>Regular</option><option>Passive player</option><option>Unknown</option></select></label>
          <label>Result<input id="analyze-result-input" type="text" value="Hero bet river and faced a call." autocomplete="off" /></label>
        </div>
        <div class="street-input-grid">
          <label>Preflop<textarea id="analyze-preflop" rows="3">BTN opens 2.5BB, BB calls.</textarea></label>
          <label>Flop<textarea id="analyze-flop" rows="3">Flop Ad 7c 2s. BB checks, Hero bets small, BB calls.</textarea></label>
          <label>Turn<textarea id="analyze-turn" rows="3">Turn 9h. BB checks, Hero bets around 70% pot, BB calls.</textarea></label>
          <label>River<textarea id="analyze-river" rows="3">River 2d. BB checks. Hero considers a thin value bet.</textarea></label>
        </div>
        <label class="wide-label">Main Question<textarea id="analyze-question" rows="3">Can Hero value bet river, and what changes if BB check-raises?</textarea></label>
        <div class="analyze-actions">
          <button class="tool-button" id="build-analyze-report" type="button">Build Analyze Report</button>
          <button class="secondary-action inline-action" id="save-analyze-report" type="button">Save Report Locally</button>
          <button class="secondary-action inline-action" id="queue-analyze-pack" type="button">Queue Drill Pack</button>
          <button class="secondary-action inline-action" id="copy-analyze-report" type="button">Copy Report</button>
          <output class="tool-result analyze-action-result" id="analyze-action-result">Build a report before saving or copying.</output>
        </div>
      </article>
      <aside class="analyze-report-panel" aria-labelledby="analyze-report-title">
        <div class="analyze-report-header">
          <span>Generated Report</span>
          <h3 id="analyze-report-title">Analyze report preview</h3>
          <p>Build a report to separate baseline, exploit adjustment, leak label, and next drill.</p>
        </div>
        <div id="analyze-report-output" class="analyze-report-output">
          <strong>No report yet.</strong>
          <p>Use Analyze Lite after a session, away from the table. It is not a real-time assistant or solver output.</p>
        </div>
        <div class="analyze-saved">
          <strong>Saved Local Reports</strong>
          <div id="analyze-saved-list">No saved reports in this browser yet.</div>
        </div>
      </aside>
    </div>
  </section>`;
}

function progressBackupPanel() {
  return `<section class="progress-backup-panel" aria-labelledby="progress-backup-title">
    <div>
      <p class="eyebrow">Browser-Local Backup</p>
      <h3 id="progress-backup-title">Your progress lives in this browser.</h3>
      <p>Export a backup before clearing browser data or switching devices. Importing a backup replaces only Smart Poker Lab local training keys. Optional cloud sync is a future feature, not active today.</p>
    </div>
    <div class="progress-backup-actions">
      <button class="tool-button" id="progress-export-backup" type="button">Export Backup JSON</button>
      <label class="secondary-action progress-import-label" for="progress-import-backup">Import Backup</label>
      <input id="progress-import-backup" class="sr-only" type="file" accept="application/json,.json" />
      <button class="secondary-action" id="progress-copy-backup-summary" type="button">Copy Backup Summary</button>
      <output class="tool-result" id="progress-backup-result">No backup action yet. Nothing is uploaded.</output>
    </div>
  </section>`;
}

function leakDashboardPanel() {
  return `<article class="tool-panel training-tool leak-dashboard-panel" aria-labelledby="leak-dashboard-title">
    ${dataScript("progress-practice-spots-data", practiceSpots)}
    ${dataScript("progress-practice-packs-data", practicePacks)}
    <h2 id="leak-dashboard-title">Smart Score and Leak Dashboard</h2>
    <p>Review your browser-local Study, Practice, Analyze, drill-pack, and 30-day plan activity. This report is a study guide, not a claim about real-money performance.</p>
    <div class="dashboard-onboarding" id="dashboard-onboarding">
      <strong>Your first 3-minute loop</strong>
      <p>Complete 1 Daily Hand, 3 Pot Odds drills, and 1 Analyze Lite note. After that, this page turns into your first Smart Score training portrait with a top leak and next drill.</p>
      <div class="training-action-row">
        <a class="primary-action" href="/tools/daily-hand/">Start Daily Workout</a>
        <a class="secondary-action" href="/tools/pot-odds-trainer/">Do Pot Odds</a>
        <a class="secondary-action" href="/analyze/">Save Review Note</a>
      </div>
    </div>
    <div class="dashboard-grid dashboard-grid-v2" id="leak-dashboard">
      <div class="dashboard-card"><span>Average Smart Score</span><strong id="dashboard-score">No data</strong><p id="dashboard-score-note">Complete a scored drill first.</p></div>
      <div class="dashboard-card"><span>Training Decisions</span><strong id="dashboard-count">0</strong><p>Practice and Analyze events in this browser.</p></div>
      <div class="dashboard-card"><span>30-Day Plan</span><strong id="dashboard-plan">0 / 30</strong><p>Local checkoff progress.</p></div>
      <div class="dashboard-card"><span>Study Spots</span><strong id="dashboard-study">0</strong><p>Study Mode views saved locally.</p></div>
      <div class="dashboard-card"><span>Analyze Reports</span><strong id="dashboard-analyze">0</strong><p>Saved local hand reports.</p></div>
      <div class="dashboard-card"><span>Routine Score</span><strong id="dashboard-routine">0%</strong><p id="dashboard-routine-note">Build the full loop.</p></div>
      <div class="dashboard-card"><span>Current Streak</span><strong id="dashboard-streak">0</strong><p>Consecutive Practice scores at 80 or higher.</p></div>
      <div class="dashboard-card"><span>Best Streak</span><strong id="dashboard-best-streak">0</strong><p>Best browser-local Practice streak.</p></div>
      <div class="dashboard-card"><span>Review Queue</span><strong id="dashboard-review-queue">0</strong><p>Low-score spots ready for replay.</p></div>
      <div class="dashboard-card"><span>7-Day Rhythm</span><strong id="dashboard-weekly">0</strong><p>Training actions in the last 7 days.</p></div>
      <div class="dashboard-card"><span>Study Mastery</span><strong id="dashboard-study-mastered">0</strong><p>Study Mode spots marked as studied.</p></div>
      <div class="dashboard-card"><span>Study Queue</span><strong id="dashboard-study-queue">0</strong><p>Study spots routed into Practice.</p></div>
    </div>
    <section class="dashboard-v2-shell" aria-labelledby="dashboard-v2-title">
      <div class="section-heading compact-heading">
        <p class="eyebrow">Dashboard 2.0</p>
        <h3 id="dashboard-v2-title">Strength map, badges, spaced review, and share card.</h3>
      </div>
      <div class="dashboard-v2-grid">
        <section class="dashboard-v2-card radar-card">
          <div class="progress-panel-head"><span>Skill Radar</span><strong>Training dimensions</strong></div>
          <div class="radar-shell" id="dashboard-radar">Complete scored drills to build your radar.</div>
          <div class="radar-legend" id="dashboard-radar-legend"></div>
        </section>
        <section class="dashboard-v2-card">
          <div class="progress-panel-head"><span>Badges</span><strong>Habit milestones</strong></div>
          <div class="badge-grid" id="dashboard-badges">Complete one scored drill to unlock badges.</div>
        </section>
        <section class="dashboard-v2-card">
          <div class="progress-panel-head"><span>Spaced Review</span><strong>Due low-score spots</strong></div>
          <div class="spaced-review-list" id="dashboard-spaced-review">No low-score reviews due yet.</div>
          <button class="secondary-action inline-action" id="dashboard-queue-spaced-review" type="button">Queue Due Review</button>
        </section>
        <section class="dashboard-v2-card share-card-panel">
          <div class="progress-panel-head"><span>Share Card</span><strong>Weekly training report</strong></div>
          <div class="share-card-preview" id="dashboard-share-card">Complete a drill to generate a share card.</div>
          <div class="training-action-row">
            <button class="secondary-action" id="dashboard-copy-share-card" type="button">Copy Share Text</button>
            <button class="secondary-action" id="dashboard-download-share-card" type="button">Download SVG Card</button>
          </div>
        </section>
      </div>
    </section>
    <div class="progress-report-layout">
      <section class="progress-panel progress-panel-wide">
        <div class="progress-panel-head"><span>Weekly Coach</span><strong>7-day training rhythm</strong></div>
        <div class="weekly-coach-grid" id="dashboard-weekly-coach">Complete one Study spot, one Practice decision, and one Analyze report to start the weekly coach.</div>
      </section>
      <section class="progress-panel progress-panel-wide">
        <div class="progress-panel-head"><span>Drill Packs</span><strong>Pack progress</strong></div>
        <div class="dashboard-pack-grid" id="dashboard-pack-progress">No drill-pack progress yet.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Weakest Pack</span><strong>Where to focus next</strong></div>
        <div class="dashboard-weakest-pack" id="dashboard-weakest-pack">Practice one drill pack to unlock pack focus.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Study Queue</span><strong>Sent from Study Mode</strong></div>
        <div class="progress-activity-list" id="dashboard-study-queue-list">No Study spots queued for Practice yet.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Session Focus</span><strong>Practice session state</strong></div>
        <div class="dashboard-session-box" id="dashboard-session-focus">No Practice session data yet.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Continuity</span><strong>Learning loop health</strong></div>
        <div class="dashboard-continuity-box" id="dashboard-continuity">Build activity in Study, Practice, Analyze, and Plan.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Training Loop</span><strong>Action mix</strong></div>
        <div class="progress-action-bars" id="dashboard-action-bars"></div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Score Trend</span><strong>Recent scored decisions</strong></div>
        <div class="score-sparkline" id="dashboard-score-trend">No scored decisions yet.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Leak Priorities</span><strong>What to train next</strong></div>
        <div class="leak-list" id="dashboard-leaks"></div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Recommendation</span><strong>Next best drill</strong></div>
        <div class="review-output dashboard-advice-box" id="dashboard-advice">
          <strong>Next training recommendation</strong>
          <p>Answer a Daily Hand or Range Trainer spot to unlock a personalized suggestion.</p>
        </div>
      </section>
      <section class="progress-panel progress-panel-wide">
        <div class="progress-panel-head"><span>Next Actions</span><strong>Three-step training prescription</strong></div>
        <div class="next-action-grid" id="dashboard-next-actions">Complete one scored drill to unlock a three-step prescription.</div>
      </section>
      <section class="progress-panel progress-panel-wide">
        <div class="progress-panel-head"><span>Next 5 Decisions</span><strong>Pack prescription</strong></div>
        <div class="five-decision-prescription" id="dashboard-five-decisions">Complete one scored drill to unlock a five-spot routine.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Recent Activity</span><strong>Latest local events</strong></div>
        <div class="progress-activity-list" id="dashboard-recent">No local activity yet.</div>
      </section>
      <section class="progress-panel">
        <div class="progress-panel-head"><span>Analyze Reports</span><strong>Saved hand reviews</strong></div>
        <div class="progress-activity-list" id="dashboard-reports">No saved Analyze reports yet.</div>
      </section>
    </div>
    ${progressBackupPanel()}
    <div class="progress-controls">
      <button class="tool-button" id="dashboard-export-summary" type="button">Copy Local Summary</button>
      <button class="secondary-action inline-action" id="dashboard-reset-view" type="button">Refresh Report</button>
      <output class="tool-result" id="dashboard-export-result">Summary stays in this browser until you choose to copy it.</output>
    </div>
  </article>`;
}

function boardTextureAtlasPanel(currentUrl = "/tools/") {
  return `<article class="tool-panel training-tool texture-atlas-panel" aria-labelledby="texture-atlas-title">
    <h2 id="texture-atlas-title">Board Texture Atlas</h2>
    <p>A simplified study report for common flop families. It teaches pattern recognition, not solver output.</p>
    ${dataTable(
      ["Texture", "Baseline Read", "Sizing Bias", "Beginner Risk"],
      boardTextureAtlas.map((item) => [item.family, item.baseline, item.sizing || "Choose size by range and target", item.beginnerMistake]),
      "data-table mini-data-table",
    )}
    <div class="texture-grid">
      ${boardTextureAtlas
        .map(
          (item) => `<article class="texture-card">
            <span>${item.family}</span>
            <h3>${item.title}</h3>
            <p><strong>Range:</strong> ${item.rangeAdvantage}</p>
            <p><strong>Nut advantage:</strong> ${item.nutAdvantage}</p>
            <p><strong>Baseline:</strong> ${item.baseline}</p>
            <p><strong>Calling-station adjust:</strong> ${item.callingStationAdjust}</p>
            <p><strong>Beginner trap:</strong> ${item.beginnerMistake}</p>
            <p><strong>Training prompt:</strong> ${item.trainingPrompt}</p>
            <a href="${rel(item.link, currentUrl)}">Study related page</a>
          </article>`,
        )
        .join("")}
    </div>
  </article>`;
}

const toolDetails = {
  "hand-rank-checker": {
    title: "Texas Hold'em Hand Rank Checker",
    description: "Enter 5 to 7 cards and identify the best five-card poker hand.",
    eyebrow: "Hand Ranking Tool",
    panel: handRankToolPanel,
    faq: [
      { question: "Does this calculate equity?", answer: "No. It identifies the best current five-card hand. Equity calculation belongs to later training tools." },
      { question: "Why enter 5 to 7 cards?", answer: "Texas Hold'em showdown uses the best five-card hand from two hole cards and up to five community cards." },
      { question: "Can this tool be used for gambling advice?", answer: "No. It is only for rules learning and hand review education." },
    ],
  },
  "pot-odds-calculator": {
    title: "Texas Hold'em Pot Odds Calculator",
    description: "Calculate the minimum equity required to call a bet.",
    eyebrow: "Poker Math Tool",
    panel: potOddsToolPanel,
    faq: [
      { question: "What is the formula?", answer: "Required equity = call amount / (current pot + villain bet + call amount)." },
      { question: "Do pot odds mean I must call?", answer: "No. You must also consider ranges, future pressure, implied odds, reverse implied odds, and equity realization." },
      { question: "Is this real-money advice?", answer: "No. It is an education and review tool only." },
    ],
  },
  "daily-hand": {
    title: "Daily Hand Trainer",
    description: "Practice one poker decision point with a clear review of baseline and exploit adjustment.",
    eyebrow: "Daily Training",
    panel: dailyHandToolPanel,
    faq: [
      { question: "Does the trainer save progress?", answer: "It saves answers in this browser only. No account is required." },
      { question: "Is the answer always the only correct line?", answer: "No. It gives the recommended line for the stated assumptions and explains when adjustments matter." },
      { question: "Is this for real-money betting?", answer: "No. It is for poker education only." },
    ],
  },
  "preflop-range": {
    title: "Preflop Range Finder",
    description: "Review basic open, defense, and 3-bet ranges by position.",
    eyebrow: "Preflop Discipline",
    panel: preflopRangeToolPanel,
    faq: [
      { question: "Are these ranges fixed answers?", answer: "No. They are conservative study baselines that must adjust to stack depth, table dynamics, and opponent type." },
      { question: "Why does the same hand change by position?", answer: "Later position has more information and realizes equity more easily." },
      { question: "Does this recommend games or platforms?", answer: "No. It is strictly an education tool." },
    ],
  },
  "pot-odds-trainer": {
    title: "Pot Odds Trainer",
    description: "Solve repeated pot odds drills and build fast required-equity intuition.",
    eyebrow: "Poker Math Drill",
    panel: potOddsTrainerPanel,
    faq: [
      { question: "How is this different from the calculator?", answer: "The calculator solves a number you enter. The trainer gives you drills to build speed." },
      { question: "Does the answer allow rounding?", answer: "Yes. Small rounding differences are fine; the point is the formula." },
      { question: "Are pot odds enough to call?", answer: "No. Ranges and future streets still matter." },
    ],
  },
  "player-type-test": {
    title: "Poker Player Type Test",
    description: "Identify whether your current leak is calling too much, folding too much, over-bluffing, result orientation, or half-GTO thinking.",
    eyebrow: "Player Type Training",
    panel: playerTypeTestPanel,
    faq: [
      { question: "Where is the result saved?", answer: "Only in this browser through local storage." },
      { question: "Does this measure my real skill level?", answer: "No. It identifies a training tendency, not your complete poker ability." },
      { question: "Does this involve gambling services?", answer: "No. It is an education-only self-assessment." },
    ],
  },
  "range-trainer": {
    title: "Preflop Range Trainer 2.0",
    description: "Practice preflop decisions, edit local 13x13 matrices, compare custom ranges with beginner baselines, and run a daily preflop challenge.",
    eyebrow: "Range Lab",
    panel: rangeTrainerPanel,
    faq: [
      { question: "Is this a solver?", answer: "No. It is a simplified study trainer that teaches baseline decisions, common leaks, and range-shape comparison." },
      { question: "Where are custom ranges saved?", answer: "Only in this browser through local storage. They are included when you export a Progress backup." },
      { question: "Are the custom comparison bars equity calculations?", answer: "No. They compare range shape and action distribution, not solver EV or exact equity." },
      { question: "Can I use this during real-time play?", answer: "No. It is intended for offline study and review only." },
    ],
  },
  "hand-review-builder": {
    title: "Hand Review Builder",
    description: "Create a structured offline hand-review template from stack, position, board, action line, and opponent type.",
    eyebrow: "Analyze Lite",
    panel: handReviewBuilderPanel,
    faq: [
      { question: "Does this upload hand histories?", answer: "No. The draft is generated in the browser and can be saved locally only." },
      { question: "Does it provide a GTO solution?", answer: "No. It organizes the review into baseline questions, exploit adjustments, and next drills." },
      { question: "Is this real-time assistance?", answer: "No. It is for post-session education and offline review." },
    ],
  },
  "leak-dashboard": {
    title: "Smart Score Leak Dashboard",
    description: "Review your local training score, recurring mistake labels, and next recommended drills.",
    eyebrow: "Progress Report",
    panel: leakDashboardPanel,
    faq: [
      { question: "Is there an account system?", answer: "No. The dashboard reads only browser-local training activity." },
      { question: "Does the score measure real poker skill?", answer: "No. It is a study feedback score for Smart Poker Lab drills only." },
      { question: "Does it promise improvement or profit?", answer: "No. It suggests study topics and does not make result claims." },
    ],
  },
  "board-texture-atlas": {
    title: "Board Texture Atlas",
    description: "Study common flop families and connect board texture to range advantage, c-bet frequency, and sizing discipline.",
    eyebrow: "Study Report",
    panel: boardTextureAtlasPanel,
    faq: [
      { question: "Is this copied from a solver database?", answer: "No. It is an original educational summary of common board-texture patterns." },
      { question: "Should I memorize every board?", answer: "No. Use the atlas to learn patterns and ask better review questions." },
      { question: "Is this gambling advice?", answer: "No. It is strategy education for offline study." },
    ],
  },
};

const resourceDetails = {
  "preflop-cheat-sheet": {
    title: "6-Max Preflop Range Cheat Sheet",
    description: "A beginner-friendly printable study sheet for UTG, MP, CO, BTN, SB, and BB preflop discipline.",
    eyebrow: "Printable Study Sheet",
    sections: [
      {
        title: "Open-Range Reminder",
        items: [
          "UTG: start tight with strong pairs, strong Ax, suited broadways, and a few high-quality suited connectors.",
          "MP: add a little width, but keep dominated offsuit hands under control.",
          "CO: begin stealing blinds, while respecting an active button.",
          "BTN: open widest because position helps you realize equity.",
          "SB: remember that cheap does not mean easy; you often play out of position.",
          "BB: defend by opener position, not by price alone.",
        ],
      },
      {
        title: "Before You Enter the Pot",
        items: [
          "What position am I in?",
          "Who has already raised or called?",
          "Will this hand make strong top pair, strong draws, or dominated one-pair spots?",
          "If I face a 3-bet, do I know my continue plan?",
        ],
      },
      {
        title: "Common Beginner Leak",
        items: [
          "Playing weak Ax from early position.",
          "Calling 3-bets just to see a flop.",
          "Treating suited trash as automatically playable.",
          "Ignoring the players still left to act.",
        ],
      },
      {
        title: "How to Train This Sheet",
        items: [
          "Run 10 Range Trainer decisions after reading the matrix.",
          "Write down every hand you wanted to play but folded.",
          "Compare missed hands against the matrix before changing your range.",
          "Use Progress to identify whether your leak is too loose, too tight, or position-blind.",
        ],
      },
    ],
    links: ["/tools/preflop-range/", "/preflop/"],
  },
  "pot-odds-cheat-sheet": {
    title: "Pot Odds and Required Equity Cheat Sheet",
    description: "A printable poker math card for required equity, final pot, and common bet sizes.",
    eyebrow: "Poker Math Sheet",
    sections: [
      {
        title: "Core Formula",
        items: [
          "Required equity = call amount / final pot after calling.",
          "Final pot = current pot + villain bet + your call.",
          "Example: pot 100, villain bets 50, you call 50. Final pot is 200, so required equity is 25%.",
        ],
      },
      {
        title: "Quick Bet-Size Benchmarks",
        items: [
          "Facing 1/3 pot: you need about 20% equity.",
          "Facing 1/2 pot: you need about 25% equity.",
          "Facing 2/3 pot: you need about 28.6% equity.",
          "Facing pot: you need about 33.3% equity.",
        ],
      },
      {
        title: "Do Not Stop at the Number",
        items: [
          "Check whether your equity can actually realize.",
          "Consider implied odds and reverse implied odds.",
          "Ask whether future streets will create more pressure.",
          "Use ranges, not only your exact hand.",
        ],
      },
      {
        title: "Practice Routine",
        items: [
          "Do five quick drills before reading hand reviews.",
          "Say the formula out loud: call amount divided by final pot after calling.",
          "After the number, write one range reason to call or fold.",
          "Replay every pot-odds mistake from the Review Queue.",
        ],
      },
    ],
    links: ["/tools/pot-odds-trainer/", "/gto/pot-odds-guide/"],
  },
  "training-routine-sheet": {
    title: "30-Day Training Routine Sheet",
    description: "A printable overview of the Smart Poker Lab 30-day beginner-to-review training path.",
    eyebrow: "Training Routine",
    sections: [
      {
        title: "Days 1-5: Rules Foundation",
        items: ["Learn action order.", "Practice hand rankings.", "Write one rule question after each session."],
      },
      {
        title: "Days 6-12: Preflop Discipline",
        items: ["Study one position each day.", "Use the range finder.", "Record one hand you tend to overplay."],
      },
      {
        title: "Days 13-17: Pot Math",
        items: ["Do five pot odds drills per day.", "Write the formula from memory.", "Review one close call."],
      },
      {
        title: "Days 18-23: GTO Language",
        items: ["Learn one concept.", "Complete the daily hand.", "Separate baseline from exploit adjustment."],
      },
      {
        title: "Days 24-30: Player Types and Review Habit",
        items: ["Identify opponent tendencies.", "Review one hand with a fixed template.", "End each day with one next-step note."],
      },
      {
        title: "Weekly Review Loop",
        items: [
          "Pick one Daily Workout and one Drill Pack each day.",
          "Save one Analyze Lite report after any session you want to study later.",
          "Use Progress to choose the next pack instead of guessing.",
          "Repeat the weakest pack before adding new theory.",
        ],
      },
    ],
    links: ["/training-plan/", "/tools/daily-hand/"],
  },
};

function resourceConversionPanel(currentUrl) {
  return `<section class="resource-conversion-panel" aria-labelledby="resource-conversion-title">
    <div>
      <p class="eyebrow">Local-Only Resource Loop</p>
      <h2 id="resource-conversion-title">Turn a study sheet into today's training session.</h2>
      <p>Smart Poker Lab does not connect a live email provider or account system in this sprint. You can print a sheet, save interest locally in this browser, then use the linked drills to build a repeatable routine.</p>
      <div class="resource-actions">
        <button class="primary-action waitlist-button" data-interest="resource-pack" type="button">Save Resource Interest</button>
        <a class="secondary-action" href="${rel("/tools/daily-hand/", currentUrl)}">Start Daily Workout</a>
        <a class="secondary-action" href="${rel("/progress/", currentUrl)}">Open Progress</a>
      </div>
      <output class="tool-result waitlist-result" id="waitlist-result">Interest is saved only in this browser. No account, email upload, or payment flow is active.</output>
    </div>
    ${dataTable(
      ["Resource Step", "Training Action"],
      [
        ["Print", "Keep one sheet beside your study session, not a real-time table."],
        ["Practice", "Run the linked drill pack until the mistake label is clear."],
        ["Review", "Create one Analyze Lite report from an offline hand memory."],
        ["Repeat", "Let Progress recommend the next pack from local activity."],
      ],
      "data-table resource-loop-table",
    )}
  </section>`;
}

function homePage() {
  const currentUrl = "/";
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: brand.name, url: domain, inLanguage: "en", description: brand.description },
      { "@type": "Organization", name: brand.name, url: domain },
    ],
  });

  const body = `<main id="top">
    <section class="hero-section product-hero youth-hero" aria-labelledby="hero-title">
      ${responsiveImage(assets.hero, currentUrl, "hero-bg-image", "eager")}
      <div class="hero-copy">
        <p class="eyebrow">${brand.tagline}</p>
        <h1 id="hero-title">Smart Poker Lab</h1>
        <p class="hero-lede">Offline Texas Hold'em training with visual drills, hand-review reports, and browser-local progress.</p>
        <div class="hero-actions" aria-label="Quick entries">
          <a class="primary-action" href="${rel("/training-plan/day-01/", currentUrl)}">Start 7-Day Challenge</a>
          <button class="secondary-action" type="button" data-open-onboarding>Take Skill Check</button>
          <a class="secondary-action" href="${rel("/tools/daily-hand/", currentUrl)}">Daily Workout</a>
          <a class="secondary-action" href="${rel("/analyze/", currentUrl)}">Analyze a Hand</a>
        </div>
        <div class="hero-metrics" aria-label="Training product highlights">
          <span><strong>4</strong> mode loop</span>
          <span><strong>30</strong> day routine</span>
          <span><strong>${publicPageCount}</strong> study pages</span>
        </div>
        <div class="action-strip" aria-label="Training loop">
          <span>Study</span>
          <span>Practice</span>
          <span>Review</span>
          <span>Progress</span>
        </div>
      </div>
      <div class="hero-floating-card">
        <strong>Today: BTN AJs</strong>
        <span>Range advantage + thin value drill</span>
      </div>
    </section>

    <section class="section persona-start-section" aria-labelledby="persona-start-title">
      <div class="section-heading">
        <p class="eyebrow">Choose a path</p>
        <h2 id="persona-start-title">Start from the decision in front of you.</h2>
      </div>
      <div class="persona-entry persona-start-grid" aria-label="Learning paths">
        <a href="${rel("/tools/daily-hand/", currentUrl)}"><strong>What do I train today?</strong><span>Open the 15-minute Daily Workout</span></a>
        <a href="${rel("/practice/", currentUrl)}"><strong>I want a focused pack</strong><span>Choose preflop, c-bet, river, math, or player-type drills</span></a>
        <a href="${rel("/analyze/", currentUrl)}"><strong>I have a hand to review</strong><span>Build an Analyze Lite report</span></a>
        <a href="${rel("/progress/", currentUrl)}"><strong>Where am I leaking?</strong><span>Check score, queue, and next drill</span></a>
      </div>
    </section>
    
    ${homeTrainingPrescription(currentUrl)}
    ${weeklyTrainingPath(currentUrl)}
    <section class="section cockpit-section" aria-labelledby="cockpit-title">
      <div class="section-heading"><p class="eyebrow">Training Cockpit</p><h2 id="cockpit-title">The Smart Poker Lab loop</h2></div>
      <div class="cockpit-grid">
        <a href="${rel("/study/", currentUrl)}"><span>Study</span><strong>Spot Explorer</strong><p>Browse original baselines by position, board texture, and concept.</p></a>
        <a href="${rel("/practice/", currentUrl)}"><span>Practice</span><strong>Scored Drills</strong><p>Make preflop and postflop decisions with Smart Score feedback.</p></a>
        <a href="${rel("/analyze/", currentUrl)}"><span>Review</span><strong>Analyze Lite</strong><p>Turn a hand memory into a leak-labeled report and next drill.</p></a>
        <a href="${rel("/progress/", currentUrl)}"><span>Progress</span><strong>Training Report</strong><p>See scores, action mix, saved reports, and next drill.</p></a>
      </div>
      <div class="data-insight-card">
        <div>
          <p class="eyebrow">Data Style</p>
          <h3>Every learning surface now has a table or matrix.</h3>
          <p>Instead of only reading paragraphs, users compare the same decision across action, input, feedback, and next habit. This keeps the site closer to a training product than a blog.</p>
        </div>
        ${homeDecisionMatrix()}
      </div>
    </section>
    ${visualLearningStrip(currentUrl)}
    <section class="section daily-preview-section" aria-labelledby="daily-preview-title">
      <div class="section-heading"><p class="eyebrow">Today's Drill</p><h2 id="daily-preview-title">Make the decision first, then review the logic.</h2></div>
      <div class="home-training-grid">
        ${dailyHandToolPanel(currentUrl)}
        <aside class="training-aside">
          <h3>One decision point at a time</h3>
          <p>Hero has A♠J♠ on A♦7♣2♠ versus a calling station. The goal is not to guess one hand; it is to train bet purpose, range advantage, and opponent adjustment.</p>
          <a class="primary-action" href="${rel("/tools/daily-hand/", currentUrl)}">Open Full Trainer</a>
          <a class="secondary-action" href="${rel("/practice/", currentUrl)}">Open Practice Mode</a>
        </aside>
      </div>
    </section>
    <section class="section roadmap-section" id="roadmap" aria-labelledby="roadmap-title">
      <div class="section-heading"><p class="eyebrow">Learning Path</p><h2 id="roadmap-title">From rules player to professional review process</h2></div>
      <div class="roadmap-grid">
        ${["Rules and Hands", "Preflop Ranges", "Pot Math", "GTO Basics", "Player Types", "Hand Review"]
          .map((title, index) => `<article><span>0${index + 1}</span><h3>${title}</h3><p>${["Learn action order, showdown rules, hand rankings, and position.", "Build UTG, MP, CO, BTN, SB, and BB discipline.", "Use pot odds, equity, SPR, and EV before calling.", "Study range advantage, nut advantage, sizing, blockers, and c-bets.", "Identify calling stations, nits, maniacs, over-folders, and over-bluffers.", "Review each street with a fixed structure instead of result emotions."][index]}</p></article>`)
          .join("")}
      </div>
    </section>
    <section class="section resource-section" aria-labelledby="resource-title">
      <div class="section-heading"><p class="eyebrow">Free Resources</p><h2 id="resource-title">Open printable study sheets now.</h2></div>
      <div class="resource-grid">
        ${Object.entries(resourceDetails)
          .map(
            ([slug, resource]) => `<article>
              <strong>${resource.title}</strong>
              <p>${resource.description}</p>
              <div class="resource-actions">
                <a class="primary-action" href="${rel(`/resources/${slug}/`, currentUrl)}">Open Sheet</a>
                <button class="secondary-action waitlist-button" data-interest="${slug}" type="button">Save Interest</button>
              </div>
            </article>`,
          )
          .join("")}
      </div>
      <output class="tool-result waitlist-result" id="waitlist-result">Interest is saved only in this browser. No account or email upload is active yet.</output>
    </section>
    <section class="section hub-section" aria-labelledby="hub-title">
      <div class="section-heading"><p class="eyebrow">Training Tools</p><h2 id="hub-title">Connect articles, tools, and hand reviews in one path.</h2></div>
      ${cardGrid(
        [
          { title: "Daily Hand Trainer", description: "Choose a line, then review baseline and exploit adjustment.", url: "/tools/daily-hand/", icon: "D" },
          { title: "Study Mode", description: "Browse spots by board texture, position, and concept.", url: "/study/", icon: "S" },
          { title: "Range Trainer", description: "Make scored preflop decisions and see your leak label.", url: "/tools/range-trainer/", icon: "R" },
          { title: "Analyze Lite", description: "Convert a hand memory into a structured report and leak label.", url: "/analyze/", icon: "A" },
          { title: "Progress Report", description: "Track local Smart Score, action mix, and recurring leaks.", url: "/progress/", icon: "P" },
          { title: "Board Texture Atlas", description: "Study flop families and c-bet patterns.", url: "/tools/board-texture-atlas/", icon: "B" },
          { title: "Pot Odds Trainer", description: "Drill required equity until it becomes automatic.", url: "/tools/pot-odds-trainer/", icon: "%" },
          { title: "30-Day Training Plan", description: "Daily article, tool, hand review, and reflection task.", url: "/training-plan/", icon: "30" },
          { title: "Anonymous Hand Submission", description: "Format a clean review draft locally before Analyze Lite.", url: "/submit-hand/", icon: "H" },
          { title: "Weekly Challenge", description: "Complete a seven-action routine and copy a shareable study summary.", url: "/weekly-challenge/", icon: "W" },
          { title: "Drill Pack Library", description: "Open focused SEO pages for preflop, value, board texture, river, and math packs.", url: "/drill-packs/", icon: "DP" },
          { title: "Training Library Blueprint", description: "See Phase 5 taxonomy, coverage targets, and drill production standards.", url: "/training-library/", icon: "TL" },
        ],
        currentUrl,
      )}
    </section>
    <section class="section character-section" aria-labelledby="character-title">
      <div class="section-heading"><p class="eyebrow">Comic Cast</p><h2 id="character-title">Each character represents a table mindset.</h2></div>
      <div class="character-showcase">
        ${responsiveImage(assets.characters, currentUrl, "character-sheet")}
        <div class="character-grid">${characters.map((character) => `<article><strong>${character.name}</strong><span>${character.role}</span><p>${character.note}</p><blockquote>${character.tone}</blockquote></article>`).join("")}</div>
      </div>
    </section>
    <section class="section article-section" aria-labelledby="latest-title">
      <div class="section-heading"><p class="eyebrow">Popular Reviews</p><h2 id="latest-title">Start with these six hands.</h2></div>
      <div class="article-grid">${handReviews.slice(0, 6).map((hand) => `<a class="article-card" href="${rel(`/hand-review/${hand.slug}/`, currentUrl)}"><span>${hand.meta.join(" · ")}</span><h3>${hand.title}</h3><p>${hand.description}</p></a>`).join("")}</div>
    </section>
  </main>`;
  return layout({ currentUrl, title: "Comic Poker Training Lab", description: brand.description, body, extraHead: structured });
}

function indexPage({ currentUrl, title, eyebrow, description, items }) {
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
      },
      itemListJsonLd(title, items, articleUrl),
    ],
  });
  const body = `<main>
    <section class="page-hero"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></section>
    
    <section class="section article-section"><div class="article-grid">${items.map((item) => articleCard(item, currentUrl)).join("")}</div></section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function articleLearningPath(article, currentUrl) {
  const sameSection = articles.filter((item) => item.section === article.section && item.slug !== article.slug).slice(0, 2);
  const related = sameSection.length ? sameSection : articles.filter((item) => item.slug !== article.slug).slice(0, 2);
  return learningPath(currentUrl, [
    ...related.map((item) => ({ title: item.title, description: item.description, url: articleUrl(item) })),
    { title: "Open Training Tools", description: "Turn poker concepts into repeatable drills.", url: "/tools/" },
  ]);
}

function articlePage(article) {
  const currentUrl = articleUrl(article);
  const faqs = articleFaq(article);
  const pageTitle = article.seoTitle || article.title;
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        inLanguage: "en",
        author: { "@type": "Organization", name: brand.name },
        publisher: { "@type": "Organization", name: brand.name },
        datePublished: lastmod,
        dateModified: lastmod,
        mainEntityOfPage: `${domain}${currentUrl}`,
      },
      faqJsonLd(faqs),
    ],
  });
  const body = `<main>
    <article class="content-page article-content-page">
      <p class="eyebrow">${article.category} · ${article.level}</p>
      <h1>${article.title}</h1>
      <p class="lead">${article.description}</p>
      <div class="mini-meta">${article.keywords.map((keyword) => `<span>${keyword}</span>`).join("")}<span>Updated: ${lastmod}</span></div>
      ${article.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      ${articleDeepSections(article, currentUrl)}
      <h2>Three Rules to Remember</h2>
      <ul>${article.takeaways.map((item) => `<li>${item}</li>`).join("")}</ul>
      ${faqSection(faqs)}
      ${articleLearningPath(article, currentUrl)}
    </article>
  </main>`;
  return layout({ currentUrl, title: pageTitle, description: article.description, body, extraHead: structured });
}

function handReviewIndex() {
  const currentUrl = "/hand-review/";
  const title = "Texas Hold'em Hand Reviews";
  const description = "Comic-style poker hand reviews for range thinking and betting decisions.";
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
      },
      itemListJsonLd(title, handReviews, (hand) => `/hand-review/${hand.slug}/`),
    ],
  });
  const body = `<main>
    <section class="page-hero hand-review-hero"><p class="eyebrow">Hand Review Library</p><h1>One decision point per hand.</h1><p>Each review breaks down setup, action, beginner thinking, professional logic, GTO baseline, and exploit adjustment.</p></section>
    
    <section class="section article-section"><div class="article-grid">${handReviews.map((hand) => `<a class="article-card" href="${rel(`/hand-review/${hand.slug}/`, currentUrl)}"><span>${hand.meta.join(" · ")}</span><h3>${hand.title}</h3><p>${hand.description}</p></a>`).join("")}</div></section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function handReviewPage(hand) {
  const currentUrl = `/hand-review/${hand.slug}/`;
  const faqs = handFaq(hand);
  const pageTitle = hand.seoTitle || hand.title;
  const relatedPackCards = (hand.relatedDrillPacks || [])
    .map((packId) => practicePacks.find((pack) => pack.id === packId))
    .filter(Boolean);
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: hand.title,
        description: hand.description,
        inLanguage: "en",
        author: { "@type": "Organization", name: brand.name },
        publisher: { "@type": "Organization", name: brand.name },
        datePublished: lastmod,
        dateModified: lastmod,
        mainEntityOfPage: `${domain}${currentUrl}`,
      },
      faqJsonLd(faqs),
    ],
  });
  const body = `<main>
    <article class="content-page hand-review-content-page">
      <p class="eyebrow">Hand Review</p>
      <h1>${hand.title}</h1>
      <p class="lead">${hand.description}</p>
      <div class="mini-meta">${hand.meta.map((item) => `<span>${item}</span>`).join("")}<span>Updated: ${lastmod}</span></div>
      <div class="hand-review content-hand">
        <div class="hand-board">${renderCards(hand.hero)}<span class="street-label">Hero hand and board</span>${renderCards(hand.board)}</div>
        <div class="hand-copy">
          <ol class="street-list">${hand.streets.map((street, index) => `<li><strong>${["Preflop", "Flop", "Turn", "River"][index] || `Street ${index + 1}`}</strong>: ${street}</li>`).join("")}</ol>
          <div class="review-grid">
            <div class="teaching-block"><strong>Beginner Thought</strong><p>Looks first at hand strength and often misses position, range, and line.</p></div>
            <div class="teaching-block"><strong>Professional Thought</strong><p>${hand.lesson}</p></div>
            <div class="teaching-block"><strong>GTO Baseline</strong><p>Start with range, sizing, equity, and defense frequency.</p></div>
            <div class="teaching-block"><strong>Exploit Adjustment</strong><p>Then adjust to the opponent's leaks: over-calling, over-folding, or over-bluffing.</p></div>
          </div>
        </div>
      </div>
      ${handDeepSections(hand, currentUrl)}
      ${faqSection(faqs)}
      ${learningPath(currentUrl, [
        ...relatedPackCards.map((pack) => ({ title: `${pack.label} Drill Pack`, description: pack.description, url: practiceUrlForPack(pack.id) })),
        { title: "Pot Odds Trainer", description: "Drill call prices before reviewing similar hands.", url: "/tools/pot-odds-trainer/" },
        { title: "Daily Hand Trainer", description: "Practice one decision point now.", url: "/tools/daily-hand/" },
        { title: "Player Type Test", description: "Connect this line to opponent tendencies.", url: "/tools/player-type-test/" },
      ])}
    </article>
  </main>`;
  return layout({ currentUrl, title: pageTitle, description: hand.description, body, extraHead: structured });
}

function glossaryIndex() {
  const currentUrl = "/glossary/";
  const title = "Texas Hold'em Glossary";
  const description = "A Texas Hold'em strategy glossary for GTO, EV, ranges, blockers, SPR, MDF, and hand-review language.";
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
      },
      itemListJsonLd(title, glossary, (item) => `/glossary/${item[0]}/`),
    ],
  });
  const body = `<main>
    <section class="page-hero"><p class="eyebrow">Glossary</p><h1>Texas Hold'em Strategy Terms</h1><p>Translate GTO, EV, SPR, MDF, blockers, and range language into hand-review thinking.</p></section>
    
    <section class="section glossary-list">${glossary.map(([slug, term, definition]) => `<a class="glossary-item" href="${rel(`/glossary/${slug}/`, currentUrl)}"><strong>${term}</strong><span>${definition}</span></a>`).join("")}</section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function glossaryPage([slug, term, definition]) {
  const currentUrl = `/glossary/${slug}/`;
  const description = `${term} in Texas Hold'em: ${definition} Learn how this term connects to ranges, board texture, and hand review.`;
  const body = `<main>
    <article class="content-page">
      <p class="eyebrow">Poker Glossary</p>
      <h1>${term}</h1>
      <p class="lead">${definition}</p>
      <h2>Beginner Explanation</h2>
      <p>${term} is a review language tool. Do not memorize the term alone; connect it to a real position, board, range, and bet size.</p>
      <h2>Common Mistake</h2>
      <p>Many players turn terms into slogans. A better approach is to ask what problem the term solves in the hand.</p>
      <div class="responsible-box"><strong>Related path</strong><p>Study beginner rules, GTO Academy, and hand reviews together.</p></div>
    </article>
  </main>`;
  return layout({ currentUrl, title: `${term} Explained`, description, body });
}

function toolsPage() {
  const currentUrl = "/tools/";
  const title = "Texas Hold'em Training Tools";
  const description = "Offline Texas Hold'em training tools for daily decisions, Smart Score drills, ranges, hand reviews, board textures, pot odds, and player types.";
  const tools = Object.entries(toolDetails).map(([slug, tool]) => ({
    ...tool,
    slug,
  }));
  const faqs = [
    { question: "Which tools are included?", answer: "Daily Hand Trainer, Preflop Range Trainer, Hand Review Builder, Leak Dashboard, Board Texture Atlas, Preflop Range Finder, Pot Odds Trainer, Player Type Test, Hand Rank Checker, and Pot Odds Calculator." },
    { question: "Do I need an account?", answer: "No. Tools run in the browser, and training progress is saved locally only." },
    { question: "Can these tools be used during real-time play?", answer: "No. They are for offline rules learning, math training, and hand review education only." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
      },
      itemListJsonLd(title, tools, (tool) => `/tools/${tool.slug}/`),
      ...tools.map((tool) => ({
        "@type": "WebApplication",
        name: tool.title,
        description: tool.description,
        url: `${domain}/tools/${tool.slug}/`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      })),
      faqJsonLd(faqs),
    ],
  });
  const body = `<main>
    <section class="page-hero tools-hero"><p class="eyebrow">Training Lab</p><h1>Study, practice, review, and track your decision leaks.</h1><p>Use Smart Score drills, range training, hand-review templates, leak reports, board texture study, pot odds practice, player type review, hand ranking, and pot odds calculation in one place.</p></section>
    
    <section class="section tools-section">
      <div class="action-loop-banner" aria-label="Smart Poker Lab training loop">
        <article><span>01</span><strong>Study</strong><p>Read a concept or board texture.</p></article>
        <article><span>02</span><strong>Practice</strong><p>Make a decision in a drill.</p></article>
        <article><span>03</span><strong>Review</strong><p>Build a structured hand review.</p></article>
        <article><span>04</span><strong>Progress</strong><p>Check scores and recurring leaks.</p></article>
      </div>
      <p class="tool-note">Tools are for offline hand review, rules learning, and strategy training only. They do not provide real-money betting advice, real-time play assistance, or platform referrals. Progress is stored only in this browser.</p>
      <div class="tool-shortcuts">
        ${Object.entries(toolDetails).map(([slug, tool]) => `<a href="${rel(`/tools/${slug}/`, currentUrl)}"><strong>${tool.title}</strong><span>${tool.description}</span></a>`).join("")}
        <a href="${rel("/submit-hand/", currentUrl)}"><strong>Anonymous Hand Submission Guide</strong><span>Build a privacy-safe review draft locally before Analyze Lite.</span></a>
        <a href="${rel("/weekly-challenge/", currentUrl)}"><strong>Weekly Training Challenge</strong><span>Follow a seven-action study loop and copy a local share summary.</span></a>
        <a href="${rel("/drill-packs/", currentUrl)}"><strong>Drill Pack SEO Library</strong><span>Open focused training pages for the main Smart Score packs.</span></a>
        <a href="${rel("/training-library/", currentUrl)}"><strong>Training Library Blueprint</strong><span>Review the Phase 5 taxonomy, coverage targets, and quality rules.</span></a>
      </div>
      <section class="expansion-roadmap" aria-labelledby="expansion-roadmap-title">
        <div>
          <p class="eyebrow">Expansion-Ready</p>
          <h2 id="expansion-roadmap-title">Next training libraries are already mapped.</h2>
          <p>The current static data model is prepared for larger drill packs, editable ranges, and future local dashboards without changing the education-only boundary.</p>
        </div>
        ${dataTable(
          ["Future Track", "Target", "Tags"],
          futureExpansionBlueprint.map((item) => [item.title, `${item.targetSpots}+ spots`, item.tags.join(" / ")]),
          "data-table mini-data-table",
        )}
      </section>
      <div class="tool-layout">
        ${dailyHandToolPanel(currentUrl)}
        ${rangeTrainerPanel()}
        ${handReviewBuilderPanel()}
        ${leakDashboardPanel()}
        ${boardTextureAtlasPanel(currentUrl)}
        ${preflopRangeToolPanel()}
        ${potOddsTrainerPanel()}
        ${playerTypeTestPanel()}
        ${handRankToolPanel()}
        ${potOddsToolPanel()}
      </div>
      ${faqSection(faqs)}
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function studyPage() {
  const currentUrl = "/study/";
  const title = "Smart Poker Lab Study Mode";
  const description = "An original offline study cockpit for Texas Hold'em spots, board textures, GTO baselines, exploit adjustments, local study marks, and drill-pack routing.";
  const faqs = [
    { question: "Is Study Mode a solver database?", answer: "No. It is an original teaching library that summarizes patterns, baselines, and adjustments without proprietary solver outputs." },
    { question: "How should I use a study spot?", answer: "Read the setup, baseline, exploit adjustment, mistake list, and range lens. Then mark it studied, send it to the matching Practice drill pack, or build an Analyze Lite report." },
    { question: "Where are study marks saved?", answer: "Only in this browser through local storage. There is no account sync in this version." },
    { question: "Can this be used during real-time play?", answer: "No. Study Mode is for offline learning, hand review, and entertainment education only." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      {
        "@type": "ItemList",
        name: "Smart Poker Lab Study Spots",
        itemListElement: studySpots.map((spot, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: spot.title,
          url: `${domain}${currentUrl}#${spot.id}`,
        })),
      },
      faqJsonLd(faqs),
    ],
  });
  const body = `<main>
    <section class="page-hero study-hero"><p class="eyebrow">Study Mode</p><h1>Study the pattern, then route it into training.</h1><p>Explore original Texas Hold'em study reports by position, board texture, street, and concept. Each report separates baseline strategy from exploit adjustment, adds a range lens, then sends the spot into Practice, Analyze, or Progress.</p></section>
    
    <section class="section action-lab-section" aria-labelledby="study-loop-title">
      <div class="section-heading"><p class="eyebrow">Study Loop</p><h2 id="study-loop-title">A cleaner version of solver study for beginners.</h2></div>
      <div class="action-loop-banner">
        <article><span>01</span><strong>Choose Spot</strong><p>Pick position, board family, and concept.</p></article>
        <article><span>02</span><strong>Read Pattern</strong><p>Understand the baseline and common traps.</p></article>
        <article><span>03</span><strong>Adjust</strong><p>Compare calling station, nit, regular, and aggressive tendencies.</p></article>
        <article><span>04</span><strong>Train</strong><p>Move into Practice Mode or build a hand review.</p></article>
      </div>
      <div class="mode-visual-panel">
        ${responsiveImage(assets.study, currentUrl, "mode-visual-large")}
        <div>
          <p class="eyebrow">Pattern Matrix</p>
          <h3>Study pages now read like compact reports.</h3>
          <p>Each spot is organized as board family, baseline pattern, exploit trigger, beginner trap, and next drill. The goal is to borrow the clarity of a training dashboard without copying solver data.</p>
        </div>
      </div>
      ${studyPatternMatrix()}
    </section>
    ${studyModePanel(currentUrl)}
    ${learningPath(currentUrl, [
      { title: "Practice Mode", description: "Turn a study report into a scored decision.", url: "/practice/" },
      { title: "Board Texture Atlas", description: "Review simplified flop family patterns.", url: "/tools/board-texture-atlas/" },
      { title: "Analyze Lite", description: "Turn a played hand into a leak-labeled report.", url: "/analyze/" },
    ])}
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function analyzePage() {
  const currentUrl = "/analyze/";
  const title = "Smart Poker Lab Analyze Lite 2.0";
  const description = "An offline Texas Hold'em hand review builder that creates coach-style reports, heuristic leak-weight estimates, local saved reports, and next training drills.";
  const faqs = [
    { question: "Does Analyze Lite upload my hands?", answer: "No. Reports are generated in the browser and saved only in local storage if you press the save button." },
    { question: "Is Analyze Lite a solver or real-time assistant?", answer: "No. It is an offline study report builder that organizes hand-review thinking into street plans, range shifts, baseline, exploit adjustment, leak labels, and next drills." },
    { question: "What should I enter?", answer: "Enter game type, stack depth, positions, hero hand, board, villain type, each street's action, and your main question." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      faqJsonLd(faqs),
    ],
  });
  const body = `<main>
    <section class="page-hero analyze-hero"><p class="eyebrow">Analyze Lite 2.0</p><h1>Build a hand-review report that feeds training.</h1><p>Enter a played hand or load a sample. Analyze Lite creates an original offline study report with street plans, range shifts, baseline logic, exploit adjustment, likely leak label, heuristic leak weight, and recommended drill pack. Nothing is uploaded.</p></section>
    
    <section class="section action-lab-section" aria-labelledby="analyze-loop-title">
      <div class="section-heading"><p class="eyebrow">Review Loop</p><h2 id="analyze-loop-title">A hand review flow that feeds training.</h2></div>
      <div class="action-loop-banner">
        <article><span>01</span><strong>Input</strong><p>Record stack, position, board, action, and question.</p></article>
        <article><span>02</span><strong>Structure</strong><p>Separate decision node, street plan, and range shift.</p></article>
        <article><span>03</span><strong>Label</strong><p>Tag the likely leak and recommended drill pack.</p></article>
        <article><span>04</span><strong>Train</strong><p>Save the report locally and open the next drill.</p></article>
      </div>
      <div class="mode-visual-panel">
        ${responsiveImage(assets.analyze, currentUrl, "mode-visual-large")}
        <div>
          <p class="eyebrow">Report Rows</p>
          <h3>Analyze now emphasizes structured rows, not free-form opinions.</h3>
          <p>The review flow uses repeatable fields so users compare position, board, range shift, leak label, and next drill before judging the result.</p>
        </div>
      </div>
      ${analyzeReportMatrix()}
    </section>
    ${analyzeLitePanel()}
    ${learningPath(currentUrl, [
      { title: "Practice Mode", description: "Train the leak label in scored decision drills.", url: "/practice/" },
      { title: "Progress Report", description: "See saved analysis events and recurring mistake tags.", url: "/progress/" },
      { title: "Hand Review Library", description: "Compare your hand to published reviews.", url: "/hand-review/" },
    ])}
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function progressPage() {
  const currentUrl = "/progress/";
  const title = "Smart Poker Lab Progress Report";
  const description = "A browser-local Texas Hold'em training report for Smart Score, Study views, Practice drill packs, streaks, Review Queue, Analyze reports, leak labels, and next drills.";
  const faqs = [
    { question: "Where is progress stored?", answer: "Progress is stored only in this browser through local storage. There is no account system in this version." },
    { question: "Does the score measure real poker profit?", answer: "No. Smart Score is only a study feedback signal for Smart Poker Lab drills and review reports." },
    { question: "What should I do with the leak report?", answer: "Use it to choose the next offline drill pack, review-queue replay, article, or hand review. It is not real-time play assistance." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      faqJsonLd(faqs),
    ],
  });
  const body = `<main>
    <section class="page-hero progress-hero"><p class="eyebrow">Progress Report</p><h1>Turn your drill packs into a training report.</h1><p>This browser-local report connects Study Mode, Practice drill packs, Smart Score streaks, Review Queue, Analyze Lite, and the 30-day plan into one feedback loop.</p></section>
    
    <section class="section action-lab-section" aria-labelledby="progress-loop-title">
      <div class="section-heading"><p class="eyebrow">Feedback Loop</p><h2 id="progress-loop-title">Use the report like a training coach.</h2></div>
      <div class="action-loop-banner">
        <article><span>01</span><strong>Study</strong><p>Open spots and board patterns.</p></article>
        <article><span>02</span><strong>Practice</strong><p>Run drill packs and replay review-queue spots.</p></article>
        <article><span>03</span><strong>Analyze</strong><p>Save hand reports after offline review.</p></article>
        <article><span>04</span><strong>Repeat</strong><p>Follow the next drill suggestion.</p></article>
      </div>
    </section>
    ${weeklyTrainingPath(currentUrl, "light")}
    <section class="section progress-dashboard-section">
      ${leakDashboardPanel()}
    </section>
    ${learningPath(currentUrl, [
      { title: "Study Mode", description: "Add more spot views before your next practice session.", url: "/study/" },
      { title: "Practice Mode", description: "Run focused drill packs and replay low-score spots.", url: "/practice/" },
      { title: "Analyze Lite", description: "Save a hand report and feed the dashboard.", url: "/analyze/" },
    ])}
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function practicePage() {
  const currentUrl = "/practice/";
  const title = "Smart Poker Lab Practice Mode";
  const description = "A unified offline poker practice mode with drill packs, Smart Score feedback, local session progress, streaks, and a mistake review queue.";
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      faqJsonLd([
        { question: "Is Practice Mode a solver?", answer: "No. It is an original education-only drill system using simplified teaching spots and Smart Score feedback." },
        { question: "Where is the training history stored?", answer: "Only in this browser through local storage. There is no account system in this version." },
        { question: "What are drill packs?", answer: "Drill packs group original practice spots by training goal, such as preflop discipline, value betting, board texture, river decisions, and math." },
        { question: "Can this be used during real-time play?", answer: "No. Practice Mode is for offline study, review, and training only." },
      ]),
    ],
  });
  const body = `<main>
    <section class="page-hero practice-hero"><p class="eyebrow">Practice Mode</p><h1>Train decisions in focused drill packs.</h1><p>Choose a pack, make a decision, receive a Smart Score, track streaks, and replay mistakes from a browser-local review queue. This is an original offline study trainer, not a solver database or real-time play assistant.</p></section>
    
    ${practiceModePanel()}
    <section class="section action-lab-section" aria-labelledby="practice-loop-title">
      <div class="section-heading"><p class="eyebrow">Training Loop</p><h2 id="practice-loop-title">How to use Practice Mode</h2></div>
      <div class="action-loop-banner">
        <article><span>01</span><strong>Pick Pack</strong><p>Choose a focused drill pack or open the review queue.</p></article>
        <article><span>02</span><strong>Decide</strong><p>Pick the action before reading the review.</p></article>
        <article><span>03</span><strong>Score</strong><p>Read the Smart Score, streak, and mistake label.</p></article>
        <article><span>04</span><strong>Repeat</strong><p>Use recommendations to target your next leak.</p></article>
      </div>
      <div class="mode-visual-panel">
        ${responsiveImage(assets.practice, currentUrl, "mode-visual-large")}
        <div>
          <p class="eyebrow">Score Matrix</p>
          <h3>Scores should tell the user what to do next.</h3>
          <p>Practice Mode now presents score bands like a decision trainer: clean action, conditional action, review needed, or major leak.</p>
        </div>
      </div>
      ${practiceScoreMatrix()}
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function toolDetailPage(slug) {
  const tool = toolDetails[slug];
  const currentUrl = `/tools/${slug}/`;
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.title,
        description: tool.description,
        url: `${domain}${currentUrl}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      faqJsonLd(tool.faq),
    ],
  });
  const body = `<main>
    <section class="page-hero tool-detail-hero"><p class="eyebrow">${tool.eyebrow}</p><h1>${tool.title}</h1><p>${tool.description}</p></section>
    
    <section class="section tools-section standalone-tool">
      <p class="tool-note">This page is education-only. It does not provide real-money betting advice, gambling services, or platform referrals.</p>
      <div class="tool-layout single-tool">${tool.panel(currentUrl)}</div>
      ${faqSection(tool.faq)}
      ${learningPath(currentUrl, [
        { title: "Back to Tools", description: "Open the full Smart Poker Lab training toolbox.", url: "/tools/" },
        { title: "Beginner Lessons", description: "Start with rules, position, and starting hands.", url: "/learn/" },
        { title: "Hand Review Library", description: "Place tool results back into real hands.", url: "/hand-review/" },
      ])}
    </section>
  </main>`;
  return layout({ currentUrl, title: tool.title, description: tool.description, body, extraHead: structured });
}

function resourcesIndexPage() {
  const currentUrl = "/resources/";
  const title = "Free Poker Study Sheets";
  const description = "Printable Texas Hold'em study sheets for preflop ranges, pot odds, and training routines.";
  const resources = Object.entries(resourceDetails).map(([slug, resource]) => ({
    ...resource,
    slug,
  }));
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
      },
      itemListJsonLd(title, resources, (resource) => `/resources/${resource.slug}/`),
      ...resources.map((resource) => ({
        "@type": "LearningResource",
        name: resource.title,
        description: resource.description,
        url: `${domain}/resources/${resource.slug}/`,
        inLanguage: "en",
        educationalLevel: "Beginner",
        learningResourceType: "Study sheet",
      })),
    ],
  });
  const body = `<main>
    <section class="page-hero"><p class="eyebrow">Free Study Sheets</p><h1>Printable poker study sheets for training, not gambling.</h1><p>Open concise English training sheets for preflop discipline, pot odds, and the 30-day review routine. No account is required.</p></section>
    
    <section class="section resource-section">
      <div class="resource-grid">
        ${Object.entries(resourceDetails)
          .map(
            ([slug, resource]) => `<article>
              <strong>${resource.title}</strong>
              <p>${resource.description}</p>
              <div class="resource-actions">
                <a class="primary-action" href="${rel(`/resources/${slug}/`, currentUrl)}">Open Sheet</a>
                <button class="secondary-action waitlist-button" data-interest="${slug}" type="button">Save Interest</button>
              </div>
            </article>`,
          )
          .join("")}
      </div>
      ${resourceConversionPanel(currentUrl)}
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function resourcePage(slug) {
  const resource = resourceDetails[slug];
  const currentUrl = `/resources/${slug}/`;
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        name: resource.title,
        description: resource.description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
        educationalLevel: "Beginner",
        learningResourceType: "Study sheet",
        provider: { "@type": "Organization", name: brand.name, url: domain },
      },
      faqJsonLd([
        { question: "Is this a poker platform or gambling service?", answer: "No. It is an education-only study sheet for rules, math, strategy, and hand review." },
        { question: "Do I need an account?", answer: "No. The sheet is available directly in the browser." },
        { question: "Can I print it?", answer: "Yes. Use the print button or your browser's print command." },
      ]),
    ],
  });
  const body = `<main>
    <article class="content-page study-sheet">
      <p class="eyebrow">${resource.eyebrow}</p>
      <h1>${resource.title}</h1>
      <p class="lead">${resource.description}</p>
      <div class="sheet-actions">
        <button class="tool-button print-button" type="button">Print / Save as PDF</button>
        <a class="secondary-action" href="${rel("/resources/", currentUrl)}">All Study Sheets</a>
        <button class="secondary-action waitlist-button" data-interest="${slug}" type="button">Save Interest</button>
      </div>
      <div class="sheet-grid">
        ${resource.sections
          .map(
            (section) => `<section>
              <h2>${section.title}</h2>
              <ul>${section.items.map((item) => `<li>${item}</li>`).join("")}</ul>
            </section>`,
          )
          .join("")}
      </div>
      ${learningPath(
        currentUrl,
        resource.links.map((url) => ({
          title: url.includes("tools") ? "Practice With Tool" : "Continue Reading",
          description: "Use the sheet together with a training page so the idea becomes a habit.",
          url,
        })),
      )} 
      ${resourceConversionPanel(currentUrl)}
    </article>
  </main>`;
  return layout({ currentUrl, title: resource.title, description: resource.description, body, extraHead: structured });
}

function trainingPlanPage() {
  const currentUrl = "/training-plan/";
  const phases = [...new Set(trainingPlan.map((day) => day.phase))];
  const phaseSummaries = phases.map((phase) => trainingPlan.find((day) => day.phase === phase));
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        name: "30-Day Texas Hold'em Training Plan",
        description: "A browser-local training routine that connects study pages, practice drills, Analyze Lite hand reviews, and the Progress dashboard.",
        provider: { "@type": "Organization", name: brand.name, sameAs: domain },
        inLanguage: "en",
      },
      faqJsonLd([
        { question: "Does the plan save progress?", answer: "Yes, only in this browser through local storage. There is no account system in this version." },
        { question: "How is the plan organized?", answer: "Each day connects one study topic, one practice action, one Analyze Lite prompt, and one Progress checkpoint." },
        { question: "Does the plan promise results?", answer: "No. It teaches study process, decision quality, and review habits only." },
      ]),
    ],
  });
  const body = `<main>
    <section class="page-hero training-hero"><p class="eyebrow">30-Day Training Plan</p><h1>Turn study, practice, review, and progress into one routine.</h1><p>This plan upgrades poker learning into a daily loop: study one concept, make one decision, build one review habit, then check the next leak. The goal is process, not profit promises.</p></section>
    
    <section class="section training-command-section" aria-labelledby="training-command-title">
      ${dataScript("training-plan-data", trainingPlan)}
      <div class="section-heading"><p class="eyebrow">Training Cockpit</p><h2 id="training-command-title">Start the next useful session.</h2></div>
      <div class="training-command-grid">
        <article class="training-today-card" aria-labelledby="training-today-title">
          <p class="eyebrow">Next Session</p>
          <h2 id="training-today-title">Day 1: Map the Whole Hand</h2>
          <p id="training-today-copy">Understand the button, blinds, streets, and legal actions so every later lesson has a stable frame.</p>
          <div class="training-today-meta">
            <span id="training-today-phase">Rules Foundation</span>
            <span id="training-today-time">10-15 minutes</span>
            <span id="training-today-concept">Hand flow and action order</span>
          </div>
          <div class="training-action-row">
            <a class="primary-action" id="training-start-link" href="#day-1">Start Next Day</a>
            <a class="secondary-action" href="${rel("/progress/", currentUrl)}">Open Progress</a>
          </div>
        </article>
        <div class="training-metric-grid" aria-label="Local training status">
          <article><span>Plan</span><strong id="training-metric-plan">0 / 30</strong><p>Days completed in this browser.</p></article>
          <article><span>Practice</span><strong id="training-metric-practice">0</strong><p>Scored decisions recorded locally.</p></article>
          <article><span>Analyze</span><strong id="training-metric-analyze">0</strong><p>Saved hand-review reports.</p></article>
          <article><span>Review Queue</span><strong id="training-metric-queue">0</strong><p>Practice spots marked for retry.</p></article>
        </div>
      </div>
      <div class="training-loop-strip" aria-label="Smart Poker Lab daily learning loop">
        <article><span>01</span><strong>Study</strong><p>Read the day's concept and one related example.</p><a href="${rel("/study/", currentUrl)}">Open Study</a></article>
        <article><span>02</span><strong>Practice</strong><p>Make a decision before reading the explanation.</p><a href="${rel("/practice/", currentUrl)}">Open Practice</a></article>
        <article><span>03</span><strong>Analyze</strong><p>Turn a hand memory into a structured report.</p><a href="${rel("/analyze/", currentUrl)}">Open Analyze</a></article>
        <article><span>04</span><strong>Progress</strong><p>Check scores, leaks, queue, and next recommendation.</p><a href="${rel("/progress/", currentUrl)}">Open Progress</a></article>
      </div>
    </section>
    <section class="section training-dashboard" aria-labelledby="training-dashboard-title">
      <div class="section-heading"><p class="eyebrow">Local Progress</p><h2 id="training-dashboard-title">30-Day Progress</h2></div>
      <div class="progress-card">
        <strong id="training-progress-count">0 / 30 complete</strong>
        <div class="progress-track"><span id="training-progress-bar"></span></div>
        <p id="training-progress-note">Progress is saved only in this browser. It does not sync across devices.</p>
      </div>
      <div class="phase-overview-grid" aria-label="Training phase overview">${phaseSummaries
        .map(
          (phase) => `<article>
            <span>${esc(phase.phaseDays)}</span>
            <h3>${esc(phase.phase)}</h3>
            <p>${esc(phase.phaseGoal)}</p>
            <small>${esc(phase.phaseCheckpoint)}</small>
          </article>`,
        )
        .join("")}</div>
      <div class="phase-tabs" role="list">${phases.map((phase) => `<a href="#phase-${phase.replace(/\s+/g, "-")}">${phase}</a>`).join("")}</div>
      ${phases
        .map((phase) => {
          const phaseId = phase.replace(/\s+/g, "-");
          const days = trainingPlan.filter((day) => day.phase === phase);
          return `<section class="training-phase" id="phase-${phaseId}" aria-labelledby="phase-title-${phaseId}">
            <div class="training-phase-heading">
              <p class="eyebrow">${esc(days[0].phaseDays)}</p>
              <h2 id="phase-title-${phaseId}">${esc(phase)}</h2>
              <p>${esc(days[0].phaseGoal)}</p>
            </div>
            <div class="training-day-grid">${days
              .map(
                (day) => `<article class="training-day" id="day-${day.day}" data-day-card="${day.day}" data-phase="${esc(day.phase)}" data-pack="${esc(day.packId)}">
                  <div class="training-day-head">
                    <span>Day ${day.day}</span>
                    <h3>${esc(day.title)}</h3>
                    <p>${esc(day.objective)}</p>
                  </div>
                  <div class="training-day-meta">
                    <span>${esc(day.timebox)}</span>
                    <span>${esc(day.concept)}</span>
                  </div>
                  <div class="training-task-block">
                    <strong>Today's Checklist</strong>
                    <ul>${day.tasks.map((task) => `<li>${esc(task)}</li>`).join("")}</ul>
                  </div>
                  <div class="training-task-block">
                    <strong>Analyze Prompt</strong>
                    <p>${esc(day.analyzePrompt)}</p>
                  </div>
                  <div class="training-task-block">
                    <strong>Progress Checkpoint</strong>
                    <p>${esc(day.checkpoint)}</p>
                  </div>
                  <div class="training-links">
                    <a href="${rel(day.article, currentUrl)}">Study: ${esc(day.studyLabel)}</a>
                    <a href="${rel(day.tool, currentUrl)}">Practice: ${esc(day.practiceLabel)}</a>
                    <a href="${rel(day.analyzeUrl, currentUrl)}">Analyze</a>
                    <a href="${rel(day.progressUrl, currentUrl)}">Progress</a>
                  </div>
                  <p><strong>Reflection:</strong> ${esc(day.reflection)}</p>
                  <p class="training-progress-cue">${esc(day.progressCue)}</p>
                  <button class="tool-button training-check" type="button" data-day="${day.day}">Mark Complete</button>
                </article>`,
              )
              .join("")}</div>
          </section>`;
        })
        .join("")}
    </section>
  </main>`;
  return layout({ currentUrl, title: "30-Day Texas Hold'em Training Plan", description: "A local-progress poker training plan for rules, preflop ranges, pot odds, GTO, player types, and hand review.", body, extraHead: structured });
}

function trainingDayPage(day) {
  const slug = String(day.day).padStart(2, "0");
  const currentUrl = `/training-plan/day-${slug}/`;
  const nextDay = trainingPlan.find((item) => Number(item.day) === Number(day.day) + 1);
  const previousDay = trainingPlan.find((item) => Number(item.day) === Number(day.day) - 1);
  const title = `Day ${day.day}: ${day.title}`;
  const description = `${day.objective} Part of the browser-local Smart Poker Lab 30-day training plan.`;
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
        isPartOf: {
          "@type": "Course",
          name: "30-Day Texas Hold'em Training Plan",
          url: `${domain}/training-plan/`,
        },
        position: day.day,
        educationalUse: "Practice",
      },
      faqJsonLd([
        { question: "Where is completion saved?", answer: "Only in this browser through local storage. No account or cloud sync is active." },
        { question: "Is this a real-time poker assistant?", answer: "No. This page is for offline study, practice, and hand review only." },
      ]),
    ],
  });
  const body = `<main>
    <section class="page-hero training-hero">
      <p class="eyebrow">30-Day Plan / ${esc(day.phase)}</p>
      <h1>${esc(title)}</h1>
      <p>${esc(day.objective)}</p>
    </section>
    
    <section class="section training-day-detail-section">
      ${dataScript("training-plan-data", trainingPlan)}
      <div class="training-day-detail-layout">
        <article class="training-day training-day-detail" id="day-${day.day}" data-day-card="${day.day}" data-phase="${esc(day.phase)}" data-pack="${esc(day.packId)}">
          <div class="training-day-head">
            <span>Day ${day.day}</span>
            <h2>${esc(day.title)}</h2>
            <p>${esc(day.todayGoal || day.objective)}</p>
          </div>
          ${dataTable(
            ["Daily Block", "Action"],
            [
              ["Today Goal", day.todayGoal || day.objective],
              ["Today Article", `${day.studyLabel}: ${day.article}`],
              ["Today Drill", `${day.practiceLabel}: ${day.tool}`],
              ["Today Quiz", day.todayQuiz || day.checkpoint],
              ["Review Prompt", day.reviewPrompt || day.reflection],
            ],
            "data-table mini-data-table",
          )}
          <div class="training-task-block">
            <strong>Today's Checklist</strong>
            <ul>${day.tasks.map((task) => `<li>${esc(task)}</li>`).join("")}</ul>
          </div>
          <div class="training-task-block">
            <strong>Review Prompt</strong>
            <p>${esc(day.reviewPrompt || day.reflection)}</p>
          </div>
          <div class="training-links">
            <a href="${rel(day.article, currentUrl)}">Read: ${esc(day.studyLabel)}</a>
            <a href="${rel(day.tool, currentUrl)}">Drill: ${esc(day.practiceLabel)}</a>
            <a href="${rel("/analyze/", currentUrl)}">Analyze Lite</a>
            <a href="${rel("/progress/", currentUrl)}">Progress Report</a>
          </div>
          <button class="tool-button training-check" type="button" data-day="${day.day}">Mark Complete</button>
        </article>
        <aside class="training-day-side">
          <div class="progress-card">
            <strong id="training-progress-count">0 / 30 complete</strong>
            <div class="progress-track"><span id="training-progress-bar"></span></div>
            <p id="training-progress-note">Progress is saved only in this browser.</p>
          </div>
          <div class="training-task-block">
            <strong>Next Day Preview</strong>
            <p>${nextDay ? `Day ${nextDay.day}: ${esc(nextDay.title)}. ${esc(nextDay.objective)}` : "You are at the end of the current detailed sprint."}</p>
            <div class="training-action-row">
              ${previousDay ? `<a class="secondary-action" href="${rel(`/training-plan/day-${String(previousDay.day).padStart(2, "0")}/`, currentUrl)}">Previous Day</a>` : `<a class="secondary-action" href="${rel("/training-plan/", currentUrl)}">Plan Overview</a>`}
              ${nextDay && nextDay.day <= 7 ? `<a class="primary-action" href="${rel(`/training-plan/day-${String(nextDay.day).padStart(2, "0")}/`, currentUrl)}">Next Day</a>` : `<a class="primary-action" href="${rel("/training-plan/", currentUrl)}">Back to Overview</a>`}
            </div>
          </div>
          <div class="responsible-box"><strong>Offline study boundary</strong><p>This daily page is for education, review, and routine building only. It is not real-time play assistance or real-money betting advice.</p></div>
        </aside>
      </div>
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function submitHandPage() {
  const currentUrl = "/submit-hand/";
  const title = "Anonymous Hand Submission Guide";
  const description = "Build a privacy-safe Texas Hold'em hand review draft locally before using Analyze Lite.";
  const faqs = [
    { question: "Does this page upload my hand?", answer: "No. The draft is built in your browser only. Saving stores it locally on this device." },
    { question: "What should I remove before sharing a hand?", answer: "Remove player names, platform handles, private table details, payment information, and any real-money service references." },
    { question: "What happens after I build the draft?", answer: "Use it as a clean input for Analyze Lite, personal notes, or an education-only coaching discussion." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      faqJsonLd(faqs),
      breadcrumbJsonLd(currentUrl, title),
    ],
  });
  const checklistRows = [
    ["Game frame", "Format, stack depth, table size, positions, pot type."],
    ["Cards and board", "Hero hand, flop, turn, river, and suits if relevant."],
    ["Action line", "Preflop, flop, turn, river actions with sizing when known."],
    ["Main question", "One decision node: value bet, bluff, call, fold, sizing, or range."],
    ["Privacy pass", "Remove names, handles, links, payment details, and private table clues."],
  ];
  const body = `<main>
    <section class="page-hero submit-hand-hero">
      <p class="eyebrow">Review Prep</p>
      <h1>Build an anonymous hand-review draft before analysis.</h1>
      <p>Use this local guide to turn a messy hand memory into a clean Analyze Lite input. Nothing is uploaded, published, or sent by this page.</p>
    </section>
    
    <section class="section submission-section" aria-labelledby="submission-title">
      <div class="section-heading"><p class="eyebrow">Anonymous Draft Builder</p><h2 id="submission-title">Keep the hand useful, private, and education-only.</h2></div>
      <div class="submission-layout">
        <form class="submission-form" id="submit-hand-form">
          <div class="submission-form-grid">
            <label>Game type<input id="submission-game" type="text" value="6-max cash" /></label>
            <label>Effective stack<input id="submission-stack" type="text" value="100BB" /></label>
            <label>Pot type<input id="submission-pot-type" type="text" value="Single-raised pot" /></label>
            <label>Hero position<input id="submission-hero-position" type="text" value="BTN" /></label>
            <label>Villain position<input id="submission-villain-position" type="text" value="BB" /></label>
            <label>Villain type<input id="submission-villain-type" type="text" value="Calling station" /></label>
            <label>Hero hand<input id="submission-hero-hand" type="text" value="AJs" /></label>
            <label>Board<input id="submission-board" type="text" value="Ad 7c 2s / 9h / 2d" /></label>
          </div>
          <label>Preflop<textarea id="submission-preflop">BTN opens 2.5BB, BB calls.</textarea></label>
          <label>Flop<textarea id="submission-flop">BB checks, Hero bets small, BB calls.</textarea></label>
          <label>Turn<textarea id="submission-turn">BB checks, Hero bets around 70% pot, BB calls.</textarea></label>
          <label>River<textarea id="submission-river">BB checks. Hero considers a thin value bet.</textarea></label>
          <label>Main review question<textarea id="submission-question">Can Hero value bet river, and what changes if BB check-raises?</textarea></label>
          <div class="submission-actions">
            <button class="tool-button" id="build-submission-template" type="button">Build Draft</button>
            <button class="secondary-action" id="save-submission-draft" type="button">Save Locally</button>
            <button class="secondary-action" id="copy-submission-template" type="button">Copy Draft</button>
          </div>
        </form>
        <aside class="submission-side">
          ${dataTable(["Step", "What to include"], checklistRows, "data-table mini-data-table")}
          <div class="responsible-box"><strong>Privacy and safety boundary</strong><p>Do not include names, platform handles, private table links, payment details, real-money services, or any request to arrange play. This page is for offline strategy education only.</p></div>
        </aside>
      </div>
      <output class="submission-output" id="submission-output">Build a draft to preview the structured hand review here.</output>
      <div class="saved-draft-list" id="submission-saved-list" aria-live="polite"></div>
    </section>
    ${learningPath(currentUrl, [
      { title: "Analyze Lite", description: "Paste the cleaned draft into the structured review builder.", url: "/analyze/" },
      { title: "Hand Review Library", description: "Compare the draft to published training reviews.", url: "/hand-review/" },
      { title: "Progress Report", description: "Save the leak label after review and choose the next drill.", url: "/progress/" },
    ])}
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function weeklyChallengePage() {
  const currentUrl = "/weekly-challenge/";
  const title = "Weekly Poker Training Challenge";
  const description = "A seven-action weekly offline poker study loop for Smart Poker Lab drills, reviews, and progress.";
  const actions = [
    { id: "study", title: "Study one board family", copy: "Read one Study Mode report or Board Texture Atlas entry.", url: "/study/" },
    { id: "daily", title: "Complete Daily Workout", copy: "Make the main decision before reading the explanation.", url: "/tools/daily-hand/" },
    { id: "practice", title: "Run five Practice spots", copy: "Choose one focused pack and record five decisions.", url: "/practice/" },
    { id: "range", title: "Check one range", copy: "Review one preflop matrix or Range Trainer spot.", url: "/tools/range-trainer/" },
    { id: "math", title: "Finish five Pot Odds reps", copy: "Use the formula until the answer feels automatic.", url: "/tools/pot-odds-trainer/" },
    { id: "review", title: "Build one hand draft", copy: "Use the anonymous guide or Analyze Lite for one hand.", url: "/submit-hand/" },
    { id: "progress", title: "Read Progress and choose next pack", copy: "Pick the next drill from your weakest local leak.", url: "/progress/" },
  ];
  const faqs = [
    { question: "Is this a contest or play service?", answer: "No. The challenge is only a browser-local study routine." },
    { question: "Where is completion saved?", answer: "Only in this browser through local storage." },
    { question: "Can I share the result?", answer: "Yes. Copy the text summary if you want to share your study routine. It does not include private hand data." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
        learningResourceType: "Challenge",
        educationalUse: "Practice",
      },
      {
        "@type": "ItemList",
        name: "Weekly Poker Training Actions",
        itemListElement: actions.map((action, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: action.title,
          url: `${domain}${action.url}`,
        })),
      },
      faqJsonLd(faqs),
      breadcrumbJsonLd(currentUrl, title),
    ],
  });
  const body = `<main>
    ${dataScript("weekly-challenge-data", actions)}
    <section class="page-hero weekly-challenge-hero">
      <p class="eyebrow">Weekly Routine</p>
      <h1>Complete one full Smart Poker Lab loop this week.</h1>
      <p>Seven small actions connect study, practice, range discipline, pot odds, hand review, and progress. It is a study challenge only: no prizes, betting services, or platform referrals.</p>
    </section>
    
    <section class="section weekly-challenge-section" aria-labelledby="weekly-challenge-title">
      <div class="section-heading"><p class="eyebrow">7-Action Loop</p><h2 id="weekly-challenge-title">Tap each action as you complete it locally.</h2></div>
      <div class="weekly-action-grid">
        ${actions
          .map(
            (action, index) => `<article class="weekly-action-card" data-weekly-card="${action.id}">
              <span>0${index + 1}</span>
              <h3>${esc(action.title)}</h3>
              <p>${esc(action.copy)}</p>
              <div class="weekly-action-row">
                <a href="${rel(action.url, currentUrl)}">Open</a>
                <button type="button" data-weekly-action="${action.id}">Mark Done</button>
              </div>
            </article>`,
          )
          .join("")}
      </div>
      <div class="weekly-summary-panel">
        <div>
          <p class="eyebrow">Local Summary</p>
          <h3 id="weekly-challenge-progress">0 / 7 complete</h3>
          <p id="weekly-challenge-result">Start with one Study action or the Daily Workout. Completion is stored only in this browser.</p>
        </div>
        <div class="weekly-summary-actions">
          <button class="tool-button" id="copy-weekly-challenge" type="button">Copy Study Summary</button>
          <button class="secondary-action" id="reset-weekly-challenge" type="button">Reset Week</button>
        </div>
      </div>
      ${faqSection(faqs)}
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function trainingLibraryPage() {
  const currentUrl = "/training-library/";
  const title = "Training Library Blueprint";
  const description = "Phase 5 taxonomy, coverage targets, and production standards for the Smart Poker Lab poker training library.";
  const packRows = drillPackLandingPacks()
    .filter((pack) => !pack.dynamic)
    .map((pack) => {
      const spots = drillPackSpots(pack);
      const leaks = Array.isArray(pack.match?.leaks) ? pack.match.leaks.slice(0, 4).join(" / ") : "mixed decision leaks";
      return [pack.label, String(spots.length), leaks, pack.description];
    });
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
        learningResourceType: "Training roadmap",
        educationalUse: "Planning",
      },
      breadcrumbJsonLd(currentUrl, title),
    ],
  });
  const body = `<main>
    <section class="page-hero drill-pack-hero">
      <p class="eyebrow">Phase 5 / Library Depth</p>
      <h1>Build the drill library like a training product.</h1>
      <p>Phase 5 turns Smart Poker Lab from a working trainer into a deeper decision library. The focus is taxonomy, coverage, high-quality feedback, and conditional strategy language rather than raw page count.</p>
      <div class="hero-actions">
        <a class="primary-action" href="${rel("/practice/", currentUrl)}">Open Practice Mode</a>
        <a class="secondary-action" href="${rel("/drill-packs/", currentUrl)}">Browse Drill Packs</a>
        <a class="secondary-action" href="${rel("/progress/", currentUrl)}">Check Progress</a>
      </div>
    </section>
    
    <section class="section drill-pack-detail-section">
      <div class="section-heading">
        <p class="eyebrow">Current Coverage</p>
        <h2>Phase 5 targets are measured by usable training coverage.</h2>
      </div>
      ${dataTable(["Library Area", "Current", "Phase 5 Target", "What improves"], phaseFiveTargets, "data-table product-data-table")}
    </section>
    <section class="section cockpit-section">
      <div class="section-heading">
        <p class="eyebrow">Training Taxonomy</p>
        <h2>Every new spot needs enough labels to route feedback.</h2>
      </div>
      ${dataTable(
        ["Dimension", "Allowed Values", "Why It Matters"],
        trainingTaxonomy.map((item) => [item.dimension, item.values.join(" / "), item.purpose]),
        "data-table product-data-table",
      )}
    </section>
    <section class="section drill-pack-index-section">
      <div class="section-heading">
        <p class="eyebrow">Pack Density</p>
        <h2>Focused packs become the user's next prescription.</h2>
      </div>
      ${dataTable(["Pack", "Spots", "Main Leak Tags", "Training Role"], packRows, "data-table product-data-table")}
    </section>
    <section class="section roadmap-section">
      <div class="section-heading">
        <p class="eyebrow">Production Standard</p>
        <h2>Quality rules for every Phase 5 addition.</h2>
      </div>
      <div class="roadmap-grid">
        ${phaseFiveQualityStandards
          .map((standard, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>Standard ${index + 1}</h3><p>${esc(standard)}</p></article>`)
          .join("")}
      </div>
    </section>
    <section class="section resource-section">
      <div class="section-heading">
        <p class="eyebrow">Next Build Order</p>
        <h2>What gets added after this first Phase 5A batch.</h2>
      </div>
      <div class="resource-grid">
        ${futureExpansionBlueprint
          .map(
            (item) => `<article>
              <strong>${esc(item.title)}</strong>
              <p>${esc(item.summary)}</p>
              <small>${esc(item.targetSpots)}+ target spots / ${esc(item.tags.join(" / "))}</small>
            </article>`,
          )
          .join("")}
      </div>
    </section>
    ${learningPath(currentUrl, [
      { title: "Practice Mode", description: "Run the current Phase 5A drill library.", url: "/practice/" },
      { title: "Drill Pack Library", description: "Open focused landing pages by leak family.", url: "/drill-packs/" },
      { title: "Progress Report", description: "Use scores to choose the next pack.", url: "/progress/" },
    ])}
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function drillPacksIndexPage() {
  const currentUrl = "/drill-packs/";
  const title = "Poker Drill Packs";
  const description = "Focused Smart Poker Lab practice pack landing pages for preflop, value, board texture, river, math, and review queue routines.";
  const packs = drillPackLandingPacks();
  const faqs = [
    { question: "Are these solver outputs?", answer: "No. Drill packs are original education-only training prompts that summarize patterns, mistakes, and next habits." },
    { question: "How should I choose a pack?", answer: "Pick the pack that matches your current leak from Progress, or start with Preflop Discipline if you are unsure." },
    { question: "Can the packs be used during live play?", answer: "No. They are for offline study and review only." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
      },
      {
        "@type": "ItemList",
        name: title,
        itemListElement: packs.map((pack, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${pack.label} Drill Pack`,
          url: `${domain}${drillPackUrl(pack)}`,
        })),
      },
      faqJsonLd(faqs),
      breadcrumbJsonLd(currentUrl, title),
    ],
  });
  const body = `<main>
    <section class="page-hero drill-pack-hero">
      <p class="eyebrow">Practice SEO Library</p>
      <h1>Choose a focused drill pack before opening Practice Mode.</h1>
      <p>Each landing page explains the leak, range idea, recommended routine, and next habit behind a Smart Poker Lab pack. The training remains offline and education-only.</p>
    </section>
    
    <section class="section drill-pack-index-section">
      <div class="drill-pack-seo-grid">
        ${packs
          .map((pack) => {
            const spots = drillPackSpots(pack);
            const count = pack.dynamic ? "Local queue" : `${spots.length} spots`;
            return `<a class="drill-pack-seo-card" href="${rel(drillPackUrl(pack), currentUrl)}">
              <span>${esc(count)}</span>
              <strong>${esc(pack.label)}</strong>
              <p>${esc(pack.description)}</p>
              <small>Open pack page</small>
            </a>`;
          })
          .join("")}
      </div>
      ${faqSection(faqs)}
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function drillPackPage(pack) {
  const currentUrl = drillPackUrl(pack);
  const spots = drillPackSpots(pack);
  const title = `${pack.label} Drill Pack`;
  const description = `${pack.description} Use this offline Smart Poker Lab landing page to understand the pack before training.`;
  const rows = packFocusRows(pack);
  const sampleSpots = spots.slice(0, 8);
  const sampleRows = sampleSpots.length
    ? sampleSpots.map((spot) => [spot.title, spot.mode || "Practice", spot.street || "Decision", spot.leak || "process"])
    : [["Browser-local queue", "Review", "Retry", "low-score spots saved in this browser"]];
  const faqs = [
    { question: "What is the purpose of this drill pack?", answer: pack.description },
    { question: "Does this page give real-time decisions?", answer: "No. It is for offline study, practice, and review only." },
    { question: "Where should I go after reading it?", answer: "Open Practice Mode, run five spots from this pack, then check Progress for the next leak." },
  ];
  const structured = scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        name: title,
        description,
        url: `${domain}${currentUrl}`,
        inLanguage: "en",
        learningResourceType: "Practice drill pack",
        educationalUse: "Practice",
      },
      faqJsonLd(faqs),
      breadcrumbJsonLd(currentUrl, title),
    ],
  });
  const body = `<main>
    <section class="page-hero drill-pack-hero">
      <p class="eyebrow">Drill Pack</p>
      <h1>${esc(title)}</h1>
      <p>${esc(description)}</p>
      <div class="hero-actions">
        <a class="primary-action" href="${rel(practiceUrlForPack(pack.id), currentUrl)}">Train This Pack</a>
        <a class="secondary-action" href="${rel("/progress/", currentUrl)}">Check Progress</a>
        <a class="secondary-action" href="${rel("/drill-packs/", currentUrl)}">All Packs</a>
      </div>
    </section>
    
    <section class="section drill-pack-detail-section">
      <div class="pack-stat-strip">
        <article><span>Pack</span><strong>${esc(pack.label)}</strong></article>
        <article><span>Available spots</span><strong>${esc(pack.dynamic ? "Local" : String(spots.length))}</strong></article>
        <article><span>Best routine</span><strong>5 decisions</strong></article>
        <article><span>Next step</span><strong>Progress report</strong></article>
      </div>
      <div class="drill-pack-hero-grid">
        <article class="drill-pack-explain-card">
          <p class="eyebrow">Why this pack matters</p>
          <h2>Train one leak family instead of wandering the site.</h2>
          <p>Use this page as a short briefing: understand the range idea, run a small Practice Mode sample, then let the local Progress page tell you which pack to repeat.</p>
          ${dataTable(["Focus", "Training note"], rows, "data-table mini-data-table")}
        </article>
        <article class="drill-pack-explain-card">
          <p class="eyebrow">Sample decisions</p>
          <h2>What you will practice</h2>
          ${dataTable(["Spot", "Mode", "Street", "Leak tag"], sampleRows, "data-table mini-data-table")}
        </article>
      </div>
      ${learningPath(currentUrl, [
        { title: "Practice Mode", description: "Make five decisions from the pack and record Smart Score.", url: practiceUrlForPack(pack.id) },
        { title: "Anonymous Hand Submission Guide", description: "Build a clean draft if this leak came from a real hand memory.", url: "/submit-hand/" },
        { title: "Weekly Challenge", description: "Add this pack to a seven-action study routine.", url: "/weekly-challenge/" },
      ])}
      ${faqSection(faqs)}
      <div class="responsible-box"><strong>Offline study boundary</strong><p>This pack is a study routine, not a poker room or live-play assistant.</p></div>
    </section>
  </main>`;
  return layout({ currentUrl, title, description, body, extraHead: structured });
}

function staticPage(page) {
  if (page.slug === "training-plan") return trainingPlanPage();
  const currentUrl = `/${page.slug}/`;
  const body = `<main>
    <article class="content-page">
      <p class="eyebrow">${brand.name}</p>
      <h1>${page.title}</h1>
      <p class="lead">${page.description}</p>
      ${page.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </article>
  </main>`;
  return layout({ currentUrl, title: page.title, description: page.description, body });
}

function offlinePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Offline | ${brand.name}</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;color:#101816;background:#f4f7f2;font-family:Arial,sans-serif}
      main{max-width:640px;padding:28px;background:#fff;border:1px solid #d6e0d8;border-radius:8px;box-shadow:0 24px 70px rgba(16,24,22,.14)}
      h1{margin:0 0 12px;font-size:34px;line-height:1}
      p{color:#5f6f68;line-height:1.6}
      a{display:inline-flex;margin-top:12px;padding:11px 16px;color:#07110f;background:#c9f4df;border-radius:8px;font-weight:800;text-decoration:none}
    </style>
  </head>
  <body>
    <main>
      <h1>You are offline.</h1>
      <p>Smart Poker Lab can cache the training shell, but this page could not be loaded right now. Reconnect, then reopen Daily Workout, Practice, or Progress.</p>
      <a href="/">Return Home</a>
    </main>
  </body>
</html>`;
}

function write(url, html) {
  const file = fileForUrl(url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, "utf8");
}

function mirrorDistToProjectRoot() {
  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    const source = path.join(outDir, entry.name);
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(source, target, { recursive: true, force: true });
    } else {
      fs.copyFileSync(source, target);
    }
  }
}

function build() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const urls = ["/"];
  write("/", homePage());

  write("/study/", studyPage());
  urls.push("/study/");

  write("/analyze/", analyzePage());
  urls.push("/analyze/");

  write("/progress/", progressPage());
  urls.push("/progress/");

  write("/practice/", practicePage());
  urls.push("/practice/");

  const learnArticles = articles.filter((article) => ["learn", "preflop"].includes(article.section));
  write("/learn/", indexPage({ currentUrl: "/learn/", title: "Texas Hold'em Beginner Guide", eyebrow: "Beginner", description: "Rules, hand rankings, position, common mistakes, and starting hands.", items: learnArticles }));
  urls.push("/learn/");

  const preflopArticles = articles.filter((article) => article.section === "preflop");
  write("/preflop/", indexPage({ currentUrl: "/preflop/", title: "Starting Hands and Preflop Ranges", eyebrow: "Preflop Training", description: "Use position, action, and opponent type to understand preflop ranges.", items: preflopArticles }));
  urls.push("/preflop/");

  const gtoArticles = articles.filter((article) => article.section === "gto");
  write("/gto/", indexPage({ currentUrl: "/gto/", title: "GTO Academy", eyebrow: "GTO Academy", description: "EV, SPR, range advantage, c-bets, blockers, and balanced baselines.", items: gtoArticles }));
  urls.push("/gto/");

  const playerArticles = articles.filter((article) => article.section === "player-types");
  write("/player-types/", indexPage({ currentUrl: "/player-types/", title: "Poker Player Type Guide", eyebrow: "Player Types", description: "Learn how to identify and adjust to calling stations, nits, maniacs, regulars, and over-bluffers.", items: playerArticles }));
  urls.push("/player-types/");

  for (const article of articles) {
    const url = articleUrl(article);
    write(url, articlePage(article));
    urls.push(url);
  }

  write("/hand-review/", handReviewIndex());
  urls.push("/hand-review/");
  for (const hand of handReviews) {
    const url = `/hand-review/${hand.slug}/`;
    write(url, handReviewPage(hand));
    urls.push(url);
  }

  write("/tools/", toolsPage());
  urls.push("/tools/");
  for (const slug of Object.keys(toolDetails)) {
    const url = `/tools/${slug}/`;
    write(url, toolDetailPage(slug));
    urls.push(url);
  }

  write("/resources/", resourcesIndexPage());
  urls.push("/resources/");
  for (const slug of Object.keys(resourceDetails)) {
    const url = `/resources/${slug}/`;
    write(url, resourcePage(slug));
    urls.push(url);
  }

  write("/glossary/", glossaryIndex());
  urls.push("/glossary/");
  for (const term of glossary) {
    const url = `/glossary/${term[0]}/`;
    write(url, glossaryPage(term));
    urls.push(url);
  }

  for (const page of staticPages) {
    const url = `/${page.slug}/`;
    write(url, staticPage(page));
    urls.push(url);
  }

  write("/training-plan/", trainingPlanPage());
  if (!urls.includes("/training-plan/")) urls.push("/training-plan/");
  for (const day of trainingPlan.filter((item) => item.day >= 1 && item.day <= 7)) {
    const url = `/training-plan/day-${String(day.day).padStart(2, "0")}/`;
    write(url, trainingDayPage(day));
    urls.push(url);
  }

  write("/submit-hand/", submitHandPage());
  urls.push("/submit-hand/");

  write("/weekly-challenge/", weeklyChallengePage());
  urls.push("/weekly-challenge/");

  write("/training-library/", trainingLibraryPage());
  urls.push("/training-library/");

  write("/drill-packs/", drillPacksIndexPage());
  urls.push("/drill-packs/");
  for (const pack of drillPackLandingPacks()) {
    const url = drillPackUrl(pack);
    write(url, drillPackPage(pack));
    urls.push(url);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${domain}${url}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap, "utf8");
  fs.writeFileSync(path.join(outDir, "robots.txt"), `User-Agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "offline.html"), offlinePage(), "utf8");
  fs.copyFileSync(path.join(root, "styles.css"), path.join(outDir, "styles.css"));
  fs.copyFileSync(path.join(root, "script.js"), path.join(outDir, "script.js"));
  fs.copyFileSync(path.join(root, "favicon.svg"), path.join(outDir, "favicon.svg"));
  fs.copyFileSync(path.join(root, "og-image.svg"), path.join(outDir, "og-image.svg"));
  fs.copyFileSync(path.join(root, "site.webmanifest"), path.join(outDir, "site.webmanifest"));
  if (fs.existsSync(path.join(root, "app-icon.svg"))) fs.copyFileSync(path.join(root, "app-icon.svg"), path.join(outDir, "app-icon.svg"));
  if (fs.existsSync(path.join(root, "service-worker.js"))) fs.copyFileSync(path.join(root, "service-worker.js"), path.join(outDir, "service-worker.js"));
  if (fs.existsSync(path.join(root, "assets"))) {
    const assetOut = path.join(outDir, "assets");
    fs.mkdirSync(assetOut, { recursive: true });
    for (const entry of fs.readdirSync(path.join(root, "assets"), { withFileTypes: true })) {
      if (entry.isFile()) {
        fs.copyFileSync(path.join(root, "assets", entry.name), path.join(assetOut, entry.name));
      }
    }
  }
  mirrorDistToProjectRoot();
}

build();
