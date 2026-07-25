/* DOCTO ONLINE — LLM router (Cloudflare Worker, free tier)
   Purpose: classify a user's free-text complaint into one of the app's condition IDs
   (or spot an emergency red-flag) using Google Gemini's FREE tier — while keeping
   the API key secret on the server side. It never generates medical advice;
   all advice comes from the app's vetted database.

   SETUP (5 minutes, ₹0):
   1. Get a free Gemini API key: https://aistudio.google.com → "Get API key".
   2. Cloudflare dashboard → Workers & Pages → Create → Worker → paste this file → Deploy.
   3. Worker → Settings → Variables → Add secret: name GEMINI_KEY, value = your key.
   4. Copy the worker URL (https://….workers.dev) into config.js → LLM_ENDPOINT.
   Free limits: Cloudflare 100k req/day; Gemini free tier has per-minute caps — fine
   for a small app since the site only calls this on low-confidence matches and caches results. */

const ALLOWED_ORIGINS = [
  "https://r2designs.github.io",
  "http://localhost:8000"
];
const MODEL = "gemini-2.5-flash-lite"; // free-tier model; if unavailable try "gemini-2.5-flash"

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST")   return new Response(JSON.stringify({error:"POST only"}), { status: 405, headers: cors });

    try {
      const { text, conds, flags } = await req.json();
      if (!text || typeof text !== "string" || text.length > 600)
        return new Response(JSON.stringify({error:"bad input"}), { status: 400, headers: cors });

      const condList = Array.isArray(conds) ? conds.slice(0, 60).join("; ") : "";
      const flagList = Array.isArray(flags) ? flags.slice(0, 30).join(", ") : "";

      const prompt =
`You are a strict triage CLASSIFIER for a health app. Do NOT give advice.
User complaint (may be Hindi/Hinglish/Tamil/Telugu/Malayalam/English): "${text.replace(/"/g,"'")}"

Condition options (id=name): ${condList}
Emergency flag options: ${flagList}

Rules:
- If the complaint suggests a genuine emergency (heart attack, stroke, heavy bleeding, suicide risk, anaphylaxis, etc.), set red_flag to the best matching flag id, else "none".
- Otherwise pick the single best condition id, or "none" if nothing fits.
- Answer ONLY with JSON: {"id":"...","red_flag":"..."}`;

      const g = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 60, responseMimeType: "application/json" }
          }) });

      const data = await g.json();
      const raw = data && data.candidates && data.candidates[0] &&
                  data.candidates[0].content && data.candidates[0].content.parts &&
                  data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text || "{}";
      let parsed = {}; try { parsed = JSON.parse(raw); } catch (e) {}

      const out = {
        id:       parsed.id && parsed.id !== "none" ? String(parsed.id) : null,
        red_flag: parsed.red_flag && parsed.red_flag !== "none" ? String(parsed.red_flag) : null
      };
      return new Response(JSON.stringify(out), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: "fail" }), { status: 500, headers: cors });
    }
  }
};
