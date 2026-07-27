
const GEMINI_MODEL = "gemini-2.5-flash"; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function cacheKey(domain) {
  return `llmCache:${domain}`;
}

async function callGemini(apiKey, prompt) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text content in Gemini response");

  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function buildPrompt(remainingKeys, fields) {
  return `You are matching HTML form fields to a fixed set of user profile keys.

Profile keys available (only use these):
${remainingKeys.map((k) => `- ${k}`).join("\n")}

Form fields to match (identified by "idx"):
${JSON.stringify(fields, null, 2)}

Rules:
- Only match a field if reasonably confident.
- Never assign the same profile key to more than one field.
- Never invent a profile key not in the list above.
- If nothing matches, respond with {}.

Respond with ONLY a raw JSON object, no markdown fences, no explanation.
Keys are profile keys, values are the matching field "idx" (integer).
Example: {"email": 3, "phone": 7}`;
}

async function handleLlmMatchFields(payload) {
  const { domain, remainingKeys, fields } = payload;
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) return { ok: false, error: "NO_API_KEY" };

  const store = await chrome.storage.local.get(cacheKey(domain));
  const domainCache = store[cacheKey(domain)] || {};

  const sig = (f) => `${f.label}|${f.name}|${f.id}`.toLowerCase();

  const cachedMatches = {};
  const fieldsNeedingLlm = [];
  for (const field of fields) {
    const s = sig(field);
    if (s in domainCache) {
      if (domainCache[s]) cachedMatches[domainCache[s]] = field.idx;
    } else {
      fieldsNeedingLlm.push(field);
    }
  }

  const stillNeeded = remainingKeys.filter((k) => !(k in cachedMatches));
  let llmMatches = {};

  if (fieldsNeedingLlm.length > 0 && stillNeeded.length > 0) {
    try {
      const prompt = buildPrompt(stillNeeded, fieldsNeedingLlm);
      llmMatches = await callGemini(apiKey, prompt);
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }

    const matchedIdxToKey = {};
    for (const [key, idx] of Object.entries(llmMatches)) matchedIdxToKey[idx] = key;
    for (const field of fieldsNeedingLlm) {
      domainCache[sig(field)] = matchedIdxToKey[field.idx] || null;
    }
    await chrome.storage.local.set({ [cacheKey(domain)]: domainCache });
  }

  return { ok: true, matches: { ...cachedMatches, ...llmMatches } };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "LLM_MATCH_FIELDS") {
    handleLlmMatchFields(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
});