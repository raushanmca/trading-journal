const express = require("express");
const Journal = require("../models/Journal");
const requireAuth = require("../middleware/auth");
const requireActiveTrial = require("../middleware/trial");

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function extractRating(text) {
  const patterns = [
    /\b(?:rating|rated|rate)\s*(?:it\s*)?(?:as\s*)?([1-5])(?:\s*\/\s*5)?\b/i,
    /\b([1-5])\s*\/\s*5\b/i,
    /\b([1-5])\s*star(?:s)?\b/i,
    /\b([1-5])\s*out of\s*5\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function buildFallbackParse(text) {
  const lower = text.toLowerCase();

  const instrument =
    text
      .match(
        /(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|RELIANCE|HDFCBANK|TCS|SBIN|INFY|BTC|ETH|CRUDE)/i,
      )?.[0]
      ?.toUpperCase() || "NIFTY";

  const pnlMatch = text.match(/(-?\d[\d,]*)/);
  const pnl = pnlMatch ? Number(pnlMatch[0].replace(/,/g, "")) : 0;

  let rating = extractRating(text) ?? 3;
  if (rating === 3) {
    if (lower.includes("excellent") || lower.includes("perfect")) rating = 5;
    else if (lower.includes("great") || lower.includes("good")) rating = 4;
    else if (lower.includes("poor") || lower.includes("bad")) rating = 2;
    else if (lower.includes("terrible")) rating = 1;
  }

  const mistakes = [];
  if (lower.includes("fomo") || lower.includes("overtrade")) {
    mistakes.push("Avoid FOMO entries");
  }
  if (lower.includes("revenge")) {
    mistakes.push("Avoid revenge trading");
  }
  if (lower.includes("risk")) {
    mistakes.push("Respect risk management");
  }
  if (lower.includes("patience") || lower.includes("waited")) {
    mistakes.push("Patience around setup quality");
  }
  if (lower.includes("discipline") || lower.includes("disciplined")) {
    mistakes.push("Disciplined execution");
  }

  const parsed = {
    date: new Date().toISOString().split("T")[0],
    instrument,
    pnl,
    rating,
    mistakes: mistakes.length > 0 ? mistakes : ["Disciplined execution"],
  };

  return {
    message:
      `I structured your trade note for review:\n\n` +
      `• Instrument: ${parsed.instrument}\n` +
      `• PnL: ₹${parsed.pnl.toLocaleString()}\n` +
      `• Rating: ${parsed.rating}/5\n` +
      `• Key lessons: ${parsed.mistakes.join(", ")}\n\n` +
      `Review the details below and save if they look right.`,
    parsed,
    source: "fallback",
  };
}

function tryParseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("No JSON object found in AI response");
  }

  return JSON.parse(match[0]);
}

async function generateWithOpenAI({ message, recentTrades }) {
  const systemPrompt = `
You are an AI trading journal assistant.
Convert the user's trade description into a concise summary and a JSON journal entry.
Return valid JSON only using this exact shape:
{
  "message": "short supportive summary for the user",
  "parsed": {
    "date": "YYYY-MM-DD",
    "instrument": "string",
    "pnl": 0,
    "rating": 3,
    "mistakes": ["string"]
  }
}
Rules:
- Keep "message" short and supportive.
- Use today's date if the user does not specify one.
- Keep rating between 1 and 5.
- If the user explicitly mentions a rating like "4/5", "rating 3", or "5 stars", use that rating.
- "mistakes" can include things that went well or wrong, but always return at least one item.
- Return JSON only, with no markdown fences.
`.trim();

  const userPrompt = `
User message:
${message}

Recent journal context:
${JSON.stringify(
  recentTrades.map((trade) => ({
    instrument: trade.instrument,
    pnl: trade.pnl,
    rating: trade.rating,
    mistakes: trade.mistakes || [],
    date: trade.date,
  })),
)}
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      ?.map((item) => item.text || "")
      ?.join("") ||
    "";

  const parsedResponse = tryParseJson(outputText);
  const parsed = parsedResponse.parsed || {};

  return {
    message:
      parsedResponse.message ||
      "I turned your note into a structured journal entry. Please review it before saving.",
    parsed: {
      date: parsed.date || new Date().toISOString().split("T")[0],
      instrument: parsed.instrument || "NIFTY",
      pnl: Number(parsed.pnl || 0),
      rating: Math.min(5, Math.max(1, Number(parsed.rating || 3))),
      mistakes:
        Array.isArray(parsed.mistakes) && parsed.mistakes.length > 0
          ? parsed.mistakes.map((item) => String(item))
          : ["Disciplined execution"],
    },
    source: "openai",
  };
}

router.post(
  "/journal-assistant",
  requireAuth,
  requireActiveTrial,
  async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "A trade description is required" });
    }

    try {
      const recentTrades = await Journal.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(5);

      let result;

      if (OPENAI_API_KEY) {
        try {
          result = await generateWithOpenAI({
            message: message.trim(),
            recentTrades,
          });
        } catch (error) {
          console.error("AI journal assistant fallback:", error.message);
          result = buildFallbackParse(message.trim());
        }
      } else {
        result = buildFallbackParse(message.trim());
      }

      return res.json(result);
    } catch (error) {
      console.error("Journal assistant failed:", error.message);
      return res.status(500).json({
        message: "Unable to process the journal entry right now",
      });
    }
  },
);

module.exports = router;
