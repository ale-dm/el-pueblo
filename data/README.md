# Datos de Town of Salem (fase 1: Mafia)

Fuente: https://town-of-salem.fandom.com (Town of Salem Wiki), vía su API de MediaWiki.
Alcance actual: facción **Mafia** y **Town**. Se incluyen también los roles **Neutral** y **Coven** como datos de referencia, sin implementar.

## Estructura

- `roles/roles.json` — 49 roles: Mafia (11), Town (19), Neutral (13), Coven (6).
  Campos: `name`, `faction`, `alignment` (clase), `type`, `priority`, `summary`, `goal`, `abilities`, `attributes`,
  `attributes_text`, `special`, `action_other`, `action_none`, `win_with`, `must_kill`, `restrictions`, `uses`,
  `sheriff_result`, `investigator_result`, `consigliere_result`, `images`.
- `roles/img/` — iconos `*_icon.png` (49/49) y skins `*_skin.png` (45/49). Ambusher, Blackmailer, Framer y Survivor no tienen skin en la wiki.
  Son arte de la wiki y la web lo reutiliza **con permiso del equipo**. Solo se copian a `apps/web/public/roles/img/` los 55 archivos de los roles del MVP
  (`data/roles/img` está excluido de la imagen Docker). El mapa rol → archivo está en `apps/web/src/lib/roleImages.ts`.
- Personajes por defecto (Avatars (ToS), "Default Skins"): cinco copias en `apps/web/public/avatars/` (GilesCorey, JohnProctor, MaryWarren, AbigailWilliams, BettyParris). John Hathorne y Random Townie no están en `image_index.json`. Mismo permiso que los roles; ver la nota de licencia abajo.
  Aviso: los `.png` son en realidad WebP (`file`); los navegadores los leen por contenido, así que no se han renombrado.
- `game_config.json` — fases y tiempos por modo, reglas de votación, modos de Mafia y restricciones del modo Custom.
- `reference/wiki/` — clases de alineamiento (las 12 categorías de rol: Mafia Killing, Town Protective...), `Alignments (ToS)`,
  `Attributes`, `Abilities`, `Factions`, `Unique Role`, `Keywords`, `Outlier`, `Glossary of Abbreviations`, `Death (state)`, etc.
  Texto plano. `index.json` lista cada archivo.
- `reference/modes/` — texto plano de modos de juego, fases, modificadores, Mafia y Town.
- `source/wiki_raw.json` — snapshot crudo de la API (wikitext, extractos, imágenes), para regenerar sin volver a la wiki.
- `scripts/` — scripts de extracción, en este orden: `fetch_wiki.py` → `parse_roles.py` → `build.py` → `fix_images.py` → `fetch_prose.py` → `fetch_classes.py` → `write_config.py`.
  Los scripts escriben en el directorio de trabajo; ajustar las rutas antes de volver a ejecutarlos.

## Limitaciones

- Solo se parsean los campos de infobox conocidos. Antes de implementar un rol, contrastar sus habilidades con su página en la wiki.
- Coven, Rainbow, Dracula's Palace y Town Traitor no están implementados; sus datos son solo referencia.

## Licencia y uso

- El contenido de Fandom suele ser CC-BY-SA. Confirmar la licencia en la wiki antes de publicar.
- Nombres, iconos y arte de Town of Salem son propiedad de sus creadores. Para amigos en privado el riesgo es bajo; para publicar en tiendas hay que sustituir arte y nombres.
