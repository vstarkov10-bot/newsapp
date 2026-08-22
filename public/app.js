const state = {
  topic: "all",
  source: "all",
  q: "",
};

let searchDebounce = null;

const el = {
  topicFilters: document.getElementById("topicFilters"),
  sourceFilter: document.getElementById("sourceFilter"),
  searchInput: document.getElementById("searchInput"),
  refreshBtn: document.getElementById("refreshBtn"),
  lastUpdated: document.getElementById("lastUpdated"),
  feedErrors: document.getElementById("feedErrors"),
  statusLine: document.getElementById("statusLine"),
  articleGrid: document.getElementById("articleGrid"),
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

  el.topicFilters.innerHTML = "";
  const allBtn = makePill("All", "all", true);
  el.topicFilters.appendChild(allBtn);
  for (const topic of meta.topics) {
    el.topicFilters.appendChild(makePill(topic.label, topic.id, false));
  }

  for (const source of meta.sources) {
    const opt = document.createElement("option");
    opt.value = source;
    opt.textContent = source;
    el.sourceFilter.appendChild(opt);
  }
}

function makePill(label, value, active) {
  const btn = document.createElement("button");
  btn.className = "pill" + (active ? " active" : "");
  btn.textContent = label;
  btn.dataset.value = value;
  btn.addEventListener("click", () => {
    state.topic = value;
    document
      .querySelectorAll("#topicFilters .pill")
      .forEach((p) => p.classList.toggle("active", p.dataset.value === value));
    loadArticles();
  });
  return btn;
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

  card.appendChild(source);
  card.appendChild(h2);
  card.appendChild(summary);
  card.appendChild(footer);

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

async function loadArticles() {
  el.statusLine.hidden = false;
  el.statusLine.textContent = "Loading articles…";

  const params = new URLSearchParams();
  if (state.topic !== "all") params.set("topic", state.topic);
  if (state.source !== "all") params.set("source", state.source);
  if (state.q) params.set("q", state.q);

  try {
    const res = await fetch(`/api/articles?${params.toString()}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();

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

async function manualRefresh() {
  el.refreshBtn.disabled = true;
  el.refreshBtn.textContent = "Refreshing…";
  try {
    await fetch("/api/refresh", { method: "POST" });
  } catch (err) {
    // Ignore; loadArticles will surface any lingering issue.
  }
  await loadArticles();
  el.refreshBtn.disabled = false;
  el.refreshBtn.textContent = "Refresh";
}

el.sourceFilter.addEventListener("change", (e) => {
  state.source = e.target.value;
  loadArticles();
});

el.searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  const value = e.target.value;
  searchDebounce = setTimeout(() => {
    state.q = value;
    loadArticles();
  }, 300);
});

el.refreshBtn.addEventListener("click", manualRefresh);

(async function init() {
  await loadMeta();
  await loadArticles();
  setInterval(loadArticles, 5 * 60 * 1000);
})();
