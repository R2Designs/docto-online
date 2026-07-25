/* DOCTO ONLINE — chat engine. Runs fully in the browser; data stays in localStorage. */
"use strict";
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
  S = { step:"welcome", who:null, age:null, sex:null, preg:false, complaint:"", dur:null, sev:null,
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
function chips(list, {multi=false, doneLabel="OK"}={}){
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
    function toggle(i){ if(settled) return; const b=btns[i];
      if(sel.has(i)){sel.delete(i);b.classList.remove("sel");} else {sel.add(i);b.classList.add("sel");} }
    function finishSingle(i){ if(settled) return; btns[i].classList.add("sel"); lockDown();
      addUser(list[i]); res({idx:i,label:list[i]}); }
    function finishMulti(){ if(settled) return; const arr=[...sel]; lockDown();
      if(okBtn) okBtn.style.display="none";
      addUser(arr.length?arr.map(i=>list[i]).join(", "):"—"); res({idxs:arr,labels:arr.map(i=>list[i])}); }
    list.forEach((c,i)=>{ const b=document.createElement("button"); b.className="chip"; b.textContent=c;
      b.onclick=()=> multi ? toggle(i) : finishSingle(i); box.appendChild(b); btns.push(b); });
    if(multi){ const w=document.createElement("div"); w.className="chipRowBtn";
      okBtn=document.createElement("button"); okBtn.className="bigBtn"; okBtn.textContent=doneLabel;
      okBtn.onclick=finishMulti; w.appendChild(okBtn); inner.appendChild(w); }
    activeChips={ multi, selectByText(text){
        const low=text.toLowerCase().trim();
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
function askText(ph){ activeChips=null; return new Promise(res=>{ const inp=$("inp"); inp.placeholder=ph||t("inputPh"); inp.focus();
  pendingText = v=>{ resetHint(); res(v); }; }); }
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
  "other symptoms|sudden changes|blood in";
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
    "(?:\\s*,?\\s*(?:or\\s+|and\\s+)?(?!but\\b|however\\b|though\\b|and i\\b|but i\\b)"+
    "(?:no\\s+)?[a-z][a-z ]{0,25})*", "g");
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
const REGION_NEIGHBOURS={ head:["neck"], neck:["head","back"], chest:[], abdomen:["pelvis"],
  pelvis:["abdomen"], back:["neck"], limb:[], skin:[] };
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
function keywordFlag(text){
  const low=scrubNegations(" "+text.toLowerCase()+" ");
  /* Gather every candidate — patterns, quoted vital signs, plain keywords — then
     let clinical precedence decide, rather than whichever rule happened to run first. */
  let candidates=patternFlags(low);
  if(chestWallPattern(low)) candidates=candidates.filter(id=>!["cardiac","pneumothorax","aortic_dissection"].includes(id));
  const v=vitalsFlag(low); if(v && !candidates.includes(v)) candidates.push(v);
  const wall=chestWallPattern(low);
  for(const rf of DB.redFlagKeywords){
    if(wall && ["cardiac","pneumothorax","aortic_dissection"].includes(rf.id)) continue;
    for(const k of rf.k){ if(low.includes(k)){ if(!candidates.includes(rf.id)) candidates.push(rf.id); break; } }
  }
  return candidates.length ? rankFlags(candidates) : null;
}

/* Read "30 M", "30, male", "45/F", "f 22", "28 साल पुरुष" etc. from one answer.
   Returns nulls for whatever it couldn't read, so the flow can ask just that part. */
function parseAgeSex(txt){
  const low=String(txt||"").toLowerCase();
  let age=null, sex=null;
  const am=/\b(\d{1,3})\b/.exec(low);
  if(am){ const n=+am[1]; if(n>=0 && n<=120) age=n; }
  const male   =/(^|[^a-z])(m|male|man|boy|मेल|पुरुष|लड़का|aadmi|ladka|ஆண்|పురుషుడు|പുരുഷൻ)([^a-z]|$)/;
  const female =/(^|[^a-z])(f|female|woman|girl|lady|फीमेल|महिला|स्त्री|औरत|लड़की|aurat|ladki|பெண்|స్త్రీ|സ്ത്രീ)([^a-z]|$)/;
  const other  =/(^|[^a-z])(o|other|trans|non.?binary|अन्य|மற்ற|ఇతర|മറ്റ്)([^a-z]|$)/;
  if(female.test(low))      sex="F";     // test female first: "female" contains "male"
  else if(male.test(low))   sex="M";
  else if(other.test(low))  sex="O";
  return {age, sex};
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
function patternFlags(low){
  const hay = typeof low==="string" ? (low.startsWith(" ")?low:" "+low.toLowerCase()+" ") : "";
  const hits=[];
  if(!hay || !DB.redFlagPatterns) return hits;
  for(const rule of DB.redFlagPatterns){
    if(rule.need.every(group => group.some(term => hay.includes(term))) && !hits.includes(rule.id))
      hits.push(rule.id);
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
  "aortic_dissection","tamponade","pneumothorax","asthma_severe","epiglottitis","breathing",
  // a quoted BP in the emergency range, or a calf clot with chest signs, beats a
  // generic chest-pain or eye match built from softer clues
  "hypertensive_crisis","dvt_pe","cardiac",
  "stroke","head_injury","headache_worst","meningococcal","meningitis","sepsis","neutropenic_fever",
  "maoi_crisis","serotonin_syndrome","thyroid_storm","dka","hyperkalemia","heat_stroke",
  "preeclampsia","abruption","preg_bleed","ectopic","ovarian_torsion","torsion",
  "cauda_equina","spinal_abscess","limb_ischemia","compartment","nec_fasc","splenic_rupture",
  "perforation","hernia_strangulated","cholangitis","obstruction","appendicitis","intussusception",
  "pancreatitis","aaa","acute_abdomen","gi_bleed","pyloric_stenosis","pid_severe",
  "temporal_arteritis","crao","glaucoma_acute","retinal_detach",
  "paracetamol_od","digoxin_tox","lithium_tox","poison","tachy_severe",
  "subdural","tia","rhabdo","sickle_crisis","co_poisoning","hemoptysis",
  "hematuria","seizure","unconscious","crisis","dehydration"
];
function rankFlags(ids){
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
  const headline = diffs && diffs.length ? t("emerg_generic") : t("emerg_now");
  await addBot(`<div class="emg"><b>${headline}</b><br>${esc(msg)}${diffHtml}<br>${t("emerg_msg")}</div>
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
  const text=S.complaint.toLowerCase(); const sc={};
  const toks=text.split(/[^a-z0-9]+/).filter(x=>x.length>=4);
  DB.conds.forEach(c=>{ let s=0;
    c.al.forEach(a=>{
      if(text.includes(a)) { s+=a.length>4?3:2; return; }
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

  /* Cross-check against the reader. If it read the prose and named a condition in
     a different body region than the keyword match, the keyword match is the one
     more likely to be wrong — it can't tell "pain in my chest" from "chest cold". */
  if(S.llmHint && best!=="generic"){
    const mine=DB.conds.find(c=>c.id===best), theirs=DB.conds.find(c=>c.id===S.llmHint);
    if(mine && theirs && mine.rg && theirs.rg && mine.rg!==theirs.rg &&
       mine.rg!=="systemic" && theirs.rg!=="systemic"){
      best = sc[theirs.id] >= sc[mine.id] ? theirs.id : "generic";
    }
  }
  S.fit=bs;
  return DB.conds.find(c=>c.id===best);
}
function confidence(){ const vals=Object.values(S.scores).sort((a,b)=>b-a);
  const top=vals[0]||0, second=vals[1]||0;
  if(top>=6 && top-second>=3) return "High"; if(top>=3) return "Moderate"; return "Preliminary"; }

/* ---------------- personalisation filters ---------------- */
function medAllowed(item){
  const f=item.f||"";
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
        conds:DB.conds.filter(c=>c.id!=="generic").map(c=>c.id+"="+c.nm),
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
  if(text.length<40 || words<8) return {};
  try{
    const key="docto_ex_"+text.toLowerCase().trim().replace(/\s+/g," ").slice(0,90);
    const cached=localStorage.getItem(key); if(cached) return JSON.parse(cached);
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),12000);
    const resp=await fetch(CONFIG.LLM_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"extract", text,
        conds:DB.conds.filter(c=>c.id!=="generic").map(c=>c.id+"="+c.nm),
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
  let html=sec("s-assess","activity",t("assess_title"))+`<div class="badges"><span class="badge prim">${t("likely")}: <b>${esc(c.nm)}</b></span><span class="badge">${t("confidence")}: ${esc(conf)}</span></div>`;
  if(S.temp>=103) html+=`<div class="emg">Temperature ${S.temp}°F is high — start the fever plan now and see a doctor today if it doesn't come down.</div>`;
  // modern
  html+=sec("s-quick","zap",t("quick_title"))+`<ul>`;
  c.modern.forEach(m=>{ const chk=medAllowed(m);
    if(chk.ok){ html+=`<li>${esc(m.t)}${chk.why?` <i style="color:#a65c00">(${esc(chk.why)})</i>`:""}</li>`; }
    else html+=`<li style="color:#8a8a8a;text-decoration:line-through">${esc(m.t)}</li><li style="color:#a65c00">↳ Skipped: ${esc(chk.why)}.</li>`; });
  html+=`</ul>`;
  // ayurveda
  html+=sec("s-ayur","leaf",t("ayur_title"))+`<ul>`; c.ayur.forEach(a=>html+=`<li>${esc(a)}</li>`); html+=`</ul>`;
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
      const rf=keywordFlag(input); if(rf){ await emergencyStop(rf); return; }

      /* If they wrote a proper description, read it first and skip what they've
         already told us. A long narrative followed by ten questions they just
         answered is the fastest way to make someone abandon the consultation. */
      if(input.length>=25){
        // free pass first — regex handles the regular stuff
        applyExtract(localExtract(input));
        S.cond=scoreConditions();
        /* Triage policy — the reader leads, the rules are a floor.
           Keyword rules only recognise phrasings we thought of, so anything they
           don't catch goes to the model. The rules already ran above and would have
           stopped us on a hit; reaching here means they found nothing, which is
           precisely when they're least trustworthy. */
        typing(true); const ex=await llmExtract(input); typing(false);
        if(ex.red_flag && DB.emergencyAdvice[ex.red_flag]){ await emergencyStop(ex.red_flag); return; }
        /* The long tail: a real emergency we hold no specific entry for. We still
           stop — using our own safety instructions, quoting only the reason. */
        if(ex.emergency){ await emergencyStop("unspecified", ex.emergency_reason); return; }
        if(ex.id){ const c2=DB.conds.find(c=>c.id===ex.id); if(c2){ S.llmHint=c2.id; } }
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
        const sv=await askText(t("sev_hint")); S.sev=Math.max(1,Math.min(10,parseInt(sv)||5));
      }
      if(S.sev>=9){ await addBot(t("q_severe_kind"),450);
        const conf=await chips([t("sev_sudden"),t("sev_gradual")]);
        if(conf.idx===0){ await emergencyStop(S.pains.includes("head")?"headache_worst":"acute_abdomen"); return; } }
      S.step="fever";
      if(!S.temp && !S.feverKind){
        await addBot(t("q_fever"),450);
        const f=await chips([t("fever_no"),t("fever_warm"),t("fever_meas")]);
        if(f.idx===2){ const tv=await askText(t("temp_ph")); S.temp=parseFloat(tv)||null; S.feverKind="meas"; }
        else if(f.idx===1){ S.feverKind="warm"; }
      }
      if(S.temp && S.temp>=105){ await emergencyStop("breathing"); return; }
      S.step="pain";
      const P=[["none",t("pain_none")],["head",t("pain_head")],["eyes",t("pain_eye")],["ear",t("pain_ear")],["throat",t("pain_throat")],["chest",t("pain_chest")],["upabd",t("pain_upabd")],["lowabd",t("pain_lowabd")],["back",t("pain_back")],["joints",t("pain_joint")],["muscles",t("pain_muscle")],["skin",t("pain_skin")],["urinary",t("pain_urine")],["teeth",t("pain_teeth")]];
      if(!S.pains.length){
        await addBot(t("q_pain"),450);
        const pr=await chips(P.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn")});
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
      const ar=await chips(A.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn")});
      S.allergies=ar.idxs.map(i=>A[i][0]).filter(x=>x!=="none");
      if(S.allergies.includes("other")){ const o=await askText("…"); S.allergyOther=o; }
      S.step="conds"; await addBot(t("q_conds"),450);
      const C=[["none",t("cond_none")],["dm",t("cond_dm")],["bp",t("cond_bp")],["asthma",t("cond_asthma")],["thy",t("cond_thy")],["kid",t("cond_kid")],["ulcer",t("cond_ulcer")]];
      const cr=await chips(C.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn")});
      S.conds=cr.idxs.map(i=>C[i][0]).filter(x=>x!=="none");
      S.step="meds"; await addBot(t("q_meds"),450);
      const m=await askText("…"); S.meds=m;
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
  if(!S.age){ const a2=await askText(t("age_ph")); S.age=parseInt(a2)||null; }
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
  $("micro").textContent=t("disclaimer");
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
