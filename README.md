# HACKO — la table de MJ partagée

Un outil pour mener tes parties de jeu de rôle **en direct, à 10 personnes maximum** (MJ compris) :

- ⚔ **Combat en 2D façon Final Fantasy** : ennemis à gauche, groupe à droite, pas en avant du personnage dont c'est le tour, chiffres de dégâts flottants, KO, bannière « VICTOIRE ! », 4 décors.
- 🎯 **Initiative & tours** : jet d'initiative (d20 + bonus), ordre des tours, rounds, bouton « Tour suivant ».
- 🧙 **Fiches modifiables en direct** : PV/PM, CA, états (empoisonné, étourdi…), inventaire avec quantités, actions possibles. Chacun édite *ses* personnages ; le MJ édite tout.
- 💥 **Dégâts / soins** en un clic (sur le terrain, la liste d'ordre ou la fiche). Les joueurs ne voient pas les PV exacts des ennemis (seulement « Blessé », « Critique »…).
- 📜 **Notes partagées** : n'importe qui publie (lieu, PNJ, quête, objet, indice), tout le monde lit, recherche et filtre.
- 🎲 **Dés & journal automatique** : d4 → d100 avec bonus, tout est consigné dans le journal commun. Export JSON de la partie pour le MJ.

## Lancer

Pas de build, pas de dépendance : ouvre `index.html` (ou publie sur GitHub Pages : *Settings → Pages → Deploy from a branch → `main` / root*).

### Mode démo local (par défaut)
Sans configuration, la synchro marche entre **les onglets du même navigateur** : parfait pour essayer (un onglet = un joueur).

### Jouer à distance : activer Firebase (gratuit, ~5 min)
1. Va sur <https://console.firebase.google.com> → **Ajouter un projet**.
2. **Build → Authentication → Sign-in method** : active **Anonyme**.
3. **Build → Realtime Database → Créer une base** (choisis la région Europe).
4. Onglet **Règles** : colle le contenu de [`database.rules.json`](database.rules.json) puis **Publier**.
5. **Paramètres du projet → Vos applications → Web (`</>`)** : copie l'objet de config dans [`firebase-config.js`](firebase-config.js) (la clé web est publique par conception ; la sécurité vient des règles).
6. Authentication → Settings → **Domaines autorisés** : ajoute ton domaine GitHub Pages (`<utilisateur>.github.io`).

### Utilisation
1. Le MJ clique **Créer une partie** et partage le **lien d'invitation** (clic sur `# CODE` en haut).
2. Les joueurs ouvrent le lien, saisissent leur nom, créent leur personnage (onglet *Personnages*).
3. Le MJ ajoute les ennemis, choisit le décor, clique **Lancer le combat**. À son tour, un joueur a un menu : *Attaquer / Actions / Objets / Fin de tour*.

## Modèle de confiance (règles de la base)
- Max. 10 membres par salle (vérifié côté serveur).
- Un personnage n'est modifiable que par son joueur et le MJ — **sauf les PV**, que tout membre peut changer (pour que les joueurs puissent infliger des dégâts aux ennemis, comme à une vraie table).
- Une note n'est supprimable que par son auteur ou le MJ.
- Les codes de salle sont courts : n'importe qui connaissant le code peut *lire* la salle. Ne mets rien de sensible dedans.

## Structure
```
index.html          interface
style.css           thème « fenêtres Final Fantasy »
firebase-config.js  ta config Firebase (vide = mode démo)
database.rules.json règles de sécurité à coller dans Firebase
js/sync.js          couche temps réel (Firebase ou local)
js/sprites.js       sprites pixel art dessinés par code
js/battle.js        scène de combat 2D (canvas)
js/app.js           logique et interface
```

> L'ancien prototype narratif solo « Hackénia » reste consultable dans l'historique git (commit `eef0a9e`).
