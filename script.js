const rankOrder = "23456789TJQKA";
const suitSymbols = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const rankNames = {
  A: "A",
  K: "K",
  Q: "Q",
  J: "J",
  T: "T",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2",
};

function trackEvent(name, data = {}) {
  try {
    if (typeof window.va === "function") {
      window.va("event", { name, data });
    }
  } catch {
    // Analytics should never block study tools.
  }
}

function parseCards(input) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const value = raw.trim();
      const rank = value[0]?.toUpperCase();
      const suit = value[1]?.toLowerCase();
      if (!rankOrder.includes(rank) || !suitSymbols[suit]) {
        throw new Error(`Unrecognized card: ${raw}`);
      }
      return {
        raw: `${rank}${suit}`,
        rank,
        suit,
        value: rankOrder.indexOf(rank) + 2,
        label: `${rankNames[rank]}${suitSymbols[suit]}`,
      };
    });
}

function getCombinations(cards, size = 5) {
  const result = [];

  function walk(start, combo) {
    if (combo.length === size) {
      result.push(combo);
      return;
    }

    for (let index = start; index <= cards.length - (size - combo.length); index += 1) {
      walk(index + 1, combo.concat(cards[index]));
    }
  }

  walk(0, []);
  return result;
}

function evaluateFive(cards) {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map((card) => card.value);
  const counts = new Map();
  const suits = new Set(cards.map((card) => card.suit));

  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  const wheel = [14, 5, 4, 3, 2].every((value) => uniqueValues.includes(value));
  const normalStraight =
    uniqueValues.length === 5 && uniqueValues[0] - uniqueValues[4] === 4;
  const straightHigh = normalStraight ? uniqueValues[0] : wheel ? 5 : null;
  const flush = suits.size === 1;

  if (flush && straightHigh === 14) {
    return { score: [9, 14], name: "Royal Flush", cards: sorted };
  }

  if (flush && straightHigh) {
    return { score: [8, straightHigh], name: "Straight Flush", cards: sorted };
  }

  if (groups[0][1] === 4) {
    return { score: [7, groups[0][0], groups[1][0]], name: "Four of a Kind", cards: sorted };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { score: [6, groups[0][0], groups[1][0]], name: "Full House", cards: sorted };
  }

  if (flush) {
    return { score: [5, ...values], name: "Flush", cards: sorted };
  }

  if (straightHigh) {
    return { score: [4, straightHigh], name: "Straight", cards: sorted };
  }

  if (groups[0][1] === 3) {
    const kickers = groups.slice(1).map(([value]) => value);
    return { score: [3, groups[0][0], ...kickers], name: "Three of a Kind", cards: sorted };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return {
      score: [2, groups[0][0], groups[1][0], groups[2][0]],
      name: "Two Pair",
      cards: sorted,
    };
  }

  if (groups[0][1] === 2) {
    const kickers = groups.slice(1).map(([value]) => value);
    return { score: [1, groups[0][0], ...kickers], name: "One Pair", cards: sorted };
  }

  return { score: [0, ...values], name: "High Card", cards: sorted };
}

function compareScore(a, b) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function evaluateBestHand(cards) {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Please enter 5 to 7 cards.");
  }

  const unique = new Set(cards.map((card) => card.raw));
  if (unique.size !== cards.length) {
    throw new Error("Cards cannot repeat.");
  }

  return getCombinations(cards).reduce((best, combo) => {
    const current = evaluateFive(combo);
    if (!best || compareScore(current.score, best.score) > 0) {
      return current;
    }
    return best;
  }, null);
}

function renderHandResult() {
  const input = document.querySelector("#card-input");
  const result = document.querySelector("#hand-result");

  try {
    const cards = parseCards(input.value);
    const best = evaluateBestHand(cards);
    const labels = best.cards.map((card) => card.label).join(" ");
    result.textContent = `${best.name}: ${labels}`;
    trackEvent("hand_rank_checked", { result: best.name, cardCount: cards.length });
  } catch (error) {
    result.textContent = error.message;
  }
}

function renderPotOdds() {
  const pot = Number(document.querySelector("#pot-size").value);
  const bet = Number(document.querySelector("#bet-size").value);
  const call = Number(document.querySelector("#call-size").value);
  const result = document.querySelector("#odds-result");

  if ([pot, bet, call].some((value) => Number.isNaN(value) || value < 0)) {
    result.textContent = "Please enter numbers that are 0 or greater.";
    return;
  }

  const totalPot = pot + bet + call;
  if (totalPot <= 0 || call <= 0) {
    result.textContent = "The call amount must be greater than 0.";
    return;
  }

  const requiredEquity = (call / totalPot) * 100;
  result.textContent = `Final pot ${totalPot.toFixed(0)}. Required equity ${requiredEquity.toFixed(1)}%. A call has a mathematical basis only if your real equity is higher than this number.`;
  trackEvent("pot_odds_calculated", {
    pot,
    bet,
    call,
    requiredEquity: Number(requiredEquity.toFixed(1)),
  });
}

document.querySelector("#check-hand")?.addEventListener("click", renderHandResult);
document.querySelector("#calculate-odds")?.addEventListener("click", renderPotOdds);

document.querySelectorAll("#pot-size, #bet-size, #call-size").forEach((input) => {
  input.addEventListener("input", renderPotOdds);
});

document.querySelector("#card-input")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    renderHandResult();
  }
});

function readJsonScript(id, fallback) {
  const node = document.querySelector(`#${id}`);
  if (!node) return fallback;
  try {
    return JSON.parse(node.textContent);
  } catch {
    return fallback;
  }
}

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // If local storage is unavailable, the current-page tools should still work.
  }
}

function appendTrainingEvent(event) {
  const events = readStore("spl_training_events", []);
  events.unshift({ ...event, ts: Date.now() });
  writeStore("spl_training_events", events.slice(0, 120));
}

function appendCappedStore(key, event, limit = 80) {
  const events = readStore(key, []);
  events.unshift({ ...event, ts: Date.now() });
  writeStore(key, events.slice(0, limit));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function practicePackUrl(packId = "all") {
  return `/practice/?pack=${encodeURIComponent(packId || "all")}`;
}

function renderDataTable(headers, rows, label = "Training data") {
  return `<div class="data-table dynamic-data-table" role="region" aria-label="${escapeHtml(label)}" tabindex="0">
    <table>
      <thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function scoreTier(score) {
  if (score >= 90) return { label: "Recommended", className: "score-recommended", next: "Keep the line, then write the next-street plan." };
  if (score >= 70) return { label: "Acceptable", className: "score-acceptable", next: "Good candidate, but note the conditions that make it work." };
  if (score >= 40) return { label: "Needs Review", className: "score-review", next: "Add this idea to your review queue and repeat a similar spot." };
  if (score >= 10) return { label: "Clear Leak", className: "score-leak", next: "Run the linked drill pack before widening this line." };
  return { label: "Major Leak", className: "score-major", next: "Return to the baseline concept before using this action again." };
}

function spotValue(spot, key, fallback = "") {
  if (!spot) return fallback;
  if (spot[key]) return spot[key];
  if (key === "baseline") return spot.explanation?.gto || fallback;
  if (key === "exploit") return spot.explanation?.exploit || fallback;
  if (key === "nextPlan") return spot.explanation?.plan || spot.takeaway || fallback;
  return fallback;
}

function renderFeedbackLayers({ spot, option, context = "Practice" }) {
  const score = Number(option.score ?? (option.best ? 90 : 45));
  const tier = scoreTier(score);
  const tags = [option.leak, ...(spot.tags || spot.concepts || [])].filter(Boolean).slice(0, 4);
  const nextDrill = spot.related?.[0] || (option.leak && option.leak !== "best-move" ? "/practice/" : "/progress/");
  return `<div class="feedback-stack ${tier.className}">
    <strong>${escapeHtml(tier.label)}: ${escapeHtml(option.label)}</strong>
    <p>${escapeHtml(option.feedback || "Review the baseline before moving on.")}</p>
    ${renderDataTable(
      ["Layer", "Coach Feedback"],
      [
        ["Smart Score", `${score}/100 - ${tier.label}`],
        ["One-Line Takeaway", spotValue(spot, "takeaway", tier.next)],
        ["Beginner Mistake", option.leak && option.leak !== "best-move" ? `Leak tag: ${option.leak}` : "This action follows the stated training target."],
        ["Baseline", spotValue(spot, "baseline", "Name position, range, board texture, price, and bet purpose before choosing.")],
        ["Exploit Adjustment", spotValue(spot, "exploit", "Adjust only after naming a clear opponent leak.")],
        ["Next Street Plan", spotValue(spot, "nextPlan", tier.next)],
        ["Recommended Next Drill", `${context}: ${tags.join(" / ") || "repeat a similar spot"} -> ${nextDrill}`],
      ],
      `${context} feedback layers`,
    )}
  </div>`;
}

function renderSmartScore(card, option) {
  if (!card || !option) return;
  const score = Number(option.score ?? (option.best ? 90 : 45));
  const tier = scoreTier(score);
  card.hidden = false;
  card.classList.remove("score-recommended", "score-acceptable", "score-review", "score-leak", "score-major");
  card.classList.add(tier.className);
  card.querySelector("strong").textContent = `${score}/100`;
  const bar = card.querySelector(".score-track i");
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, score))}%`;
  const note = card.querySelector("p");
  if (note) note.textContent = `${tier.label}: ${option.leak || "decision-review"}`;
}

const TRAINING_STORAGE_KEYS = [
  "spl_training_events",
  "spl_daily_hand_answers",
  "spl_practice_session_v2",
  "spl_practice_index",
  "spl_training_progress",
  "spl_study_views",
  "spl_study_mastery",
  "spl_study_practice_queue",
  "spl_analyze_reports",
  "spl_player_type_result",
  "spl_waitlist_interest",
  "spl_onboarding_result",
  "spl_guided_tour_seen",
  "spl_spaced_review_queue",
  "spl_custom_ranges",
  "spl_range_challenge_history",
  "spl_daily_workout_v2",
];

function initGlobalSearch() {
  const items = readJsonScript("global-search-data", []);
  const form = document.querySelector(".site-search");
  const input = document.querySelector("#global-search-input");
  const panel = document.querySelector("#global-search-panel");
  const results = document.querySelector("#global-search-results");
  const close = document.querySelector("[data-close-search]");
  const shortcuts = document.querySelectorAll("[data-search-query]");
  if (!items.length || !form || !input || !panel || !results) return;

  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const haystacks = items.map((item) => ({
    ...item,
    haystack: normalize(`${item.title} ${item.description} ${(item.tags || []).join(" ")} ${item.type}`),
  }));

  function render(query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.textContent = "Try searches like BTN vs BB, river thin value, monotone, pot odds, or calling station.";
      return;
    }
    const matches = haystacks
      .map((item) => {
        const score = terms.reduce((sum, term) => sum + (item.haystack.includes(term) ? 1 : 0), 0);
        const titleBoost = terms.some((term) => normalize(item.title).includes(term)) ? 1.5 : 0;
        const trainingBoost = /drill|practice|trainer|hand review/i.test(item.type || "") ? 0.35 : 0;
        return { ...item, score: score + titleBoost + trainingBoost };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 12);
    if (!matches.length) {
      results.innerHTML = `<p>No exact match yet. Try a shorter query such as <b>river</b>, <b>BTN</b>, <b>c-bet</b>, or <b>thin value</b>.</p>`;
      return;
    }
    results.innerHTML = matches
      .map(
        (item) => `<a class="search-result-item" href="${escapeHtml(item.url)}">
          <span>${escapeHtml(item.type)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description || "Open this training item.")}</p>
          <em>${(item.tags || []).slice(0, 5).map((tag) => escapeHtml(tag)).join(" / ")}</em>
        </a>`,
      )
      .join("");
  }

  function openPanel() {
    panel.hidden = false;
    panel.classList.add("is-open");
  }

  input.addEventListener("input", () => {
    openPanel();
    render(input.value);
  });
  input.addEventListener("focus", () => {
    openPanel();
    render(input.value);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    openPanel();
    render(input.value);
    trackEvent("global_search_submitted", { query: input.value });
  });
  close?.addEventListener("click", () => {
    panel.hidden = true;
    panel.classList.remove("is-open");
  });
  shortcuts.forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.searchQuery || "";
      openPanel();
      render(input.value);
      trackEvent("global_search_shortcut_clicked", { query: input.value });
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      panel.classList.remove("is-open");
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      input.focus();
      openPanel();
    }
  });
}

function initOnboarding() {
  const questions = readJsonScript("onboarding-questions-data", []);
  const modal = document.querySelector("#onboarding-modal");
  const questionNode = document.querySelector("#onboarding-question");
  const optionsNode = document.querySelector("#onboarding-options");
  const progressNode = document.querySelector("#onboarding-progress");
  const resultNode = document.querySelector("#onboarding-result");
  const openButtons = document.querySelectorAll("[data-open-onboarding]");
  const closeButtons = document.querySelectorAll("[data-close-onboarding]");
  if (!questions.length || !modal || !questionNode || !optionsNode || !progressNode || !resultNode) return;

  let index = 0;
  const selections = [];

  function recommendation(score, counts) {
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "routine";
    if (score <= 50) return { title: "Start with the 7-Day Foundation Path", url: "/training-plan/day-01/", focus: "rules, position, pot odds, and first review habits" };
    const map = {
      "preflop-leak": { title: "Preflop Discipline Path", url: "/tools/range-trainer/", focus: "opening ranges, blind defense, and domination traps" },
      "math-leak": { title: "Pot Odds First Path", url: "/tools/pot-odds-trainer/", focus: "required equity and final-pot math" },
      "postflop-leak": { title: "Board Texture Path", url: "/practice/", focus: "c-bets, board families, and turn plans" },
      "texture-leak": { title: "Board Texture Path", url: "/tools/board-texture-atlas/", focus: "dry boards, wet boards, and range advantage" },
      "river-leak": { title: "River Decision Path", url: "/practice/", focus: "thin value, blockers, and bluff-catchers" },
      "player-type-leak": { title: "Player-Type Exploits Path", url: "/player-types/", focus: "calling stations, nits, maniacs, and regulars" },
      "review-leak": { title: "Review Habit Path", url: "/analyze/", focus: "structured hand reports and next drills" },
    };
    return map[top] || { title: "Today's 15-Minute Workout", url: "/tools/daily-hand/", focus: "one decision, one score, one next drill" };
  }

  function renderQuestion() {
    const current = questions[index];
    progressNode.textContent = `Question ${index + 1} of ${questions.length}`;
    questionNode.innerHTML = `<strong>${escapeHtml(current.question)}</strong>`;
    resultNode.hidden = true;
    optionsNode.innerHTML = current.options
      .map((option) => `<button class="answer-card" type="button" data-onboarding-answer="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`)
      .join("");
    optionsNode.querySelectorAll("[data-onboarding-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = current.options.find((option) => option.id === button.dataset.onboardingAnswer);
        if (!selected) return;
        selections.push({ question: current.id, option: selected.id, score: Number(selected.score), path: selected.path });
        index += 1;
        if (index >= questions.length) renderResult();
        else renderQuestion();
      });
    });
  }

  function renderResult() {
    const total = selections.reduce((sum, item) => sum + Number(item.score || 0), 0);
    const score = Math.round((total / (questions.length * 10)) * 100);
    const leakCounts = {};
    selections
      .filter((item) => item.score < 10)
      .forEach((item) => {
        leakCounts[item.path] = (leakCounts[item.path] || 0) + 1;
      });
    const rec = recommendation(score, leakCounts);
    const result = { score, recommendation: rec, leakCounts, ts: Date.now() };
    writeStore("spl_onboarding_result", result);
    appendTrainingEvent({
      source: "onboarding",
      title: "5-Minute Skill Check",
      score,
      grade: scoreTier(score).label,
      leak: Object.keys(leakCounts)[0] || "starter-path",
      pack: "onboarding",
    });
    progressNode.textContent = "Skill check complete";
    questionNode.innerHTML = `<strong>${score}/100 Smart Start Score</strong><p>Your suggested path: ${escapeHtml(rec.title)}.</p>`;
    optionsNode.innerHTML = "";
    resultNode.hidden = false;
    resultNode.innerHTML = `<p>Focus: ${escapeHtml(rec.focus)}.</p><div class="resource-actions"><a class="primary-action" href="${escapeHtml(rec.url)}">Open Recommended Path</a><a class="secondary-action" href="/tools/daily-hand/">Open Today's Workout</a></div>`;
    trackEvent("onboarding_completed", { score, recommendation: rec.title });
  }

  function openModal() {
    index = 0;
    selections.length = 0;
    modal.hidden = false;
    modal.classList.add("is-open");
    renderQuestion();
    trackEvent("onboarding_opened");
  }

  function closeModal() {
    modal.hidden = true;
    modal.classList.remove("is-open");
    writeStore("spl_onboarding_seen", true);
  }

  openButtons.forEach((button) => button.addEventListener("click", openModal));
  closeButtons.forEach((button) => button.addEventListener("click", closeModal));
}

function initGuidedTour() {
  const guide = document.querySelector("#guided-tour");
  if (!guide) return;
  const path = window.location.pathname;
  const shouldShow = (path.includes("/practice/") || path.includes("/tools/daily-hand/")) && !readStore("spl_guided_tour_seen", false);
  const close = () => {
    guide.hidden = true;
    guide.classList.remove("is-open");
    writeStore("spl_guided_tour_seen", true);
  };
  document.querySelectorAll("[data-close-guide]").forEach((button) => button.addEventListener("click", close));
  if (shouldShow) {
    window.setTimeout(() => {
      guide.hidden = false;
      guide.classList.add("is-open");
    }, 650);
  }
}

function initPwaInstall() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }

  const prompt = document.querySelector("#install-prompt");
  const installButton = document.querySelector("#install-app-button");
  const dismissButton = document.querySelector("#install-dismiss-button");
  if (!prompt || !installButton || !dismissButton) return;

  let deferredPrompt = null;
  const dismissed = readStore("spl_install_prompt_dismissed", false);
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (!dismissed && !standalone) {
      prompt.hidden = false;
      prompt.classList.add("is-open");
    }
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) {
      prompt.querySelector("p").textContent = "Use your browser menu to add Smart Poker Lab to the home screen. On iOS, use Share, then Add to Home Screen.";
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    prompt.hidden = true;
    prompt.classList.remove("is-open");
    trackEvent("pwa_install_prompt_clicked");
  });

  dismissButton.addEventListener("click", () => {
    writeStore("spl_install_prompt_dismissed", true);
    prompt.hidden = true;
    prompt.classList.remove("is-open");
  });
}

function initProgressBackup() {
  const exportButton = document.querySelector("#progress-export-backup");
  const importInput = document.querySelector("#progress-import-backup");
  const copyButton = document.querySelector("#progress-copy-backup-summary");
  const result = document.querySelector("#progress-backup-result");
  if (!exportButton || !importInput || !copyButton || !result) return;

  function snapshot() {
    const data = {};
    TRAINING_STORAGE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch (error) {
          data[key] = raw;
        }
      }
    });
    return {
      app: "Smart Poker Lab",
      version: 1,
      exportedAt: new Date().toISOString(),
      keys: Object.keys(data),
      data,
    };
  }

  function summaryText(backup = snapshot()) {
    const events = Array.isArray(backup.data.spl_training_events) ? backup.data.spl_training_events.length : 0;
    const reports = Array.isArray(backup.data.spl_analyze_reports) ? backup.data.spl_analyze_reports.length : 0;
    const plan = Array.isArray(backup.data.spl_training_progress) ? backup.data.spl_training_progress.length : 0;
    return `Smart Poker Lab local backup: ${events} training events, ${reports} Analyze reports, ${plan} plan checkoffs. Exported ${backup.exportedAt}.`;
  }

  exportButton.addEventListener("click", () => {
    const backup = snapshot();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `smart-poker-lab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    result.textContent = summaryText(backup);
    trackEvent("progress_backup_exported", { keys: backup.keys.length });
  });

  copyButton.addEventListener("click", async () => {
    const text = summaryText();
    await navigator.clipboard?.writeText(text).catch(() => null);
    result.textContent = text;
    trackEvent("progress_backup_summary_copied");
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (backup?.app !== "Smart Poker Lab" || !backup.data || typeof backup.data !== "object") {
        throw new Error("Invalid Smart Poker Lab backup.");
      }
      Object.entries(backup.data).forEach(([key, value]) => {
        if (TRAINING_STORAGE_KEYS.includes(key)) localStorage.setItem(key, JSON.stringify(value));
      });
      result.textContent = `Imported ${Object.keys(backup.data).filter((key) => TRAINING_STORAGE_KEYS.includes(key)).length} local progress keys. Refreshing report...`;
      trackEvent("progress_backup_imported");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      result.textContent = `Import failed: ${error.message}`;
    }
  });
}

function initRevealAnswers() {
  document.querySelectorAll(".reveal-answer").forEach((button) => {
    button.addEventListener("click", () => {
      const answer = button.parentElement?.querySelector(".hidden-answer");
      if (!answer) return;
      answer.hidden = !answer.hidden;
      button.textContent = answer.hidden ? "Show Answer" : "Hide Answer";
      trackEvent("training_answer_toggled", {
        path: window.location.pathname,
        open: !answer.hidden,
      });
    });
  });
}

function initDailyHand() {
  const hands = readJsonScript("daily-hand-data", []);
  const optionsNode = document.querySelector("#daily-hand-options");
  const result = document.querySelector("#daily-hand-result");
  const scoreCard = document.querySelector("#daily-hand-score");
  const titleNode = document.querySelector("#daily-hand-title");
  const subtitleNode = document.querySelector("#daily-hand-subtitle");
  const boardNode = document.querySelector("#daily-hand-board");
  const contextNode = document.querySelector("#daily-hand-context");
  const questionNode = document.querySelector("#daily-hand-question");
  const relatedNode = document.querySelector("#daily-related-drills");
  const streakNode = document.querySelector("#daily-workout-streak");
  const statusNode = document.querySelector("#daily-workout-status");
  const statusNote = document.querySelector("#daily-workout-status-note");
  const focusNode = document.querySelector("#daily-workout-focus");
  const focusNote = document.querySelector("#daily-workout-focus-note");
  const meterBar = document.querySelector("#daily-workout-meter-bar");
  const indexNode = document.querySelector("#daily-hand-index");
  const prevButton = document.querySelector("#daily-prev-hand");
  const nextButton = document.querySelector("#daily-next-hand");
  const routeCopy = document.querySelector("#daily-route-copy");
  const practiceRoute = document.querySelector("#daily-practice-route");
  const analyzeRoute = document.querySelector("#daily-analyze-route");
  const reviewButton = document.querySelector("#daily-review-note");
  const completeButton = document.querySelector("#daily-complete-workout");
  if (!hands.length || !optionsNode || !result) return;

  const cardLabel = (value) => `<span class="playing-card mini-card">${escapeHtml(value)}</span>`;
  const saved = readStore("spl_daily_hand_answers", {});
  const todayKey = new Date().toISOString().slice(0, 10);
  const yearStart = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - yearStart) / 86400000);
  const dailyIndex = dayOfYear % hands.length;
  let activeIndex = dailyIndex;
  let workout = readStore("spl_daily_workout_v2", {});

  function todayState() {
    workout.days = workout.days && typeof workout.days === "object" ? workout.days : {};
    workout.days[todayKey] = workout.days[todayKey] || { main: false, micro: [], review: false, complete: false, scores: [] };
    workout.days[todayKey].micro = Array.isArray(workout.days[todayKey].micro) ? workout.days[todayKey].micro : [];
    workout.days[todayKey].scores = Array.isArray(workout.days[todayKey].scores) ? workout.days[todayKey].scores : [];
    return workout.days[todayKey];
  }

  function saveWorkout() {
    writeStore("spl_daily_workout_v2", workout);
  }

  function dailyStreak() {
    const days = workout.days || {};
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days[key]?.complete) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function relatedHands(hand) {
    const tags = new Set([...(hand.tags || []), ...(hand.concepts || [])].map((tag) => String(tag).toLowerCase()));
    return hands
      .filter((item) => item.id !== hand.id)
      .map((item, index) => ({
        item,
        index,
        overlap: [...(item.tags || item.concepts || [])].filter((tag) => tags.has(String(tag).toLowerCase())).length,
      }))
      .sort((a, b) => b.overlap - a.overlap || a.index - b.index)
      .slice(0, 3)
      .map((entry) => entry.item);
  }

  function routeForHand(hand, option = null) {
    const tags = [option?.leak, ...(hand.tags || hand.concepts || [])].filter(Boolean).join(" ").toLowerCase();
    if (/preflop|blind|3-bet|4-bet|set mining|dominated/.test(tags)) return { label: "Preflop Discipline", url: practicePackUrl("preflop-discipline"), copy: "Run a preflop or range drill while this decision is fresh." };
    if (/pot odds|math|required equity|draw/.test(tags)) return { label: "Pot Odds Math", url: "/tools/pot-odds-trainer/", copy: "Repeat the price calculation before moving to another poker spot." };
    if (/river|thin value|bluff|blocker|bluff catcher/.test(tags)) return { label: "River Decisions", url: practicePackUrl("river-decision-lab"), copy: "Replay a river decision pack and then save one Analyze note." };
    if (/board|c-bet|texture|monotone|wet/.test(tags)) return { label: "Board Texture", url: "/tools/board-texture-atlas/", copy: "Study the board family, then run related c-bet spots." };
    if (/station|nit|maniac|player/.test(tags)) return { label: "Player-Type Exploits", url: "/player-types/", copy: "Review the opponent profile before changing the baseline." };
    return { label: "Practice Mode", url: practicePackUrl("all"), copy: "Run a related drill pack, then check Progress." };
  }

  function renderWorkoutStatus() {
    const state = todayState();
    const steps = {
      read: true,
      main: Boolean(state.main),
      micro: state.micro.length >= 2,
      route: Boolean(state.review || state.complete),
    };
    const percent = [steps.read, steps.main, steps.micro, steps.route].filter(Boolean).length * 25;
    document.querySelectorAll("[data-workout-step]").forEach((node) => {
      node.classList.toggle("is-complete", Boolean(steps[node.dataset.workoutStep]));
    });
    if (meterBar) meterBar.style.width = `${percent}%`;
    const streak = dailyStreak();
    if (streakNode) streakNode.textContent = `${streak} day${streak === 1 ? "" : "s"}`;
    if (statusNode) statusNode.textContent = state.complete ? "Complete" : state.main ? `${percent}% done` : "Not started";
    if (statusNote) statusNote.textContent = state.complete ? "Workout saved locally." : `Main hand ${state.main ? "done" : "open"} / mini-drills ${Math.min(2, state.micro.length)}/2 / review ${state.review ? "done" : "open"}.`;
  }

  function bindAnswerButtons() {
    const hand = hands[activeIndex];
    optionsNode.querySelectorAll("[data-daily-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const option = hand.options.find((item) => item.id === button.dataset.dailyAnswer);
        if (!option) return;
        optionsNode.querySelectorAll(".answer-card").forEach((item) => item.classList.remove("is-selected", "is-best"));
        button.classList.add("is-selected");
        if (option.best) button.classList.add("is-best");
        result.innerHTML = renderFeedbackLayers({ spot: hand, option, context: "Daily Workout" });
        renderSmartScore(scoreCard, option);
        recordAnswer(hand, option);
        const route = routeForHand(hand, option);
        if (routeCopy) routeCopy.textContent = `${route.copy} Low-score answers are useful because they tell the next drill where to start.`;
        if (practiceRoute) {
          practiceRoute.href = route.url;
          practiceRoute.textContent = `Open ${route.label}`;
        }
        renderWorkoutStatus();
      });
    });
  }

  function bindMiniDrills() {
    relatedNode?.querySelectorAll("[data-load-daily-hand]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextIndex = hands.findIndex((item) => item.id === button.dataset.loadDailyHand);
        if (nextIndex >= 0) renderHand(nextIndex, "mini-drill");
      });
    });
  }

  function recordAnswer(hand, option) {
    const state = todayState();
    saved[hand.id] = option.id;
    writeStore("spl_daily_hand_answers", saved);
    if (hand.id === hands[dailyIndex].id) state.main = true;
    else if (!state.micro.includes(hand.id)) state.micro.push(hand.id);
    state.scores.push({ hand: hand.id, score: Number(option.score ?? (option.best ? 90 : 45)), leak: option.leak || "decision-review", ts: Date.now() });
    saveWorkout();
    appendTrainingEvent({
      source: "daily-hand",
      title: hand.title,
      answer: option.label,
      score: Number(option.score ?? (option.best ? 90 : 45)),
      grade: option.grade || (option.best ? "Best Move" : "Review Needed"),
      leak: option.leak || "decision-review",
      spotId: hand.id,
      mode: hand.mode,
      street: hand.street,
      playerType: hand.playerType,
      pack: "daily-workout",
    });
    trackEvent("daily_hand_answered", {
      hand: hand.id,
      answer: option.id,
      recommended: Boolean(option.best),
      score: Number(option.score ?? (option.best ? 90 : 45)),
      main: hand.id === hands[dailyIndex].id,
    });
  }

  function renderHand(index, reason = "daily") {
    activeIndex = ((index % hands.length) + hands.length) % hands.length;
    const hand = hands[activeIndex];
    const selectedId = saved[hand.id];
    const route = routeForHand(hand);
    if (titleNode) titleNode.textContent = hand.title;
    if (subtitleNode) subtitleNode.textContent = hand.subtitle || hand.setup || "";
    if (boardNode) boardNode.innerHTML = [...(hand.hero || []), ...(hand.board || [])].map(cardLabel).join("");
    if (contextNode) contextNode.textContent = `${hand.villain || hand.playerType || ""} ${hand.pot || ""}`.trim();
    if (questionNode) questionNode.textContent = hand.question || "Hero acts. What is the best training line?";
    if (indexNode) indexNode.textContent = activeIndex === dailyIndex ? "Today's main spot" : `Mini-drill ${activeIndex + 1} / ${hands.length}`;
    if (focusNode) focusNode.textContent = (hand.tags || hand.concepts || ["Decision drill"]).slice(0, 2).join(" / ");
    if (focusNote) focusNote.textContent = route.copy;
    if (practiceRoute) {
      practiceRoute.href = route.url;
      practiceRoute.textContent = `Open ${route.label}`;
    }
    if (routeCopy) routeCopy.textContent = `${route.copy} This is offline study only, not real-time play support.`;
    optionsNode.innerHTML = hand.options
      .map((option) => `<button class="answer-card${selectedId === option.id ? " is-selected" : ""}${option.best && selectedId === option.id ? " is-best" : ""}" type="button" data-daily-answer="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`)
      .join("");
    if (relatedNode) {
      relatedNode.innerHTML = relatedHands(hand)
        .map((item) => `<li><button class="daily-mini-drill" type="button" data-load-daily-hand="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml((item.tags || item.concepts || []).slice(0, 3).join(" / ") || "Decision drill")}</span></button></li>`)
        .join("");
    }
    const option = hand.options.find((item) => item.id === selectedId);
    if (option) {
      result.innerHTML = renderFeedbackLayers({ spot: hand, option, context: "Daily Workout" });
      renderSmartScore(scoreCard, option);
    } else {
      result.innerHTML = "Choose an action to see score, leak label, baseline, exploit adjustment, next plan, and recommended next drill.";
      if (scoreCard) scoreCard.hidden = true;
    }
    bindAnswerButtons();
    bindMiniDrills();
    renderWorkoutStatus();
    trackEvent("daily_workout_spot_viewed", { hand: hand.id, reason });
  }

  prevButton?.addEventListener("click", () => renderHand(activeIndex - 1, "previous"));
  nextButton?.addEventListener("click", () => renderHand(activeIndex + 1, "next"));
  reviewButton?.addEventListener("click", () => {
    const state = todayState();
    state.review = true;
    saveWorkout();
    appendTrainingEvent({
      source: "daily-hand",
      title: "Daily Workout review note",
      answer: "User marked one offline review note complete.",
      score: 82,
      grade: "Review Habit",
      leak: "review-habit",
      pack: "daily-workout",
    });
    if (routeCopy) routeCopy.textContent = "Review note marked locally. Finish with one Practice pack or open Progress.";
    renderWorkoutStatus();
    trackEvent("daily_workout_review_note_marked", { date: todayKey });
  });
  completeButton?.addEventListener("click", () => {
    const state = todayState();
    state.complete = true;
    state.completedAt = Date.now();
    saveWorkout();
    appendTrainingEvent({
      source: "daily-hand",
      title: "15-Minute Daily Workout complete",
      answer: "Daily Workout completion saved locally.",
      score: state.scores.length ? Math.round(state.scores.reduce((sum, item) => sum + Number(item.score || 0), 0) / state.scores.length) : 80,
      grade: "Workout Complete",
      leak: "daily-routine",
      pack: "daily-workout",
    });
    if (routeCopy) routeCopy.textContent = "Workout complete. Progress now has today's Daily Workout event.";
    renderWorkoutStatus();
    trackEvent("daily_workout_completed", { date: todayKey, micro: state.micro.length });
  });
  analyzeRoute?.addEventListener("click", () => {
    const state = todayState();
    state.review = true;
    saveWorkout();
    renderWorkoutStatus();
  });

  renderHand(activeIndex, "today");
}

function initPreflopRange() {
  const ranges = readJsonScript("preflop-range-data", []);
  const select = document.querySelector("#range-position");
  const output = document.querySelector("#range-output");
  if (!ranges.length || !select || !output) return;

  select.innerHTML = ranges.map((range) => `<option value="${range.id}">${range.label}</option>`).join("");

  function renderRange() {
    const range = ranges.find((item) => item.id === select.value) || ranges[0];
    output.innerHTML = `<article class="range-card">
      <h3>${range.label}</h3>
      <p>${range.summary}</p>
      ${renderDataTable(
        ["Node", "Study Baseline", "What to Watch"],
        [
          ["Open / Baseline", range.open.join(" / "), "Start here before widening by table conditions."],
          ["Facing Pressure", range.call.join(" / "), "Continue by position, sizing, and opponent profile."],
          ["3-Bet Candidates", range.threeBet.join(" / "), "Use value, blockers, and playability instead of random aggression."],
        ],
        `${range.label} range table`,
      )}
      <div class="range-warning">${range.leak}</div>
    </article>`;
  }

  select.addEventListener("change", () => {
    renderRange();
    trackEvent("preflop_range_changed", { position: select.value });
  });
  renderRange();
}

function initPotOddsTrainer() {
  const drills = readJsonScript("pot-odds-trainer-data", []);
  const drillNode = document.querySelector("#pot-odds-drill");
  const answer = document.querySelector("#pot-odds-answer");
  const check = document.querySelector("#check-pot-odds");
  const next = document.querySelector("#next-pot-odds");
  const result = document.querySelector("#pot-odds-trainer-result");
  if (!drills.length || !drillNode || !answer || !check || !next || !result) return;

  let index = Number(readStore("spl_pot_odds_index", 0)) % drills.length;

  function renderDrill() {
    const drill = drills[index];
    drillNode.innerHTML = `<strong>Drill ${index + 1}: ${escapeHtml(drill.theme || "Pot odds")}</strong><p>Current pot ${drill.pot}, villain bets ${drill.bet}, and you must call ${drill.call}. What minimum equity do you need?</p><p class="hint">Formula to use after answering: call amount / final pot after calling.</p>`;
    answer.value = "";
    result.textContent = "Enter a percentage answer, for example 25.";
  }

  check.addEventListener("click", () => {
    const drill = drills[index];
    const value = Number(answer.value);
    if (Number.isNaN(value)) {
      result.textContent = "Please enter a number.";
      return;
    }
    const ok = Math.abs(value - drill.answer) <= 0.6;
    const finalPot = Number(drill.pot) + Number(drill.bet) + Number(drill.call);
    result.innerHTML = `<strong>${ok ? "Recommended" : "Needs Review"}: ${escapeHtml(String(value))}%</strong><br>${escapeHtml(drill.note)}<br><br><strong>Formula:</strong> call amount / final pot after calling = ${drill.call} / ${finalPot} = ${Number(drill.answer).toFixed(1)}%.<br><strong>Next plan:</strong> after the formula, check clean outs, implied odds, reverse implied odds, and future pressure.`;
    appendTrainingEvent({
      source: "pot-odds-trainer",
      title: `Pot odds drill ${index + 1}`,
      answer: `${value}%`,
      score: ok ? 100 : 45,
      grade: ok ? "Best Move" : "Math Review",
      leak: ok ? "best-move" : "pot-odds-math",
    });
    trackEvent("pot_odds_trainer_checked", {
      drill: index + 1,
      correct: ok,
      answer: value,
    });
  });

  next.addEventListener("click", () => {
    index = (index + 1) % drills.length;
    writeStore("spl_pot_odds_index", index);
    renderDrill();
    trackEvent("pot_odds_trainer_next", { drill: index + 1 });
  });

  renderDrill();
}

function initPlayerTypeTest() {
  const data = readJsonScript("player-type-test-data", null);
  const root = document.querySelector("#player-type-test");
  const result = document.querySelector("#player-type-result");
  if (!data || !root || !result) return;

  root.innerHTML = `${data.questions
    .map(
      (question, index) => `<fieldset class="test-question">
        <legend>${index + 1}. ${question.text}</legend>
        ${question.answers
          .map(([value, label]) => `<label><input type="radio" name="player-q-${index}" value="${value}" />${label}</label>`)
          .join("")}
      </fieldset>`,
    )
    .join("")}<button class="tool-button" id="score-player-type" type="button">Show Result</button>`;

  const saved = readStore("spl_player_type_result", null);
  if (saved && data.results[saved]) {
    result.textContent = `${data.results[saved].title}: ${data.results[saved].advice}`;
  }

  root.querySelector("#score-player-type")?.addEventListener("click", () => {
    const scores = {};
    data.questions.forEach((_, index) => {
      const selected = root.querySelector(`input[name="player-q-${index}"]:checked`);
      if (selected) scores[selected.value] = (scores[selected.value] || 0) + 1;
    });
    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "pro";
    const outcome = data.results[winner] || data.results.pro;
    result.textContent = `${outcome.title}: ${outcome.advice}`;
    writeStore("spl_player_type_result", winner);
    appendTrainingEvent({
      source: "player-type-test",
      title: outcome.title,
      answer: winner,
      score: 70,
      grade: "Profile",
      leak: winner,
    });
    trackEvent("player_type_completed", { result: winner });
  });
}

function initRangeTrainer() {
  const spots = readJsonScript("range-trainer-data", []);
  const matrices = readJsonScript("preflop-matrix-data", {});
  const spotNode = document.querySelector("#range-trainer-spot");
  const matrixNode = document.querySelector("#range-trainer-matrix");
  const matrixSelect = document.querySelector("#range-matrix-select");
  const comparePanel = document.querySelector("#range-compare-panel");
  const shapePanel = document.querySelector("#range-shape-panel");
  const matchupPanel = document.querySelector("#range-vs-range-panel");
  const toggleEditor = document.querySelector("#toggle-range-editor");
  const saveCustom = document.querySelector("#save-custom-range");
  const resetCustom = document.querySelector("#reset-custom-range");
  const challengeCard = document.querySelector("#range-daily-challenge");
  const startChallenge = document.querySelector("#start-range-challenge");
  const optionsNode = document.querySelector("#range-trainer-options");
  const result = document.querySelector("#range-trainer-result");
  const next = document.querySelector("#next-range-spot");
  const scoreCard = document.querySelector("#range-trainer-score");
  if (!spots.length || !spotNode || !optionsNode || !result || !next) return;

  let index = Number(readStore("spl_range_trainer_index", 0)) % spots.length;
  let selectedMatrixId = readStore("spl_range_matrix_id", spots[index]?.matrixId || Object.keys(matrices)[0] || "");
  let editMode = false;
  let paintAction = "raise";
  let customRanges = readCustomRanges();

  function readCustomRanges() {
    const data = readStore("spl_custom_ranges", {});
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  }

  function writeCustomRanges() {
    writeStore("spl_custom_ranges", customRanges);
  }

  function cloneMatrix(matrix) {
    return {
      ...matrix,
      rows: (matrix.rows || []).map((row) => row.map((cell) => ({ ...cell }))),
    };
  }

  function actionsFromMatrix(matrix) {
    const actions = {};
    (matrix.rows || []).forEach((row) => {
      row.forEach((cell) => {
        actions[cell.hand] = cell.action;
      });
    });
    return actions;
  }

  function matrixFromActions(base, actions = null) {
    const matrix = cloneMatrix(base);
    if (!actions) return matrix;
    matrix.rows = matrix.rows.map((row) => row.map((cell) => ({ ...cell, action: actions[cell.hand] || "fold" })));
    return matrix;
  }

  function ensureDraft(matrixId) {
    const base = matrices[matrixId] || Object.values(matrices)[0];
    if (!base) return null;
    if (!customRanges[matrixId]) {
      customRanges[matrixId] = {
        id: matrixId,
        title: base.title,
        updatedAt: null,
        actions: actionsFromMatrix(base),
      };
    }
    return customRanges[matrixId];
  }

  function countActions(matrix) {
    const counts = { raise: 0, call: 0, "three-bet": 0, fold: 0, playable: 0, total: 0 };
    (matrix.rows || []).forEach((row) => {
      row.forEach((cell) => {
        counts.total += 1;
        counts[cell.action] = (counts[cell.action] || 0) + 1;
        if (cell.action !== "fold") counts.playable += 1;
      });
    });
    return counts;
  }

  function rankValue(rank) {
    return "23456789TJQKA".indexOf(rank);
  }

  function isConnector(high, low) {
    return Math.abs(rankValue(high) - rankValue(low)) === 1;
  }

  function handBucket(hand) {
    if (!hand || hand.length < 2) return "Other";
    const first = hand[0];
    const second = hand[1];
    const suited = hand.endsWith("s");
    const offsuit = hand.endsWith("o");
    if (first === second) return ["22", "33", "44", "55", "66"].includes(hand) ? "Small Pairs" : "Pairs";
    if (first === "A" && suited) return "Suited Ax";
    if (first === "A" && offsuit) return "Offsuit Ax";
    if (["A", "K", "Q", "J", "T"].includes(first) && ["A", "K", "Q", "J", "T"].includes(second)) {
      return offsuit ? "Offsuit Broadways" : "Suited Broadways";
    }
    if (suited && isConnector(first, second)) return "Suited Connectors";
    if (offsuit && rankValue(first) <= rankValue("Q") && rankValue(second) <= rankValue("9")) return "Weak Offsuit";
    return suited ? "Other Suited" : "Other Offsuit";
  }

  function playableBuckets(matrix) {
    const buckets = {};
    (matrix.rows || []).forEach((row) => {
      row.forEach((cell) => {
        if (cell.action === "fold") return;
        const bucket = handBucket(cell.hand);
        buckets[bucket] = (buckets[bucket] || 0) + 1;
      });
    });
    return buckets;
  }

  function pct(value, total) {
    return Math.round((Number(value || 0) / Math.max(1, Number(total || 0))) * 100);
  }

  function compareMatrices(matrixId) {
    const base = matrices[matrixId] || Object.values(matrices)[0];
    if (!base) return null;
    const custom = customRanges[matrixId]?.actions ? matrixFromActions(base, customRanges[matrixId].actions) : null;
    const target = custom || base;
    const baseActions = actionsFromMatrix(base);
    const customActions = actionsFromMatrix(target);
    const stats = {
      added: 0,
      removed: 0,
      changed: 0,
      samePlayable: 0,
      addedHands: [],
      removedHands: [],
      changedHands: [],
      baseline: countActions(base),
      custom: countActions(target),
      baselineBuckets: playableBuckets(base),
      customBuckets: playableBuckets(target),
      hasCustom: Boolean(custom),
    };
    Object.keys(baseActions).forEach((hand) => {
      const before = baseActions[hand] || "fold";
      const after = customActions[hand] || "fold";
      if (before === after && before !== "fold") stats.samePlayable += 1;
      else if (before === "fold" && after !== "fold") {
        stats.added += 1;
        stats.addedHands.push(hand);
      } else if (before !== "fold" && after === "fold") {
        stats.removed += 1;
        stats.removedHands.push(hand);
      } else if (before !== after) {
        stats.changed += 1;
        stats.changedHands.push(hand);
      }
    });
    return stats;
  }

  function matrixDiagnosis(stats) {
    if (!stats) return [];
    const addedWeakOffsuit = stats.addedHands.filter((hand) => ["Weak Offsuit", "Offsuit Ax"].includes(handBucket(hand))).slice(0, 8);
    const removedPairs = stats.removedHands.filter((hand) => ["Pairs", "Small Pairs"].includes(handBucket(hand))).slice(0, 8);
    const deltaPlayable = stats.custom.playable - stats.baseline.playable;
    const notes = [];
    if (!stats.hasCustom) {
      notes.push(["Baseline only", "Save a custom range to unlock leak diagnosis.", "Start by editing one row, then compare shape before saving."]);
      return notes;
    }
    if (deltaPlayable >= 12) notes.push(["Too loose signal", `Your range adds ${deltaPlayable} playable hands versus baseline.`, "Check weak offsuit and dominated ace additions first."]);
    if (deltaPlayable <= -12) notes.push(["Too tight signal", `Your range removes ${Math.abs(deltaPlayable)} playable hands versus baseline.`, "Look for missed button opens, suited aces, and blind defenses."]);
    if (addedWeakOffsuit.length) notes.push(["Domination risk", addedWeakOffsuit.join(", "), "These added hands often make weak top pair and poor bluff-catchers."]);
    if (removedPairs.length) notes.push(["Pair discipline", removedPairs.join(", "), "Removing pairs may be fine shallow, but check stack depth before deleting them."]);
    if (stats.changed >= 18) notes.push(["Action drift", `${stats.changed} hands changed action class.`, "Separate raise, call, and 3-bet jobs instead of painting broad areas."]);
    if (!notes.length) notes.push(["Close to baseline", "Your custom range stays near the beginner shape.", "Now test it with five Range Trainer decisions."]);
    return notes.slice(0, 4);
  }

  function renderShapePanel(matrixId, stats) {
    if (!shapePanel || !stats) return;
    const buckets = ["Pairs", "Small Pairs", "Suited Ax", "Offsuit Ax", "Suited Broadways", "Offsuit Broadways", "Suited Connectors", "Weak Offsuit"];
    const rows = buckets.map((bucket) => {
      const baseline = stats.baselineBuckets[bucket] || 0;
      const custom = stats.customBuckets[bucket] || 0;
      const cue = custom > baseline
        ? "Expanded: confirm position, domination risk, and players behind."
        : custom < baseline
          ? "Reduced: confirm you are not over-folding playable hands."
          : "Aligned with baseline shape.";
      return [bucket, String(baseline), String(custom), cue];
    });
    const diagnoses = matrixDiagnosis(stats)
      .map(([title, body, cue]) => `<article><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p><small>${escapeHtml(cue)}</small></article>`)
      .join("");
    shapePanel.innerHTML = `<strong>Range Shape Coach</strong>
      <p>Compare hand buckets instead of memorizing isolated cells. This is a beginner training diagnostic, not an exact solver report.</p>
      ${renderDataTable(["Hand Bucket", "Baseline", "Your Range", "Coach Cue"], rows, "Range shape bucket comparison")}
      <div class="range-diagnosis-grid">${diagnoses}</div>`;
  }

  function renderMatchupPanel(matrixId, stats) {
    if (!matchupPanel || !stats) return;
    const base = matrices[matrixId] || Object.values(matrices)[0];
    const opponent = matrices[base?.opponentMatrixId] || matrices["bb-defend-btn"] || Object.values(matrices)[0];
    if (!base || !opponent) return;
    const opponentCounts = countActions(opponent);
    const opponentBuckets = playableBuckets(opponent);
    const heroCounts = stats.custom;
    const heroBuckets = stats.customBuckets;
    const rows = [
      ["Playable Density", pct(heroCounts.playable, heroCounts.total), pct(opponentCounts.playable, opponentCounts.total)],
      ["Pair Weight", pct((heroBuckets.Pairs || 0) + (heroBuckets["Small Pairs"] || 0), heroCounts.playable), pct((opponentBuckets.Pairs || 0) + (opponentBuckets["Small Pairs"] || 0), opponentCounts.playable)],
      ["Broadway Weight", pct((heroBuckets["Suited Broadways"] || 0) + (heroBuckets["Offsuit Broadways"] || 0), heroCounts.playable), pct((opponentBuckets["Suited Broadways"] || 0) + (opponentBuckets["Offsuit Broadways"] || 0), opponentCounts.playable)],
      ["Suited Ace Weight", pct(heroBuckets["Suited Ax"] || 0, heroCounts.playable), pct(opponentBuckets["Suited Ax"] || 0, opponentCounts.playable)],
      ["Connector Weight", pct(heroBuckets["Suited Connectors"] || 0, heroCounts.playable), pct(opponentBuckets["Suited Connectors"] || 0, opponentCounts.playable)],
    ];
    const bars = rows
      .map(([label, hero, villain]) => `<article>
        <div><span>${escapeHtml(label)}</span><b>${hero}% / ${villain}%</b></div>
        <div class="range-vs-bars"><i><em style="width:${hero}%"></em></i><i><em style="width:${villain}%"></em></i></div>
      </article>`)
      .join("");
    const pressureRows = base.pressureRows || [["Pressure cue", "Study", base.shapeCue || "Name position and range before choosing a hand."]];
    matchupPanel.innerHTML = `<strong>${escapeHtml(base.matchupTitle || "Range-vs-Range Shape Preview")}</strong>
      <p>${escapeHtml(base.shapeCue || "Compare broad shape before memorizing individual hands.")}</p>
      <div class="range-vs-range-bars">${bars}</div>
      ${renderDataTable(["Pressure Row", "Signal", "Training Use"], pressureRows, "Range matchup pressure rows")}
      <p class="range-compare-note">Bars compare simplified range shape, not solver EV, exact equity, or real-time decision support.</p>`;
  }

  function renderComparison(matrixId) {
    if (!comparePanel) return;
    const stats = compareMatrices(matrixId);
    if (!stats) return;
    const baselinePct = Math.round((stats.baseline.playable / Math.max(1, stats.baseline.total)) * 100);
    const customPct = Math.round((stats.custom.playable / Math.max(1, stats.custom.total)) * 100);
    comparePanel.innerHTML = `<strong>Range Comparison</strong>
      <p>${stats.hasCustom ? "Custom range is saved in this browser." : "No custom range saved yet. Edit the matrix to create one."}</p>
      <div class="range-compare-grid">
        <article><span>Baseline Playable</span><b>${stats.baseline.playable}/169</b><i><em style="width:${baselinePct}%"></em></i></article>
        <article><span>Your Playable</span><b>${stats.custom.playable}/169</b><i><em style="width:${customPct}%"></em></i></article>
        <article><span>Added Hands</span><b>${stats.added}</b><small>Fold to playable</small></article>
        <article><span>Removed Hands</span><b>${stats.removed}</b><small>Playable to fold</small></article>
        <article><span>Changed Actions</span><b>${stats.changed}</b><small>Raise / call / 3-bet shift</small></article>
        <article><span>Matched Playable</span><b>${stats.samePlayable}</b><small>Same non-fold action</small></article>
      </div>
      <p class="range-compare-note">This comparison is a range-shape study aid. It is not a solver output or real-time play recommendation.</p>`;
    renderShapePanel(matrixId, stats);
    renderMatchupPanel(matrixId, stats);
  }

  function todayChallengeIds() {
    const day = Math.floor(Date.now() / 86400000);
    const ids = [];
    for (let i = 0; i < Math.min(5, spots.length); i += 1) {
      ids.push(spots[(day * 7 + i * 11) % spots.length].id);
    }
    return ids;
  }

  function challengeKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderChallenge() {
    if (!challengeCard) return;
    const ids = todayChallengeIds();
    const history = readStore("spl_range_challenge_history", {});
    const today = history[challengeKey()] || {};
    const completed = ids.filter((id) => today[id]).length;
    const scores = ids.map((id) => today[id]?.score).filter((score) => Number.isFinite(Number(score)));
    const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + Number(score), 0) / scores.length) : 0;
    const list = ids
      .map((id) => {
        const spot = spots.find((item) => item.id === id);
        const done = today[id];
        return `<button type="button" class="mini-action range-challenge-link${done ? " is-complete" : ""}" data-range-challenge-id="${escapeHtml(id)}">${escapeHtml(spot?.title || id)}${done ? ` / ${Number(done.score)}` : ""}</button>`;
      })
      .join("");
    challengeCard.querySelector("p").innerHTML = `${completed}/5 complete${scores.length ? ` / average ${avg}` : ""}. Today&apos;s five spots stay local to this browser.`;
    const existingList = challengeCard.querySelector(".range-challenge-list");
    if (existingList) existingList.remove();
    challengeCard.insertAdjacentHTML("beforeend", `<div class="range-challenge-list">${list}</div>`);
    challengeCard.querySelectorAll("[data-range-challenge-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextIndex = spots.findIndex((spot) => spot.id === button.dataset.rangeChallengeId);
        if (nextIndex >= 0) {
          index = nextIndex;
          writeStore("spl_range_trainer_index", index);
          renderSpot();
        }
      });
    });
  }

  function renderMatrix(matrixId) {
    if (!matrixNode) return;
    selectedMatrixId = matrixId || selectedMatrixId;
    writeStore("spl_range_matrix_id", selectedMatrixId);
    if (matrixSelect && matrixSelect.value !== selectedMatrixId) matrixSelect.value = selectedMatrixId;
    const base = matrices[selectedMatrixId] || Object.values(matrices)[0];
    if (!base) {
      matrixNode.innerHTML = "";
      return;
    }
    const hasCustom = Boolean(customRanges[selectedMatrixId]?.actions);
    const matrix = hasCustom ? matrixFromActions(base, customRanges[selectedMatrixId].actions) : base;
    const headers = matrix.ranks || [];
    const bodyRows = (matrix.rows || [])
      .map(
        (row, rowIndex) => `<tr>
          <th scope="row">${escapeHtml(headers[rowIndex] || "")}</th>
          ${row
            .map((cell, colIndex) => {
              const baselineAction = base.rows?.[rowIndex]?.[colIndex]?.action || "fold";
              const changed = baselineAction !== cell.action;
              return `<td class="matrix-cell matrix-${escapeHtml(cell.action)}${changed ? " is-changed" : ""}${editMode ? " is-editable" : ""}" title="${escapeHtml(cell.hand)}: ${escapeHtml(cell.action)}${changed ? ` / baseline ${escapeHtml(baselineAction)}` : ""}">
                <button type="button" data-range-cell="${escapeHtml(cell.hand)}" data-action="${escapeHtml(cell.action)}" ${editMode ? "" : "disabled"}><span>${escapeHtml(cell.hand)}</span></button>
              </td>`;
            })
            .join("")}
        </tr>`,
      )
      .join("");
    matrixNode.innerHTML = `<div class="range-matrix-header">
        <div><strong>${escapeHtml(matrix.title)}</strong><small>${hasCustom ? "Custom browser-local view" : "Beginner baseline view"}</small></div>
        <p>${escapeHtml(matrix.summary)}</p>
      </div>
      <div class="range-matrix-scroll" role="region" aria-label="${escapeHtml(matrix.title)}" tabindex="0">
        <table class="range-matrix-table">
          <thead><tr><th></th>${headers.map((rank) => `<th scope="col">${escapeHtml(rank)}</th>`).join("")}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div class="matrix-legend">${(matrix.legend || [])
        .map(([action, label]) => `<span class="matrix-key matrix-${escapeHtml(action)}">${escapeHtml(action)}: ${escapeHtml(label)}</span>`)
        .join("")}</div>`;
    matrixNode.querySelectorAll("[data-range-cell]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!editMode) return;
        const draft = ensureDraft(selectedMatrixId);
        if (!draft) return;
        draft.actions[button.dataset.rangeCell] = paintAction;
        result.textContent = `${button.dataset.rangeCell} set to ${paintAction}. Save Custom to keep this matrix in the browser.`;
        renderMatrix(selectedMatrixId);
      });
    });
    renderComparison(selectedMatrixId);
  }

  function renderSpot() {
    const spot = spots[index];
    spotNode.innerHTML = `<strong>${escapeHtml(spot.title)}</strong><p>${escapeHtml(spot.setup)}</p><p><em>${escapeHtml(spot.concept || spot.baseline || "")}</em></p>`;
    renderMatrix(spot.matrixId);
    optionsNode.innerHTML = spot.options
      .map((option) => `<button class="answer-card" type="button" data-range-answer="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`)
      .join("");
    result.textContent = "Choose an action to see the range review.";
    if (scoreCard) scoreCard.hidden = true;
    optionsNode.querySelectorAll("[data-range-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const option = spot.options.find((item) => item.id === button.dataset.rangeAnswer);
        if (!option) return;
        optionsNode.querySelectorAll(".answer-card").forEach((item) => item.classList.remove("is-selected", "is-best"));
        button.classList.add("is-selected");
        if (option.best) button.classList.add("is-best");
        renderSmartScore(scoreCard, option);
        result.innerHTML = renderFeedbackLayers({ spot, option, context: "Range Trainer" });
        appendTrainingEvent({
          source: "range-trainer",
          title: spot.title,
          answer: option.label,
          score: Number(option.score ?? (option.best ? 90 : 45)),
          grade: option.grade || (option.best ? "Best Move" : "Review Needed"),
          leak: option.leak || "range-review",
          spotId: spot.id,
          mode: spot.mode,
          street: spot.street,
          playerType: spot.playerType,
          pack: "preflop-discipline",
        });
        const challengeIds = todayChallengeIds();
        if (challengeIds.includes(spot.id)) {
          const history = readStore("spl_range_challenge_history", {});
          const key = challengeKey();
          history[key] = history[key] || {};
          history[key][spot.id] = {
            score: Number(option.score ?? (option.best ? 90 : 45)),
            leak: option.leak || "range-review",
            answeredAt: new Date().toISOString(),
          };
          writeStore("spl_range_challenge_history", history);
          renderChallenge();
        }
        trackEvent("range_trainer_answered", {
          spot: spot.id,
          answer: option.id,
          score: Number(option.score ?? (option.best ? 90 : 45)),
        });
      });
    });
  }

  next.addEventListener("click", () => {
    index = (index + 1) % spots.length;
    writeStore("spl_range_trainer_index", index);
    renderSpot();
    trackEvent("range_trainer_next", { spot: spots[index].id });
  });

  if (matrixSelect) {
    matrixSelect.value = selectedMatrixId;
    matrixSelect.addEventListener("change", () => {
      selectedMatrixId = matrixSelect.value;
      writeStore("spl_range_matrix_id", selectedMatrixId);
      renderMatrix(selectedMatrixId);
      trackEvent("range_matrix_selected", { matrix: selectedMatrixId });
    });
  }

  document.querySelectorAll("[data-range-paint]").forEach((button) => {
    button.addEventListener("click", () => {
      paintAction = button.dataset.rangePaint || "raise";
      document.querySelectorAll("[data-range-paint]").forEach((item) => item.classList.toggle("is-active", item === button));
      result.textContent = `Paint mode: ${paintAction}. Turn on Edit Matrix, then tap hands in the matrix.`;
    });
  });

  if (toggleEditor) {
    toggleEditor.addEventListener("click", () => {
      editMode = !editMode;
      if (editMode) ensureDraft(selectedMatrixId);
      toggleEditor.textContent = editMode ? "Stop Editing" : "Edit Matrix";
      result.textContent = editMode ? "Edit mode is on. Choose an action, then tap matrix cells." : "Edit mode is off. Custom range remains in this browser after saving.";
      renderMatrix(selectedMatrixId);
      trackEvent("range_editor_toggled", { enabled: editMode, matrix: selectedMatrixId });
    });
  }

  if (saveCustom) {
    saveCustom.addEventListener("click", () => {
      const draft = ensureDraft(selectedMatrixId);
      if (!draft) return;
      draft.updatedAt = new Date().toISOString();
      writeCustomRanges();
      renderMatrix(selectedMatrixId);
      result.textContent = `${matrices[selectedMatrixId]?.title || "Custom range"} saved locally in this browser.`;
      appendTrainingEvent({
        source: "range-editor",
        title: `Saved custom ${matrices[selectedMatrixId]?.title || selectedMatrixId}`,
        score: 75,
        grade: "Local Range",
        leak: "custom-range",
        mode: "Preflop",
        street: "Preflop",
      });
      trackEvent("custom_range_saved", { matrix: selectedMatrixId });
    });
  }

  if (resetCustom) {
    resetCustom.addEventListener("click", () => {
      delete customRanges[selectedMatrixId];
      writeCustomRanges();
      renderMatrix(selectedMatrixId);
      result.textContent = `${matrices[selectedMatrixId]?.title || "Matrix"} reset to the beginner baseline.`;
      trackEvent("custom_range_reset", { matrix: selectedMatrixId });
    });
  }

  if (startChallenge) {
    startChallenge.addEventListener("click", () => {
      const firstId = todayChallengeIds()[0];
      const nextIndex = spots.findIndex((spot) => spot.id === firstId);
      if (nextIndex >= 0) {
        index = nextIndex;
        writeStore("spl_range_trainer_index", index);
        renderSpot();
        result.textContent = "Daily Preflop Discipline challenge started. Complete the five highlighted spots.";
        trackEvent("range_challenge_started", { date: challengeKey() });
      }
    });
  }

  renderChallenge();
  renderSpot();
}

function initStudyMode() {
  const spots = readJsonScript("study-mode-data", []);
  const packs = readJsonScript("study-practice-packs-data", []);
  const positionFilter = document.querySelector("#study-position-filter");
  const textureFilter = document.querySelector("#study-texture-filter");
  const conceptFilter = document.querySelector("#study-concept-filter");
  const streetFilter = document.querySelector("#study-street-filter");
  const listNode = document.querySelector("#study-list");
  const meta = document.querySelector("#study-meta");
  const activeTitle = document.querySelector("#study-active-title");
  const activeSummary = document.querySelector("#study-active-summary");
  const viewedCount = document.querySelector("#study-viewed-count");
  const masteredCount = document.querySelector("#study-mastered-count");
  const queuedCount = document.querySelector("#study-queued-count");
  const title = document.querySelector("#study-title");
  const setup = document.querySelector("#study-setup");
  const board = document.querySelector("#study-board");
  const lensGrid = document.querySelector("#study-lens-grid");
  const baseline = document.querySelector("#study-baseline");
  const exploit = document.querySelector("#study-exploit");
  const checkRange = document.querySelector("#study-check-range");
  const drill = document.querySelector("#study-drill");
  const dataTableNode = document.querySelector("#study-data-table");
  const mistakes = document.querySelector("#study-mistakes");
  const linkedPack = document.querySelector("#study-linked-pack");
  const actionResult = document.querySelector("#study-action-result");
  const compareBox = document.querySelector("#study-compare-box");
  const resourceLinks = document.querySelector("#study-resource-links");
  const markButton = document.querySelector("#study-mark-mastered");
  const sendButton = document.querySelector("#study-send-practice");
  const copyButton = document.querySelector("#study-copy-notes");
  if (!spots.length || !positionFilter || !textureFilter || !conceptFilter || !streetFilter || !listNode || !meta || !title || !setup || !board || !lensGrid || !baseline || !exploit || !checkRange || !drill || !mistakes || !linkedPack || !compareBox || !resourceLinks || !markButton || !sendButton || !copyButton) return;

  const state = readStore("spl_study_mode_state", {});
  let selectedId = window.location.hash?.replace("#", "") || state.selectedId || spots[0].id;
  let currentSpot = spots.find((spot) => spot.id === selectedId) || spots[0];

  function fillFilter(select, values, savedValue) {
    const existing = select.querySelector("option[value='all']")?.outerHTML || `<option value="all">All</option>`;
    select.innerHTML = `${existing}${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    if (savedValue && [...select.options].some((option) => option.value === savedValue)) select.value = savedValue;
  }

  fillFilter(positionFilter, [...new Set(spots.map((spot) => spot.position))], state.position);
  fillFilter(textureFilter, [...new Set(spots.map((spot) => spot.texture))], state.texture);
  fillFilter(conceptFilter, [...new Set(spots.map((spot) => spot.concept))], state.concept);
  fillFilter(streetFilter, [...new Set(spots.map((spot) => spot.street))], state.street);

  function readMastery() {
    const data = readStore("spl_study_mastery", {});
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  }

  function writeMastery(data) {
    writeStore("spl_study_mastery", data);
  }

  function readQueue() {
    return readStore("spl_study_practice_queue", []);
  }

  function writeQueue(queue) {
    writeStore("spl_study_practice_queue", queue.slice(0, 40));
  }

  function packForSpot(spot) {
    const concept = `${spot.concept} ${spot.texture} ${spot.potType} ${spot.street}`.toLowerCase();
    let id = "all";
    if (concept.includes("preflop") || concept.includes("range construction")) id = "preflop-discipline";
    else if (concept.includes("thin value") || concept.includes("relative hand") || concept.includes("top pair")) id = "value";
    else if (concept.includes("blocker") || spot.street === "River") id = "river-decisions";
    else if (concept.includes("spr") || concept.includes("equity") || concept.includes("implied") || concept.includes("stack")) id = "math-stack-depth";
    else if (concept.includes("range advantage") || concept.includes("board texture") || concept.includes("barreling") || concept.includes("c-bet")) id = "board-texture";
    return packs.find((pack) => pack.id === id) || packs[0] || { id: "all", label: "All Spots", description: "Cycle through every available decision." };
  }

  function lensForSpot(spot) {
    const texture = spot.texture.toLowerCase();
    const street = spot.street.toLowerCase();
    const rangeNote = texture.includes("preflop")
      ? "Build the continuing range before emotion arrives: open, call, 3-bet, fold, or prepare for reshove."
      : texture.includes("low connected") || texture.includes("dynamic") || texture.includes("monotone")
        ? "Do not assume the raiser owns the board. Compare nutted hands, draws, and pair-plus-draw continues."
        : texture.includes("high") || texture.includes("ace")
          ? "Start with high-card density, strong top pairs, and overpairs, then check whether the caller still has nutted exceptions."
          : "Compare both whole ranges before grading one exact hand.";
    const pressureNote = street === "river"
      ? "River decisions need value targets, bluff blockers, and opponent fold frequency."
      : street === "turn"
        ? "Turn cards shift ranges. Re-check draws, SPR, and whether the previous street's story still holds."
        : street === "preflop"
          ? "Preflop decisions need a response plan before the pot grows."
          : "Flop strategy starts with board texture, range advantage, and the job of the bet.";
    return [
      ["Range Lens", rangeNote],
      ["Pressure Point", pressureNote],
      ["Study Output", "Write one baseline line, one exploit adjustment, and one mistake to avoid before opening Practice."],
    ];
  }

  function renderStats() {
    const uniqueViews = new Set(readStore("spl_study_views", []).map((view) => view.id)).size;
    const mastery = readMastery();
    const queue = readQueue();
    if (viewedCount) viewedCount.textContent = String(uniqueViews);
    if (masteredCount) masteredCount.textContent = String(Object.keys(mastery).length);
    if (queuedCount) queuedCount.textContent = String(queue.length);
  }

  function studyNotesText(spot) {
    const pack = packForSpot(spot);
    return [
      `Smart Poker Lab Study Notes`,
      `${spot.title}`,
      `Spot: ${spot.potType}, ${spot.position}, ${spot.street}, ${spot.texture}`,
      `Board: ${spot.board}`,
      `Setup: ${spot.setup}`,
      `Baseline: ${spot.baseline}`,
      `Exploit adjustment: ${spot.exploit}`,
      `Check-range note: ${spot.checkRange}`,
      `Beginner traps: ${spot.mistakes.join("; ")}`,
      `Training drill: ${spot.drill}`,
      `Recommended drill pack: ${pack.label}`,
    ].join("\n");
  }

  function filteredSpots() {
    return spots.filter((spot) => {
      const positionOk = positionFilter.value === "all" || spot.position === positionFilter.value;
      const textureOk = textureFilter.value === "all" || spot.texture === textureFilter.value;
      const conceptOk = conceptFilter.value === "all" || spot.concept === conceptFilter.value;
      const streetOk = streetFilter.value === "all" || spot.street === streetFilter.value;
      return positionOk && textureOk && conceptOk && streetOk;
    });
  }

  function renderCompare(spot) {
    const related = spots
      .filter((item) => item.id !== spot.id && (item.concept === spot.concept || item.texture === spot.texture || item.street === spot.street))
      .slice(0, 3);
    compareBox.innerHTML = related.length
      ? `<strong>Compare Nearby Patterns</strong><div>${related
          .map((item) => `<button class="mini-action study-compare-action" type="button" data-study-compare="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>`)
          .join("")}</div>`
      : "";
    compareBox.querySelectorAll("[data-study-compare]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextSpot = spots.find((item) => item.id === button.dataset.studyCompare);
        if (nextSpot) renderSpot(nextSpot);
      });
    });
  }

  function renderSpot(spot) {
    if (!spot) return;
    currentSpot = spot;
    selectedId = spot.id;
    writeStore("spl_study_mode_state", {
      selectedId,
      position: positionFilter.value,
      texture: textureFilter.value,
      concept: conceptFilter.value,
      street: streetFilter.value,
    });
    const pack = packForSpot(spot);
    const mastery = readMastery();
    const queue = readQueue();
    meta.innerHTML = `<span>${escapeHtml(spot.potType)}</span><span>${escapeHtml(spot.position)}</span><span>${escapeHtml(spot.street)}</span><span>${escapeHtml(spot.concept)}</span>`;
    if (activeTitle) activeTitle.textContent = spot.title;
    if (activeSummary) activeSummary.textContent = `${spot.texture} / ${spot.concept}. Recommended pack: ${pack.label}.`;
    title.textContent = spot.title;
    setup.textContent = spot.setup;
    board.innerHTML = spot.board
      .split(/\s+/)
      .map((card) => `<span>${escapeHtml(card)}</span>`)
      .join("");
    lensGrid.innerHTML = lensForSpot(spot)
      .map(([label, text]) => `<article><span>${escapeHtml(label)}</span><p>${escapeHtml(text)}</p></article>`)
      .join("");
    baseline.textContent = spot.baseline;
    exploit.textContent = spot.exploit;
    checkRange.textContent = spot.checkRange;
    drill.textContent = spot.drill;
    if (dataTableNode) {
      dataTableNode.innerHTML = renderDataTable(
        ["Report Row", "Current Spot", "Training Use"],
        [
          ["Board", spot.board, "Start with texture before exact hand strength."],
          ["Baseline", spot.baseline, "Use this as the balanced reference point."],
          ["Exploit", spot.exploit, "Adjust only after naming the opponent leak."],
          ["Next Drill", `${pack.label}: ${pack.description || "Practice this decision type."}`, "Turn study into repetition."],
        ],
        `${spot.title} report table`,
      );
    }
    mistakes.innerHTML = spot.mistakes.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    linkedPack.innerHTML = `<b>${escapeHtml(pack.label)}</b>: ${escapeHtml(pack.description || "Use Practice Mode to drill the matching decision type.")}`;
    resourceLinks.innerHTML = spot.links?.length
      ? `<strong>Open Related Lessons</strong><div>${spot.links
          .map((link, index) => {
            const labels = ["Concept Lesson", "Hand Review", "Practice"];
            return `<a class="${index === 0 ? "primary-action" : "secondary-action"}" href="${escapeHtml(link)}">${labels[index] || "Continue"}</a>`;
          })
          .join("")}</div>`
      : "";
    markButton.textContent = mastery[spot.id] ? "Studied" : "Mark Studied";
    sendButton.textContent = queue.some((item) => item.id === spot.id) ? "Queued for Practice" : "Send to Practice Pack";
    if (actionResult) actionResult.textContent = "Local study actions stay in this browser.";
    listNode.querySelectorAll("[data-study-id]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.studyId === spot.id);
      button.classList.toggle("is-studied", Boolean(mastery[button.dataset.studyId]));
      button.classList.toggle("is-queued", queue.some((item) => item.id === button.dataset.studyId));
    });
    renderCompare(spot);
    const views = readStore("spl_study_views", []);
    const lastView = views[0];
    if (!lastView || lastView.id !== spot.id || Date.now() - Number(lastView.ts || 0) > 60000) {
      appendCappedStore("spl_study_views", {
        id: spot.id,
        title: spot.title,
        concept: spot.concept,
        texture: spot.texture,
        position: spot.position,
      });
    }
    renderStats();
    trackEvent("study_mode_spot_viewed", {
      spot: spot.id,
      concept: spot.concept,
      texture: spot.texture,
      position: spot.position,
      pack: pack.id,
    });
  }

  function renderList() {
    const list = filteredSpots();
    if (!list.length) {
      listNode.innerHTML = `<p class="hint">No study spots match these filters yet.</p>`;
      title.textContent = "No study spots match these filters.";
      setup.textContent = "Try a broader filter combination.";
      meta.innerHTML = "";
      board.innerHTML = "";
      baseline.textContent = "";
      exploit.textContent = "";
      checkRange.textContent = "";
      drill.textContent = "";
      mistakes.innerHTML = "";
      linkedPack.textContent = "";
      compareBox.innerHTML = "";
      resourceLinks.innerHTML = "";
      return;
    }
    if (!list.some((spot) => spot.id === selectedId)) selectedId = list[0].id;
    const mastery = readMastery();
    const queue = readQueue();
    listNode.innerHTML = list
      .map(
        (spot) => `<button class="study-list-button${mastery[spot.id] ? " is-studied" : ""}${queue.some((item) => item.id === spot.id) ? " is-queued" : ""}" type="button" data-study-id="${escapeHtml(spot.id)}">
          <span>${escapeHtml(spot.texture)} / ${escapeHtml(spot.concept)}</span>
          <strong>${escapeHtml(spot.title)}</strong>
          <em>${escapeHtml(spot.position)} - ${escapeHtml(spot.street)}</em>
        </button>`,
      )
      .join("");
    listNode.querySelectorAll("[data-study-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const spot = spots.find((item) => item.id === button.dataset.studyId);
        renderSpot(spot);
      });
    });
    renderSpot(list.find((spot) => spot.id === selectedId) || list[0]);
  }

  [positionFilter, textureFilter, conceptFilter, streetFilter].forEach((control) => {
    control.addEventListener("change", () => {
      renderList();
      trackEvent("study_mode_filtered", {
        position: positionFilter.value,
        texture: textureFilter.value,
        concept: conceptFilter.value,
        street: streetFilter.value,
      });
    });
  });

  markButton.addEventListener("click", () => {
    if (!currentSpot) return;
    const mastery = readMastery();
    if (mastery[currentSpot.id]) delete mastery[currentSpot.id];
    else mastery[currentSpot.id] = { ts: Date.now(), concept: currentSpot.concept, texture: currentSpot.texture, title: currentSpot.title };
    writeMastery(mastery);
    appendTrainingEvent({
      source: "study-mode",
      spotId: currentSpot.id,
      title: currentSpot.title,
      concept: currentSpot.concept,
      grade: mastery[currentSpot.id] ? "Studied" : "Unmarked",
      pack: packForSpot(currentSpot).id,
    });
    renderSpot(currentSpot);
    if (actionResult) actionResult.textContent = mastery[currentSpot.id] ? "Study spot marked as studied in this browser." : "Study mark removed.";
    trackEvent("study_mode_mastery_toggled", { spot: currentSpot.id, studied: Boolean(mastery[currentSpot.id]) });
  });

  sendButton.addEventListener("click", () => {
    if (!currentSpot) return;
    const pack = packForSpot(currentSpot);
    const queue = readQueue().filter((item) => item.id !== currentSpot.id);
    queue.unshift({
      id: currentSpot.id,
      title: currentSpot.title,
      concept: currentSpot.concept,
      texture: currentSpot.texture,
      packId: pack.id,
      packLabel: pack.label,
      ts: Date.now(),
    });
    writeQueue(queue);
    const session = readStore("spl_practice_session_v2", {});
    writeStore("spl_practice_session_v2", { ...session, lastPack: pack.id });
    appendTrainingEvent({
      source: "study-mode",
      spotId: currentSpot.id,
      title: currentSpot.title,
      concept: currentSpot.concept,
      grade: "Queued for Practice",
      pack: pack.id,
    });
    renderSpot(currentSpot);
    if (actionResult) actionResult.textContent = `${pack.label} will open first in Practice Mode on this browser.`;
    trackEvent("study_mode_sent_to_practice", { spot: currentSpot.id, pack: pack.id });
  });

  copyButton.addEventListener("click", async () => {
    if (!currentSpot) return;
    const text = studyNotesText(currentSpot);
    try {
      await navigator.clipboard.writeText(text);
      if (actionResult) actionResult.textContent = "Study notes copied to clipboard.";
    } catch {
      if (actionResult) actionResult.textContent = text;
    }
    trackEvent("study_mode_notes_copied", { spot: currentSpot.id });
  });

  renderList();
}

function initPracticeModeLegacy() {
  const spots = readJsonScript("practice-mode-data", []);
  const streetFilter = document.querySelector("#practice-street-filter");
  const modeFilter = document.querySelector("#practice-mode-filter");
  const playerFilter = document.querySelector("#practice-player-filter");
  const next = document.querySelector("#practice-next-spot");
  const meta = document.querySelector("#practice-spot-meta");
  const title = document.querySelector("#practice-spot-title");
  const setup = document.querySelector("#practice-spot-setup");
  const hand = document.querySelector("#practice-hand");
  const board = document.querySelector("#practice-board");
  const question = document.querySelector("#practice-question");
  const decisionTable = document.querySelector("#practice-data-table");
  const optionsNode = document.querySelector("#practice-options");
  const scoreCard = document.querySelector("#practice-score");
  const result = document.querySelector("#practice-result");
  if (!spots.length || !streetFilter || !modeFilter || !playerFilter || !next || !meta || !title || !setup || !hand || !board || !question || !optionsNode || !result) return;

  let index = Number(readStore("spl_practice_index", 0)) || 0;

  function filteredSpots() {
    return spots.filter((spot) => {
      const streetOk = streetFilter.value === "all" || spot.street === streetFilter.value;
      const modeOk = modeFilter.value === "all" || spot.mode === modeFilter.value;
      const playerOk = playerFilter.value === "all" || spot.playerType === playerFilter.value;
      return streetOk && modeOk && playerOk;
    });
  }

  function practiceEvents() {
    return readStore("spl_training_events", []).filter((event) => event.source === "practice-mode");
  }

  function renderSummary() {
    const events = practiceEvents();
    const averageNode = document.querySelector("#practice-average");
    const countNode = document.querySelector("#practice-count");
    const mistakesNode = document.querySelector("#practice-mistakes");
    const historyNode = document.querySelector("#practice-history");
    const queueNode = document.querySelector("#practice-mistake-queue");
    const scored = events.filter((event) => Number.isFinite(Number(event.score)));
    const mistakes = readStore("spl_training_events", []).filter((event) => Number.isFinite(Number(event.score)) && Number(event.score) < 70);
    const average = scored.length ? Math.round(scored.reduce((sum, event) => sum + Number(event.score), 0) / scored.length) : null;
    if (averageNode) averageNode.textContent = average === null ? "No data" : `${average}/100`;
    if (countNode) countNode.textContent = String(scored.length);
    if (mistakesNode) mistakesNode.textContent = String(mistakes.length);
    if (historyNode) {
      historyNode.innerHTML = events.length
        ? events
            .slice(0, 5)
            .map((event) => `<article class="practice-history-item"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.grade)} · ${Number(event.score)}/100 · ${escapeHtml(event.answer)}</span></article>`)
            .join("")
        : "Complete a practice spot to build history.";
    }
    if (queueNode) {
      queueNode.innerHTML = mistakes.length
        ? mistakes
            .slice(0, 5)
            .map((event) => `<article class="practice-history-item is-mistake"><strong>${escapeHtml(event.leak)}</strong><span>${escapeHtml(event.title)}</span></article>`)
            .join("")
        : "No major leaks yet.";
    }
  }

  function renderSpot() {
    const list = filteredSpots();
    if (!list.length) {
      title.textContent = "No practice spots match these filters.";
      setup.textContent = "Try a broader filter combination.";
      meta.innerHTML = "";
      hand.textContent = "";
      board.textContent = "";
      question.textContent = "";
      if (decisionTable) decisionTable.innerHTML = "";
      if (decisionTable) decisionTable.hidden = true;
      optionsNode.innerHTML = "";
      result.textContent = "No available spot for this filter.";
      if (scoreCard) scoreCard.hidden = true;
      renderSummary();
      return;
    }
    index = index % list.length;
    const spot = list[index];
    meta.innerHTML = `<span>${spot.mode}</span><span>${spot.street}</span><span>${spot.position}</span><span>${spot.playerType}</span>`;
    title.textContent = spot.title;
    setup.textContent = spot.setup;
    hand.textContent = `Hero: ${spot.hand}`;
    board.textContent = `Board: ${spot.board}`;
    question.textContent = spot.question;
    if (decisionTable) {
      decisionTable.innerHTML = "";
      decisionTable.hidden = true;
    }
    result.textContent = "Choose an action to see the training review.";
    if (scoreCard) scoreCard.hidden = true;
    optionsNode.innerHTML = spot.options
      .map((option) => `<button class="answer-card" type="button" data-practice-answer="${option.id}">${option.label}</button>`)
      .join("");
    optionsNode.querySelectorAll("[data-practice-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const option = spot.options.find((item) => item.id === button.dataset.practiceAnswer);
        if (!option) return;
        optionsNode.querySelectorAll(".answer-card").forEach((item) => item.classList.remove("is-selected", "is-best"));
        button.classList.add("is-selected");
        if (option.best) button.classList.add("is-best");
        renderSmartScore(scoreCard, option);
        if (decisionTable) {
          decisionTable.hidden = false;
          decisionTable.innerHTML = renderDataTable(
            ["Action", "Score", "Grade", "Leak Signal"],
            spot.options.map((item) => [
              item.label,
              `${Number(item.score ?? (item.best ? 90 : 45))}/100`,
              item.grade || (item.best ? "Best Move" : "Review Needed"),
              item.leak || spot.leak || "decision-review",
            ]),
            `${spot.title} decision matrix`,
          );
        }
        result.innerHTML = `<strong>${escapeHtml(option.grade)}: ${escapeHtml(option.label)}</strong><br>${escapeHtml(option.feedback)}<br><br><strong>Baseline:</strong> ${escapeHtml(spot.baseline)}<br><strong>Exploit adjustment:</strong> ${escapeHtml(spot.exploit)}<br><strong>Takeaway:</strong> ${escapeHtml(spot.takeaway)}`;
        appendTrainingEvent({
          source: "practice-mode",
          title: spot.title,
          answer: option.label,
          score: Number(option.score ?? (option.best ? 90 : 45)),
          grade: option.grade || (option.best ? "Lab Preferred" : "Review Needed"),
          leak: option.leak || spot.leak || "practice-review",
        });
        renderSummary();
        trackEvent("practice_mode_answered", {
          spot: spot.id,
          answer: option.id,
          score: Number(option.score ?? (option.best ? 90 : 45)),
          street: spot.street,
          mode: spot.mode,
        });
      });
    });
    renderSummary();
  }

  function resetAndRender() {
    index = 0;
    writeStore("spl_practice_index", index);
    renderSpot();
  }

  [streetFilter, modeFilter, playerFilter].forEach((control) => control.addEventListener("change", resetAndRender));
  next.addEventListener("click", () => {
    const list = filteredSpots();
    index = list.length ? (index + 1) % list.length : 0;
    writeStore("spl_practice_index", index);
    renderSpot();
    trackEvent("practice_mode_next", { index });
  });

  renderSpot();
}

function initPracticeMode() {
  const spots = readJsonScript("practice-mode-data", []);
  const packs = readJsonScript("practice-packs-data", [{ id: "all", label: "All Spots", description: "Cycle through every available decision.", match: {} }]);
  const packFilter = document.querySelector("#practice-pack-filter");
  const streetFilter = document.querySelector("#practice-street-filter");
  const modeFilter = document.querySelector("#practice-mode-filter");
  const playerFilter = document.querySelector("#practice-player-filter");
  const next = document.querySelector("#practice-next-spot");
  const retryQueue = document.querySelector("#practice-retry-queue");
  const resetSession = document.querySelector("#practice-reset-session");
  const packTitle = document.querySelector("#practice-pack-title");
  const packDescription = document.querySelector("#practice-pack-description");
  const packTeaching = document.querySelector("#practice-pack-teaching");
  const progressLabel = document.querySelector("#practice-progress-label");
  const progressBar = document.querySelector("#practice-progress-bar");
  const meta = document.querySelector("#practice-spot-meta");
  const title = document.querySelector("#practice-spot-title");
  const setup = document.querySelector("#practice-spot-setup");
  const hand = document.querySelector("#practice-hand");
  const board = document.querySelector("#practice-board");
  const question = document.querySelector("#practice-question");
  const dataTableNode = document.querySelector("#practice-data-table");
  const optionsNode = document.querySelector("#practice-options");
  const scoreCard = document.querySelector("#practice-score");
  const result = document.querySelector("#practice-result");
  if (!spots.length || !packFilter || !streetFilter || !modeFilter || !playerFilter || !next || !meta || !title || !setup || !hand || !board || !question || !optionsNode || !result) return;

  let index = Number(readStore("spl_practice_index", 0)) || 0;
  packFilter.innerHTML = packs.map((pack) => `<option value="${escapeHtml(pack.id)}">${escapeHtml(pack.label)}</option>`).join("");

  function readPracticeSession() {
    const session = readStore("spl_practice_session_v2", {});
    return {
      seenByPack: session.seenByPack && typeof session.seenByPack === "object" ? session.seenByPack : {},
      currentStreak: Number(session.currentStreak || 0),
      bestStreak: Number(session.bestStreak || 0),
      lastPack: session.lastPack || "all",
    };
  }

  function writePracticeSession(session) {
    writeStore("spl_practice_session_v2", session);
  }

  const savedSession = readPracticeSession();
  const requestedPack = new URLSearchParams(window.location.search).get("pack");
  if (requestedPack && packs.some((pack) => pack.id === requestedPack)) {
    packFilter.value = requestedPack;
  } else if (packs.some((pack) => pack.id === savedSession.lastPack)) {
    packFilter.value = savedSession.lastPack;
  }

  function currentPack() {
    return packs.find((pack) => pack.id === packFilter.value) || packs[0];
  }

  function practiceEvents() {
    return readStore("spl_training_events", []).filter((event) => event.source === "practice-mode");
  }

  function mistakeEvents() {
    return readStore("spl_training_events", []).filter((event) => Number.isFinite(Number(event.score)) && Number(event.score) < 70);
  }

  function reviewQueueIds() {
    const ids = new Set();
    mistakeEvents().forEach((event) => {
      if (event.spotId) ids.add(event.spotId);
      spots.filter((spot) => spot.leak === event.leak || spot.options.some((option) => option.leak === event.leak)).forEach((spot) => ids.add(spot.id));
    });
    return ids;
  }

  function spotMatchesPack(spot, pack) {
    if (!pack || pack.id === "all") return true;
    if (pack.dynamic === "mistakes") return reviewQueueIds().has(spot.id);
    const match = pack.match || {};
    const checks = [];
    if (Array.isArray(match.modes)) checks.push(match.modes.includes(spot.mode));
    if (Array.isArray(match.streets)) checks.push(match.streets.includes(spot.street));
    if (Array.isArray(match.playerTypes)) checks.push(match.playerTypes.includes(spot.playerType));
    if (Array.isArray(match.leaks)) checks.push(match.leaks.includes(spot.leak) || spot.options.some((option) => match.leaks.includes(option.leak)));
    return checks.length ? checks.some(Boolean) : true;
  }

  function filteredSpots() {
    const pack = currentPack();
    return spots.filter((spot) => {
      const streetOk = streetFilter.value === "all" || spot.street === streetFilter.value;
      const modeOk = modeFilter.value === "all" || spot.mode === modeFilter.value;
      const playerOk = playerFilter.value === "all" || spot.playerType === playerFilter.value;
      return streetOk && modeOk && playerOk && spotMatchesPack(spot, pack);
    });
  }

  function seenSetForCurrentPack() {
    const session = readPracticeSession();
    return new Set(session.seenByPack[currentPack().id] || []);
  }

  function markSpotTrained(spot, option) {
    const session = readPracticeSession();
    const packId = currentPack().id;
    const seen = new Set(session.seenByPack[packId] || []);
    seen.add(spot.id);
    session.seenByPack[packId] = [...seen];
    const score = Number(option.score ?? (option.best ? 90 : 45));
    session.currentStreak = score >= 80 ? session.currentStreak + 1 : 0;
    session.bestStreak = Math.max(session.bestStreak, session.currentStreak);
    session.lastPack = packId;
    writePracticeSession(session);
  }

  function nextUnseenIndex(list) {
    if (!list.length) return 0;
    const seen = seenSetForCurrentPack();
    for (let offset = 1; offset <= list.length; offset += 1) {
      const candidate = (index + offset) % list.length;
      if (!seen.has(list[candidate].id)) return candidate;
    }
    return (index + 1) % list.length;
  }

  function setFiltersToAll() {
    streetFilter.value = "all";
    modeFilter.value = "all";
    playerFilter.value = "all";
  }

  let renderSpot = () => {};

  function openSpotById(spotId) {
    packFilter.value = "all";
    setFiltersToAll();
    const list = filteredSpots();
    const targetIndex = list.findIndex((spot) => spot.id === spotId);
    if (targetIndex >= 0) {
      index = targetIndex;
      writeStore("spl_practice_index", index);
    }
    renderSpot();
  }

  function renderSummary() {
    const events = practiceEvents();
    const averageNode = document.querySelector("#practice-average");
    const countNode = document.querySelector("#practice-count");
    const mistakesNode = document.querySelector("#practice-mistakes");
    const streakNode = document.querySelector("#practice-streak");
    const packProgressNode = document.querySelector("#practice-pack-progress");
    const recommendationNode = document.querySelector("#practice-recommendation");
    const historyNode = document.querySelector("#practice-history");
    const queueNode = document.querySelector("#practice-mistake-queue");
    const scored = events.filter((event) => Number.isFinite(Number(event.score)));
    const mistakes = scored.filter((event) => Number(event.score) < 70);
    const average = scored.length ? Math.round(scored.reduce((sum, event) => sum + Number(event.score), 0) / scored.length) : null;
    const session = readPracticeSession();
    const list = filteredSpots();
    const seen = seenSetForCurrentPack();
    const trainedCount = list.filter((spot) => seen.has(spot.id)).length;
    const packProgress = list.length ? Math.round((trainedCount / list.length) * 100) : 0;
    const pack = currentPack();
    if (packTitle) packTitle.textContent = pack.label;
    if (packDescription) packDescription.textContent = pack.description;
    if (packTeaching) {
      packTeaching.innerHTML = renderDataTable(
        ["Why This Pack", "Training Cue", "Avoid"],
        pack.whyRows || [["Start broad", "Choose a pack after one score reveals a leak.", "Do not jump between random spots without a review note."]],
        `${pack.label} teaching table`,
      );
    }
    if (progressLabel) progressLabel.textContent = `${trainedCount} of ${list.length} trained`;
    if (progressBar) progressBar.style.width = `${packProgress}%`;
    if (averageNode) averageNode.textContent = average === null ? "No data" : `${average}/100`;
    if (countNode) countNode.textContent = String(scored.length);
    if (mistakesNode) mistakesNode.textContent = String(mistakes.length);
    if (streakNode) streakNode.textContent = `${session.currentStreak} / ${session.bestStreak}`;
    if (packProgressNode) packProgressNode.textContent = `${packProgress}%`;
    if (recommendationNode) {
      const leakCounts = {};
      mistakes.forEach((event) => {
        leakCounts[event.leak] = (leakCounts[event.leak] || 0) + 1;
      });
      const topLeak = Object.entries(leakCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const leakPack = {
        "missed-value": "value",
        "thin-value": "value",
        "missed-thin-value": "value",
        "overplay-top-pair": "value",
        "overpair-attachment": "value",
        "under-cbet": "board-texture",
        "turn-barrel-plan": "board-texture",
        "monotone-overplay": "board-texture",
        "passive-draws": "board-texture",
        "pot-odds-math": "math-stack-depth",
        "set-mining-discipline": "math-stack-depth",
        "blocker-misuse": "river-decisions",
        "polar-sizing": "river-decisions",
      }[topLeak] || "review-queue";
      const recommendedPack = packs.find((item) => item.id === leakPack) || packs[0];
      recommendationNode.innerHTML = topLeak
        ? `<article class="practice-history-item"><strong>${escapeHtml(recommendedPack.label)}</strong><span>Top leak: ${escapeHtml(topLeak)}. Run this pack next.</span><button class="mini-action" type="button" data-practice-pack="${escapeHtml(recommendedPack.id)}">Open Pack</button></article>`
        : "Complete a few decisions to unlock a recommendation.";
      recommendationNode.querySelector("[data-practice-pack]")?.addEventListener("click", (event) => {
        packFilter.value = event.currentTarget.dataset.practicePack;
        setFiltersToAll();
        index = 0;
        writeStore("spl_practice_index", index);
        renderSpot();
      });
    }
    if (historyNode) {
      historyNode.innerHTML = events.length
        ? events
            .slice(0, 5)
            .map((event) => `<article class="practice-history-item"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.grade)} - ${Number(event.score)}/100 - ${escapeHtml(event.answer)}</span></article>`)
            .join("")
        : "Complete a practice spot to build history.";
    }
    if (queueNode) {
      queueNode.innerHTML = mistakes.length
        ? mistakes
            .slice(0, 5)
            .map((event) => `<article class="practice-history-item is-mistake"><strong>${escapeHtml(event.leak)}</strong><span>${escapeHtml(event.title)}</span>${event.spotId ? `<button class="mini-action" type="button" data-retry-spot="${escapeHtml(event.spotId)}">Retry Spot</button>` : ""}</article>`)
            .join("")
        : "No major leaks yet.";
      queueNode.querySelectorAll("[data-retry-spot]").forEach((button) => {
        button.addEventListener("click", () => openSpotById(button.dataset.retrySpot));
      });
    }
  }

  renderSpot = function renderEnhancedPracticeSpot() {
    const list = filteredSpots();
    if (!list.length) {
      title.textContent = "No practice spots match these filters.";
      setup.textContent = "Try a broader filter combination or complete a few low-score spots before opening Review Queue.";
      meta.innerHTML = "";
      hand.textContent = "";
      board.textContent = "";
    question.textContent = "";
    if (dataTableNode) dataTableNode.innerHTML = "";
    if (dataTableNode) dataTableNode.hidden = true;
    optionsNode.innerHTML = "";
      result.textContent = "No available spot for this filter.";
      if (scoreCard) scoreCard.hidden = true;
      renderSummary();
      return;
    }
    index = index % list.length;
    const spot = list[index];
    meta.innerHTML = `<span>${escapeHtml(spot.mode)}</span><span>${escapeHtml(spot.street)}</span><span>${escapeHtml(spot.position)}</span><span>${escapeHtml(spot.playerType)}</span>`;
    title.textContent = spot.title;
    setup.textContent = spot.setup;
    hand.textContent = `Hero: ${spot.hand}`;
    board.textContent = `Board: ${spot.board}`;
    question.textContent = spot.question;
    if (dataTableNode) {
      dataTableNode.innerHTML = "";
      dataTableNode.hidden = true;
    }
    result.textContent = "Choose an action to see the training review.";
    if (scoreCard) scoreCard.hidden = true;
    optionsNode.innerHTML = spot.options
      .map((option) => `<button class="answer-card" type="button" data-practice-answer="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`)
      .join("");
    optionsNode.querySelectorAll("[data-practice-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const option = spot.options.find((item) => item.id === button.dataset.practiceAnswer);
        if (!option) return;
        optionsNode.querySelectorAll(".answer-card").forEach((item) => item.classList.remove("is-selected", "is-best"));
        button.classList.add("is-selected");
        if (option.best) button.classList.add("is-best");
        renderSmartScore(scoreCard, option);
        if (dataTableNode) {
          dataTableNode.hidden = false;
          dataTableNode.innerHTML = renderDataTable(
            ["Feedback Layer", "What This Spot Teaches"],
            [
              ["Baseline", spot.baseline || "Name the position, ranges, and board texture before acting."],
              ["Exploit Adjustment", spot.exploit || "Adjust only after identifying a player-type leak."],
              ["Next Street Plan", spot.nextPlan || spot.takeaway || "Decide which turns and rivers continue before acting."],
              ["Recommended Drill", (spot.tags || []).join(", ") || currentPack().label],
            ],
            `${spot.title} practice table`,
          );
        }
        result.innerHTML = renderFeedbackLayers({ spot, option, context: currentPack().label || "Practice" });
        markSpotTrained(spot, option);
        appendTrainingEvent({
          source: "practice-mode",
          spotId: spot.id,
          title: spot.title,
          answer: option.label,
          score: Number(option.score ?? (option.best ? 90 : 45)),
          grade: option.grade || (option.best ? "Lab Preferred" : "Review Needed"),
          leak: option.leak || spot.leak || "practice-review",
          street: spot.street,
          mode: spot.mode,
          playerType: spot.playerType,
          pack: currentPack().id,
        });
        renderSummary();
        trackEvent("practice_mode_answered", {
          spot: spot.id,
          answer: option.id,
          score: Number(option.score ?? (option.best ? 90 : 45)),
          street: spot.street,
          mode: spot.mode,
          pack: currentPack().id,
        });
      });
    });
    renderSummary();
  };

  function resetAndRender() {
    index = 0;
    writeStore("spl_practice_index", index);
    renderSpot();
  }

  [packFilter, streetFilter, modeFilter, playerFilter].forEach((control) => control.addEventListener("change", resetAndRender));
  next.addEventListener("click", () => {
    const list = filteredSpots();
    index = list.length ? nextUnseenIndex(list) : 0;
    writeStore("spl_practice_index", index);
    renderSpot();
    trackEvent("practice_mode_next", { index, pack: currentPack().id });
  });
  retryQueue?.addEventListener("click", () => {
    packFilter.value = "review-queue";
    setFiltersToAll();
    index = 0;
    writeStore("spl_practice_index", index);
    renderSpot();
    trackEvent("practice_mode_retry_queue_opened", { count: reviewQueueIds().size });
  });
  resetSession?.addEventListener("click", () => {
    packFilter.value = "all";
    setFiltersToAll();
    index = 0;
    writeStore("spl_practice_index", index);
    writePracticeSession({ seenByPack: {}, currentStreak: 0, bestStreak: 0, lastPack: "all" });
    renderSpot();
    trackEvent("practice_mode_session_reset", { pack: "all" });
  });

  renderSpot();
}

function initHandReviewBuilder() {
  const build = document.querySelector("#build-review");
  const save = document.querySelector("#save-review-draft");
  const output = document.querySelector("#review-builder-output");
  if (!build || !output) return;

  function collect() {
    return {
      game: document.querySelector("#review-game-type")?.value || "",
      stack: document.querySelector("#review-stack")?.value || "",
      position: document.querySelector("#review-position")?.value || "",
      hand: document.querySelector("#review-hand")?.value || "",
      board: document.querySelector("#review-board")?.value || "",
      villain: document.querySelector("#review-villain")?.value || "",
      line: document.querySelector("#review-line")?.value || "",
      question: document.querySelector("#review-question")?.value || "",
    };
  }

  function renderReview() {
    const data = collect();
    output.innerHTML = `<strong>Structured Review Draft</strong>
      <ol class="review-template-list">
        <li><b>Setup:</b> ${escapeHtml(data.game)}, ${escapeHtml(data.stack)}, Hero ${escapeHtml(data.position)} with ${escapeHtml(data.hand)}.</li>
        <li><b>Board:</b> ${escapeHtml(data.board)}.</li>
        <li><b>Villain type:</b> ${escapeHtml(data.villain)}.</li>
        <li><b>Action line:</b> ${escapeHtml(data.line)}</li>
        <li><b>Main question:</b> ${escapeHtml(data.question)}</li>
        <li><b>Baseline check:</b> identify position, range advantage, bet purpose, price, and SPR before judging the result.</li>
        <li><b>Exploit check:</b> adjust only after naming the opponent leak, such as over-calling, over-folding, or over-bluffing.</li>
        <li><b>Next drill:</b> tag the hand as value, bluff, pot odds, range advantage, or player-type adjustment.</li>
      </ol>`;
    trackEvent("hand_review_built", { villain: data.villain, position: data.position });
    return data;
  }

  build.addEventListener("click", renderReview);
  save?.addEventListener("click", () => {
    const data = renderReview();
    const drafts = readStore("spl_review_builder_drafts", []);
    drafts.unshift({ ...data, ts: Date.now() });
    writeStore("spl_review_builder_drafts", drafts.slice(0, 20));
    appendTrainingEvent({
      source: "hand-review-builder",
      title: `${data.position} ${data.hand} review`,
      answer: data.question,
      score: 75,
      grade: "Review Built",
      leak: "review-habit",
    });
    trackEvent("hand_review_saved_local", { count: drafts.length });
  });
}

function initAnalyzeLite() {
  const examples = readJsonScript("analyze-examples-data", []);
  const packs = readJsonScript("analyze-practice-packs-data", []);
  const sampleButtons = document.querySelector("#analyze-sample-buttons");
  const build = document.querySelector("#build-analyze-report");
  const save = document.querySelector("#save-analyze-report");
  const copy = document.querySelector("#copy-analyze-report");
  const queuePack = document.querySelector("#queue-analyze-pack");
  const actionResult = document.querySelector("#analyze-action-result");
  const output = document.querySelector("#analyze-report-output");
  const savedList = document.querySelector("#analyze-saved-list");
  const commandReports = document.querySelector("#analyze-command-reports");
  const commandQuality = document.querySelector("#analyze-command-quality");
  const commandLeak = document.querySelector("#analyze-command-leak");
  const commandWeight = document.querySelector("#analyze-command-weight");
  const commandPack = document.querySelector("#analyze-command-pack");
  if (!build || !output || !savedList) return;
  let lastReport = null;

  const fields = {
    game: "#analyze-game-type",
    stack: "#analyze-stack",
    potType: "#analyze-pot-type",
    heroPosition: "#analyze-hero-position",
    villainPosition: "#analyze-villain-position",
    heroHand: "#analyze-hero-hand",
    board: "#analyze-board",
    villainType: "#analyze-villain-type",
    preflop: "#analyze-preflop",
    flop: "#analyze-flop",
    turn: "#analyze-turn",
    river: "#analyze-river",
    question: "#analyze-question",
    result: "#analyze-result-input",
  };

  function fieldNode(key) {
    return document.querySelector(fields[key]);
  }

  function setField(key, value) {
    const node = fieldNode(key);
    if (node) node.value = value || "";
  }

  function collect() {
    return Object.fromEntries(Object.keys(fields).map((key) => [key, fieldNode(key)?.value?.trim() || ""]));
  }

  function qualityScore(data) {
    const required = ["game", "stack", "potType", "heroPosition", "villainPosition", "heroHand", "board", "villainType", "preflop", "flop", "question"];
    const requiredScore = required.reduce((sum, key) => sum + (data[key] ? 1 : 0), 0) / required.length;
    const streetScore = ["preflop", "flop", "turn", "river"].reduce((sum, key) => sum + (data[key] && !/not reached|not entered/i.test(data[key]) ? 1 : 0), 0) / 4;
    const questionScore = data.question.length >= 24 ? 1 : data.question ? 0.5 : 0;
    const resultScore = data.result.length >= 12 ? 1 : data.result ? 0.5 : 0;
    return Math.round((requiredScore * 0.5 + streetScore * 0.25 + questionScore * 0.15 + resultScore * 0.1) * 100);
  }

  function inferDecisionStreet(data) {
    const text = `${data.question} ${data.result}`.toLowerCase();
    if (/river|showdown|bluff-catch|bluff catch|blocker/.test(text)) return "River";
    if (/turn|barrel|spr|check-raise|check raise/.test(text)) return "Turn";
    if (/flop|c-bet|cbet|check-raise|check raise/.test(text)) return "Flop";
    if (/preflop|open|3-bet|3bet|4-bet|4bet|defend|reshove/.test(text)) return "Preflop";
    return data.river && !/not reached/i.test(data.river) ? "River" : data.turn && !/not reached/i.test(data.turn) ? "Turn" : "Flop";
  }

  function boardProfile(data) {
    const board = `${data.board} ${data.flop} ${data.turn} ${data.river}`.toLowerCase();
    if (/monotone|three hearts|three spades|three clubs|three diamonds/.test(board)) return "Monotone pressure";
    if (/(.)\1/.test(board.replace(/[^akqjt98765432]/g, "")) || /paired|pair/.test(board)) return "Paired board";
    if (/q.*j.*t|j.*t.*9|t.*9.*8|9.*8.*7|8.*7.*6|7.*6.*5/.test(board)) return "Connected dynamic";
    if (/k.*7.*2|a.*7.*2|a.*8.*3|k.*8.*4|q.*7.*3/.test(board)) return "High-card dry";
    if (/draw|flush|straight|two-tone|wet/.test(board)) return "Draw-heavy";
    return "Unclassified texture";
  }

  function handProfile(data) {
    const text = `${data.heroHand} ${data.question} ${data.flop} ${data.turn} ${data.river}`.toLowerCase();
    if (/aa|kk|qq|jj|overpair/.test(text)) return "Overpair";
    if (/top pair|tptk|aq|ak|aj|kq/.test(text)) return "Top-pair class";
    if (/flush draw|straight draw|draw|blocker/.test(text)) return "Draw or blocker";
    if (/second pair|third pair|bluff-catcher|bluff catcher/.test(text)) return "Bluff-catcher";
    if (/a9o|weak ace|dominated/.test(text)) return "Dominated preflop";
    return "Range review";
  }

  function leakSeverity(leak, quality) {
    if (quality < 55) return "Needs cleaner input";
    if (["overbluff-vs-caller", "respect-passive-aggression", "overpair-spr", "multiway-discipline", "short-stack-discipline", "dominated-ace"].includes(leak)) return "High priority";
    if (["pot-odds-math", "preflop-discipline", "thin-value", "range-advantage-cbet", "overfold-vs-maniac"].includes(leak)) return "Training priority";
    return "Routine review";
  }

  function confidenceLabel(quality) {
    if (quality >= 85) return "High";
    if (quality >= 65) return "Medium";
    return "Low";
  }

  function leakWeightEstimate(leak, data, quality) {
    const high = new Set(["overbluff-vs-caller", "respect-passive-aggression", "overpair-spr", "multiway-discipline", "dominated-ace", "short-stack-discipline"]);
    const medium = new Set(["pot-odds-math", "preflop-discipline", "thin-value", "range-advantage-cbet", "blocker-selection", "board-texture", "overfold-vs-maniac"]);
    const low = new Set(["review-habit"]);
    let band = high.has(leak) ? "High" : medium.has(leak) ? "Medium" : low.has(leak) ? "Low" : "Medium";
    if (quality < 55) band = "Input first";
    const text = `${data.potType} ${data.villainType} ${data.question} ${data.result}`.toLowerCase();
    const riskBoost = /all-in|jam|stack off|check-raise|large raise|river call|river bluff|multiway|3-bet pot|4-bet pot/.test(text);
    if (band === "Medium" && riskBoost && quality >= 55) band = "High";
    const ranges = {
      "Input first": ["Context first", "Complete the action line before assigning a weight."],
      Low: ["Light", "Study weight: roughly -0.2 to -0.8 BB/100 if repeated in similar review spots."],
      Medium: ["Medium", "Study weight: roughly -0.8 to -2.0 BB/100 if repeated in similar review spots."],
      High: ["Heavy", "Study weight: roughly -2.0 to -5.0 BB/100 if repeated in similar review spots."],
    };
    const [label, estimate] = ranges[band] || ranges.Medium;
    return {
      band,
      label,
      estimate,
      note: "This is a heuristic training priority, not a solver EV result, win-rate claim, or real-money forecast.",
    };
  }

  function keyDecisionNode(data, leak, decisionStreet) {
    const streetText = {
      Preflop: data.preflop,
      Flop: data.flop,
      Turn: data.turn,
      River: data.river,
    }[decisionStreet] || data.question;
    const reasons = {
      "thin-value": "The main question is whether enough worse hands continue at the chosen size.",
      "overbluff-vs-caller": "The main question is whether this opponent type folds often enough.",
      "pot-odds-math": "The main question is the call price after using the final-pot formula.",
      "blocker-selection": "The main question is whether the blocker supports a credible value story.",
      "respect-passive-aggression": "The main question is how much a passive player's aggression narrows the range.",
      "range-advantage-cbet": "The main question is whether board texture gives the raiser low-cost range pressure.",
      "overpair-spr": "The main question is how SPR and turn texture change one-pair commitment.",
      "dominated-ace": "The main question is whether preflop domination creates avoidable postflop trouble.",
      "short-stack-discipline": "The main question is whether stack depth makes call-and-see lines worse than push-fold discipline.",
      "overfold-vs-maniac": "The main question is whether the opponent's over-bluffing profile changes bluff-catcher thresholds.",
      "multiway-discipline": "The main question is how extra players strengthen continuing ranges.",
      "board-texture": "The main question is how texture changes equity realization and c-bet frequency.",
    };
    return {
      street: decisionStreet,
      action: streetText || data.question || "Decision node not entered.",
      reason: reasons[leak] || "The main question is whether the line has a clear value target, bluff target, or defensive price.",
    };
  }

  function alternativeLines(data, leak, advice) {
    const villain = data.villainType || "Villain";
    const map = {
      "thin-value": [
        ["Baseline", "Bet a size that worse one-pair hands can call, then slow down versus a strong raise."],
        ["Exploit", `Against ${villain}, value bet thinner only if the profile calls too much.`],
        ["Avoid", "Do not check back only because the top of villain's range exists."],
      ],
      "overbluff-vs-caller": [
        ["Baseline", "Bluff only when the range story and blocker quality create fold equity."],
        ["Exploit", `Against ${villain}, reduce pure bluffs and keep hands with equity.`],
        ["Avoid", "Do not fire a river bluff just because the draw missed."],
      ],
      "pot-odds-math": [
        ["Baseline", "Use call amount divided by final pot after calling, then adjust for realization."],
        ["Exploit", "Call more when implied odds are clean; fold more when reverse implied odds dominate."],
        ["Avoid", "Do not compare the call only to the current pot before villain's bet is included."],
      ],
      "respect-passive-aggression": [
        ["Baseline", "Treat a sudden large raise as a meaningful range update."],
        ["Exploit", "Fold more medium-strength bluff-catchers against passive value-heavy lines."],
        ["Avoid", "Do not continue only because the hand was strong on the previous street."],
      ],
      "range-advantage-cbet": [
        ["Baseline", "Use small pressure on boards where the raiser owns more strong top-pair and overpair density."],
        ["Exploit", "Bet more versus over-folders; check more weak air versus sticky defenders."],
        ["Avoid", "Do not c-bet every board just because Hero raised preflop."],
      ],
      "overfold-vs-maniac": [
        ["Baseline", "Use price, blockers, and range position before bluff-catching."],
        ["Exploit", `Against ${villain}, defend selected robust bluff-catchers wider than versus a passive player.`],
        ["Avoid", "Do not fold every one-pair hand only because the bet is uncomfortable."],
      ],
      "short-stack-discipline": [
        ["Baseline", "At shallow stacks, choose between fold, reshove, or continue with a clear SPR plan."],
        ["Exploit", "Reshove wider against late-position openers who fold too much; tighten against strong early ranges."],
        ["Avoid", "Do not flat from the small blind just to avoid a preflop decision."],
      ],
    };
    return map[leak] || [
      ["Baseline", advice.baseline],
      ["Exploit", advice.exploit],
      ["Avoid", "Do not judge the hand only by the final pot result."],
    ];
  }

  function opponentAdjustmentRows(data, leak) {
    const rows = [
      ["Calling station", "Value bet thinner, bluff less, size for worse calls."],
      ["Nit", "Steal and small-pressure more often, but respect sudden strong aggression."],
      ["Maniac", "Bluff less, call selected bluff-catchers wider, avoid ego raises."],
      ["Regular", "Target capped ranges and over-fold nodes, but keep your line credible."],
    ];
    if (leak === "pot-odds-math") {
      return rows.map(([type, note]) => [type, `${note} Still start with the required-equity formula.`]);
    }
    if (leak === "multiway-discipline") {
      return rows.map(([type, note]) => [type, `${note} Multiway action narrows ranges faster than heads-up action.`]);
    }
    return rows;
  }

  function updateAnalyzeCommand(report = null) {
    const reports = readStore("spl_analyze_reports", []);
    const currentData = report || collect();
    const quality = report?.quality ?? qualityScore(currentData);
    if (commandReports) commandReports.textContent = String(reports.length);
    if (commandQuality) commandQuality.textContent = `${quality}%`;
    if (commandLeak) commandLeak.textContent = report?.leakTitle || "Not built";
    if (commandWeight) commandWeight.textContent = report?.leakWeight?.label || "Not built";
    if (commandPack) commandPack.textContent = report?.packLabel || "Practice";
  }

  function loadExample(example) {
    if (!example) return;
    Object.keys(fields).forEach((key) => setField(key, example[key]));
    updateAnalyzeCommand();
    trackEvent("analyze_sample_loaded", { sample: example.id });
  }

  function classifyLeak(data) {
    const text = `${data.game} ${data.stack} ${data.potType} ${data.heroHand} ${data.board} ${data.villainType} ${data.preflop} ${data.question} ${data.result} ${data.flop} ${data.turn} ${data.river}`.toLowerCase();
    if (/18bb|short stack|short-stack|reshove|push\/fold|push fold|mtt/.test(text)) return "short-stack-discipline";
    if (data.villainType === "Maniac" && /bluff-catch|bluff catch|overbet|barrel|river|top pair/.test(text)) return "overfold-vs-maniac";
    if (data.villainType === "Calling station" && /bluff|missed/.test(text)) return "overbluff-vs-caller";
    if (data.villainType === "Calling station" && /value|top pair|aj|a[jqkt]/.test(text)) return "thin-value";
    if (/utg|a9o|dominated|weak ace|offsuit ace/.test(text)) return "dominated-ace";
    if (/bb|big blind|defend|steal|button open|k9s|q9s/.test(text) && /preflop|open|defend|3-bet|3bet/.test(text)) return "preflop-discipline";
    if (/multiway|three players|two callers/.test(text)) return "multiway-discipline";
    if (/monotone|flush board|three hearts|three spades/.test(text)) return "board-texture";
    if (/pot odds|call price|flush draw|draw/.test(text)) return "pot-odds-math";
    if (/blocker|ace of spades|missed draw/.test(text)) return "blocker-selection";
    if (/check-raise|raise large|passive/.test(text)) return "respect-passive-aggression";
    if (/k72|range advantage|c-bet|cbet/.test(text)) return "range-advantage-cbet";
    if (/aa|overpair|spr|stack/.test(text)) return "overpair-spr";
    return "review-habit";
  }

  function leakAdvice(leak) {
    const map = {
      "overbluff-vs-caller": {
        title: "Over-bluffing into sticky ranges",
        packId: "river-decisions",
        baseline: "A bluff needs fold equity and a credible value story. Calling stations reduce the value of pure bluffs.",
        exploit: "Shrink pure bluffs and increase value bets. Keep semi-bluffs that retain equity.",
        drill: "Open Practice Mode and filter for calling-station or river spots.",
        link: "/practice/",
      },
      "thin-value": {
        title: "Thin value opportunity",
        packId: "value",
        baseline: "Value bets are profitable when enough worse hands can continue at the chosen size.",
        exploit: "Against calling stations, value bet more hands and choose sizes that worse pairs or weak Ax can call.",
        drill: "Study AJ versus calling station, then repeat value-bet drills.",
        link: "/hand-review/aj-vs-calling-station/",
      },
      "pot-odds-math": {
        title: "Pot odds and equity realization",
        packId: "math-stack-depth",
        baseline: "Required equity equals call amount divided by the final pot after calling.",
        exploit: "After the formula, check implied odds, reverse implied odds, position, and river pressure.",
        drill: "Run five Pot Odds Trainer questions.",
        link: "/tools/pot-odds-trainer/",
      },
      "blocker-selection": {
        title: "Blocker-based river selection",
        packId: "river-decisions",
        baseline: "Blockers help choose bluffs only when the range story and target folds already make sense.",
        exploit: "Bluff less versus callers; bluff more selectively versus capped regulars who can fold.",
        drill: "Review blocker content and practice river spots.",
        link: "/practice/",
      },
      "respect-passive-aggression": {
        title: "Passive-player aggression alarm",
        packId: "value",
        baseline: "When a passive profile suddenly raises large, the range is often more value-heavy than balanced theory.",
        exploit: "Fold more bluff-catchers and one-pair hands without evidence of over-bluffing.",
        drill: "Study overpair turn pressure and relative hand strength.",
        link: "/hand-review/overpair-turn-pressure/",
      },
      "range-advantage-cbet": {
        title: "Range advantage c-bet decision",
        packId: "board-texture",
        baseline: "Dry high-card boards often let the preflop raiser apply small-bet pressure.",
        exploit: "Bet more versus over-folders; reduce weak air versus sticky or aggressive defenders.",
        drill: "Open Study Mode and review K72 rainbow.",
        link: "/study/#study-btn-bb-k72",
      },
      "overpair-spr": {
        title: "Overpair and SPR discipline",
        packId: "math-stack-depth",
        baseline: "Overpairs are strong, but board texture and remaining stack depth decide commitment.",
        exploit: "Respect passive raises on dynamic turns; bluff-catch more carefully versus aggressive players.",
        drill: "Review SPR and changing-turn overpair spots.",
        link: "/gto/spr/",
      },
      "dominated-ace": {
        title: "Dominated ace discipline",
        packId: "preflop-discipline",
        baseline: "Weak offsuit aces create dominated top-pair spots, especially from early position or against tight ranges.",
        exploit: "Open and continue tighter when ranges behind are strong; widen only when position and table behavior justify it.",
        drill: "Run the Preflop Discipline drill pack.",
        link: "/practice/",
      },
      "preflop-discipline": {
        title: "Preflop plan gap",
        packId: "preflop-discipline",
        baseline: "Preflop decisions need position, stack depth, opener range, and a plan versus 3-bets or reshoves.",
        exploit: "Defend wider versus late opens and tighter versus early opens; adjust only after naming the opponent leak.",
        drill: "Run the Preflop Discipline drill pack.",
        link: "/practice/",
      },
      "multiway-discipline": {
        title: "Multiway pot discipline",
        packId: "board-texture",
        baseline: "Multiway pots make continuing ranges stronger, so one-pair value and bluff frequency should tighten.",
        exploit: "Value bet clearly versus loose callers, but slow down when multiple ranges continue or a tight player raises.",
        drill: "Review multiway top-pair practice and board texture spots.",
        link: "/practice/",
      },
      "board-texture": {
        title: "Board texture overplay",
        packId: "board-texture",
        baseline: "Wet, monotone, or connected boards change equity realization and reduce automatic c-betting.",
        exploit: "Bet value and strong equity; check more fragile one-pair hands against aggressive or condensed ranges.",
        drill: "Run the Board Texture and C-Bets drill pack.",
        link: "/practice/",
      },
      "overfold-vs-maniac": {
        title: "Over-folding versus high bluff frequency",
        packId: "player-type-exploits",
        baseline: "Bluff-catching needs price, blockers, range position, and a believable bluffing range.",
        exploit: "Against a maniac profile, continue selected bluff-catchers more often while avoiding ego raises.",
        drill: "Run the Player-Type Exploits or River Decisions drill pack.",
        link: "/practice/",
      },
      "short-stack-discipline": {
        title: "Short-stack preflop discipline",
        packId: "tournament-short-stack",
        baseline: "Shallow stacks reduce postflop maneuvering. Small blind flats often perform poorly without a clear plan.",
        exploit: "Reshove wider versus late openers who fold too much; tighten against early or strong opening ranges.",
        drill: "Run tournament and short-stack preflop spots.",
        link: "/practice/",
      },
      "review-habit": {
        title: "Review structure needed",
        packId: "all",
        baseline: "A useful review starts with position, stack depth, board texture, action line, and question.",
        exploit: "Name the opponent leak before deviating from the baseline.",
        drill: "Save this report, then run one related Practice Mode spot.",
        link: "/practice/",
      },
    };
    return map[leak] || map["review-habit"];
  }

  function streetChecklist(data) {
    return [
      `<b>Preflop:</b> ${escapeHtml(data.preflop || "Not entered")}<br><span>Check position, opener range, caller range, and whether the hand is dominated.</span>`,
      `<b>Flop:</b> ${escapeHtml(data.flop || "Not entered")}<br><span>Ask who has range advantage, nut advantage, and what the bet is trying to achieve.</span>`,
      `<b>Turn:</b> ${escapeHtml(data.turn || "Not entered")}<br><span>Re-check SPR, new draws, range shifts, and whether your line still targets worse hands.</span>`,
      `<b>River:</b> ${escapeHtml(data.river || "Not entered")}<br><span>Separate value, bluff-catching, and blocker logic. Respect population tendencies.</span>`,
    ];
  }

  function recommendedPack(advice) {
    return packs.find((pack) => pack.id === advice.packId) || packs.find((pack) => pack.id === "all") || { id: "all", label: "All Spots", description: "Run a broad practice session." };
  }

  function streetPlan(data, leak) {
    const preflopPlan = /3-bet|3bet|4-bet|4bet|reshove|open/i.test(data.preflop + " " + data.question)
      ? "Define the continue range before acting: open, call, 3-bet, 4-bet, or fold should each have a reason."
      : "Start with position and range discipline. Do not let a playable-looking hand create dominated postflop trouble.";
    const flopPlan = /c-bet|cbet|range advantage|k72/i.test(data.flop + " " + data.question)
      ? "Name the c-bet job: value, equity denial, small range pressure, or check-range protection."
      : "Compare range advantage and nut advantage before choosing a size. One pair is not a complete plan.";
    const turnPlan = /raise|check-raise|spr|overpair|barrel/i.test(data.turn + " " + data.question)
      ? "Re-price the hand after the turn card. If the board shifts toward villain, reduce automatic stacking-off."
      : "Ask whether the turn improves your range, villain's range, or both. Plan which rivers continue.";
    const riverPlan = /blocker|bluff|thin|value|catch/i.test(data.river + " " + data.question + " " + leak)
      ? "Separate thin value, bluff, and bluff-catch logic. The target hands must be named before betting or calling."
      : "Use the final street to confirm the story: value targets, missed draws, blockers, and opponent frequency.";
    return [
      ["Preflop", preflopPlan],
      ["Flop", flopPlan],
      ["Turn", turnPlan],
      ["River", riverPlan],
    ];
  }

  function rangeShift(data, leak) {
    const villain = data.villainType || "Unknown";
    const shifts = [
      `Preflop ranges are shaped by ${data.heroPosition || "Hero"} versus ${data.villainPosition || "Villain"} and the ${data.potType || "pot type"}.`,
      `After flop action, remove hands that would usually fold and keep the continues that fit ${villain} tendencies.`,
      "Turn action should update relative hand strength, not just repeat the flop plan.",
      "River range is narrower. Decisions need a value target, bluff target, or bluff-catching price.",
    ];
    if (leak === "thin-value") shifts[1] = "Against a calling station, worse one-pair hands stay in the range longer than they should.";
    if (leak === "respect-passive-aggression") shifts[2] = "When a passive player raises turn or river, their range shifts sharply toward value.";
    if (leak === "blocker-selection") shifts[3] = "A blocker matters only if it removes villain's strongest calls and your line represents value.";
    if (leak === "multiway-discipline") shifts[1] = "Multiway callers make the continuing range stronger than a heads-up pot.";
    return shifts;
  }

  function mistakeTags(leak) {
    const map = {
      "overbluff-vs-caller": ["overbluff", "low fold equity", "wrong target"],
      "thin-value": ["missed value", "thin value", "sizing target"],
      "pot-odds-math": ["pot odds", "equity realization", "call price"],
      "blocker-selection": ["blockers", "river bluff", "range story"],
      "respect-passive-aggression": ["passive aggression", "overpair attachment", "relative strength"],
      "range-advantage-cbet": ["range advantage", "c-bet", "board texture"],
      "overpair-spr": ["SPR", "overpair", "turn pressure"],
      "dominated-ace": ["domination", "preflop discipline", "early position"],
      "preflop-discipline": ["preflop plan", "position", "range discipline"],
      "short-stack-discipline": ["short stack", "push-fold discipline", "small blind trap"],
      "overfold-vs-maniac": ["bluff-catcher", "player type", "river pressure"],
      "multiway-discipline": ["multiway", "one-pair caution", "range strength"],
      "board-texture": ["board texture", "equity shift", "pot control"],
      "review-habit": ["review structure", "missing context", "next drill"],
    };
    return map[leak] || map["review-habit"];
  }

  function reportText(report) {
    return [
      `Smart Poker Lab Analyze Report`,
      `${report.heroPosition || "Hero"} ${report.heroHand || "hand"} vs ${report.villainPosition || "Villain"} - ${report.potType || "Hand review"}`,
      `Leak: ${report.leakTitle}`,
      `Input quality: ${report.quality}% (${report.confidence} confidence)`,
      `Decision profile: ${report.decisionStreet} / ${report.boardProfile} / ${report.handProfile}`,
      `Priority: ${report.severity}`,
      `Leak weight: ${report.leakWeight.label} - ${report.leakWeight.estimate}`,
      `Recommended pack: ${report.packLabel}`,
      `Decision node: ${report.question || "No question entered."}`,
      `Key node: ${report.keyNode.street} - ${report.keyNode.reason}`,
      `Baseline: ${report.baseline}`,
      `Exploit adjustment: ${report.exploit}`,
      `Street plan: ${report.streetPlan.map(([street, plan]) => `${street}: ${plan}`).join(" | ")}`,
      `Range shift: ${report.rangeShift.join(" | ")}`,
      `Alternative lines: ${report.alternativeLines.map(([type, line]) => `${type}: ${line}`).join(" | ")}`,
      `Next drill: ${report.drill}`,
    ].join("\n");
  }

  function buildReport() {
    const data = collect();
    const leak = classifyLeak(data);
    const advice = leakAdvice(leak);
    const pack = recommendedPack(advice);
    const plan = streetPlan(data, leak);
    const shifts = rangeShift(data, leak);
    const tags = mistakeTags(leak);
    const quality = qualityScore(data);
    const decisionStreet = inferDecisionStreet(data);
    const texture = boardProfile(data);
    const handClass = handProfile(data);
    const severity = leakSeverity(leak, quality);
    const confidence = confidenceLabel(quality);
    const leakWeight = leakWeightEstimate(leak, data, quality);
    const keyNode = keyDecisionNode(data, leak, decisionStreet);
    const alternativeLinesList = alternativeLines(data, leak, advice);
    const opponentRows = opponentAdjustmentRows(data, leak);
    const score = leak === "review-habit" ? Math.max(58, Math.min(78, quality)) : Math.max(65, Math.min(92, Math.round((quality + 82) / 2)));
    const reportTitle = document.querySelector("#analyze-report-title");
    if (reportTitle) reportTitle.textContent = advice.title;
    output.innerHTML = `<div class="analyze-report-card">
      <div class="analyze-report-topline">
        <span>${escapeHtml(data.potType || "Hand review")}</span>
        <strong>${escapeHtml(data.heroPosition || "Hero")} ${escapeHtml(data.heroHand || "hand")} vs ${escapeHtml(data.villainPosition || "Villain")}</strong>
      </div>
      <div class="analyze-report-tags">
        <span>${escapeHtml(data.game || "Study hand")}</span>
        <span>${escapeHtml(data.stack || "Stack unknown")}</span>
        <span>${escapeHtml(data.villainType || "Unknown")}</span>
        <span>${escapeHtml(leak)}</span>
      </div>
      <section class="analyze-score-section"><h4>Review Quality</h4>
        <div class="analyze-score-grid">
          <article><span>Input Quality</span><strong>${quality}%</strong><p>${escapeHtml(confidence)} confidence based on filled context and street detail.</p></article>
          <article><span>Priority</span><strong>${escapeHtml(severity)}</strong><p>This is a study priority, not a prediction about outcomes.</p></article>
          <article><span>Leak Weight</span><strong>${escapeHtml(leakWeight.label)}</strong><p>${escapeHtml(leakWeight.estimate)}</p></article>
          <article><span>Decision Street</span><strong>${escapeHtml(decisionStreet)}</strong><p>Use this street as the first node to replay.</p></article>
        </div>
      </section>
      <section><h4>Decision Node</h4><p>${escapeHtml(data.question || "No question entered.")}</p><p><b>Board:</b> ${escapeHtml(data.board || "No board entered.")}</p></section>
      <section class="analyze-key-node"><h4>Key Node Diagnosis</h4><p><b>${escapeHtml(keyNode.street)}:</b> ${escapeHtml(keyNode.action)}</p><p>${escapeHtml(keyNode.reason)}</p></section>
      <section><h4>Decision Profile</h4><div class="analyze-report-tags">
        <span>${escapeHtml(texture)}</span>
        <span>${escapeHtml(handClass)}</span>
        <span>${escapeHtml(data.potType || "Pot type unknown")}</span>
        <span>${escapeHtml(data.villainType || "Villain unknown")}</span>
      </div></section>
      <section><h4>Report Matrix</h4>${renderDataTable(
        ["Data Row", "Current Value", "Review Use"],
        [
          ["Input Quality", `${quality}%`, `${confidence} confidence based on street detail.`],
          ["Decision Street", decisionStreet, "Replay this node before judging the result."],
          ["Board Profile", texture, "Connect sizing and aggression to texture."],
          ["Leak Weight", leakWeight.label, leakWeight.estimate],
          ["Recommended Pack", pack.label, "Queue this pack after saving the report."],
        ],
        "Analyze Lite report matrix",
      )}</section>
      <section><h4>Street Review</h4><ol>${streetChecklist(data).map((item) => `<li>${item}</li>`).join("")}</ol></section>
      <section><h4>Street-by-Street Plan</h4><div class="analyze-plan-grid">${plan.map(([street, note]) => `<article><strong>${escapeHtml(street)}</strong><p>${escapeHtml(note)}</p></article>`).join("")}</div></section>
      <section><h4>Alternative Lines</h4>${renderDataTable(["Line", "Use"], alternativeLinesList, "Analyze Lite alternative lines")}</section>
      <section><h4>Range Shift</h4><ol>${shifts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>
      <section><h4>Baseline</h4><p>${escapeHtml(advice.baseline)}</p></section>
      <section><h4>Exploit Adjustment</h4><p>${escapeHtml(advice.exploit)}</p></section>
      <section><h4>Opponent-Type Adjustment Table</h4>${renderDataTable(["Opponent Type", "Adjustment"], opponentRows, "Analyze Lite opponent adjustment table")}</section>
      <section><h4>Likely Leak</h4><p><b>${escapeHtml(advice.title)}</b></p><div class="analyze-report-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div></section>
      <section><h4>Leak Weight Note</h4><p>${escapeHtml(leakWeight.note)}</p></section>
      <section><h4>Coach Prescription</h4><ol>
        <li>Replay the ${escapeHtml(decisionStreet)} node first; do not start by judging the final result.</li>
        <li>Write down which worse hands call, which better hands raise, and which hands fold.</li>
        <li>Run the linked drill pack once, then save one new review after the next session.</li>
      </ol></section>
      <section><h4>Recommended Drill Pack</h4><p><b>${escapeHtml(pack.label)}</b>: ${escapeHtml(pack.description || advice.drill)}</p><p><a href="${escapeHtml(advice.link)}">Open recommended training page</a></p></section>
      <section><h4>Save-to-Progress Payload</h4><p>Saving stores this report in this browser and adds one Analyze event to the Progress dashboard. It does not upload a hand history or create an account.</p></section>
    </div>`;
    lastReport = { ...data, leak, leakTitle: advice.title, drill: advice.drill, link: advice.link, score, quality, confidence, severity, leakWeight, keyNode, alternativeLines: alternativeLinesList, opponentRows, decisionStreet, boardProfile: texture, handProfile: handClass, baseline: advice.baseline, exploit: advice.exploit, packId: pack.id, packLabel: pack.label, streetPlan: plan, rangeShift: shifts, tags };
    updateAnalyzeCommand(lastReport);
    if (actionResult) actionResult.textContent = "Analyze report built. You can save it locally or copy it.";
    trackEvent("analyze_report_built", {
      leak,
      pack: pack.id,
      villainType: data.villainType,
      potType: data.potType,
    });
    return lastReport;
  }

  function renderSavedReports() {
    const reports = readStore("spl_analyze_reports", []);
    savedList.innerHTML = reports.length
      ? reports
          .slice(0, 6)
          .map(
            (report) => `<article class="analyze-saved-item">
              <strong>${escapeHtml(report.heroPosition)} ${escapeHtml(report.heroHand)} - ${escapeHtml(report.leakTitle)}</strong>
              <span>${escapeHtml(report.villainType)} / ${escapeHtml(report.potType)} / ${escapeHtml(report.leakWeight?.label || "Study weight")} / ${escapeHtml(report.packLabel || "Practice")}</span>
            </article>`,
          )
          .join("")
      : "No saved reports in this browser yet.";
    updateAnalyzeCommand(lastReport);
  }

  if (sampleButtons) {
    sampleButtons.innerHTML = examples.map((example) => `<button class="secondary-action" type="button" data-analyze-sample="${escapeHtml(example.id)}">${escapeHtml(example.label)}</button>`).join("");
    sampleButtons.querySelectorAll("[data-analyze-sample]").forEach((button) => {
      button.addEventListener("click", () => {
        loadExample(examples.find((example) => example.id === button.dataset.analyzeSample));
        buildReport();
      });
    });
  }

  build.addEventListener("click", buildReport);
  save?.addEventListener("click", () => {
    const report = buildReport();
    const reports = readStore("spl_analyze_reports", []);
    reports.unshift({ ...report, ts: Date.now() });
    writeStore("spl_analyze_reports", reports.slice(0, 40));
    appendTrainingEvent({
      source: "analyze-lite",
      title: `${report.heroPosition} ${report.heroHand} review`,
      answer: report.question,
      score: report.score,
      grade: "Analyze Report",
      leak: report.leak,
      pack: report.packId,
      packLabel: report.packLabel,
      leakWeight: report.leakWeight?.label,
    });
    renderSavedReports();
    if (actionResult) actionResult.textContent = "Report saved in this browser and added to Progress.";
    trackEvent("analyze_report_saved_local", {
      leak: report.leak,
      pack: report.packId,
      count: reports.length,
    });
  });
  queuePack?.addEventListener("click", () => {
    const report = lastReport || buildReport();
    const session = readStore("spl_practice_session_v2", {});
    writeStore("spl_practice_session_v2", { ...session, lastPack: report.packId || "all" });
    const queue = readStore("spl_analyze_practice_queue", []);
    queue.unshift({
      id: `analyze-${Date.now()}`,
      title: `${report.heroPosition || "Hero"} ${report.heroHand || "hand"} - ${report.leakTitle}`,
      packId: report.packId,
      packLabel: report.packLabel,
      leak: report.leak,
      decisionStreet: report.decisionStreet,
      ts: Date.now(),
    });
    writeStore("spl_analyze_practice_queue", queue.slice(0, 40));
    appendTrainingEvent({
      source: "analyze-lite",
      title: `${report.packLabel} queued from analysis`,
      answer: report.question,
      score: report.score,
      grade: "Practice Pack Queued",
      leak: report.leak,
      pack: report.packId,
      packLabel: report.packLabel,
      leakWeight: report.leakWeight?.label,
    });
    if (actionResult) actionResult.textContent = `${report.packLabel} is queued as your next Practice pack in this browser.`;
    trackEvent("analyze_pack_queued", { leak: report.leak, pack: report.packId });
  });
  copy?.addEventListener("click", async () => {
    const report = lastReport || buildReport();
    const text = reportText(report);
    try {
      await navigator.clipboard.writeText(text);
      if (actionResult) actionResult.textContent = "Analyze report copied to clipboard.";
    } catch {
      if (actionResult) actionResult.textContent = text;
    }
    trackEvent("analyze_report_copied", { leak: report.leak, pack: report.packId });
  });

  renderSavedReports();
  if (examples[0]) loadExample(examples[0]);
  updateAnalyzeCommand();
}

function initLeakDashboard() {
  const practiceSpots = readJsonScript("progress-practice-spots-data", []);
  const practicePacks = readJsonScript("progress-practice-packs-data", []);
  const root = document.querySelector("#leak-dashboard");
  const onboardingNode = document.querySelector("#dashboard-onboarding");
  const scoreNode = document.querySelector("#dashboard-score");
  const countNode = document.querySelector("#dashboard-count");
  const planNode = document.querySelector("#dashboard-plan");
  const studyNode = document.querySelector("#dashboard-study");
  const analyzeNode = document.querySelector("#dashboard-analyze");
  const streakNode = document.querySelector("#dashboard-streak");
  const bestStreakNode = document.querySelector("#dashboard-best-streak");
  const reviewQueueNode = document.querySelector("#dashboard-review-queue");
  const weeklyNode = document.querySelector("#dashboard-weekly");
  const studyMasteredNode = document.querySelector("#dashboard-study-mastered");
  const studyQueueNode = document.querySelector("#dashboard-study-queue");
  const routineNode = document.querySelector("#dashboard-routine");
  const routineNote = document.querySelector("#dashboard-routine-note");
  const leaksNode = document.querySelector("#dashboard-leaks");
  const adviceNode = document.querySelector("#dashboard-advice");
  const weeklyCoachNode = document.querySelector("#dashboard-weekly-coach");
  const packProgressNode = document.querySelector("#dashboard-pack-progress");
  const weakestPackNode = document.querySelector("#dashboard-weakest-pack");
  const studyQueueListNode = document.querySelector("#dashboard-study-queue-list");
  const sessionFocusNode = document.querySelector("#dashboard-session-focus");
  const continuityNode = document.querySelector("#dashboard-continuity");
  const actionBars = document.querySelector("#dashboard-action-bars");
  const trendNode = document.querySelector("#dashboard-score-trend");
  const nextActionsNode = document.querySelector("#dashboard-next-actions");
  const fiveDecisionsNode = document.querySelector("#dashboard-five-decisions");
  const recentNode = document.querySelector("#dashboard-recent");
  const reportsNode = document.querySelector("#dashboard-reports");
  const radarNode = document.querySelector("#dashboard-radar");
  const radarLegendNode = document.querySelector("#dashboard-radar-legend");
  const badgesNode = document.querySelector("#dashboard-badges");
  const spacedReviewNode = document.querySelector("#dashboard-spaced-review");
  const queueSpacedReviewButton = document.querySelector("#dashboard-queue-spaced-review");
  const shareCardNode = document.querySelector("#dashboard-share-card");
  const copyShareCardButton = document.querySelector("#dashboard-copy-share-card");
  const downloadShareCardButton = document.querySelector("#dashboard-download-share-card");
  const exportButton = document.querySelector("#dashboard-export-summary");
  const refreshButton = document.querySelector("#dashboard-reset-view");
  const exportResult = document.querySelector("#dashboard-export-result");
  if (!root || !scoreNode || !countNode || !planNode || !leaksNode || !adviceNode) return;
  let latestShareText = "";
  let latestShareSvg = "";

  const advice = {
    "missed-value": { text: "Practice calling-station hands and thin value spots.", link: practicePackUrl("thin-value") },
    "sizing-drift": { text: "Review bet sizing and ask what worse hands continue.", link: "/gto/c-bet/" },
    "overplay-top-pair": { text: "Study SPR, relative hand strength, and river raise discipline.", link: "/gto/spr/" },
    "under-cbet": { text: "Study dry-board c-bet spots and range advantage.", link: "/study/#study-btn-bb-k72" },
    "expensive-bluff": { text: "Practice small c-bet strategy before large bluffs.", link: practicePackUrl("board-texture") },
    overbluff: { text: "Review blocker and opponent-fold-frequency lessons.", link: practicePackUrl("river-decision-lab") },
    "too-tight": { text: "Practice button and cutoff opening ranges.", link: "/tools/range-trainer/" },
    "dominated-ace": { text: "Review early-position starting hand discipline.", link: "/preflop/utg-range/" },
    "overfold-blind": { text: "Practice BB defense vs late-position opens.", link: "/tools/range-trainer/" },
    "pot-odds-math": { text: "Repeat the Pot Odds Trainer until the final-pot formula is automatic.", link: "/tools/pot-odds-trainer/" },
    "review-habit": { text: "Keep building structured reviews after sessions.", link: "/analyze/" },
    "overbluff-vs-caller": { text: "Reduce pure bluffs versus sticky ranges and train value-heavy adjustments.", link: "/player-types/calling-station/" },
    "thin-value": { text: "Train thin value sizing against players who continue too wide.", link: practicePackUrl("thin-value") },
    "blocker-selection": { text: "Study river blocker selection before firing missed draws.", link: practicePackUrl("river-decision-lab") },
    "respect-passive-aggression": { text: "Respect passive-player turn and river raises until you have bluff evidence.", link: "/hand-review/overpair-turn-pressure/" },
    "range-advantage-cbet": { text: "Review K72-style range advantage c-bet spots.", link: "/study/#study-btn-bb-k72" },
    "overpair-spr": { text: "Use SPR and changing-board texture before committing overpairs.", link: "/gto/spr/" },
    "best-move": { text: "Keep training variety: add Analyze reports and 30-day plan checkoffs.", link: "/analyze/" },
  };

  const leakToPack = {
    "missed-value": "thin-value",
    "thin-value": "thin-value",
    "missed-thin-value": "value",
    "overplay-top-pair": "value",
    "overpair-attachment": "value",
    "under-cbet": "board-texture",
    "turn-barrel-plan": "board-texture",
    "monotone-overplay": "board-texture",
    "passive-draws": "board-texture",
    "pot-odds-math": "pot-odds-math",
    "set-mining-discipline": "math-stack-depth",
    "blocker-misuse": "river-decisions",
    "polar-sizing": "river-decisions",
    "dominated-ace": "preflop-discipline",
    "overfold-blinds": "preflop-discipline",
    "overfold-to-3bet": "preflop-discipline",
  };

  function eventLabel(event) {
    const labels = {
      "daily-hand": "Daily Hand",
      "range-trainer": "Range Trainer",
      "range-editor": "Range Editor",
      "pot-odds-trainer": "Pot Odds",
      "player-type-test": "Player Type",
      "study-mode": "Study",
      "practice-mode": "Practice",
      "hand-review-builder": "Review Builder",
      "analyze-lite": "Analyze",
      "training-plan": "Plan",
      "progress-dashboard": "Progress",
    };
    return labels[event.source] || event.source || "Training";
  }

  function readPracticeSession() {
    const session = readStore("spl_practice_session_v2", {});
    return {
      seenByPack: session.seenByPack && typeof session.seenByPack === "object" ? session.seenByPack : {},
      currentStreak: Number(session.currentStreak || 0),
      bestStreak: Number(session.bestStreak || 0),
      lastPack: session.lastPack || "all",
    };
  }

  function reviewQueueIds(events) {
    const ids = new Set();
    events
      .filter((event) => Number.isFinite(Number(event.score)) && Number(event.score) < 70)
      .forEach((event) => {
        if (event.spotId) ids.add(event.spotId);
        practiceSpots
          .filter((spot) => spot.leak === event.leak || spot.options.some((option) => option.leak === event.leak))
          .forEach((spot) => ids.add(spot.id));
      });
    return ids;
  }

  function spotMatchesPack(spot, pack, queueIds) {
    if (!pack || pack.id === "all") return true;
    if (pack.dynamic === "mistakes") return queueIds.has(spot.id);
    const match = pack.match || {};
    const checks = [];
    if (Array.isArray(match.modes)) checks.push(match.modes.includes(spot.mode));
    if (Array.isArray(match.streets)) checks.push(match.streets.includes(spot.street));
    if (Array.isArray(match.playerTypes)) checks.push(match.playerTypes.includes(spot.playerType));
    if (Array.isArray(match.leaks)) checks.push(match.leaks.includes(spot.leak) || spot.options.some((option) => match.leaks.includes(option.leak)));
    return checks.length ? checks.some(Boolean) : true;
  }

  function buildPackStats(session, events) {
    const queueIds = reviewQueueIds(events);
    const allSeen = new Set();
    Object.values(session.seenByPack).forEach((ids) => {
      if (Array.isArray(ids)) ids.forEach((id) => allSeen.add(id));
    });
    events.filter((event) => event.source === "practice-mode" && event.spotId).forEach((event) => allSeen.add(event.spotId));
    return practicePacks.map((pack) => {
      const packSpots = practiceSpots.filter((spot) => spotMatchesPack(spot, pack, queueIds));
      const seen = pack.id === "all" ? allSeen : new Set(session.seenByPack[pack.id] || []);
      const trained = packSpots.filter((spot) => seen.has(spot.id)).length;
      const total = packSpots.length;
      return {
        ...pack,
        total,
        trained,
        percent: total ? Math.round((trained / total) * 100) : 0,
      };
    });
  }

  function dayKey(ts) {
    const date = new Date(Number(ts || Date.now()));
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  function recentEvents(events, days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return events.filter((event) => Number(event.ts || 0) >= cutoff);
  }

  const radarDimensions = [
    {
      id: "preflop",
      label: "Preflop",
      match: (event) => /preflop|range-trainer|range-editor|blind|3-bet|4-bet|dominated|open|short-stack|icm/i.test(`${event.mode} ${event.street} ${event.source} ${event.leak} ${event.title}`),
    },
    {
      id: "flop",
      label: "Flop C-Bet",
      match: (event) => /flop|c-bet|cbet|board-texture|range-advantage|monotone|wet board|dry board/i.test(`${event.street} ${event.leak} ${event.title} ${event.pack}`),
    },
    {
      id: "turn",
      label: "Turn Plan",
      match: (event) => /turn|barrel|probe|scare|overpair|spr/i.test(`${event.street} ${event.leak} ${event.title} ${event.pack}`),
    },
    {
      id: "river",
      label: "River",
      match: (event) => /river|blocker|bluff|thin|catch|overbet|check-raise|block bet/i.test(`${event.street} ${event.leak} ${event.title} ${event.pack}`),
    },
    {
      id: "math",
      label: "Math",
      match: (event) => /math|pot-odds|odds|equity|spr|stack-depth/i.test(`${event.mode} ${event.source} ${event.leak} ${event.title} ${event.pack}`),
    },
    {
      id: "exploit",
      label: "Exploit",
      match: (event) => /calling station|nit|maniac|regular|over-folder|player-type|exploit|station|overbluff|passive/i.test(`${event.playerType} ${event.source} ${event.leak} ${event.title} ${event.packLabel}`),
    },
  ];

  function categoryScores(scored) {
    return radarDimensions.map((dimension) => {
      const matches = scored.filter((event) => dimension.match(event));
      const average = matches.length ? Math.round(matches.reduce((sum, event) => sum + Number(event.score), 0) / matches.length) : 0;
      return { ...dimension, score: average, count: matches.length };
    });
  }

  function renderRadar(categories) {
    if (!radarNode || !radarLegendNode) return;
    const size = 280;
    const center = 140;
    const radius = 92;
    const axis = categories.map((category, index) => {
      const angle = -Math.PI / 2 + (index / categories.length) * Math.PI * 2;
      const scoreRadius = radius * (Math.max(0, Math.min(100, category.score)) / 100);
      return {
        ...category,
        angle,
        x: center + Math.cos(angle) * scoreRadius,
        y: center + Math.sin(angle) * scoreRadius,
        axisX: center + Math.cos(angle) * radius,
        axisY: center + Math.sin(angle) * radius,
        labelX: center + Math.cos(angle) * (radius + 34),
        labelY: center + Math.sin(angle) * (radius + 34),
      };
    });
    const polygon = axis.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const rings = [25, 50, 75, 100]
      .map((level) => {
        const r = radius * (level / 100);
        const points = categories
          .map((_, index) => {
            const angle = -Math.PI / 2 + (index / categories.length) * Math.PI * 2;
            return `${(center + Math.cos(angle) * r).toFixed(1)},${(center + Math.sin(angle) * r).toFixed(1)}`;
          })
          .join(" ");
        return `<polygon points="${points}" fill="none" stroke="rgba(16,24,22,.12)" stroke-width="1" />`;
      })
      .join("");
    radarNode.innerHTML = `<svg class="radar-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Training skill radar">
      ${rings}
      ${axis.map((point) => `<line x1="${center}" y1="${center}" x2="${point.axisX.toFixed(1)}" y2="${point.axisY.toFixed(1)}" stroke="rgba(16,24,22,.16)" />`).join("")}
      <polygon points="${polygon}" fill="rgba(72,196,138,.35)" stroke="#255f49" stroke-width="3" />
      ${axis.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="#07110f" />`).join("")}
      ${axis.map((point) => `<text x="${point.labelX.toFixed(1)}" y="${point.labelY.toFixed(1)}" text-anchor="middle">${escapeHtml(point.label)}</text>`).join("")}
    </svg>`;
    radarLegendNode.innerHTML = categories
      .map((category) => `<span><b>${escapeHtml(category.label)}</b> ${category.score || 0}/100 <small>${category.count} spots</small></span>`)
      .join("");
  }

  function customRangeCount() {
    const ranges = readStore("spl_custom_ranges", {});
    return ranges && typeof ranges === "object" && !Array.isArray(ranges) ? Object.keys(ranges).length : 0;
  }

  function todaysRangeChallengeComplete() {
    const history = readStore("spl_range_challenge_history", {});
    const today = new Date().toISOString().slice(0, 10);
    return history && history[today] ? Object.keys(history[today]).length >= 5 : false;
  }

  function buildBadges(model, routinePercent, categories) {
    const riverCount = categories.find((category) => category.id === "river")?.count || 0;
    return [
      ["First Drill", "Complete one scored drill.", model.scored.length >= 1],
      ["Practice Sprinter", "Log 25 scored decisions.", model.scored.length >= 25],
      ["Range Architect", "Save a custom range matrix.", customRangeCount() > 0],
      ["Preflop Challenger", "Finish today's 5-spot range challenge.", todaysRangeChallengeComplete()],
      ["7-Day Starter", "Check off seven training-plan days.", model.progress.length >= 7],
      ["River Lab", "Train ten river decisions.", riverCount >= 10],
      ["Review Builder", "Save one Analyze Lite report.", model.reports.length >= 1],
      ["Streak Builder", "Reach a 5-decision 80+ streak.", model.practiceSession.bestStreak >= 5],
      ["Study Loop", "Reach 75% routine score.", routinePercent >= 75],
    ];
  }

  function renderBadges(model, routinePercent, categories) {
    if (!badgesNode) return;
    const badges = buildBadges(model, routinePercent, categories);
    badgesNode.innerHTML = badges
      .map(([title, text, unlocked]) => `<article class="badge-card${unlocked ? " is-unlocked" : ""}">
        <span>${unlocked ? "Unlocked" : "Locked"}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </article>`)
      .join("");
  }

  function spacedReviewItems(model) {
    const stored = readStore("spl_spaced_review_queue", []);
    const byKey = {};
    if (Array.isArray(stored)) {
      stored.forEach((item) => {
        if (item && item.key) byKey[item.key] = item;
      });
    }
    const lowEvents = model.scored
      .filter((event) => Number(event.score) < 70)
      .slice(0, 60)
      .map((event) => {
        const key = event.spotId || `${event.leak || "review"}-${event.title || "spot"}`;
        const saved = byKey[key] || {};
        return {
          key,
          title: event.title || event.leak || "Review spot",
          leak: event.leak || "review-needed",
          score: Number(event.score),
          source: event.source || "training",
          ts: Number(event.ts || Date.now()),
          stage: Number(saved.stage || 0),
          nextDue: Number(saved.nextDue || 0),
        };
      });
    const seen = new Set();
    return lowEvents
      .filter((item) => {
        if (seen.has(item.key)) return false;
        seen.add(item.key);
        return true;
      })
      .sort((a, b) => a.nextDue - b.nextDue || a.score - b.score)
      .slice(0, 8);
  }

  function renderSpacedReview(model) {
    if (!spacedReviewNode) return;
    const items = spacedReviewItems(model);
    const now = Date.now();
    spacedReviewNode.innerHTML = items.length
      ? items
          .map((item) => {
            const due = !item.nextDue || item.nextDue <= now;
            const dueText = due ? "Due now" : `Due ${new Date(item.nextDue).toLocaleDateString()}`;
            return `<article class="spaced-review-item${due ? " is-due" : ""}">
              <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.leak)} / ${escapeHtml(eventLabel(item))} / ${item.score}/100</span></div>
              <b>${escapeHtml(dueText)}</b>
            </article>`;
          })
          .join("")
      : "No low-score reviews due yet. Scores below 70 will appear here for spaced repetition.";
  }

  function queueDueSpacedReview(model) {
    const intervals = [0, 1, 3, 7, 14].map((days) => days * 24 * 60 * 60 * 1000);
    const existing = readStore("spl_spaced_review_queue", []);
    const map = {};
    if (Array.isArray(existing)) {
      existing.forEach((item) => {
        if (item && item.key) map[item.key] = item;
      });
    }
    spacedReviewItems(model).forEach((item) => {
      const current = map[item.key] || item;
      const stage = Math.min(4, Number(current.stage || 0) + 1);
      map[item.key] = {
        ...current,
        ...item,
        stage,
        nextDue: Date.now() + intervals[stage],
        queuedAt: new Date().toISOString(),
      };
    });
    const nextQueue = Object.values(map).slice(0, 80);
    writeStore("spl_spaced_review_queue", nextQueue);
    const session = readStore("spl_practice_session_v2", {});
    writeStore("spl_practice_session_v2", { ...session, lastPack: "review-queue" });
    appendTrainingEvent({
      source: "progress-dashboard",
      title: "Queued spaced review",
      grade: "Review Queue",
      leak: "spaced-review",
      pack: "review-queue",
    });
    return nextQueue.length;
  }

  function shareText(model, weakPack, routinePercent) {
    const topLeak = model.leaks[0]?.[0] || "none yet";
    return [
      "Smart Poker Lab weekly training report",
      `Smart Score: ${model.average === null ? "No data" : `${model.average}/100`}`,
      `Scored decisions: ${model.scored.length}`,
      `7-day actions: ${model.weeklyEvents.length}`,
      `Routine score: ${routinePercent}%`,
      `Top leak: ${topLeak}`,
      `Next pack: ${weakPack?.label || "Start Practice Mode"}`,
    ].join("\n");
  }

  function shareSvg(model, weakPack, routinePercent, categories) {
    const topLeak = model.leaks[0]?.[0] || "None yet";
    const radarLine = categories.map((category) => `${category.label}: ${category.score}`).join(" / ");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#07110f"/>
      <circle cx="1020" cy="80" r="210" fill="#c9f4df" opacity=".16"/>
      <circle cx="120" cy="560" r="180" fill="#f0b83f" opacity=".16"/>
      <text x="72" y="92" fill="#c9f4df" font-family="Arial" font-size="30" font-weight="800">Smart Poker Lab</text>
      <text x="72" y="162" fill="#ffffff" font-family="Arial" font-size="58" font-weight="900">Weekly Training Report</text>
      <text x="72" y="226" fill="#b8c8c0" font-family="Arial" font-size="28">Offline poker education dashboard</text>
      <g transform="translate(72 280)">
        <rect width="230" height="120" rx="18" fill="#ffffff" opacity=".1"/>
        <text x="24" y="42" fill="#b8c8c0" font-family="Arial" font-size="20">Smart Score</text>
        <text x="24" y="88" fill="#ffffff" font-family="Arial" font-size="44" font-weight="900">${model.average === null ? "Start" : `${model.average}/100`}</text>
      </g>
      <g transform="translate(326 280)">
        <rect width="230" height="120" rx="18" fill="#ffffff" opacity=".1"/>
        <text x="24" y="42" fill="#b8c8c0" font-family="Arial" font-size="20">Decisions</text>
        <text x="24" y="88" fill="#ffffff" font-family="Arial" font-size="44" font-weight="900">${model.scored.length}</text>
      </g>
      <g transform="translate(580 280)">
        <rect width="230" height="120" rx="18" fill="#ffffff" opacity=".1"/>
        <text x="24" y="42" fill="#b8c8c0" font-family="Arial" font-size="20">Routine</text>
        <text x="24" y="88" fill="#ffffff" font-family="Arial" font-size="44" font-weight="900">${routinePercent}%</text>
      </g>
      <text x="72" y="468" fill="#ffffff" font-family="Arial" font-size="28" font-weight="800">Top leak: ${escapeHtml(topLeak)}</text>
      <text x="72" y="512" fill="#c9f4df" font-family="Arial" font-size="28" font-weight="800">Next pack: ${escapeHtml(weakPack?.label || "Start Practice Mode")}</text>
      <text x="72" y="560" fill="#b8c8c0" font-family="Arial" font-size="20">${escapeHtml(radarLine)}</text>
      <text x="72" y="600" fill="#6f847a" font-family="Arial" font-size="18">Education only. No real-money gambling service or real-time play assistance.</text>
    </svg>`;
  }

  function packScoreStats(scored) {
    const byPack = {};
    scored.forEach((event) => {
      const packId = event.pack || "unpacked";
      byPack[packId] = byPack[packId] || { count: 0, sum: 0, low: 0 };
      byPack[packId].count += 1;
      byPack[packId].sum += Number(event.score);
      if (Number(event.score) < 70) byPack[packId].low += 1;
    });
    return byPack;
  }

  function weakestPack(model) {
    const scoreStats = packScoreStats(model.scored);
    return model.packStats
      .filter((pack) => pack.id !== "all" && pack.id !== "review-queue" && pack.total > 0)
      .map((pack) => {
        const stats = scoreStats[pack.id] || { count: 0, sum: 0, low: 0 };
        const average = stats.count ? Math.round(stats.sum / stats.count) : null;
        const lowPenalty = stats.low * 12;
        const scorePenalty = average === null ? 12 : Math.max(0, 82 - average);
        const completionPenalty = 100 - pack.percent;
        return { ...pack, average, low: stats.low, score: completionPenalty + scorePenalty + lowPenalty };
      })
      .sort((a, b) => b.score - a.score)[0];
  }

  function packDecisionPreview(pack, queueIds) {
    if (!pack) return [];
    return practiceSpots
      .filter((spot) => spotMatchesPack(spot, pack, queueIds))
      .slice(0, 5)
      .map((spot) => ({
        title: spot.title || spot.question || "Practice decision",
        street: spot.street || spot.mode || "Training",
        leak: spot.leak || "decision-review",
      }));
  }

  function sourceCount(events, source) {
    return events.filter((event) => event.source === source).length;
  }

  function readModel() {
    const events = readStore("spl_training_events", []);
    const scored = events.filter((event) => Number.isFinite(Number(event.score)));
    const progress = readStore("spl_training_progress", []);
    const studyViews = readStore("spl_study_views", []);
    const studyMastery = readStore("spl_study_mastery", {});
    const studyQueue = readStore("spl_study_practice_queue", []);
    const reports = readStore("spl_analyze_reports", []);
    const practiceSession = readPracticeSession();
    const queueIds = reviewQueueIds(events);
    const packStats = buildPackStats(practiceSession, events);
    const weeklyEvents = recentEvents(events, 7);
    const activeDays = new Set(weeklyEvents.map((event) => dayKey(event.ts)));
    const leakCounts = {};
    scored.forEach((event) => {
      if (!event.leak || event.leak === "best-move") return;
      leakCounts[event.leak] = (leakCounts[event.leak] || 0) + 1;
    });
    const sourceCounts = {};
    events.forEach((event) => {
      const source = event.source || "training";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    return {
      events,
      weeklyEvents,
      activeDays,
      scored,
      progress,
      studyViews,
      studyMastery: studyMastery && typeof studyMastery === "object" && !Array.isArray(studyMastery) ? studyMastery : {},
      studyQueue: Array.isArray(studyQueue) ? studyQueue : [],
      reports,
      practiceSession,
      queueIds,
      packStats,
      leakCounts,
      leaks: Object.entries(leakCounts).sort((a, b) => b[1] - a[1]),
      sourceCounts,
      average: scored.length ? Math.round(scored.reduce((sum, event) => sum + Number(event.score), 0) / scored.length) : null,
    };
  }

  function renderDashboard() {
    const model = readModel();
    const studyCount = new Set(model.studyViews.map((view) => view.id)).size;
    const masteredCount = Object.keys(model.studyMastery).length;
    const queuedStudyCount = model.studyQueue.length;
    const weakPack = weakestPack(model);
    const weeklyStudy = sourceCount(model.weeklyEvents, "study-mode");
    const weeklyPractice = sourceCount(model.weeklyEvents, "practice-mode");
    const weeklyAnalyze = sourceCount(model.weeklyEvents, "analyze-lite");
    const weeklyPlan = sourceCount(model.weeklyEvents, "training-plan");
    const routinePieces = [
      studyCount > 0 || masteredCount > 0,
      model.scored.length > 0,
      model.reports.length > 0,
      model.progress.length > 0,
      model.packStats.some((pack) => pack.percent > 0),
    ];
    const routinePercent = Math.round((routinePieces.filter(Boolean).length / routinePieces.length) * 100);
    const hasAnyActivity = model.events.length > 0 || model.reports.length > 0 || model.progress.length > 0 || studyCount > 0;
    const categories = categoryScores(model.scored);
    renderRadar(categories);
    renderBadges(model, routinePercent, categories);
    renderSpacedReview(model);
    if (onboardingNode) onboardingNode.hidden = hasAnyActivity;
    scoreNode.textContent = model.average === null ? "Start loop" : `${model.average}/100`;
    document.querySelector("#dashboard-score-note").textContent =
      model.average === null ? "Do 1 Daily Hand, 3 Pot Odds drills, and 1 Analyze note to generate a portrait." : model.average >= 80 ? "Strong recent training decisions." : "Review the leak tags below.";
    countNode.textContent = String(model.scored.length);
    planNode.textContent = `${model.progress.length} / 30`;
    if (studyNode) studyNode.textContent = String(studyCount);
    if (analyzeNode) analyzeNode.textContent = String(model.reports.length);
    if (streakNode) streakNode.textContent = String(model.practiceSession.currentStreak);
    if (bestStreakNode) bestStreakNode.textContent = String(model.practiceSession.bestStreak);
    if (reviewQueueNode) reviewQueueNode.textContent = String(model.queueIds.size);
    if (weeklyNode) weeklyNode.textContent = String(model.weeklyEvents.length);
    if (studyMasteredNode) studyMasteredNode.textContent = String(masteredCount);
    if (studyQueueNode) studyQueueNode.textContent = String(queuedStudyCount);
    if (routineNode) routineNode.textContent = `${routinePercent}%`;
    if (routineNote) routineNote.textContent = routinePercent >= 75 ? "Study loop is active." : "Add missing Study, Practice, Analyze, or Plan activity.";

    if (weeklyCoachNode) {
      const activeDaysText = `${model.activeDays.size}/7 active days`;
      weeklyCoachNode.innerHTML = `<article>
          <span>Activity</span>
          <strong>${model.weeklyEvents.length}</strong>
          <p>${activeDaysText}. Aim for several small study sessions instead of one oversized catch-up.</p>
        </article>
        <article>
          <span>Loop Balance</span>
          <strong>${weeklyStudy}/${weeklyPractice}/${weeklyAnalyze}/${weeklyPlan}</strong>
          <p>Study / Practice / Analyze / Plan actions in the last 7 days.</p>
        </article>
        <article>
          <span>Coach Note</span>
          <strong>${model.activeDays.size >= 3 ? "Rhythm building" : "Start tiny"}</strong>
          <p>${model.activeDays.size >= 3 ? "Keep the loop alive with one short drill and one review note." : "Do one Study spot, one Practice decision, and one Analyze report this week."}</p>
        </article>`;
    }

    if (packProgressNode) {
      packProgressNode.innerHTML = model.packStats.length
        ? model.packStats
            .map((pack) => `<article class="dashboard-pack-row">
              <div>
                <strong>${escapeHtml(pack.label)}</strong>
                <span>${escapeHtml(pack.description)}</span>
              </div>
              <b>${pack.trained}/${pack.total}</b>
              <i><em style="width:${Math.max(pack.percent ? 8 : 0, pack.percent)}%"></em></i>
            </article>`)
            .join("")
        : "No drill-pack progress yet.";
    }

    if (weakestPackNode) {
      weakestPackNode.innerHTML = weakPack
        ? `<article class="progress-activity-item">
            <strong>${escapeHtml(weakPack.label)}</strong>
            <span>${weakPack.percent}% trained${weakPack.average === null ? "" : ` / average ${weakPack.average}/100`} / low-score decisions ${weakPack.low}</span>
          </article>
          <p>Focus here because this pack has the weakest mix of completion, recent score quality, and low-score events.</p>
          <a class="secondary-action" href="${practicePackUrl(weakPack.id)}">Open This Pack in Practice</a>`
        : "Practice one drill pack to unlock pack focus.";
    }

    latestShareText = shareText(model, weakPack, routinePercent);
    latestShareSvg = shareSvg(model, weakPack, routinePercent, categories);
    if (shareCardNode) {
      shareCardNode.innerHTML = latestShareSvg;
    }

    if (studyQueueListNode) {
      studyQueueListNode.innerHTML = model.studyQueue.length
        ? model.studyQueue
            .slice(0, 5)
            .map((item) => `<article class="progress-activity-item">
              <strong>${escapeHtml(item.title || "Queued study spot")}</strong>
              <span>${escapeHtml(item.packLabel || "Practice")} / ${escapeHtml(item.concept || "Study")} / ${escapeHtml(item.texture || "Pattern")}</span>
            </article>`)
            .join("")
        : "No Study spots queued for Practice yet.";
    }

    if (sessionFocusNode) {
      const lastPack = model.packStats.find((pack) => pack.id === model.practiceSession.lastPack) || model.packStats[0];
      const weakestPack = model.packStats
        .filter((pack) => pack.id !== "all" && pack.id !== "review-queue" && pack.total > 0)
        .sort((a, b) => a.percent - b.percent)[0];
      sessionFocusNode.innerHTML = `<article class="progress-activity-item">
        <strong>${escapeHtml(lastPack?.label || "All Spots")}</strong>
        <span>Last active pack / current streak ${model.practiceSession.currentStreak} / best streak ${model.practiceSession.bestStreak}</span>
      </article>
      <article class="progress-activity-item">
        <strong>${escapeHtml(weakestPack?.label || "Start Practice Mode")}</strong>
        <span>${weakestPack ? `Lowest pack completion: ${weakestPack.percent}%` : "Open Practice Mode to start a pack."}</span>
      </article>
      <a class="secondary-action" href="${practicePackUrl(lastPack?.id || "all")}">Open Practice Session</a>`;
    }

    if (continuityNode) {
      const loopItems = [
        ["Study", studyCount || masteredCount, "/study/"],
        ["Practice", model.scored.length, "/practice/"],
        ["Analyze", model.reports.length, "/analyze/"],
        ["Plan", model.progress.length, "/training-plan/"],
      ];
      continuityNode.innerHTML = loopItems
        .map(([name, count, link]) => `<a class="continuity-row" href="${link}">
          <span>${name}</span>
          <strong>${count ? "Active" : "Missing"}</strong>
          <i class="${count ? "is-on" : ""}"></i>
        </a>`)
        .join("");
    }

    const actionItems = [
      ["Study", studyCount, "/study/"],
      ["Practice", model.sourceCounts["practice-mode"] || 0, "/practice/"],
      ["Analyze", model.reports.length, "/analyze/"],
      ["Plan", model.progress.length, "/training-plan/"],
    ];
    if (actionBars) {
      const max = Math.max(1, ...actionItems.map((item) => item[1]));
      actionBars.innerHTML = actionItems
        .map(([name, count, link]) => `<a class="progress-action-row" href="${link}">
          <span>${name}</span>
          <b>${count}</b>
          <i><em style="width:${Math.max(8, Math.round((count / max) * 100))}%"></em></i>
        </a>`)
        .join("");
    }

    if (trendNode) {
      const recentScores = model.scored.slice(0, 12).reverse();
      trendNode.innerHTML = recentScores.length
        ? recentScores.map((event) => `<span title="${escapeHtml(eventLabel(event))}: ${Number(event.score)}/100" style="height:${Math.max(16, Math.min(100, Number(event.score)))}%"></span>`).join("")
        : "No scored decisions yet.";
    }

    leaksNode.innerHTML = model.leaks.length
      ? model.leaks.map(([name, count]) => `<span class="leak-pill">${escapeHtml(name)}<strong>${count}</strong></span>`).join("")
      : `<span class="leak-pill">No recurring leak yet<strong>0</strong></span>`;
    const topLeak = model.leaks[0]?.[0];
    const next = topLeak ? advice[topLeak] || { text: "Repeat the drill connected to your most common mistake label.", link: practicePackUrl("all") } : null;
    const recommendedPack = topLeak ? model.packStats.find((pack) => pack.id === leakToPack[topLeak]) : null;
    adviceNode.innerHTML = topLeak
      ? `<strong>${escapeHtml(topLeak)}</strong><p>${escapeHtml(next.text)}${recommendedPack ? ` Suggested pack: ${escapeHtml(recommendedPack.label)}.` : ""}</p><a class="secondary-action" href="${recommendedPack ? practicePackUrl(recommendedPack.id) : next.link}">Open Next Drill</a><a class="secondary-action" href="/drill-packs/">Open Practice Packs</a>`
      : `<strong>First training prescription</strong><p>Start with one Daily Workout decision, three Pot Odds drills, and one Analyze Lite note. After that, this panel will name the top leak and recommended drill pack.</p><a class="secondary-action" href="/tools/daily-hand/">Start Daily Workout</a><a class="secondary-action" href="/tools/pot-odds-trainer/">Do Pot Odds</a><a class="secondary-action" href="/analyze/">Build Analyze Note</a>`;

    if (nextActionsNode) {
      const nextPack = weakPack || recommendedPack || model.packStats.find((pack) => pack.id !== "all" && pack.id !== "review-queue");
      const studyAction = queuedStudyCount
        ? ["Study Queue", "Open the first queued Study spot in Practice.", "/practice/"]
        : masteredCount || studyCount
          ? ["Study", "Mark one more Study spot and send it to Practice.", "/study/"]
          : ["Study", "Open Study Mode and mark one spot studied.", "/study/"];
      const practiceAction = nextPack
        ? ["Practice", `Run ${nextPack.label} until you add one scored decision.`, practicePackUrl(nextPack.id)]
        : ["Practice", "Complete one scored Practice decision.", practicePackUrl("all")];
      const analyzeAction = model.reports.length
        ? ["Analyze", "Save one report for the next hand that felt unclear.", "/analyze/"]
        : ["Analyze", "Build one Analyze Lite report from a remembered hand.", "/analyze/"];
      nextActionsNode.innerHTML = [studyAction, practiceAction, analyzeAction]
        .map(([label, text, link], index) => `<a class="next-action-card" href="${link}">
          <span>0${index + 1} ${escapeHtml(label)}</span>
          <strong>${escapeHtml(text)}</strong>
        </a>`)
        .join("");
    }

    if (fiveDecisionsNode) {
      const targetPack = weakPack || recommendedPack || model.packStats.find((pack) => pack.id !== "all" && pack.id !== "review-queue" && pack.total > 0);
      const previews = packDecisionPreview(targetPack, model.queueIds);
      fiveDecisionsNode.innerHTML = targetPack
        ? `<div class="five-decision-head">
            <div><strong>${escapeHtml(targetPack.label)}</strong><span>Next short routine: five decisions, one note, then refresh Progress.</span></div>
            <a class="secondary-action" href="${practicePackUrl(targetPack.id)}">Start 5-Spot Pack</a>
          </div>
          <ol>
            ${previews.map((spot) => `<li><b>${escapeHtml(spot.street)}</b><span>${escapeHtml(spot.title)}</span><em>${escapeHtml(spot.leak)}</em></li>`).join("")}
          </ol>`
        : `<p>Start with one Daily Workout decision, three Pot Odds drills, and one Analyze Lite note. The first five-spot routine will appear here after your first scored action.</p>`;
    }

    if (recentNode) {
      recentNode.innerHTML = model.events.length
        ? model.events
            .slice(0, 8)
            .map((event) => `<article class="progress-activity-item"><strong>${escapeHtml(event.title || eventLabel(event))}</strong><span>${escapeHtml(eventLabel(event))} / ${escapeHtml(event.grade || "Activity")} ${Number.isFinite(Number(event.score)) ? `/ ${Number(event.score)}/100` : ""}</span></article>`)
            .join("")
        : "No local activity yet.";
    }

    if (reportsNode) {
      reportsNode.innerHTML = model.reports.length
        ? model.reports
            .slice(0, 6)
            .map((report) => `<article class="progress-activity-item"><strong>${escapeHtml(report.heroPosition || "Hero")} ${escapeHtml(report.heroHand || "hand")} - ${escapeHtml(report.leakTitle || report.leak || "review")}</strong><span>${escapeHtml(report.villainType || "Unknown")} / ${escapeHtml(report.potType || "Hand review")} / ${escapeHtml(report.packLabel || "Practice")}</span></article>`)
            .join("")
        : "No saved Analyze reports yet.";
    }
  }

  exportButton?.addEventListener("click", async () => {
    const model = readModel();
    const masteredCount = Object.keys(model.studyMastery).length;
    const weakPack = weakestPack(model);
    const summary = [
      "Smart Poker Lab Local Progress Summary",
      `Average Smart Score: ${model.average === null ? "No data" : `${model.average}/100`}`,
      `Scored decisions: ${model.scored.length}`,
      `7-day activity: ${model.weeklyEvents.length} actions across ${model.activeDays.size} active days`,
      `Study spots viewed: ${new Set(model.studyViews.map((view) => view.id)).size}`,
      `Study mastery: ${masteredCount}`,
      `Study practice queue: ${model.studyQueue.length}`,
      `Analyze reports saved: ${model.reports.length}`,
      `30-day plan progress: ${model.progress.length}/30`,
      `Current Practice streak: ${model.practiceSession.currentStreak}`,
      `Best Practice streak: ${model.practiceSession.bestStreak}`,
      `Review Queue spots: ${model.queueIds.size}`,
      `Weakest pack: ${weakPack ? weakPack.label : "No pack focus yet"}`,
      `Drill pack progress: ${model.packStats.map((pack) => `${pack.label} ${pack.trained}/${pack.total}`).join("; ")}`,
      `Top leaks: ${model.leaks.slice(0, 5).map(([name, count]) => `${name} (${count})`).join(", ") || "None yet"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      if (exportResult) exportResult.textContent = "Local summary copied to clipboard.";
    } catch {
      if (exportResult) exportResult.textContent = summary;
    }
    trackEvent("progress_summary_copied", { scored: model.scored.length, reports: model.reports.length });
  });

  refreshButton?.addEventListener("click", () => {
    renderDashboard();
    if (exportResult) exportResult.textContent = "Report refreshed from browser-local data.";
    trackEvent("progress_report_refreshed", {});
  });

  queueSpacedReviewButton?.addEventListener("click", () => {
    const count = queueDueSpacedReview(readModel());
    renderDashboard();
    if (exportResult) exportResult.textContent = `${count} spaced-review items are queued locally. Open Practice Mode and use Review Queue.`;
    trackEvent("spaced_review_queued", { count });
  });

  copyShareCardButton?.addEventListener("click", async () => {
    if (!latestShareText) renderDashboard();
    try {
      await navigator.clipboard.writeText(latestShareText);
      if (exportResult) exportResult.textContent = "Share card text copied to clipboard.";
    } catch {
      if (exportResult) exportResult.textContent = latestShareText;
    }
    trackEvent("progress_share_text_copied", {});
  });

  downloadShareCardButton?.addEventListener("click", () => {
    if (!latestShareSvg) renderDashboard();
    const blob = new Blob([latestShareSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `smart-poker-lab-report-${new Date().toISOString().slice(0, 10)}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    if (exportResult) exportResult.textContent = "Share card SVG downloaded locally.";
    trackEvent("progress_share_card_downloaded", {});
  });

  renderDashboard();
}

function initTrainingPlan() {
  const plan = readJsonScript("training-plan-data", []);
  const buttons = document.querySelectorAll(".training-check");
  const count = document.querySelector("#training-progress-count");
  const bar = document.querySelector("#training-progress-bar");
  const note = document.querySelector("#training-progress-note");
  const todayTitle = document.querySelector("#training-today-title");
  const todayCopy = document.querySelector("#training-today-copy");
  const todayPhase = document.querySelector("#training-today-phase");
  const todayTime = document.querySelector("#training-today-time");
  const todayConcept = document.querySelector("#training-today-concept");
  const startLink = document.querySelector("#training-start-link");
  const metricPlan = document.querySelector("#training-metric-plan");
  const metricPractice = document.querySelector("#training-metric-practice");
  const metricAnalyze = document.querySelector("#training-metric-analyze");
  const metricQueue = document.querySelector("#training-metric-queue");
  if (!buttons.length || !count || !bar) return;

  const progress = new Set(readStore("spl_training_progress", []));

  function practiceSession() {
    const session = readStore("spl_practice_session_v2", {});
    return {
      seenByPack: session.seenByPack && typeof session.seenByPack === "object" ? session.seenByPack : {},
      currentStreak: Number(session.currentStreak || 0),
      bestStreak: Number(session.bestStreak || 0),
      lastPack: session.lastPack || "all",
    };
  }

  function queueSize(events) {
    return new Set(
      events
        .filter((event) => event.source === "practice-mode" && Number(event.score) < 70)
        .map((event) => event.spotId || event.leak || event.title)
        .filter(Boolean),
    ).size;
  }

  function renderProgress() {
    const total = plan.length || buttons.length;
    const events = readStore("spl_training_events", []);
    const reports = readStore("spl_analyze_reports", []);
    const practiceEvents = events.filter((event) => event.source === "practice-mode" && Number.isFinite(Number(event.score)));
    const session = practiceSession();
    const nextDay = plan.find((day) => !progress.has(String(day.day))) || plan[plan.length - 1];

    buttons.forEach((button) => {
      const done = progress.has(button.dataset.day);
      const current = nextDay && Number(button.dataset.day) === Number(nextDay.day) && !done;
      button.textContent = done ? "Complete" : "Mark Complete";
      const card = button.closest(".training-day");
      card?.classList.toggle("is-done", done);
      card?.classList.toggle("is-current", current);
    });
    count.textContent = `${progress.size} / ${total} complete`;
    bar.style.width = `${Math.round((progress.size / total) * 100)}%`;
    if (metricPlan) metricPlan.textContent = `${progress.size} / ${total}`;
    if (metricPractice) metricPractice.textContent = String(practiceEvents.length);
    if (metricAnalyze) metricAnalyze.textContent = String(reports.length);
    if (metricQueue) metricQueue.textContent = String(queueSize(events));
    if (nextDay) {
      if (todayTitle) todayTitle.textContent = `Day ${nextDay.day}: ${nextDay.title}`;
      if (todayCopy) todayCopy.textContent = nextDay.objective || nextDay.phaseGoal || "Continue the next training step.";
      if (todayPhase) todayPhase.textContent = nextDay.phase || "Training";
      if (todayTime) todayTime.textContent = nextDay.timebox || "15-20 minutes";
      if (todayConcept) todayConcept.textContent = nextDay.concept || "Decision process";
      if (startLink) {
        startLink.textContent = progress.size >= total ? "Review Completed Plan" : "Start Next Day";
        startLink.setAttribute("href", `#day-${nextDay.day}`);
      }
    }
    if (note) {
      const nextText =
        progress.size >= total
          ? "Plan complete. Keep the weekly loop: Study, Practice, Analyze, then check Progress."
          : nextDay
            ? `Next: Day ${nextDay.day} (${nextDay.phase}). Practice streak: ${session.currentStreak}; best streak: ${session.bestStreak}.`
            : "Progress is saved only in this browser. It does not sync across devices.";
      note.textContent = nextText;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const day = button.dataset.day;
      const dayData = plan.find((item) => Number(item.day) === Number(day));
      if (progress.has(day)) progress.delete(day);
      else {
        progress.add(day);
        appendTrainingEvent({
          source: "training-plan",
          day: Number(day),
          title: dayData?.title || `Day ${day}`,
          phase: dayData?.phase || "Training Plan",
          pack: dayData?.packId || "review-queue",
          grade: "Day Complete",
        });
      }
      writeStore("spl_training_progress", [...progress]);
      renderProgress();
      trackEvent("training_day_toggled", {
        day: Number(day),
        complete: progress.has(day),
        completeCount: progress.size,
      });
    });
  });

  renderProgress();
}

function initHandSubmissionGuide() {
  const form = document.querySelector("#submit-hand-form");
  const output = document.querySelector("#submission-output");
  const savedList = document.querySelector("#submission-saved-list");
  const buildButton = document.querySelector("#build-submission-template");
  const saveButton = document.querySelector("#save-submission-draft");
  const copyButton = document.querySelector("#copy-submission-template");
  if (!form || !output || !buildButton) return;

  const fieldIds = [
    "game",
    "stack",
    "pot-type",
    "hero-position",
    "villain-position",
    "villain-type",
    "hero-hand",
    "board",
    "preflop",
    "flop",
    "turn",
    "river",
    "question",
  ];

  function valueFor(id) {
    return form.querySelector(`#submission-${id}`)?.value.trim() || "Not specified";
  }

  function buildDraft() {
    return [
      "Smart Poker Lab Hand Review Draft",
      "Scope: offline education-only review. Keep personal identifiers and play-service details out of the draft.",
      "",
      `Game: ${valueFor("game")}`,
      `Effective stack: ${valueFor("stack")}`,
      `Pot type: ${valueFor("pot-type")}`,
      `Hero: ${valueFor("hero-position")} with ${valueFor("hero-hand")}`,
      `Villain: ${valueFor("villain-position")} (${valueFor("villain-type")})`,
      `Board: ${valueFor("board")}`,
      "",
      "Action line:",
      `Preflop: ${valueFor("preflop")}`,
      `Flop: ${valueFor("flop")}`,
      `Turn: ${valueFor("turn")}`,
      `River: ${valueFor("river")}`,
      "",
      `Main question: ${valueFor("question")}`,
      "",
      "Review checklist:",
      "1. Which range has advantage on the key street?",
      "2. What worse hands call a value bet?",
      "3. What better hands raise or continue?",
      "4. What changes against calling station, nit, regular, or aggressive opponent?",
      "5. What is the next drill pack: preflop, board texture, thin value, river, math, or review queue?",
    ].join("\n");
  }

  function renderSavedDrafts() {
    if (!savedList) return;
    const drafts = readStore("spl_hand_submission_drafts", []);
    if (!drafts.length) {
      savedList.innerHTML = "<p>No local hand drafts saved yet.</p>";
      return;
    }
    savedList.innerHTML = `<h3>Local saved drafts</h3>${drafts
      .slice(0, 5)
      .map(
        (draft) => `<article>
          <strong>${escapeHtml(draft.title || "Hand review draft")}</strong>
          <span>${escapeHtml(new Date(draft.ts).toLocaleString())}</span>
          <p>${escapeHtml((draft.text || "").split("\n").slice(3, 8).join(" / "))}</p>
        </article>`,
      )
      .join("")}`;
  }

  function previewDraft() {
    const draft = buildDraft();
    output.textContent = draft;
    return draft;
  }

  buildButton.addEventListener("click", () => {
    previewDraft();
    appendTrainingEvent({ source: "hand-submission-guide", title: "Built anonymous hand draft", grade: "Review Prep" });
    trackEvent("hand_submission_draft_built", { path: window.location.pathname });
  });

  saveButton?.addEventListener("click", () => {
    const draft = previewDraft();
    appendCappedStore(
      "spl_hand_submission_drafts",
      {
        title: `${valueFor("hero-position")} ${valueFor("hero-hand")} vs ${valueFor("villain-position")}`,
        text: draft,
      },
      20,
    );
    output.textContent = `${draft}\n\nSaved locally in this browser. Nothing was uploaded.`;
    renderSavedDrafts();
    appendTrainingEvent({ source: "hand-submission-guide", title: "Saved anonymous hand draft", grade: "Local Save" });
    trackEvent("hand_submission_draft_saved", { path: window.location.pathname });
  });

  copyButton?.addEventListener("click", async () => {
    const draft = previewDraft();
    try {
      await navigator.clipboard.writeText(draft);
      output.textContent = `${draft}\n\nCopied to clipboard. Review privacy details before sharing anywhere.`;
    } catch {
      output.textContent = draft;
    }
    trackEvent("hand_submission_draft_copied", { path: window.location.pathname });
  });

  renderSavedDrafts();
}

function initWeeklyChallengePage() {
  const actions = readJsonScript("weekly-challenge-data", []);
  const cards = document.querySelectorAll("[data-weekly-card]");
  const buttons = document.querySelectorAll("[data-weekly-action]");
  const progressNode = document.querySelector("#weekly-challenge-progress");
  const resultNode = document.querySelector("#weekly-challenge-result");
  const copyButton = document.querySelector("#copy-weekly-challenge");
  const resetButton = document.querySelector("#reset-weekly-challenge");
  if (!actions.length || !cards.length || !progressNode || !resultNode) return;

  function weekKey() {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const dayOffset = Math.floor((date - firstDay) / 86400000);
    const week = Math.ceil((dayOffset + firstDay.getDay() + 1) / 7);
    return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
  }

  function readState() {
    const state = readStore("spl_weekly_challenge_v1", {});
    const key = weekKey();
    return state[key] || {};
  }

  function writeState(current) {
    const state = readStore("spl_weekly_challenge_v1", {});
    state[weekKey()] = current;
    writeStore("spl_weekly_challenge_v1", state);
  }

  function summaryText(current) {
    const done = actions.filter((action) => current[action.id]);
    const next = actions.find((action) => !current[action.id]);
    return [
      "Smart Poker Lab weekly training loop",
      `Completed: ${done.length}/7`,
      done.length ? `Done: ${done.map((action) => action.title).join(", ")}` : "Done: none yet",
      next ? `Next: ${next.title}` : "Next: repeat the weakest drill pack from Progress.",
      "Scope: education-only offline study routine.",
    ].join("\n");
  }

  function render() {
    const current = readState();
    const doneCount = actions.filter((action) => current[action.id]).length;
    cards.forEach((card) => {
      const id = card.dataset.weeklyCard;
      card.classList.toggle("is-done", Boolean(current[id]));
    });
    buttons.forEach((button) => {
      const done = Boolean(current[button.dataset.weeklyAction]);
      button.textContent = done ? "Done" : "Mark Done";
    });
    progressNode.textContent = `${doneCount} / ${actions.length} complete`;
    const next = actions.find((action) => !current[action.id]);
    resultNode.textContent =
      doneCount >= actions.length
        ? "Weekly loop complete in this browser. Next: repeat the weakest pack from Progress."
        : `Next action: ${next?.title || "Open Progress"}. This state is saved only in this browser.`;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.weeklyAction;
      const current = readState();
      current[id] = !current[id];
      writeState(current);
      appendTrainingEvent({
        source: "weekly-challenge",
        title: actions.find((action) => action.id === id)?.title || "Weekly challenge action",
        grade: current[id] ? "Weekly Action Complete" : "Weekly Action Cleared",
      });
      render();
      trackEvent("weekly_challenge_toggled", { action: id, complete: current[id] });
    });
  });

  copyButton?.addEventListener("click", async () => {
    const text = summaryText(readState());
    try {
      await navigator.clipboard.writeText(text);
      resultNode.textContent = "Weekly study summary copied to clipboard.";
    } catch {
      resultNode.textContent = text;
    }
    trackEvent("weekly_challenge_copied", { path: window.location.pathname });
  });

  resetButton?.addEventListener("click", () => {
    writeState({});
    render();
    trackEvent("weekly_challenge_reset", { path: window.location.pathname });
  });

  render();
}

function initWeeklyTrainingPath() {
  const paths = document.querySelectorAll("#weekly-training-path");
  if (!paths.length) return;
  const events = readStore("spl_training_events", []);
  const dailyAnswers = readStore("spl_daily_hand_answers", []);
  const progress = readStore("spl_training_progress", []);
  const reports = readStore("spl_analyze_reports", []);
  const studyViews = readStore("spl_study_views", []);
  const studyMastery = readStore("spl_study_mastery", {});
  const scored = events.filter((event) => Number.isFinite(Number(event.score)));
  const lowScores = scored.filter((event) => Number(event.score) < 70);
  const done = {
    study: studyViews.length > 0 || Object.keys(studyMastery || {}).length > 0 || events.some((event) => event.source === "study-mode"),
    daily: dailyAnswers.length > 0 || events.some((event) => event.source === "daily-hand"),
    practice: events.some((event) => event.source === "practice-mode"),
    range: events.some((event) => event.source === "range-trainer"),
    math: events.some((event) => event.source === "pot-odds-trainer"),
    analyze: reports.length > 0 || events.some((event) => event.source === "analyze-lite"),
    progress: progress.length > 0 || lowScores.length > 0 || scored.length >= 3,
  };
  const order = ["study", "daily", "practice", "range", "math", "analyze", "progress"];
  const completeCount = order.filter((key) => done[key]).length;
  const current = order.find((key) => !done[key]) || "progress";
  paths.forEach((path) => {
    path.querySelectorAll(".weekly-path-step").forEach((step) => {
      const key = step.dataset.weeklyStep;
      const isDone = Boolean(done[key]);
      step.classList.toggle("is-done", isDone);
      step.classList.toggle("is-current", key === current && !isDone);
      const status = step.querySelector("small");
      if (status) status.textContent = isDone ? "Completed locally" : key === current ? "Next action" : "Queued";
    });
  });
  document.querySelectorAll("#weekly-path-summary").forEach((summary) => {
    summary.textContent =
      completeCount === 0
        ? "Start with one Study spot or the Daily Workout. This weekly path lights up only in this browser."
        : completeCount >= order.length
          ? "Full weekly loop complete in this browser. Next: repeat the weakest drill pack from Progress."
          : `${completeCount}/7 weekly actions are active in this browser. Next: ${current.replace("-", " ")}.`;
  });
}

function initWaitlist() {
  const buttons = document.querySelectorAll(".waitlist-button");
  const result = document.querySelector("#waitlist-result");
  if (!buttons.length || !result) return;
  const interests = new Set(readStore("spl_waitlist_interest", []));

  buttons.forEach((button) => {
    if (interests.has(button.dataset.interest)) button.textContent = "Interest Saved";
    button.addEventListener("click", () => {
      interests.add(button.dataset.interest);
      writeStore("spl_waitlist_interest", [...interests]);
      button.textContent = "Interest Saved";
      result.textContent = "Your interest has been saved in this browser. This does not create an account or upload an email before the real email service is connected.";
      trackEvent("waitlist_interest_saved", { interest: button.dataset.interest });
    });
  });
}

function initPrintButtons() {
  document.querySelectorAll(".print-button").forEach((button) => {
    button.addEventListener("click", () => {
      trackEvent("study_sheet_print_clicked", { path: window.location.pathname });
      window.print();
    });
  });
}

initGlobalSearch();
initOnboarding();
initGuidedTour();
initPwaInstall();
initRevealAnswers();
initDailyHand();
initPreflopRange();
initPotOddsTrainer();
initPlayerTypeTest();
initRangeTrainer();
initStudyMode();
initPracticeMode();
initHandReviewBuilder();
initAnalyzeLite();
initLeakDashboard();
initProgressBackup();
initTrainingPlan();
initHandSubmissionGuide();
initWeeklyChallengePage();
initWeeklyTrainingPath();
initWaitlist();
initPrintButtons();
