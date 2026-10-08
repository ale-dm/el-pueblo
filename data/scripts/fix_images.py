import json, os, urllib.request, urllib.parse, time, re
API = "https://town-of-salem.fandom.com/api.php"
UA = {"User-Agent": "el-pueblo-research/1.0 (personal game project)"}
OUT = "out"; IMG = os.path.join(OUT, "img")
roles = json.load(open(os.path.join(OUT, "roles.json")))

def q(params):
    return json.loads(urllib.request.urlopen(urllib.request.Request(API + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"}), headers=UA), timeout=60).read())

def safe(s): return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")

cands = {}
for r in roles:
    base = r["name"]
    for need in ["icon", "skin"]:
        if need in r["images"]: continue
        titles = ([f"File:RoleIcon {base}.png", f"File:RoleIcon_{base}.png"] if need == "icon"
                  else [f"File:{base} Skin.png", f"File:{base}_Skin.png"])
        cands[(r["name"], need)] = titles

allt = sorted({t for v in cands.values() for t in v})
found = {}
for i in range(0, len(allt), 40):
    d = q({"action": "query", "titles": "|".join(allt[i:i+40]), "prop": "imageinfo", "iiprop": "url"})
    for pg in d["query"]["pages"]:
        if "imageinfo" in pg: found[pg["title"]] = pg["imageinfo"][0]["url"]

for r in roles:
    for need in ["icon", "skin"]:
        if need in r["images"]: continue
        for t in cands.get((r["name"], need), []):
            if t in found:
                name = f"{safe(r['name'])}_{need}.png"
                with urllib.request.urlopen(urllib.request.Request(found[t], headers=UA), timeout=60) as resp, open(os.path.join(IMG, name), "wb") as f:
                    f.write(resp.read())
                r["images"][need] = name; time.sleep(0.15); break

json.dump(roles, open(os.path.join(OUT, "roles.json"), "w"), ensure_ascii=False, indent=1)
print("with skin:", sum("skin" in r["images"] for r in roles), "with icon:", sum("icon" in r["images"] for r in roles))
print("no skin:", [r["name"] for r in roles if "skin" not in r["images"]])
print("no icon:", [r["name"] for r in roles if "icon" not in r["images"]][:50])
