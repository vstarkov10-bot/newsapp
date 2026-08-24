const state = {
  topics: new Set(),
  sources: new Set(),
  q: "",
  lastArticles: [],
};

let searchDebounce = null;
let topicsMeta = [];

const el = {
  topicFilters: document.getElementById("topicFilters"),
  sourceFilters: document.getElementById("sourceFilters"),
  searchInput: document.getElementById("searchInput"),
  refreshBtn: document.getElementById("refreshBtn"),
  lastUpdated: document.getElementById("lastUpdated"),
  feedErrors: document.getElementById("feedErrors"),
  statusLine: document.getElementById("statusLine"),
  articleGrid: document.getElementById("articleGrid"),
  headlinesSection: document.getElementById("headlines"),
  headlinesList: document.getElementById("headlinesList"),
  headlinesNote: document.getElementById("headlinesNote"),
  sendToClaudeBtn: document.getElementById("sendToClaudeBtn"),
};

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

async function loadMeta() {
  const res = await fetch("/api/meta");
  const meta = await res.json();
  topicsMeta = meta.topics;

  el.topicFilters.innerHTML = "";
  addMultiPill(el.topicFilters, "All", "all", state.topics);
  for (const topic of meta.topics) {
    addMultiPill(el.topicFilters, topic.label, topic.id, state.topics);
  }
  syncPillActiveStates(el.topicFilters, state.topics);

  el.sourceFilters.innerHTML = "";
  addMultiPill(el.sourceFilters, "All", "all", state.sources);
  for (const source of meta.sources) {
    addMultiPill(el.sourceFilters, source, source, state.sources);
  }
  syncPillActiveStates(el.sourceFilters, state.sources);
}

// "All" selects the empty set (no filter on that dimension); picking a
// specific value toggles it in/out of that dimension's selection.
function addMultiPill(container, label, value, stateSet) {
  const btn = document.createElement("button");
  btn.className = "pill";
  btn.textContent = label;
  btn.dataset.value = value;
  btn.addEventListener("click", () => {
    if (value === "all") {
      stateSet.clear();
    } else if (stateSet.has(value)) {
      stateSet.delete(value);
    } else {
      stateSet.add(value);
    }
    syncPillActiveStates(container, stateSet);
    loadArticles();
    loadTopHeadlines();
  });
  container.appendChild(btn);
}

function syncPillActiveStates(container, stateSet) {
  container.querySelectorAll(".pill").forEach((btn) => {
    const value = btn.dataset.value;
    const active = value === "all" ? stateSet.size === 0 : stateSet.has(value);
    btn.classList.toggle("active", active);
  });
}

function renderFeedErrors(feedErrors) {
  if (!feedErrors || feedErrors.length === 0) {
    el.feedErrors.hidden = true;
    return;
  }
  el.feedErrors.hidden = false;
  const names = feedErrors.map((e) => `${e.source} — ${e.name}`).join(", ");
  el.feedErrors.textContent = `Some feeds couldn't be reached right now: ${names}. Showing everything else.`;
}

function groupBySource(articles) {
  const groups = new Map();
  for (const a of articles) {
    if (!groups.has(a.source)) groups.set(a.source, []);
    groups.get(a.source).push(a);
  }
  return groups;
}

function buildSearchLink(query, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Search web";
  return link;
}

function buildCard(a) {
  const card = document.createElement("article");
  card.className = "card";

  const source = document.createElement("div");
  source.className = "card-source";
  source.textContent = a.feedName;

  const h2 = document.createElement("h2");
  const link = document.createElement("a");
  link.href = a.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = a.title;
  h2.appendChild(link);

  const summary = document.createElement("p");
  summary.className = "card-summary";
  summary.textContent = a.summary;

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const tags = document.createElement("div");
  tags.className = "tags";
  for (const t of a.topics) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t;
    tags.appendChild(tag);
  }

  const time = document.createElement("span");
  time.textContent = timeAgo(a.publishedAt);

  footer.appendChild(tags);
  footer.appendChild(time);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.appendChild(buildSearchLink(a.title, "search-link"));

  card.appendChild(source);
  card.appendChild(h2);
  card.appendChild(summary);
  card.appendChild(footer);
  card.appendChild(actions);

  return card;
}

function renderArticles(data) {
  el.articleGrid.innerHTML = "";

  if (data.articles.length === 0) {
    el.statusLine.textContent = "No articles match these filters.";
    el.statusLine.hidden = false;
    return;
  }
  el.statusLine.hidden = true;

  const groups = groupBySource(data.articles);

  for (const [sourceName, articles] of groups) {
    const section = document.createElement("section");
    section.className = "source-group";

    const heading = document.createElement("h2");
    heading.className = "source-heading";
    heading.textContent = sourceName;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "grid";
    for (const a of articles) {
      grid.appendChild(buildCard(a));
    }
    section.appendChild(grid);

    el.articleGrid.appendChild(section);
  }
}

function buildFilterParams() {
  const params = new URLSearchParams();
  if (state.topics.size > 0) params.set("topics", [...state.topics].join(","));
  if (state.sources.size > 0) params.set("sources", [...state.sources].join(","));
  if (state.q) params.set("q", state.q);
  return params;
}

async function loadArticles() {
  el.statusLine.hidden = false;
  el.statusLine.textContent = "Loading articles…";

  const params = buildFilterParams();

  try {
    const res = await fetch(`/api/articles?${params.toString()}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();

    state.lastArticles = data.articles;

    renderFeedErrors(data.feedErrors);
    renderArticles(data);

    el.lastUpdated.textContent = data.lastUpdated
      ? `Updated ${timeAgo(data.lastUpdated)}`
      : "Not yet updated";
  } catch (err) {
    el.statusLine.hidden = false;
    el.statusLine.textContent = `Couldn't load articles: ${err.message}`;
  }
}

async function loadTopHeadlines() {
  el.headlinesSection.hidden = false;

  const params = buildFilterParams();

  try {
    const res = await fetch(`/api/headlines?${params.toString()}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();

    el.headlinesList.innerHTML = "";

    if (data.headlines.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No headlines match these filters.";
      el.headlinesList.appendChild(li);
      el.headlinesNote.textContent = "";
      return;
    }

    for (const h of data.headlines) {
      const li = document.createElement("li");

      const link = document.createElement("a");
      link.href = h.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = h.title;

      const source = document.createElement("span");
      source.className = "headline-source";
      source.textContent = ` — ${h.source}`;

      li.appendChild(link);
      li.appendChild(source);
      li.appendChild(buildSearchLink(h.title, "search-link search-link-inline"));
      el.headlinesList.appendChild(li);
    }

    const updated = data.lastUpdated ? ` · ${timeAgo(data.lastUpdated)}` : "";
    el.headlinesNote.textContent = `From ${data.articleCount} matching articles${updated}`;
  } catch (err) {
    el.headlinesList.innerHTML = "";
    el.headlinesNote.textContent = `Couldn't load headlines: ${err.message}`;
  }
}

function buildClaudeDigest(articles, topics) {
  const header =
    "Summarize these news headlines: first a roughly 250-word overall " +
    "summary, then a short paragraph summarizing each topic section below.\n\n";

  const byTopic = new Map(topics.map((t) => [t.id, []]));
  for (const a of articles) {
    for (const t of a.topics) {
      if (byTopic.has(t)) byTopic.get(t).push(a);
    }
  }

  const sections = [];
  for (const topic of topics) {
    const items = byTopic.get(topic.id);
    if (!items || items.length === 0) continue;
    const lines = items.map((a) => `- [${a.source}] ${a.title} — ${a.summary}`);
    sections.push(`## ${topic.label}\n${lines.join("\n")}`);
  }

  return header + sections.join("\n\n");
}

async function sendToClaude() {
  const articles = state.lastArticles;
  if (!articles || articles.length === 0) {
    flashButton(el.sendToClaudeBtn, "No articles loaded");
    return;
  }

  const digest = buildClaudeDigest(articles, topicsMeta);

  if (navigator.share) {
    try {
      await navigator.share({ text: digest, title: "Daily Briefing" });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // user cancelled the share sheet
      // fall through to clipboard on any other share failure
    }
  }

  try {
    await navigator.clipboard.writeText(digest);
    flashButton(el.sendToClaudeBtn, "Copied — paste into Claude");
  } catch (err) {
    flashButton(el.sendToClaudeBtn, "Couldn't copy");
  }
}

function flashButton(btn, message) {
  const original = btn.textContent;
  btn.textContent = message;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 2000);
}

async function manualRefresh() {
  el.refreshBtn.disabled = true;
  el.refreshBtn.textContent = "Refreshing…";
  try {
    await fetch("/api/refresh", { method: "POST" });
  } catch (err) {
    // Ignore; loadArticles will surface any lingering issue.
  }
  await Promise.all([loadArticles(), loadTopHeadlines()]);
  el.refreshBtn.disabled = false;
  el.refreshBtn.textContent = "Refresh";
}

el.searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  const value = e.target.value;
  searchDebounce = setTimeout(() => {
    state.q = value;
    loadArticles();
    loadTopHeadlines();
  }, 300);
});

el.refreshBtn.addEventListener("click", manualRefresh);
el.sendToClaudeBtn.addEventListener("click", sendToClaude);

(async function init() {
  await loadMeta();
  await Promise.all([loadArticles(), loadTopHeadlines()]);
  setInterval(() => {
    loadArticles();
    loadTopHeadlines();
  }, 5 * 60 * 1000);
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
