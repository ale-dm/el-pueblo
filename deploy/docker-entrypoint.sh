#!/bin/sh
# Arranque del contenedor: aplica las migraciones pendientes y deja el servidor como proceso principal.
set -e

node apps/server/dist/db/migrate.js
exec node apps/server/dist/index.js
