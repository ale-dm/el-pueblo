#!/bin/sh
# Arranque del contenedor: aplica migraciones y siembra el catálogo, y deja el servidor como proceso principal.
# El código TypeScript se ejecuta directamente con tsx (sin paso de compilación).
set -e

node --import tsx apps/server/src/adapters/outbound/postgres/migrate.ts
exec node --import tsx apps/server/src/main.ts
