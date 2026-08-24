const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-5";
const MAX_TOKENS = 2000;
const MAX_SEARCH_USES = 6;
const SUGGESTION_COUNT = 8;

let client = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic();
}

function buildSystemPrompt(topicLabels) {
  return (
    `You are a news curator. Search the web for the most important and ` +
    `relevant news stories from roughly the last 24-48 hours related to: ` +
    `${topicLabels.join(", ")}. Consider any reputable news source you find ` +
    `via search — do not limit yourself to any fixed list of publishers. ` +
    `Prioritize stories by genuine importance and relevance, not recency alone.\n\n` +
    `Respond with ONLY a JSON array (no markdown code fences, no commentary ` +
    `before or after it) of the ${SUGGESTION_COUNT} best stories. Each array ` +
    `element must be an object with exactly these fields: "title" (string), ` +
    `"source" (the publication's name, string), "url" (string, the direct ` +
    `article URL), "topic" (string, the single best match from: ` +
    `${topicLabels.join(", ")}), "reason" (string, one sentence on why this ` +
    `story matters right now).`
  );
}

function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in model response");
  }
  return text.slice(start, end + 1);
}

async function suggestNews(topicLabels) {
  if (!client) {
    return {
      suggestions: null,
      error: "AI suggestions unavailable: ANTHROPIC_API_KEY is not configured.",
    };
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(topicLabels),
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: MAX_SEARCH_USES,
        },
      ],
      messages: [
        { role: "user", content: "Find today's most important stories." },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const suggestions = JSON.parse(extractJsonArray(text));
    if (!Array.isArray(suggestions)) {
      throw new Error("Model response was not a JSON array");
    }

    return { suggestions, error: null };
  } catch (err) {
    console.error("AI suggestion failed:", err);
    return { suggestions: null, error: "AI suggestions temporarily unavailable." };
  }
}

module.exports = { suggestNews };
