import json, urllib.request, urllib.parse, time, sys
API = "https://town-of-salem.fandom.com/api.php"
UA = {"User-Agent": "el-pueblo-research/1.0 (personal game project)"}

def get(params):
    params = {**params, "format": "json", "formatversion": "2"}
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def category_members(cat):
    out, cont = [], {}
    while True:
        d = get({"action": "query", "list": "categorymembers", "cmtitle": cat, "cmlimit": "500", **cont})
        out += [m["title"] for m in d["query"]["categorymembers"]]
        if "continue" not in d: break
        cont = d["continue"]
    return out

roles = category_members("Category:Roles")
extra = ["Mafia", "Town (ToS)", "Coven (ToS)", "Vampire (ToS)", "Game Modes (ToS)",
         "Game Modes/Coven Expansion", "Phases", "Modifiers",
         "Getting Started", "Anomaly", "Friends (ToS)"]
titles = list(dict.fromkeys(roles + extra))
print("titles:", len(titles), file=sys.stderr)

pages = {}
for i in range(0, len(titles), 20):
    batch = titles[i:i+20]
    d = get({"action": "query", "titles": "|".join(batch), "prop": "extracts|revisions|pageimages|images",
             "explaintext": "1", "exlimit": "20", "rvprop": "content", "rvslots": "main",
             "piprop": "original", "imlimit": "500"})
    for p in d["query"]["pages"]:
        if "missing" in p: 
            pages[p["title"]] = {"missing": True}; continue
        pages[p["title"]] = {
            "title": p["title"],
            "extract": p.get("extract", ""),
            "wikitext": (p.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("content", ""),
            "image": (p.get("original") or {}).get("source"),
            "images": [im["title"] for im in p.get("images", [])],
        }
    time.sleep(0.3)

json.dump({"roles": roles, "pages": pages}, open("wiki_raw.json", "w"), ensure_ascii=False, indent=1)
print("saved", len(pages), file=sys.stderr)
