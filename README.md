# Daily Briefing

A small news aggregator that pulls headlines from **Bloomberg**, **The
Economist**, **The Washington Post**, and **The Wall Street Journal**, and
lets you filter them by **Economy**, **AI**, **Tech**, and **Politics**.

It works by fetching each publisher's public RSS feeds on the server,
tagging each article with a topic (using the feed's own category plus
keyword matching on the headline/summary so cross-topic stories — like an AI
story that ran in a Politics feed — still surface correctly), and serving
the result to a simple browser frontend. Headlines link back to the
original article on the publisher's site; this app only shows the
headline/summary provided in the RSS feed, not paywalled full text.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000.

Feeds refresh automatically every 10 minutes on the server, and the page
polls for new data every 5 minutes. There's also a manual "Refresh" button
(rate-limited to once a minute).

## Configuration

- `src/feeds.js` — the list of RSS feeds per publisher and their primary
  topic(s). Add, remove, or re-tag feeds here.
- `src/topics.js` — the four topics and the keyword lists used to
  auto-tag articles that mention them.

If a publisher changes an RSS URL, that single feed will fail gracefully
(a banner notes which feed couldn't be reached) without breaking the rest
of the app — just update the URL in `src/feeds.js`.

## AI Suggestions (optional)

The "AI Suggestions" button asks Claude to search the live web (not limited
to the 4 configured publishers) and pick the most important/relevant recent
stories for the currently selected topics. This is separate from the RSS
pipeline above and requires an `ANTHROPIC_API_KEY` environment variable —
without it, the button just shows an explanatory message instead of
erroring. See `src/suggest.js` for the prompt and `src/suggestCache.js` for
the 10-minute per-topic-selection cache that keeps repeat clicks cheap.

Each click costs real money (Claude Opus 5 tokens + web search usage) —
budget accordingly if this is exposed publicly.

## API

- `GET /api/meta` — available topics and sources.
- `GET /api/articles?topics=&sources=&q=` — filtered article list. `topics`
  and `sources` each take a comma-separated list (e.g. `topics=ai,tech`);
  omit for no filter on that dimension.
- `GET /api/headlines?topics=&sources=&q=` — up to 5 top headlines from the
  same filtered set, round-robined across sources (no AI involved — just
  recency, spread across publishers).
- `POST /api/suggest?topics=` — AI-curated stories from across the web for
  the given topics (comma-separated; omit for all four). Requires
  `ANTHROPIC_API_KEY`.
- `POST /api/refresh` — force an immediate feed refresh.
