import json, urllib.request, urllib.parse, re, os, time
from html.parser import HTMLParser
API = "https://town-of-salem.fandom.com/api.php"
UA = {"User-Agent": "el-pueblo-research/1.0 (personal game project)"}
OUT = "out/reference"; os.makedirs(OUT, exist_ok=True)

class Text(HTMLParser):
    SKIP = {"script", "style", "sup"}
    BLOCK = {"p", "li", "tr", "h1", "h2", "h3", "h4", "h5", "div", "br", "dt", "dd", "table"}
    def __init__(self):
        super().__init__(); self.out = []; self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP: self.skip += 1
        if tag in self.BLOCK: self.out.append("\n")
        if tag in ("td", "th"): self.out.append(" | ")
    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip: self.skip -= 1
        if tag in self.BLOCK: self.out.append("\n")
    def handle_data(self, data):
        if not self.skip: self.out.append(data)
    def text(self):
        t = "".join(self.out)
        t = re.sub(r"[ \t\xa0]+", " ", t); t = re.sub(r"\n\s*\n+", "\n\n", t)
        return t.strip()

def get(p):
    return json.loads(urllib.request.urlopen(urllib.request.Request(API+"?"+urllib.parse.urlencode({**p,"format":"json","formatversion":"2"}),headers=UA),timeout=60).read())

pages = ["Coven Evil", "Mafia Deception", "Mafia Killing", "Mafia Support", "Neutral Benign", "Neutral Chaos",
         "Neutral Evil (ToS)", "Neutral Killing (ToS)", "Town Investigative (ToS)", "Town Killing (ToS)",
         "Town Protective (ToS)", "Town Support (ToS)",
         "Alignments (ToS)", "Attributes (ToS)", "Abilities (ToS)", "Roles (ToS)", "Factions (ToS)",
         "Neutral (ToS)", "Town (ToS)", "Mafia", "Coven (ToS)", "Vampire (ToS)", "Unique Role", "Keywords",
         "Outlier", "Glossary of Abbreviations (ToS)", "Phases", "Death (state)"]
index = {}
for t in pages:
    d = get({"action": "parse", "page": t, "prop": "text|wikitext", "disabletoc": "1"})
    p = Text(); p.feed(d["parse"]["text"])
    fn = re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_") + ".txt"
    open(os.path.join(OUT, fn), "w").write(p.text())
    wt = d["parse"].get("wikitext", "")
    index[t] = {"file": fn, "chars": len(p.text()), "has_wikitext": bool(wt)}
    print(f"{t:32} {len(p.text()):6} chars -> {fn}")
    time.sleep(0.2)
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=1)
