const { getFreshCache } = require("../src/store");

module.exports = async (req, res) => {
  const { topic, source, q } = req.query;
  const cache = await getFreshCache();

  let articles = cache.articles;

  if (topic && topic !== "all") {
    articles = articles.filter((a) => a.topics.includes(topic));
  }

  if (source && source !== "all") {
    articles = articles.filter((a) => a.source === source);
  }

  if (q) {
    const needle = String(q).toLowerCase();
    articles = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.summary.toLowerCase().includes(needle)
    );
  }

  res.status(200).json({
    articles,
    lastUpdated: cache.lastUpdated,
    feedErrors: cache.feedErrors,
    total: articles.length,
  });
};
