# Wiki de Town of Salem — volcado completo

Fuente: https://town-of-salem.fandom.com (MediaWiki API), volcado de 2026-10-08.

- `articles_all.ndjson.gz` — **1953** páginas del espacio principal (wikitext, categorías, fecha de edición). Descomprimir con `gunzip -k`.
- `titles_all.json` — lista de títulos.
- `text/index.json` — 216 páginas del alcance ToS 1 (sin redirecciones ni otras versiones) con su slug.
- `image_index.json` — 2042 archivos referenciados por el alcance, con URL y tamaño. Las 62 restantes no existen en la wiki (`image_failures.json` las lista).
- `img/` — iconos de rol y etiquetas (`RoleIcon_*`, `SpecialLabel_*`).
- `gen_index.json` — qué páginas van a `docs/roles/` y `docs/wiki/`.
- `scripts/` — scripts para regenerar el volcado, las imágenes y la documentación.

**Imágenes no incluidas en git:** las 2042 imágenes pesan ~300 MB. Están descritas en `image_index.json` con su URL; `scripts/dl_images.py` las vuelve a bajar.

Alcance excluido: 405 páginas de ToS 2, TiS, BToS y Savior of Salem; 1332 redirecciones. Siguen en `articles_all.ndjson.gz`.
