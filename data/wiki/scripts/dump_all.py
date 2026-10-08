import json, urllib.request, urllib.parse, time
API = "https://town-of-salem.fandom.com/api.php"
UA = {"User-Agent": "el-pueblo-research/1.0 (personal game project)"}
def get(p):
    for attempt in range(4):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(API+"?"+urllib.parse.urlencode({**p,"format":"json","formatversion":"2"}),headers=UA),timeout=90).read())
        except Exception as e:
            print("retry", attempt, e); time.sleep(3*(attempt+1))
    raise SystemExit("failed")

# 1. enumerate all main-namespace pages
titles, cont = [], {}
while True:
    d = get({"action":"query","list":"allpages","apnamespace":"0","aplimit":"500", **cont})
    titles += [p["title"] for p in d["query"]["allpages"]]
    if "continue" not in d: break
    cont = d["continue"]
print("ns0 pages:", len(titles))
json.dump(titles, open("full/titles.json","w"), ensure_ascii=False)

# 2. fetch wikitext + categories + pageid, 50 per request
out = open("full/articles.ndjson","w")
for i in range(0, len(titles), 50):
    batch = titles[i:i+50]
    d = get({"action":"query","titles":"|".join(batch),"prop":"revisions|categories|info",
             "rvprop":"content|timestamp","rvslots":"main","cllimit":"max","clshow":"!hidden"})
    for p in d["query"]["pages"]:
        if "missing" in p: continue
        rev = (p.get("revisions") or [{}])[0]
        out.write(json.dumps({"title":p["title"],"pageid":p.get("pageid"),
            "touched":p.get("touched"),"timestamp":rev.get("timestamp"),
            "wikitext":rev.get("slots",{}).get("main",{}).get("content",""),
            "categories":[c["title"] for c in p.get("categories",[])]}, ensure_ascii=False)+"\n")
    time.sleep(0.2)
out.close()
print("done")
