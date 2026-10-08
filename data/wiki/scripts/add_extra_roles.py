import json, re, os
rows={json.loads(l)["title"]:json.loads(l) for l in open("full/articles.ndjson")}
tidx={i["title"]:i for i in json.load(open("full/text/index.json"))}
roles=json.load(open("out/roles.json")); pages={r["page"] for r in roles}
def slugify(s): return re.sub(r"[^A-Za-z0-9]+","_",s).strip("_")
def is_redirect(r): return r["wikitext"].lstrip().upper().startswith("#REDIRECT")
cand=[t for t,r in rows.items() if not is_redirect(r) and any(re.search(r"roles",c,re.I) for c in r["categories"]) and not re.search(r"\((ToS 2|ToS2|TiS|BToS1|BToS2)\)$",t) and t not in pages and t in tidx]
D="/home/user/el-pueblo/docs/roles"; extra=[]
for t in sorted(cand):
    slug=slugify(re.sub(r"\s*\(ToS\)\s*$","",t))
    cats=[c.replace("Category:","") for c in rows[t]["categories"] if "oles" in c or "Alignment" in c or "Killing" in c or "Support" in c]
    body=[f"# {t}", "", "- **Facción:** no clasificada en `roles.json` (rol de ToS 1 fuera de los 49 iniciales)",
          f"- **Página de la wiki:** {t}", f"- **Categorías:** {', '.join(cats) or '—'}", "",
          "## Texto completo de la wiki", "", open(f"full/text/{tidx[t]['slug']}.txt").read(), "",
          "## Implementación", "", "- [ ] Clasificar: facción, prioridad y acción",
          "- [ ] Interacciones con otros roles revisadas en el texto de arriba",
          "- [ ] Tests del rol", "- [ ] Tarjeta y ayuda en la app", ""]
    open(f"{D}/{slug}.md","w").write("\n".join(body))
    extra.append({"name":re.sub(r"\s*\(ToS\)\s*$","",t),"faction":"Sin clasificar","slug":slug,"mvp":False})
g=json.load(open("full/gen_index.json")); g["roles"]+=extra
json.dump(g, open("full/gen_index.json","w"), ensure_ascii=False, indent=1)
print("extra roles added:", len(extra))
print([e["name"] for e in extra])
