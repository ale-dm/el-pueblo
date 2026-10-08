import json, re, urllib.request, urllib.parse, time, os
from html.parser import HTMLParser
API="https://town-of-salem.fandom.com/api.php"; UA={"User-Agent":"el-pueblo-research/1.0 (personal game project)"}
class Text(HTMLParser):
    SKIP={"script","style","sup"}; BLOCK={"p","li","tr","h1","h2","h3","h4","h5","div","br","dt","dd","table"}
    def __init__(s): super().__init__(); s.out=[]; s.skip=0
    def handle_starttag(s,t,a):
        if t in s.SKIP: s.skip+=1
        if t in s.BLOCK: s.out.append("\n")
        if t in ("td","th"): s.out.append(" | ")
    def handle_endtag(s,t):
        if t in s.SKIP and s.skip: s.skip-=1
        if t in s.BLOCK: s.out.append("\n")
    def handle_data(s,d):
        if not s.skip: s.out.append(d)
    def text(s):
        t="".join(s.out); t=re.sub(r"[ \t\xa0]+"," ",t); t=re.sub(r"\n\s*\n+","\n\n",t); return t.strip()
rows=[json.loads(l) for l in open("full/articles.ndjson")]
def is_redirect(r): return r["wikitext"].lstrip().upper().startswith("#REDIRECT")
OTHER=("Town of Salem 2","Traitors In Salem","Better Town of Salem","ToS2","(ToS 2)","(TiS)","(BToS","Savior of Salem","Coven-DLC","Coven DLC")
def other_version(r):
    t=r["title"]
    if re.search(r"\((ToS 2|ToS2|TiS|BToS1|BToS2)\)\s*$", t): return True
    return any(any(o in c for o in OTHER) for c in r["categories"]) and not re.search(r"\(ToS\)\s*$", t)
scope=[r for r in rows if not is_redirect(r) and not other_version(r)]
os.makedirs("full/text",exist_ok=True)
index=[]
for r in scope:
    q=urllib.parse.urlencode({"action":"parse","page":r["title"],"prop":"text","format":"json","formatversion":"2","disabletoc":"1"})
    try:
        d=json.loads(urllib.request.urlopen(urllib.request.Request(API+"?"+q,headers=UA),timeout=90).read())
        p=Text(); p.feed(d["parse"]["text"]); txt=p.text()
    except Exception as e:
        txt=f"ERROR {e}"
    slug=re.sub(r"[^A-Za-z0-9]+","_",r["title"]).strip("_")
    open(f"full/text/{slug}.txt","w").write(txt)
    index.append({"title":r["title"],"slug":slug,"chars":len(txt),"categories":r["categories"],"touched":r["touched"]})
    time.sleep(0.15)
json.dump(index,open("full/text/index.json","w"),ensure_ascii=False,indent=1)
print("scope pages:", len(index), "| empty/error:", sum(1 for i in index if i["chars"]<40))
