const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-5";
const MAX_ARTICLES_IN_DIGEST = 40;
const MAX_TOKENS = 700;

const SYSTEM_PROMPT = [
  "You are a news editor. Given a list of headlines and snippets from",
  "Bloomberg, The Economist, The Washington Post, and The Wall Street",
  "Journal, write a neutral 200-300 word news brief in flowing prose (no",
  "bullet points, no headers, no markdown) covering the most significant",
  "stories in the list. Synthesize themes and connections across articles",
  "rather than listing every headline in order. Mention source publications",
  "naturally where it adds context. Do not fabricate details that aren't",
  "present in the provided material.",
].join(" ");

let client = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic();
}

function buildDigest(articles) {
  return articles
    .slice(0, MAX_ARTICLES_IN_DIGEST)
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title} — ${a.summary}`)
    .join("\n");
}

async function generateOverview(articles) {
  if (!client) {
    return {
      summary: null,
      error: "AI overview unavailable: ANTHROPIC_API_KEY is not configured.",
    };
  }

  if (articles.length === 0) {
    return { summary: null, error: "No articles available to summarize." };
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are today's headlines:\n\n${buildDigest(articles)}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { summary: text || null, error: text ? null : "Empty response from model." };
  } catch (err) {
    console.error("Overview generation failed:", err);
    return { summary: null, error: "AI overview temporarily unavailable." };
  }
}

module.exports = { generateOverview };
