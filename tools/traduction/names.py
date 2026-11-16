# Traductions des noms (objets magiques et monstres restants)
import re
COL = {"Black":"noir","Blue":"bleu","Brass":"d'airain","Bronze":"de bronze","Copper":"de cuivre","Gold":"d'or","Green":"vert","Red":"rouge","Silver":"d'argent","White":"blanc"}
GIANT = {"Hill":"des collines","Stone":"de pierre","Frost":"du givre","Fire":"de feu","Cloud":"des nuages","Storm":"des tempêtes"}
RES = {"Acid":"à l'acide","Cold":"au froid","Fire":"au feu","Force":"à la force","Lightning":"à la foudre","Necrotic":"nécrotique","Poison":"au poison","Psychic":"psychique","Radiant":"radiante","Thunder":"au tonnerre"}
ELEM = {"Air":"de l'air","Earth":"de la terre","Fire":"du feu","Water":"de l'eau"}
IOUN = {"Absorption":"d'absorption","Agility":"d'agilité","Awareness":"de conscience","Fortitude":"de vigueur","Greater Absorption":"d'absorption supérieure","Insight":"de perspicacité","Intellect":"d'intelligence","Leadership":"de commandement","Mastery":"de maîtrise","Protection":"de protection","Regeneration":"de régénération","Reserve":"de réserve","Strength":"de force","Sustenance":"de subsistance"}
SPELLLV = {"Cantrip":"sort mineur","1st":"niveau 1","2nd":"niveau 2","3rd":"niveau 3","4th":"niveau 4","5th":"niveau 5","6th":"niveau 6","7th":"niveau 7","8th":"niveau 8","9th":"niveau 9"}
FIG = {"Bronze Griffon":"Griffon de bronze","Ebony Fly":"Mouche d'ébène","Golden Lions":"Lions d'or","Ivory Goats":"Chèvres d'ivoire","Marble Elephant":"Éléphant de marbre","Obsidian Steed":"Destrier d'obsidienne","Onyx Dog":"Chien d'onyx","Serpentine Owl":"Chouette de serpentine","Silver Raven":"Corbeau d'argent"}
FEA = {"Anchor":"ancre","Bird":"oiseau","Fan":"éventail","Swan Boat":"bateau-cygne","Tree":"arbre","Whip":"fouet"}
HORN = {"Silver":"d'argent","Brass":"d'airain","Bronze":"de bronze","Iron":"de fer"}
BAG = {"Gray":"gris","Rust":"rouille","Tan":"beige"}
CARPET = {"3 ft. × 5 ft.":"0,9 m × 1,5 m","4 ft. × 6 ft.":"1,2 m × 1,8 m","5 ft. × 7 ft.":"1,5 m × 2,1 m","6 ft. × 9 ft.":"1,8 m × 2,7 m"}
FIX = {
"Adamantine Armor":"Armure d'adamantium","Ammunition, +1, +2, or +3":"Munition, +1, +2 ou +3","Ammunition, +1":"Munition, +1","Ammunition, +2":"Munition, +2","Ammunition, +3":"Munition, +3",
"Amulet of Health":"Amulette de santé","Amulet of Proof against Detection and Location":"Amulette de protection contre la détection et la localisation","Amulet of the Planes":"Amulette des plans",
"Animated Shield":"Bouclier animé","Apparatus of the Crab":"Appareil du crabe","Armor, +1, +2, or +3":"Armure, +1, +2 ou +3","Armor, +1":"Armure, +1","Armor, +2":"Armure, +2","Armor, +3":"Armure, +3",
"Armor of Invulnerability":"Armure d'invulnérabilité","Armor of Resistance":"Armure de résistance","Armor of Vulnerability":"Armure de vulnérabilité","Arrow-Catching Shield":"Bouclier attire-flèches","Arrow of Slaying":"Flèche d'extermination",
"Bag of Beans":"Sac de haricots","Bag of Devouring":"Sac dévoreur","Bag of Holding":"Sac sans fond","Bag of Tricks":"Sac à malices","Bead of Force":"Perle de force","Belt of Dwarvenkind":"Ceinture des nains","Belt of Giant Strength":"Ceinture de force de géant",
"Berserker Axe":"Hache de berserker","Boots of Elvenkind":"Bottes elfiques","Boots of Levitation":"Bottes de lévitation","Boots of Speed":"Bottes de rapidité","Boots of Striding and Springing":"Bottes de marche et de saut","Boots of the Winterlands":"Bottes des terres du froid",
"Bowl of Commanding Water Elementals":"Bol de contrôle des élémentaires de l'eau","Bracers of Archery":"Brassards d'archerie","Bracers of Defense":"Brassards de défense","Brazier of Commanding Fire Elementals":"Brasero de contrôle des élémentaires du feu",
"Brooch of Shielding":"Broche de protection","Broom of Flying":"Balai volant","Candle of Invocation":"Bougie d'invocation","Cape of the Mountebank":"Cape du saltimbanque","Carpet of Flying":"Tapis volant",
"Censer of Controlling Air Elementals":"Encensoir de contrôle des élémentaires de l'air","Chime of Opening":"Carillon d'ouverture","Circlet of Blasting":"Diadème de rayon","Cloak of Arachnida":"Cape d'arachnide","Cloak of Displacement":"Cape de déplacement",
"Cloak of Elvenkind":"Cape elfique","Cloak of Protection":"Cape de protection","Cloak of the Bat":"Cape de la chauve-souris","Cloak of the Manta Ray":"Cape de la raie manta","Crystal Ball":"Boule de cristal","Crystal Ball of Mind Reading":"Boule de cristal de lecture des pensées",
"Crystal Ball of Telepathy":"Boule de cristal de télépathie","Crystal Ball of True Seeing":"Boule de cristal de vision lucide","Cube of Force":"Cube de force","Cubic Gate":"Porte cubique","Dagger of Venom":"Dague de venin","Dancing Sword":"Épée dansante",
"Decanter of Endless Water":"Carafe d'eau intarissable","Deck of Illusions":"Jeu d'illusions","Deck of Many Things":"Jeu de cartes aux mille merveilles","Defender":"Défenseur","Demon Armor":"Armure démoniaque","Dimensional Shackles":"Entraves dimensionnelles",
"Dragon Scale Mail":"Cotte d'écailles de dragon","Dragon Slayer":"Tueuse de dragons","Dust of Disappearance":"Poussière de disparition","Dust of Dryness":"Poussière de dessèchement","Dust of Sneezing and Choking":"Poussière d'éternuement et d'étouffement",
"Dwarven Plate":"Armure de plates naine","Dwarven Thrower":"Marteau lanceur nain","Efficient Quiver":"Carquois efficace","Efreeti Bottle":"Bouteille d'éfrit","Elemental Gem":"Gemme élémentaire","Elven Chain":"Cotte de mailles elfique","Eversmoking Bottle":"Bouteille fumante",
"Eyes of Charming":"Yeux de charme","Eyes of Minute Seeing":"Yeux de vision minutieuse","Eyes of the Eagle":"Yeux de l'aigle","Feather Token":"Plume magique","Figurine of Wondrous Power":"Figurine merveilleuse","Flame Tongue":"Épée de flammes","Folding Boat":"Bateau pliable",
"Frost Brand":"Lame de givre","Gauntlets of Ogre Power":"Gantelets de force d'ogre","Gem of Brightness":"Gemme de luminosité","Gem of Seeing":"Gemme de vision","Giant Slayer":"Tueuse de géants","Glamoured Studded Leather Armor":"Armure de cuir clouté enchantée",
"Gloves of Missile Snaring":"Gants de capture de projectiles","Gloves of Swimming and Climbing":"Gants de nage et d'escalade","Goggles of Night":"Lunettes de nuit","Hammer of Thunderbolts":"Marteau de foudre","Handy Haversack":"Sac à dos pratique","Hat of Disguise":"Chapeau de déguisement",
"Headband of Intellect":"Bandeau d'intelligence","Helm of Brilliance":"Heaume de brillance","Helm of Comprehending Languages":"Heaume de compréhension des langues","Helm of Telepathy":"Heaume de télépathie","Helm of Teleportation":"Heaume de téléportation","Holy Avenger":"Vengeresse sacrée",
"Horn of Blasting":"Cor de destruction","Horn of Valhalla":"Cor du Valhalla","Horseshoes of a Zephyr":"Fers à cheval de zéphyr","Horseshoes of Speed":"Fers à cheval de rapidité","Immovable Rod":"Sceptre immobile","Instant Fortress":"Forteresse instantanée","Ioun Stone":"Pierre d'Ioun",
"Iron Bands of Binding":"Bandes de fer d'entrave","Iron Flask":"Flasque de fer","Javelin of Lightning":"Javeline de foudre","Lantern of Revealing":"Lanterne de révélation","Luck Blade":"Lame de chance","Mace of Disruption":"Masse de dislocation","Mace of Smiting":"Masse de frappe",
"Mace of Terror":"Masse de terreur","Mantle of Spell Resistance":"Manteau de résistance à la magie","Manual of Bodily Health":"Manuel de santé corporelle","Manual of Gainful Exercise":"Manuel d'exercice profitable","Manual of Golems":"Manuel des golems","Manual of Clay Golems":"Manuel des golems d'argile",
"Manual of Flesh Golems":"Manuel des golems de chair","Manual of Iron Golems":"Manuel des golems de fer","Manual of Stone Golems":"Manuel des golems de pierre","Manual of Quickness of Action":"Manuel de célérité","Marvelous Pigments":"Pigments merveilleux","Medallion of Thoughts":"Médaillon de pensées",
"Mirror of Life Trapping":"Miroir d'emprisonnement","Mithral Armor":"Armure de mithral","Necklace of Adaptation":"Collier d'adaptation","Necklace of Fireballs":"Collier de boules de feu","Necklace of Prayer Beads":"Chapelet de prière","Nine Lives Stealer":"Voleuse de neuf vies","Oathbow":"Arc de serment",
"Oil of Etherealness":"Huile d'éthéréité","Oil of Sharpness":"Huile d'affûtage","Oil of Slipperiness":"Huile de glissement","Pearl of Power":"Perle de puissance","Periapt of Health":"Périapte de santé","Periapt of Proof against Poison":"Périapte de protection contre le poison",
"Periapt of Wound Closure":"Périapte de fermeture des blessures","Philter of Love":"Philtre d'amour","Pipes of Haunting":"Pipeaux hantés","Pipes of the Sewers":"Pipeaux des égouts","Plate Armor of Etherealness":"Armure de plates d'éthéréité","Portable Hole":"Trou portable",
"Potion of Animal Friendship":"Potion d'amitié avec les animaux","Potion of Clairvoyance":"Potion de clairvoyance","Potion of Climbing":"Potion d'escalade","Potion of Diminution":"Potion de diminution","Potion of Flying":"Potion de vol","Potion of Gaseous Form":"Potion de forme gazeuse",
"Potion of Giant Strength":"Potion de force de géant","Potion of Growth":"Potion de croissance","Potion of Healing":"Potion de soins","Potion of Greater Healing":"Potion de soins importants","Potion of Superior Healing":"Potion de soins supérieurs","Potion of Supreme Healing":"Potion de soins suprêmes",
"Potion of Heroism":"Potion d'héroïsme","Potion of Invisibility":"Potion d'invisibilité","Potion of Mind Reading":"Potion de lecture des pensées","Potion of Poison":"Potion de poison","Potion of Resistance":"Potion de résistance","Potion of Speed":"Potion de rapidité","Potion of Water Breathing":"Potion de respiration aquatique",
"Restorative Ointment":"Onguent restaurateur","Ring of Animal Influence":"Anneau d'influence sur les animaux","Ring of Djinni Summoning":"Anneau d'invocation de djinn","Ring of Elemental Command":"Anneau de contrôle des élémentaires","Ring of Evasion":"Anneau d'esquive","Ring of Feather Falling":"Anneau de chute amortie",
"Ring of Free Action":"Anneau de liberté d'action","Ring of Invisibility":"Anneau d'invisibilité","Ring of Jumping":"Anneau de saut","Ring of Mind Shielding":"Anneau de protection mentale","Ring of Protection":"Anneau de protection","Ring of Regeneration":"Anneau de régénération","Ring of Resistance":"Anneau de résistance",
"Ring of Shooting Stars":"Anneau d'étoiles filantes","Ring of Spell Storing":"Anneau de stockage de sorts","Ring of Spell Turning":"Anneau de renvoi des sorts","Ring of Swimming":"Anneau de nage","Ring of Telekinesis":"Anneau de télékinésie","Ring of the Ram":"Anneau du bélier","Ring of Three Wishes":"Anneau de trois souhaits",
"Ring of Warmth":"Anneau de chaleur","Ring of Water Walking":"Anneau de marche sur l'eau","Ring of X-ray Vision":"Anneau de vision aux rayons X","Robe of Eyes":"Robe d'yeux","Robe of Scintillating Colors":"Robe de couleurs scintillantes","Robe of Stars":"Robe d'étoiles","Robe of the Archmagi":"Robe des archimages",
"Robe of Useful Items":"Robe d'objets utiles","Rod of Absorption":"Sceptre d'absorption","Rod of Alertness":"Sceptre de vigilance","Rod of Lordly Might":"Sceptre de puissance seigneuriale","Rod of Rulership":"Sceptre de souveraineté","Rod of Security":"Sceptre de sécurité","Rope of Climbing":"Corde d'escalade",
"Rope of Entanglement":"Corde d'enchevêtrement","Scarab of Protection":"Scarabée de protection","Scimitar of Speed":"Cimeterre de rapidité","Shield of Missile Attraction":"Bouclier d'attraction des projectiles","Slippers of Spider Climbing":"Chaussons d'araignée","Sovereign Glue":"Colle souveraine","Spell Scroll":"Parchemin de sort",
"Spellguard Shield":"Bouclier de garde magique","Sphere of Annihilation":"Sphère d'annihilation","Staff of Charming":"Bâton de charme","Staff of Fire":"Bâton de feu","Staff of Frost":"Bâton de givre","Staff of Healing":"Bâton de soins","Staff of Power":"Bâton de puissance","Staff of Striking":"Bâton de frappe",
"Staff of Swarming Insects":"Bâton d'insectes grouillants","Staff of the Magi":"Bâton des mages","Staff of the Python":"Bâton du python","Staff of the Woodlands":"Bâton des forêts","Staff of Thunder and Lightning":"Bâton de tonnerre et de foudre","Staff of Withering":"Bâton de flétrissement",
"Stone of Controlling Earth Elementals":"Pierre de contrôle des élémentaires de la terre","Stone of Good Luck (Luckstone)":"Pierre de chance (pierre porte-bonheur)","Sun Blade":"Lame solaire","Sword of Life Stealing":"Épée de vol de vie","Sword of Sharpness":"Épée d'affûtage","Sword of Wounding":"Épée de blessure",
"Talisman of Pure Good":"Talisman du bien absolu","Talisman of the Sphere":"Talisman de la sphère","Talisman of Ultimate Evil":"Talisman du mal absolu","Tome of Clear Thought":"Tome de pensée claire","Tome of Leadership and Influence":"Tome de commandement et d'influence","Tome of Understanding":"Tome de compréhension",
"Trident of Fish Command":"Trident de contrôle des poissons","Universal Solvent":"Solvant universel","Vicious Weapon":"Arme vicieuse","Vorpal Sword":"Épée vorpale","Wand of Binding":"Baguette d'entrave","Wand of Enemy Detection":"Baguette de détection des ennemis","Wand of Fear":"Baguette de terreur",
"Wand of Fireballs":"Baguette de boules de feu","Wand of Lightning Bolts":"Baguette d'éclairs","Wand of Magic Detection":"Baguette de détection de la magie","Wand of Magic Missiles":"Baguette de projectiles magiques","Wand of Paralysis":"Baguette de paralysie","Wand of Polymorph":"Baguette de métamorphose",
"Wand of Secrets":"Baguette de secrets","Wand of the War Mage, +1, +2, or +3":"Baguette du mage de guerre, +1, +2 ou +3","Wand of the War Mage, +1":"Baguette du mage de guerre, +1","Wand of the War Mage, +2":"Baguette du mage de guerre, +2","Wand of the War Mage, +3":"Baguette du mage de guerre, +3","Wand of Web":"Baguette de toile d'araignée",
"Wand of Wonder":"Baguette de merveilles","Weapon, +1, +2, or +3":"Arme, +1, +2 ou +3","Weapon, +1":"Arme, +1","Weapon, +2":"Arme, +2","Weapon, +3":"Arme, +3","Well of Many Worlds":"Puits des mondes multiples","Wind Fan":"Éventail du vent","Winged Boots":"Bottes ailées","Wings of Flying":"Ailes de vol","Orb of Dragonkind":"Orbe des dragons"}
def item_name(n):
    if n in FIX: return FIX[n]
    m = re.match(r"^(\w+) Dragon Scale Mail$", n)
    if m: return "Cotte d'écailles de dragon " + COL[m.group(1)]
    m = re.match(r"^Belt of (\w+) Giant Strength$", n)
    if m: return "Ceinture de force de géant " + GIANT[m.group(1)]
    m = re.match(r"^Potion of (\w+) Giant Strength$", n)
    if m: return "Potion de force de géant " + GIANT[m.group(1)]
    m = re.match(r"^(Potion|Ring) of (\w+) Resistance$", n)
    if m: return ("Potion de résistance" if m.group(1) == "Potion" else "Anneau de résistance") + " (" + RES[m.group(2)].replace("à l'", "").replace("au ", "").replace("à la ", "") + ")"
    m = re.match(r"^Ring of (\w+) Elemental Command$", n)
    if m: return "Anneau de contrôle des élémentaires " + ELEM[m.group(1)]
    m = re.match(r"^(\w+) Elemental Gem$", n)
    if m: return "Gemme élémentaire " + ELEM[m.group(1)]
    m = re.match(r"^Ioun Stone of (.+)$", n)
    if m and m.group(1) in IOUN: return "Pierre d'Ioun " + IOUN[m.group(1)]
    m = re.match(r"^(.+) Figurine of Wondrous Power$", n)
    if m: return "Figurine merveilleuse (" + FIG[m.group(1)] + ")"
    m = re.match(r"^(.+) Feather Token$", n)
    if m: return "Plume magique (" + FEA[m.group(1)] + ")"
    m = re.match(r"^(\w+) Horn of Valhalla$", n)
    if m: return "Cor du Valhalla " + HORN[m.group(1)]
    m = re.match(r"^(\w+) Bag of Tricks$", n)
    if m: return "Sac à malices " + BAG[m.group(1)]
    m = re.match(r"^Carpet of Flying \((.+)\)$", n)
    if m: return "Tapis volant (" + CARPET[m.group(1)] + ")"
    m = re.match(r"^Spell Scroll \((.+)\)$", n)
    if m: return "Parchemin de sort (" + SPELLLV[m.group(1)] + ")"
    return n
MON = {"Androsphinx":"Androsphinx","Barbed Devil":"Diable barbelé","Deep Gnome (Svirfneblin)":"Gnome des profondeurs (svirfneblin)","Giant Rat (Diseased)":"Rat géant (malade)","Ice Mephit":"Méphite de glace","Swarm of Beetles":"Nuée de scarabées","Swarm of Centipedes":"Nuée de mille-pattes","Swarm of Spiders":"Nuée d'araignées","Swarm of Wasps":"Nuée de guêpes",
"Vampire, Vampire Form":"Vampire (forme de vampire)","Vampire, Bat Form":"Vampire (forme de chauve-souris)","Vampire, Mist Form":"Vampire (forme de brume)",
"Werebear, Bear Form":"Ours-garou (forme d'ours)","Werebear, Human Form":"Ours-garou (forme humaine)","Werebear, Hybrid Form":"Ours-garou (forme hybride)","Wereboar, Boar Form":"Sanglier-garou (forme de sanglier)","Wereboar, Human Form":"Sanglier-garou (forme humaine)","Wereboar, Hybrid Form":"Sanglier-garou (forme hybride)",
"Wererat, Human Form":"Rat-garou (forme humaine)","Wererat, Hybrid Form":"Rat-garou (forme hybride)","Wererat, Rat Form":"Rat-garou (forme de rat)","Weretiger, Human Form":"Tigre-garou (forme humaine)","Weretiger, Hybrid Form":"Tigre-garou (forme hybride)","Weretiger, Tiger Form":"Tigre-garou (forme de tigre)",
"Werewolf, Human Form":"Loup-garou (forme humaine)","Werewolf, Hybrid Form":"Loup-garou (forme hybride)","Werewolf, Wolf Form":"Loup-garou (forme de loup)","Drow":"Drow","Vrock":"Vrock"}
