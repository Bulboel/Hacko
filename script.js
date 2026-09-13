"use strict";

const $ = id => document.getElementById(id);
const STATS = ["FOR","DEX","CON","INT","SAG","CHA"];
const DEFAULTS = [15,14,13,12,10,8];

const NPCS = {
  kayla: {
    name:"Kayla",
    title:"jumelle et dirigeante de Dassom",
    temperament:"assertive",
    patienceMax:3,
    patience:3,
    respect:0,
    warmth:0,
    discomfort:0,
    hostility:0,
    knows:["mission","lac","selection","dassom"],
    voice:"directe"
  },
  hilam: {
    name:"Hilam",
    title:"jumeau et dirigeant de Dassom",
    temperament:"dry",
    patienceMax:4,
    patience:4,
    respect:0,
    warmth:0,
    discomfort:0,
    hostility:0,
    knows:["mission","lac","selection","dassom"],
    voice:"calme"
  }
};

let G = {
  scene:"gate",
  char:null,
  mission:"offered",
  dassom:"neutral",
  inventory:[],
  companion:"Neria",
  debug:false,
  focus:"kayla",
  topic:"mission",
  lastIntent:null,
  npcs: JSON.parse(JSON.stringify(NPCS))
};

const mod=n=>Math.floor((n-10)/2);
const sign=n=>n>=0?`+${n}`:`${n}`;
const any=(t,arr)=>arr.some(x=>t.includes(x));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function message(type,html){
  const d=document.createElement("div");
  d.className=`msg ${type}`;
  d.innerHTML=html;
  $("log").appendChild(d);
  $("log").scrollTop=$("log").scrollHeight;
}

function setScene(s){
  G.scene=s;
  const data={
    gate:["Entrée Nord de Dassom","🏰 👩‍🦳 🧑‍🦱 ⚔️"],
    outside:["Aux abords de Dassom","🏰 🚪 🌾 🛤️"],
    forest:["Bois Tendre","🌲 🍃 🌳 🐿️"],
    clearing:["Clairière du Bois Tendre","🌳 ⚫ 🔵 🔴 🌳"],
    cabin:["Cabane isolée","🛖 🐴 🔥 🌾"]
  }[s];
  $("place").textContent=data[0];
  $("art").textContent=data[1];
}

function relationWord(npc){
  const score=npc.respect+npc.warmth-npc.discomfort-npc.hostility*2;
  if(score>=4) return "favorable";
  if(score>=1) return "cordial";
  if(score<=-5) return "hostile";
  if(score<=-2) return "agacé";
  return "neutre";
}

function updateSide(){
  const missionText=G.mission==="active"?"acceptée":G.mission==="cancelled"?"annulée":"proposée";
  $("journal").innerHTML=`Mission du Lac Rose : ${missionText}<br>Statut à Dassom : ${G.dassom}`;
  $("inventory").textContent=G.inventory.length?G.inventory.join(", "):"—";
  $("relations").innerHTML=Object.values(G.npcs).map(n=>{
    const rel=relationWord(n);
    return `<div class="rel"><span>${n.name}</span><span class="${rel==="hostile"||rel==="agacé"?"bad":rel==="favorable"?"good":""}">${rel}</span></div>`;
  }).join("");
}

function normalize(text){
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[’]/g,"'");
}

function detectTarget(t){
  if(any(t,["hilam","jumeau","garcon","moche"])) return "hilam";
  if(any(t,["kayla","jumelle","fille","belle","madame"])) return "kayla";
  return G.focus || "kayla";
}

function detectSocial(t){
  const scores={};
  const add=(k,v)=>scores[k]=(scores[k]||0)+v;

  if(any(t,["bonjour","bonsoir","merci","s'il vous plait","excusez","desole","pardon"])) add("polite",2);
  if(any(t,["belle","beau","magnifique","jolie","joli","charmante","charmant"])) add("compliment",2);
  if(any(t,["je t'aime","je vous aime","epouse moi","marie moi","embrasse","bisou","amoureux","amoureuse"])) add("overfamiliar",4);
  if(any(t,["canon","sexy","bonne","beau gosse"])) add("overfamiliar",3);
  if(any(t,["connasse","conasse","salope","idiot","idiote","cretin","cretine","petit con","gros con","ta gueule","ferme ta gueule","je t'emmerde","je vous emmerde","va te faire"])) add("insult",5);
  if(any(t,["je vais te tuer","je vais vous tuer","je te defonce","je vous defonce","je te casse","je vous casse","menace"])) add("threat",5);
  if(any(t,["j'attaque","je l'attaque","je frappe","je la frappe","je le frappe","je degaine","je lui saute dessus","je lance un sort sur"])) add("attack",8);
  if(any(t,["pardon","desole","je m'excuse","excuse-moi","excusez-moi"])) add("apology",4);

  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0] || "neutral";
}

function detectTopic(t){
  if(any(t,["qui etes-vous","qui es-tu","votre nom","ton nom","presentez","presentation"])) return "identity";
  if(any(t,["pourquoi nous","pourquoi moi","choisi","choisie","choisis","selection","recommande","recommandes"])) return "selection";
  if(any(t,["on doit faire quoi","que doit-on faire","quoi faire","mission","quete","objectif","commence cette quete","commencer cette quete"])) return "mission";
  if(any(t,["lac rose","nouveaux jumeaux","nouveau jumeau"])) return "lake";
  if(any(t,["cachez","cache quelque chose","mentez","mens","sincere"])) return "secret";
  if(any(t,["je refuse","pas envie","je ne veux pas","non merci"])) return "refusal";
  if(any(t,["je pars","partons","je quitte","bois tendre","prends la route","continue mon chemin"])) return "leave";
  return G.topic || "mission";
}

function analyze(raw){
  const t=normalize(raw);
  const target=detectTarget(t);
  const social=detectSocial(t);
  const topic=detectTopic(t);
  const hasQuestion=raw.includes("?")||any(t,["qui ","pourquoi","quoi","comment","ou ","combien"]);
  const intensity=(social==="attack"?5:social==="threat"?4:social==="insult"?3:social==="overfamiliar"?2:social==="compliment"?1:0);
  return {t,target,social,topic,hasQuestion,intensity};
}

function debug(info){
  if(!G.debug) return;
  $("debugPanel").hidden=false;
  $("debugPanel").textContent=
`cible: ${info.target}
social: ${info.social}
sujet: ${info.topic}
question: ${info.hasQuestion}
focus précédent: ${G.focus}
mission: ${G.mission}`;
}

async function roll(label,ability,dc){
  const bonus=mod(G.char.stats[ability]), o=$("diceOverlay"), die=$("die");
  $("diceTitle").textContent=`${label} • ${ability} ${sign(bonus)}`;
  $("diceStep").textContent="";
  $("diceOutcome").textContent="";
  $("diceOutcome").className="";
  o.classList.add("on");
  die.classList.add("rolling");
  const spin=setInterval(()=>die.textContent=1+Math.floor(Math.random()*20),90);
  await wait(1800);
  clearInterval(spin);
  const raw=1+Math.floor(Math.random()*20);
  const total=raw+bonus;
  die.classList.remove("rolling");
  die.textContent=raw;
  await wait(700);
  $("diceStep").textContent=`${raw} ${sign(bonus)} = ${total} • DD ${dc}`;
  await wait(900);
  const ok=total>=dc;
  $("diceOutcome").textContent=ok?"RÉUSSITE":"ÉCHEC";
  $("diceOutcome").className=ok?"success":"failure";
  await wait(3000);
  o.classList.remove("on");
  return {ok,raw,total};
}

function socialReaction(info){
  const npc=G.npcs[info.target];
  G.focus=info.target;

  if(info.social==="polite"){
    npc.respect=clamp(npc.respect+1,-10,10);
    npc.warmth=clamp(npc.warmth+1,-10,10);
    if(npc.discomfort>0) npc.discomfort--;
    if(npc.patience<npc.patienceMax) npc.patience++;
    return false;
  }

  if(info.social==="compliment"){
    npc.warmth=clamp(npc.warmth+1,-10,10);
    if(npc.temperament==="assertive"){
      message("npc",`<b>${npc.name} :</b> « Merci. Mais on va peut-être rester concentrés sur la raison de votre présence. »`);
    }else{
      message("npc",`<b>${npc.name} :</b> « C'est gentil. Revenons à la mission. »`);
    }
    return true;
  }

  if(info.social==="overfamiliar"){
    npc.discomfort=clamp(npc.discomfort+2,-10,10);
    npc.patience--;
    if(npc.temperament==="assertive"){
      if(npc.discomfort<=2){
        message("npc",`<b>${npc.name} :</b> « Doucement. On se connaît depuis trente secondes. »`);
      }else{
        message("npc",`<b>${npc.name} :</b> « Là, tu deviens lourd. On parle mission, pas mariage. »`);
      }
    }else{
      message("npc",`<b>${npc.name} :</b> « Euh... on peut rester sur la mission, s'il te plaît ? »`);
    }
    return true;
  }

  if(info.social==="insult"){
    npc.hostility=clamp(npc.hostility+1,-10,10);
    npc.respect=clamp(npc.respect-2,-10,10);
    npc.patience--;

    if(npc.name==="Kayla"){
      if(npc.patience>=2){
        message("narrator","Kayla se tait une seconde, manifestement contrariée.");
        message("npc","<b>Kayla :</b> « Je vais faire comme si j'avais mal entendu. Une fois. »");
      }else if(npc.patience===1){
        message("npc","<b>Kayla :</b> « Écoute, petit con : continue comme ça et cette conversation va devenir beaucoup moins agréable. »");
      }else{
        G.mission="cancelled";
        message("npc","<b>Kayla :</b> « C'est bon. Va jouer au héros ailleurs. On trouvera quelqu'un d'autre. »");
        message("narrator","Kayla retire officiellement la mission au groupe. L'aventure continue, mais sans leur soutien.");
      }
    }else{
      if(npc.patience>=2) message("npc","<b>Hilam :</b> « Charmant. Tu veux essayer une seconde fois, avec un vocabulaire d'adulte ? »");
      else {
        G.mission="cancelled";
        message("npc","<b>Hilam :</b> « Ça suffit. Nous n'avons aucune raison de travailler avec toi. »");
      }
    }
    updateSide();
    return true;
  }

  if(info.social==="threat"){
    npc.hostility+=2;
    npc.patience=0;
    G.mission="cancelled";
    message("npc",`<b>${npc.name} :</b> « Très mauvais choix de mots. »`);
    message("narrator","Les gardes autour de la porte se tendent immédiatement. La mission est retirée.");
    updateSide();
    return true;
  }

  if(info.social==="attack"){
    G.mission="cancelled";
    G.dassom="expulsé";
    message("narrator","Tu passes à l'agression. Kayla réagit avant que ton attaque ne puisse réellement commencer.");
    message("npc","<b>Kayla :</b> « Sérieusement ? »");
    message("narrator","Une force brutale te repousse. Les gardes t'escortent hors de Dassom. Aucun jet n'est proposé : l'écart de puissance rend l'issue certaine.");
    setScene("outside");
    updateSide();
    return true;
  }

  if(info.social==="apology"){
    npc.respect=clamp(npc.respect+1,-10,10);
    npc.discomfort=Math.max(0,npc.discomfort-2);
    npc.hostility=Math.max(0,npc.hostility-1);
    npc.patience=Math.min(npc.patienceMax,npc.patience+1);
    message("npc",npc.name==="Kayla"
      ? "<b>Kayla :</b> « Très bien. On repart de là. »"
      : "<b>Hilam :</b> « Excuses acceptées. On avance. »");
    updateSide();
    return true;
  }

  return false;
}

async function answerGate(info){
  const npc=G.npcs[info.target];
  G.focus=info.target;
  G.topic=info.topic;

  if(socialReaction(info)) return;

  if(info.topic==="identity"){
    if(info.target==="kayla"){
      message("npc","<b>Kayla :</b> « Kayla. Je suis l'une des jumelles et je règne actuellement sur Dassom avec Hilam. »");
    }else{
      message("npc","<b>Hilam :</b> « Hilam. Jumeau de Kayla, et je règne sur Dassom avec elle. »");
    }
    return;
  }

  if(info.topic==="selection"){
    message("npc","<b>Hilam :</b> « Vous avez été recommandés par des personnes de vos entourages respectifs, des gens qui ont participé avec nous il y a des années de cela maintenant. »");
    return;
  }

  if(info.topic==="mission"){
    message("npc","<b>Kayla :</b> « Vous devez traverser le Bois Tendre, rejoindre la chaîne de montagnes et trouver l'entrée de la grotte qui mène au Lac Rose. Les nouveaux jumeaux devraient y apparaître. Ramenez-les à Dassom en sécurité. »");
    return;
  }

  if(info.topic==="lake"){
    message("npc","<b>Hilam :</b> « Le Lac Rose se trouve au cœur des montagnes. L'accès le plus sûr passe par une grotte au nord du Bois Tendre. »");
    return;
  }

  if(info.topic==="secret"){
    const r=await roll("Perspicacité","SAG",12);
    message("narrator",r.ok
      ? "Kayla est sincèrement préoccupée par la mission. Pourtant, son silence et un bref regard vers Hilam confirment qu'ils ne vous disent pas tout."
      : "Tu observes Kayla, mais son expression reste trop maîtrisée pour en tirer une certitude.");
    return;
  }

  if(info.topic==="refusal"){
    G.mission="cancelled";
    message("npc","<b>Kayla :</b> « C'est votre droit. Nous chercherons d'autres aventuriers. »");
    message("narrator","La mission est refusée, mais ton personnage reste libre de circuler.");
    updateSide();
    return;
  }

  if(info.topic==="leave"){
    if(G.mission!=="cancelled") G.mission="active";
    setScene("forest");
    message("narrator","Tu quittes Dassom et t'engages dans le Bois Tendre. Neria t'accompagne.");
    updateSide();
    return;
  }

  if(info.hasQuestion){
    message("npc",`<b>${npc.name} :</b> « Pose ta question clairement, je te répondrai si je le peux. »`);
  }else{
    message("npc",npc.name==="Kayla"
      ? "<b>Kayla :</b> « D'accord. Et maintenant ? »"
      : "<b>Hilam :</b> « Je t'écoute. »");
  }
}

async function answerOutside(info){
  if(any(info.t,["retourne","rentre","porte","dassom"])){
    message("narrator",G.dassom==="expulsé"?"Les gardes te barrent l'entrée. Pour le moment, la grande porte n'est plus une option.":"Tu retournes vers Dassom.");
    return;
  }
  if(any(info.t,["foret","bois","nord","lac","montagne"])){
    setScene("forest");
    message("narrator","Tu prends la route du nord. Sans briefing complet, tu avances avec nettement moins d'informations.");
    return;
  }
  message("narrator","Tu es libre aux abords de Dassom. Tu peux suivre une route, longer les murs ou partir dans la campagne.");
}

async function answerForest(info){
  if(any(info.t,["neria","compagnon"])){
    message("npc","<b>Neria :</b> « Je suis toujours là. Et j'espère qu'on sait à peu près où on va. »");
    return;
  }
  if(any(info.t,["observe","cherche","regarde","inspecte","fumee"])){
    const r=await roll("Perception","SAG",10);
    message("narrator",r.ok?"Entre les branches, tu repères une fine colonne de fumée.":"Tu ne remarques rien de particulier.");
    return;
  }
  if(any(info.t,["separe","seul"])){
    const r=await roll("Perception","SAG",11);
    message("narrator",r.ok?"Un grognement te prévient : un loup affamé approche. Tu n'es pas surpris.":"Un loup affamé surgit des fourrés avant que tu ne puisses réagir.");
    return;
  }
  if(any(info.t,["avance","continue","chemin","clairiere"])){
    setScene("clearing");
    message("narrator","Tu atteins une petite clairière où poussent des baies noires, bleues et rouges.");
    return;
  }
  message("system","Action cohérente mais encore hors du champ de simulation de la 0.4 locale.");
}

async function answerClearing(info){
  if(any(info.t,["identifier","nature","etudie","connais"])){
    const r=await roll("Nature","INT",11);
    message("narrator",r.ok
      ?"Tu identifies les baies : noire contre la putréfaction, bleue rend 1d4-1 PV, rouge inflige 1d4 PV par heure pendant 6 heures une fois digérée."
      :"Tu n'es pas assez certain pour identifier leurs propriétés.");
    return;
  }
  if(any(info.t,["cueille","recolte","prends"])&&any(info.t,["rouge","bleue","noire"])){
    const col=info.t.includes("rouge")?"rouge":info.t.includes("bleue")?"bleue":"noire";
    G.inventory.push("baie "+col);
    message("narrator",`Tu récoltes une baie ${col}.`);
    updateSide();
    return;
  }
  if(any(info.t,["cabane","fumee","aller voir"])){
    setScene("cabin");
    message("narrator","La fumée mène à une petite cabane. Un cheval nain broute près du foyer.");
    message("npc","<b>Fermier :</b> « Des vendeurs ? Non merci. »");
    return;
  }
  message("system","Tu peux examiner les baies, chercher des traces, suivre la fumée ou improviser.");
}

async function answerCabin(info){
  if(info.social==="compliment" && info.t.includes("cheval")){
    message("npc","Le fermier se déride immédiatement. <b>« Ah ! Enfin quelqu'un qui sait reconnaître un cheval exceptionnel ! »</b>");
    return;
  }
  if(info.topic==="identity"){
    message("npc","<b>Fermier :</b> « Vous pouvez m'appeler Orven. Je m'occupe de ce coin et de mon cheval. Ça devrait suffire, non ? »");
    return;
  }
  if(any(info.t,["berdesa","chariot"])){
    message("npc","<b>Orven :</b> « Les chariots se font rares du côté de Berdésa. Quelque chose ne tourne pas rond à l'est. »");
    return;
  }
  if(info.social==="attack"){
    const r=await roll("Initiative","DEX",12);
    message("narrator",r.ok
      ?"Tu te prépares à agir, mais quelque chose dans sa posture te fait comprendre que ce combat serait une très mauvaise idée."
      :"Avant même que tu sois correctement en position, le fermier s'est déjà déplacé. Cet homme n'est clairement pas un simple paysan.");
    return;
  }
  message("npc","Orven t'observe avec attention, comme s'il évaluait ton caractère.");
}

async function act(raw){
  if(!raw.trim()) return;
  message("player",raw);

  const info=analyze(raw);
  debug(info);
  G.lastIntent=info.social;

  if(G.scene==="gate") await answerGate(info);
  else if(G.scene==="outside") await answerOutside(info);
  else if(G.scene==="forest") await answerForest(info);
  else if(G.scene==="clearing") await answerClearing(info);
  else if(G.scene==="cabin") await answerCabin(info);

  updateSide();
}

function startGame(){
  try{
    const stats={};
    STATS.forEach(n=>stats[n]=Number($("s_"+n).value)||10);
    G.char={name:$("name").value.trim()||"Aventurier",race:$("race").value,klass:$("klass").value,stats};

    $("create").hidden=true;
    $("game").hidden=false;
    $("who").textContent=G.char.name;
    $("sheet").innerHTML=`${G.char.race} • ${G.char.klass} • Niveau 1<br><br>`+
      STATS.map(n=>`${n} ${stats[n]} (${sign(mod(stats[n]))})`).join("<br>");

    setScene("gate");
    updateSide();

    message("narrator","Kayla et Hilam t'attendent devant les portes Nord de Dassom. Ils souhaitent te confier une mission liée à l'apparition prochaine de nouveaux jumeaux au Lac Rose.");
    message("npc","<b>Kayla :</b> « Merci d'être venu. Pose les questions que tu veux avant de partir. »");
    message("system","La 0.4 analyse désormais la cible, le sujet et plusieurs comportements sociaux : politesse, flatterie, lourdeur, insulte, menace, excuse et attaque.");
  }catch(e){
    console.error(e);
    $("err").textContent="Erreur : "+e.message;
  }
}

function init(){
  STATS.forEach((n,i)=>{
    $("stats").insertAdjacentHTML("beforeend",`<label class="stat">${n}<input id="s_${n}" type="number" min="3" max="20" value="${DEFAULTS[i]}"></label>`);
  });

  $("start").onclick=startGame;
  $("send").onclick=()=>{
    const v=$("action").value;
    $("action").value="";
    act(v);
  };
  $("action").onkeydown=e=>{
    if(e.key==="Enter"&&!e.shiftKey){
      e.preventDefault();
      $("send").click();
    }
  };
  $("restartBtn").onclick=()=>location.reload();
  $("debugBtn").onclick=()=>{
    G.debug=!G.debug;
    $("debugBtn").textContent=`Debug : ${G.debug?"ON":"OFF"}`;
    $("debugPanel").hidden=!G.debug;
  };
}
document.addEventListener("DOMContentLoaded",init);
