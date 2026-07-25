/* DOCTO ONLINE — LLM router (Cloudflare Worker)
   Purpose: classify a user's free-text complaint into one of the app's condition IDs
   (or spot an emergency red-flag). It NEVER generates medical advice — all advice
   comes from the app's own vetted database. This is a router, nothing more.

   Two engines, tried in order:
     1. Cloudflare Workers AI  — no API key, no external billing account, runs inside
        this worker. Free plan = 10,000 neurons/day, and one classification costs a
        tiny fraction of a neuron. This is the default and needs no maintenance.
     2. Google Gemini (optional) — only used if Workers AI is unavailable AND you've
        set a GEMINI_KEY secret. Safe to skip entirely.

   SETUP (2 minutes, ₹0):
   1. Cloudflare dashboard → Workers & Pages → your worker → Settings → Bindings
      → Add → Workers AI → Variable name: AI → Deploy.
   2. Copy the worker URL (https://….workers.dev) into config.js → LLM_ENDPOINT.
   (Optional) Settings → Variables → Add secret GEMINI_KEY to enable the backup engine.

   Health check: open the worker URL in a browser — it reports its version and which
   engines are wired up. POST {"debug":true, …} to see exactly what each engine said. */

const ALLOWED_ORIGINS = [
  "https://r2designs.github.io",
  "http://localhost:8000"
];
const VERSION = "v6";
// Workers AI models, tried in order. Cloudflare retires model names periodically
// (llama-3.1-8b went away on 2026-05-30), so keep several — the first that answers wins.
const CF_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct"
];
// Gemini fallbacks, tried in order (guards against a model name being retired).
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

/* Dig the assistant's text out of whatever shape the provider returns. Workers AI
   and Gemini both change response shapes over time, so probe the known ones rather
   than assuming a plain string. */
function pickText(r, depth = 0) {
  if (depth > 8 || r == null) return "";
  if (typeof r === "string") return r;
  if (typeof r !== "object") return "";
  if (Array.isArray(r)) {
    for (const it of r) { const s = pickText(it, depth + 1); if (s) return s; }
    return "";
  }
  // Look inside the envelope first — an OpenAI-style wrapper has its own `id`
  // (chatcmpl-…) that must not be mistaken for the classification.
  const candidates = [
    r.response, r.result, r.output_text, r.text, r.content, r.message,
    r.choices && r.choices[0] && r.choices[0].message,
    r.output, r.candidates, r.parts
  ];
  for (const c of candidates) { const s = pickText(c, depth + 1); if (s) return s; }
  // Only now: the object may itself be the parsed classification.
  if (r.red_flag !== undefined || (r.id && Object.keys(r).length <= 3)) return JSON.stringify(r);
  return "";
}

/* Pull the first {...} object out of a model's reply and parse it. Small models
   like to wrap JSON in prose or code fences, so don't trust a bare JSON.parse. */
function extractJson(input) {
  const s = pickText(input);
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) {}
  const m = s.match(/\{[\s\S]*?\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return {};
}

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
    if (req.method === "GET")
      return new Response(JSON.stringify({
        ok: true, version: VERSION,
        engines: { workersAI: !!env.AI, gemini: !!env.GEMINI_KEY }
      }), { headers: cors });
    if (req.method !== "POST")
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: cors });

    try {
      const { text, conds, flags, debug } = await req.json();
      if (!text || typeof text !== "string" || text.length > 600)
        return new Response(JSON.stringify({ error: "bad input" }), { status: 400, headers: cors });

      const condList = Array.isArray(conds) ? conds.slice(0, 60).join("; ") : "";
      const flagList = Array.isArray(flags) ? flags.slice(0, 30).join(", ") : "";

      const system =
`You are a strict triage CLASSIFIER for a health app. You do NOT give medical advice.
Condition options (id=name): ${condList}
Emergency flag options: ${flagList}

Rules:
- If the complaint suggests a genuine emergency (heart attack, stroke, heavy bleeding, suicide risk, anaphylaxis, etc.), set red_flag to the best matching flag id, else "none".
- Otherwise pick the single best condition id, or "none" if nothing fits.
- Reply with ONLY this JSON, no prose: {"id":"...","red_flag":"..."}`;

      const user =
`Complaint (may be Hindi/Hinglish/Tamil/Telugu/Malayalam/English): "${text.replace(/"/g, "'")}"`;

      const tried = [];
      let parsed = null;

      /* ---- Engine 1: Cloudflare Workers AI (no key, no billing account) ---- */
      if (env.AI) {
        for (const model of CF_MODELS) {
          try {
            const r = await env.AI.run(model, {
              messages: [{ role: "system", content: system }, { role: "user", content: user }],
              max_tokens: 80,
              temperature: 0
            });
            const p = extractJson(r);
            tried.push({ engine: "workers-ai", model,
                         text: pickText(r).slice(0, 200),
                         shape: JSON.stringify(r).slice(0, 300) });
            if (p.id || p.red_flag) { parsed = p; break; }
          } catch (e) {
            tried.push({ engine: "workers-ai", model, err: String(e).slice(0, 200) });
          }
        }
      } else {
        tried.push({ engine: "workers-ai", err: "no AI binding — add one in Settings → Bindings" });
      }

      /* ---- Engine 2: Gemini (optional backup) ---- */
      if (!parsed && env.GEMINI_KEY) {
        const prompt = system + "\n\n" + user;
        for (const model of GEMINI_MODELS) {
          try {
            const r = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              { method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 512,                 // 2.5 models spend tokens thinking first
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 0 } // no thinking needed for a classifier
                  }
                }) });
            const j = await r.json();
            const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const p = extractJson(raw);
            tried.push({ engine: "gemini", model, status: r.status, err: j?.error?.message });
            if (p.id || p.red_flag) { parsed = p; break; }
          } catch (e) {
            tried.push({ engine: "gemini", model, err: String(e).slice(0, 200) });
          }
        }
      }

      if (debug) return new Response(JSON.stringify({ version: VERSION, tried, parsed }), { headers: cors });

      /* Only ever hand back an id/flag the app actually knows about — a model can
         hallucinate, and an unrecognised id would silently break the lookup. */
      parsed = parsed || {};
      const condIds = (Array.isArray(conds) ? conds : []).map(c => String(c).split("=")[0]);
      const flagIds = Array.isArray(flags) ? flags.map(String) : [];
      const clean = (v, allowed) => {
        if (!v || v === "none") return null;
        const s = String(v).trim();
        return allowed.length === 0 || allowed.includes(s) ? s : null;
      };
      return new Response(JSON.stringify({
        id:       clean(parsed.id, condIds),
        red_flag: clean(parsed.red_flag, flagIds)
      }), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: "fail" }), { status: 500, headers: cors });
    }
  }
};
