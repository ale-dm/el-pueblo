import json, re, os, shutil
REPO="/home/user/el-pueblo"; DOCS=f"{REPO}/docs"
roles=json.load(open("out/roles.json"))
tidx={i["title"]:i for i in json.load(open("full/text/index.json"))}
def slugify(s): return re.sub(r"[^A-Za-z0-9]+","_",s).strip("_")
# Fase 1: sin contenido de ToS2. Se quitan las líneas que lo mencionan (avisos entre versiones, enlaces).
TOS2=re.compile(r"ToS ?2\b|ToS2|Town of Salem 2|Better Town of Salem 2|BToS2", re.I)
def read_text(slug):
    lines=open(f"full/text/{slug}.txt").read().split("\n")
    return re.sub(r"\n{3,}", "\n\n", "\n".join(l for l in lines if not TOS2.search(l)))

os.makedirs(f"{DOCS}/roles",exist_ok=True); os.makedirs(f"{DOCS}/wiki",exist_ok=True)
ROLE_PAGES=set()
FIELDS=[("alignment","Clase (alineamiento)"),("type","Tipo"),("priority","Prioridad de acción"),("summary","Resumen"),
        ("goal","Objetivo"),("abilities","Habilidades"),("attributes","Atributos"),("attributes_text","Atributos (texto)"),
        ("special","Especial"),("action_other","Si hay Godfather/otro objetivo"),("action_none","Si no hay orden"),
        ("win_with","Gana con"),("must_kill","Debe matar para ganar"),("restrictions","Restricciones"),("uses","Usos"),
        ("sheriff_result","Resultado Sheriff"),("investigator_result","Resultado Investigator"),("consigliere_result","Resultado Consigliere")]
role_items=[]
for r in roles:
    name=r["name"]; page=r["page"]; ROLE_PAGES.add(page)
    slug=slugify(name); faction=r["faction"]
    mvp = faction in ("Mafia","Town")
    lines=[f"# {name}", "", f"- **Facción:** {faction}" + ("  · *en alcance MVP*" if mvp else "  · *fase posterior (referencia)*"),
           f"- **Página de la wiki:** {page}", ""]
    if r["images"].get("icon"): lines.append(f"![icono](../../data/roles/img/{r['images']['icon']})")
    if r["images"].get("skin"): lines.append(f"![skin](../../data/roles/img/{r['images']['skin']})")
    lines += ["", "## Ficha", ""]
    for k,label in FIELDS:
        v=r.get(k)
        if v: lines += [f"**{label}:**", "", *["> "+l for l in v.split("\n")], ""]
    lines += ["## Texto completo de la wiki", "", read_text(slugify(page)) if page in tidx else "(sin texto en el alcance)", ""]
    lines += ["## Implementación", "", "- [ ] Definido en `packages/engine` con su prioridad y facción",
              "- [ ] Acción nocturna (si aplica) validada con objetivos legales",
              "- [ ] Resultado de investigación correcto (Sheriff / Investigator / Consigliere)",
              "- [ ] Condición de victoria y de derrota comprobada en tests",
              "- [ ] Tests unitarios del rol en verde",
              "- [ ] Tarjeta y texto de ayuda en la app",
              "- [ ] Icono e ilustración propia (no el arte de la wiki)",
              "- [ ] Plantillas de narración para sus eventos",""]
    open(f"{DOCS}/roles/{slug}.md","w").write("\n".join(lines))
    role_items.append((name,faction,slug,mvp))

# wiki pages (all in-scope pages, minus role pages which live in docs/roles)
wiki_items=[]
for t,i in tidx.items():
    if t in ROLE_PAGES: continue
    txt=read_text(i["slug"])
    body=f"# {t}\n\nFuente: https://town-of-salem.fandom.com/wiki/{t.replace(' ','_')}\n\n{txt}\n"
    open(f"{DOCS}/wiki/{i['slug']}.md","w").write(body)
    wiki_items.append((t,i["slug"]))
json.dump({"roles":[{"name":a,"faction":b,"slug":c,"mvp":d} for a,b,c,d in role_items],
           "wiki":[{"title":a,"slug":b} for a,b in wiki_items]}, open("full/gen_index.json","w"), ensure_ascii=False, indent=1)
print("roles:", len(role_items), "| wiki pages:", len(wiki_items))
