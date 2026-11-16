import re
DM = {"acid":"d'acide","bludgeoning":"contondants","cold":"de froid","fire":"de feu","force":"de force","lightning":"de foudre","necrotic":"nécrotiques","piercing":"perforants","poison":"de poison","psychic":"psychiques","radiant":"radiants","slashing":"tranchants","thunder":"de tonnerre"}
TYPES = {"Melee Weapon Attack":"Attaque d'arme au corps à corps","Ranged Weapon Attack":"Attaque d'arme à distance","Melee Spell Attack":"Attaque de sort au corps à corps","Ranged Spell Attack":"Attaque de sort à distance","Melee or Ranged Weapon Attack":"Attaque d'arme au corps à corps ou à distance"}
TGT = {"one target":"une cible","one creature":"une créature","one creature or object":"une créature ou un objet","one target or object":"une cible ou un objet"}
def m_(n):
    v = round(int(n) * 0.3, 1)
    return (f"{v:g}").replace(".", ",") + " m"
def reach(s):
    s = re.sub(r"reach (\d+) ft\.", lambda m: "allonge " + m_(m.group(1)), s)
    s = re.sub(r"range (\d+)/(\d+) ft\.", lambda m: "portée " + m_(m.group(1))[:-2] + "/" + m_(m.group(2)), s)
    s = re.sub(r"range (\d+) ft\.", lambda m: "portée " + m_(m.group(1)), s)
    s = s.replace(", or ", " ou ").replace(" or ", " ou ")
    return s
DMG = re.compile(r"(\d+) \((\d+d\d+(?: [+-] \d+)?)\) (acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) damage|(\d+) (acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) damage")
def dmg(s):
    def r(m):
        if m.group(1): return f"{m.group(1)} ({m.group(2)}) dégâts {DM[m.group(3)]}"
        return f"{m.group(4)} dégâts {DM[m.group(5)]}"
    return DMG.sub(r, s)
HEAD = re.compile(r"^▸ (?P<name>.+?)\. +(?P<type>Melee Weapon Attack|Ranged Weapon Attack|Melee Spell Attack|Ranged Spell Attack|Melee or Ranged Weapon Attack): (?P<b>[+-]\d+) to hit, (?P<reach>(?:reach \d+ ft\.(?:,? or range \d+/\d+ ft\.)?|range \d+(?:/\d+)? ft\.)), (?P<tgt>one target|one creature|one creature or object|one target or object)\. Hit: (?P<rest>.*)$", re.S)
def attack_name(text):
    m = HEAD.match(text); return m.group("name") if m else None
def auto(text, names):
    m = HEAD.match(text)
    if not m: return None
    rest = m.group("rest")
    chk = DMG.sub("<D>", rest)
    if chk not in ("<D>.", "<D> plus <D>."): return None
    n = names.get(m.group("name"))
    if n is None: return None
    return f"▸ {n}. {TYPES[m.group('type')]} : {m.group('b')} pour toucher, {reach(m.group('reach'))}, {TGT[m.group('tgt')]}. Touché : " + dmg(rest).replace(" plus ", " plus ")

ATTN = {"Battleaxe":"Hache d'armes","Beak":"Bec","Bite":"Morsure","Claw":"Griffe","Claw (Fiend Form Only)":"Griffe (forme de fiélon uniquement)","Claw (Oni Form Only)":"Griffe (forme d'oni uniquement)","Claws":"Griffes","Claws (Hag Form Only)":"Griffes (forme de guenaude uniquement)","Club":"Gourdin","Dagger":"Dague","Fist":"Poing","Fork":"Fourche","Gore":"Coup de corne","Greataxe":"Hache à deux mains","Greatclub":"Massue","Greatsword":"Épée à deux mains","Hand Crossbow":"Arbalète de poing","Heavy Club":"Gros gourdin","Heavy Crossbow":"Arbalète lourde","Hooves":"Sabots","Horn":"Corne","Horns":"Cornes","Hurl Flame":"Projection de flammes","Javelin":"Javeline","Light Crossbow":"Arbalète légère","Longbow":"Arc long","Longsword":"Épée longue","Mace":"Masse d'armes","Maul":"Maillet","Morningstar":"Morgenstern","Pike":"Pique","Pseudopod":"Pseudopode","Rake":"Griffade","Ram":"Coup de bélier","Rapier":"Rapière","Rock":"Rocher","Rotting Touch":"Toucher putréfiant","Scimitar":"Cimeterre","Shock":"Décharge","Shortbow":"Arc court","Shortsword":"Épée courte","Slam":"Coup","Sling":"Fronde","Snake Hair":"Cheveux-serpents","Spiked Bone Club":"Gourdin d'os à pointes","Spiked Shield":"Bouclier à pointes","Sword":"Épée","Tail":"Queue","Tail Spike":"Piquant de queue","Talons":"Serres","Tentacles":"Tentacules","Tusk":"Défense","War Pick":"Pic de guerre","Withering Touch":"Toucher flétrissant"}
