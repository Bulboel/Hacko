"use strict";
/* Panneau d'affichage : post-it (texte, couleur, image) déplaçables par tous en direct.
   Données : board/<id> = { a, an, c, t, img, x, y, z, r, ts }  (x,y en % du panneau). */
(function () {
  const COLORS = { jaune: "#fff3a0", rose: "#ffc0d6", vert: "#c4f0b4", bleu: "#bfe0ff", orange: "#ffd2a0", blanc: "#f6f6f2" };
  const MAX_NOTES = 80, MAX_IMAGES = 40;
  const els = new Map();
  let seenCount = null;

  const notes = () => Object.entries(S.board || {}).map(([id, n]) => ({ ...n, id }));
  const canEditNote = n => isGM() || n.a === uid();

  /* ---- Image : redimensionnée et compressée avant stockage (reste dans la base, pas de service de fichiers) ---- */
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        let max = 640, q = 0.72, data;
        for (let i = 0; i < 4; i++) {
          const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          data = c.toDataURL("image/jpeg", q);
          if (data.length < 140000) break;
          max *= 0.8; q -= 0.08;
        }
        URL.revokeObjectURL(url); res(data);
      };
      img.onerror = () => rej(new Error("Image illisible"));
      img.src = url;
    });
  }

  /* ---- Création / édition ---- */
  function openEditor(n) {
    let color = n ? n.c : "jaune", img = n ? n.img || null : null;
    const ta = h("textarea", { rows: 4, maxlength: 300, placeholder: "Une info rapide, un indice, un nom de PNJ…" }, n ? n.t : "");
    const prev = h("div", { class: "imgprev" });
    const showPrev = () => prev.replaceChildren(...(img ? [h("img", { src: img }), h("button", { type: "button", class: "btn sm ghost", onclick: () => { img = null; showPrev(); } }, "✕ Retirer l'image")] : []));
    showPrev();
    const file = h("input", { type: "file", accept: "image/*", onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { img = await shrink(f); showPrev(); } catch (er) { toast("Image illisible", "err"); }
    } });
    const seg = h("div", { class: "swatches" }, Object.entries(COLORS).map(([k, v]) => h("button", { type: "button", class: k === color ? "on" : "", style: `background:${v}`, title: k, "data-k": k, onclick: () => { color = k; seg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); } })));
    const form = h("form", { onsubmit: e => {
      e.preventDefault();
      const t = ta.value.trim(); if (!t && !img) return;
      if (!n && notes().length >= MAX_NOTES) return toast("Le panneau est plein : retire quelques post-it.", "err");
      if (img && !(n && n.img) && notes().filter(x => x.img).length >= MAX_IMAGES) return toast("Trop d'images sur le panneau : retire-en quelques-unes.", "err");
      if (n) write({ [`board/${n.id}/t`]: t, [`board/${n.id}/c`]: color, [`board/${n.id}/img`]: img });
      else {
        const z = Math.max(0, ...notes().map(x => x.z || 0)) + 1;
        write({ ["board/" + sync.newId()]: { a: uid(), an: myName, c: color, t, img, x: 8 + Math.random() * 60, y: 6 + Math.random() * 50, z, r: Math.round((Math.random() * 6 - 3) * 10) / 10, ts: Date.now() } });
      }
      closeModal();
    } }, h("h3", {}, n ? "Modifier le post-it" : "📌 Nouveau post-it"), ta,
      h("label", {}, "Image (photo, dessin, capture…)", file), prev,
      h("label", {}, "Couleur", seg), h("button", { class: "btn gold" }, n ? "Enregistrer" : "Épingler au panneau"));
    openModal(form, "sm"); setTimeout(() => ta.focus(), 30);
  }

  function lightbox(src, text) {
    openModal(h("div", {}, h("img", { src, class: "lbimg" }), text ? h("p", {}, text) : null), "wide");
  }

  /* ---- Élément post-it + déplacement ---- */
  function build(id) {
    const el = h("div", { class: "pn", "data-id": id });
    let drag = null, lastSend = 0;
    el.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      const b = $("#board").getBoundingClientRect(), n = S.board[id]; if (!n) return;
      drag = { sx: e.clientX, sy: e.clientY, x: n.x, y: n.y, w: b.width, h: b.height, moved: false, img: !!e.target.closest(".pimg") };
      el.setPointerCapture(e.pointerId); el.classList.add("drag");
      const z = Math.max(0, ...notes().map(x => x.z || 0)) + 1; el.style.zIndex = z; drag.z = z;
    });
    el.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      drag.nx = Math.max(0, Math.min(88, drag.x + dx / drag.w * 100)); drag.ny = Math.max(0, Math.min(88, drag.y + dy / drag.h * 100));
      el.style.left = drag.nx + "%"; el.style.top = drag.ny + "%";
      const t = Date.now(); if (t - lastSend > 90) { lastSend = t; write({ [`board/${id}/x`]: drag.nx, [`board/${id}/y`]: drag.ny }); }
    });
    const end = e => {
      if (!drag) return; const d = drag; drag = null; el.classList.remove("drag");
      if (d.moved) write({ [`board/${id}/x`]: d.nx, [`board/${id}/y`]: d.ny, [`board/${id}/z`]: d.z });
      else if (d.img && S.board[id]) lightbox(S.board[id].img, S.board[id].t);
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    el.isDragging = () => !!drag;
    return el;
  }

  function fill(el, n) {
    el.style.background = COLORS[n.c] || COLORS.jaune; el.style.transform = `rotate(${n.r || 0}deg)`;
    if (!el.isDragging()) { el.style.left = n.x + "%"; el.style.top = n.y + "%"; el.style.zIndex = n.z || 1; }
    const sig = [n.t, n.img ? n.img.length : 0, n.an, canEditNote(n)].join("|");
    if (el._sig === sig) return; el._sig = sig;
    el.classList.toggle("withimg", !!n.img);
    el.replaceChildren(...[h("i", { class: "pin" }),
      n.img ? h("img", { class: "pimg", src: n.img, draggable: false, alt: "" }) : null,
      n.t ? h("p", {}, n.t) : null, h("small", {}, "— " + n.an),
      canEditNote(n) ? h("span", { class: "pact" }, h("button", { title: "Modifier", onclick: () => openEditor(n) }, "✎"), h("button", { title: "Retirer", onclick: () => write({ ["board/" + n.id]: null }) }, "✕")) : null].filter(Boolean));
  }

  function render() {
    const board = $("#board"); if (!board || !S.meta) return;
    const list = notes(), ids = new Set(list.map(n => n.id));
    for (const [id, el] of els) if (!ids.has(id)) { el.remove(); els.delete(id); }
    for (const n of list) { let el = els.get(n.id); if (!el) { el = build(n.id); els.set(n.id, el); board.append(el); } fill(el, n); }
    $("#board-empty").hidden = list.length > 0;
    const bar = $("#board-bar");
    if (!bar.dataset.ready) {
      bar.dataset.ready = 1;
      bar.append(h("button", { class: "btn gold", onclick: () => openEditor(null) }, "📌 Nouveau post-it"), h("span", { class: "muted small" }, "Glisse un post-it pour le déplacer. Clique sur une image pour l'agrandir."), h("span", { id: "board-gm" }));
    }
    $("#board-gm").replaceChildren(...(isGM() && list.length ? [h("button", { class: "btn sm danger", onclick: () => { if (confirm("Retirer tous les post-it du panneau ?")) write({ board: null }); } }, "Vider le panneau")] : []));
  }

  function onState(prev) {
    const n = Object.keys(S.board || {}).length;
    if (seenCount != null && n > seenCount && tab !== "board") {
      const latest = notes().sort((a, b) => b.ts - a.ts)[0];
      if (latest && latest.a !== uid()) toast(`📌 ${latest.an} a épinglé un post-it`);
    }
    seenCount = n;
  }
  H.Board = { render, onState, reset() { els.clear(); const b = $("#board"); b && b.querySelectorAll(".pn").forEach(e => e.remove()); seenCount = null; } };
})();
