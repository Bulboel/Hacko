"use strict";
/* Hacko — table de MJ partagée. Toute l'interface est construite avec h() (pas d'innerHTML → pas d'injection). */
window.H = window.H || {};

const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "value") e.value = v;
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
};

/* ---------- Données de jeu ---------- */
const CLASSES = ["Barbare", "Barde", "Clerc", "Druide", "Ensorceleur", "Guerrier", "Magicien", "Moine", "Occultiste", "Paladin", "Rôdeur", "Roublard", "Autre"];
const PRESETS = [
  { kind: "slime", name: "Slime", hp: 14, ac: 8, bonus: 0 },
  { kind: "chauve", name: "Chauve-souris", hp: 9, ac: 12, bonus: 3 },
  { kind: "gobelin", name: "Gobelin", hp: 15, ac: 13, bonus: 2 },
  { kind: "loup", name: "Loup", hp: 22, ac: 12, bonus: 2 },
  { kind: "squelette", name: "Squelette", hp: 20, ac: 13, bonus: 0 },
  { kind: "orc", name: "Orc", hp: 38, ac: 13, bonus: 1 },
  { kind: "dragon", name: "Dragon", hp: 180, ac: 18, bonus: 0 }
];
const CONDS = [["poison", "☠️", "Empoisonné"], ["stun", "💫", "Étourdi"], ["prone", "⬇️", "À terre"], ["blind", "🕶️", "Aveuglé"], ["fear", "😱", "Effrayé"], ["burn", "🔥", "Enflammé"], ["bless", "✨", "Béni"], ["invis", "👻", "Invisible"], ["focus", "🎯", "Concentré"]];
const TAGS = ["Lieu", "PNJ", "Quête", "Objet", "Indice", "Autre"];
const BGS = [["plaine", "Plaine"], ["foret", "Forêt"], ["donjon", "Donjon"], ["nuit", "Nuit"]];
const PALETTE = ["#e8b84a", "#5ab0ff", "#ff7a7a", "#6adf8a", "#c88aff", "#ff9a4a", "#4adfd0", "#ff8ac8", "#b0d84a", "#9aa8ff"];
const MAX_PLAYERS = 10;
/* Effets posés par le MJ (stockés dans fx/<perso>/<id> : écriture réservée au MJ par les règles) */
const FXK = { adv: ["▲", "Avantage", "good"], dis: ["▼", "Désavantage", "bad"], bonus: ["＋", "Bonus", "good"], malus: ["－", "Malus", "bad"], note: ["✎", "Note", "note"] };
const FX_PRESETS = [["adv", "aux jets d'attaque"], ["dis", "aux jets d'attaque"], ["adv", "aux tests de Perception"], ["adv", "aux jets de sauvegarde"], ["dis", "aux jets de sauvegarde"], ["dis", "aux tests de caractéristique"], ["bonus", "+1d4 aux jets (Bénédiction)"], ["malus", "−1d4 aux jets (Fléau)"], ["bonus", "+1d6 (Inspiration bardique)"], ["note", "Résistance aux dégâts de feu"]];

/* ---------- État ---------- */
let sync, ready = false, code = null, myName = "", tab = "combat";
let S = {};
let sheetTab = "gen";
let menu = { screen: "main", pending: null }, lastTurn = null, lastActive = null;
let noteTag = "", sheetId = null, pendingRender = false;
H.state = S;
H.isGM = () => !!(S.meta && sync && S.meta.gm === sync.uid);
const uid = () => sync.uid;
const isGM = H.isGM;
const me = () => (S.members || {})[uid()] || {};
const chars = () => Object.entries(S.chars || {}).map(([id, c]) => ({ ...c, id }));
const canEdit = c => isGM() || c.owner === uid();
const d = n => 1 + Math.floor(Math.random() * n);
const fmtTime = ts => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const write = map => sync.update(map);
const sign = n => (n >= 0 ? "+" : "−") + Math.abs(n);

function toast(msg, kind = "") {
  const t = h("div", { class: "toast " + kind }, msg);
  $("#toasts").append(t);
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3100);
}
H.toast = toast;

function log(txt) { const id = sync.newId(); write({ ["log/" + id]: { ts: Date.now(), t: txt, n: myName, c: me().color || "#fff" } }); }

/* ---------- Rendu avec protection de la saisie ---------- */
function renderInto(el, build) {
  const a = document.activeElement;
  if (a && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { pendingRender = true; return; }
  el.replaceChildren(...[build()].flat(Infinity).filter(Boolean));
}
document.addEventListener("focusout", () => setTimeout(() => { if (pendingRender && code) { pendingRender = false; render(); } }, 60));

/* ---------- Accueil : deux tables fixes ---------- */
const TABLES = [{ code: "REVE", name: "La compagnie du rêve" }, { code: "TABLE2", name: "Le trio infernal" }];
const store = {
  get(k, d = null) { try { const v = localStorage.getItem("hacko." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hacko." + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("hacko." + k); } catch (e) {} }
};

async function ensureSync() { if (ready) return; await sync.init(); ready = true; }

/* o = { code, name, gm } — gm: ouvre/reprend la table en tant que MJ (déjà identifié) */
async function enter(o) {
  const err = $("#land-err"); err.textContent = "";
  const fail = m => { try { sync.leave(); } catch (e) {} code = null; throw new Error(m); };
  try {
    await ensureSync();
    code = o.code;
    S = {}; H.state = S;
    await sync.join(code, onState);
    const tbl = TABLES.find(t => t.code === code);
    if (!S.meta) {
      if (!o.gm) fail("Cette table n'est pas encore ouverte : le MJ doit d'abord l'ouvrir.");
      // première ouverture : le MJ devient propriétaire de la table
    } else if (o.gm && S.meta.gm !== uid()) fail("Cette table a déjà un MJ (un autre compte). Connecte-toi avec le compte MJ de cette table.");
    const members = S.members || {}, mine = members[uid()];
    if (!mine && Object.keys(members).length >= MAX_PLAYERS) fail("La table est pleine (10 personnes maximum).");
    myName = (o.name || "").trim() || (o.gm ? "MJ" : "Joueur");
    const color = (mine && mine.color) || PALETTE[Object.keys(members).length % PALETTE.length];
    const upd = { ["members/" + uid()]: { name: myName, color, online: true, ts: (mine && mine.ts) || Date.now() } };
    if (!S.meta) upd.meta = { name: tbl ? tbl.name : code, gm: uid(), created: Date.now() };
    await write(upd);
    store.set("session", { code, name: myName, gm: !!o.gm }); store.set("name", myName);
    history.replaceState(null, "", "#" + code);
    $("#landing").hidden = true; $("#app").hidden = false;
    showTab("combat");
    render();
    if (H.Perso) H.Perso.onEnter();
  } catch (e) { code = null; err.textContent = e.message || String(e); $("#landing").hidden = false; $("#app").hidden = true; }
}

function askGM(t) {
  const email = h("input", { type: "email", placeholder: "ton.adresse@mail.com", autocomplete: "username", required: true, value: store.get("gmemail", "") });
  const pw = h("input", { type: "password", placeholder: "mot de passe", autocomplete: "current-password", required: true, minlength: 6 });
  const msg = h("p", { class: "err" });
  const go = async mode => {
    if (sync.mode === "firebase" && (!email.value || !pw.value)) return;
    try {
      msg.textContent = "Connexion…"; await ensureSync();
      await sync.signInGM(email.value.trim(), pw.value, mode); if (email.value) store.set("gmemail", email.value.trim());
      closeModal(); await enter({ code: t.code, name: $("#who-name").value || "MJ", gm: true });
    } catch (e) { msg.textContent = e.message; }
  };
  const form = h("form", { onsubmit: e => { e.preventDefault(); go("login"); } },
    h("h3", {}, "Je suis le MJ — " + t.name),
    h("p", { class: "muted" }, sync.mode === "firebase" ? "Ton compte MJ te permet de retrouver ta table depuis n'importe quel appareil. Première fois : « Créer mon compte MJ »." : "Mode démo : aucun compte requis."),
    sync.mode === "firebase" ? [h("label", {}, "E-mail", email), h("label", {}, "Mot de passe", pw)] : null, msg,
    h("div", { class: "cmdrow" }, h("button", { class: "btn gold" }, "Me connecter"),
      sync.mode === "firebase" ? h("button", { type: "button", class: "btn", onclick: () => go("create") }, "Créer mon compte MJ") : null));
  openModal(form, "sm");
}

async function renderTables() {
  const box = $("#tables"); box.replaceChildren(h("p", { class: "muted" }, "Chargement des tables…"));
  let metas = {};
  try { await ensureSync(); for (const t of TABLES) metas[t.code] = await sync.peek(t.code); } catch (e) { $("#land-err").textContent = "Connexion impossible : " + e.message; }
  box.replaceChildren(...TABLES.map(t => {
    const m = metas[t.code];
    return h("div", { class: "ffwin tcard" }, h("div", { class: "wt" }, "TABLE"), h("h2", {}, (m && m.name) || t.name),
      h("p", { class: "muted" }, m ? "Table ouverte — prête à rejoindre" : "Pas encore ouverte par le MJ"),
      h("button", { class: "btn gold big-btn", disabled: !m, onclick: () => joinTable(t) }, "⚔ Rejoindre"),
      h("button", { class: "btn ghost sm", onclick: () => askGM(t) }, "Je suis le MJ"));
  }));
}
function joinTable(t) {
  const name = $("#who-name").value.trim();
  if (!name) { $("#land-err").textContent = "Écris d'abord ton prénom ou pseudo en haut."; $("#who-name").focus(); return; }
  enter({ code: t.code, name });
}

function initLanding() {
  $("#mode-note").textContent = sync.mode === "firebase" ? "Connecté en temps réel." : "Mode démo local : la synchro marche entre les onglets de ce navigateur. Pour jouer à distance, configure Firebase (voir README).";
  $("#mode-note").classList.toggle("warn", sync.mode !== "firebase");
  $("#who-name").value = store.get("name", "");
  $("#f-who").onsubmit = e => e.preventDefault();
  $("#who-name").oninput = () => store.set("name", $("#who-name").value.trim());
  const last = store.get("session");
  const hash = location.hash.replace("#", "").toUpperCase();
  if (last && TABLES.some(t => t.code === last.code) && !(hash && hash !== last.code)) {
    $("#land-err").textContent = "Reconnexion à ta table…";
    enter(last).then(() => { if ($("#app").hidden) renderTables(); });
  } else renderTables();
}

function leave() {
  if (code && sync) { write({ ["members/" + uid() + "/online"]: false }); sync.leave(); }
  store.del("session");
  code = null; S = {}; H.state = S; sheetId = null; closeModal(); H.Battle.stop(); if (H.Board) H.Board.reset();
  $("#app").hidden = true; $("#landing").hidden = false; $("#land-err").textContent = "";
  history.replaceState(null, "", location.pathname); renderTables();
}

/* ---------- Réception de l'état ---------- */
function onState(s) {
  const prevNotes = Object.keys(S.notes || {}).length, had = !!S.meta, prevFx = S.fx || {};
  S = s || {}; H.state = S;
  if (!code) return;
  if (H.Board) H.Board.onState();
  if (H.Dice) H.Dice.onState();
  if (had) for (const [cid, list] of Object.entries(S.fx || {})) {
    const c = (S.chars || {})[cid];
    if (c && c.owner === uid() && !c.enemy && !isGM()) for (const [fid, e] of Object.entries(list)) if (!(prevFx[cid] || {})[fid]) toast(`⚑ MJ → ${c.name} : ${fxLabel(e)}`, FXK[e.k] && FXK[e.k][2] === "bad" ? "err" : "good");
  }
  if (tab !== "notes") {
    const n = Object.keys(S.notes || {}).length;
    if (n > prevNotes && prevNotes) toast("📜 Nouvelle note de la table");
  }
  // le combat vient de commencer ?
  const act = !!(S.combat && S.combat.active);
  if (lastActive === false && act) { const st = $("#stage"); st.classList.remove("flash"); void st.offsetWidth; st.classList.add("flash"); }
  lastActive = act;
  render();
}

/* ---------- Navigation ---------- */
function showTab(t) {
  tab = t;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  document.querySelectorAll(".tab").forEach(s => s.hidden = s.id !== "tab-" + t);
  if (t === "combat") H.Battle.start(); else H.Battle.stop();
  if (t === "lex") H.Lex.open();
  if (t === "notes") { try { localStorage.setItem("hacko.seen." + code, Object.keys(S.notes || {}).length); } catch (e) {} }
  render();
}

function render() {
  if (!code || !S.meta) return;
  renderHeader();
  if (tab === "combat") renderCombat();
  if (tab === "chars") renderChars();
  if (tab === "notes") renderNotes();
  if (tab === "log") renderLog();
  if (tab === "board") H.Board.render();
  if (sheetId) renderSheet();
  const seen = +(localStorage.getItem("hacko.seen." + code) || 0), n = Object.keys(S.notes || {}).length;
  $("#nb-notes").textContent = tab !== "notes" && n > seen ? n - seen : "";
}

function renderHeader() {
  const rn = $("#room-name"); rn.textContent = S.meta.name + (isGM() ? " ✎" : ""); rn.style.cursor = isGM() ? "pointer" : "default";
  rn.onclick = isGM() ? () => { const n = prompt("Nom de la table :", S.meta.name); if (n && n.trim()) write({ "meta/name": n.trim().slice(0, 40) }); } : null;
  $("#room-code").textContent = "🔗 Inviter";
  $("#role").textContent = isGM() ? "Maître du jeu" : "Joueur"; $("#role").className = "badge " + (isGM() ? "gm" : "");
  const ms = Object.entries(S.members || {});
  renderInto($("#members"), () => [ms.map(([id, m]) => h("span", { class: "mem" + (m.online === false ? " off" : ""), title: m.name + (S.meta.gm === id ? " (MJ)" : "") }, h("i", { style: "background:" + m.color }), S.meta.gm === id ? "👑 " : "", m.name)), h("span", { class: "count" }, `${ms.length}/${MAX_PLAYERS}`)]);
}

/* ---------- Effets du MJ ---------- */
function fxOf(id) {
  const r = combat().active ? (combat().round || 1) : 0;
  return Object.entries((S.fx || {})[id] || {}).map(([k, v]) => ({ ...v, id: k })).filter(e => !(e.u && r > e.u)).sort((a, b) => a.ts - b.ts);
}
H.fxOf = fxOf;
const fxLabel = e => `${(FXK[e.k] || FXK.note)[1]} ${e.t || ""}`.trim();
function fxChips(id, del) {
  return fxOf(id).map(e => h("span", { class: "fx " + (FXK[e.k] || FXK.note)[2], title: fxLabel(e) }, (FXK[e.k] || FXK.note)[0] + " " + fxLabel(e), e.u ? h("small", {}, ` (jusqu'au round ${e.u})`) : null,
    del && isGM() ? h("button", { class: "x2", title: "Retirer", onclick: ev => { ev.stopPropagation(); write({ [`fx/${id}/${e.id}`]: null }); log(`⚑ ${(S.chars[id] || {}).name} : « ${fxLabel(e)} » retiré`); } }, "✕") : null));
}
function openFx(id) {
  const c = S.chars[id]; if (!c || !isGM()) return;
  let kind = "adv";
  const txt = h("input", { maxlength: 120, placeholder: "ex. aux tests de Perception", autofocus: true });
  const inCombat = !!combat().active;
  const dur = h("select", { disabled: !inCombat }, h("option", { value: "" }, "Jusqu'à retrait"), [1, 2, 3, 5, 10].map(n => h("option", { value: n }, `${n} round${n > 1 ? "s" : ""}`)));
  const seg = h("div", { class: "seg wrap" }, Object.entries(FXK).map(([k, [ic, l]]) => h("button", { type: "button", "data-k": k, class: k === kind ? "on" : "", onclick: () => { kind = k; seg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); } }, ic + " " + l)));
  const setKind = k => { kind = k; seg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); };
  const form = h("form", { onsubmit: ev => {
    ev.preventDefault(); const t = txt.value.trim(); if (!t && kind !== "adv" && kind !== "dis") return;
    const u = dur.value ? (combat().round || 1) + (+dur.value) - 1 : null;
    write({ [`fx/${id}/${sync.newId()}`]: { k: kind, t, u, ts: Date.now() } });
    log(`⚑ MJ → ${c.name} : ${fxLabel({ k: kind, t })}${u ? ` (jusqu'au round ${u})` : ""}`);
    closeModal();
  } }, h("h3", {}, "⚑ Effet sur " + c.name), h("p", { class: "muted" }, "Visible sur sa fiche et dans le combat. Le joueur est prévenu."), seg,
  h("label", {}, "Précision", txt),
  h("div", { class: "chips" }, FX_PRESETS.map(([k, t]) => h("button", { type: "button", class: "chip", onclick: () => { setKind(k); txt.value = t; } }, FXK[k][0] + " " + t))),
  h("label", {}, "Durée", dur), h("button", { class: "btn gold" }, "Appliquer"));
  openModal(form, "sm"); setTimeout(() => txt.focus(), 30);
}

/* ---------- Combat : logique ---------- */
function combatants() {
  return chars().filter(c => c.enemy || c.inFight !== false)
    .sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || (b.initBonus || 0) - (a.initBonus || 0) || (a.ts || 0) - (b.ts || 0));
}
const combat = () => S.combat || {};
function applyHp(id, delta) {
  const c = S.chars[id]; if (!c) return false;
  const nh = Math.max(0, Math.min(c.maxHp || 9999, (c.hp || 0) + delta));
  write({ [`chars/${id}/hp`]: nh });
  return nh <= 0 && (c.hp || 0) > 0;
}
function hpText(delta) { return delta < 0 ? `−${-delta} PV` : `+${delta} PV`; }

function addEnemy(p, extra = 0) {
  const same = chars().filter(c => c.enemy && (c.name === p.name || c.name.startsWith(p.name + " "))).length;
  const id = sync.newId(), act = combat().active;
  const c = { name: same ? `${p.name} ${same + 1}` : p.name, enemy: true, kind: p.kind, hp: p.hp, maxHp: p.hp, ac: p.ac, initBonus: p.bonus, owner: uid(), ts: Date.now() + extra, cond: null };
  if (act) c.init = d(20) + p.bonus;
  if (p.acts && p.acts.length) { c.acts = {}; p.acts.forEach((a, i) => c.acts[sync.newId() + i] = { n: a.n, d: a.d || "" }); }
  write({ ["chars/" + id]: c });
  log(`👹 ${c.name} apparaît !`);
}
function rollInit(onlyMissing) {
  const out = [];
  for (const c of combatants()) {
    if (onlyMissing && !c.enemy && c.init != null) continue;
    const v = d(20) + (c.initBonus || 0);
    write({ [`chars/${c.id}/init`]: v }); out.push(`${c.name} ${v}`);
  }
  if (out.length) log("🎲 Initiative : " + out.join(" · "));
}
function startCombat() {
  const list = combatants();
  if (!list.length) return toast("Ajoute au moins un combattant.", "err");
  const upd = {}, withInit = list.map(c => { const needs = c.enemy || c.init == null; const v = needs ? d(20) + (c.initBonus || 0) : c.init; if (needs) upd[`chars/${c.id}/init`] = v; return { ...c, init: v }; });
  withInit.sort((a, b) => b.init - a.init || (b.initBonus || 0) - (a.initBonus || 0) || (a.ts || 0) - (b.ts || 0));
  upd["combat/active"] = true; upd["combat/round"] = 1; upd["combat/turn"] = withInit[0].id;
  write(upd);
  log("⚔ Le combat commence ! Ordre : " + withInit.map(c => `${c.name} (${c.init})`).join(" › "));
}
function nextTurn() {
  const order = combatants(), cur = combat().turn;
  if (!order.length) return;
  let i = order.findIndex(c => c.id === cur), round = combat().round || 1;
  for (let n = 0; n < order.length; n++) {
    i++; if (i >= order.length) { i = 0; round++; }
    const c = order[i]; if (!(c.enemy && c.hp <= 0)) break;
  }
  const next = order[i];
  write({ "combat/turn": next.id, "combat/round": round });
  log(`⏭ Au tour de ${next.name}` + (round !== (combat().round || 1) ? ` — Round ${round}` : ""));
}
function endCombat() {
  if (!confirm("Terminer le combat ? Les ennemis seront retirés.")) return;
  const upd = { "combat/active": false, "combat/turn": null, "combat/round": null };
  chars().filter(c => c.enemy).forEach(c => { upd["chars/" + c.id] = null; upd["fx/" + c.id] = null; });
  write(upd); log("🏁 Fin du combat.");
}

/* ---------- Combat : rendu ---------- */
function renderCombat() {
  const cb = combat(), order = combatants(), active = !!cb.active, turnId = cb.turn;
  if (turnId !== lastTurn) { lastTurn = turnId; menu = { screen: "main", pending: null }; H.Battle.setTargetMode(false); }

  renderInto($("#order"), () => {
    if (!order.length) return h("span", { class: "muted" }, "Aucun combattant — crée un personnage dans l'onglet Personnages.");
    return [h("span", { class: "round" }, active ? `Round ${cb.round || 1}` : "Hors combat"),
      order.map(c => h("button", { class: "ochip" + (c.id === turnId && active ? " now" : "") + (c.hp <= 0 ? " ko" : "") + (c.enemy ? " foe" : ""), onclick: () => openQuick(c.id) },
        h("b", {}, c.init ?? "–"), c.name))];
  });

  renderInto($("#gmbar"), () => {
    if (!isGM()) return null;
    const bgSel = h("select", { onchange: e => write({ "combat/bg": e.target.value }) }, BGS.map(([v, l]) => h("option", { value: v, selected: (cb.bg || "plaine") === v }, "Décor : " + l)));
    const add = h("select", { onchange: e => { const p = PRESETS.find(x => x.kind === e.target.value); if (p) addEnemy(p); e.target.value = ""; } },
      h("option", { value: "" }, "＋ Ennemi…"), PRESETS.map(p => h("option", { value: p.kind }, `${p.name} (${p.hp} PV)`)));
    return active
      ? [h("button", { class: "btn gold", onclick: nextTurn }, "⏭ Tour suivant"), h("button", { class: "btn", onclick: () => rollInit(false) }, "🎲 Relancer l'initiative"), add, bgSel, h("button", { class: "btn danger", onclick: endCombat }, "■ Terminer")]
      : [h("button", { class: "btn gold", onclick: startCombat }, "▶ Lancer le combat"), add, bgSel];
  });

  renderMenu(order, active, turnId);
  renderHud(order, turnId, active);
}

function stateLabel(c) { const p = c.maxHp ? c.hp / c.maxHp : 0; return c.hp <= 0 ? "KO" : p > 0.75 ? "Indemne" : p > 0.4 ? "Blessé" : p > 0.15 ? "Mal en point" : "Critique"; }

function renderHud(order, turnId, active) {
  const foes = order.filter(c => c.enemy), party = order.filter(c => !c.enemy);
  // les PJ hors combat restent listés
  const away = chars().filter(c => !c.enemy && c.inFight === false);
  renderInto($("#hud"), () => [
    h("div", { class: "ffwin hudwin foes" }, h("div", { class: "wt" }, "ENNEMIS"),
      foes.length ? foes.map(c => h("div", { class: "hrow" + (c.hp <= 0 ? " ko" : "") + (c.id === turnId && active ? " now" : ""), onclick: () => openQuick(c.id) },
        h("span", { class: "nm" }, c.id === turnId && active ? "▶ " : "", c.name),
        isGM() ? h("span", { class: "hp" }, `${c.hp}/${c.maxHp}`) : h("span", { class: "hp" }, stateLabel(c)))) : h("div", { class: "muted" }, "—")),
    h("div", { class: "ffwin hudwin party" }, h("div", { class: "wt" }, "GROUPE"),
      party.concat(away).map(c => h("div", { class: "hrow" + (c.hp <= 0 ? " ko" : "") + (c.id === turnId && active ? " now" : "") + (c.inFight === false ? " away" : ""), onclick: () => openQuick(c.id) },
        h("span", { class: "nm" }, c.id === turnId && active ? "▶ " : "", c.name),
        h("span", { class: "bar" }, h("i", { style: `width:${c.maxHp ? Math.max(0, Math.min(100, c.hp / c.maxHp * 100)) : 0}%`, class: c.hp / c.maxHp < .25 ? "low" : c.hp / c.maxHp < .5 ? "mid" : "" })),
        h("span", { class: "hp" }, `${c.hp}/${c.maxHp}`),
        c.maxMp ? h("span", { class: "mp" }, `PM ${c.mp ?? 0}`) : null,
        fxOf(c.id).length ? h("span", { class: "fxdots" }, fxOf(c.id).map(e => h("i", { class: (FXK[e.k] || FXK.note)[2], title: fxLabel(e) }, (FXK[e.k] || FXK.note)[0]))) : null)))
  ]);
}

function renderMenu(order, active, turnId) {
  const el = $("#menu");
  const cur = active && S.chars && S.chars[turnId] ? { ...S.chars[turnId], id: turnId } : null;
  if (!cur || !canEdit(cur)) { el.replaceChildren(); H.Battle.setTargetMode(false); return; }
  const acts = Object.entries(cur.acts || {}), inv = Object.entries(cur.inv || {}).filter(([, i]) => i.q > 0);
  const back = h("button", { class: "mbtn dim", onclick: () => setMenu("main") }, "↩ Retour");
  let body;
  if (menu.screen === "main") body = [
    h("button", { class: "mbtn", onclick: () => setMenu("target", { type: "attack", actor: turnId }) }, "⚔ Attaquer"),
    acts.length ? h("button", { class: "mbtn", onclick: () => setMenu("acts") }, "✨ Actions") : null,
    inv.length ? h("button", { class: "mbtn", onclick: () => setMenu("items") }, "🎒 Objets") : null,
    h("button", { class: "mbtn end", onclick: nextTurn }, "⏭ Fin de tour")];
  else if (menu.screen === "acts") body = [back, acts.map(([id, a]) => h("button", { class: "mbtn", title: a.d || "", onclick: () => setMenu("target", { type: "act", actor: turnId, name: a.n, desc: a.d }) }, a.n, a.d ? h("small", {}, a.d) : null))];
  else if (menu.screen === "items") body = [back, inv.map(([id, i]) => h("button", { class: "mbtn", onclick: () => setMenu("target", { type: "item", actor: turnId, name: i.n, itemId: id }) }, `${i.n} ×${i.q}`))];
  else body = [h("button", { class: "mbtn dim", onclick: () => setMenu("main") }, "✕ Annuler"), h("span", { class: "hint" }, "Clique une cible sur le terrain ou ici :"),
    order.map(c => h("button", { class: "mbtn tgt" + (c.enemy ? " foe" : ""), onclick: () => onTarget(c.id) }, c.name, c.id === turnId ? " (soi)" : "")),
    h("button", { class: "mbtn dim", onclick: () => { logPending(menu.pending, null); setMenu("main"); } }, "Sans cible")];
  H.Battle.setTargetMode(menu.screen === "target");
  el.replaceChildren(h("div", { class: "ffwin cmd" }, h("div", { class: "wt" }, `TOUR DE ${cur.name.toUpperCase()}`), fxOf(turnId).length ? h("div", { class: "fxrow" }, fxChips(turnId)) : null, h("div", { class: "cmdrow" }, body)));
}
function setMenu(screen, pending = null) { menu = { screen, pending }; renderMenu(combatants(), true, combat().turn); }

function logPending(p, targetId, amount, mode) {
  const a = (S.chars[p.actor] || {}).name || "?", t = targetId && S.chars[targetId] ? S.chars[targetId].name : null;
  let txt = p.type === "attack" ? `⚔ ${a} attaque${t ? " " + t : ""}` : p.type === "item" ? `🎒 ${a} utilise ${p.name}${t ? " sur " + t : ""}` : `✨ ${a} utilise ${p.name}${t ? " sur " + t : ""}`;
  if (amount > 0) txt += ` : ${hpText(mode === "heal" ? amount : -amount)}`; else if (p.type === "attack" && t) txt += " : raté";
  log(txt);
  if (p.type === "item" && p.itemId) { const c = S.chars[p.actor]; const it = c && c.inv && c.inv[p.itemId]; if (it) write({ [`chars/${p.actor}/inv/${p.itemId}/q`]: Math.max(0, it.q - 1) }); }
}

H.Battle.init($("#cv"), { onPick: id => onTarget(id) });
function onTarget(id) {
  if (menu.screen === "target" && menu.pending) return openAmount(id, menu.pending);
  openQuick(id);
}

/* ---------- Fenêtres modales ---------- */
function openModal(content, cls = "") {
  const m = $("#modal"); m.hidden = false;
  m.replaceChildren(h("div", { class: "backdrop", onclick: closeModal }), h("div", { class: "ffwin box " + cls }, h("button", { class: "x", onclick: closeModal, "aria-label": "Fermer" }, "✕"), content));
}
function closeModal() { $("#modal").hidden = true; $("#modal").replaceChildren(); sheetId = null; }

function openAmount(targetId, p) {
  const t = S.chars[targetId]; if (!t) return;
  let mode = p.type === "attack" ? "dmg" : (p.desc && /soin|heal|restaur/i.test(p.name + p.desc) ? "heal" : "dmg");
  const inp = h("input", { type: "number", min: "0", value: "0", class: "big", inputmode: "numeric" });
  const modes = h("div", { class: "seg" }, [["dmg", "💥 Dégâts"], ["heal", "💚 Soins"]].map(([v, l]) => h("button", { type: "button", class: mode === v ? "on" : "", onclick: e => { mode = v; modes.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === e.currentTarget)); } }, l)));
  const form = h("form", { onsubmit: e => {
    e.preventDefault(); const n = Math.max(0, parseInt(inp.value) || 0);
    let ko = false; if (n > 0) ko = applyHp(targetId, mode === "heal" ? n : -n);
    logPending(p, targetId, n, mode);
    if (ko) log(`☠ ${t.name} tombe à 0 PV`);
    closeModal(); menu = { screen: "main", pending: null }; renderMenu(combatants(), true, combat().turn);
  } }, h("h3", {}, `${(S.chars[p.actor] || {}).name || ""} → ${t.name}`), h("p", { class: "muted" }, p.name || "Attaque", p.desc ? " — " + p.desc : ""), modes,
  h("label", {}, "Montant (0 = sans effet / raté)", inp), h("button", { class: "btn gold" }, "Valider"));
  openModal(form, "sm"); setTimeout(() => { inp.focus(); inp.select(); }, 30);
}

function openQuick(id) {
  const c = S.chars[id]; if (!c) return;
  const body = () => {
    const cc = S.chars[id]; if (!cc) { closeModal(); return null; }
    const amt = $("#qamt") ? +$("#qamt").value || 1 : 1;
    const hpTxt = cc.enemy && !isGM() ? stateLabel({ ...cc }) : `${cc.hp} / ${cc.maxHp} PV`;
    return [h("h3", {}, cc.name), h("p", { class: "muted" }, cc.enemy ? "Ennemi" : `${cc.cls || ""} niv. ${cc.lvl || 1}`, " · ", hpTxt),
      h("label", {}, "Montant", h("input", { id: "qamt", type: "number", min: "1", value: amt, class: "big", inputmode: "numeric" })),
      h("div", { class: "cmdrow" }, h("button", { class: "btn danger", onclick: () => quick(id, -1) }, "💥 Dégâts"), h("button", { class: "btn good", onclick: () => quick(id, 1) }, "💚 Soins"),
        h("button", { class: "btn", onclick: () => { closeModal(); openSheet(id); } }, "📋 Fiche"),
        isGM() ? h("button", { class: "btn", onclick: () => { closeModal(); openFx(id); } }, "⚑ Effet") : null),
      fxOf(id).length ? h("div", { class: "fxrow" }, fxChips(id, true)) : null];
  };
  const box = h("div", {}, body());
  openModal(box, "sm");
  setTimeout(() => { const i = $("#qamt"); i && (i.focus(), i.select()); }, 30);
}
function quick(id, dir) {
  const n = Math.max(1, parseInt($("#qamt").value) || 1), c = S.chars[id];
  const ko = applyHp(id, dir * n);
  log(`${dir < 0 ? "💥" : "💚"} ${c.name} : ${hpText(dir * n)}${ko ? " — ☠ tombe à 0 PV" : ""}`);
  closeModal();
}

/* ---------- Personnages ---------- */
function newChar() { if (H.Perso) H.Perso.openWizard({ gm: isGM() }); }
function renderChars() {
  renderInto($("#char-bar"), () => [h("button", { class: "btn gold", onclick: () => newChar() }, "＋ Nouveau personnage"),
    isGM() ? h("button", { class: "btn", onclick: () => H.Perso.openPremades() }, "📥 Personnages enregistrés") : h("button", { class: "btn", onclick: () => H.Perso.openWho() }, "🙋 Retrouver mon personnage"),
    isGM() ? h("select", { onchange: e => { const p = PRESETS.find(x => x.kind === e.target.value); if (p) addEnemy(p); e.target.value = ""; } }, h("option", { value: "" }, "＋ Ennemi / monstre…"), PRESETS.map(p => h("option", { value: p.kind }, p.name))) : null]);
  renderInto($("#char-grid"), () => {
    const list = chars().filter(c => !c.enemy || isGM()).sort((a, b) => (a.enemy ? 1 : 0) - (b.enemy ? 1 : 0) || (a.ts || 0) - (b.ts || 0));
    if (!list.length) return h("p", { class: "muted" }, "Aucun personnage pour l'instant. Crée le tien !");
    return list.map(c => {
      const pct = c.maxHp ? Math.max(0, Math.min(100, c.hp / c.maxHp * 100)) : 0;
      return h("div", { class: "ccard ffwin" + (c.hp <= 0 ? " ko" : "") + (c.enemy ? " foe" : ""), onclick: () => openSheet(c.id), style: `--c:${c.color || "#888"}` },
        h("div", { class: "ctop" }, h("b", {}, c.name), h("span", { class: "muted" }, c.enemy ? "Ennemi" : `${c.race ? c.race + " " : ""}${c.cls || ""} ${c.lvl || 1}`)),
        h("div", { class: "bar" }, h("i", { style: `width:${pct}%`, class: pct < 25 ? "low" : pct < 50 ? "mid" : "" })),
        h("div", { class: "cstat" }, h("span", {}, `PV ${c.hp}/${c.maxHp}`), h("span", {}, `CA ${c.ac ?? "–"}`)),
        fxOf(c.id).length ? h("div", { class: "fxrow" }, fxChips(c.id)) : null,
        h("div", { class: "cconds" }, CONDS.filter(([k]) => (c.cond || {})[k]).map(([, e, l]) => h("span", { title: l }, e))),
        h("div", { class: "owner muted" }, c.enemy ? "" : "👤 " + (c.ownerName || "?")),
        H.Perso ? H.Perso.cardActions(c) : null);
    });
  });
}

function openSheet(id) { sheetId = id; sheetTab = "gen"; openModal(h("div", { id: "sheet" }), "wide"); sheetId = id; renderSheet(); }

function renderSheet() {
  const c = S.chars && S.chars[sheetId];
  const root = $("#sheet"); if (!root) return;
  if (!c) { closeModal(); return; }
  const ed = canEdit(c), id = sheetId;
  const set = (f, v) => write({ [`chars/${id}/${f}`]: v });
  const num = (f, label, o = {}) => h("label", { class: "fld" }, label, h("input", { type: "number", value: c[f] ?? "", disabled: !ed, inputmode: "numeric", ...o, onchange: e => set(f, e.target.value === "" ? null : parseInt(e.target.value)) }));
  const txt = (f, label, o = {}) => h("label", { class: "fld", style: o.style }, label, h("input", { type: "text", value: c[f] || "", maxlength: o.max || 40, disabled: !ed, onchange: e => set(f, e.target.value.trim() || c[f]) }));
  const hpBtn = n => h("button", { class: "btn sm " + (n < 0 ? "danger" : "good"), onclick: () => { const ko = applyHp(id, n); log(`${n < 0 ? "💥" : "💚"} ${c.name} : ${hpText(n)}${ko ? " — ☠ tombe à 0 PV" : ""}`); } }, sign(n));
  const inv = Object.entries(c.inv || {}), acts = Object.entries(c.acts || {});

  renderInto(root, () => {
    const nItem = h("input", { placeholder: "Nouvel objet", maxlength: 40, disabled: !ed }), nQty = h("input", { type: "number", value: 1, min: 1, style: "width:4.5em", disabled: !ed });
    const nAct = h("input", { placeholder: "Nouvelle action (ex. Boule de feu)", maxlength: 40, disabled: !ed }), nDesc = h("input", { placeholder: "Description / dégâts", maxlength: 120, disabled: !ed });
    const gen = [
      h("div", { class: "sheet-head", style: `--c:${c.color || "#888"}` },
        txt("name", "Nom", { max: 30 }),
        c.enemy ? h("label", { class: "fld" }, "Type", h("select", { disabled: !ed, onchange: e => set("kind", e.target.value) }, H.Sprites.kinds.filter(k => PRESETS.some(p => p.kind === k)).map(k => h("option", { value: k, selected: c.kind === k }, PRESETS.find(p => p.kind === k).name))))
          : h("label", { class: "fld" }, "Classe", h("select", { disabled: !ed, onchange: e => set("cls", e.target.value) }, CLASSES.map(k => h("option", { selected: c.cls === k }, k)))),
        num("lvl", "Niveau", { min: 1, max: 30 }),
        h("label", { class: "fld" }, "Couleur", h("input", { type: "color", value: c.color || "#e8b84a", disabled: !ed, onchange: e => set("color", e.target.value) }))),
      c.enemy ? null : h("div", { class: "two" }, txt("race", "Race"), txt("scls", "Sous-classe / voie")),
      H.Perso ? H.Perso.genActions({ c: { ...c, id }, id, ed, set }) : null,
      h("div", { class: "fxbox" }, h("b", {}, "⚑ Effets du MJ"), fxOf(id).length ? h("div", { class: "fxrow" }, fxChips(id, true)) : h("span", { class: "muted" }, "Aucun effet en cours"),
        isGM() ? h("button", { class: "btn sm", onclick: () => openFx(id) }, "＋ Ajouter un effet") : null),
      h("div", { class: "hpline" }, h("b", {}, "PV"), hpBtn(-5), hpBtn(-1), h("span", { class: "hpnum" }, `${c.hp} / `, ed ? h("input", { class: "inl-num", type: "number", value: c.maxHp, onchange: e => set("maxHp", Math.max(1, parseInt(e.target.value) || 1)) }) : c.maxHp), hpBtn(1), hpBtn(5),
        h("button", { class: "btn sm", onclick: () => set("hp", c.maxHp), disabled: !ed }, "Plein")),
      h("div", { class: "stats" }, num("ac", "CA"), num("initBonus", "Bonus init."),
        h("label", { class: "fld" }, "Initiative", h("span", { class: "row" }, h("input", { type: "number", value: c.init ?? "", disabled: !ed, onchange: e => set("init", e.target.value === "" ? null : parseInt(e.target.value)) }),
          h("button", { class: "btn sm", disabled: !ed, title: "Lancer d20 + bonus", onclick: () => { const r = d(20), t = r + (c.initBonus || 0); set("init", t); log(`🎲 Initiative de ${c.name} : ${r}${sign(c.initBonus || 0)} = ${t}`); } }, "🎲")))),
      h("h4", {}, "États"),
      h("div", { class: "conds" }, CONDS.map(([k, e, l]) => h("button", { class: "chip" + ((c.cond || {})[k] ? " on" : ""), disabled: !ed, onclick: () => { write({ [`chars/${id}/cond/${k}`]: (c.cond || {})[k] ? null : true }); } }, e + " " + l))),
      h("div", { class: "two" },
        h("div", {}, h("h4", {}, "🎒 Inventaire"),
          inv.map(([iid, it]) => h("div", { class: "li" }, h("span", { class: "grow" }, it.n), h("span", { class: "qty" },
            ed ? h("button", { class: "btn sm", onclick: () => write({ [`chars/${id}/inv/${iid}/q`]: Math.max(0, it.q - 1) }) }, "−") : null, "×" + it.q,
            ed ? h("button", { class: "btn sm", onclick: () => write({ [`chars/${id}/inv/${iid}/q`]: it.q + 1 }) }, "+") : null),
            ed ? h("button", { class: "btn sm ghost", onclick: () => write({ [`chars/${id}/inv/${iid}`]: null }) }, "✕") : null)),
          ed ? h("div", { class: "li add" }, nItem, nQty, h("button", { class: "btn sm", onclick: () => { if (nItem.value.trim()) write({ [`chars/${id}/inv/${sync.newId()}`]: { n: nItem.value.trim(), q: Math.max(1, +nQty.value || 1) } }); } }, "＋")) : null),
        h("div", {}, h("h4", {}, "✨ Actions possibles"),
          acts.map(([aid, a]) => h("div", { class: "li" }, h("span", { class: "grow" }, h("b", {}, a.n), a.d ? h("small", {}, " — " + a.d) : null),
            h("button", { class: "btn sm", title: "Annoncer au journal", onclick: () => log(`✨ ${c.name} : ${a.n}${a.d ? " (" + a.d + ")" : ""}`) }, "📣"),
            ed ? h("button", { class: "btn sm ghost", onclick: () => write({ [`chars/${id}/acts/${aid}`]: null }) }, "✕") : null)),
          ed ? h("div", { class: "li add col" }, nAct, nDesc, h("button", { class: "btn sm", onclick: () => { if (nAct.value.trim()) write({ [`chars/${id}/acts/${sync.newId()}`]: { n: nAct.value.trim(), d: nDesc.value.trim() } }); } }, "＋ Ajouter")) : null)),
      h("h4", {}, "📝 Notes du personnage"),
      h("textarea", { rows: 3, maxlength: 800, disabled: !ed, placeholder: "Historique, dons, équipement porté… (visible par la table)", onchange: e => set("notes", e.target.value) }, c.notes || ""),
      h("div", { class: "sheet-foot" },
        c.enemy ? null : h("span", { class: "muted" }, "Joué par " + (c.ownerName || "?")),
        isGM() && !c.enemy ? h("label", { class: "inl" }, h("input", { type: "checkbox", checked: c.inFight !== false, onchange: e => set("inFight", e.target.checked) }), " Dans le combat") : null,
        ed ? h("button", { class: "btn danger sm", onclick: () => { if (confirm(`Supprimer ${c.name} ?`)) { write(isGM() ? { ["chars/" + id]: null, ["fx/" + id]: null } : { ["chars/" + id]: null }); closeModal(); } } }, "Supprimer") : null)
    ];
    if (c.enemy || !H.Perso) return gen;
    return [H.Perso.tabbar(sheetTab, t => { sheetTab = t; renderSheet(); }), sheetTab === "gen" ? gen : H.Perso.tab(sheetTab, { c: { ...c, id }, id, ed, set })];
  });
}

/* ---------- Notes partagées ---------- */
function renderNotes() {
  const q = $("#note-search").value.trim().toLowerCase();
  renderInto($("#note-filters"), () => ["Tout", ...TAGS].map(t => h("button", { class: "chip" + ((t === "Tout" ? "" : t) === noteTag ? " on" : ""), onclick: () => { noteTag = t === "Tout" ? "" : t; renderNotes(); } }, t)));
  renderInto($("#note-feed"), () => {
    const list = Object.entries(S.notes || {}).map(([id, n]) => ({ ...n, id })).filter(n => (!noteTag || n.tag === noteTag) && (!q || (n.t + " " + n.an).toLowerCase().includes(q))).sort((a, b) => b.ts - a.ts);
    if (!list.length) return h("p", { class: "muted" }, "Aucune note. Écris la première !");
    return list.map(n => h("article", { class: "note-item", style: `--c:${n.c || "#888"}` },
      h("div", { class: "nh" }, h("b", {}, n.an), h("span", { class: "tag" }, n.tag || "Autre"), h("span", { class: "muted" }, fmtTime(n.ts)), (isGM() || n.a === uid()) ? h("button", { class: "btn sm ghost", title: "Supprimer", onclick: () => write({ ["notes/" + n.id]: null }) }, "✕") : null),
      h("p", {}, n.t)));
  });
  try { localStorage.setItem("hacko.seen." + code, Object.keys(S.notes || {}).length); } catch (e) {}
}

/* ---------- Journal & dés ---------- */
function renderLog() {
  renderInto($("#log-bar"), () => isGM() ? [h("button", { class: "btn sm", onclick: exportGame }, "⬇ Exporter la partie (JSON)"), h("button", { class: "btn sm danger", onclick: () => { if (confirm("Vider le journal ?")) write({ log: null }); } }, "Vider le journal")] : null);
  renderInto($("#log-feed"), () => {
    const list = Object.values(S.log || {}).sort((a, b) => b.ts - a.ts).slice(0, 120);
    if (!list.length) return h("p", { class: "muted" }, "Le journal se remplit tout seul : dégâts, tours, jets de dés…");
    return list.map(l => h("div", { class: "lg" }, h("span", { class: "muted" }, fmtTime(l.ts)), h("i", { style: `background:${l.c || "#888"}`, title: l.n }), h("span", {}, l.t)));
  });
}
function exportGame() {
  const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" })), download: `hacko-${code}.json` });
  document.body.append(a); a.click(); a.remove();
}
/* ---------- Initialisation ---------- */
function init() {
  sync = H.createSync();
  initLanding();
  $("#tabs").onclick = e => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); };
  $("#leave").onclick = leave;
  $("#help").onclick = () => openModal(h("div", {}, h("h3", {}, "❓ Comment ça marche ?"),
    h("p", {}, h("b", {}, "Les dés restent sur la table. "), "L'outil est le carnet de bord partagé : on lance ses vrais dés, et on note le résultat, les PV, les sorts utilisés."),
    h("ul", { class: "help" },
      h("li", {}, h("b", {}, "🧙 Personnages : "), "ta fiche (PV, sorts, objets, capacités). Quand tu lances un sort, clique sur « Lancer » : l'emplacement est dépensé tout seul."),
      h("li", {}, h("b", {}, "⚔ Combat : "), "l'ordre des tours, les PV de chacun, les effets posés par le MJ (avantage, malus…)."),
      h("li", {}, h("b", {}, "🎲 Journal : "), "pour noter un jet réel (« J'ai lancé mes dés »), ou lancer des dés virtuels en cas de besoin. Tout le monde voit tout."),
      h("li", {}, h("b", {}, "📌 Panneau : "), "des post-it à déplacer : indices, noms, croquis, photos."),
      h("li", {}, h("b", {}, "📜 Notes et 📚 Lexique : "), "les notes de la partie, et la recherche instantanée de monstres, objets, sorts.")),
    h("button", { class: "btn gold", onclick: closeModal }, "Compris !")), "sm");
  $("#room-code").onclick = () => {
    const url = location.origin + location.pathname;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast("Lien d'invitation copié 📋"), () => prompt("Lien d'invitation :", url));
  };
  $("#note-tag").append(...TAGS.map(t => h("option", {}, t)));
  $("#note-search").oninput = () => renderNotes();
  $("#note-form").onsubmit = e => {
    e.preventDefault(); const t = $("#note-text").value.trim(); if (!t) return;
    write({ ["notes/" + sync.newId()]: { a: uid(), an: myName, c: me().color || "#fff", t, tag: $("#note-tag").value, ts: Date.now() } });
    $("#note-text").value = "";
  };
  if (H.Dice) H.Dice.init();
  window.addEventListener("beforeunload", () => { if (code && sync.mode === "local") write({ ["members/" + uid() + "/online"]: false }); });
}
document.addEventListener("DOMContentLoaded", init);
