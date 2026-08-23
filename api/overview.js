const { getFreshCache, filterArticles } = require("../src/store");
const { getOverview } = require("../src/overviewCache");
const { parseListParam } = require("../src/query");

module.exports = async (req, res) => {
  const topics = parseListParam(req.query.topics);
  const sources = parseListParam(req.query.sources);
  const q = req.query.q;

  const cache = await getFreshCache();
  const articles = filterArticles(cache.articles, { topics, sources, q });
  const overview = await getOverview(articles, cache.lastUpdated, topics, sources, q);

  res.status(200).json({
    summary: overview.summary,
    error: overview.error,
    articleCount: articles.length,
    lastUpdated: cache.lastUpdated,
  });
};
