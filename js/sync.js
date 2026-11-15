"use strict";
/* Couche de synchronisation : Firebase (temps réel, persistant) ou mode démo local (onglets du même navigateur).
   Interface commune : init() · uid · mode · join(code, cb) · update({chemin: valeur|null}) · newId() */
window.H = window.H || {};

(function () {
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  function applyPaths(state, map) {
    for (const [p, v] of Object.entries(map)) {
      const parts = p.split("/");
      let o = state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof o[parts[i]] !== "object" || o[parts[i]] === null) o[parts[i]] = {};
        o = o[parts[i]];
      }
      const k = parts[parts.length - 1];
      if (v === null || v === undefined) delete o[k]; else o[k] = v;
    }
    return state;
  }

  /* ---------- Mode démo local ---------- */
  function LocalSync() {
    let code = null, cb = null;
    const key = c => "hacko.room." + c;
    const load = () => { try { return JSON.parse(localStorage.getItem(key(code)) || "{}"); } catch (e) { return {}; } };
    let uid = null;
    try { uid = sessionStorage.getItem("hacko.uid"); if (!uid) { uid = "local-" + newId(); sessionStorage.setItem("hacko.uid", uid); } }
    catch (e) { uid = "local-" + newId(); }
    const onStorage = e => { if (e.key === key(code) && cb) cb(load()); };
    return {
      mode: "local", uid, newId,
      async init() {},
      async join(c, callback) {
        code = c; cb = callback;
        window.addEventListener("storage", onStorage);
        cb(load());
      },
      update(map) {
        const s = applyPaths(load(), map);
        localStorage.setItem(key(code), JSON.stringify(s));
        cb && cb(s);
      },
      leave() { window.removeEventListener("storage", onStorage); cb = null; }
    };
  }

  /* ---------- Firebase ---------- */
  function load(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Chargement impossible : " + src));
      document.head.appendChild(s);
    });
  }

  function FirebaseSync(cfg) {
    let db = null, ref = null, code = null, uid = null, off = null;
    const V = "10.12.2";
    return {
      mode: "firebase", newId,
      get uid() { return uid; },
      async init() {
        const base = `https://www.gstatic.com/firebasejs/${V}/`;
        await load(base + "firebase-app-compat.js");
        await Promise.all([load(base + "firebase-auth-compat.js"), load(base + "firebase-database-compat.js")]);
        firebase.initializeApp(cfg);
        const cred = await firebase.auth().signInAnonymously();
        uid = cred.user.uid;
        db = firebase.database();
      },
      join(c, callback) {
        code = c;
        ref = db.ref("rooms/" + c);
        return new Promise((resolve, reject) => {
          let first = true;
          const handler = snap => { callback(snap.val() || {}); if (first) { first = false; resolve(); } };
          ref.on("value", handler, err => { if (first) { first = false; reject(err); } });
          off = () => ref.off("value", handler);
          // présence
          db.ref(".info/connected").on("value", s => {
            if (s.val() === true && ref) {
              const p = db.ref(`rooms/${code}/members/${uid}/online`);
              p.onDisconnect().set(false).then(() => p.set(true)).catch(() => {});
            }
          });
        });
      },
      update(map) {
        const clean = {};
        for (const [k, v] of Object.entries(map)) clean[k] = v === undefined ? null : v;
        return ref.update(clean).catch(e => H.toast && H.toast("Écriture refusée : " + e.message, "err"));
      },
      leave() { off && off(); db && db.ref(".info/connected").off(); ref = null; }
    };
  }

  H.createSync = () => {
    const cfg = window.HACKO_FIREBASE;
    return cfg && cfg.apiKey && cfg.databaseURL ? FirebaseSync(cfg) : LocalSync();
  };
  H.newId = newId;
})();
