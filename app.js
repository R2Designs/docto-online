/* DOCTO ONLINE — chat engine. Runs fully in the browser; data stays in localStorage. */
"use strict";
/* Keep in step with the ?v= token on the script tags in index.html. Shown in the
   footer, so a cached old build is visible instead of silently giving old advice. */
const BUILD = 17;
window.DOCTO_BUILD = BUILD;
const CONFIG = {
  GOOGLE_CLIENT_ID: (window.DOCTO_CONFIG && window.DOCTO_CONFIG.GOOGLE_CLIENT_ID) || "", // set this in config.js
  LLM_ENDPOINT: (window.DOCTO_CONFIG && window.DOCTO_CONFIG.LLM_ENDPOINT) || "",
  TESS: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  PDFJS: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  PDFWK: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
};
let LANG = localStorage.getItem("docto_lang") || "en";
let USER = JSON.parse(localStorage.getItem("docto_user") || "null");
const t = k => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const BOT_AV='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#0f766e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6a6 6 0 0 0 12 0V3"/><circle cx="12" cy="17" r="3"/></svg>';
const USER_AV='🙂';
const CHAT=()=>document.getElementById("chatInner");
const initial=()=> (USER && USER.name ? USER.name.trim().charAt(0).toUpperCase() : "?");
const ICONS={
 activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
 zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
 leaf:'<path d="M11 20A7 7 0 0 1 4 13C4 6 11 4 20 4c0 9-4 16-9 16z"/><path d="M4.5 19.5C8 17 10.5 13 11.5 8"/>',
 clipboard:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
 alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
 clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
 trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
 eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
};
function svg(n){ return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[n]||"")+'</svg>'; }
function sec(cls,name,title){ return '<h3 class="'+cls+'"><span class="hbadge">'+svg(name)+'</span>'+esc(title)+'</h3>'; }

/* ---------------- session state ---------------- */
let S = null;
function newSession(){
  S = { step:"welcome", who:null, age:null, ageMonths:null, sex:null, preg:false, complaint:"", dur:null, sev:null,
        temp:null, feverKind:null, pains:[], dqi:0, dqAnswers:[], allergies:[], allergyOther:"",
        conds:[], meds:"", cond:null, scores:{}, emergency:null, labFindings:null, labRaw:"",
        symptoms:[], extracted:[], llmHint:null,
        transcript:[], id:"dx"+Date.now(), date:new Date().toLocaleDateString("en-GB"), reportReady:false };
}

/* ---------------- UI helpers ---------------- */
function scroll_(){ const c=$("chat"); c.scrollTop=c.scrollHeight; }
function bubble(html, who){
  const row=document.createElement("div"); row.className="row "+who;
  row.innerHTML = `<div class="av">${who==="bot"?BOT_AV:('<b style="color:#0f766e">'+initial()+'</b>')}</div><div class="bub">${html}</div>`;
  CHAT().appendChild(row); scroll_(); return row.querySelector(".bub");
}
function addUser(txt){ bubble(esc(txt),"user"); S && S.transcript.push({u:txt}); }
let typingRow=null;
function typing(on){
  if(on){ typingRow=document.createElement("div"); typingRow.className="row bot";
    typingRow.innerHTML=`<div class="av">${BOT_AV}</div><div class="bub"><span class="dots"><span></span><span></span><span></span></span></div>`;
    CHAT().appendChild(typingRow); scroll_();
  } else if(typingRow){ typingRow.remove(); typingRow=null; }
}
function addBot(html, delay=650){
  return new Promise(res=>{ typing(true);
    setTimeout(()=>{ typing(false); bubble(html,"bot"); S && S.transcript.push({b:html}); res(); }, delay);
  });
}
/* One interaction model for every question:
     • tapping an option always works
     • typing always works too (matched against the visible options)
     • "None" is always a single tap that ends the question — never tap-then-confirm
     • multi-select confirms with one button that says how many are chosen
   Before this, "none" meant three different gestures depending on the question,
   which is the kind of thing that makes people distrust the whole form. */
function chips(list, {multi=false, doneLabel="OK", noneIdx=-1}={}){
  return new Promise(res=>{
    const wrap=document.createElement("div"); wrap.className="row bot";
    const inner=document.createElement("div"); inner.className="bub"; wrap.appendChild(inner);
    const avatar=document.createElement("div"); avatar.className="av"; avatar.innerHTML=BOT_AV; wrap.prepend(avatar);
    const box=document.createElement("div"); box.className="chips"; inner.appendChild(box);
    const sel=new Set(); const btns=[]; let okBtn=null;
    /* Once a question is answered it must stay answered. A chosen chip keeps
       keyboard focus, so a later Enter or Space would re-fire it and record the
       same answer again — hence both the `settled` guard and disabling. */
    let settled=false;
    function lockDown(){ settled=true; activeChips=null; resetHint();
      btns.forEach(x=>{ x.classList.add("done"); x.disabled=true; });
      if(okBtn) okBtn.disabled=true;
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
    function syncDone(){ if(!okBtn) return;
      /* When the list already offers a "none" chip, a separate "None of these"
         button is the same answer twice. Hide the button until something is
         picked; only lists without a none option need it as the way out. */
      if(sel.size){ okBtn.style.display=""; okBtn.textContent=doneLabel+" ("+sel.size+")"; }
      else if(noneIdx>=0){ okBtn.style.display="none"; }
      else { okBtn.style.display=""; okBtn.textContent=t("noneOfThese"); } }
    function toggle(i){ if(settled) return; const b=btns[i];
      /* "None" is exclusive and immediate — choosing it can't coexist with other
         answers, and making someone confirm "none" afterwards is pure friction. */
      if(i===noneIdx){ finishMulti(true); return; }
      if(noneIdx>=0 && sel.has(noneIdx)){ sel.delete(noneIdx); btns[noneIdx].classList.remove("sel"); }
      if(sel.has(i)){sel.delete(i);b.classList.remove("sel");} else {sel.add(i);b.classList.add("sel");}
      syncDone(); }
    function finishSingle(i){ if(settled) return; btns[i].classList.add("sel"); lockDown();
      addUser(list[i]); res({idx:i,label:list[i]}); }
    function finishMulti(viaNone){ if(settled) return;
      const arr = viaNone ? [] : [...sel];
      if(viaNone && noneIdx>=0) btns[noneIdx].classList.add("sel");
      lockDown();
      if(okBtn) okBtn.style.display="none";
      addUser(arr.length ? arr.map(i=>list[i]).join(", ")
                         : (noneIdx>=0 ? list[noneIdx] : t("noneOfThese")));
      res({idxs:arr,labels:arr.map(i=>list[i])}); }
    list.forEach((c,i)=>{ const b=document.createElement("button"); b.className="chip"; b.textContent=c;
      b.onclick=()=> multi ? toggle(i) : finishSingle(i); box.appendChild(b); btns.push(b); });
    if(multi){ const w=document.createElement("div"); w.className="chipRowBtn";
      okBtn=document.createElement("button"); okBtn.className="bigBtn";
      okBtn.onclick=()=>finishMulti(false); w.appendChild(okBtn); inner.appendChild(w); syncDone(); }
    activeChips={ multi, selectByText(text){
        const low=text.toLowerCase().trim();
        // typing "none" / "no" / "nothing" behaves exactly like tapping None
        if(/^(none|no|nothing|nil|na|n\/a|koi nahi|kuch nahi)$/.test(low)){
          if(multi){ finishMulti(true); return true; }
          if(noneIdx>=0){ finishSingle(noneIdx); return true; }
        }
        let i=list.findIndex(o=>o.toLowerCase()===low);
        if(i<0) i=list.findIndex(o=>{const ol=o.toLowerCase(); return ol.length>1 && (low.includes(ol)||ol.includes(low));});
        if(i<0){ const toks=low.split(/[^a-z0-9]+/).filter(x=>x.length>2);
          i=list.findIndex(o=>{const ol=o.toLowerCase(); return toks.some(tk=>ol.includes(tk));}); }
        if(i<0) return false;
        if(multi){ toggle(i); return true; } finishSingle(i); return true;
      }, finishMulti };
    setHint(multi);
    CHAT().appendChild(wrap); scroll_();
  });
}
function setHint(multi){ const el=$("inp"); if(el) el.placeholder = multi ? t("hintMulti") : t("hintTap"); }
function resetHint(){ const el=$("inp"); if(el) el.placeholder=t("inputPh"); }
/* A typed question can also offer taps. "How bad is it, 1-10?" and "any regular
   medicines?" were type-only, so the answer gesture changed halfway through the
   consultation. Quick options make every question tappable while typing still
   works — same model as chips, just with free text allowed. */
function askText(ph, quick){
  activeChips=null;
  return new Promise(res=>{
    const inp=$("inp");
    let wrap=null, settled=false;
    const finish=v=>{ if(settled) return; settled=true;
      if(wrap) wrap.querySelectorAll("button").forEach(b=>{ b.classList.add("done"); b.disabled=true; });
      pendingText=null; resetHint(); res(v); };
    if(quick && quick.length){
      const box=document.createElement("div"); box.className="chips";
      quick.forEach(q=>{ const b=document.createElement("button"); b.className="chip"; b.textContent=q.label;
        b.onclick=()=>{ b.classList.add("sel"); addUser(q.label); finish(q.value); };
        box.appendChild(b); });
      /* Shortcuts belong to the question, not to a message of their own. Giving
         them their own avatar and bubble made a single "None" chip look like the
         app had sent an empty message. Attach to the question just asked. */
      const rows=CHAT().querySelectorAll(".row.bot");
      const lastBub = rows.length ? rows[rows.length-1].querySelector(".bub") : null;
      if(lastBub){ lastBub.appendChild(box); wrap=rows[rows.length-1]; }
      else {
        wrap=document.createElement("div"); wrap.className="row bot";
        const inner=document.createElement("div"); inner.className="bub";
        const av=document.createElement("div"); av.className="av"; av.innerHTML=BOT_AV;
        inner.appendChild(box); wrap.appendChild(av); wrap.appendChild(inner);
        CHAT().appendChild(wrap);
      }
      scroll_();
      inp.placeholder=t("hintTap");
    } else {
      inp.placeholder=ph||t("inputPh");
    }
    inp.focus();
    pendingText = v=>finish(v);
  });
}
let pendingText=null, activeChips=null;

/* ---------------- red-flag engine ---------------- */
/* Drug-interaction emergencies outrank a raw vital sign: a hypertensive reading
   caused by an MAOI needs MAOI-specific handling (no triptans, tell the ER what
   you take), and that advice would be lost under the generic BP warning. */
const SPECIFIC_FIRST=["maoi_crisis","serotonin_syndrome","thyroid_storm","cauda_equina","aortic_dissection","aaa",
  "nec_fasc","compartment","meningococcal","co_poisoning","glaucoma_acute","temporal_arteritis",
  "retinal_detach","dvt_pe","sepsis",
  // neuro
  "head_injury","subdural","tia","myasthenic_crisis","spinal_abscess",
  // cardiovascular
  "tamponade","limb_ischemia",
  // abdominal
  "perforation","pancreatitis","hernia_strangulated","cholangitis","splenic_rupture",
  "intussusception","pyloric_stenosis",
  // respiratory
  "pneumothorax","asthma_severe","epiglottitis",
  // obstetric & gynae
  "abruption","ovarian_torsion","pid_severe",
  // toxicology
  "paracetamol_od","digoxin_tox","lithium_tox","opioid_od","last_toxicity",
  // endocrine / renal / metabolic
  "adrenal_crisis","hypoglycemia","hyperkalemia","rhabdo","malignant_hyperthermia",
  // infectious / haematological / environmental
  "neutropenic_fever","sickle_crisis","crao","heat_stroke"];
/* People describe what they DON'T have, and a substring match can't tell the
   difference: "no chest pain" contains "chest pain", "poison ivy" contains
   "poison". Strip explicit denials before matching. Only reassurance phrases are
   removed — "no urine since noon" and "not able to pass urine" are findings, not
   denials, so they must survive. */
const NEG_SYMPTOMS="fever|chest pain|chest tightness|chest discomfort|blood|bleeding|numbness|weakness|"+
  "slurred speech|speech problems|tingling|vomiting|nausea|trouble breathing|difficulty breathing|"+
  "breathlessness|shortness of breath|short of breath|breathing trouble|heavy breathing|wheezing|"+
  "severe pain|pain|tenderness|chills|rigors|back pain|abdominal pain|vision changes|visual changes|"+
  "blurred vision|double vision|hearing loss|red streaks|phlegm|stridor|drooling|confusion|swelling|"+
  "rash|headache|dizziness|dizzy|lightheaded|fainting|faint|sweating|sweats|clammy|palpitations|"+
  "stiff neck|jaundice|yellowing|weight loss|incontinence|diarrhea|discharge|"+
  "redness|spreading redness|red streaks|streaks|tobacco|gutkha|floaters|flashes|lip swelling|face swelling|throat swelling|wheeze|wheezing|itching|lumps|black stools|black stool|blood in stool|blood in my stool|bloody stools|saddle numbness|bladder problems|bowel problems|leg weakness|red streaks|night sweats|weight loss|other symptoms|sudden changes|blood in|self harm|self-harm|suicidal thoughts|thoughts of harming";
function scrubNegations(low){
  /* Denials usually come as a list — "no hearing loss, weakness, or slurred
     speech" — so once a denial starts, keep consuming the comma-separated items.
     Stop at a conjunction that changes direction ("but", "however"), because
     what follows those is a real finding. */
  const denial=new RegExp(
    /* Allow descriptive words between the denial and the symptom — people write
       "no sharp lower-right abdominal pain", not "no abdominal pain". Missing
       this was sending a greasy-meal indigestion to hospital as appendicitis. */
    /* Denials come in many forms: "no X", "I'm not X", "doesn't hurt", "never had".
       Note NEG_SYMPTOMS deliberately excludes words like "urine", so genuine
       findings such as "not able to pass urine" are never stripped. */
    "\\b(?:no|not|without|denies|negative for|isn'?t|aren'?t|wasn'?t|doesn'?t|don'?t|didn'?t|hasn'?t|haven'?t|never)"+
    "\\s+(?:(?!but\\b|however\\b)[a-z-]+\\s+){0,3}(?:"+NEG_SYMPTOMS+")\\b"+
    /* Keep consuming the denial list ONLY while the next item is itself a
       recognised symptom. Previously any comma-separated clause was swallowed, so
       "no pain anywhere, lost appetite, vomited once, sweating" deleted every real
       finding after the denial and silenced an atypical heart attack. */
    "(?:\\s*,?\\s*(?:or\\s+|and\\s+)?(?:no\\s+|not\\s+)?(?:"+NEG_SYMPTOMS+")\\b)*", "g");
  return low
    .replace(denial," ")
    // plant names that merely contain an alarming word
    .replace(/\bpoison (?:ivy|oak|sumac)\b/g," plantrash ");
}
/* Which body region the person is describing, from the pain areas they picked.
   Regions that genuinely share advice are listed as neighbours; everything else
   is treated as incompatible. */
const AREA_REGION={ head:"head", eyes:"head", ear:"head", teeth:"head", throat:"head",
  chest:"chest", upabd:"abdomen", lowabd:"abdomen", urinary:"pelvis",
  back:"back", joints:"limb", muscles:"limb", skin:"skin" };
/* The airway is one continuous organ: a cold in the nose and a cough in the chest
   are the same illness moving. Treating head and chest as strangers made the guard
   delete the only evidence we had for the commonest complaint there is. */
const REGION_NEIGHBOURS={ head:["neck","chest"], neck:["head","back","chest"], chest:["neck","head"],
  abdomen:["pelvis"], pelvis:["abdomen"], back:["neck"], limb:[], skin:[] };
function complaintRegion(){
  if(!S || !S.pains || !S.pains.length) return null;
  const regs=[...new Set(S.pains.map(p=>AREA_REGION[p]).filter(Boolean))];
  return regs.length===1 ? regs[0] : null;   // only guard when the location is unambiguous
}

/* Chest pain reproduced by pressing on the spot or by a particular movement, with
   none of the systemic features, is chest-wall pain — not a heart or lung
   emergency. Reproducibility on palpation is one of the few genuinely useful
   discriminators here, so it's worth encoding rather than sending every sore rib
   to an ambulance. Any systemic feature cancels the suppression. */
function chestWallPattern(low){
  const reproducible=/(hurts?|pain|sore|tender)[^.]{0,40}\b(when i (?:press|push|touch|stretch|lift|twist|move)|on palpation|to touch|pressing on|press on)\b/.test(low)
    || /\b(press|pressing|push) (?:on )?my (?:ribs?|chest|sternum|breastbone)\b/.test(low);
  const systemic=/\b(short of breath|breathless|gasping|blue lips|sweating|clammy|radiat|to my jaw|to my arm|faint|collaps|dizzy|palpitation|cough(?:ing)? blood|tracheal)\b/.test(low);
  return reproducible && !systemic;
}
/* A cold that has outstayed its welcome is not a cold. The two discriminators
   doctors actually use are DURATION (symptoms past ~10 days without improving,
   or worsening after an initial improvement) and ONE-SIDEDNESS — a viral cold is
   symmetrical, a blocked sinus usually is not. Neither was encoded, so a textbook
   sinusitis narrative scored zero on sinusitis and won on "common cold", whose
   plan says it clears in 3-5 days. That is the wrong plan, not just the wrong label. */
function sinusPattern(low, dur){
  const coldSx=/\b(cold|runny nose|blocked nose|nose (?:is |has been )?(?:completely )?blocked|stuffy|sneez|congest|nasal)\b/.test(low);
  if(!coldSx) return null;
  let days=0;
  const m=/\b(\d{1,2})\s*(?:\+)?\s*(day|days|din)\b/.exec(low);
  if(m) days=+m[1];
  if(/\b(two|three|four|2|3|4)\s*weeks?\b/.test(low)) days=Math.max(days,14);
  else if(/\b(a |one )?week\b/.test(low)) days=Math.max(days,7);
  if(dur==="weeks") days=Math.max(days,14);
  else if(dur==="week") days=Math.max(days,7);
  const lingering = days>=7 || /\b(not going away|hasn'?t gone|still not better|getting worse|worse again|since (?:more than )?a week)\b/.test(low);
  const unilateral = /\b(one side|left side|right side|one nostril|left nostril|right nostril|especially the left|especially the right|only on the left|only on the right)\b/.test(low);
  const purulent = /\b(yellow|green|thick)\b[^.]{0,20}\b(mucus|discharge|phlegm|snot)\b/.test(low)
                || /\b(pain|pressure|heavy|heaviness)\b[^.]{0,20}\b(face|cheek|forehead|behind (?:my )?eyes?)\b/.test(low);
  if(!lingering && !unilateral && !purulent) return null;
  return {lingering, unilateral, purulent, days};
}
function keywordFlag(text){
  const low=scrubNegations(" "+text.toLowerCase()+" ");
  /* Gather every candidate — patterns, quoted vital signs, plain keywords — then
     let clinical precedence decide, rather than whichever rule happened to run first. */
  let candidates=patternFlags(low);
  // a hallmark sign decides the answer on its own — that is what makes it a hallmark
  (DB.hallmarks||[]).forEach(h=>{ if(h.flag && h.sign.test(low) && !candidates.includes(h.flag)) candidates.push(h.flag); });
  if(chestWallPattern(low)) candidates=candidates.filter(id=>!["cardiac","pneumothorax","aortic_dissection"].includes(id));
  const v=vitalsFlag(low); if(v && !candidates.includes(v)) candidates.push(v);
  const wall=chestWallPattern(low);
  for(const rf of DB.redFlagKeywords){
    if(wall && ["cardiac","pneumothorax","aortic_dissection"].includes(rf.id)) continue;
    for(const k of rf.k){ if(low.includes(k)){ if(!candidates.includes(rf.id)) candidates.push(rf.id); break; } }
  }
  return candidates.length ? rankFlags(candidates, low) : null;
}

/* Read "30 M", "30, male", "45/F", "f 22", "28 साल पुरुष" etc. from one answer.
   Returns nulls for whatever it couldn't read, so the flow can ask just that part. */
function parseAgeSex(txt){
  const low=String(txt||"").toLowerCase();
  let age=null, sex=null, months=null;
  /* "10-month-old" must not become a 10-year-old. Reading the unit is the whole
     safety story in paediatrics: honey, cough syrups and every mg/kg dose hinge
     on it, and a bare number is silently interpreted as years. Months first. */
  const mo=/\b(\d{1,3})\s*(?:-|\s)?\s*(month|months|mnth|mah[ie]ne|maheena|mahina)\b/.exec(low);
  const wk=/\b(\d{1,3})\s*(?:-|\s)?\s*(week|weeks|hafte|hafta)\b/.exec(low);
  const dy=/\b(\d{1,3})\s*(?:-|\s)?\s*(day|days|din)\s*(?:-|\s)?\s*old\b/.exec(low);
  const yr=/\b(\d{1,3})\s*(?:-|\s)?\s*(year|years|yr|yrs|saal|sal|varsh|barah)\b/.exec(low);
  if(dy)       months = +dy[1]/30;
  else if(wk)  months = +wk[1]/4.345;
  else if(mo)  months = +mo[1];
  else if(yr)  months = +yr[1]*12;
  else if(/\b(newborn|new born|navjat)\b/.test(low)) months=0.2;
  else if(/\b(infant|baby|shishu)\b/.test(low) && !/\byear|saal\b/.test(low)) months=null; // unknown, but flag it
  if(months!==null && months<=1440){ age=Math.floor(months/12); }
  else {
    const am=/\b(\d{1,3})\b/.exec(low);
    if(am){ const n=+am[1]; if(n>=0 && n<=120) age=n; }
  }
  const male   =/(^|[^a-z])(m|male|man|boy|मेल|पुरुष|लड़का|aadmi|ladka|ஆண்|పురుషుడు|പുരുഷൻ)([^a-z]|$)/;
  const female =/(^|[^a-z])(f|female|woman|girl|lady|फीमेल|महिला|स्त्री|औरत|लड़की|aurat|ladki|பெண்|స్త్రీ|സ്ത്രീ)([^a-z]|$)/;
  const other  =/(^|[^a-z])(o|other|trans|non.?binary|अन्य|மற்ற|ఇతర|മറ്റ്)([^a-z]|$)/;
  if(female.test(low))      sex="F";     // test female first: "female" contains "male"
  else if(male.test(low))   sex="M";
  else if(other.test(low))  sex="O";
  return {age, sex, months};
}

/* One canonical age in months for every safety decision. Returns null when we
   simply do not know — and "unknown" must behave like "could be an infant"
   wherever a paediatric contraindication exists. */
function ageMonths(){
  // may be called before the session exists (rule engine, test harnesses)
  const st = (typeof S!=="undefined") ? S : null;
  if(st && st.ageMonths!==null && st.ageMonths!==undefined) return st.ageMonths;
  if(st && typeof st.age==="number") return st.age*12;
  return null;
}
function isInfant(){ const m=ageMonths(); return m!==null && m<12; }
function isUnderFour(){ const m=ageMonths(); return m!==null && m<48; }

/* The age question is asked before we know WHO the patient is. A parent answers
   it about themselves and then writes "my 10-month-old has a cough" — leaving
   every dose and every contraindication computed for a 30-year-old. So the
   complaint is re-read for the patient's real age, and a child named there wins.
   Deliberately conservative: an age is only accepted when it is anchored to
   "old" or sits beside a word for a child, so that "cough for 8 days" and
   "started 3 weeks ago" are never mistaken for somebody's age. */
const CHILD_WORD=/\b(baby|babies|infant|newborn|new born|toddler|child|kid|son|daughter|grandson|granddaughter|nephew|niece|bachch?a|bachch?i|bachch?e|beta|beti|ladka|ladki|shishu|navjat|munna|munni)\b/i;
function narrativeAge(text){
  const low=" "+String(text||"").toLowerCase()+" ";
  const anchored=[
    [/\b(\d{1,2})\s*(?:-|\s)?\s*months?\s*(?:-|\s)?\s*old\b/, m=>+m[1]],
    [/\b(\d{1,2})\s*(?:-|\s)?\s*weeks?\s*(?:-|\s)?\s*old\b/,  m=>+m[1]/4.345],
    [/\b(\d{1,3})\s*(?:-|\s)?\s*days?\s*(?:-|\s)?\s*old\b/,   m=>+m[1]/30],
    [/\b(\d{1,2})\s*(?:-|\s)?\s*(?:years?|yrs?|saal)\s*(?:-|\s)?\s*old\b/, m=>+m[1]*12]
  ];
  for(const [re,f] of anchored){ const m=re.exec(low); if(m) return f(m); }
  // "my son is 7", "beta 2 saal ka", "baby is 10 months"
  const UNIT="(months?|mahine|weeks?|hafte|saal|years?|yrs?)";
  const toMonths=(n,unit)=> /month|mahine/.test(unit) ? n
                          : /week|hafte/.test(unit)   ? n/4.345
                          : n*12;
  const near=new RegExp("\\b(?:baby|infant|newborn|toddler|child|kid|son|daughter|bachcha|bachchi|beta|beti|shishu)\\b[^.]{0,25}?\\b(\\d{1,2})\\s*"+UNIT+"\\b").exec(low)
          || new RegExp("\\b(\\d{1,2})\\s*"+UNIT+"\\b[^.]{0,25}?\\b(?:ka|ki|old)?\\s*(?:baby|infant|newborn|toddler|child|kid|son|daughter|bachcha|bachchi|beta|beti|shishu)\\b").exec(low);
  if(near) return toMonths(+near[1], near[2]);
  /* "my son is 7" — a bare number beside a child word means years, but only when
     no unit follows it, or "baby is 6 weeks" silently becomes a six-year-old. */
  const bare=/\b(?:my |mera |meri )?(?:son|daughter|baby|child|kid|beta|beti|bachcha|bachchi)\s+(?:is\s+)?(\d{1,2})\b(?!\s*(?:month|week|day|mahine|hafte|din))/.exec(low);
  if(bare){ const n=+bare[1]; if(n<=18) return n*12; }
  return null;
}
/* True when the complaint is clearly about a child but gives us no age. Unknown
   must not silently mean "adult" — that is the failure mode we are fixing. */
function mentionsChildNoAge(text){
  return CHILD_WORD.test(String(text||"")) && narrativeAge(text)===null;
}

/* Numbers people quote in passing are often the most important thing they've said.
   "my cuff reads 195/115" is a hypertensive emergency whatever they think it is. */
function vitalsFlag(low){
  // blood pressure written as 195/115, 195 / 115, "bp 195 over 115"
  const bp=/\b(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/g;
  let m;
  while((m=bp.exec(low))!==null){
    const sys=+m[1], dia=+m[2];
    if(sys>=60 && sys<=300 && dia>=30 && dia<=200 && sys>dia){   // sanity-check it really is a BP
      if(sys>=180 || dia>=120) return "hypertensive_crisis";
    }
  }
  // temperature quoted in the narrative
  const tm=/\b(\d{2,3}(?:\.\d)?)\s*(?:°|deg(?:rees)?\s*)?f\b/.exec(low);
  if(tm){ const f=parseFloat(tm[1]); if(f>=106 && f<=115) return "breathing"; }
  const tc=/\b(\d{2}(?:\.\d)?)\s*(?:°|deg(?:rees)?\s*)?c\b/.exec(low);
  if(tc){ const c=parseFloat(tc[1]); if(c>=41 && c<=46) return "breathing"; }
  // oxygen saturation
  const spo2=/\b(?:spo2|oxygen|sat(?:uration)?s?)\D{0,12}(\d{2,3})\s*%?/.exec(low);
  if(spo2){ const o=+spo2[1]; if(o>=50 && o<=94) return "breathing"; }
  // resting heart rate — "145 bpm", "heart rate 145", "pulse of 145"
  const hr=/\b(\d{2,3})\s*bpm\b/.exec(low)
        || /\b(?:heart\s*rate|pulse|hr)\D{0,10}(\d{2,3})\b/.exec(low);
  if(hr){ const b=+hr[1]; if(b>=130 && b<=260) return "tachy_severe";
          if(b>0 && b<=40) return "tachy_severe"; }   // dangerously slow needs the same urgency
  return null;
}
/* Combination red flags: fires only when every `need` group has a hit.
   Catches things no single phrase reveals — e.g. appendicitis is "started near
   my navel, moved to the lower right, worse when I cough". */
function patternFlag(low){
  const all=patternFlags(low);
  return all.length ? rankFlags(all) : null;
}
/* Every rule that matches, not just the first. A description can legitimately
   satisfy several — pregnancy with a headache and visual disturbance matches both
   pre-eclampsia and retinal detachment — and picking by array position hands out
   confidently wrong advice. */
/* How long has this been going on, in DAYS.
   Duration is a number with a unit, but every rule so far compared it as a
   string — which is why "hoarse for 6 weeks" missed a rule written for "more
   than three weeks", and why "past 8 day" needed its own special case. Parsing
   it once, centrally, lets rules state a real threshold (minDays) and removes
   a whole class of misses instead of one at a time. */
function parseDuration(text){
  const low=" "+String(text||"").toLowerCase()+" ";
  const W={day:1,days:1,din:1,week:7,weeks:7,wk:7,wks:7,hafte:7,hafta:7,
           month:30,months:30,mahine:30,mahina:30,year:365,years:365,saal:365,varsh:365,
           hour:1/24,hours:1/24,hrs:1/24,ghante:1/24,minute:1/1440,minutes:1/1440};
  const WORD={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
              eleven:11,twelve:12,couple:2,few:3,several:4};
  let best=null;
  // "for 6 weeks", "since 3 days", "past 8 day", "more than a month", "2-3 hours"
  const re=/\b(?:for|since|from|past|last|over)?\s*(?:more than|over|about|around|nearly|almost)?\s*(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|several)\s*(?:-\s*\d{1,3}\s*)?(?:of\s+)?(day|days|din|week|weeks|wk|wks|hafte|hafta|month|months|mahine|mahina|year|years|saal|varsh|hour|hours|hrs|ghante|minute|minutes)\b/g;
  let m;
  while((m=re.exec(low))!==null){
    const n = /^\d+$/.test(m[1]) ? +m[1] : (WORD[m[1]]||null);
    if(n===null) continue;
    const d = n*(W[m[2]]||0);
    if(d>0 && (best===null || d>best)) best=d;   // longest stated span wins
  }
  if(best===null){
    if(/\b(yesterday|last night|since morning|today|this morning)\b/.test(low)) best=1;
    else if(/\b(chronic|for years|since childhood|long time|months now)\b/.test(low)) best=180;
  }
  return best;
}
function patternFlags(low){
  const hay = typeof low==="string" ? (low.startsWith(" ")?low:" "+low.toLowerCase()+" ") : "";
  const hits=[];
  if(!hay || !DB.redFlagPatterns) return hits;
  const m = (typeof ageMonths==="function") ? ageMonths() : null;
  const yrs = m===null ? null : m/12;
  for(const rule of DB.redFlagPatterns){
    /* Some diagnoses ARE an age plus a symptom. Giant cell arteritis is a
       different disease from a sore jaw joint only because the patient is over
       50; without age the pattern engine cannot tell them apart, and gets it
       wrong in the direction that costs eyesight. Age unknown never blocks a
       rule — it only ever fails safe towards firing. */
    if(rule.minAge!==undefined && yrs!==null && yrs < rule.minAge) continue;
    if(rule.maxAge!==undefined && yrs!==null && yrs > rule.maxAge) continue;
    /* Numeric duration thresholds. Unknown duration never blocks a rule. */
    if(rule.minDays!==undefined){ const d=parseDuration(hay); if(d!==null && d < rule.minDays) continue; }
    if(rule.maxDays!==undefined){ const d=parseDuration(hay); if(d!==null && d > rule.maxDays) continue; }
    /* A term starting with "~" is a regex. People pad their sentences —
       "hurts a bit to chew" is the same finding as "hurts to chew", and a
       substring list can never catch every filler word someone drops in. */
    const has = term => term.charAt(0)==="~" ? new RegExp(term.slice(1)).test(hay) : hay.includes(term);
    const needsOk = (rule.need||[]).every(group => group.some(has));
    const anyOk   = !rule.any || rule.any.some(has);
    if(needsOk && anyOk && !hits.includes(rule.id)) hits.push(rule.id);
  }
  return hits;
}
/* Clinical precedence when several fire. Roughly: reversible-in-minutes first,
   then things where the specific advice differs most from the generic version. */
const FLAG_PRIORITY=[
  "anaphylaxis","opioid_od","last_toxicity","malignant_hyperthermia","adrenal_crisis","hypoglycemia",
  // named conditions the person told us about outrank look-alike syndromes:
  // "I have myasthenia gravis" is far stronger evidence than a throat-symptom match
  "myasthenic_crisis",
  // an atypical heart attack outranks the metabolic reading of the same symptoms:
  // being wrong towards "cardiac" is survivable, the reverse often isn't
  "atypical_acs",
  "aortic_dissection","tamponade","pneumothorax","asthma_severe",
  // a quoted BP in the emergency range, or a calf clot with chest signs, beats a
  // generic chest-pain or eye match built from softer clues
  // a named drug or named diagnosis beats the generic syndrome that shares its signs:
  // an MAOI reaction needs MAOI handling, not just "your BP is high"
  "maoi_crisis","serotonin_syndrome","nms","thyroid_storm","lithium_tox","digoxin_tox","paracetamol_od",
  "ludwig","epiglottitis","breathing","adrenal_crisis",
  "hypertensive_crisis","dvt_pe","cardiac",
  "tia","stroke","head_injury","headache_worst","meningococcal","meningitis","sepsis","neutropenic_fever",
  "dka","hyperkalemia","heat_stroke",
  "preeclampsia","abruption","preg_bleed","ectopic","ovarian_torsion","torsion",
  "cauda_equina","spinal_abscess","limb_ischemia","compartment","nec_fasc","splenic_rupture",
  "perforation","hernia_strangulated","cholangitis","obstruction","appendicitis","intussusception",
  "pancreatitis","aaa","acute_abdomen","gi_bleed","pyloric_stenosis","pid_severe",
  "temporal_arteritis","crao","glaucoma_acute","retinal_detach",
  "poison","tachy_severe",
  "subdural","rhabdo","sickle_crisis","co_poisoning","hemoptysis",
  "hematuria","seizure","unconscious","crisis","dehydration",
  /* Time-windowed rather than life-threatening. They rank below the emergencies
     but must still outrank the generic self-care entries that share their
     vocabulary — a torn Achilles reads as an ankle sprain, a scaphoid fracture
     as a wrist sprain, and both lose the window if we let the generic win. */
  "quinsy","sudden_hearing_loss","achilles_rupture","scaphoid","haematuria_painless"
];
/* A few alarms have an everyday explanation that is far commoner than the
   emergency, and firing them anyway teaches people to ignore us. Each guard
   names the benign reading AND the findings that would override it — the flag
   is only dropped when the innocent explanation is stated and not one of the
   danger signs is. Guards apply to the reader's flag as well as the rules',
   because the model over-calls the same three. */
const FLAG_GUARDS={
  // black stool on iron tablets or bismuth is expected and harmless
  gi_bleed:{
    benign:["iron tablet","iron tablets","iron supplement","iron pill","ferrous","fefol","orofer","livogen","iron syrup",
            "bismuth","pepto","started iron","taking iron","on iron","beetroot","black liquorice","charcoal"],
    danger:["blood","bloody","vomit","fresh red","clot","dizzy","dizziness","faint","lightheaded","collapse",
            "weak","weakness","pale","severe pain","racing heart","breathless","tarry and","large amount"]
  },
  // anaemia is only an emergency once the heart stops keeping up
  severe_anemia:{
    benign:[""],                                   // always evaluated: needs positive evidence
    danger:["at rest","resting","breathless at rest","short of breath at rest","chest pain","faint","fainted",
            "fainting","collapse","collapsed","cannot stand","can't stand","unable to stand","racing heart",
            "heart racing","palpitation","pounding heart","toddler","infant","baby","months old","gums are white",
            "lips are white","ghostly","hb 5","hb 6","hb of 5","hb of 6","black tarry","bleeding heavily",
            "confused","drowsy"]
  },
  /* Dengue is only "severe dengue" once a WHO warning sign appears — and those
     appear as the fever FALLS. Calling every dengue-shaped fever an emergency
     sends half a monsoon to casualty and teaches people to ignore the one time
     it matters. Feeling weak is not a warning sign. */
  dengue_severe:{
    benign:[""],
    danger:["severe abdominal","severe belly","severe stomach pain","bad stomach pain","persistent vomit","keeps vomiting",
            "cannot keep","bleeding gum","gums bleed","nose bleed","nosebleed","blood in vomit","black stool","blood in stool",
            "red spots","rash spreading","faint","fainted","dizzy on standing","cold and clammy","clammy","restless",
            "very drowsy","lethargic","not passing urine","platelet","fever has come down","fever dropped","fever broke",
            "breathless","swollen belly","liver pain"]
  },
  /* Kidney infection needs the kidney in the picture: loin/flank pain or urinary
     symptoms. Fever plus a vague belly ache is a hundred other things. */
  pyelonephritis_flag:{
    benign:[""],
    danger:["loin","flank","kidney","side of my back","back pain with fever","burning urine","burning while passing",
            "burning when i pass","passing urine","urine","peshab","urin","frequency","rigors","shivering with fever",
            "chills and fever","foul smelling urine","cloudy urine","blood in urine"]
  },
  // "short of breath" said calmly in a paragraph is not "severe difficulty breathing"
  breathing:{
    benign:[""],
    danger:["at rest","can't breathe","cannot breathe","can't speak","cannot speak","unable to speak","full sentence",
            "gasping","gasp","blue lips","lips are blue","struggling to breathe","fighting for breath","suffocating",
            "saans nahi","dam ghut","severe","severely","badly","worst","desperate","sitting up to breathe",
            "cannot lie flat","spo2","oxygen","o2 sat","drowning"]
  }
};
function guardDrops(id, low){
  const g=FLAG_GUARDS[id]; if(!g) return false;
  const has=list=>list.some(w=>w && low.includes(w));
  if(has(g.danger)) return false;                  // a danger sign always wins
  return g.benign.length===1 && g.benign[0]==="" ? true : has(g.benign);
}
function rankFlags(ids, low){
  const src=(low!==undefined && low!==null) ? String(low) : "";
  const kept=ids.filter(id=>!guardDrops(id, src));
  ids = kept.length ? kept : [];
  let best=null, bestRank=Infinity;
  for(const id of ids){
    const r=FLAG_PRIORITY.indexOf(id);
    const rank = r<0 ? FLAG_PRIORITY.length : r;   // unknown ids sort last but still count
    if(rank<bestRank){ bestRank=rank; best=id; }
  }
  return best;
}
async function emergencyStop(id, reason){
  S.emergency=id;
  S.emergencyReason=reason||null;
  let msg=DB.emergencyAdvice[id]||"";
  // the reader's own words for WHY, kept separate from our safety instructions
  if(reason) msg = String(reason).replace(/\s+/g," ").trim() + " — " + msg;
  /* For ambiguous presentations, don't assert one disease. Show what has to be
     ruled out, so nobody is steered down a single wrong path. */
  const diffs=(DB.emergencyDifferentials||{})[id];
  const diffHtml = diffs && diffs.length
    ? `<div class="diffs"><b>${t("couldBe")}</b><ul>${diffs.map(d=>`<li>${esc(d)}</li>`).join("")}</ul></div>` : "";
  /* Headline states the urgency, not the diagnosis, whenever the picture is
     ambiguous — a confident wrong label is worse than an honest urgent one. */
  /* Three levels, not one. Calling a non-healing mouth ulcer an EMERGENCY both
     frightens people and teaches them to discount the banner when it matters. */
  const urgent=(DB.urgentIds||[]).includes(id);
  const headline = urgent ? t("emerg_urgent")
                 : (diffs && diffs.length ? t("emerg_generic") : t("emerg_now"));
  await addBot(`<div class="emg"><b>${headline}</b><br>${esc(msg)}${diffHtml}<br>${urgent ? t("urgent_msg") : t("emerg_msg")}</div>
  <h3>${t("while_wait")}</h3><ul>
  <li>Stay with the person; keep them calm, seated or lying as comfortable.</li>
  <li>Do not give food/drink if drowsy, having chest pain, or a possible stroke/surgery situation.</li>
  <li>Carry current medicines & any recent reports to the hospital.</li></ul>`, 500);
  S.cond = DB.conds.find(c=>c.id==="generic"); S.step="post"; saveHistory(); renderHistory();
  await addBot(t("askMore"), 400);
}

/* ---------------- condition matching ---------------- */
function editLe1(a,b){ // true if edit distance <= 1
  if(a===b) return true; if(Math.abs(a.length-b.length)>1) return false;
  let i=0,j=0,d=0;
  while(i<a.length && j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++d>1) return false;
    if(a.length>b.length) i++; else if(b.length>a.length) j++; else {i++;j++;}
  }
  return d+(a.length-i)+(b.length-j)<=1;
}
function scoreConditions(){
  /* Route on what the person HAS, not on words they used to rule things out.
     Red flags have been negation-aware for a while; condition routing was not,
     so "no fever no back pain" scored `fever` and beat the actual complaint.
     People describing symptoms list denials constantly — this is not an edge case. */
  const raw=S.complaint.toLowerCase().replace(/[‘’]/g,"'").replace(/[“”]/g,'"');
  const text=scrubNegations(" "+raw+" ").trim();
  const sc={};
  const toks=text.split(/[^a-z0-9]+/).filter(x=>x.length>=4);
  /* Specificity, not just presence. "white spots on tonsils" and "fever" both
     scored 3, so a four-sign strep picture tied with the single word every
     febrile illness contains. A phrase a patient only says when they have THIS
     condition is worth far more than a symptom shared by everything. */
  const aliasWeight=a=>{ const w=a.trim().split(/\s+/).length;
    return w>=4?9 : w===3?7 : w===2?5 : a.length>4?3:2; };
  DB.conds.forEach(c=>{ let s=0;
    c.al.forEach(a=>{
      if(text.includes(a)) { s+=aliasWeight(a); return; }
      if(a.length>=5 && !a.includes(" ") && toks.some(tk=>editLe1(tk,a))) s+=2; // typo-tolerant ("hedache","khaansi")
    });
    sc[c.id]=s; });
  S.pains.forEach(p=>{ (DB_PAIN_MAP[p]||[]).forEach(cid=>{ if(cid!=="CHEST_SPECIAL") sc[cid]=(sc[cid]||0)+2; }); });
  if(S.temp && S.temp>=100.4){ sc.fever=(sc.fever||0)+2; sc.flu=(sc.flu||0)+1; }
  if(S.feverKind==="warm"){ sc.fever=(sc.fever||0)+1; }
  /* Anatomy guard. Advice is written for a body region — "elevate above heart
     level" only means something for a limb. Blocking cross-region matches makes
     the ankle-advice-for-a-rib-cage class of error structurally impossible,
     rather than something I patch one condition at a time. */
  const region=complaintRegion();
  if(region){
    DB.conds.forEach(c=>{
      if(!c.rg || c.rg==="systemic" || c.rg===region) return;
      if(region==="skin" || c.rg==="skin") { sc[c.id]=0; return; }   // skin advice never transfers
      if(!REGION_NEIGHBOURS[region] || !REGION_NEIGHBOURS[region].includes(c.rg)) sc[c.id]=0;
    });
  }
  /* Pain reproducible by pressing or by one movement is chest-wall pain. It must
     land on its own entry, not the limb-injury plan — "elevate above heart level"
     and "compression bandage" are meaningless for a rib and unsafe for a chest. */
  if(chestWallPattern(scrubNegations(" "+text+" "))){
    sc.costochondritis=(sc.costochondritis||0)+8;
    sc.sprain=Math.max(0,(sc.sprain||0)-4);
  }
  /* A hallmark sign names the condition outright. Without this, a specific
     injury with a specific management path collapses into whichever generic
     entry shares the most words with it. */
  (DB.hallmarks||[]).forEach(h=>{ if(h.cond && h.sign.test(text)) sc[h.cond]=(sc[h.cond]||0)+20; });
  /* The dangerous look-alike. Over 50, "temple headache + hurts to chew" is
     giant cell arteritis until an ESR/CRP says otherwise — and the jaw-joint
     plan (soft diet, night guard, wait it out) burns exactly the days in which
     sight is lost. The red flag above should already have fired; this makes
     sure that even if it did not, we never hand this person the TMJ plan. */
  {
    const yrs = ageMonths()===null ? null : ageMonths()/12;
    const temporal=/\b(temple|temporal|side of (?:my )?head)\b/.test(text);
    const chew=/(hurt|pain|ache|sore|tired|difficult|hard)\w*\b[^.]{0,25}?\b(?:to |when |while )?chew|chew\w*\b[^.]{0,25}?\b(hurt|pain|ache|tired)/.test(text);
    if(yrs!==null && yrs>=50 && temporal && chew){ sc.tmj=0; }
  }
  /* Duration and one-sidedness separate sinusitis from the cold it started as. */
  const sn=sinusPattern(" "+text+" ", S.dur);
  if(sn){
    sc.sinusitis=(sc.sinusitis||0)+(sn.lingering?5:0)+(sn.unilateral?4:0)+(sn.purulent?3:0);
    if(sn.lingering) sc.cold=Math.max(0,(sc.cold||0)-4);   // it has stopped being a simple cold
  }
  /* CONTAINER conditions describe a single symptom that nearly every illness
     produces. "Fever" matches a typhoid story, a diverticulitis story and a
     strep throat story equally well, so it wins on vocabulary while saying
     nothing useful — the same attractor behaviour that made every limb injury
     a "sprain". They only win when nothing more specific has real support. */
  const CONTAINER=["fever","headache","cough","generic","fatigue","stomach_pain","joint_pain","rash","dizziness"];
  let bestSpecific=0;
  for(const id in sc){ if(!CONTAINER.includes(id) && sc[id]>bestSpecific) bestSpecific=sc[id]; }
  if(bestSpecific>=3) CONTAINER.forEach(id=>{ if(sc[id]!==undefined) sc[id]=Math.min(sc[id], bestSpecific-1); });

  // the narrative reader's opinion counts, but doesn't override a strong keyword match
  if(S.llmHint) sc[S.llmHint]=(sc[S.llmHint]||0)+3;
  S.scores=sc;
  let best=null,bs=0; for(const id in sc){ if(sc[id]>bs){ bs=sc[id]; best=id; } }

  /* A fit FLOOR, not just a winner. Previously the highest score won even at 1/50,
     so a complaint we don't cover was handed the nearest plan with full confidence.
     Below the floor we say so instead — the honest answer is better care than a
     confident wrong one, and it's what stops this failing again for whatever
     complaint isn't in the catalogue. */
  const FIT_FLOOR=3;
  /* A weak keyword match is acceptable when the reader independently named the
     same condition — two mechanisms agreeing is worth more than one strong
     keyword hit. Everything else below the floor falls back honestly. */
  const corroborated = S.llmHint && S.llmHint===best && bs>=2;
  if(!best || (bs<FIT_FLOOR && !corroborated)) best="generic";

  /* The reader names the condition, not the keyword score. Measured over 100
     fresh cases the reader routed correctly 92% of the time against the rules'
     54%, so treating its answer as a mere +3 hint — which a strong-but-wrong
     keyword like "fever" could outvote — was throwing away the better signal.
     The region guard still applies: if the reader names something that can't be
     where the person says their problem is, we fall back rather than force it. */
  const theirs = S.llmHint ? DB.conds.find(c=>c.id===S.llmHint) : null;
  if(theirs){
    const region=complaintRegion();
    const regionOk = !region || !theirs.rg || theirs.rg==="systemic" || theirs.rg===region ||
      (REGION_NEIGHBOURS[region]||[]).includes(theirs.rg);
    if(regionOk) best = theirs.id;
  }
  S.fit=bs;
  return DB.conds.find(c=>c.id===best);
}
/* Confidence must describe the answer we actually gave, not the keyword spread.
   Printing "General health concern — Confidence: High" is a contradiction, and
   scoring a condition the reader named by how well a DIFFERENT condition's
   keywords matched is meaningless. Both were possible before. */
function confidence(){
  const id=S.cond && S.cond.id;
  if(!id || id==="generic") return "Preliminary";     // we said we don't know; that is not confidence
  const sc=S.scores||{};
  const vals=Object.values(sc).sort((a,b)=>b-a);
  const mine=sc[id]||0, second=vals.find(v=>v!==mine) ?? 0;
  if(S.llmHint===id){
    // reader and keywords agree, and nothing else scores near it
    if(mine>=6 && mine-second>=3) return "High";
    return "Moderate";                                // reader alone is a real answer, not a strong one
  }
  if(mine>=6 && mine-second>=3) return "High";
  if(mine>=3) return "Moderate";
  return "Preliminary";
}

/* ---------------- personalisation filters ---------------- */
/* ---------------- paediatric safety gate ----------------
   Age was captured but never used to filter a single medicine, so a 10-month-old
   was being offered honey (infant botulism), dextromethorphan and guaifenesin
   (no proven benefit, real harm, banned in this age group), and adult doses.
   These are hard blocks, not warnings: text a parent can read past is not a
   safeguard. Screened by SUBSTANCE, so it holds for the Ayurvedic list too —
   honey is honey whichever section of the page it appears in. */
const PEDS_RULES=[
  { maxMonths:12, test:/\bhoney\b|\bshahad\b|\bmadhu\b/i,
    why:"honey is never safe under 1 year — risk of infant botulism" },
  { maxMonths:48, test:/dextromethorphan|guaifenesin|cough syrup|bromhexine|codeine|pholcodine|expectorant|chlorphenir|cetirizine syrup|antihistamine/i,
    why:"cough and cold syrups are not to be given under 4 years — no benefit, and real risk" },
  { maxMonths:6,  test:/\bibuprofen\b|\bnsaid\b|\bnimesulide\b|\bdiclofenac\b|\bmefenamic\b/i,
    why:"ibuprofen and similar painkillers are avoided under 6 months" },
  { maxMonths:192, test:/\baspirin\b|acetylsalicylic/i,
    why:"aspirin is never given under 16 — risk of Reye's syndrome" },
  { maxMonths:24, test:/\bnimesulide\b/i, why:"nimesulide is not for children" },
  { maxMonths:60, test:/oxymetazoline|xylometazoline|nasal decongestant drop|phenylephrine|pseudoephedrine/i,
    why:"decongestant drops and tablets are avoided in young children" },
  { maxMonths:12, test:/\bsteam inhalation\b|\bsteam\b/i,
    why:"steam inhalation is a scald risk in a baby — use a humid room instead, never a bowl of hot water" },
  { maxMonths:24, test:/\bgargle\b|\bgargling\b|\blozenge\b|salt water gargle/i,
    why:"a toddler cannot gargle safely, and lozenges are a choking risk" },
  { maxMonths:12, test:/\bpepper\b|\btrikatu\b|\bpippali\b|\bginger juice\b|\brock candy\b|\bmishri\b|\bghee paste\b|churna|kadha|\bkwath\b|arishta|asava|guggulu|\bchyawanprash\b/i,
    why:"classical churnas, kadhas and pepper preparations are not for infants — an Ayurvedic paediatrician must dose these" },
  { maxMonths:6,  test:/\bwater\b.{0,20}\b(sip|drink|give|offer)\b|\bORS\b.{0,30}\bhome\b|\bjaggery\b|\bcow'?s milk\b|\bsugar water\b/i,
    why:"under 6 months nothing but breast milk or formula unless a doctor says otherwise" },
  /* Any fixed millilitre or teaspoon dose is an adult dose unless it says otherwise.
     Handing a parent "10 ml twice daily" for a baby is the same error as the
     syrups above, just wearing a herbal label. */
  { maxMonths:24, test:/\b\d+\s*(ml|tsp|teaspoon|tablespoon|tbsp)\b/i,
    why:"this is an adult measure — a child's dose must be worked out by weight with a paediatrician" }
];
/* Warnings, not blocks: the advice stands but must not be read as an adult dose. */
const PEDS_WARN=[
  { maxMonths:216, test:/paracetamol|acetaminophen|crocin|calpol|dolo/i,
    why:"for a child, paracetamol is 15 mg per kg per dose, max 4 doses in 24 hours — get your pharmacist to convert that to millilitres for your child's weight" },
  { maxMonths:216, test:/\bibuprofen\b|\bbrufen\b|\bcombiflam\b/i,
    why:"for a child, ibuprofen is 10 mg per kg per dose and only if they are drinking well — confirm the millilitres with your pharmacist" }
];
/* Returns {ok, why} — same shape as medAllowed, so callers need no special case. */
function pedsCheck(text){
  const m=ageMonths();
  if(m===null || m>=216) return {ok:true, why:null};    // adult, or age unknown
  for(const r of PEDS_RULES){
    if(m < r.maxMonths && r.test.test(text)) return {ok:false, why:r.why};
  }
  for(const r of PEDS_WARN){
    if(m < r.maxMonths && r.test.test(text)) return {ok:true, why:r.why};
  }
  return {ok:true, why:null};
}
function medAllowed(item){
  const f=item.f||"";
  // age first: a paediatric contraindication outranks every other consideration
  const peds=pedsCheck(item.t||"");
  if(!peds.ok) return peds;
  if(S.preg){ if(f==="nsaid"||f==="decong"||f==="lax_stim") return {ok:false, why:"avoided in pregnancy"}; }
  if(S.allergies.includes("nsaid") && f==="nsaid") return {ok:false, why:"you reported painkiller (NSAID) allergy"};
  if(S.conds.includes("ulcer") && f==="nsaid") return {ok:false, why:"avoided with stomach ulcer — use paracetamol instead"};
  if(S.conds.includes("kid") && f==="nsaid") return {ok:false, why:"avoided in kidney/liver problems"};
  if(S.conds.includes("bp") && f==="decong") return {ok:false, why:"decongestants raise BP — skip"};
  if(S.conds.includes("asthma") && f==="nsaid") return {ok:true, why:"caution: some asthmatics react to ibuprofen — prefer paracetamol"};
  return {ok:true, why:null};
}
function personalNotes(){
  const notes=[];
  if(S.who==="child") notes.push(t("childNote"));
  if(S.preg) notes.push(t("pregNote"));
  if(S.conds.includes("dm")) notes.push("Diabetes noted: watch sugars during illness; any foot wound or non-healing infection → doctor same day.");
  if(S.conds.includes("bp")) notes.push("High BP noted: avoided decongestants; keep taking your BP medicines.");
  if(S.conds.includes("kid")) notes.push("Kidney/liver issue noted: painkiller doses restricted; confirm all medicines with your doctor.");
  if(S.age && S.age>=65) notes.push("For 65+: start with lower doses, hydrate well, and see a doctor earlier if not improving.");
  return notes;
}

/* ---------------- tests ---------------- */
function pickTests(){
  const wanted=new Set(); const c=S.cond;
  (c.tests||[]).forEach(w=>{
    if(w==="fever>3d" && !(S.temp>=100.4||S.feverKind) ) return;
    if(w==="fever>3d" && (S.dur==="today"||S.dur==="days") && !(S.temp>=103)) return;
    if(w==="fever_high" && !(S.temp>=103)) return;
    if(w==="cough3w" && S.dur!=="weeks") return;
    if(w==="acidity_chronic" && S.dur!=="weeks") return;
    if(w==="diarrhea_persist" && (S.dur==="today")) return;
    if(w==="headache_chronic" && (S.dur==="today"||S.dur==="days")) return;
    if(w==="joint_chronic" && S.dur==="today") return;
    wanted.add(w);
  });
  if((S.temp>=100.4||S.feverKind) && (S.dur==="week"||S.dur==="weeks")) wanted.add("fever>3d");
  const out=[]; wanted.forEach(w=>{ const r=DB.testRules.find(x=>x.when===w); if(r) out.push(r); });
  return out;
}

/* ---------------- optional LLM fallback (free-text edge cases) ---------------- */
async function llmClassify(text){
  if(!CONFIG.LLM_ENDPOINT) return null;
  try{
    const key="docto_llm_"+text.toLowerCase().trim().replace(/\s+/g," ").slice(0,90);
    const cached=localStorage.getItem(key); if(cached) return JSON.parse(cached);
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),6000);
    const resp=await fetch(CONFIG.LLM_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,
        conds:condsForReader(text),
        flags:Object.keys(DB.emergencyAdvice)}),
      signal:ctrl.signal});
    clearTimeout(to);
    if(!resp.ok) return null;
    const j=await resp.json();
    if(j && (j.id||j.red_flag)){ try{localStorage.setItem(key,JSON.stringify(j));}catch(e){} return j; }
  }catch(e){ /* offline or worker down — rule engine continues alone */ }
  return null;
}

/* Read a free-text narrative and pull out the details the person already gave us,
   so we don't interrogate them about things they've just told us. Returns {} if the
   router is unavailable — the flow then simply asks every question as before. */
/* The router forwards a limited number of flag ids to the model, so sending all
   115 alphabetically means the ones past the cut are invisible — compartment
   syndrome and necrotising fasciitis were being missed for that reason alone,
   not because the model couldn't spot them. Send the ids that fit THIS complaint:
   always the immediately-lethal core, then the best keyword matches. */
const CORE_FLAGS=["cardiac","stroke","breathing","anaphylaxis","sepsis","crisis","poison","unconscious"];
function relevantFlags(text, limit=30){
  const low=" "+String(text||"").toLowerCase()+" ";
  const toks=[...new Set(low.split(/[^a-z0-9]+/).filter(w=>w.length>=4))];
  const score={};
  for(const id in DB.emergencyAdvice){
    if(id==="unspecified") continue;
    const adv=(DB.emergencyAdvice[id]||"").toLowerCase();
    let s=0;
    id.split("_").forEach(w=>{ if(w.length>=4 && low.includes(w)) s+=6; });   // named outright
    toks.forEach(t=>{ if(adv.includes(t)) s+=1; });                          // shared vocabulary
    score[id]=s;
  }
  // a partially-matching pattern rule is the strongest hint of all
  (DB.redFlagPatterns||[]).forEach(r=>{
    const hits=r.need.filter(g=>g.some(term=>low.includes(term))).length;
    if(hits) score[r.id]=(score[r.id]||0)+hits*5;
  });
  const out=CORE_FLAGS.filter(id=>DB.emergencyAdvice[id]);
  Object.keys(score).sort((a,b)=>score[b]-score[a]).forEach(id=>{
    if(out.length<limit && !out.includes(id) && score[id]>0) out.push(id);
  });
  return out.slice(0,limit);
}

async function llmExtract(text){
  /* Only worth a call when there's actually prose to read. "fever since yesterday"
     tells the rule engine everything already, so paying to parse it is waste. */
  if(!CONFIG.LLM_ENDPOINT || !text) return {};
  const words=text.trim().split(/\s+/).length;
  if(text.length<25 || words<3) return {};   // mandatory above this, not just for long narratives
  try{
    const key="docto_ex_"+text.toLowerCase().trim().replace(/\s+/g," ").slice(0,90);
    const cached=localStorage.getItem(key); if(cached) return JSON.parse(cached);
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),12000);
    const resp=await fetch(CONFIG.LLM_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"extract", text,
        conds:condsForReader(text),
        flags:relevantFlags(text),
        areas:Object.keys(DB_PAIN_MAP)}),
      signal:ctrl.signal});
    clearTimeout(to);
    if(!resp.ok) return {};
    const j=await resp.json();
    if(j && typeof j==="object"){ try{localStorage.setItem(key,JSON.stringify(j));}catch(e){} return j; }
  }catch(e){ /* offline or router down — every question gets asked, nothing breaks */ }
  return {};
}

/* A free local pass over the narrative. Duration, temperature and pain location are
   regular enough to read with regex, and every field this fills is one the paid model
   doesn't have to. Also works offline. */
function localExtract(text){
  const low=" "+String(text||"").toLowerCase()+" ";
  const out={pain_areas:[], symptoms:[]};
  /* Whole-word matching only. Substring matching quietly finds "ear" inside
     "near" and "years", which then routes the whole consultation wrongly. */
  const has=w=>new RegExp("(^|[^a-z])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^a-z]|$)","i").test(low);
  const hasAny=arr=>arr.some(has);
  // stem match for symptom words, so "vomited"/"vomiting" both count
  const stem=w=>new RegExp("(^|[^a-z])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i").test(low);

  // duration — longest first, so "for the last month" isn't read as "twice a week"
  const hrs=/\b(\d{1,2})\s*(?:hours?|hrs?|ghante)\b/.exec(low);
  if(hasAny(["months","month","years","year","chronic","long time","mahine","saal"]) || /\b\d+\s*weeks\b/.test(low))
    out.duration="weeks";
  else if(hasAny(["a week","one week","1 week","7 days","hafta","hafte"])) out.duration="week";
  else if(hasAny(["yesterday","2 days","two days","3 days","three days","couple of days","few days","kal se","din se"]))
    out.duration="days";
  else if(hasAny(["today","this morning","tonight","since morning","last night","few hours","aaj","abhi"]) || (hrs && +hrs[1]<=24))
    out.duration="today";

  // temperature, in either scale
  const f=/\b(\d{2,3}(?:\.\d)?)\s*(?:°\s*)?f\b/.exec(low);
  if(f){ const v=parseFloat(f[1]); if(v>=93&&v<=110) out.temp_f=v; }
  if(!out.temp_f){ const c=/\b(\d{2}(?:\.\d)?)\s*(?:°\s*)?c\b/.exec(low);
    if(c){ const v=parseFloat(c[1]); if(v>=34&&v<=44) out.temp_f=Math.round((v*9/5+32)*10)/10; } }

  // severity stated as a score
  const sv=/\b(\d{1,2})\s*(?:\/|out of)\s*10\b/.exec(low);
  if(sv){ const v=+sv[1]; if(v>=1&&v<=10) out.severity=v; }

  // pain location
  const AREA={ head:["head","headache","sir dard","migraine","forehead","temple"],
    eyes:["eye","eyes","vision","aankh"], ear:["ear","kaan"],
    throat:["throat","swallow","gala"], chest:["chest","seene"],
    upabd:["upper abdomen","upper stomach","above my navel","epigastr","ribs"],
    lowabd:["lower abdomen","lower stomach","lower belly","pelvi","groin","pet ke niche"],
    back:["back pain","lower back","spine","kamar"], joints:["joint","knee","elbow","shoulder","wrist"],
    muscles:["muscle","body ache","body pain","badan dard"], skin:["skin","rash","itch"],
    urinary:["urin","peshab","pee ","bathroom"], teeth:["tooth","teeth","dental","daant","gum"] };
  for(const k in AREA) if(hasAny(AREA[k])) out.pain_areas.push(k);
  /* "lower-right side of my abdomen" is the commonest way people locate belly pain,
     and none of the plain keywords above catch it. */
  const belly="(?:abdomen|abdominal|belly|stomach|tummy|pet)";
  if(new RegExp("lower[- ](?:\\w+[- ])?(?:side |part |quadrant )?(?:of (?:my |the )?)?"+belly).test(low)
     || new RegExp(belly+"[^.]{0,20}\\blower\\b").test(low)){
    if(!out.pain_areas.includes("lowabd")) out.pain_areas.push("lowabd"); }
  if(new RegExp("upper[- ](?:\\w+[- ])?(?:side |part )?(?:of (?:my |the )?)?"+belly).test(low)){
    if(!out.pain_areas.includes("upabd")) out.pain_areas.push("upabd"); }

  // symptoms worth carrying into the report
  [["nausea","nausea"],["nauseous","nausea"],["vomit","vomiting"],["ulti","vomiting"],
   ["diarrhea","loose motions"],["loose motion","loose motions"],["dizzy","dizziness"],
   ["sweating","sweating"],["chills","chills"],["cough","cough"],["breathless","breathlessness"],
   ["numb","numbness"],["tremor","tremor"],["trembling","tremor"]]
    /* "aches when I cough" describes a trigger, not a cough. Recording it as a
       symptom makes the read-back look careless and skews the matching. */
    .forEach(([k,v])=>{
      const trig=new RegExp("(?:when|whenever|if|after|during|on|or)\\s+(?:i\\s+)?"+k,"i");
      if(stem(k) && !trig.test(low) && !out.symptoms.includes(v)) out.symptoms.push(v);
    });
  out.symptoms=out.symptoms.slice(0,8);
  return out;
}

/* Copy extracted values into the session. Only fills blanks — never overwrites
   something the person explicitly answered. */
function applyExtract(ex){
  const filled=[];
  if(ex.duration && !S.dur){ S.dur=ex.duration; filled.push("dur"); }
  if(ex.severity && !S.sev){ S.sev=ex.severity; filled.push("sev"); }
  if(ex.temp_f && !S.temp){ S.temp=ex.temp_f; S.feverKind="meas"; filled.push("temp"); }
  if(Array.isArray(ex.pain_areas) && ex.pain_areas.length && !S.pains.length){
    S.pains=ex.pain_areas.slice(); filled.push("pain"); }
  if(Array.isArray(ex.symptoms) && ex.symptoms.length && !(S.symptoms||[]).length) S.symptoms=ex.symptoms.slice();
  // accumulate: this runs twice (local pass, then the model) and the second
  // call must not erase what the first one found
  S.extracted=(S.extracted||[]).concat(filled);
  return filled;
}

/* Show the person what we understood, so a misreading is caught before it shapes
   the assessment. */
function recapHtml(){
  const durTxt={today:t("dur_today"),days:t("dur_days"),week:t("dur_week"),weeks:t("dur_weeks")};
  const rows=[];
  if(S.dur)  rows.push([t("recapDur"),  durTxt[S.dur]||S.dur]);
  if(S.sev)  rows.push([t("recapSev"),  S.sev+"/10"]);
  if(S.temp) rows.push([t("recapTemp"), S.temp+"°F"]);
  if(S.pains && S.pains.length){
    const nm={head:t("pain_head"),eyes:t("pain_eye"),ear:t("pain_ear"),throat:t("pain_throat"),
      chest:t("pain_chest"),upabd:t("pain_upabd"),lowabd:t("pain_lowabd"),back:t("pain_back"),
      joints:t("pain_joint"),muscles:t("pain_muscle"),skin:t("pain_skin"),urinary:t("pain_urine"),teeth:t("pain_teeth")};
    rows.push([t("recapPain"), S.pains.map(p=>nm[p]||p).join(", ")]);
  }
  if(S.symptoms && S.symptoms.length) rows.push([t("recapSym"), S.symptoms.join(", ")]);
  if(!rows.length) return "";
  return `<b>${t("recapTitle")}</b><ul class="recap">`+
    rows.map(r=>`<li><span>${esc(r[0])}</span> ${esc(r[1])}</li>`).join("")+`</ul>`;
}



/* The reader can only recognise what we describe to it. Sending "plantar_fasciitis=
   Plantar fasciitis (heel pain)" tells it nothing about "my heel hurts for the first
   few steps in the morning" — which is how the patient will actually say it, and why
   five newly-added conditions were still unreachable after being added. So each
   condition also sends up to two of its most distinctive patient-language cues.
   Cues are skipped where the name already carries them, to keep the prompt lean. */
function condsForReader(text){
  /* The router truncates the list it is given, so ORDER decides what the model can
     even see. Sending the catalogue in file order meant everything added recently
     sat past the cut and was invisible — which is why ten newly written conditions
     stayed unreachable. Rank by fit with this complaint, keep a common core, cap
     the rest. Same failure previously hid compartment syndrome behind the flag cap. */
  const low=" "+String(text||"").toLowerCase()+" ";
  const toks=[...new Set(low.split(/[^a-z0-9]+/).filter(w=>w.length>=4))];
  const CORE=["fever","cold","cough","acidity","headache","diarrhea","uti","back_pain","sore_throat","rash"];
  const line=c=>{
    const nameWords=new Set(String(c.nm||"").toLowerCase().split(/[^a-z]+/).filter(w=>w.length>3));
    const cues=(c.al||[])
      .filter(a=>{ const w=a.toLowerCase().split(/[^a-z]+/).filter(x=>x.length>3);
                   return w.length && !w.every(x=>nameWords.has(x)); })
      .sort((a,b)=>(b.split(" ").length-a.split(" ").length)||(b.length-a.length))
      .slice(0,2);
    return c.id+"="+c.nm+(cues.length?" ("+cues.join(", ")+")":"");
  };
  const pool=DB.conds.filter(c=>c.id!=="generic");
  const score={};
  pool.forEach(c=>{
    let s=0;
    (c.al||[]).forEach(a=>{ if(low.includes(a)) s+= a.split(" ").length>1 ? 6 : 3; });
    const bag=((c.nm||"")+" "+(c.al||[]).join(" ")).toLowerCase();
    toks.forEach(t=>{ if(bag.includes(t)) s+=1; });
    if(CORE.includes(c.id)) s+=2;          // everyday conditions stay in view
    score[c.id]=s;
  });
  const ranked=pool.slice().sort((x,y)=>(score[y.id]||0)-(score[x.id]||0));
  return ranked.slice(0,55).map(line);
}

/* ---------------- catalogue gap log ----------------
   When the reader recognises something the database has no entry for, record it.
   Nothing is invented for the user in the moment — they get the honest fallback.
   Recurring entries here are the queue for what to write next, so the catalogue
   grows from real complaints rather than from guesses about what people ask. */
function logGap(name, complaint){
  try{
    const key="docto_gaps";
    const log=JSON.parse(localStorage.getItem(key)||"[]");
    const norm=String(name).toLowerCase().trim();
    const hit=log.find(g=>g.name===norm);
    if(hit){ hit.n++; hit.last=new Date().toISOString().slice(0,10); }
    else log.push({name:norm, n:1, first:new Date().toISOString().slice(0,10),
                   last:new Date().toISOString().slice(0,10),
                   sample:String(complaint||"").slice(0,160)});
    localStorage.setItem(key, JSON.stringify(log.slice(0,200)));
  }catch(e){ /* storage full or blocked — losing a log entry must never break a consultation */ }
}
/* Paste in the console to see what the catalogue is missing, most frequent first. */
function gapReport(){
  const log=JSON.parse(localStorage.getItem("docto_gaps")||"[]");
  return log.sort((a,b)=>b.n-a.n).map(g=>g.n+"x  "+g.name+"   e.g. "+g.sample);
}

/* ---------------- assessment ---------------- */
async function assess(){
  S.cond = scoreConditions();
  if(confidence()==="Preliminary"){           // weak rule-match → ask the LLM router (fallback only)
    const r=await llmClassify(S.complaint);
    if(r){
      if(r.red_flag && DB.emergencyAdvice[r.red_flag]){ await emergencyStop(r.red_flag); return; }
      const c2=DB.conds.find(c=>c.id===r.id);
      if(c2 && c2.id!=="generic"){ S.cond=c2; S.scores[c2.id]=(S.scores[c2.id]||0)+4; S.llmUsed=true; }
    }
  }
  const c=S.cond, conf=confidence();
  /* A refer-only condition still shows what to do meanwhile, but must lead with
     the fact that it needs a doctor — otherwise holding measures read as treatment. */
  const referNote = c.refer ? `<div class="referNote">${t("referNote")} <b>${esc(c.doctor||"")}</b></div>` : "";
  let html=sec("s-assess","activity",t("assess_title"))+`<div class="badges"><span class="badge prim">${t("likely")}: <b>${esc(c.nm)}</b></span><span class="badge">${t("confidence")}: ${esc(conf)}</span></div>`;
  if(S.temp>=103) html+=`<div class="emg">Temperature ${S.temp}°F is high — start the fever plan now and see a doctor today if it doesn't come down.</div>`;
  /* Lead with the paediatric rules rather than burying them in a parenthesis.
     A parent scanning a list will act on the first concrete instruction they
     see; the safety limits have to arrive before the remedies do. */
  const _m=ageMonths();
  if(_m!==null && _m<216){
    const bits=[];
    if(_m<12) bits.push("<b>No honey at all under 1 year</b> — it can cause infant botulism, whatever the remedy says.");
    if(_m<48) bits.push("<b>No cough or cold syrup under 4 years</b> — dextromethorphan, guaifenesin and antihistamine syrups have no proven benefit at this age and carry real risk.");
    if(_m<192) bits.push("<b>Never aspirin under 16</b> (Reye's syndrome).");
    if(_m<6) bits.push("<b>Under 6 months:</b> no ibuprofen, and nothing by mouth except breast milk or formula unless a doctor says otherwise.");
    bits.push("<b>Doses are by weight, not age.</b> Paracetamol and ibuprofen for children are measured in mg per kg — ask your pharmacist or paediatrician to work out the millilitres for your child's current weight, and write it down. Never scale an adult dose.");
    if(_m<3) bits.push("<b>Any fever under 3 months is an emergency</b> — go to a doctor now, even if the baby seems comfortable.");
    else if(_m<6 && S.temp>=100.4) bits.push("<b>Fever under 6 months should be seen the same day.</b>");
    html+=`<div class="emg" style="text-align:left"><b>Because this is a child (${_m<24?Math.round(_m)+" months":Math.floor(_m/12)+" years"}), these limits come first:</b><ul style="margin:6px 0 0 16px">`
      + bits.map(b=>`<li style="margin:4px 0">${b}</li>`).join("") + `</ul></div>`;
  }
  html+=referNote;
  // modern — for refer-only conditions these are holding measures, not treatment
  html+=sec("s-quick","zap", c.refer ? t("meanwhile_title") : t("quick_title"))+`<ul>`;
  c.modern.forEach(m=>{ const chk=medAllowed(m);
    if(chk.ok){ html+=`<li>${esc(m.t)}${chk.why?` <i style="color:#a65c00">(${esc(chk.why)})</i>`:""}</li>`; }
    else html+=`<li style="color:#8a8a8a;text-decoration:line-through">${esc(m.t)}</li><li style="color:#a65c00">↳ Skipped: ${esc(chk.why)}.</li>`; });
  html+=`</ul>`;
  // ayurveda — screened by the SAME paediatric gate; it was previously unfiltered,
  // which is how honey kept being recommended to an infant on the same page that
  // correctly refused it two sections above.
  html+=sec("s-ayur","leaf",t("ayur_title"))+`<ul>`;
  c.ayur.forEach(a=>{ const chk=pedsCheck(a);
    if(chk.ok) html+=`<li>${esc(a)}</li>`;
    else html+=`<li style="color:#8a8a8a;text-decoration:line-through">${esc(a)}</li><li style="color:#a65c00">↳ Skipped: ${esc(chk.why)}.</li>`; });
  html+=`</ul>`;
  // personal notes
  const pn=personalNotes(); if(pn.length){ html+=`<ul>`; pn.forEach(n=>html+=`<li><i>${esc(n)}</i></li>`); html+=`</ul>`; }
  // tests
  const tests=pickTests();
  if(tests.length){ html+=sec("s-test","clipboard",t("tests_title"))+`<ul>`;
    tests.forEach(r=>{ html+=`<li><b>${r.tests.join(", ")}</b> — ${esc(r.why)}</li>`; }); html+=`</ul><p>📎 ${t("upload_prompt")}</p>`; }
  // doctor + escalation
  html+=sec("s-doc","shield",t("seedoc_title"))+`<ul>`; c.seeDoc.forEach(x=>html+=`<li>${esc(x)}</li>`); html+=`</ul>`;
  html+=`<p><b>${t("doctor_see")}:</b> ${esc(c.doctor)}</p>`;
  if(c.emerg && c.emerg.length){ html+=sec("s-emerg","alert",t("emerg_title"))+`<ul>`; c.emerg.forEach(x=>html+=`<li>${esc(x)}</li>`); html+=`</ul>`; }
  html+=`<div class="chipRowBtn"><button class="bigBtn" onclick="makeReport()">${svg("download")} ${t("report_btn")}</button></div>`;
  await addBot(html, 1100);
  S.reportReady=true; S.step="post";
  saveHistory(); renderHistory();
  await addBot(`${t("askMore")}<br><span class="tag">${t("saveNote")}</span>`, 500);
}

/* ---------------- intake flow ---------------- */
async function flow(input){
  if(S.step!=="complaint" && S.step!=="post" && typeof input==="string"){ /* text answers handled per step below */ }
  switch(S.step){
    case "welcome": break;
    case "complaint": {
      S.complaint=input;
      /* Who is this actually about? The age question was answered before we knew.
         A child's age stated here replaces it — and a child mentioned with no age
         gets asked, because treating "unknown" as "adult" is how an infant was
         offered honey and cough syrup. */
      {
        const na=narrativeAge(input);
        if(na!==null && (S.ageMonths===null || Math.abs(na-S.ageMonths)>1)){
          S.ageMonths=na; S.age=Math.floor(na/12); S.who="child";
          await addBot(na<24 ? `Noted — this is about a ${Math.round(na)}-month-old, so I'll use the infant rules, not yours.`
                             : `Noted — this is about a ${Math.floor(na/12)}-year-old, so I'll use the child's age for anything I suggest.`, 400);
        } else if(mentionsChildNoAge(input) && (S.ageMonths===null || S.ageMonths>=216)){
          await addBot("This sounds like it's about a child — how old are they? (months if under two)",400);
          const ca=await askText("e.g. 10 months, or 4 years");
          const g=parseAgeSex(ca); const cm=(g.months!==null&&g.months!==undefined)?g.months:narrativeAge(ca);
          if(cm!==null && cm!==undefined){ S.ageMonths=cm; S.age=Math.floor(cm/12); S.who="child"; }
        }
      }
      /* The rules run first because they are instant and free, but they no longer
         END the consultation on their own. They can only RAISE an alarm, never
         suppress one, and never settle the label — measured over three fresh test
         sets the reader was both more sensitive and more specific than the rules,
         so it gets the final word on naming. */
      const ruleFlag=keywordFlag(input);

      /* If they wrote a proper description, read it first and skip what they've
         already told us. A long narrative followed by ten questions they just
         answered is the fastest way to make someone abandon the consultation. */
      if(input.length<25){   // too short to be worth reading; rules stand alone
        if(ruleFlag){ await emergencyStop(ruleFlag); return; }
      }
      if(input.length>=25){
        // free local pass — regex handles the regular stuff at no cost
        applyExtract(localExtract(input));
        S.cond=scoreConditions();
        /* The reader is consulted on EVERY complaint of any substance, including
           ones the rules already flagged. A rule firing tells us something is
           wrong; it does not tell us what, and a confidently wrong label produces
           confidently wrong advice. */
        typing(true); const ex=await llmExtract(input); typing(false);

        /* Reconciliation. The reader may only ever escalate or re-label — it
           cannot cancel a rule alarm, because if the model is unavailable or
           mistaken the floor must still hold. */
        const lowIn = scrubNegations(" "+String(input).toLowerCase()+" ");
        let readerFlag = (ex.red_flag && DB.emergencyAdvice[ex.red_flag]) ? ex.red_flag : null;
        // the model over-calls the same handful of alarms; the same guards apply to it
        let guarded=false;
        if(readerFlag && guardDrops(readerFlag, lowIn)){ readerFlag=null; guarded=true; }
        const finalFlag  = readerFlag || ruleFlag;
        if(finalFlag){
          S.flagSource = readerFlag ? (ruleFlag && ruleFlag!==readerFlag ? "reader-relabelled" : "reader")
                                    : "rules-only";
          await emergencyStop(finalFlag);
          return;
        }
        /* The long tail: a real emergency we hold no specific entry for. We still
           stop — using our own safety instructions, quoting only the reason. */
        /* If a guard just removed the flag, the same reasoning removes the blanket
           "emergency" that came with it — but only when we can hand the person a
           real condition instead. With nothing to route to, we still stop. */
        if(ex.emergency && !(guarded && ex.id && DB.conds.find(c=>c.id===ex.id))){
          await emergencyStop("unspecified", ex.emergency_reason); return;
        }
        if(ex.id){ const c2=DB.conds.find(c=>c.id===ex.id); if(c2){ S.llmHint=c2.id; } }
        /* Capture what we could not name. The user still gets the honest fallback;
           this only records the gap so the catalogue can grow deliberately. */
        if(!ex.id && ex.suggested) logGap(ex.suggested, input);
        const filled=applyExtract(ex);
        if(S.extracted.length || filled.length){
          await addBot(recapHtml(),450);
          const ok=await chips([t("recapYes"),t("recapNo")]);
          if(ok.idx===1){ S.dur=null; S.sev=null; S.temp=null; S.feverKind=null; S.pains=[]; S.extracted=[]; }
        }
      }

      S.step="duration";
      if(!S.dur){
        await addBot(t("q_duration"),500);
        const d=await chips([t("dur_today"),t("dur_days"),t("dur_week"),t("dur_weeks")]);
        S.dur=["today","days","week","weeks"][d.idx];
      }
      S.step="severity";
      if(!S.sev){
        await addBot(t("q_severity"),450);
        const sv=await askText(t("sev_hint"),[
          {label:t("sev_mild"),value:"3"},{label:t("sev_moderate"),value:"5"},
          {label:t("sev_bad"),value:"8"},{label:t("sev_worst"),value:"10"}]);
        S.sev=Math.max(1,Math.min(10,parseInt(sv)||5));
      }
      if(S.sev>=9){ await addBot(t("q_severe_kind"),450);
        const conf=await chips([t("sev_sudden"),t("sev_gradual")]);
        if(conf.idx===0){ await emergencyStop(S.pains.includes("head")?"headache_worst":"acute_abdomen"); return; } }
      S.step="fever";
      if(!S.temp && !S.feverKind){
        await addBot(t("q_fever"),450);
        const f=await chips([t("fever_no"),t("fever_warm"),t("fever_meas")]);
        if(f.idx===2){ const tv=await askText(t("temp_ph"),[{label:t("temp_unknown"),value:""}]); S.temp=parseFloat(tv)||null; S.feverKind=S.temp?"meas":"warm"; }
        else if(f.idx===1){ S.feverKind="warm"; }
      }
      if(S.temp && S.temp>=105){ await emergencyStop("breathing"); return; }
      S.step="pain";
      const P=[["none",t("pain_none")],["head",t("pain_head")],["eyes",t("pain_eye")],["ear",t("pain_ear")],["throat",t("pain_throat")],["chest",t("pain_chest")],["upabd",t("pain_upabd")],["lowabd",t("pain_lowabd")],["back",t("pain_back")],["joints",t("pain_joint")],["muscles",t("pain_muscle")],["skin",t("pain_skin")],["urinary",t("pain_urine")],["teeth",t("pain_teeth")]];
      if(!S.pains.length){
        await addBot(t("q_pain"),450);
        const pr=await chips(P.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn"),noneIdx:0});
        S.pains=pr.idxs.map(i=>P[i][0]).filter(x=>x!=="none");
      }
      if(S.pains.includes("chest")){
        await addBot(t("chest_q"),500);
        const cq=await chips([t("chest_cardiac"),t("chest_other")]);
        if(cq.idx===0){ await emergencyStop("cardiac"); return; }
      }
      // differentiators from top-scoring condition
      const probable=scoreConditions();
      if(probable.dq){ for(const dq of probable.dq){ await addBot(`${t("q_assoc")} ${esc(dq.q)}`,500);
          const a=await chips(dq.opts); S.dqAnswers.push(dq.opts[a.idx]);
          const rf2=keywordFlag(dq.opts[a.idx]); if(rf2){ await emergencyStop(rf2); return; }
          if(/blood/i.test(dq.opts[a.idx]) && probable.id==="diarrhea"){ await emergencyStop("gi_bleed"); return; }
      } }
      S.step="allergy"; await addBot(t("q_allergy"),450);
      const A=[["none",t("allergy_none")],["pen",t("allergy_pen")],["sulfa",t("allergy_sulfa")],["nsaid",t("allergy_nsaid")],["other",t("allergy_other")]];
      const ar=await chips(A.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn"),noneIdx:0});
      S.allergies=ar.idxs.map(i=>A[i][0]).filter(x=>x!=="none");
      if(S.allergies.includes("other")){ const o=await askText(t("allergy_ph")); S.allergyOther=o; }
      S.step="conds"; await addBot(t("q_conds"),450);
      const C=[["none",t("cond_none")],["dm",t("cond_dm")],["bp",t("cond_bp")],["asthma",t("cond_asthma")],["thy",t("cond_thy")],["kid",t("cond_kid")],["ulcer",t("cond_ulcer")]];
      const cr=await chips(C.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn"),noneIdx:0});
      S.conds=cr.idxs.map(i=>C[i][0]).filter(x=>x!=="none");
      S.step="meds"; await addBot(t("q_meds"),450);
      const m=await askText(t("meds_ph"),[{label:t("noneTap"),value:""}]); S.meds=m;
      await assess();
      break; }
    case "post": {
      const rf=keywordFlag(input); if(rf){ await emergencyStop(rf); return; }
      // lightweight follow-up: re-match against aliases for a fresh mini-answer
      const txt=input.toLowerCase(); let hit=null;
      DB.conds.forEach(c=>c.al.forEach(a=>{ if(txt.includes(a)) hit=hit||c; }));
      if(hit && hit.id!==S.cond.id){
        let h=`<b>${esc(hit.nm)}</b><h3>${t("quick_title")}</h3><ul>`;
        hit.modern.slice(0,3).forEach(x=>h+=`<li>${esc(x.t)}</li>`); h+=`</ul><h3>${t("ayur_title")}</h3><ul>`;
        hit.ayur.slice(0,2).forEach(x=>h+=`<li>${esc(x)}</li>`); h+=`</ul><p><b>${t("doctor_see")}:</b> ${esc(hit.doctor)}</p>`;
        await addBot(h,800);
      } else {
        await addBot(`Noted. ${t("askMore")}`,500);
      }
      saveHistory(); break; }
  }
}

/* ---------------- start conversation ---------------- */
async function startConsult(){
  CHAT().innerHTML=""; newSession();
  await addBot(t("welcome").replace("NAME", esc(USER?USER.name:"")),600);
  const w=await chips([t("who_self"),t("who_child"),t("who_elder"),t("who_other")]);
  S.who=["self","child","elder","other"][w.idx];
  await addBot(t("q_agesex"),450);
  /* One question, not two: most people type "30 M" naturally. Only fall back to
     asking separately when the answer genuinely can't be read. */
  const av=await askText(t("agesex_ph"));
  const got=parseAgeSex(av);
  S.age=got.age; S.sex=got.sex;
  /* Keep months, not just years. "10 months" and "10 years" are the same number
     and completely different medicine. */
  S.ageMonths = (got.months!==null && got.months!==undefined) ? got.months
              : (typeof got.age==="number" ? got.age*12 : null);
  if(S.age===null || S.age===undefined){
    const a2=await askText(t("age_ph"));
    const g2=parseAgeSex(a2); S.age=g2.age;
    S.ageMonths = (g2.months!==null && g2.months!==undefined) ? g2.months
                : (typeof g2.age==="number" ? g2.age*12 : null);
  }
  /* Under two, ask for the exact age in months — every dose below this age is
     weight- and month-based, and guessing is how children get hurt. */
  if(S.ageMonths!==null && S.ageMonths<24){
    await addBot("Just to be safe with a little one — how many months old exactly?",400);
    const mm=await askText("e.g. 10 months");
    const gm=parseAgeSex(mm);
    if(gm.months!==null && gm.months!==undefined) S.ageMonths=gm.months;
    else { const n=parseFloat(mm); if(Number.isFinite(n) && n>=0 && n<=36) S.ageMonths=n; }
    S.age=Math.floor(S.ageMonths/12);
  }
  if(!S.sex){ const sx=await chips([t("sex_m"),t("sex_f"),t("sex_o")]); S.sex=["M","F","O"][sx.idx]; }
  if(S.sex==="F" && S.age && S.age>=12 && S.age<=55){
    await addBot(t("q_preg"),400); const p=await chips([t("yes"),t("no")]); S.preg=p.idx===0; }
  S.step="complaint";
  await addBot(t("q_complaint"),500);
}

/* ---------------- input events ---------------- */
$("send").onclick=submitInput; $("inp").addEventListener("keydown",e=>{ if(e.key==="Enter") submitInput(); });
function submitInput(){
  const v=$("inp").value.trim(); if(!v) return; $("inp").value="";
  if(pendingText){ addUser(v); const fn=pendingText; pendingText=null; fn(v); return; }
  if(activeChips){ const ok=activeChips.selectByText(v);
    if(!ok){ addUser(v); addBot(t("chipMiss"),350); }
    return; }
  addUser(v); flow(v);
}
$("attach").onclick=()=>$("fileIn").click();
$("fileIn").addEventListener("change",e=>{ const f=e.target.files[0]; if(f) handleReport(f); e.target.value=""; });

/* ---------------- OCR & report analysis ---------------- */
function loadScript(src){ return new Promise((res,rej)=>{ if(document.querySelector(`script[src="${src}"]`)) return res();
  const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function handleReport(file){
  addUser("📎 "+file.name);
  await addBot(t("uploaded_reading"),300);
  typing(true);
  try{
    let text="";
    if(file.type==="application/pdf" || /\.pdf$/i.test(file.name)){
      await loadScript(CONFIG.PDFJS); pdfjsLib.GlobalWorkerOptions.workerSrc=CONFIG.PDFWK;
      const buf=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buf}).promise;
      for(let p=1;p<=Math.min(pdf.numPages,5);p++){ const pg=await pdf.getPage(p); const tc=await pg.getTextContent();
        text+=tc.items.map(i=>i.str).join(" ")+"\n"; }
      if(text.replace(/\s/g,"").length<40){ // scanned pdf → OCR page 1-2
        await loadScript(CONFIG.TESS);
        for(let p=1;p<=Math.min(pdf.numPages,2);p++){ const pg=await pdf.getPage(p);
          const vp=pg.getViewport({scale:2}); const cv=document.createElement("canvas");
          cv.width=vp.width; cv.height=vp.height;
          await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;
          const r=await Tesseract.recognize(cv,"eng"); text+=r.data.text+"\n"; } }
    } else {
      await loadScript(CONFIG.TESS);
      const r=await Tesseract.recognize(file,"eng"); text=r.data.text;
    }
    typing(false);
    if(!text || text.replace(/\s/g,"").length<20){ await addBot(t("ocr_fail"),400); return; }
    S.labRaw=text; analyseLabs(text);
  }catch(err){ typing(false); await addBot(t("ocr_fail")+"<br><span class='tag'>"+esc(String(err).slice(0,120))+"</span>",400); }
}
function parseNum(str){ const m=String(str).replace(/,/g,"").match(/(\d+\.?\d*)/); return m?parseFloat(m[1]):null; }
function analyseLabs(text){
  const low=text.toLowerCase().replace(/ /g," ");
  const lines=low.split(/\n/);
  const found=[], abnormal=[], qual=[];
  const nameHit=(ln,n)=>{ // word-boundary match so short codes (ast/alt/hb/tg) don't match inside other words
    const re=new RegExp("(^|[^a-z])"+n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^a-z]|$)","i");
    const m=re.exec(ln); return m? m.index+m[1].length : -1; };
  DB.labTests.forEach(lt=>{
    for(const ln of lines){ let pos=-1,hit=null; for(const n of lt.names){ const p=nameHit(ln,n); if(p>=0){pos=p;hit=n;break;} } if(!hit) continue;
      const after=ln.slice(pos+hit.length);
      let v=parseNum(after); if(v==null) continue;
      // unit corrections: platelets often in lakhs or thousands
      if(lt.key==="platelet" && v<1000){ v = v<20 ? v*100000 : v*1000; }
      if(lt.key==="wbc" && v<100){ v=v*1000; }
      const stat = v<lt.low ? "LOW" : v>lt.high ? "HIGH" : "OK";
      found.push({lt,v,stat});
      if(stat!=="OK"){ abnormal.push({lt,v,stat,msg: stat==="LOW"?lt.lowMsg:lt.highMsg}); }
      break; }
  });
  DB.labQualitative.forEach(q=>{
    for(const ln of lines){ if(q.names.some(n=>ln.includes(n))){
      if(/positive|reactive|detected/.test(ln) && !/negative|non[- ]?reactive|not detected/.test(ln)){ qual.push(q); } break; } }
  });
  S.labFindings={found,abnormal,qual};
  let html=sec("s-assess","file",t("final_title"));
  if(!found.length && !qual.length){ html+=`<p>${t("report_none")}</p>`; }
  else{
    html+=`<p>${t("report_found")}</p><table><tr><th>Test</th><th>Value</th><th>Normal</th><th>Status</th></tr>`;
    found.forEach(f=>{ html+=`<tr><td>${f.lt.key.toUpperCase()}</td><td>${f.v} ${f.lt.unit}</td><td>${f.lt.low}–${f.lt.high}</td><td class="${f.stat==="OK"?"st-ok":"st-hi"}">${f.stat}</td></tr>`; });
    html+=`</table>`;
    if(abnormal.length){ html+=sec("s-test","alert",t("abnormal_vals"))+`<ul>`;
      abnormal.forEach(a=>{ if(a.msg) html+=`<li><b>${a.lt.key.toUpperCase()} ${a.stat}</b> — ${esc(a.msg)}</li>`; }); html+=`</ul>`; }
    else if(found.length) html+=`<p class="okv">✓ ${t("normal_vals")}.</p>`;
    if(qual.length){ html+=`<ul>`; qual.forEach(q=>html+=`<li class="emg">${esc(q.posMsg)}</li>`); html+=`</ul>`; }
    // dengue special: platelets low + fever
    const plt=found.find(f=>f.lt.key==="platelet");
    if(plt && plt.v<100000){ html+=`<div class="emg">Platelets below 1 lakh — go to a hospital today for monitoring.</div>`; }
  }
  html+=`<div class="chipRowBtn"><button class="bigBtn" onclick="makeReport()">${svg("download")} ${t("report_btn")}</button></div>`;
  addBot(html,700).then(()=>{ saveHistory(); renderHistory(); });
}

/* ---------------- printable medical report ---------------- */
function makeReport(){
  const c=S.cond||DB.conds.find(x=>x.id==="generic");
  const meds=c.modern.filter(m=>medAllowed(m).ok);
  const painLabels={head:"Head",eyes:"Eyes",ear:"Ear",throat:"Throat",chest:"Chest",upabd:"Upper abdomen",lowabd:"Lower abdomen",back:"Back",joints:"Joints",muscles:"Muscles",skin:"Skin",urinary:"Urinary",teeth:"Teeth/Mouth"};
  const rxRows=meds.map((m,i)=>{
    const tx=m.t; const food = /before breakfast|empty stomach/i.test(tx) ? "Before food" : /after food|with food|after meals/i.test(tx) ? "After food" : /bedtime|at night/i.test(tx) ? "Bedtime" : "—";
    return `<tr><td>${i+1}</td><td>${esc(tx)}</td><td>${food}</td></tr>`; }).join("");
  const tests=pickTests();
  const lab=S.labFindings;
  let labHTML="";
  if(lab && (lab.found.length||lab.qual.length)){
    labHTML=`<h3>REPORT FINDINGS (from uploaded document)</h3><table><tr><th>Test</th><th>Value</th><th>Reference</th><th>Status</th></tr>`+
    lab.found.map(f=>`<tr><td>${f.lt.key.toUpperCase()}</td><td>${f.v} ${f.lt.unit}</td><td>${f.lt.low}–${f.lt.high}</td><td>${f.stat}</td></tr>`).join("")+`</table>`+
    (lab.abnormal.length?`<ul>`+lab.abnormal.map(a=>`<li>${esc(a.msg||"")}</li>`).join("")+`</ul>`:"")+
    (lab.qual.length?`<ul>`+lab.qual.map(q=>`<li><b>${esc(q.posMsg)}</b></li>`).join("")+`</ul>`:"");
  }
  $("sheet").innerHTML=`
  <div class="rHead"><div><h2>DOCTO <span>ONLINE</span></h2><div class="sub">AI-Assisted Preliminary Health Assessment • docto.online</div></div>
  <div style="text-align:right;font-size:12px;color:#555">Ref: ${S.id.toUpperCase()}<br>Date: ${S.date}</div></div>
  <div class="meta">
   <span><b>Patient:</b> ${esc(USER?USER.name:"Guest")}</span><span><b>Age/Sex:</b> ${S.age||"—"} / ${S.sex||"—"}</span>
   <span><b>Consultation for:</b> ${S.who||"self"}</span><span><b>Language:</b> ${I18N[LANG].langName}</span>
  </div>
  <h3>CHIEF COMPLAINT</h3><p>${esc(S.complaint||"—")} — duration: ${S.dur||"—"}, severity ${S.sev||"—"}/10.</p>
  <h3>REPORTED HISTORY</h3>
  <ul>
   <li>Temperature: ${S.temp?S.temp+" °F":(S.feverKind==="warm"?"feels feverish (not measured)":"no fever reported")}</li>
   <li>Pain/discomfort areas: ${S.pains.length?S.pains.map(p=>painLabels[p]||p).join(", "):"none"}</li>
   <li>Additional details: ${S.dqAnswers.length?esc(S.dqAnswers.join("; ")):"—"}</li>
   <li>Drug allergies: ${S.allergies.length?esc(S.allergies.join(", ")+(S.allergyOther?" ("+S.allergyOther+")":"")):"none reported"}</li>
   <li>Existing conditions: ${S.conds.length?esc(S.conds.join(", ")):"none reported"} • Regular medicines: ${esc(S.meds||"—")}</li>
  </ul>
  <h3>ASSESSMENT (PROVISIONAL)</h3>
  <p><b>${esc(c.nm)}</b> — confidence: ${confidence()}. ${S.emergency?"<b style='color:#b03a2e'>Emergency indicators were detected during this consultation — hospital evaluation advised FIRST.</b>":""}</p>
  ${labHTML}
  <h3>PLAN — MEDICINES & MEASURES (over-the-counter, adult doses)</h3>
  <table><tr><th>#</th><th>Medicine / Measure & timing</th><th>Food relation</th></tr>${rxRows}</table>
  <h3>AYURVEDIC / NATURAL CARE</h3><ul>${c.ayur.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>
  ${tests.length?`<h3>INVESTIGATIONS ADVISED</h3><ul>${tests.map(r=>`<li><b>${r.tests.join(", ")}</b> — ${esc(r.why)}</li>`).join("")}</ul>`:""}
  <h3>WHEN TO SEE A DOCTOR</h3><ul>${c.seeDoc.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  <p><b>Suggested specialist:</b> ${esc(c.doctor)} • <b>Follow-up:</b> reassess in 48–72 h or earlier if worsening.</p>
  ${c.emerg&&c.emerg.length?`<div class="warn"><b>GO TO HOSPITAL IMMEDIATELY IF:</b> ${c.emerg.map(esc).join(" • ")}</div>`:""}
  <div class="sig"><div style="font-size:11px;color:#777">Generated: ${new Date().toLocaleString()}</div>
  <div class="ai">Docto Online — AI Health Assistant<br>Not a registered medical practitioner</div></div>
  <div class="disc">${t("disclaimer")} If symptoms are severe, worsening, or you are in doubt, consult a doctor in person. Emergency (India): 108 / 102. Suicide prevention: 9152987821, Tele-MANAS 14416.</div>`;
  saveHistory(); renderHistory();
  window.print();
}
window.makeReport=makeReport;

/* ---------------- history ---------------- */
function historyKey(){ return "docto_hist_"+(USER?USER.email||USER.name:"guest"); }
function saveHistory(){
  if(!S || !S.complaint) return;
  const list=JSON.parse(localStorage.getItem(historyKey())||"[]");
  /* An emergency must be titled as one. Filing "suspected appendicitis, sent to
     hospital" under a bland label makes the history actively misleading. */
  const EMG_TITLE={ appendicitis:"⚠ Suspected appendicitis", obstruction:"⚠ Suspected bowel obstruction",
    ectopic:"⚠ Possible ectopic pregnancy", meningitis:"⚠ Possible meningitis", dka:"⚠ Diabetic emergency",
    dehydration:"⚠ Severe dehydration", preeclampsia:"⚠ Possible pre-eclampsia", cardiac:"⚠ Possible heart attack",
    stroke:"⚠ Possible stroke", gi_bleed:"⚠ Internal bleeding", breathing:"⚠ Breathing emergency",
    anaphylaxis:"⚠ Anaphylaxis", crisis:"⚠ Urgent support needed", acute_abdomen:"⚠ Acute abdomen",
    headache_worst:"⚠ Sudden severe headache", seizure:"⚠ Seizure", unconscious:"⚠ Unresponsive",
    poison:"⚠ Poisoning/overdose", torsion:"⚠ Testicular torsion", hemoptysis:"⚠ Coughing blood",
    hematuria:"⚠ Blood in urine", preg_bleed:"⚠ Bleeding in pregnancy",
    unspecified:"⚠ Urgent — hospital assessment needed" };
  const title = S.emergency ? (EMG_TITLE[S.emergency]||"⚠ Emergency — sent to hospital")
                            : (S.cond?S.cond.nm:"Consultation");
  const item={ id:S.id, date:S.date, title, complaint:S.complaint,
    chat:CHAT().innerHTML, state:JSON.stringify({...S, transcript:[]}) };
  const ix=list.findIndex(x=>x.id===S.id); if(ix>=0) list[ix]=item; else list.unshift(item);
  localStorage.setItem(historyKey(), JSON.stringify(list.slice(0,40)));
}
function renderHistory(){
  const list=JSON.parse(localStorage.getItem(historyKey())||"[]");
  const el=$("histList"); el.innerHTML="";
  if(!list.length){ el.innerHTML=`<div id="histEmpty"><div class="eic">${svg("file")}</div><p>${t("noHistory")}</p></div>`; return; }
  list.forEach(item=>{
    const d=document.createElement("div"); d.className="histCard";
    d.innerHTML=`<div class="htop"><span class="hicon">${svg("file")}</span><h4>${esc(item.title)}</h4></div>
    <div class="hdate">${svg("clock")}${esc(item.date)}</div>
    <p>${esc(item.complaint)}</p>
    <div class="rowBtns"><button class="op">${svg("eye")}${t("view")}</button><button class="del">${svg("trash")}${t("delete")}</button></div>`;
    d.querySelector(".op").onclick=e=>{ e.stopPropagation(); openHistory(item); };
    d.querySelector(".del").onclick=e=>{ e.stopPropagation();
      const l2=JSON.parse(localStorage.getItem(historyKey())||"[]").filter(x=>x.id!==item.id);
      localStorage.setItem(historyKey(),JSON.stringify(l2)); renderHistory(); };
    d.onclick=()=>openHistory(item);
    el.appendChild(d);
  });
}
function openHistory(item){
  CHAT().innerHTML=item.chat;
  try{ S=JSON.parse(item.state); }catch(e){ newSession(); }
  S.step="post"; scroll_();
}

/* ---------------- language ---------------- */
function applyLang(){
  localStorage.setItem("docto_lang",LANG);
  { const nb=$("newBtnTxt"); if(nb) nb.textContent=t("newLabel"); }
  $("histTitle").textContent=t("history");
  $("pageTitle").textContent=t("consultTitle");
  { const ps=$("pageSub"); if(ps) ps.textContent=t("pageSub"); }
  $("inp").placeholder=t("inputPh"); $("attach").title=t("attachTip");
  /* Stamp the build in the UI. A stale cached app.js runs old clinical logic
     silently — this makes "which version am I actually looking at?" a glance
     rather than an investigation. */
  $("micro").textContent=t("disclaimer")+"  ·  build "+BUILD;
  $("lg1").textContent=t("appName"); $("lg2").textContent=t("appName2");
  renderHistory();
}
function buildLangSel(){
  const s=$("langSel"); s.innerHTML="";
  LANGS.forEach(([code,label])=>{ const o=document.createElement("option"); o.value=code; o.textContent=label; if(code===LANG)o.selected=true; s.appendChild(o); });
  s.onchange=()=>{ LANG=s.value; applyLang(); };
}

/* ---------------- auth ---------------- */
function initAuthUI(){
  const grid=$("langGrid"); grid.innerHTML="";
  LANGS.forEach(([code,label])=>{ const b=document.createElement("button"); b.textContent=label;
    if(code===LANG) b.classList.add("sel");
    b.onclick=()=>{ LANG=code; localStorage.setItem("docto_lang",code);
      grid.querySelectorAll("button").forEach(x=>x.classList.remove("sel")); b.classList.add("sel");
      $("tgLine").textContent=t("tagline"); $("clLabel").textContent=t("chooseLang");
      $("nameIn").placeholder=t("namePrompt"); $("guestBtn").textContent=t("guest"); };
    grid.appendChild(b); });
  $("nameIn").placeholder=t("namePrompt"); $("guestBtn").textContent=t("guest");
  $("guestBtn").onclick=()=>{ const n=$("nameIn").value.trim()||"Guest";
    USER={name:n,email:null,pic:null,mode:"guest"}; localStorage.setItem("docto_user",JSON.stringify(USER)); enterApp(); };
  // Google Identity
  if(CONFIG.GOOGLE_CLIENT_ID && location.protocol.startsWith("http")){
    const tryInit=()=>{ if(window.google && google.accounts){
        google.accounts.id.initialize({ client_id:CONFIG.GOOGLE_CLIENT_ID, callback:(resp)=>{
          try{ const p=JSON.parse(atob(resp.credential.split(".")[1]));
            USER={name:p.name,email:p.email,pic:p.picture,mode:"google"};
            localStorage.setItem("docto_user",JSON.stringify(USER)); enterApp();
          }catch(e){ console.error(e); } }});
        google.accounts.id.renderButton($("gBtnHolder"),{theme:"outline",size:"large",width:320});
      } else setTimeout(tryInit,400); };
    tryInit();
  }
}
function enterApp(){
  $("overlay").style.display="none";
  const chip=$("userChip");
  chip.innerHTML=`<span class="uAv">${esc(initial())}</span><span>${esc(USER.name)}</span><button id="soBtn">${t("signout")}</button>`;
  document.getElementById("soBtn").onclick=()=>{ localStorage.removeItem("docto_user"); location.reload(); };
  buildLangSel(); applyLang(); startConsult();
}
$("newBtn") && ($("newBtn").onclick=()=>startConsult());

/* ---------------- boot ---------------- */
window.addEventListener("DOMContentLoaded",()=>{
  $("newBtn").onclick=()=>startConsult();
  initAuthUI();
  if(USER){ enterApp(); }
});
