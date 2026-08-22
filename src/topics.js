// Topic definitions used both for the UI (label/order) and for keyword-based
// tagging of articles, so a story can surface under a topic even when it
// came from a feed whose own primary category is different (e.g. an AI
// regulation story that ran in a "Politics" feed).

const TOPICS = [
  { id: "economy", label: "Economy" },
  { id: "ai", label: "AI" },
  { id: "tech", label: "Tech" },
  { id: "politics", label: "Politics" },
];

const KEYWORDS = {
  ai: [
    "artificial intelligence",
    "generative ai",
    "machine learning",
    "large language model",
    "chatgpt",
    "openai",
    "anthropic",
    "deepmind",
    "nvidia",
    " llm",
    "gpt-",
    " ai ",
    "ai-",
  ],
  tech: [
    "technology",
    "software",
    "hardware",
    "startup",
    "silicon valley",
    "semiconductor",
    "microchip",
    " chip",
    "cybersecurity",
    "cloud computing",
    "app store",
    "apple",
    "google",
    "microsoft",
    "amazon",
    "meta platforms",
    "social media",
  ],
  economy: [
    "economy",
    "economic",
    "inflation",
    "gdp",
    "federal reserve",
    " fed ",
    "interest rate",
    "jobs report",
    "unemployment",
    "recession",
    "trade deficit",
    "tariff",
    "stimulus",
    "treasury",
    "central bank",
    "stock market",
    "consumer prices",
  ],
  politics: [
    "election",
    "congress",
    "senate",
    "white house",
    "president",
    "lawmakers",
    "legislation",
    "campaign",
    " vote ",
    "voters",
    "geopolitics",
    "administration",
    "governor",
    "parliament",
    "policy",
  ],
};

function detectTopics(text) {
  const lower = ` ${text.toLowerCase()} `;
  const found = new Set();
  for (const [topic, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) {
      found.add(topic);
    }
  }
  return found;
}

module.exports = { TOPICS, detectTopics };
