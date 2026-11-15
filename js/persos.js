"use strict";
/* Personnages : assistant de création (race / classe / niveau → capacités, emplacements de sorts, sorts proposés),
   onglets de fiche (caractéristiques, sorts, capacités, histoire), reprise d'un personnage par son joueur,
   personnages pré-enregistrés du MJ, sauvegarde sur l'appareil, export/import. */
(function () {
  const AB = [["for", "FOR", "Force"], ["dex", "DEX", "Dextérité"], ["con", "CON", "Constitution"], ["int", "INT", "Intelligence"], ["sag", "SAG", "Sagesse"], ["cha", "CHA", "Charisme"]];
  const SK = [["acrobaties", "Acrobaties", "dex"], ["arcanes", "Arcanes", "int"], ["athletisme", "Athlétisme", "for"], ["discretion", "Discrétion", "dex"], ["dressage", "Dressage", "sag"], ["escamotage", "Escamotage", "dex"], ["histoire", "Histoire", "int"], ["intimidation", "Intimidation", "cha"], ["intuition", "Intuition", "sag"], ["investigation", "Investigation", "int"], ["medecine", "Médecine", "sag"], ["nature", "Nature", "int"], ["perception", "Perception", "sag"], ["persuasion", "Persuasion", "cha"], ["religion", "Religion", "int"], ["representation", "Représentation", "cha"], ["survie", "Survie", "sag"], ["tromperie", "Tromperie", "cha"]];
  const mod = v => Math.floor(((+v || 10) - 10) / 2);
  const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);
  const pbOf = l => 2 + Math.floor(((+l || 1) - 1) / 4);
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const PREP = { cleric: 1, druid: 1, wizard: 1, paladin: 1 };
  let ready = null;
  const G = () => H.LEX.gen;
  const ensure = () => ready || (ready = Promise.all([H.Lex.ensure(), new Promise((res, rej) => { const s = document.createElement("script"); s.src = "data/premades.js"; s.onload = res; s.onerror = res; document.head.append(s); })]));
  const spells = () => H.LEX.spl;
  const findSpell = name => { const n = norm(name); return spells().find(s => norm(s.n) === n) || spells().find(s => norm(s.n).startsWith(n) || n.startsWith(norm(s.n))); };

  /* ---------- Calculs ---------- */
  function limits(ci, lvl, st) {
    const cl = G().cls[ci], L = ((G().lvl[ci] || {})[lvl]) || {};
    if (!cl || !cl.ab) return { cantrips: 0, kind: "none", lim: 0, maxLv: 0, slots: [], ab: null };
    const m = mod(st[cl.ab]);
    let kind = "known", lim = L.k || 0;
    if (ci === "paladin") { kind = "prep"; lim = Math.max(1, m + Math.floor(lvl / 2)); } else if (PREP[ci]) { kind = "prep"; lim = Math.max(1, m + lvl); }
    const slots = L.s || [];
    return { cantrips: L.c || 0, kind, lim, maxLv: slots.reduce((a, v, i) => v > 0 ? i + 1 : a, 0), slots, ab: cl.ab };
  }
  const slotsObj = (ci, lvl, old = {}) => { const o = {}; (((G().lvl[ci] || {})[lvl] || {}).s || []).forEach((m, i) => { if (m > 0) o[i + 1] = { m, u: Math.min((old[i + 1] || {}).u || 0, m) }; }); return o; };
  const hpAvg = (hd, conm) => Math.floor(hd / 2) + 1 + conm;
  const raceInfo = (ri, rsi) => { const r = G().rac[ri] || null, sr = rsi ? G().sub.find(x => x.i === rsi) : null; return { r, sr, ab: { ...(r ? r.ab : {}), ...(sr ? sr.ab : {}) }, tr: [...(r ? r.tr : []), ...(sr ? sr.tr : [])], label: sr ? sr.n : r ? r.n : "" }; };
  function grantFeats(ci, sci, ri, rsi, lvl, have = new Set()) {
    const out = {}, add = (n, d, s) => { if (have.has(norm(n))) return; have.add(norm(n)); out[sync.newId() + Object.keys(out).length] = { n, d: [].concat(d || []).join("\n"), s }; };
    for (const f of G().feat) if (f.c === ci && f.l <= lvl && (!f.sc || f.sc === sci)) add(f.n, f.d, f.sc ? "Sous-classe niv. " + f.l : "Classe niv. " + f.l);
    const ri2 = raceInfo(ri, rsi); ri2.tr.forEach(t => add(t.n, t.d, "Race"));
    return out;
  }
  const classOpts = () => Object.entries(G().cls).sort((a, b) => a[1].n.localeCompare(b[1].n, "fr"));
  const raceOpts = () => {
    const o = [];
    for (const [i, r] of Object.entries(G().rac)) { o.push({ v: "r:" + i, l: r.n }); }
    for (const s of G().sub) o.push({ v: "s:" + s.i, l: s.n });
    return o.sort((a, b) => a.l.localeCompare(b.l, "fr"));
  };

  /* ---------- Sélecteur de sorts ---------- */
  function spellPicker(o) {
    const pool = spells().filter(s => !o.ci || s.ci.includes(o.ci)).sort((a, b) => a.lv - b.lv || a.n.localeCompare(b.n, "fr"));
    let q = "", lv = "";
    const list = h("div", { class: "splist" }), head = h("div", { class: "sphead" });
    const count = lv0 => Object.values(o.sel).filter(x => lv0 ? x.lv === 0 : x.lv > 0).length;
    const draw = () => {
      const cc = count(true), sc = count(false);
      head.replaceChildren(
        h("span", { class: "cnt" + (o.cantrips && cc > o.cantrips ? " over" : "") }, `Sorts mineurs : ${cc}` + (o.cantrips ? ` / ${o.cantrips}` : "")),
        o.kind !== "none" && o.kind ? h("span", { class: "cnt" + (o.lim && sc > o.lim && o.kind === "known" ? " over" : "") }, o.kind === "prep" ? (o.ci === "wizard" ? `Grimoire : ${sc} (à préparer chaque jour : ${o.lim})` : `Préparés : ${sc} / ${o.lim}`) : `Sorts connus : ${sc} / ${o.lim}`) : h("span", { class: "cnt" }, `Sorts : ${sc}`));
      const t = norm(q);
      const rows = pool.filter(s => (lv === "" || s.lv === +lv) && (o.maxLv === undefined || s.lv <= o.maxLv) && (!t || norm(s.n + " " + s.a).includes(t)));
      const custom = Object.entries(o.sel).filter(([k]) => k.startsWith("x:"));
      list.replaceChildren(...[
        custom.map(([k, s]) => h("div", { class: "sprow on" }, h("span", { class: "nm" }, s.n, h("small", {}, ` · hors SRD · ${s.lv ? "niv. " + s.lv : "mineur"}`)), h("button", { type: "button", class: "btn sm ghost", onclick: () => { delete o.sel[k]; draw(); } }, "✕"))),
        rows.map(s => {
          const on = !!o.sel[s.i], det = h("div", { class: "spdesc", hidden: true }, s.f.map(([a, b]) => h("div", {}, h("b", {}, a + " : "), b)), s.d.map(p => h("p", {}, p)));
          return h("div", { class: "sprow" + (on ? " on" : "") },
            h("label", { class: "nm" }, h("input", { type: "checkbox", checked: on, onchange: e => { if (e.target.checked) o.sel[s.i] = { n: s.n, lv: s.lv, i: s.i }; else delete o.sel[s.i]; draw(); } }), " ", s.n, h("small", {}, ` · ${s.lv ? "niv. " + s.lv : "mineur"} · ${s.sc}`)),
            h("button", { type: "button", class: "btn sm ghost", title: "Voir le sort", onclick: () => { det.hidden = !det.hidden; } }, "ℹ"), det);
        })].flat(Infinity));
    };
    const lvls = h("select", { onchange: e => { lv = e.target.value; draw(); } }, h("option", { value: "" }, "Tous niveaux"), Array.from({ length: (o.maxLv === undefined ? 9 : o.maxLv) + 1 }, (_, i) => h("option", { value: i }, i ? "Niveau " + i : "Sorts mineurs")));
    const cn = h("input", { placeholder: "Sort hors SRD (ex. Fouet épineux)" }), cl = h("select", {}, Array.from({ length: 10 }, (_, i) => h("option", { value: i }, i ? "Niv. " + i : "Mineur")));
    const el = h("div", { class: "picker" }, head,
      h("div", { class: "row" }, h("input", { type: "search", placeholder: "Chercher un sort…", oninput: e => { q = e.target.value; draw(); } }), lvls), list,
      h("div", { class: "row" }, cn, cl, h("button", { type: "button", class: "btn sm", onclick: () => { const n = cn.value.trim(); if (n) { o.sel["x:" + n] = { n, lv: +cl.value, x: true }; cn.value = ""; draw(); } } }, "＋")));
    draw(); return el;
  }

  /* ---------- Assistant de création ---------- */
  async function openWizard(opt = {}) {
    await ensure();
    const w = { name: "", race: "r:human", ci: "", sci: "", sclsText: "", lvl: 1, st: { for: 15, dex: 14, con: 13, int: 12, sag: 10, cha: 8 }, applyRace: true, skp: {}, sel: {}, noFeat: {}, free: !!opt.gm, forPlayer: "", hp: null, ac: null, spd: null };
    w.ci = classOpts()[0][0];
    const box = h("div", { class: "wiz" }); let step = 0;
    const saved = store.get("saved", []);
    const steps = () => ["Identité", "Caractéristiques", ...(limits(w.ci, w.lvl, finalSt()).maxLv > 0 || limits(w.ci, w.lvl, finalSt()).cantrips ? ["Sorts"] : []), "Récapitulatif"];
    const raceSel = () => { const [t, i] = w.race.split(":"); return t === "s" ? { ri: G().sub.find(x => x.i === i).r, rsi: i } : { ri: i, rsi: "" }; };
    const finalSt = () => { const { ri, rsi } = raceSel(), b = w.applyRace ? raceInfo(ri, rsi).ab : {}; const o = {}; AB.forEach(([k]) => o[k] = (+w.st[k] || 10) + (b[k] || 0)); return o; };
    const derive = () => {
      const { ri, rsi } = raceSel(), st = finalSt(), cl = G().cls[w.ci], con = mod(st.con), lvl = w.lvl;
      let hp = cl.hd + con + (lvl - 1) * hpAvg(cl.hd, con); if (rsi === "hill-dwarf") hp += lvl;
      const spdFt = (G().rac[ri] || {}).spd || 30;
      return { hp: Math.max(1, hp), ac: 10 + mod(st.dex), spd: `${(Math.round(spdFt * 0.3 * 2) / 2).toString().replace(".", ",")} m` };
    };
    const field = (label, el) => h("label", {}, label, el);
    const draw = () => {
      const names = steps(), cur = names[step], lim = limits(w.ci, w.lvl, finalSt());
      const nav = h("div", { class: "cmdrow wnav" }, step > 0 ? h("button", { type: "button", class: "btn", onclick: () => { step--; draw(); } }, "← Retour") : null,
        step < names.length - 1 ? h("button", { type: "button", class: "btn gold", onclick: () => { if (step === 0 && !w.name.trim()) { toast("Donne un nom à ton personnage", "err"); return; } step++; draw(); } }, "Suivant →") : h("button", { type: "button", class: "btn gold", onclick: create }, "✔ Créer le personnage"));
      let body;
      if (cur === "Identité") {
        const cl = G().cls[w.ci];
        body = [
          saved.length ? h("div", { class: "fxbox" }, h("b", {}, "💾 Reprendre un personnage enregistré :"), saved.map((s, i) => h("button", { type: "button", class: "chip", onclick: () => { importChar(s, opt); closeModal(); } }, s.name))) : null,
          field("Nom du personnage", h("input", { value: w.name, maxlength: 30, placeholder: "Aldren", oninput: e => w.name = e.target.value })),
          h("div", { class: "two" },
            field("Race", h("select", { onchange: e => { w.race = e.target.value; } }, raceOpts().map(o => h("option", { value: o.v, selected: o.v === w.race }, o.l)))),
            field("Classe", h("select", { onchange: e => { w.ci = e.target.value; w.sci = ""; w.sel = {}; w._pick = null; w.skp = {}; draw(); } }, classOpts().map(([i, c]) => h("option", { value: i, selected: i === w.ci }, c.n))))),
          h("div", { class: "two" },
            field("Sous-classe / voie", h("select", { onchange: e => { w.sci = e.target.value; draw(); } }, h("option", { value: "" }, "— aucune pour l'instant —"), cl.sc.map(s => h("option", { value: s.i, selected: s.i === w.sci }, s.n)), h("option", { value: "_x", selected: w.sci === "_x" }, "Autre (hors SRD)…"))),
            field("Niveau", h("input", { type: "number", min: 1, max: 20, value: w.lvl, onchange: e => { w.lvl = Math.max(1, Math.min(20, +e.target.value || 1)); w.sel = {}; w._pick = null; draw(); } }))),
          w.sci === "_x" ? field("Nom de la sous-classe", h("input", { value: w.sclsText, placeholder: "ex. Cercle de la lune", oninput: e => w.sclsText = e.target.value })) : null,
          opt.gm ? h("div", { class: "fxbox" }, h("label", { class: "inl" }, h("input", { type: "checkbox", checked: w.free, onchange: e => { w.free = e.target.checked; } }), " Un joueur pourra le réclamer en arrivant"),
            h("input", { placeholder: "Joueur prévu (facultatif)", value: w.forPlayer, oninput: e => w.forPlayer = e.target.value })) : null,
          h("p", { class: "muted small" }, "Race et classe viennent du SRD 5.1. Pour une race ou une sous-classe hors SRD, choisis la plus proche : tu pourras tout modifier sur la fiche."),
          h("label", { class: "inl" }, h("input", { type: "file", accept: ".json", onchange: async e => { const f = e.target.files[0]; if (!f) return; try { importChar(JSON.parse(await f.text()), opt); closeModal(); } catch (er) { toast("Fichier illisible", "err"); } } }), " 📂 Importer une fiche (.json)")];
      } else if (cur === "Caractéristiques") {
        const { ri, rsi } = raceSel(), rb = raceInfo(ri, rsi).ab, st = finalSt(), cl = G().cls[w.ci];
        body = [
          h("p", { class: "muted" }, "Saisis tes valeurs de base (jets ou répartition). Les bonus de race sont ajoutés automatiquement."),
          h("div", { class: "stats6" }, AB.map(([k, ab, nm]) => h("label", { class: "fld" }, ab, h("input", { type: "number", min: 1, max: 30, value: w.st[k], onchange: e => { w.st[k] = +e.target.value || 10; draw(); } }),
            h("span", { class: "muted small" }, `${w.applyRace && rb[k] ? "+" + rb[k] + " race = " : ""}${st[k]} (${sg(mod(st[k]))})`)))),
          h("div", { class: "cmdrow" }, h("button", { type: "button", class: "btn sm", onclick: () => { w.st = { for: 15, dex: 14, con: 13, int: 12, sag: 10, cha: 8 }; draw(); } }, "Valeurs standard (15 14 13 12 10 8)"),
            h("label", { class: "inl" }, h("input", { type: "checkbox", checked: w.applyRace, onchange: e => { w.applyRace = e.target.checked; draw(); } }), " Ajouter les bonus de race")),
          h("h4", {}, `Compétences maîtrisées ${cl.skn ? `(${cl.skn} au choix de ta classe, en gras)` : ""}`),
          h("div", { class: "conds" }, SK.map(([k, l]) => h("label", { class: "chip" + (w.skp[k] ? " on" : "") }, h("input", { type: "checkbox", checked: !!w.skp[k], style: "display:none", onchange: e => { w.skp[k] = e.target.checked ? 1 : 0; draw(); } }), cl.skl.includes(k) ? h("b", {}, l) : l))),
          h("p", { class: "muted small" }, "Maîtrises de sauvegarde de ta classe : " + cl.sv.map(k => AB.find(a => a[0] === k)[1]).join(", "))];
      } else if (cur === "Sorts") {
        w._pick = w._pick || spellPicker({ ci: w.ci, sel: w.sel, cantrips: lim.cantrips, kind: lim.kind, lim: lim.lim, maxLv: lim.maxLv });
        body = [h("p", { class: "muted" }, `Sorts disponibles pour ${G().cls[w.ci].n} niveau ${w.lvl} (emplacements : ${lim.slots.map((n, i) => n ? `niv.${i + 1}×${n}` : "").filter(Boolean).join(", ") || "aucun"}).`), w._pick];
      } else {
        const d = derive(); if (w.hp == null) w.hp = d.hp; if (w.ac == null) w.ac = d.ac; if (w.spd == null) w.spd = d.spd;
        const { ri, rsi } = raceSel(), fe = grantFeats(w.ci, w.sci === "_x" ? "" : w.sci, ri, rsi, w.lvl);
        w._fe = fe;
        body = [h("h3", {}, `${w.name} — ${raceInfo(ri, rsi).label} ${G().cls[w.ci].n} niveau ${w.lvl}`),
          h("div", { class: "stats" }, field("PV max", h("input", { type: "number", value: w.hp, onchange: e => w.hp = +e.target.value || 1 })), field("CA", h("input", { type: "number", value: w.ac, onchange: e => w.ac = +e.target.value || 10 })), field("Vitesse", h("input", { value: w.spd, onchange: e => w.spd = e.target.value }))),
          h("p", { class: "muted small" }, `Calculé : dé de vie d${G().cls[w.ci].hd}, modificateur de CON ${sg(mod(finalSt().con))}${raceSel().rsi === "hill-dwarf" ? ", ténacité naine" : ""}. Tu peux corriger les valeurs.`),
          h("h4", {}, "Capacités et dons reçus automatiquement"),
          h("div", { class: "featchk" }, Object.entries(fe).map(([id, f]) => h("label", { class: "inl" }, h("input", { type: "checkbox", checked: !w.noFeat[f.n], onchange: e => { w.noFeat[f.n] = !e.target.checked; } }), h("b", {}, " " + f.n), h("small", { class: "muted" }, " · " + f.s)))),
          h("p", { class: "muted small" }, "Décoche ce qui ne s'applique pas (choix de dons, variantes). Tu pourras en ajouter d'autres sur la fiche.")];
      }
      box.replaceChildren(h("div", { class: "wsteps" }, names.map((n, i) => h("span", { class: "ws" + (i === step ? " on" : i < step ? " done" : "") }, `${i + 1}. ${n}`))), ...[body].flat(Infinity).filter(Boolean), nav);
    };
    const create = () => {
      const { ri, rsi } = raceSel(), st = finalSt(), cl = G().cls[w.ci], fe = grantFeats(w.ci, w.sci === "_x" ? "" : w.sci, ri, rsi, w.lvl), feats = {};
      Object.entries(fe).forEach(([id, f]) => { if (!w.noFeat[f.n]) feats[id] = f; });
      const lim = limits(w.ci, w.lvl, st), spl = {};
      Object.values(w.sel).forEach(s => { spl[sync.newId() + Object.keys(spl).length] = { n: s.n, lv: s.lv, i: s.i || null, p: s.lv > 0 && lim.kind === "prep" && w.ci !== "wizard" ? true : false }; });
      const sv = {}; cl.sv.forEach(k => sv[k] = 1);
      const scls = w.sci === "_x" ? w.sclsText.trim() : w.sci ? (cl.sc.find(s => s.i === w.sci) || {}).n : "";
      const c = { name: w.name.trim(), race: raceInfo(ri, rsi).label, ri, rsi, cls: cl.n, ci: w.ci, scls, sci: w.sci === "_x" ? "" : w.sci, lvl: w.lvl, st, hp: w.hp, maxHp: w.hp, ac: w.ac, spd: w.spd, initBonus: mod(st.dex), sv, skp: { ...w.skp }, feats, spl, slots: slotsObj(w.ci, w.lvl), cast: lim.ab ? { ab: lim.ab } : null, inv: {}, acts: {} };
      createChar(c, opt, { free: w.free, forPlayer: w.forPlayer.trim() });
      closeModal();
    };
    draw();
    openModal(h("div", {}, h("h3", {}, "✨ Nouveau personnage"), box), "wide");
  }

  const COLORS = ["#e8b84a", "#5ab0ff", "#ff7a7a", "#6adf8a", "#c88aff", "#ff9a4a", "#4adfd0", "#ff8ac8"];
  function createChar(c, opt = {}, o = {}) {
    const id = sync.newId(), gm = isGM();
    const data = { ...c, color: c.color || (me().color || COLORS[0]), ts: Date.now(), inFight: true, owner: uid(), ownerName: myName };
    if (data.maxHp == null) data.maxHp = data.hp;
    if (gm && o.free) { data.free = true; data.forPlayer = o.forPlayer || null; data.ownerName = o.forPlayer ? o.forPlayer : "À réclamer"; }
    if (!c.init && c.initBonus != null) delete data.init;
    write({ ["chars/" + id]: data });
    log(`🧙 ${data.name} (${data.race || ""} ${data.cls || ""} niv. ${data.lvl || 1}) rejoint la table`);
    toast(`🧙 ${data.name} créé`, "good");
    setTimeout(() => openSheet(id), 100);
  }
  function importChar(raw, opt) {
    const c = { ...raw }; ["owner", "ownerName", "free", "forPlayer", "ts", "init", "enemy"].forEach(k => delete c[k]);
    c.hp = c.maxHp || c.hp || 10;
    createChar(c, opt, { free: isGM(), forPlayer: "" });
  }

  /* ---------- Reprendre un personnage ---------- */
  const norm1 = s => norm(s);
  function claim(id) {
    const c = S.chars[id]; if (!c) return;
    write({ [`chars/${id}/owner`]: uid(), [`chars/${id}/ownerName`]: myName, [`chars/${id}/free`]: null });
    log(`🙋 ${myName} reprend ${c.name}`); toast(`🙋 Tu joues maintenant ${c.name}`, "good");
  }
  function release(id) {
    const c = S.chars[id]; if (!c || !confirm(`Libérer ${c.name} ? Quelqu'un d'autre (ou toi, plus tard) pourra le réclamer.`)) return;
    write({ [`chars/${id}/free`]: true, [`chars/${id}/forPlayer`]: c.ownerName || null, [`chars/${id}/ownerName`]: "À réclamer", [`chars/${id}/owner`]: uid() });
  }
  function openWho() {
    const free = chars().filter(c => !c.enemy && c.free);
    const mine = chars().filter(c => c.owner === uid() && !c.enemy && !c.free);
    if (!free.length && !isGM() && mine.length) return;
    free.sort((a, b) => (norm1(b.forPlayer) === norm1(myName)) - (norm1(a.forPlayer) === norm1(myName)));
    const card = c => h("div", { class: "whocard" + (norm1(c.forPlayer) === norm1(myName) ? " me" : "") },
      h("div", {}, h("b", {}, c.name), h("div", { class: "muted small" }, `${c.race || ""} ${c.cls || ""} niv. ${c.lvl || 1}`, c.forPlayer ? ` · prévu pour ${c.forPlayer}` : "")),
      h("button", { class: "btn gold", onclick: () => { claim(c.id); closeModal(); } }, norm1(c.forPlayer) === norm1(myName) ? "⭐ C'est moi" : "C'est moi"));
    openModal(h("div", {}, h("h3", {}, "Qui es-tu, " + myName + " ?"),
      free.length ? [h("p", { class: "muted" }, "Choisis ton personnage : tout est déjà rempli."), free.map(card)] : h("p", { class: "muted" }, "Aucun personnage n'attend de joueur pour l'instant."),
      mine.length ? h("p", { class: "muted small" }, "Tu joues déjà : " + mine.map(c => c.name).join(", ")) : null,
      h("div", { class: "cmdrow" }, h("button", { class: "btn", onclick: () => { closeModal(); openWizard({}); } }, "＋ Créer un nouveau personnage"), h("button", { class: "btn ghost", onclick: closeModal }, "Plus tard"))), "sm");
  }
  function onEnter() {
    setTimeout(() => { if (!code || isGM()) return; if (!chars().some(c => c.owner === uid() && !c.enemy && !c.free) && !store.get("nowho:" + code, false)) { openWho(); } }, 700);
  }

  /* ---------- Personnages pré-enregistrés du MJ ---------- */
  function expand(p) {
    const c = { ...p.c };
    c.inv = {}; (p.inv || []).forEach(([n, q], i) => c.inv[sync.newId() + i] = { n, q: q || 1 });
    c.acts = {}; (p.acts || []).forEach(([n, d], i) => c.acts[sync.newId() + "a" + i] = { n, d: d || "" });
    c.feats = {}; (p.feats || []).forEach(([n, d, s], i) => c.feats[sync.newId() + "f" + i] = { n, d: d || "", s: s || "" });
    c.spl = {}; (p.spl || []).forEach(([lv, names, prepared], li) => names.forEach((n, i) => { const s = findSpell(n); c.spl[sync.newId() + "s" + li + i] = { n: s && norm(s.n) === norm(n) ? s.n : n, lv, i: s ? s.i : null, p: lv > 0 && prepared !== false }; }));
    c.slots = {}; Object.entries(p.slots || {}).forEach(([l, m]) => c.slots[l] = { m, u: 0 });
    return c;
  }
  async function openPremades() {
    await ensure();
    const have = new Set(chars().map(c => norm(c.name)));
    const list = (H.PREMADES || []).filter(p => p.table === code && !have.has(norm(p.c.name)));
    if (!list.length) return toast("Tous les personnages enregistrés sont déjà dans cette table.");
    const add = p => { const c = expand(p); createChar({ ...c, color: p.color }, {}, { free: true, forPlayer: p.joueur }); };
    openModal(h("div", {}, h("h3", {}, "📥 Personnages enregistrés"), h("p", { class: "muted" }, "Ajoutés à la table, ils attendent leur joueur : à son arrivée, il clique « C'est moi »."),
      list.map(p => h("div", { class: "whocard" }, h("div", {}, h("b", {}, p.c.name), h("div", { class: "muted small" }, `${p.c.race} ${p.c.cls} niv. ${p.c.lvl} · joueur : ${p.joueur || "—"}`)), h("button", { class: "btn", onclick: () => { add(p); closeModal(); } }, "Ajouter"))),
      h("button", { class: "btn gold", onclick: () => { list.forEach(add); closeModal(); } }, "Tout ajouter (" + list.length + ")")), "sm");
  }

  /* ---------- Onglets de la fiche ---------- */
  const TABS = [["gen", "Général"], ["car", "Caractéristiques"], ["sor", "Sorts"], ["cap", "Capacités"], ["his", "Histoire"]];
  const tabbar = (cur, go) => h("div", { class: "stabs" }, TABS.map(([k, l]) => h("button", { class: cur === k ? "on" : "", onclick: () => go(k) }, l)));

  function bonusSave(c, k) { if (c.svb && c.svb[k] != null) return c.svb[k]; return mod((c.st || {})[k]) + ((c.sv || {})[k] ? pbOf(c.lvl) : 0); }
  function bonusSkill(c, sk) { if (c.skb && c.skb[sk[0]] != null) return c.skb[sk[0]]; return mod((c.st || {})[sk[2]]) + ((c.skp || {})[sk[0]] ? pbOf(c.lvl) * (c.skp[sk[0]] === 2 ? 2 : 1) : 0); }

  function tab(name, x) {
    const { c, id, ed, set } = x;
    if (name === "car") {
      const st = c.st || {};
      return [h("div", { class: "stats6" }, AB.map(([k, ab, nm]) => h("div", { class: "abbox" }, h("div", { class: "muted small" }, nm),
        h("div", { class: "abmod" }, sg(mod(st[k]))), h("input", { type: "number", value: st[k] ?? "", disabled: !ed, onchange: e => write({ [`chars/${id}/st/${k}`]: +e.target.value || 10 }) }),
        h("label", { class: "inl small" }, h("input", { type: "checkbox", checked: !!(c.sv || {})[k], disabled: !ed, onchange: e => write({ [`chars/${id}/sv/${k}`]: e.target.checked ? 1 : null }) }), ` Sauv. ${sg(bonusSave(c, k))}`),
        h("button", { class: "btn sm ghost", title: "Jet de sauvegarde", onclick: () => H.Dice.roll(1, bonusSave(c, k), `${c.name} — sauvegarde ${ab}`) }, "🎲")))),
      h("div", { class: "stats" }, h("label", { class: "fld" }, "Bonus de maîtrise", h("input", { type: "text", disabled: true, value: sg(pbOf(c.lvl)) })), h("label", { class: "fld" }, "Perception passive", h("input", { type: "text", disabled: true, value: 10 + bonusSkill(c, SK.find(s => s[0] === "perception")) })),
        h("label", { class: "fld" }, "Vitesse", h("input", { value: c.spd || "", disabled: !ed, onchange: e => set("spd", e.target.value) }))),
      h("h4", {}, "Compétences"),
      h("div", { class: "skills" }, SK.map(sk => h("label", { class: "skrow" }, h("input", { type: "checkbox", checked: !!(c.skp || {})[sk[0]], disabled: !ed, onchange: e => write({ [`chars/${id}/skp/${sk[0]}`]: e.target.checked ? 1 : null, [`chars/${id}/skb/${sk[0]}`]: null }) }),
        h("span", { class: "grow" }, `${sk[1]} `, h("small", { class: "muted" }, `(${AB.find(a => a[0] === sk[2])[1]})`)), h("b", {}, sg(bonusSkill(c, sk))), h("button", { class: "btn sm ghost", title: "Lancer d20 " + sg(bonusSkill(c, sk)), onclick: e => { e.preventDefault(); H.Dice.roll(1, bonusSkill(c, sk), `${c.name} — ${sk[1]}`); } }, "🎲"))))];
    }
    if (name === "sor") return sortsTab(x);
    if (name === "cap") {
      const feats = Object.entries(c.feats || {}).sort((a, b) => String(a[1].s).localeCompare(String(b[1].s)) || a[1].n.localeCompare(b[1].n));
      const n = h("input", { placeholder: "Nouvelle capacité ou don", maxlength: 60, disabled: !ed }), d2 = h("textarea", { rows: 2, placeholder: "Description", maxlength: 1500, disabled: !ed });
      return [h("div", { class: "cmdrow" }, ed && c.ci ? h("button", { class: "btn sm", onclick: async () => { await ensure(); const have = new Set(Object.values(c.feats || {}).map(f => norm(f.n))); const add = grantFeats(c.ci, c.sci || "", c.ri || "", c.rsi || "", c.lvl || 1, have); const upd = {}; Object.entries(add).forEach(([k, v]) => upd[`chars/${id}/feats/${k}`] = v); write(upd); toast(Object.keys(add).length ? `${Object.keys(add).length} capacité(s) ajoutée(s)` : "Rien à ajouter : tout est déjà là."); } }, "⟳ Ajouter les capacités de classe/race manquantes") : null),
        feats.length ? feats.map(([fid, f]) => h("details", { class: "feat" }, h("summary", {}, h("b", {}, f.n), f.s ? h("small", { class: "muted" }, " · " + f.s) : null, ed ? h("button", { class: "btn sm ghost", style: "float:right", onclick: e => { e.preventDefault(); write({ [`chars/${id}/feats/${fid}`]: null }); } }, "✕") : null),
          (f.d || "").split("\n").filter(Boolean).map(p => h("p", {}, p)))) : h("p", { class: "muted" }, "Aucune capacité enregistrée."),
        ed ? h("div", { class: "li add col" }, n, d2, h("button", { class: "btn sm", onclick: () => { if (n.value.trim()) write({ [`chars/${id}/feats/${sync.newId()}`]: { n: n.value.trim(), d: d2.value.trim(), s: "Perso" } }); } }, "＋ Ajouter")) : null];
    }
    if (name === "his") {
      const ta = (f, label, rows = 4) => h("label", { class: "fld" }, label, h("textarea", { rows, maxlength: 4000, disabled: !ed, onchange: e => set(f, e.target.value) }, c[f] || ""));
      return [h("div", { class: "stats" }, h("label", { class: "fld" }, "Historique", h("input", { value: c.bg || "", disabled: !ed, onchange: e => set("bg", e.target.value) })), h("label", { class: "fld" }, "Alignement", h("input", { value: c.align || "", disabled: !ed, onchange: e => set("align", e.target.value) })), h("label", { class: "fld" }, "Joueur", h("input", { value: c.ownerName || "", disabled: true }))),
        ta("look", "Apparence"), ta("pers", "Personnalité, idéaux, liens, défauts", 5), ta("story", "Histoire du personnage", 8), ta("prof", "Autres maîtrises et langues", 4)];
    }
  }

  function sortsTab(x) {
    const { c, id, ed, set } = x;
    const ab = c.cast && c.cast.ab, m = ab ? mod((c.st || {})[ab]) : 0, pb = pbOf(c.lvl);
    const prepKind = c.ci && PREP[c.ci];
    const spl = Object.entries(c.spl || {}).map(([k, s]) => ({ ...s, k })), slots = c.slots || {};
    const byLv = {}; spl.forEach(s => (byLv[s.lv] = byLv[s.lv] || []).push(s));
    const head = h("div", { class: "castbox" },
      h("label", { class: "fld" }, "Caractéristique", h("select", { disabled: !ed, onchange: e => write({ [`chars/${id}/cast`]: e.target.value ? { ab: e.target.value } : null }) }, h("option", { value: "" }, "— aucune —"), AB.map(([k, a]) => h("option", { value: k, selected: ab === k }, a)))),
      ab ? [h("div", { class: "cstat2" }, h("b", {}, 8 + pb + m), h("small", {}, "DD de sauvegarde")), h("div", { class: "cstat2" }, h("b", {}, sg(pb + m)), h("small", {}, "Bonus d'attaque")), prepKind ? h("div", { class: "cstat2" }, h("b", {}, `${spl.filter(s => s.lv > 0 && s.p).length}`), h("small", {}, "préparés")) : null] : null);
    const slotRows = Object.keys(slots).sort((a, b) => a - b).map(l => { const s = slots[l]; return h("div", { class: "slotrow" }, h("b", {}, "Niv. " + l), h("span", { class: "pips" }, Array.from({ length: s.m }, (_, i) => h("button", { class: "pip" + (i < s.u ? " used" : ""), disabled: !ed, title: i < s.u ? "Récupérer" : "Utiliser", onclick: () => write({ [`chars/${id}/slots/${l}/u`]: i < s.u ? s.u - 1 : s.u + 1 }) }))), h("small", { class: "muted" }, `${s.m - s.u}/${s.m}`)); });
    const cast = s => {
      if (!s.lv) { log(`✨ ${c.name} lance ${s.n}`); toast(`✨ ${s.n}`); return; }
      const opts = Object.keys(slots).filter(l => +l >= s.lv && slots[l].u < slots[l].m);
      openModal(h("div", {}, h("h3", {}, "✨ Lancer " + s.n), h("p", { class: "muted" }, "Choisis l'emplacement de sort à dépenser :"),
        h("div", { class: "cmdrow" }, opts.length ? opts.map(l => h("button", { class: "btn gold", onclick: () => { write({ [`chars/${id}/slots/${l}/u`]: slots[l].u + 1 }); log(`✨ ${c.name} lance ${s.n} (emplacement niv. ${l}${+l > s.lv ? ", amplifié" : ""})`); closeModal(); } }, `Niveau ${l} (${slots[l].m - slots[l].u} restant${slots[l].m - slots[l].u > 1 ? "s" : ""})`)) : h("p", { class: "err" }, "Plus d'emplacement disponible !"),
          h("button", { class: "btn", onclick: () => { log(`✨ ${c.name} lance ${s.n} (sans emplacement : rituel, objet ou capacité)`); closeModal(); } }, "Sans emplacement"))), "sm");
    };
    const info = async s => { await ensure(); const e = s.i ? spells().find(z => z.i === s.i) : H.LexPerso.entries().find(z => z.kind === "sort" && norm(z.n) === norm(s.n)); if (e) H.Lex.show(e); else toast("Sort hors SRD : crée sa fiche dans le Lexique (⭐ Créer une fiche → Sort) pour la retrouver ici."); };
    return [head,
      slotRows.length ? h("div", { class: "slots" }, h("h4", {}, "Emplacements de sorts"), slotRows, ed ? h("div", { class: "cmdrow" }, h("button", { class: "btn sm", onclick: () => { const u = {}; Object.keys(slots).forEach(l => u[`chars/${id}/slots/${l}/u`] = 0); write(u); log(`🛌 ${c.name} fait un repos long : emplacements récupérés`); } }, "🛌 Repos long (emplacements)")) : null) : null,
      ed ? h("div", { class: "cmdrow" }, h("button", { class: "btn gold", onclick: () => manageSpells(x) }, "📖 Gérer les sorts"), h("details", { class: "inl" }, h("summary", {}, "⚙ Emplacements (maximum)"), h("div", { class: "row wrap" }, Array.from({ length: 9 }, (_, i) => h("label", { class: "fld", style: "width:64px" }, "Niv." + (i + 1), h("input", { type: "number", min: 0, max: 9, value: (slots[i + 1] || {}).m || 0, onchange: e => { const v = Math.max(0, +e.target.value || 0); write({ [`chars/${id}/slots/${i + 1}`]: v ? { m: v, u: Math.min(((slots[i + 1] || {}).u) || 0, v) } : null }); } })))))) : null,
      Object.keys(byLv).sort((a, b) => a - b).map(l => h("div", {}, h("h4", {}, +l ? "Niveau " + l : "Sorts mineurs"), byLv[l].sort((a, b) => a.n.localeCompare(b.n, "fr")).map(s => h("div", { class: "li" },
        prepKind && +l > 0 ? h("input", { type: "checkbox", title: "Préparé", checked: !!s.p, disabled: !ed, onchange: e => write({ [`chars/${id}/spl/${s.k}/p`]: e.target.checked }) }) : null,
        h("span", { class: "grow" }, s.n, s.i ? null : h("small", { class: "muted" }, " (hors SRD)")),
        h("button", { class: "btn sm", disabled: !ed, onclick: () => cast(s) }, "Lancer"), h("button", { class: "btn sm ghost", title: "Voir le sort", onclick: () => info(s) }, "ℹ"), ed ? h("button", { class: "btn sm ghost", onclick: () => write({ [`chars/${id}/spl/${s.k}`]: null }) }, "✕") : null)))),
      !spl.length ? h("p", { class: "muted" }, "Aucun sort. Clique sur « Gérer les sorts » pour en ajouter.") : null];
  }

  async function manageSpells(x) {
    await ensure();
    const { c, id } = x, st = c.st || {}, lim = c.ci ? limits(c.ci, c.lvl || 1, st) : { cantrips: 0, kind: "", lim: 0, maxLv: undefined };
    const sel = {}; Object.values(c.spl || {}).forEach(s => { sel[s.i || "x:" + s.n] = { n: s.n, lv: s.lv, i: s.i || undefined, x: !s.i, p: s.p }; });
    const old = c.spl || {};
    const picker = spellPicker({ ci: c.ci || "", sel, cantrips: lim.cantrips || 0, kind: lim.kind, lim: lim.lim, maxLv: lim.maxLv || undefined });
    openModal(h("div", {}, h("h3", {}, "📖 Sorts de " + c.name), picker, h("button", { class: "btn gold", onclick: () => {
      const upd = {}, keep = new Set();
      Object.entries(old).forEach(([k, s]) => { const key = s.i || "x:" + s.n; if (sel[key]) keep.add(key); else upd[`chars/${id}/spl/${k}`] = null; });
      let n = 0;
      Object.entries(sel).forEach(([key, s]) => { if (!keep.has(key)) upd[`chars/${id}/spl/${sync.newId()}${n++}`] = { n: s.n, lv: s.lv, i: s.i || null, p: s.lv > 0 && (lim.kind === "prep" && c.ci !== "wizard") }; });
      write(upd); closeModal(); setTimeout(() => openSheet(id), 50); } }, "✔ Terminer")), "wide");
  }

  /* ---------- Actions de la fiche (général) ---------- */
  async function levelUp(x) {
    const { c, id, set } = x; await ensure();
    if (!c.ci) return toast("Classe hors SRD : monte le niveau à la main.", "err");
    if ((c.lvl || 1) >= 20) return;
    const L = (c.lvl || 1) + 1, cl = G().cls[c.ci], con = mod((c.st || {}).con), gain = Math.max(1, hpAvg(cl.hd, con) + (c.rsi === "hill-dwarf" ? 1 : 0));
    const have = new Set(Object.values(c.feats || {}).map(f => norm(f.n)));
    const add = {}; for (const f of G().feat) if (f.c === c.ci && f.l === L && (!f.sc || f.sc === c.sci)) if (!have.has(norm(f.n))) add[sync.newId() + Object.keys(add).length] = { n: f.n, d: [].concat(f.d).join("\n"), s: (f.sc ? "Sous-classe" : "Classe") + " niv. " + L };
    const upd = { [`chars/${id}/lvl`]: L, [`chars/${id}/maxHp`]: c.maxHp + gain, [`chars/${id}/hp`]: c.hp + gain };
    const ns = slotsObj(c.ci, L, c.slots || {}); upd[`chars/${id}/slots`] = Object.keys(ns).length ? ns : null;
    Object.entries(add).forEach(([k, v]) => upd[`chars/${id}/feats/${k}`] = v);
    write(upd);
    const nl = limits(c.ci, L, c.st || {}), ol = limits(c.ci, L - 1, c.st || {});
    log(`⬆ ${c.name} passe niveau ${L} (+${gain} PV max)`);
    toast(`⬆ Niveau ${L} : +${gain} PV max${Object.keys(add).length ? ", nouvelles capacités : " + Object.values(add).map(f => f.n).join(", ") : ""}${nl.cantrips > ol.cantrips || nl.maxLv > ol.maxLv || nl.lim > ol.lim ? ". Pense à choisir tes nouveaux sorts !" : ""}`, "good");
  }
  function exportChar(c) {
    const o = { ...c }; ["owner", "ownerName", "free", "forPlayer", "ts", "id"].forEach(k => delete o[k]);
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: "application/json" })), download: `${c.name}.json` });
    document.body.append(a); a.click(); a.remove();
  }
  function saveLocal(c) {
    const o = { ...c }; ["owner", "ownerName", "free", "forPlayer", "ts", "id"].forEach(k => delete o[k]);
    const list = store.get("saved", []).filter(s => norm(s.name) !== norm(o.name)); list.push(o); store.set("saved", list); toast(`💾 ${c.name} enregistré sur cet appareil`, "good");
  }
  function genActions(x) {
    const { c, ed } = x;
    if (c.enemy) return null;
    return h("div", { class: "cmdrow" },
      ed && c.ci ? h("button", { class: "btn sm gold", onclick: () => levelUp(x) }, "⬆ Monter de niveau") : null,
      h("button", { class: "btn sm", onclick: () => saveLocal(c) }, "💾 Enregistrer sur cet appareil"), h("button", { class: "btn sm", onclick: () => exportChar(c) }, "⬇ Exporter la fiche"),
      c.owner === uid() && !isGM() ? h("button", { class: "btn sm ghost", onclick: () => release(c.id) }, "↩ Libérer") : null);
  }
  function cardActions(c) {
    if (c.enemy) return null;
    if (c.free) return h("button", { class: "btn sm gold", onclick: e => { e.stopPropagation(); claim(c.id); } }, "🙋 C'est mon personnage");
    return null;
  }

  H.Perso = { openWizard, openWho, openPremades, onEnter, tabbar, tab, genActions, cardActions, claim, ensure };
})();
