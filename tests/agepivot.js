/* Does telling the reader WHO the patient is change what the app does?

   Every case here is written so the complaint text alone cannot answer it. The
   words are identical across both arms; only the profile differs. If the profile
   channel does nothing, the two arms must come out the same — and for most of
   this app's life they did, because the reader was sent the complaint and nothing
   else.

   Three arms per case:
     none  the old behaviour — no profile sent at all
     A     the arm where age raises the answer
     B     the arm where the same words are ordinary

   Reader output is replayed from agepivot_reader.json (captured live against
   worker v13). Scored at APP level — reader + flags + alarms + routing — because
   that is what the patient actually receives.
   Run: node tests/agepivot.js [--verbose] */
const {DB, scrubNegations, expandBrands} = require("./engine.js");
const fs=require("fs"), path=require("path");
const app=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
eval(app.slice(app.indexOf("const CHILD_WORD"), app.indexOf("/* ---------------- paediatric safety gate")));
eval(app.slice(app.indexOf("const PEDS_RULES"), app.indexOf("function medAllowed")));
eval(app.slice(app.indexOf("function alarmsIn"), app.indexOf("/* Is this flag even POSSIBLE")));

const cases=JSON.parse(fs.readFileSync(path.join(__dirname,"agepivot.json"),"utf8"));
const reader=JSON.parse(fs.readFileSync(path.join(__dirname,"agepivot_reader.json"),"utf8"));
const verbose=process.argv.includes("--verbose");
const RANK={ROUTINE:0,URGENT:1,EMERGENCY:2};

/* "68 years old, male" / "2 months old" -> months */
function profMonths(p){
  let m=/(\d+)\s*month/.exec(p); if(m) return +m[1];
  m=/(\d+)\s*year/.exec(p);      if(m) return +m[1]*12;
  return null;
}

function tierOf(caseText, key, ageM){
  const r=reader[key]||[null,null,0];
  const [rid, rflag, remg]=r;
  global.S={pains:[],llmHint:null,ageMonths:ageM};
  const low=scrubNegations(" "+expandBrands(caseText).toLowerCase()+" ");
  const flag=(rflag && DB.emergencyAdvice[rflag])?rflag:null;
  const urgentSet=new Set(DB.urgentIds||[]);
  if(flag) return [urgentSet.has(flag)?"URGENT":"EMERGENCY", "flag:"+flag];
  if(remg) return ["EMERGENCY","reader-emergency"];
  const al=alarmsIn(low);
  if(al.length) return ["URGENT","alarm:"+al[0].id];
  const d=rid?DB.conds.find(x=>x.id===rid):null;
  if(d && d.refer) return ["URGENT","refer:"+rid];
  return ["ROUTINE", rid||"generic"];
}

let armPass=0, armTotal=0, basePass=0, baseTotal=0, discrim=0, discrimTotal=0;
const fails=[];

cases.forEach(c=>{
  const armKeys=["A","B"];
  const tiers={};
  c.arms.forEach((arm,i)=>{
    const k=armKeys[i];
    const ageM=profMonths(arm.p);
    const want=arm.want.split("|");
    const [got,detail]=tierOf(c.text, c.id+"|"+k, ageM);
    tiers[k]=got;
    armTotal++;
    const ok=want.includes(got);
    if(ok) armPass++;
    else fails.push([c.id+" arm "+k, arm.p, got, arm.want, detail, arm.why]);
    if(verbose) console.log((ok?"ok   ":"FAIL ")+c.id+" "+k+"  "+arm.p.padEnd(32)+got.padEnd(10)+"want "+arm.want.padEnd(18)+detail);

    /* The old behaviour, for comparison: same complaint, no profile sent.
       Judged against the SAME expectation — because the patient is the same
       person either way; the app simply wasn't told. */
    const [bgot]=tierOf(c.text, c.id+"|none", ageM);
    baseTotal++;
    if(want.includes(bgot)) basePass++;
  });

  /* The sharper question: does the app DISTINGUISH the two patients at all? */
  const wantA=Math.max(...c.arms[0].want.split("|").map(w=>RANK[w]));
  const wantB=Math.max(...c.arms[1].want.split("|").map(w=>RANK[w]));
  if(wantA!==wantB){
    discrimTotal++;
    if(RANK[tiers.A]>RANK[tiers.B]) discrim++;
    else if(verbose) console.log("     ^ no discrimination: A="+tiers.A+" B="+tiers.B);
  }
});

if(fails.length){
  console.log("=== cases still wrong ===");
  fails.forEach(f=>console.log(f[0]+"  ["+f[1]+"]\n   got "+f[2]+", want "+f[3]+"  ("+f[4]+")\n   "+f[5]));
  console.log("");
}

const pc=n=>Math.round(n/armTotal*100);
console.log("WITH profile      "+armPass+"/"+armTotal+"  ("+pc(armPass)+"%)");
console.log("WITHOUT profile   "+basePass+"/"+baseTotal+"  ("+Math.round(basePass/baseTotal*100)+"%)   <- behaviour before this change");
console.log("");
console.log("age actually separates the two patients: "+discrim+"/"+discrimTotal+" cases where it should");
process.exit(0);
