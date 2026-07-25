# DOCTO ONLINE — AI first-step health guide

A single-page web app (no build step, no server code) that plays the role of a careful first-step "doctor": it asks a structured set of questions, screens for emergencies, gives a **quick-relief (modern OTC) plan first, then an Ayurvedic plan**, recommends the right tests, reads an uploaded lab/X-ray report with **OCR**, produces a **downloadable medical-style report**, keeps a **history of past diagnoses**, supports **6 languages (English, Hindi, Hinglish, Tamil, Telugu, Malayalam)**, and has **Google sign-in + guest mode**.

Built on the two knowledge bases in this folder (`knowledge_base/` = Ayurveda, `allopathy_knowledge_base/` = modern OTC), distilled into `data.js`.

## Files
- `index.html` — layout & styles (matches the wireframe: left history panel, big serif title, chat, attach + submit bar).
- `app.js` — chat engine, red-flag detection, condition scoring, personalisation (age/pregnancy/allergy/existing-disease filters), OCR pipeline, report generator, history, auth, language.
- `data.js` — 40 conditions (symptoms → modern meds with **timing & before/after food**, Ayurvedic care, tests, doctor, escalation & hospital red-flags), 23 lab reference ranges + qualitative tests (dengue/malaria/typhoid/COVID), emergency keyword triggers.
- `i18n.js` — all UI + question strings in the 6 languages.

## Run it locally (fastest)
Just open `index.html` in a browser (double-click) — everything works offline except:
- **Google sign-in** needs an http(s) origin + a Client ID (see below). Use **"Continue without account"** to try instantly.
- **OCR / PDF reading** loads Tesseract.js and pdf.js from a CDN, so keep internet on for report reading.

For a proper local server (recommended, avoids file:// quirks):
```
cd docto_online
python3 -m http.server 8000
# open http://localhost:8000
```

## Enable Google sign-in (optional)
1. Go to Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID → Web application**.
2. Under *Authorized JavaScript origins* add your origin (e.g. `http://localhost:8000` and your live domain).
3. Copy the **Client ID** and paste it into `app.js` → `CONFIG.GOOGLE_CLIENT_ID`.
4. Reload; the Google button appears automatically. (Guest mode always works.)

## Deploy (free options)
- **Netlify / Vercel / GitHub Pages / Cloudflare Pages:** drag-drop or push this `docto_online/` folder — it's pure static files. Add your domain to the Google OAuth origins.

## How the consultation works
1. **Auth screen:** pick language, sign in with Google or continue as guest (name only).
2. **Structured intake (doctor-style):** who it's for → age/sex → (pregnancy if relevant) → main complaint (free text) → duration → severity 1–10 → fever/temperature → pain-area body map (multi-select) → condition-specific differentiators → **drug allergies** → existing conditions → regular medicines.
3. **Emergency engine:** any red-flag keyword or answer (chest pressure+sweating, worst-ever headache, blood in vomit/stool, stroke signs, breathlessness, self-harm, etc.) **halts the flow** and routes to hospital with holding measures + India helplines.
4. **Assessment:** most-likely condition + confidence, then **"Do this now" (OTC, personalised)** and **Ayurvedic care**. Medicines are auto-filtered — e.g. NSAIDs removed for ulcer/kidney/pregnancy/NSAID-allergy, decongestants for high BP, weight-based caveats for children.
5. **Tests:** recommends blood/urine/X-ray etc. when warranted, and invites a report upload.
6. **Report OCR:** upload a photo/PDF → text extraction → detects Hb, TLC, platelets, sugar, HbA1c, TSH, creatinine, LFT, lipids, uric acid, vitamins, dengue/malaria/typhoid/COVID, urine findings → flags abnormal values with plain-language guidance (e.g. low platelets + fever → dengue → hospital).
7. **Downloadable report:** a print-to-PDF medical-style sheet (patient details, complaint, history, provisional assessment, medicine table with timing & food relation, Ayurvedic care, investigations, when-to-see-a-doctor, hospital red-flags, disclaimer, helplines).
8. **History:** every consultation is saved (per user, in the browser) and reopenable from the left panel.

## Safety model (built in)
- Quick-fix scope only; complex/serious → names the real treatment and refers to the right specialist/hospital.
- Never tells users to start prescription-only drugs (antibiotics/etc.) on their own; flags "this needs a doctor's prescription".
- Every medicine has dose ceilings; personalised contraindication filtering; persistent disclaimer; emergency + suicide-prevention numbers (India 108/102; 9152987821; Tele-MANAS 14416).
- All data stays in the user's browser (localStorage) — nothing is uploaded; OCR runs on-device.

## Smart free-text fallback (optional, ₹0)
The built-in rule engine handles most complaints (typo-tolerant too). For odd phrasings — Hinglish, unusual wording, symptoms described sideways — an optional LLM **router** kicks in. It only classifies the complaint into one of the app's own condition IDs or red flags; it never writes advice. All treatment text still comes from `data.js`. It fires **only when the rule engine is unsure**, caches results in localStorage, and if it's unavailable for any reason the app silently carries on with the rule engine alone.

The router is `worker.js`, deployed as a Cloudflare Worker. It tries two engines in order:

1. **Cloudflare Workers AI** (default) — runs inside the worker itself. No API key, no separate billing account, nothing to expire. Free plan = 10,000 neurons/day; one classification costs a tiny fraction of a neuron.
2. **Google Gemini** (optional backup) — only used if Workers AI fails *and* a `GEMINI_KEY` secret exists.

**Setup (2 minutes):**

1. Cloudflare → Workers & Pages → Create → Worker → paste `worker.js` → **Deploy**.
2. Worker → **Settings → Bindings → Add → Workers AI** → variable name `AI`.
3. Paste the worker URL into `config.js → LLM_ENDPOINT`.
4. Add your live domain to `ALLOWED_ORIGINS` at the top of `worker.js` if it isn't `r2designs.github.io`.
5. *(Optional)* Settings → Variables → add secret `GEMINI_KEY` to enable the backup engine.

**Health check:** open the worker URL in a browser — it reports its version and which engines are wired up, e.g. `{"ok":true,"version":"v6","engines":{"workersAI":true,"gemini":true}}`. To see exactly what each engine replied, POST `{"debug":true,"text":"…","conds":[…],"flags":[…]}`.

**Maintenance note:** providers retire model names (Cloudflare dropped `llama-3.1-8b` in May 2026) and change response shapes. The worker guards against both — it walks a list of models until one answers, digs the text out of any known envelope shape, and validates the returned ID against the condition list the app sent, so a hallucinated or unrecognised ID is discarded rather than passed through. If every model fails, it returns nulls and the rule engine takes over.

## Notes / possible next steps
- Voice input, more languages, and a shareable report link are easy add-ons.
- To make diagnosis smarter for free-text edge cases, an optional Claude/LLM call could be slotted into `flow()` — the app is designed to work fully **without** it (as requested).
- This is a supportive tool, not a licensed medical device. Add your own clinical review before any real-world deployment.
