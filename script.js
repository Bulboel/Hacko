'use strict';

const $ = (id) => document.getElementById(id);
const STAT_NAMES = ['FOR','DEX','CON','INT','SAG','CHA'];
const DEFAULTS = [15,14,13,12,10,8];

const state = {
  scene: 'gate',
  trust: 0,
  hostility: 0,
  inventory: [],
  character: null,
  companion: 'Neria'
};

function abilityMod(score){
  return Math.floor((score - 10) / 2);
}
function signed(n){
  return n >= 0 ? `+${n}` : `${n}`;
}
function includesAny(text, words){
  return words.some((w) => text.includes(w));
}

function buildStats(){
  const wrap = $('stats');
  wrap.innerHTML = '';
  STAT_NAMES.forEach((name, i) => {
    const div = document.createElement('label');
    div.className = 'stat';
    div.innerHTML = `${name}<input id="stat_${name}" type="number" min="3" max="20" value="${DEFAULTS[i]}">`;
    wrap.appendChild(div);
  });
}

function addMessage(type, html){
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerHTML = html;
  $('log').appendChild(div);
  $('log').scrollTop = $('log').scrollHeight;
}

function updateWorld(){
  $('world').innerHTML =
    `Confiance PNJ : ${state.trust}<br>` +
    `Hostilité : ${state.hostility}<br>` +
    `Inventaire : ${state.inventory.length ? state.inventory.join(', ') : '—'}`;
}

function setScene(scene){
  state.scene = scene;
  const scenes = {
    gate: ['Entrée Nord de Dassom', '🏰 👩‍🦳 🧑‍🦱 ⚔️'],
    forest: ['Bois Tendre', '🌲 🍃 🌳 🐿️'],
    clearing: ['Clairière du Bois Tendre', '🌳 ⚫ 🔵 🔴 🌳'],
    cabin: ['Cabane isolée', '🛖 🐴 🔥 🌾']
  };
  const data = scenes[scene];
  $('place').textContent = data[0];
  $('art').textContent = data[1];
}

function rollDice(label, ability, dc){
  return new Promise((resolve) => {
    const bonus = abilityMod(state.character.stats[ability]);
    const overlay = $('overlay');
    const die = $('die');

    $('test').textContent = `${label} • ${ability} ${signed(bonus)}`;
    $('result').textContent = '';
    overlay.classList.add('on');
    overlay.setAttribute('aria-hidden','false');
    die.classList.add('rolling');

    const spinner = setInterval(() => {
      die.textContent = String(1 + Math.floor(Math.random() * 20));
    }, 70);

    setTimeout(() => {
      clearInterval(spinner);
      const raw = 1 + Math.floor(Math.random() * 20);
      const total = raw + bonus;
      const success = total >= dc;

      die.classList.remove('rolling');
      die.textContent = String(raw);
      $('result').textContent = `${raw} ${signed(bonus)} = ${total} • DD ${dc} • ${success ? 'RÉUSSITE' : 'ÉCHEC'}`;

      setTimeout(() => {
        overlay.classList.remove('on');
        overlay.setAttribute('aria-hidden','true');
        resolve(success);
      }, 1100);
    }, 900);
  });
}

async function act(raw){
  const t = raw.toLowerCase().trim();
  if (!t) return;

  addMessage('player', raw);

  if (includesAny(t, ['idiot','crétin','abruti','menace','attaque','frappe','tue','tuer','dégage'])) {
    state.hostility += 2;
  }
  if (includesAny(t, ['bonjour','merci','magnifique','joli','désolé','s’il vous plaît',"s'il vous plaît"])) {
    state.trust += 1;
  }

  if (state.scene === 'gate') {
    if (includesAny(t, ['cache','mentez','sincère','sincere'])) {
      const ok = await rollDice('Perspicacité','SAG',12);
      addMessage('narrator', ok
        ? 'Kayla semble sincèrement inquiète, mais elle retient clairement une partie de la vérité.'
        : 'Tu ne parviens pas à lire clairement ses intentions.');
    } else if (includesAny(t, ['pourquoi','jumeaux','récompense','recompense','payer','payé','paye'])) {
      addMessage('npc', '<b>Hilam :</b> « Leur sécurité est essentielle. Dassom saura vous récompenser généreusement. »');
    } else if (includesAny(t, ['pars','partons','bois','route','quitte','continue'])) {
      setScene('forest');
      addMessage('narrator', 'Vous quittez Dassom et entrez dans le Bois Tendre. Neria marche à tes côtés.');
    } else {
      addMessage('npc', '<b>Kayla :</b> « Je t’écoute. Certaines réponses devront cependant attendre. »');
    }
  }

  else if (state.scene === 'forest') {
    if (includesAny(t, ['compagnon','neria','parle à neria','parle a neria'])) {
      addMessage('npc', '<b>Neria :</b> « Je suis curieuse de voir le Lac Rose... mais je pense qu’on ne nous a pas tout dit. »');
    } else if (includesAny(t, ['observe','cherche','regarde','inspecte'])) {
      const ok = await rollDice('Perception','SAG',10);
      addMessage('narrator', ok
        ? 'Entre les branches, tu distingues une fine colonne de fumée.'
        : 'Rien d’inhabituel ne saute aux yeux.');
    } else if (includesAny(t, ['sépare','separe','seul'])) {
      const ok = await rollDice('Perception','SAG',11);
      addMessage('narrator', ok
        ? 'Tu entends un loup affamé avant qu’il n’apparaisse et tu as le temps de te préparer.'
        : 'Un loup affamé surgit des fourrés et te surprend !');
    } else if (includesAny(t, ['continue','avance','clairière','clairiere','chemin'])) {
      setScene('clearing');
      addMessage('narrator', 'Le chemin débouche sur une clairière où poussent des baies noires, bleues et rouges.');
    } else {
      addMessage('system', 'Action mémorisée. Cette version locale ne sait pas encore improviser toutes les conséquences possibles.');
    }
  }

  else if (state.scene === 'clearing') {
    if (includesAny(t, ['identifier','nature','connais','étudie','etudie'])) {
      const ok = await rollDice('Nature','INT',11);
      addMessage('narrator', ok
        ? 'Tu identifies les propriétés : noire contre la putréfaction, bleue soigne légèrement, rouge est nocive pendant sa digestion.'
        : 'Tu n’es pas assez certain de leurs propriétés pour t’y fier.');
    } else if (includesAny(t, ['cueille','récolte','recolte','prends']) &&
               includesAny(t, ['rouge','bleue','noire'])) {
      const color = t.includes('rouge') ? 'rouge' : (t.includes('bleue') ? 'bleue' : 'noire');
      state.inventory.push(`baie ${color}`);
      addMessage('narrator', `Tu récoltes une baie ${color}.`);
    } else if (includesAny(t, ['fumée','fumee','cabane','aller voir'])) {
      setScene('cabin');
      addMessage('narrator', 'La fumée mène à une petite cabane. Un cheval nain broute devant la porte.');
      addMessage('npc', '<b>Fermier :</b> « Des vendeurs ? Non merci. Passez votre chemin. »');
    } else {
      addMessage('system', 'Tu peux examiner les baies, chercher la fumée ou tenter une autre action libre.');
    }
  }

  else if (state.scene === 'cabin') {
    if (t.includes('cheval') && includesAny(t, ['beau','joli','magnifique','adorable','superbe'])) {
      state.trust += 3;
      addMessage('npc', 'Le fermier s’illumine. <b>« Enfin quelqu’un avec des yeux ! Il s’appelle Pécorin ! »</b>');
    } else if (includesAny(t, ['menace','attaque','frappe','arme'])) {
      const ok = await rollDice('Intimidation','CHA',15);
      addMessage('npc', ok
        ? 'Le fermier cesse de sourire. « Range ça. Ensuite, peut-être que nous parlerons. »'
        : 'Le fermier ne semble pas impressionné. « Mauvaise idée. »');
    } else if (includesAny(t, ['berdésa','berdesa','chariot'])) {
      addMessage('npc', '<b>Fermier :</b> « Les chariots se font rares à Berdésa. Si vous avez le temps, allez voir. »');
    } else if (includesAny(t, ['qui es','qui êtes','qui etes','sage','cache','fermier'])) {
      const ok = await rollDice('Perspicacité','SAG',14);
      addMessage('npc', ok
        ? '« Un fermier qui aime son cheval. Ça ne vous suffit pas ? » Son regard confirme presque qu’il joue un rôle.'
        : '« Je suis exactement ce que vous voyez : un homme, une cabane et un excellent cheval. »');
    } else {
      addMessage('npc', state.hostility > 2
        ? 'Le fermier suit chacun de tes gestes, méfiant.'
        : 'Le fermier t’observe avec curiosité. « Continue, je t’écoute. »');
    }
  }

  updateWorld();
}

function startGame(){
  try {
    const stats = {};
    STAT_NAMES.forEach((name) => {
      const value = Number($(`stat_${name}`).value);
      stats[name] = Number.isFinite(value) ? value : 10;
    });

    state.character = {
      name: $('name').value.trim() || 'Aventurier',
      race: $('race').value,
      klass: $('klass').value,
      stats
    };

    $('create').hidden = true;
    $('game').hidden = false;
    $('who').textContent = state.character.name;
    $('sheet').innerHTML =
      `${state.character.race} • ${state.character.klass} • Niveau 1<br><br>` +
      STAT_NAMES.map((name) => `${name} ${stats[name]} (${signed(abilityMod(stats[name]))})`).join('<br>');

    setScene('gate');
    updateWorld();

    addMessage('narrator', 'Kayla et Hilam vous attendent devant les portes Nord de Dassom. Les nouveaux jumeaux doivent apparaître au Lac Rose.');
    addMessage('npc', '<b>Kayla :</b> « Nous comptons sur vous. Posez vos questions si vous en avez. »');
    addMessage('system', 'Écris librement ce que ton personnage dit ou tente. Certains mots et intentions déclenchent déjà des réactions et des jets.');
  } catch (err) {
    console.error(err);
    $('startupError').textContent = 'Erreur au démarrage : ' + err.message;
  }
}

function init(){
  buildStats();

  $('start').addEventListener('click', startGame);
  $('send').addEventListener('click', () => {
    const value = $('action').value;
    $('action').value = '';
    act(value);
  });
  $('action').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('send').click();
    }
  });
  document.querySelectorAll('[data-q]').forEach((button) => {
    button.addEventListener('click', () => {
      $('action').value = button.dataset.q;
      $('send').click();
    });
  });
  $('sheetBtn').addEventListener('click', () => {
    const sidebar = $('sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : '';
  });
}

document.addEventListener('DOMContentLoaded', init);
