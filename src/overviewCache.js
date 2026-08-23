const { generateOverview } = require("./overview");

const cache = new Map(); // filterKey -> { summary, error, articlesLastUpdated }

function keyFor(topics, sources, q) {
  return JSON.stringify([[...topics].sort(), [...sources].sort(), q || ""]);
}

// Regenerates only when this filter combination's cached entry is stale
// relative to the article cache's own lastUpdated timestamp, so repeated
// polling/requests for the same filters reuse one generation.
async function getOverview(articles, articlesLastUpdated, topics, sources, q) {
  const key = keyFor(topics, sources, q);
  const existing = cache.get(key);
  if (existing && existing.articlesLastUpdated === articlesLastUpdated) {
    return existing;
  }

  const result = await generateOverview(articles);
  const entry = { ...result, articlesLastUpdated };
  cache.set(key, entry);
  return entry;
}

module.exports = { getOverview };
