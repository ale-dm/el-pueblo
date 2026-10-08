import json, re, os, hashlib
from collections import Counter
OUT = "data/catalog"
def slug(s): return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
def first_int(s):
    m = re.search(r"\d+", s or ""); return int(m.group(0)) if m else None
def field(s, label):
    m = re.search(label + r":\s*([^\n]+)", s or ""); return m.group(1).strip() if m else None

# ── factions ──
factions = [
 {"key":"town","name":"Town","win_condition":"Hang every criminal and evildoer","wiki_title":"Town (ToS)"},
 {"key":"mafia","name":"Mafia","win_condition":"Kill anyone that will not submit to the Mafia","wiki_title":"Mafia"},
 {"key":"coven","name":"Coven","win_condition":"Kill all who would oppose the Coven","wiki_title":"Coven (ToS)"},
 {"key":"neutral","name":"Neutral","win_condition":None,"wiki_title":"Neutral (ToS)"},
 {"key":"werewolf","name":"Werewolf","win_condition":None,"wiki_title":"Werewolf (ToS)"},
]
# ── alignments (12 categorías de rol de la wiki) ──
alignment_titles = ["Coven Evil","Mafia Deception","Mafia Killing","Mafia Support","Neutral Benign","Neutral Chaos",
  "Neutral Evil (ToS)","Neutral Killing (ToS)","Town Investigative (ToS)","Town Killing (ToS)","Town Protective (ToS)","Town Support (ToS)"]
alignments = []
for t in alignment_titles:
    name = re.sub(r"\s*\(ToS\)$", "", t)
    alignments.append({"key": slug(name), "name": name, "faction_key": slug(name.split()[0]), "wiki_title": t})

# ── roles (49 de roles.json + Werewolf) ──
src = json.load(open("data/roles/roles.json"))
roles = []
for r in src:
    name = r["name"]; key = slug(name)
    al = (r.get("alignment") or "").split("\n")[0].strip()
    roles.append({
        "key": key, "name": name, "wiki_title": r["page"],
        "faction_key": r["faction"].lower(),
        "alignment_key": slug(al) if al else None,
        "role_type": r.get("type"),
        "is_unique": bool(re.search(r"Unique", r.get("type") or "", re.I)),
        "priority": first_int(r.get("priority")),
        "attack": field(r.get("attributes"), "Attack"),
        "defense": field(r.get("attributes"), "Defense"),
        "summary": r.get("summary"), "goal": r.get("goal"), "abilities": r.get("abilities"),
        "attributes": r.get("attributes"), "special": r.get("special"),
        "action_other": r.get("action_other"), "action_none": r.get("action_none"),
        "win_with": r.get("win_with"), "must_kill": r.get("must_kill"),
        "restrictions": r.get("restrictions"), "uses": r.get("uses"),
        "sheriff_result": r.get("sheriff_result"), "investigator_result": r.get("investigator_result"),
        "consigliere_result": r.get("consigliere_result"),
        "attribute_lines": [l.strip() for l in (r.get("attributes_text") or "").split("\n") if l.strip()],
        "mvp": r["faction"] in ("Mafia", "Town"),
        "icon_file": ("roles/img/" + r["images"]["icon"]) if r.get("images", {}).get("icon") else None,
        "skin_file": ("roles/img/" + r["images"]["skin"]) if r.get("images", {}).get("skin") else None,
        "raw": r,
    })
roles.append({"key":"werewolf","name":"Werewolf","wiki_title":"Werewolf (ToS)","faction_key":"werewolf",
    "alignment_key":None,"role_type":None,"is_unique":False,"priority":None,"attack":None,"defense":None,
    "summary":None,"goal":None,"abilities":None,"attributes":None,"special":None,"action_other":None,
    "action_none":None,"win_with":None,"must_kill":None,"restrictions":None,"uses":None,
    "sheriff_result":None,"investigator_result":None,"consigliere_result":None,"attribute_lines":[],
    "mvp":False,"icon_file":None,"skin_file":None,"raw":{"note":"infobox no parseada; ver docs/roles/Werewolf.md"}})

# ── phase timings ──
cfg = json.load(open("data/game_config.json"))
phases = ["day_d1","discussion","voting","defense","judgement","last_words","night"]
phase_timings = []
for mode, secs in cfg["phases"]["seconds"].items():
    for i, p in enumerate(phases):
        phase_timings.append({"mode": mode, "phase": p, "seconds": secs.get(p), "sort_order": i})

# ── game modes (Mafia) ──
modes_src = cfg["modes_mafia_scope"]
by_name = {m["name"]: m for m in modes_src}
game_modes = []
for m in modes_src:
    roles_list = m.get("roles")
    if m.get("roles_same_as"): roles_list = by_name[m["roles_same_as"]].get("roles")
    game_modes.append({"key": slug(m["name"]), "name": m["name"], "players": str(m.get("players")),
        "roles": roles_list if isinstance(roles_list, list) else None,
        "notes": m.get("notes"), "source_page": "Game Modes (ToS)"})

# ── host rules, voting ──
host_rules = [{"position": i+1, "rule": r} for i, r in enumerate(cfg["custom_host_rules"])]
voting_thresholds = [{"alive": n, "votes_required": -(-n // 2)} for n in range(3, 16)]

# ── modifiers (tabla de la página Modifiers) ──
import gzip
articles = {}
with gzip.open("data/wiki/articles_all.ndjson.gz", "rt") as f:
    for l in f:
        r = json.loads(l); articles[r["title"]] = r
w = articles["Modifiers"]["wikitext"]
body = w[w.find('{| class="wikitable'):]
body = body[:body.find("\n|}")]
rows = [x for x in body.split("\n|-")[1:]]
modifiers, category = [], None
for row in rows:
    lines = [l for l in row.split("\n") if l.strip()]
    cells = []
    buf = None
    for l in lines:
        if l.startswith("|") or l.startswith("!"):
            if buf is not None: cells.append(buf)
            buf = l[1:]
        elif buf is not None:
            buf += "\n" + l
    if buf is not None: cells.append(buf)
    cells = [c.strip() for c in cells]
    if not cells or cells[0].startswith("scope="): continue
    if len(cells) == 5 and "rowspan" in cells[0]:
        category = re.sub(r"^.*\|\s*", "", cells[0]); cells = cells[1:]
    if len(cells) < 4: continue
    name_cell, desc, modes_cell = cells[0], cells[1], cells[2]
    name = re.sub(r"\{\{A\|([^}]*)\}\}", r"\1", name_cell).strip()
    desc = re.sub(r"\{\{A\|([^}]*)\}\}", r"\1", desc).strip()
    modes = [re.sub(r"\{\{A\|([^}]*)\}\}", r"\1", m).strip() for m in re.split(r"<br\s*/?>|\n", modes_cell) if m.strip()]
    modifiers.append({"key": slug(name), "name": name, "category": (category or "").replace(" Modifiers","").lower(),
                      "description": desc, "game_modes": modes, "source_page": "Modifiers"})

# ── wiki images: nombre canónico (espacios), sin duplicados por _ vs espacio ──
def canon(n): return n.replace("_", " ").strip()
img_idx = json.load(open("data/wiki/image_index.json"))
refs = {}
scope_titles = {i["title"] for i in json.load(open("data/wiki/text/index.json"))}
for t in scope_titles:
    for f in re.findall(r"\[\[(?:File|Image):([^\]|]+)", articles[t]["wikitext"]):
        refs.setdefault(canon(f), set()).add(t)
files = {}
for name, meta in img_idx["files"].items():
    files.setdefault(canon(name), meta)
wiki_images = []
for name in sorted(set(files) | {canon(m) for m in img_idx["missing"]} | set(refs)):
    meta = files.get(name)
    wiki_images.append({"name": name, "url": meta["url"] if meta else None,
        "bytes": meta["bytes"] if meta else None, "mime": meta["mime"] if meta else None,
        "exists_in_wiki": meta is not None,
        "local_file": ("wiki/img/" + name.replace(" ", "_")) if name.startswith(("RoleIcon", "SpecialLabel")) else None,
        "referenced_by": sorted(refs.get(name, []))})

catalog = {"factions": factions, "alignments": alignments, "roles": roles, "phase_timings": phase_timings,
           "game_modes": game_modes, "host_rules": host_rules, "voting_thresholds": voting_thresholds,
           "modifiers": modifiers, "wiki_images": wiki_images}
os.makedirs(OUT, exist_ok=True)
for k, v in catalog.items():
    json.dump(v, open(f"{OUT}/{k}.json", "w"), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in catalog.items()})
print("roles by faction:", Counter(r["faction_key"] for r in roles))
print("alignment keys missing from alignments:", sorted({r["alignment_key"] for r in roles if r["alignment_key"]} - {a["key"] for a in alignments}))
print("modifier categories:", Counter(m["category"] for m in modifiers))
print("images exists:", sum(i["exists_in_wiki"] for i in wiki_images), "missing:", sum(not i["exists_in_wiki"] for i in wiki_images), "total:", len(wiki_images))
