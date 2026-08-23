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
};

let refreshPromise = null;

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

function refresh() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh() {
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
  };

  return cache;
}

function getCache() {
  return cache;
}

// topics/sources: arrays: an article matches if its topics intersect the
// selected topics AND its source is one of the selected sources. An empty
// array for either means "no filter on that dimension".
function filterArticles(articles, { topics = [], sources = [], q = "" } = {}) {
  let result = articles;

  if (topics.length > 0) {
    const topicSet = new Set(topics);
    result = result.filter((a) => a.topics.some((t) => topicSet.has(t)));
  }

  if (sources.length > 0) {
    const sourceSet = new Set(sources);
    result = result.filter((a) => sourceSet.has(a.source));
  }

  if (q) {
    const needle = q.toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.summary.toLowerCase().includes(needle)
    );
  }

  return result;
}

// For long-running hosts (e.g. the local Express server): keep the cache
// warm on a timer instead of making requests wait on a refetch.
function startAutoRefresh() {
  refresh().catch((err) => console.error("Initial feed refresh failed:", err));
  setInterval(() => {
    refresh().catch((err) => console.error("Feed refresh failed:", err));
  }, REFRESH_INTERVAL_MS);
}

// For serverless hosts (e.g. Vercel functions): there's no background
// process to keep a timer alive, so refetch inline whenever the cache is
// stale or has never been populated.
async function getFreshCache() {
  const isStale =
    !cache.lastUpdated ||
    Date.now() - new Date(cache.lastUpdated).getTime() > REFRESH_INTERVAL_MS;

  if (isStale) {
    try {
      await refresh();
    } catch (err) {
      console.error("On-demand feed refresh failed:", err);
    }
  }

  return cache;
}

module.exports = { refresh, getCache, getFreshCache, filterArticles, startAutoRefresh };
