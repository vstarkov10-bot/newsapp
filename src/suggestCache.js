const { suggestNews } = require("./suggest");

const TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // topicKey -> { result, expiresAt }

function keyFor(topicLabels) {
  return [...topicLabels].sort().join(",");
}

async function getSuggestions(topicLabels) {
  const key = keyFor(topicLabels);
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.result;
  }

  const result = await suggestNews(topicLabels);
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
  return result;
}

module.exports = { getSuggestions };
