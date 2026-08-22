const Parser = require("rss-parser");
const crypto = require("crypto");
const { FEEDS } = require("./feeds");
const { detectTopics } = require("./topics");

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FETCH_TIMEOUT_MS = 10 * 1000;
const MAX_ARTICLES_PER_FEED = 30;

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; NewsAggregatorBot/1.0; +https://example.com)",
  },
});

let cache = {
  articles: [],
  lastUpdated: null,
  feedErrors: [], // [{ source, name, url, error }]
  isRefreshing: false,
};

function articleId(link, title) {
  return crypto
    .createHash("sha1")
    .update(link || title || "")
    .digest("hex");
}

async function fetchOneFeed(feed) {
  const parsed = await parser.parseURL(feed.url);
  const items = (parsed.items || []).slice(0, MAX_ARTICLES_PER_FEED);

  return items.map((item) => {
    const title = item.title || "(untitled)";
    const summary = (item.contentSnippet || item.content || "")
      .toString()
      .trim()
      .slice(0, 400);
    const publishedAt = item.isoDate || item.pubDate || null;

    const topics = new Set(feed.topics);
    for (const t of detectTopics(`${title} ${summary}`)) topics.add(t);

    return {
      id: articleId(item.link, title),
      title,
      summary,
      link: item.link,
      source: feed.source,
      feedName: feed.name,
      publishedAt,
      topics: Array.from(topics),
    };
  });
}

async function refresh() {
  if (cache.isRefreshing) return cache;
  cache.isRefreshing = true;

  const results = await Promise.allSettled(FEEDS.map(fetchOneFeed));

  const articles = [];
  const feedErrors = [];

  results.forEach((result, i) => {
    const feed = FEEDS[i];
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      feedErrors.push({
        source: feed.source,
        name: feed.name,
        url: feed.url,
        error: result.reason?.message || String(result.reason),
      });
    }
  });

  // De-duplicate by id (same story sometimes appears in multiple feeds
  // from the same publisher), keep the newest.
  const byId = new Map();
  for (const a of articles) {
    const existing = byId.get(a.id);
    if (!existing) {
      byId.set(a.id, a);
    } else {
      const merged = new Set([...existing.topics, ...a.topics]);
      existing.topics = Array.from(merged);
    }
  }

  const deduped = Array.from(byId.values()).sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return db - da;
  });

  cache = {
    articles: deduped,
    lastUpdated: new Date().toISOString(),
    feedErrors,
    isRefreshing: false,
  };

  return cache;
}

function getCache() {
  return cache;
}

function startAutoRefresh() {
  refresh().catch((err) => console.error("Initial feed refresh failed:", err));
  setInterval(() => {
    refresh().catch((err) => console.error("Feed refresh failed:", err));
  }, REFRESH_INTERVAL_MS);
}

module.exports = { refresh, getCache, startAutoRefresh };
