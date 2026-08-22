const { TOPICS } = require("../src/topics");
const { FEEDS } = require("../src/feeds");

module.exports = (req, res) => {
  const sources = Array.from(new Set(FEEDS.map((f) => f.source)));
  res.status(200).json({ topics: TOPICS, sources });
};
