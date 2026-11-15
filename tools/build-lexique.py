#!/usr/bin/env python3
"""Génère data/lexique-*.js à partir du SRD 5.1 (OGL 1.0a) — dépôt 5e-bits/5e-database (src/2014).
Usage : python3 tools/build-lexique.py /chemin/vers/5e-database/src/2014 data/"""
import json, re, sys, os
SRC, OUT = sys.argv[1], sys.argv[2]
L = lambda lang, f: json.load(open(f"{SRC}/{lang}/5e-SRD-{f}.json"))
def ft2m(s):
    return re.sub(r"(\d+)\s*ft\.?", lambda m: f"{round(int(m.group(1))*0.3*2)/2:g} m".replace(".", ","), str(s))
def js(var, data):
    open(f"{OUT}/lexique-{var}.js", "w").write(f"window.H=window.H||{{}};H.LEX=H.LEX||{{}};H.LEX.{var}=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(var, len(data), os.path.getsize(f"{OUT}/lexique-{var}.js") // 1024, "Ko")

dmg_fr = {d["index"]: d["name"] for d in L("fr-FR", "Damage-Types")}
cond_fr = {d["index"]: d["name"] for d in L("fr-FR", "Conditions")}
UNIT = {"gp": "po", "sp": "pa", "cp": "pc", "ep": "pé", "pp": "pp"}
CP = {"gp": 100, "sp": 10, "cp": 1, "ep": 50, "pp": 1000}
kg = lambda lb: f"{round(lb*0.4536,1):g} kg".replace(".", ",")
def cost(c): return f"{c['quantity']} {UNIT.get(c['unit'], c['unit'])}", c["quantity"] * CP.get(c["unit"], 1)

# ---------------- Équipement (FR) ----------------
eq = []
for e in L("fr-FR", "Equipment"):
    price, cp = cost(e["cost"])
    cat = e["equipment_category"]["name"]
    sub = e.get("weapon_category") and f"{cat} · {e['category_range']}" or e.get("armor_category") and f"{cat} · {e['armor_category']}" or \
          e.get("gear_category", {}).get("name") or e.get("tool_category") or e.get("vehicle_category") or cat
    f = [["Prix", price]]
    if e.get("weight"): f.append(["Poids", kg(e["weight"])])
    if e.get("damage"): f.append(["Dégâts", f"{e['damage']['damage_dice']} {e['damage']['damage_type']['name'].lower()}"])
    if e.get("two_handed_damage"): f.append(["À deux mains", f"{e['two_handed_damage']['damage_dice']} {e['two_handed_damage']['damage_type']['name'].lower()}"])
    if e.get("range"): 
        r = e["range"]; f.append(["Portée", ft2m(f"{r.get('normal','')}" + (f"/{r['long']}" if r.get("long") else "") + " ft")])
    if e.get("properties"): f.append(["Propriétés", ", ".join(p["name"] for p in e["properties"])])
    if e.get("armor_class"):
        a = e["armor_class"]; f.append(["CA", f"{a['base']}" + (" + Dex" if a.get("dex_bonus") else "") + (f" (max +{a['max_bonus']})" if a.get("max_bonus") else "")])
        if e.get("str_minimum"): f.append(["Force min.", e["str_minimum"]])
        if e.get("stealth_disadvantage"): f.append(["Discrétion", "désavantage"])
    if e.get("speed"): f.append(["Vitesse", f"{e['speed']['quantity']} {e['speed']['unit']}"])
    if e.get("capacity"): f.append(["Capacité", e["capacity"]])
    if e.get("contents"): f.append(["Contenu", ", ".join(f"{c['quantity']}× {c['item']['name']}" for c in e["contents"])])
    eq.append({"n": e["name"], "a": e["index"].replace("-", " "), "s": sub, "c": cat, "f": f, "d": e.get("desc", []), "p": cp, "w": e.get("weight", 0)})
js("eq", eq)

# ---------------- Objets magiques (EN, termes FR) ----------------
RAR = {"Common": "Commun", "Uncommon": "Peu commun", "Rare": "Rare", "Very Rare": "Très rare", "Legendary": "Légendaire", "Varies": "Variable", "Artifact": "Artefact"}
RORD = {"Commun": 1, "Peu commun": 2, "Rare": 3, "Très rare": 4, "Légendaire": 5, "Artefact": 6, "Variable": 0}
CATM = {"Armor": "Armure", "Weapon": "Arme", "Wondrous Items": "Objet merveilleux", "Potion": "Potion", "Ring": "Anneau", "Rod": "Sceptre", "Scroll": "Parchemin", "Staff": "Bâton", "Wand": "Baguette"}
mag = []
for m in L("en", "Magic-Items"):
    r = RAR.get(m["rarity"]["name"], m["rarity"]["name"]); cat = CATM.get(m["equipment_category"]["name"], m["equipment_category"]["name"])
    d = m["desc"]
    mag.append({"n": m["name"], "s": f"{cat} · {r}", "c": cat, "r": r, "ro": RORD.get(r, 0), "f": [["Rareté", r], ["Catégorie", cat]], "d": d[1:] if len(d) > 1 else d, "d0": d[0] if len(d) > 1 else ""})
js("mag", mag)

# ---------------- Sorts (FR) ----------------
spl = []
for s in L("fr-FR", "Spells"):
    lvl = s["level"]; school = s["school"]["name"]
    sub = (f"Niveau {lvl}" if lvl else "Tour de magie") + " · " + school + (" (rituel)" if s.get("ritual") else "")
    comp = ", ".join(s["components"]) + (f" ({s['material']})" if s.get("material") else "")
    f = [["Incantation", s["casting_time"]], ["Portée", s["range"]], ["Composantes", comp], ["Durée", ("Concentration, " if s.get("concentration") else "") + s["duration"]], ["Classes", ", ".join(c["name"] for c in s["classes"])]]
    d = list(s["desc"]) + ([ "Aux niveaux supérieurs. " + " ".join(s["higher_level"]) ] if s.get("higher_level") else [])
    spl.append({"i": s["index"], "ci": [c["index"] for c in s["classes"]], "n": s["name"], "a": s["index"].replace("-", " "), "s": sub, "lv": lvl, "sc": school, "cl": [c["name"] for c in s["classes"]], "f": f, "d": d})
js("spl", spl)

# ---------------- Classes, races, règles (FR) ----------------
feats = L("fr-FR", "Features"); traits = L("fr-FR", "Traits")
cls = []
for c in L("fr-FR", "Classes"):
    sec = {}
    for ft in feats:
        if ft["class"]["index"] == c["index"] and not ft.get("subclass") and ft.get("level"):
            sec.setdefault(ft["level"], []).append([ft["name"], ft["desc"]])
    secs = [[f"Niveau {lv}", [x for t, dd in items for x in ([f"▸ {t}"] + dd)]] for lv, items in sorted(sec.items())]
    f = [["Dé de vie", f"d{c['hit_die']}"], ["Sauvegardes", ", ".join(s["name"] for s in c["saving_throws"])], ["Maîtrises", ", ".join(p["name"] for p in c["proficiencies"])],
         ["Sous-classes", ", ".join(s["name"] for s in c.get("subclasses", [])) or "—"]] + [["Compétences", p["desc"]] for p in c.get("proficiency_choices", [])[:1]]
    cls.append({"n": c["name"], "a": c["index"], "s": f"Classe · d{c['hit_die']}", "f": f, "sec": secs, "d": []})
rac = []
for r in L("fr-FR", "Races"):
    ab = ", ".join(f"{a['ability_score']['name']} +{a['bonus']}" for a in r.get("ability_bonuses", []))
    f = [["Vitesse", ft2m(f"{r['speed']} ft")], ["Taille", r["size"]], ["Bonus", ab or "—"], ["Langues", ", ".join(l["name"] for l in r.get("languages", []))]]
    tr = [[t["name"], t["desc"]] for t in traits if any(x["index"] == r["index"] for x in t.get("races", []))]
    rac.append({"n": r["name"], "a": r["index"], "s": "Race", "f": f, "sec": [[n, d] for n, d in tr], "d": [r.get("age", ""), r.get("size_description", "")]})
for sr in L("fr-FR", "Subraces"):
    tr = [[t["name"], t["desc"]] for t in traits if any(x["index"] == sr["index"] for x in t.get("subraces", []))]
    rac.append({"n": sr["name"], "a": sr["index"], "s": "Sous-race", "f": [["Bonus", ", ".join(f"{a['ability_score']['name']} +{a['bonus']}" for a in sr.get("ability_bonuses", [])) or "—"]], "sec": tr, "d": [sr.get("desc", "")]})
reg = []
for c in L("fr-FR", "Conditions"): reg.append({"n": c["name"], "a": c["index"], "s": "État", "f": [], "d": c["desc"]})
for rs in L("fr-FR", "Rule-Sections"): reg.append({"n": rs["name"], "a": rs["index"].replace("-", " "), "s": "Règle", "f": [], "d": [x for x in rs["desc"].split("\n") if x.strip()]})
js("cls", cls); js("rac", rac); js("reg", reg)

# ---------------- Données de création de personnage ----------------
AB6 = {"str": "for", "dex": "dex", "con": "con", "int": "int", "wis": "sag", "cha": "cha"}
SKI = {"acrobatics": "acrobaties", "arcana": "arcanes", "athletics": "athletisme", "stealth": "discretion", "animal-handling": "dressage", "sleight-of-hand": "escamotage", "history": "histoire", "intimidation": "intimidation", "insight": "intuition", "investigation": "investigation", "medicine": "medecine", "nature": "nature", "perception": "perception", "persuasion": "persuasion", "religion": "religion", "performance": "representation", "survival": "survie", "deception": "tromperie"}
CLSFIX = {"fighter": "Guerrier"}
subs_fr = L("fr-FR", "Subclasses")
gen = {"cls": {}, "lvl": {}, "feat": [], "rac": {}, "sub": []}
for c in L("fr-FR", "Classes"):
    ch = (c.get("proficiency_choices") or [{}])[0]
    skl = [SKI.get(o["item"]["index"].replace("skill-", ""), "") for o in (ch.get("from", {}).get("options", []) if ch else []) if o.get("item")]
    gen["cls"][c["index"]] = {"n": CLSFIX.get(c["index"], c["name"]), "hd": c["hit_die"], "sv": [AB6[x["index"]] for x in c["saving_throws"]],
        "ab": AB6.get((c.get("spellcasting") or {}).get("spellcasting_ability", {}).get("index")), "skn": ch.get("choose", 0) if ch else 0, "skl": [x for x in skl if x],
        "sc": [{"i": x["index"], "n": x["name"]} for x in subs_fr if x["class"]["index"] == c["index"]]}
for l in L("fr-FR", "Levels"):
    if l.get("subclass"): continue
    sc = l.get("spellcasting") or {}
    gen["lvl"].setdefault(l["class"]["index"], {})[l["level"]] = {"pb": l["prof_bonus"], "s": [sc.get(f"spell_slots_level_{i}", 0) for i in range(1, 10)], "c": sc.get("cantrips_known", 0), "k": sc.get("spells_known", 0)}
for f in feats:
    gen["feat"].append({"c": f["class"]["index"], "sc": (f.get("subclass") or {}).get("index"), "l": f["level"], "n": f["name"], "d": f["desc"]})
def abm(r): return {AB6[a["ability_score"]["index"]]: a["bonus"] for a in r.get("ability_bonuses", [])}
for r in L("fr-FR", "Races"):
    gen["rac"][r["index"]] = {"n": r["name"], "spd": r["speed"], "ab": abm(r), "tr": [{"n": t["name"], "d": t["desc"]} for t in traits if any(x["index"] == r["index"] for x in t.get("races", []))]}
for sr in L("fr-FR", "Subraces"):
    gen["sub"].append({"i": sr["index"], "n": sr["name"], "r": sr["race"]["index"], "ab": abm(sr), "tr": [{"n": t["name"], "d": t["desc"]} for t in traits if any(x["index"] == sr["index"] for x in t.get("subraces", []))]})
js("gen", gen)


# ---------------- Monstres (EN, noms/champs FR) ----------------
exec(open(os.path.join(os.path.dirname(__file__), "monstres-fr.py")).read())  # définit NAMES, fr_name()
SIZE = {"Tiny": "TP", "Small": "P", "Medium": "M", "Large": "G", "Huge": "TG", "Gargantuan": "Gig"}
TYPE = {"beast": "bête", "humanoid": "humanoïde", "dragon": "dragon", "monstrosity": "monstruosité", "fiend": "fiélon", "undead": "mort-vivant", "elemental": "élémentaire", "giant": "géant", "construct": "créature artificielle", "plant": "plante", "fey": "fée", "celestial": "céleste", "aberration": "aberration", "ooze": "vase"}
ALIGN = [("unaligned", "non aligné"), ("any alignment", "tout alignement"), ("lawful", "loyal"), ("chaotic", "chaotique"), ("neutral", "neutre"), ("good", "bon"), ("evil", "mauvais"), ("any non-", "tout non-"), ("any ", "tout "), ("alignment", "alignement")]
SENSE = {"darkvision": "vision dans le noir", "blindsight": "vision aveugle", "tremorsense": "perception des vibrations", "truesight": "vision lucide", "passive_perception": "Perception passive"}
SPD = {"walk": "marche", "fly": "vol", "swim": "nage", "climb": "escalade", "burrow": "fouissement", "hover": "vol stationnaire"}
SKILL = {"Athletics": "Athlétisme", "Acrobatics": "Acrobaties", "Sleight of Hand": "Escamotage", "Stealth": "Discrétion", "Arcana": "Arcanes", "History": "Histoire", "Investigation": "Investigation", "Nature": "Nature", "Religion": "Religion", "Animal Handling": "Dressage", "Insight": "Perspicacité", "Medicine": "Médecine", "Perception": "Perception", "Survival": "Survie", "Deception": "Tromperie", "Intimidation": "Intimidation", "Performance": "Représentation", "Persuasion": "Persuasion"}
ABIL = {"STR": "FOR", "DEX": "DEX", "CON": "CON", "INT": "INT", "WIS": "SAG", "CHA": "CHA"}
def dmgfr(s):
    s = str(s)
    for i, n in dmg_fr.items(): s = re.sub(rf"\b{i}\b", n.lower(), s)
    for a, b in [("nonmagical attacks", "attaques non magiques"), ("from ", "contre "), ("that aren't silvered", "non argentées"), ("that aren't adamantine", "non en adamantium"), (" and ", " et "), ("magical", "magiques"), ("weapons", "armes")]: s = s.replace(a, b)
    return s
mod = lambda v: (v - 10) // 2
sg = lambda n: f"+{n}" if n >= 0 else f"−{-n}"
def crs(v): return {0.125: "1/8", 0.25: "1/4", 0.5: "1/2"}.get(v, str(int(v)))
def kind(m):
    i, t = m["index"], m["type"]
    if re.search(r"goblin|bugbear", i): return "gobelin"
    if re.search(r"bat|stirge", i): return "chauve"
    if t == "dragon" or re.search(r"wyvern", i): return "dragon"
    if re.search(r"ooze|jelly|pudding|cube|slime", i): return "slime"
    if re.search(r"orc|ogre|troll|ettin|minotaur|giant", i) or t == "giant": return "orc"
    if t == "undead": return "squelette"
    if t == "beast": return "loup"
    if t == "humanoid": return "gobelin"
    return "orc"
mon = []
for m in L("en", "Monsters"):
    ac = m["armor_class"][0]["value"]; at = {"natural": "armure naturelle", "armor": "armure", "dex": "", "natural armor": "armure naturelle"}.get(m["armor_class"][0].get("type", ""), m["armor_class"][0].get("type", ""))
    al = m["alignment"]
    for a, b in ALIGN: al = al.replace(a, b)
    t = TYPE.get(m["type"], "nuée de bêtes TP" if m["type"].startswith("swarm") else m["type"]) + (f" ({m['subtype']})" if m.get("subtype") else "")
    fn = fr_name(m["name"])
    f = [["Classe d'armure", f"{ac}" + (f" ({at})" if at else "")], ["Points de vie", f"{m['hit_points']} ({m['hit_points_roll']})"],
         ["Vitesse", ", ".join(f"{SPD.get(k, k)} {ft2m(v)}" for k, v in m["speed"].items() if k != "hover")],
         ["Caractéristiques", " · ".join(f"{ab} {m[k]} ({sg(mod(m[k]))})" for ab, k in [("FOR", "strength"), ("DEX", "dexterity"), ("CON", "constitution"), ("INT", "intelligence"), ("SAG", "wisdom"), ("CHA", "charisma")])]]
    sv = [f"{ABIL.get(p['proficiency']['name'].split(': ')[1], p['proficiency']['name'])} {sg(p['value'])}" for p in m["proficiencies"] if p["proficiency"]["name"].startswith("Saving")]
    sk = [f"{SKILL.get(p['proficiency']['name'].split(': ')[1], p['proficiency']['name'].split(': ')[1])} {sg(p['value'])}" for p in m["proficiencies"] if p["proficiency"]["name"].startswith("Skill")]
    if sv: f.append(["Jets de sauvegarde", ", ".join(sv)])
    if sk: f.append(["Compétences", ", ".join(sk)])
    for k, lab in [("damage_vulnerabilities", "Vulnérabilités"), ("damage_resistances", "Résistances"), ("damage_immunities", "Immunités (dégâts)")]:
        if m.get(k): f.append([lab, dmgfr("; ".join(m[k]))])
    if m.get("condition_immunities"): f.append(["Immunités (états)", ", ".join(cond_fr.get(c["index"], c["name"]).lower() for c in m["condition_immunities"])])
    f.append(["Sens", ", ".join(f"{SENSE.get(k, k)} {ft2m(v)}" for k, v in m["senses"].items())])
    f.append(["Langues", m["languages"] or "—"])
    f.append(["FP", f"{crs(m['challenge_rating'])} ({m['xp']} PX)"])
    sec = []
    if m.get("special_abilities"): sec.append(["Capacités spéciales", [f"▸ {a['name']}. {a['desc']}" for a in m["special_abilities"]]])
    if m.get("actions"): sec.append(["Actions", [f"▸ {a['name']}. {a['desc']}" for a in m["actions"]]])
    if m.get("reactions"): sec.append(["Réactions", [f"▸ {a['name']}. {a['desc']}" for a in m["reactions"]]])
    if m.get("legendary_actions"): sec.append(["Actions légendaires", [f"▸ {a['name']}. {a['desc']}" for a in m["legendary_actions"]]])
    acts = [{"n": a["name"], "d": a["desc"][:140]} for a in m.get("actions", []) if a["name"] != "Multiattack"][:6]
    mon.append({"n": fn, "a": m["name"], "s": f"{SIZE.get(m['size'], m['size'])} · {t} · {al}", "t": m["type"].split(" ")[0], "cr": m["challenge_rating"], "hp": m["hit_points"], "ac": ac, "f": f, "sec": sec,
                "x": {"hp": m["hit_points"], "ac": ac, "b": mod(m["dexterity"]), "k": kind(m), "acts": acts}})
js("mon", mon)
