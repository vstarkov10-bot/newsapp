const { getFreshCache, filterArticles, pickTopHeadlines } = require("../src/store");
const { parseListParam } = require("../src/query");

module.exports = async (req, res) => {
  const topics = parseListParam(req.query.topics);
  const sources = parseListParam(req.query.sources);
  const q = req.query.q;

  const cache = await getFreshCache();
  const articles = filterArticles(cache.articles, { topics, sources, q });
  const headlines = pickTopHeadlines(articles, 5);

  res.status(200).json({
    headlines,
    articleCount: articles.length,
    lastUpdated: cache.lastUpdated,
  });
};
