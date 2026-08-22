const { refresh } = require("../src/store");

const MIN_MANUAL_REFRESH_INTERVAL_MS = 60 * 1000;
let lastManualRefresh = 0;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const now = Date.now();
  if (now - lastManualRefresh < MIN_MANUAL_REFRESH_INTERVAL_MS) {
    res.status(429).json({ error: "Refreshing too frequently. Try again shortly." });
    return;
  }
  lastManualRefresh = now;

  try {
    const cache = await refresh();
    res.status(200).json({
      lastUpdated: cache.lastUpdated,
      feedErrors: cache.feedErrors,
      total: cache.articles.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Refresh failed", detail: err.message });
  }
};
