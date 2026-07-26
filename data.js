/* DOCTO ONLINE — condition database compiled from the Ayurveda KB (knowledge_base/) and
   Allopathy KB (allopathy_knowledge_base/) in this folder. All doses = adult OTC.
   flags on modern items: pcm=paracetamol, nsaid, decong=decongestant, antihist-sed, laxstim */
const DB = {

/* ---------- EMERGENCY RED FLAGS (keyword triggers on free text + engine checks) ---------- */
redFlagKeywords: [
 {k:["chest pain","chest pressure","chest tightness","seene me dard","seene mein dard"], id:"cardiac"},
 {k:["can't breathe","cannot breathe","breathless at rest","saans nahi","gasping","blue lips"], id:"breathing"},
 {k:["face droop","slurred speech","one side weak","arm weakness sudden","stroke"], id:"stroke"},
 {k:["worst headache","thunderclap"], id:"headache_worst"},
 {k:["stiff neck fever","neck stiffness with fever"], id:"meningitis"},
 {k:["vomiting blood","blood in vomit","khoon ki ulti","coffee ground"], id:"gi_bleed"},
 {k:["black stool","blood in stool","khooni dast"], id:"gi_bleed"},
 {k:["coughing blood","blood in cough","khoon wali khansi"], id:"hemoptysis"},
 {k:["blood in urine","peshab me khoon"], id:"hematuria"},
 {k:["seizure","fit aaya","convulsion"], id:"seizure"},
 {k:["unconscious","fainted and not waking","behosh"], id:"unconscious"},
 {k:["suicide","end my life","khudkushi","self harm"], id:"crisis"},
 {k:["throat swelling","tongue swelling","anaphylaxis"], id:"anaphylaxis"},
 {k:["pregnant bleeding","pregnancy bleeding"], id:"preg_bleed"},
 {k:["severe abdominal pain","pet me bahut tez dard","rigid abdomen"], id:"acute_abdomen"},
 {k:["snake bite","poison","overdose","zeher"], id:"poison"},
 {k:["serotonin syndrome","neuroleptic malignant"], id:"serotonin_syndrome"},
 {k:["hypertensive crisis","bp 200","bp is 200","malignant hypertension"], id:"hypertensive_crisis"},
 {k:["testicle sudden pain"], id:"torsion"}
],

/* ---------- PATTERN RED FLAGS ----------
   Some emergencies have no single give-away phrase — they're a *combination*.
   Classic appendicitis, for instance, is pain that starts near the navel and
   migrates to the right lower abdomen, worse on walking/coughing, with nausea
   and a low fever. No individual word there is alarming; the pattern is.

   Each rule fires only when EVERY group in `need` has at least one hit in the
   text. Several rules may share an id (different routes to the same emergency). */
redFlagPatterns: [
 /* Appendicitis — route 1: right-lower-quadrant pain + migration/movement pain */
 {id:"appendicitis", need:[
   ["lower right","lower-right","right lower","right side of my abdomen","right side of abdomen",
    "right side abdomen","right iliac","rlq","right groin","pet ke dayin","pet ke daayin",
    "daayin taraf pet","right abdomen","right-side abdomen"],
   ["moved","shifted","migrat","started near my belly button","near my belly button","near the navel",
    "around the navel","around my navel","umbilic","nabhi","worse when i walk","worse on walking",
    "when i walk","when i cough","on coughing","when i cough or move","hurts to move","rebound",
    "worse when i move","speed bump","jumping"]
 ]},
 /* Appendicitis — route 2: right-lower-quadrant pain + fever + nausea/vomiting */
 {id:"appendicitis", need:[
   ["lower right","lower-right","right lower","right side of my abdomen","right side of abdomen",
    "right side abdomen","right iliac","rlq","pet ke dayin","pet ke daayin","daayin taraf pet"],
   ["fever","temperature","bukhar","100.","101","102","103"],
   ["nausea","nauseous","vomit","ulti","throwing up","no appetite","loss of appetite"]
 ]},
 /* Bowel obstruction — pain + vomiting + nothing passing */
 {id:"obstruction", need:[
   ["abdominal pain","stomach pain","pet dard","pet me dard","belly pain","tummy pain","abdomen pain"],
   ["vomit","ulti","throwing up"],
   ["no stool","not passing stool","no gas","not passing gas","cannot pass gas","no motion",
    "constipated for","bloated and hard","distended","swollen belly","pet phool"]
 ]},
 /* Ectopic pregnancy — one-sided lower abdominal pain + missed period/pregnancy */
 {id:"ectopic", need:[
   ["lower abdomen","lower abdominal","one side pain","pelvic pain","pet ke niche","lower belly","pelvis"],
   ["missed period","late period","periods missed","pregnant","pregnancy","positive test","garbh"],
   // needs a concerning feature — bare "pain" in pregnancy is usually benign
   ["bleeding","spotting","dizzy","faint","lightheaded","shoulder pain","collaps","severe pain","sharp, severe"]
 ]},
 /* Meningitis — fever with neck stiffness / light intolerance / rash */
 {id:"meningitis", need:[
   ["fever","bukhar","temperature"],
   ["stiff neck","neck stiff","cannot touch chin","neck pain and fever","gardan akad"],
   ["headache","light hurts","photophobia","rash","confus","drowsy","vomit"]
 ]},
 /* Silent / atypical heart attack. In an older or diabetic person the classic
    chest pain is often absent, and the picture — sudden lethargy, sweating,
    faster breathing, one vomit, "no pain anywhere" — reads as something mild.
    This must outrank the metabolic reading of the same symptoms. */
 {id:"atypical_acs", need:[
   ["diabet","elderly","76-year","78-year","80-year","82-year","85-year","grandmother","grandfather",
    "my mother","my father","senior citizen","70-year","72-year","75-year"],
   ["sluggish","lethargic","unusually tired","suddenly weak","loss of appetite","lost her appetite",
    "lost his appetite","not himself","not herself","acting strange","confus"],
   ["sweating","clammy","breathing faster","breathing a bit faster","short of breath","vomit","nausea",
    "jaw","shoulder","indigestion"]
 ]},
 /* Diabetic emergency — needs actual evidence of a glucose/ketone problem, not
    merely the word "diabetic" beside a vomit. Without that, the same symptoms
    in an older adult are more likely cardiac or septic. */
 {id:"dka", need:[
   ["sugar is high","high sugar","blood sugar","sugar reading","glucose","hba1c","ketone","shugar",
    "over 450","above 600","450 mg","600 mg","reads high"],
   ["vomit","deep breathing","rapid breathing","breathless","very thirsty","excessive thirst",
    "drowsy","confus","fruity breath","stomach pain"]
 ]},
 /* Severe dehydration — many loose stools/vomits + not passing urine / dizzy on standing */
 {id:"dehydration", need:[
   ["loose motion","diarrhea","diarrhoea","dast","vomiting many","vomited many","many times"],
   ["not passing urine","no urine","very little urine","peshab nahi","dizzy when standing",
    "dizzy on standing","cannot keep anything down","sunken eyes","very weak","dry mouth and dizzy"]
 ]},
 /* ---------- neurological ---------- */
 {id:"head_injury", need:[
   ["hit in the head","hit on the head","head injury","struck the head","hit his head","hit her head",
    "lost consciousness","knocked out","blow to the head","fell and hit"],
   ["somnolent","very drowsy","extremely drowsy","hard to wake","won't wake","cannot wake","vomit",
    "pupil is larger","one pupil","unequal pupil","confus","seizure","getting worse"]
 ]},
 {id:"subdural", need:[
   ["bumped his head","bumped her head","bumped my head","hit his head","hit her head","head injury","fell",
    "knocked his head","knocked her head"],
   ["weeks ago","days ago","last week","two weeks","a month ago","since then"],
   ["confus","unsteady","off balance","worsening headache","getting worse","drowsy","not himself","not herself",
    "memory","dementia","slower"]
 ]},
 {id:"tia", need:[
   ["arm went weak","arm was weak","face droop","speech was slurred","slurred speech","couldn't speak",
    "vision went","numbness on one side","weakness on one side"],
   ["went away","resolved","back to normal","completely normal","lasted about","for about 15 minutes",
    "for a few minutes","for 10 minutes","for 20 minutes","temporar"]
 ]},
 {id:"myasthenic_crisis", need:[
   ["myasthenia","myasthenic"],
   ["droop","nasal","swallow","breath","weak","choking"]
 ]},
 {id:"spinal_abscess", need:[
   ["back pain","mid-back","spine pain","lower back"],
   ["fever","102","101","103","chills","infection"],
   ["legs feel weak","leg weakness","weak when walking","heavy when walking","cannot walk","numb","iv drug",
    "inject","bladder"]
 ]},
 /* ---------- cardiovascular ---------- */
 /* Classic MI wording. The keyword list only held the exact phrase "chest pain",
    so "crushing pressure in the centre of my chest" was slipping through. */
 {id:"cardiac", need:[
   ["chest","sternum","breastbone","seene"],
   ["crushing","heavy","heaviness","pressure","tightness","squeezing","band around","elephant"],
   ["radiat","to my jaw","to my arm","left arm","shoulder","sweating","clammy","nausea","short of breath",
    "breathless","cold sweat","impending doom"]
 ]},
 {id:"cardiac", need:[
   ["upper stomach","upper abdomen","epigastr","indigestion","heartburn","belching","burping"],
   ["sweating heavily","sweating","clammy","cold sweat","dizzy","short of breath","antacid didn't work",
    "antacid did not work","pressure","crushing","heavy feeling"]
 ]},
 {id:"tamponade", need:[
   ["pericarditis","fluid around my heart","pericardial"],
   ["weak","heart is racing","racing heart","lightheaded","dizzy","neck veins","short of breath","swollen neck"]
 ]},
 {id:"limb_ischemia", need:[
   ["leg","arm","foot","hand","toes","fingers"],
   ["cold to the touch","cold and pale","pale","white","blue","no pulse","cannot feel my toes",
    "barely feel my toes","cannot wiggle","barely feel"],
   ["sudden","suddenly","painful","severe pain","numb"]
 ]},
 /* ---------- abdominal ---------- */
 {id:"perforation", need:[
   ["hard as a board","board-like","board like","rigid","stomach feels hard","belly is hard","tender to touch",
    "hurts to even touch","hurts to move"],
   ["sudden","suddenly","severe","sharp","intense"]
 ]},
 {id:"pancreatitis", need:[
   ["upper abdomen","upper belly","upper stomach","epigastr"],
   ["radiates to my back","through to my back","goes to my back","into my back","straight to my back"],
   ["severe","burning","boring","deep","worse when i lie","better leaning","drinking","alcohol","gallstone","vomit"]
 ]},
 {id:"hernia_strangulated", need:[
   ["hernia","bulge","lump in my groin","swelling in my groin"],
   ["purple","dark","black","won't push back","will not push back","cannot push it back","stuck","irreducible",
    "intensely painful","very painful","vomit","throwing up"]
 ]},
 {id:"cholangitis", need:[
   ["gallstone","gall bladder","gallbladder","bile duct","right upper"],
   ["fever","chills","rigors"],
   ["yellow","jaundice","eyes look yellow","dark urine","pale stool","severe pain"]
 ]},
 {id:"splenic_rupture", need:[
   ["mono","mononucleosis","glandular fever","epstein","enlarged spleen","spleen"],
   ["upper left","upper-left","left upper","left shoulder","left side"],
   ["pain","bumped","knock","injury","hit"]
 ]},
 {id:"intussusception", need:[
   ["month-old","months old","month old","baby","infant","toddler","my son is","my daughter is","8-month","6-month"],
   ["crying inconsolably","inconsolable","drawing his knees","pulling his knees","pulling her knees","knees up to his chest",
    "knees up to her chest","screaming in waves","comes in waves"],
   ["lethargic","floppy","vacant","jelly","redcurrant","red jelly","dark red stool","blood in the nappy","blood in the diaper"]
 ]},
 {id:"pyloric_stenosis", need:[
   ["newborn","week-old","weeks old","week old","3-week","baby boy","infant"],
   ["projectile","forcefully","forceful","across the room","shoots out"],
   ["vomit","throwing up","after every feed","after each feed","after feeding"]
 ]},
 /* ---------- respiratory ---------- */
 {id:"pneumothorax", need:[
   ["chest"],
   ["sudden sharp","sharp pain","stabbing"],
   ["short of breath","breathless","gasping","cannot breathe","blue lips","lips look blue","hard to breathe"]
 ]},
 {id:"asthma_severe", need:[
   ["asthma","inhaler","nebuli"],
   ["not working","isn't working","no relief","after 6 puffs","after six puffs","still cannot breathe"],
   ["one or two words","few words at a time","cannot finish a sentence","gasping","sucked in","ribs are pulling",
    "chest is sucked","struggling to breathe"]
 ]},
 {id:"epiglottitis", need:[
   ["drool","cannot swallow my saliva","can't swallow my saliva","swallowing my own saliva","spitting into a cup",
    "leaning forward","tripod","chin sticking out","hot potato","muffled voice","stridor","squeaking noise"],
   ["sore throat","throat","fever","swallow","breathe","voice"]
 ]},
 /* ---------- obstetric & gynae ---------- */
 {id:"abruption", need:[
   ["pregnant","weeks pregnant","garbh","pregnancy"],
   ["rock-hard","rock hard","hard abdomen","tense abdomen","constant pain","continuous pain","severe uterine pain",
    "bleeding","dark blood","dark vaginal"]
 ]},
 {id:"ovarian_torsion", need:[
   ["ovarian cyst","ovary","ovarian"],
   ["sudden","suddenly","agonis","agoniz","severe pain","sharp waves","comes in waves"],
   ["lower right","lower left","lower abdomen","pelvi","one side"]
 ]},
 {id:"pid_severe", need:[
   ["pelvic pain","lower abdomen","lower belly","pelvis"],
   ["foul-smelling","foul smelling","bad smelling discharge","offensive discharge","discharge"],
   ["fever","102","101","103","severe","chills"]
 ]},
 /* ---------- toxicology ---------- */
 {id:"paracetamol_od", need:[
   ["tylenol","paracetamol","acetaminophen","crocin","dolo"],
   ["whole bottle","overdose","too many","a lot of pills","handful","took all","20 tablets","entire bottle"]
 ]},
 {id:"digoxin_tox", need:[
   ["digoxin","lanoxin","digitalis"],
   ["nausea","weak","yellow","green tint","halo","vision","slow heart","skipping"]
 ]},
 {id:"lithium_tox", need:[
   ["lithium"],
   ["shaking","tremor","slurred","unsteady","ringing in","confus","vomit","diarrhea","diarrhoea","twitch"]
 ]},
 {id:"opioid_od", need:[
   ["won't wake","will not wake","cannot wake","unresponsive","not waking","passed out","took some pills",
    "heroin","fentanyl","oxycodone","tramadol","opioid","morphine"],
   ["breathing is very slow","slow breathing","shallow breathing","barely breathing","pinpoint","tiny pupils",
    "blue lips","4 breaths","few breaths a minute"]
 ]},
 {id:"last_toxicity", need:[
   ["lidocaine","lignocaine","local anaesthetic","local anesthetic","dental injection","numbing injection"],
   ["tongue feels numb","metallic","ringing in my ears","tinnitus","dizzy","fluttering","twitch","seizure"]
 ]},
 /* ---------- endocrine, renal, metabolic ---------- */
 {id:"adrenal_crisis", need:[
   ["addison","adrenal insufficiency","steroid dependent","hydrocortisone","adrenal"],
   ["vomit","dizzy","weak","collapse","low blood pressure","stomach hurts","abdominal pain","cannot keep"]
 ]},
 {id:"hypoglycemia", need:[
   ["insulin","diabet","sugar","cgm","glucose"],
   ["forgot to eat","skipped a meal","missed dinner","did not eat","reads low","very low","hypo"],
   ["shaking","sweating","confus","double vision","dizzy","cold sweat","faint","trembl"]
 ]},
 {id:"hyperkalemia", need:[
   ["dialysis","kidney failure","renal failure","potassium"],
   ["missed","skipped","did not go","couldn't go"],
   ["muscle","weak","tingling","skipping beats","palpitation","heart feels","irregular"]
 ]},
 {id:"rhabdo", need:[
   ["muscle","thigh","calf","shoulders","arms"],
   ["dark urine","dark tea","tea colour","tea color","cola","brown urine","coke coloured","coke colored"],
   ["pain","sore","swollen","ache","workout","exercise","gym","cycling","spin class"]
 ]},
 {id:"malignant_hyperthermia", need:[
   ["after surgery","anaesthesia","anesthesia","recovery after","operation","general anaesthetic"],
   ["temperature","fever","104","105","spiked"],
   ["rigid","stiff muscles","muscles are extremely","heart rate","racing"]
 ]},
 /* ---------- infectious & haematological ---------- */
 {id:"neutropenic_fever", need:[
   ["chemotherapy","chemo","immunosuppress","transplant","neutropenic","cancer treatment"],
   ["fever","temperature","101","100.","102","103"]
 ]},
 {id:"sickle_crisis", need:[
   ["sickle"],
   ["pain","crisis","chest","legs","arms","back"]
 ]},
 /* ---------- eye & environmental ---------- */
 {id:"crao", need:[
   ["lost vision","loss of vision","went dark","cannot see","blind","vision gone","no vision"],
   ["sudden","suddenly","instantly","this morning","woke up"],
   ["one eye","left eye","right eye","in that eye"]
 ]},
 {id:"heat_stroke", need:[
   ["hot day","heat","marathon","in the sun","working outside","heatwave"],
   ["stopped sweating","hot and dry","dry skin","not sweating"],
   ["confus","slurring","collapse","unconscious","drowsy","disorient"]
 ]},
/* Hot swollen joint with fever — indistinguishable from gout without aspiration */
 {id:"septic_arthritis", need:[
   ["joint","knee","hip","shoulder","elbow","wrist","ankle","toe"],
   ["hot","swollen","red","cannot move","can't move","unable to move"],
   ["fever","chills","unwell","102","101","103"]
 ]},
 /* Palpitations with haemodynamic consequence */
 {id:"arrhythmia", need:[
   ["palpitation","heart racing","racing heart","heart pounding","skipping beats","fluttering","irregular heartbeat"],
   ["faint","fainted","dizzy","lightheaded","chest pain","breathless","collaps","black out"]
 ]},
 /* Mastoiditis — the swelling is behind the ear, not in it */
 {id:"mastoiditis", need:[
   ["behind the ear","behind my ear","behind his ear","behind her ear","mastoid"],
   ["swollen","swelling","tender","red","pushed forward","sticking out"]
 ]},
 /* Kidney infection */
 {id:"pyelonephritis_flag", need:[
   ["flank","loin","side of my back","kidney area","back pain"],
   ["fever","chills","rigors"],
   ["burning urine","burning when i pee","urine","peshab","frequency","urinary"]
 ]},
 /* Spreading skin infection. Warmth alone is not enough — a mosquito bite is
    warm and red too. Require actual progression, or warmth plus feeling unwell. */
 {id:"cellulitis_flag", need:[
   ["redness","red area","red patch","skin is red","red and swollen"],
   ["spreading","getting bigger","advancing","tracking up","red streaks","larger than yesterday",
    "growing","crept up","moving up my"]
 ]},
 {id:"cellulitis_flag", need:[
   ["redness","red area","red patch","skin is red","red and swollen"],
   ["warm","hot to touch","swollen","tender"],
   ["fever","chills","unwell","shivering","102","101","103"]
 ]},
 /* Rabies exposure — any mammal bite counts */
 {id:"rabies_flag", need:[
   ["dog","cat","monkey","bat","mongoose","stray","puppy","kitten"],
   ["bit me","bite","bitten","scratch","scratched","licked"]
 ]},
 /* Non-healing oral lesion */
 {id:"oral_cancer_flag", need:[
   ["mouth ulcer","ulcer in my mouth","patch in my mouth","white patch","red patch","sore in my mouth","tongue ulcer"],
   ["three weeks","3 weeks","month","months","not healing","won't heal","hasn't healed","never heals","tobacco","gutkha","gutka","khaini","paan","areca","supari"]
 ]},
 /* Thyroid storm — known hyperthyroidism plus a trigger and systemic upset.
    Almost always self-explained as "just a stomach bug" or "just anxiety". */
 {id:"thyroid_storm", need:[
   ["graves","hyperthyroid","overactive thyroid","thyrotoxic","thyroid storm","carbimazole","methimazole",
    "propylthiouracil","thyroid problem","thyroid ki problem"],
   ["fever","high temperature","103","104","105","heart rate","racing heart","palpitation","bpm","pounding heart",
    "sweating","tremor","trembling","shaking","confus","agitat","very anxious","extremely anxious","vomit","diarrhea"]
 ]},
 /* Cauda equina — saddle numbness + bladder/bowel change. The person usually
    presents it as "bad back pain", and resting is the instinctive wrong answer. */
 {id:"cauda_equina", need:[
   ["numb","no feeling","cannot feel","can't feel","cant feel","sunn","tingling","pins and needles"],
   ["inner thigh","inner thighs","groin","buttock","saddle","between my legs","perineum","private area",
    "genital","sit bones","both legs"]
 ]},
 {id:"cauda_equina", need:[
   ["back pain","lower back","spine","slip disc","disc","sciatica","lifted","lifting","pop in my back","kamar dard"],
   ["cannot feel if","couldn't tell if","can't tell if","cant tell if","not able to pass urine","cannot pass urine",
    "retention","leaking urine","wet myself","no control over","lost control of my bladder","lost control of my bowel",
    "incontinen","cannot feel myself wiping","couldn't feel myself wiping","numb when i wipe"]
 ]},
 /* Aortic dissection — tearing pain radiating to the back */
 {id:"aortic_dissection", need:[
   ["tearing","ripping","like being torn","knife between my shoulder"],
   ["chest","between my shoulder blades","upper back","back"]
 ]},
 /* Leaking aortic aneurysm */
 {id:"aaa", need:[
   ["pulsating","pulsatile","throbbing lump","aneurysm"],
   ["abdomen","abdominal","belly","stomach","back"]
 ]},
 /* Sepsis — infection plus systemic collapse signs */
 {id:"sepsis", need:[
   ["fever","infection","bukhar","high temperature","chills","rigors","103","104","105"],
   ["confus","disorient","not making sense","very drowsy","slurring","mottled","blotchy skin","cold clammy",
    "shivering uncontrollably","breathing very fast","barely passing urine","not passed urine all day","bp is low","low blood pressure"]
 ]},
 /* Necrotising soft-tissue infection — pain out of proportion, spreading fast */
 {id:"nec_fasc", need:[
   ["spreading redness","redness spreading","red line spreading","dusky","blister","purplish","purple-black",
    "skin turning purple","skin turning black","black patch","bright red and hot","hot to touch"],
   ["pain out of proportion","out of proportion","far worse","much worse than it looks","excruciating",
    "unbearable pain","fever","very unwell","feel terrible","chills","rapidly","spreading fast","by the hour"]
 ]},
 /* Frank rectal bleeding — phrased a hundred ways, all of them urgent */
 {id:"gi_bleed", need:[
   ["blood in my stool","blood in the stool","bright red blood","rectal bleeding","passed blood","blood when i pass",
    "blood in my motion","blood in the toilet","bleeding from the back","maroon stool","black tarry"],
   /* Volume or systemic upset. A streak on the paper after a hard stool is
      usually piles; a significant amount with dizziness is a bleed. */
   ["significant amount","large amount","lots of blood","a lot of blood","clots","filling the toilet",
    "black","tarry","maroon","dizzy","faint","lightheaded","weak","pale","severe pain","crampy"]
 ]},
 /* Anaphylaxis — allergen exposure plus skin and airway together */
 {id:"anaphylaxis", need:[
   ["hives","welts","urticaria","lips swelled","lip swelling","face swelled","swollen lips","swollen face",
    "throat closing","tongue swelling"],
   ["wheez","cough","short of breath","breathing","throat","dizzy","faint","vomit","collaps"]
 ]},
 /* New-onset diabetes tipping into DKA — the child has no diagnosis yet, so
    nothing in the text says "diabetes". The fruity breath is the giveaway. */
 {id:"dka", need:[
   ["fruity","sweet smell","smells like fruit","smells like nail polish","acetone","pear drops"],
   ["breath"]
 ]},
 {id:"dka", need:[
   ["drinking lots of water","drinking tons of water","drinking a lot of water","very thirsty","always thirsty",
    "wetting the bed","bedwetting","passing lots of urine","peeing all the time","losing weight"],
   ["breathing heavily","breathing fast","breathing rapidly","deep breathing","vomit","very tired","extremely tired",
    "lethargic","drowsy","confus"]
 ]},
 /* Compartment syndrome — after injury or a tight cast */
 {id:"compartment", need:[
   ["cast","plaster","bandage too tight","after the injury","after my fracture","crush","broke my"],
   ["pain is getting worse","severe pain","unbearable pain","pain out of proportion","tight","swollen and tight",
    "numb","tingling","cannot move my toes","cannot move my fingers"]
 ]},
 /* Acute angle-closure glaucoma */
 {id:"glaucoma_acute", need:[
   ["eye","vision","sight"],
   ["halo","rainbow","blurred","blurry","hazy","cloudy vision","misty vision"],
   ["pain","ache","agonis","agoniz","vomit","nausea","headache","forehead","brow"]
 ]},
 /* Giant cell (temporal) arteritis */
 {id:"temporal_arteritis", need:[
   ["temple","temporal","side of my head","scalp"],
   ["tender","hurts to brush","hurts to comb","jaw aches when","jaw pain when chewing","jaw claudication",
    "vision","blurred","lost sight"]
 ]},
 /* Retinal detachment */
 {id:"retinal_detach", need:[
   ["floaters","flashes of light","flashing lights","curtain","shadow across","veil over my vision","black curtain"],
   ["vision","eye","sight","see"]
 ]},
 /* DVT with possible pulmonary embolism */
 {id:"dvt_pe", need:[
   ["calf","one leg","leg is swollen","swollen leg","thigh is swollen","behind my knee"],
   ["swollen","swelling","warm","red","tender","painful"],
   ["breathless","short of breath","chest pain","cough","hard to breathe","pain when i breathe","coughing blood",
    "long flight","long journey","after surgery","bed rest","plaster"]
 ]},
 /* Carbon monoxide — the "everyone in the house has it" clue */
 {id:"co_poisoning", need:[
   ["headache","dizzy","nausea","confus","drowsy"],
   ["everyone in the house","whole family","my roommate too","others also","my pet","the dog too",
    "geyser","gas heater","generator","coal","angeethi","sigri","chimney","boiler"]
 ]},
 /* Meningococcal sepsis — the non-blanching rash */
 {id:"meningococcal", need:[
   ["rash","spots","purple marks","red spots","blotches","petechia","petechiae"],
   ["does not fade","doesn't fade","dont fade","do not fade","don't fade","not fade when press","glass test",
    "non-blanching","non blanching","stays when i press","still there when press","press a glass",
    "pressing a glass","glass on them","glass against"]
 ]},
 /* Same emergency described without knowing the glass test: fever + purple/bruise-like spots */
 {id:"meningococcal", need:[
   ["fever","bukhar","high temperature"],
   ["purple spots","purple rash","purple marks","dark red spots","blood spots","bruise-like","looks like bruises",
    "pinprick spots","petechia","petechiae"]
 ]},
 /* MAOI + tyramine ("cheese reaction") — a hypertensive crisis that reads like a migraine.
    The person is often certain it's just a bad headache, which is exactly the danger. */
 {id:"maoi_crisis", need:[
   ["maoi","mao inhibitor","phenelzine","nardil","tranylcypromine","parnate","isocarboxazid","marplan",
    "selegiline","emsam","moclobemide","rasagiline","linezolid"],
   ["headache","neck stiff","stiff neck","racing heart","palpitation","heart pounding","sweating",
    "blood pressure","bp ","nausea","dizzy","chest pain","vomit"]
 ]},
 /* Same crisis described by the food trigger rather than the drug name */
 {id:"maoi_crisis", need:[
   ["antidepressant","depression medicine","psychiatric medicine"],
   ["aged cheese","cured meat","red wine","salami","soy sauce","fermented","tyramine","pepperoni","sauerkraut"],
   ["pounding headache","throbbing headache","severe headache","neck stiff","stiff neck","racing heart",
    "palpitation","blood pressure"]
 ]},
 /* Serotonin syndrome — serotonergic drug + the triad of mental, autonomic and neuromuscular signs */
 {id:"serotonin_syndrome", need:[
   ["ssri","snri","sertraline","fluoxetine","escitalopram","citalopram","paroxetine","venlafaxine",
    "duloxetine","tramadol","triptan","sumatriptan","st john","maoi","linezolid","lithium"],
   ["agitat","confus","restless","twitch","muscle jerk","stiff muscles","tremor","shivering"],
   ["sweating","fever","fast heartbeat","racing heart","dilated pupil","diarrhea","high temperature"]
 ]},
 /* Pre-eclampsia — pregnancy + headache/vision change/swelling/upper-abdominal pain */
 {id:"preeclampsia", need:[
   ["pregnan","garbh","expecting"],
   ["headache","blurred vision","seeing spots","swelling of face","swollen hands","upper abdominal pain",
    "pain under ribs","sudden swelling"]
 ]}
],
emergencyAdvice: {
 /* Used when the reader recognises a genuine emergency we have no specific entry
    for. The safety instructions are ours; only the reason is quoted from the reader. */
septic_arthritis:"A single joint that is hot, swollen and so painful you cannot move it, with fever, is a septic joint until proven otherwise. Pus inside a joint destroys the cartilage within days and it is easily mistaken for gout. Go to an emergency department NOW and ask for the joint to be aspirated before any steroid is given.",
 arrhythmia:"A heart that is racing, thumping or skipping in a way that makes you faint, breathless or gives you chest pain needs an ECG while it is happening. Go to an emergency department now rather than waiting for it to settle. If you feel faint, lie down and raise your legs. Avoid caffeine, alcohol and stimulants meanwhile, and bring a list of your medicines.",
 mastoiditis:"Swelling and tenderness of the bone behind the ear, pushing the ear forward, with fever and ear pain, is mastoiditis — infection spreading into the skull bone. It needs intravenous antibiotics and sometimes surgery. Go to hospital now; ear drops will not reach it.",
 pyelonephritis_flag:"Fever with chills and pain in the flank alongside urinary symptoms means the infection has reached the kidney. This needs a urine culture and a proper antibiotic course today — an over-the-counter course will under-treat it and risks permanent kidney scarring. Go the same day, and urgently if you are pregnant or diabetic.",
 cellulitis_flag:"Redness that is spreading, warm and tender needs oral antibiotics today — creams do not treat it. Mark the edge with a pen and note the time; if it advances past the mark within hours, that is urgent. Go immediately instead if the pain is far worse than the skin looks, the skin is turning dusky or blistering, or you feel profoundly unwell.",
 rabies_flag:"Treat any bite, scratch or lick on broken skin from a dog, cat, monkey or bat as a rabies exposure. Wash the wound with soap under running running water for a full 15 minutes NOW — that alone substantially reduces risk — then go the same day for vaccination, which is free at government hospitals. Do not apply chillies, oil, turmeric or herbal pastes, and do not wait to see whether the animal falls ill.",
 oral_cancer_flag:"A mouth ulcer or patch that has not healed in three weeks, especially with any tobacco, gutkha or areca nut use, must be examined and biopsied — not treated with another ointment. India has one of the world's highest oral cancer burdens, and early disease is highly curable while late disease often is not. Arrange a dental or ENT appointment this week.",
 unspecified:"From what you've described, this needs assessment in a hospital now rather than treatment at home. Go to the nearest emergency department, or call an ambulance (India 108/102) if you feel too unwell to travel safely. Take a list of your medicines and any recent reports. Do not eat or drink until you have been assessed, in case a procedure is needed, and do not drive yourself.",
 cardiac:"Chest pain/pressure — especially with sweating, breathlessness, or pain spreading to arm/jaw — can be a heart attack.",
 breathing:"Severe difficulty breathing needs emergency care now.",
 stroke:"Face drooping, arm weakness or slurred speech are stroke signs. Every minute matters.",
 headache_worst:"A sudden 'worst-ever' headache needs an emergency scan.",
 meningitis:"Fever with a stiff neck (± rash/confusion) can be meningitis.",
 gi_bleed:"Vomiting blood or black/bloody stools means internal bleeding.",
 hemoptysis:"Coughing up blood needs urgent evaluation.",
 hematuria:"Visible blood in urine needs urgent evaluation.",
 seizure:"A first or prolonged seizure is an emergency.",
 unconscious:"Unresponsiveness is an emergency.",
 crisis:"You matter. Please reach out right now — call a suicide-prevention helpline (India: 9152987821 / Tele-MANAS 14416) or go to the nearest emergency room. You don't have to face this alone.",
 anaphylaxis:"Swelling of lips/tongue/throat or hives with breathlessness is anaphylaxis. Use an adrenaline pen if available.",
 preg_bleed:"Bleeding or severe pain in pregnancy needs emergency obstetric care.",
 acute_abdomen:"Severe or rigid abdominal pain can be appendicitis/obstruction.",
 appendicitis:"What you're describing fits appendicitis — pain that begins near the navel and settles in the lower right abdomen, worse on walking or coughing, with nausea and a mild fever. This needs a surgeon's assessment today, not painkillers at home. Go to a hospital emergency department now. On the way: nothing to eat or drink (you may need surgery), no painkillers (they mask the picture and delay diagnosis), and absolutely no laxatives or enemas — they can rupture an inflamed appendix. A delay of a day risks perforation.",
 obstruction:"Abdominal pain with vomiting and no stool or gas passing suggests a bowel obstruction. Go to hospital now. Nothing by mouth on the way, and no laxatives.",
 ectopic:"One-sided lower abdominal pain with a missed or late period can be an ectopic pregnancy, which can bleed internally. This is an emergency — go to a hospital with gynaecology/emergency care now, even if the pain eases.",
 dka:"High blood sugar with vomiting, deep or rapid breathing, extreme thirst or drowsiness can be diabetic ketoacidosis. Go to hospital now. Sip water on the way; do not skip your insulin unless a doctor tells you to.",
 dehydration:"Repeated loose stools or vomiting with very little urine, dizziness on standing, or an inability to keep fluids down means significant dehydration. Start ORS in small frequent sips right away, and go to a hospital — you may need IV fluids, especially if this is a child or an elderly person.",
 preeclampsia:"In pregnancy, a persistent headache, blurred vision or seeing spots, sudden swelling of the face or hands, or pain under the ribs can signal pre-eclampsia. Go to your maternity hospital now for a blood-pressure and urine check — this can progress quickly.",
 poison:"Suspected poisoning/overdose/bite — emergency now. Do not induce vomiting.",
 atypical_acs:"In an older adult — especially with diabetes — a heart attack often arrives with NO chest pain at all. Sudden lethargy, loss of appetite, one episode of vomiting, light sweating and slightly faster breathing is a recognised presentation, and diabetic nerve damage is why the pain is missing. The same picture also fits a serious infection or a metabolic crisis, and all three are dangerous. Do not let her sleep it off — sleeping through it is how these are missed. Call an ambulance now and ask for an ECG and troponin on arrival. Keep her sitting up and resting, give nothing by mouth, and do not give aspirin without medical advice if there is any chance of a bleed.",
 /* ---- cardiovascular (advanced) ---- */
 endocarditis:"Weeks of low-grade fever, night sweats and fatigue in someone with a heart murmur, now with splinter-like streaks under the nails and painful raised spots on the fingertips, is infective endocarditis — an infection on a heart valve throwing off small emboli. It needs blood cultures and an echocardiogram, then weeks of intravenous antibiotics; tablets from a pharmacy will not clear it and taking them first can mask the cultures. Go to a hospital today, before any antibiotic.",
 svc_syndrome:"Swelling of the face, neck and upper chest that worsens on bending or lying down, with distended chest veins and a hoarse voice, is superior vena cava obstruction — the main vein returning blood from the head is being compressed, usually by a mass in the chest. Go to an emergency department today. Sit upright rather than lying flat, and seek help sooner if breathing becomes difficult, you become confused, or swallowing becomes hard.",
 pulm_htn_crisis:"Fainting on exertion in pulmonary hypertension is an ominous sign — it means the right heart cannot maintain output, and it carries a high risk of sudden deterioration. Blue lips confirm poor oxygenation. Call an ambulance now. Sit upright, avoid all further exertion including walking to the car, and do not take any extra dose of your own medicines to compensate.",
 /* ---- neurological (advanced) ---- */
 cord_compression:"Back pain in someone with cancer, followed by leg weakness, numbness and inability to pass urine, is malignant spinal cord compression. Function lost before treatment is usually not recovered, and the window is hours. Go to an emergency department NOW and say 'I have cancer and I think this is spinal cord compression — I need an urgent MRI whole spine and steroids'. Do not wait for your oncology appointment.",
 gbs:"Numbness and weakness that began in the feet and is climbing upwards over days, a week or two after an infection, fits Guillain-Barré syndrome. It ascends, and once it reaches the breathing muscles it becomes life-threatening — which is why it is assessed in hospital rather than watched at home. Go to an emergency department today. Seek help immediately if breathing becomes difficult, swallowing changes, or the weakness climbs quickly.",
 nph:"That triad — a shuffling magnetic gait, urinary accidents and increasing forgetfulness — is the classic picture of normal pressure hydrocephalus, and it matters because unlike most causes of dementia it is potentially reversible with a shunt. It is frequently written off as ageing. Ask a doctor this week for a neurology referral and a CT or MRI of the head; mention all three symptoms together, as that combination is the reason to test.",
 /* ---- respiratory & thoracic (advanced) ---- */
 aspiration:"A sudden violent coughing fit while playing with small objects, followed by a persistent wheeze heard on one side only, means an inhaled foreign body sitting in one airway. Even when the child looks comfortable, it must come out — it can shift and block the airway completely, and retained objects cause pneumonia. Go to a children's emergency department now. Do not attempt back blows or abdominal thrusts while she is breathing and coughing effectively, and do not try to fish anything out of her mouth.",
 chest_trauma:"A section of chest wall that sucks inward as you breathe in and bulges outward as you breathe out is a flail segment — several ribs broken in two places. The danger is the bruised lung underneath, which worsens over the following hours. Call an ambulance now. Do not strap or bind the chest, keep still, and do not take anything by mouth.",
 fat_embolism:"Confusion, breathlessness and a fine pinpoint rash over the neck and chest a day after a long-bone fracture is fat embolism syndrome — marrow fat entering the bloodstream and lodging in the lungs and brain. It needs oxygen and monitoring in hospital. Get him to an emergency department NOW, and mention the femur fracture and the rash specifically.",
 blast_injury:"Coughing bloody froth with chest pain and breathlessness after an explosion is blast lung — the pressure wave injures the lungs even with no external wound. It typically worsens over the first hours, so feeling able to walk now is not reassurance. Call an ambulance NOW, sit upright, and tell them it was a blast injury.",
 /* ---- gastrointestinal & hepatic (advanced) ---- */
 boerhaave:"Sudden tearing chest or upper abdominal pain after violent vomiting, with a crackling sensation under the skin of the chest, is an oesophageal rupture. It is rapidly fatal without surgery and every hour of delay worsens the odds. Call an ambulance NOW. Nothing by mouth at all — not even water.",
 sbp:"Fever, abdominal tenderness and new confusion in cirrhosis with ascites is spontaneous bacterial peritonitis. The confusion means it is already affecting brain function, and it needs a diagnostic ascitic tap and intravenous antibiotics tonight. Go to an emergency department NOW. Do not take painkillers, especially ibuprofen-type drugs, which can shut down the kidneys in this situation.",
 mesenteric_ischemia:"Severe abdominal pain that is dramatically out of proportion to a soft, non-tender belly — particularly with atrial fibrillation — is acute mesenteric ischaemia: a clot has cut off the bowel's blood supply. That mismatch between agony and a normal examination is the diagnostic clue, and it is often mistaken for gastritis. Bowel dies within hours. Go to an emergency department NOW and ask for an urgent CT angiogram of the abdomen. Nothing by mouth.",
 liver_failure:"Jaundice, vomiting, lethargy and confusion days after a paracetamol overdose is acute liver failure. Confusion means the brain is affected, which is the point at which transplant centres need to be involved. Call an ambulance NOW — this needs a specialist liver unit, not a general ward. Give nothing by mouth and keep her on her side if drowsy.",
 toxic_megacolon:"In an ulcerative colitis flare, bloody diarrhoea suddenly stopping while the abdomen becomes hugely distended and painful with a high fever is toxic megacolon — the colon has dilated and is at risk of perforating. The apparent improvement in diarrhoea is the danger sign, not a recovery. Go to an emergency department NOW. Nothing by mouth, and stop any anti-diarrhoeal or opioid medicine — they precipitate this.",
 /* ---- toxicology (advanced) ---- */
 methanol:"Blurred vision described as a snowstorm after drinking homemade or illicit spirits is methanol poisoning. It causes permanent blindness and death, and the antidote works only before the damage is done. Go to an emergency department NOW and say the word methanol — they need to check the anion gap and start fomepizole or ethanol, and possibly dialysis. Do not wait to see if vision improves.",
 nms:"Rigidity described as lead-pipe stiffness with high fever, profuse sweating and unresponsiveness days after starting an antipsychotic is neuroleptic malignant syndrome. It is fatal untreated. Call an ambulance NOW, tell them the drug and when it was started, and do not give another dose. While waiting, cool him and keep him on his side.",
 salicylate_tox:"Ringing in the ears with fast deep breathing, sweating and nausea after a large aspirin dose is salicylate toxicity. The rapid breathing is the body compensating for acid build-up, not anxiety, and levels can keep climbing for hours after ingestion. Go to an emergency department NOW and take the packet. Do not try to induce vomiting.",
 ethylene_glycol:"Feeling drunk and then vomiting with rapid breathing and low blood pressure after swallowing an unlabelled garage liquid suggests antifreeze (ethylene glycol). It destroys the kidneys and the antidote must be given early. Call poison control and go to an emergency department NOW, taking the container with you. Do not induce vomiting.",
 ccb_od:"A heart rate in the 40s with a blood pressure that low after a double dose of amlodipine and diltiazem is calcium channel blocker toxicity — the effect deepens for hours, especially with slow-release tablets. Call an ambulance NOW; do not drive. Lie flat with legs raised, take no further doses, and tell them exactly which tablets and how many.",
 anticholinergic:"Hallucinations with hot dry skin, a bone-dry mouth, huge pupils and a racing heart after multiple antihistamine sleep aids is anticholinergic toxicity — 'hot as a hare, dry as a bone, red as a beet, mad as a hatter'. In an older person it also risks dangerous heart rhythms. Go to an emergency department NOW with the packets. Keep her cool, and do not give more sedatives to settle her.",
 /* ---- paediatric & neonatal (advanced) ---- */
 neonatal_sepsis:"Any fever in a baby under three months is an emergency, and refusing feeds, being hard to rouse and a bulging soft spot make this urgent — it suggests sepsis or meningitis. Newborns deteriorate in hours and often without the signs older children show. Go to a children's emergency department NOW, tonight, whatever the hour. Do not give paracetamol first to see if she improves — it masks the picture.",
 neonatal_collapse:"A newborn who suddenly becomes pale, floppy and breathless during feeds — especially with a pink upper body but cool, pale legs — may have a heart defect that depends on a vessel which naturally closes in the first weeks of life. This is a collapse waiting to happen. Call an ambulance NOW and say 'newborn, suspected duct-dependent congenital heart disease'. Do not feed him on the way.",
 severe_anemia:"Ghostly pale lips, gums and palms with a racing heart at rest in a toddler means severe anaemia — the heart is compensating for very low haemoglobin and can decompensate suddenly. Go to a children's emergency department today for an urgent haemoglobin. Do not start iron supplements before the cause is known.",
 /* ---- obstetric (advanced) ---- */
 uterine_rupture:"A sharp pop in the lower abdomen during labour after a previous caesarean, with contractions stopping and bleeding starting, is uterine rupture. Mother and baby both need an operating theatre within minutes. Call an ambulance NOW and say 'previous caesarean, suspected uterine rupture, in labour'. Lie on your left side, take nothing by mouth, and do not attempt to continue the birth at home.",
 hellp:"Pain under the right ribs with dark urine, profound fatigue and nausea in late pregnancy — especially with raised blood pressure — suggests HELLP syndrome, a severe form of pre-eclampsia affecting liver and platelets. It can progress within hours and the only cure is delivery. Go to your maternity unit NOW, not a GP clinic, and ask for urgent bloods for liver enzymes and platelets.",
 pph:"Soaking more than one pad an hour, passing clots the size of lemons and feeling dizzy days after birth is secondary postpartum haemorrhage. Call an ambulance now. While waiting, lie flat with your legs raised, rub firmly on the top of the womb below the navel to help it contract, and keep the pads so blood loss can be measured. This can escalate quickly.",
 chorioamnionitis:"Fever with a tender uterus and foul-smelling fluid 30 hours after the waters broke is chorioamnionitis — infection inside the womb. Both mother and baby need antibiotics and delivery without delay. Go to your maternity unit NOW. This does not wait for labour to start on its own.",
 /* ---- endocrine & metabolic (advanced) ---- */
 pheo:"Episodes of pounding heart, pounding headache, drenching sweats and pallor, with blood pressure spiking to those levels, suggest a phaeochromocytoma — a tumour releasing surges of adrenaline. The spikes themselves can cause a stroke or heart damage. Go to an emergency department today with your readings written down, and ask for plasma or urinary metanephrines. Avoid stimulants and certain decongestants, which can provoke an attack.",
 hhs:"A week of huge thirst and constant urination in an older person with type 2 diabetes, now confused and drowsy with a meter reading above 600, is hyperosmolar hyperglycaemic state — profound dehydration with very high sugar. It carries a higher death rate than DKA and needs intravenous fluids. Call an ambulance NOW. Do not give insulin at home; correcting this too fast is itself dangerous.",
 tumor_lysis:"Muscle cramps, tingling around the mouth and a sharp drop in urine output two days into chemotherapy is tumour lysis syndrome — dying cancer cells flooding the blood with potassium and phosphate. It causes cardiac arrest and kidney failure. Go to your cancer centre's emergency line NOW and to hospital. Do not take any potassium-containing supplement or salt substitute.",
 myxedema:"Unresponsiveness with a temperature that low, a heart rate of 40 and a puffy face in someone who stopped their thyroid medicine is myxoedema coma. Cold weather commonly precipitates it and it is often mistaken for simple hypothermia. Call an ambulance NOW. Warm her gently with blankets — no hot water bottles or direct heat — and give nothing by mouth.",
 /* ---- haematology & infection (advanced) ---- */
 ttp:"Purple spots, profound fatigue, confusion, fever and dark urine together suggest thrombotic thrombocytopenic purpura — tiny clots consuming platelets and shredding red cells throughout the body. Untreated it kills most people; with prompt plasma exchange most survive. Go to an emergency department NOW and ask for an urgent full blood count and blood film. Critically: do NOT accept a platelet transfusion for this, as it can make it worse.",
 ludwig:"A hard, swollen floor of mouth and neck after a dental infection, with the tongue pushed upward and difficulty breathing, is Ludwig's angina — the swelling closes the airway. Call an ambulance NOW. Stay sitting upright and leaning forward, do not lie down, and do not eat or drink. Tell them it is a suspected Ludwig's angina so they prepare for a difficult airway.",
 tss:"High fever, vomiting, watery diarrhoea, a widespread sunburn-like rash and dizziness on standing during tampon use is toxic shock syndrome. Blood pressure can collapse within hours. Remove the tampon NOW, then go to an emergency department immediately and tell them about the tampon and the rash — that detail changes the diagnosis.",
 dengue_severe:"In dengue, the danger begins as the fever falls — that is when plasma leaks from the blood vessels. Severe abdominal pain, persistent vomiting, bleeding gums and faintness are the warning signs of severe dengue and shock. Go to a hospital NOW for fluids and a platelet count. Take no aspirin or ibuprofen — they worsen bleeding. Paracetamol only.",
 fournier:"Rapidly worsening pain, swelling and darkening skin in the perineum or scrotum, with a crackling feel under the skin, is Fournier's gangrene — a necrotising infection that spreads within hours, particularly in diabetes. It needs emergency surgery, not antibiotics alone. Call an ambulance NOW and use the words 'necrotising infection, crepitus present'.",
 /* ---- trauma & environmental (advanced) ---- */
 major_trauma:"Severe pelvic pain and inability to walk after being hit by a vehicle, with lightheadedness, thirst, cold clammy skin, means significant internal bleeding — the pelvis can hold litres of blood with nothing visible outside. Call an ambulance NOW; do not get up or be moved by bystanders, and take nothing by mouth. If a pelvic binder or even a folded sheet can be wrapped firmly around the hips, that helps.",
 injection_injury:"A high-pressure injection injury is a surgical emergency however trivial the entry point looks. Paint thinner forced under pressure tracks along the tendon sheaths and destroys tissue from within, and delay past a few hours is what costs people the finger. Go to an emergency department NOW and ask for a hand surgeon — say 'high-pressure injection injury'. Keep the hand elevated, do not apply ice, and take the product container with you.",
 angioedema:"Swelling of lips, tongue and throat with NO hives and no itching, especially with a family history, points to hereditary angioedema or an ACE-inhibitor reaction rather than allergy — and that matters enormously, because adrenaline, antihistamines and steroids often do not work on it. It needs specific drugs (C1-inhibitor concentrate or icatibant). Call an ambulance NOW, say 'airway swelling, possible hereditary angioedema, may not respond to adrenaline', and stay upright.",
 limb_nerve_injury:"A deformed wrist after falling on an outstretched hand, with numbness across the thumb, index and middle fingers, suggests a dislocation compressing the median nerve. Nerve pressure relieved late causes permanent loss. Go to an emergency department NOW rather than an urgent care clinic — it needs X-rays and often reduction under anaesthesia. Do not try to straighten it yourself, remove rings now before swelling worsens, and keep the hand elevated.",
 /* ---- neurological ---- */
 subdural:"A head bump days or weeks ago followed by creeping confusion, unsteadiness and a worsening headache is the classic picture of a chronic subdural haematoma — a slow bleed pressing on the brain. In older people it is very often mistaken for dementia, and unlike dementia it is treatable, usually by draining the blood. Blood thinners make it far more likely. Go to a hospital today and ask for an urgent CT head; mention the injury even though it seems too long ago to matter.",
 tia:"Weakness or slurred speech that fully resolved was very likely a TIA — a warning stroke. Going back to normal is not reassurance: the risk of a full stroke is highest in the next 48 hours, and treatment started now prevents a large proportion of them. Go to an emergency department today, not next week. Do not drive yourself. Do not start or stop any medicine on your own, but take your medicine list with you.",
 myasthenic_crisis:"Worsening droop and nasal speech with difficulty swallowing your own saliva and taking a deep breath means the muscles you breathe with are failing — a myasthenic crisis. Breathing can fail suddenly and without warning. Call an ambulance now; do not drive or wait for your next clinic appointment. Tell them clearly that you have myasthenia gravis, since several common drugs (certain antibiotics, magnesium) make it worse.",
 head_injury:"Knocked out, then seemingly fine, and now drowsy or vomiting with one pupil bigger than the other — that lucid interval followed by deterioration is the pattern of bleeding inside the skull. This is a surgical emergency measured in minutes to an hour. Call an ambulance NOW. Do not let him sleep it off, do not drive him yourself if an ambulance is available, keep him still, and give nothing to eat or drink.",
 spinal_abscess:"Localised back pain with fever, and now leg weakness, points to an infection collecting around the spinal cord — a spinal epidural abscess. Injecting drug use raises the risk substantially. Once weakness starts, permanent paralysis can follow within hours. Go to an emergency department NOW and ask for an urgent MRI of the spine. Tell them honestly about injection use — it changes what they look for, and they have heard it before.",
 /* ---- cardiovascular ---- */
 tamponade:"Recent pericarditis with weakness, a racing heart, lightheadedness on sitting up and distended neck veins suggests fluid compressing the heart — cardiac tamponade. The heart cannot fill properly and this deteriorates quickly. Call an ambulance now. Stay sitting up if that's more comfortable, and do not take extra fluid tablets or painkillers to manage it at home.",
 limb_ischemia:"A limb that is suddenly painful, cold, pale and numb has lost its blood supply — acute limb ischaemia. Muscle and nerve begin dying within about six hours, and the limb itself is at risk. Go to an emergency department NOW, ideally one with vascular surgery. Keep the leg at or below heart level, keep it warm but never apply direct heat or ice, and do not massage or elevate it.",
 /* ---- abdominal ---- */
 perforation:"Sudden severe abdominal pain with a board-hard belly that hurts to touch or move, especially on regular anti-inflammatory painkillers, suggests a perforated ulcer — a hole in the stomach or bowel wall. This needs emergency surgery. Go to hospital NOW. Nothing to eat or drink, no more anti-inflammatories, and no painkillers at all before assessment.",
 pancreatitis:"Severe boring pain in the upper abdomen going straight through to the back, worse lying flat and better leaning forward, after heavy alcohol or with gallstones, is acute pancreatitis. It needs hospital fluids and monitoring — it can become severe fast. Go to an emergency department now. Nothing by mouth, including water, and no alcohol.",
 hernia_strangulated:"A hernia that has turned purple, become intensely painful, will not push back in, and is accompanied by vomiting is strangulated — its blood supply is cut off and the trapped bowel is dying. This needs emergency surgery within hours. Go to hospital NOW. Do not keep trying to push it back in, apply no heat, and take nothing by mouth.",
 cholangitis:"Fever with chills, severe right upper abdominal pain and yellow eyes is ascending cholangitis — an infected, blocked bile duct. It can progress to septic shock rapidly and usually needs an urgent drainage procedure. Go to an emergency department NOW; antibiotics alone at home will not fix a blocked duct.",
 splenic_rupture:"Severe upper-left abdominal pain after even a minor knock, especially with pain referred to the left shoulder tip, in someone with recent glandular fever, suggests a ruptured spleen — the spleen is enlarged and fragile for weeks after mono. This is internal bleeding. Call an ambulance now, lie still, and take nothing by mouth.",
 intussusception:"A baby crying inconsolably in waves with knees drawn up, going floppy or vacant between episodes, and passing dark red jelly-like stool, is intussusception — one part of the bowel telescoping into another. The stool appearance is a late and serious sign. Go to a children's emergency department NOW. Nothing to eat or drink on the way. It is usually fixed without surgery if treated early.",
 pyloric_stenosis:"Forceful projectile vomiting after every feed in a baby of a few weeks old, who is hungry again immediately afterwards, is pyloric stenosis — the stomach outlet has thickened and closed. Babies dehydrate and lose vital salts quickly. Go to a children's emergency department today. It is corrected with a straightforward operation.",
 /* ---- respiratory ---- */
 pneumothorax:"Sudden sharp one-sided chest pain with severe breathlessness — particularly in a tall, thin young person — suggests a collapsed lung. Blue lips means it is severe and may be under tension, which is immediately life-threatening. Call an ambulance NOW. Sit upright, do not lie flat, and do not attempt to travel by air.",
 asthma_severe:"Only being able to speak one or two words at a time, no relief after repeated inhaler puffs, and the chest sucking in under the ribs are signs of a severe, life-threatening asthma attack. Call an ambulance NOW. Keep sitting upright, and keep taking the reliever inhaler — 4 to 10 puffs through a spacer, one puff at a time, repeated every 20 minutes while waiting. Do not lie down and do not go anywhere alone.",
 epiglottitis:"Severe throat pain with drooling because swallowing hurts too much, a muffled 'hot potato' voice, fever, and sitting upright leaning forward to breathe, is epiglottitis — the airway is swelling shut. Call an ambulance NOW. Do not lie the person down, do not try to look inside the throat or press the tongue down, and keep a child calm and upright on a parent's lap — distress can close the airway completely.",
 /* ---- obstetric & gynae ---- */
 abruption:"Constant severe abdominal pain with a rock-hard uterus and dark vaginal bleeding in later pregnancy is placental abruption — the placenta separating from the womb. Both mother and baby are at immediate risk, and the visible bleeding badly understates the blood lost. Call an ambulance now and go to the maternity unit, not a general clinic. Lie on your left side and take nothing by mouth.",
 ovarian_torsion:"Sudden agonising one-sided lower abdominal pain coming in waves with vomiting, especially with a known ovarian cyst, suggests ovarian torsion — the ovary has twisted on its blood supply. The ovary can be saved if untwisted within hours. Go to an emergency department NOW and ask specifically for a pelvic ultrasound with Doppler. Nothing to eat or drink, in case surgery is needed.",
 pid_severe:"Pelvic pain with a high fever, foul-smelling discharge and severe pain on movement suggests a serious pelvic infection, possibly an abscess. This needs intravenous antibiotics and imaging, not tablets at home, and untreated it threatens future fertility. Go to a hospital with gynaecology cover today.",
 /* ---- toxicology ---- */
 paracetamol_od:"Feeling well after a paracetamol overdose is the trap — liver damage is silent for the first day or two and becomes irreversible before you feel truly ill. Nausea and right upper abdominal pain at 24 hours means it has started. The antidote works best early but is still worth giving now. Go to an emergency department IMMEDIATELY and tell them how much you took and when. This is treatable, and going in now genuinely changes the outcome.",
 digoxin_tox:"Nausea, weakness and a yellow-green tinge or halos around what you look at are classic digoxin toxicity. It disturbs heart rhythm dangerously and is often triggered by dehydration or kidney changes. Go to an emergency department now, take the digoxin box with you, and skip today's dose until a doctor advises.",
 lithium_tox:"Coarse hand tremor, slurred speech, unsteadiness and ringing in the ears after several days of diarrhoea is lithium toxicity — fluid loss concentrates the drug. It can progress to seizures and lasting neurological damage. Go to an emergency department now for an urgent lithium level, hold today's dose, and sip water on the way.",
 opioid_od:"Unrousable, breathing about four times a minute, with pinpoint pupils is an opioid overdose. Call an ambulance NOW and say 'not breathing properly, suspected overdose'. If naloxone is available, give it — it is safe even if you are wrong. Put him on his side in the recovery position, and if breathing stops, start rescue breaths or chest compressions. Stay with him; the effect of naloxone wears off before the opioid does.",
 last_toxicity:"Numb tongue, metallic taste, ringing in the ears and dizziness minutes after a local anaesthetic injection is local anaesthetic systemic toxicity. It can progress to seizures and cardiac arrest within minutes. Tell the person who gave the injection IMMEDIATELY and call emergency services — the specific treatment is intravenous lipid emulsion, which clinics are meant to stock. Do not go home, and do not be talked into 'waiting to see'.",
 /* ---- endocrine, renal, metabolic ---- */
 adrenal_crisis:"Vomiting, dizziness on standing and a blood pressure that low in someone with Addison's disease is an adrenal crisis — an illness has outstripped your steroid dose. This is rapidly fatal untreated and completely treatable with prompt hydrocortisone. Use your emergency hydrocortisone injection NOW if you have one, then call an ambulance. Tell them 'adrenal crisis, I need IV hydrocortisone and fluids'. Do not wait to see whether the vomiting settles.",
 hypoglycemia:"Insulin without food, shaking, cold sweats, confusion and double vision is severe hypoglycaemia. Treat it this second: 15-20 g of fast sugar — half a glass of juice or regular soft drink, three teaspoons of sugar, or glucose tablets — then recheck in 15 minutes and repeat if still low. Follow with a snack containing starch. If the person cannot swallow safely or becomes unresponsive, do NOT force food into the mouth: give glucagon if available, put them on their side and call an ambulance.",
 hyperkalemia:"Missed dialysis with muscle weakness, tingling and a heart that feels like it is skipping beats suggests a dangerously high potassium level. This causes cardiac arrest with very little warning. Go to your dialysis unit or an emergency department NOW — call ahead. Avoid high-potassium foods (bananas, citrus, potatoes, coconut water, tomatoes) and any salt substitute, which is usually potassium chloride.",
 rhabdo:"Severely painful, swollen muscles after unaccustomed intense exercise with dark tea or cola coloured urine is rhabdomyolysis — muscle breaking down and clogging the kidneys. It needs intravenous fluids to protect them. Go to an emergency department today. Drink water while you wait, and take no anti-inflammatory painkillers — they worsen the kidney injury.",
 malignant_hyperthermia:"A temperature spike with rigid muscles and a racing heart after anaesthesia is malignant hyperthermia. Tell the recovery staff RIGHT NOW — this is an in-hospital emergency with a specific antidote, dantrolene, that must be given within minutes. Do not wait for someone to come around on their rounds; say the words 'I think this is malignant hyperthermia'.",
 /* ---- infectious & haematological ---- */
 neutropenic_fever:"A fever during chemotherapy is an emergency however well you feel — this is neutropenic sepsis, and 'otherwise okay' is exactly how it starts before deteriorating within hours. Do NOT wait for Monday. Call your chemotherapy unit's 24-hour line now and go to hospital immediately; you need antibiotics within an hour of arriving. Take your chemotherapy alert card and say 'I am neutropenic with a fever'.",
 sickle_crisis:"A severe vaso-occlusive crisis not responding to your usual pain medicine, especially with chest pain, needs hospital care — chest involvement can mean acute chest syndrome, which is the most dangerous complication of sickle cell disease. Go to an emergency department now, take your care plan if you have one, keep warm and keep sipping fluids. You are entitled to prompt, adequate pain relief; do not let anyone dismiss it.",
 /* ---- eye & environmental ---- */
 crao:"Sudden, complete, painless loss of vision in one eye is a central retinal artery occlusion — a stroke of the eye. The window to save sight is a few hours and it also signals high immediate risk of a brain stroke. Go to an emergency department NOW, not an optician and not a routine eye appointment tomorrow. Tell them 'sudden painless vision loss, possible CRAO — this is a stroke equivalent'.",
 heat_stroke:"Hot dry skin with confusion, slurred speech and collapse after exertion in heat is heat stroke, not simple exhaustion — the body has lost the ability to cool itself and organs are being damaged. Call an ambulance NOW and start cooling immediately: move into shade, remove excess clothing, and get cold water onto the skin — ice packs to the neck, armpits and groin, or immersion in cool water if possible. Do not give fluids by mouth to anyone confused or drowsy.",
 thyroid_storm:"An overactive thyroid (Graves' disease) plus a trigger like an infection, vomiting or a missed dose can tip into thyroid storm — a high fever, a heart rate over 130 at rest, drenching sweats, tremor, agitation and confusion. This is not dehydration from a stomach bug: untreated it carries a high death rate, and it worsens over hours. Go to a hospital emergency department NOW and tell them in these words: 'I have Graves' disease and I think this is thyroid storm.' Bring your thyroid medicines. Do not try to manage it at home with fluids and rest, and do not take extra thyroid medication on your own.",
 tachy_severe:"A resting heart rate that high, especially with fever, chest discomfort, breathlessness, confusion or fainting, needs urgent assessment — go to an emergency department now rather than waiting to see if it settles. Sit or lie down, avoid caffeine and any stimulant, and have someone take you rather than driving yourself.",
 cauda_equina:"Numbness across the inner thighs, buttocks or groin — the area you'd sit on a saddle — together with not being able to feel yourself urinate or wipe, is cauda equina syndrome until proven otherwise. The nerve bundle at the base of the spine is being compressed, and permanent loss of bladder, bowel and sexual function can follow within HOURS. Resting in bed is the one thing that must not happen here. Go to a hospital emergency department NOW and use these exact words: 'I have saddle numbness and bladder symptoms with back pain — I need an urgent MRI to rule out cauda equina.' Do not wait for morning, do not wait to see if it settles, and do not let anyone send you home with painkillers without a scan.",
 aortic_dissection:"A sudden tearing or ripping pain in the chest or between the shoulder blades — often described as the worst pain of your life, sometimes with a difference between your two arms — can be an aortic dissection. Call an ambulance now (India 108). Do not drive yourself, do not take aspirin, and stay as still as possible.",
 aaa:"Severe abdominal or back pain with a pulsating feeling in the abdomen, especially over 60 or with known aneurysm, can be a leaking aortic aneurysm. Call an ambulance immediately — do not drive yourself and take nothing by mouth.",
 sepsis:"Fever or a very low temperature together with confusion, fast breathing, a racing heart, cold clammy or mottled skin, or barely passing urine can be sepsis — an infection turning body-wide. Sepsis kills quickly and worsens by the hour. Go to a hospital emergency department NOW and say the word 'sepsis' — it triggers a specific fast-track protocol.",
 nec_fasc:"Skin pain far out of proportion to how the area looks, spreading redness you can almost watch advance, tense swelling, blistering or a dusky patch, with fever and feeling profoundly unwell, can be a deep spreading soft-tissue infection. This needs emergency surgical assessment within hours — go to hospital now, do not wait to see if antibiotics by mouth help.",
 compartment:"Severe, worsening pain in a limb after an injury, crush, or a tight cast — pain far beyond what the injury suggests, worse on stretching the muscle, with tightness, tingling or numbness — can be compartment syndrome. Muscle and nerve die within hours. Go to an emergency department now. Do not elevate the limb above heart level and do not apply ice; if there's a cast or tight bandage, tell them immediately.",
 glaucoma_acute:"A painful red eye with blurred vision, halos around lights, a hazy cornea, headache and vomiting can be acute angle-closure glaucoma. Sight can be lost within a day. Go to an eye hospital or emergency department NOW — do not use any eye drops you have at home and stay in a well-lit room (darkness widens the pupil and worsens it).",
 temporal_arteritis:"A new headache over the temple in someone over 50 — with scalp tenderness (even brushing hair hurts), jaw aching while chewing, or any blurring or loss of vision — can be giant cell arteritis. Untreated, it can blind the other eye within days. Go to an emergency department today and ask for an urgent ESR/CRP; steroid treatment is started before the biopsy, not after.",
 retinal_detach:"A sudden shower of new floaters, flashes of light, or a shadow or curtain moving across your vision is a retinal detachment until proven otherwise. Vision saved depends on hours to days. Go to an eye hospital emergency today — avoid strenuous activity and sudden head movement on the way.",
 dvt_pe:"Pain and swelling in one calf or thigh, especially with warmth or redness — and above all with breathlessness or chest pain that's worse on breathing in — suggests a clot that may have travelled to the lungs. Go to a hospital emergency department now. Do not massage or rub the leg and do not walk it off.",
 co_poisoning:"Headache, dizziness, nausea and confusion affecting several people (or pets) in the same building — and easing when you go outside — points to carbon monoxide. Get everyone into fresh air immediately, leave doors open, do not switch anything electrical on or off, and call emergency services. Carbon monoxide has no smell; a working detector is the only reliable warning.",
 meningococcal:"A rash of small red or purple spots that does NOT fade when you press a glass against it, with fever, is meningococcal sepsis. This is one of the fastest-moving emergencies in medicine. Call an ambulance now — do not wait for more spots to appear or for the person to look worse.",
 hypertensive_crisis:"That blood pressure is in the emergency range (180/120 or above). With a pounding headache, neck stiffness, palpitations, dizziness or nausea alongside it, this is a hypertensive emergency, not a migraine — organs can be injured within hours. Go to a hospital emergency department NOW; do not drive yourself. Do not take an extra dose of your BP medicine to force the number down at home — dropping it too fast is dangerous in itself. Take a photo of your BP readings and bring every medicine you take, including any prescribed for depression.",
 maoi_crisis:"This looks like a tyramine reaction — an MAOI antidepressant (phenelzine, tranylcypromine, isocarboxazid, selegiline, moclobemide) taken with aged cheese, cured meat, red wine, soy sauce, fermented or overripe foods can push blood pressure to dangerous levels within an hour. A pounding headache with neck stiffness, palpitations, sweating and nausea is the classic picture, and it is NOT a migraine. Go to an emergency department immediately and tell them you take an MAOI and what you ate — they have specific treatments for this and will not use certain standard drugs. Do not take a triptan or any migraine medicine, and do not lie flat.",
 serotonin_syndrome:"Agitation or confusion with muscle twitching or stiffness, sweating, fever, shivering, fast heartbeat and dilated pupils — especially after starting or combining serotonergic drugs (SSRIs/SNRIs, MAOIs, tramadol, triptans, linezolid, St John's wort) — can be serotonin syndrome. Stop nothing on your own, but go to an emergency department now and take a list of everything you take.",
 torsion:"Sudden severe testicular pain is an emergency (torsion)."
},

/* ---------- WHEN NOT TO NAME ONE DISEASE ----------
   Some presentations are genuinely ambiguous, and stating a single diagnosis
   confidently is its own hazard: an atypical heart attack labelled "DKA" sends
   someone down the wrong path, and a label that turns out wrong costs trust in
   the escalation itself. For these ids the app shows a risk-based headline and
   lists what must be ruled out, in rough order of danger. Ids NOT listed here
   are near-pathognomonic (anaphylaxis, opioid overdose) and are named plainly. */
/* Not every red flag is an ambulance. These need care today or this week, and
   labelling them "EMERGENCY" would both frighten people and, worse, teach them
   to discount the banner when it really is one. */
urgentIds:["pyelonephritis_flag","cellulitis_flag","rabies_flag","oral_cancer_flag","tia","nph","subdural"],
emergencyDifferentials: {
 atypical_acs:["A heart attack — which in older and diabetic people often comes with no chest pain",
   "A serious infection turning body-wide (sepsis)",
   "A metabolic crisis such as very high or very low blood sugar"],
 dka:["A diabetic metabolic crisis (DKA or very high sugar)",
   "A heart attack, which can present without chest pain in diabetes",
   "A serious infection, which is often what triggers the crisis"],
 sepsis:["Sepsis — an infection turning body-wide",
   "A heart attack presenting without chest pain",
   "A metabolic crisis such as very high blood sugar or low sodium"],
 tachy_severe:["An abnormal heart rhythm",
   "Infection, blood loss or dehydration driving the heart rate up",
   "An overactive thyroid or a drug effect"],
 hypertensive_crisis:["A hypertensive emergency damaging brain, heart or kidneys",
   "A stroke or bleed in the brain",
   "A surge-producing tumour or a drug/food interaction"],
 dehydration:["Significant dehydration needing intravenous fluids",
   "The infection or illness causing the fluid loss",
   "Kidney injury from the fluid loss"],
 unspecified:["A condition needing urgent hospital assessment"]
},

/* ---------- LAB REFERENCE RANGES for report OCR parsing ---------- */
labTests: [
 {key:"hb", names:["haemoglobin","hemoglobin","hb"], unit:"g/dL", low:12, high:17.5,
  lowMsg:"Low haemoglobin → anaemia. Iron-rich diet; doctor should find the cause. Ayurveda: amla, pomegranate, black raisins, Dhatri Lauha/Punarnavadi Mandura (practitioner).",
  highMsg:"High haemoglobin — recheck; can be dehydration or other causes; discuss with a doctor."},
 {key:"wbc", names:["total leucocyte","total leukocyte","tlc","wbc count","white blood cell"], unit:"/µL", low:4000, high:11000,
  lowMsg:"Low white cells — viral infection or other causes; doctor review.",
  highMsg:"Raised white cells suggests infection/inflammation — a doctor should correlate; antibiotics only on prescription."},
 {key:"platelet", names:["platelet"], unit:"/µL", low:150000, high:450000,
  lowMsg:"LOW PLATELETS — if you have fever, rule out dengue urgently. Below 100,000 → hospital NOW. Hydrate well; avoid ibuprofen/aspirin.",
  highMsg:"High platelets — usually reactive; doctor review."},
 {key:"glucose_f", names:["fasting blood sugar","fasting glucose","fbs","glucose fasting","glucose - fasting"], unit:"mg/dL", low:60, high:100,
  lowMsg:"Low fasting sugar — if on diabetes medicines, review dosing with your doctor.",
  highMsg:"Fasting sugar above 100 (≥126 = diabetes range). See a physician; begin diet control, daily walking. Ayurveda support: bitter gourd, fenugreek, amla+turmeric (Nishamalaki), gudmar — inform your doctor (they add to medicines' effect)."},
 {key:"glucose_pp", names:["post prandial","postprandial","ppbs","pp sugar"], unit:"mg/dL", low:70, high:140,
  lowMsg:"Low post-meal sugar — review with doctor.",
  highMsg:"Post-meal sugar high (≥200 = diabetes range) — physician consult for confirmation and plan."},
 {key:"hba1c", names:["hba1c","glycated","glycosylated"], unit:"%", low:4, high:5.7,
  lowMsg:"HbA1c low — usually fine.",
  highMsg:"HbA1c raised: 5.7–6.4 = prediabetes; ≥6.5 = diabetes. See a physician; lifestyle change works best started early."},
 {key:"tsh", names:["tsh","thyroid stimulating"], unit:"µIU/mL", low:0.4, high:4.5,
  lowMsg:"TSH low — possible overactive thyroid; see a physician/endocrinologist.",
  highMsg:"TSH high — possible underactive thyroid; see a physician/endocrinologist. Ayurveda adjunct: kanchanara guggulu (practitioner)."},
 {key:"creatinine", names:["creatinine"], unit:"mg/dL", low:0.6, high:1.3,
  lowMsg:"Low creatinine — usually not significant.",
  highMsg:"Raised creatinine → kidney function needs medical review. Avoid painkillers like ibuprofen; hydrate; see a physician soon."},
 {key:"sgpt", names:["sgpt","alt","alanine"], unit:"U/L", low:0, high:45,
  lowMsg:"", highMsg:"Raised SGPT/ALT → liver stress. Stop alcohol, review medicines; physician check. Ayurveda support: bhumyamalaki, kutki, Arogyavardhani (practitioner)."},
 {key:"sgot", names:["sgot","ast","aspartate"], unit:"U/L", low:0, high:40,
  lowMsg:"", highMsg:"Raised SGOT/AST → liver stress; physician review."},
 {key:"bilirubin", names:["bilirubin total","total bilirubin","bilirubin"], unit:"mg/dL", low:0.1, high:1.2,
  lowMsg:"", highMsg:"Raised bilirubin → jaundice range. Physician review; avoid alcohol/fried food; hydrate."},
 {key:"crp", names:["crp","c-reactive"], unit:"mg/L", low:0, high:6,
  lowMsg:"", highMsg:"Raised CRP = active inflammation/infection somewhere; correlate with symptoms; doctor review."},
 {key:"esr", names:["esr","erythrocyte sedimentation"], unit:"mm/hr", low:0, high:20,
  lowMsg:"", highMsg:"Raised ESR = inflammation; non-specific; doctor correlation."},
 {key:"vitd", names:["vitamin d","25-oh","25 oh"], unit:"ng/mL", low:30, high:100,
  lowMsg:"Vitamin D low — sunlight 20 min/day; doctor may prescribe weekly D3 60,000 IU (take after a fatty meal).",
  highMsg:"Vitamin D very high — stop supplements, doctor review."},
 {key:"b12", names:["vitamin b12","b12","cobalamin"], unit:"pg/mL", low:200, high:900,
  lowMsg:"B12 low — supplements help (after food); vegetarians: milk/curd/fortified foods; doctor may give injections.",
  highMsg:"B12 high — usually supplement effect."},
 {key:"cholesterol", names:["total cholesterol"], unit:"mg/dL", low:100, high:200,
  lowMsg:"", highMsg:"Total cholesterol high — diet (less fried/refined), 30-min daily walk; physician for risk assessment. Ayurveda: guggul preparations, garlic, triphala at night."},
 {key:"ldl", names:["ldl"], unit:"mg/dL", low:0, high:100,
  lowMsg:"", highMsg:"LDL above optimal — lifestyle + physician review (statin decision is a doctor's call)."},
 {key:"hdl", names:["hdl"], unit:"mg/dL", low:40, high:100,
  lowMsg:"HDL low — exercise raises it.", highMsg:""},
 {key:"tg", names:["triglyceride"], unit:"mg/dL", low:0, high:150,
  lowMsg:"", highMsg:"Triglycerides high — cut sugar/alcohol/fried food; exercise; physician review."},
 {key:"uric", names:["uric acid"], unit:"mg/dL", low:2.5, high:7,
  lowMsg:"", highMsg:"Uric acid high → gout risk. Hydrate, limit red meat/alcohol/sugary drinks. Ayurveda: kaishore guggulu, giloy. Physician if joint attacks."},
 {key:"sodium", names:["sodium","na+"], unit:"mEq/L", low:135, high:145,
  lowMsg:"Low sodium — needs medical review (esp. elderly).", highMsg:"High sodium — hydration/medical review."},
 {key:"potassium", names:["potassium","k+"], unit:"mEq/L", low:3.5, high:5.1,
  lowMsg:"Low potassium — doctor review.", highMsg:"High potassium — urgent doctor review (heart rhythm risk)."},
 {key:"urine_pus", names:["pus cells","pus cell"], unit:"/hpf", low:0, high:5,
  lowMsg:"", highMsg:"Pus cells in urine → urine infection likely. See a doctor for a short antibiotic course; drink plenty of water. (Matches UTI plan.)"}
],
labQualitative: [
 {key:"dengue", names:["dengue ns1","ns1 antigen","dengue igm"], posMsg:"DENGUE POSITIVE → see a doctor today. Hydrate aggressively (ORS/coconut water), paracetamol ONLY (never ibuprofen/aspirin), daily platelet monitoring. Hospital if bleeding, severe abdominal pain, drowsiness, or platelets fall below 100,000. Papaya-leaf extract is a traditional adjunct."},
 {key:"malaria", names:["malaria","mp smear","malarial parasite"], posMsg:"MALARIA POSITIVE → physician today for prescription anti-malarials (self-treatment is unsafe). Paracetamol for fever, fluids. Giloy/sudarshan churna only as adjunct."},
 {key:"widal", names:["widal"], posMsg:"Widal suggestive of TYPHOID → physician for antibiotics. Soft light diet, hydration, full medicine course essential."},
 {key:"covid", names:["covid","sars-cov"], posMsg:"COVID positive → isolate per guidance, rest, fluids, paracetamol; monitor oxygen (SpO2 <94% → hospital). High-risk persons: contact doctor early."},
 {key:"urine_nitrite", names:["nitrite"], posMsg:"Urine nitrite positive → bacterial urine infection; doctor for antibiotics; hydrate well."}
],

/* ---------- TEST RULES: when the bot recommends investigations ---------- */
testRules: [
 {when:"fever>3d", tests:["CBC (complete blood count)","Dengue NS1 + IgM (in season/area)","Malaria smear/antigen","Typhoid (blood culture/Widal)"], why:"Fever beyond 3 days should be tested, not guessed."},
 {when:"fever_high", tests:["CBC","Dengue NS1","Malaria antigen"], why:"Temperature ≥103°F needs a cause."},
 {when:"uti", tests:["Urine routine & microscopy","Urine culture (if recurrent)"], why:"Confirms infection before antibiotics."},
 {when:"injury", tests:["X-ray of the injured part"], why:"To rule out a fracture if you can't bear weight / severe swelling."},
 {when:"chronic_fatigue", tests:["CBC","TSH (thyroid)","Fasting sugar","Vitamin D & B12"], why:"Common hidden causes of tiredness."},
 {when:"acidity_chronic", tests:["Doctor review ± endoscopy (doctor decides)","H. pylori test (doctor)"], why:"Heartburn >2 weeks or with warning signs must be scoped, not silenced."},
 {when:"diarrhea_persist", tests:["Stool routine & culture"], why:"Diarrhea beyond 3–4 days or with blood needs a stool test."},
 {when:"joint_chronic", tests:["Uric acid","ESR/CRP","RA factor (doctor)"], why:"To separate gout / inflammatory arthritis / wear-and-tear."},
 {when:"headache_chronic", tests:["Eye check (refraction)","BP measurement","Doctor review ± imaging (doctor decides)"], why:"Frequent headaches need cause-hunting."},
 {when:"anemia_suspect", tests:["CBC","Ferritin (iron stores)"], why:"Pallor/fatigue/heavy periods point to anaemia."},
 {when:"sugar_suspect", tests:["Fasting & post-meal sugar","HbA1c"], why:"Excess thirst/urination/tiredness screens for diabetes."},
 {when:"cough3w", tests:["Chest X-ray","Sputum test (doctor)"], why:"Any cough beyond 3 weeks must be X-rayed (TB/other causes)."}
],

/* ---------- CONDITIONS ---------- */
/* modern[]: {t:text, f?:flag}  flags: nsaid, pcm, decong, sed(antihistamine sedating), lax_stim */
conds: [

{id:"fever", rg:"systemic", nm:"Fever (viral)", al:["fever","bukhar","temperature","viral","body hot","jwar"],
 sys:"general", doctor:"General physician",
 dq:[{q:"Any of these along with fever?",opts:["Severe body/joint ache","Rash or red spots","Chills & sweating cycles","Burning urine","Sore throat/cold","None of these"]}],
 modern:[
  {t:"Paracetamol 500–650 mg — 1 tablet when temperature >100°F or for aches; repeat only after 6 hours; MAX 4 doses/day. After food preferably.", f:"pcm"},
  {t:"Sponge forehead/armpits with room-temperature water (not ice) if very hot."},
  {t:"Fluids: 2.5–3 L/day — water, ORS, coconut water, soups. Rest fully."},
  {t:"Do NOT take antibiotics on your own — most fevers are viral and they don't help."}],
 ayur:[
  "Tulsi-ginger-black pepper kadha (decoction) with honey, twice daily.",
  "Sudarshan churna 3 g with water twice daily (classical all-fever formula) OR Sitopaladi churna 1/2 tsp with honey if cough/cold type.",
  "Giloy (guduchi) juice 10–15 ml or tablet twice daily — esp. for lingering/low-grade fever.",
  "Light diet only while feverish: moong dal khichdi, rice gruel; no heavy/fried/dairy-rich food (ama principle). Rest = medicine."],
 tests:["fever>3d","fever_high"],
 seeDoc:["Fever lasting more than 3 days","Temperature ≥103°F not settling with paracetamol","Fever with burning urine, ear pain, severe throat pain (needs source check)","Any fever in infants, elderly, pregnancy, diabetes"],
 emerg:["Stiff neck, rash that doesn't fade on pressure, confusion or fits","Breathlessness or chest pain","Signs of dehydration (very little urine, drowsiness)"]},

{id:"cold", rg:"chest", nm:"Common cold", al:["cold","runny nose","blocked nose","sneezing","jukam","zukam","nazla","coryza"],
 sys:"resp", doctor:"General physician / ENT",
 dq:[{q:"What's the mucus like?",opts:["Clear & watery","Thick yellow/green","Mostly blocked, little mucus"]}],
 modern:[
  {t:"A cold is viral — it clears on its own in about a week. The goal is comfort, not a pile of pills: rest and plenty of warm fluids do most of the work."},
  {t:"First-line (safest and genuinely effective): steam inhalation 2–3×/day, saline nasal drops, and a warm salt-water gargle if the throat is scratchy."},
  {t:"Add a medicine ONLY if a symptom is really bothering you — and just the one that fits: paracetamol 500–650 mg after food for body ache or mild fever (max 4/day).", f:"pcm"},
  {t:"…or cetirizine 10 mg at night, only if a runny nose/sneezing is the main problem (may cause mild drowsiness).", f:"sed"},
  {t:"Please avoid antibiotics (useless against a cold) and don't stack several cold/decongestant products together."}],
 ayur:[
  "Classic kadha: tulsi 5 leaves + ginger + 4 black peppercorns boiled, add honey when warm — 2–3×/day.",
  "Turmeric milk (haldi doodh) at bedtime.",
  "Sitopaladi churna 1/2 tsp with honey 2–3×/day.",
  "Steam with ajwain or eucalyptus; avoid curd, cold drinks, fridge food till clear. Anu taila 2 drops/nostril in the morning prevents recurrent colds."],
 tests:[],
 seeDoc:["Not improving after 10 days or worsening after initial improvement","Facial pain/pressure with thick discharge (sinusitis)","Ear pain develops","High fever"],
 emerg:["Breathlessness or wheezing","Drowsiness/confusion"]},

{id:"cough", rg:"chest", nm:"Cough", al:["cough","khansi","khaansi","coughing"],
 sys:"resp", doctor:"General physician / pulmonologist if persistent",
 dq:[{q:"Which type fits best?",opts:["Dry, tickly cough","Wet cough with phlegm","Cough mainly at night","Cough with wheeze/whistling"]},
     {q:"Phlegm colour (if any)?",opts:["White/clear","Yellow/green","Blood-streaked","No phlegm"]}],
 modern:[
  {t:"Dry cough: honey 1 tsp in warm water 3×/day (not for infants <1 yr); dextromethorphan syrup at night if sleep is broken.", f:""},
  {t:"Wet cough: DO NOT suppress. Guaifenesin (expectorant) syrup after food + plenty of warm fluids + steam 2–3×/day."},
  {t:"Paracetamol after food if throat/chest soreness.", f:"pcm"},
  {t:"Avoid smoke/dust; sleep with head slightly raised."}],
 ayur:[
  "Sitopaladi or Talisadi churna 1/2 tsp with honey thrice daily — the classical cough powders.",
  "Fresh ginger juice 1 tsp + honey 1 tsp, 3×/day (dry cough); tulsi juice with honey for children >1 yr.",
  "Vasaka (Adhatoda) syrup/juice 10 ml twice daily — for wet cough.",
  "Black pepper + rock candy + ghee paste licked slowly for throat tickle; avoid cold/fried food, curd at night."],
 tests:["cough3w"],
 seeDoc:["Cough beyond 3 weeks (needs chest X-ray — TB must be ruled out)","Yellow-green phlegm with fever/breathlessness (possible chest infection — antibiotics are a doctor's call)","Wheeze — may need an inhaler (prescription)","Night cough with acidity (reflux) or weight loss"],
 emerg:["Coughing up blood","Breathless at rest / lips turning blue","Chest pain with breathing"]},

{id:"sore_throat", rg:"head", nm:"Sore throat", al:["sore throat","throat pain","gala kharab","gale me dard","kharash","pharyngitis","tonsil"],
 sys:"resp", doctor:"ENT / General physician",
 dq:[{q:"Look with a torch — what do you see/feel?",opts:["Just red/scratchy","White patches/pus on tonsils","High fever + swollen neck glands","Hoarse voice mainly"]}],
 modern:[
  {t:"Warm salt-water gargle (1/2 tsp salt in a glass) 4–5×/day — the single best home measure."},
  {t:"Paracetamol 500–650 mg after food for pain/fever, max 4/day; OR ibuprofen 400 mg after food if not contraindicated.", f:"pcm"},
  {t:"Medicated lozenges / benzydamine spray for local relief; warm fluids, rest the voice."},
  {t:"White patches + fever + tender glands + NO cough → likely strep; a doctor should examine — that's the case where antibiotics genuinely help."}],
 ayur:[
  "Turmeric + salt warm-water gargle 3×/day.",
  "Khadiradi vati — suck 1 tablet 3–4×/day (classical throat pill).",
  "Licorice (mulethi) small piece to suck, or licorice + honey tea.",
  "Sitopaladi with honey; avoid cold drinks, curd, pickles till healed."],
 tests:[],
 seeDoc:["Pus/white patches with high fever (strep test/antibiotics)","Not improving in 3–4 days","Recurrent tonsillitis (ENT opinion)","Hoarseness beyond 3 weeks"],
 emerg:["Cannot swallow even saliva / drooling","Difficulty breathing or muffled voice","Swelling of one side of throat/neck (abscess)"]},

{id:"flu", rg:"systemic", nm:"Flu (influenza)", al:["flu","influenza","body ache fever","viral with body pain"],
 sys:"resp", doctor:"General physician",
 modern:[
  {t:"Rest + fluids aggressively (this IS the treatment; it runs ~1 week)."},
  {t:"Paracetamol 650 mg after food every 6–8 h for fever/aches (max 4/day).", f:"pcm"},
  {t:"Steam + saline for congestion; honey-lemon warm water for throat/cough."},
  {t:"High-risk persons (elderly, pregnant, diabetic, lung/heart disease): see a doctor within 48 h — a prescription antiviral (oseltamivir) works best started early."}],
 ayur:["Sudarshan churna or Sanjivani vati (250 mg, with warm water) twice daily for viral fevers (adjunct).","Tulsi-ginger-pepper-cinnamon kadha 2–3×/day.","Chyawanprash 1 tsp with warm milk during recovery to rebuild strength.","Complete rest; light khichdi diet; no cold water/bathing chills."],
 tests:["fever>3d"],
 seeDoc:["High-risk person (get antiviral early)","Fever >3 days","Improving then suddenly worse (secondary infection)"],
 emerg:["Breathlessness, chest pain, confusion, blue lips","Not passing urine (dehydration)"]},

{id:"sinusitis", rg:"head", nm:"Sinusitis", al:["sinus","sinusitis","facial pressure","heavy head cold","cheek pain nose"],
 sys:"resp", doctor:"ENT",
 modern:[
  {t:"Steam inhalation 3×/day + saline nasal rinse — mainstay."},
  {t:"Oxymetazoline nasal spray max 3 days for blockage.", f:"decong"},
  {t:"Paracetamol/ibuprofen after food for facial pain.", f:"pcm"},
  {t:"Most sinusitis is viral and clears in 2–3 weeks without antibiotics; >10 days or worsening → doctor (may prescribe antibiotics/steroid spray)."}],
 ayur:["Anu taila or Shadbindu taila nasya: 2 drops each nostril morning (after steam) — the classical sinus therapy.","Trikatu (ginger-pepper-pippali) 1/2 tsp with honey twice daily to melt mucus.","Chitraka-haritaki avaleha 1 tsp twice daily (classical sinusitis formula).","Avoid curd, cold food/drinks, day-sleep; ajwain-steam."],
 tests:[], seeDoc:["Symptoms >10 days or getting worse","High fever with severe one-sided face pain","Recurrent sinusitis (ENT for scan)"],
 emerg:["Swelling/redness around an eye, vision change, severe headache with vomiting"]},

{id:"hayfever", rg:"chest", nm:"Allergy / hay fever", al:["allergy","hay fever","dust allergy","pollen","allergic rhinitis","sneezing morning","itchy eyes nose"],
 sys:"resp", doctor:"ENT / Allergist",
 modern:[
  {t:"Cetirizine 10 mg or loratadine 10 mg once daily (loratadine = non-drowsy).", f:""},
  {t:"Identify & avoid trigger (dust/pollen/pet); wash bedding hot weekly; masks help."},
  {t:"Saline nasal rinse daily; steroid nasal spray (fluticasone) once daily is the best preventer for persistent symptoms — start early in season."},
  {t:"Antihistamine eye drops for itchy eyes."}],
 ayur:["Anu taila nasya 2 drops/nostril daily — builds nasal resistance.","Haridra khanda 1 tsp with warm milk twice daily — the classical anti-allergy formula.","Local raw honey 1 tsp daily; giloy for immune balance.","Neti (saline wash) if trained; avoid curd at night, cold exposure."],
 tests:[], seeDoc:["Not controlled with the above","Wheeze/night cough (asthma check)","For allergy testing"],
 emerg:["Any throat/tongue swelling or breathlessness after exposure/food → emergency (anaphylaxis)"]},

{id:"earache", rg:"head", nm:"Ear pain / infection", al:["ear pain","earache","kaan dard","kan me dard","ear infection","ear blocked"],
 sys:"ent", doctor:"ENT",
 dq:[{q:"Which fits?",opts:["Pain after cold, inside ear","Itchy outer ear, worse on pulling","Blocked feeling/wax","Discharge from ear"]}],
 modern:[
  {t:"Paracetamol or ibuprofen after food — pain relief is the mainstay for 2–3 days (many middle-ear infections settle).", f:"pcm"},
  {t:"Warm (not hot) compress against the ear."},
  {t:"Wax: olive oil drops 2–3 drops twice daily for 3–4 days to soften; NEVER cotton buds."},
  {t:"Do not pour random drops if there's discharge (drum may be perforated) — doctor first."}],
 ayur:["Warm compress; 2 drops of slightly warmed sesame oil ONLY if no discharge and drum intact (skip if unsure).","Bilwadi taila (classical ear oil) — use only under guidance.","Treat the cold alongside (steam, kadha) since ear pain often follows it."],
 tests:[], seeDoc:["Pain >2–3 days or worsening / discharge appears","Child with high fever or both ears","Hearing reduced after episode","Recurrent infections"],
 emerg:["Swelling/redness BEHIND the ear","Sudden complete hearing loss","Severe dizziness or facial weakness"]},

{id:"headache", rg:"head", nm:"Headache (tension)", al:["headache","sir dard","sar dard","head pain","sardard"],
 sys:"neuro", doctor:"General physician / Neurologist if frequent",
 dq:[{q:"Which pattern fits best?",opts:["Band-like/both sides, stress or screen related","One-sided throbbing with nausea/light sensitivity (migraine-like)","With blocked nose/face pressure","Started after missing sleep/meals/water"]}],
 modern:[
  {t:"Paracetamol 650 mg OR ibuprofen 400 mg after food at onset (don't use painkillers >10 days/month — causes rebound headache).", f:"pcm"},
  {t:"Water 2 glasses now (dehydration is a top cause); eat if meals were missed."},
  {t:"20-min screen breaks, neck stretches, warm compress on neck/shoulders; regular sleep."},
  {t:"Get eyes tested if frequent (refraction headache); check BP once."}],
 ayur:["Warm sesame-oil head & foot massage before bath; shirodhara series for chronic stress headaches.","Brahmi or jatamansi tea in the evening; brahmi ghee 1/2 tsp in warm milk at night.","Pitta type (burning, worse in sun): sandalwood paste on forehead, amla juice morning.","Kapha type (heavy, morning, with congestion): ginger paste on forehead, trikatu with honey, skip one meal."],
 tests:["headache_chronic"],
 seeDoc:["More than 1–2 headaches/week or need painkillers often","Migraine pattern (a doctor can prescribe faster-acting specific medicines — triptans — and preventives)","Headache changing pattern"],
 emerg:["Sudden worst-ever/thunderclap headache","With fever + stiff neck or rash","With weakness/slurred speech/vision loss","After head injury","New headache with vomiting on waking"]},

{id:"migraine", rg:"head", nm:"Migraine", al:["migraine","adha sir dard","one side headache","aadha sar"],
 sys:"neuro", doctor:"Neurologist",
 modern:[
  {t:"Treat EARLY at first sign: ibuprofen 400 mg (after food) or paracetamol 1000 mg + rest in a dark quiet room.", f:"nsaid"},
  {t:"For nausea: domperidone (pharmacist) before food helps the painkiller absorb too."},
  {t:"Cold pack on forehead; caffeine (one strong tea/coffee) can help if taken early."},
  {t:"If attacks are moderate/severe or frequent (>1/month): a doctor can prescribe triptans (fast-acting) and daily preventives — very effective, worth the visit."}],
 ayur:["Keep a trigger diary (sleep loss, skipped meals, specific foods, sun) — trigger avoidance is half the cure.","Shirodhara course; nasya with shadbindu taila 2 drops each nostril in the morning during clusters.","Brahmi + ashwagandha 1/2 tsp each with milk at night for stress-linked migraine.","During attack: dark room, ginger tea for nausea, cold sandalwood paste on forehead."],
 tests:["headache_chronic"],
 seeDoc:["First severe migraine (confirm diagnosis)","Frequent attacks — preventive treatment exists","Aura lasting >1 hour"],
 emerg:["'Worst ever' or abrupt-onset headache","Aura with limb weakness or speech difficulty (stroke mimic)"]},

{id:"acidity", rg:"abdomen", nm:"Acidity / heartburn", al:["acidity","heartburn","acid reflux","gerd","seene me jalan","khatti dakar","sour burp","chest burning after food","burning behind my breastbone","burning in my chest after eating","sour taste"],
 sys:"digestive", doctor:"Gastroenterologist if persistent",
 dq:[{q:"When does it burn most?",opts:["After spicy/heavy/late meals","On lying down at night","Empty stomach mornings","Almost daily regardless"]}],
 modern:[
  {t:"Immediate: antacid gel/tablet (e.g., Gelusil/Digene) after meals & at bedtime, as needed."},
  {t:"Frequent (≥2×/week): omeprazole 20 mg once daily 30 min BEFORE breakfast for 14 days max OTC; if still needed → doctor."},
  {t:"Gaviscon-type alginate after dinner if night reflux."},
  {t:"Fixes that matter: dinner 3 h before bed, raise head-end of bed 4–6 in, smaller meals, cut trigger (spicy/fried/citrus/tea-coffee excess/alcohol/smoking), lose belly weight."}],
 ayur:["Amla powder 1 tsp with water morning empty stomach, or amla juice 20 ml — the prime Pitta remedy.","Avipattikar churna 1/2–1 tsp with water before lunch & dinner (classical acidity formula).","Shatavari 1/2 tsp with milk twice daily for burning; licorice tea for gnawing empty-stomach burn (skip if BP high).","Cold milk sips or soaked raisins for quick relief; avoid curd at night, excess pickle/papad; don't lie down straight after meals."],
 tests:["acidity_chronic"],
 seeDoc:["Symptoms >2 weeks despite the above (needs proper evaluation — possibly endoscopy/H. pylori test)","Age >50 with new symptoms","On daily painkillers (they cause gastritis)"],
 emerg:["Difficulty/pain swallowing, food sticking","Vomiting blood / black stools","Unintentional weight loss","Chest pain with sweating/breathlessness — treat as HEART until proven otherwise"]},

{id:"indigestion", rg:"abdomen", nm:"Indigestion / gas / bloating", al:["gas","bloating","indigestion","pet phoolna","badhazmi","apach","burping","farting","flatulence","pet me gas"],
 sys:"digestive", doctor:"General physician",
 modern:[
  {t:"Simethicone (anti-gas) after meals as needed; antacid if burning too."},
  {t:"Eat slowly, smaller meals; skip fizzy drinks, gum; walk 10–15 min after meals."},
  {t:"Note trigger foods (beans, cabbage-family, excess dairy if lactose-intolerant) and moderate them."},
  {t:"If bloating is persistent/daily for >2–3 weeks → doctor (rule out other causes)."}],
 ayur:["Hing (asafoetida) pinch + black salt in warm water for gas colic; or ajwain 1/2 tsp + black salt chewed with warm water.","Hingwastak churna 1/2 tsp with first bite of ghee-rice/lunch — the classical gas formula.","Fresh ginger slice + rock salt + lemon before meals kindles agni.","Jeera-saunf-ajwain water through the day; triphala 1 tsp at night if evacuation incomplete.","Buttermilk with roasted jeera after lunch (not at night)."],
 tests:[], seeDoc:["Persistent daily bloating >2–3 weeks","With weight loss or appetite loss","New symptoms after 50"],
 emerg:["Severe pain with vomiting and no gas/stool passing (obstruction)","Pain with rigid hard abdomen"]},

{id:"diarrhea", rg:"abdomen", nm:"Diarrhea (loose motions)", al:["diarrhea","loose motion","dast","loose stools","patli latrine","stomach upset motion","watery stools","watery diarrhea","keep running to the toilet"],
 sys:"digestive", doctor:"General physician",
 dq:[{q:"Any of these?",opts:["Watery only","With vomiting too","Blood or mucus in stool","After outside/street food","More than 8–10 motions/day"]}],
 modern:[
  {t:"ORS after EVERY loose motion — this is the real treatment. (1 sachet in 1 L clean water; sip through the day.) Homemade: 6 tsp sugar + 1/2 tsp salt in 1 L."},
  {t:"Zinc 20 mg once daily × 10–14 days (esp. children — WHO standard, shortens illness)."},
  {t:"Eat light but EAT: khichdi, curd-rice, banana, toast. Avoid milk (except curd), fried, very sweet."},
  {t:"Loperamide 2 mg after a loose stool (max 4 tabs/day, ≤2 days) ONLY for adult convenience travel — NEVER if fever or blood in stool.", f:""},
  {t:"Probiotic sachet/capsule daily can shorten it."}],
 ayur:["Bael (wood apple) pulp or bael murabba — the classical binder; or unripe bael powder 1 tsp with water twice daily.","Nutmeg (jaiphal) paste a pinch with buttermilk twice daily; pomegranate juice/peel decoction sips.","Kutajarishta 15 ml with equal water after meals twice daily (classical, esp. if recurrent/dysentery-type).","Buttermilk with roasted cumin + rock salt is both food & medicine (takra)."],
 tests:["diarrhea_persist"],
 seeDoc:["Beyond 3–4 days","Recurrent episodes (stool test)","Recent antibiotic use","Diabetic/elderly early"],
 emerg:["Blood in stool or high fever with motions","Signs of dehydration: very little/dark urine, dizziness, sunken eyes, drowsiness (esp. children/elderly)","Severe continuous abdominal pain"]},

{id:"constipation", rg:"abdomen", nm:"Constipation", al:["constipation","kabz","qabz","hard stool","pet saaf nahi","motion problem","haven't had a bowel movement","not passed stool","no bowel movement"],
 sys:"digestive", doctor:"General physician",
 modern:[
  {t:"Fibre up: 2 fruits + 2 veg servings + whole grains daily; Isabgol (psyllium) 1–2 tsp in warm water/milk at bedtime — first-line and safe."},
  {t:"Water 8+ glasses/day; 30-min daily walk; fixed toilet time after breakfast, don't suppress the urge."},
  {t:"If needed: lactulose 15 ml at night (gentle, safe). Stimulants (senna/bisacodyl) only occasionally, ≤1 week.", f:"lax_stim"},
  {t:"NEVER take laxatives if there's abdominal pain + vomiting (obstruction risk), and not in pregnancy without advice."}],
 ayur:["Triphala churna 1 tsp in warm water at bedtime — the gold-standard bowel rejuvenator (safe long-term at low dose).","1 tsp cow ghee in a cup of warm milk at bedtime — classic for dry/Vata constipation.","Soaked raisins/figs (6–8 overnight) in the morning; papaya daily.","Castor oil 2 tsp in warm milk once at night for stubborn episodes (not routine, not in pregnancy).","Abhyanga (oil massage) + squatting position help chronic cases."],
 tests:[], seeDoc:["No relief in 2 weeks despite the above","Alternating constipation-diarrhea","Needs laxatives constantly"],
 emerg:["Blood in stool / black stool","Constipation with severe pain + vomiting + bloating (obstruction)","New-onset after age 50 with weight loss"]},

{id:"vomiting", rg:"abdomen", nm:"Nausea / vomiting", al:["vomiting","ulti","nausea","jee michlana","matli","throwing up"],
 sys:"digestive", doctor:"General physician",
 modern:[
  {t:"Sip ORS/clear fluids in SMALL frequent sips (large gulps re-trigger); suck ice chips if needed."},
  {t:"Once settled 1–2 h: bland food (toast, banana, khichdi); avoid oily/spicy/milk for a day."},
  {t:"Ginger: tea/candy — genuine anti-nausea evidence; safe in pregnancy.","f":""},
  {t:"If travel-related: take an anti-motion tablet (dimenhydrinate/meclizine) 30–60 min BEFORE travel next time.", f:"sed"},
  {t:"Persistent vomiting → doctor can prescribe effective antiemetics (domperidone/ondansetron) — don't struggle beyond 24 h."}],
 ayur:["Ginger juice 1/2 tsp + honey licked slowly; or cardamom powder pinch with honey.","Lemon + mint water sips; smell of lemon/mint reduces nausea.","Rice water (thin gruel) as first food re-entry.","For acidity-type vomiting: cold milk sips, amla."],
 tests:[], seeDoc:["Vomiting >24 h or can't keep any fluid down","Diabetic who can't eat (sugar risk)","Vomiting during pregnancy that prevents eating"],
 emerg:["Blood or 'coffee-grounds' in vomit","Green (bile) vomit with severe pain/bloating","With severe headache/stiff neck or after head injury","Signs of dehydration"]},

{id:"stomach_pain", rg:"abdomen", nm:"Stomach pain / cramps", al:["stomach pain","pet dard","abdominal pain","pet me dard","stomach cramp","tummy ache"],
 sys:"digestive", doctor:"General physician",
 dq:[{q:"Where exactly is the pain?",opts:["Upper middle (burning — likely acidity)","Around navel, crampy with gas","Lower right side","Lower abdomen with urine burning","All over / can't localize"]}],
 modern:[
  {t:"Mild cramps/gas: warm water bag on abdomen, hing/simethicone; dicyclomine 10 mg (antispasmodic) after food if cramps persist (pharmacist)."},
  {t:"AVOID painkillers like ibuprofen for stomach pain (they irritate the stomach).", f:""},
  {t:"Light diet, ORS sips; watch pattern for 6–12 h."},
  {t:"Do NOT take a laxative or enema when in acute pain."}],
 ayur:["Ajwain 1/2 tsp + black salt with warm water (gas colic).","Hing dissolved in warm water applied around navel + a pinch orally.","Jeera-dhania-saunf tea after meals; ginger + lemon + rock salt before meals if appetite poor."],
 tests:[], seeDoc:["Pain recurring over days/weeks","Pain with fever","Pain related to periods (see period-pain plan)"],
 emerg:["Severe pain, or pain moving to lower-right abdomen with fever/vomiting (appendicitis)","Rigid, board-like abdomen","Pain with black stool/blood","Pain in pregnancy","Severe pain with no gas/stool passing"]},

{id:"piles", rg:"pelvis", nm:"Piles (hemorrhoids)", al:["piles","hemorrhoid","bawaseer","bavasir","anal pain","blood while passing stool","fissure"],
 sys:"digestive", doctor:"General surgeon / proctologist",
 dq:[{q:"Which fits?",opts:["Bright red blood on wiping, painless","Painful lump at anus","Severe tearing pain with hard stool (fissure-like)","Itching mainly"]}],
 modern:[
  {t:"Fix constipation FIRST: isabgol at night, fibre, 8+ glasses water (see constipation plan)."},
  {t:"Warm sitz bath (sit in warm water) 10–15 min twice daily — best comfort measure."},
  {t:"OTC piles cream/suppository (lidocaine ± hydrocortisone) after motion & at night, ≤1 week.", f:""},
  {t:"Paracetamol for pain (avoid ibuprofen if bleeding).", f:"pcm"},
  {t:"Don't strain or sit long on the toilet; no phone in toilet."}],
 ayur:["Triphala 1 tsp at bedtime — keeps stool soft (core of classical treatment).","Buttermilk (takra) with roasted jeera + rock salt daily with lunch — THE classical piles remedy.","Abhayarishta 15–20 ml with equal water after meals twice daily.","Sitz bath with triphala decoction; coconut oil/jatyadi oil application for soothing.","Radish juice or cooked surana (elephant-foot yam) traditionally recommended; fissure-type: apply ghee + warm sitz."],
 tests:[], seeDoc:["Bleeding recurs beyond a week or heavy","Painful clotted lump (can be relieved quickly by a doctor)","Piles that come out and don't go back — procedures (banding etc.) are quick OPD fixes","Any bleeding + change in bowel habit or age >40 → colon check"],
 emerg:["Heavy continuous bleeding or dizziness","Black tarry stools"]},

{id:"uti", rg:"pelvis", nm:"Urine infection (UTI)", al:["uti","urine infection","burning urine","peshab me jalan","frequent urination","urine burning","burning when i pee","burning when i urinate","burns when i pee","pee burns","painful peeing","hurts when i pee","frequent peeing","peeing a lot"],
 sys:"urinary", doctor:"General physician / urologist if recurrent",
 dq:[{q:"Any of these too?",opts:["Fever/chills","Back/flank pain","Blood in urine","Just burning + frequency"]}],
 modern:[
  {t:"Water 3+ L through the day; don't hold urine; urinate after intercourse."},
  {t:"Urinary alkaliniser sachet (citrate) 2–3×/day for 2–3 days eases burning (skip if kidney disease).", f:""},
  {t:"Paracetamol for discomfort.", f:"pcm"},
  {t:"Most true UTIs need a SHORT PRESCRIPTION ANTIBIOTIC — quick fix, but a doctor must choose it. Get a urine routine test and see a physician if not clearly better in 24–48 h. Men, children, pregnant women: doctor from day 1."}],
 ayur:["Coriander-seed water (1 tsp soaked overnight, drink morning) — classical cooling diuretic.","Coconut water, barley water through the day.","Gokshura (Tribulus) churna 1 tsp with water twice daily, or Chandraprabha vati 1 tab twice daily (classical urinary formula).","Avoid spicy/oily food, tea/coffee excess, alcohol during episode."],
 tests:["uti"],
 seeDoc:["Symptoms >48 h despite fluids (antibiotics likely needed)","Recurrent UTIs (urine culture + urologist)","Diabetic, male, child, pregnant, elderly — see doctor immediately"],
 emerg:["Fever with chills + back/flank pain (kidney infection)","Blood in urine","Unable to pass urine at all"]},

{id:"period_pain", rg:"pelvis", nm:"Period pain", al:["period pain","menstrual cramp","dysmenorrhea","period cramps","mahavari dard","periods me dard","cramps before my period"],
 sys:"womens", doctor:"Gynaecologist",
 modern:[
  {t:"Mefenamic acid 500 mg OR ibuprofen 400 mg AFTER FOOD, started AS SOON AS pain begins (works far better early), every 8 h for 1–2 days.", f:"nsaid"},
  {t:"Hot water bag on lower abdomen/back; gentle walking/stretching."},
  {t:"If pain is severe every cycle → gynaecologist (very treatable; also rules out endometriosis)."}],
 ayur:["Ajwain 1/2 tsp + jaggery with warm water 2×/day during periods.","Warm sesame-oil massage on lower abdomen; rest with warmth.","Kumaryasava 15 ml with equal water after meals in the week before periods (cycle regulator) — avoid in pregnancy.","Ginger-cinnamon tea; avoid cold/raw food during periods; Shatavari 1/2 tsp with milk daily as a cycle tonic."],
 tests:[], seeDoc:["Severe pain every cycle or worsening over months","Pain with very heavy bleeding/clots","Pain outside periods too"],
 emerg:["Sudden severe one-sided lower abdominal pain (esp. if period missed — ectopic risk)","Fainting with heavy bleeding"]},

{id:"back_pain", rg:"back", nm:"Back pain", al:["back pain","kamar dard","lower back","backache","peeth dard"],
 sys:"musculo", doctor:"Orthopedician / physiotherapist",
 dq:[{q:"How did it start?",opts:["After lifting/bending/jerk","Gradually with sitting/posture","With leg pain/tingling below knee","After a fall/accident"]}],
 modern:[
  {t:"KEEP MOVING gently — bed rest beyond a day worsens it. Short walks every hour."},
  {t:"Ibuprofen 400 mg after food 2–3×/day for 3–5 days (with food; skip if ulcer/kidney issues) OR paracetamol 650 mg.", f:"nsaid"},
  {t:"Hot fomentation 15 min 2–3×/day; topical diclofenac gel on the sore band."},
  {t:"After 48–72 h: gentle stretches (knee-to-chest, cat-camel); fix chair/posture; core exercises prevent recurrence."}],
 ayur:["Warm Mahanarayana taila massage followed by hot fomentation (bag/hot towel), daily.","Yogaraja guggulu 1 tab twice daily after food (classical Vata-pain formula) for 1–2 weeks.","Ashwagandha 1/2 tsp with warm milk at night (strength + nerve tone).","Gentle yoga after acute phase: bhujangasana, marjari; avoid forward-bend lifting.","Kati basti (warm oil pooling therapy) at a panchakarma centre for recurring pain."],
 tests:["injury"],
 seeDoc:["Not improving in 1–2 weeks","Pain radiating below the knee with tingling/numbness (sciatica — needs assessment)","Recurrent episodes (physio program)"],
 emerg:["Numbness in the saddle/genital area, or new urine/stool control problems — EMERGENCY (nerve compression)","Back pain after significant fall/accident","With fever, or night pain + weight loss"]},

{id:"neck_pain", rg:"neck", nm:"Neck pain / stiffness", al:["neck pain","gardan dard","stiff neck","cervical","neck stiffness"],
 sys:"musculo", doctor:"Orthopedician / physiotherapist",
 modern:[
  {t:"Keep gently mobile; avoid sudden jerks; thin pillow at proper height."},
  {t:"Ibuprofen 400 mg after food or paracetamol; topical gel.", f:"nsaid"},
  {t:"Hot fomentation 15 min 2–3×/day; screen at eye level, hourly breaks."},
  {t:"Gentle range-of-motion exercises after 48 h."}],
 ayur:["Warm sesame/Mahanarayana oil massage + hot towel daily.","Nasya (2 drops anu taila each nostril morning) — classical for neck/cervical issues.","Ashwagandha + milk at night; avoid cold draft on neck, day-sleep after meals.","Greeva basti at a panchakarma centre for chronic cervical pain."],
 tests:[], seeDoc:["Pain with arm tingling/numbness/weakness","Not improving in 1–2 weeks","Recurrent (posture/physio program)"],
 emerg:["Neck stiffness with FEVER + headache (meningitis)","After fall/accident","With weakness in limbs"]},

{id:"sprain", rg:"limb", nm:"Sprain / muscle strain / minor injury", al:["sprain","twist","moch","strain","ankle twist","muscle pull","injury"],
 sys:"musculo", doctor:"Orthopedician",
 modern:[
  {t:"R.I.C.E for 48 h: Rest • Ice 20 min every 2–3 h (cloth-wrapped) • Compression (crepe bandage, snug not tight) • Elevation above heart level."},
  {t:"Ibuprofen 400 mg after food 2–3×/day for pain/swelling.", f:"nsaid"},
  {t:"After 48 h: warm compress + gentle movement; return gradually."},
  {t:"Can't bear weight / severe swelling / deformity → X-ray (fracture check)."}],
 ayur:["First 48 h stick to ice (classical too: avoid heat on fresh injury).","After 48 h: gentle warm Mahanarayana/Murivenna oil application + light bandage.","Turmeric 1/2 tsp + pinch black pepper in warm milk at night (bruise/inflammation support).","Lakshadi guggulu 1 tab twice daily if bone bruise/slow healing (practitioner)."],
 tests:["injury"], seeDoc:["Not improving in 3–4 days","Joint feels unstable/gives way","Repeated sprains"],
 emerg:["Obvious deformity/severe swelling immediately","Cannot put any weight even after rest+ice","Numbness/cold/blue toes-fingers below injury"]},

/* Chest-wall pain needs its own entry. Routing it to "sprain" produced advice
   that was irrelevant at best (elevate above heart level, bear weight, X-ray for
   a rib cage) and harmful at worst: strapping or compressing a chest wall
   restricts breathing and invites collapse of lung bases and pneumonia. */
{id:"costochondritis", rg:"chest", nm:"Chest wall pain (costochondritis / muscle strain)",
 al:["costochondritis","chest wall","rib pain","rib strain","sore ribs","chest muscle","pulled chest muscle",
   "pain when i press on my chest","tender ribs","pasli dard","seene ki haddi"],
 sys:"musculo", doctor:"General physician (orthopaedic only if injury-related)",
 modern:[
  {t:"Reassurance first: pain you can reproduce by pressing the spot, or by a particular movement, comes from the chest wall — muscle, cartilage or rib joint — not from the heart. It settles over 1–3 weeks, sometimes longer."},
  {t:"Paracetamol 500–650 mg after food, up to 4×/day, is the safest first choice for the pain.", f:"pcm"},
  {t:"If paracetamol isn't enough: ibuprofen 400 mg after food, 2–3×/day for a few days — but NOT if you have stomach ulcers or gastritis, kidney disease, asthma worsened by painkillers, are pregnant, or take blood thinners. Check with a pharmacist if unsure.", f:"nsaid"},
  {t:"Warm compress over the sore area for 15 minutes, 2–3×/day, and avoid the specific movement that triggers it (overhead reaching, heavy lifting, push-ups) for a week or two."},
  {t:"IMPORTANT — do NOT strap, tape or bind the chest. Binding restricts how deeply you can breathe, which lets the lung bases collapse and can turn a harmless strain into a chest infection. This is the opposite of how a sprained ankle is treated."},
  {t:"Instead, take 10 slow deep breaths every couple of hours, even though it aches slightly. Keeping the chest expanding is what prevents complications."},
  {t:"Keep moving normally otherwise — gentle activity aids recovery; complete rest stiffens it."}],
 ayur:["Warm Mahanarayana or Murivenna oil, applied gently over the tender area twice daily, then a warm cloth over it.",
   "Avoid deep pressure massage over the painful rib — light application only.",
   "Turmeric ½ tsp with a pinch of black pepper in warm milk at night for inflammation support.",
   "Rest the aggravating movement but continue normal breathing and walking; Vata is aggravated by both strain and complete immobility."],
 tests:[],
 seeDoc:["No better after 2–3 weeks, or getting worse rather than easing",
   "It started after a significant fall or blow to the chest (rib fracture needs checking)",
   "You are over 50, or have heart disease, diabetes or high blood pressure, and are unsure it's muscular",
   "A cough that isn't settling, or you feel unwell with it"],
 emerg:["Pain becomes crushing or heavy rather than sharp, or spreads to the jaw, neck or arm",
   "Sweating, nausea, breathlessness or faintness with the pain",
   "Sudden severe breathlessness, or pain worse on breathing in with breathlessness",
   "Coughing blood, or a fever with the chest pain"]},

{id:"joint_pain", rg:"limb", nm:"Joint pain (knee/arthritis type)", al:["joint pain","knee pain","ghutne dard","ghutna","arthritis","gathiya","joint stiffness"],
 sys:"musculo", doctor:"Orthopedician / rheumatologist",
 dq:[{q:"Which pattern fits?",opts:["Morning stiffness >30 min, multiple joints, swelling","Pain worse with activity, better with rest, age >45 (wear & tear)","Sudden hot red big-toe/foot joint (gout-like)","After minor injury/overuse"]}],
 modern:[
  {t:"Paracetamol 650 mg regular ×3–5 days OR ibuprofen 400 mg after food if swelling (short course).", f:"nsaid"},
  {t:"Topical diclofenac gel 3–4×/day on the joint."},
  {t:"Hot fomentation for stiffness, ice if acutely swollen; weight loss = biggest knee medicine; quadriceps strengthening daily."},
  {t:"Gout-like attack: rest, ice, fluids, avoid alcohol/red meat — see a doctor for uric-acid testing & specific medicines."}],
 ayur:["Wear-and-tear (Sandhivata): warm sesame/Mahanarayana oil massage + fomentation daily; Yogaraja guggulu 1 tab twice daily; ashwagandha with milk at night; janu basti therapy for knees.","Swelling+stiffness with heaviness (Amavata/rheumatoid-like): DON'T oil-massage initially; dry heat, light diet, dry-ginger water sips, Rasnasaptaka kwatha; needs an Ayurvedic physician.","Gout-like (Vatarakta): Kaishore guggulu 1 tab twice daily, giloy, cherry/amla; avoid alcohol, red meat.","Fenugreek 1 tsp soaked overnight each morning; turmeric-milk at night."],
 tests:["joint_chronic"],
 seeDoc:["Multiple joints with morning stiffness (rheumatoid needs early treatment — very treatable now)","Recurring gout attacks","Pain limiting daily activity (X-ray + plan)"],
 emerg:["ONE joint suddenly hot, red, very painful ± fever → same-day doctor (infection in joint is an emergency)"]},

{id:"cramps", rg:"limb", nm:"Muscle cramps", al:["cramps","leg cramp","nas chadna","muscle cramp","charley horse","night cramps"],
 sys:"musculo", doctor:"General physician",
 modern:[
  {t:"During cramp: stretch the muscle firmly (pull toes up for calf) + massage."},
  {t:"Hydrate; add a pinch of salt+lemon water after sweating; eat a banana daily (potassium)."},
  {t:"Stretch calves before bed for night cramps; warm shower before sleep."},
  {t:"Frequent cramps → check with doctor (electrolytes, medicines like diuretics, thyroid)."}],
 ayur:["Sesame-oil massage of legs at night (Vata pacification).","Milk + soaked almonds/sesame (natural calcium-magnesium); dates.","Ashwagandha 1/2 tsp with milk at night for recurrent cramps."],
 tests:[], seeDoc:["Frequent/severe or daytime cramps","With muscle weakness/wasting","On BP/diuretic medicines"], emerg:["Calf cramp-pain with one-sided swelling/warmth (clot risk) — urgent"]},

{id:"rash", rg:"skin", nm:"Skin rash / itching (eczema-type)", al:["rash","itching","khujli","skin allergy","eczema","dermatitis","itchy skin","daane"],
 sys:"skin", doctor:"Dermatologist",
 dq:[{q:"Which looks closest?",opts:["Dry itchy patches","Oozing/wet patches","Ring-shaped patch with clear centre (fungal)","Raised wheals that come & go (hives)","Itching all over, worse at night, family itching too (scabies-like)"]}],
 modern:[
  {t:"Moisturise generously 3–4×/day (fragrance-free) — dryness drives most itch."},
  {t:"Cetirizine 10 mg at night for itch.", f:"sed"},
  {t:"Hydrocortisone 1% cream thin layer twice daily ≤7 days on small itchy patches (NOT on face/broken skin/fungal rings).", f:""},
  {t:"Lukewarm (not hot) baths; mild soap; cotton clothing; identify trigger (new soap/detergent/metal/plant)."},
  {t:"Ring-shaped = fungal → see the fungal plan (steroid creams make fungus WORSE)."}],
 ayur:["Neem-leaf paste or neem-water bath for itchy areas.","Coconut oil (dry types) after bath; aloe vera gel for irritated skin.","Khadirarishta 15 ml with equal water after meals twice daily (classical blood-purifier for skin).","Avoid: curd+fish or milk+salty combos (viruddha ahara), excess sour/fermented food; manage constipation (skin mirrors gut).","Manjishtha or neem capsule/churna as blood purifier for recurring rashes."],
 tests:[], seeDoc:["Spreading, oozing, painful, or crusted rash (may need prescription creams)","Rash not improving in 1–2 weeks","Scabies-suspect (whole-family treatment needed — doctor confirms)"],
 emerg:["Rash with fever that doesn't fade on glass pressure","Hives with lip/throat swelling or breathlessness","Painful rapidly-spreading red skin with fever"]},

{id:"fungal", rg:"skin", nm:"Fungal infection (ringworm/athlete's foot)", al:["fungal","ringworm","daad","dad khaj","athlete's foot","jock itch","itching groin","fungal infection"],
 sys:"skin", doctor:"Dermatologist",
 modern:[
  {t:"Clotrimazole or terbinafine cream: apply thin layer twice daily covering 2 cm BEYOND the ring edge; continue 2 WEEKS AFTER it looks cleared (total 3–4 weeks) — stopping early = relapse."},
  {t:"Keep the area DRY: change socks/innerwear daily, dry well after bath, dust antifungal powder in folds."},
  {t:"Don't share towels; wash clothes in hot water; treat family members with similar patches."},
  {t:"NEVER apply steroid creams (or 'quick-relief' combo creams) — they feed the fungus and cause resistant daad."}],
 ayur:["Apply crushed-garlic-infused coconut oil or raw turmeric paste to the patch (traditional antifungals) alongside cream.","Neem bath/wash daily; keep kapha-damp away: dry body fully.","Gandhaka rasayana (purified sulphur classical) via an Ayurvedic doctor for recurrent cases.","Cut excess sugar/curd/fermented food till clear."],
 tests:[], seeDoc:["Scalp or nail involvement (needs prescription tablets)","Widespread or recurring despite 4 weeks of correct cream","Diabetic with fungal infections (check sugar)"],
 emerg:[]},

{id:"acne", rg:"skin", nm:"Acne / pimples", al:["acne","pimple","pimples","muhase","keel","face spots"],
 sys:"skin", doctor:"Dermatologist",
 modern:[
  {t:"Benzoyl peroxide 2.5% gel thin layer at night on affected area (start alternate nights; mild dryness normal)."},
  {t:"Gentle face wash twice daily; DON'T scrub, DON'T squeeze (scars come from squeezing)."},
  {t:"Oil-free/non-comedogenic moisturiser + sunscreen; change pillowcase often.","f":""},
  {t:"Moderate/severe or scarring → dermatologist early (very effective prescription options exist)."}],
 ayur:["Face pack: red sandalwood + turmeric pinch + rose water, 15 min, 3×/week; or multani mitti for oily skin.","Neem + turmeric water wash; don't over-dry the skin.","Triphala 1 tsp at night (gut-skin link); reduce fried/junk/excess dairy & sweets.","Kumkumadi taila few drops at night on old marks (not on active oily acne)."],
 tests:[], seeDoc:["Painful deep nodules or scarring","No improvement in 6–8 weeks","Sudden acne with irregular periods (hormonal check)"], emerg:[]},

{id:"hives", rg:"skin", nm:"Hives (urticaria)", al:["hives","urticaria","sheetpitta","wheals","welts","sudden itchy bumps"],
 sys:"skin", doctor:"Dermatologist / allergist",
 modern:[
  {t:"Cetirizine 10 mg once daily (doctor may advise up to twice daily) till clear + 3–4 days.", f:"sed"},
  {t:"Cool compress; loose cotton clothes; avoid hot showers/scratching."},
  {t:"Hunt the trigger: new food (nuts/seafood), medicine (painkiller/antibiotic), infection, pressure/cold."},
  {t:"Recurring >6 weeks → allergist (chronic urticaria — manageable)."}],
 ayur:["Haridra khanda 1 tsp with warm milk twice daily — the classical sheetpitta remedy.","Turmeric + jaggery small ball twice daily; avoid curd, fermented, sour foods during episodes.","Apply mustard-oil lightly then warm bath (traditional); avoid cold wind exposure."],
 tests:[], seeDoc:["Episodes recurring >6 weeks","With joint pain/fever","Triggered by a medicine (note the name, tell every future doctor)"],
 emerg:["Lip/tongue/throat swelling, breathlessness, dizziness → EMERGENCY (anaphylaxis)"]},

{id:"wound", rg:"skin", nm:"Minor cut / wound / burn", al:["cut","wound","burn","jala","chot","ghav","scrape","bleeding cut","laceration"],
 sys:"skin", doctor:"General physician / ER for deep wounds",
 modern:[
  {t:"CUT: wash hands → run clean water over wound → press with clean cloth till bleeding stops → antiseptic (povidone-iodine) → dressing. Change daily."},
  {t:"BURN: hold under cool RUNNING water 20 full minutes (no ice/toothpaste/butter) → loose non-stick dressing → paracetamol for pain.", f:"pcm"},
  {t:"Tetanus: if wound is dirty/deep/rusty-metal and last TT shot >5 yrs → get a TT injection same day."},
  {t:"Watch 48–72 h for infection: increasing redness, warmth, pus, red streaks, fever → doctor."}],
 ayur:["After bleeding stops: turmeric is the classical antiseptic — clean paste on minor scrapes.","Honey thin layer under dressing for clean shallow wounds (classical + evidence).","Aloe vera gel for healed-over burns; ghee+honey mix (classical) for minor healing wounds.","Jatyadi taila/ghrita for slow-healing minor wounds."],
 tests:[], seeDoc:["Gaping/deep cut (stitches work best within 6–8 h)","Animal/human bite (needs rabies protocol!)","Any infection signs","Diabetic with any foot wound — same day"],
 emerg:["Bleeding not stopping with 10 min firm pressure","Large/deep burn, face/hand/genital burn, electrical/chemical burn","Numbness or can't move the part"]},

{id:"eye_red", rg:"head", nm:"Red / itchy eye", al:["red eye","eye pain","conjunctivitis","aankh lal","eye infection","itchy eyes","eye discharge"],
 sys:"eye", doctor:"Ophthalmologist",
 dq:[{q:"Which fits?",opts:["Watery + itchy both eyes (allergy-like)","Sticky yellow discharge, lids stuck in morning","Gritty/dry feeling, screen-heavy day","Pain inside eye / vision affected"]}],
 modern:[
  {t:"Infective type spreads fast: separate towel, wash hands, no eye rubbing, no sharing cosmetics."},
  {t:"Lubricating eye drops 4–6×/day soothe all types; cold compress for allergy-itch."},
  {t:"Allergy: antihistamine drops + oral cetirizine at night.", f:"sed"},
  {t:"Sticky bacterial type: clean lids with boiled-cooled water; if not better in 2 days → doctor (antibiotic drops are prescription in most places).","f":""},
  {t:"CONTACT LENS users with red eye: remove lens, see eye doctor same day."}],
 ayur:["Triphala eyewash: steep 1 tsp overnight, strain through fine cloth VERY well, wash eyes in morning (classical netra-prakshalana).","Rose water (pure, sterile) 1–2 drops for irritation.","Palming + 20-20-20 screen breaks; ghee 1 tsp in warm milk at night (eye nourishment).","Amla daily (eye rasayana)."],
 tests:[], seeDoc:["Not improving in 2–3 days","Recurring allergy (drops that prevent exist)","Any discharge in a newborn — same day"],
 emerg:["Eye PAIN (not just irritation), vision blur/loss, halos around lights, severe headache+vomiting","Chemical splash → wash 20 min & go","Injury/foreign body embedded"]},

{id:"toothache", rg:"head", nm:"Toothache", al:["toothache","daant dard","tooth pain","dant","cavity pain","wisdom tooth"],
 sys:"dental", doctor:"Dentist",
 modern:[
  {t:"Ibuprofen 400 mg after food (best for dental pain) ± paracetamol 650 mg in-between if severe (don't exceed either's max).", f:"nsaid"},
  {t:"Warm salt-water rinse 3–4×/day; floss out any trapped food near the tooth."},
  {t:"Clove oil on a cotton wisp against the tooth — temporary numbing."},
  {t:"THIS IS A HOLDING PLAN: painkillers don't cure a cavity/infection — book a dentist in 1–2 days (the actual quick fix)."}],
 ayur:["Clove (laung) chewed slowly against the tooth or clove oil application — the classical remedy.","Salt + mustard-oil pinch massaged on gums; oil pulling (1 tbsp sesame/coconut oil swished 5–10 min) daily for gum health.","Neem datun / neem-based paste for gum inflammation."],
 tests:[], seeDoc:["All toothache needs a dentist — within 1–2 days","Bleeding gums routinely (gum treatment + scaling)","Sensitivity persisting"],
 emerg:["Facial/jaw swelling, fever, difficulty opening mouth or swallowing → same-day emergency (spreading infection)"]},

{id:"mouth_ulcer", rg:"head", nm:"Mouth ulcers", al:["mouth ulcer","muh me chala","chhala","canker sore","mouth sore","tongue ulcer"],
 sys:"dental", doctor:"Dentist / physician if recurrent",
 modern:[
  {t:"Antiseptic/anaesthetic oral gel (choline salicylate or lidocaine-based) on ulcer 3–4×/day before food."},
  {t:"Warm salt-water rinses; avoid spicy/acidic/rough food till healed (7–10 days natural course)."},
  {t:"B-complex once daily for 2 weeks if recurrent (common deficiency link)."}],
 ayur:["Honey + pinch of turmeric dabbed on ulcer 3×/day.","Chew 1–2 fresh guava leaves or apply glycerin; licorice piece to suck.","Triphala water swish twice daily; treat constipation (classic Pitta-gut link); coconut water, avoid very hot food."],
 tests:[], seeDoc:["Any single ulcer lasting >3 weeks (MUST be checked — cancer rule-out, esp. tobacco users)","Large/multiple recurrent crops (deficiency/other checks)","With eye/genital sores or joint pain"],
 emerg:[]},

{id:"insomnia", rg:"systemic", nm:"Poor sleep (insomnia)", al:["insomnia","neend nahi","can't sleep","sleep problem","sleeplessness","no sleep","can't fall asleep","cannot fall asleep","lying awake"],
 sys:"mental", doctor:"Physician / sleep specialist",
 modern:[
  {t:"Sleep hygiene (works better than pills): fixed wake time daily, no screens 1 h before bed, dark cool room, caffeine only before 2 pm, no daytime naps >20 min, bed = only for sleep."},
  {t:"If not asleep in ~20 min: get up, do something boring in dim light, return sleepy."},
  {t:"Exercise 30 min daily (not within 3 h of bed)."},
  {t:"Melatonin 3 mg 1 h before bed short-term (jet-lag/shift); avoid nightly sedative dependence — if >3–4 weeks, see a doctor (CBT-I is the gold standard)."}],
 ayur:["Warm milk + pinch of nutmeg (jaiphal) at bedtime — classical sleep inducer.","Warm sesame-oil massage to soles & scalp before bath/bed.","Ashwagandha 1/2 tsp with milk at night; Brahmi or jatamansi tea in the evening.","Bhramari pranayama (humming breath) 5 min + left-nostril breathing at bedtime; early light dinner."],
 tests:["chronic_fatigue"],
 seeDoc:["Beyond 3–4 weeks or affecting daytime function","Loud snoring with breath pauses (sleep apnea — treatable)","With low mood/anxiety (treat the cause)"],
 emerg:["Sleeplessness with racing thoughts of self-harm → crisis help now"]},

{id:"anxiety", rg:"systemic", nm:"Stress / anxiety", al:["anxiety","tension","stress","ghabrahat","panic","worry","chinta","restless"],
 sys:"mental", doctor:"Psychiatrist / psychologist",
 modern:[
  {t:"Slow breathing NOW: inhale 4s – hold 4s – exhale 6-8s × 10 rounds (physiologically lowers the alarm)."},
  {t:"Daily: 30-min brisk walk, fixed sleep, cut caffeine/alcohol, limit doom-scrolling."},
  {t:"Name it & schedule it: 15-min daily 'worry window' + write the worries down."},
  {t:"Persistent (>2–4 weeks), panic attacks, or interfering with life → therapist/psychiatrist (therapy + short-term medicines work very well; nothing to be ashamed of)."}],
 ayur:["Ashwagandha 300–500 mg (or 1/2 tsp churna with milk) twice daily — the prime adaptogen; 6–8 weeks course.","Brahmi tea/ghee morning; jatamansi at night for sleep-linked anxiety.","Daily abhyanga (warm-oil self massage) + shirodhara series for deep-set stress.","Anulom-vilom & bhramari pranayama 10 min morning; sattvic diet, fixed routine (Vata thrives on rhythm)."],
 tests:["chronic_fatigue"],
 seeDoc:["Symptoms >2–4 weeks or worsening","Panic attacks","With palpitations/weight change (thyroid check)"],
 emerg:["Chest pain + sweating + breathlessness — rule out heart FIRST, don't assume anxiety","Thoughts of self-harm → crisis line now (India: 9152987821 / 14416)"]},

{id:"dandruff", rg:"head", nm:"Dandruff / hair fall", al:["dandruff","hair fall","hairfall","balo ka girna","rusi","hair loss","itchy scalp"],
 sys:"skin", doctor:"Dermatologist",
 modern:[
  {t:"Ketoconazole 2% shampoo twice weekly (lather, LEAVE 5 min, rinse) × 4 weeks, then weekly maintenance; normal shampoo other days."},
  {t:"Hair fall basics: check & fix iron/B12/vitamin-D/thyroid (simple blood tests); protein in every meal; gentle handling, no tight hairstyles."},
  {t:"Minoxidil (OTC) only after a dermatologist confirms pattern hair loss — commit ≥6 months."},
  {t:"Post-illness/postpartum shedding usually self-recovers in 3–6 months."}],
 ayur:["Bhringraj or coconut-amla oil: warm, massage scalp 2–3×/week, wash after 1 h (not overnight if dandruff).","Amla daily (1 fresh / 1 tsp powder / murabba) — the classical hair rasayana.","Triphala at night; adequate sleep (hair = asthi-majja byproduct; stress shows in hair).","Neem-water rinse for itchy scalp; avoid excessive hot-water on head (classical caution)."],
 tests:["chronic_fatigue","anemia_suspect"],
 seeDoc:["Patchy coin-shaped bald spots (alopecia areata — treatable, see derm early)","Scarring/painful scalp","Sudden diffuse shedding continuing >6 months"], emerg:[]},

{id:"sugar_query", rg:"systemic", nm:"High sugar / diabetes concern", al:["diabetes","sugar","blood sugar","madhumeh","sugar high","hba1c","excess thirst urination"],
 sys:"chronic", doctor:"Physician / diabetologist",
 modern:[
  {t:"Get tested rather than guess: fasting + post-meal sugar and HbA1c (any lab, ~no doctor needed for the test)."},
  {t:"Diagnosed ranges: Fasting ≥126 or HbA1c ≥6.5 = diabetes; 100–125 / 5.7–6.4 = prediabetes (reversible window!)."},
  {t:"Whatever the number: 30-min daily walk (esp. after meals), plate = ½ vegetables, stop sugary drinks, sleep 7–8 h, lose 5–7% weight if overweight.","f":""},
  {t:"Diabetes management medicines are prescription — a physician will personalise; NEVER stop prescribed medicines for any alternative therapy; monitor sugar if adding herbs (they add to the effect)."}],
 ayur:["Adjuncts with doctor's knowledge: fenugreek 1 tsp soaked overnight (morning), bitter-gourd (karela) juice 20 ml morning, amla+turmeric (Nishamalaki) 1 tsp twice daily, jamun seed powder 1/2 tsp.","Gudmar (Gymnema) 500 mg twice daily — the classical 'sugar-destroyer' (monitor sugars).","Barley-based meals (classical prameha staple); daily exercise is non-negotiable in Ayurveda too.","Avoid: sugarcane products, excess dairy/sweets/new grains, day-sleep (classical apathya)."],
 tests:["sugar_suspect"],
 seeDoc:["Any confirmed high reading → physician for full plan","Existing diabetic with sugars out of range","Numb feet, blurred vision, non-healing wounds (complication screening)"],
 emerg:["Very high sugar with vomiting/rapid breathing/drowsiness","Sweating/shaking/confusion (LOW sugar — give sugar/glucose immediately if conscious)"]},

{id:"bp_query", rg:"systemic", nm:"High blood pressure concern", al:["bp","blood pressure","hypertension","high bp","bp high"],
 sys:"chronic", doctor:"Physician / cardiologist",
 modern:[
  {t:"Measure properly: seated, rested 5 min, arm supported — twice daily × 1 week (home machine/pharmacy). One reading ≠ diagnosis."},
  {t:"≥140/90 repeatedly → physician (medicines are prescription and very effective). 180/120 or higher → urgent same-day."},
  {t:"What actually lowers BP: salt <5 g/day (skip papad/pickle/processed), 30-min daily walk, weight loss, stop smoking, limit alcohol, sleep, stress work.","f":""},
  {t:"NEVER stop prescribed BP medicines abruptly."}],
 ayur:["Adjuncts: garlic 1 clove morning, arjuna bark tea/capsule (heart tonic), brahmi/jatamansi for stress component.","Shirodhara + daily meditation/pranayama (anulom-vilom, bhramari) have measurable BP benefit.","Sarpagandha is the classical BP herb but ONLY under an Ayurvedic physician (interactions/depression risk).","Reduce salty-sour-fried; favour lauki, coconut water, amla."],
 tests:[], seeDoc:["Repeated readings ≥140/90","Already on medicines but uncontrolled","BP high in pregnancy — urgent"],
 emerg:["≥180/120 with headache/chest pain/vision change/breathlessness → EMERGENCY","BP high + one-sided weakness/slurred speech → stroke protocol"]},

{id:"weight", rg:"systemic", nm:"Weight management", al:["weight loss","obesity","motapa","weight gain","fat loss","overweight"],
 sys:"chronic", doctor:"Physician / dietitian",
 modern:[
  {t:"Target 0.5 kg/week: ~500 kcal daily deficit. Protein at every meal (dal/paneer/eggs/curd) — controls hunger."},
  {t:"Walk 8–10k steps daily + 2×/week strength work; sleep 7–8 h (short sleep = weight gain hormone-wise)."},
  {t:"Stop liquid calories (sugary tea/coffee/colas/juice); half-plate vegetables; eat within a ~10–12 h window."},
  {t:"Rule out thyroid/PCOS/medicines if weight gain is unexplained (simple tests). Crash diets & 'fat-burner' pills: avoid."}],
 ayur:["Warm honey-lemon water morning (traditional kapha-melter) + udvartana (dry powder massage) weekly.","Triphala 1 tsp at night; Trikatu (dry ginger+pepper+pippali) pinch with honey before lunch to raise agni.","Barley/millet meals over rice at night; no day-sleep after meals (classical apathya for sthaulya).","Guggul-based classical formulas (Navaka guggulu) via an Ayurvedic doctor; exercise is core in both systems."],
 tests:["chronic_fatigue","sugar_suspect"],
 seeDoc:["BMI ≥30 or weight-related symptoms (structured program)","Unexplained rapid weight change either way (thyroid etc.)"], emerg:[]},

{id:"fatigue", rg:"systemic", nm:"Weakness / tiredness", al:["weakness","fatigue","tired","kamzori","thakan","low energy","always tired"],
 sys:"general", doctor:"General physician",
 modern:[
  {t:"Get the basic 5 tests (very often one is the answer): CBC (anaemia), TSH (thyroid), fasting sugar, Vitamin D, B12."},
  {t:"Sleep 7–8 h fixed schedule; 20-min daily walk actually RAISES energy; hydrate; protein each meal."},
  {t:"Review: crash diets, skipped meals, heavy periods (women), snoring (apnea), low mood (depression fatigue is real and treatable)."}],
 ayur:["Ashwagandha 1/2 tsp with warm milk at night × 6–8 weeks — prime strength rasayana.","Chyawanprash 1 tsp morning with warm milk.","Dates + soaked almonds + milk breakfast addition; amla daily.","Abhyanga (oil massage) 2–3×/week; pranayama morning; don't suppress hunger/sleep (classical vega rules)."],
 tests:["chronic_fatigue","anemia_suspect","sugar_suspect"],
 seeDoc:["Tiredness >2–3 weeks despite sleep & food fixes → test, don't guess","With breathlessness on stairs, pale nails (anaemia)","With weight change/cold intolerance (thyroid)"],
 emerg:["Sudden severe weakness one side of body","Fainting spells","Breathlessness at rest"]},

{id:"anaemia", rg:"systemic", nm:"Iron-deficiency anaemia (low haemoglobin)",
 al:["anaemia","anemia","low haemoglobin","low hemoglobin","low hb","khoon ki kami","pale","paleness","weakness and pale","iron deficiency"],
 sys:"blood", doctor:"General physician (gynaecologist if heavy periods, gastroenterologist if bleeding suspected)",
 dq:[{q:"Are your periods heavy — soaking through protection, clots, or lasting over 7 days?",opts:["Yes, heavy","Normal or not applicable"]},
     {q:"Any black or bloody stools, or long-term painkiller use?",opts:["Yes","No"]}],
 modern:[
  {t:"Low haemoglobin is a finding, not a diagnosis — the important question is always WHY. In India the commonest causes are dietary lack, heavy periods, worm infestation and slow gut bleeding. Treat the iron, but find the cause."},
  {t:"Iron: ferrous sulphate 200 mg (about 65 mg elemental iron) once daily. Taking it on alternate days is absorbed better than twice daily and causes far less constipation and nausea."},
  {t:"Take it with a source of vitamin C — a lemon-water, orange or amla — which markedly increases absorption. Avoid tea, coffee, milk and calcium tablets within an hour either side; they block it."},
  {t:"Expect black stools; that's harmless and expected. If it upsets your stomach, take it with a little food rather than stopping it."},
  {t:"Continue for 3 months AFTER the haemoglobin normalises — that's what refills the stores. Stopping as soon as you feel better is the usual reason it comes back."},
  {t:"Diet alongside: dark green leafy vegetables, dates, jaggery, black raisins, pomegranate, beans, sesame, and eggs or meat if you eat them. Cooking in an iron kadhai genuinely adds iron."},
  {t:"Get a deworming tablet considered if you haven't had one in a year — worms are a common and easily fixed cause here.", f:"pcm"}],
 ayur:["Draksha (black raisins) soaked overnight, and pomegranate juice — classical rakta-vardhaka (blood-building) foods.",
  "Amla in any form daily; its vitamin C also drives iron absorption.",
  "Punarnavadi Mandura or Dhatri Lauha are the traditional iron-bearing preparations — practitioner-guided, and tell your doctor if you take them alongside prescribed iron.",
  "Avoid tea immediately after meals — a habit that quietly worsens anaemia in many households."],
 tests:["anemia_suspect"],
 seeDoc:["Always — to confirm the cause with a blood count and iron studies, not just to get iron",
  "Heavy periods, or any bleeding from the back passage",
  "No improvement in haemoglobin after 4 weeks of regular iron",
  "You are pregnant, or the person is a young child",
  "Weight loss, or you are over 45 with new anaemia — this needs the gut looked at"],
 emerg:["Breathless at rest, or chest pain","Racing heart while sitting still","Fainting, or unable to stand without collapsing","Very pale with black tarry stools"]},

{id:"dizziness", rg:"head", nm:"Dizziness / vertigo (BPPV type)",
 al:["dizzy","dizziness","vertigo","spinning","chakkar","head spinning","room spinning","light headed","balance problem","giddiness"],
 sys:"neuro", doctor:"ENT specialist or physician (neurologist if warning signs)",
 dq:[{q:"Does the spinning start when you turn over in bed or tilt your head, lasting under a minute?",opts:["Yes — brought on by movement","No — it is constant"]},
     {q:"Any deafness, ringing, double vision, slurred speech or weakness?",opts:["Yes","No"]}],
 modern:[
  {t:"Short spinning attacks triggered by rolling over in bed or looking up, lasting seconds to a minute, are almost always BPPV — loose crystals in the inner ear. It is harmless and mechanically fixable."},
  {t:"Brandt-Daroff exercises: sit on the bed edge, lie quickly onto one side with your nose pointed up at 45°, stay 30 seconds, sit up 30 seconds, repeat on the other side. Five repeats, twice a day for two weeks."},
  {t:"An Epley manoeuvre done by a doctor or physiotherapist fixes most cases in a single session — worth asking for rather than enduring weeks of it."},
  {t:"Move deliberately rather than avoiding movement — the brain recalibrates faster with gentle exposure. Get out of bed in stages: sit, pause, then stand."},
  {t:"If it is lightheadedness on standing rather than spinning, it is usually blood pressure or dehydration: drink more water, rise slowly, and have your haemoglobin and BP checked."},
  {t:"Avoid driving, ladders and swimming until it settles."},
  {t:"Do not take betahistine or long-term anti-vertigo medicines on your own — they slow the brain's own compensation and mask the cause.", f:"sed"}],
 ayur:["Nasya with 2 drops of warm Anu taila in each nostril in the morning is the classical treatment for head/ear-region Vata.",
  "Brahmi and Shankhapushpi support balance and steadiness; take with warm milk at night.",
  "Avoid fasting, cold wind on the head, and late nights — all aggravate Vata and worsen giddiness.",
  "Ginger tea helps the nausea that accompanies attacks."],
 tests:[],
 seeDoc:["Attacks continue beyond 2-3 weeks despite exercises","Hearing loss or ringing in one ear","Recurrent falls",
  "You take blood pressure or diabetes medicines — dizziness may be the dose","Constant unsteadiness rather than brief spinning"],
 emerg:["Double vision, slurred speech, facial droop or limb weakness","Severe unrelenting headache with the dizziness",
  "Unable to walk or sit unsupported","Chest pain, palpitations or fainting with it"]},

{id:"eczema", rg:"skin", nm:"Eczema / atopic dermatitis",
 al:["eczema","atopic dermatitis","dry itchy skin","khujli","dry patches","itchy patches","skin dryness"],
 sys:"skin", doctor:"Dermatologist",
 modern:[
  {t:"Eczema is dry, over-reactive skin rather than an infection. Nearly all of the benefit comes from restoring the barrier — moisturiser is the treatment, not a supportive extra."},
  {t:"Apply a thick fragrance-free moisturiser at least twice daily, and always within 3 minutes of bathing while the skin is damp. Plain coconut oil or petroleum jelly works well and costs little."},
  {t:"Stop using soap on the affected skin — use a soap substitute or just lukewarm water. Hot water and scented soaps are the two commonest aggravators."},
  {t:"For an angry flare, hydrocortisone 1% cream thinly twice daily for up to 7 days on body skin. Use it properly for a short course rather than timidly for weeks — under-treating prolongs flares.", f:"steroid"},
  {t:"Never apply steroid cream to the face, and don't use stronger steroid-antifungal-antibiotic combination creams sold over the counter — they thin skin and worsen fungal infection."},
  {t:"Keep nails short; scratching drives the itch-scratch cycle. An antihistamine at night can help you sleep through it.", f:"sed"},
  {t:"Cotton clothing, avoiding overheating, and washing new clothes before wearing all reduce flares."}],
 ayur:["Internal: Manjishtha and Neem support rakta-shodhana (blood cleansing) in chronic itchy skin conditions.",
  "External: coconut oil medicated with neem, or Eladi/Nalpamaradi taila for dryness with itching.",
  "Avoid the classical viruddha ahara (incompatible combinations) — fish with milk, curd at night, excess sour and salty — traditionally linked to kushtha (skin disease).",
  "Triphala at night keeps the gut clear; chronic skin problems are treated through digestion in Ayurveda."],
 tests:[],
 seeDoc:["Not improving after 2 weeks of proper moisturising and a short steroid course",
  "Weeping, crusting or yellow scabs — that suggests infection needing antibiotics",
  "Affecting sleep, work or a child's growth","Widespread involvement, or on the face and eyelids"],
 emerg:["Fever with rapidly spreading redness and pain","Painful blistering rash spreading fast (possible eczema herpeticum)","Facial or lip swelling with breathing difficulty"]},

{id:"worms", rg:"abdomen", nm:"Intestinal worms",
 al:["worms","worm infection","pinworm","threadworm","roundworm","pet me keede","keede","anal itching at night","kirmi"],
 sys:"gi", doctor:"General physician / paediatrician",
 modern:[
  {t:"Itching around the anus at night, worms seen in stool, or a child with poor appetite and vague tummy pain — worm infestation is very common in India and easily treated."},
  {t:"Albendazole 400 mg as a single dose (adults and children over 2 years), repeated after 2 weeks to catch newly hatched worms. Chewed or crushed, taken with food."},
  {t:"Treat the whole household on the same day — reinfection from family members is the usual reason it keeps coming back."},
  {t:"On treatment day: wash all bedding, towels and nightwear in hot water, and cut everyone's nails short."},
  {t:"Handwashing with soap before eating and after the toilet, and washing vegetables well, is what prevents recurrence. Deworming every 6 months is standard advice for children in India."},
  {t:"Iron levels are often low alongside worms — worth checking haemoglobin if there is tiredness or pallor."}],
 ayur:["Vidanga is the classical krimighna (anti-parasitic) herb; Krimighna vati is the traditional formulation.",
  "A small amount of raw garlic on an empty stomach, and ajwain with a little black salt at night, are the household measures.",
  "Neem leaf and bitter foods are traditionally used to make the gut inhospitable to parasites.",
  "Reduce sugar and refined flour during treatment — classically said to feed krimi."],
 tests:[],
 seeDoc:["Symptoms persist after two doses","A child under 2 years","Pregnant or breastfeeding",
  "Weight loss, or blood in the stool","Passing large worms in vomit"],
 emerg:["Severe abdominal pain with vomiting and no passage of gas or stool (obstruction)","Yellowing of the eyes with abdominal pain"]},

{id:"sciatica", rg:"back", nm:"Sciatica (nerve pain down the leg)",
 al:["sciatica","nerve pain leg","pain down my leg","shooting pain leg","slip disc","disc pain","pinched nerve","leg me current"],
 sys:"musculo", doctor:"Orthopaedician / physiotherapist",
 dq:[{q:"Any numbness in the saddle area, or difficulty controlling urine or stool?",opts:["Yes","No"]},
     {q:"Is the leg becoming weak — foot dragging or difficulty on stairs?",opts:["Yes","No"]}],
 modern:[
  {t:"Sciatica is nerve-root irritation, usually from a disc. Around 90% settle without surgery — most within 6 weeks — so the plan is pain control while it heals."},
  {t:"Keep moving. Bed rest beyond a day or two makes sciatica worse and slower, which is the opposite of most people's instinct."},
  {t:"Paracetamol 500-650 mg after food up to 4×/day as the base. Add ibuprofen 400 mg after food for short periods if your stomach and kidneys allow.", f:"pcm"},
  {t:"Heat pack for 15-20 minutes several times a day for muscle spasm; some prefer ice in the first 48 hours."},
  {t:"Avoid the two things that reliably flare it: sitting for long stretches, and bending-and-lifting. When you must lift, bend the knees and keep the load close."},
  {t:"Gentle nerve-gliding and hamstring stretches, and walking short distances often, help more than any tablet — a physiotherapist is worth more than a painkiller here."},
  {t:"Sleep on your side with a pillow between the knees, or on your back with a pillow under them."}],
 ayur:["Gridhrasi is the classical name; treatment centres on Vata pacification.",
  "Warm Mahanarayana or Dhanwantharam taila massage along the back of the leg, followed by moist heat (nadi sweda).",
  "Yogaraja guggulu or Trayodashanga guggulu, practitioner-guided, are the standard internal medicines.",
  "Kati basti (warm oil pooled over the lower back) is the specific therapy and gives many people substantial relief.",
  "Avoid cold, wind, fasting and suppressing natural urges — all aggravate Vata."],
 tests:["joint_chronic"],
 seeDoc:["No improvement in 6 weeks, or pain worsening rather than easing","Weakness in the foot or leg",
  "Pain waking you every night","Over 50 with new severe back pain, or a history of cancer"],
 emerg:["Numbness in the saddle area — inner thighs, buttocks or genitals",
  "Loss of bladder or bowel control, or not feeling yourself pass urine",
  "Both legs becoming weak","Fever with the back pain"]},

{id:"gout", rg:"limb", nm:"Gout (acute attack)",
 al:["gout","uric acid pain","big toe pain","joint red hot swollen","gout attack","vaat","high uric acid"],
 sys:"musculo", doctor:"Physician / rheumatologist",
 dq:[{q:"Is this your first ever attack, or do you have a fever with it?",opts:["First attack or fever present","Had it before, no fever"]}],
 modern:[
  {t:"A single joint — classically the big toe — suddenly red, hot and so tender that a bedsheet hurts, usually starting at night, is a gout attack."},
  {t:"Rest and elevate the joint, and apply an ice pack wrapped in cloth for 20 minutes several times a day. Keep the bedsheet off it with a pillow or cage."},
  {t:"Drink 3 litres of water daily during an attack — it helps clear urate and protects the kidneys."},
  {t:"Ibuprofen 400 mg after food three times daily for a few days is the usual first-line, but NOT if you have kidney disease, stomach ulcers, heart failure, or are on blood thinners — which is common in people who get gout.", f:"nsaid"},
  {t:"Do NOT take aspirin — low doses raise urate and worsen the attack."},
  {t:"Critically: never start or stop allopurinol during an attack on your own. Starting it mid-attack makes the attack worse; stopping it if you already take it also makes things worse. Keep taking it if you're already on it, and see a doctor about starting it after the attack settles."},
  {t:"Between attacks: reduce alcohol (especially beer), organ meats, red meat, shellfish and sugary or fructose-sweetened drinks. Weight loss, dairy and cherries genuinely help."}],
 ayur:["Vatarakta is the classical correlate — treated as Vata with vitiated blood.",
  "Guduchi (giloy) and Guggulu preparations such as Kaishore guggulu are the standard internal medicines, practitioner-guided.",
  "External: cool applications during the hot painful phase — the reverse of usual Vata treatment. Chandana or Shatadhauta ghrita paste.",
  "Avoid curd, black gram (urad), excessive salt and sour, alcohol and daytime sleep."],
 tests:["joint_chronic"],
 seeDoc:["First ever attack — it needs confirming, since infection looks identical","Attacks more than twice a year",
  "You have kidney disease or take diuretics","Uric acid stays high between attacks","Lumps appearing around joints or ears"],
 emerg:["Fever with a single hot swollen joint you cannot move — a joint infection needs same-day drainage",
  "The joint is a prosthetic (replaced) joint","Rapidly spreading redness with feeling very unwell"]},

{id:"frozen_shoulder", rg:"limb", nm:"Frozen shoulder / rotator cuff pain",
 al:["frozen shoulder","shoulder pain","kandha dard","shoulder stiff","cannot lift arm","rotator cuff","shoulder movement"],
 sys:"musculo", doctor:"Orthopaedician / physiotherapist",
 modern:[
  {t:"Shoulder pain with progressive stiffness — trouble reaching overhead, behind your back, or fastening clothes — is usually frozen shoulder or rotator cuff strain. It is slow but self-limiting."},
  {t:"Be realistic about time: frozen shoulder typically runs 12-18 months through painful, stiff and thawing phases. Knowing that prevents panic and prevents giving up on exercises too early."},
  {t:"Exercises are the treatment, and they must be daily. Pendulum swings: lean forward, let the arm hang, swing gently in circles for a minute, several times a day."},
  {t:"Wall-walking: face a wall, walk your fingers up as high as tolerable, hold 10 seconds, repeat 10 times. Also do towel-behind-the-back stretches. Mild discomfort is fine; sharp pain means ease off."},
  {t:"Heat before exercising loosens it; ice afterwards if it aches. Paracetamol 500-650 mg after food before your exercise session makes it possible to do them properly.", f:"pcm"},
  {t:"Do not immobilise it in a sling — a shoulder stiffens with rest, and that is exactly what you are trying to prevent."},
  {t:"If you have diabetes, expect it to take longer and control your sugars — frozen shoulder is markedly more common and more stubborn in diabetes."}],
 ayur:["Apabahuka is the classical description; treatment is Vata-pacifying and local.",
  "Warm Mahanarayana or Dhanwantharam taila massage followed by moist heat before exercise.",
  "Nasya with Anu taila is traditionally used for conditions above the collarbone.",
  "Yogaraja guggulu internally, practitioner-guided.",
  "Continue gentle movement daily — Ayurveda also warns against complete immobility in Vata disorders."],
 tests:["joint_chronic"],
 seeDoc:["No improvement after 6-8 weeks of daily exercises","Pain waking you every night",
  "Following a fall or dislocation — that needs imaging","Sudden inability to lift the arm at all after an injury (possible tendon tear)",
  "Diabetic or thyroid patient with a stiff shoulder — earlier physiotherapy helps"],
 emerg:["Shoulder pain brought on by exertion with sweating, breathlessness or chest pressure — that is a cardiac pattern, not a joint",
  "Severe pain after a fall with visible deformity","Arm cold, pale or numb below the shoulder"]},

{id:"pcos", rg:"pelvis", nm:"PCOS (polycystic ovary syndrome)",
 al:["pcos","pcod","irregular periods","missed periods","facial hair","period problem","cycle irregular","hirsutism"],
 sys:"womens", doctor:"Gynaecologist (endocrinologist if metabolic features)",
 modern:[
  {t:"Irregular or missed periods with acne, excess facial or body hair, or weight gain suggests PCOS. It is a metabolic condition as much as a gynaecological one, and it responds better to daily habits than to any single tablet."},
  {t:"The single most effective intervention is modest weight loss if you are overweight — losing 5-10% of body weight often restores regular cycles on its own."},
  {t:"Eat to blunt insulin spikes: whole grains over refined flour, protein at every meal, and don't skip breakfast. Cut sugary drinks and maida-based snacks — this matters more than any specific 'PCOS diet'."},
  {t:"150 minutes of exercise a week, including resistance training twice weekly. Muscle improves insulin sensitivity, which is the underlying problem."},
  {t:"Track your cycles on paper or an app before the appointment — the pattern is what the doctor needs, and it saves a visit."},
  {t:"Do not take metformin, hormonal pills or supplements bought without assessment. Diagnosis requires excluding thyroid disease and other causes first — the treatment differs entirely."},
  {t:"If periods are absent for more than 3 months, that needs review — the womb lining needs shedding periodically to stay healthy."}],
 ayur:["Correlated with Artava-kshaya and Kapha-Medo dushti — treatment targets metabolism, not just the cycle.",
  "Shatavari for cycle regulation, Ashokarishta for menstrual health, practitioner-guided.",
  "Kanchanara guggulu is the classical formulation for glandular and cystic conditions.",
  "Cinnamon and fenugreek support insulin sensitivity; both are supported by modern evidence too.",
  "Daily movement and early dinner are emphasised — Kapha accumulates with sedentary routine and late heavy meals."],
 tests:["sugar_suspect"],
 seeDoc:["Always, to confirm the diagnosis — thyroid disease and other causes must be excluded first",
  "No period for 3 months or more","Trying to conceive without success for a year (6 months if over 35)",
  "Rapid hair growth, voice deepening, or male-pattern balding — needs urgent hormone testing",
  "Very heavy or prolonged bleeding when periods do come","Darkened velvety skin at the neck — a sign of insulin resistance"],
 emerg:["Heavy bleeding soaking more than one pad an hour with dizziness","Severe one-sided pelvic pain with vomiting (possible ovarian torsion)","Sudden severe pelvic pain with a positive pregnancy test"]},

{id:"pneumonia", rg:"chest", nm:"Pneumonia (chest infection)", refer:true,
 al:["pneumonia","chest infection","lung infection","nimonia"],
 sys:"resp", doctor:"General physician — same day",
 modern:[
  {t:"Fever with cough and breathlessness, especially with one-sided chest pain worse on breathing in, suggests pneumonia rather than a simple chest cold."},
  {t:"This needs a doctor today and almost certainly an antibiotic chosen for you — it is not a self-treatable illness, and delay is what turns pneumonia dangerous."},
  {t:"Safe to do meanwhile: paracetamol 500-650 mg after food for fever and pain, plenty of fluids, and rest sitting propped up rather than flat.", f:"pcm"},
  {t:"Do not take leftover antibiotics from a previous illness — wrong drug, wrong dose and wrong duration all drive resistance and can mask the picture."}],
 ayur:["Supportive only while you arrange care: warm water, tulsi-ginger decoction, steam inhalation.",
  "Sitopaladi churna with honey is the classical supportive for cough with fever — alongside, never instead of, medical treatment.",
  "Avoid cold drinks, curd and daytime sleep during a chest infection."],
 tests:["fever_high"],
 seeDoc:["Today — this is a see-a-doctor condition, not a home-care one","Older adult, diabetic, pregnant, or with heart or lung disease — go sooner"],
 emerg:["Breathless at rest or unable to speak full sentences","Blue lips, confusion or drowsiness","Chest pain with collapse","Oxygen saturation below 94% if you have a pulse oximeter"]},

{id:"asthma", rg:"chest", nm:"Asthma / wheezing illness", refer:true,
 al:["asthma","wheezing","wheeze","dama","inhaler","breathing difficulty at night"],
 sys:"resp", doctor:"Physician / pulmonologist",
 modern:[
  {t:"Wheeze and breathlessness that come and go — worse at night, with exercise, cold air or dust — suggest asthma. It is very manageable, but it needs a proper diagnosis and a prescribed inhaler."},
  {t:"Asthma is treated with two different inhalers: a reliever for symptoms and a preventer taken daily even when well. Most poorly-controlled asthma in India is someone using only the reliever."},
  {t:"Do not buy or borrow an inhaler without assessment, and never take oral steroids on your own."},
  {t:"Identify and reduce triggers: dust, smoke, incense, mosquito coils, cold air, strong perfumes. Not smoking, and no one smoking indoors, matters more than any supplement."},
  {t:"If you already have a reliever inhaler and are wheezing: 2 puffs through a spacer, repeat after 20 minutes if needed, and seek help if it isn't settling."}],
 ayur:["Tamaka shwasa is the classical correlate; treatment is Kapha- and Vata-directed.",
  "Sitopaladi or Talisadi churna with honey, and Vasa (Adhatoda) are the traditional supports — use alongside prescribed treatment, not instead of it.",
  "Steam with ajwain, warm light food, early dinner; avoid curd, cold water and heavy fried food at night."],
 tests:[],
 seeDoc:["To get properly diagnosed and prescribed the right inhalers","Using your reliever more than twice a week — that means it is not controlled",
  "Night-time waking with cough or wheeze","Symptoms interfering with exercise, work or school"],
 emerg:["Can only speak a few words at a time","Reliever inhaler not helping after repeated doses","Chest sucking in under the ribs, or blue lips","Becoming drowsy or exhausted with the effort of breathing"]},

{id:"copd", rg:"chest", nm:"COPD (chronic lung disease)", refer:true,
 al:["copd","chronic bronchitis","emphysema","smoker cough","breathless on walking"],
 sys:"resp", doctor:"Pulmonologist",
 modern:[
  {t:"Long-standing cough with sputum and breathlessness on exertion, in a smoker or someone exposed to chulha or biomass smoke, suggests COPD. Diagnosis needs a simple breathing test (spirometry)."},
  {t:"The single most effective treatment is stopping smoking and removing smoke exposure — it slows the decline in a way no medicine matches. Improved cooking ventilation matters as much as tablets for many Indian households."},
  {t:"Inhalers are prescription-chosen for COPD and differ from asthma inhalers. Ask about the annual flu vaccine and the pneumococcal vaccine — both reduce the flare-ups that cause hospital admissions."},
  {t:"Safe meanwhile: keep active within your limits, treat any fever with paracetamol, stay well hydrated.", f:"pcm"}],
 ayur:["Supportive: steam inhalation, Sitopaladi churna, warm sesame oil chest massage.",
  "Pranayama and gentle graded walking are genuinely useful for breathlessness.",
  "Avoid cold, damp and smoke exposure — including incense and mosquito coils indoors."],
 tests:["cough3w"],
 seeDoc:["To confirm with spirometry and get the right inhalers","Increasing breathlessness, or more flare-ups than usual",
  "Ankle swelling, or weight loss","Coughing blood — needs urgent assessment"],
 emerg:["Breathless at rest or confused","Blue lips","Unable to complete a sentence","Drowsiness with laboured breathing"]},

{id:"tb", rg:"chest", nm:"Tuberculosis (suspected)", refer:true,
 al:["tb","tuberculosis","cough for weeks","chronic cough","night sweats","coughing blood","tapedik"],
 sys:"resp", doctor:"DOTS centre / chest physician — free under India's national programme",
 modern:[
  {t:"Any cough lasting more than 2 weeks in India should be tested for TB — especially with weight loss, evening fever, night sweats, or blood in the sputum."},
  {t:"Testing and treatment are FREE at government DOTS centres, including sputum testing and the full course of medicines. You do not need a private hospital for this."},
  {t:"TB is completely curable, but only with the full 6-month course. Stopping early because you feel better is what creates drug-resistant TB — which is far harder to treat."},
  {t:"Do not take any anti-TB medicine without confirmed diagnosis and supervision, and never take a partial or borrowed course."},
  {t:"Until assessed: cover your mouth when coughing, use a separate well-ventilated room if possible, and make sure household contacts — especially children and elderly — get screened."}],
 ayur:["Rajayakshma is the classical description. Ayurveda can support nutrition and strength during treatment but must never replace anti-TB drugs.",
  "Nutrition is critical: milk, ghee, protein, and adequate calories — under-nutrition both causes and worsens TB.",
  "Chyawanprash and Ashwagandha as rasayana support during recovery, with your doctor's knowledge."],
 tests:["cough3w"],
 seeDoc:["Now — sputum testing is the next step, and it is free","Household contact with TB","HIV positive, diabetic, or on steroids — screen earlier"],
 emerg:["Coughing significant amounts of blood","Severe breathlessness","Chest pain with collapse"]},

{id:"dengue", rg:"systemic", nm:"Dengue (suspected)", refer:true,
 al:["dengue","dengu","platelet","breakbone fever","pain behind eyes"],
 sys:"infection", doctor:"Physician — same day, with platelet count",
 modern:[
  {t:"High fever with severe body and joint ache, headache and pain behind the eyes during or after monsoon suggests dengue. It needs a blood test — platelet count and NS1/serology."},
  {t:"Paracetamol ONLY for fever and pain — 500-650 mg after food, up to 4 times a day. Absolutely no ibuprofen, aspirin, diclofenac or combination painkillers: they increase bleeding risk in dengue and are a common cause of avoidable deterioration.", f:"pcm"},
  {t:"Drink far more than usual — ORS, coconut water, rice water, soups. Aim to keep passing pale urine every few hours; this is what prevents most complications."},
  {t:"Critically: the dangerous phase is when the fever FALLS, usually days 4-6, not at its peak. Feeling worse as the fever settles is a warning sign, not recovery."},
  {t:"Papaya leaf extract is widely used; evidence is weak and it is not a substitute for monitoring platelets and hydration."}],
 ayur:["Supportive: Giloy (Guduchi) decoction and tulsi are traditional for jvara and are widely used alongside monitoring.",
  "Light, warm, easily digested food; plenty of fluids.",
  "Papaya leaf juice is traditional here but should never delay a platelet check."],
 tests:["fever_high"],
 seeDoc:["Today, for a platelet count and dengue test","Daily platelet monitoring if confirmed","Any bleeding, however minor"],
 emerg:["Severe abdominal pain or persistent vomiting","Bleeding gums, nose, or blood in vomit or stool",
  "Cold clammy skin, restlessness, or fainting","Sudden drop in temperature with worsening condition","Reduced urine output"]},

{id:"malaria", rg:"systemic", nm:"Malaria (suspected)", refer:true,
 al:["malaria","malaria fever","chills and rigors","shivering fever"],
 sys:"infection", doctor:"Physician — same day, with blood smear",
 modern:[
  {t:"Fever coming in distinct spikes with shaking chills followed by drenching sweats, especially in or after travel to a malarious area, needs a blood smear or rapid test the same day."},
  {t:"Malaria treatment depends on the species and local resistance — it must be prescribed after testing, never guessed. Testing and treatment are free at government facilities."},
  {t:"Paracetamol for fever, and plenty of fluids, while you arrange the test.", f:"pcm"},
  {t:"Falciparum malaria can deteriorate within hours, so do not wait for a second or third fever spike to seek testing."}],
 ayur:["Vishama jvara is the classical description for intermittent fevers.",
  "Guduchi and tulsi as supportive measures only — malaria requires specific antimalarial drugs.",
  "Light diet, ample fluids, rest."],
 tests:["fever_high"],
 seeDoc:["Today, for a smear or rapid test","Pregnant, a child, or returning from a high-risk area — sooner"],
 emerg:["Confusion, drowsiness or fits","Yellow eyes, or very dark urine","Breathlessness","Unable to keep fluids down","Passing little or no urine"]},

{id:"typhoid", rg:"systemic", nm:"Typhoid / enteric fever (suspected)", refer:true,
 al:["typhoid","enteric fever","motijhara","widal"],
 sys:"infection", doctor:"Physician — with blood culture",
 modern:[
  {t:"Fever climbing steadily over several days with headache, abdominal discomfort and poor appetite suggests enteric fever. Blood culture is the proper test; the Widal test alone is unreliable and is over-used."},
  {t:"This needs a prescribed antibiotic course chosen for local resistance patterns — self-medication with azithromycin or cefixime bought over the counter is a major driver of the resistant typhoid now common in India."},
  {t:"Paracetamol for fever, plenty of fluids, and soft easily-digested food while you get tested.", f:"pcm"},
  {t:"Complete whatever course is prescribed. Relapse and carrier states follow half-finished treatment."},
  {t:"Boiled or filtered water and careful food hygiene protect the rest of the household. A typhoid vaccine exists and is worth asking about."}],
 ayur:["Supportive: Guduchi, light khichdi, buttermilk once fever settles.",
  "Classical texts emphasise langhana (light diet) in jvara — this aligns with modern advice for enteric fever.",
  "Avoid heavy, oily and spicy food throughout."],
 tests:["fever3d"],
 seeDoc:["Fever beyond 3-4 days without a clear cause — get cultured","Anyone in the household with confirmed typhoid"],
 emerg:["Sudden severe abdominal pain with a rigid abdomen — possible perforation, a third-week risk",
  "Blood in stool or black stools","Confusion or extreme drowsiness","Unable to keep any fluids down"]},

{id:"covid", rg:"systemic", nm:"COVID-19 (suspected)", refer:true,
 al:["covid","corona","coronavirus","lost smell","lost taste"],
 sys:"infection", doctor:"Physician (telephone consultation is usually sufficient)",
 modern:[
  {t:"Fever, cough, sore throat and fatigue — particularly with loss of smell or taste — may be COVID. Most cases are managed at home."},
  {t:"Paracetamol for fever and aches, fluids, rest, and isolation from household members as far as practical.", f:"pcm"},
  {t:"Monitor oxygen saturation with a pulse oximeter if you have one. Below 94% at rest, or a drop after walking, needs medical assessment."},
  {t:"Do not take antibiotics, steroids, ivermectin or antivirals on your own. Steroids taken early actively worsen outcomes; they are only useful in specific situations a doctor judges."},
  {t:"Higher risk — over 60, diabetes, heart or lung disease, pregnancy, immunosuppression — means contact a doctor early rather than waiting."}],
 ayur:["Supportive: warm water, steam, tulsi-ginger-turmeric decoction, adequate rest and protein.",
  "Ashwagandha and Chyawanprash during recovery for fatigue, with your doctor's knowledge.",
  "Pranayama during recovery helps breathlessness and anxiety."],
 tests:[],
 seeDoc:["Breathlessness at any point","Symptoms worsening after day 5-7","High-risk group","Fever beyond 5 days"],
 emerg:["Oxygen saturation below 94%","Breathless at rest, or blue lips","Chest pain or pressure","Confusion or difficulty waking"]},

{id:"ulcer_peptic", rg:"abdomen", nm:"Peptic ulcer (suspected)", refer:true,
 al:["peptic ulcer","stomach ulcer","gastric ulcer","duodenal ulcer","h pylori","ulcer in stomach"],
 sys:"gi", doctor:"Gastroenterologist / physician",
 modern:[
  {t:"Upper abdominal pain that wakes you at night, or is clearly related to meals, with a history of painkiller use — suggests an ulcer rather than simple acidity."},
  {t:"This needs testing for H. pylori and often an endoscopy, plus a proper acid-suppression course. Antacids alone treat the symptom while the ulcer continues."},
  {t:"Stop all NSAIDs — ibuprofen, diclofenac, aspirin, and the combination pain powders sold loose. These are the commonest cause and continuing them risks bleeding or perforation.", f:"nsaid"},
  {t:"Use paracetamol for pain instead, and an antacid for symptom relief while you arrange assessment.", f:"pcm"},
  {t:"Avoid alcohol and smoking; both delay healing substantially."}],
 ayur:["Amlapitta / parinama shula are the classical correlates.",
  "Shatavari, licorice (yashtimadhu) and Avipattikar churna are the traditional supports; licorice is well documented for gastric mucosa.",
  "Eat at regular times, never skip meals, and avoid very spicy, sour and fermented foods while healing."],
 tests:["acidity_chronic"],
 seeDoc:["Symptoms beyond 2 weeks, or recurring after treatment","Any NSAID use with stomach pain","Over 45 with new upper abdominal pain"],
 emerg:["Vomiting blood, or material like coffee grounds","Black tarry stools","Sudden severe pain with a board-hard abdomen","Fainting or extreme weakness"]},

{id:"dysentery", rg:"abdomen", nm:"Dysentery (blood in stool with fever)", refer:true,
 al:["dysentery","blood in stool with fever","khooni dast","bloody diarrhea","mucus in stool"],
 sys:"gi", doctor:"Physician — same day",
 modern:[
  {t:"Loose stools containing blood or mucus, with fever and cramping, is dysentery — a different situation from ordinary loose motions and one that usually needs a specific antibiotic after a stool test."},
  {t:"Do NOT take loperamide or other stopping medicines. Trapping the infection inside worsens the illness and risks toxic dilation of the colon."},
  {t:"Rehydration is the priority meanwhile: ORS after every loose stool, plus rice water, buttermilk, coconut water. Keep passing urine."},
  {t:"Paracetamol is safe for fever. Avoid ibuprofen with gut inflammation.", f:"pcm"},
  {t:"Boiled water and hand hygiene for the household — this spreads easily."}],
 ayur:["Pravahika is the classical correlate.",
  "Kutaja (Holarrhena) is the specific classical herb for bloody diarrhoea; Kutajarishta is the standard preparation — alongside medical assessment.",
  "Buttermilk with roasted cumin and a little rock salt; rice gruel; avoid milk and heavy food until settled."],
 tests:["diarrhea_persist"],
 seeDoc:["Same day, with a stool test","A child, elderly or pregnant person","Fever above 38.5°C with the blood"],
 emerg:["Signs of significant dehydration — very little urine, dizziness on standing, sunken eyes",
  "Abdomen becoming swollen, hard and very painful while the diarrhoea stops","Confusion or extreme drowsiness","Heavy visible bleeding"]},

{id:"gallstones", rg:"abdomen", nm:"Gallstones / biliary colic", refer:true,
 al:["gallstone","gall bladder","gallbladder","pitt ki pathri","stone in gallbladder","pain after fatty food"],
 sys:"gi", doctor:"Surgeon (general surgery) after ultrasound",
 modern:[
  {t:"Severe episodic pain in the right upper abdomen, often after fatty food, sometimes radiating to the right shoulder blade — this is typical biliary colic. An ultrasound confirms it."},
  {t:"Attacks are managed with pain relief and a low-fat diet, but stones that cause symptoms are usually removed surgically. Medicines do not dissolve them in practice."},
  {t:"Meanwhile: low-fat diet, small frequent meals, avoid fried food, ghee-heavy dishes and full-cream dairy. Paracetamol for pain.", f:"pcm"},
  {t:"Do not ignore recurrent attacks — each carries a risk of the stone blocking the duct or causing pancreatitis, both of which are emergencies."}],
 ayur:["Supportive only; surgical stones need surgical assessment.",
  "Bhumyamalaki and Kutki are traditional liver-supportive herbs.",
  "Warm water, light early dinner, and strict avoidance of fried and heavy food."],
 tests:[],
 seeDoc:["To arrange an ultrasound and a surgical opinion","Repeated attacks","Diabetic — complications are quieter and more dangerous"],
 emerg:["Fever with chills and yellow eyes — infected bile duct, needs emergency drainage",
  "Severe pain going through to the back with vomiting — possible pancreatitis","Pain lasting over 6 hours","Yellowing of skin or eyes with dark urine"]},

{id:"ra", rg:"limb", nm:"Inflammatory arthritis (suspected RA)", refer:true,
 al:["rheumatoid","rheumatoid arthritis","joint swelling many","morning stiffness","gathiya","small joints swollen"],
 sys:"musculo", doctor:"Rheumatologist",
 modern:[
  {t:"Several joints painful and swollen symmetrically — hands, wrists, feet — with morning stiffness lasting over an hour that eases with movement, points to inflammatory arthritis rather than wear-and-tear."},
  {t:"This matters urgently in a way people underestimate: early treatment within the first months prevents permanent joint damage. Waiting a year to 'see if it settles' costs joints that cannot be recovered."},
  {t:"You need blood tests (RF, anti-CCP, ESR/CRP) and a rheumatologist. Treatment is with disease-modifying drugs, not painkillers alone."},
  {t:"Meanwhile: paracetamol for pain, keep joints gently moving, warm compresses in the morning.", f:"pcm"},
  {t:"Do not take long-term steroids obtained without prescription — very common here, and it causes diabetes, bone loss and Cushing's over time."}],
 ayur:["Amavata is the classical correlate — treated as ama (metabolic toxin) with Vata.",
  "Guggulu preparations (Simhanada, Yogaraja) and Guduchi are standard, practitioner-guided, and can complement DMARDs with your rheumatologist's knowledge.",
  "Warm light food, ginger, avoiding curd and cold heavy food; gentle daily movement rather than rest."],
 tests:["joint_chronic"],
 seeDoc:["Within weeks, not months — early treatment changes the outcome","Morning stiffness over an hour","Small joints of hands or feet swollen","Family history of autoimmune disease"],
 emerg:["A single hot swollen joint with fever — infection must be excluded urgently","Chest pain or breathlessness","New numbness or weakness in the limbs"]},

{id:"thyroid", rg:"systemic", nm:"Thyroid disorder (suspected)", refer:true,
 al:["thyroid","hypothyroid","hyperthyroid","tsh","thyroid problem","weight gain hair fall","neck swelling"],
 sys:"endocrine", doctor:"Physician / endocrinologist",
 modern:[
  {t:"Fatigue with weight change, hair fall, cold or heat intolerance, constipation or loose stools, and menstrual changes — these point to thyroid dysfunction. A simple TSH blood test answers it."},
  {t:"Thyroid disease is common in India and very treatable, but the dose must be individualised and monitored. Never start or adjust thyroxine on your own."},
  {t:"If prescribed thyroxine: take it on an empty stomach, 30-60 minutes before food, and keep at least a 4-hour gap from calcium and iron tablets, which block its absorption."},
  {t:"Use iodised salt. Beyond that, no supplement or diet corrects a thyroid problem."}],
 ayur:["Kanchanara guggulu is the classical formulation for glandular swellings, practitioner-guided.",
  "Yoga — particularly Sarvangasana and Ujjayi pranayama — is traditionally indicated; ask your doctor if you have nodules or heart disease.",
  "Do not stop prescribed thyroxine in favour of herbs; combine them with your doctor's knowledge."],
 tests:["chronic_fatigue"],
 seeDoc:["To get a TSH test — the diagnosis cannot be made on symptoms alone","Pregnant or planning pregnancy — thyroid affects the baby's development",
  "A visible neck swelling or lump","Already on thyroxine with persisting symptoms — the dose may need review"],
 emerg:["Known overactive thyroid with fever, racing heart, tremor and confusion — thyroid storm",
  "Known underactive thyroid, now very cold, slow and unresponsive — myxoedema",
  "Rapidly enlarging neck swelling with difficulty breathing or swallowing"]},

{id:"depression", rg:"systemic", nm:"Depression / low mood", refer:true,
 al:["depression","depressed","low mood","no interest","hopeless","udaasi","mann nahi lagta","feeling worthless"],
 sys:"mental", doctor:"Psychiatrist or a physician you trust — both can help",
 modern:[
  {t:"Persistent low mood or loss of interest in things you used to enjoy, most of the day for two weeks or more, is depression. It is a medical condition, not weakness — and it responds well to treatment."},
  {t:"In India it very often shows up as physical symptoms — persistent aches, tiredness, 'gas', poor sleep — rather than sadness. If tests keep coming back normal, this is worth considering seriously."},
  {t:"What genuinely helps while you arrange care: daily walking or exercise (effect sizes comparable to medication in mild-moderate depression), regular sleep and wake times, sunlight, and telling one person you trust."},
  {t:"Alcohol makes depression worse, not better, even though it feels otherwise in the moment."},
  {t:"Treatment is talking therapy, medication, or both — chosen with a professional. Do not start or stop antidepressants on your own; stopping suddenly causes withdrawal symptoms."},
  {t:"Free confidential support in India: Tele-MANAS 14416 (24×7, multiple languages), and iCall 9152987821."}],
 ayur:["Ashwagandha and Brahmi are traditionally used for mano-vikara and have some modern evidence for stress and anxiety — as support alongside treatment, not instead of it.",
  "Abhyanga (warm oil self-massage) and regular routine (dinacharya) are strongly emphasised — sleep and rhythm are treated as medicine.",
  "Pranayama and meditation daily; avoid isolation, irregular sleep and skipped meals."],
 tests:["chronic_fatigue"],
 seeDoc:["Symptoms lasting more than two weeks","Unable to work, study or care for family","Not sleeping or eating",
  "Using alcohol or substances to cope","After childbirth — postnatal depression is common and treatable"],
 emerg:["Thoughts of harming yourself or ending your life — call Tele-MANAS 14416 or iCall 9152987821 now, or go to a hospital",
  "A plan, or means gathered","Hearing voices, or beliefs others find strange","Not drinking or eating at all"]},

{id:"pyelonephritis", rg:"back", nm:"Kidney infection", refer:true,
 al:["kidney infection","pyelonephritis","fever with back pain urine","flank pain fever"],
 sys:"urinary", doctor:"Physician — same day",
 modern:[
  {t:"Burning urine with fever, chills and pain in the flank or back means the infection has reached the kidney. This is beyond what home measures or a short over-the-counter course can treat."},
  {t:"It needs a urine culture and a proper antibiotic course, often 7-14 days, sometimes intravenous. Under-treated kidney infection scars the kidney permanently."},
  {t:"Meanwhile: drink plenty of water, paracetamol for fever and pain.", f:"pcm"},
  {t:"Pregnancy makes this urgent — kidney infection in pregnancy risks preterm labour and needs same-day care."}],
 ayur:["Supportive only: coriander water, barley water, coconut water for their traditional mutrala (diuretic) action.",
  "Gokshura and Punarnava are classical urinary herbs, useful in recovery rather than acute infection.",
  "Plenty of fluids; avoid holding urine."],
 tests:["uti"],
 seeDoc:["Same day — this needs culture-guided antibiotics","Pregnant, diabetic, or a single kidney — urgently","Recurrent infections need investigation for stones or reflux"],
 emerg:["Confusion, very fast breathing, or mottled cold skin — sepsis","Unable to keep fluids or medicines down","Passing very little urine","Severe pain with vomiting"]},

{id:"stone", rg:"back", nm:"Kidney / urinary stone", refer:true,
 al:["kidney stone","renal colic","stone in kidney","pathri","stone pain","loin to groin pain"],
 sys:"urinary", doctor:"Urologist",
 modern:[
  {t:"Severe waves of pain from the loin around to the groin, often with nausea and an inability to sit still, is classic renal colic. Blood in the urine is common."},
  {t:"Diagnosis is by ultrasound or CT. Small stones usually pass on their own with fluids and pain relief; larger ones need a procedure."},
  {t:"Drink 2.5-3 litres of water daily — this is the single most effective measure both for passing a stone and preventing the next one."},
  {t:"Pain relief is usually an NSAID, which works better than paracetamol for renal colic — but only if your kidneys and stomach allow it, so it should be prescribed.", f:"nsaid"},
  {t:"Strain your urine to catch the stone; its composition determines prevention advice."},
  {t:"Prevention: adequate water, reduce salt, moderate animal protein. Do not cut calcium in the diet — that increases stone risk, contrary to common belief."}],
 ayur:["Ashmari is the classical description. Gokshura, Punarnava, Varuna and Pashanabheda are the traditional stone herbs.",
  "Barley water, coconut water and plenty of plain water are the household measures.",
  "These support small stones passing; they do not remove obstructing stones, which need urological treatment."],
 tests:["uti"],
 seeDoc:["For imaging to size and locate the stone","Recurrent stones — needs metabolic workup","Single kidney, or known kidney disease"],
 emerg:["Fever with chills alongside the pain — an infected obstructed kidney is a surgical emergency",
  "Unable to pass urine at all","Persistent vomiting preventing fluids","Pain uncontrolled despite medication"]},

{id:"pregnancy_care", rg:"pelvis", nm:"Pregnancy-related concern", refer:true,
 al:["pregnant","pregnancy","expecting","garbhavastha","morning sickness","pregnancy problem"],
 sys:"womens", doctor:"Obstetrician / ANM at your nearest health centre",
 modern:[
  {t:"In pregnancy, the safest assumption is that symptoms deserve a check rather than home management — the threshold for asking is deliberately low."},
  {t:"Paracetamol is the painkiller of choice. Avoid ibuprofen, diclofenac and aspirin unless a doctor specifically directs otherwise, especially after 20 weeks.", f:"pcm"},
  {t:"For nausea: small frequent meals, dry snacks before rising, ginger, and avoiding an empty stomach. If you cannot keep fluids down, that needs review, not endurance."},
  {t:"Take folic acid, iron and calcium as prescribed. Anaemia is very common in Indian pregnancies and worth actively monitoring."},
  {t:"Do not take any medicine, herbal preparation or supplement without checking — including Ayurvedic formulations, several of which are contraindicated in pregnancy."},
  {t:"Keep all antenatal appointments even when you feel entirely well; the checks are for problems you cannot feel, like blood pressure and growth."}],
 ayur:["Garbhini paricharya (month-wise regimen) emphasises nourishment, calm routine and adequate rest.",
  "Milk, ghee, dates, almonds and easily digestible food; avoid fasting.",
  "Several herbs are contraindicated in pregnancy — take nothing without a qualified practitioner who knows you are pregnant."],
 tests:["anemia_suspect"],
 seeDoc:["Any bleeding, at any stage","Reduced or absent baby movements after 24 weeks","Persistent vomiting, unable to keep fluids down",
  "Fever","Burning urine — untreated UTI risks preterm labour","Swelling of face or hands, or a persistent headache"],
 emerg:["Heavy bleeding, or constant severe abdominal pain with a hard abdomen",
  "Severe headache with visual spots or swelling — possible pre-eclampsia","Fits or convulsions",
  "Waters broken with fever or foul-smelling fluid","Baby not moving at all"]},

{id:"cellulitis", rg:"skin", nm:"Cellulitis (skin infection)", refer:true,
 al:["cellulitis","skin infection","spreading redness","red swollen leg","infected wound"],
 sys:"skin", doctor:"Physician — same day",
 modern:[
  {t:"A spreading area of red, warm, tender, swollen skin — often on the leg, often after a small break in the skin — is cellulitis. It needs oral antibiotics; creams do not treat it."},
  {t:"Mark the edge of the redness with a pen and note the time. If it spreads beyond the mark within hours, that needs urgent reassessment — this simple step is genuinely useful."},
  {t:"Meanwhile: elevate the limb above heart level when resting, paracetamol for pain, and keep the area clean.", f:"pcm"},
  {t:"Diabetes changes this substantially — infection spreads faster, hurts less, and needs earlier and more aggressive treatment. Check your feet daily if diabetic."}],
 ayur:["Supportive only — bacterial cellulitis requires antibiotics.",
  "Neem and turmeric preparations traditionally support skin infection alongside treatment.",
  "Keep the limb elevated and rested; avoid applying heavy oils over an actively infected area."],
 tests:[],
 seeDoc:["Same day for antibiotics","Diabetic, or poor circulation — sooner","Facial or hand involvement","Not improving within 48 hours of starting antibiotics"],
 emerg:["Pain far out of proportion to how the skin looks","Skin turning dusky, purple or black, or blistering",
  "Crackling under the skin","Fever with confusion or feeling profoundly unwell","Red streaks tracking up the limb rapidly"]},

{id:"rabies_risk", rg:"skin", nm:"Animal bite / rabies exposure", refer:true,
 al:["dog bite","animal bite","cat bite","monkey bite","bat","rabies","kutte ne kata","scratch from dog"],
 sys:"infection", doctor:"Nearest hospital or anti-rabies clinic — TODAY",
 modern:[
  {t:"Any bite, scratch or lick on broken skin from a dog, cat, monkey, mongoose or bat must be treated as a possible rabies exposure. Rabies is effectively 100% fatal once symptoms begin — and completely preventable before that."},
  {t:"DO THIS NOW: wash the wound with soap under running water for a full 15 minutes. This single step removes a large share of the virus and measurably reduces risk. Time it — most people wash for seconds."},
  {t:"Then apply an antiseptic such as povidone-iodine or alcohol. Do not suture, bandage tightly, or apply chillies, oil, turmeric, mud or herbal pastes — traditional applications are common here and they trap the virus."},
  {t:"Go the same day for anti-rabies vaccination. It is free at government hospitals in India. Deep or multiple wounds, or bites on the face, hands or genitals, also need rabies immunoglobulin — say this at the counter."},
  {t:"Complete the full vaccine schedule even if the animal looks healthy or is a known pet. An apparently well dog can be infectious days before it appears ill."},
  {t:"Also ask about a tetanus booster if you have not had one within 5 years."}],
 ayur:["Alarka visha is described in classical texts, but no Ayurvedic treatment substitutes for rabies vaccination — this is one place to be unambiguous.",
  "Traditional pastes applied to bite wounds are actively harmful; wash with soap and water instead.",
  "Seek vaccination first; supportive care afterwards."],
 tests:[],
 seeDoc:["Today, without exception, for vaccination","Any bite in a child — they are bitten on the face and hands more often"],
 emerg:["Bite on the face, neck, hands or genitals","Deep, multiple or heavily bleeding wounds","Bite from a bat, or a wild or unprovoked animal",
  "Any difficulty swallowing, fear of water, agitation or confusion after a past bite — go to hospital immediately"]},

{id:"oral_cancer", rg:"head", nm:"Non-healing mouth ulcer or patch", refer:true,
 al:["mouth ulcer not healing","white patch mouth","red patch mouth","cannot open mouth","tobacco ulcer","gutkha","mouth cancer"],
 sys:"dental", doctor:"Dental surgeon or ENT — for biopsy",
 modern:[
  {t:"A mouth ulcer or patch that has not healed in 3 weeks is not an ordinary ulcer and must not be treated as one — especially with any history of tobacco, gutkha, khaini, paan masala or areca nut."},
  {t:"Warning signs: a white or red patch that will not rub off, a lump, difficulty opening the mouth, numbness of the lip, a loose tooth without dental cause, or a neck lump."},
  {t:"India carries one of the world's highest oral cancer burdens, largely from smokeless tobacco. Caught early it is highly curable; caught late it is disfiguring and often fatal — and the gap between those is usually months of waiting."},
  {t:"You need a specialist examination and, if indicated, a biopsy. Do not accept repeated courses of ointment or vitamins for a non-healing ulcer without one."},
  {t:"Stopping tobacco and areca nut now materially changes the outcome, at any stage. Quitlines and cessation clinics are free in India."}],
 ayur:["Ayurveda can support oral health and healing but must never delay biopsy of a non-healing lesion.",
  "Oil pulling and triphala mouth rinses support general oral hygiene.",
  "Tobacco and areca nut cessation is the intervention that matters; everything else is secondary."],
 tests:[],
 seeDoc:["Any mouth ulcer or patch lasting over 3 weeks — this week, not eventually","Any tobacco or areca nut use, even without symptoms — get screened annually",
  "Progressive difficulty opening the mouth","A lump in the neck"],
 emerg:["Difficulty breathing or swallowing","Significant bleeding from the mouth","Rapidly enlarging swelling of the mouth or neck"]},

{id:"generic", rg:"systemic", nm:"General health concern", al:[],
 sys:"general", doctor:"General physician",
 modern:[
  {t:"From what you've told me, this doesn't cleanly match a common quick-fix pattern — and guessing would be bad medicine."},
  {t:"Comfort measures: rest, hydration, light food, paracetamol 650 mg after food if there's pain/fever (max 4/day).", f:"pcm"},
  {t:"Track: when it started, what worsens/relieves it, any fever, appetite/weight/sleep changes — this record makes the doctor visit twice as useful."}],
 ayur:["Light, warm, freshly-cooked food; avoid heavy/fried/cold items till clear.","Ginger-tulsi tea twice daily; early dinner, proper sleep.","Triphala 1 tsp at night if digestion feels off (most issues start in the gut per Ayurveda)."],
 tests:[], seeDoc:["If it persists beyond 3–5 days, worsens, or worries you — see a physician; carry your symptom notes"],
 emerg:["Any red-flag symptom listed at the end of this report"]}
]};
const DB_PAIN_MAP = {head:["headache","migraine"], eyes:["eye_red"], ear:["earache"], throat:["sore_throat","cold"], chest:["CHEST_SPECIAL","costochondritis"], upabd:["acidity","indigestion","stomach_pain"], lowabd:["uti","period_pain","constipation","stomach_pain"], back:["back_pain"], joints:["joint_pain","sprain"], muscles:["cramps","fatigue","flu"], skin:["rash","fungal","hives","wound"], urinary:["uti"], teeth:["toothache","mouth_ulcer"]};
