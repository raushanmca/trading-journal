const axios = require("axios");
const { getRecentJournalEntries } = require("../journal/journalService");

const RECENT_NEWS_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const FEED_TIMEOUT_MS = 8000;
const REQUEST_HEADERS = {
  "User-Agent": "TradingJournalMarketWatch/1.0",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const DIRECT_NEWS_FEEDS = [
  {
    id: "et-markets",
    label: "Economic Times",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
  },
  {
    id: "et-stocks",
    label: "Economic Times",
    url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
  },
  {
    id: "et-expert-view",
    label: "Economic Times",
    url: "https://economictimes.indiatimes.com/markets/expert-view/rssfeeds/50649960.cms",
  },
  {
    id: "et-indices",
    label: "Economic Times",
    url: "https://economictimes.indiatimes.com/market-data/indices/rssfeeds/110738010.cms",
  },
  {
    id: "mint-markets",
    label: "Mint",
    url: "https://www.livemint.com/rss/markets",
  },
  {
    id: "mint-money",
    label: "Mint",
    url: "https://www.livemint.com/rss/money",
  },
  {
    id: "bs-markets",
    label: "Business Standard",
    url: "https://www.business-standard.com/rss/markets-106.rss",
  },
  {
    id: "bs-market-news",
    label: "Business Standard",
    url: "https://www.business-standard.com/rss/markets/news-10601.rss",
  },
  {
    id: "bs-stock-market-news",
    label: "Business Standard",
    url: "https://www.business-standard.com/rss/markets/stock-market-news-10618.rss",
  },
];

const INSTRUMENT_QUERY_ALIASES = {
  NIFTY: ["nifty", "nifty 50", "sensex"],
  BANKNIFTY: ["bank nifty", "banknifty", "nifty bank", "banking index"],
  FINNIFTY: ["finnifty", "nifty financial services", "financial services index"],
  MIDCPNIFTY: ["midcpnifty", "nifty midcap select", "midcap select"],
  RELIANCE: ["reliance", "reliance industries"],
  HDFCBANK: ["hdfc bank", "hdfcbank"],
  TCS: ["tcs", "tata consultancy services"],
  SBIN: ["sbin", "state bank of india", "sbi"],
  INFY: ["infy", "infosys"],
};

const MARKET_BRIEF_SECTIONS = [
  {
    id: "global-risk",
    label: "Global Risk",
    keywords: ["oil", "crude", "war", "tariff", "geopolitical", "middle east", "fed"],
  },
  {
    id: "us-close",
    label: "US Market Close",
    keywords: ["wall street", "dow", "nasdaq", "s&p", "us market", "u.s. market"],
  },
  {
    id: "asia-markets",
    label: "Asia Market Update",
    keywords: ["asia", "asian markets", "nikkei", "hang seng", "kospi", "shanghai"],
  },
  {
    id: "gift-nifty",
    label: "GIFT NIFTY",
    keywords: ["gift nifty", "gift city", "sgx nifty"],
  },
  {
    id: "nifty",
    label: "NIFTY",
    keywords: ["nifty", "sensex", "nifty 50", "index"],
  },
  {
    id: "banknifty",
    label: "BANKNIFTY",
    keywords: ["bank nifty", "banknifty", "nifty bank", "bank stocks"],
  },
];

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagContent(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function normalizeInstrumentName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPubDateTimestamp(pubDate) {
  const timestamp = Date.parse(pubDate);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isRecentHeadline(item, maxAgeMs = RECENT_NEWS_MAX_AGE_MS) {
  const timestamp = getPubDateTimestamp(item.pubDate);

  if (!timestamp) {
    return false;
  }

  return Date.now() - timestamp <= maxAgeMs;
}

function matchesKeywords(text, keywords) {
  if (!keywords.length) {
    return false;
  }

  const normalizedText = normalizeSearchText(text);
  return keywords.some((keyword) => normalizedText.includes(normalizeSearchText(keyword)));
}

function parseRssItems(xml, fallbackSource) {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemMatches.map((itemBlock) => {
    const title = stripHtml(getTagContent(itemBlock, "title"));
    const link = getTagContent(itemBlock, "link");
    const pubDate = getTagContent(itemBlock, "pubDate");
    const source = stripHtml(getTagContent(itemBlock, "source")) || fallbackSource;

    return {
      title,
      link,
      pubDate,
      source,
    };
  });
}

async function fetchFeedItems(feed) {
  const response = await axios.get(`${feed.url}${feed.url.includes("?") ? "&" : "?"}nocache=${Date.now()}`, {
    timeout: FEED_TIMEOUT_MS,
    responseType: "text",
    headers: REQUEST_HEADERS,
  });

  return parseRssItems(response.data, feed.label)
    .filter((item) => item.title && item.link && isRecentHeadline(item))
    .map((item) => ({
      ...item,
      source: item.source || feed.label,
    }));
}

async function fetchAllFeedItems() {
  const results = await Promise.allSettled(
    DIRECT_NEWS_FEEDS.map(async (feed) => ({
      feed,
      items: await fetchFeedItems(feed),
    })),
  );

  const feeds = [];
  const failures = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      feeds.push(result.value);
    } else {
      failures.push(result.reason?.message || "unknown feed failure");
    }
  }

  return { feeds, failures };
}

function dedupeAndSortHeadlines(items, maxItems) {
  const seenLinks = new Set();
  const sortedItems = [...items].sort(
    (left, right) => getPubDateTimestamp(right.pubDate) - getPubDateTimestamp(left.pubDate),
  );

  return sortedItems.filter((item) => {
    if (seenLinks.has(item.link)) {
      return false;
    }

    seenLinks.add(item.link);
    return true;
  }).slice(0, maxItems);
}

function getSectionHeadlines(section, feeds, maxItems) {
  const matchedItems = feeds.flatMap(({ items }) =>
    items.filter((item) => matchesKeywords(item.title, section.keywords)),
  );

  return dedupeAndSortHeadlines(matchedItems, maxItems);
}

function getInstrumentKeywords(instrument) {
  return INSTRUMENT_QUERY_ALIASES[instrument] || [instrument];
}

function getInstrumentHeadlines(instrument, feeds, maxItems) {
  const keywords = getInstrumentKeywords(instrument);
  const matchedItems = feeds.flatMap(({ items }) =>
    items.filter((item) => matchesKeywords(item.title, keywords)),
  );

  return dedupeAndSortHeadlines(matchedItems, maxItems);
}

function buildWatchpoints(sections, instruments) {
  const watchpoints = [];
  const sectionIds = new Set(sections.map((section) => section.id));

  if (sectionIds.has("global-risk")) {
    watchpoints.push("Check global risk headlines before market open.");
  }

  if (sectionIds.has("us-close")) {
    watchpoints.push("Use the US close as context, not as a guaranteed next-day signal.");
  }

  if (sectionIds.has("asia-markets")) {
    watchpoints.push("Compare Asian market tone with your India bias before the open.");
  }

  if (sectionIds.has("gift-nifty")) {
    watchpoints.push("Compare GIFT NIFTY direction with your pre-open plan.");
  }

  if (sectionIds.has("nifty") || sectionIds.has("banknifty")) {
    watchpoints.push("Mark key NIFTY and BANKNIFTY levels before the first 30 minutes.");
  }

  if (instruments.length > 0) {
    watchpoints.push(`Review fresh headlines for ${instruments.join(", ")} before taking trades.`);
  }

  return watchpoints.slice(0, 4);
}

async function getMarketWatchForUser(userId, options = {}) {
  const {
    instrumentLimit = 3,
    headlinesPerInstrument = 3,
    headlinesPerSection = 3,
  } = options;
  const recentTrades = await getRecentJournalEntries(userId, 12);
  const instruments = [
    ...new Set(
      recentTrades
        .map((trade) => normalizeInstrumentName(trade.instrument))
        .filter(Boolean),
    ),
  ].slice(0, instrumentLimit);

  const { feeds, failures } = await fetchAllFeedItems();

  if (feeds.length === 0) {
    throw new Error(failures.join(" | ") || "Unable to load publisher feeds right now");
  }

  const sections = MARKET_BRIEF_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    headlines: getSectionHeadlines(section, feeds, headlinesPerSection),
  })).filter((section) => section.headlines.length > 0);

  const instrumentResults = instruments.map((instrument) => ({
    instrument,
    headlines: getInstrumentHeadlines(instrument, feeds, headlinesPerInstrument),
  })).filter((entry) => entry.headlines.length > 0);

  return {
    sections,
    instruments: instrumentResults,
    watchpoints: buildWatchpoints(
      sections,
      instrumentResults.map((entry) => entry.instrument),
    ),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getMarketWatchForUser,
};
