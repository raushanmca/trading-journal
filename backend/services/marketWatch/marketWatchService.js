const axios = require("axios");
const { getRecentJournalEntries } = require("../journal/journalService");

const GOOGLE_NEWS_RSS_BASE_URL =
  "https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q=";

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
  const query = `${instrument} stock market`;
  return encodeURIComponent(query);
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

async function fetchInstrumentNews(instrument, maxItems = 3) {
  const response = await axios.get(
    `${GOOGLE_NEWS_RSS_BASE_URL}${buildNewsQuery(instrument)}`,
    {
      timeout: 8000,
      responseType: "text",
    },
  );

  const items = parseRssItems(response.data)
    .filter((item) => item.title && item.link)
    .slice(0, maxItems);

  return {
    instrument,
    headlines: items,
  };
}

async function getMarketWatchForUser(userId, options = {}) {
  const { instrumentLimit = 3, headlinesPerInstrument = 3 } = options;
  const recentTrades = await getRecentJournalEntries(userId, 12);

  const instruments = [
    ...new Set(
      recentTrades
        .map((trade) => normalizeInstrumentName(trade.instrument))
        .filter(Boolean),
    ),
  ].slice(0, instrumentLimit);

  if (instruments.length === 0) {
    return {
      instruments: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  const results = await Promise.allSettled(
    instruments.map((instrument) =>
      fetchInstrumentNews(instrument, headlinesPerInstrument),
    ),
  );

  return {
    instruments: results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((entry) => entry.headlines.length > 0),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getMarketWatchForUser,
};
