import json, re, os, urllib.request, urllib.parse, time
API = "https://town-of-salem.fandom.com/api.php"
UA = {"User-Agent": "el-pueblo-research/1.0 (personal game project)"}
OUT = "out"; IMG = os.path.join(OUT, "img")
os.makedirs(IMG, exist_ok=True)
raw = json.load(open("wiki_raw.json")); pages = raw["pages"]

KEYS = ["nameandicon","alignment","avatar","attributes","special","type","priority","actionother","actionnone",
        "actionself","actionday","actionDay","sheriff","investigator","consigliere","summary","abilities",
        "attributestext","goal","winwith","winswith","mustkill","restrictions","uses","attack","defense"]
KEY_RE = re.compile(r"(?:^|\||\n)\s*(" + "|".join(KEYS) + r")\s*=", re.M)

def fields_of(text):
    m = KEY_RE.finditer(text); spans = [(x.group(1), x.start(), x.end()) for x in m]
    out = {}
    for i, (k, s, e) in enumerate(spans):
        end = spans[i+1][1] if i+1 < len(spans) else len(text)
        val = text[e:end]
        val = re.split(r"\n\|\}|\n\}\}|\n\|-", val)[0]
        out.setdefault(k, val.strip())
    return out

def clean(s):
    if s is None: return None
    s = re.sub(r"\[\[File:[^\]]*\]\]", "", s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{A\|([^}|]*)[^}]*\}\}", r"\1", s)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"'''?|<u>|</u>", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    return "\n".join(l.strip() for l in s.split("\n") if l.strip())

roles = {}
for t in raw["roles"]:
    f = fields_of(pages.get(t, {}).get("wikitext", ""))
    if "alignment" not in f: continue
    roles[t] = {k: clean(v) for k, v in f.items()}

def faction(al):
    al = (al or "").split("\n")[0]
    for k in ["Mafia", "Town", "Coven", "Vampire", "Neutral"]:
        if al.startswith(k): return k
    return "Other"

# Imágenes: pageimage (skin) + RoleIcon de cada página
want = {}
for t in roles:
    p = pages[t]
    names = [i for i in p.get("images", []) if "RoleIcon" in i or "RoleIcon" in i.replace("_", " ")]
    want[t] = {"skin": p.get("image"), "icon_titles": names}

all_titles = sorted({n for v in want.values() for n in v["icon_titles"]})
urls = {}
for i in range(0, len(all_titles), 40):
    d = json.loads(urllib.request.urlopen(urllib.request.Request(API + "?" + urllib.parse.urlencode({
        "action": "query", "titles": "|".join(all_titles[i:i+40]), "prop": "imageinfo",
        "iiprop": "url", "format": "json", "formatversion": "2"}), headers=UA), timeout=60).read())
    for pg in d["query"]["pages"]:
        if "imageinfo" in pg: urls[pg["title"]] = pg["imageinfo"][0]["url"]

def dl(url, name):
    path = os.path.join(IMG, name)
    if os.path.exists(path): return name
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f: f.write(r.read())
    time.sleep(0.15)
    return name

def safe(s): return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")

result = []
for t, f in sorted(roles.items()):
    entry = {"name": t.replace(" (ToS)", ""), "page": t, "faction": faction(f.get("alignment")),
             "alignment": f.get("alignment"), "type": f.get("type"), "priority": f.get("priority"),
             "summary": f.get("summary"), "goal": f.get("goal"), "abilities": f.get("abilities"),
             "attributes": f.get("attributes"), "attributes_text": f.get("attributestext"),
             "special": f.get("special"), "action_other": f.get("actionother"), "action_none": f.get("actionnone"),
             "win_with": f.get("winwith") or f.get("winswith"), "must_kill": f.get("mustkill"),
             "restrictions": f.get("restrictions"), "uses": f.get("uses"),
             "sheriff_result": f.get("sheriff"), "investigator_result": f.get("investigator"),
             "consigliere_result": f.get("consigliere"), "images": {}}
    skin = want[t]["skin"]
    if skin:
        try: entry["images"]["skin"] = dl(skin, f"{safe(entry['name'])}_skin.png")
        except Exception as e: entry["images"]["skin_error"] = str(e)
    for it in want[t]["icon_titles"]:
        if it in urls:
            try: entry["images"]["icon"] = dl(urls[it], f"{safe(entry['name'])}_icon.png")
            except Exception as e: entry["images"]["icon_error"] = str(e)
    result.append(entry)

json.dump(result, open(os.path.join(OUT, "roles.json"), "w"), ensure_ascii=False, indent=1)
from collections import Counter
print(Counter(r["faction"] for r in result))
print("with skin:", sum("skin" in r["images"] for r in result), "with icon:", sum("icon" in r["images"] for r in result))
print("errors:", [r["name"] for r in result if any("error" in k for k in r["images"])])
