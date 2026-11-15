"use strict";
/* Scène de combat 2D façon Final Fantasy : ennemis à gauche, groupe à droite, chiffres de dégâts flottants,
   pas en avant du personnage actif, KO allongés, bannière de victoire. Lit l'état partagé à chaque image. */
window.H = window.H || {};

(function () {
  const W = 480, Hh = 270;
  const CONDS = { poison: "☠️", stun: "💫", prone: "⬇️", blind: "🕶️", fear: "😱", burn: "🔥", bless: "✨", invis: "👻", focus: "🎯" };
  let cv, ctx, running = false, opts = {}, hit = [], hover = null, targetMode = false;
  const fx = {};            // id -> {last, flash, shake}
  let floats = [];
  const bgCache = {};

  /* ---------- Décors ---------- */
  function makeBg(name) {
    const c = document.createElement("canvas"); c.width = W; c.height = Hh;
    const g = c.getContext("2d");
    const grad = (y0, y1, a, b) => { const l = g.createLinearGradient(0, y0, 0, y1); l.addColorStop(0, a); l.addColorStop(1, b); g.fillStyle = l; g.fillRect(0, y0, W, y1 - y0); };
    const hz = 120;
    if (name === "foret") {
      grad(0, hz + 20, "#14301f", "#2c5a3a");
      g.fillStyle = "#0e2216";
      for (let i = 0; i < 12; i++) { const x = i * 42 + (i % 3) * 7; g.fillRect(x, 0, 12 + (i % 2) * 6, hz + 30); }
      g.fillStyle = "#1d4a2c";
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(i * 60 + 20, 30 + (i % 3) * 18, 34, 0, 7); g.fill(); }
      grad(hz + 20, Hh, "#4a6a34", "#2a4020");
    } else if (name === "donjon") {
      grad(0, hz + 30, "#2a2a3a", "#3c3c52");
      g.strokeStyle = "#1c1c28"; g.lineWidth = 2;
      for (let y = 0; y < hz + 30; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 20 % 2) * 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 20); g.stroke(); } }
      grad(hz + 30, Hh, "#585870", "#2c2c3c");
      g.strokeStyle = "#232332";
      for (let i = -6; i < 14; i++) { g.beginPath(); g.moveTo(W / 2 + (i - 4) * 14, hz + 30); g.lineTo(W / 2 + (i - 4) * 90, Hh); g.stroke(); }
      g.fillStyle = "#ff9a30"; for (const x of [70, 410]) { g.fillRect(x - 2, 40, 4, 14); g.fillStyle = "#ffd070"; g.fillRect(x - 1, 36, 2, 6); g.fillStyle = "#ff9a30"; }
    } else if (name === "nuit") {
      grad(0, hz + 40, "#0a0c28", "#2a2458");
      g.fillStyle = "#fff"; let s = 7; for (let i = 0; i < 60; i++) { s = (s * 9301 + 49297) % 233280; g.fillRect(s % W, (s >> 3) % hz, 1 + (i % 7 === 0), 1); }
      g.fillStyle = "#f4f0d0"; g.beginPath(); g.arc(380, 50, 22, 0, 7); g.fill(); g.fillStyle = "#d8d4b0"; g.beginPath(); g.arc(372, 44, 5, 0, 7); g.fill();
      g.fillStyle = "#16143a"; g.beginPath(); g.moveTo(0, hz + 40); for (let x = 0; x <= W; x += 30) g.lineTo(x, hz + 10 - ((x / 30) % 3) * 14); g.lineTo(W, hz + 40); g.fill();
      grad(hz + 40, Hh, "#3a3060", "#1a1638");
    } else {
      grad(0, hz + 30, "#5aa8ee", "#cfeaff");
      g.fillStyle = "#fff"; for (const [x, y] of [[60, 30], [220, 50], [370, 25]]) { g.beginPath(); g.ellipse(x, y, 34, 11, 0, 0, 7); g.ellipse(x + 20, y + 4, 26, 9, 0, 0, 7); g.fill(); }
      g.fillStyle = "#6aa850"; g.beginPath(); g.ellipse(100, hz + 40, 140, 44, 0, 0, 7); g.fill();
      g.fillStyle = "#58985a"; g.beginPath(); g.ellipse(400, hz + 44, 150, 50, 0, 0, 7); g.fill();
      grad(hz + 30, Hh, "#7ec060", "#3e7a34");
    }
    // sol : bandes de perspective
    g.fillStyle = "#0000001a"; for (let y = hz + 40; y < Hh; y += 24) g.fillRect(0, y, W, 10);
    return c;
  }
  const bgOf = n => bgCache[n] || (bgCache[n] = makeBg(n));

  /* ---------- Mise en page ---------- */
  function layout(list, side, scale) {
    // colonnes de 4 « emplacements » ; les gros monstres en occupent 2
    const slotsOf = c => (H.Sprites.size(c.enemy ? c.kind : "x") > 1.4 ? 2 : 1);
    const cols = []; let cur = { items: [], used: 0 };
    for (const c of list) {
      const s = slotsOf(c);
      if (cur.used + s > 4) { cols.push(cur); cur = { items: [], used: 0 }; }
      cur.items.push({ c, s, k: cur.used }); cur.used += s;
    }
    if (cur.items.length) cols.push(cur);
    const out = [];
    cols.forEach((col, ci) => col.items.forEach((it, row) => {
      const y = 108 + (it.k + it.s - 1) * 44 + (4 - col.used) * 22;
      const x = side === 1 ? W - 70 - ci * 84 - (row % 2 ? 16 : 0) : 70 + ci * 84 + (row % 2 ? 16 : 0);
      out.push({ c: it.c, x, y: Math.round(y), side, u: scale });
    }));
    return out;
  }

  /* ---------- Dessin ---------- */
  function outlineText(t, x, y, fill, size = 9, align = "center") {
    ctx.font = `bold ${size}px "Press Start 2P", monospace`;
    ctx.textAlign = align; ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.lineJoin = "round";
    ctx.strokeText(t, x, y); ctx.fillStyle = fill; ctx.fillText(t, x, y);
  }

  function hpBar(x, y, w, c, showNum) {
    const pct = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    ctx.fillStyle = "#000"; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = "#3a1010"; ctx.fillRect(x - w / 2, y, w, 3);
    ctx.fillStyle = pct > 0.5 ? "#40d060" : pct > 0.25 ? "#e8c030" : "#e84040";
    ctx.fillRect(x - w / 2, y, Math.round(w * pct), 3);
    if (showNum) outlineText(`${c.hp}/${c.maxHp}`, x, y + 14, "#fff", 6);
  }

  function spawnFloat(x, y, txt, color) { floats.push({ x, y, txt, color, t0: performance.now() }); }

  function frame(ts) {
    if (!running) return;
    requestAnimationFrame(frame);
    const S = H.state || {}, chars = S.chars || {}, combat = S.combat || {};
    const gm = H.isGM();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bgOf(combat.bg || "plaine"), 0, 0);

    const all = Object.entries(chars).map(([id, c]) => ({ ...c, id })).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const enemies = all.filter(c => c.enemy), party = all.filter(c => !c.enemy);
    const turn = combat.active ? combat.turn : null;
    const sprites = [
      ...layout(enemies, -1, enemies.length > 6 ? 1.6 : 2),
      ...layout(party, 1, party.length > 6 ? 1.6 : 2)
    ].sort((a, b) => a.y - b.y);

    hit = [];
    for (const s of sprites) {
      const c = s.c, id = c.id;
      const f = fx[id] || (fx[id] = { last: c.hp, flash: 0, shake: 0 });
      if (c.hp !== f.last) {
        const d = c.hp - f.last;
        spawnFloat(s.x, s.y - 30 * s.u * H.Sprites.size(c.kind), (d < 0 ? "" : "+") + d, d < 0 ? "#ffffff" : "#5af07a");
        if (d < 0) { f.flash = ts + 260; f.shake = ts + 360; }
        f.last = c.hp;
      }
      const kind = c.enemy ? (c.kind || "slime") : H.Sprites.classToKind(c.cls);
      const size = H.Sprites.size(kind), u = s.u * size;
      const ko = c.hp <= 0, active = turn === id;
      const dirFlip = s.side === 1 ? -1 : 1;                  // le groupe regarde à gauche
      let ox = 0, oy = 0;
      if (!ko) oy = Math.round(Math.sin(ts / 420 + (id.charCodeAt(id.length - 1) || 0)) * 1.5) - H.Sprites.bob(kind) * (kind === "chauve" ? 5 : 0);
      if (active && !ko) ox = -dirFlip * -10;                  // pas en avant vers l'adversaire
      if (f.shake > ts) ox += Math.round(Math.sin(ts / 22) * 3);

      // ombre
      ctx.fillStyle = "#0006"; ctx.beginPath(); ctx.ellipse(s.x + ox, s.y + 1, 11 * u, 3.5 * u, 0, 0, 7); ctx.fill();

      ctx.save();
      ctx.translate(s.x + ox, s.y + oy);
      if (ko) { ctx.rotate(dirFlip * Math.PI / 2); ctx.globalAlpha = c.enemy ? 0.4 : 0.85; }
      ctx.scale(dirFlip * u, u);
      H.Sprites.draw(ctx, kind, { acc: c.color, flash: f.flash > ts, t: ts });
      ctx.restore();

      // pastilles d'état
      const conds = Object.keys(c.cond || {}).filter(k => CONDS[k]);
      if (conds.length && !ko) { ctx.font = "9px serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(conds.map(k => CONDS[k]).join(""), s.x + ox, s.y - 30 * u - 14); }

      // curseur du tour ou de la cible
      const isHover = hover === id && targetMode;
      if (active || isHover) {
        const bounce = Math.round(Math.sin(ts / 160) * 3);
        outlineText("▼", s.x + ox, s.y - 30 * u + bounce - 4, isHover ? "#ffffff" : "#ffd84a", 12);
      }

      // nom + PV
      const showNum = !c.enemy || gm;
      outlineText(c.name || "?", s.x, s.y + 12, ko ? "#ff8080" : active ? "#ffe680" : "#fff", 6);
      hpBar(s.x, s.y + 15, 30, c, showNum && !ko);
      hit.push({ id, x: s.x - 14 * u * size, y: s.y - 28 * u * size, w: 28 * u * size, h: 32 * u * size + 10 });
    }

    // nombres flottants
    floats = floats.filter(f => ts - f.t0 < 1100);
    for (const f of floats) {
      const t = (ts - f.t0) / 1100, bounce = t < 0.25 ? -Math.sin(t / 0.25 * Math.PI) * 10 : 0;
      ctx.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      outlineText(f.txt, f.x, f.y - t * 20 + bounce, f.color, 14);
      ctx.globalAlpha = 1;
    }

    // bannière de fin
    if (combat.active && enemies.length) {
      const won = enemies.every(e => e.hp <= 0), lost = party.length && party.every(p => p.hp <= 0);
      if (won || lost) {
        const pulse = 1 + Math.sin(ts / 220) * 0.04;
        ctx.save(); ctx.translate(W / 2, 70); ctx.scale(pulse, pulse);
        outlineText(won ? "VICTOIRE !" : "DÉFAITE…", 0, 0, won ? "#ffd84a" : "#ff6a6a", 22);
        ctx.restore();
      }
    } else if (!combat.active) {
      outlineText("— Hors combat —", W / 2, 24, "#ffffffcc", 8);
    }
  }

  function toLocal(e) {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) / r.width * W, y: (t.clientY - r.top) / r.height * Hh };
  }
  function pick(p) {
    for (let i = hit.length - 1; i >= 0; i--) { const h = hit[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h.id; }
    return null;
  }

  H.Battle = {
    init(canvas, o) {
      cv = canvas; ctx = cv.getContext("2d"); opts = o || {};
      cv.width = W; cv.height = Hh;
      cv.addEventListener("mousemove", e => { hover = pick(toLocal(e)); cv.style.cursor = hover ? "pointer" : "default"; });
      cv.addEventListener("mouseleave", () => hover = null);
      cv.addEventListener("click", e => { const id = pick(toLocal(e)); if (id && opts.onPick) opts.onPick(id); });
    },
    start() {
      if (running) return;
      running = true;
      const chars = (H.state && H.state.chars) || {};
      for (const [id, c] of Object.entries(chars)) fx[id] = { last: c.hp, flash: 0, shake: 0 };  // pas d'effets rétroactifs
      requestAnimationFrame(frame);
    },
    stop() { running = false; },
    setTargetMode(b) { targetMode = !!b; },
    CONDS
  };
})();
