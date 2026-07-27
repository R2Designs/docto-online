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
const VERSION = "v12";
// Claude reads messy clinical prose best, so it leads when a key is present.
const CLAUDE_MODELS = ["claude-haiku-4-5-20251001"];
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
        engines: { claude: !!env.ANTHROPIC_KEY, workersAI: !!env.AI, gemini: !!env.GEMINI_KEY }
      }), { headers: cors });
    if (req.method !== "POST")
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: cors });

    try {
      const { text, conds, flags, areas, mode, debug } = await req.json();
      if (!text || typeof text !== "string" || text.length > 1500)
        return new Response(JSON.stringify({ error: "bad input" }), { status: 400, headers: cors });

      const condList = Array.isArray(conds) ? conds.slice(0, 100).join("; ") : "";
      const flagList = Array.isArray(flags) ? flags.slice(0, 60).join(", ") : "";
      const areaList = Array.isArray(areas) ? areas.slice(0, 20).join(", ") : "";
      const extract  = mode === "extract";
      const review   = mode === "review";

      /* Two modes:
         - classify (default): just pick a condition id / red flag.
         - extract: also pull the clinical detail the user already volunteered, so
           the app can skip questions it has answers to. Still a reader, not a doctor —
           it reports what was said; it never decides treatment. */
      /* Mode 3 — REVIEW. Everything else in this worker reads the patient's
         complaint. This one reads OUR OUTPUT and asks the only question the
         rest of the system was never asked: is this advice safe for THIS person?

         It matters because every safety layer in the app is something a human
         thought of in advance — the honey block exists because someone noticed
         honey. A reviewer looking at the finished plan can catch hazards nobody
         encoded. It only ever REMOVES advice or raises urgency; it can never add
         a treatment, so a wrong answer here makes the app more cautious, never
         less. */
      const system = review ?
`You are a clinical pharmacist reviewing advice a health app is about to show a patient.
You do NOT write advice. You only find lines that are unsafe FOR THIS PATIENT.

Judge each numbered line against the patient profile. Mark a line unsafe only when giving it to THIS patient could cause harm — a contraindication, a dangerous interaction with what they already take, a wrong dose for their age or organ function, or advice that would delay urgent care.

Common traps worth checking: honey under 1 year; cough/cold syrups under 4; aspirin under 16; NSAIDs with anticoagulants, kidney disease, ulcer or heart failure; herbs that thin blood (guggulu, turmeric, garlic, ginkgo, fenugreek) with anticoagulants; St John's Wort with almost anything; adult millilitre doses given to a child; sedatives in the elderly; anything applied hot to numb feet; advice that assumes the wrong body part.

Reply ONLY: {"unsafe":[{"n":<line number>,"why":"<short plain reason for the patient>"}],"escalate":<true|false>,"escalate_why":"<one clause, empty if false>"}
- "why" is read by the patient. Plain words, under 25 words, no jargon.
- escalate true only if the profile plus complaint means they need a doctor sooner than this advice implies.
- If nothing is unsafe, reply {"unsafe":[],"escalate":false,"escalate_why":""}.
- Never invent a treatment. Never add a line. Only flag what is listed.` :
      extract ?
`Clinical intake READER. Extract only what the patient stated. No advice, no invention.
conds (id=name, with patient-wording cues in brackets): ${condList}
flags: ${flagList}
areas: ${areaList}

Reply ONLY: {"id","red_flag","emergency","emergency_reason","suggested","duration","severity","temp_f","pain_areas","symptoms","onset","summary"}
- emergency: true if this needs hospital assessment now, else false. Judge this INDEPENDENTLY — set it true even when no flag id fits.
- emergency_reason: if emergency is true, one short clause naming what you suspect and why, e.g. "fever with a heart murmur and splinter haemorrhages suggests endocarditis". Empty otherwise. Name the concern only; give no treatment advice.
- suggested: ONLY when id is "none" — the condition you would actually name, in 1-4 plain words (e.g. "trigger finger", "lipoma", "onychomycosis"). This is used to decide what to add to the app\'s database later. Empty if id is set or you genuinely cannot say. Never suggest a treatment here, only a name.
- id/red_flag: best match from the lists, else "none". Judge the DESCRIPTION, not the patient's own conclusion — "is this just a migraine?" is not reassurance. Weigh patterns and numbers: navel pain migrating to right lower abdomen + nausea + low fever = appendicitis; BP >=180/120 = hypertensive emergency; MAOI drug + aged cheese/wine/cured meat + pounding headache = tyramine crisis; SSRI+tramadol/triptan + tremor/sweats/fever = serotonin syndrome; saddle numbness + bladder change = cauda equina; Graves + fever + HR>130 = thyroid storm.
- duration: today (<24h) | days | week | weeks | none
- severity: 1-10 only if stated/clearly implied, else null
- temp_f: number in F (convert from C), else null
- pain_areas: ids from areas, else []
- symptoms: max 8 short phrases the patient used
- onset: sudden | gradual | none
- summary: one sentence under 20 words, no diagnosis
Never fill a field the patient did not mention — use null/"none"/[]. A guess makes the app skip a question it must ask.` :
`You are a strict triage CLASSIFIER for a health app. You do NOT give medical advice.
Condition options (id=name): ${condList}
Emergency flag options: ${flagList}

Rules:
- If the complaint suggests a genuine emergency (heart attack, stroke, heavy bleeding, suicide risk, anaphylaxis, etc.), set red_flag to the best matching flag id, else "none".
- Otherwise pick the single best condition id, or "none" if nothing fits.
- Reply with ONLY this JSON, no prose: {"id":"...","red_flag":"..."}`;

      const user = review
? `PATIENT: ${String(areas||[]).toString().replace(/"/g,"'")}
COMPLAINT: "${text.replace(/"/g,"'")}"
ADVICE ABOUT TO BE SHOWN:
${(Array.isArray(conds)?conds:[]).slice(0,40).map((l,i)=>(i+1)+". "+String(l).replace(/"/g,"'")).join("\n")}`
: `Complaint (may be Hindi/Hinglish/Tamil/Telugu/Malayalam/English): "${text.replace(/"/g, "'")}"`;

      const tried = [];
      let parsed = null;

      /* ---- Engine 1: Claude (best at reading messy clinical prose) ---- */
      if (env.ANTHROPIC_KEY) {
        for (const model of CLAUDE_MODELS) {
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": env.ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01"
              },
              body: JSON.stringify({
                model,
                max_tokens: extract ? 300 : 60,
                temperature: 0,
                system,
                messages: [{ role: "user", content: user }]
              })
            });
            const j = await r.json();
            const p = extractJson(j);
            tried.push({ engine: "claude", model, status: r.status, err: j && j.error && j.error.message });
            if (p.id || p.red_flag) { parsed = p; break; }
          } catch (e) {
            tried.push({ engine: "claude", model, err: String(e).slice(0, 200) });
          }
        }
      }

      /* ---- Engine 2: Cloudflare Workers AI (no key, no billing account) ---- */
      if (!parsed && env.AI) {
        for (const model of CF_MODELS) {
          try {
            const r = await env.AI.run(model, {
              messages: [{ role: "system", content: system }, { role: "user", content: user }],
              max_tokens: extract ? 300 : 60,
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
      } else if (!parsed) {
        tried.push({ engine: "workers-ai", err: "no AI binding — add one in Settings → Bindings" });
      }

      /* ---- Engine 3: Gemini (optional backup) ---- */
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

      /* Review has its own shape. Sanitise hard: line numbers must exist, the
         reason is shown to a patient so it is length-capped and stripped of
         anything that looks like a prescription. */
      if (review) {
        const nLines = Array.isArray(conds) ? conds.length : 0;
        const seen = new Set();
        const unsafe = (Array.isArray(parsed.unsafe) ? parsed.unsafe : [])
          .map(u => ({ n: parseInt(u && u.n, 10), why: String((u && u.why) || "").replace(/\s+/g, " ").trim().slice(0, 160) }))
          .filter(u => Number.isInteger(u.n) && u.n >= 1 && u.n <= nLines && u.why.length > 3)
          .filter(u => (seen.has(u.n) ? false : (seen.add(u.n), true)))
          .slice(0, 12);
        return new Response(JSON.stringify({
          mode: "review",
          unsafe,
          escalate: parsed.escalate === true,
          escalate_why: String(parsed.escalate_why || "").replace(/\s+/g, " ").trim().slice(0, 160)
        }), { headers: cors });
      }

      const condIds = (Array.isArray(conds) ? conds : []).map(c => String(c).split("=")[0]);
      const flagIds = Array.isArray(flags) ? flags.map(String) : [];
      const clean = (v, allowed) => {
        if (!v || v === "none") return null;
        const s = String(v).trim();
        return allowed.length === 0 || allowed.includes(s) ? s : null;
      };
      const out = {
        id:       clean(parsed.id, condIds),
        red_flag: clean(parsed.red_flag, flagIds)
      };

      if (extract) {
        /* Sanitise every extracted field. A model that invents a duration or a
           temperature would make the app skip a question it needs to ask, so
           anything not in range is dropped back to "unknown". */
        const areaIds = Array.isArray(areas) ? areas.map(String) : [];
        const num = (v, lo, hi) => {
          const n = typeof v === "number" ? v : parseFloat(v);
          return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
        };
        out.duration   = ["today", "days", "week", "weeks"].includes(parsed.duration) ? parsed.duration : null;
        out.severity   = num(parsed.severity, 1, 10);
        out.severity   = out.severity === null ? null : Math.round(out.severity);
        out.temp_f     = num(parsed.temp_f, 93, 110);
        out.pain_areas = Array.isArray(parsed.pain_areas)
          ? parsed.pain_areas.map(String).filter(a => areaIds.length === 0 || areaIds.includes(a)).slice(0, 8)
          : [];
        out.symptoms   = Array.isArray(parsed.symptoms)
          ? parsed.symptoms.map(s => String(s).slice(0, 60)).slice(0, 8) : [];
        out.onset      = ["sudden", "gradual"].includes(parsed.onset) ? parsed.onset : null;
        out.summary    = typeof parsed.summary === "string" ? parsed.summary.slice(0, 200) : null;
        /* The long tail: a genuine emergency we have no id for. Carry the reader's
           reason through so the app can say WHY, while the safety instructions
           still come from our own vetted text. */
        out.emergency  = parsed.emergency === true || parsed.emergency === "true";
        /* Names a condition we have no entry for. Not shown as advice — logged so
           an entry can be written, reviewed and added, after which it becomes an
           ordinary database lookup like everything else. */
        out.suggested  = (!out.id && typeof parsed.suggested === "string")
          ? parsed.suggested.replace(/[^a-z0-9 \-\/]/gi,"").trim().slice(0,60) || null : null;
        out.emergency_reason = typeof parsed.emergency_reason === "string"
          ? parsed.emergency_reason.slice(0, 240) : null;
      }

      return new Response(JSON.stringify(out), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: "fail" }), { status: 500, headers: cors });
    }
  }
};
