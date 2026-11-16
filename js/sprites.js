"use strict";
/* Sprites « pixel art » dessinés par code (style Final Fantasy 4-6, côté droit visible).
   Repère local : pieds en (0,0), y vers le haut = négatif, personnage tourné vers +x. */
window.H = window.H || {};

(function () {
  const SKIN = "#f0c8a0";

  function human(R, o, extra) {
    const sk = o.skin || SKIN;
    R(-3, -8, 3, 8, o.legs || "#4a4a58"); R(1, -8, 3, 8, o.legs || "#4a4a58");
    R(-4, -3, 4, 3, "#3a2a1e"); R(1, -3, 5, 3, "#3a2a1e");
    R(-4, -17, 9, 10, o.body);
    R(-4, -9, 9, 1, "#4a321c");
    R(-6, -16, 2, 8, o.body); R(5, -16, 2, 8, o.body);
    R(-6, -9, 2, 2, sk); R(5, -9, 2, 2, sk);
    R(-3, -24, 7, 8, sk);
    R(1, -21, 1, 2, "#1a1a1a"); R(3, -21, 1, 2, "#1a1a1a");
    if (o.acc) { R(-5, -17, 3, 2, o.acc); R(4, -17, 3, 2, o.acc); }
    extra && extra(R, o);
  }
  const sword = (R, c = "#e4e8f0", h = "#d8b030") => { R(7, -23, 1, 14, c); R(6, -10, 3, 1, h); R(7, -9, 1, 2, "#5a3a1e"); };
  const shield = (R, c = "#8b3a3a") => { R(-10, -17, 5, 8, c); R(-9, -15, 3, 4, "#e2bc50"); };

  const KINDS = {
    guerrier: { size: 1, draw: (R, o) => human(R, { ...o, body: "#4a72b0", legs: "#505868" }, R => {
      R(-4, -25, 9, 4, "#b0b8c8"); R(-4, -22, 2, 4, "#b0b8c8"); R(4, -22, 1, 3, "#b0b8c8"); R(0, -27, 3, 2, o.acc);
      sword(R); shield(R);
    }) },
    paladin: { size: 1, draw: (R, o) => human(R, { ...o, body: "#e4e6f0", legs: "#8890a0" }, R => {
      R(-4, -25, 9, 4, "#e0b840"); R(-4, -22, 2, 4, "#e0b840"); R(-1, -28, 3, 3, "#fff");
      sword(R, "#fff8d0", "#e0b840"); shield(R, "#3a5ab8");
    }) },
    mage: { size: 1, draw: (R, o) => human(R, { ...o, body: "#5c40a4" }, R => {
      R(-5, -17, 11, 15, "#5c40a4"); R(-5, -4, 11, 2, o.acc); R(-4, -2, 9, 2, "#46308a");
      R(-5, -26, 11, 3, "#46308a"); R(-4, -29, 8, 3, "#5c40a4"); R(-2, -32, 4, 3, "#46308a"); R(1, -34, 3, 2, "#7c60c4");
      R(1, -21, 1, 2, "#1a1a1a"); R(3, -21, 1, 2, "#1a1a1a");
      R(8, -28, 1, 26, "#7a5230"); R(7, -31, 3, 3, "#7ee0ff"); R(8, -32, 1, 1, "#fff");
    }) },
    clerc: { size: 1, draw: (R, o) => human(R, { ...o, body: "#eae6d8", legs: "#bcb49c" }, R => {
      R(-4, -17, 9, 1, "#e0b840"); R(0, -17, 1, 9, "#e0b840");
      R(-4, -25, 9, 3, "#8a6a3a");
      R(8, -22, 1, 14, "#7a5230"); R(6, -25, 5, 3, "#e8c850"); R(8, -27, 1, 7, "#e8c850");
    }) },
    rodeur: { size: 1, draw: (R, o) => human(R, { ...o, body: "#3f7a48", legs: "#5a4430" }, R => {
      R(-4, -25, 9, 3, "#2c5a34"); R(-5, -23, 2, 8, "#2c5a34");
      R(-7, -17, 2, 12, "#2c5a34");
      R(8, -24, 1, 18, "#7a5230"); R(9, -23, 1, 2, "#7a5230"); R(9, -9, 1, 2, "#7a5230"); R(7, -15, 1, 1, "#ddd");
    }) },
    voleur: { size: 1, draw: (R, o) => human(R, { ...o, body: "#34343e", legs: "#26262e" }, R => {
      R(-4, -25, 9, 5, "#202028"); R(-4, -21, 1, 4, "#202028"); R(0, -20, 5, 2, "#202028");
      R(1, -21, 1, 2, "#f0f0f0"); R(3, -21, 1, 2, "#f0f0f0");
      R(7, -14, 1, 7, "#d0d4e0"); R(6, -8, 3, 1, "#7a5230");
    }) },
    barde: { size: 1, draw: (R, o) => human(R, { ...o, body: "#b44a30", legs: "#3a4a6a" }, R => {
      R(-4, -25, 9, 3, "#7a30a8"); R(3, -31, 1, 6, "#ff70c8"); R(2, -31, 1, 2, "#ff70c8");
      R(-5, -23, 2, 2, "#7a30a8");
      R(6, -14, 6, 6, "#c88a3a"); R(8, -12, 2, 2, "#4a2a10"); R(11, -22, 1, 9, "#7a5230");
    }) },
    generic: { size: 1, draw: (R, o) => human(R, { ...o, body: "#6a8a4a" }, R => {
      R(-4, -25, 9, 3, "#6a4a2a"); R(-4, -22, 2, 3, "#6a4a2a");
      R(7, -20, 1, 12, "#9a7a4a");
    }) },

    /* ---------- Monstres ---------- */
    slime: { size: 1, bob: 2, draw: (R, o) => {
      const c = "#58c468", d = "#3a9a4a";
      R(-7, -3, 15, 3, c); R(-6, -6, 13, 3, c); R(-5, -9, 11, 3, c); R(-3, -11, 7, 2, c); R(-7, -1, 15, 1, d);
      R(-4, -8, 2, 2, "#d8ffe0"); R(-3, -6, 2, 3, "#fff"); R(2, -6, 2, 3, "#fff"); R(3, -5, 1, 2, "#111"); R(-2, -5, 1, 2, "#111");
    } },
    loup: { size: 1, draw: (R, o) => {
      const c = "#7c7c8c", d = "#5a5a68";
      R(-9, -11, 15, 6, c); R(-9, -6, 15, 2, d);
      R(-8, -5, 2, 5, d); R(-4, -5, 2, 5, c); R(2, -5, 2, 5, d); R(5, -5, 2, 5, c);
      R(-13, -13, 5, 2, c); R(-15, -15, 3, 2, c);
      R(5, -16, 7, 7, c); R(10, -13, 5, 3, "#9a9aa8"); R(14, -13, 1, 1, "#111");
      R(5, -19, 2, 3, c); R(9, -19, 2, 3, c); R(8, -15, 2, 1, "#ff4040"); R(11, -10, 3, 1, "#fff");
    } },
    gobelin: { size: 0.85, draw: (R, o) => human(R, { ...o, skin: "#7cb04c", body: "#6a4a2a", legs: "#4a3a22", acc: null }, R => {
      R(-7, -22, 4, 2, "#7cb04c"); R(5, -22, 4, 2, "#7cb04c"); R(1, -21, 1, 2, "#ff3030"); R(3, -21, 1, 2, "#ff3030");
      R(7, -14, 1, 8, "#bcc"); R(6, -7, 3, 1, "#5a3a1e");
    }) },
    squelette: { size: 1, draw: (R, o) => human(R, { ...o, skin: "#e8e6d8", body: "#e8e6d8", legs: "#d0cebe", acc: null }, R => {
      R(-4, -15, 9, 1, "#444"); R(-4, -13, 9, 1, "#444"); R(-4, -11, 9, 1, "#444");
      R(-2, -21, 2, 3, "#111"); R(1, -21, 2, 3, "#111"); R(0, -18, 3, 1, "#111");
      R(7, -22, 1, 14, "#a08060"); R(6, -9, 3, 1, "#5a3a1e");
    }) },
    orc: { size: 1.3, draw: (R, o) => human(R, { ...o, skin: "#6a9a4a", body: "#5a4030", legs: "#3a3028", acc: "#a03030" }, R => {
      R(1, -21, 1, 2, "#ff3030"); R(3, -21, 1, 2, "#ff3030");
      R(0, -17, 1, 2, "#fff"); R(3, -17, 1, 2, "#fff");
      R(8, -26, 1, 16, "#6a4a2a"); R(6, -28, 5, 6, "#aab"); R(10, -27, 2, 4, "#aab");
    }) },
    chauve: { size: 0.9, bob: 4, draw: (R, o) => {
      const f = Math.sin((o.t || 0) / 110) > 0 ? 0 : 3;
      R(-3, -18, 6, 7, "#4a3a5c"); R(-3, -21, 2, 3, "#4a3a5c"); R(2, -21, 2, 3, "#4a3a5c");
      R(-13, -19 + f, 10, 3, "#6a5a80"); R(-10, -16 + f, 7, 3, "#6a5a80"); R(4, -19 + f, 10, 3, "#6a5a80"); R(4, -16 + f, 7, 3, "#6a5a80");
      R(-2, -16, 1, 1, "#ff4040"); R(1, -16, 1, 1, "#ff4040"); R(0, -12, 1, 2, "#fff");
    } },
    dragon: { size: 1.5, draw: (R, o) => {
      const c = "#b0342e", d = "#8a2420", b = "#e8a850";
      R(-12, -14, 5, 3, c); R(-15, -12, 4, 2, c); R(-17, -11, 3, 2, d);
      R(-8, -17, 17, 10, c); R(-6, -10, 13, 3, b); R(-8, -17, 17, 2, d);
      R(-6, -7, 3, 7, d); R(3, -7, 3, 7, d); R(-7, -2, 5, 2, "#222"); R(2, -2, 5, 2, "#222");
      R(5, -22, 5, 7, c); R(8, -29, 4, 9, c); R(8, -32, 7, 5, c); R(14, -30, 4, 3, c); R(17, -29, 1, 1, "#111");
      R(9, -35, 2, 3, "#f0e0a0"); R(12, -35, 2, 3, "#f0e0a0"); R(11, -31, 2, 1, "#ffe040");
      R(15, -27, 3, 1, "#fff");
      R(-8, -26, 4, 9, d); R(-5, -30, 4, 13, c); R(-2, -26, 4, 9, d);
    } }
  };

  const CLASS_TO_KIND = { "Guerrier": "guerrier", "Magicien": "mage", "Clerc": "clerc", "Rôdeur": "rodeur", "Roublard": "voleur", "Barde": "barde", "Paladin": "paladin", "Autre": "generic", "Druide": "rodeur", "Barbare": "guerrier", "Moine": "generic", "Ensorceleur": "mage", "Occultiste": "mage", "Artificier": "mage", "Alchimiste": "mage", "Mystique": "mage", "Chasseur de sang": "guerrier" };

  H.Sprites = {
    kinds: Object.keys(KINDS),
    classToKind: c => CLASS_TO_KIND[c] || "generic",
    size: k => (KINDS[k] || KINDS.generic).size,
    bob: k => (KINDS[k] || KINDS.generic).bob || 1,
    /* ctx déjà translaté sur les pieds et mis à l'échelle ; o = {acc, flash, t} */
    draw(ctx, kind, o) {
      const K = KINDS[kind] || KINDS.generic;
      const flash = o.flash;
      const R = (x, y, w, h, c) => { ctx.fillStyle = flash ? "#fff" : c; ctx.fillRect(x, y, w, h); };
      K.draw(R, { acc: o.acc || "#d9b44a", t: o.t || 0 });
    }
  };
})();
