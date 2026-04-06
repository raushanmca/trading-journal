const axios = require("axios");
const { getRecentJournalEntries } = require("../journal/journalService");

const GOOGLE_NEWS_RSS_BASE_URL =
  "https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q=";
const RECENT_NEWS_MAX_AGE_MS = 1000 * 60 * 60 * 72;

const INSTRUMENT_QUERY_ALIASES = {
  NIFTY: ["NIFTY 50 NSE", "NIFTY index India"],
  BANKNIFTY: ["BANK NIFTY NSE", "NIFTY BANK index India"],
  FINNIFTY: ["FINNIFTY NSE", "NIFTY Financial Services index"],
  MIDCPNIFTY: ["MIDCPNIFTY NSE", "NIFTY Midcap Select index"],
  RELIANCE: ["Reliance Industries NSE", "Reliance stock India"],
  HDFCBANK: ["HDFC Bank NSE", "HDFC Bank stock India"],
  TCS: ["TCS NSE", "Tata Consultancy Services stock India"],
  SBIN: ["State Bank of India NSE", "SBIN stock India"],
  INFY: ["Infosys NSE", "INFY stock India"],
};

const MARKET_BRIEF_SECTIONS = [
  {
    id: "global-risk",
    label: "Global Risk",
    queries: [
      "war oil middle east market impact India",
      "geopolitical tensions stock market impact India",
      "global risk sentiment market today",
    ],
  },
  {
    id: "us-close",
    label: "US Market Close",
    queries: [
      "US market close Dow Nasdaq S&P 500 today",
      "Wall Street close today market summary",
      "Nasdaq Dow futures market close summary",
    ],
  },
  {
    id: "asia-markets",
    label: "Asia Market Update",
    queries: [
      "Asian markets today Nikkei Hang Seng Kospi market update",
      "Asia stock market today market summary",
      "Nikkei Hang Seng Asia market outlook today",
    ],
  },
  {
    id: "gift-nifty",
    label: "GIFT NIFTY",
    queries: [
      "GIFT NIFTY today outlook",
      "GIFT NIFTY signals Indian market open",
      "Gift Nifty live market sentiment",
    ],
  },
  {
    id: "nifty",
    label: "NIFTY",
    queries: [
      "NIFTY 50 today outlook",
      "NIFTY market outlook tomorrow",
      "NSE NIFTY support resistance today",
    ],
  },
  {
    id: "banknifty",
    label: "BANKNIFTY",
    queries: [
      "BANK NIFTY today outlook",
      "Bank Nifty support resistance today",
      "Bank Nifty tomorrow market setup",
    ],
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
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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

function buildNewsQuery(instrument) {
  return encodeURIComponent(instrument);
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

function parseRssItems(xml) {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemMatches.map((itemBlock) => {
    const title = stripHtml(getTagContent(itemBlock, "title"));
    const link = getTagContent(itemBlock, "link");
    const pubDate = getTagContent(itemBlock, "pubDate");
    const source = stripHtml(getTagContent(itemBlock, "source")) || "Google News";

    return {
      title,
      link,
      pubDate,
      source,
    };
  });
}

async function fetchNewsByQuery(query, instrument, maxItems = 3) {
  const queryVariants = [`${query} when:1d`, `${query} when:3d`, query];
  const failures = [];

  for (const queryVariant of queryVariants) {
    try {
      const response = await axios.get(
        `${GOOGLE_NEWS_RSS_BASE_URL}${buildNewsQuery(queryVariant)}&nocache=${Date.now()}`,
        {
          timeout: 8000,
          responseType: "text",
          headers: {
            "User-Agent": "TradingJournalMarketWatch/1.0",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      const parsedItems = parseRssItems(response.data).filter(
        (item) => item.title && item.link,
      );
      const sortedItems = [...parsedItems].sort(
        (left, right) =>
          getPubDateTimestamp(right.pubDate) - getPubDateTimestamp(left.pubDate),
      );
      const recentItems = sortedItems.filter((item) => isRecentHeadline(item));
      const items =
        recentItems.length > 0 ? recentItems.slice(0, maxItems) : sortedItems.slice(0, maxItems);

      if (items.length > 0) {
        return {
          instrument,
          headlines: items,
        };
      }
    } catch (error) {
      const status = error.response?.status;
      const detail = status
        ? `upstream status ${status}`
        : error.code || error.message || "unknown upstream error";
      failures.push(`${queryVariant}: ${detail}`);
    }
  }

  throw new Error(
    `Failed to fetch news for ${instrument}: ${failures.join(" | ") || "no headlines found"}`,
  );
}

async function fetchInstrumentNews(instrument, maxItems = 3) {
  const queries = [
    ...(INSTRUMENT_QUERY_ALIASES[instrument] || []),
    `${instrument} NSE stock`,
    `${instrument} stock India`,
    `${instrument} market news`,
  ];

  const seenLinks = new Set();
  const combinedHeadlines = [];
  const failures = [];

  for (const query of queries) {
    try {
      const result = await fetchNewsByQuery(query, instrument, maxItems);

      for (const headline of result.headlines) {
        if (seenLinks.has(headline.link)) {
          continue;
        }

        seenLinks.add(headline.link);
        combinedHeadlines.push(headline);

        if (combinedHeadlines.length >= maxItems) {
          return {
            instrument,
            headlines: combinedHeadlines,
          };
        }
      }
    } catch (error) {
      failures.push(error.message || `Failed query: ${query}`);
    }
  }

  if (combinedHeadlines.length > 0) {
    return {
      instrument,
      headlines: combinedHeadlines,
    };
  }

  throw new Error(failures.join(" | ") || `No headlines found for ${instrument}`);
}

async function fetchFallbackMarketNews(maxItems = 3) {
  const fallbackQueries = [
    "Indian stock market tomorrow",
    "NSE market outlook",
    "Sensex Nifty tomorrow market news",
  ];

  const seenLinks = new Set();
  const headlines = [];

  for (const query of fallbackQueries) {
    try {
      const result = await fetchNewsByQuery(query, "MARKET OUTLOOK", maxItems);

      for (const headline of result.headlines) {
        if (seenLinks.has(headline.link)) {
          continue;
        }

        seenLinks.add(headline.link);
        headlines.push(headline);

        if (headlines.length >= maxItems) {
          return {
            instrument: "MARKET OUTLOOK",
            headlines,
          };
        }
      }
    } catch (error) {
      // Ignore per-query fallback failure and continue trying the next query.
    }
  }

  return {
    instrument: "MARKET OUTLOOK",
    headlines,
  };
}

async function fetchCombinedNews(queries, label, maxItems = 3) {
  const seenLinks = new Set();
  const headlines = [];
  const failures = [];

  for (const query of queries) {
    try {
      const result = await fetchNewsByQuery(query, label, maxItems);

      for (const headline of result.headlines) {
        if (seenLinks.has(headline.link)) {
          continue;
        }

        seenLinks.add(headline.link);
        headlines.push(headline);

        if (headlines.length >= maxItems) {
          return headlines;
        }
      }
    } catch (error) {
      failures.push(error.message || `Failed query: ${query}`);
    }
  }

  if (headlines.length > 0) {
    return headlines;
  }

  throw new Error(failures.join(" | ") || `No headlines found for ${label}`);
}

async function fetchBriefSection(section, maxItems = 3) {
  try {
    const headlines = await fetchCombinedNews(section.queries, section.label, maxItems);

    return {
      id: section.id,
      label: section.label,
      headlines,
    };
  } catch (error) {
    return {
      id: section.id,
      label: section.label,
      headlines: [],
      error: error.message || `No headlines found for ${section.label}`,
    };
  }
}

function buildWatchpoints(sections, instruments) {
  const watchpoints = [];
  const sectionIds = new Set(sections.map((section) => section.id));

  if (sectionIds.has("global-risk")) {
    watchpoints.push("Check geopolitical risk headlines before market open.");
  }

  if (sectionIds.has("us-close")) {
    watchpoints.push("Use the US close as context, not a guaranteed next-day signal.");
  }

  if (sectionIds.has("asia-markets")) {
    watchpoints.push("Check Asian market tone to confirm or challenge your India bias.");
  }

  if (sectionIds.has("gift-nifty")) {
    watchpoints.push("Compare GIFT NIFTY direction with your pre-open bias.");
  }

  if (sectionIds.has("nifty") || sectionIds.has("banknifty")) {
    watchpoints.push("Mark key NIFTY and BANKNIFTY levels before the first 30 minutes.");
  }

  if (instruments.length > 0) {
    watchpoints.push(`Review instrument-specific headlines for ${instruments.join(", ")}.`);
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

  const sectionResults = await Promise.all(
    MARKET_BRIEF_SECTIONS.map((section) =>
      fetchBriefSection(section, headlinesPerSection),
    ),
  );

  const sections = sectionResults.filter((section) => section.headlines.length > 0);

  const instrumentResults = await Promise.allSettled(
    instruments.map((instrument) =>
      fetchInstrumentNews(instrument, headlinesPerInstrument),
    ),
  );

  const fulfilled = instrumentResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((entry) => entry.headlines.length > 0);

  if (sections.length === 0 && fulfilled.length === 0) {
    const fallback = await fetchFallbackMarketNews(headlinesPerInstrument);

    if (fallback.headlines.length > 0) {
      return {
        sections: [
          {
            id: "market-outlook",
            label: "Market Outlook",
            headlines: fallback.headlines,
          },
        ],
        instruments: [fallback],
        watchpoints: [
          "Use this market outlook as a pre-market cue, not a guaranteed forecast.",
        ],
        fetchedAt: new Date().toISOString(),
      };
    }

    const failures = [
      ...sectionResults
        .filter((section) => section.error)
        .map((section) => section.error),
      ...instrumentResults
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message || "unknown fetch failure"),
    ];

    if (failures.length > 0) {
      throw new Error(failures.join(" | "));
    }
  }

  return {
    sections,
    instruments: fulfilled,
    watchpoints: buildWatchpoints(
      sections,
      fulfilled.map((entry) => entry.instrument),
    ),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getMarketWatchForUser,
};
