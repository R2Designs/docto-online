/* DOCTO ONLINE — configuration.
   ▼▼▼ PASTE YOUR GOOGLE OAUTH CLIENT ID BETWEEN THE QUOTES BELOW ▼▼▼
   (Get it from Google Cloud Console — see README "Enable Google sign-in".
    It looks like: 1234567890-abcdefg.apps.googleusercontent.com)
   Leave it empty ("") to keep guest-only mode.                          */
window.DOCTO_CONFIG = {
  GOOGLE_CLIENT_ID: "229792750111-rgdtti67eeqr3luffqm7iuo154dd7705.apps.googleusercontent.com",

  /* Optional smart free-text fallback. Deploy worker.js to Cloudflare (free),
     then paste its URL here, e.g. "https://docto-llm.YOURNAME.workers.dev".
     Leave "" to run purely on the built-in rule engine. */
  LLM_ENDPOINT: ""
};
