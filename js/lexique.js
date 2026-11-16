"use strict";
/* Lexique : recherche instantanée dans le SRD 5.1 (OGL) — monstres, objets, objets magiques, sorts, classes, races, règles.
   Données générées par tools/build-lexique.py dans data/lexique-*.js (chargées à la première ouverture). */
(function () {
  const FILES = ["mon", "eq", "mag", "spl", "cls", "rac", "reg"];
  const CATS = [["all", "Tout", "📚"], ["perso", "Notre monde", "⭐"], ["mon", "Monstres", "👹"], ["eq", "Objets", "🎒"], ["mag", "Objets magiques", "💎"], ["spl", "Sorts", "✨"], ["cls", "Classes", "🛡️"], ["rac", "Races", "🧝"], ["reg", "Règles & états", "📖"]];
  const ICON = Object.fromEntries(CATS.map(c => [c[0], c[2]]));
  const TYPE_FR = { beast: "Bête", humanoid: "Humanoïde", dragon: "Dragon", monstrosity: "Monstruosité", fiend: "Fiélon", undead: "Mort-vivant", elemental: "Élémentaire", giant: "Géant", swarm: "Nuée", construct: "Créature artificielle", plant: "Plante", fey: "Fée", celestial: "Céleste", aberration: "Aberration", ooze: "Vase" };
  const CRS = [["", "—"], [0, "0"], [0.125, "1/8"], [0.25, "1/4"], [0.5, "1/2"], ...Array.from({ length: 30 }, (_, i) => [i + 1, String(i + 1)])];
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
  const crTxt = v => ({ 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" }[v] ?? v);

  let all = [], loaded = false, loading = null, cat = "all", F = {}, sortBy = "rel", results = [], sel = 0, shown = 60, q = "";
  const mobile = () => window.matchMedia("(max-width:900px)").matches;
  const uniq = (cat, key, map) => [...new Set(all.filter(e => e._c === cat).map(e => e[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "fr")).map(v => [v, map ? map(v) : v]);

  function loadData() {
    if (loading) return loading;
    loading = Promise.all([...FILES, "gen"].map(f => new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = `data/lexique-${f}.js`; s.onload = res; s.onerror = () => rej(new Error("Données introuvables : " + f)); document.head.append(s);
    }))).then(() => {
      for (const k of FILES) for (const e of H.LEX[k]) {
        e._c = k; e._n = norm(e.n); e._a = norm(e.a || "");
        e._h = norm([e.n, e.a, e.s, e.c, e.sc, (e.cl || []).join(" ")].join(" "));
        all.push(e);
      }
      loaded = true; syncCustom(true);
    });
    return loading;
  }

  /* ---------- Filtres & tri par catégorie ---------- */
  const FILTERS = {
    mon: () => [{ k: "t", label: "Type", opts: uniq("mon", "t", v => TYPE_FR[v] || v) }, { k: "cmin", label: "FP min", opts: CRS }, { k: "cmax", label: "FP max", opts: CRS }],
    eq: () => [{ k: "c", label: "Catégorie", opts: uniq("eq", "c") }, { k: "pmax", label: "Prix max", opts: [["", "Tous"], [100, "≤ 1 po"], [1000, "≤ 10 po"], [10000, "≤ 100 po"], [100000, "≤ 1 000 po"]] }],
    mag: () => [{ k: "r", label: "Rareté", opts: [["Commun", "Commun"], ["Peu commun", "Peu commun"], ["Rare", "Rare"], ["Très rare", "Très rare"], ["Légendaire", "Légendaire"], ["Artefact", "Artefact"], ["Variable", "Variable"]] }, { k: "c", label: "Catégorie", opts: uniq("mag", "c") }],
    perso: () => [{ k: "k", label: "Genre", opts: [["mon", "Monstres"], ["obj", "Objets"], ["lieu", "Villes & lieux"], ["pnj", "PNJ"], ["sort", "Sorts"], ["autre", "Autres"]] }],
    spl: () => [{ k: "lv", label: "Niveau", opts: [[0, "Tour de magie"], ...Array.from({ length: 9 }, (_, i) => [i + 1, "Niveau " + (i + 1)])] }, { k: "sc", label: "École", opts: uniq("spl", "sc") }, { k: "cl", label: "Classe", opts: [...new Set(all.filter(e => e._c === "spl").flatMap(e => e.cl))].sort().map(v => [v, v]) }]
  };
  const SORTS = {
    perso: [["rel", "Pertinence"], ["n", "Nom"], ["ts", "Plus récents"]],
    mon: [["rel", "Pertinence"], ["n", "Nom"], ["cr", "FP croissant"], ["crd", "FP décroissant"], ["hp", "PV décroissants"]],
    eq: [["rel", "Pertinence"], ["n", "Nom"], ["p", "Prix croissant"], ["pd", "Prix décroissant"], ["w", "Poids"]],
    mag: [["rel", "Pertinence"], ["n", "Nom"], ["ro", "Rareté ↑"], ["rod", "Rareté ↓"]],
    spl: [["rel", "Pertinence"], ["n", "Nom"], ["lv", "Niveau ↑"], ["lvd", "Niveau ↓"]]
  };
  const has = v => v !== undefined && v !== "" && v !== null;
  function pass(e) {
    if (cat === "all") return true;
    if (cat === "mon") return (!has(F.t) || e.t === F.t) && (!has(F.cmin) || e.cr >= +F.cmin) && (!has(F.cmax) || e.cr <= +F.cmax);
    if (cat === "eq") return (!has(F.c) || e.c === F.c) && (!has(F.pmax) || e.p <= +F.pmax);
    if (cat === "mag") return (!has(F.r) || e.r === F.r) && (!has(F.c) || e.c === F.c);
    if (cat === "perso") return !has(F.k) || e.kind === F.k;
    if (cat === "spl") return (!has(F.lv) || e.lv === +F.lv) && (!has(F.sc) || e.sc === F.sc) && (!has(F.cl) || e.cl.includes(F.cl));
    return true;
  }
  const SORTFN = {
    ts: (a, b) => b.ts - a.ts,
    n: (a, b) => a._n.localeCompare(b._n, "fr"), cr: (a, b) => a.cr - b.cr, crd: (a, b) => b.cr - a.cr, hp: (a, b) => b.hp - a.hp,
    p: (a, b) => a.p - b.p, pd: (a, b) => b.p - a.p, w: (a, b) => a.w - b.w, ro: (a, b) => a.ro - b.ro, rod: (a, b) => b.ro - a.ro, lv: (a, b) => a.lv - b.lv, lvd: (a, b) => b.lv - a.lv
  };

  let customSig = "";
  function syncCustom(force) {
    const sig = Object.entries(S.lex || {}).map(([k, v]) => k + (v.ut || v.ts)).join(",");
    if (!force && sig === customSig) return false;
    customSig = sig; all = all.filter(e => e._c !== "perso");
    for (const e of H.LexPerso.entries()) { e._n = norm(e.n); e._a = ""; e._h = norm([e.n, e.s].join(" ")) + " " + e._ex; all.push(e); }
    return true;
  }
  function search() {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    const list = all.filter(e => (cat === "all" || e._c === cat) && pass(e) && toks.every(t => e._h.includes(t)));
    for (const e of list) {
      const t = toks[0];
      e._r = !t ? 0 : (e._n.startsWith(t) || e._a.startsWith(t)) ? 0 : (" " + e._n + " " + e._a).includes(" " + t) ? 1 : 2;
    }
    const by = sortBy === "rel" || !SORTFN[sortBy] ? null : SORTFN[sortBy];
    list.sort((a, b) => (by ? by(a, b) : 0) || a._r - b._r || a._n.localeCompare(b._n, "fr"));
    results = list; sel = 0; shown = 60;
  }

  /* ---------- Rendu ---------- */
  function rowInfo(e) {
    if (e._c === "mon") return `FP ${crTxt(e.cr)} · ${e.hp} PV · CA ${e.ac}`;
    if (e._c === "eq") return e.f[0][1];
    if (e._c === "mag") return e.r;
    if (e._c === "spl") return e.lv ? "Niv. " + e.lv : "Tour";
    if (e._c === "perso") return e.raw.an ? "par " + e.raw.an : "";
    return "";
  }
  function renderCats() {
    const counts = {}; for (const e of all) counts[e._c] = (counts[e._c] || 0) + 1;
    $("#lex-cats").replaceChildren(...CATS.map(([k, l, i]) => h("button", { class: "chip" + (cat === k ? " on" : ""), onclick: () => { cat = k; F = {}; sortBy = "rel"; refresh(); } }, `${i} ${l}`, h("small", {}, ` ${k === "all" ? all.length : counts[k] || 0}`))));
  }
  function renderFilters() {
    const defs = FILTERS[cat] ? FILTERS[cat]() : [];
    const sorts = SORTS[cat];
    $("#lex-filters").replaceChildren(...[
      ...defs.map(d => h("label", { class: "lf" }, d.label, h("select", { onchange: e => { F[d.k] = e.target.value; update(); } }, h("option", { value: "" }, "Tous"), d.opts.map(([v, l]) => h("option", { value: v, selected: String(F[d.k] ?? "") === String(v) && has(F[d.k]) }, l))))),
      sorts ? h("label", { class: "lf" }, "Trier par", h("select", { onchange: e => { sortBy = e.target.value; update(); } }, sorts.map(([v, l]) => h("option", { value: v, selected: sortBy === v }, l)))) : null,
      Object.keys(F).some(k => has(F[k])) ? h("button", { class: "btn sm ghost", onclick: () => { F = {}; renderFilters(); update(); } }, "✕ Réinitialiser") : null].filter(Boolean));
  }
  function renderList() {
    const box = $("#lex-list");
    if (!results.length) { box.replaceChildren(h("p", { class: "muted pad" }, "Aucun résultat. Essaie moins de lettres ou une autre catégorie.")); return; }
    box.replaceChildren(...[
      h("div", { class: "muted pad small" }, `${results.length} résultat${results.length > 1 ? "s" : ""}`),
      results.slice(0, shown).map((e, i) => h("button", { class: "lexrow" + (i === sel ? " on" : ""), "data-i": i, onclick: () => choose(i, true) },
        h("span", { class: "ic" }, e.ic || ICON[e._c]), h("span", { class: "nm" }, e.n, e.a && norm(e.a) !== norm(e.n) && e._c !== "eq" ? h("small", {}, " " + e.a) : null), h("span", { class: "inf" }, rowInfo(e)))),
      results.length > shown ? h("button", { class: "btn sm", onclick: () => { shown += 100; renderList(); } }, `Afficher plus (${results.length - shown})`) : null].flat(Infinity).filter(Boolean));
  }
  function renderDetail() {
    const box = $("#lex-detail"), e = results[sel];
    box.replaceChildren(e ? detail(e) : h("p", { class: "muted" }, "Tape quelques lettres pour chercher un monstre, un objet, un sort…"));
  }
  function update() { search(); renderList(); if (!mobile()) renderDetail(); renderCats(); }
  function refresh() { renderCats(); renderFilters(); update(); }
  function choose(i, click) {
    sel = i;
    document.querySelectorAll(".lexrow").forEach(r => r.classList.toggle("on", +r.dataset.i === i));
    if (mobile()) { if (click) openModal(detail(results[i]), "wide"); } else renderDetail();
  }

  /* ---------- Fiche détaillée ---------- */
  /* texte enrichi : **gras**, ***gras italique***, *italique* ; tableaux « | a | b | » ; puces « - » et « * » */
  function inline(t) {
    const out = [], re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*\s][^*]*?)\*/g; let i = 0, m;
    while ((m = re.exec(t))) { if (m.index > i) out.push(t.slice(i, m.index)); out.push(m[1] ? h("b", {}, h("i", {}, m[1])) : m[2] ? h("b", {}, m[2]) : h("i", {}, m[3])); i = re.lastIndex; }
    if (i < t.length) out.push(t.slice(i)); return out;
  }
  function rich(t) {
    if (t.startsWith("▸ ")) {
      const s = t.slice(2), m = s.match(/^(.{1,70}?\.)\s+([\s\S]*)$/);
      return m ? h("p", {}, h("b", {}, m[1] + " "), inline(m[2])) : h("p", {}, h("b", {}, s));
    }
    if (t.startsWith("- ")) return h("p", { class: "bul" }, "• ", inline(t.slice(2)));
    if (t.startsWith("* ")) return h("p", { class: "bul" }, "• ", inline(t.slice(2)));
    return h("p", {}, inline(t));
  }
  function table(lines) {
    const rows = lines.filter(l => !/^\|[-:| ]+\|?$/.test(l.trim())).map(l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
    return h("table", { class: "lt" }, h("thead", {}, h("tr", {}, rows[0].map(c => h("th", {}, inline(c))))), h("tbody", {}, rows.slice(1).map(r => h("tr", {}, r.map(c => h("td", {}, inline(c)))))));
  }
  /* fr = texte principal ; en = original (affiché dessous si showEn) */
  function paras(fr, en, showEn) {
    const out = []; let i = 0;
    fr = (fr || []).filter(x => x !== undefined && x !== null && x !== "");
    en = en || fr;
    while (i < fr.length) {
      if (fr[i].startsWith("|")) {
        let j = i; while (j < fr.length && fr[j].startsWith("|")) j++;
        out.push(table(fr.slice(i, j))); if (showEn) out.push(h("div", { class: "en" }, table(en.slice(i, j))));
        i = j;
      } else { out.push(rich(fr[i])); if (showEn && en[i] && en[i] !== fr[i]) out.push(h("div", { class: "en" }, rich(en[i]))); i++; }
    }
    return out;
  }
  const showEnglish = () => store.get("lex.en", false);
  function detail(e) {
    const hasFr = !!(e.secf || e.df);
    const en = hasFr && showEnglish();
    const root = h("div", { class: "ldet" },
      h("div", { class: "ltitle" }, h("h3", {}, (e.ic || ICON[e._c]) + " " + e.n), e.a && norm(e.a) !== norm(e.n) && e._c !== "eq" ? h("span", { class: "muted" }, e.a) : null),
      h("div", { class: "muted lsub" }, e.s),
      hasFr ? h("label", { class: "inl small enbox" }, h("input", { type: "checkbox", checked: showEnglish(), onchange: ev => { store.set("lex.en", ev.target.checked); root.replaceWith(detail(e)); } }), " 🇬🇧 Afficher l'original anglais sous chaque paragraphe") : null,
      e.img ? h("img", { class: "lexpic", src: e.img, alt: "", onclick: () => H.Board.lightbox(e.img, e.n) }) : null,
      e.f && e.f.length ? h("dl", { class: "lf-grid" }, e.f.map(([k, v]) => [h("dt", {}, k), h("dd", {}, String(v))])) : null,
      e.d0 ? [h("p", { class: "muted" }, h("i", {}, e.d0f || e.d0)), en && e.d0f ? h("div", { class: "en" }, h("p", {}, h("i", {}, e.d0))) : null] : null,
      paras(e.df || e.d, e.d, en),
      (e.sec || []).map(([t, ps], i) => h("details", { open: e._c === "mon" || (e._c === "rac") }, h("summary", {}, t), paras(e.secf ? e.secf[i][1] : ps, ps, en))),
      actions(e));
    return root;
  }

  function actions(e) {
    if (e._c === "perso") return H.LexPerso.actions(e);
    if (!["mon", "eq", "mag", "spl"].includes(e._c) || !H.state || !H.state.meta) return null;
    const box = h("div", { class: "lexact" });
    if (e._c === "mon") {
      if (!H.isGM()) return h("p", { class: "muted small" }, "Seul le MJ peut ajouter des monstres au combat.");
      const n = h("input", { type: "number", value: 1, min: 1, max: 12, style: "width:4.5em" });
      box.append(h("label", { class: "inl" }, "Quantité", n), h("button", { class: "btn gold", onclick: () => {
        const k = Math.max(1, Math.min(12, +n.value || 1));
        for (let i = 0; i < k; i++) addEnemy({ kind: e.x.k, name: e.n, hp: e.x.hp, ac: e.x.ac, bonus: e.x.b, acts: e.x.acts }, i);
        toast(`👹 ${k} × ${e.n} ajouté${k > 1 ? "s" : ""} au combat`, "good");
      } }, "⚔ Ajouter au combat"));
      return box;
    }
    const mine = chars().filter(c => !c.enemy && (H.isGM() || c.owner === uid()));
    if (!mine.length) return h("p", { class: "muted small" }, "Crée d'abord un personnage (onglet Personnages) pour y ajouter des objets ou des sorts.");
    const who = h("select", {}, mine.map(c => h("option", { value: c.id }, c.name)));
    box.append(h("label", { class: "inl" }, "Pour", who));
    const target = () => S.chars[who.value];
    if (e._c === "spl") {
      box.append(h("button", { class: "btn gold", onclick: () => { const c = target(); if (!c) return;
        write({ [`chars/${who.value}/acts/${sync.newId()}`]: { n: e.n, d: `${e.s} — ${e.f[1][1]}, ${e.f[3][1]}`.slice(0, 120) } });
        toast(`✨ ${e.n} ajouté aux actions de ${c.name}`, "good"); } }, "✨ Ajouter aux actions"));
    } else {
      box.append(h("button", { class: "btn gold", onclick: () => { const c = target(); if (!c) return;
        const ex = Object.entries(c.inv || {}).find(([, i]) => i.n === e.n);
        if (ex) write({ [`chars/${who.value}/inv/${ex[0]}/q`]: ex[1].q + 1 }); else write({ [`chars/${who.value}/inv/${sync.newId()}`]: { n: e.n, q: 1 } });
        toast(`🎒 ${e.n} ajouté à l'inventaire de ${c.name}`, "good"); } }, "🎒 Ajouter à l'inventaire"));
      const dmg = e._c === "eq" && e.f.find(([k]) => k === "Dégâts");
      if (dmg) box.append(h("button", { class: "btn", onclick: () => { const c = target(); if (!c) return;
        write({ [`chars/${who.value}/acts/${sync.newId()}`]: { n: e.n, d: "Dégâts " + dmg[1] } }); toast(`⚔ ${e.n} ajouté aux actions de ${c.name}`, "good"); } }, "⚔ Ajouter comme action"));
    }
    return box;
  }

  /* ---------- Ouverture ---------- */
  let ready = false;
  async function open() {
    const box = $("#lex-list");
    if (!loaded) {
      box.replaceChildren(h("p", { class: "muted pad" }, "Chargement du lexique…"));
      try { await loadData(); } catch (err) { box.replaceChildren(h("p", { class: "err" }, err.message)); return; }
    }
    syncCustom();
    if (!ready) {
      ready = true;
      $("#lex-add").onclick = () => H.LexPerso.editor(null, cat === "perso" && F.k ? F.k : "mon");
      const input = $("#lex-q");
      input.addEventListener("input", () => { q = input.value; update(); });
      input.addEventListener("keydown", ev => {
        if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          ev.preventDefault(); const n = Math.min(results.length - 1, Math.min(shown, results.length) - 1);
          const i = Math.max(0, Math.min(n, sel + (ev.key === "ArrowDown" ? 1 : -1))); choose(i, false);
          const r = document.querySelector(`.lexrow[data-i="${i}"]`); r && r.scrollIntoView({ block: "nearest" });
        } else if (ev.key === "Enter" && results[sel]) { ev.preventDefault(); if (mobile()) choose(sel, true); }
      });
      refresh();
    }
    if (!mobile()) $("#lex-q").focus();
  }
  /* appelé quand les données de la table changent : recharge « Notre monde » en gardant la sélection */
  function refreshCustom() {
    if (!ready || !syncCustom()) return;
    const keep = results[sel] && results[sel].id; search();
    if (keep) { const i = results.findIndex(e => e.id === keep); if (i >= 0) sel = i; }
    renderList(); if (!mobile()) renderDetail(); renderCats();
  }
  function focus(id) {
    if (!loaded) return; syncCustom(true); cat = "perso"; F = {}; sortBy = "ts"; q = ""; $("#lex-q").value = "";
    refresh0(id);
  }
  function refresh0(id) { renderCats(); renderFilters(); search(); const i = results.findIndex(e => e.id === id); if (i >= 0) sel = i; renderList(); if (!mobile()) renderDetail(); }
  H.Lex = { open, refresh: refreshCustom, focus, ensure: loadData, show: e => openModal(detail(e), "wide") };
})();
