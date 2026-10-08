import json, re, urllib.request, urllib.parse, time
from collections import Counter, defaultdict
API="https://town-of-salem.fandom.com/api.php"; UA={"User-Agent":"el-pueblo-research/1.0 (personal game project)"}
def get(p):
    return json.loads(urllib.request.urlopen(urllib.request.Request(API+"?"+urllib.parse.urlencode({**p,"format":"json","formatversion":"2"}),headers=UA),timeout=90).read())
rows=[json.loads(l) for l in open("full/articles.ndjson")]
def is_redirect(r): return r["wikitext"].lstrip().upper().startswith("#REDIRECT")
def other_version(r):
    t=r["title"]
    if re.search(r"\((ToS 2|ToS2|TiS|BToS1|BToS2)\)\s*$", t): return True
    OTHER=("Town of Salem 2","Traitors In Salem","Better Town of Salem","ToS2","(ToS 2)","(TiS)","(BToS","Savior of Salem","Coven-DLC","Coven DLC")
    return any(any(o in c for o in OTHER) for c in r["categories"]) and not re.search(r"\(ToS\)\s*$", t)
scope=[r for r in rows if not is_redirect(r) and not other_version(r)]
files=sorted({f.strip() for r in scope for f in re.findall(r"\[\[(?:File|Image):([^\]|]+)", r["wikitext"])})
sizes={}
titles=["File:"+f for f in files]
for i in range(0,len(titles),50):
    d=get({"action":"query","titles":"|".join(titles[i:i+50]),"prop":"imageinfo","iiprop":"size|url|mime"})
    for p in d["query"]["pages"]:
        if "imageinfo" in p:
            ii=p["imageinfo"][0]; sizes[p["title"][5:]]={"bytes":ii["size"],"url":ii["url"],"mime":ii["mime"]}
    time.sleep(0.15)
total=sum(v["bytes"] for v in sizes.values())
print("files found:", len(sizes), "of", len(files), "| total MB:", round(total/1e6,1))
cat=defaultdict(lambda:[0,0])
for f,v in sizes.items():
    k="RoleIcon" if f.startswith("RoleIcon") else "SpecialLabel" if f.startswith("SpecialLabel") else "Other"
    cat[k][0]+=1; cat[k][1]+=v["bytes"]
for k,(n,b) in cat.items(): print(f"  {k:14} {n:5} files {round(b/1e6,1):8} MB")
json.dump({"files":sizes,"missing":[f for f in files if f not in sizes]}, open("full/image_index.json","w"), ensure_ascii=False, indent=1)
