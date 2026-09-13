const state={rep:0,inventory:[],journal:"Mission : atteindre le Lac Rose.",scene:"gate"};
const $=id=>document.getElementById(id);
function roll(sides=20){const n=Math.floor(Math.random()*sides)+1;$("rollValue").textContent=n;return n}
function update(){ $("rep").textContent=state.rep>=0?`+${state.rep}`:state.rep; $("inventory").textContent=state.inventory.length?state.inventory.join(", "):"Vide"; $("journal").textContent=state.journal}
function render(scene){
  state.scene=scene; const c=$("choices");c.innerHTML="";
  const data=scenes[scene];$("sceneTitle").textContent=data.title;$("storyText").textContent=data.text;$("art").innerHTML=data.art;
  $("dialogue").innerHTML=data.dialogue||"";
  data.choices.forEach(x=>{const b=document.createElement("button");b.className="choice";b.textContent=x.label;b.onclick=()=>{if(x.action)x.action(); if(x.next)render(x.next);update()};c.appendChild(b)});
  update()
}
function addBerry(type){
 state.inventory.push(type);
 state.journal="Vous avez récolté "+type+".";
}
const scenes={
gate:{
 title:"L'entrée Nord de Dassom",
 art:"🏰<br>👩‍🦳  🧑‍🦱<br>⚔️ 🏹 🧙",
 text:"Kayla et Hilam vous attendent devant les portes Nord. Ils vous confient une mission inhabituelle : les nouveaux jumeaux doivent apparaître au Lac Rose. Vous devez les retrouver et les ramener à Dassom. La récompense sera à la hauteur de l'importance de la mission.",
 dialogue:"<b>Kayla :</b> « Nous vous demandons de nous faire confiance. Le temps presse. »<br><br><b>Hilam :</b> « Le passage vers le lac commence au-delà du Bois Tendre. »",
 choices:[
  {label:"Accepter la mission et poser quelques questions.",next:"questions"},
  {label:"Accepter sans poser de questions.",next:"forest"},
  {label:"« Combien sommes-nous payés ? »",action:()=>state.rep+=0,next:"questions"}
 ]},
questions:{
 title:"Des réponses... et des silences",
 art:"👩‍🦳 💬 🧑‍🦱<br>❓ ❓ ❓",
 text:"Vous insistez. Qui sont ces enfants ? Pourquoi vous ? Que se passe-t-il au Lac Rose ? Les jumeaux répondent, mais certaines réponses restent volontairement mystérieuses.",
 dialogue:"<b>Kayla :</b> « Ils sont importants pour Dassom. Plus important que je ne peux vous l'expliquer aujourd'hui. »<br><br><b>Hilam :</b> « Si vous voulez comprendre, vous devrez peut-être observer plutôt que demander. »",
 choices:[
  {label:"Faire un jet de Perspicacité pour jauger Kayla.",action:()=>{const r=roll();alert(r>=12?`Perspicacité : ${r} — Kayla semble sincèrement inquiète.`:`Perspicacité : ${r} — impossible de savoir ce qu'elle cache.`)},next:"forest"},
  {label:"Cesser les questions et partir vers le Bois Tendre.",next:"forest"}
 ]},
forest:{
 title:"Le Bois Tendre",
 art:"🌲 🌳 🌲<br>🍃 🐿️ 🍃<br>🥾 🥾 🥾",
 text:"Vous quittez Dassom. Le Bois Tendre est calme, presque trop calme. La lumière traverse les feuillages et le chemin serpente vers les montagnes.",
 dialogue:"Votre compagnon vous accompagne. « Pour l'instant, je dirais que c'est une mission plutôt tranquille. »",
 choices:[
  {label:"Suivre le chemin principal.",next:"clearing"},
  {label:"Explorer les alentours.",next:"wolves"},
  {label:"Se séparer pour couvrir davantage de terrain.",next:"wolves"}
 ]},
wolves:{
 title:"Des grognements dans les fourrés",
 art:"🌲 🌲 🌲<br>🐺 &nbsp; 👀 &nbsp; 🐺<br>🌿 🌿 🌿",
 text:"Un bruissement. Puis un grognement. Des loups affamés apparaissent entre les arbres.",
 dialogue:"Votre compagnon : « Ils ne semblent pas vouloir nous laisser passer tranquillement... »",
 choices:[
  {label:"⚔️ Combattre les loups.",action:()=>{const r=roll();alert(`Jet d'initiative : ${r}. Le combat est prêt à être développé dans la prochaine version.`);state.journal="Vous avez affronté des loups affamés.";},next:"clearing"},
  {label:"🍖 Leur donner de la nourriture.",action:()=>{state.rep+=1;state.journal="Vous avez évité un combat en nourrissant les loups.";},next:"clearing"},
  {label:"🏃 Fuir vers la clairière.",next:"clearing"}
 ]},
clearing:{
 title:"La clairière aux trois baies",
 art:"🌳 🌿 🌳<br>⚫  🔵  🔴<br>🌱 🌱 🌱",
 text:"Vous découvrez une petite clairière. Trois sortes de baies poussent ici. Vous pouvez les récolter, les étudier ou simplement continuer.",
 dialogue:"Certaines baies semblent familières. D'autres pourraient réserver des surprises...",
 choices:[
  {label:"Récolter une baie noire.",action:()=>addBerry("baie noire"),next:"smoke"},
  {label:"Récolter une baie bleue.",action:()=>addBerry("baie bleue"),next:"smoke"},
  {label:"Récolter une baie rouge.",action:()=>addBerry("baie rouge"),next:"smoke"},
  {label:"Ne rien toucher et observer la forêt.",next:"smoke"}
 ]},
smoke:{
 title:"Une fumée au loin",
 art:"🌲 🌲 🌲<br>💨 💨 🛖<br>🌿 🌿 🌿",
 text:"Au loin, quelque chose attire votre attention : une fine colonne de fumée s'élève derrière les arbres.",
 dialogue:"Un jet de Perception ou d'Investigation pourrait confirmer votre intuition.",
 choices:[
  {label:"🎲 Faire un jet de Perception.",action:()=>{const r=roll();alert(`Perception : ${r} — ${r>=10?"Vous repérez clairement une petite cabane.":"Vous distinguez difficilement une fumée au loin."}`)},next:"cabin"},
  {label:"Aller voir la fumée sans attendre.",next:"cabin"},
  {label:"Continuer vers les montagnes.",next:"cabin"}
 ]},
cabin:{
 title:"La cabane du fermier",
 art:"🛖<br>🌾 🐴 🌾<br>🪵 🔥 🪵",
 text:"Une petite cabane se trouve au milieu de la forêt. Un homme s'occupe de quelques travaux tandis qu'un étonnant petit cheval robuste broute près de lui.",
 dialogue:"<b>Fermier :</b> « Vous êtes des vendeurs ? J'ai pas besoin de grand-chose. »<br><br>Il semble peu intéressé... jusqu'à ce que votre regard se pose sur son cheval.",
 choices:[
  {label:"« Votre cheval est magnifique ! »",action:()=>{state.rep+=2;state.journal="Le mystérieux fermier semble apprécier votre groupe.";},next:"sage"},
  {label:"Demander immédiatement son chemin.",next:"sage"},
  {label:"Inspecter discrètement la cabane.",action:()=>{const r=roll();alert(`Investigation : ${r}. Quelque chose chez cet homme ne colle pas avec son apparence.`)},next:"sage"}
 ]},
sage:{
 title:"Un fermier pas comme les autres",
 art:"🧙‍♂️<br>🐴 ✨<br>🛖",
 text:"L'homme finit par se montrer beaucoup plus bavard. Il vous parle de la région et vous apprend qu'un problème inquiète les habitants de Berdésa : les chariots se font rares.",
 dialogue:"<b>Fermier :</b> « Si vous allez vers l'est... vous pourriez faire un détour par Berdésa. Quelque chose ne tourne pas rond là-bas. »<br><br><i>Le regard du fermier semble évaluer chacun de vos gestes.</i>",
 choices:[
  {label:"🛒 « Nous allons voir ce qui se passe à Berdésa. »",action:()=>{state.journal="Nouvelle piste : les chariots se font rares à Berdésa.";},next:"end"},
  {label:"🌸 « Notre mission passe avant tout. Nous continuons vers le Lac Rose. »",action:()=>{state.journal="Vous avez choisi de poursuivre vers le Lac Rose.";},next:"end"},
  {label:"🎲 Faire un jet de Perspicacité sur le fermier.",action:()=>{const r=roll();alert(`Perspicacité : ${r} — ${r>=15?"Cet homme cache clairement quelque chose.":"Son identité reste mystérieuse."}`)},next:"end"}
 ]},
end:{
 title:"Fin du prototype 0.1",
 art:"🌲 🛖 🏔️<br>🧙‍♂️ 🐴<br>🌸 ✨ 🌸",
 text:"Bravo ! Vous venez d'atteindre la première bifurcation majeure du jeu. Dans la prochaine version, Berdésa et le chemin vers la grotte du Lac Rose deviendront de véritables zones explorables.",
 dialogue:"<b>Ce prototype est volontairement petit.</b> Le moteur est déjà préparé pour accueillir davantage de dialogues, jets, inventaire, combats et conséquences.",
 choices:[
  {label:"↻ Rejouer depuis le début.",next:"gate"}
 ]}
};
$("restart").onclick=()=>render("gate"); render("gate");