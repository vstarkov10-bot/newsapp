const { TOPICS } = require("../src/topics");
const { getSuggestions } = require("../src/suggestCache");
const { parseListParam } = require("../src/query");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const topicIds = parseListParam(req.query.topics);
  const selected = topicIds.length > 0 ? TOPICS.filter((t) => topicIds.includes(t.id)) : TOPICS;
  const topicLabels = selected.map((t) => t.label);

  const result = await getSuggestions(topicLabels);

  res.status(200).json({
    suggestions: result.suggestions,
    error: result.error,
  });
};
