/* DOCTO ONLINE — chat engine. Runs fully in the browser; data stays in localStorage. */
"use strict";
const CONFIG = {
  GOOGLE_CLIENT_ID: (window.DOCTO_CONFIG && window.DOCTO_CONFIG.GOOGLE_CLIENT_ID) || "", // set this in config.js
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

/* ---------------- session state ---------------- */
let S = null;
function newSession(){
  S = { step:"welcome", who:null, age:null, sex:null, preg:false, complaint:"", dur:null, sev:null,
        temp:null, feverKind:null, pains:[], dqi:0, dqAnswers:[], allergies:[], allergyOther:"",
        conds:[], meds:"", cond:null, scores:{}, emergency:null, labFindings:null, labRaw:"",
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
    function toggle(i){ const b=btns[i]; if(sel.has(i)){sel.delete(i);b.classList.remove("sel");} else {sel.add(i);b.classList.add("sel");} }
    function finishSingle(i){ btns.forEach(x=>x.classList.add("done")); btns[i].classList.add("sel");
      addUser(list[i]); activeChips=null; resetHint(); res({idx:i,label:list[i]}); }
    function finishMulti(){ const arr=[...sel]; btns.forEach(x=>x.classList.add("done")); if(okBtn) okBtn.style.display="none";
      addUser(arr.length?arr.map(i=>list[i]).join(", "):"—"); activeChips=null; resetHint(); res({idxs:arr,labels:arr.map(i=>list[i])}); }
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
function keywordFlag(text){
  const low=" "+text.toLowerCase()+" ";
  for(const rf of DB.redFlagKeywords){ for(const k of rf.k){ if(low.includes(k)) return rf.id; } }
  return null;
}
async function emergencyStop(id){
  S.emergency=id;
  const msg=DB.emergencyAdvice[id]||"";
  await addBot(`<div class="emg"><b>${t("emerg_now")}</b><br>${esc(msg)}<br><br>${t("emerg_msg")}</div>
  <h3>${t("while_wait")}</h3><ul>
  <li>Stay with the person; keep them calm, seated or lying as comfortable.</li>
  <li>Do not give food/drink if drowsy, having chest pain, or a possible stroke/surgery situation.</li>
  <li>Carry current medicines & any recent reports to the hospital.</li></ul>`, 500);
  S.cond = DB.conds.find(c=>c.id==="generic"); S.step="post"; saveHistory(); renderHistory();
  await addBot(t("askMore"), 400);
}

/* ---------------- condition matching ---------------- */
function scoreConditions(){
  const text=S.complaint.toLowerCase(); const sc={};
  DB.conds.forEach(c=>{ let s=0;
    c.al.forEach(a=>{ if(text.includes(a)) s+=a.length>4?3:2; });
    sc[c.id]=s; });
  S.pains.forEach(p=>{ (DB_PAIN_MAP[p]||[]).forEach(cid=>{ if(cid!=="CHEST_SPECIAL") sc[cid]=(sc[cid]||0)+2; }); });
  if(S.temp && S.temp>=100.4){ sc.fever=(sc.fever||0)+2; sc.flu=(sc.flu||0)+1; }
  if(S.feverKind==="warm"){ sc.fever=(sc.fever||0)+1; }
  S.scores=sc;
  let best=null,bs=0; for(const id in sc){ if(sc[id]>bs){ bs=sc[id]; best=id; } }
  if(!best || bs===0) best="generic";
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

/* ---------------- assessment ---------------- */
async function assess(){
  S.cond = scoreConditions();
  const c=S.cond, conf=confidence();
  let html=`<h3>${t("assess_title")}</h3><span class="tag">${t("likely")}: <b>${esc(c.nm)}</b></span><span class="tag">${t("confidence")}: ${conf}</span>`;
  if(S.temp>=103) html+=`<div class="emg">Temperature ${S.temp}°F is high — start the fever plan now and see a doctor today if it doesn't come down.</div>`;
  // modern
  html+=`<h3>${t("quick_title")}</h3><ul>`;
  c.modern.forEach(m=>{ const chk=medAllowed(m);
    if(chk.ok){ html+=`<li>${esc(m.t)}${chk.why?` <i style="color:#a65c00">(${esc(chk.why)})</i>`:""}</li>`; }
    else html+=`<li style="color:#8a8a8a;text-decoration:line-through">${esc(m.t)}</li><li style="color:#a65c00">↳ Skipped: ${esc(chk.why)}.</li>`; });
  html+=`</ul>`;
  // ayurveda
  html+=`<h3>${t("ayur_title")}</h3><ul>`; c.ayur.forEach(a=>html+=`<li>${esc(a)}</li>`); html+=`</ul>`;
  // personal notes
  const pn=personalNotes(); if(pn.length){ html+=`<ul>`; pn.forEach(n=>html+=`<li><i>${esc(n)}</i></li>`); html+=`</ul>`; }
  // tests
  const tests=pickTests();
  if(tests.length){ html+=`<h3>${t("tests_title")}</h3><ul>`;
    tests.forEach(r=>{ html+=`<li><b>${r.tests.join(", ")}</b> — ${esc(r.why)}</li>`; }); html+=`</ul><p>📎 ${t("upload_prompt")}</p>`; }
  // doctor + escalation
  html+=`<h3>${t("seedoc_title")}</h3><ul>`; c.seeDoc.forEach(x=>html+=`<li>${esc(x)}</li>`); html+=`</ul>`;
  html+=`<p><b>${t("doctor_see")}:</b> ${esc(c.doctor)}</p>`;
  if(c.emerg && c.emerg.length){ html+=`<h3 style="color:var(--red)">${t("emerg_title")}</h3><ul>`; c.emerg.forEach(x=>html+=`<li>${esc(x)}</li>`); html+=`</ul>`; }
  html+=`<div class="chipRowBtn"><button class="bigBtn" onclick="makeReport()">📄 ${t("report_btn")}</button></div>`;
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
      S.step="duration";
      await addBot(t("q_duration"),500);
      const d=await chips([t("dur_today"),t("dur_days"),t("dur_week"),t("dur_weeks")]);
      S.dur=["today","days","week","weeks"][d.idx];
      S.step="severity"; await addBot(t("q_severity"),450);
      const sv=await askText(t("sev_hint")); S.sev=Math.max(1,Math.min(10,parseInt(sv)||5));
      if(S.sev>=9){ const conf=await chips(["Sudden & the worst I've ever had","Bad but building up gradually"]);
        if(conf.idx===0){ await emergencyStop(S.pains.includes("head")?"headache_worst":"acute_abdomen"); return; } }
      S.step="fever"; await addBot(t("q_fever"),450);
      const f=await chips([t("fever_no"),t("fever_warm"),t("fever_meas")]);
      if(f.idx===2){ const tv=await askText(t("temp_ph")); S.temp=parseFloat(tv)||null; S.feverKind="meas";
        if(S.temp && S.temp>=105){ await emergencyStop("breathing"); return; } }
      else if(f.idx===1){ S.feverKind="warm"; }
      S.step="pain"; await addBot(t("q_pain"),450);
      const P=[["none",t("pain_none")],["head",t("pain_head")],["eyes",t("pain_eye")],["ear",t("pain_ear")],["throat",t("pain_throat")],["chest",t("pain_chest")],["upabd",t("pain_upabd")],["lowabd",t("pain_lowabd")],["back",t("pain_back")],["joints",t("pain_joint")],["muscles",t("pain_muscle")],["skin",t("pain_skin")],["urinary",t("pain_urine")],["teeth",t("pain_teeth")]];
      const pr=await chips(P.map(x=>x[1]),{multi:true,doneLabel:t("continueBtn")});
      S.pains=pr.idxs.map(i=>P[i][0]).filter(x=>x!=="none");
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
  const av=await askText(t("age_ph")); S.age=parseInt(av)||null;
  const sx=await chips([t("sex_m"),t("sex_f"),t("sex_o")]); S.sex=["M","F","O"][sx.idx];
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
  let html=`<h3>${t("final_title")}</h3>`;
  if(!found.length && !qual.length){ html+=`<p>${t("report_none")}</p>`; }
  else{
    html+=`<p>${t("report_found")}</p><table><tr><th>Test</th><th>Value</th><th>Normal</th><th>Status</th></tr>`;
    found.forEach(f=>{ html+=`<tr><td>${f.lt.key.toUpperCase()}</td><td>${f.v} ${f.lt.unit}</td><td>${f.lt.low}–${f.lt.high}</td><td class="${f.stat==="OK"?"okv":""}" style="${f.stat!=="OK"?"color:var(--red);font-weight:600":""}">${f.stat}</td></tr>`; });
    html+=`</table>`;
    if(abnormal.length){ html+=`<h3>${t("abnormal_vals")}</h3><ul>`;
      abnormal.forEach(a=>{ if(a.msg) html+=`<li><b>${a.lt.key.toUpperCase()} ${a.stat}</b> — ${esc(a.msg)}</li>`; }); html+=`</ul>`; }
    else if(found.length) html+=`<p class="okv">✓ ${t("normal_vals")}.</p>`;
    if(qual.length){ html+=`<ul>`; qual.forEach(q=>html+=`<li class="emg">${esc(q.posMsg)}</li>`); html+=`</ul>`; }
    // dengue special: platelets low + fever
    const plt=found.find(f=>f.lt.key==="platelet");
    if(plt && plt.v<100000){ html+=`<div class="emg">Platelets below 1 lakh — go to a hospital today for monitoring.</div>`; }
  }
  html+=`<div class="chipRowBtn"><button class="bigBtn" onclick="makeReport()">📄 ${t("report_btn")}</button></div>`;
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
  const item={ id:S.id, date:S.date, title:(S.cond?S.cond.nm:"Consultation"), complaint:S.complaint,
    chat:CHAT().innerHTML, state:JSON.stringify({...S, transcript:[]}) };
  const ix=list.findIndex(x=>x.id===S.id); if(ix>=0) list[ix]=item; else list.unshift(item);
  localStorage.setItem(historyKey(), JSON.stringify(list.slice(0,40)));
}
function renderHistory(){
  const list=JSON.parse(localStorage.getItem(historyKey())||"[]");
  const el=$("histList"); el.innerHTML="";
  if(!list.length){ el.innerHTML=`<div id="histEmpty">${t("noHistory")}</div>`; return; }
  list.forEach(item=>{
    const d=document.createElement("div"); d.className="histCard";
    d.innerHTML=`<h4>${esc(item.title)} <small>${esc(item.date)}</small></h4><p>${esc(item.complaint)}</p>
    <div class="rowBtns"><button class="op">${t("view")}</button><button class="del">${t("delete")}</button></div>`;
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
  $("pageTitle").textContent=t("newAilment");
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
