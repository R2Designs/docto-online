/* Guards the worker's ACCEPTANCE layer — the code that decides whether a model
   actually answered, or whether to fall through to the next engine.

   This test exists because of a bug that hid for a whole build. tests/review.js
   passed the entire time: it mocks the worker and only checks that the app does
   the right thing with a review reply. Nothing checked the worker itself, and the
   worker was testing every reply against the CLASSIFY shape — `p.id || p.red_flag`.
   A review reply has neither field, so every correct answer was discarded, the
   engine chain ran to exhaustion, and the caller got the empty default:
   {"unsafe":[],"escalate":false}. "Nothing here is unsafe" and "I could not read
   any of my engines" were the same response, and the app could not tell them apart.

   The shapes below are real captures from the live worker's debug output, not
   invented ones. Run: node tests/worker_shapes.js */
const fs=require("fs"), path=require("path");
const src=fs.readFileSync(path.join(__dirname,"..","worker.js"),"utf8");
eval(src.slice(src.indexOf("function pickText"), src.indexOf("export default")));

let fail=0;
const ok=(cond,label)=>{ console.log((cond?"ok   ":"FAIL ")+label); if(!cond) fail++; };

/* The predicate as the worker now defines it. Kept in step with worker.js by the
   source check at the bottom — if the worker stops using `answered`, this fails. */
const answered = (p, review) => review
  ? (Array.isArray(p.unsafe) || typeof p.escalate === "boolean")
  : !!(p.id || p.red_flag);

/* ---- real provider envelopes, captured from the live worker ---- */
const SHAPES = {
  "workers-ai llama-3.3 (OpenAI-style choices)":
    {choices:[{finish_reason:"stop",index:0,message:{role:"assistant",
      content:'{"unsafe":[{"n":1,"why":"Honey is not safe for babies under 1 year"}],"escalate":false,"escalate_why":""}'}}]},

  "workers-ai llama-4-scout (pre-parsed .response object)":
    {response:{unsafe:[{n:1,why:"Honey is not safe for children under 1 year due to risk of botulism"}],
      escalate:false, escalate_why:""}},

  "claude (content array)":
    {content:[{type:"text",text:'{"unsafe":[{"n":1,"why":"Honey can cause infant botulism under one year"}],"escalate":false,"escalate_why":""}'}]},

  "fenced json from a small model":
    '```json\n{"unsafe":[{"n":2,"why":"This dose is an adult dose"}],"escalate":true,"escalate_why":"needs weighing first"}\n```'
};

console.log("--- every real envelope must yield a usable review ---");
Object.keys(SHAPES).forEach(name=>{
  const p=extractJson(SHAPES[name]);
  ok(Array.isArray(p.unsafe) && p.unsafe.length>0, "parsed: "+name);
  ok(answered(p,true), "accepted: "+name);
});

console.log("\n--- an all-clear review is still an ANSWER, not a fall-through ---");
const clear=extractJson('{"unsafe":[],"escalate":false,"escalate_why":""}');
ok(answered(clear,true), "empty unsafe[] with escalate:false is accepted");
ok(!answered({},true),   "a genuinely empty reply is NOT accepted");
ok(!answered({},false),  "empty reply rejected in classify mode too");

console.log("\n--- classify/extract shapes must keep working ---");
ok(answered(extractJson('{"id":"cold","red_flag":"none"}'),false), "classify id accepted");
ok(answered(extractJson('{"id":"none","red_flag":"cardiac"}'),false), "classify red_flag accepted");
ok(!answered(extractJson('{"unsafe":[]}'),false), "a review reply is NOT accepted as a classification");
ok(answered(extractJson('{"id":"cough","duration":"days","temp_f":100.4}'),false), "extract shape accepted");

console.log("\n--- the worker must actually USE the mode-aware predicate ---");
ok(!/p\.id \|\| p\.red_flag\) \{ parsed/.test(src), "no engine still tests the classify shape for every mode");
ok((src.match(/if \(answered\(p\)\)/g)||[]).length===3, "all three engines use answered()");
ok(/const maxTok = review \? 400/.test(src), "review gets a token budget big enough for a list of reasons");
ok(/max_tokens: maxTok/.test(src) && !/max_tokens: extract \? 300 : 60/.test(src), "no engine still caps review at 60 tokens");

console.log(fail ? "\n"+fail+" FAILED" : "\nPASS — the worker can tell an all-clear from a broken chain");
process.exit(fail?1:0);
