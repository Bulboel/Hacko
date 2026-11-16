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
      async peek(c) { try { return (JSON.parse(localStorage.getItem("hacko.room." + c) || "{}")).meta || null; } catch (e) { return null; } },
      async signInGM() { return uid; },
      prepare(c) { code = c; },
      async tryMember(c, u, data, key) {
        const s = JSON.parse(localStorage.getItem(this.k(c)) || "{}"), meta = s.meta;
        if (meta && meta.q && meta.gm !== u && !(s.gates && s.gates[key])) return { ok: false };
        s.members = s.members || {}; s.members[u] = { ...data, key: key || null }; if (!key) delete s.members[u].key;
        localStorage.setItem(this.k(c), JSON.stringify(s)); return { ok: true };
      },
      k: c => "hacko.room." + c,
      async setGate(c, hashes) { const s = JSON.parse(localStorage.getItem("hacko.room." + c) || "{}"); s.gates = hashes.length ? Object.fromEntries(hashes.map(h => [h, true])) : null; if (!s.gates) delete s.gates; localStorage.setItem("hacko.room." + c, JSON.stringify(s)); },
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
        const auth = firebase.auth();
        let user = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
        if (!user) user = (await auth.signInAnonymously()).user;
        uid = user.uid;
        db = firebase.database();
      },
      async peek(c) { try { return (await db.ref(`rooms/${c}/meta`).once("value")).val(); } catch (e) { return null; } },
      prepare(c) { code = c; ref = db.ref("rooms/" + c); },
      async tryMember(c, u, data, key) {
        try { await db.ref(`rooms/${c}/members/${u}`).set({ ...data, key: key || null }); return { ok: true }; }
        catch (e) { return { ok: false, err: e }; }
      },
      async setGate(c, hashes) { const o = {}; hashes.forEach(x => o[x] = true); await db.ref("gates/" + c).set(hashes.length ? o : null); },
      /* Compte e-mail du MJ : identité stable sur tous ses appareils. mode = "login" | "create" */
      async signInGM(email, password, mode) {
        const auth = firebase.auth();
        try {
          const cred = mode === "create" ? await auth.createUserWithEmailAndPassword(email, password) : await auth.signInWithEmailAndPassword(email, password);
          uid = cred.user.uid; return uid;
        } catch (e) {
          const m = { "auth/operation-not-allowed": "La connexion par e-mail n'est pas activée dans Firebase (Authentication → Sign-in method → E-mail/Mot de passe).", "auth/email-already-in-use": "Ce compte existe déjà : utilise « Me connecter ».", "auth/weak-password": "Mot de passe trop court (6 caractères minimum).", "auth/invalid-email": "Adresse e-mail invalide.", "auth/invalid-credential": "E-mail ou mot de passe incorrect (ou compte pas encore créé).", "auth/wrong-password": "Mot de passe incorrect.", "auth/user-not-found": "Compte inconnu : utilise « Créer mon compte MJ »." }[e.code];
          throw new Error(m || e.message);
        }
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
