"use strict";
/* Dés : plateau multi-dés (d4 à d100, plusieurs types à la fois), avantage/désavantage, animation de dés qui roulent
   visible par toute la table, et mode « j'ai lancé mes vrais dés » pour noter un résultat physique. */
(function () {
  const TYPES = [4, 6, 8, 10, 12, 20, 100];
  const COL = { 4: ["#7be0a0", "#1f8a4a"], 6: ["#7ab6ff", "#2a5ac8"], 8: ["#ff9a9a", "#b02a2a"], 10: ["#c8a0ff", "#6a3ac0"], 12: ["#ffd070", "#c08010"], 20: ["#fff0a0", "#d09a10"], 100: ["#9ae8e0", "#1f8a8a"] };
  const tray = {}; let mod = 0, adv = null, label = "", mode = "virtual", lastRoll = null, canvas, cx, raf = null, anim = null;
  const reduce = () => window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- Lancer ---------- */
  function build(spec) {
    const dice = [];
    for (const s of TYPES) for (let i = 0; i < (spec.tray[s] || 0); i++) dice.push({ s, v: d(s) });
    if (spec.adv && dice.length === 1 && dice[0].s === 20) dice.push({ s: 20, v: d(20) });
    let keep = dice.map(() => true);
    if (spec.adv && dice.length === 2 && dice[0].s === 20) { const hi = dice[0].v >= dice[1].v; keep = spec.adv === "adv" ? [hi, !hi] : [!hi, hi]; if (dice[0].v === dice[1].v) keep = [true, false]; }
    dice.forEach((x, i) => x.k = keep[i]);
    const total = dice.filter(x => x.k).reduce((a, x) => a + x.v, 0) + (spec.mod || 0);
    return { id: sync.newId(), n: myName, c: me().color || "#fff", l: spec.label || "", d: dice, m: spec.mod || 0, t: total, adv: spec.adv || null, ts: Date.now() };
  }
  function describe(r) {
    const groups = {};
    r.d.forEach(x => (groups[x.s] = groups[x.s] || []).push(x));
    const f = Object.entries(groups).map(([s, a]) => `${a.length > 1 && !r.adv ? a.length : a.length > 1 ? "2" : 1}d${s}`).join("+") + (r.m ? (r.m > 0 ? "+" : "−") + Math.abs(r.m) : "");
    const vals = r.d.map(x => x.k ? x.v : `(${x.v})`).join(", ");
    return { f: (r.adv ? (r.adv === "adv" ? "avantage " : "désavantage ") : "") + f, vals };
  }
  function roll(spec) {
    const hasDice = TYPES.some(s => (spec.tray || {})[s]);
    if (!hasDice) { toast("Choisis au moins un dé.", "err"); return; }
    const r = build(spec), { f, vals } = describe(r);
    const single = r.d.filter(x => x.k).length === 1 && r.d.find(x => x.k).s === 20 ? r.d.find(x => x.k).v : null;
    const nat = single === 20 ? " — RÉUSSITE CRITIQUE !" : single === 1 ? " — ÉCHEC CRITIQUE…" : "";
    lastRoll = r.id;
    write({ roll: r });
    log(`🎲 ${myName} lance ${f}${r.l ? " (" + r.l + ")" : ""} → [${vals}]${r.m ? " " + (r.m > 0 ? "+" : "−") + Math.abs(r.m) : ""} = ${r.t}${nat}`);
    play(r);
  }
  function logReal() {
    const n = $("#dr-val").value; if (n === "") return toast("Saisis le résultat de ton jet.", "err");
    const lab = $("#dr-label").value.trim(), det = $("#dr-det").value.trim(), v = +n;
    log(`🎲 ${myName} (dés réels)${lab ? " — " + lab : ""} : ${v}${det ? " (" + det + ")" : ""}${v === 20 && /d20/i.test(det) ? " — RÉUSSITE CRITIQUE !" : ""}`);
    toast(`✍ ${v}${lab ? " — " + lab : ""} noté au journal`, "good");
    $("#dr-val").value = ""; $("#dr-det").value = "";
  }
  /* jet d'un autre module (ex. compétence de la fiche) */
  H.Dice = { roll: (dice, modv, lab) => roll({ tray: { 20: dice }, mod: modv, label: lab }), onState, init };

  /* ---------- Réception : jet d'un autre joueur ---------- */
  function onState() {
    const r = S.roll; if (!r) return;
    if (lastRoll === null) { lastRoll = r.id; return; }       // état initial : on n'anime pas un vieux jet
    if (r.id === lastRoll) return;
    lastRoll = r.id;
    if (Date.now() - r.ts < 20000) play(r);
  }

  /* ---------- Animation ---------- */
  function shape(s, size) {
    const p = (n, rot = -Math.PI / 2, rx = 1, ry = 1) => Array.from({ length: n }, (_, i) => [Math.cos(rot + i * 2 * Math.PI / n) * size * rx, Math.sin(rot + i * 2 * Math.PI / n) * size * ry]);
    switch (s) {
      case 4: return p(3, -Math.PI / 2, 1.05, 1.05);
      case 6: return p(4, Math.PI / 4, 0.95, 0.95);
      case 8: return p(4, -Math.PI / 2, 0.8, 1.1);
      case 10: return [[0, -1.1], [0.85, -0.2], [0.55, 0.95], [-0.55, 0.95], [-0.85, -0.2]].map(([x, y]) => [x * size, y * size]);
      case 12: return p(5, -Math.PI / 2, 1, 1);
      case 20: return p(6, -Math.PI / 2, 1, 1);
      default: return p(10, -Math.PI / 2, 1, 1);
    }
  }
  function drawDie(x, y, size, rot, s, text, alpha, squash) {
    const [c1, c2] = COL[s], pts = shape(s, size);
    cx.save(); cx.translate(x, y); cx.rotate(rot); cx.scale(squash, 1); cx.globalAlpha = alpha;
    const g = cx.createLinearGradient(-size, -size, size, size); g.addColorStop(0, c1); g.addColorStop(1, c2);
    cx.beginPath(); pts.forEach(([px, py], i) => i ? cx.lineTo(px, py) : cx.moveTo(px, py)); cx.closePath();
    cx.fillStyle = g; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = "#1a1030"; cx.lineJoin = "round"; cx.stroke();
    if (s === 20 || s === 12) { cx.lineWidth = 1.5; cx.strokeStyle = "#00000044"; cx.beginPath(); pts.forEach(([px, py], i) => { cx.moveTo(0, 0); cx.lineTo(px, py); }); cx.stroke(); }
    cx.rotate(-rot); cx.scale(1 / Math.max(squash, 0.4), 1);
    cx.font = `bold ${Math.round(size * (String(text).length > 2 ? 0.62 : 0.85))}px "Press Start 2P",monospace`; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.lineWidth = 4; cx.strokeStyle = "#000"; cx.strokeText(text, 0, 2); cx.fillStyle = "#fff"; cx.fillText(text, 0, 2);
    cx.restore();
  }
  const ease = t => 1 - Math.pow(1 - t, 3);
  function play(r) {
    if (reduce()) { toast(`🎲 ${r.n} : ${r.t}${r.l ? " (" + r.l + ")" : ""}`); return; }
    if (!canvas) {
      canvas = h("canvas", { id: "dicecv" }); document.body.append(canvas); cx = canvas.getContext("2d");
      canvas.addEventListener("click", () => { anim = null; canvas.hidden = true; });
    }
    const dpr = window.devicePixelRatio || 1, W = window.innerWidth, Hh = window.innerHeight;
    canvas.width = W * dpr; canvas.height = Hh * dpr; canvas.style.width = W + "px"; canvas.style.height = Hh + "px"; canvas.hidden = false; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const list = r.d.slice(0, 16), n = list.length, size = n <= 3 ? 46 : n <= 8 ? 36 : 28;
    const cols = Math.min(n, W < 600 ? 4 : 6), rows = Math.ceil(n / cols), gap = size * 2.5;
    const items = list.map((die, i) => {
      const col = i % cols, row = Math.floor(i / cols), inRow = row === rows - 1 ? n - row * cols : cols;
      const tx = W / 2 + (col - (inRow - 1) / 2) * gap + (Math.random() - 0.5) * 14, ty = Hh / 2 + (row - (rows - 1) / 2) * gap * 0.95 + (Math.random() - 0.5) * 12;
      const fromLeft = Math.random() < 0.5;
      return { die, tx, ty, x0: fromLeft ? -80 : W + 80, y0: Hh * (0.1 + Math.random() * 0.4), rot0: Math.random() * 6, spin: (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 8), delay: i * 70, rnd: 1, nextRnd: 0, bounces: 2.6 + Math.random() };
    });
    anim = { r, items, t0: performance.now(), W, H: Hh, T: 1500, hold: 2600 };
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = null; if (!anim) return;
    const { r, items, t0, W, H: Hh, T, hold } = anim, el = now - t0;
    cx.clearRect(0, 0, W, Hh);
    const total = T + items[items.length - 1].delay, fade = el > total + hold ? Math.max(0, 1 - (el - total - hold) / 500) : 1;
    if (fade <= 0) { anim = null; canvas.hidden = true; return; }
    cx.globalAlpha = fade * 0.55; cx.fillStyle = "#050818"; cx.fillRect(0, 0, W, Hh); cx.globalAlpha = 1;
    for (const it of items) {
      const p = Math.max(0, Math.min(1, (el - it.delay) / T)), e = ease(p), x = it.x0 + (it.tx - it.x0) * e;
      const bounce = Math.abs(Math.cos(p * Math.PI * it.bounces)) * Math.pow(1 - p, 1.6) * 150;
      const y = it.y0 + (it.ty - it.y0) * ease(Math.min(1, p * 1.15)) - (p < 1 ? bounce : 0), rot = it.rot0 + it.spin * (1 - e) * (1 - e) * 1.2;
      const size = items.length <= 3 ? 46 : items.length <= 8 ? 36 : 28, alpha = fade * (it.die.k || p < 0.9 ? 1 : 0.35);
      cx.globalAlpha = fade * 0.4; cx.fillStyle = "#000"; cx.beginPath(); cx.ellipse(x, it.ty + size * 0.95, size * (1 - bounce / 400), size * 0.25, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
      let txt = it.die.v;
      if (p < 0.82) { if (now > it.nextRnd) { it.rnd = 1 + Math.floor(Math.random() * it.die.s); it.nextRnd = now + 70; } txt = it.rnd; }
      const squash = p < 0.9 ? 0.6 + 0.4 * Math.abs(Math.cos(el / 90 + it.delay)) : 1;
      drawDie(x, y, size, p < 1 ? rot : 0, it.die.s, txt, alpha, squash);
    }
    if (el > total) {
      const k = Math.min(1, (el - total) / 250), pop = 1 + Math.sin(k * Math.PI) * 0.18, nat = r.d.filter(x => x.k).length === 1 && r.d.find(x => x.k).s === 20 ? r.d.find(x => x.k).v : null;
      const col = nat === 20 ? "#ffd84a" : nat === 1 ? "#ff6a6a" : "#ffffff";
      cx.save(); cx.globalAlpha = fade * k; cx.translate(W / 2, Hh / 2 + Math.max(...items.map(i => i.ty - Hh / 2)) + items[0].die.s * 0 + (items.length > 6 ? 80 : 90)); cx.scale(pop, pop);
      cx.font = '700 40px "Press Start 2P",monospace'; cx.textAlign = "center"; cx.lineWidth = 8; cx.strokeStyle = "#000"; cx.lineJoin = "round";
      cx.strokeText(String(r.t), 0, 0); cx.fillStyle = col; cx.fillText(String(r.t), 0, 0);
      cx.font = '700 15px system-ui,sans-serif'; cx.lineWidth = 4;
      const sub = `${r.n}${r.l ? " · " + r.l : ""}${r.m ? " · " + (r.m > 0 ? "+" : "−") + Math.abs(r.m) : ""}${nat === 20 ? " · CRITIQUE !" : nat === 1 ? " · ÉCHEC CRITIQUE" : ""}`;
      cx.strokeText(sub, 0, 34); cx.fillStyle = "#fff"; cx.fillText(sub, 0, 34);
      cx.restore();
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Interface du plateau ---------- */
  function ui() {
    const box = $("#dice-panel"); if (!box) return;
    const total = TYPES.reduce((a, s) => a + (tray[s] || 0), 0);
    const parts = TYPES.filter(s => tray[s]).map(s => `${tray[s]}d${s}`);
    if (adv && !(total === 1 && tray[20] === 1)) adv = null;
    const summary = total ? (adv ? (adv === "adv" ? "Avantage : " : "Désavantage : ") : "") + parts.join(" + ") + (mod ? (mod > 0 ? " + " : " − ") + Math.abs(mod) : "") : "Clique sur les dés à lancer";
    const virtual = [
      h("div", { class: "trayrow" }, TYPES.map(s => h("div", { class: "dwrap" },
        h("button", { class: "die d" + s, title: "Ajouter un d" + s, onclick: () => { tray[s] = Math.min(20, (tray[s] || 0) + 1); ui(); } }, "d" + s, tray[s] ? h("i", { class: "cnt" }, tray[s]) : null),
        tray[s] ? h("button", { class: "dminus", title: "Retirer un d" + s, onclick: () => { tray[s]--; if (!tray[s]) delete tray[s]; ui(); } }, "−") : null))),
      h("div", { class: "traysum" }, summary),
      h("div", { class: "row wrap" },
        h("label", { class: "inl" }, "Bonus", h("button", { class: "btn sm", onclick: () => { mod--; ui(); } }, "−"), h("b", { class: "modv" }, (mod > 0 ? "+" : "") + mod), h("button", { class: "btn sm", onclick: () => { mod++; ui(); } }, "＋")),
        h("button", { class: "chip" + (adv === "adv" ? " on" : ""), disabled: !(total === 1 && tray[20] === 1), title: "Seulement avec un d20 seul", onclick: () => { adv = adv === "adv" ? null : "adv"; ui(); } }, "▲ Avantage"),
        h("button", { class: "chip" + (adv === "dis" ? " on" : ""), disabled: !(total === 1 && tray[20] === 1), title: "Seulement avec un d20 seul", onclick: () => { adv = adv === "dis" ? null : "dis"; ui(); } }, "▼ Désavantage")),
      h("div", { class: "row" }, h("input", { id: "dv-label", placeholder: "Pour quoi ? (Attaque, Perception, dégâts…)", maxlength: 40, value: label, oninput: e => label = e.target.value }),
        h("button", { class: "btn gold", onclick: () => roll({ tray, mod, adv, label: label.trim() }) }, "🎲 Lancer !"), h("button", { class: "btn ghost", onclick: () => { Object.keys(tray).forEach(k => delete tray[k]); mod = 0; adv = null; ui(); } }, "Effacer"))];
    const real = [
      h("p", { class: "muted small" }, "Tu as lancé tes vrais dés ? Note le résultat : toute la table le voit dans le journal."),
      h("div", { class: "row wrap" }, h("input", { id: "dr-label", placeholder: "Pour quoi ? (Perception, attaque, dégâts…)", maxlength: 40 }), h("input", { id: "dr-det", placeholder: "Détail (ex. d20+5, 2d6+3)", maxlength: 30 }),
        h("input", { id: "dr-val", type: "number", inputmode: "numeric", placeholder: "Résultat", class: "big", style: "max-width:9em", onkeydown: e => { if (e.key === "Enter") logReal(); } }), h("button", { class: "btn gold", onclick: logReal }, "✍ Noter"))];
    box.replaceChildren(h("div", { class: "seg" }, h("button", { class: mode === "virtual" ? "on" : "", onclick: () => { mode = "virtual"; ui(); } }, "🎲 Dés virtuels"), h("button", { class: mode === "real" ? "on" : "", onclick: () => { mode = "real"; ui(); } }, "✍ J'ai lancé mes dés")), ...(mode === "virtual" ? virtual : real));
  }
  function init() { ui(); }
  H.Dice.ui = ui;
})();
