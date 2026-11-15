# HACKO — la table de MJ partagée

Un outil pour mener tes parties de jeu de rôle **en direct, à 10 personnes maximum** (MJ compris) :

- ⚔ **Combat en 2D façon Final Fantasy** : ennemis à gauche, groupe à droite, pas en avant du personnage dont c'est le tour, chiffres de dégâts flottants, KO, bannière « VICTOIRE ! », 4 décors.
- 🎯 **Initiative & tours** : jet d'initiative (d20 + bonus), ordre des tours, rounds, bouton « Tour suivant ».
- 🧙 **Fiches modifiables en direct** : PV/PM, CA, états (empoisonné, étourdi…), inventaire avec quantités, actions possibles. Chacun édite *ses* personnages ; le MJ édite tout.
- 💥 **Dégâts / soins** en un clic (sur le terrain, la liste d'ordre ou la fiche). Les joueurs ne voient pas les PV exacts des ennemis (seulement « Blessé », « Critique »…).
- ⚑ **Effets du MJ** : le MJ pose sur n'importe quel personnage un *avantage*, un *désavantage*, un *bonus*, un *malus* ou une *note* (« aux tests de Perception », « −1d4 aux jets »…), avec une durée en rounds si besoin. L'effet s'affiche sur la fiche, dans le menu de tour, sur le terrain et dans la liste du groupe, et le joueur est prévenu.
- 📚 **Lexique** : recherche instantanée (quelques lettres suffisent, accents ignorés, noms français ou anglais) dans le SRD 5.1 : 334 monstres, 237 objets avec prix, 362 objets magiques, 319 sorts, classes, races, règles et états. Filtres (type, FP, catégorie, prix, rareté, niveau, école, classe), tri, flèches ↑↓ pour parcourir. Depuis une fiche : *ajouter au combat* (×N, avec PV, CA, initiative et attaques), *ajouter à l'inventaire*, *ajouter aux actions*.
- 📜 **Notes partagées** : n'importe qui publie (lieu, PNJ, quête, objet, indice), tout le monde lit, recherche et filtre.
- 🎲 **Dés & journal automatique** : d4 → d100 avec bonus, tout est consigné dans le journal commun. Export JSON de la partie pour le MJ.

## Lancer

Pas de build, pas de dépendance : ouvre `index.html` (ou publie sur GitHub Pages : *Settings → Pages → Deploy from a branch → `main` / root*).

### Mode démo local (par défaut)
Sans configuration, la synchro marche entre **les onglets du même navigateur** : parfait pour essayer (un onglet = un joueur).

### Jouer à distance : activer Firebase (gratuit, ~5 min)
1. Va sur <https://console.firebase.google.com> → **Ajouter un projet**.
2. **Authentication → Sign-in method** : active **Anonyme** *et* **E-mail/Mot de passe** (ce dernier sert au compte MJ).
3. **Build → Realtime Database → Créer une base** (choisis la région Europe).
4. Onglet **Règles** : colle le contenu de [`database.rules.json`](database.rules.json) puis **Publier**.
5. **Paramètres du projet → Vos applications → Web (`</>`)** : copie l'objet de config dans [`firebase-config.js`](firebase-config.js) (la clé web est publique par conception ; la sécurité vient des règles).
6. Authentication → Settings → **Domaines autorisés** : ajoute ton domaine GitHub Pages (`<utilisateur>.github.io`).

### Utilisation
Il y a **deux tables fixes** : *La compagnie du rêve* et *Le trio infernal* (le MJ peut les renommer en cliquant sur le nom en haut). Pas de code à saisir.

**MJ** : sur la page d'accueil, clique sur *Je suis le MJ* sous ta table, puis *Créer mon compte MJ* (e-mail + mot de passe, une seule fois) : ce compte te rend ta table sur n'importe quel appareil. Ensuite, dans *Personnages* : **📥 Personnages enregistrés** ajoute d'un clic les fiches déjà prêtes (Bolduc, Eberien, Jhimm).

**Joueurs** : ouvrent le site, écrivent leur prénom, cliquent sur *Rejoindre*. Un écran *« Qui es-tu ? »* propose les personnages qui attendent leur joueur (le leur est mis en avant) : un clic sur **C'est moi** et tout est rempli. Pas de personnage prêt ? L'**assistant de création** demande race, classe, sous-classe et niveau, puis propose automatiquement capacités, emplacements de sorts et sorts disponibles. Ils retrouvent leur personnage à chaque visite ; *💾 Enregistrer sur cet appareil* et *⬇ Exporter la fiche* servent de sauvegarde.

**Fiche** : onglets *Général* (PV, CA, initiative, effets du MJ, inventaire, actions), *Caractéristiques* (modificateurs, sauvegardes, compétences), *Sorts* (emplacements à cocher, sorts préparés, bouton *Lancer* qui consomme l'emplacement), *Capacités*, *Histoire*. *⬆ Monter de niveau* met à jour PV, emplacements et capacités.

## Modèle de confiance (règles de la base)
- Max. 10 membres par salle : limite appliquée par l'application (Firebase ne sait pas compter les membres dans ses règles).
- Un personnage n'est modifiable que par son joueur et le MJ (un personnage « à réclamer » peut être pris par n'importe quel membre de la table) — **sauf les PV**, que tout membre peut changer (pour que les joueurs puissent infliger des dégâts aux ennemis, comme à une vraie table).
- Les effets du MJ (`fx`) ne sont modifiables que par le MJ.
- Une note n'est supprimable que par son auteur ou le MJ.
- Les deux tables ont des adresses fixes : quiconque connaît l'adresse du site peut entrer comme joueur. C'est pensé pour un groupe d'amis ; ne mets rien de sensible dedans.

## Données du lexique
Source : **SRD 5.1** sous Open Game License 1.0a, via [5e-bits/5e-database](https://github.com/5e-bits/5e-database) (MIT). Sorts, objets, classes, races et règles sont en français ; le SRD n'a pas de monstres ni d'objets magiques en français : leurs noms et caractéristiques sont traduits, les textes des capacités restent en anglais. Pour régénérer : `python3 tools/build-lexique.py <5e-database>/src/2014 data/`.

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
js/lexique.js       onglet Lexique (recherche, filtres, ajout au jeu)
js/persos.js        création de personnage, fiche à onglets, sorts, réclamation
data/premades.js    fiches pré-enregistrées des joueurs
data/               données du lexique (générées)
tools/              script de génération des données
```

> L'ancien prototype narratif solo « Hackénia » reste consultable dans l'historique git (commit `eef0a9e`).
