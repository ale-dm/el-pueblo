import json, urllib.request, urllib.parse, re, html
from html.parser import HTMLParser
API = "https://town-of-salem.fandom.com/api.php"
UA = {"User-Agent": "el-pueblo-research/1.0 (personal game project)"}

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
        t = re.sub(r"[ \t\xa0]+", " ", t)
        t = re.sub(r"\n\s*\n+", "\n\n", t)
        return t.strip()

pages = ["Game Modes (ToS)", "Game Modes/Coven Expansion", "Phases", "Modifiers",
         "Friends (ToS)", "Mafia", "Town (ToS)"]
for t in pages:
    q = urllib.parse.urlencode({"action": "parse", "page": t, "prop": "text", "format": "json", "formatversion": "2", "disabletoc": "1"})
    with urllib.request.urlopen(urllib.request.Request(API + "?" + q, headers=UA), timeout=60) as r:
        d = json.load(r)
    p = Text(); p.feed(d["parse"]["text"])
    fn = "prose_" + re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_") + ".txt"
    open(fn, "w").write(p.text())
    print(f"{fn:40} {len(p.text()):7} chars")
