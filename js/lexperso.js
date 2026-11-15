"use strict";
/* Lexique « Notre monde » : fiches créées par la table (monstres, objets, villes & lieux, PNJ).
   Tout membre peut en créer et modifier. Données : lex/<id> = { k, n, v:{champs}, d, img, a, an, ts, ub, ut }. */
(function () {
  const SIZES = ["TP", "P", "M", "G", "TG", "Gig"], RAR = ["Commun", "Peu commun", "Rare", "Très rare", "Légendaire", "Artefact", "Unique"];
  const SPRITES = [["slime", "Blob / gelée"], ["chauve", "Volant (chauve-souris)"], ["gobelin", "Petit humanoïde"], ["loup", "Bête à quatre pattes"], ["squelette", "Mort-vivant"], ["orc", "Brute / géant"], ["dragon", "Dragon / très gros"]];
  const KINDS = {
    mon: { l: "Monstre", ic: "👹", fields: [
      { k: "size", l: "Taille", t: "select", o: SIZES }, { k: "type", l: "Type", ph: "ex. mort-vivant" }, { k: "cr", l: "FP (puissance)", ph: "ex. 3 ou 1/2" },
      { k: "hp", l: "Points de vie", t: "number" }, { k: "ac", l: "Classe d'armure", t: "number" }, { k: "bonus", l: "Bonus d'initiative", t: "number" }, { k: "spd", l: "Vitesse", ph: "ex. 9 m" },
      { k: "sp", l: "Apparence au combat", t: "select", o: SPRITES },
      { k: "trait", l: "Capacités spéciales (une par ligne : Nom : effet)", area: true, bold: true }, { k: "acts", l: "Actions (une par ligne : Nom : effet)", area: true, bold: true }] },
    obj: { l: "Objet", ic: "🎒", fields: [
      { k: "cat", l: "Catégorie", t: "select", o: ["Arme", "Armure", "Potion", "Objet merveilleux", "Outil", "Équipement", "Trésor", "Autre"] }, { k: "rar", l: "Rareté", t: "select", o: RAR },
      { k: "prix", l: "Prix", ph: "ex. 50 po" }, { k: "poids", l: "Poids", ph: "ex. 2 kg" }, { k: "eff", l: "Effets et règles", area: true }] },
    lieu: { l: "Ville / lieu", ic: "🏰", fields: [
      { k: "type", l: "Type", ph: "ville, village, auberge, donjon…" }, { k: "region", l: "Région" }, { k: "pop", l: "Population", ph: "ex. 3 000" }, { k: "lead", l: "Dirigeant / pouvoir" },
      { k: "poi", l: "Lieux d'intérêt (un par ligne : Nom : détail)", area: true, bold: true }] },
    sort: { l: "Sort", ic: "✨", fields: [
      { k: "lv", l: "Niveau", t: "select", o: [["0", "Sort mineur"], ...Array.from({ length: 9 }, (_, i) => [String(i + 1), "Niveau " + (i + 1)])] },
      { k: "school", l: "École", t: "select", o: ["Abjuration", "Divination", "Enchantement", "Évocation", "Illusion", "Invocation", "Nécromancie", "Transmutation", "Autre"] },
      { k: "cast", l: "Temps d'incantation", ph: "ex. 1 action" }, { k: "range", l: "Portée", ph: "ex. 18 mètres" }, { k: "comp", l: "Composantes", ph: "ex. V, S, M (une plume)" },
      { k: "dur", l: "Durée", ph: "ex. Concentration, 1 minute" }, { k: "cls", l: "Classes", ph: "ex. Magicien, Clerc" }, { k: "eff", l: "Effets et règles", area: true }] },
    pnj: { l: "PNJ", ic: "🧑", fields: [
      { k: "role", l: "Rôle / métier" }, { k: "race", l: "Race" }, { k: "lieu", l: "Où le trouver" }, { k: "att", l: "Attitude envers le groupe" }, { k: "secret", l: "Secrets, objectifs…", area: true }] },
    autre: { l: "Autre", ic: "🔖", fields: [
      { k: "type", l: "Genre", ph: "faction, divinité, légende, règle maison, quête, monnaie…" }, { k: "lien", l: "Lié à", ph: "un lieu, un PNJ, une région…" }, { k: "notes", l: "Détails", area: true }] }
  };
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
  const MAX = 300, MAX_IMG = 40;

  function toEntry(id, c) {
    const K = KINDS[c.k] || KINDS.obj, v = c.v || {};
    const lab = (x, val) => { const o = (x.o || []).find(q => Array.isArray(q) && q[0] === String(val)); return o ? o[1] : val; };
    const f = K.fields.filter(x => !x.area && v[x.k] !== undefined && v[x.k] !== "" && v[x.k] !== null).map(x => [x.l, lab(x, v[x.k])]);
    const sec = K.fields.filter(x => x.area && v[x.k]).map(x => [x.l.replace(/ \(.*\)/, ""), String(v[x.k]).split("\n").filter(Boolean).map(l => { if (!x.bold) return l; const m = l.match(/^(.+?)\s*:\s*(.+)$/); return m ? `▸ ${m[1]}. ${m[2]}` : "▸ " + l; })]);
    const bits = c.k === "mon" ? [v.size, v.type, v.cr ? "FP " + v.cr : "", v.hp ? v.hp + " PV" : "", v.ac ? "CA " + v.ac : ""] : c.k === "obj" ? [v.cat, v.rar, v.prix] : c.k === "lieu" ? [v.type, v.region] : c.k === "sort" ? [v.lv !== undefined ? lab(KINDS.sort.fields[0], v.lv) : "", v.school] : c.k === "autre" ? [v.type, v.lien] : [v.role, v.race];
    const e = { _c: "perso", id, kind: c.k, n: c.n, a: "", s: [K.l, ...bits.filter(Boolean)].join(" · "), ic: K.ic, f, d: String(c.d || "").split("\n").filter(Boolean), sec, img: c.img || null, ts: c.ts || 0, raw: c };
    e._ex = norm([c.d, ...Object.values(v)].join(" "));
    if (c.k === "mon") e.x = { hp: +v.hp || 1, ac: +v.ac || 10, b: +v.bonus || 0, k: v.sp || "orc", acts: String(v.acts || "").split("\n").filter(Boolean).slice(0, 6).map(l => { const m = l.match(/^(.+?)\s*:\s*(.+)$/); return m ? { n: m[1], d: m[2].slice(0, 140) } : { n: l.slice(0, 40), d: "" }; }) };
    return e;
  }
  const entries = () => Object.entries(S.lex || {}).map(([id, c]) => toEntry(id, c));

  /* ---------- Éditeur ---------- */
  function editor(e, startKind) {
    const edit = !!e, c = edit ? e.raw : { k: startKind || "mon", v: {} };
    let kind = c.k, img = c.img || null;
    const vals = { ...(c.v || {}) };
    const body = h("div", { class: "lexform" });
    const draw = () => {
      const K = KINDS[kind];
      body.replaceChildren(...[
        h("label", {}, "Nom", h("input", { id: "lp-n", maxlength: 60, value: edit ? c.n : "", required: true, placeholder: edit ? "" : "ex. " + ({ mon: "Ogre des marais", obj: "Épée de la Lune", lieu: "Brumeval", pnj: "Maître Orlo", sort: "Éclair de lune", autre: "Ordre de l'Aube" })[kind] })),
        ...K.fields.map(f => {
          const val = vals[f.k] ?? "";
          const set = ev => vals[f.k] = f.t === "number" ? (ev.target.value === "" ? "" : +ev.target.value) : ev.target.value;
          if (f.t === "select") return h("label", {}, f.l, h("select", { onchange: set }, h("option", { value: "" }, "—"), f.o.map(o => Array.isArray(o) ? h("option", { value: o[0], selected: val === o[0] }, o[1]) : h("option", { value: o, selected: val === o }, o))));
          if (f.area) return h("label", {}, f.l, h("textarea", { rows: 3, maxlength: 1500, onchange: set }, val));
          return h("label", {}, f.l, h("input", { type: f.t || "text", value: val, maxlength: 60, placeholder: f.ph || "", onchange: set }));
        }),
        h("label", {}, "Description", h("textarea", { id: "lp-d", rows: 4, maxlength: 2500, placeholder: "Aspect, histoire, ambiance…" }, c.d || "")),
        h("label", {}, "Image (facultative)", h("input", { type: "file", accept: "image/*", onchange: async ev => { const f = ev.target.files[0]; if (!f) return; try { img = await H.Board.shrink(f); prev(); } catch (er) { toast("Image illisible", "err"); } } })),
        pv]);
    };
    const pv = h("div", { class: "imgprev" });
    const prev = () => pv.replaceChildren(...(img ? [h("img", { src: img }), h("button", { type: "button", class: "btn sm ghost", onclick: () => { img = null; prev(); } }, "✕ Retirer l'image")] : []));
    prev(); draw();
    const form = h("form", { onsubmit: ev => {
      ev.preventDefault();
      const n = $("#lp-n").value.trim(); if (!n) return;
      if (!edit && Object.keys(S.lex || {}).length >= MAX) return toast("Le lexique de la table est plein.", "err");
      if (img && !(edit && c.img) && Object.values(S.lex || {}).filter(x => x.img).length >= MAX_IMG) return toast("Trop d'images dans le lexique : retires-en quelques-unes.", "err");
      const v = {}; Object.entries(vals).forEach(([k, x]) => { if (x !== "" && x != null) v[k] = x; });
      const now = Date.now(), data = { k: kind, n, v, d: $("#lp-d").value.trim(), img, ts: edit ? c.ts : now, a: edit ? c.a : uid(), an: edit ? c.an : myName, ub: myName, ut: now };
      const id = edit ? e.id : sync.newId();
      write({ ["lex/" + id]: data });
      log(`📚 ${myName} ${edit ? "met à jour" : "ajoute"} « ${n} » (${KINDS[kind].l.toLowerCase()}) ${edit ? "dans" : "au"} lexique de la table`);
      toast(`📚 « ${n} » ${edit ? "mis à jour" : "ajouté au lexique"}`, "good");
      closeModal(); if (H.Lex.focus) H.Lex.focus(id);
    } },
      h("h3", {}, edit ? "✎ Modifier la fiche" : "⭐ Nouvelle fiche pour notre monde"),
      edit ? null : h("div", { class: "seg wrap" }, Object.entries(KINDS).map(([k, K]) => h("button", { type: "button", "data-k": k, class: k === kind ? "on" : "", onclick: () => { kind = k; Object.keys(vals).forEach(x => delete vals[x]); form.querySelectorAll(".seg button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); draw(); } }, K.ic + " " + K.l))),
      body, h("button", { class: "btn gold" }, edit ? "Enregistrer" : "Ajouter au lexique"));
    openModal(form, "wide");
  }

  /* ---------- Boutons de la fiche détaillée ---------- */
  function actions(e) {
    const box = h("div", { class: "lexact" });
    const raw = e.raw;
    box.append(h("button", { class: "btn", onclick: () => editor(e) }, "✎ Modifier"),
      h("button", { class: "btn", title: "Épingler une copie sur le panneau d'affichage", onclick: () => {
        const z = Math.max(0, ...Object.values(S.board || {}).map(x => x.z || 0)) + 1;
        write({ ["board/" + sync.newId()]: { a: uid(), an: myName, c: "bleu", t: `${e.ic} ${e.n}${e.s ? "\n" + e.s.split(" · ").slice(1).join(" · ") : ""}`.slice(0, 300), img: e.img, x: 8 + Math.random() * 60, y: 6 + Math.random() * 50, z, r: Math.round((Math.random() * 6 - 3) * 10) / 10, ts: Date.now() } });
        toast("📌 Épinglé sur le panneau", "good");
      } }, "📌 Sur le panneau"),
      h("button", { class: "btn ghost", onclick: () => { if (confirm(`Supprimer « ${e.n} » du lexique de la table ?`)) { write({ ["lex/" + e.id]: null }); log(`📚 ${myName} retire « ${e.n} » du lexique de la table`); closeModal(); } } }, "🗑 Supprimer"));
    if (e.kind === "mon" && isGM()) {
      const n = h("input", { type: "number", value: 1, min: 1, max: 12, style: "width:4.5em" });
      box.append(h("label", { class: "inl" }, "Quantité", n), h("button", { class: "btn gold", onclick: () => { const k = Math.max(1, Math.min(12, +n.value || 1)); for (let i = 0; i < k; i++) addEnemy({ kind: e.x.k, name: e.n, hp: e.x.hp, ac: e.x.ac, bonus: e.x.b, acts: e.x.acts }, i); toast(`👹 ${k} × ${e.n} ajouté${k > 1 ? "s" : ""} au combat`, "good"); } }, "⚔ Ajouter au combat"));
    }
    if (e.kind === "sort") {
      const mine = chars().filter(c => !c.enemy && (isGM() || c.owner === uid()));
      if (mine.length) {
        const who = h("select", {}, mine.map(c => h("option", { value: c.id }, c.name)));
        box.append(h("label", { class: "inl" }, "Pour", who), h("button", { class: "btn gold", onclick: () => {
          const c = S.chars[who.value]; if (!c) return;
          if (Object.values(c.spl || {}).some(x => norm(x.n) === norm(e.n))) return toast(`${c.name} connaît déjà ${e.n}.`);
          write({ [`chars/${who.value}/spl/${sync.newId()}`]: { n: e.n, lv: +(raw.v || {}).lv || 0, i: null, p: true } });
          toast(`✨ ${e.n} ajouté aux sorts de ${c.name}`, "good"); } }, "✨ Ajouter à ses sorts"));
      }
    }
    if (e.kind === "obj") {
      const mine = chars().filter(c => !c.enemy && (isGM() || c.owner === uid()));
      if (mine.length) {
        const who = h("select", {}, mine.map(c => h("option", { value: c.id }, c.name)));
        box.append(h("label", { class: "inl" }, "Pour", who), h("button", { class: "btn gold", onclick: () => {
          const c = S.chars[who.value]; if (!c) return; const ex = Object.entries(c.inv || {}).find(([, i]) => i.n === e.n);
          if (ex) write({ [`chars/${who.value}/inv/${ex[0]}/q`]: ex[1].q + 1 }); else write({ [`chars/${who.value}/inv/${sync.newId()}`]: { n: e.n, q: 1 } });
          toast(`🎒 ${e.n} ajouté à l'inventaire de ${c.name}`, "good"); } }, "🎒 Ajouter à l'inventaire"));
      }
    }
    box.append(h("p", { class: "muted small", style: "flex-basis:100%;margin:0" }, `Créé par ${raw.an || "?"}` + (raw.ub && (raw.ut - raw.ts > 60000 || raw.ub !== raw.an) ? ` · modifié par ${raw.ub} le ${new Date(raw.ut).toLocaleDateString("fr-FR")}` : "")));
    return box;
  }

  H.LexPerso = { KINDS, entries, editor, actions, norm };
})();
