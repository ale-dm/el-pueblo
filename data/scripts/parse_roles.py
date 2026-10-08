import json, re
raw = json.load(open("wiki_raw.json"))
pages = raw["pages"]
KEYS = {"nameandicon","alignment","avatar","attributes","special","type","priority","actionother","actionnone",
        "actionself","actionday","actionDay","sheriff","investigator","consigliere","summary","abilities",
        "attributestext","goal","winwith","winswith","mustkill","restrictions","uses","attack","defense","icon"}

def fields_of(text):
    fields, cur = {}, None
    for line in text.split("\n"):
        mm = re.match(r"^\|\s*([a-zA-Z_]+)\s*=\s*(.*)$", line)
        if mm and mm.group(1) in KEYS:
            cur = mm.group(1); fields[cur] = mm.group(2); continue
        if line.startswith("|}") or line.startswith("}}") or line.startswith("|-") or line.startswith("{|"):
            cur = None; continue
        if cur and line.strip(): fields[cur] += "\n" + line
    return fields

def clean(s):
    if s is None: return None
    s = re.sub(r"\[\[File:[^\]]*\]\]", "", s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{A\|([^}|]*)\}\}", r"\1", s)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"'''?|<u>|</u>", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    return "\n".join(l.strip() for l in s.split("\n") if l.strip())

out = {}
for title in raw["roles"]:
    f = fields_of(pages.get(title, {}).get("wikitext", ""))
    if "alignment" not in f: continue
    out[title] = {k: clean(v) for k, v in f.items()}
for t, f in out.items():
    print(f'{t:26} | {str(f.get("alignment")).splitlines()[0][:34]:34} | {str(f.get("type")).splitlines()[0][:28]}')
json.dump(out, open("roles_infobox.json", "w"), ensure_ascii=False, indent=1)
print("total:", len(out), "| missing:", sorted(set(raw["roles"]) - set(out)))
