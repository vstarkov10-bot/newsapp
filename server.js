const path = require("path");
const express = require("express");
const { TOPICS } = require("./src/topics");
const { FEEDS } = require("./src/feeds");
const { refresh, getCache, filterArticles, startAutoRefresh } = require("./src/store");
const { getOverview } = require("./src/overviewCache");
const { parseListParam } = require("./src/query");

const PORT = process.env.PORT || 3000;
const MIN_MANUAL_REFRESH_INTERVAL_MS = 60 * 1000;

let lastManualRefresh = 0;

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/meta", (req, res) => {
  const sources = Array.from(new Set(FEEDS.map((f) => f.source)));
  res.json({ topics: TOPICS, sources });
});

app.get("/api/articles", (req, res) => {
  const topics = parseListParam(req.query.topics);
  const sources = parseListParam(req.query.sources);
  const q = req.query.q;

  const cache = getCache();
  const articles = filterArticles(cache.articles, { topics, sources, q });

  res.json({
    articles,
    lastUpdated: cache.lastUpdated,
    feedErrors: cache.feedErrors,
    total: articles.length,
  });
});

app.get("/api/overview", async (req, res) => {
  const topics = parseListParam(req.query.topics);
  const sources = parseListParam(req.query.sources);
  const q = req.query.q;

  const cache = getCache();
  const articles = filterArticles(cache.articles, { topics, sources, q });
  const overview = await getOverview(articles, cache.lastUpdated, topics, sources, q);

  res.json({
    summary: overview.summary,
    error: overview.error,
    articleCount: articles.length,
    lastUpdated: cache.lastUpdated,
  });
});

app.post("/api/refresh", async (req, res) => {
  const now = Date.now();
  if (now - lastManualRefresh < MIN_MANUAL_REFRESH_INTERVAL_MS) {
    return res.status(429).json({ error: "Refreshing too frequently. Try again shortly." });
  }
  lastManualRefresh = now;

  try {
    const cache = await refresh();
    res.json({
      lastUpdated: cache.lastUpdated,
      feedErrors: cache.feedErrors,
      total: cache.articles.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Refresh failed", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`News aggregator running at http://localhost:${PORT}`);
  startAutoRefresh();
});
