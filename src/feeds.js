// RSS feed sources, grouped by publisher.
// Each feed has a "topics" array: the primary topic(s) it belongs to on the
// publisher's own site. Individual articles can pick up additional topics
// through the keyword matching in topics.js (e.g. an AI story that ran in a
// general tech feed still gets tagged "ai").

const FEEDS = [
  // ---- Bloomberg ----
  {
    source: "Bloomberg",
    name: "Technology",
    url: "https://feeds.bloomberg.com/technology/news.rss",
    topics: ["tech"],
  },
  {
    source: "Bloomberg",
    name: "Economics",
    url: "https://feeds.bloomberg.com/economics/news.rss",
    topics: ["economy"],
  },
  {
    source: "Bloomberg",
    name: "Politics",
    url: "https://feeds.bloomberg.com/politics/news.rss",
    topics: ["politics"],
  },
  {
    source: "Bloomberg",
    name: "Markets",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    topics: ["economy"],
  },

  // ---- The Economist ----
  {
    source: "The Economist",
    name: "Business",
    url: "https://www.economist.com/business/rss.xml",
    topics: ["economy", "tech"],
  },
  {
    source: "The Economist",
    name: "Finance & economics",
    url: "https://www.economist.com/finance-and-economics/rss.xml",
    topics: ["economy"],
  },
  {
    source: "The Economist",
    name: "Science & technology",
    url: "https://www.economist.com/science-and-technology/rss.xml",
    topics: ["tech"],
  },
  {
    source: "The Economist",
    name: "United States",
    url: "https://www.economist.com/united-states/rss.xml",
    topics: ["politics"],
  },

  // ---- The Washington Post ----
  {
    source: "The Washington Post",
    name: "Technology",
    url: "https://feeds.washingtonpost.com/rss/business/technology",
    topics: ["tech"],
  },
  {
    source: "The Washington Post",
    name: "Politics",
    url: "https://feeds.washingtonpost.com/rss/politics",
    topics: ["politics"],
  },
  {
    source: "The Washington Post",
    name: "Business",
    url: "https://feeds.washingtonpost.com/rss/business",
    topics: ["economy"],
  },

  // ---- The Wall Street Journal ----
  {
    source: "The Wall Street Journal",
    name: "Technology (WSJD)",
    url: "https://feeds.a.dj.com/rss/RSSWSJD.xml",
    topics: ["tech"],
  },
  {
    source: "The Wall Street Journal",
    name: "Markets",
    url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    topics: ["economy"],
  },
  {
    source: "The Wall Street Journal",
    name: "US Business",
    url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",
    topics: ["economy"],
  },
  {
    source: "The Wall Street Journal",
    name: "World News",
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    topics: ["politics"],
  },
];

module.exports = { FEEDS };
