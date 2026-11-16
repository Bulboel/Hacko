#!/usr/bin/env python3
"""Génère data/lexique-nof.js : fiches NON OFFICIELLES (hors SRD) rédigées pour Hacko avec nos propres mots.
Ce sont des résumés et adaptations, pas le texte des livres ; les chiffres sont indicatifs.
Usage : python3 tools/nonofficiel.py data/"""
import json, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else "data"
def race(n, a, src, taille, vit, bonus, traits, resume, idees=None):
    f = [["Source (non SRD)", src], ["Taille", taille], ["Vitesse", vit], ["Bonus de caractéristiques (indicatif)", bonus]]
    sec = [["Traits typiques", traits]]
    if idees: sec.append(["Pour la table", idees])
    return {"k": "race", "n": n, "a": a, "ic": "🧬", "s": "Race · " + src, "f": f, "d": resume, "sec": sec}
def classe(n, a, src, dv, car, role, traits, resume, idees=None):
    f = [["Source (non SRD)", src], ["Dé de vie", dv], ["Caractéristique clé", car], ["Rôle", role]]
    sec = [["Ce qui la caractérise", traits]]
    if idees: sec.append(["Pour la table", idees])
    return {"k": "classe", "n": n, "a": a, "ic": "🎓", "s": "Classe · " + src, "f": f, "d": resume, "sec": sec}
def mon(n, a, src, tp, fp, pv, ca, init, vit, traits, actions, resume, kind, acts):
    f = [["Source (non SRD)", src], ["Type", tp], ["Classe d'armure (indicatif)", ca], ["Points de vie (indicatif)", pv], ["Vitesse", vit], ["FP (indicatif)", fp]]
    return {"k": "monstre", "n": n, "a": a, "ic": "👾", "s": "Monstre · " + tp + " · FP " + fp, "f": f, "d": resume,
            "sec": [["Capacités", traits], ["Actions", actions]], "x": {"hp": pv, "ac": ca, "b": init, "k": kind, "acts": [{"n": x, "d": y} for x, y in acts]}, "cr": fp}

E = []
# ---------------- Races ----------------
E += [
 race("Dhampire", "Dhampir", "Van Richten's Guide to Ravenloft", "M ou P", "9 m", "variable selon la version du livre",
  ["Vision dans le noir : voit dans l'obscurité à courte distance.", "Morsure : une arme naturelle qui permet de se nourrir de sang pour récupérer des PV ou gagner un petit bonus temporaire.", "Marche des araignées : grimpe sur les surfaces sans effort.", "Nature à part : ni tout à fait vivant, ni mort-vivant ; certains effets d'ascendance vampirique s'appliquent."],
  ["Enfant d'un vampire et d'un mortel, le dhampire marche entre deux mondes : il a les sens et la grâce de la nuit, mais garde une âme bien vivante.", "Souvent solitaire, chasseur de monstres ou paria, il est un personnage idéal pour une campagne gothique."],
  ["Décidez avec le MJ si la faim de sang a des effets (règle maison : un jet de Sagesse pour résister après un long combat).", "Prévoyez un secret de famille : quel vampire est le parent ?"]),
 race("Aasimar", "Aasimar", "Volo's Guide to Monsters / Dungeon Master's Guide", "M", "9 m", "Charisme +2 (+ un bonus selon la lignée)",
  ["Vision dans le noir.", "Résistance aux dégâts nécrotiques et radiants.", "Mains guérisseuses : soigne un peu une fois par repos long.", "Lumière : émet une lueur douce sur commande.", "Révélation céleste (selon la lignée) : forme lumineuse avec ailes ou regard terrifiant pendant quelques rounds."],
  ["Humains touchés par une puissance céleste, les aasimars portent un rayonnement intérieur. Trois lignées : protecteur (guérison), fléau (éclat dévastateur), déchu (aura de peur).", "Ils sont souvent clercs, paladins ou sorciers."],
  ["Chaque aasimar peut avoir été « marqué » par un dieu précis : un bon point de départ d'histoire."]),
 race("Génasi", "Genasi", "Elemental Evil Player's Companion", "M", "9 m", "Constitution +2 (+ un bonus selon l'élément)",
  ["Quatre lignées : air, eau, feu, terre.", "Chaque lignée donne une affinité propre : résistance, souffle élémentaire ou déplacement particulier.", "Un petit sort lié à l'élément."],
  ["Descendants d'un génie ou d'une union avec un être élémentaire. Leur apparence trahit leur élément (peau cendrée, cheveux de flammes, reflets d'eau…).", "Beaucoup sont des sorciers ou des moines."],
  ["Un génasi du feu en voyage dans le désert, un génasi de l'eau dans un port : l'élément colore la personnalité."]),
 race("Goliath", "Goliath", "Elemental Evil Player's Companion", "M (grand)", "9 m", "Force +2, Constitution +1",
  ["Endurance de pierre : peut absorber une partie d'un coup reçu, quelques fois par repos.", "Athlète naturel (maîtrise d'Athlétisme).", "Adapté aux montagnes et au froid.", "Fort pour porter et pousser."],
  ["Grands (plus de 2 m), minces et musclés, les goliaths vivent sur les plus hauts sommets. Leur culture valorise la compétition équitable et le mérite.", "Guerriers, barbares et rôdeurs de choc."],
  ["Les goliaths comptent les actes de chacun : un bon ressort roleplay (« as-tu fait ta part ? »)."]),
 race("Tabaxi", "Tabaxi", "Volo's Guide to Monsters", "M", "9 m (escalade 6 m)", "Dextérité +2, Charisme +1",
  ["Vision dans le noir.", "Agilité féline : bondit en avant pour doubler sa vitesse, puis doit se reposer un peu.", "Griffes pour grimper et combattre.", "Maîtrise de Perception et de Discrétion."],
  ["Hommes-félins curieux, souvent en quête d'une histoire ou d'un objet précieux qui obsède leur clan. Roublards et bardes très populaires."],
  ["Obsession à choisir : un trésor, une chanson, une légende… elle guide le personnage."]),
 race("Kenku", "Kenku", "Volo's Guide to Monsters", "M", "9 m", "Dextérité +2, Sagesse +1",
  ["Expertise en contrefaçon : imite écritures et objets.", "Mimétisme sonore : reproduit des sons et des voix entendus, mais ne s'exprime que par imitation.", "Compétences à choisir parmi un petit lot (Discrétion, Tromperie, etc.)."],
  ["Oiseaux humanoïdes privés de leurs ailes et de leur voix propre. Ils parlent en citant : un défi de jeu de rôle réjouissant, avec des phrases entendues ailleurs."],
  ["Préparez 10 à 15 « répliques » à l'avance pour parler comme un kenku."]),
 race("Firbolg", "Firbolg", "Volo's Guide to Monsters", "M (grand)", "9 m", "Sagesse +2, Force +1",
  ["Magie des firbolgs : détection de la magie, camouflage léger et invisibilité de courte durée (par repos).", "Discours des bêtes et des plantes : échange simple avec animaux et végétaux.", "Gabarit imposant : porte et soulève comme une créature plus grosse."],
  ["Géants discrets des forêts, gardiens de la nature, très attachés à leur communauté. Druides, clercs de la nature, rôdeurs."],
  ["Beaucoup de firbolgs fuient la violence : idéal pour un personnage au grand cœur."]),
 race("Triton", "Triton", "Volo's Guide to Monsters", "M", "9 m (nage 9 m)", "Force, Constitution et Charisme +1",
  ["Amphibie : respire air et eau.", "Contrôle de l'air et de l'eau : quelques sorts liés à la mer.", "Émissaire de la mer : communique avec les animaux aquatiques.", "Gardien des profondeurs : résiste au froid et à la pression."],
  ["Peuple des profondeurs qui monte à la surface pour combattre les menaces marines. Souvent fiers, un peu hautains avec les « terriens »."]),
 race("Tortle", "Tortle", "Tomb of Annihilation (Tortle Package)", "M", "9 m", "Force +2, Sagesse +1",
  ["Carapace naturelle : CA de base 17 sans armure.", "Retient son souffle très longtemps.", "Griffes.", "Repli dans la carapace : défense très solide, mais on ne peut plus agir librement."],
  ["Peuple tranquille et nomade, qui porte sa maison sur le dos. Philosophes voyageurs, parfaits clercs et rôdeurs."]),
 race("Changeforme", "Changeling", "Eberron: Rising from the Last War", "M", "9 m", "Charisme +2, +1 au choix",
  ["Changement de forme : modifie son apparence (visage, voix, taille légère) par une action.", "Instinct trompeur : à l'aise pour mentir et lire les autres.", "Souvent maîtrise de deux compétences sociales."],
  ["Métamorphes nés avec un visage mouvant. Beaucoup cherchent à se faire accepter ; d'autres utilisent leur don pour l'espionnage."],
  ["Décidez à quel visage « de repos » le personnage revient quand il est seul."]),
 race("Forgé de guerre", "Warforged", "Eberron: Rising from the Last War", "M", "9 m", "Constitution +2, +1 au choix",
  ["Corps de construit : pas besoin de manger, respirer ni dormir de la même façon.", "Résilience : avantage contre certains poisons et maladies.", "Plaques d'acier : bonus naturel à la CA.", "Pas de sommeil : se met en veille."],
  ["Soldats mécaniques nés d'une guerre, devenus libres. Ils cherchent un but, une famille, une âme."],
  ["Gardez une trace de ce que le personnage ressent : sa quête d'humanité est un très bon moteur."]),
]
# ---------------- Classes ----------------
E += [
 classe("Artificier", "Artificer", "Eberron: Rising from the Last War / Tasha's Cauldron of Everything", "d8", "Intelligence", "Soutien et inventions",
  ["Incante en « bricolant » : ses sorts passent par des outils et objets (composantes d'inventeur).", "Infusions : imprègne temporairement des objets de pouvoirs magiques.", "Demi-lanceur de sorts : peu d'emplacements, mais utiles (soins, protection, dégâts).", "Compagnon mécanique ou arme conçue selon la sous-classe : Alchimiste, Armurier, Artilleur, Forgeron de bataille."],
  ["Inventeur-bricoleur de la magie, l'artificier fait de chaque objet un outil de combat ou de soutien. Le plus proche équivalent officiel d'un alchimiste."],
  ["Chaque sous-classe a un style : l'Alchimiste soigne et mélange les élixirs, l'Armurier devient un chevalier mécanique."]),
 classe("Chasseur de sang", "Blood Hunter", "Matt Mercer (Critical Role), publication hors livres officiels", "d10", "Force ou Dextérité + Intelligence", "Chasseur de monstres, combattant",
  ["Rites du sang : sacrifie un peu de sa vie pour imprégner ses armes d'énergies élémentaires.", "Traque du gibier : très fort contre les monstres maudits.", "Mutations (selon l'ordre) : gains de puissance contre créatures spécifiques.", "Quatre ordres : Chasseur de fantômes, Lycan, Mutant, Âme profane."],
  ["Guerrier maudit qui utilise sa propre vitalité pour traquer ce qui hante la nuit. Un très bon choix pour une campagne gothique ou « chasse aux monstres »."],
  ["Classe non officielle : demandez toujours l'accord du MJ avant de la jouer."]),
 classe("Alchimiste", "Alchemist (classe maison)", "Inspirée de Pathfinder et de nombreuses créations maison", "d8", "Intelligence", "Dégâts à distance, soutien",
  ["Bombes : lance des fioles explosives (feu, froid, acide…) à portée.", "Extraits : prépare des potions qui disparaissent si elles ne sont pas utilisées.", "Mutagènes : se dope temporairement pour devenir plus fort… avec un revers.", "Pas de lanceur de sorts à proprement parler : tout passe par des mixtures."],
  ["Il n'existe pas de classe « Alchimiste » officielle en 5e : on la joue d'ordinaire avec l'Artificier (sous-classe Alchimiste), ou avec une version maison. Cette fiche décrit l'idée générale."],
  ["Discutez avec le MJ du matériel nécessaire (fioles, herbes) et du temps de préparation."]),
 classe("Mystique", "Mystic", "Unearthed Arcana (test, jamais publié officiellement)", "d8", "Intelligence", "Psionique polyvalent",
  ["Pouvoirs psioniques plutôt que sorts : talents mentaux et disciplines.", "Points psioniques à dépenser pour amplifier les effets.", "Ordres : Avatar (combat), Immortel (résistance), Nomade (déplacement), Âme (esprit)."],
  ["Le mystique canalise le pouvoir de l'esprit. Le test jamais retenu comme classe officielle laisse beaucoup de variantes : à régler avec le MJ."]),
]
# ---------------- Monstres ----------------
E += [
 mon("Tyrannœil", "Beholder", "Monster Manual", "Aberration G", "13", 180, 18, 2, "vol 3 m (flottant)",
  ["Rayons oculaires : plusieurs yeux, chacun un effet différent (charme, paralysie, peur, ralentissement, désintégration, mort…).", "Œil central : cône qui annule la magie.", "Se tourne vers ses ennemis : peut utiliser des actions légendaires au tour des autres.", "Paranoïaque, il ne tolère pas les rivaux."],
  ["Morsure : attaque de corps à corps.", "Rayons oculaires : trois rayons au hasard par tour.", "Action légendaire : un rayon ou la fuite d'un adversaire."],
  ["Sphère volante couverte d'yeux : un monstre célèbre du jeu et un ennemi final de choix. À préparer soigneusement : très dangereux."], "slime",
  [("Morsure", "attaque de corps à corps"), ("Rayon oculaire", "effets variés, jet de sauvegarde")]),
 mon("Flagelleur mental", "Mind flayer", "Monster Manual", "Aberration M", "7", 71, 15, 1, "9 m",
  ["Explosion mentale : cône qui étourdit.", "Extraction de cerveau : tue les cibles à terre.", "Télépathie sur longue portée.", "Résistance à la magie."],
  ["Tentacules : attaque et agrippement.", "Explosion mentale : jet d'Intelligence.", "Sorts innés (lévitation, détection des pensées, domination)."],
  ["Tyran télépathe qui domine d'autres créatures. Il fait un redoutable chef de culte souterrain."], "gobelin",
  [("Tentacules", "attaque + agrippement"), ("Explosion mentale", "cône d'étourdissement")]),
 mon("Bête éclipsante", "Displacer beast", "Monster Manual", "Monstruosité G", "3", 85, 13, 2, "12 m",
  ["Déplacement : son image semble décalée : désavantage pour la toucher.", "Évitement : peut ne subir aucun dégât sur un jet de sauvegarde réussi.", "Chasseuse de la nuit, elle déteste la lumière vive."],
  ["Tentacules (2) : attaques.", "Morsure."],
  ["Panthère à six pattes et deux tentacules, dont l'image se décale. Un monstre d'embuscade dans la nuit."], "loup",
  [("Tentacules", "deux attaques"), ("Morsure", "attaque")]),
 mon("Colosse fouisseur", "Umber hulk", "Monster Manual", "Monstruosité G", "5", 93, 18, 0, "9 m (fouissement 6 m)",
  ["Fouissement : creuse la roche solide.", "Regard confusant : un jet de sauvegarde pour ne pas être confus.", "Vision aveugle et dans le noir."],
  ["Griffes (2) : dégâts importants.", "Mandibules.", "Regard confusant (réaction ou action)."],
  ["Un mastodonte souterrain qui traverse les murs : parfait pour surprendre un groupe dans un donjon."], "orc",
  [("Griffes", "deux attaques"), ("Mandibules", "attaque")]),
 mon("Charognard rampant", "Carrion crawler", "Monster Manual", "Monstruosité G", "2", 51, 13, 1, "9 m (escalade 9 m)",
  ["Escalade comme une araignée.", "Odorat très développé.", "Tentacules paralysantes."],
  ["Tentacules : poison paralysant.", "Morsure."],
  ["Gros ver à huit tentacules rampant dans les ruines. Danger : paralysie."], "slime",
  [("Tentacules", "poison paralysant"), ("Morsure", "attaque")]),
 mon("Kuo-toa", "Kuo-toa", "Monster Manual", "Humanoïde M", "1/4", 18, 13, 0, "9 m (nage 9 m)",
  ["Amphibie.", "Visqueux : s'échappe des prises.", "Sensible à la lumière du soleil.", "Fanatiques de leur dieu."],
  ["Lance.", "Filet : entrave.", "Morsure."],
  ["Humanoïdes poissons dégénérés des abysses : peuple fanatique."], "gobelin",
  [("Lance", "attaque"), ("Filet", "entrave")]),
 mon("Githyanki", "Githyanki", "Monster Manual", "Humanoïde M", "3", 49, 17, 2, "9 m",
  ["Psionique innée : quelques sorts (saut, pas brumeux…).", "Ennemis jurés des flagelleurs mentaux.", "Arme : grande épée d'argent des chefs."],
  ["Épée à deux mains.", "Attaque multiple.", "Sorts psioniques."],
  ["Guerriers du plan Astral, montés sur des dragons rouges. Redoutables et disciplinés."], "gobelin",
  [("Épée à deux mains", "dégâts importants"), ("Psionique", "sorts innés")]),
 mon("Yuan-ti sang-pur", "Yuan-ti pureblood", "Monster Manual", "Monstre humanoïde M", "1", 40, 11, 1, "9 m",
  ["Résistance à la magie.", "Insensible au poison.", "Sorts innés (communication avec les animaux, suggestion, etc.)."],
  ["Arc court.", "Cimeterre.", "Morsure empoisonnée."],
  ["Peuple serpent qui s'infiltre dans les cités en prenant forme humaine. Idéal pour intriguer et infiltrer."], "gobelin",
  [("Cimeterre", "attaque"), ("Arc court", "attaque à distance")]),
]
for e in E: e["ic"] = e.get("ic")
open(f"{OUT}/lexique-nof.js", "w").write("window.H=window.H||{};H.LEX=H.LEX||{};H.LEX.nof=" + json.dumps(E, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(E), "fiches non officielles")
